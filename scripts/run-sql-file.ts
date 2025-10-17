import { config } from "dotenv";
import fs from "fs";
import path from "path";
import postgres from "postgres";

config({ path: ".env.local" });

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: tsx scripts/run-sql-file.ts <sql-file-path>");
    process.exit(1);
  }

  const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("No DB URL (NEON_DATABASE_URL or DATABASE_URL)");
    process.exit(1);
  }

  const sql = postgres(connectionString, { prepare: false });
  try {
    const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
    const text = fs.readFileSync(abs, "utf8");
    console.log(`Running SQL file: ${abs} (\u2264${text.length} bytes)`);
    await sql.unsafe(text);
    console.log("\n✅ SQL executed successfully");
  } catch (e: any) {
    console.error("\n❌ SQL execution failed:", e?.message || e);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
