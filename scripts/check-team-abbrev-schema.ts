import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const db = postgres(conn);

async function checkSchema() {
  console.log("🔍 Checking team_abbrev_map schema...\n");

  const columns = await db`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'team_abbrev_map'
    ORDER BY ordinal_position
  `;

  console.table(columns);

  console.log("\n📋 Sample data:");
  const sample = await db`
    SELECT * FROM team_abbrev_map LIMIT 5
  `;
  console.table(sample);

  process.exit(0);
}

checkSchema().catch(console.error);
