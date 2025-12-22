/**
 * Populate icura_nhl_early_game_dataset by calling the early-goal API
 * for dates that have MoneyPuck shots data.
 *
 * Usage:
 *   tsx scripts/icura/populate-early-game-dataset.ts --season 2023-2024
 *   tsx scripts/icura/populate-early-game-dataset.ts --season 2025-2026
 */

import postgres from "postgres";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

function getConn(): string | null {
  return (
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    null
  );
}

function getSeasonDateRange(season: string): { start: string; end: string } {
  const [startYear, endYear] = season.split("-").map(Number);
  return {
    start: `${startYear}-10-01`,
    end: `${endYear}-06-30`,
  };
}

function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }

  return dates;
}

async function callEarlyGoalAPI(
  date: string,
): Promise<{ date: string; success: boolean; count: number; error?: string }> {
  const baseUrl = process.env.API_BASE_URL || "http://localhost:3001";
  const url = `${baseUrl}/api/icura/nhl/early-goal?date=${date}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      return {
        date,
        success: false,
        count: 0,
        error: `HTTP ${res.status}: ${text.substring(0, 100)}`,
      };
    }
    const data = await res.json();
    if (data.success) {
      return { date, success: true, count: data.count || 0 };
    } else {
      return { date, success: false, count: 0, error: data.error || "Unknown error" };
    }
  } catch (e: any) {
    return { date, success: false, count: 0, error: e.message };
  }
}

async function processBatch(
  dates: string[],
  batchNum: number,
  totalBatches: number,
): Promise<{ success: number; failed: number; totalGames: number }> {
  const results = await Promise.all(dates.map((date) => callEarlyGoalAPI(date)));

  let success = 0;
  let failed = 0;
  let totalGames = 0;

  for (const result of results) {
    if (result.success) {
      success++;
      totalGames += result.count;
    } else {
      failed++;
      if (failed <= 3) {
        // Only show first 3 errors per batch
        console.log(`  ⚠️  ${result.date}: ${result.error}`);
      }
    }
  }

  console.log(
    `  📦 Batch ${batchNum}/${totalBatches}: ${success}✅ ${failed}❌ (${totalGames} games)`,
  );

  return { success, failed, totalGames };
}

async function main() {
  const args = process.argv.slice(2);
  const seasonArg =
    args.find((a) => a.startsWith("--season="))?.split("=")[1] ||
    args[args.indexOf("--season") + 1];
  const concurrency = parseInt(
    args.find((a) => a.startsWith("--concurrency="))?.split("=")[1] || "20",
  );

  if (!seasonArg) {
    console.error(
      "Usage: tsx scripts/icura/populate-early-game-dataset.ts --season 2023-2024 [--concurrency=20]",
    );
    process.exit(1);
  }

  console.log(`📊 Populating dataset for season: ${seasonArg}`);
  console.log(`⚡ Concurrency: ${concurrency} parallel requests`);
  console.log("=".repeat(60));

  const { start, end } = getSeasonDateRange(seasonArg);
  const dates = generateDateRange(start, end);
  console.log(`Processing ${dates.length} dates from ${start} to ${end}\n`);

  const startTime = Date.now();
  let totalSuccess = 0;
  let totalFailed = 0;
  let totalGames = 0;

  // Process in batches with concurrency limit
  for (let i = 0; i < dates.length; i += concurrency) {
    const batch = dates.slice(i, i + concurrency);
    const batchNum = Math.floor(i / concurrency) + 1;
    const totalBatches = Math.ceil(dates.length / concurrency);

    const batchResult = await processBatch(batch, batchNum, totalBatches);
    totalSuccess += batchResult.success;
    totalFailed += batchResult.failed;
    totalGames += batchResult.totalGames;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const datesPerSec = ((dates.length / (Date.now() - startTime)) * 1000).toFixed(1);

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Completed: ${totalSuccess}/${dates.length} dates (${totalFailed} failed)`);
  console.log(`📊 Total games processed: ${totalGames}`);
  console.log(`⏱️  Time: ${elapsed}s (${datesPerSec} dates/sec)`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
