const BASE_URL = "https://statpedia-player-props.statpedia.workers.dev";

async function debugStreaks() {
  console.log("🔍 DEBUGGING TRUE STREAKS SYSTEM...\n");

  try {
    // 1. First, apply the debug migration
    console.log("📋 STEP 1: Apply debug-streaks-migration.sql in Supabase SQL Editor");
    console.log("   This creates debug_streak_analysis, debug_streak_summary, and debug_streak_counts views");
    console.log("   Press Enter when ready to continue...\n");
    
    // Wait for user input (simulated)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Test debug streak counts (shows distribution of streak lengths)
    console.log("📊 STEP 2: Testing debug streak counts...");
    const countsResponse = await fetch(`${BASE_URL}/debug-streak-counts?league=all`);
    const countsResult = await countsResponse.json();
    
    if (countsResult.success) {
      console.log("✅ Debug streak counts successful!");
      console.log(`   Total records: ${countsResult.data?.length || 0}`);
      
      if (countsResult.data && countsResult.data.length > 0) {
        console.log("   Streak distribution:");
        countsResult.data.slice(0, 10).forEach(row => {
          console.log(`     ${row.league} ${row.prop_type}: ${row.player_count} players with ${row.current_streak} ${row.current_streak_direction} streak`);
        });
        
        // Check if we have any streaks >= 2
        const streaks2Plus = countsResult.data.filter(row => row.current_streak >= 2);
        console.log(`\n   🔥 Streaks >= 2 games: ${streaks2Plus.length} total`);
        if (streaks2Plus.length === 0) {
          console.log("   ⚠️  NO STREAKS >= 2 FOUND - This explains why streak_analysis is empty!");
          console.log("   💡 The threshold filter (>= 2) is filtering out all results");
        }
      } else {
        console.log("   ❌ No streak data found at all");
      }
    } else {
      console.log("❌ Debug streak counts failed:", countsResult.error);
    }

    // 3. Test debug streak summary (shows individual player streaks)
    console.log("\n📊 STEP 3: Testing debug streak summary...");
    const summaryResponse = await fetch(`${BASE_URL}/debug-streaks?league=all&limit=10`);
    const summaryResult = await summaryResponse.json();
    
    if (summaryResult.success) {
      console.log("✅ Debug streak summary successful!");
      console.log(`   Total records: ${summaryResult.data?.length || 0}`);
      
      if (summaryResult.data && summaryResult.data.length > 0) {
        console.log("   Sample streaks:");
        summaryResult.data.slice(0, 5).forEach((player, i) => {
          console.log(`     ${i + 1}. ${player.player_name} (${player.team}) - ${player.current_streak} ${player.current_streak_direction} streak in ${player.prop_type} (${player.streak_quality})`);
        });
      } else {
        console.log("   ❌ No individual streak data found");
      }
    } else {
      console.log("❌ Debug streak summary failed:", summaryResult.error);
    }

    // 4. Test original streak analysis for comparison
    console.log("\n📊 STEP 4: Testing original streak analysis...");
    const originalResponse = await fetch(`${BASE_URL}/analytics/streaks?league=all&limit=10`);
    const originalResult = await originalResponse.json();
    
    if (originalResult.success) {
      console.log("✅ Original streak analysis successful!");
      console.log(`   Total records: ${originalResult.data?.length || 0}`);
      
      if (originalResult.data && originalResult.data.length > 0) {
        console.log("   Original streaks found:");
        originalResult.data.slice(0, 3).forEach((player, i) => {
          console.log(`     ${i + 1}. ${player.player_name} - ${player.current_streak} ${player.streak_direction} streak`);
        });
      } else {
        console.log("   ❌ Original streak analysis still empty (expected if debug shows no streaks >= 2)");
      }
    } else {
      console.log("❌ Original streak analysis failed:", originalResult.error);
    }

    // 5. Analysis and recommendations
    console.log("\n🔍 DIAGNOSIS:");
    if (countsResult.success && countsResult.data && countsResult.data.length > 0) {
      const streaks1 = countsResult.data.filter(row => row.current_streak === 1);
      const streaks2Plus = countsResult.data.filter(row => row.current_streak >= 2);
      
      console.log(`   📊 Data Summary:`);
      console.log(`     - Single games (streak=1): ${streaks1.length} records`);
      console.log(`     - Multi-game streaks (>=2): ${streaks2Plus.length} records`);
      
      if (streaks2Plus.length === 0) {
        console.log(`\n   🎯 ROOT CAUSE: No consecutive streaks >= 2 games found`);
        console.log(`   💡 POSSIBLE REASONS:`);
        console.log(`     1. Data gaps between games (not consecutive calendar days)`);
        console.log(`     2. Players only have 1 game each in the dataset`);
        console.log(`     3. Date formatting issues in the data`);
        console.log(`     4. Prop type grouping issues`);
        
        console.log(`\n   🛠️  SOLUTIONS:`);
        console.log(`     1. Lower threshold to >= 1 to see all "streaks"`);
        console.log(`     2. Check date gaps in player_game_logs table`);
        console.log(`     3. Verify prop type and player grouping`);
        console.log(`     4. Consider using game sequence numbers instead of dates`);
      } else {
        console.log(`\n   ✅ STREAKS DETECTED! Original view should work with proper data`);
      }
    } else {
      console.log(`   ❌ No streak data found - check if debug migration was applied`);
    }

  } catch (error) {
    console.error("❌ Debug test failed:", error.message);
  }
}

debugStreaks();
