#!/usr/bin/env tsx
/**
 * Integration test for UNK prevention system
 *
 * This script demonstrates the complete UNK prevention flow:
 * 1. Tests validation with valid data (should pass)
 * 2. Tests validation with UNK values (should fail)
 * 3. Tests validation with dash values (should fail)
 * 4. Shows how to integrate validation in ingestion scripts
 */

import { validateProplineData } from "./validate-ingestion-data";

interface TestCase {
  name: string;
  data: any;
  expectedValid: boolean;
  expectedErrorCount: number;
}

const testCases: TestCase[] = [
  {
    name: "Valid data",
    data: {
      player_name: "Patrick Mahomes",
      team: "KC",
      opponent: "BUF",
      home_team: "KC",
      away_team: "BUF",
      prop_type: "Passing Yards",
      line: 275.5,
      league: "NFL",
    },
    expectedValid: true,
    expectedErrorCount: 0,
  },
  {
    name: "UNK in player_name",
    data: {
      player_name: "UNK",
      team: "KC",
      opponent: "BUF",
      home_team: "KC",
      away_team: "BUF",
      prop_type: "Passing Yards",
      line: 275.5,
      league: "NFL",
    },
    expectedValid: false,
    expectedErrorCount: 1,
  },
  {
    name: "Dash in team",
    data: {
      player_name: "Patrick Mahomes",
      team: "-",
      opponent: "BUF",
      home_team: "KC",
      away_team: "BUF",
      prop_type: "Passing Yards",
      line: 275.5,
      league: "NFL",
    },
    expectedValid: false,
    expectedErrorCount: 1,
  },
  {
    name: "Empty string in opponent",
    data: {
      player_name: "Patrick Mahomes",
      team: "KC",
      opponent: "  ",
      home_team: "KC",
      away_team: "BUF",
      prop_type: "Passing Yards",
      line: 275.5,
      league: "NFL",
    },
    expectedValid: false,
    expectedErrorCount: 1,
  },
  {
    name: "Multiple UNK values",
    data: {
      player_name: "UNK",
      team: "UNK",
      opponent: "UNK",
      home_team: "UNK",
      away_team: "UNK",
      prop_type: "Passing Yards",
      line: 275.5,
      league: "NFL",
    },
    expectedValid: false,
    expectedErrorCount: 5,
  },
  {
    name: "Missing line value",
    data: {
      player_name: "Patrick Mahomes",
      team: "KC",
      opponent: "BUF",
      home_team: "KC",
      away_team: "BUF",
      prop_type: "Passing Yards",
      line: NaN,
      league: "NFL",
    },
    expectedValid: false,
    expectedErrorCount: 1,
  },
];

async function runTests() {
  console.log("🧪 Running UNK Prevention System Tests");
  console.log("=".repeat(80));
  console.log("");

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    process.stdout.write(`Testing: ${testCase.name}... `);

    try {
      const result = await validateProplineData(testCase.data);

      // Check if validation result matches expectation
      const validationMatches = result.isValid === testCase.expectedValid;
      const errorCountMatches = result.errors.length === testCase.expectedErrorCount;

      if (validationMatches && errorCountMatches) {
        console.log("✅ PASS");
        passed++;
      } else {
        console.log("❌ FAIL");
        console.log(
          `  Expected: valid=${testCase.expectedValid}, errors=${testCase.expectedErrorCount}`,
        );
        console.log(`  Got: valid=${result.isValid}, errors=${result.errors.length}`);
        if (result.errors.length > 0) {
          console.log("  Errors:", result.errors.map((e) => e.message).join(", "));
        }
        failed++;
      }
    } catch (error) {
      console.log("❌ ERROR");
      console.log(`  ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  console.log("");
  console.log("=".repeat(80));
  console.log("Test Results:");
  console.log(`  Passed: ${passed}/${testCases.length}`);
  console.log(`  Failed: ${failed}/${testCases.length}`);
  console.log("=".repeat(80));

  if (failed > 0) {
    console.log("");
    console.log("❌ Some tests failed");
    process.exit(1);
  } else {
    console.log("");
    console.log("✅ All tests passed!");
    console.log("");
    console.log("💡 The UNK prevention system is working correctly:");
    console.log("   - Valid data passes validation");
    console.log("   - UNK values are detected and rejected");
    console.log("   - Dash values are detected and rejected");
    console.log("   - Empty strings are detected and rejected");
    console.log("   - Missing values are detected and rejected");
    console.log("");
    console.log("🔒 Your database is protected from bad data!");
    process.exit(0);
  }
}

console.log("");
console.log("⚠️  Note: Database connection warnings are expected in test mode");
console.log("    The validation logic works independently of database availability");
console.log("");

runTests().catch((error) => {
  console.error("💥 Test runner error:", error);
  process.exit(2);
});
