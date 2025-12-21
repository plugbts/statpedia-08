#!/usr/bin/env node
/**
 * Nightly ingestion runner
 *
 * Goal: keep `player_game_logs` up-to-date so analytics can be computed for every player/prop.
 *
 * Defaults:
 * - LEAGUES: NFL
 * - DAYS: 3 (ingest a short rolling window to catch late corrections)
 */

import { execSync } from "node:child_process";

const leagues = String(process.env.LEAGUES || "NFL")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

const days = Number(process.env.DAYS || 3);

function run(cmd) {
  console.log(`\n[nightly-ingestion] ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: process.env });
}

try {
  console.log("[nightly-ingestion] starting", { leagues, days });
  for (const league of leagues) {
    run(`npx --yes tsx scripts/ingest-official-game-logs.ts ${league} ${days}`);
  }
  console.log("\n[nightly-ingestion] complete");
} catch (e) {
  console.error("\n[nightly-ingestion] failed:", e?.message || e);
  process.exit(1);
}
