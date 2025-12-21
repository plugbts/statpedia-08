#!/usr/bin/env node
/**
 * Simple nightly job = ingestion only
 */

import { execSync } from "node:child_process";

try {
  execSync("node scripts/nightly-ingestion.js", { stdio: "inherit", env: process.env });
} catch (e) {
  console.error("\n[simple-nightly-job] failed:", e?.message || e);
  process.exit(1);
}
