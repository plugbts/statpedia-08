import { config } from "dotenv";
import postgres from "postgres";
import { sql } from "drizzle-orm";

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const db = postgres(conn);

async function verifyGameDates() {
  console.log("🔍 Verifying game_date distribution in player_game_logs...\n");

  // Check players with multiple games
  const results = await db`
    SELECT 
      player_id,
      COUNT(DISTINCT game_date) as unique_dates,
      COUNT(*) as total_logs,
      MIN(game_date) as earliest,
      MAX(game_date) as latest
    FROM player_game_logs
    GROUP BY player_id
    HAVING COUNT(*) > 10
    ORDER BY total_logs DESC
    LIMIT 20
  `;

  console.log("Top 20 players by log count:\n");
  console.table(results);

  // Summary stats
  const summary = await db`
    SELECT 
      COUNT(DISTINCT player_id) as total_players,
      COUNT(DISTINCT game_date) as unique_dates,
      MIN(game_date) as earliest_date,
      MAX(game_date) as latest_date,
      COUNT(*) as total_logs
    FROM player_game_logs
  `;

  console.log("\n📊 Overall Summary:");
  console.table(summary);

  // Check date distribution
  const dateDistribution = await db`
    SELECT 
      game_date,
      COUNT(*) as log_count,
      COUNT(DISTINCT player_id) as player_count
    FROM player_game_logs
    GROUP BY game_date
    ORDER BY game_date DESC
    LIMIT 10
  `;

  console.log("\n📅 Most recent 10 dates:");
  console.table(dateDistribution);

  process.exit(0);
}

verifyGameDates().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
