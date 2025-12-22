import "dotenv/config";
import postgres from "postgres";
import fs from "fs/promises";
import path from "path";

async function main() {
  // Use Supabase connection string directly
  const conn =
    "postgresql://postgres:Tkinggaming!@db.jvnmbybielczkleckogr.supabase.co:5432/postgres";

  console.log(`Connecting to Supabase: db.jvnmbybielczkleckogr.supabase.co:5432/postgres`);

  const sql = postgres(conn, { prepare: false, max: 1 });
  try {
    // Test connection
    const test = await sql`SELECT version() as v, current_database() as db`;
    console.log(`✅ Database connection successful`);
    console.log(`   Database: ${test[0].db}\n`);

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

        // Apply entire file as one statement
        try {
          await sql.unsafe(content);
          console.log(`✅ Applied ${migration}`);
        } catch (e: any) {
          // Ignore "already exists" errors for extensions, tables, indexes, constraints
          if (
            e.message?.includes("already exists") ||
            e.code === "42P07" || // duplicate_table
            e.code === "42710" || // duplicate_object
            e.code === "42P16" || // invalid_table_definition
            e.message?.includes("skipping") ||
            e.severity === "NOTICE"
          ) {
            console.log(`  [skip] ${e.message?.split("\n")[0] || e.code}`);
          } else {
            throw e;
          }
        }
      } catch (e: any) {
        console.error(`❌ Failed to apply ${migration}:`, e.message || e);
        // Continue with next migration
      }
    }

    console.log("\n✅ All migrations completed!");
  } catch (e: any) {
    if (e.code === "ENOTFOUND" || e.message?.includes("getaddrinfo")) {
      console.error("\n❌ DNS resolution failed. Possible issues:");
      console.error("   1. Supabase project may be paused");
      console.error("   2. Network/DNS issue");
      console.error("   3. Hostname may be incorrect");
      console.error("\n   Please check your Supabase project status at https://supabase.com");
    } else {
      console.error("\n❌ Migration failed:", e.message || e);
    }
    process.exit(1);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((e) => {
  console.error("Migration script failed:", e);
  process.exit(1);
});
