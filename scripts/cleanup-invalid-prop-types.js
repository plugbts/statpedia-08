#!/usr/bin/env tsx
/**
 * Check and cleanup invalid prop types from player_game_logs
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("DATABASE_URL missing");

  const sqlc = postgres(conn, { prepare: false });
  const db = drizzle(sqlc);

  console.log("🔍 Checking for invalid prop types...\n");

  // Check what we have
  const invalid = await db.execute(sql`
    SELECT prop_type, COUNT(*) as count
    FROM player_game_logs
    WHERE prop_type IN ('UNK ?', '-', '?', '')
       OR LENGTH(prop_type) = 1
       OR prop_type !~ '[A-Za-z]'
    GROUP BY prop_type
    ORDER BY count DESC
  `);

  if (invalid.length === 0) {
    console.log("✅ No invalid prop types found!");
    await sqlc.end();
    return;
  }

  console.log("❌ Found invalid prop types:");
  console.table(invalid);

  const total = await db.execute(sql`
    SELECT COUNT(*) as total_invalid
    FROM player_game_logs
    WHERE prop_type IN ('UNK ?', '-', '?', '')
       OR LENGTH(prop_type) = 1
       OR prop_type !~ '[A-Za-z]'
  `);
  console.log(`\n📊 Total invalid records: ${total[0].total_invalid}\n`);

  // Ask for confirmation
  console.log("⚠️  This will DELETE these records from the database.");
  console.log("🗑️  Deleting invalid prop types...\n");

  const result = await db.execute(sql`
    DELETE FROM player_game_logs
    WHERE prop_type IN ('UNK ?', '-', '?', '')
       OR LENGTH(prop_type) = 1
       OR prop_type !~ '[A-Za-z]'
  `);

  console.log(`✅ Deleted ${result.count || total[0].total_invalid} invalid records\n`);

  // Show summary after cleanup
  const summary = await db.execute(sql`
    SELECT 
      COUNT(*) as total_logs,
      COUNT(DISTINCT prop_type) as unique_prop_types,
      COUNT(DISTINCT player_id) as unique_players,
      COUNT(DISTINCT game_id) as unique_games
    FROM player_game_logs
  `);

  console.log("📈 Database summary after cleanup:");
  console.table(summary);

  // Show top prop types
  const topProps = await db.execute(sql`
    SELECT prop_type, COUNT(*) as count
    FROM player_game_logs
    GROUP BY prop_type
    ORDER BY count DESC
    LIMIT 20
  `);

  console.log("\n🏆 Top 20 prop types by count:");
  console.table(topProps);

  await sqlc.end();
  console.log("\n✅ Cleanup complete!");
}

main().catch(console.error);
