import "dotenv/config";
import postgres from "postgres";
import fs from "fs/promises";

async function main() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) {
    console.error("No DATABASE_URL/NEON_DATABASE_URL");
    process.exit(1);
  }
  const sql = postgres(conn, { prepare: false });
  try {
    const content = await fs.readFile("scripts/create-team-abbrev-mapping-corrected.sql", "utf8");
    // Execute only the MLB section safely by splitting; fallback: run entire file (idempotent with deletes embedded)
    await sql.unsafe(content);
    console.log("Seeded team_abbrev_map (including MLB) successfully");
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((e) => {
  console.error("Seeding failed:", e.message || e);
  process.exit(1);
});
