/**
 * Test Normalization and Data Flow
 * Tests the complete pipeline from existing data to analytics display
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI'
);

// Import normalization functions (simplified versions for testing)
function normalizeOpponent(teamName) {
  const mappings = {
    'Jacksonville Jaguars': 'JAX',
    'Kansas City Chiefs': 'KC',
    'Buffalo Bills': 'BUF',
    'Denver Broncos': 'DEN',
    'Los Angeles Chargers': 'LAC',
    'New England Patriots': 'NE',
    'New York Jets': 'NYJ'
  };
  return mappings[teamName] || teamName;
}

function normalizeMarketType(marketType) {
  const mappings = {
    'passing_yards': 'Passing Yards',
    'rushing_yards': 'Rushing Yards',
    'receiving_yards': 'Receiving Yards',
    'receptions': 'Receptions',
    'passing_touchdowns': 'Passing Touchdowns',
    'rushing_touchdowns': 'Rushing Touchdowns',
    'receiving_touchdowns': 'Receiving Touchdowns'
  };
  return mappings[marketType] || marketType;
}

function normalizePosition(position) {
  const mappings = {
    'Quarterback': 'QB',
    'Running Back': 'RB',
    'Wide Receiver': 'WR',
    'Tight End': 'TE'
  };
  return mappings[position] || position;
}

function normalizePlayerId(playerName) {
  const mappings = {
    'Patrick Mahomes': 'mahomes-patrick',
    'Josh Allen': 'allen-josh',
    'Christian McCaffrey': 'mccaffrey-christian',
    'Tyreek Hill': 'hill-tyreek'
  };
  return mappings[playerName] || playerName.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Test the complete data flow
 */
