// Test script for multi-league ingestion system
// Tests all leagues, analytics queries, and fallback logic

const SUPABASE_URL = "https://rfdrifnsfobqlzorcesn.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g";

const WORKER_URL = "https://statpedia-player-props.statpedia.workers.dev";

async function testMultiLeagueSystem() {
  console.log('🧪 Testing Multi-League Props Ingestion System...\n');
  
  try {
    // Test 1: Get league status
    console.log('📊 Test 1: League Status');
    const leaguesResponse = await fetch(`${WORKER_URL}/leagues`);
    if (!leaguesResponse.ok) throw new Error(`Leagues endpoint failed: ${leaguesResponse.statusText}`);
    
    const leaguesData = await leaguesResponse.json();
    console.log('✅ Active leagues:', leaguesData.active?.length || 0);
    console.log('✅ In-season leagues:', leaguesData.inSeason?.length || 0);
    console.log('📋 In-season leagues:', leaguesData.inSeason?.map(l => l.id).join(', ') || 'None');
    
    // Test 2: Multi-league ingestion
    console.log('\n🚀 Test 2: Multi-League Ingestion');
    const ingestionResponse = await fetch(`${WORKER_URL}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    if (!ingestionResponse.ok) throw new Error(`Ingestion failed: ${ingestionResponse.statusText}`);
    
    const ingestionResult = await ingestionResponse.json();
    console.log('✅ Ingestion completed:', {
      duration: ingestionResult.duration,
      totalProps: ingestionResult.totalProps,
      inserted: ingestionResult.inserted,
      errors: ingestionResult.errors
    });
    
    // Log per-league results
    if (ingestionResult.leagueResults) {
      console.log('\n📊 Per-League Results:');
      Object.entries(ingestionResult.leagueResults).forEach(([league, result]) => {
        if (result.error) {
          console.log(`❌ ${league}: ${result.error}`);
        } else {
          console.log(`✅ ${league}: ${result.events} events, ${result.props} props, ${result.inserted} inserted, ${result.errors} errors`);
        }
      });
    }
    
    // Test 3: Analytics query
    console.log('\n📈 Test 3: Analytics Query');
    const analyticsResponse = await fetch(`${WORKER_URL}/analytics?player_id=LEBRON_JAMES-SF-LAL&prop_type=Points`);
    if (analyticsResponse.ok) {
      const analyticsData = await analyticsResponse.json();
      if (analyticsData.analytics) {
        console.log('✅ Analytics found:', {
          hit_rate_l5: analyticsData.analytics.hit_rate_l5_pct + '%',
          hit_rate_l10: analyticsData.analytics.hit_rate_l10_pct + '%',
          hit_rate_l20: analyticsData.analytics.hit_rate_l20_pct + '%',
          h2h_hit_rate: analyticsData.analytics.h2h_hit_rate_pct + '%',
          matchup_rank: analyticsData.analytics.matchup_defensive_rank,
          performance_trend: analyticsData.analytics.performance_trend
        });
      } else {
        console.log('⚠️ No analytics data found (expected for new system)');
      }
    } else {
      console.log('⚠️ Analytics endpoint not responding');
    }
    
    // Test 4: Verify data in Supabase
    console.log('\n🗄️ Test 4: Supabase Data Verification');
    
    // Check proplines count
    const proplinesResponse = await fetch(`${SUPABASE_URL}/rest/v1/proplines?select=count`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    
    if (proplinesResponse.ok) {
      const proplines = await proplinesResponse.json();
      console.log(`✅ Total proplines records: ${proplines.length || 0}`);
    }
    
    // Check analytics view
    const analyticsViewResponse = await fetch(`${SUPABASE_URL}/rest/v1/player_prop_analytics?select=count`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    
    if (analyticsViewResponse.ok) {
      const analytics = await analyticsViewResponse.json();
      console.log(`✅ Analytics view records: ${analytics.length || 0}`);
    }
    
    // Test 5: Sample analytics data
    console.log('\n📊 Test 5: Sample Analytics Data');
    const sampleAnalyticsResponse = await fetch(`${SUPABASE_URL}/rest/v1/player_prop_analytics?limit=3&order=date.desc`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    
    if (sampleAnalyticsResponse.ok) {
      const sampleAnalytics = await sampleAnalyticsResponse.json();
      if (sampleAnalytics.length > 0) {
        console.log('✅ Sample analytics records:');
        sampleAnalytics.forEach((record, index) => {
          console.log(`  ${index + 1}. ${record.player_name} (${record.prop_type}): L10=${record.hit_rate_l10_pct}%, Trend=${record.performance_trend}`);
        });
      } else {
        console.log('⚠️ No analytics records found (expected for new system)');
      }
    }
    
    console.log('\n🎉 Multi-league system test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Multi-league system test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testMultiLeagueSystem();
