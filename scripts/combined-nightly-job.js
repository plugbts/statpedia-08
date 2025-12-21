#!/usr/bin/env node
/**
 * Combined nightly job
 *
 * Runs:
 *  - nightly ingestion (keeps game logs fresh)
 *  - analytics precompute (currently a no-op; analytics computed dynamically in API)
 */

import { execSync } from "node:child_process";

function run(cmd) {
  console.log(`\n[combined-nightly-job] ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: process.env });
}

try {
  run("node scripts/nightly-ingestion.js");
  run("node scripts/nightly-precompute-analytics.js");
  console.log("\n[combined-nightly-job] complete");
} catch (e) {
  console.error("\n[combined-nightly-job] failed:", e?.message || e);
  process.exit(1);
}
