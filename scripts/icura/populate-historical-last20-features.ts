#!/usr/bin/env tsx
/**
 * Populate historical last20 features in icura_nhl_early_game_dataset
 *
 * This script:
 * 1. Finds all games with MoneyPuck shots data
 * 2. Calculates early game features (first 10 minutes) from MoneyPuck shots
 * 3. Resolves team IDs and game IDs
 * 4. Inserts/updates icura_nhl_early_game_dataset with these features
 *
 * After running this, fetchLast20EarlyDatasetAverages will return real data
 * instead of nulls, allowing predictions to show real variation.
 */

import postgres from "postgres";
import { config } from "dotenv";
import { aggregateMoneyPuckShotsForGame } from "../../src/services/icura/early-goal/dataset";

config();
config({ path: ".env.local" });

const conn =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
if (!conn) {
  console.error("No database URL configured");
  process.exit(1);
}

const sql = postgres(conn, { prepare: false });

interface GameWithShots {
  game_external_id: string;
  home_team_abbr: string | null;
  away_team_abbr: string | null;
  shot_count: number;
  xg_first10: number;
}

async function findGamesWithShots(): Promise<GameWithShots[]> {
  console.log("🔍 Finding games with MoneyPuck shots data...");
  const targetSeason = process.env.MONEYPUCK_SEASON || "2025";

  // Use team_abbr from moneypuck_shots (now populated with real team codes)
  const result = await sql`
    WITH game_teams AS (
      SELECT 
        game_external_id,
        array_agg(DISTINCT team_abbr ORDER BY team_abbr) FILTER (WHERE team_abbr IS NOT NULL) as teams,
        COUNT(*) FILTER (WHERE game_time_seconds <= 600) as shot_count,
        SUM(xg) FILTER (WHERE game_time_seconds <= 600) as xg_first10
      FROM public.moneypuck_shots
      WHERE game_time_seconds IS NOT NULL
        AND game_time_seconds <= 600
        AND team_abbr IS NOT NULL
        AND (season IS NULL OR season = ${targetSeason})
      GROUP BY game_external_id
      HAVING COUNT(*) FILTER (WHERE game_time_seconds <= 600) > 10
         AND COUNT(DISTINCT team_abbr) = 2
    )
    SELECT 
      game_external_id,
      teams[1] as home_team_abbr,
      teams[2] as away_team_abbr,
      shot_count,
      xg_first10
    FROM game_teams
    WHERE array_length(teams, 1) = 2
    ORDER BY game_external_id
  `;

  const games: GameWithShots[] = result.map((row) => ({
    game_external_id: row.game_external_id,
    home_team_abbr: row.home_team_abbr,
    away_team_abbr: row.away_team_abbr,
    shot_count: Number(row.shot_count || 0),
    xg_first10: Number(row.xg_first10 || 0),
  }));

  console.log(`✅ Found ${games.length} games with MoneyPuck shots data`);
  if (games.length > 0) {
    console.log(
      `  Example: ${games[0].away_team_abbr} @ ${games[0].home_team_abbr} (game ${games[0].game_external_id})`,
    );
  }
  return games;
}

// Cache for team IDs
const teamIdCache = new Map<string, string | null>();

async function resolveAllTeamIds(teamAbbrs: string[]): Promise<Map<string, string | null>> {
  const uniqueAbbrs = [...new Set(teamAbbrs)];
  const result = await sql`
    SELECT UPPER(t.abbreviation) as abbr, t.id
    FROM public.teams t
    JOIN public.leagues l ON t.league_id = l.id
    WHERE UPPER(t.abbreviation) = ANY(${uniqueAbbrs.map((a) => a.toUpperCase())})
      AND UPPER(l.code) = 'NHL'
  `;

  const map = new Map<string, string | null>();
  for (const row of result) {
    map.set(row.abbr, row.id);
  }
  // Fill in missing ones as null
  for (const abbr of uniqueAbbrs) {
    if (!map.has(abbr.toUpperCase())) {
      map.set(abbr.toUpperCase(), null);
    }
  }
  return map;
}

async function resolveAllGameIds(
  gameExternalIds: string[],
): Promise<Map<string, { id: string | null; date: string | null }>> {
  const result = await sql`
    SELECT 
      COALESCE(external_id, api_game_id) as game_external_id,
      id,
      game_date::text as date_str
    FROM public.games
    WHERE external_id = ANY(${gameExternalIds})
       OR api_game_id = ANY(${gameExternalIds})
  `;

  const map = new Map<string, { id: string | null; date: string | null }>();
  for (const row of result) {
    map.set(row.game_external_id, { id: row.id, date: row.date_str });
  }

  // For games not in games table, try to get date from moneypuck_shots
  const missingIds = gameExternalIds.filter((id) => !map.has(id));
  if (missingIds.length > 0) {
    const shotsResult = await sql`
      SELECT 
        game_external_id,
        MIN(created_at::date)::text as date_str
      FROM public.moneypuck_shots
      WHERE game_external_id = ANY(${missingIds})
      GROUP BY game_external_id
    `;

    for (const row of shotsResult) {
      map.set(row.game_external_id, { id: null, date: row.date_str });
    }
  }

  return map;
}

