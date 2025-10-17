import "dotenv/config";
import postgres from "postgres";
import fs from "fs/promises";
import path from "path";

async function run() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("DATABASE_URL/NEON_DATABASE_URL is not set");
  const sql = postgres(conn, { prepare: false, max: 1 });
  try {
    const root = process.cwd();
    const files = [
      path.join(root, "sql/fix-opponent-resolution.sql"),
      path.join(root, "sql/fix-enrichment-issues.sql"),
      path.join(root, "sql/run-enrichment-jobs.sql"),
    ];

    for (const f of files) {
      const exists = await fs
        .access(f)
        .then(() => true)
        .catch(() => false);
      if (!exists) {
        console.warn(`[skip] Missing SQL file: ${f}`);
        continue;
      }
      const content = await fs.readFile(f, "utf8");
      console.log(`\n➡️  Running ${path.basename(f)}...`);
      await sql.unsafe(content);
      console.log(`✅ Completed ${path.basename(f)}`);
    }
  } finally {
    await sql.end({ timeout: 2 });
  }
}

run().catch((e) => {
  console.error("Enrichment run failed:", e);
  process.exit(1);
});
