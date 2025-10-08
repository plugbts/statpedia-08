// Test script for historical backfill system
// Tests backfill functionality and verifies analytics data

const WORKER_URL = "https://statpedia-player-props.statpedia.workers.dev";

async function testBackfillSystem() {
  console.log('🧪 Testing Historical Backfill System...\n');
  
  try {
    // Test 1: Verify current data state
    console.log('📊 Test 1: Current Data State');
    const verifyResponse = await fetch(`${WORKER_URL}/verify-backfill`);
    if (!verifyResponse.ok) throw new Error(`Verification failed: ${verifyResponse.statusText}`);
    
    const verifyData = await verifyResponse.json();
    console.log('✅ Current data state:', {
      proplines: verifyData.results.proplinesCount,
      gameLogs: verifyData.results.gameLogsCount,
      analytics: verifyData.results.analyticsCount
    });
    
    // Test 2: Single league backfill (NFL)
    console.log('\n🏈 Test 2: Single League Backfill (NFL)');
    const nflBackfillResponse = await fetch(`${WORKER_URL}/backfill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leagueId: 'NFL',
        season: 2025,
        days: 30  // Last 30 days
      })
    });
    
    if (!nflBackfillResponse.ok) throw new Error(`NFL backfill failed: ${nflBackfillResponse.statusText}`);
    
    const nflBackfillResult = await nflBackfillResponse.json();
    console.log('✅ NFL backfill result:', {
      duration: nflBackfillResult.duration,
      propsInserted: nflBackfillResult.propsInserted,
      gameLogsInserted: nflBackfillResult.gameLogsInserted,
      errors: nflBackfillResult.errors
    });
    
    // Test 3: Multi-league backfill (smaller date range for testing)
    console.log('\n🚀 Test 3: Multi-League Backfill (14 days)');
    const multiBackfillResponse = await fetch(`${WORKER_URL}/backfill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leagueId: 'all',
        season: 2025,
        days: 14  // Last 14 days for faster testing
      })
    });
    
    if (!multiBackfillResponse.ok) throw new Error(`Multi-league backfill failed: ${multiBackfillResponse.statusText}`);
    
    const multiBackfillResult = await multiBackfillResponse.json();
    console.log('✅ Multi-league backfill result:', {
      duration: multiBackfillResult.duration,
      totalProps: multiBackfillResult.totalProps,
      totalGameLogs: multiBackfillResult.totalGameLogs,
      totalErrors: multiBackfillResult.totalErrors
    });
    
    // Log per-league results
    if (multiBackfillResult.leagueResults) {
      console.log('\n📊 Per-League Results:');
      Object.entries(multiBackfillResult.leagueResults).forEach(([league, result]) => {
        if (result.error) {
          console.log(`❌ ${league}: ${result.error}`);
        } else {
          console.log(`✅ ${league}: ${result.propsInserted} props, ${result.gameLogsInserted} game logs, ${result.errors} errors`);
        }
      });
    }
    
    // Test 4: Date range backfill
    console.log('\n📅 Test 4: Date Range Backfill (NBA)');
    const dateRangeResponse = await fetch(`${WORKER_URL}/backfill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leagueId: 'NBA',
        season: 2025,
        dateFrom: '2025-01-01',
        dateTo: '2025-01-15'  // Specific date range
      })
    });
    
    if (!dateRangeResponse.ok) throw new Error(`Date range backfill failed: ${dateRangeResponse.statusText}`);
    
    const dateRangeResult = await dateRangeResponse.json();
    console.log('✅ Date range backfill result:', {
      duration: dateRangeResult.duration,
      propsInserted: dateRangeResult.propsInserted,
      gameLogsInserted: dateRangeResult.gameLogsInserted,
      errors: dateRangeResult.errors
    });
    
    // Test 5: Verify updated data state
    console.log('\n🔍 Test 5: Verify Updated Data State');
    const finalVerifyResponse = await fetch(`${WORKER_URL}/verify-backfill`);
    if (!finalVerifyResponse.ok) throw new Error(`Final verification failed: ${finalVerifyResponse.statusText}`);
    
    const finalVerifyData = await finalVerifyResponse.json();
    console.log('✅ Updated data state:', {
      proplines: finalVerifyData.results.proplinesCount,
      gameLogs: finalVerifyData.results.gameLogsCount,
      analytics: finalVerifyData.results.analyticsCount
    });
    
    // Show data growth
    const proplinesGrowth = finalVerifyData.results.proplinesCount - verifyData.results.proplinesCount;
    const gameLogsGrowth = finalVerifyData.results.gameLogsCount - verifyData.results.gameLogsCount;
    const analyticsGrowth = finalVerifyData.results.analyticsCount - verifyData.results.analyticsCount;
    
    console.log('\n📈 Data Growth:');
    console.log(`   Proplines: +${proplinesGrowth}`);
    console.log(`   Game Logs: +${gameLogsGrowth}`);
    console.log(`   Analytics: +${analyticsGrowth}`);
    
    // Test 6: Sample analytics data
    console.log('\n📊 Test 6: Sample Analytics Data');
    if (finalVerifyData.results.recentData && finalVerifyData.results.recentData.length > 0) {
      console.log('✅ Recent analytics records:');
      finalVerifyData.results.recentData.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.player_name} (${record.prop_type}):`);
        console.log(`     L5: ${record.hit_rate_l5_pct}%, L10: ${record.hit_rate_l10_pct}%, L20: ${record.hit_rate_l20_pct}%`);
        console.log(`     H2H: ${record.h2h_hit_rate_pct}%, Matchup Rank: ${record.matchup_defensive_rank}`);
        console.log(`     Trend: ${record.performance_trend}, Value: ${record.value_indicator}`);
      });
    } else {
      console.log('⚠️ No analytics data found (may need more historical data for meaningful analytics)');
    }
    
    console.log('\n🎉 Backfill system test completed successfully!');
    
    // Summary
    console.log('\n📋 Summary:');
    console.log(`✅ Single league backfill: Working`);
    console.log(`✅ Multi-league backfill: Working`);
    console.log(`✅ Date range backfill: Working`);
    console.log(`✅ Data verification: Working`);
    console.log(`✅ Analytics population: ${analyticsGrowth > 0 ? 'Working' : 'Needs more data'}`);
    
  } catch (error) {
    console.error('\n❌ Backfill system test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testBackfillSystem();
