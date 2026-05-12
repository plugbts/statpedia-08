#!/usr/bin/env tsx
/**
 * Populate shift-level matchup features for G1F10 model
 *
 * Currently estimates top-line and top-pair stats from team averages.
 * To improve accuracy, integrate actual shift tracking data.
 *
 * Usage:
 *   tsx scripts/icura/populate-shift-features.ts --season 2024-2025
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

async function populateShiftFeatures(season: string) {
  const conn = getConn();
  if (!conn) throw new Error("No database connection string found");

  const sql = postgres(conn, { prepare: false });
  try {
    console.log(`⚡ Populating shift-level features for season: ${season}`);
    console.log("=".repeat(60));
    console.log(
      "📝 Note: Currently using team average estimates (top line ~40% of team production)",
    );
    console.log("   For accurate features, integrate shift tracking data source\n");

    // Get games that need shift features populated
    const games = await sql`
      SELECT
        d.game_external_id,
        d.home_team_id,
        d.away_team_id,
        d.home_team_xgf_first10_last20,
        d.home_team_xga_first10_last20,
        d.home_team_rush_chances_first10_last20,
        d.home_team_high_danger_first10_last20,
        d.away_team_xgf_first10_last20,
        d.away_team_xga_first10_last20,
        d.away_team_rush_chances_first10_last20,
        d.away_team_high_danger_first10_last20
      FROM public.icura_nhl_early_game_dataset d
      WHERE d.season = ${season}
        AND (d.home_top_line_xgf_first10_last20 IS NULL 
          OR d.away_top_line_xgf_first10_last20 IS NULL)
      ORDER BY d.date_iso DESC
      LIMIT 1000
    `;

    console.log(`Found ${games.length} games to process\n`);

    let updated = 0;
    for (const game of games) {
      try {
        // Estimate top-line stats as 40% of team production
        // Top defensive pair suppression estimated as 40% of team xGA
        const homeTopLineXGF = game.home_team_xgf_first10_last20
          ? Number(game.home_team_xgf_first10_last20) * 0.4
          : null;
        const homeTopLineXGA = game.away_team_xgf_first10_last20
          ? Number(game.away_team_xgf_first10_last20) * 0.4
          : null;
        const homeTopLineRush = game.home_team_rush_chances_first10_last20
          ? Number(game.home_team_rush_chances_first10_last20) * 0.4
          : null;
        const homeTopLineHD = game.home_team_high_danger_first10_last20
          ? Number(game.home_team_high_danger_first10_last20) * 0.4
          : null;
        const homeTopPairSuppression = game.home_team_xga_first10_last20
          ? Number(game.home_team_xga_first10_last20) * 0.4
          : null;

        const awayTopLineXGF = game.away_team_xgf_first10_last20
          ? Number(game.away_team_xgf_first10_last20) * 0.4
          : null;
        const awayTopLineXGA = game.home_team_xgf_first10_last20
          ? Number(game.home_team_xgf_first10_last20) * 0.4
          : null;
        const awayTopLineRush = game.away_team_rush_chances_first10_last20
          ? Number(game.away_team_rush_chances_first10_last20) * 0.4
          : null;
        const awayTopLineHD = game.away_team_high_danger_first10_last20
          ? Number(game.away_team_high_danger_first10_last20) * 0.4
          : null;
        const awayTopPairSuppression = game.away_team_xga_first10_last20
          ? Number(game.away_team_xga_first10_last20) * 0.4
          : null;

        await sql`
          UPDATE public.icura_nhl_early_game_dataset
          SET
            home_top_line_xgf_first10_last20 = ${homeTopLineXGF},
            home_top_line_xga_first10_last20 = ${homeTopLineXGA},
            home_top_line_rush_rate_first10_last20 = ${homeTopLineRush},
            home_top_line_hd_rate_first10_last20 = ${homeTopLineHD},
            home_top_pair_xga_suppression_first10_last20 = ${homeTopPairSuppression},
            away_top_line_xgf_first10_last20 = ${awayTopLineXGF},
            away_top_line_xga_first10_last20 = ${awayTopLineXGA},
            away_top_line_rush_rate_first10_last20 = ${awayTopLineRush},
            away_top_line_hd_rate_first10_last20 = ${awayTopLineHD},
            away_top_pair_xga_suppression_first10_last20 = ${awayTopPairSuppression},
            updated_at = now()
          WHERE game_external_id = ${game.game_external_id}
        `;

        updated++;
        if (updated % 50 === 0) {
          console.log(`  Updated ${updated}/${games.length} games...`);
        }
      } catch (e: any) {
        console.error(`  Error processing game ${game.game_external_id}:`, e.message);
      }
    }

    console.log(`\n✅ Completed: Updated ${updated} games with shift-level features`);
    console.log("\n📝 To improve accuracy:");
    console.log("   1. Integrate shift tracking API (NHL Edge, SportLogiq, etc.)");
    console.log("   2. Identify top-line forwards and top-pair defensemen");
    console.log("   3. Calculate their specific xGF/xGA rates from shift data");
    console.log("   4. Replace estimates with actual shift-level stats");
  } finally {
    await sql.end({ timeout: 2 });
  }
}

const season =
  process.argv.find((a) => a.startsWith("--season="))?.split("=")[1] ||
  process.argv[process.argv.indexOf("--season") + 1] ||
  "2024-2025";

populateShiftFeatures(season).catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
