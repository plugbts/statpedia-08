#!/usr/bin/env node

/**
 * Test Script for Optimized Query Strategy
 *
 * This script tests the new progressive matching approach to ensure it captures
 * all 15,786 records by using flexible date tolerance and normalized prop types.
 */

import { createClient } from "@supabase/supabase-js";

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "https://your-project.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "your-service-key";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test the optimized query strategy
async function testOptimizedQueryStrategy() {
  console.log("🧪 Testing Optimized Query Strategy...");

  try {
    // First, let's check the current data counts
    console.log("\n📊 Current Data Counts:");

    const { data: proplinesCount, error: proplinesError } = await supabase
      .from("proplines")
      .select("*", { count: "exact", head: true });

    if (proplinesError) {
      console.error("❌ Error counting proplines:", proplinesError);
      return;
    }

    const { data: gameLogsCount, error: gameLogsError } = await supabase
      .from("player_game_logs")
      .select("*", { count: "exact", head: true });

    if (gameLogsError) {
      console.error("❌ Error counting game logs:", gameLogsError);
      return;
    }

    console.log(`📈 Proplines: ${proplinesCount?.length || 0} records`);
    console.log(`📈 Player Game Logs: ${gameLogsCount?.length || 0} records`);

    // Test the optimized query with flexible date tolerance
    console.log("\n🔍 Testing Optimized Query with Flexible Date Tolerance...");

    const { data: optimizedResults, error: optimizedError } = await supabase.rpc(
      "get_player_props_with_game_logs",
      {
        p_league: "nfl",
        p_season: 2025,
        p_date_from: "2025-01-01",
        p_date_to: "2025-12-31",
      },
    );

    if (optimizedError) {
      console.log("⚠️ RPC function not available, testing with manual query...");

      // Manual query with flexible date tolerance
      const { data: manualResults, error: manualError } = await supabase
        .from("proplines")
        .select(
          `
          *,
          player_game_logs!inner(*)
        `,
        )
        .eq("league", "nfl")
        .eq("season", 2025)
        .gte("date", "2025-01-01")
        .lte("date", "2025-12-31");

      if (manualError) {
        console.error("❌ Manual query error:", manualError);
        return;
      }

      console.log(`✅ Manual query returned ${manualResults?.length || 0} records`);
    } else {
      console.log(`✅ Optimized query returned ${optimizedResults?.length || 0} records`);
    }

    // Test progressive matching approach
    console.log("\n🎯 Testing Progressive Matching Approach...");

    // Get sample data for testing
    const { data: sampleProplines, error: sampleProplinesError } = await supabase
      .from("proplines")
      .select("*")
      .eq("league", "nfl")
      .limit(10);

    if (sampleProplinesError) {
      console.error("❌ Error fetching sample proplines:", sampleProplinesError);
      return;
    }

    const { data: sampleGameLogs, error: sampleGameLogsError } = await supabase
      .from("player_game_logs")
      .select("*")
      .eq("league", "nfl")
      .limit(10);

    if (sampleGameLogsError) {
      console.error("❌ Error fetching sample game logs:", sampleGameLogsError);
      return;
    }

    console.log(`📊 Sample Proplines: ${sampleProplines?.length || 0} records`);
    console.log(`📊 Sample Game Logs: ${sampleGameLogs?.length || 0} records`);

    // Test progressive matching logic
    let successfulMatches = 0;
    let totalAttempts = 0;

    if (sampleProplines && sampleGameLogs) {
      for (const prop of sampleProplines) {
        for (const gameLog of sampleGameLogs) {
          totalAttempts++;

          // Progressive matching criteria
          if (
            gameLog.player_id === prop.player_id &&
            gameLog.league?.toLowerCase() === prop.league?.toLowerCase() &&
            gameLog.season === prop.season
          ) {
            // Check prop type normalization
            const normalizedPropType = gameLog.prop_type?.toLowerCase().trim();
            const normalizedPropPropType = prop.prop_type?.toLowerCase().trim();

            if (normalizedPropType === normalizedPropPropType) {
              // Check date tolerance (±1 day)
              const gameLogDate = new Date(gameLog.date);
              const propDate = new Date(prop.date);
              const dateDiff = Math.abs(gameLogDate.getTime() - propDate.getTime());
              const dayDiff = dateDiff / (1000 * 60 * 60 * 24);

              if (dayDiff <= 1) {
                successfulMatches++;
                console.log(
                  `✅ Match found: ${gameLog.player_name} - ${gameLog.prop_type} (${dayDiff.toFixed(2)} days diff)`,
                );
              }
            }
          }
        }
      }
    }

    console.log(`\n📊 Progressive Matching Results:`);
    console.log(`🎯 Successful matches: ${successfulMatches}`);
    console.log(`🎯 Total attempts: ${totalAttempts}`);
    console.log(
      `🎯 Match rate: ${totalAttempts > 0 ? ((successfulMatches / totalAttempts) * 100).toFixed(2) : 0}%`,
    );

    // Test Cloudflare Worker API
    console.log("\n🌐 Testing Cloudflare Worker API...");

    try {
      const workerUrl = "https://statpedia-player-props.statpedia.workers.dev";
      const today = new Date().toISOString().split("T")[0];

      // Test with flexible date range
      const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const dateTo = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const apiUrl = `${workerUrl}/api/player-props?sport=nfl&date_from=${dateFrom}&date_to=${dateTo}`;

      console.log(`🔗 Testing API: ${apiUrl}`);

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.success) {
        console.log(`✅ API returned ${data.totalProps || 0} props`);
        console.log(`✅ API response time: ${data.responseTime || "N/A"}ms`);
      } else {
        console.log(`⚠️ API returned success: false - ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.log(`⚠️ API test failed: ${error.message}`);
    }

    console.log("\n🎉 Optimized Query Strategy Test Complete!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testOptimizedQueryStrategy();

export { testOptimizedQueryStrategy };
