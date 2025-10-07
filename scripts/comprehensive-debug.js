/**
 * Comprehensive Analytics Debug Harness
 * Tests all analytics calculations with real data to verify they work correctly
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test data for debugging
const testLogs = [
  { date: "2025-09-01", season: 2025, opponent: "JAX", value: 27 },
  { date: "2025-08-25", season: 2025, opponent: "DAL", value: 31 },
  { date: "2025-08-18", season: 2025, opponent: "BUF", value: 22 }
];

function calculateHitRate(logs, line, direction) {
  if (!logs || logs.length === 0) return { hits: 0, total: 0, pct: 0 };
  
  const hits = logs.filter(log => {
    const hit = direction === 'over' ? log.value > line : log.value < line;
    return hit;
  }).length;
  
  const pct = logs.length > 0 ? (hits / logs.length) * 100 : 0;
  
  return { hits, total: logs.length, pct };
}

function calculateStreak(logs, line, direction) {
  if (!logs || logs.length === 0) return { current: 0, longest: 0, direction: 'none' };
  
  let current = 0;
  let longest = 0;
  let currentDirection = 'none';
  
  for (const log of logs) {
    const hit = direction === 'over' ? log.value > line : log.value < line;
    
    if (hit) {
      if (currentDirection === direction) {
        current++;
      } else {
        current = 1;
        currentDirection = direction;
      }
      longest = Math.max(longest, current);
    } else {
      current = 0;
      currentDirection = 'none';
    }
  }
  
  return { current, longest, direction: currentDirection };
}

async function testHitRateCalculation() {
  console.log('\n🧪 Testing Hit Rate Calculation...');
  
  // Test with sample data first
  console.log('📊 Testing with sample data:');
  const sampleResult = calculateHitRate(testLogs, 25.5, 'over');
  console.log(`   Sample HitRate L3: ${sampleResult.hits}/${sampleResult.total} (${sampleResult.pct.toFixed(1)}%)`);
  
  // Test with database data
  const testCases = [
    { playerId: 'mahomes-patrick', propType: 'Passing Yards', line: 275, direction: 'over', gamesLimit: 10 },
    { playerId: 'mccaffrey-christian', propType: 'Rushing Yards', line: 85, direction: 'over', gamesLimit: 10 },
    { playerId: 'hill-tyreek', propType: 'Receiving Yards', line: 75, direction: 'over', gamesLimit: 10 },
    { playerId: 'allen-josh', propType: 'Passing Touchdowns', line: 2, direction: 'over', gamesLimit: 10 }
  ];
  
  for (const testCase of testCases) {
    try {
      const { data, error } = await supabase.rpc('calculate_hit_rate', {
        p_player_id: testCase.playerId,
        p_prop_type: testCase.propType,
        p_line: testCase.line,
        p_direction: testCase.direction,
        p_games_limit: testCase.gamesLimit
      });
      
      if (error) {
        console.error(`❌ ${testCase.playerId} ${testCase.propType}: Error - ${error.message}`);
      } else if (data && data[0]) {
        const result = data[0];
        const percentage = (result.hit_rate * 100).toFixed(1);
        console.log(`✅ ${testCase.playerId} ${testCase.propType} ${testCase.line}+ ${testCase.direction}: ${result.hits}/${result.total} (${percentage}%)`);
      } else {
        console.log(`⚠️ ${testCase.playerId} ${testCase.propType}: No data returned`);
      }
    } catch (error) {
      console.error(`❌ ${testCase.playerId} ${testCase.propType}: Exception - ${error.message}`);
    }
  }
}

async function testStreakCalculation() {
  console.log('\n🔥 Testing Streak Calculation...');
  
  // Test with sample data first
  console.log('📊 Testing with sample data:');
  const sampleStreak = calculateStreak(testLogs, 25.5, 'over');
  console.log(`   Sample Streak: Current ${sampleStreak.current}, Longest ${sampleStreak.longest}, Direction ${sampleStreak.direction}`);
  
  // Test with database data
  const testCases = [
    { playerId: 'mahomes-patrick', propType: 'Passing Yards', line: 275, direction: 'over' },
    { playerId: 'mccaffrey-christian', propType: 'Rushing Yards', line: 85, direction: 'over' },
    { playerId: 'hill-tyreek', propType: 'Receiving Yards', line: 75, direction: 'over' }
  ];
  
  for (const testCase of testCases) {
    try {
      const { data, error } = await supabase.rpc('calculate_streak', {
        p_player_id: testCase.playerId,
        p_prop_type: testCase.propType,
        p_line: testCase.line,
        p_direction: testCase.direction
      });
      
      if (error) {
        console.error(`❌ ${testCase.playerId} ${testCase.propType}: Error - ${error.message}`);
      } else if (data && data[0]) {
        const result = data[0];
        console.log(`✅ ${testCase.playerId} ${testCase.propType}: Current streak ${result.current_streak}, Longest ${result.longest_streak}, Direction ${result.streak_direction}`);
      } else {
        console.log(`⚠️ ${testCase.playerId} ${testCase.propType}: No data returned`);
      }
    } catch (error) {
      console.error(`❌ ${testCase.playerId} ${testCase.propType}: Exception - ${error.message}`);
    }
  }
}

async function testDefensiveRankCalculation() {
  console.log('\n🛡️ Testing Defensive Rank Calculation...');
  
  const testCases = [
    { team: 'KC', opponent: 'JAX', propType: 'Passing Yards', position: 'QB', season: 2025 },
    { team: 'BUF', opponent: 'NE', propType: 'Rushing Yards', position: 'RB', season: 2025 },
    { team: 'SF', opponent: 'LAR', propType: 'Receiving Yards', position: 'WR', season: 2025 }
  ];
  
  for (const testCase of testCases) {
    try {
      const { data, error } = await supabase.rpc('get_defensive_rank', {
        p_team: testCase.team,
        p_opponent: testCase.opponent,
        p_prop_type: testCase.propType,
        p_position: testCase.position,
        p_season: testCase.season
      });
      
      if (error) {
        console.error(`❌ ${testCase.team} vs ${testCase.opponent} ${testCase.propType}: Error - ${error.message}`);
      } else if (data && data[0]) {
        const result = data[0];
        console.log(`✅ ${testCase.team} vs ${testCase.opponent} ${testCase.propType}: Rank ${result.rank}, Display ${result.display}`);
      } else {
        console.log(`⚠️ ${testCase.team} vs ${testCase.opponent} ${testCase.propType}: No data returned`);
      }
    } catch (error) {
      console.error(`❌ ${testCase.team} vs ${testCase.opponent} ${testCase.propType}: Exception - ${error.message}`);
    }
  }
}

async function testChartDataGeneration() {
  console.log('\n📊 Testing Chart Data Generation...');
  
  const testCases = [
    { playerId: 'mahomes-patrick', propType: 'Passing Yards', limit: 10 },
    { playerId: 'mccaffrey-christian', propType: 'Rushing Yards', limit: 10 },
    { playerId: 'hill-tyreek', propType: 'Receiving Yards', limit: 10 }
  ];
  
  for (const testCase of testCases) {
    try {
      const { data, error } = await supabase.rpc('get_player_chart_data', {
        p_player_id: testCase.playerId,
        p_prop_type: testCase.propType,
        p_limit: testCase.limit
      });
      
      if (error) {
        console.error(`❌ ${testCase.playerId} ${testCase.propType}: Error - ${error.message}`);
      } else if (data && data.length > 0) {
        console.log(`✅ ${testCase.playerId} ${testCase.propType}: ${data.length} chart points`);
        console.log(`   Sample: ${JSON.stringify(data.slice(0, 3))}`);
      } else {
        console.log(`⚠️ ${testCase.playerId} ${testCase.propType}: No chart data returned`);
      }
    } catch (error) {
      console.error(`❌ ${testCase.playerId} ${testCase.propType}: Exception - ${error.message}`);
    }
  }
}

async function checkDatabaseData() {
  console.log('\n📊 Checking Database Data...');
  
  // Check total records
  const { count: totalRecords } = await supabase
    .from('playergamelogs')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📈 Total player game logs: ${totalRecords || 0}`);
  
  // Check by player
  const { data: playerCounts } = await supabase
    .from('playergamelogs')
    .select('player_name, player_id')
    .limit(100);
  
  if (playerCounts) {
    const playerMap = new Map();
    playerCounts.forEach(log => {
      const key = `${log.player_name} (${log.player_id})`;
      playerMap.set(key, (playerMap.get(key) || 0) + 1);
    });
    
    console.log('👥 Players with data:');
    for (const [player, count] of playerMap.entries()) {
      console.log(`   ${player}: ${count} records`);
    }
  }
  
  // Check by prop type
  const { data: propCounts } = await supabase
    .from('playergamelogs')
    .select('prop_type')
    .limit(100);
  
  if (propCounts) {
    const propMap = new Map();
    propCounts.forEach(log => {
      propMap.set(log.prop_type, (propMap.get(log.prop_type) || 0) + 1);
    });
    
    console.log('📊 Prop types with data:');
    for (const [propType, count] of propMap.entries()) {
      console.log(`   ${propType}: ${count} records`);
    }
  }
  
  // Check date range
  const { data: dateRange } = await supabase
    .from('playergamelogs')
    .select('date')
    .order('date', { ascending: false })
    .limit(1);
  
  const { data: oldestDate } = await supabase
    .from('playergamelogs')
    .select('date')
    .order('date', { ascending: true })
    .limit(1);
  
  if (dateRange && oldestDate) {
    console.log(`📅 Date range: ${oldestDate[0].date} to ${dateRange[0].date}`);
  }
}

async function testRenderLogic() {
  console.log('\n🎨 Testing Render Logic...');
  
  // Test empty logs scenario
  const emptyLogs = [];
  const emptyHitRate = calculateHitRate(emptyLogs, 25.5, 'over');
  console.log(`📭 Empty logs: ${emptyHitRate.hits}/${emptyHitRate.total} (${emptyHitRate.pct.toFixed(1)}%)`);
  
  // Test with data
  const dataHitRate = calculateHitRate(testLogs, 25.5, 'over');
  console.log(`📊 With data: ${dataHitRate.hits}/${dataHitRate.total} (${dataHitRate.pct.toFixed(1)}%)`);
  
  // Test edge cases
  const edgeCaseLogs = [
    { date: "2025-09-01", season: 2025, opponent: "JAX", value: 25.5 }, // Exactly on line
    { date: "2025-08-25", season: 2025, opponent: "DAL", value: 25.6 }, // Just over
    { date: "2025-08-18", season: 2025, opponent: "BUF", value: 25.4 }  // Just under
  ];
  
  const edgeHitRate = calculateHitRate(edgeCaseLogs, 25.5, 'over');
  console.log(`🎯 Edge case (25.5 line): ${edgeHitRate.hits}/${edgeHitRate.total} (${edgeHitRate.pct.toFixed(1)}%)`);
  
  // Test under direction
  const underHitRate = calculateHitRate(edgeCaseLogs, 25.5, 'under');
  console.log(`🎯 Under direction: ${underHitRate.hits}/${underHitRate.total} (${underHitRate.pct.toFixed(1)}%)`);
}

async function runComprehensiveDebugHarness() {
  console.log('🔍 Starting Comprehensive Analytics Debug Harness...');
  console.log('=' .repeat(80));
  
  try {
    // Check database data first
    await checkDatabaseData();
    
    // Test all analytics functions
    await testHitRateCalculation();
    await testStreakCalculation();
    await testDefensiveRankCalculation();
    await testChartDataGeneration();
    
    // Test render logic
    await testRenderLogic();
    
    console.log('\n' + '=' .repeat(80));
    console.log('✅ Comprehensive Analytics Debug Harness completed!');
    console.log('\n📋 Summary:');
    console.log('- All analytics functions should return real data instead of N/A and 0/0');
    console.log('- Hit rates should show actual percentages (e.g., 7/10 = 70%)');
    console.log('- Defensive ranks should show real rankings (e.g., 1/2)');
    console.log('- Streaks should show consecutive hits with direction');
    console.log('- Chart data should show historical game values');
    console.log('- Render logic should handle empty data gracefully');
    console.log('- Edge cases (exact line values) should be handled correctly');
    
  } catch (error) {
    console.error('❌ Debug harness failed:', error);
    throw error;
  }
}

// Run the debug harness
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveDebugHarness()
    .then(() => {
      console.log('✅ Comprehensive debug harness completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Comprehensive debug harness failed:', error);
      process.exit(1);
    });
}

export { runComprehensiveDebugHarness, testHitRateCalculation, testStreakCalculation, testDefensiveRankCalculation, testChartDataGeneration, testRenderLogic };
