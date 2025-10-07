/**
 * Verification Queries Script
 * SQL sanity checks to verify ingestion completeness
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI'
);

/**
 * Run verification queries to check ingestion completeness
 */
async function runVerificationQueries() {
  console.log('🔍 Running Verification Queries...\n');
  
  // Query 1: Check total records by league
  console.log('📊 Query 1: Total records by league');
  try {
    const { data: leagueStats, error } = await supabase
      .from('playergamelogs')
      .select('sport, count(*)')
      .group('sport');
    
    if (error) {
      console.error('❌ League stats error:', error);
    } else {
      console.log('League breakdown:');
      leagueStats?.forEach(stat => {
        console.log(`  ${stat.sport.toUpperCase()}: ${stat.count} records`);
      });
    }
  } catch (error) {
    console.error('❌ League stats error:', error);
  }
  
  // Query 2: Check records by season
  console.log('\n📊 Query 2: Records by season');
  try {
    const { data: seasonStats, error } = await supabase
      .from('playergamelogs')
      .select('season, count(*)')
      .group('season')
      .order('season', { ascending: false });
    
    if (error) {
      console.error('❌ Season stats error:', error);
    } else {
      console.log('Season breakdown:');
      seasonStats?.forEach(stat => {
        console.log(`  ${stat.season}: ${stat.count} records`);
      });
    }
  } catch (error) {
    console.error('❌ Season stats error:', error);
  }
  
  // Query 3: Check KC players for 2025 (expect Mahomes, Kelce, etc. to have 4+ rows)
  console.log('\n📊 Query 3: KC players for 2025 (expect 4+ games after 4 weeks)');
  try {
    const { data: kcPlayers, error } = await supabase
      .from('playergamelogs')
      .select('player_name, count(*) as games')
      .eq('season', 2025)
      .eq('team', 'KC')
      .group('player_name')
      .order('games', { ascending: false });
    
    if (error) {
      console.error('❌ KC players error:', error);
    } else {
      console.log('KC players in 2025:');
      kcPlayers?.forEach(player => {
        console.log(`  ${player.player_name}: ${player.games} games`);
      });
      
      // Check if key players have enough data
      const mahomes = kcPlayers?.find(p => p.player_name.toLowerCase().includes('mahomes'));
      const kelce = kcPlayers?.find(p => p.player_name.toLowerCase().includes('kelce'));
      
      if (mahomes) {
        console.log(`✅ Mahomes has ${mahomes.games} games (expected: 4+)`);
      } else {
        console.log('❌ Mahomes not found in data');
      }
      
      if (kelce) {
        console.log(`✅ Kelce has ${kelce.games} games (expected: 4+)`);
      } else {
        console.log('❌ Kelce not found in data');
      }
    }
  } catch (error) {
    console.error('❌ KC players error:', error);
  }
  
  // Query 4: Check prop types coverage
  console.log('\n📊 Query 4: Prop types coverage');
  try {
    const { data: propTypes, error } = await supabase
      .from('playergamelogs')
      .select('prop_type, count(*)')
      .group('prop_type')
      .order('count', { ascending: false });
    
    if (error) {
      console.error('❌ Prop types error:', error);
    } else {
      console.log('Prop types coverage:');
      propTypes?.slice(0, 10).forEach(prop => {
        console.log(`  ${prop.prop_type}: ${prop.count} records`);
      });
    }
  } catch (error) {
    console.error('❌ Prop types error:', error);
  }
  
  // Query 5: Check date range
  console.log('\n📊 Query 5: Date range coverage');
  try {
    const { data: dateRange, error } = await supabase
      .from('playergamelogs')
      .select('date')
      .order('date', { ascending: true })
      .limit(1);
    
    const { data: latestDate, error: latestError } = await supabase
      .from('playergamelogs')
      .select('date')
      .order('date', { ascending: false })
      .limit(1);
    
    if (error || latestError) {
      console.error('❌ Date range error:', error || latestError);
    } else {
      console.log(`Date range: ${dateRange?.[0]?.date} to ${latestDate?.[0]?.date}`);
    }
  } catch (error) {
    console.error('❌ Date range error:', error);
  }
  
  // Query 6: Check teams coverage
  console.log('\n📊 Query 6: Teams coverage');
  try {
    const { data: teams, error } = await supabase
      .from('playergamelogs')
      .select('team, count(*)')
      .group('team')
      .order('count', { ascending: false });
    
    if (error) {
      console.error('❌ Teams error:', error);
    } else {
      console.log(`Teams coverage: ${teams?.length || 0} teams`);
      teams?.slice(0, 10).forEach(team => {
        console.log(`  ${team.team}: ${team.count} records`);
      });
    }
  } catch (error) {
    console.error('❌ Teams error:', error);
  }
  
  // Query 7: Check for specific players (Mahomes, Allen, McCaffrey)
  console.log('\n📊 Query 7: Key players data availability');
  const keyPlayers = [
    { name: 'Patrick Mahomes', expected: 'mahomes-patrick' },
    { name: 'Josh Allen', expected: 'allen-josh' },
    { name: 'Christian McCaffrey', expected: 'mccaffrey-christian' },
    { name: 'Tyreek Hill', expected: 'hill-tyreek' }
  ];
  
  for (const player of keyPlayers) {
    try {
      const { data: playerData, error } = await supabase
        .from('playergamelogs')
        .select('player_name, player_id, count(*) as games')
        .ilike('player_name', `%${player.name.split(' ')[0]}%`)
        .ilike('player_name', `%${player.name.split(' ')[1]}%`)
        .group('player_name, player_id');
      
      if (error) {
        console.error(`❌ ${player.name} error:`, error);
      } else if (playerData && playerData.length > 0) {
        const playerRecord = playerData[0];
        console.log(`✅ ${player.name}: ${playerRecord.games} games (ID: ${playerRecord.player_id})`);
      } else {
        console.log(`❌ ${player.name}: No data found`);
      }
    } catch (error) {
      console.error(`❌ ${player.name} error:`, error);
    }
  }
  
  // Query 8: Check for recent data (last 30 days)
  console.log('\n📊 Query 8: Recent data (last 30 days)');
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateString = thirtyDaysAgo.toISOString().split('T')[0];
    
    const { data: recentData, error } = await supabase
      .from('playergamelogs')
      .select('count(*)')
      .gte('date', dateString);
    
    if (error) {
      console.error('❌ Recent data error:', error);
    } else {
      console.log(`Recent data (last 30 days): ${recentData?.[0]?.count || 0} records`);
    }
  } catch (error) {
    console.error('❌ Recent data error:', error);
  }
  
  console.log('\n✅ Verification queries completed!');
}

