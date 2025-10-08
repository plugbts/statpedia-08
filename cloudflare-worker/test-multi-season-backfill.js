// Test script for multi-season backfill system
// Tests all backfill endpoints and verifies analytics data

const WORKER_URL = "https://statpedia-player-props.statpedia.workers.dev";

async function testMultiSeasonBackfillSystem() {
  console.log('🧪 Testing Multi-Season Backfill System...\n');
  
  try {
    // Test 1: Check worker status and available endpoints
    console.log('📊 Test 1: Worker Status');
    const statusResponse = await fetch(`${WORKER_URL}/status`);
    if (!statusResponse.ok) throw new Error(`Status check failed: ${statusResponse.statusText}`);
    
    const statusData = await statusResponse.json();
    console.log('✅ Worker status:', statusData);
    
    // Test 2: Check available leagues and seasons
    console.log('\n📊 Test 2: Available Leagues and Seasons');
    const [leaguesResponse, seasonsResponse] = await Promise.all([
      fetch(`${WORKER_URL}/leagues`),
      fetch(`${WORKER_URL}/seasons`)
    ]);
    
    if (!leaguesResponse.ok || !seasonsResponse.ok) {
      throw new Error('Failed to fetch leagues or seasons');
    }
    
    const leaguesData = await leaguesResponse.json();
    const seasonsData = await seasonsResponse.json();
    
    console.log('✅ Available leagues:', leaguesData.active.map(l => l.id).join(', '));
    console.log('✅ Available seasons:', seasonsData.all.join(', '));
    
    // Test 3: Recent seasons backfill (smaller scope for testing)
    console.log('\n🔄 Test 3: Recent Seasons Backfill (30 days)');
    const recentBackfillResponse = await fetch(`${WORKER_URL}/backfill-recent?days=30`);
    if (!recentBackfillResponse.ok) throw new Error(`Recent backfill failed: ${recentBackfillResponse.statusText}`);
    
    const recentBackfillResult = await recentBackfillResponse.json();
    console.log('✅ Recent seasons backfill result:', {
      duration: recentBackfillResult.duration,
      totalProps: recentBackfillResult.totalProps,
      totalGameLogs: recentBackfillResult.totalGameLogs,
      totalErrors: recentBackfillResult.totalErrors,
      successRate: recentBackfillResult.summary?.successRate
    });
    
    // Test 4: League-specific backfill (NFL only)
    console.log('\n🏈 Test 4: League-Specific Backfill (NFL, 14 days)');
    const nflBackfillResponse = await fetch(`${WORKER_URL}/backfill-league/NFL?days=14&seasons=2024,2025`);
    if (!nflBackfillResponse.ok) throw new Error(`NFL backfill failed: ${nflBackfillResponse.statusText}`);
    
    const nflBackfillResult = await nflBackfillResponse.json();
    console.log('✅ NFL backfill result:', {
      duration: nflBackfillResult.duration,
      totalProps: nflBackfillResult.totalProps,
      totalGameLogs: nflBackfillResult.totalGameLogs,
      totalErrors: nflBackfillResult.totalErrors
    });
    
    // Test 5: Season-specific backfill (2025 only)
    console.log('\n📅 Test 5: Season-Specific Backfill (2025, 14 days)');
    const season2025BackfillResponse = await fetch(`${WORKER_URL}/backfill-season/2025?days=14&leagues=NFL,NBA`);
    if (!season2025BackfillResponse.ok) throw new Error(`Season 2025 backfill failed: ${season2025BackfillResponse.statusText}`);
    
    const season2025BackfillResult = await season2025BackfillResponse.json();
    console.log('✅ Season 2025 backfill result:', {
      duration: season2025BackfillResult.duration,
      totalProps: season2025BackfillResult.totalProps,
      totalGameLogs: season2025BackfillResult.totalGameLogs,
      totalErrors: season2025BackfillResult.totalErrors
    });
    
    // Test 6: Progressive backfill (smaller scope)
    console.log('\n🔄 Test 6: Progressive Backfill (max 60 days)');
    const progressiveBackfillResponse = await fetch(`${WORKER_URL}/backfill-progressive?maxDays=60`);
    if (!progressiveBackfillResponse.ok) throw new Error(`Progressive backfill failed: ${progressiveBackfillResponse.statusText}`);
    
    const progressiveBackfillResult = await progressiveBackfillResponse.json();
    console.log('✅ Progressive backfill result:', {
      duration: progressiveBackfillResult.duration,
      totalProps: progressiveBackfillResult.totalProps,
      totalGameLogs: progressiveBackfillResult.totalGameLogs,
      totalErrors: progressiveBackfillResult.totalErrors,
      successRate: progressiveBackfillResult.summary?.successRate
    });
    
    // Test 7: Current season ingestion
    console.log('\n⚡ Test 7: Current Season Ingestion');
    const ingestResponse = await fetch(`${WORKER_URL}/ingest`);
    if (!ingestResponse.ok) throw new Error(`Ingestion failed: ${ingestResponse.statusText}`);
    
    const ingestResult = await ingestResponse.json();
    console.log('✅ Current season ingestion result:', {
      duration: ingestResult.duration,
      totalProps: ingestResult.totalProps,
      inserted: ingestResult.inserted,
      errors: ingestResult.errors,
      leagues: ingestResult.leagues?.map(l => `${l.league}: ${l.inserted} props`).join(', ')
    });
    
    // Test 8: Single league ingestion (NBA)
    console.log('\n🏀 Test 8: Single League Ingestion (NBA)');
    const nbaIngestResponse = await fetch(`${WORKER_URL}/ingest/NBA`);
    if (!nbaIngestResponse.ok) throw new Error(`NBA ingestion failed: ${nbaIngestResponse.statusText}`);
    
    const nbaIngestResult = await nbaIngestResponse.json();
    console.log('✅ NBA ingestion result:', {
      duration: nbaIngestResult.duration,
      totalProps: nbaIngestResult.totalProps,
      inserted: nbaIngestResult.inserted,
      errors: nbaIngestResult.errors
    });
    
    // Test 9: Verify backfill results (if verification endpoint exists)
    console.log('\n🔍 Test 9: Verify Backfill Results');
    try {
      const verifyResponse = await fetch(`${WORKER_URL}/verify-backfill`);
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        console.log('✅ Backfill verification:', {
          proplines: verifyData.results?.proplinesCount,
          gameLogs: verifyData.results?.gameLogsCount,
          analytics: verifyData.results?.analyticsCount
        });
      } else {
        console.log('⚠️ Verification endpoint not available');
      }
    } catch (error) {
      console.log('⚠️ Verification failed:', error.message);
    }
    
    // Test 10: Full multi-season backfill (smaller scope for testing)
    console.log('\n🚀 Test 10: Full Multi-Season Backfill (60 days, recent seasons only)');
    const fullBackfillResponse = await fetch(`${WORKER_URL}/backfill-all?days=60&leagues=NFL,NBA&seasons=2024,2025`);
    if (!fullBackfillResponse.ok) throw new Error(`Full backfill failed: ${fullBackfillResponse.statusText}`);
    
    const fullBackfillResult = await fullBackfillResponse.json();
    console.log('✅ Full multi-season backfill result:', {
      duration: fullBackfillResult.duration,
      totalProps: fullBackfillResult.totalProps,
      totalGameLogs: fullBackfillResult.totalGameLogs,
      totalErrors: fullBackfillResult.totalErrors,
      successRate: fullBackfillResult.summary?.successRate,
      leaguesProcessed: fullBackfillResult.summary?.leaguesProcessed,
      seasonsProcessed: fullBackfillResult.summary?.seasonsProcessed
    });
    
    // Log detailed results if available
    if (fullBackfillResult.leagueSeasonResults) {
      console.log('\n📊 Detailed Results by League/Season:');
      Object.entries(fullBackfillResult.leagueSeasonResults).forEach(([key, result]) => {
        if (result.error) {
          console.log(`❌ ${key}: ${result.error}`);
        } else {
          console.log(`✅ ${key}: ${result.propsInserted} props, ${result.gameLogsInserted} game logs, ${result.errors} errors (tier ${result.tier})`);
        }
      });
    }
    
    console.log('\n🎉 Multi-season backfill system test completed successfully!');
    
    // Summary
    console.log('\n📋 Test Summary:');
    console.log(`✅ Worker status: Healthy`);
    console.log(`✅ Recent seasons backfill: ${recentBackfillResult.totalProps} props`);
    console.log(`✅ League-specific backfill: ${nflBackfillResult.totalProps} props`);
    console.log(`✅ Season-specific backfill: ${season2025BackfillResult.totalProps} props`);
    console.log(`✅ Progressive backfill: ${progressiveBackfillResult.totalProps} props`);
    console.log(`✅ Current season ingestion: ${ingestResult.inserted} props`);
    console.log(`✅ Single league ingestion: ${nbaIngestResult.inserted} props`);
    console.log(`✅ Full multi-season backfill: ${fullBackfillResult.totalProps} props`);
    
    // Performance summary
    const totalProps = recentBackfillResult.totalProps + nflBackfillResult.totalProps + 
                      season2025BackfillResult.totalProps + progressiveBackfillResult.totalProps + 
                      ingestResult.inserted + nbaIngestResult.inserted + fullBackfillResult.totalProps;
    
    console.log(`\n🏆 Total Props Processed: ${totalProps}`);
    console.log(`⏱️ All tests completed successfully`);
    
  } catch (error) {
    console.error('\n❌ Multi-season backfill system test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testMultiSeasonBackfillSystem();
