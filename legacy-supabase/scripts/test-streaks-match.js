#!/usr/bin/env node

/**
 * Test Streaks Matching Logic
 * Check if we have matching records between player_game_logs and proplines
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rfdrifnsfobqlzorcesn.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testStreaksMatch() {
  console.log("🔍 Testing streaks matching logic...\n");

  try {
    // Get NFL data from both tables
    const { data: gameLogs, error: gameLogsError } = await supabase
      .from("player_game_logs")
      .select("*")
      .eq("league", "nfl")
      .limit(5);

    if (gameLogsError) {
      console.error("❌ Game logs query failed:", gameLogsError.message);
      return;
    }

    const { data: propLines, error: propLinesError } = await supabase
      .from("proplines")
      .select("*")
      .eq("league", "nfl")
      .limit(5);

    if (propLinesError) {
      console.error("❌ Prop lines query failed:", propLinesError.message);
      return;
    }

    console.log(`📊 Game logs: ${gameLogs?.length || 0} records`);
    console.log(`📊 Prop lines: ${propLines?.length || 0} records\n`);

    // Check for matches
    if (gameLogs && propLines) {
      console.log("🔍 Looking for matching records...\n");

      let matchCount = 0;

      for (const gameLog of gameLogs) {
        const matchingProp = propLines.find(
          (prop) =>
            prop.player_id === gameLog.player_id &&
            prop.prop_type === gameLog.prop_type &&
            prop.date === gameLog.date &&
            prop.league === gameLog.league,
        );

        if (matchingProp) {
          matchCount++;
          console.log(`✅ MATCH FOUND:`);
          console.log(`   Player: ${gameLog.player_name}`);
          console.log(`   Prop Type: ${gameLog.prop_type}`);
          console.log(`   Date: ${gameLog.date}`);
          console.log(`   Game Log Value: ${gameLog.value}`);
          console.log(`   Prop Line: ${matchingProp.line}`);
          console.log(`   Hit: ${gameLog.value >= matchingProp.line ? "YES" : "NO"}\n`);
        } else {
          console.log(
            `❌ No match for ${gameLog.player_name} - ${gameLog.prop_type} on ${gameLog.date}`,
          );
        }
      }

      console.log(`\n📊 Total matches found: ${matchCount} out of ${gameLogs.length} game logs`);

      if (matchCount === 0) {
        console.log("\n🔍 Sample data comparison:");
        console.log("Game Logs:");
        gameLogs.slice(0, 2).forEach((log) => {
          console.log(`  - ${log.player_id} | ${log.prop_type} | ${log.date} | ${log.league}`);
        });
        console.log("Prop Lines:");
        propLines.slice(0, 2).forEach((prop) => {
          console.log(`  - ${prop.player_id} | ${prop.prop_type} | ${prop.date} | ${prop.league}`);
        });
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testStreaksMatch()
  .then(() => {
    console.log("\n✅ Streaks matching test completed");
  })
  .catch((error) => {
    console.error("❌ Test script failed:", error);
    process.exit(1);
  });
