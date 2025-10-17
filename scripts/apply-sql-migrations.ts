import "dotenv/config";
import postgres from "postgres";
import fs from "fs/promises";
import path from "path";

async function run() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) {
    console.error("DATABASE_URL/NEON_DATABASE_URL is not set");
    process.exit(1);
  }
  const sql = postgres(conn, { prepare: false, max: 1 });
  try {
    const root = process.cwd();
    const files = [
      path.join(root, "db/migrations/0005_team_abbrev_map_logo_and_seed.sql"),
      path.join(root, "db/migrations/0006_update_v_props_list_add_logos.sql"),
    ];

    for (const file of files) {
      try {
        const exists = await fs
          .access(file)
          .then(() => true)
          .catch(() => false);
        if (!exists) {
          console.warn(`[skip] File not found: ${file}`);
          continue;
        }
        const content = await fs.readFile(file, "utf8");
        console.log(`\n➡️  Applying ${path.basename(file)}...`);
        await sql.unsafe(content);
        console.log(`✅ Applied ${path.basename(file)}`);
      } catch (e: any) {
        const base = path.basename(file);
        console.error(`❌ Failed to apply ${base}:`, e.message || e);
        // Fallback: if it's the view file, try replace-view script
        if (base.includes("0006_update_v_props_list_add_logos.sql")) {
          const fallback = path.join(root, "scripts/replace-view-v-props-list.sql");
          console.log(
            `\n➡️  Attempting fallback replacement for v_props_list using ${path.basename(fallback)}...`,
          );
          const content2 = await fs.readFile(fallback, "utf8");
          await sql.unsafe(content2);
          console.log("✅ Replaced view v_props_list via fallback script");
          continue;
        }
        throw e;
      }
    }
  } finally {
    await sql.end({ timeout: 2 });
  }
}

run().catch((e) => {
  console.error("Migration script failed:", e);
  process.exit(1);
});
