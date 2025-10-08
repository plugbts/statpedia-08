// Test streaks functionality with RLS policy fixes
const SUPABASE_URL = 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g';

async function supabaseRequest(endpoint, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed: ${response.status} ${response.statusText} - ${text}`);
  }
  
  return response.json();
}

async function testStreaksFunctionality() {
  console.log('🔍 Testing streaks functionality...\n');
  
  try {
    // Step 1: Check if we have any data
    console.log('📊 Step 1: Checking data availability...');
    
    const proplinesData = await supabaseRequest('proplines?limit=5');
    console.log(`📊 Proplines count: ${proplinesData?.length || 0}`);
    
    const gameLogsData = await supabaseRequest('player_game_logs?limit=5');
    console.log(`📊 Player game logs count: ${gameLogsData?.length || 0}`);
    
    if (proplinesData && proplinesData.length > 0) {
      console.log('📊 Sample prop:', JSON.stringify(proplinesData[0], null, 2));
    }
    
    if (gameLogsData && gameLogsData.length > 0) {
      console.log('📊 Sample game log:', JSON.stringify(gameLogsData[0], null, 2));
    }
    
    // Step 2: Test Worker streaks endpoint
    console.log('\n📊 Step 2: Testing Worker streaks endpoint...');
    
    const workerResponse = await fetch('https://statpedia-player-props.statpedia.workers.dev/analytics/streaks?league=NFL&limit=10');
    const workerData = await workerResponse.json();
    
    console.log('📊 Worker streaks response:', JSON.stringify(workerData, null, 2));
    
    // Step 3: Test with different leagues
    console.log('\n📊 Step 3: Testing different leagues...');
    
    const leagues = ['NFL', 'NBA', 'MLB', 'NHL'];
    for (const league of leagues) {
      try {
        const response = await fetch(`https://statpedia-player-props.statpedia.workers.dev/analytics/streaks?league=${league}&limit=5`);
        const data = await response.json();
        
        console.log(`📊 ${league}: ${data.data?.length || 0} streaks found`);
        if (data.data && data.data.length > 0) {
          console.log(`📊 ${league} sample streak:`, JSON.stringify(data.data[0], null, 2));
        }
      } catch (error) {
        console.log(`❌ ${league} failed:`, error.message);
      }
    }
    
    // Step 4: Test debug endpoints
    console.log('\n📊 Step 4: Testing debug endpoints...');
    
    try {
      const debugResponse = await fetch('https://statpedia-player-props.statpedia.workers.dev/debug-streak-counts?league=NFL');
      const debugData = await debugResponse.json();
      console.log('📊 Debug streak counts:', JSON.stringify(debugData, null, 2));
    } catch (error) {
      console.log('❌ Debug streak counts failed:', error.message);
    }
    
    // Step 5: Run a small ingestion to generate fresh data
    console.log('\n📊 Step 5: Running small ingestion to generate fresh data...');
    
    try {
      const ingestResponse = await fetch('https://statpedia-player-props.statpedia.workers.dev/ingest', {
        method: 'POST'
      });
      const ingestData = await ingestResponse.json();
      console.log('📊 Ingestion result:', JSON.stringify(ingestData, null, 2));
      
      // Wait a moment for data to be processed
      console.log('⏳ Waiting 3 seconds for data processing...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check data again
      console.log('\n📊 Step 6: Checking data after ingestion...');
      const newProplinesData = await supabaseRequest('proplines?limit=5');
      console.log(`📊 New proplines count: ${newProplinesData?.length || 0}`);
      
      const newGameLogsData = await supabaseRequest('player_game_logs?limit=5');
      console.log(`📊 New game logs count: ${newGameLogsData?.length || 0}`);
      
      // Test streaks again
      console.log('\n📊 Step 7: Testing streaks after fresh data...');
      const freshStreaksResponse = await fetch('https://statpedia-player-props.statpedia.workers.dev/analytics/streaks?league=NFL&limit=5');
      const freshStreaksData = await freshStreaksResponse.json();
      console.log('📊 Fresh streaks result:', JSON.stringify(freshStreaksData, null, 2));
      
    } catch (error) {
      console.log('❌ Ingestion failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testStreaksFunctionality().catch(console.error);
