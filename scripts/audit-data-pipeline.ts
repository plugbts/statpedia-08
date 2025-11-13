/**
 * Data Pipeline Audit Script
 * Comprehensive audit of team IDs, names, logos, and historical data consistency
 */

import { config } from "dotenv";
import postgres from "postgres";
import { sql } from "drizzle-orm";

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const db = postgres(conn);

interface AuditResult {
  category: string;
  issue: string;
  count: number;
  severity: "critical" | "warning" | "info";
  examples?: string;
  recommendation: string;
}

const results: AuditResult[] = [];

function addResult(result: AuditResult) {
  results.push(result);
  const icon = result.severity === "critical" ? "🔴" : result.severity === "warning" ? "⚠️" : "ℹ️";
  console.log(`${icon} [${result.category}] ${result.issue}`);
  console.log(`   Count: ${result.count}`);
  if (result.examples) {
    console.log(`   Examples: ${result.examples}`);
  }
  console.log(`   Fix: ${result.recommendation}\n`);
}

async function auditTeamIDConsistency() {
  console.log("=".repeat(80));
  console.log("📋 AUDITING TEAM ID CONSISTENCY");
  console.log("=".repeat(80) + "\n");

  // 1. Check for team_id vs teamId inconsistencies in column naming
  const playerGameLogsColumns = await db`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'player_game_logs' 
    AND column_name SIMILAR TO '%(team|opponent)%'
    ORDER BY ordinal_position;
  `;

  console.log(
    "Player Game Logs Columns:",
    playerGameLogsColumns.map((r) => r.column_name).join(", "),
  );

  // 2. Check for NULL team_id values
  const [nullTeams] = await db`
    SELECT COUNT(*) as count 
    FROM player_game_logs 
    WHERE team_id IS NULL;
  `;

  if (nullTeams.count > 0) {
    const [examples] = await db`
      SELECT player_id, game_id, game_date 
      FROM player_game_logs 
      WHERE team_id IS NULL 
      LIMIT 5;
    `;

    addResult({
      category: "Team IDs",
      issue: "Player game logs with NULL team_id",
      count: parseInt(nullTeams.count),
      severity: "critical",
      examples: JSON.stringify(examples),
      recommendation: "Run: npx tsx scripts/backfill-players-team-from-logs.ts",
    });
  }

  // 3. Check for NULL opponent_id/opponent_team_id
  const [nullOpponents] = await db`
    SELECT COUNT(*) as count 
    FROM player_game_logs 
    WHERE opponent_id IS NULL AND opponent_team_id IS NULL;
  `;

  if (nullOpponents.count > 0) {
    addResult({
      category: "Team IDs",
      issue: "Player game logs with NULL opponent_id",
      count: parseInt(nullOpponents.count),
      severity: "warning",
      examples: "",
      recommendation: "Run: npx tsx scripts/backfill-opponent-team-ids.ts",
    });
  }

  // 4. Check games table for NULL team IDs
  const [nullGameTeams] = await db`
    SELECT 
      COUNT(*) FILTER (WHERE home_team_id IS NULL) as null_home,
      COUNT(*) FILTER (WHERE away_team_id IS NULL) as null_away
    FROM games;
  `;

  if (nullGameTeams.null_home > 0 || nullGameTeams.null_away > 0) {
    addResult({
      category: "Team IDs",
      issue: `Games with NULL team IDs (home: ${nullGameTeams.null_home}, away: ${nullGameTeams.null_away})`,
      count: parseInt(nullGameTeams.null_home) + parseInt(nullGameTeams.null_away),
      severity: "critical",
      recommendation: "Backfill team IDs from ESPN API using team abbreviations",
    });
  }

  // 5. Check for inconsistent team_id references (UUIDs that don't exist in teams table)
  const [orphanedTeamRefs] = await db`
    SELECT COUNT(DISTINCT pgl.team_id) as count
    FROM player_game_logs pgl
    LEFT JOIN teams t ON pgl.team_id = t.id
    WHERE pgl.team_id IS NOT NULL AND t.id IS NULL;
  `;

  if (orphanedTeamRefs.count > 0) {
    addResult({
      category: "Team IDs",
      issue: "Player game logs referencing non-existent team IDs",
      count: parseInt(orphanedTeamRefs.count),
      severity: "critical",
      recommendation: "Clean up orphaned references and re-sync team data",
    });
  }
}

