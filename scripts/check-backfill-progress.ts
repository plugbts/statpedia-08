import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const sqlc = postgres(conn, { prepare: false });
const db = drizzle(sqlc);

async function checkProgress() {
  console.log("📊 NFL Backfill Progress Report\n");
  console.log("=".repeat(60));

  // Total NFL stats
  const totalStats = await db.execute(sql`
    SELECT COUNT(*) as count 
    FROM player_game_logs 
    WHERE prop_type IN ('Passing Yards', 'Rushing Yards', 'Receiving Yards', 
                        'Passing TDs', 'Rushing TDs', 'Receiving TDs',
                        'Receptions', 'Total Tackles', 'Sacks')
  `);
  console.log(`\n🏈 Total NFL Stats: ${totalStats[0]?.count || 0}`);

  // Stats by type
  const statsByType = await db.execute(sql`
    SELECT prop_type, COUNT(*) as count
    FROM player_game_logs
    WHERE prop_type IN ('Passing Yards', 'Rushing Yards', 'Receiving Yards', 
                        'Passing TDs', 'Rushing TDs', 'Receiving TDs',
                        'Receptions', 'Total Tackles', 'Sacks')
    GROUP BY prop_type
    ORDER BY count DESC
  `);

  if (statsByType.length > 0) {
    console.log("\n📈 Stats by Type:");
    for (const row of statsByType) {
      console.log(`   ${(row as any).prop_type}: ${(row as any).count}`);
    }
  }

  // Unique games
  const uniqueGames = await db.execute(sql`
    SELECT COUNT(DISTINCT game_id) as count
    FROM player_game_logs
    WHERE prop_type IN ('Passing Yards', 'Rushing Yards', 'Receiving Yards')
  `);
  console.log(`\n🎮 Unique NFL Games Processed: ${uniqueGames[0]?.count || 0}`);

  // Date range
  const dateRange = await db.execute(sql`
    SELECT 
      MIN(game_date) as earliest,
      MAX(game_date) as latest
    FROM player_game_logs
    WHERE prop_type IN ('Passing Yards', 'Rushing Yards', 'Receiving Yards')
  `);

  if (dateRange[0] && (dateRange[0] as any).earliest) {
    console.log(
      `\n📅 Date Range: ${(dateRange[0] as any).earliest} → ${(dateRange[0] as any).latest}`,
    );
  }

  // Recent activity (last 10 minutes)
  const recentStats = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM player_game_logs
    WHERE prop_type IN ('Passing Yards', 'Rushing Yards', 'Receiving Yards')
      AND created_at > NOW() - INTERVAL '10 minutes'
  `);
  console.log(`\n⏱️  Stats Added (Last 10 min): ${recentStats[0]?.count || 0}`);

  console.log("\n" + "=".repeat(60));
  console.log("\n💡 Tip: Run this again to see progress!");
  console.log("   Expected final total: ~16,300 stats from ~100 games\n");

  await sqlc.end();
}

checkProgress().catch(console.error);
