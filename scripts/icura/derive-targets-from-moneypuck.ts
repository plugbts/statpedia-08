/**
 * Derive goal_in_first_5 and goal_in_first_10 targets from MoneyPuck shots data
 * for completed games and update the dataset.
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

async function deriveTargetsFromMoneyPuck() {
  const conn = getConn();
  if (!conn) throw new Error("No database connection string found");

  const sql = postgres(conn, { prepare: false });
  try {
    console.log("📊 Deriving targets from MoneyPuck shots...");

    // Get all games with MoneyPuck shots and derive targets
    const result = await sql`
      WITH game_targets AS (
        SELECT
          game_external_id,
          season,
          BOOL_OR(is_goal = true AND game_time_seconds <= 300) as goal_in_first_5,
          BOOL_OR(is_goal = true AND game_time_seconds <= 600) as goal_in_first_10
        FROM public.moneypuck_shots
        WHERE is_goal IS NOT NULL
          AND game_time_seconds IS NOT NULL
        GROUP BY game_external_id, season
      )
      UPDATE public.icura_nhl_early_game_dataset d
      SET
        goal_in_first_5 = gt.goal_in_first_5,
        goal_in_first_10 = gt.goal_in_first_10,
        updated_at = now()
      FROM game_targets gt
      WHERE d.game_external_id = gt.game_external_id::text
        AND (d.goal_in_first_5 IS NULL OR d.goal_in_first_10 IS NULL)
      RETURNING d.game_external_id, d.goal_in_first_5, d.goal_in_first_10
    `;

    console.log(`✅ Updated ${result.length} rows with targets from MoneyPuck`);

    // Show distribution
    const dist = await sql`
      SELECT
        COUNT(*) FILTER (WHERE goal_in_first_5 = true) as g1f5_true,
        COUNT(*) FILTER (WHERE goal_in_first_5 = false) as g1f5_false,
        COUNT(*) FILTER (WHERE goal_in_first_10 = true) as g1f10_true,
        COUNT(*) FILTER (WHERE goal_in_first_10 = false) as g1f10_false,
        COUNT(*) as total
      FROM public.icura_nhl_early_game_dataset
      WHERE goal_in_first_5 IS NOT NULL AND goal_in_first_10 IS NOT NULL
    `;

    const d = dist[0];
    console.log("\n📊 Target distribution:");
    console.log(`  G1F5: ${d.g1f5_true} true, ${d.g1f5_false} false`);
    console.log(`  G1F10: ${d.g1f10_true} true, ${d.g1f10_false} false`);
    console.log(`  Total: ${d.total} rows`);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

deriveTargetsFromMoneyPuck().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
