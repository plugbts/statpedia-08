#!/usr/bin/env tsx
/**
 * Test NFL API Structure
 * This script fetches a recent NFL game to understand the ESPN API response structure
 * so we can properly extract passing/rushing/receiving stats
 */

import fetch from "node-fetch";

async function testNFLAPI() {
  console.log("🏈 Testing NFL ESPN API Structure...\n");

  // Recent NFL game ID (Week 9 2024)
  const gameId = "401671808"; // Example: Chiefs vs Buccaneers

  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`❌ API request failed: ${res.status} ${res.statusText}`);
      return;
    }

    const data: any = await res.json();

    console.log("📊 API Response Structure:\n");
    console.log("Game Info:", {
      id: data.header?.id,
      name: data.header?.competitions?.[0]?.competitors
        ?.map((c: any) => c.team?.displayName)
        .join(" vs "),
      date: data.header?.competitions?.[0]?.date,
    });

    console.log("\n📦 Boxscore Structure:");
    const boxscore = data.boxscore;
    if (boxscore?.players) {
      console.log(`  - Found ${boxscore.players.length} teams`);

      for (const team of boxscore.players) {
        console.log(`\n  🏈 Team: ${team.team?.displayName} (${team.team?.abbreviation})`);
        console.log(`     Groups: ${team.statistics?.length || 0}`);

        // Show structure of first player in each stat category
        if (team.statistics) {
          for (const statGroup of team.statistics) {
            console.log(`\n     📋 ${statGroup.name}:`);
            console.log(`        - Total athletes: ${statGroup.athletes?.length || 0}`);

            // Show stat labels if available
            if (statGroup.labels) {
              console.log(`        - Stat labels:`, statGroup.labels);
            }

            if (statGroup.athletes?.[0]) {
              const firstPlayer = statGroup.athletes[0];
              console.log(`        - Example player:`, {
                id: firstPlayer.athlete?.id,
                name: firstPlayer.athlete?.displayName,
                position: firstPlayer.athlete?.position?.abbreviation,
              });

              // Debug: show raw stats structure
              console.log(
                `\n        - Raw stats structure:`,
                JSON.stringify(firstPlayer.stats, null, 2).substring(0, 500),
              );

              // Try different ways to access stats
              if (Array.isArray(firstPlayer.stats)) {
                console.log(`\n        - Stats as array (${firstPlayer.stats.length} items):`);
                firstPlayer.stats.forEach((s: any, idx: number) => {
                  if (typeof s === "string") {
                    console.log(`          ${idx}: "${s}"`);
                  } else if (typeof s === "number") {
                    console.log(`          ${idx}: ${s}`);
                  } else {
                    console.log(`          ${idx}: ${JSON.stringify(s)}`);
                  }
                });
              }
            }
          }
        }
      }
    } else {
      console.log("  ❌ No boxscore.players found");
    }

    // Also check the older structure (groups within players)
    console.log("\n\n📦 Alternative Structure Check (boxscore.players[].groups):");
    if (boxscore?.players) {
      for (const team of boxscore.players) {
        console.log(`\n  🏈 Team: ${team.team?.displayName}`);
        if (team.groups) {
          console.log(`     Groups found: ${team.groups.length}`);
          for (const group of team.groups) {
            console.log(`     - ${group.name}: ${group.athletes?.length || 0} athletes`);
            if (group.athletes?.[0]) {
              console.log(`       Example:`, {
                name: group.athletes[0].athlete?.displayName,
                stats: group.athletes[0].stats?.map((s: any) => `${s}`),
              });
            }
          }
        }
      }
    }

    console.log("\n\n✅ API structure analysis complete!");
    console.log("\n💡 Next step: Update ingest-official-game-logs.ts with proper stat extraction");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testNFLAPI();
