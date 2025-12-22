/**
 * Fix labels by recomputing game_time_seconds correctly.
 * The issue is that game_time_seconds might be computed incorrectly from period/time.
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

async function fixLabels() {
  const conn = getConn();
  if (!conn) throw new Error("No database connection string found");

  const sql = postgres(conn, { prepare: false });
  try {
    console.log("🔧 Fixing labels with correct game_time_seconds computation...");
    console.log("=".repeat(60));

    // Recompute labels using FIRST goal only, with correct game_time_seconds
    // game_time_seconds = (period - 1) * 20 * 60 + period_time_seconds
    const result = await sql`
      WITH first_goals AS (
        SELECT DISTINCT ON (game_external_id)
          game_external_id,
          period,
          period_time_seconds,
          -- Recompute game_time_seconds correctly
          CASE 
            WHEN period IS NOT NULL AND period_time_seconds IS NOT NULL 
            THEN (period - 1) * 20 * 60 + period_time_seconds
            ELSE NULL
          END as computed_game_time_seconds,
          game_time_seconds as stored_game_time_seconds
        FROM public.moneypuck_shots
        WHERE season = '2023-2024'
          AND is_goal = true
          AND period IS NOT NULL
          AND period_time_seconds IS NOT NULL
        ORDER BY game_external_id, 
          CASE 
            WHEN period IS NOT NULL AND period_time_seconds IS NOT NULL 
            THEN (period - 1) * 20 * 60 + period_time_seconds
            ELSE 99999
          END
      ),
      all_games AS (
        SELECT DISTINCT game_external_id
        FROM public.moneypuck_shots
        WHERE season = '2023-2024'
      ),
      game_labels AS (
        SELECT 
          ag.game_external_id,
          -- G1F5: first goal <= 300 seconds (5 minutes)
          COALESCE(fg.computed_game_time_seconds, 9999) <= 300 as goal_in_first_5,
          -- G1F10: first goal <= 600 seconds (10 minutes)
          COALESCE(fg.computed_game_time_seconds, 9999) <= 600 as goal_in_first_10
        FROM all_games ag
        LEFT JOIN first_goals fg ON ag.game_external_id = fg.game_external_id
      )
      UPDATE public.icura_nhl_early_game_dataset d
      SET
        goal_in_first_5 = gl.goal_in_first_5,
        goal_in_first_10 = gl.goal_in_first_10,
        updated_at = now()
      FROM game_labels gl
      WHERE d.game_external_id = gl.game_external_id::text
        AND d.season = '2023-2024'
      RETURNING d.game_external_id, d.goal_in_first_5, d.goal_in_first_10
    `;

    console.log(`✅ Updated ${result.length} games`);

    // Show new distribution
    const dist = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE goal_in_first_5 = true) as g1f5_true,
        COUNT(*) FILTER (WHERE goal_in_first_5 = false) as g1f5_false,
        COUNT(*) FILTER (WHERE goal_in_first_10 = true) as g1f10_true,
        COUNT(*) FILTER (WHERE goal_in_first_10 = false) as g1f10_false,
        COUNT(*) as total
      FROM public.icura_nhl_early_game_dataset
      WHERE season = '2023-2024'
        AND goal_in_first_5 IS NOT NULL
        AND goal_in_first_10 IS NOT NULL
    `;

    const d = dist[0];
    console.log("\n📊 New distribution:");
    console.log(
      `  G1F5: ${d.g1f5_true} true (${((d.g1f5_true / d.total) * 100).toFixed(1)}%), ${d.g1f5_false} false (${((d.g1f5_false / d.total) * 100).toFixed(1)}%)`,
    );
    console.log(
      `  G1F10: ${d.g1f10_true} true (${((d.g1f10_true / d.total) * 100).toFixed(1)}%), ${d.g1f10_false} false (${((d.g1f10_false / d.total) * 100).toFixed(1)}%)`,
    );
    console.log(`  Total: ${d.total} games`);
    console.log("\n⚠️  Expected:");
    console.log(`  G1F5: ~28-30%`);
    console.log(`  G1F10: ~58%`);

    // Check if there's a mismatch between stored and computed game_time_seconds
    const mismatch = await sql`
      SELECT 
        COUNT(*) as count,
        AVG(ABS(fg.stored_game_time_seconds - fg.computed_game_time_seconds)) as avg_diff
      FROM (
        SELECT DISTINCT ON (game_external_id)
          game_external_id,
          game_time_seconds as stored_game_time_seconds,
          CASE 
            WHEN period IS NOT NULL AND period_time_seconds IS NOT NULL 
            THEN (period - 1) * 20 * 60 + period_time_seconds
            ELSE NULL
          END as computed_game_time_seconds
        FROM public.moneypuck_shots
        WHERE season = '2023-2024'
          AND is_goal = true
          AND period IS NOT NULL
          AND period_time_seconds IS NOT NULL
        ORDER BY game_external_id, 
          CASE 
            WHEN period IS NOT NULL AND period_time_seconds IS NOT NULL 
            THEN (period - 1) * 20 * 60 + period_time_seconds
            ELSE 99999
          END
      ) fg
      WHERE fg.stored_game_time_seconds IS NOT NULL
        AND fg.computed_game_time_seconds IS NOT NULL
        AND ABS(fg.stored_game_time_seconds - fg.computed_game_time_seconds) > 1
    `;

    if (mismatch[0].count > 0) {
      console.log(
        `\n⚠️  Found ${mismatch[0].count} games with time mismatch (avg diff: ${mismatch[0].avg_diff?.toFixed(1)}s)`,
      );
    } else {
      console.log("\n✅ No time mismatches found - stored times are correct");
    }
  } finally {
    await sql.end({ timeout: 2 });
  }
}

fixLabels().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
