// Automated schema verifier and creator for Neon/Postgres (core tables)
// Usage: npx tsx scripts/verify-and-apply-core-schema.ts
import { config } from "dotenv";
config();
config({ path: ".env.local" });

import postgres from "postgres";

const requiredTables = [
  "leagues",
  "teams",
  "players",
  "props",
  "prop_types",
  "player_props",
  "games",
  "user_roles",
  "users",
];

async function main() {
  const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL/NEON_DATABASE_URL not set");
    process.exit(1);
  }
  const sql = postgres(DATABASE_URL, { prepare: false });
  try {
    const tables = await sql /* sql */ `
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public';
    `;
    const existing = new Set(tables.map((r: any) => r.table_name));
    const missing = requiredTables.filter((t) => !existing.has(t));
    if (missing.length === 0) {
      console.log("✅ All required core tables exist.");
      await sql.end({ timeout: 1 });
      return;
    }
    console.log("⚠️ Missing tables:", missing);
    for (const t of missing) {
      await sql.unsafe(
        `CREATE TABLE IF NOT EXISTS ${t} (id uuid PRIMARY KEY DEFAULT gen_random_uuid());`,
      );
      console.log(`🛠️ Created table: ${t}`);
    }
    console.log("✅ Core schema alignment complete.");
  } finally {
    await sql.end({ timeout: 1 });
  }
}

main().catch((err) => {
  console.error("❌ Failed to verify/apply core schema:", err);
  process.exit(1);
});
