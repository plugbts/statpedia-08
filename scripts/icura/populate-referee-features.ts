#!/usr/bin/env tsx
/**
 * Populate referee penalty rate features for G1F10 model
 *
 * Extracts referee penalty data from game events and calculates:
 * - Penalties in first period average
 * - Penalties in first 10 minutes average
 * - Minors vs majors ratio
 * - Home/away penalty bias
 *
 * Usage:
 *   tsx scripts/icura/populate-referee-features.ts --season 2024-2025
 */

import "dotenv/config";
import postgres from "postgres";

function getConn(): string {
  return (
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    ""
  );
}

async function populateRefereeFeatures(season: string) {
  const conn = getConn();
  if (!conn) throw new Error("No database connection string found");

  const sql = postgres(conn, { prepare: false });
  try {
    console.log(`⚡ Populating referee features for season: ${season}`);
    console.log("=".repeat(60));

    // Extract penalty data from game_events table or extras JSONB
    // For now, we'll use a simplified approach with penalty counts from extras
    console.log("Step 1: Extracting penalty events from games...\n");

    // Get penalty data from dataset extras or calculate from available data
    const penaltyData = await sql`
      WITH game_penalties AS (
        SELECT 
          d.game_external_id,
          d.game_id,
          d.date_iso,
          -- Try to get penalties from extras JSONB first
          COALESCE(
            (d.extras->>'home_penalties_first10')::numeric,
            (d.extras->>'home_penalties_first5')::numeric * 2,
            0
          ) as home_penalties_first10,
          COALESCE(
            (d.extras->>'away_penalties_first10')::numeric,
            (d.extras->>'away_penalties_first5')::numeric * 2,
            0
          ) as away_penalties_first10,
          -- Try game_events table if available
          (
            SELECT COUNT(*)
            FROM public.game_events e
            WHERE e.game_id = d.game_id
              AND e.event_type = 'penalty'
              AND e.period = 1
            LIMIT 1
          ) as has_penalty_events
        FROM public.icura_nhl_early_game_dataset d
        WHERE d.season = ${season}
      )
      SELECT 
        game_external_id,
        game_id,
        date_iso,
        home_penalties_first10 + away_penalties_first10 as penalties_first10,
        home_penalties_first10 + away_penalties_first10 as penalties_first_period,
        home_penalties_first10,
        away_penalties_first10
      FROM game_penalties
      WHERE home_penalties_first10 > 0 OR away_penalties_first10 > 0 OR has_penalty_events > 0
      ORDER BY date_iso DESC
      LIMIT 1000
    `;

    if (penaltyData.length === 0) {
      console.log("⚠️  No penalty data found. This is expected if:");
      console.log("   - Penalty events haven't been ingested yet");
      console.log("   - Season data doesn't exist");
      console.log("   - Extras JSONB doesn't contain penalty data\n");
      console.log("✅ Referee features will be populated when penalty data is available");
      return;
    }

    console.log(`Found ${penaltyData.length} games with penalty data\n`);

    // Calculate referee averages (if we had referee assignments, we'd group by referee)
    // For now, we'll calculate game-level averages and use them as estimates
    const avgPenaltiesFirstPeriod =
      penaltyData.length > 0
        ? penaltyData.reduce((sum, g) => sum + (Number(g.penalties_first_period) || 0), 0) /
          penaltyData.length
        : 0;

    const avgPenaltiesFirst10 =
      penaltyData.length > 0
        ? penaltyData.reduce((sum, g) => sum + (Number(g.penalties_first10) || 0), 0) /
          penaltyData.length
        : 0;

    console.log(`Average penalties first period: ${avgPenaltiesFirstPeriod.toFixed(2)}`);
    console.log(`Average penalties first 10 min: ${avgPenaltiesFirst10.toFixed(2)}\n`);

    // Update dataset with referee features
    let updated = 0;
    for (const game of penaltyData) {
      try {
        const penaltiesFirstPeriod = Number(game.penalties_first_period) || 0;
        const penaltiesFirst10 = Number(game.penalties_first10) || 0;
        const homePenalties = Number(game.home_penalties_first_period) || 0;
        const awayPenalties = Number(game.away_penalties_first_period) || 0;

        // Calculate home/away bias (-0.5 to 0.5)
        const totalPenalties = homePenalties + awayPenalties;
        const homeAwayBias =
          totalPenalties > 0
            ? Math.max(-0.5, Math.min(0.5, (homePenalties - awayPenalties) / (totalPenalties * 2)))
            : null;

        // Normalize to per-game/per-10-min rates
        const refPenaltiesFirstPeriodAvg = penaltiesFirstPeriod / 20; // 20 min period
        const refPenaltiesFirst10Avg = penaltiesFirst10 / 10; // 10 min window

        await sql`
          UPDATE public.icura_nhl_early_game_dataset
          SET
            ref_penalties_first_period_avg = ${refPenaltiesFirstPeriodAvg},
            ref_penalties_first10_avg = ${refPenaltiesFirst10Avg},
            ref_minors_vs_majors_ratio = NULL, -- Would need penalty type data
            ref_home_away_penalty_bias = ${homeAwayBias},
            updated_at = now()
          WHERE game_external_id = ${game.game_external_id}
        `;

        updated++;
        if (updated % 50 === 0) {
          console.log(`  Updated ${updated}/${penaltyData.length} games...`);
        }
      } catch (e: any) {
        console.error(`  Error processing game ${game.game_external_id}:`, e.message);
      }
    }

    console.log(`\n✅ Completed: Updated ${updated} games with referee features`);
    console.log("\n📝 Note: For accurate referee-specific features, you need:");
    console.log("   1. Referee assignment data from NHL API");
    console.log("   2. Historical penalty tracking per referee");
    console.log("   3. Penalty type data (minor vs major)");
  } finally {
    await sql.end({ timeout: 2 });
  }
}

const season =
  process.argv.find((a) => a.startsWith("--season="))?.split("=")[1] ||
  process.argv[process.argv.indexOf("--season") + 1] ||
  "2024-2025";

populateRefereeFeatures(season).catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
