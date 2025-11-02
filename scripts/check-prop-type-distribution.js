#!/usr/bin/env tsx
/**
 * Show current prop type distribution in database
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

  console.log("📊 Player Game Logs Summary\n");

  // Overall stats
  const summary = await db.execute(sql`
    SELECT 
      COUNT(*) as total_logs,
      COUNT(DISTINCT prop_type) as unique_prop_types,
      COUNT(DISTINCT player_id) as unique_players,
      COUNT(DISTINCT game_id) as unique_games,
      MIN(game_date) as earliest_date,
      MAX(game_date) as latest_date
    FROM player_game_logs
  `);

  console.log("📈 Overall Statistics:");
  console.table(summary);

  // Top prop types
  const topProps = await db.execute(sql`
    SELECT prop_type, COUNT(*) as count, 
           ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
    FROM player_game_logs
    GROUP BY prop_type
    ORDER BY count DESC
    LIMIT 30
  `);

  console.log("\n🏆 Top 30 Prop Types:");
  console.table(topProps);

  // Check for suspicious prop types
  const suspicious = await db.execute(sql`
    SELECT prop_type, LENGTH(prop_type) as len, COUNT(*) as count
    FROM player_game_logs
    WHERE LENGTH(prop_type) <= 3
       OR prop_type ~ '[^A-Za-z0-9 ]'
    GROUP BY prop_type, LENGTH(prop_type)
    ORDER BY count DESC
  `);

  if (suspicious.length > 0) {
    console.log("\n⚠️  Suspicious Prop Types (short or special chars):");
    console.table(suspicious);
  } else {
    console.log("\n✅ No suspicious prop types found!");
  }

  await sqlc.end();
}

main().catch(console.error);
