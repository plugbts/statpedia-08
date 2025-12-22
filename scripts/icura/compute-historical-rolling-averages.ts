/**
 * Compute historical rolling averages (last20) for each game.
 * This requires ordering games by date and computing rolling windows.
 */

import postgres from "postgres";
import * as dotenv from "dotenv";
import * as path from "path";

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

async function computeRollingAverages(season: string) {
  const conn = getConn();
  if (!conn) throw new Error("No database connection string found");

  const sql = postgres(conn, { prepare: false });
  try {
    console.log(`⚡ Computing historical rolling averages (last20) for season: ${season}`);
    console.log("=".repeat(60));
    const startTime = Date.now();

    // Single SQL query to compute rolling averages using window functions
    const updated = await sql`
      WITH ordered_games AS (
        SELECT
          game_external_id,
          date_iso,
          home_team_id,
          away_team_id,
          home_team_xgf_first10_last20,
          home_team_xga_first10_last20,
          home_team_rush_chances_first10_last20,
          home_team_high_danger_first10_last20,
          home_team_shot_attempts_first10,
          away_team_xgf_first10_last20,
          away_team_xga_first10_last20,
          away_team_rush_chances_first10_last20,
          away_team_high_danger_first10_last20,
          away_team_shot_attempts_first10,
          ROW_NUMBER() OVER (PARTITION BY home_team_id ORDER BY date_iso) as home_game_num,
          ROW_NUMBER() OVER (PARTITION BY away_team_id ORDER BY date_iso) as away_game_num
        FROM public.icura_nhl_early_game_dataset
        WHERE season = ${season}
          AND date_iso IS NOT NULL
          AND home_team_id IS NOT NULL
          AND away_team_id IS NOT NULL
      ),
      home_rolling AS (
        SELECT
          game_external_id,
          AVG(home_team_xgf_first10_last20) OVER (
            PARTITION BY home_team_id 
            ORDER BY date_iso 
            ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING
          ) as home_xgf_last20,
          AVG(home_team_xga_first10_last20) OVER (
            PARTITION BY home_team_id 
            ORDER BY date_iso 
            ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING
          ) as home_xga_last20,
          AVG(home_team_rush_chances_first10_last20) OVER (
            PARTITION BY home_team_id 
            ORDER BY date_iso 
            ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING
          ) as home_rush_last20,
          AVG(home_team_high_danger_first10_last20) OVER (
            PARTITION BY home_team_id 
            ORDER BY date_iso 
            ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING
          ) as home_hd_last20
        FROM ordered_games
        WHERE home_game_num > 1  -- Skip first game (no history)
      ),
      away_rolling AS (
        SELECT
          game_external_id,
          AVG(away_team_xgf_first10_last20) OVER (
            PARTITION BY away_team_id 
            ORDER BY date_iso 
            ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING
          ) as away_xgf_last20,
          AVG(away_team_xga_first10_last20) OVER (
            PARTITION BY away_team_id 
            ORDER BY date_iso 
            ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING
          ) as away_xga_last20,
          AVG(away_team_rush_chances_first10_last20) OVER (
            PARTITION BY away_team_id 
            ORDER BY date_iso 
            ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING
          ) as away_rush_last20,
          AVG(away_team_high_danger_first10_last20) OVER (
            PARTITION BY away_team_id 
            ORDER BY date_iso 
            ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING
          ) as away_hd_last20
        FROM ordered_games
        WHERE away_game_num > 1  -- Skip first game (no history)
      ),
      combined AS (
        SELECT
          hr.game_external_id,
          hr.home_xgf_last20,
          hr.home_xga_last20,
          hr.home_rush_last20,
          hr.home_hd_last20,
          ar.away_xgf_last20,
          ar.away_xga_last20,
          ar.away_rush_last20,
          ar.away_hd_last20
        FROM home_rolling hr
        JOIN away_rolling ar ON hr.game_external_id = ar.game_external_id
      )
      UPDATE public.icura_nhl_early_game_dataset d
      SET
        home_team_xgf_first10_last20 = COALESCE(c.home_xgf_last20, d.home_team_xgf_first10_last20),
        home_team_xga_first10_last20 = COALESCE(c.home_xga_last20, d.home_team_xga_first10_last20),
        home_team_rush_chances_first10_last20 = COALESCE(c.home_rush_last20, d.home_team_rush_chances_first10_last20),
        home_team_high_danger_first10_last20 = COALESCE(c.home_hd_last20, d.home_team_high_danger_first10_last20),
        away_team_xgf_first10_last20 = COALESCE(c.away_xgf_last20, d.away_team_xgf_first10_last20),
        away_team_xga_first10_last20 = COALESCE(c.away_xga_last20, d.away_team_xga_first10_last20),
        away_team_rush_chances_first10_last20 = COALESCE(c.away_rush_last20, d.away_team_rush_chances_first10_last20),
        away_team_high_danger_first10_last20 = COALESCE(c.away_hd_last20, d.away_team_high_danger_first10_last20),
        updated_at = now()
      FROM combined c
      WHERE d.game_external_id = c.game_external_id::text
        AND d.season = ${season}
      RETURNING d.game_external_id
    `;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `✅ Completed in ${elapsed}s: ${updated.length} games updated with rolling averages`,
    );
  } finally {
    await sql.end({ timeout: 2 });
  }
}

const season =
  process.argv.find((a) => a.startsWith("--season="))?.split("=")[1] ||
  process.argv[process.argv.indexOf("--season") + 1] ||
  "2023-2024";

computeRollingAverages(season).catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
