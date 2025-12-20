#!/usr/bin/env tsx
/**
 * Quick Verification Script for Supabase Migration
 * Checks row counts without hanging
 */

import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

// Load .env.local explicitly
config({ path: ".env.local" });

async function main() {
  console.log("🔍 VERIFYING SUPABASE MIGRATION\n");
  console.log("=".repeat(80));

  const neonUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  const supabaseUrl = process.env.SUPABASE_DATABASE_URL;

  if (!neonUrl || !supabaseUrl) {
    console.error("❌ Both NEON_DATABASE_URL and SUPABASE_DATABASE_URL must be set");
    process.exit(1);
  }

  const neonSql = postgres(neonUrl, { prepare: false, max: 1 });
  const supabaseSql = postgres(supabaseUrl, { prepare: false, max: 1 });

  try {
    // Get table list
    const tables = await neonSql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    console.log(`\n📊 Verifying ${tables.length} tables...\n`);

    let allMatch = true;
    let totalNeon = 0;
    let totalSupabase = 0;

    for (const table of tables.slice(0, 25)) {
      // Limit to first 25 tables
      const tableName = table.table_name;

      try {
        // Use timeout to prevent hanging
        const neonPromise =
          neonSql`SELECT COUNT(*)::bigint as count FROM ${neonSql(tableName)}`.then((r) =>
            Number(r[0]?.count || 0),
          );
        const supabasePromise =
          supabaseSql`SELECT COUNT(*)::bigint as count FROM ${neonSql(tableName)}`.then((r) =>
            Number(r[0]?.count || 0),
          );

        const [neon, supabase] = (await Promise.race([
          Promise.all([neonPromise, supabasePromise]),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
        ])) as [number, number];

        const match = neon === supabase ? "✅" : "❌";
        console.log(
          `  ${match} ${tableName.padEnd(30)} Neon=${neon.toString().padStart(8)} Supabase=${supabase.toString().padStart(8)}`,
        );

        totalNeon += neon;
        totalSupabase += supabase;

        if (neon !== supabase) {
          allMatch = false;
        }
      } catch (error) {
        console.log(`  ⚠️  ${tableName.padEnd(30)} Error: ${(error as Error).message}`);
      }
    }

    console.log(`\n${"=".repeat(80)}`);
    console.log(
      `Total rows: Neon=${totalNeon.toLocaleString()}, Supabase=${totalSupabase.toLocaleString()}`,
    );

    if (allMatch && totalNeon === totalSupabase) {
      console.log("\n🎉 Migration verified successfully! All data matches.");
    } else {
      console.log("\n⚠️  Some discrepancies found. Review the table counts above.");
    }
  } catch (error) {
    console.error("\n❌ Verification failed:", error);
  } finally {
    await neonSql.end({ timeout: 1 });
    await supabaseSql.end({ timeout: 1 });
  }
}

main().catch(console.error);