/**
 * Test specific player data for analytics
 */
async function testPlayerAnalytics() {
  console.log('\n🧪 Testing Player Analytics Data...\n');
  
  // Test Mahomes data
  console.log('🎯 Testing Patrick Mahomes data:');
  try {
    const { data: mahomesData, error } = await supabase
      .from('playergamelogs')
      .select('*')
      .eq('player_name', 'Patrick Mahomes')
      .order('date', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Mahomes data error:', error);
    } else if (mahomesData && mahomesData.length > 0) {
      console.log(`✅ Found ${mahomesData.length} recent games for Mahomes`);
      console.log('Sample data:');
      mahomesData.slice(0, 3).forEach(game => {
        console.log(`  ${game.date}: vs ${game.opponent}, ${game.prop_type} = ${game.value}`);
      });
      
      // Test hit rate calculation
      const passingYardsGames = mahomesData.filter(g => g.prop_type === 'Passing Yards');
      if (passingYardsGames.length > 0) {
        const line275 = passingYardsGames.filter(g => g.value > 275).length;
        const total = passingYardsGames.length;
        const hitRate = (line275 / total) * 100;
        console.log(`📊 Hit rate for Passing Yards > 275: ${line275}/${total} (${hitRate.toFixed(1)}%)`);
      }
    } else {
      console.log('❌ No Mahomes data found');
    }
  } catch (error) {
    console.error('❌ Mahomes test error:', error);
  }
  
  // Test RPC functions
  console.log('\n🎯 Testing RPC Functions:');
  try {
    // Test hit rate RPC
    const { data: hitRateRPC, error: hitRateError } = await supabase.rpc('calculate_hit_rate', {
      p_player_id: 'mahomes-patrick',
      p_prop_type: 'Passing Yards',
      p_line: 275.0,
      p_direction: 'over',
      p_games_limit: 5
    });
    
    if (hitRateError) {
      console.error('❌ Hit rate RPC error:', hitRateError);
    } else {
      console.log('✅ Hit rate RPC result:', hitRateRPC);
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
    
  } catch (error) {
    console.error('❌ RPC test error:', error);
  }
  
  console.log('\n✅ Player analytics testing completed!');
}

/**
 * Main verification function
 */
async function main() {
  console.log('🔍 Starting Database Verification...\n');
  
  await runVerificationQueries();
  await testPlayerAnalytics();
  
  console.log('\n🎉 Verification completed!');
  console.log('\nExpected outcomes:');
  console.log('- Mahomes, Kelce, etc. should have 4+ games after 4 weeks');
  console.log('- Hit rates should show real percentages instead of 0/0');
  console.log('- Streaks should display correctly across seasons');
  console.log('- Matchup Rank should resolve once defenseStats dataset is aligned');
  console.log('- No more phantom N/A or 0/0 except for players with truly no data');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { runVerificationQueries, testPlayerAnalytics };
