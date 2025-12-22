/**
 * Fix labels using NHL API timestamps instead of MoneyPuck.
 *
 * NHL API provides accurate timestamps:
 * - about.period
 * - about.periodTime (MM:SS format)
 *
 * Compute: game_time_seconds = (period - 1) * 1200 + convert(periodTime)
 */

import postgres from "postgres";
import * as dotenv from "dotenv";
import * as path from "path";
import {
  fetchNhlPlayByPlay,
  normalizeNhlPlayByPlayToEvents,
  fetchNhlSchedule,
} from "../../src/services/icura/unified/providers/nhl-web-api";

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

function getConn(): string {
  return (
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    ""
  );
}

function parsePeriodTime(periodTime: string): number | null {
  // NHL API format: "MM:SS" or "M:SS"
  const m = periodTime.match(/^(\d+):(\d+)$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function computeGameTimeSeconds(period: number, periodTime: string): number | null {
  const periodTimeSeconds = parsePeriodTime(periodTime);
  if (periodTimeSeconds === null) return null;
  // NHL periods are 20 minutes = 1200 seconds
  return (period - 1) * 1200 + periodTimeSeconds;
}

async function fixLabelsFromNhlApi(season: string) {
  const conn = getConn();
  if (!conn) throw new Error("No database connection string found");

  const sql = postgres(conn, { prepare: false });
  try {
    console.log(`🔧 Fixing labels using NHL API timestamps for season: ${season}`);
    console.log("=".repeat(60));

    // Get all games from dataset with dates and team abbreviations
    const games = await sql`
      SELECT DISTINCT 
        d.game_external_id,
        d.date_iso,
        ht.abbreviation as home_team_abbr,
        at.abbreviation as away_team_abbr
      FROM public.icura_nhl_early_game_dataset d
      LEFT JOIN public.teams ht ON ht.id = d.home_team_id
      LEFT JOIN public.teams at ON at.id = d.away_team_id
      WHERE d.season = ${season}
        AND ht.abbreviation IS NOT NULL
        AND at.abbreviation IS NOT NULL
      ORDER BY d.date_iso, d.game_external_id
    `;

    console.log(`Found ${games.length} games to process\n`);

    // Build a map of date -> NHL API games
    console.log("📅 Fetching NHL schedule to map game IDs...");
    const dateToNhlGames = new Map<string, any[]>();
    const uniqueDates = [...new Set(games.map((g) => g.date_iso.toISOString().split("T")[0]))];

    for (const date of uniqueDates) {
      try {
        const schedule = await fetchNhlSchedule(date);
        dateToNhlGames.set(date, schedule);
        await new Promise((resolve) => setTimeout(resolve, 200)); // Rate limit
      } catch (e: any) {
        console.error(`  Error fetching schedule for ${date}: ${e.message}`);
      }
    }

    console.log(`✅ Fetched schedules for ${dateToNhlGames.size} dates\n`);

    const updates: Array<{
      game_external_id: string;
      goal_in_first_5: boolean;
      goal_in_first_10: boolean;
    }> = [];

    let processed = 0;
    let errors = 0;
    let notFound = 0;

    for (const game of games) {
      try {
        const dateStr = game.date_iso.toISOString().split("T")[0];
        const nhlGames = dateToNhlGames.get(dateStr) || [];

        // Match by team abbreviations
        const matched = nhlGames.find(
          (ng) =>
            (ng.homeTeamAbbr === game.home_team_abbr && ng.awayTeamAbbr === game.away_team_abbr) ||
            (ng.homeTeamAbbr === game.away_team_abbr && ng.awayTeamAbbr === game.home_team_abbr),
        );

        if (!matched) {
          notFound++;
          if (notFound <= 10) {
            console.warn(`  ⚠️  No NHL API match for ${game.game_external_id} on ${dateStr}`);
          }
          continue;
        }

        const nhlGameId = matched.gameId;

        // Fetch NHL API play-by-play
        const pbp = await fetchNhlPlayByPlay(nhlGameId);
        const events = normalizeNhlPlayByPlayToEvents(nhlGameId, pbp);

        // Find first goal using NHL API timestamps
        const goals = events
          .filter((e) => e.eventType === "goal" && e.gameTimeSeconds !== undefined)
          .sort((a, b) => (a.gameTimeSeconds || 99999) - (b.gameTimeSeconds || 99999));

        if (goals.length === 0) {
          // No goals in game
          updates.push({
            game_external_id: gameId,
            goal_in_first_5: false,
            goal_in_first_10: false,
          });
        } else {
          const firstGoal = goals[0];
          const firstGoalTime = firstGoal.gameTimeSeconds!;

          updates.push({
            game_external_id: gameId,
            goal_in_first_5: firstGoalTime <= 300, // 5 minutes = 300 seconds
            goal_in_first_10: firstGoalTime <= 600, // 10 minutes = 600 seconds
          });
        }

        processed++;
        if (processed % 50 === 0) {
          console.log(
            `  Processed ${processed}/${games.length} games (${errors} errors, ${notFound} not found)...`,
          );
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (e: any) {
        errors++;
        console.error(`  Error processing game ${game.game_external_id}: ${e.message}`);
        // Continue with next game
      }
    }

    console.log(`\n✅ Processed ${processed} games (${errors} errors, ${notFound} not found)`);

    // Update dataset in batch
    console.log("\n📝 Updating dataset labels...");
    let updated = 0;

    for (const update of updates) {
      try {
        await sql`
          UPDATE public.icura_nhl_early_game_dataset
          SET
            goal_in_first_5 = ${update.goal_in_first_5},
            goal_in_first_10 = ${update.goal_in_first_10},
            updated_at = now()
          WHERE game_external_id = ${update.game_external_id}::text
            AND season = ${season}
        `;
        updated++;
      } catch (e: any) {
        console.error(`  Error updating game ${update.game_external_id}: ${e.message}`);
      }
    }

    console.log(`✅ Updated ${updated} games`);

    // Show new distribution
    const dist = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE goal_in_first_5 = true) as g1f5_true,
        COUNT(*) FILTER (WHERE goal_in_first_5 = false) as g1f5_false,
        COUNT(*) FILTER (WHERE goal_in_first_10 = true) as g1f10_true,
        COUNT(*) FILTER (WHERE goal_in_first_10 = false) as g1f10_false,
        COUNT(*) as total
      FROM public.icura_nhl_early_game_dataset
      WHERE season = ${season}
        AND goal_in_first_5 IS NOT NULL
        AND goal_in_first_10 IS NOT NULL
    `;

    const d = dist[0];
    console.log("\n📊 New distribution (NHL API timestamps):");
    console.log(
      `  G1F5: ${d.g1f5_true} true (${((d.g1f5_true / d.total) * 100).toFixed(1)}%), ${d.g1f5_false} false (${((d.g1f5_false / d.total) * 100).toFixed(1)}%)`,
    );
    console.log(
      `  G1F10: ${d.g1f10_true} true (${((d.g1f10_true / d.total) * 100).toFixed(1)}%), ${d.g1f10_false} false (${((d.g1f10_false / d.total) * 100).toFixed(1)}%)`,
    );
    console.log(`  Total: ${d.total} games`);
    console.log("\n✅ Expected:");
    console.log(`  G1F5: ~28-30%`);
    console.log(`  G1F10: ~55-60%`);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

const season =
  process.argv.find((a) => a.startsWith("--season="))?.split("=")[1] ||
  process.argv[process.argv.indexOf("--season") + 1] ||
  "2023-2024";

fixLabelsFromNhlApi(season).catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
