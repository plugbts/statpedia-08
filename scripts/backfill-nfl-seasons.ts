#!/usr/bin/env tsx
/**
 * Backfill NFL seasons with loud terminal progress output.
 *
 * Usage:
 *   tsx scripts/backfill-nfl-seasons.ts 2024 2025
 *
 * Notes:
 * - NFL season year Y spans roughly Sep(Y) -> Feb(Y+1)
 * - For the current season, we cap end date at TODAY.
 */

import { execSync } from "node:child_process";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function run(cmd: string) {
  console.log(`\n[backfill-nfl-seasons] ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: process.env });
}

function seasonRange(seasonYear: number) {
  const start = new Date(`${seasonYear}-09-01T00:00:00.000Z`);
  const endDefault = new Date(`${seasonYear + 1}-02-28T00:00:00.000Z`);
  const today = new Date();
  const end = endDefault > today ? today : endDefault;
  return { start, end };
}

const years = process.argv
  .slice(2)
  .map((s) => Number(s))
  .filter((n) => Number.isFinite(n) && n >= 2000);

if (years.length === 0) {
  console.error("Usage: tsx scripts/backfill-nfl-seasons.ts 2024 2025");
  process.exit(1);
}

console.log("[backfill-nfl-seasons] starting", { years });

for (const y of years) {
  const { start, end } = seasonRange(y);
  console.log(`\n[backfill-nfl-seasons] season ${y} range ${iso(start)} -> ${iso(end)}`);
  // Only use FORCE=1 if explicitly set (for re-processing). Otherwise continue from progress.
  // This allows the script to skip already-normalized games and continue where it left off.
  run(
    `npx --yes tsx scripts/ingest-official-game-logs.ts NFL --start=${iso(start)} --end=${iso(end)}`,
  );
}

console.log("\n[backfill-nfl-seasons] complete");
