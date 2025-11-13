import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const db = postgres(conn);

async function checkSchema() {
  const columns = await db`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'player_game_logs'
    ORDER BY ordinal_position
  `;

  console.log("player_game_logs columns:");
  console.table(columns);

  const sample = await db`SELECT * FROM player_game_logs LIMIT 1`;
  console.log("\nSample row keys:", Object.keys(sample[0] || {}));

  process.exit(0);
}

checkSchema().catch(console.error);
