/**
 * FAST version: Populate dataset using pure SQL (no per-game loops).
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

async function populateFast(season: string) {
  const conn = getConn();
  if (!conn) throw new Error("No database connection string found");

  const sql = postgres(conn, { prepare: false });
  try {
    console.log(`⚡ FAST population from MoneyPuck for season: ${season}`);
    console.log("=".repeat(60));
    const startTime = Date.now();

    // Single SQL query - compute targets and team stats separately
    const result = await sql`
      WITH game_targets AS (
        SELECT
          game_external_id,
          BOOL_OR(is_goal = true AND game_time_seconds <= 300) as goal_in_first_5,
          BOOL_OR(is_goal = true AND game_time_seconds <= 600) as goal_in_first_10
        FROM public.moneypuck_shots
        WHERE season = ${season}
          AND game_time_seconds IS NOT NULL
        GROUP BY game_external_id
      ),
      team_stats AS (
        SELECT
          game_external_id,
          season,
          team_abbr,
          -- Team features (first 10 min)
          COUNT(*) FILTER (WHERE game_time_seconds <= 600) as shots_first10,
          COALESCE(SUM(xg) FILTER (WHERE game_time_seconds <= 600), 0) as xgf_first10,
          COUNT(*) FILTER (WHERE is_high_danger = true AND game_time_seconds <= 600) as high_danger_first10,
          COUNT(*) FILTER (WHERE is_rush = true AND game_time_seconds <= 600) as rush_first10
        FROM public.moneypuck_shots
        WHERE season = ${season}
          AND game_time_seconds IS NOT NULL
        GROUP BY game_external_id, season, team_abbr
      ),
      game_pairs AS (
        SELECT DISTINCT ON (ts1.game_external_id)
          ts1.game_external_id,
          ts1.season,
          gt.goal_in_first_5,
          gt.goal_in_first_10,
          -- Home team (alphabetically first)
          ts1.shots_first10 as home_shots,
          ts1.xgf_first10 as home_xgf,
          ts2.xgf_first10 as home_xga,
          ts1.high_danger_first10 as home_hd,
          ts1.rush_first10 as home_rush,
          -- Away team (alphabetically second)
          ts2.shots_first10 as away_shots,
          ts2.xgf_first10 as away_xgf,
          ts1.xgf_first10 as away_xga,
          ts2.high_danger_first10 as away_hd,
          ts2.rush_first10 as away_rush
        FROM team_stats ts1
        JOIN team_stats ts2 ON ts1.game_external_id = ts2.game_external_id
          AND ts1.team_abbr < ts2.team_abbr
        LEFT JOIN game_targets gt ON gt.game_external_id = ts1.game_external_id
        ORDER BY ts1.game_external_id, ts1.team_abbr
      ),
      with_game_ids AS (
        SELECT
          gp.*,
          g.id as game_id,
          g.home_team_id,
          g.away_team_id,
          g.game_date
        FROM game_pairs gp
        LEFT JOIN public.games g ON g.external_id = gp.game_external_id::text
      )
      INSERT INTO public.icura_nhl_early_game_dataset (
        game_id, game_external_id, date_iso, season,
        home_team_id, away_team_id,
        goal_in_first_5, goal_in_first_10,
        home_team_xgf_first10_last20, home_team_xga_first10_last20,
        home_team_rush_chances_first10_last20, home_team_high_danger_first10_last20,
        home_team_shot_attempts_first10,
        away_team_xgf_first10_last20, away_team_xga_first10_last20,
        away_team_rush_chances_first10_last20, away_team_high_danger_first10_last20,
        away_team_shot_attempts_first10,
        updated_at
      )
      SELECT
        wgi.game_id,
        wgi.game_external_id::text,
        COALESCE(wgi.game_date, (CASE WHEN ${season} = '2023-2024' THEN '2023-10-01'::date ELSE '2024-10-01'::date END)),
        wgi.season,
        wgi.home_team_id,
        wgi.away_team_id,
        wgi.goal_in_first_5,
        wgi.goal_in_first_10,
        NULL, -- home_team_xgf_first10_last20 (historical - compute later)
        NULL, -- home_team_xga_first10_last20
        NULL, -- home_team_rush_chances_first10_last20
        NULL, -- home_team_high_danger_first10_last20
        wgi.home_shots,
        NULL, -- away_team_xgf_first10_last20
        NULL, -- away_team_xga_first10_last20
        NULL, -- away_team_rush_chances_first10_last20
        NULL, -- away_team_high_danger_first10_last20
        wgi.away_shots,
        now()
      FROM with_game_ids wgi
      ON CONFLICT (game_external_id)
      DO UPDATE SET
        goal_in_first_5 = EXCLUDED.goal_in_first_5,
        goal_in_first_10 = EXCLUDED.goal_in_first_10,
        home_team_shot_attempts_first10 = EXCLUDED.home_team_shot_attempts_first10,
        away_team_shot_attempts_first10 = EXCLUDED.away_team_shot_attempts_first10,
        date_iso = EXCLUDED.date_iso,
        updated_at = now()
      RETURNING game_external_id
    `;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Completed in ${elapsed}s: ${result.length} games inserted/updated`);

    // Show distribution
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
    console.log("\n📊 Distribution:");
    console.log(`  G1F5: ${d.g1f5_true} true, ${d.g1f5_false} false`);
    console.log(`  G1F10: ${d.g1f10_true} true, ${d.g1f10_false} false`);
    console.log(`  Total: ${d.total} rows`);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

const season =
  process.argv.find((a) => a.startsWith("--season="))?.split("=")[1] ||
  process.argv[process.argv.indexOf("--season") + 1] ||
  "2025-2026";

populateFast(season).catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
