// Test SportsGameOdds Integration for Performance Data
async function testSportsGameOddsIntegration() {
  console.log('🔍 Testing SportsGameOdds Integration...\n');
  
  try {
    // Test the performance ingestion endpoint
    console.log('📊 Testing performance ingestion with NBA...');
    
    const response = await fetch('https://statpedia-player-props.statpedia.workers.dev/performance-ingest/NBA?days=1');
    const data = await response.json();
    
    console.log('📊 Performance ingestion result:', JSON.stringify(data, null, 2));
    
    if (data.success && data.totalPerformanceRecords > 0) {
      console.log(`✅ Success: Generated ${data.totalPerformanceRecords} performance records`);
      console.log(`✅ Match rate: ${data.matchRate.toFixed(1)}%`);
      
      // Test streaks with the new data
      console.log('\n📊 Testing streaks with new performance data...');
      
      const streaksResponse = await fetch('https://statpedia-player-props.statpedia.workers.dev/analytics/streaks?league=NBA&limit=10');
      const streaksData = await streaksResponse.json();
      
      console.log('📊 Streaks result:', JSON.stringify(streaksData, null, 2));
      
      if (streaksData.success && streaksData.data && streaksData.data.length > 0) {
        console.log(`🎉 SUCCESS: Found ${streaksData.data.length} streaks!`);
        console.log('📊 Top streaks:');
        streaksData.data.slice(0, 5).forEach((streak, i) => {
          console.log(`  ${i + 1}. ${streak.player_name} - ${streak.prop_type} - ${streak.current_streak} game streak`);
        });
      } else {
        console.log('❌ No streaks found yet');
      }
      
    } else {
      console.log('❌ No performance records generated');
      console.log('📊 This suggests:');
      console.log('   - No NBA games/events found for today');
      console.log('   - SportsGameOdds API might not have data for today');
      console.log('   - Need to test with a date that has games');
      
      // Try with NFL instead
      console.log('\n📊 Trying NFL instead...');
      
      const nflResponse = await fetch('https://statpedia-player-props.statpedia.workers.dev/performance-ingest/NFL?days=7');
      const nflData = await nflResponse.json();
      
      console.log('📊 NFL performance result:', JSON.stringify(nflData, null, 2));
      
      if (nflData.success && nflData.totalPerformanceRecords > 0) {
        console.log(`✅ NFL Success: Generated ${nflData.totalPerformanceRecords} performance records`);
      } else {
        console.log('❌ NFL also returned 0 records');
        console.log('📊 This suggests we need to:');
        console.log('   - Check SportsGameOdds API for available data');
        console.log('   - Test with historical dates that have games');
        console.log('   - Verify the API key and endpoints');
      }
    }
    
    // Test the regular ingestion to see if we have any betting data
    console.log('\n📊 Testing regular ingestion to check for betting data...');
    
    const ingestResponse = await fetch('https://statpedia-player-props.statpedia.workers.dev/ingest', {
      method: 'POST'
    });
    const ingestData = await ingestResponse.json();
    
    console.log('📊 Regular ingestion result:', JSON.stringify(ingestData, null, 2));
    
    if (ingestData.totalProps > 0) {
      console.log(`✅ Regular ingestion working: ${ingestData.totalProps} props inserted`);
      console.log('📊 This means we have betting data, so performance data should be possible');
    } else {
      console.log('❌ Regular ingestion also returned 0 props');
      console.log('📊 This suggests a broader issue with SportsGameOdds API access');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSportsGameOddsIntegration().catch(console.error);