async function checkGoalsInFirst10(
  gameExternalIds: string[],
): Promise<Map<string, { first5: boolean; first10: boolean }>> {
  const result = await sql`
    SELECT 
      game_external_id,
      COUNT(*) FILTER (WHERE game_time_seconds <= 300 AND is_goal = true) > 0 as goal_first5,
      COUNT(*) FILTER (WHERE game_time_seconds <= 600 AND is_goal = true) > 0 as goal_first10
    FROM public.moneypuck_shots
    WHERE game_external_id = ANY(${gameExternalIds})
      AND game_time_seconds IS NOT NULL
      AND is_goal = true
    GROUP BY game_external_id
  `;

  const map = new Map<string, { first5: boolean; first10: boolean }>();
  for (const row of result) {
    map.set(row.game_external_id, {
      first5: row.goal_first5 || false,
      first10: row.goal_first10 || false,
    });
  }

  // Fill in missing ones
  for (const id of gameExternalIds) {
    if (!map.has(id)) {
      map.set(id, { first5: false, first10: false });
    }
  }

  return map;
}

async function processGame(
  game: GameWithShots,
  teamIdMap: Map<string, string | null>,
  gameIdMap: Map<string, { id: string | null; date: string | null }>,
  goalsMap: Map<string, { first5: boolean; first10: boolean }>,
): Promise<boolean> {
  try {
    // Resolve team IDs from cache
    const homeTeamId = teamIdMap.get(game.home_team_abbr!.toUpperCase());
    const awayTeamId = teamIdMap.get(game.away_team_abbr!.toUpperCase());

    if (!homeTeamId || !awayTeamId) {
      // Silently fail - team IDs not resolved
      return false;
    }

    // Get game ID and date from cache
    const gameInfo = gameIdMap.get(game.game_external_id);
    if (!gameInfo || !gameInfo.date) {
      return false;
    }

    const gameId = gameInfo.id;
    const dateISO = gameInfo.date;

    // Get goals from cache
    const goals = goalsMap.get(game.game_external_id) || { first5: false, first10: false };

    // Aggregate MoneyPuck shots for this game
    // Note: moneypuck_shots uses "HOME" and "AWAY" as team_abbr, not actual team codes
    // We need to aggregate directly from the database
    const shotsData = await sql`
      SELECT 
        team_abbr,
        COUNT(*) FILTER (WHERE game_time_seconds <= 300) as shots_first5,
        COUNT(*) FILTER (WHERE game_time_seconds <= 600) as shots_first10,
        SUM(xg) FILTER (WHERE game_time_seconds <= 300) as xg_first5,
        SUM(xg) FILTER (WHERE game_time_seconds <= 600) as xg_first10,
        COUNT(*) FILTER (WHERE game_time_seconds <= 600 AND is_high_danger = true) as hd_first10,
        COUNT(*) FILTER (WHERE game_time_seconds <= 600 AND is_rush = true) as rush_first10,
        MIN(game_time_seconds) FILTER (WHERE game_time_seconds <= 600) as first_shot_time,
        MIN(game_time_seconds) FILTER (WHERE game_time_seconds <= 600 AND is_goal = true) as first_goal_time
      FROM public.moneypuck_shots
      WHERE game_external_id = ${game.game_external_id}
        AND game_time_seconds IS NOT NULL
        AND game_time_seconds <= 600
      GROUP BY team_abbr
    `;

    const homeShots = shotsData.find((s) => s.team_abbr === "HOME");
    const awayShots = shotsData.find((s) => s.team_abbr === "AWAY");

    if (!homeShots || !awayShots) {
      return false;
    }

    const homeStats = {
      shots_first5: Number(homeShots.shots_first5 || 0),
      shots_first10: Number(homeShots.shots_first10 || 0),
      xg_first5: Number(homeShots.xg_first5 || 0),
      xg_first10: Number(homeShots.xg_first10 || 0),
      high_danger_first10: Number(homeShots.hd_first10 || 0),
      rush_chances_first10: Number(homeShots.rush_first10 || 0),
      avg_time_to_first_shot: homeShots.first_shot_time ? Number(homeShots.first_shot_time) : null,
      avg_time_to_first_goal: homeShots.first_goal_time ? Number(homeShots.first_goal_time) : null,
      shot_attempts_first10: Number(homeShots.shots_first10 || 0),
      high_danger_first5: 0, // Will calculate if needed
      rush_chances_first5: 0, // Will calculate if needed
    };

    const awayStats = {
      shots_first5: Number(awayShots.shots_first5 || 0),
      shots_first10: Number(awayShots.shots_first10 || 0),
      xg_first5: Number(awayShots.xg_first5 || 0),
      xg_first10: Number(awayShots.xg_first10 || 0),
      high_danger_first10: Number(awayShots.hd_first10 || 0),
      rush_chances_first10: Number(awayShots.rush_first10 || 0),
      avg_time_to_first_shot: awayShots.first_shot_time ? Number(awayShots.first_shot_time) : null,
      avg_time_to_first_goal: awayShots.first_goal_time ? Number(awayShots.first_goal_time) : null,
      shot_attempts_first10: Number(awayShots.shots_first10 || 0),
      high_danger_first5: 0,
      rush_chances_first5: 0,
    };

    if (!homeStats || !awayStats) {
      return false;
    }

    // Insert or update in icura_nhl_early_game_dataset
    // Note: The column names say "_last20" but they actually store the current game's values
    // The averaging happens in fetchLast20EarlyDatasetAverages
    await sql`
      INSERT INTO public.icura_nhl_early_game_dataset (
        game_id,
        date_iso,
        season,
        home_team_id,
        away_team_id,
        goal_in_first_5,
        goal_in_first_10,
        -- Home team features (first 10)
        home_team_xgf_first10_last20,
        home_team_shots_first10_last20,
        home_team_high_danger_first10_last20,
        home_team_rush_chances_first10_last20,
        home_team_avg_time_to_first_shot,
        home_team_avg_time_to_first_goal,
        home_team_shot_attempts_first10,
        -- Away team features (first 10)
        away_team_xgf_first10_last20,
        away_team_shots_first10_last20,
        away_team_high_danger_first10_last20,
        away_team_rush_chances_first10_last20,
        away_team_avg_time_to_first_shot,
        away_team_avg_time_to_first_goal,
        away_team_shot_attempts_first10,
        -- Home team defense (opponent's offense)
        home_team_xga_first10_last20,
        home_team_shots_allowed_first10_last20,
        home_team_high_danger_allowed_first10_last20,
        -- Away team defense (opponent's offense)
        away_team_xga_first10_last20,
        away_team_shots_allowed_first10_last20,
        away_team_high_danger_allowed_first10_last20
      ) VALUES (
        COALESCE(${gameId}::uuid, gen_random_uuid()),
        ${dateISO}::date,
        EXTRACT(YEAR FROM ${dateISO}::date)::text,
        ${homeTeamId}::uuid,
        ${awayTeamId}::uuid,
        ${goals.first5},
        ${goals.first10},
        -- Home team offense
        ${homeStats.xg_first10},
        ${homeStats.shots_first10},
        ${homeStats.high_danger_first10},
        ${homeStats.rush_chances_first10},
        ${homeStats.avg_time_to_first_shot},
        ${homeStats.avg_time_to_first_goal},
        ${homeStats.shot_attempts_first10 || homeStats.shots_first10},
        -- Away team offense
        ${awayStats.xg_first10},
        ${awayStats.shots_first10},
        ${awayStats.high_danger_first10},
        ${awayStats.rush_chances_first10},
        ${awayStats.avg_time_to_first_shot},
        ${awayStats.avg_time_to_first_goal},
        ${awayStats.shot_attempts_first10 || awayStats.shots_first10},
        -- Home team defense (away team's offense)
        ${awayStats.xg_first10},
        ${awayStats.shots_first10},
        ${awayStats.high_danger_first10},
        -- Away team defense (home team's offense)
        ${homeStats.xg_first10},
        ${homeStats.shots_first10},
        ${homeStats.high_danger_first10}
      )
      ON CONFLICT (game_id) DO UPDATE SET
        date_iso = EXCLUDED.date_iso,
        season = EXCLUDED.season,
        home_team_id = EXCLUDED.home_team_id,
        away_team_id = EXCLUDED.away_team_id,
        goal_in_first_5 = EXCLUDED.goal_in_first_5,
        goal_in_first_10 = EXCLUDED.goal_in_first_10,
        home_team_xgf_first10_last20 = EXCLUDED.home_team_xgf_first10_last20,
        home_team_shots_first10_last20 = EXCLUDED.home_team_shots_first10_last20,
        home_team_high_danger_first10_last20 = EXCLUDED.home_team_high_danger_first10_last20,
        home_team_rush_chances_first10_last20 = EXCLUDED.home_team_rush_chances_first10_last20,
        home_team_avg_time_to_first_shot = EXCLUDED.home_team_avg_time_to_first_shot,
        home_team_avg_time_to_first_goal = EXCLUDED.home_team_avg_time_to_first_goal,
        home_team_shot_attempts_first10 = EXCLUDED.home_team_shot_attempts_first10,
        away_team_xgf_first10_last20 = EXCLUDED.away_team_xgf_first10_last20,
        away_team_shots_first10_last20 = EXCLUDED.away_team_shots_first10_last20,
        away_team_high_danger_first10_last20 = EXCLUDED.away_team_high_danger_first10_last20,
        away_team_rush_chances_first10_last20 = EXCLUDED.away_team_rush_chances_first10_last20,
        away_team_avg_time_to_first_shot = EXCLUDED.away_team_avg_time_to_first_shot,
        away_team_avg_time_to_first_goal = EXCLUDED.away_team_avg_time_to_first_goal,
        away_team_shot_attempts_first10 = EXCLUDED.away_team_shot_attempts_first10,
        home_team_xga_first10_last20 = EXCLUDED.home_team_xga_first10_last20,
        home_team_shots_allowed_first10_last20 = EXCLUDED.home_team_shots_allowed_first10_last20,
        home_team_high_danger_allowed_first10_last20 = EXCLUDED.home_team_high_danger_allowed_first10_last20,
        away_team_xga_first10_last20 = EXCLUDED.away_team_xga_first10_last20,
        away_team_shots_allowed_first10_last20 = EXCLUDED.away_team_shots_allowed_first10_last20,
        away_team_high_danger_allowed_first10_last20 = EXCLUDED.away_team_high_danger_allowed_first10_last20,
        updated_at = now()
    `;

    return true;
  } catch (error: any) {
    console.error(`  ❌ Error processing game ${game.game_external_id}:`, error.message);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting historical last20 features population...\n");

  try {
    const games = await findGamesWithShots();

    if (games.length === 0) {
      console.log("❌ No games with MoneyPuck shots data found");
      return;
    }

    console.log(`\n📊 Pre-fetching team IDs, game IDs, and goals...`);

    // Batch resolve all team IDs
    const allTeamAbbrs = [...new Set(games.flatMap((g) => [g.home_team_abbr!, g.away_team_abbr!]))];
    console.log(`  📋 Found ${allTeamAbbrs.length} unique team abbreviations`);
    const teamIdMap = await resolveAllTeamIds(allTeamAbbrs);
    const resolvedCount = Array.from(teamIdMap.values()).filter((id) => id !== null).length;
    console.log(`  ✅ Resolved ${resolvedCount}/${teamIdMap.size} team IDs`);

    // Show some examples of unresolved teams
    const unresolved = Array.from(teamIdMap.entries())
      .filter(([_, id]) => id === null)
      .slice(0, 5);
    if (unresolved.length > 0) {
      console.log(`  ⚠️  Example unresolved teams: ${unresolved.map(([abbr]) => abbr).join(", ")}`);
    }

    // Batch resolve all game IDs and dates
    const allGameIds = games.map((g) => g.game_external_id);
    const gameIdMap = await resolveAllGameIds(allGameIds);
    console.log(`  ✅ Resolved ${gameIdMap.size} game IDs`);

    // Batch check all goals
    const goalsMap = await checkGoalsInFirst10(allGameIds);
    console.log(`  ✅ Checked goals for ${goalsMap.size} games`);

    console.log(`\n📊 Processing ${games.length} games in parallel batches...\n`);

    const BATCH_SIZE = 20; // Process 20 games in parallel
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < games.length; i += BATCH_SIZE) {
      const batch = games.slice(i, i + BATCH_SIZE);

      const results = await Promise.all(
        batch.map((game) => processGame(game, teamIdMap, gameIdMap, goalsMap)),
      );

      for (const success of results) {
        processed++;
        if (success) {
          succeeded++;
        } else {
          failed++;
        }
      }

      if (processed % 50 === 0 || processed === games.length) {
        console.log(
          `  ✅ Processed ${processed}/${games.length} games (${succeeded} succeeded, ${failed} failed)`,
        );
      }
    }

    console.log(`\n🎉 Complete! Processed ${processed} games:`);
    console.log(`   ✅ Succeeded: ${succeeded}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(
      `\n💡 Historical last20 features are now populated. Predictions should show real variation!`,
    );
  } catch (error: any) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main();
