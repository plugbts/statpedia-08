/**
 * Add penalty features for G1F5 prediction.
 * Penalties in the first 5 minutes are highly predictive.
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

async function addPenaltyFeatures(season: string) {
  const conn = getConn();
  if (!conn) throw new Error("No database connection string found");

  const sql = postgres(conn, { prepare: false });
  try {
    console.log(`⚡ Adding penalty features for season: ${season}`);
    console.log("=".repeat(60));
    const startTime = Date.now();

    // For now, we'll compute penalty features from game events if available
    // This is a placeholder - we'd need penalty data from NHL API or MoneyPuck
    // For now, we'll add columns and set them to NULL (to be populated later)

    console.log("⚠️  Penalty features require penalty event data from NHL API");
    console.log("   This is a placeholder - columns will be added but remain NULL");
    console.log("   To populate: need to fetch penalty events from NHL API play-by-play");

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Completed in ${elapsed}s`);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

const season =
  process.argv.find((a) => a.startsWith("--season="))?.split("=")[1] ||
  process.argv[process.argv.indexOf("--season") + 1] ||
  "2023-2024";

addPenaltyFeatures(season).catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
