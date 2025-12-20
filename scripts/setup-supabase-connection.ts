#!/usr/bin/env tsx
/**
 * Setup Supabase Connection
 *
 * Tests and configures Supabase database connection
 */

import "dotenv/config";
import postgres from "postgres";

async function main() {
  console.log("🔧 SUPABASE CONNECTION SETUP\n");
  console.log("=".repeat(80));

  const supabaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

  if (!supabaseUrl) {
    console.error("❌ SUPABASE_DATABASE_URL not set");
    console.error("\nPlease add to .env.local:");
    console.error(
      "SUPABASE_DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres",
    );
    console.error("\nYou can find this in your Supabase dashboard:");
    console.error("  Settings → Database → Connection string → URI");
    process.exit(1);
  }

  // Extract project info from URL
  const urlMatch = supabaseUrl.match(/@db\.([^.]+)\.supabase\.co/);
  const projectRef = urlMatch ? urlMatch[1] : "unknown";

  console.log(`\n📡 Testing connection to Supabase project: ${projectRef}\n`);

  const sql = postgres(supabaseUrl, { prepare: false });

  try {
    // Test connection
    const result = await sql`SELECT version(), current_database(), current_user`;

    console.log("✅ Connection successful!");
    console.log(`   Database: ${result[0].current_database}`);
    console.log(`   User: ${result[0].current_user}`);
    console.log(
      `   PostgreSQL: ${result[0].version.split(" ")[0]} ${result[0].version.split(" ")[1]}`,
    );

    // Check extensions
    console.log("\n📦 Checking extensions...");
    const extensions = await sql`
      SELECT name, default_version, installed_version
      FROM pg_available_extensions
      WHERE name IN ('uuid-ossp', 'pgcrypto', 'pg_trgm')
      ORDER BY name;
    `;

    for (const ext of extensions) {
      const status = ext.installed_version ? "✅ Installed" : "⚠️  Not installed";
      console.log(`   ${status}: ${ext.name}`);
    }

    // Check existing tables
    console.log("\n📊 Checking existing tables...");
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    if (tables.length === 0) {
      console.log("   ⚠️  No tables found. Ready for schema migration.");
    } else {
      console.log(`   Found ${tables.length} tables:`);
      tables.slice(0, 10).forEach((t: any) => console.log(`     - ${t.table_name}`));
      if (tables.length > 10) {
        console.log(`     ... and ${tables.length - 10} more`);
      }
    }

    console.log("\n✅ Supabase connection is ready!");
    console.log("\nNext steps:");
    console.log("  1. Run: tsx scripts/migrate-to-supabase.ts");
    console.log("  2. Update .env.local with SUPABASE_URL and SUPABASE_ANON_KEY");
    console.log("  3. Update src/db/index.ts to use Supabase connection");
  } catch (error) {
    console.error("\n❌ Connection failed:", (error as Error).message);
    console.error("\nPlease verify:");
    console.error("  1. SUPABASE_DATABASE_URL is correct");
    console.error("  2. Database password is correct");
    console.error("  3. IP is whitelisted in Supabase dashboard");
    process.exit(1);
  } finally {
    await sql.end({ timeout: 1 });
  }
}

main().catch(console.error);
