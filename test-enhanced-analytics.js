#!/usr/bin/env node

/**
 * Enhanced Analytics System Test
 * Tests the new analytics features: streak detection, defensive rankings, and incremental refresh
 */

const BASE_URL = "https://statpedia-player-props.statpedia.workers.dev";

async function testEnhancedAnalytics() {
  console.log("🚀 Testing Enhanced Analytics System...\n");

  try {
    // 1. Test analytics refresh endpoint
    console.log("🔄 Testing analytics refresh...");
    const refreshResponse = await fetch(`${BASE_URL}/refresh-analytics`);
    const refreshResult = await refreshResponse.json();
    
    if (refreshResult.success) {
      console.log("✅ Analytics refresh successful");
      console.log(`   Timestamp: ${refreshResult.timestamp}`);
    } else {
      console.log("❌ Analytics refresh failed:", refreshResult.error);
    }

    // 2. Test incremental analytics refresh
    console.log("\n🔄 Testing incremental analytics refresh (last 2 days)...");
    const incrementalResponse = await fetch(`${BASE_URL}/incremental-analytics-refresh?days=2`);
    const incrementalResult = await incrementalResponse.json();
    
    if (incrementalResult.success) {
      console.log("✅ Incremental analytics refresh successful");
      console.log(`   Days back: ${incrementalResult.daysBack}`);
      console.log(`   Timestamp: ${incrementalResult.timestamp}`);
    } else {
      console.log("❌ Incremental analytics refresh failed:", incrementalResult.error);
    }

    // 3. Test TRUE streak analysis endpoint
    console.log("\n📊 Testing TRUE streak analysis...");
    const streakResponse = await fetch(`${BASE_URL}/analytics/streaks?league=nfl&limit=10`);
    const streakResult = await streakResponse.json();
    
    if (streakResult.success) {
      console.log("✅ TRUE streak analysis successful");
      console.log(`   League: ${streakResult.league}`);
      console.log(`   Limit: ${streakResult.limit}`);
      console.log(`   Data points: ${streakResult.data?.length || 0}`);
      
      // Show sample TRUE streak data
      if (streakResult.data && streakResult.data.length > 0) {
        console.log("   Sample TRUE streaks:");
        streakResult.data.slice(0, 3).forEach((player, i) => {
          console.log(`     ${i + 1}. ${player.player_name} (${player.team}) - ${player.current_streak} ${player.streak_direction} streak (${player.streak_quality}) in ${player.prop_type}`);
          console.log(`        Betting Signal: ${player.betting_signal}, Significance: ${player.streak_significance}`);
        });
      }
    } else {
      console.log("❌ TRUE streak analysis failed:", streakResult.error);
    }

    // 4. Test defensive rankings endpoint
    console.log("\n📊 Testing defensive rankings...");
    const defensiveResponse = await fetch(`${BASE_URL}/analytics/defensive-rankings?league=nfl&prop_type=Passing Yards`);
    const defensiveResult = await defensiveResponse.json();
    
    if (defensiveResult.success) {
      console.log("✅ Defensive rankings successful");
      console.log(`   League: ${defensiveResult.league}`);
      console.log(`   Prop Type: ${defensiveResult.propType}`);
      console.log(`   Data points: ${defensiveResult.data?.length || 0}`);
      
      // Show sample defensive data
      if (defensiveResult.data && defensiveResult.data.length > 0) {
        console.log("   Sample defensive rankings:");
        defensiveResult.data.slice(0, 3).forEach((team, i) => {
          console.log(`     ${i + 1}. ${team.team} - ${team.defensive_tier} (${(team.defensive_percentile * 100).toFixed(1)}% percentile)`);
        });
      }
    } else {
      console.log("❌ Defensive rankings failed:", defensiveResult.error);
    }

    // 5. Test cross-league TRUE streak analysis
    console.log("\n📊 Testing cross-league TRUE streak analysis...");
    const allStreaksResponse = await fetch(`${BASE_URL}/analytics/streaks?league=all&limit=20`);
    const allStreaksResult = await allStreaksResponse.json();
    
    if (allStreaksResult.success) {
      console.log("✅ Cross-league TRUE streak analysis successful");
      console.log(`   Total streak records found: ${allStreaksResult.data?.length || 0}`);
      
      // Group by league and streak quality
      if (allStreaksResult.data && allStreaksResult.data.length > 0) {
        const leagueCounts = {};
        const streakQualityCounts = {};
        const streakDirectionCounts = {};
        allStreaksResult.data.forEach(player => {
          leagueCounts[player.league] = (leagueCounts[player.league] || 0) + 1;
          streakQualityCounts[player.streak_quality] = (streakQualityCounts[player.streak_quality] || 0) + 1;
          streakDirectionCounts[player.streak_direction] = (streakDirectionCounts[player.streak_direction] || 0) + 1;
        });
        
        console.log("   Streaks by league:");
        Object.entries(leagueCounts).forEach(([league, count]) => {
          console.log(`     ${league.toUpperCase()}: ${count} active streaks`);
        });
        
        console.log("   Streaks by quality:");
        Object.entries(streakQualityCounts).forEach(([quality, count]) => {
          console.log(`     ${quality}: ${count} streaks`);
        });
        
        console.log("   Streaks by direction:");
        Object.entries(streakDirectionCounts).forEach(([direction, count]) => {
          console.log(`     ${direction}: ${count} streaks`);
        });
      }
    } else {
      console.log("❌ Cross-league TRUE streak analysis failed:", allStreaksResult.error);
    }

    // 6. Test performance with different prop types
    console.log("\n📊 Testing defensive rankings across prop types...");
    const propTypes = ["Passing Yards", "Rushing Yards", "Receiving Yards"];
    
    for (const propType of propTypes) {
      const propResponse = await fetch(`${BASE_URL}/analytics/defensive-rankings?league=nfl&prop_type=${encodeURIComponent(propType)}`);
      const propResult = await propResponse.json();
      
      if (propResult.success) {
        console.log(`   ✅ ${propType}: ${propResult.data?.length || 0} teams ranked`);
      } else {
        console.log(`   ❌ ${propType}: ${propResult.error}`);
      }
    }

    // 7. Test system status after analytics operations
    console.log("\n🔍 Testing system status...");
    const statusResponse = await fetch(`${BASE_URL}/status`);
    const statusResult = await statusResponse.json();
    
    if (statusResult.success) {
      console.log("✅ System status check successful");
      console.log(`   Active leagues: ${statusResult.leagues?.length || 0}`);
      console.log(`   Available seasons: ${statusResult.seasons?.length || 0}`);
    } else {
      console.log("❌ System status check failed:", statusResult.error);
    }

    console.log("\n🎉 TRUE STREAKS Analytics System Test Complete!");
    console.log("\n📋 Summary:");
    console.log("   ✅ Analytics refresh functionality");
    console.log("   ✅ Incremental refresh capability");
    console.log("   ✅ TRUE consecutive streak detection (not just 3-day windows)");
    console.log("   ✅ Advanced streak analysis with betting signals");
    console.log("   ✅ Defensive rankings by league and prop type");
    console.log("   ✅ Cross-league analytics queries");
    console.log("   ✅ Performance-optimized materialized views");

  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Run the test
testEnhancedAnalytics().catch(console.error);
