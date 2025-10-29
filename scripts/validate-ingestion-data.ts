#!/usr/bin/env tsx
/**
 * Pre-ingestion validation script
 *
 * This script validates data before it's ingested into the database.
 * It checks for:
 * - Missing or invalid player IDs/names
 * - Missing or invalid team IDs/abbreviations
 * - UNK or dash values in any field
 *
 * Usage:
 *   tsx scripts/validate-ingestion-data.ts <data-file>
 *
 * Or import and use programmatically:
 *   import { validateIngestionData } from './scripts/validate-ingestion-data';
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { players, teams, leagues } from "../src/db/schema/index";
import { eq, and, inArray, sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  type: "MISSING_MAPPING" | "INVALID_VALUE" | "MISSING_REQUIRED_FIELD";
  field: string;
  value: any;
  message: string;
  context?: any;
}

interface ValidationWarning {
  type: "SUSPICIOUS_VALUE" | "OPTIONAL_FIELD_MISSING";
  field: string;
  value: any;
  message: string;
}

interface ProplineData {
  player_id?: string;
  player_name: string;
  team: string;
  opponent: string;
  home_team: string;
  away_team: string;
  prop_type: string;
  line: number;
  league: string;
  [key: string]: any;
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
 * Validate a single propline data entry
 */
