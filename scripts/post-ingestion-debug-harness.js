/**
 * Post-Ingestion Debug Harness
 * Tests analytics with complete dataset after backfill
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI'
);

/**
 * Test hit rate calculation with real data
 */
function calculateHitRate(gameLogs, line, direction) {
  if (gameLogs.length === 0) {
    return { hits: 0, total: 0, hit_rate: 0 };
  }
  
  let hits = 0;
  
  for (const gameLog of gameLogs) {
    const hit = direction === 'over' 
      ? gameLog.value > line 
      : gameLog.value < line;
    
    if (hit) hits++;
  }
  
  return {
    hits,
    total: gameLogs.length,
    hit_rate: (hits / gameLogs.length) * 100
  };
}

/**
 * Test streak calculation with real data
 */
function calculateStreak(gameLogs, line, direction) {
  if (gameLogs.length === 0) {
    return { current_streak: 0, longest_streak: 0, streak_direction: direction };
  }
  
  // Sort by date descending (most recent first)
  const sortedLogs = [...gameLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  let currentStreak = 0;
  let longestStreak = 0;
  let streakDirection = direction;
  
  for (const gameLog of sortedLogs) {
    const hit = direction === 'over' 
      ? gameLog.value > line 
      : gameLog.value < line;
    
    if (hit) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      break; // Streak broken
    }
  }
  
  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    streak_direction: streakDirection
  };
}

/**
 * Test analytics with complete dataset
 */
