/**
 * Compute missing early-game features from MoneyPuck shots:
 * - time_to_first_shot
 * - time_to_first_HD
 * - goalie_save_pct_first10
 * - goalie_rebound_rate_first10
 * - avg_shot_speed_first10
 * - penalties_first10 (from events)
 * - Historical rolling averages (last20)
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

async function computeFeatures(season: string) {
  const conn = getConn();
  if (!conn) throw new Error("No database connection string found");

  const sql = postgres(conn, { prepare: false });
  try {
    console.log(`⚡ Computing early-game features for season: ${season}`);
    console.log("=".repeat(60));
    const startTime = Date.now();

    // Step 1: Compute game-level features from MoneyPuck shots
    console.log("Step 1: Computing game-level features from MoneyPuck shots...");

    const gameFeatures = await sql`
      WITH team_game_stats AS (
        SELECT
          game_external_id,
          team_abbr,
          -- Time to first events (critical for G1F5)
          MIN(game_time_seconds) FILTER (WHERE game_time_seconds <= 600) as time_to_first_shot,
          MIN(game_time_seconds) FILTER (WHERE is_high_danger = true AND game_time_seconds <= 600) as time_to_first_hd,
          MIN(game_time_seconds) FILTER (WHERE is_rush = true AND game_time_seconds <= 600) as time_to_first_rush,
          -- First 5 minute stats (critical for G1F5)
          COUNT(*) FILTER (WHERE game_time_seconds <= 300) as shots_first5,
          COUNT(*) FILTER (WHERE is_goal = true AND game_time_seconds <= 300) as goals_first5,
          COALESCE(SUM(xg) FILTER (WHERE game_time_seconds <= 300), 0) as xgf_first5,
          COUNT(*) FILTER (WHERE is_high_danger = true AND game_time_seconds <= 300) as hd_first5,
          COUNT(*) FILTER (WHERE is_rush = true AND game_time_seconds <= 300) as rush_first5,
          COUNT(*) FILTER (WHERE is_rebound = true AND game_time_seconds <= 300) as rebounds_first5,
          -- First 10 minute stats
          COUNT(*) FILTER (WHERE game_time_seconds <= 600) as shots_first10,
          COUNT(*) FILTER (WHERE is_goal = true AND game_time_seconds <= 600) as goals_first10,
          COALESCE(SUM(xg) FILTER (WHERE game_time_seconds <= 600), 0) as xgf_first10,
          COUNT(*) FILTER (WHERE is_high_danger = true AND game_time_seconds <= 600) as hd_first10,
          COUNT(*) FILTER (WHERE is_rush = true AND game_time_seconds <= 600) as rush_first10,
          COUNT(*) FILTER (WHERE is_rebound = true AND game_time_seconds <= 600) as rebounds_first10,
          -- Average shot speed
          AVG(shot_speed) FILTER (WHERE game_time_seconds <= 600 AND shot_speed IS NOT NULL) as avg_shot_speed_first10
        FROM public.moneypuck_shots
        WHERE season = ${season}
          AND game_time_seconds IS NOT NULL
        GROUP BY game_external_id, team_abbr
      ),
      game_pairs AS (
        SELECT DISTINCT ON (tgs1.game_external_id)
          tgs1.game_external_id,
          -- Home team time-to-first events (critical for G1F5)
          tgs1.time_to_first_shot as home_time_to_first_shot,
          tgs1.time_to_first_hd as home_time_to_first_hd,
          tgs1.time_to_first_rush as home_time_to_first_rush,
          -- Home team first 5 stats
          tgs1.shots_first5 as home_shots_first5,
          tgs1.goals_first5 as home_goals_first5,
          tgs1.xgf_first5 as home_xgf_first5,
          tgs1.hd_first5 as home_hd_first5,
          tgs1.rush_first5 as home_rush_first5,
          tgs1.rebounds_first5 as home_rebounds_first5,
          -- Home team first 10 stats
          tgs1.shots_first10 as home_shots_first10,
          tgs1.goals_first10 as home_goals_first10,
          tgs1.xgf_first10 as home_xgf_first10,
          tgs1.hd_first10 as home_hd_first10,
          tgs1.rush_first10 as home_rush_first10,
          tgs1.rebounds_first10 as home_rebounds_first10,
          tgs1.avg_shot_speed_first10 as home_avg_shot_speed_first10,
          -- Away team time-to-first events
          tgs2.time_to_first_shot as away_time_to_first_shot,
          tgs2.time_to_first_hd as away_time_to_first_hd,
          tgs2.time_to_first_rush as away_time_to_first_rush,
          -- Away team first 5 stats
          tgs2.shots_first5 as away_shots_first5,
          tgs2.goals_first5 as away_goals_first5,
          tgs2.xgf_first5 as away_xgf_first5,
          tgs2.hd_first5 as away_hd_first5,
          tgs2.rush_first5 as away_rush_first5,
          tgs2.rebounds_first5 as away_rebounds_first5,
          -- Away team first 10 stats
          tgs2.shots_first10 as away_shots_first10,
          tgs2.goals_first10 as away_goals_first10,
          tgs2.xgf_first10 as away_xgf_first10,
          tgs2.hd_first10 as away_hd_first10,
          tgs2.rush_first10 as away_rush_first10,
          tgs2.rebounds_first10 as away_rebounds_first10,
          tgs2.avg_shot_speed_first10 as away_avg_shot_speed_first10,
          -- Goalie stats (shots faced = opponent's shots)
          -- First 5
          tgs2.shots_first5 as home_goalie_shots_faced_first5,
          tgs2.goals_first5 as home_goalie_goals_allowed_first5,
          tgs2.xgf_first5 as home_goalie_xg_faced_first5,
          tgs1.shots_first5 as away_goalie_shots_faced_first5,
          tgs1.goals_first5 as away_goalie_goals_allowed_first5,
          tgs1.xgf_first5 as away_goalie_xg_faced_first5,
          -- First 10
          tgs2.shots_first10 as home_goalie_shots_faced_first10,
          tgs2.goals_first10 as home_goalie_goals_allowed_first10,
          tgs2.xgf_first10 as home_goalie_xg_faced_first10,
          tgs1.shots_first10 as away_goalie_shots_faced_first10,
          tgs1.goals_first10 as away_goalie_goals_allowed_first10,
          tgs1.xgf_first10 as away_goalie_xg_faced_first10,
          -- Rebound stats for goalie calculation
          tgs1.rebounds_first5 as home_rebounds_first5,
          tgs2.rebounds_first5 as away_rebounds_first5
        FROM team_game_stats tgs1
        JOIN team_game_stats tgs2 ON tgs1.game_external_id = tgs2.game_external_id
          AND tgs1.team_abbr < tgs2.team_abbr
        ORDER BY tgs1.game_external_id, tgs1.team_abbr
      )
      SELECT * FROM game_pairs
    `;

    console.log(`  Computed features for ${gameFeatures.length} games`);

    // Step 2: Bulk update dataset with computed features (single SQL query)
    console.log("\nStep 2: Bulk updating dataset...");

    const updated = await sql`
      UPDATE public.icura_nhl_early_game_dataset d
      SET
        -- First 10 features
        home_team_xgf_first10_last20 = gf.home_xgf_first10,
        home_team_xga_first10_last20 = gf.away_xgf_first10,
        home_team_rush_chances_first10_last20 = gf.home_rush_first10,
        home_team_high_danger_first10_last20 = gf.home_hd_first10,
        home_team_shot_attempts_first10 = gf.home_shots_first10,
        away_team_xgf_first10_last20 = gf.away_xgf_first10,
        away_team_xga_first10_last20 = gf.home_xgf_first10,
        away_team_rush_chances_first10_last20 = gf.away_rush_first10,
        away_team_high_danger_first10_last20 = gf.away_hd_first10,
        away_team_shot_attempts_first10 = gf.away_shots_first10,
        -- First 5 features (critical for G1F5)
        home_team_xgf_first5_last20 = gf.home_xgf_first5,
        home_team_shots_first5_last20 = gf.home_shots_first5,
        home_team_high_danger_first5_last20 = gf.home_hd_first5,
        home_team_rush_chances_first5_last20 = gf.home_rush_first5,
        home_team_time_to_first_shot = gf.home_time_to_first_shot,
        home_team_time_to_first_hd = gf.home_time_to_first_hd,
        home_team_time_to_first_rush = gf.home_time_to_first_rush,
        away_team_xgf_first5_last20 = gf.away_xgf_first5,
        away_team_shots_first5_last20 = gf.away_shots_first5,
        away_team_high_danger_first5_last20 = gf.away_hd_first5,
        away_team_rush_chances_first5_last20 = gf.away_rush_first5,
        away_team_time_to_first_shot = gf.away_time_to_first_shot,
        away_team_time_to_first_hd = gf.away_time_to_first_hd,
        away_team_time_to_first_rush = gf.away_time_to_first_rush,
        -- Goalie first 5 stats
        home_goalie_save_pct_first5 = CASE 
          WHEN gf.home_goalie_shots_faced_first5 > 0 
          THEN (gf.home_goalie_shots_faced_first5 - gf.home_goalie_goals_allowed_first5)::numeric / gf.home_goalie_shots_faced_first5
          ELSE NULL
        END,
        home_goalie_gsax_first5 = CASE
          WHEN gf.home_goalie_xg_faced_first5 IS NOT NULL AND gf.home_goalie_goals_allowed_first5 IS NOT NULL
          THEN gf.home_goalie_xg_faced_first5 - gf.home_goalie_goals_allowed_first5
          ELSE NULL
        END,
        home_goalie_rebound_rate_first5 = CASE
          WHEN gf.home_goalie_shots_faced_first5 > 0
          THEN gf.home_rebounds_first5::numeric / gf.home_goalie_shots_faced_first5
          ELSE NULL
        END,
        away_goalie_save_pct_first5 = CASE
          WHEN gf.away_goalie_shots_faced_first5 > 0
          THEN (gf.away_goalie_shots_faced_first5 - gf.away_goalie_goals_allowed_first5)::numeric / gf.away_goalie_shots_faced_first5
          ELSE NULL
        END,
        away_goalie_gsax_first5 = CASE
          WHEN gf.away_goalie_xg_faced_first5 IS NOT NULL AND gf.away_goalie_goals_allowed_first5 IS NOT NULL
          THEN gf.away_goalie_xg_faced_first5 - gf.away_goalie_goals_allowed_first5
          ELSE NULL
        END,
        away_goalie_rebound_rate_first5 = CASE
          WHEN gf.away_goalie_shots_faced_first5 > 0
          THEN gf.away_rebounds_first5::numeric / gf.away_goalie_shots_faced_first5
          ELSE NULL
        END,
        updated_at = now()
      FROM (
        WITH team_game_stats AS (
          SELECT
            game_external_id,
            team_abbr,
            -- Time to first events
            MIN(game_time_seconds) FILTER (WHERE game_time_seconds <= 600) as time_to_first_shot,
            MIN(game_time_seconds) FILTER (WHERE is_high_danger = true AND game_time_seconds <= 600) as time_to_first_hd,
            MIN(game_time_seconds) FILTER (WHERE is_rush = true AND game_time_seconds <= 600) as time_to_first_rush,
            -- First 5 stats
            COUNT(*) FILTER (WHERE game_time_seconds <= 300) as shots_first5,
            COUNT(*) FILTER (WHERE is_goal = true AND game_time_seconds <= 300) as goals_first5,
            COALESCE(SUM(xg) FILTER (WHERE game_time_seconds <= 300), 0) as xgf_first5,
            COUNT(*) FILTER (WHERE is_high_danger = true AND game_time_seconds <= 300) as hd_first5,
            COUNT(*) FILTER (WHERE is_rush = true AND game_time_seconds <= 300) as rush_first5,
            COUNT(*) FILTER (WHERE is_rebound = true AND game_time_seconds <= 300) as rebounds_first5,
            -- First 10 stats
            COUNT(*) FILTER (WHERE game_time_seconds <= 600) as shots_first10,
            COUNT(*) FILTER (WHERE is_goal = true AND game_time_seconds <= 600) as goals_first10,
            COALESCE(SUM(xg) FILTER (WHERE game_time_seconds <= 600), 0) as xgf_first10,
            COUNT(*) FILTER (WHERE is_high_danger = true AND game_time_seconds <= 600) as hd_first10,
            COUNT(*) FILTER (WHERE is_rush = true AND game_time_seconds <= 600) as rush_first10
          FROM public.moneypuck_shots
          WHERE season = ${season}
            AND game_time_seconds IS NOT NULL
          GROUP BY game_external_id, team_abbr
        ),
        game_pairs AS (
          SELECT DISTINCT ON (tgs1.game_external_id)
            tgs1.game_external_id,
            -- Home team first 5
            tgs1.time_to_first_shot as home_time_to_first_shot,
            tgs1.time_to_first_hd as home_time_to_first_hd,
            tgs1.time_to_first_rush as home_time_to_first_rush,
            tgs1.shots_first5 as home_shots_first5,
            tgs1.goals_first5 as home_goals_first5,
            tgs1.xgf_first5 as home_xgf_first5,
            tgs1.hd_first5 as home_hd_first5,
            tgs1.rush_first5 as home_rush_first5,
            tgs1.rebounds_first5 as home_rebounds_first5,
            -- Home team first 10
            tgs1.xgf_first10 as home_xgf_first10,
            tgs1.hd_first10 as home_hd_first10,
            tgs1.rush_first10 as home_rush_first10,
            tgs1.shots_first10 as home_shots_first10,
            -- Away team first 5
            tgs2.time_to_first_shot as away_time_to_first_shot,
            tgs2.time_to_first_hd as away_time_to_first_hd,
            tgs2.time_to_first_rush as away_time_to_first_rush,
            tgs2.shots_first5 as away_shots_first5,
            tgs2.goals_first5 as away_goals_first5,
            tgs2.xgf_first5 as away_xgf_first5,
            tgs2.hd_first5 as away_hd_first5,
            tgs2.rush_first5 as away_rush_first5,
            tgs2.rebounds_first5 as away_rebounds_first5,
            -- Away team first 10
            tgs2.xgf_first10 as away_xgf_first10,
            tgs2.hd_first10 as away_hd_first10,
            tgs2.rush_first10 as away_rush_first10,
            tgs2.shots_first10 as away_shots_first10,
            -- Goalie stats (shots faced = opponent's shots)
            tgs2.shots_first5 as home_goalie_shots_faced_first5,
            tgs2.goals_first5 as home_goalie_goals_allowed_first5,
            tgs2.xgf_first5 as home_goalie_xg_faced_first5,
            tgs1.shots_first5 as away_goalie_shots_faced_first5,
            tgs1.goals_first5 as away_goalie_goals_allowed_first5,
            tgs1.xgf_first5 as away_goalie_xg_faced_first5
          FROM team_game_stats tgs1
          JOIN team_game_stats tgs2 ON tgs1.game_external_id = tgs2.game_external_id
            AND tgs1.team_abbr < tgs2.team_abbr
          ORDER BY tgs1.game_external_id, tgs1.team_abbr
        )
        SELECT * FROM game_pairs
      ) gf
      WHERE d.game_external_id = gf.game_external_id::text
        AND d.season = ${season}
      RETURNING d.game_external_id
    `;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Completed in ${elapsed}s: ${updated.length} games updated`);

    // Step 3: Compute historical rolling averages (last20) - this is more complex
    console.log("\nStep 3: Computing historical rolling averages (last20)...");
    console.log("  (This requires ordering by date - skipping for now, will add later)");
  } finally {
    await sql.end({ timeout: 2 });
  }
}

const season =
  process.argv.find((a) => a.startsWith("--season="))?.split("=")[1] ||
  process.argv[process.argv.indexOf("--season") + 1] ||
  "2023-2024";

computeFeatures(season).catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
