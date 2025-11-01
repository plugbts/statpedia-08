import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const sql = postgres(conn, { prepare: false });

async function main() {
  console.log("🔍 Checking Database Tables\n");

  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;

  console.log("Available tables:");
  for (const t of tables) {
    console.log(`  - ${t.table_name}`);
  }

  // Check game_id references in player_game_logs
  console.log("\n🔗 Checking game_id in player_game_logs:");
  const gameIdCheck = await sql`
    SELECT 
      COUNT(*) as total_logs,
      COUNT(game_id) as logs_with_game_id,
      COUNT(DISTINCT game_id) as unique_game_ids
    FROM player_game_logs
    WHERE prop_type IN ('Passing Yards', 'Rushing Yards', 'Receiving Yards')
  `;

  console.log(`  Total logs: ${gameIdCheck[0].total_logs}`);
  console.log(`  Logs with game_id: ${gameIdCheck[0].logs_with_game_id}`);
  console.log(`  Unique game_ids: ${gameIdCheck[0].unique_game_ids}`);

  await sql.end();
}

main().catch(console.error);
