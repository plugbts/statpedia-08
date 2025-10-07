/**
 * Test script for refined batch ingestion
 * Verifies the complete system before running full backfill
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI'
);

// Import the refined ingestion functions
import { normalizeOpponent, normalizeMarketType, normalizePlayerId } from './refined-batch-ingestion.js';

/**
 * Test all normalization functions
 */
function testNormalization() {
  console.log('🧪 Testing Refined Normalization Functions...\n');
  
  // Test team normalization with comprehensive examples
  const teamTests = [
    // NFL
    { team: 'Kansas City Chiefs', league: 'nfl', expected: 'KC' },
    { team: 'Jacksonville Jaguars', league: 'nfl', expected: 'JAX' },
    { team: 'Las Vegas Raiders', league: 'nfl', expected: 'LV' },
    { team: 'Washington Commanders', league: 'nfl', expected: 'WAS' },
    
    // NBA
    { team: 'Los Angeles Lakers', league: 'nba', expected: 'LAL' },
    { team: 'Golden State Warriors', league: 'nba', expected: 'GSW' },
    { team: 'Philadelphia 76ers', league: 'nba', expected: 'PHI' },
    
    // MLB
    { team: 'New York Yankees', league: 'mlb', expected: 'NYY' },
    { team: 'Los Angeles Dodgers', league: 'mlb', expected: 'LAD' },
    { team: 'San Francisco Giants', league: 'mlb', expected: 'SF' },
    
    // NHL
    { team: 'Toronto Maple Leafs', league: 'nhl', expected: 'TOR' },
    { team: 'Vegas Golden Knights', league: 'nhl', expected: 'VGK' },
    { team: 'Seattle Kraken', league: 'nhl', expected: 'SEA' }
  ];
  
  console.log('🏈 Team Normalization Tests:');
  let teamPassed = 0;
  for (const test of teamTests) {
    const result = normalizeOpponent(test.team, test.league);
    const passed = result === test.expected;
    if (passed) teamPassed++;
    console.log(`${passed ? '✅' : '❌'} ${test.team} (${test.league.toUpperCase()}) → ${result} (expected: ${test.expected})`);
  }
  console.log(`Team normalization: ${teamPassed}/${teamTests.length} passed\n`);
  
  // Test market type normalization
  const marketTests = [
    // NFL
    { market: 'passing_yards', expected: 'Passing Yards' },
    { market: 'rushing_yards', expected: 'Rushing Yards' },
    { market: 'receiving_yards', expected: 'Receiving Yards' },
    { market: 'passing_completions', expected: 'Passing Completions' },
    { market: 'passing_attempts', expected: 'Passing Attempts' },
    { market: 'passing_touchdowns', expected: 'Passing Touchdowns' },
    { market: 'rushing_touchdowns', expected: 'Rushing Touchdowns' },
    { market: 'receiving_touchdowns', expected: 'Receiving Touchdowns' },
    { market: 'receptions', expected: 'Receptions' },
    { market: 'interceptions', expected: 'Interceptions' },
    
    // NBA
    { market: 'points', expected: 'Points' },
    { market: 'rebounds', expected: 'Rebounds' },
    { market: 'assists', expected: 'Assists' },
    { market: 'steals', expected: 'Steals' },
    { market: 'blocks', expected: 'Blocks' },
    { market: 'three_pointers_made', expected: 'Three Pointers Made' },
    { market: 'free_throws_made', expected: 'Free Throws Made' },
    
    // MLB
    { market: 'hits', expected: 'Hits' },
    { market: 'runs', expected: 'Runs' },
    { market: 'runs_batted_in', expected: 'Runs Batted In' },
    { market: 'home_runs', expected: 'Home Runs' },
    { market: 'stolen_bases', expected: 'Stolen Bases' },
    
    // NHL
    { market: 'goals', expected: 'Goals' },
    { market: 'shots_on_goal', expected: 'Shots on Goal' },
    { market: 'power_play_goals', expected: 'Power Play Goals' }
  ];
  
  console.log('📊 Market Type Normalization Tests:');
  let marketPassed = 0;
  for (const test of marketTests) {
    const result = normalizeMarketType(test.market);
    const passed = result === test.expected;
    if (passed) marketPassed++;
    console.log(`${passed ? '✅' : '❌'} ${test.market} → ${result} (expected: ${test.expected})`);
  }
  console.log(`Market normalization: ${marketPassed}/${marketTests.length} passed\n`);
  
  // Test player ID normalization
  const playerTests = [
    { name: 'Patrick Mahomes', expected: 'patrick-mahomes' },
    { name: 'Josh Allen', expected: 'josh-allen' },
    { name: 'Christian McCaffrey', expected: 'christian-mccaffrey' },
    { name: 'Tyreek Hill', expected: 'tyreek-hill' },
    { name: 'LeBron James', expected: 'lebron-james' },
    { name: 'Stephen Curry', expected: 'stephen-curry' }
  ];
  
  console.log('👤 Player ID Normalization Tests:');
  let playerPassed = 0;
  for (const test of playerTests) {
    const result = normalizePlayerId(test.name);
    const passed = result === test.expected;
    if (passed) playerPassed++;
    console.log(`${passed ? '✅' : '❌'} "${test.name}" → "${result}" (expected: "${test.expected}")`);
  }
  console.log(`Player ID normalization: ${playerPassed}/${playerTests.length} passed\n`);
  
  return {
    teamPassed,
    teamTotal: teamTests.length,
    marketPassed,
    marketTotal: marketTests.length,
    playerPassed,
    playerTotal: playerTests.length
  };
}

