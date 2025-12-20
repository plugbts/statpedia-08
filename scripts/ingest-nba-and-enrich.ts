#!/usr/bin/env tsx
/**
 * Ingest NBA Game Logs and Enrich Analytics
 *
 * Shows all progress in terminal
 */

import "dotenv/config";
import { execSync } from "child_process";

async function main() {
  const days = parseInt(process.argv[2] || "30", 10);

  console.log("=".repeat(80));
  console.log("🏀 NBA INGESTION AND ANALYTICS ENRICHMENT");
  console.log("=".repeat(80));
  console.log(`\n📅 Ingesting last ${days} days of NBA games...\n`);

  try {
    // Step 1: Ingest NBA game logs
    console.log("STEP 1: Ingesting NBA game logs...");
    console.log("-".repeat(80));
    execSync(`tsx scripts/ingest-official-game-logs.ts NBA ${days}`, {
      stdio: "inherit",
      env: process.env,
    });
    console.log("\n✅ NBA ingestion complete!\n");

    // Step 2: Run name-matching analytics enrichment
    console.log("STEP 2: Populating analytics by name matching...");
    console.log("-".repeat(80));
    execSync(`tsx scripts/populate-analytics-by-name-match.ts`, {
      stdio: "inherit",
      env: process.env,
    });
    console.log("\n✅ Analytics enrichment complete!\n");

    // Step 3: Run general analytics enrichment
    console.log("STEP 3: Running general analytics enrichment...");
    console.log("-".repeat(80));
    const currentYear = new Date().getFullYear();
    execSync(
      `ENRICH_SEASON=${currentYear} ENRICH_LIMIT=5000 tsx scripts/enrich-player-analytics.ts`,
      {
        stdio: "inherit",
        env: { ...process.env, ENRICH_SEASON: currentYear.toString(), ENRICH_LIMIT: "5000" },
      },
    );
    console.log("\n✅ General analytics enrichment complete!\n");

    // Step 4: Show results for Donovan Mitchell
    console.log("STEP 4: Checking results for Donovan Mitchell...");
    console.log("-".repeat(80));
    execSync(`tsx scripts/show-player-analytics.ts "Donovan Mitchell"`, {
      stdio: "inherit",
      env: process.env,
    });

    console.log("\n" + "=".repeat(80));
    console.log("✅ ALL STEPS COMPLETE!");
    console.log("=".repeat(80));
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

main().catch(console.error);
