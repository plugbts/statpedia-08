/**
 * Add shift-level features from MoneyPuck time-on-ice data.
 * First 5 minutes are dominated by top lines - we need shift-level granularity.
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

async function addShiftLevelFeatures(season: string) {
  const conn = getConn();
  if (!conn) throw new Error("No database connection string found");

  const sql = postgres(conn, { prepare: false });
  try {
    console.log(`⚡ Adding shift-level features for season: ${season}`);
    console.log("=".repeat(60));
    const startTime = Date.now();

    // Extract shift-level features from time-on-ice data
    // Top lines typically have more TOI in first 5 minutes
    const shiftFeatures = await sql`
      WITH shift_stats AS (
        SELECT
          game_external_id,
          team_abbr,
          -- Average time on ice (higher = top lines playing more)
          AVG((raw->>'shooterTimeOnIce')::numeric) FILTER (
            WHERE game_time_seconds <= 300
              AND (raw->>'shooterTimeOnIce')::numeric IS NOT NULL
          ) as avg_toi_first5,
          MAX((raw->>'shooterTimeOnIce')::numeric) FILTER (
            WHERE game_time_seconds <= 300
              AND (raw->>'shooterTimeOnIce')::numeric IS NOT NULL
          ) as max_toi_first5,
          -- Time since faceoff (shorter = more recent faceoff = higher tempo)
          AVG((raw->>'timeSinceFaceoff')::numeric) FILTER (
            WHERE game_time_seconds <= 300
              AND (raw->>'timeSinceFaceoff')::numeric IS NOT NULL
              AND (raw->>'timeSinceFaceoff')::numeric > 0
          ) as avg_time_since_faceoff_first5,
          MIN((raw->>'timeSinceFaceoff')::numeric) FILTER (
            WHERE game_time_seconds <= 300
              AND (raw->>'timeSinceFaceoff')::numeric IS NOT NULL
              AND (raw->>'timeSinceFaceoff')::numeric > 0
          ) as min_time_since_faceoff_first5,
          -- Shot speed (higher = more aggressive)
          AVG((raw->>'shotDistance')::numeric) FILTER (
            WHERE game_time_seconds <= 300
              AND (raw->>'shotDistance')::numeric IS NOT NULL
          ) as avg_shot_distance_first5
        FROM public.moneypuck_shots
        WHERE season = ${season}
          AND game_time_seconds IS NOT NULL
        GROUP BY game_external_id, team_abbr
      ),
      game_shift_stats AS (
        SELECT DISTINCT ON (ss1.game_external_id)
          ss1.game_external_id,
          -- Home team shift features
          ss1.avg_toi_first5 as home_avg_toi_first5,
          ss1.max_toi_first5 as home_max_toi_first5,
          ss1.avg_time_since_faceoff_first5 as home_avg_time_since_faceoff_first5,
          ss1.min_time_since_faceoff_first5 as home_min_time_since_faceoff_first5,
          ss1.avg_shot_distance_first5 as home_avg_shot_distance_first5,
          -- Away team shift features
          ss2.avg_toi_first5 as away_avg_toi_first5,
          ss2.max_toi_first5 as away_max_toi_first5,
          ss2.avg_time_since_faceoff_first5 as away_avg_time_since_faceoff_first5,
          ss2.min_time_since_faceoff_first5 as away_min_time_since_faceoff_first5,
          ss2.avg_shot_distance_first5 as away_avg_shot_distance_first5
        FROM shift_stats ss1
        JOIN shift_stats ss2 ON ss1.game_external_id = ss2.game_external_id
          AND ss1.team_abbr < ss2.team_abbr
        ORDER BY ss1.game_external_id, ss1.team_abbr
      )
      UPDATE public.icura_nhl_early_game_dataset d
      SET
        extras = COALESCE(extras, '{}'::jsonb) || jsonb_build_object(
          'home_avg_toi_first5', gss.home_avg_toi_first5,
          'home_max_toi_first5', gss.home_max_toi_first5,
          'home_avg_time_since_faceoff_first5', gss.home_avg_time_since_faceoff_first5,
          'home_min_time_since_faceoff_first5', gss.home_min_time_since_faceoff_first5,
          'home_avg_shot_distance_first5', gss.home_avg_shot_distance_first5,
          'away_avg_toi_first5', gss.away_avg_toi_first5,
          'away_max_toi_first5', gss.away_max_toi_first5,
          'away_avg_time_since_faceoff_first5', gss.away_avg_time_since_faceoff_first5,
          'away_min_time_since_faceoff_first5', gss.away_min_time_since_faceoff_first5,
          'away_avg_shot_distance_first5', gss.away_avg_shot_distance_first5
        ),
        updated_at = now()
      FROM game_shift_stats gss
      WHERE d.game_external_id = gss.game_external_id::text
        AND d.season = ${season}
      RETURNING d.game_external_id
    `;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Completed in ${elapsed}s: ${shiftFeatures.length} games updated`);

    // Show sample
    const sample = await sql`
      SELECT 
        game_external_id,
        extras->>'home_avg_toi_first5' as home_toi,
        extras->>'home_min_time_since_faceoff_first5' as home_faceoff,
        extras->>'away_avg_toi_first5' as away_toi
      FROM public.icura_nhl_early_game_dataset
      WHERE season = ${season}
        AND extras->>'home_avg_toi_first5' IS NOT NULL
      LIMIT 5
    `;
    console.log("\n📊 Sample shift-level features:");
    for (const s of sample) {
      console.log(
        `  Game ${s.game_external_id}: home_toi=${s.home_toi}, home_faceoff=${s.home_faceoff}, away_toi=${s.away_toi}`,
      );
    }
  } finally {
    await sql.end({ timeout: 2 });
  }
}

const season =
  process.argv.find((a) => a.startsWith("--season="))?.split("=")[1] ||
  process.argv[process.argv.indexOf("--season") + 1] ||
  "2023-2024";

addShiftLevelFeatures(season).catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
