import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const sqlc = postgres(conn, { prepare: false });
const db = drizzle(sqlc);

const TARGET_GAMES = 90; // Approximate number of NFL games in 30 days
const TARGET_STATS = 14000; // Conservative estimate
const CHECK_INTERVAL = 60000; // Check every 60 seconds
const STALL_THRESHOLD = 180000; // Consider stalled if no new stats in 3 minutes

interface Progress {
  totalStats: number;
  uniqueGames: number;
  lastCheckStats: number;
  lastCheckTime: number;
  stallCount: number;
}

async function checkBackfillRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      'ps aux | grep "tsx scripts/ingest-official-game-logs.ts NFL" | grep -v grep',
    );
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function getProgress(): Promise<Progress> {
  const totalStats = await db.execute(sql`
    SELECT COUNT(*) as count 
    FROM player_game_logs 
    WHERE prop_type IN ('Passing Yards', 'Rushing Yards', 'Receiving Yards', 
                        'Passing TDs', 'Rushing TDs', 'Receiving TDs',
                        'Receptions', 'Total Tackles', 'Sacks')
  `);

  const uniqueGames = await db.execute(sql`
    SELECT COUNT(DISTINCT game_id) as count
    FROM player_game_logs
    WHERE prop_type IN ('Passing Yards', 'Rushing Yards', 'Receiving Yards')
  `);

  return {
    totalStats: Number(totalStats[0]?.count || 0),
    uniqueGames: Number(uniqueGames[0]?.count || 0),
    lastCheckStats: 0,
    lastCheckTime: Date.now(),
    stallCount: 0,
  };
}

async function sendNotification(message: string) {
  // macOS notification
  try {
    await execAsync(
      `osascript -e 'display notification "${message}" with title "🏈 NFL Backfill" sound name "Glass"'`,
    );
  } catch (e) {
    console.log("📢 NOTIFICATION:", message);
  }
}

async function monitor() {
  console.log("🔍 Starting NFL Backfill Monitor");
  console.log("=".repeat(60));
  console.log("⏱️  Checking every 60 seconds");
  console.log("🎯 Target: ~90 games, ~14,000 stats");
  console.log("=".repeat(60) + "\n");

  let progress = await getProgress();
  let lastStats = progress.totalStats;
  let lastTime = Date.now();

  const startTime = Date.now();
  const startStats = progress.totalStats;

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL));

    const isRunning = await checkBackfillRunning();
    progress = await getProgress();
    const now = Date.now();
    const elapsedMinutes = Math.floor((now - startTime) / 60000);

    const statsAdded = progress.totalStats - lastStats;
    const timeSinceLastStat = now - lastTime;

    // Update display
    const percentComplete = Math.min(100, Math.floor((progress.uniqueGames / TARGET_GAMES) * 100));
    const statsPerMinute =
      elapsedMinutes > 0 ? Math.floor((progress.totalStats - startStats) / elapsedMinutes) : 0;
    const estimatedMinutesRemaining =
      statsPerMinute > 0 ? Math.floor((TARGET_STATS - progress.totalStats) / statsPerMinute) : 0;

    console.log(`[${new Date().toLocaleTimeString()}] 📊 Progress Update:`);
    console.log(`   Games: ${progress.uniqueGames}/${TARGET_GAMES} (${percentComplete}%)`);
    console.log(
      `   Stats: ${progress.totalStats.toLocaleString()} / ${TARGET_STATS.toLocaleString()}`,
    );
    console.log(`   Rate: ${statsPerMinute} stats/min`);
    if (estimatedMinutesRemaining > 0 && estimatedMinutesRemaining < 300) {
      console.log(`   ETA: ~${estimatedMinutesRemaining} minutes`);
    }
    console.log(`   Status: ${isRunning ? "✅ Running" : "⚠️ Process not found"}`);
    console.log();

    // Check if stalled (no new stats in 3 minutes)
    if (statsAdded === 0 && timeSinceLastStat > STALL_THRESHOLD && isRunning) {
      progress.stallCount++;
      console.log(
        `⚠️  Warning: No new stats in ${Math.floor(timeSinceLastStat / 1000 / 60)} minutes (stall count: ${progress.stallCount})`,
      );

      if (progress.stallCount >= 3) {
        await sendNotification("⚠️ Backfill appears stalled - no new stats in 9+ minutes");
        console.log("\n🚨 ALERT: Backfill may be stalled!");
        console.log("   Check nfl-backfill.log for errors\n");
      }
    } else if (statsAdded > 0) {
      progress.stallCount = 0;
      lastStats = progress.totalStats;
      lastTime = now;
    }

    // Check completion conditions
    const completed = progress.uniqueGames >= TARGET_GAMES || progress.totalStats >= TARGET_STATS;
    const processFinished = !isRunning && progress.totalStats > 1000; // Process ended and we have substantial data

    if (completed || processFinished) {
      console.log("\n" + "=".repeat(60));
      console.log("✅ BACKFILL COMPLETE!");
      console.log("=".repeat(60));
      console.log(`📊 Final Stats:`);
      console.log(`   Games Processed: ${progress.uniqueGames}`);
      console.log(`   Total Stats: ${progress.totalStats.toLocaleString()}`);
      console.log(`   Duration: ${elapsedMinutes} minutes`);
      console.log(`   Avg Rate: ${statsPerMinute} stats/min`);
      console.log("\n🎯 Next Steps:");
      console.log("   1. Run: tsx scripts/enrich-comprehensive.ts");
      console.log("   2. Verify enrichment coverage increased");
      console.log("   3. Test frontend display\n");

      await sendNotification(
        `✅ Complete! ${progress.uniqueGames} games, ${progress.totalStats.toLocaleString()} stats extracted`,
      );
      break;
    }

    // Check if process died prematurely
    if (!isRunning && progress.totalStats < 1000) {
      console.log("\n" + "=".repeat(60));
      console.log("❌ BACKFILL PROCESS STOPPED UNEXPECTEDLY");
      console.log("=".repeat(60));
      console.log(`📊 Current Stats:`);
      console.log(`   Games: ${progress.uniqueGames}`);
      console.log(`   Stats: ${progress.totalStats}`);
      console.log("\n🔍 Check nfl-backfill.log for errors\n");

      await sendNotification(
        `❌ Backfill stopped! Only ${progress.uniqueGames} games processed. Check logs.`,
      );
      break;
    }
  }

  await sqlc.end();
}

monitor().catch((error) => {
  console.error("❌ Monitor error:", error);
  sendNotification("❌ Monitor script crashed - check console");
  process.exit(1);
});
