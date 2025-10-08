// Test to understand streaks calculation requirements
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

async function testStreaksUnderstanding() {
  console.log('🔍 Testing streaks calculation understanding...\n');
  
  try {
    // Get a sample of both tables
    const gameLogs = await supabaseRequest('player_game_logs?limit=5');
    const proplines = await supabaseRequest('proplines?limit=5');
    
    console.log('📊 Sample Game Log (should be actual performance):');
    if (gameLogs.length > 0) {
      const log = gameLogs[0];
      console.log(`  Player: ${log.player_name}`);
      console.log(`  Prop Type: ${log.prop_type}`);
      console.log(`  Value: ${log.value} (This should be actual performance - e.g., 5 assists)`);
      console.log(`  Date: ${log.date}`);
      console.log(`  League: ${log.league}`);
    }
    
    console.log('\n📊 Sample Prop Line (should be betting line):');
    if (proplines.length > 0) {
      const prop = proplines[0];
      console.log(`  Player: ${prop.player_name}`);
      console.log(`  Prop Type: ${prop.prop_type}`);
      console.log(`  Line: ${prop.line} (This should be betting line - e.g., 4.5 assists)`);
      console.log(`  Date: ${prop.date}`);
      console.log(`  League: ${prop.league}`);
    }
    
    console.log('\n🔍 The Problem:');
    console.log('❌ Current system creates game logs from prop lines');
    console.log('❌ This means game logs contain betting lines, not actual performance');
    console.log('❌ Streaks need: actual performance vs betting lines');
    
    console.log('\n✅ What Streaks Need:');
    console.log('1. Game Logs: Actual player performance (e.g., "Player had 7 assists")');
    console.log('2. Prop Lines: Betting lines (e.g., "Player assists over/under 5.5")');
    console.log('3. Match them by: player_id + prop_type + date');
    console.log('4. Calculate hit/miss: actual >= line ? "over" : "under"');
    console.log('5. Calculate streaks: consecutive hits or misses');
    
    console.log('\n🚀 Solutions:');
    console.log('1. **Option A**: Get real NBA/NFL game data for actual performance');
    console.log('2. **Option B**: Create mock performance data for testing');
    console.log('3. **Option C**: Use historical data if available');
    
    // Test with mock data
    console.log('\n🧪 Testing with mock data...');
    
    const mockGameLog = {
      player_id: "TEST_PLAYER_123",
      player_name: "Test Player",
      prop_type: "Assists",
      date: "2025-01-08",
      league: "nba",
      value: 7, // Actual performance: 7 assists
      game_id: "TEST_GAME_123"
    };
    
    const mockPropLine = {
      player_id: "TEST_PLAYER_123", 
      player_name: "Test Player",
      prop_type: "Assists",
      date: "2025-01-08",
      league: "nba",
      line: 5.5, // Betting line: 5.5 assists
      over_odds: -110,
      under_odds: -110
    };
    
    console.log('📊 Mock Game Log:', JSON.stringify(mockGameLog, null, 2));
    console.log('📊 Mock Prop Line:', JSON.stringify(mockPropLine, null, 2));
    
    // Calculate hit/miss
    const actualPerformance = mockGameLog.value;
    const bettingLine = mockPropLine.line;
    const hitResult = actualPerformance >= bettingLine ? 1 : 0;
    const result = actualPerformance >= bettingLine ? "OVER" : "UNDER";
    
    console.log(`\n📊 Streaks Calculation:`);
    console.log(`  Actual Performance: ${actualPerformance}`);
    console.log(`  Betting Line: ${bettingLine}`);
    console.log(`  Result: ${result} (${hitResult === 1 ? 'HIT' : 'MISS'})`);
    console.log(`  Hit Result: ${hitResult}`);
    
    console.log('\n✅ This is how streaks should work!');
    console.log('❌ But we need real performance data, not prop lines as game logs');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testStreaksUnderstanding().catch(console.error);