async function testCompleteDataset() {
  console.log('🧪 Testing Analytics with Complete Dataset...\n');
  
  // Test 1: Check database completeness
  console.log('📊 Test 1: Database Completeness Check');
  
  const { data: totalCount } = await supabase
    .from('playergamelogs')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total records in database: ${totalCount || 0}`);
  
  // Check by league
  const { data: leagueStats } = await supabase
    .from('playergamelogs')
    .select('sport, count(*)')
    .group('sport');
  
  console.log('Records by league:');
  leagueStats?.forEach(stat => {
    console.log(`  ${stat.sport.toUpperCase()}: ${stat.count} records`);
  });
  
  // Test 2: Test key players with complete data
  console.log('\n📊 Test 2: Key Players Analytics');
  
  const testPlayers = [
    { name: 'Patrick Mahomes', id: 'mahomes-patrick', team: 'KC' },
    { name: 'Josh Allen', id: 'allen-josh', team: 'BUF' },
    { name: 'Christian McCaffrey', id: 'mccaffrey-christian', team: 'SF' },
    { name: 'Tyreek Hill', id: 'hill-tyreek', team: 'MIA' }
  ];
  
  for (const player of testPlayers) {
    console.log(`\n🎯 Testing ${player.name}:`);
    
    // Get all game logs for this player
    const { data: allLogs, error } = await supabase
      .from('playergamelogs')
      .select('*')
      .eq('player_name', player.name)
      .order('date', { ascending: false });
    
    if (error) {
      console.error(`❌ Error fetching ${player.name} data:`, error);
      continue;
    }
    
    if (!allLogs || allLogs.length === 0) {
      console.log(`❌ No data found for ${player.name}`);
      continue;
    }
    
    console.log(`✅ Found ${allLogs.length} total games for ${player.name}`);
    
    // Group by prop type
    const propTypes = [...new Set(allLogs.map(log => log.prop_type))];
    console.log(`Prop types: ${propTypes.join(', ')}`);
    
    // Test each prop type
    for (const propType of propTypes.slice(0, 3)) { // Test first 3 prop types
      const propLogs = allLogs.filter(log => log.prop_type === propType);
      console.log(`\n  ${propType}: ${propLogs.length} games`);
      
      if (propLogs.length > 0) {
        // Use median value as line
        const values = propLogs.map(l => l.value).sort((a, b) => a - b);
        const medianLine = values[Math.floor(values.length / 2)];
        
        // Test L5, L10, L20
        const l5 = propLogs.slice(0, 5);
        const l10 = propLogs.slice(0, 10);
        const l20 = propLogs.slice(0, 20);
        
        const l5HitRate = calculateHitRate(l5, medianLine, 'over');
        const l10HitRate = calculateHitRate(l10, medianLine, 'over');
        const l20HitRate = calculateHitRate(l20, medianLine, 'over');
        
        const l5Streak = calculateStreak(l5, medianLine, 'over');
        const l10Streak = calculateStreak(l10, medianLine, 'over');
        const l20Streak = calculateStreak(l20, medianLine, 'over');
        
        console.log(`    Line: ${medianLine}`);
        console.log(`    L5: ${l5HitRate.hits}/${l5HitRate.total} (${l5HitRate.hit_rate.toFixed(1)}%), Streak: ${l5Streak.current_streak}`);
        console.log(`    L10: ${l10HitRate.hits}/${l10HitRate.total} (${l10HitRate.hit_rate.toFixed(1)}%), Streak: ${l10Streak.current_streak}`);
        console.log(`    L20: ${l20HitRate.hits}/${l20HitRate.total} (${l20HitRate.hit_rate.toFixed(1)}%), Streak: ${l20Streak.current_streak}`);
      }
    }
  }
  
  // Test 3: Test RPC functions with complete data
  console.log('\n📊 Test 3: RPC Functions with Complete Data');
  
  try {
    // Test hit rate RPC with different limits
    const limits = [5, 10, 20];
    
    for (const limit of limits) {
      const { data: hitRateRPC, error: hitRateError } = await supabase.rpc('calculate_hit_rate', {
        p_player_id: 'mahomes-patrick',
        p_prop_type: 'Passing Yards',
        p_line: 275.0,
        p_direction: 'over',
        p_games_limit: limit
      });
      
      if (hitRateError) {
        console.error(`❌ Hit rate RPC error (L${limit}):`, hitRateError);
      } else {
        console.log(`✅ Hit rate RPC L${limit}:`, hitRateRPC);
      }
    }
    
    // Test streak RPC
    const { data: streakRPC, error: streakError } = await supabase.rpc('calculate_streak', {
      p_player_id: 'mahomes-patrick',
      p_prop_type: 'Passing Yards',
      p_line: 275.0,
      p_direction: 'over'
    });
    
    if (streakError) {
      console.error('❌ Streak RPC error:', streakError);
    } else {
      console.log('✅ Streak RPC result:', streakRPC);
    }
    
    // Test defensive rank RPC
    const { data: defensiveRankRPC, error: defensiveRankError } = await supabase.rpc('get_defensive_rank', {
      p_team: 'KC',
      p_opponent: 'JAX',
      p_prop_type: 'Passing Yards',
      p_position: 'QB',
      p_season: 2025
    });
    
    if (defensiveRankError) {
      console.error('❌ Defensive rank RPC error:', defensiveRankError);
    } else {
      console.log('✅ Defensive rank RPC result:', defensiveRankRPC);
    }
    
  } catch (error) {
    console.error('❌ RPC testing error:', error);
  }
  
  // Test 4: Test UI simulation
  console.log('\n📊 Test 4: UI Simulation');
  
  // Simulate what the UI would receive
  const mockPlayerProps = [
    {
      playerName: 'Patrick Mahomes',
      opponent: 'Jacksonville Jaguars',
      marketType: 'Passing Yards',
      position: 'QB',
      line: 275.0,
      team: 'KC'
    },
    {
      playerName: 'Josh Allen',
      opponent: 'Buffalo Bills',
      marketType: 'Rushing Yards',
      position: 'QB',
      line: 45.0,
      team: 'BUF'
    }
  ];
  
  console.log('Simulating UI analytics for mock props:');
  
  for (const prop of mockPlayerProps) {
    console.log(`\n🎯 ${prop.playerName} - ${prop.marketType} ${prop.line}:`);
    
    // Simulate the enrichment process
    const normalizedPlayerId = prop.playerName.toLowerCase().replace(/\s+/g, '-');
    
    // Get game logs (simulate what enricher would do)
    const { data: gameLogs } = await supabase
      .from('playergamelogs')
      .select('date, season, opponent, value')
      .eq('player_name', prop.playerName)
      .eq('prop_type', prop.marketType)
      .order('date', { ascending: false })
      .limit(20);
    
    console.log(`  Game logs found: ${gameLogs?.length || 0}`);
    
    if (gameLogs && gameLogs.length > 0) {
      // Calculate analytics (simulate what UI would show)
      const l5 = gameLogs.slice(0, 5);
      const l10 = gameLogs.slice(0, 10);
      const l20 = gameLogs.slice(0, 20);
      
      const l5HitRate = calculateHitRate(l5, prop.line, 'over');
      const l10HitRate = calculateHitRate(l10, prop.line, 'over');
      const l20HitRate = calculateHitRate(l20, prop.line, 'over');
      
      const l5Streak = calculateStreak(l5, prop.line, 'over');
      
      console.log(`  ✅ UI would show:`);
      console.log(`    L5: ${l5HitRate.hits}/${l5HitRate.total} (${l5HitRate.hit_rate.toFixed(1)}%)`);
      console.log(`    L10: ${l10HitRate.hits}/${l10HitRate.total} (${l10HitRate.hit_rate.toFixed(1)}%)`);
      console.log(`    L20: ${l20HitRate.hits}/${l20HitRate.total} (${l20HitRate.hit_rate.toFixed(1)}%)`);
      console.log(`    Streak: ${l5Streak.current_streak} consecutive hits`);
    } else {
      console.log(`  ❌ UI would show: N/A and 0/0 (no data)`);
    }
  }
  
  console.log('\n✅ Complete dataset testing completed!');
}

/**
 * Main debug function
 */
async function main() {
  console.log('🧪 Starting Post-Ingestion Debug Harness...\n');
  
  await testCompleteDataset();
  
  console.log('\n📋 Expected Outcomes:');
  console.log('✅ Every player/prop has populated gameLogs');
  console.log('✅ Hit rates (L5/L10/L20) show real percentages');
  console.log('✅ Streaks display correctly across seasons');
  console.log('✅ Matchup Rank resolves once defenseStats dataset is aligned');
  console.log('✅ No more phantom N/A or 0/0 except for players with truly no data');
  
  console.log('\n🎉 Post-ingestion debug harness completed!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testCompleteDataset, calculateHitRate, calculateStreak };
