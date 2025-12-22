import "dotenv/config";
import postgres from "postgres";
import fs from "fs/promises";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: tsx scripts/apply-sql-file.ts <path-to-sql>");
    process.exit(1);
  }
  const conn =
    process.env.SUPABASE_DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) {
    console.error("No SUPABASE_DATABASE_URL/DATABASE_URL/NEON_DATABASE_URL");
    process.exit(1);
  }
  const sql = postgres(conn, { prepare: false });
  try {
    const content = await fs.readFile(file, "utf8");
    await sql.unsafe(content);
    console.log(`Applied ${file}`);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((e) => {
  console.error("apply-sql-file failed:", e.message || e);
  process.exit(1);
});
