/**
 * Fix labels using NHL API timestamps - FULL IMPLEMENTATION
 *
 * Steps:
 * 1. Get team abbreviations from MoneyPuck shots data
 * 2. Fetch full NHL 2023-2024 schedule (Oct 2023 - June 2024)
 * 3. Match games by team abbreviations
 * 4. Fetch NHL API play-by-play for matched games
 * 5. Recompute labels using NHL API timestamps
 * 6. Update dataset
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

function generateDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

async function fixLabelsFromNhlApiFull(season: string) {
  const conn = getConn();
  if (!conn) throw new Error("No database connection string found");

  const sql = postgres(conn, { prepare: false });
  try {
    console.log(`🔧 Fixing labels using NHL API timestamps for season: ${season}`);
    console.log("=".repeat(60));

    // Step 1: Get team abbreviations from MoneyPuck shots data (OPTIMIZED)
    // Raw JSON is stored as {headers: [...], cols: [...]}
    // homeTeamCode is at index 44, awayTeamCode is at index 11
    console.log("\n📊 Step 1: Getting team data from MoneyPuck shots...");
    const moneypuckGames = await sql`
      SELECT DISTINCT
        game_external_id,
        (raw->'cols'->>44) as team1,
        (raw->'cols'->>11) as team2
      FROM public.moneypuck_shots
      WHERE season = ${season}
        AND (raw->'cols'->>44) IS NOT NULL
        AND (raw->'cols'->>11) IS NOT NULL
        AND (raw->'cols'->>44) != ''
        AND (raw->'cols'->>11) != ''
      ORDER BY game_external_id
    `;

    console.log(`✅ Found ${moneypuckGames.length} games in MoneyPuck data`);

    // Build map: game_external_id -> {team1, team2}
    const moneypuckMap = new Map<string, { team1: string; team2: string }>();
    for (const g of moneypuckGames) {
      if (g.team1 && g.team2) {
        moneypuckMap.set(g.game_external_id, {
          team1: String(g.team1).toUpperCase(),
          team2: String(g.team2).toUpperCase(),
        });
      }
    }

    console.log(`✅ Mapped ${moneypuckMap.size} games with team data`);

    // Step 2: Fetch full NHL 2023-2024 schedule (PARALLEL)
    console.log("\n📅 Step 2: Fetching NHL 2023-2024 schedule (parallel)...");
    const startDate = new Date("2023-10-01");
    const endDate = new Date("2024-06-30");
    const dateRange = generateDateRange(startDate, endDate);

    console.log(
      `  Fetching schedules for ${dateRange.length} dates in parallel (20 concurrent)...`,
    );
    const nhlScheduleMap = new Map<string, any[]>(); // date -> games[]

    // Process in chunks of 20 for parallel fetching
    const chunkSize = 20;
    let scheduleFetched = 0;

    for (let i = 0; i < dateRange.length; i += chunkSize) {
      const chunk = dateRange.slice(i, i + chunkSize);
      const results = await Promise.allSettled(
        chunk.map(async (date) => {
          try {
            const schedule = await fetchNhlSchedule(date);
            return { date, schedule };
          } catch (e: any) {
            return { date, schedule: null, error: e.message };
          }
        }),
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value.schedule) {
          nhlScheduleMap.set(result.value.date, result.value.schedule);
          scheduleFetched++;
        }
      }

      if (scheduleFetched % 100 === 0 || i + chunkSize >= dateRange.length) {
        console.log(`    Fetched ${scheduleFetched}/${dateRange.length} dates...`);
      }

      // Small delay between chunks to avoid overwhelming API
      if (i + chunkSize < dateRange.length) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    console.log(`✅ Fetched schedules for ${scheduleFetched} dates`);

    // Step 3: Match games by team abbreviations
    console.log("\n🔗 Step 3: Matching games by team abbreviations...");
    const gameMatches = new Map<string, { nhlGameId: string; date: string }>(); // moneypuck_id -> nhl_game_id

    for (const [moneypuckId, teams] of moneypuckMap) {
      // Try to find matching NHL game
      for (const [date, nhlGames] of nhlScheduleMap) {
        for (const nhlGame of nhlGames) {
          const homeAbbr = String(nhlGame.homeTeamAbbr || "").toUpperCase();
          const awayAbbr = String(nhlGame.awayTeamAbbr || "").toUpperCase();

          // Match if teams match (order doesn't matter)
          if (
            (homeAbbr === teams.team1 && awayAbbr === teams.team2) ||
            (homeAbbr === teams.team2 && awayAbbr === teams.team1)
          ) {
            gameMatches.set(moneypuckId, { nhlGameId: nhlGame.gameId, date });
            break;
          }
        }
        if (gameMatches.has(moneypuckId)) break;
      }
    }

    console.log(`✅ Matched ${gameMatches.size}/${moneypuckMap.size} games to NHL API`);

    // Step 4: Fetch play-by-play and recompute labels (PARALLEL)
    console.log("\n🎯 Step 4: Fetching play-by-play and recomputing labels (parallel)...");
    const updates: Array<{
      game_external_id: string;
      goal_in_first_5: boolean;
      goal_in_first_10: boolean;
    }> = [];

    const gameMatchesArray = Array.from(gameMatches.entries());
    const pbpChunkSize = 30; // Process 30 games in parallel
    let processed = 0;
    let errors = 0;

    for (let i = 0; i < gameMatchesArray.length; i += pbpChunkSize) {
      const chunk = gameMatchesArray.slice(i, i + pbpChunkSize);

      const results = await Promise.allSettled(
        chunk.map(async ([moneypuckId, match]) => {
          try {
            // Fetch NHL API play-by-play
            const pbp = await fetchNhlPlayByPlay(match.nhlGameId);
            const events = normalizeNhlPlayByPlayToEvents(match.nhlGameId, pbp);

            // Find first goal using NHL API timestamps
            const goals = events
              .filter((e) => e.eventType === "goal" && e.gameTimeSeconds !== undefined)
              .sort((a, b) => (a.gameTimeSeconds || 99999) - (b.gameTimeSeconds || 99999));

            if (goals.length === 0) {
              // No goals in game
              return {
                game_external_id: moneypuckId,
                goal_in_first_5: false,
                goal_in_first_10: false,
              };
            } else {
              const firstGoal = goals[0];
              const firstGoalTime = firstGoal.gameTimeSeconds!;

              return {
                game_external_id: moneypuckId,
                goal_in_first_5: firstGoalTime <= 300, // 5 minutes = 300 seconds
                goal_in_first_10: firstGoalTime <= 600, // 10 minutes = 600 seconds
              };
            }
          } catch (e: any) {
            throw { moneypuckId, error: e.message };
          }
        }),
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          updates.push(result.value);
          processed++;
        } else {
          errors++;
          if (errors <= 10) {
            const errorInfo = result.reason as any;
            console.error(`  Error processing game ${errorInfo.moneypuckId}: ${errorInfo.error}`);
          }
        }
      }

      if (processed % 100 === 0 || i + pbpChunkSize >= gameMatchesArray.length) {
        console.log(
          `  Processed ${processed}/${gameMatchesArray.length} games (${errors} errors)...`,
        );
      }

      // Small delay between chunks
      if (i + pbpChunkSize < gameMatchesArray.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Processed ${processed} games (${errors} errors)`);

    // Step 5: Update dataset (BATCH - using individual updates for reliability)
    console.log("\n📝 Step 5: Updating dataset labels (batch)...");

    if (updates.length > 0) {
      // Update in parallel chunks for speed
      const updateChunkSize = 50;
      let updated = 0;

      for (let i = 0; i < updates.length; i += updateChunkSize) {
        const chunk = updates.slice(i, i + updateChunkSize);

        await Promise.allSettled(
          chunk.map(async (update) => {
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
              // Skip errors
            }
          }),
        );

        if (updated % 200 === 0 || i + updateChunkSize >= updates.length) {
          console.log(`  Updated ${updated}/${updates.length} games...`);
        }
      }

      console.log(`✅ Updated ${updated} games`);
    } else {
      console.log(`⚠️  No updates to apply`);
    }

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

fixLabelsFromNhlApiFull(season).catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
