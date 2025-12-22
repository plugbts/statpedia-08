/**
 * Add penalty and faceoff features from MoneyPuck shots data.
 * Penalties in first 5 minutes are highly predictive of G1F5.
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

async function addPenaltyAndFaceoffFeatures(season: string) {
  const conn = getConn();
  if (!conn) throw new Error("No database connection string found");

  const sql = postgres(conn, { prepare: false });
  try {
    console.log(`⚡ Adding penalty and faceoff features for season: ${season}`);
    console.log("=".repeat(60));
    const startTime = Date.now();

    // Extract penalty and faceoff features from MoneyPuck raw JSON
    console.log("\nStep 1: Computing penalty and faceoff features...");

    const updated = await sql`
      UPDATE public.icura_nhl_early_game_dataset d
      SET
        extras = COALESCE(extras, '{}'::jsonb) || jsonb_build_object(
          'home_penalties_first5', pfs.home_pp_events_first5,
          'home_penalty_time_first5', pfs.home_penalty_time_first5,
          'away_penalties_first5', pfs.away_pp_events_first5,
          'away_penalty_time_first5', pfs.away_penalty_time_first5,
          'avg_time_since_faceoff_first5', pfs.avg_time_since_faceoff_first5,
          'min_time_since_faceoff_first5', pfs.min_time_since_faceoff_first5
        ),
        updated_at = now()
      FROM (
        SELECT
          game_external_id,
          -- Penalties in first 5 minutes (detect from power play situations: 5v4 or 4v5)
          COUNT(*) FILTER (
            WHERE ((raw->>'homeSkatersOnIce')::int = 5 AND (raw->>'awaySkatersOnIce')::int = 4)
              AND game_time_seconds <= 300
          ) as home_pp_events_first5,
          COUNT(*) FILTER (
            WHERE ((raw->>'homeSkatersOnIce')::int = 4 AND (raw->>'awaySkatersOnIce')::int = 5)
              AND game_time_seconds <= 300
          ) as away_pp_events_first5,
          -- Penalty time (from penalty length if available, otherwise estimate from PP duration)
          COALESCE(SUM((raw->>'homePenalty1Length')::numeric) FILTER (
            WHERE (raw->>'homePenalty1Length')::numeric > 0 
              AND game_time_seconds <= 300
          ), COUNT(*) FILTER (
            WHERE ((raw->>'homeSkatersOnIce')::int = 5 AND (raw->>'awaySkatersOnIce')::int = 4)
              AND game_time_seconds <= 300
          ) * 2) as home_penalty_time_first5,  -- Estimate 2 min per PP
          COALESCE(SUM((raw->>'awayPenalty1Length')::numeric) FILTER (
            WHERE (raw->>'awayPenalty1Length')::numeric > 0 
              AND game_time_seconds <= 300
          ), COUNT(*) FILTER (
            WHERE ((raw->>'homeSkatersOnIce')::int = 4 AND (raw->>'awaySkatersOnIce')::int = 5)
              AND game_time_seconds <= 300
          ) * 2) as away_penalty_time_first5,
          -- Penalty time in first 5 (proxy for penalty severity)
          COALESCE(SUM((raw->>'homePenalty1Length')::numeric) FILTER (
            WHERE (raw->>'homePenalty1Length')::numeric > 0 
              AND game_time_seconds <= 300
          ), 0) as home_penalty_time_first5,
          COALESCE(SUM((raw->>'awayPenalty1Length')::numeric) FILTER (
            WHERE (raw->>'awayPenalty1Length')::numeric > 0 
              AND game_time_seconds <= 300
          ), 0) as away_penalty_time_first5,
          -- Time since faceoff (shorter = more recent faceoff, higher tempo)
          AVG((raw->>'timeSinceFaceoff')::numeric) FILTER (
            WHERE game_time_seconds <= 300
              AND (raw->>'timeSinceFaceoff')::numeric IS NOT NULL
              AND (raw->>'timeSinceFaceoff')::numeric > 0
          ) as avg_time_since_faceoff_first5,
          MIN((raw->>'timeSinceFaceoff')::numeric) FILTER (
            WHERE game_time_seconds <= 300
              AND (raw->>'timeSinceFaceoff')::numeric IS NOT NULL
              AND (raw->>'timeSinceFaceoff')::numeric > 0
          ) as min_time_since_faceoff_first5
        FROM public.moneypuck_shots
        WHERE season = ${season}
          AND game_time_seconds IS NOT NULL
        GROUP BY game_external_id
      ) pfs
      WHERE d.game_external_id = pfs.game_external_id::text
        AND d.season = ${season}
      RETURNING d.game_external_id
    `;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Completed in ${elapsed}s: ${updated.length} games updated`);

    // Show sample
    const sample = await sql`
      SELECT 
        game_external_id,
        extras->>'home_penalties_first5' as home_penalties,
        extras->>'away_penalties_first5' as away_penalties,
        extras->>'min_time_since_faceoff_first5' as min_faceoff_time
      FROM public.icura_nhl_early_game_dataset
      WHERE season = ${season}
        AND extras->>'home_penalties_first5' IS NOT NULL
      LIMIT 5
    `;
    console.log("\n📊 Sample penalty/faceoff features:");
    for (const s of sample) {
      console.log(
        `  Game ${s.game_external_id}: home_penalties=${s.home_penalties}, away_penalties=${s.away_penalties}, min_faceoff=${s.min_faceoff_time}`,
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

addPenaltyAndFaceoffFeatures(season).catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
