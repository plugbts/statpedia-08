#!/usr/bin/env node

/**
 * Test SupabaseFetch Function
 * Test what supabaseFetch returns for the streaks queries
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rfdrifnsfobqlzorcesn.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSupabaseFetch() {
  console.log("🔍 Testing SupabaseFetch queries...\n");

  try {
    // Test 1: Direct Supabase query for game logs
    console.log("📊 Test 1: Direct Supabase query for game logs");
    const { data: gameLogs, error: gameLogsError } = await supabase
      .from("player_game_logs")
      .select("*")
      .eq("league", "nfl")
      .order("date", { ascending: false });

    if (gameLogsError) {
      console.error("❌ Game logs query failed:", gameLogsError.message);
    } else {
      console.log(`✅ Game logs: ${gameLogs?.length || 0} records`);
      if (gameLogs && gameLogs.length > 0) {
        console.log("📋 Sample game log:", JSON.stringify(gameLogs[0], null, 2));
      }
    }

    // Test 2: Test the exact query that streaks endpoint uses
    console.log("\n📊 Test 2: Exact streaks query format");
    const { data: streaksGameLogs, error: streaksError } = await supabase
      .from("player_game_logs")
      .select("*")
      .eq("league", "nfl")
      .order("date", { ascending: false });

    if (streaksError) {
      console.error("❌ Streaks query failed:", streaksError.message);
    } else {
      console.log(`✅ Streaks game logs: ${streaksGameLogs?.length || 0} records`);

      if (streaksGameLogs && streaksGameLogs.length > 0) {
        // Test the prop lines query
        const playerIds = [...new Set(streaksGameLogs.map((g) => g.player_id))];
        const propTypes = [...new Set(streaksGameLogs.map((g) => g.prop_type))];
        const dates = [...new Set(streaksGameLogs.map((g) => g.date))];

        console.log(`📊 Unique players: ${playerIds.length}`);
        console.log(`📊 Unique prop types: ${propTypes.join(", ")}`);
        console.log(`📊 Unique dates: ${dates.join(", ")}`);

        const { data: propLines, error: propLinesError } = await supabase
          .from("proplines")
          .select("*")
          .in("player_id", playerIds)
          .in("prop_type", propTypes)
          .in("date", dates);

        if (propLinesError) {
          console.error("❌ Prop lines query failed:", propLinesError.message);
        } else {
          console.log(`✅ Prop lines: ${propLines?.length || 0} records`);

          // Test the join logic
          const gameResults = streaksGameLogs
            .map((gameLog) => {
              const propLine = propLines?.find(
                (prop) =>
                  prop.player_id === gameLog.player_id &&
                  prop.prop_type === gameLog.prop_type &&
                  prop.date === gameLog.date &&
                  prop.league === gameLog.league,
              );

              if (!propLine) return null;

              return {
                player_id: gameLog.player_id,
                player_name: gameLog.player_name,
                team: gameLog.team,
                prop_type: gameLog.prop_type,
                league: gameLog.league,
                date: gameLog.date,
                hit_result: gameLog.value >= propLine.line ? 1 : 0,
              };
            })
            .filter(Boolean);

          console.log(`✅ Game results: ${gameResults.length} matches found`);

          if (gameResults.length > 0) {
            console.log("📋 Sample game result:", JSON.stringify(gameResults[0], null, 2));
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testSupabaseFetch()
  .then(() => {
    console.log("\n✅ SupabaseFetch test completed");
  })
  .catch((error) => {
    console.error("❌ Test script failed:", error);
    process.exit(1);
  });
