import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const sql = postgres(conn, { prepare: false });

async function main() {
  const leagues =
    await sql`SELECT id, code, name, sport FROM leagues WHERE code IN ('NFL', 'MLB', 'NHL', 'NBA')`;
  console.table(leagues);
  await sql.end();
}

main().catch(console.error);
