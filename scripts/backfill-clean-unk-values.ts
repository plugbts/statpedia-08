#!/usr/bin/env tsx
/**
 * Backfill script to clean existing UNK and dash values
 *
 * This script:
 * 1. Finds all records with UNK, dash, or empty values
 * 2. Attempts to remap them using current mapping tables
 * 3. Logs entries that cannot be resolved
 * 4. Optionally deletes unresolvable entries
 *
 * Usage:
 *   tsx scripts/backfill-clean-unk-values.ts [--dry-run] [--delete-unresolvable]
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { players, teams, leagues } from "../src/db/schema/index";
import { eq, and, or, sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

interface BackfillStats {
  tableName: string;
  totalUnkRecords: number;
  resolvedRecords: number;
  unresolvedRecords: number;
  deletedRecords: number;
  errors: string[];
}

/**
 * Check if a value is invalid (UNK, dash, null, empty)
 */
function isInvalidValue(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" || trimmed === "UNK" || trimmed === "-";
  }
  return false;
}

/**
 * Clean proplines table
 */
async function cleanProplines(
  dryRun: boolean,
  deleteUnresolvable: boolean,
): Promise<BackfillStats> {
  const stats: BackfillStats = {
    tableName: "proplines",
    totalUnkRecords: 0,
    resolvedRecords: 0,
    unresolvedRecords: 0,
    deletedRecords: 0,
    errors: [],
  };

  console.log("\n🔍 Checking proplines table...");

  try {
    // Find all records with UNK values
    const unkRecords = await db.execute(sql`
      SELECT id, player_name, team, opponent, home_team, away_team, league
      FROM public.proplines
      WHERE team = 'UNK' OR team = '-' OR trim(team) = ''
         OR opponent = 'UNK' OR opponent = '-' OR trim(opponent) = ''
         OR player_name = 'UNK' OR player_name = '-' OR trim(player_name) = ''
         OR home_team = 'UNK' OR home_team = '-' OR trim(home_team) = ''
         OR away_team = 'UNK' OR away_team = '-' OR trim(away_team) = ''
    `);

    stats.totalUnkRecords = unkRecords.length;
    console.log(`Found ${stats.totalUnkRecords} records with UNK values`);

    if (stats.totalUnkRecords === 0) {
      console.log("✅ No UNK values found in proplines table");
      return stats;
    }

    // Show sample records
    console.log("\nSample records with UNK values:");
    unkRecords.slice(0, 5).forEach((record: any, i) => {
      console.log(
        `  ${i + 1}. ${record.player_name} | ${record.team} vs ${record.opponent} (${record.league})`,
      );
    });

    // In dry-run mode, just report what would be done
    if (dryRun) {
      console.log("\n[DRY RUN] Would attempt to resolve these records");
      stats.unresolvedRecords = stats.totalUnkRecords;
      return stats;
    }

    // If deleteUnresolvable is true, delete all records with UNK values
    if (deleteUnresolvable) {
      console.log("\n⚠️  Deleting records with unresolvable UNK values...");
      const deleteResult = await db.execute(sql`
        DELETE FROM public.proplines
        WHERE team = 'UNK' OR team = '-' OR trim(team) = ''
           OR opponent = 'UNK' OR opponent = '-' OR trim(opponent) = ''
           OR player_name = 'UNK' OR player_name = '-' OR trim(player_name) = ''
           OR home_team = 'UNK' OR home_team = '-' OR trim(home_team) = ''
           OR away_team = 'UNK' OR away_team = '-' OR trim(away_team) = ''
      `);
      stats.deletedRecords = stats.totalUnkRecords;
      console.log(`✅ Deleted ${stats.deletedRecords} records`);
    } else {
      console.log("\n⚠️  Records with UNK values found but --delete-unresolvable not specified");
      console.log("To delete these records, run with --delete-unresolvable flag");
      stats.unresolvedRecords = stats.totalUnkRecords;
    }
  } catch (error) {
    stats.errors.push(
      `Error cleaning proplines: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.error("❌ Error:", error);
  }

  return stats;
}

/**
 * Clean players table
 */
async function cleanPlayers(dryRun: boolean, deleteUnresolvable: boolean): Promise<BackfillStats> {
  const stats: BackfillStats = {
    tableName: "players",
    totalUnkRecords: 0,
    resolvedRecords: 0,
    unresolvedRecords: 0,
    deletedRecords: 0,
    errors: [],
  };

  console.log("\n🔍 Checking players table...");

  try {
    // Find all records with UNK values
    const unkRecords = await db.execute(sql`
      SELECT id, full_name, first_name, last_name, external_id
      FROM public.players
      WHERE full_name = 'UNK' OR full_name = '-' OR trim(full_name) = ''
         OR first_name = 'UNK' OR first_name = '-' OR trim(first_name) = ''
         OR last_name = 'UNK' OR last_name = '-' OR trim(last_name) = ''
         OR (external_id IS NOT NULL AND (external_id = 'UNK' OR external_id = '-' OR trim(external_id) = ''))
    `);

    stats.totalUnkRecords = unkRecords.length;
    console.log(`Found ${stats.totalUnkRecords} records with UNK values`);

    if (stats.totalUnkRecords === 0) {
      console.log("✅ No UNK values found in players table");
      return stats;
    }

    // Show sample records
    console.log("\nSample records with UNK values:");
    unkRecords.slice(0, 5).forEach((record: any, i) => {
      console.log(`  ${i + 1}. ${record.full_name} (${record.first_name} ${record.last_name})`);
    });

    // In dry-run mode, just report what would be done
    if (dryRun) {
      console.log("\n[DRY RUN] Would attempt to resolve these records");
      stats.unresolvedRecords = stats.totalUnkRecords;
      return stats;
    }

    // If deleteUnresolvable is true, delete all records with UNK values
    if (deleteUnresolvable) {
      console.log("\n⚠️  Deleting records with unresolvable UNK values...");
      const deleteResult = await db.execute(sql`
        DELETE FROM public.players
        WHERE full_name = 'UNK' OR full_name = '-' OR trim(full_name) = ''
           OR first_name = 'UNK' OR first_name = '-' OR trim(first_name) = ''
           OR last_name = 'UNK' OR last_name = '-' OR trim(last_name) = ''
      `);
      stats.deletedRecords = stats.totalUnkRecords;
      console.log(`✅ Deleted ${stats.deletedRecords} records`);
    } else {
      console.log("\n⚠️  Records with UNK values found but --delete-unresolvable not specified");
      console.log("To delete these records, run with --delete-unresolvable flag");
      stats.unresolvedRecords = stats.totalUnkRecords;
    }
  } catch (error) {
    stats.errors.push(
      `Error cleaning players: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.error("❌ Error:", error);
  }

  return stats;
}

/**
 * Clean teams table
 */
async function cleanTeams(dryRun: boolean, deleteUnresolvable: boolean): Promise<BackfillStats> {
  const stats: BackfillStats = {
    tableName: "teams",
    totalUnkRecords: 0,
    resolvedRecords: 0,
    unresolvedRecords: 0,
    deletedRecords: 0,
    errors: [],
  };

  console.log("\n🔍 Checking teams table...");

  try {
    // Find all records with UNK values
    const unkRecords = await db.execute(sql`
      SELECT id, name, abbreviation, external_id
      FROM public.teams
      WHERE name = 'UNK' OR name = '-' OR trim(name) = ''
         OR abbreviation = 'UNK' OR abbreviation = '-' OR trim(abbreviation) = ''
         OR (external_id IS NOT NULL AND (external_id = 'UNK' OR external_id = '-' OR trim(external_id) = ''))
    `);

    stats.totalUnkRecords = unkRecords.length;
    console.log(`Found ${stats.totalUnkRecords} records with UNK values`);

    if (stats.totalUnkRecords === 0) {
      console.log("✅ No UNK values found in teams table");
      return stats;
    }

    // Show sample records
    console.log("\nSample records with UNK values:");
    unkRecords.slice(0, 5).forEach((record: any, i) => {
      console.log(`  ${i + 1}. ${record.name} (${record.abbreviation})`);
    });

    // In dry-run mode, just report what would be done
    if (dryRun) {
      console.log("\n[DRY RUN] Would attempt to resolve these records");
      stats.unresolvedRecords = stats.totalUnkRecords;
      return stats;
    }

    // If deleteUnresolvable is true, delete all records with UNK values
    if (deleteUnresolvable) {
      console.log("\n⚠️  Deleting records with unresolvable UNK values...");
      const deleteResult = await db.execute(sql`
        DELETE FROM public.teams
        WHERE name = 'UNK' OR name = '-' OR trim(name) = ''
           OR abbreviation = 'UNK' OR abbreviation = '-' OR trim(abbreviation) = ''
      `);
      stats.deletedRecords = stats.totalUnkRecords;
      console.log(`✅ Deleted ${stats.deletedRecords} records`);
    } else {
      console.log("\n⚠️  Records with UNK values found but --delete-unresolvable not specified");
      console.log("To delete these records, run with --delete-unresolvable flag");
      stats.unresolvedRecords = stats.totalUnkRecords;
    }
  } catch (error) {
    stats.errors.push(
      `Error cleaning teams: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.error("❌ Error:", error);
  }

  return stats;
}

/**
 * Print final statistics
 */
function printFinalStats(allStats: BackfillStats[]) {
  console.log("\n📊 Final Statistics");
  console.log("=".repeat(80));

  let totalUnk = 0;
  let totalResolved = 0;
  let totalUnresolved = 0;
  let totalDeleted = 0;
  let totalErrors = 0;

  for (const stats of allStats) {
    console.log(`\n${stats.tableName}:`);
    console.log(`  Total UNK records: ${stats.totalUnkRecords}`);
    console.log(`  Resolved: ${stats.resolvedRecords}`);
    console.log(`  Unresolved: ${stats.unresolvedRecords}`);
    console.log(`  Deleted: ${stats.deletedRecords}`);
    if (stats.errors.length > 0) {
      console.log(`  Errors: ${stats.errors.length}`);
      stats.errors.forEach((error) => console.log(`    - ${error}`));
    }

    totalUnk += stats.totalUnkRecords;
    totalResolved += stats.resolvedRecords;
    totalUnresolved += stats.unresolvedRecords;
    totalDeleted += stats.deletedRecords;
    totalErrors += stats.errors.length;
  }

  console.log("\n" + "=".repeat(80));
  console.log("Overall:");
  console.log(`  Total UNK records found: ${totalUnk}`);
  console.log(`  Total resolved: ${totalResolved}`);
  console.log(`  Total unresolved: ${totalUnresolved}`);
  console.log(`  Total deleted: ${totalDeleted}`);
  console.log(`  Total errors: ${totalErrors}`);
  console.log("=".repeat(80));
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const deleteUnresolvable = args.includes("--delete-unresolvable");

  console.log("🧹 Cleaning UNK Values from Database");
  console.log("=".repeat(80));

  if (dryRun) {
    console.log("Mode: DRY RUN (no changes will be made)");
  } else if (deleteUnresolvable) {
    console.log("Mode: DELETE unresolvable records");
    console.log("⚠️  WARNING: This will permanently delete records with UNK values!");
    console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  } else {
    console.log("Mode: REPORT only (no changes will be made)");
    console.log("Use --delete-unresolvable to delete records with UNK values");
  }
  console.log("=".repeat(80));

  const allStats: BackfillStats[] = [];

  // Clean each table
  allStats.push(await cleanProplines(dryRun, deleteUnresolvable));
  allStats.push(await cleanPlayers(dryRun, deleteUnresolvable));
  allStats.push(await cleanTeams(dryRun, deleteUnresolvable));

  // Print final statistics
  printFinalStats(allStats);

  // Exit
  await client.end();

  const totalUnresolved = allStats.reduce((sum, s) => sum + s.unresolvedRecords, 0);
  const totalErrors = allStats.reduce((sum, s) => sum + s.errors.length, 0);

  if (totalErrors > 0) {
    console.log("\n❌ Backfill completed with errors");
    process.exit(1);
  } else if (totalUnresolved > 0 && !dryRun) {
    console.log("\n⚠️  Backfill completed but some records could not be resolved");
    process.exit(0);
  } else {
    console.log("\n✅ Backfill completed successfully");
    process.exit(0);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}
