// Analytics Layer Verification Script
// This script verifies that analytics views/RPCs work with Worker queries

const SUPABASE_URL = "https://rfdrifnsfobqlzorcesn.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g";

async function verifyAnalyticsLayer() {
  console.log('📊 Verifying analytics layer functionality...');
  
  try {
    // Test 1: Verify player_analytics table exists and has data
    console.log('\n🔍 Test 1: Check player_analytics table');
    const analyticsResponse = await fetch(`${SUPABASE_URL}/rest/v1/player_analytics?limit=5`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    
    if (!analyticsResponse.ok) {
      console.log('⚠️ player_analytics table not accessible:', analyticsResponse.statusText);
    } else {
      const analytics = await analyticsResponse.json();
      console.log(`✅ player_analytics table accessible with ${analytics.length} records`);
      
      if (analytics.length > 0) {
        console.log('📊 Sample analytics record:', {
          player_id: analytics[0].player_id,
          prop_type: analytics[0].prop_type,
          l5_hit_rate: analytics[0].l5_hit_rate,
          l10_hit_rate: analytics[0].l10_hit_rate,
          l20_hit_rate: analytics[0].l20_hit_rate,
          current_streak: analytics[0].current_streak
        });
      }
    }
    
    // Test 2: Verify player_game_logs table exists and has data
    console.log('\n🔍 Test 2: Check player_game_logs table');
    const gameLogsResponse = await fetch(`${SUPABASE_URL}/rest/v1/player_game_logs?limit=5`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    
    if (!gameLogsResponse.ok) {
      console.log('⚠️ player_game_logs table not accessible:', gameLogsResponse.statusText);
    } else {
      const gameLogs = await gameLogsResponse.json();
      console.log(`✅ player_game_logs table accessible with ${gameLogs.length} records`);
      
      if (gameLogs.length > 0) {
        console.log('📊 Sample game log record:', {
          player_id: gameLogs[0].player_id,
          prop_type: gameLogs[0].prop_type,
          value: gameLogs[0].value,
          date: gameLogs[0].date
        });
      }
    }
    
    // Test 3: Test analytics functions via RPC
    console.log('\n🔍 Test 3: Test analytics RPC functions');
    
    // Test calculate_hit_rate function
    try {
      const hitRateResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/calculate_hit_rate`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_player_id: 'JOSH_ALLEN-QB-BUF',
          p_prop_type: 'Passing Yards',
          p_line: 250.5,
          p_direction: 'over',
          p_games_limit: 10
        })
      });
      
      if (hitRateResponse.ok) {
        const hitRateData = await hitRateResponse.json();
        console.log('✅ calculate_hit_rate RPC working:', hitRateData);
      } else {
        console.log('⚠️ calculate_hit_rate RPC not accessible:', hitRateResponse.statusText);
      }
    } catch (error) {
      console.log('⚠️ calculate_hit_rate RPC error:', error.message);
    }
    
    // Test calculate_streak function
    try {
      const streakResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/calculate_streak`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_player_id: 'JOSH_ALLEN-QB-BUF',
          p_prop_type: 'Passing Yards',
          p_line: 250.5,
          p_direction: 'over'
        })
      });
      
      if (streakResponse.ok) {
        const streakData = await streakResponse.json();
        console.log('✅ calculate_streak RPC working:', streakData);
      } else {
        console.log('⚠️ calculate_streak RPC not accessible:', streakResponse.statusText);
      }
    } catch (error) {
      console.log('⚠️ calculate_streak RPC error:', error.message);
    }
    
    // Test 4: Verify analytics view
    console.log('\n🔍 Test 4: Check player_analytics_view');
    try {
      const viewResponse = await fetch(`${SUPABASE_URL}/rest/v1/player_analytics_view?limit=3`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });
      
      if (viewResponse.ok) {
        const viewData = await viewResponse.json();
        console.log(`✅ player_analytics_view accessible with ${viewData.length} records`);
      } else {
        console.log('⚠️ player_analytics_view not accessible:', viewResponse.statusText);
      }
    } catch (error) {
      console.log('⚠️ player_analytics_view error:', error.message);
    }
    
    // Test 5: Test Worker can query analytics
    console.log('\n🔍 Test 5: Test Worker analytics query capability');
    try {
      // Simulate what the Worker would query
      const workerAnalyticsQuery = await fetch(`${SUPABASE_URL}/rest/v1/player_analytics?player_id=eq.JOSH_ALLEN-QB-BUF&limit=1`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });
      
      if (workerAnalyticsQuery.ok) {
        const workerAnalyticsData = await workerAnalyticsQuery.json();
        console.log(`✅ Worker analytics query successful: ${workerAnalyticsData.length} records`);
        
        if (workerAnalyticsData.length > 0) {
          console.log('📊 Worker analytics result:', {
            player_id: workerAnalyticsData[0].player_id,
            prop_type: workerAnalyticsData[0].prop_type,
            hit_rates: {
              l5: workerAnalyticsData[0].l5_hit_rate,
              l10: workerAnalyticsData[0].l10_hit_rate,
              l20: workerAnalyticsData[0].l20_hit_rate
            }
          });
        }
      } else {
        console.log('⚠️ Worker analytics query failed:', workerAnalyticsQuery.statusText);
      }
    } catch (error) {
      console.log('⚠️ Worker analytics query error:', error.message);
    }
    
    console.log('\n🎉 Analytics layer verification completed!');
    
  } catch (error) {
    console.error('❌ Analytics verification failed:', error);
    process.exit(1);
  }
}

// Run the verification
verifyAnalyticsLayer();