async function auditTeamLogos() {
  console.log("=".repeat(80));
  console.log("🖼️  AUDITING TEAM LOGOS");
  console.log("=".repeat(80) + "\n");

  // 1. Check teams without logo_url
  const [teamsWithoutLogos] = await db`
    SELECT 
      COUNT(*) as count,
      STRING_AGG(DISTINCT t.abbreviation, ', ') as examples
    FROM teams t
    WHERE logo_url IS NULL OR logo_url = ''
    LIMIT 1;
  `;

  if (teamsWithoutLogos.count > 0) {
    addResult({
      category: "Team Logos",
      issue: "Teams without logo URLs",
      count: parseInt(teamsWithoutLogos.count),
      severity: "warning",
      examples: teamsWithoutLogos.examples,
      recommendation:
        "Auto-generate ESPN CDN URLs: https://a.espncdn.com/i/teamlogos/{league}/500/{abbr}.png",
    });
  }

  // 2. Check for case inconsistencies in logo URLs
  const logoCaseCheck = await db`
    SELECT 
      t.abbreviation,
      t.logo_url,
      l.code as league
    FROM teams t
    JOIN leagues l ON t.league_id = l.id
    WHERE t.logo_url IS NOT NULL
    AND t.logo_url NOT LIKE '%' || LOWER(t.abbreviation) || '%'
    LIMIT 10;
  `;

  if (logoCaseCheck.length > 0) {
    addResult({
      category: "Team Logos",
      issue: "Logo URLs with case mismatches (expecting lowercase abbreviations)",
      count: logoCaseCheck.length,
      severity: "info",
      examples: logoCaseCheck.map((r) => `${r.abbreviation}: ${r.logo_url}`).join("; "),
      recommendation: "Ensure all logo URLs use lowercase team abbreviations",
    });
  }
}

async function auditTeamNames() {
  console.log("=".repeat(80));
  console.log("📛 AUDITING TEAM NAME NORMALIZATION");
  console.log("=".repeat(80) + "\n");

  // 1. Check for duplicate team names within same league
  const duplicateNames = await db`
    SELECT 
      t.name,
      l.code as league,
      COUNT(*) as count,
      STRING_AGG(t.abbreviation, ', ') as abbreviations
    FROM teams t
    JOIN leagues l ON t.league_id = l.id
    GROUP BY t.name, l.code
    HAVING COUNT(*) > 1;
  `;

  if (duplicateNames.length > 0) {
    for (const dup of duplicateNames) {
      addResult({
        category: "Team Names",
        issue: `Duplicate team name in ${dup.league}`,
        count: parseInt(dup.count),
        severity: "warning",
        examples: `"${dup.name}" has abbreviations: ${dup.abbreviations}`,
        recommendation: "Use canonical team names and ensure abbreviations are unique identifiers",
      });
    }
  }

  // 2. Check for teams where name === abbreviation (not normalized)
  const [unnormalizedNames] = await db`
    SELECT COUNT(*) as count
    FROM teams
    WHERE name = abbreviation;
  `;

  if (unnormalizedNames.count > 0) {
    addResult({
      category: "Team Names",
      issue: "Teams with name equal to abbreviation (placeholder data)",
      count: parseInt(unnormalizedNames.count),
      severity: "info",
      recommendation: "Fetch full team names from ESPN API",
    });
  }

  // 3. Check team_abbrev_map for consistency
  const [abbrevMapStats] = await db`
    SELECT 
      COUNT(*) as total_mappings,
      COUNT(DISTINCT league) as leagues_covered,
      COUNT(DISTINCT api_abbrev) as unique_abbreviations
    FROM team_abbrev_map;
  `;

  console.log(
    `Team Abbreviation Map: ${abbrevMapStats.total_mappings} mappings across ${abbrevMapStats.leagues_covered} leagues`,
  );
}

