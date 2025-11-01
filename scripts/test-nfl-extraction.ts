#!/usr/bin/env tsx
/**
 * Test NFL Extraction
 * Tests the updated NFL extraction logic with a single game
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const sqlc = postgres(conn, { prepare: false });
const db = drizzle(sqlc);

async function testExtraction() {
  console.log("🏈 Testing NFL Stats Extraction...\n");

  // Check for existing NFL game logs before
  const beforeCount = (await db.execute(sql`
    SELECT COUNT(*) as count, prop_type
    FROM player_game_logs
    WHERE prop_type LIKE '%Passing%' 
       OR prop_type LIKE '%Rushing%'
       OR prop_type LIKE '%Receiving%'
    GROUP BY prop_type
    ORDER BY count DESC
  `)) as Array<{ count: string; prop_type: string }>;

  console.log("📊 NFL Stats BEFORE extraction:");
  if (beforeCount.length === 0) {
    console.log("  ❌ NO NFL stats found (as expected - this is the problem!)");
  } else {
    beforeCount.forEach((row) => {
      console.log(`  - ${row.prop_type}: ${row.count} rows`);
    });
  }

  console.log("\n💡 To test extraction, run:");
  console.log(
    "   DRY_RUN=0 tsx scripts/ingest-official-game-logs.ts --league=nfl --date=2024-09-19",
  );
  console.log(
    "\n   This will ingest one game day and we can verify the stats are extracted properly.",
  );

  console.log("\n🎯 Expected result:");
  console.log("  - Passing Yards: 20-40 rows (2 QBs per game, ~10 games)");
  console.log("  - Rushing Yards: 40-80 rows (4+ rushers per game)");
  console.log("  - Receiving Yards: 100-200 rows (10+ receivers per game)");
  console.log("  - Passing TDs, Rushing TDs, Receiving TDs, Receptions, etc.");

  await sqlc.end();
}

testExtraction();
