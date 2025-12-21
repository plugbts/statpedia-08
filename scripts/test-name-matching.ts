#!/usr/bin/env tsx

/**
 * Test Name Matching
 *
 * Verifies that the improved name normalization correctly matches
 * players with different name formats (apostrophes, hyphens, initials).
 */

import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

function normalizeHumanNameForMatch(name: string): string {
  return (
    String(name || "")
      .normalize("NFD")
      // Remove diacritics (e.g., Ş -> S)
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      // Remove apostrophes WITHOUT adding space (e.g., "Cor'Dale" -> "cordale", "O'Brien" -> "obrien")
      .replace(/'/g, "")
      // Remove hyphens and replace with space (e.g., "Smith-Jones" -> "smith jones")
      .replace(/-/g, " ")
      // Normalize initials: "j.j." -> "jj", "tj" -> "tj", "j j" -> "jj"
      .replace(/\b([a-z])\s*\.\s*([a-z])\b/g, "$1$2") // "j.j." -> "jj"
      .replace(/\b([a-z])\s+([a-z])\b/g, (m, a, b) => {
        // If both are single letters, treat as initials (no space)
        if (m.length === 3 && m[1] === " ") return a + b;
        return m;
      })
      // Remove all non-alphanumeric except spaces
      .replace(/[^a-z0-9\s]/g, " ")
      // Collapse multiple spaces
      .replace(/\s+/g, " ")
      .trim()
  );
}

async function main() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) {
    console.error("No DB URL");
    process.exit(1);
  }
  const sql = postgres(conn, { prepare: false });

  // Test cases: SGO names vs DB names
  const testCases = [
    { sgo: "Cordale Flott", db: "Cor'Dale Flott" },
    { sgo: "Liljordan Humphrey", db: "Lil'Jordan Humphrey" },
    { sgo: "Tj Hockenson", db: "T.J. Hockenson" },
    { sgo: "Jj Mccarthy", db: "J.J. McCarthy" },
    { sgo: "Jj Mccarthy", db: "JJ McCarthy" },
    { sgo: "Dashawn Hand", db: "Da'Shawn Hand" },
    { sgo: "Jatavion Sanders", db: "Ja'Tavion Sanders" },
    { sgo: "Trevon Moehrig", db: "Tre'von Moehrig" },
    { sgo: "Ashawn Robinson", db: "A'Shawn Robinson" },
    { sgo: "Gabriel Davis", db: "Gabe Davis" },
    { sgo: "Josh Palmer", db: "Joshua Palmer" },
    { sgo: "Tredavious White", db: "Tre'Davious White" },
    { sgo: "Gregory Rousseau", db: "Greg Rousseau" },
    { sgo: "Koolaid Mckinstry", db: "Kool-Aid McKinstry" },
    { sgo: "Qwantez Stiggers", db: "Qwan'tez Stiggers" },
    { sgo: "Jaquan Mcmillian", db: "Ja'Quan McMillian" },
    { sgo: "Patrick Surtain Ii", db: "Patrick Surtain II" },
    { sgo: "Kaimi Fairbairn", db: "Ka'imi Fairbairn" },
  ];

  console.log("🧪 Testing Name Matching...\n");
  console.log("=".repeat(80));

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    const sgoNormalized = normalizeHumanNameForMatch(test.sgo);
    const dbNormalized = normalizeHumanNameForMatch(test.db);
    const match = sgoNormalized === dbNormalized;

    if (match) {
      console.log(`✅ "${test.sgo}" ↔ "${test.db}"`);
      console.log(`   Normalized: "${sgoNormalized}"`);
      passed++;
    } else {
      console.log(`❌ "${test.sgo}" ↔ "${test.db}"`);
      console.log(`   SGO normalized: "${sgoNormalized}"`);
      console.log(`   DB normalized:  "${dbNormalized}"`);
      failed++;
    }
    console.log();
  }

  console.log("=".repeat(80));
  console.log(`Results: ${passed} passed, ${failed} failed\n`);

  // Now check actual DB players
  console.log("🔍 Checking actual DB players for known mismatches...\n");
  const knownMismatches = [
    { sgo: "Cordale Flott", search: "cordale flott" },
    { sgo: "Liljordan Humphrey", search: "liljordan" },
    { sgo: "Tj Hockenson", search: "hockenson" },
    { sgo: "Jj Mccarthy", search: "mccarthy" },
  ];

  for (const mm of knownMismatches) {
    const rows = await sql.unsafe(
      `SELECT name FROM public.players WHERE LOWER(name) LIKE $1 LIMIT 5`,
      [`%${mm.search}%`],
    );
    if (rows.length > 0) {
      console.log(`"${mm.sgo}" -> Found in DB:`);
      rows.forEach((r: any) => {
        const sgoNorm = normalizeHumanNameForMatch(mm.sgo);
        const dbNorm = normalizeHumanNameForMatch(r.name);
        const match = sgoNorm === dbNorm;
        console.log(`  ${match ? "✅" : "❌"} "${r.name}" (normalized: "${dbNorm}")`);
      });
      console.log();
    }
  }

  await sql.end();
}

main().catch(console.error);
