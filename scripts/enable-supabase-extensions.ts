#!/usr/bin/env tsx
/**
 * Enable Required Extensions in Supabase
 */

import "dotenv/config";
import postgres from "postgres";

async function main() {
  const supabaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

  if (!supabaseUrl) {
    console.error("❌ SUPABASE_DATABASE_URL not set");
    process.exit(1);
  }

  const sql = postgres(supabaseUrl, { prepare: false });

  try {
    console.log("🔧 Enabling required extensions in Supabase...\n");

    const extensions = [
      { name: "uuid-ossp", description: "UUID generation" },
      { name: "pgcrypto", description: "Cryptographic functions" },
      { name: "pg_trgm", description: "Trigram matching for search" },
    ];

    for (const ext of extensions) {
      try {
        await sql`CREATE EXTENSION IF NOT EXISTS ${sql(ext.name)}`;
        console.log(`✅ ${ext.name} - ${ext.description}`);
      } catch (error) {
        console.error(`❌ Failed to enable ${ext.name}:`, (error as Error).message);
      }
    }

    console.log("\n✅ Extensions enabled!");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

main().catch(console.error);
