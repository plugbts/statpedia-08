#!/usr/bin/env tsx
/**
 * Test Single NFL Game Extraction
 * Manually test the NFL extraction logic with a specific finished game
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import fetch from "node-fetch";

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const sqlc = postgres(conn, { prepare: false });
const db = drizzle(sqlc);

async function testSingleGame() {
  const gameId = "401772943"; // Ravens at Dolphins (finished game)

  console.log("🏈 Testing NFL Extraction with Single Game");
  console.log(`   Game ID: ${gameId}\n`);

  // Fetch the game data
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`;
  console.log("📡 Fetching game data from ESPN API...");

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`❌ Failed to fetch game: ${res.status}`);
    process.exit(1);
  }

  const payload: any = await res.json();
  console.log(
    `✅ Game data fetched: ${payload.header?.competitions?.[0]?.competitors?.map((c: any) => c.team?.displayName).join(" vs ")}`,
  );

  // Extract stats using our new logic
  console.log("\n📊 Extracting stats with NEW logic...\n");

  const teamsData = payload?.boxscore?.players || [];
  let statsExtracted = 0;

  const statsMap: Record<string, number> = {};

  for (const team of teamsData) {
    const teamAbbr = team?.team?.abbreviation || team?.team?.abbrev;
    const statGroups = team?.statistics || [];

    console.log(`\n🏈 Team: ${team.team?.displayName} (${teamAbbr})`);

    for (const statGroup of statGroups) {
      const category = statGroup.name;
      const labels = statGroup.labels || [];
      const athletes = statGroup.athletes || [];

      const propTypeMapping: Record<string, Record<string, string>> = {
        passing: {
          YDS: "Passing Yards",
          TD: "Passing TDs",
          INT: "Passing Interceptions",
          "C/ATT": "Passing Completions",
        },
        rushing: {
          CAR: "Rushing Attempts",
          YDS: "Rushing Yards",
          TD: "Rushing TDs",
        },
        receiving: {
          REC: "Receptions",
          YDS: "Receiving Yards",
          TD: "Receiving TDs",
          TGTS: "Receiving Targets",
        },
        defensive: {
          TOT: "Total Tackles",
          SOLO: "Solo Tackles",
          SACKS: "Sacks",
          INT: "Interceptions",
        },
        kicking: {
          FG: "Field Goals Made",
          "FG%": "Field Goal Percentage",
          XP: "Extra Points Made",
          PTS: "Kicking Points",
        },
      };

      const categoryMappings = propTypeMapping[category];
      if (!categoryMappings) continue;

      let categoryCount = 0;

      for (const athlete of athletes) {
        const playerId = athlete?.athlete?.id;
        const playerName = athlete?.athlete?.displayName || athlete?.athlete?.shortName;
        const stats = athlete?.stats || [];

        if (!playerId || !playerName) continue;

        labels.forEach((label: string, idx: number) => {
          const propType = categoryMappings[label];
          if (!propType) return;

          const rawValue = stats[idx];
          if (rawValue === undefined || rawValue === null) return;

          let value = 0;
          if (typeof rawValue === "string") {
            if (rawValue.includes("/")) {
              value = Number(rawValue.split("/")[0]) || 0;
            } else if (rawValue.includes("-")) {
              value = Number(rawValue.split("-")[0]) || 0;
            } else {
              value = Number(rawValue) || 0;
            }
          } else {
            value = Number(rawValue) || 0;
          }

          if (value > 0) {
            statsExtracted++;
            categoryCount++;

            // Count by prop type
            if (!statsMap[propType]) statsMap[propType] = 0;
            statsMap[propType]++;
          }
        });
      }

      if (categoryCount > 0) {
        console.log(`  - ${category}: ${categoryCount} stats extracted`);
      }
    }
  }

  console.log(`\n✅ Total stats extracted: ${statsExtracted}`);
  console.log("\n📊 Stats by Type:");
  Object.entries(statsMap)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });

  console.log("\n💡 This is what would be inserted into player_game_logs!");
  console.log("   (Not actually inserting - just demonstrating the extraction works)");

  await sqlc.end();
}

testSingleGame();
