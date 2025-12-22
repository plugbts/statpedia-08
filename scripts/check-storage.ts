#!/usr/bin/env tsx
/**
 * Check Neon database storage usage and cost estimate
 * Usage: tsx scripts/check-storage.ts
 */

import "dotenv/config";
import postgres from "postgres";

async function main() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) {
    console.error("❌ NEON_DATABASE_URL or DATABASE_URL not set");
    process.exit(1);
  }

  const sql = postgres(conn, { prepare: false });

  try {
    // Total database size
    const dbSize = await sql`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as total_size,
        pg_database_size(current_database()) as bytes
    `;
    const totalBytes = Number(dbSize[0].bytes);
    const totalGB = totalBytes / 1024 / 1024 / 1024;
    const monthlyCost = totalGB * 0.35;

    console.log("📊 Neon Database Storage Report\n");
    console.log(`Total size: ${dbSize[0].total_size}`);
    console.log(`Estimated monthly cost: $${monthlyCost.toFixed(2)}`);
    console.log(`Budget remaining: $${Math.max(0, (5 - monthlyCost).toFixed(2))}\n`);

    // Top 20 tables
    const topTables = await sql`
      SELECT 
        c.relname as table,
        pg_size_pretty(pg_total_relation_size(c.oid)) as size,
        pg_total_relation_size(c.oid) as bytes
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r' 
        AND n.nspname = 'public'
      ORDER BY bytes DESC
      LIMIT 20
    `;

    console.log("Top 20 tables by size:");
    console.table(
      topTables.map((t) => ({
        table: t.table,
        size: t.size,
        bytes: Number(t.bytes),
      })),
    );

    // Icura-specific tables
    const icuraTables = await sql`
      SELECT 
        c.relname as table,
        pg_size_pretty(pg_total_relation_size(c.oid)) as size,
        pg_total_relation_size(c.oid) as bytes
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r' 
        AND n.nspname = 'public'
        AND (
          c.relname LIKE 'icura%' 
          OR c.relname LIKE 'moneypuck%' 
          OR c.relname LIKE 'game_events%'
          OR c.relname LIKE 'xg_%'
          OR c.relname LIKE 'goalies%'
          OR c.relname LIKE 'nhl_line%'
        )
      ORDER BY bytes DESC
    `;

    if (icuraTables.length > 0) {
      const icuraTotal = icuraTables.reduce((sum, t) => sum + Number(t.bytes), 0);
      console.log("\nIcura-related tables:");
      console.table(
        icuraTables.map((t) => ({
          table: t.table,
          size: t.size,
          bytes: Number(t.bytes),
        })),
      );
      console.log(
        `\nIcura storage: ${(icuraTotal / 1024 / 1024).toFixed(2)} MB (${((icuraTotal / totalBytes) * 100).toFixed(1)}% of total)`,
      );
    }

    // Storage recommendations
    if (monthlyCost > 4) {
      console.log("\n⚠️  WARNING: Approaching $5/month budget limit!");
      console.log("Consider:");
      console.log("  - Archiving old player_game_logs data");
      console.log("  - Compressing or deleting old raw data");
      console.log("  - Limiting MoneyPuck shot data to recent seasons");
    } else if (monthlyCost > 2) {
      console.log("\n💡 Storage is growing. Monitor usage regularly.");
    } else {
      console.log("\n✅ Storage usage is healthy.");
    }
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
