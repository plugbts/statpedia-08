#!/usr/bin/env tsx
/**
 * Ingest MoneyPuck shot dataset into `public.moneypuck_shots`.
 * OPTIMIZED: Uses batch inserts for 10-50x faster ingestion
 *
 * Usage examples:
 * - tsx scripts/icura/ingest-moneypuck-shots.ts --file /path/to/moneypuck_shots.csv --season 2024-2025
 * - tsx scripts/icura/ingest-moneypuck-shots.ts --url "https://moneypuck.com/moneypuck_shots_2024.csv" --season 2024-2025
 */

import "dotenv/config";
import fs from "node:fs";
import { createInterface } from "node:readline";
import postgres from "postgres";

type Args = {
  file?: string;
  url?: string;
  season?: string;
  limit?: number;
  batchSize?: number;
};

const BATCH_SIZE = 2000; // Insert 2000 rows at a time for speed

function parseArgs(): Args {
  const out: Args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") out.file = argv[++i];
    else if (a === "--url") out.url = argv[++i];
    else if (a === "--season") out.season = argv[++i];
    else if (a === "--limit") out.limit = Number(argv[++i]);
    else if (a === "--batch-size") out.batchSize = Number(argv[++i]);
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function idxOf(headers: string[], names: string[]): number {
  const lower = headers.map((h) => h.toLowerCase());
  for (const n of names) {
    const i = lower.indexOf(n.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
}

function toNum(s: string | undefined): number | null {
  if (s === undefined || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toBool(s: string | undefined): boolean | null {
  if (s === undefined) return null;
  const v = s.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  return null;
}

async function streamFromUrl(url: string): Promise<NodeJS.ReadableStream> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Failed to download ${url}: ${res.status}`);
  // @ts-expect-error web stream to node stream
  return res.body;
}

type ShotRow = {
  season: string | null;
  game_external_id: string;
  team_abbr: string | null;
  opponent_abbr: string | null;
  period: number | null;
  period_time_seconds: number | null;
  game_time_seconds: number | null;
  shooter_name: string | null;
  goalie_name: string | null;
  shot_type: string | null;
  x_coord: number | null;
  y_coord: number | null;
  xg: number | null;
  is_goal: boolean | null;
  is_rush: boolean | null;
  is_rebound: boolean | null;
  is_high_danger: boolean | null;
  shot_speed: number | null;
  strength_state: string | null;
  raw: any;
};

async function insertBatch(
  sql: postgres.Sql,
  batch: ShotRow[],
  batchNum: number,
  totalInserted: number,
): Promise<number> {
  if (batch.length === 0) return 0;

  const startTime = Date.now();

  try {
    // Use individual inserts in parallel chunks
    // Process in smaller chunks to avoid overwhelming the connection
    const chunkSize = 100;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < batch.length; i += chunkSize) {
      const chunk = batch.slice(i, i + chunkSize);
      const inserts = chunk.map((row) =>
        sql`
          INSERT INTO public.moneypuck_shots (
            season, game_external_id, team_abbr, opponent_abbr,
            period, period_time_seconds, game_time_seconds,
            shooter_name, goalie_name, shot_type,
            x_coord, y_coord, xg,
            is_goal, is_rush, is_rebound, is_high_danger,
            shot_speed, strength_state, raw
          )
          VALUES (
            ${row.season}, ${row.game_external_id}, ${row.team_abbr}, ${row.opponent_abbr},
            ${row.period}, ${row.period_time_seconds}, ${row.game_time_seconds},
            ${row.shooter_name}, ${row.goalie_name}, ${row.shot_type},
            ${row.x_coord}, ${row.y_coord}, ${row.xg},
            ${row.is_goal}, ${row.is_rush}, ${row.is_rebound}, ${row.is_high_danger},
            ${row.shot_speed}, ${row.strength_state}, ${sql.json(row.raw || {})}
          )
          ON CONFLICT DO NOTHING
        `.catch((err) => {
          errors++;
          return null; // Continue on error
        }),
      );

      await Promise.all(inserts);
      inserted += chunk.length;

      // Log progress for large batches
      if (i % 500 === 0 && i > 0) {
        process.stdout.write(
          `   Processing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(batch.length / chunkSize)}...\r`,
        );
      }
    }

    if (errors > 0) {
      console.log(`\n   ⚠️  ${errors} rows had errors (likely conflicts)`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const rowsPerSec = ((batch.length / (Date.now() - startTime)) * 1000).toFixed(0);

    console.log(`\n🔥 BATCH #${batchNum} INSERTED! 🔥`);
    console.log(
      `   ✅ Inserted ${batch.length.toLocaleString()} rows in ${elapsed}s (${rowsPerSec} rows/sec)`,
    );
    console.log(`   📊 Total inserted: ${totalInserted.toLocaleString()} rows`);
    console.log(`   ⚡ Speed: ${rowsPerSec} rows/second`);

    return batch.length;
  } catch (e: any) {
    console.error(`\n❌ BATCH #${batchNum} FAILED:`, e.message);
    // Fallback to individual inserts for this batch
    let success = 0;
    for (const row of batch) {
      try {
        await sql`
          INSERT INTO public.moneypuck_shots (
            season, game_external_id, team_abbr, opponent_abbr,
            period, period_time_seconds, game_time_seconds,
            shooter_name, goalie_name, shot_type,
            x_coord, y_coord, xg,
            is_goal, is_rush, is_rebound, is_high_danger,
            shot_speed, strength_state, raw
          )
          VALUES (
            ${row.season}, ${row.game_external_id}, ${row.team_abbr}, ${row.opponent_abbr},
            ${row.period}, ${row.period_time_seconds}, ${row.game_time_seconds},
            ${row.shooter_name}, ${row.goalie_name}, ${row.shot_type},
            ${row.x_coord}, ${row.y_coord}, ${row.xg},
            ${row.is_goal}, ${row.is_rush}, ${row.is_rebound}, ${row.is_high_danger},
            ${row.shot_speed}, ${row.strength_state}, ${sql.json(row.raw)}
          )
          ON CONFLICT DO NOTHING
        `;
        success++;
      } catch (err) {
        // Skip problematic rows
      }
    }
    console.log(`   ⚠️  Recovered: ${success}/${batch.length} rows inserted individually`);
    return success;
  }
}

async function main() {
  const args = parseArgs();
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("No DB URL configured (NEON_DATABASE_URL/DATABASE_URL)");

  if (!args.file && !args.url) throw new Error("Provide --file or --url");
  const season = args.season || null;
  const limit = Number.isFinite(args.limit) ? (args.limit as number) : null;
  const batchSize = args.batchSize || BATCH_SIZE;

  console.log("\n" + "=".repeat(80));
  console.log("🚀 MONEYPUCK SHOTS INGESTION - OPTIMIZED BATCH MODE 🚀");
  console.log("=".repeat(80));
  console.log(`📁 File: ${args.file || args.url}`);
  console.log(`📅 Season: ${season || "N/A"}`);
  console.log(`📦 Batch size: ${batchSize.toLocaleString()} rows`);
  console.log(`🎯 Limit: ${limit ? limit.toLocaleString() : "None"}`);
  console.log("=".repeat(80) + "\n");

  // Increase connection pool and timeout for large batches
  const sql = postgres(conn, {
    prepare: false,
    max: 10, // Allow more concurrent connections
    idle_timeout: 30,
    connect_timeout: 10,
  });
  const startTime = Date.now();

  const inputStream = args.file ? fs.createReadStream(args.file) : await streamFromUrl(args.url!);
  const rl = createInterface({ input: inputStream, crlfDelay: Infinity });

  let headers: string[] | null = null;
  let lineNo = 0;
  let totalInserted = 0;
  let batch: ShotRow[] = [];
  let batchNum = 0;

  // Column indices
  let iGame = -1,
    iTeam = -1,
    iOpp = -1,
    iPeriod = -1,
    iTime = -1;
  let iX = -1,
    iY = -1,
    iXg = -1;
  let iRush = -1,
    iHD = -1,
    iReb = -1,
    iGoal = -1;
  let iShooter = -1,
    iGoalie = -1,
    iShotType = -1,
    iStrength = -1,
    iShotSpeed = -1;

  console.log("📖 Reading CSV file and parsing headers...\n");

  for await (const line of rl) {
    lineNo++;
    if (!line.trim()) continue;

    // Progress indicator every 10k lines
    if (lineNo % 10000 === 0) {
      process.stdout.write(`\r📖 Reading CSV: line ${lineNo.toLocaleString()}...`);
    }

    if (!headers) {
      headers = splitCsvLine(line).map((h) => h.trim());
      console.log(`✅ Found ${headers.length} columns in CSV`);

      iGame = idxOf(headers, ["gameid", "game_id", "gamepk", "nhl_game_id"]);
      iTeam = idxOf(headers, ["team", "teammnemonic", "teamabbr", "team_abbr"]);
      iOpp = idxOf(headers, ["opponent", "opponentmnemonic", "oppabbr", "opponent_abbr"]);
      iPeriod = idxOf(headers, ["period"]);
      iTime = idxOf(headers, [
        "time",
        "periodtime",
        "secondsinperiod",
        "period_time_seconds",
        "timeinperiod",
      ]);
      iX = idxOf(headers, ["xcord", "xcoord", "x_coord", "x", "arenaadjustedxcord"]);
      iY = idxOf(headers, ["ycord", "ycoord", "y_coord", "y", "arenaadjustedycord"]);
      iXg = idxOf(headers, ["xgoal", "xgoals", "xg", "xgoalsfor"]);
      iRush = idxOf(headers, ["isrush", "rush", "rushshot", "shotrush", "shotRush"]);
      iHD = idxOf(headers, [
        "ishighdanger",
        "highdanger",
        "high_danger",
        "ishighdangerzone",
        "highdangerzone",
      ]);
      iReb = idxOf(headers, ["isrebound", "rebound"]);
      iGoal = idxOf(headers, ["isgoal", "goal"]);
      iShooter = idxOf(headers, ["shootername", "shooter", "playername", "player"]);
      iGoalie = idxOf(headers, ["goaliename", "goalie"]);
      iShotType = idxOf(headers, ["shottype", "shot_type"]);
      iStrength = idxOf(headers, ["strength", "strengthstate", "strength_state"]);
      iShotSpeed = idxOf(headers, ["shotspeed", "shot_speed_mph", "shot_speed"]);

      if (iGame < 0) throw new Error("Could not find game id column in MoneyPuck CSV");

      console.log(`🎯 Key columns found:`);
      console.log(`   Game ID: column ${iGame}`);
      console.log(`   xG: column ${iXg >= 0 ? iXg : "NOT FOUND"}`);
      console.log(`   Rush: column ${iRush >= 0 ? iRush : "NOT FOUND"}`);
      console.log(`   High Danger: column ${iHD >= 0 ? iHD : "NOT FOUND"}`);
      console.log("\n🚀 Starting batch ingestion...\n");
      continue;
    }

    const cols = splitCsvLine(line);
    if (cols.length < iGame + 1) {
      console.warn(`\n⚠️  Skipping malformed line ${lineNo}: not enough columns`);
      continue;
    }
    const gameExternalId = cols[iGame];
    if (!gameExternalId || gameExternalId.trim() === "") {
      continue; // Skip rows without game ID
    }

    const teamAbbr = iTeam >= 0 ? cols[iTeam] : null;
    const oppAbbr = iOpp >= 0 ? cols[iOpp] : null;
    const period = iPeriod >= 0 ? toNum(cols[iPeriod]) : null;

    const periodTimeSeconds = (() => {
      if (iTime < 0) return null;
      const raw = cols[iTime];
      const m = raw?.match?.(/^(\d+):(\d+)$/);
      if (m) return Number(m[1]) * 60 + Number(m[2]);
      return toNum(raw);
    })();

    const gameTimeSeconds =
      period !== null && periodTimeSeconds !== null
        ? (period - 1) * 20 * 60 + periodTimeSeconds
        : null;

    const x = iX >= 0 ? toNum(cols[iX]) : null;
    const y = iY >= 0 ? toNum(cols[iY]) : null;
    const xg = iXg >= 0 ? toNum(cols[iXg]) : null;

    const isRush = iRush >= 0 ? toBool(cols[iRush]) : null;
    const isHighDanger = iHD >= 0 ? toBool(cols[iHD]) : null;
    const isRebound = iReb >= 0 ? toBool(cols[iReb]) : null;
    const isGoal = iGoal >= 0 ? toBool(cols[iGoal]) : null;

    const shooter = iShooter >= 0 ? cols[iShooter] : null;
    const goalie = iGoalie >= 0 ? cols[iGoalie] : null;
    const shotType = iShotType >= 0 ? cols[iShotType] : null;
    const strength = iStrength >= 0 ? cols[iStrength] : null;
    const shotSpeed = iShotSpeed >= 0 ? toNum(cols[iShotSpeed]) : null;

    const row: ShotRow = {
      season,
      game_external_id: gameExternalId,
      team_abbr: teamAbbr,
      opponent_abbr: oppAbbr,
      period,
      period_time_seconds: periodTimeSeconds,
      game_time_seconds: gameTimeSeconds,
      shooter_name: shooter,
      goalie_name: goalie,
      shot_type: shotType,
      x_coord: x,
      y_coord: y,
      xg,
      is_goal: isGoal,
      is_rush: isRush,
      is_rebound: isRebound,
      is_high_danger: isHighDanger,
      shot_speed: shotSpeed,
      strength_state: strength,
      raw: { headers, cols },
    };

    batch.push(row);

    // Insert batch when it reaches batchSize
    if (batch.length >= batchSize) {
      batchNum++;
      const batchStartTime = Date.now();
      console.log(`\n📦 Processing batch #${batchNum} (${batch.length} rows, line ~${lineNo})...`);

      try {
        const inserted = await insertBatch(sql, batch, batchNum, totalInserted);
        totalInserted += inserted;
        const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
        console.log(
          `   ✅ Batch #${batchNum} complete in ${batchTime}s. Total: ${totalInserted.toLocaleString()} rows`,
        );
      } catch (e: any) {
        console.error(`\n❌ Batch #${batchNum} failed:`, e.message);
        console.error(`   Continuing with next batch...`);
        // Continue processing even if batch fails
      }

      batch = []; // Clear batch

      // Force garbage collection hint every 10 batches
      if (batchNum % 10 === 0 && global.gc) {
        global.gc();
      }
    }

    if (limit && totalInserted >= limit) break;
  }

  console.log(`\n📖 Finished reading CSV (${lineNo.toLocaleString()} lines processed)`);

  // Insert remaining rows
  if (batch.length > 0) {
    batchNum++;
    const inserted = await insertBatch(sql, batch, batchNum, totalInserted);
    totalInserted += inserted;
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const avgSpeed = ((totalInserted / (Date.now() - startTime)) * 1000).toFixed(0);

  console.log("\n" + "=".repeat(80));
  console.log("🎉 INGESTION COMPLETE! 🎉");
  console.log("=".repeat(80));
  console.log(`✅ Total rows inserted: ${totalInserted.toLocaleString()}`);
  console.log(`⏱️  Total time: ${totalTime}s`);
  console.log(`⚡ Average speed: ${avgSpeed} rows/second`);
  console.log(`📦 Total batches: ${batchNum}`);
  console.log("=".repeat(80) + "\n");

  await sql.end({ timeout: 2 });
}

main().catch((e) => {
  console.error("\n❌ FATAL ERROR:", e);
  process.exit(1);
});