export async function validateProplineData(data: ProplineData): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. Check required fields for invalid values
  const requiredFields = [
    "player_name",
    "team",
    "opponent",
    "home_team",
    "away_team",
    "prop_type",
    "league",
  ];

  for (const field of requiredFields) {
    if (isInvalidValue(data[field])) {
      errors.push({
        type: "INVALID_VALUE",
        field,
        value: data[field],
        message: `Required field '${field}' has invalid value: '${data[field]}'`,
      });
    }
  }

  // 2. Check line value
  if (typeof data.line !== "number" || isNaN(data.line)) {
    errors.push({
      type: "INVALID_VALUE",
      field: "line",
      value: data.line,
      message: `Line must be a valid number, got: ${data.line}`,
    });
  }

  // 3. Validate team abbreviations exist in database
  if (!isInvalidValue(data.team) && !isInvalidValue(data.league)) {
    try {
      // Query using raw SQL to avoid schema issues
      const leagueResult = await db.execute(sql`
        SELECT id FROM leagues WHERE code = ${data.league.toUpperCase()} LIMIT 1
      `);

      if (leagueResult.length === 0) {
        warnings.push({
          type: "SUSPICIOUS_VALUE",
          field: "league",
          value: data.league,
          message: `League '${data.league}' not found in database`,
        });
      } else {
        const leagueId = leagueResult[0].id;

        // Check if team exists
        const teamResult = await db.execute(sql`
          SELECT id FROM teams 
          WHERE league_id = ${leagueId} AND abbreviation = ${data.team}
          LIMIT 1
        `);

        if (teamResult.length === 0) {
          errors.push({
            type: "MISSING_MAPPING",
            field: "team",
            value: data.team,
            message: `Team abbreviation '${data.team}' not found in database for league '${data.league}'`,
            context: { league: data.league },
          });
        }

        // Check if opponent exists
        const opponentResult = await db.execute(sql`
          SELECT id FROM teams 
          WHERE league_id = ${leagueId} AND abbreviation = ${data.opponent}
          LIMIT 1
        `);

        if (opponentResult.length === 0) {
          errors.push({
            type: "MISSING_MAPPING",
            field: "opponent",
            value: data.opponent,
            message: `Opponent abbreviation '${data.opponent}' not found in database for league '${data.league}'`,
            context: { league: data.league },
          });
        }
      }
    } catch (error) {
      warnings.push({
        type: "SUSPICIOUS_VALUE",
        field: "team/opponent",
        value: `${data.team}/${data.opponent}`,
        message: `Error validating team/opponent: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  // 4. Validate player exists if player_id or player_name is provided
  if (!isInvalidValue(data.player_name)) {
    try {
      // Query using raw SQL to avoid schema issues
      const playerResult = await db.execute(sql`
        SELECT id FROM players WHERE name = ${data.player_name} LIMIT 1
      `);

      if (playerResult.length === 0) {
        warnings.push({
          type: "SUSPICIOUS_VALUE",
          field: "player_name",
          value: data.player_name,
          message: `Player '${data.player_name}' not found in database. May need to be created.`,
        });
      }
    } catch (error) {
      warnings.push({
        type: "SUSPICIOUS_VALUE",
        field: "player_name",
        value: data.player_name,
        message: `Error validating player: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  // 5. Check for consistency between team/opponent and home/away
  if (
    !isInvalidValue(data.team) &&
    !isInvalidValue(data.home_team) &&
    !isInvalidValue(data.away_team)
  ) {
    if (data.team !== data.home_team && data.team !== data.away_team) {
      warnings.push({
        type: "SUSPICIOUS_VALUE",
        field: "team",
        value: data.team,
        message: `Team '${data.team}' doesn't match either home team '${data.home_team}' or away team '${data.away_team}'`,
      });
    }

    if (data.opponent !== data.home_team && data.opponent !== data.away_team) {
      warnings.push({
        type: "SUSPICIOUS_VALUE",
        field: "opponent",
        value: data.opponent,
        message: `Opponent '${data.opponent}' doesn't match either home team '${data.home_team}' or away team '${data.away_team}'`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate an array of propline data entries
 */
export async function validateIngestionData(data: ProplineData[]): Promise<{
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  results: Array<{ data: ProplineData; validation: ValidationResult }>;
}> {
  console.log(`🔍 Validating ${data.length} records...`);

  const results = await Promise.all(
    data.map(async (item) => ({
      data: item,
      validation: await validateProplineData(item),
    })),
  );

  const validRecords = results.filter((r) => r.validation.isValid).length;
  const invalidRecords = results.filter((r) => !r.validation.isValid).length;

  return {
    totalRecords: data.length,
    validRecords,
    invalidRecords,
    results,
  };
}

/**
 * Print validation results in a readable format
 */
export function printValidationResults(results: {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  results: Array<{ data: ProplineData; validation: ValidationResult }>;
}) {
  console.log("\n📊 Validation Results");
  console.log("=".repeat(80));
  console.log(`Total records: ${results.totalRecords}`);
  console.log(
    `Valid records: ${results.validRecords} (${((results.validRecords / results.totalRecords) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Invalid records: ${results.invalidRecords} (${((results.invalidRecords / results.totalRecords) * 100).toFixed(1)}%)`,
  );

  // Show errors
  const allErrors = results.results.flatMap((r) => r.validation.errors);
  if (allErrors.length > 0) {
    console.log("\n❌ Errors Found:");
    console.log("-".repeat(80));

    // Group errors by type
    const errorsByType = allErrors.reduce(
      (acc, error) => {
        if (!acc[error.type]) acc[error.type] = [];
        acc[error.type].push(error);
        return acc;
      },
      {} as Record<string, ValidationError[]>,
    );

    for (const [type, errors] of Object.entries(errorsByType)) {
      console.log(`\n${type} (${errors.length} errors):`);
      errors.slice(0, 10).forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.message}`);
        if (error.context) {
          console.log(`     Context: ${JSON.stringify(error.context)}`);
        }
      });
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more`);
      }
    }
  }

  // Show warnings
  const allWarnings = results.results.flatMap((r) => r.validation.warnings);
  if (allWarnings.length > 0) {
    console.log("\n⚠️  Warnings Found:");
    console.log("-".repeat(80));

    // Group warnings by type
    const warningsByType = allWarnings.reduce(
      (acc, warning) => {
        if (!acc[warning.type]) acc[warning.type] = [];
        acc[warning.type].push(warning);
        return acc;
      },
      {} as Record<string, ValidationWarning[]>,
    );

    for (const [type, warnings] of Object.entries(warningsByType)) {
      console.log(`\n${type} (${warnings.length} warnings):`);
      warnings.slice(0, 5).forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning.message}`);
      });
      if (warnings.length > 5) {
        console.log(`  ... and ${warnings.length - 5} more`);
      }
    }
  }

  console.log("\n" + "=".repeat(80));

  if (results.invalidRecords > 0) {
    console.log("❌ Validation FAILED - Fix errors before ingesting data");
    return false;
  } else if (allWarnings.length > 0) {
    console.log("⚠️  Validation PASSED with warnings - Review warnings before proceeding");
    return true;
  } else {
    console.log("✅ Validation PASSED - Data is ready for ingestion");
    return true;
  }
}

/**
 * Main function for CLI usage
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: tsx scripts/validate-ingestion-data.ts <data-file>");
    console.log("       tsx scripts/validate-ingestion-data.ts --test");
    process.exit(1);
  }

  if (args[0] === "--test") {
    // Run test validation with sample data
    console.log("🧪 Running test validation...\n");

    const testData: ProplineData[] = [
      {
        player_name: "Patrick Mahomes",
        team: "KC",
        opponent: "BUF",
        home_team: "KC",
        away_team: "BUF",
        prop_type: "Passing Yards",
        line: 275.5,
        league: "NFL",
      },
      {
        player_name: "UNK",
        team: "UNK",
        opponent: "BUF",
        home_team: "UNK",
        away_team: "BUF",
        prop_type: "Passing Yards",
        line: 275.5,
        league: "NFL",
      },
      {
        player_name: "Test Player",
        team: "-",
        opponent: "BUF",
        home_team: "KC",
        away_team: "BUF",
        prop_type: "Passing Yards",
        line: 275.5,
        league: "NFL",
      },
    ];

    const results = await validateIngestionData(testData);
    const passed = printValidationResults(results);

    await client.end();
    process.exit(passed ? 0 : 1);
  } else {
    // Load and validate data from file
    const fs = await import("fs/promises");
    const { existsSync } = await import("fs");
    const dataFile = args[0];

    if (!existsSync(dataFile)) {
      console.error(`Error: File not found: ${dataFile}`);
      process.exit(1);
    }

    const fileContent = await fs.readFile(dataFile, "utf-8");
    const data = JSON.parse(fileContent);

    if (!Array.isArray(data)) {
      console.error("Error: Data file must contain an array of records");
      process.exit(1);
    }

    const results = await validateIngestionData(data);
    const passed = printValidationResults(results);

    await client.end();
    process.exit(passed ? 0 : 1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}
