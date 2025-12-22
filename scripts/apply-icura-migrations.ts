import "dotenv/config";
import postgres from "postgres";
import fs from "fs/promises";
import path from "path";

async function main() {
  // Use Neon (prioritize NEON_DATABASE_URL)
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) {
    console.error("❌ NEON_DATABASE_URL or DATABASE_URL is not set in .env.local");
    process.exit(1);
  }

  // Show which DB we're connecting to (without exposing password)
  const dbInfo = conn.replace(/:[^:@]+@/, ":****@");
  const host = dbInfo.split("@")[1]?.split("/")[0] || "unknown";
  console.log(`Connecting to Neon: ${host}`);

  const sql = postgres(conn, { prepare: false, max: 1 });
  try {
    // Test connection
    await sql`SELECT 1 as test`;
    console.log("✅ Database connection successful\n");

    const migrations = [
      "0014_icura_nhl_backbone.sql",
      "0015_icura_early_goal_engine.sql",
      "0016_moneypuck_shots_and_early_markets.sql",
      "0017_icura_link_by_external_game_id.sql",
    ];

    for (const migration of migrations) {
      const file = path.join(process.cwd(), "db/migrations", migration);
      try {
        const exists = await fs
          .access(file)
          .then(() => true)
          .catch(() => false);
        if (!exists) {
          console.warn(`[skip] File not found: ${migration}`);
          continue;
        }

        const content = await fs.readFile(file, "utf8");
        console.log(`\n➡️  Applying ${migration}...`);

        // Apply entire file as one statement (PostgreSQL supports multi-statement SQL)
        try {
          await sql.unsafe(content);
        } catch (e: any) {
          // Ignore "already exists" errors for extensions, tables, indexes, constraints
          if (
            e.message?.includes("already exists") ||
            e.code === "42P07" || // duplicate_table
            e.code === "42710" || // duplicate_object
            e.code === "42P16" || // invalid_table_definition (sometimes for constraints)
            e.message?.includes("skipping")
          ) {
            console.log(`  [skip] ${e.message.split("\n")[0]}`);
          } else {
            throw e;
          }
        }

        console.log(`✅ Applied ${migration}`);
      } catch (e: any) {
        console.error(`❌ Failed to apply ${migration}:`, e.message || e);
        // Continue with next migration
      }
    }
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((e) => {
  console.error("Migration script failed:", e);
  process.exit(1);
});