async function auditHistoryStreaks() {
  console.log("=".repeat(80));
  console.log("📈 AUDITING HISTORY / STREAKS CALCULATION");
  console.log("=".repeat(80) + "\n");

  // 1. Check if game_date is being sorted correctly for streaks
  const dateOrderCheck = await db`
    SELECT 
      player_id,
      COUNT(*) as game_count,
      COUNT(DISTINCT game_date) as unique_dates,
      MIN(game_date) as earliest,
      MAX(game_date) as latest
    FROM player_game_logs
    WHERE game_date IS NOT NULL
    GROUP BY player_id
    HAVING COUNT(*) >= 5
    LIMIT 10;
  `;

  console.log(`Sample players with 5+ games (checking date range):`);
  for (const p of dateOrderCheck) {
    console.log(`  Player ${p.player_id}: ${p.game_count} games from ${p.earliest} to ${p.latest}`);
  }

  // 2. Check for duplicate game_date entries for same player (should be rare)
  const duplicateDates = await db`
    SELECT 
      player_id,
      game_date,
      COUNT(*) as count
    FROM player_game_logs
    GROUP BY player_id, game_date
    HAVING COUNT(*) > 1
    LIMIT 10;
  `;

  if (duplicateDates.length > 0) {
    addResult({
      category: "History/Streaks",
      issue: "Players with multiple logs for same game_date",
      count: duplicateDates.length,
      severity: "warning",
      examples: duplicateDates
        .map((r) => `Player ${r.player_id} on ${r.game_date}: ${r.count} logs`)
        .join("; "),
      recommendation:
        "Ensure game logs are de-duplicated or represent different games on same date",
    });
  }

  // 3. Check if player_analytics table exists and has streak/window calculations
  try {
    const [analyticsCount] = await db`
      SELECT COUNT(*) as count FROM player_analytics;
    `;

    console.log(`Player analytics records: ${analyticsCount.count}`);

    if (analyticsCount.count === 0) {
      addResult({
        category: "History/Streaks",
        issue: "No player analytics calculated",
        count: 0,
        severity: "warning",
        recommendation: "Run: npx tsx scripts/enrich-player-analytics.ts",
      });
    } else {
      // Sample analytics to verify calculations
      const sampleAnalytics = await db`
        SELECT 
          player_id,
          prop_type,
          l5_avg,
          l10_avg,
          season_avg,
          current_streak
        FROM player_analytics
        WHERE season_avg IS NOT NULL
        LIMIT 5;
      `;

      console.log(`Sample analytics (with valid season_avg):`);
      for (const a of sampleAnalytics) {
        console.log(
          `  Player ${a.player_id} (${a.prop_type}): L5=${a.l5_avg}, L10=${a.l10_avg}, Season=${a.season_avg}, Streak=${a.current_streak}`,
        );
      }
    }
  } catch (err) {
    addResult({
      category: "History/Streaks",
      issue: "player_analytics table not found",
      count: 0,
      severity: "critical",
      recommendation: "Create table and run enrichment: npx tsx scripts/enrich-player-analytics.ts",
    });
  }

  // 4. Check if win/loss flags exist for streak calculation
  try {
    const columns = await db`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'player_game_logs'
      AND column_name IN ('result', 'win', 'outcome');
    `;

    if (columns.length === 0) {
      addResult({
        category: "History/Streaks",
        issue: "No win/loss result column found in player_game_logs",
        count: 0,
        severity: "info",
        recommendation:
          "Win/loss flags not stored - streaks must be calculated from stat values vs lines",
      });
    } else {
      const resultColumn = columns[0].column_name;
      const [resultStats] = await db`
        SELECT 
          COUNT(*) FILTER (WHERE ${sql(resultColumn)} IS NOT NULL) as with_result,
          COUNT(*) FILTER (WHERE ${sql(resultColumn)} IS NULL) as without_result
        FROM player_game_logs;
      `;

      console.log(
        `Game logs with ${resultColumn}: ${resultStats.with_result} / ${parseInt(resultStats.with_result) + parseInt(resultStats.without_result)} total`,
      );
    }
  } catch (err) {
    console.log("No win/loss column found (this is expected for stat-based tracking)");
  }
}

async function generateSummaryReport() {
  console.log("\n" + "=".repeat(80));
  console.log("📊 AUDIT SUMMARY");
  console.log("=".repeat(80) + "\n");

  const critical = results.filter((r) => r.severity === "critical");
  const warnings = results.filter((r) => r.severity === "warning");
  const info = results.filter((r) => r.severity === "info");

  console.log(`🔴 Critical Issues: ${critical.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log(`ℹ️  Info: ${info.length}`);
  console.log(`\nTotal Issues Found: ${results.length}\n`);

  if (critical.length > 0) {
    console.log("🔴 CRITICAL ISSUES TO FIX IMMEDIATELY:\n");
    critical.forEach((r, i) => {
      console.log(`${i + 1}. ${r.issue} (${r.count} affected)`);
      console.log(`   → ${r.recommendation}\n`);
    });
  }

  if (warnings.length > 0) {
    console.log("⚠️  WARNINGS (Recommended Fixes):\n");
    warnings.forEach((r, i) => {
      console.log(`${i + 1}. ${r.issue} (${r.count} affected)`);
      console.log(`   → ${r.recommendation}\n`);
    });
  }
}

async function main() {
  console.log("\n🔍 Starting Data Pipeline Audit...\n");

  try {
    await auditTeamIDConsistency();
    await auditTeamLogos();
    await auditTeamNames();
    await auditHistoryStreaks();
    await generateSummaryReport();

    console.log("✅ Audit complete!\n");
  } catch (error) {
    console.error("❌ Audit failed:", error);
    throw error;
  } finally {
    await db.end();
  }
}

main();
