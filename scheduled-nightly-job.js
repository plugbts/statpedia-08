#!/usr/bin/env node
/**
 * Scheduled nightly job (local/server)
 *
 * Uses node-cron to run `npm run nightly-job:simple` (or `nightly-job`) on a schedule.
 *
 * Env:
 * - NIGHTLY_CRON: cron string (default: "0 6 * * *" = 6am daily)
 * - NIGHTLY_COMMAND: npm script to run (default: "nightly-job:simple")
 */

import cron from "node-cron";
import { execSync } from "node:child_process";

const cronExpr = process.env.NIGHTLY_CRON || "0 6 * * *";
const script = process.env.NIGHTLY_COMMAND || "nightly-job:simple";

console.log("[scheduled-nightly-job] starting", { cronExpr, script });

cron.schedule(cronExpr, () => {
  const startedAt = new Date().toISOString();
  console.log(`\n[scheduled-nightly-job] run start ${startedAt}`);
  try {
    execSync(`npm run ${script}`, { stdio: "inherit", env: process.env });
    console.log(`[scheduled-nightly-job] run complete ${new Date().toISOString()}`);
  } catch (e) {
    console.error(
      `[scheduled-nightly-job] run failed ${new Date().toISOString()}:`,
      e?.message || e,
    );
  }
});