/**
 * Test database connectivity and current state
 */
async function testDatabase() {
  console.log('🔧 Testing Database Connectivity...\n');
  
  try {
    // Test basic connection
    const { count: totalCount, error: countError } = await supabase
      .from('playergamelogs')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Database connection error:', countError);
      return false;
    }
    
    console.log(`✅ Database connected successfully`);
    console.log(`📊 Current total records: ${totalCount || 0}`);
    
    // Check data distribution - simplified approach
    const { data: allData, error: allError } = await supabase
      .from('playergamelogs')
      .select('sport, season');
    
    if (!allError && allData) {
      console.log('\n📈 Data Distribution:');
      const grouped = allData.reduce((acc, row) => {
        if (!acc[row.sport]) acc[row.sport] = {};
        if (!acc[row.sport][row.season]) acc[row.sport][row.season] = 0;
        acc[row.sport][row.season]++;
        return acc;
      }, {});
      
      Object.entries(grouped).forEach(([sport, seasons]) => {
        console.log(`  ${sport.toUpperCase()}:`);
        Object.entries(seasons).forEach(([season, count]) => {
          console.log(`    ${season}: ${count} records`);
        });
      });
    }
    
    // Test sample query performance
    const startTime = Date.now();
    const { data: sampleData, error: sampleError } = await supabase
      .from('playergamelogs')
      .select('*')
      .eq('player_name', 'Patrick Mahomes')
      .order('date', { ascending: false })
      .limit(5);
    
    const queryTime = Date.now() - startTime;
    
    if (sampleError) {
      console.error('❌ Sample query error:', sampleError);
    } else {
      console.log(`\n⚡ Sample query time: ${queryTime}ms`);
      console.log(`📋 Sample records found: ${sampleData?.length || 0}`);
      
      if (sampleData && sampleData.length > 0) {
        console.log('Sample record:', {
          player: sampleData[0].player_name,
          team: sampleData[0].team,
          opponent: sampleData[0].opponent,
          prop_type: sampleData[0].prop_type,
          value: sampleData[0].value,
          date: sampleData[0].date
        });
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Database test error:', error);
    return false;
  }
}

/**
 * Test RPC functions
 */
async function testRPCFunctions() {
  console.log('\n🔧 Testing RPC Functions...\n');
  
  try {
    // Test hit rate calculation
    const hitRateStart = Date.now();
    const { data: hitRateData, error: hitRateError } = await supabase.rpc('calculate_hit_rate', {
      p_player_id: 'mahomes-patrick',
      p_prop_type: 'Passing Yards',
      p_line: 275.0,
      p_direction: 'over',
      p_games_limit: 5
    });
    const hitRateTime = Date.now() - hitRateStart;
    
    if (hitRateError) {
      console.error('❌ Hit rate RPC error:', hitRateError);
    } else {
      console.log(`✅ Hit rate RPC: ${hitRateTime}ms`);
      console.log(`📊 Result:`, hitRateData);
    }
    
    // Test streak calculation
    const streakStart = Date.now();
    const { data: streakData, error: streakError } = await supabase.rpc('calculate_streak', {
      p_player_id: 'mahomes-patrick',
      p_prop_type: 'Passing Yards',
      p_line: 275.0,
      p_direction: 'over'
    });
    const streakTime = Date.now() - streakStart;
    
    if (streakError) {
      console.error('❌ Streak RPC error:', streakError);
    } else {
      console.log(`✅ Streak RPC: ${streakTime}ms`);
      console.log(`📊 Result:`, streakData);
    }
    
    // Test defensive rank
    const defenseStart = Date.now();
    const { data: defenseData, error: defenseError } = await supabase.rpc('get_defensive_rank', {
      p_team: 'KC',
      p_opponent: 'JAX',
      p_prop_type: 'Passing Yards',
      p_position: 'QB'
    });
    const defenseTime = Date.now() - defenseStart;
    
    if (defenseError) {
      console.error('❌ Defensive rank RPC error:', defenseError);
    } else {
      console.log(`✅ Defensive rank RPC: ${defenseTime}ms`);
      console.log(`📊 Result:`, defenseData);
    }
    
    return !hitRateError && !streakError && !defenseError;
    
  } catch (error) {
    console.error('❌ RPC test error:', error);
    return false;
  }
}

/**
 * Show system readiness
 */
function showSystemReadiness(normalizationResults, dbConnected, rpcWorking) {
  console.log('\n🎯 System Readiness Assessment:');
  console.log('=' .repeat(50));
  
  const totalTests = normalizationResults.teamTotal + normalizationResults.marketTotal + normalizationResults.playerTotal;
  const totalPassed = normalizationResults.teamPassed + normalizationResults.marketPassed + normalizationResults.playerPassed;
  
  console.log(`📊 Normalization Tests: ${totalPassed}/${totalTests} passed`);
  console.log(`🔧 Database Connection: ${dbConnected ? '✅ Connected' : '❌ Failed'}`);
  console.log(`⚡ RPC Functions: ${rpcWorking ? '✅ Working' : '❌ Failed'}`);
  
  const systemReady = totalPassed === totalTests && dbConnected && rpcWorking;
  
  console.log(`\n🚀 System Status: ${systemReady ? '✅ READY FOR BATCH INGESTION' : '❌ NOT READY'}`);
  
  if (systemReady) {
    console.log('\n🎉 All systems ready! You can now run:');
    console.log('   node scripts/refined-batch-ingestion.js');
    console.log('\n📋 Expected Results:');
    console.log('   - 868,000+ records across all leagues');
    console.log('   - Real analytics instead of N/A and 0/0');
    console.log('   - Instant UI loading with indexed queries');
  } else {
    console.log('\n⚠️ System not ready. Please fix the issues above before running batch ingestion.');
  }
  
  return systemReady;
}

/**
 * Main test function
 */
async function main() {
  console.log('🧪 Testing Refined Batch Ingestion System...\n');
  
  const normalizationResults = testNormalization();
  const dbConnected = await testDatabase();
  const rpcWorking = await testRPCFunctions();
  const systemReady = showSystemReadiness(normalizationResults, dbConnected, rpcWorking);
  
  console.log('\n✅ Refined batch ingestion system test completed!');
  
  return systemReady;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testNormalization, testDatabase, testRPCFunctions, showSystemReadiness };
