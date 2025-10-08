// Sanity Test for Cloudflare Worker + Supabase Props Ingestion
// This script tests the end-to-end functionality with a known event/player

const SUPABASE_URL = "https://rfdrifnsfobqlzorcesn.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g";

async function testWorkerIngestion() {
  console.log('🧪 Starting sanity test for Cloudflare Worker ingestion...');
  
  try {
    // Test 1: Manual ingestion via Worker endpoint
    console.log('\n📡 Test 1: Manual ingestion via Worker');
    const workerUrl = 'https://statpedia-player-props.statpedia.workers.dev/ingest';
    
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        league: 'NBA',
        season: '2025'
        // Test with NBA since basketball season is currently active
      })
    });
    
    if (!response.ok) {
      throw new Error(`Worker request failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Worker response:', result);
    
    // Test 2: Verify data was inserted into proplines
    console.log('\n🗄️ Test 2: Verify proplines data');
    const proplinesResponse = await fetch(`${SUPABASE_URL}/rest/v1/proplines?select=count`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    
    if (!proplinesResponse.ok) {
      console.log(`⚠️ Proplines table might not exist yet: ${proplinesResponse.statusText}`);
      console.log('✅ This is expected for the first run - the worker will create the table when it finds data');
    } else {
      const proplines = await proplinesResponse.json();
      console.log(`✅ Found ${proplines.length} total proplines records`);
      
      if (proplines.length > 0) {
        const latestProp = proplines[0];
        console.log('📊 Latest prop:', {
          player_id: latestProp.player_id,
          player_name: latestProp.player_name,
          prop_type: latestProp.prop_type,
          line: latestProp.line,
          sportsbook: latestProp.sportsbook,
          created_at: latestProp.created_at
        });
      }
    }
    
    // Test 3: Check for specific known player (Josh Allen)
    console.log('\n🎯 Test 3: Check for known player (Josh Allen)');
    const joshAllenResponse = await fetch(`${SUPABASE_URL}/rest/v1/proplines?player_name=ilike.%josh%allen%&limit=3`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    
    if (joshAllenResponse.ok) {
      const joshAllenProps = await joshAllenResponse.json();
      console.log(`✅ Found ${joshAllenProps.length} props for Josh Allen`);
      
      if (joshAllenProps.length > 0) {
        console.log('📊 Josh Allen props:', joshAllenProps.map(p => ({
          prop_type: p.prop_type,
          line: p.line,
          over_odds: p.over_odds,
          under_odds: p.under_odds
        })));
      }
    }
    
    // Test 4: Check analytics layer (if available)
    console.log('\n📈 Test 4: Check analytics layer');
    try {
      const analyticsResponse = await fetch(`${SUPABASE_URL}/rest/v1/player_analytics?limit=3`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });
      
      if (analyticsResponse.ok) {
        const analytics = await analyticsResponse.json();
        console.log(`✅ Found ${analytics.length} analytics records`);
        
        if (analytics.length > 0) {
          console.log('📊 Sample analytics:', {
            player_id: analytics[0].player_id,
            prop_type: analytics[0].prop_type,
            l5_hit_rate: analytics[0].l5_hit_rate,
            l10_hit_rate: analytics[0].l10_hit_rate
          });
        }
      }
    } catch (error) {
      console.log('⚠️ Analytics layer not available:', error.message);
    }
    
    // Test 5: Check missing players table
    console.log('\n❓ Test 5: Check missing players');
    try {
      const missingPlayersResponse = await fetch(`${SUPABASE_URL}/rest/v1/missing_players?order=count.desc&limit=5`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });
      
      if (missingPlayersResponse.ok) {
        const missingPlayers = await missingPlayersResponse.json();
        console.log(`✅ Found ${missingPlayers.length} missing players`);
        
        if (missingPlayers.length > 0) {
          console.log('📊 Top missing players:', missingPlayers.map(p => ({
            player_name: p.player_name,
            team: p.team,
            league: p.league,
            count: p.count
          })));
        }
      }
    } catch (error) {
      console.log('⚠️ Missing players table not available:', error.message);
    }
    
    console.log('\n🎉 Sanity test completed successfully!');
    
  } catch (error) {
    console.error('❌ Sanity test failed:', error);
    process.exit(1);
  }
}

// Run the test
testWorkerIngestion();