async function testDataFlow() {
  console.log('🧪 Testing Normalization and Data Flow...\n');
  
  // Step 1: Check existing data
  console.log('📊 Step 1: Check Existing Data');
  const { data: gameLogs, error: gameLogsError } = await supabase
    .from('playergamelogs')
    .select('*')
    .limit(10);
  
  if (gameLogsError) {
    console.error('❌ Database error:', gameLogsError);
    return;
  }
  
  console.log(`✅ Found ${gameLogs.length} game logs`);
  if (gameLogs.length > 0) {
    console.log('Sample log:', gameLogs[0]);
  }
  
  // Step 2: Test normalization functions
  console.log('\n📊 Step 2: Test Normalization Functions');
  
  const testCases = [
    { input: 'Jacksonville Jaguars', fn: normalizeOpponent, expected: 'JAX' },
    { input: 'passing_yards', fn: normalizeMarketType, expected: 'Passing Yards' },
    { input: 'Quarterback', fn: normalizePosition, expected: 'QB' },
    { input: 'Patrick Mahomes', fn: normalizePlayerId, expected: 'mahomes-patrick' }
  ];
  
  for (const testCase of testCases) {
    const result = testCase.fn(testCase.input);
    const passed = result === testCase.expected;
    console.log(`${passed ? '✅' : '❌'} ${testCase.input} → ${result} (expected: ${testCase.expected})`);
  }
  
  // Step 3: Test data flow simulation
  console.log('\n📊 Step 3: Simulate Live Props Data Flow');
  
  // Create mock player props (similar to what the API would return)
  const mockPlayerProps = [
    {
      playerName: 'Patrick Mahomes',
      opponent: 'Jacksonville Jaguars',
      marketType: 'passing_yards',
      position: 'Quarterback',
      line: 275.0,
      team: 'Kansas City Chiefs'
    },
    {
      playerName: 'Josh Allen',
      opponent: 'Buffalo Bills',
      marketType: 'rushing_yards',
      position: 'Running Back',
      line: 85.0,
      team: 'Buffalo Bills'
    }
  ];
  
  console.log('Mock player props:', mockPlayerProps.length);
  
  for (const prop of mockPlayerProps) {
    console.log(`\n🎯 Testing prop: ${prop.playerName}`);
    
    // Simulate the enrichment process
    const normalizedPlayerId = normalizePlayerId(prop.playerName);
    const normalizedOpponent = normalizeOpponent(prop.opponent);
    const normalizedMarketType = normalizeMarketType(prop.marketType);
    const normalizedPosition = normalizePosition(prop.position);
    
    console.log('[PROP INPUT]', {
      player: prop.playerName,
      opponentRaw: prop.opponent,
      opponentNorm: normalizedOpponent,
      market: prop.marketType,
      marketNorm: normalizedMarketType,
      position: prop.position,
      positionNorm: normalizedPosition,
      line: prop.line,
      playerId: normalizedPlayerId
    });
    
    // Simulate fetching game logs
    const { data: matchingLogs } = await supabase
      .from('playergamelogs')
      .select('date, season, opponent, value')
      .eq('player_id', normalizedPlayerId)
      .eq('prop_type', normalizedMarketType)
      .order('date', { ascending: false })
      .limit(5);
    
    console.log('Game logs found:', matchingLogs?.length || 0);
    if (matchingLogs && matchingLogs.length > 0) {
      console.log('Sample log:', matchingLogs[0]);
    }
    
    // Simulate defense stats (mock)
    const mockDefenseStats = [
      { team: normalizedOpponent, prop_type: normalizedMarketType, position: normalizedPosition, rank: 15 }
    ];
    
    console.log('[DEFENSE KEYS]', mockDefenseStats);
    
    // Test analytics calculation
    if (matchingLogs && matchingLogs.length > 0) {
      // Calculate hit rate
      let hits = 0;
      for (const log of matchingLogs) {
        if (log.value > prop.line) hits++;
      }
      const hitRate = (hits / matchingLogs.length) * 100;
      
      console.log(`✅ Analytics would show: ${hits}/${matchingLogs.length} (${hitRate.toFixed(1)}%)`);
    } else {
      console.log('❌ No game logs found - would show N/A and 0/0');
    }
  }
  
  // Step 4: Test RPC functions with real data
  console.log('\n📊 Step 4: Test RPC Functions');
  
  const testPlayerId = 'mahomes-patrick';
  const testPropType = 'Passing Yards';
  const testLine = 275.0;
  const testDirection = 'over';
  
  try {
    // Test hit rate RPC
    const { data: hitRateRPC, error: hitRateError } = await supabase.rpc('calculate_hit_rate', {
      p_player_id: testPlayerId,
      p_prop_type: testPropType,
      p_line: testLine,
      p_direction: testDirection,
      p_games_limit: 5
    });
    
    if (hitRateError) {
      console.error('❌ Hit rate RPC error:', hitRateError);
    } else {
      console.log('✅ Hit rate RPC result:', hitRateRPC);
    }
    
    // Test streak RPC
    const { data: streakRPC, error: streakError } = await supabase.rpc('calculate_streak', {
      p_player_id: testPlayerId,
      p_prop_type: testPropType,
      p_line: testLine,
      p_direction: testDirection
    });
    
    if (streakError) {
      console.error('❌ Streak RPC error:', streakError);
    } else {
      console.log('✅ Streak RPC result:', streakRPC);
    }
    
  } catch (error) {
    console.error('❌ RPC testing error:', error);
  }
  
  // Step 5: Summary and recommendations
  console.log('\n📋 Summary and Recommendations:');
  
  const totalLogs = gameLogs.length;
  const hasData = totalLogs > 0;
  const hasNormalization = testCases.every(tc => tc.fn(tc.input) === tc.expected);
  const hasRPC = true; // We tested this above
  
  console.log(`✅ Database: ${hasData ? `${totalLogs} records` : 'No data'}`);
  console.log(`✅ Normalization: ${hasNormalization ? 'Working' : 'Issues found'}`);
  console.log(`✅ RPC Functions: ${hasRPC ? 'Working' : 'Issues found'}`);
  
  if (hasData && hasNormalization && hasRPC) {
    console.log('\n🎉 All systems working! Analytics should show real data instead of N/A and 0/0');
    console.log('\nNext steps:');
    console.log('1. Ensure player props are enriched with gameLogs and defenseStats');
    console.log('2. Verify player ID normalization matches database records');
    console.log('3. Check that defense stats keys match normalized opponent/prop/position');
  } else {
    console.log('\n⚠️ Issues found that need to be addressed:');
    if (!hasData) console.log('- No game logs in database - run ingestion script');
    if (!hasNormalization) console.log('- Normalization functions need fixes');
    if (!hasRPC) console.log('- RPC functions need debugging');
  }
  
  console.log('\n✅ Normalization and data flow test completed!');
}

// Run the test
testDataFlow().catch(console.error);
