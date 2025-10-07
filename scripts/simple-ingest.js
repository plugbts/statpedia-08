/**
 * Simple Historical Data Ingestion
 * Creates realistic historical data for testing analytics
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Realistic player data with historical performance
const PLAYER_DATA = {
  'mahomes-patrick': {
    name: 'Patrick Mahomes',
    team: 'KC',
    position: 'QB',
    props: {
      'Passing Yards': { avg: 285, std: 45, min: 200, max: 400 },
      'Passing Touchdowns': { avg: 2.2, std: 1.2, min: 0, max: 5 }
    }
  },
  'allen-josh': {
    name: 'Josh Allen',
    team: 'BUF',
    position: 'QB',
    props: {
      'Passing Yards': { avg: 275, std: 50, min: 180, max: 380 },
      'Passing Touchdowns': { avg: 2.0, std: 1.0, min: 0, max: 4 }
    }
  },
  'mccaffrey-christian': {
    name: 'Christian McCaffrey',
    team: 'SF',
    position: 'RB',
    props: {
      'Rushing Yards': { avg: 85, std: 25, min: 30, max: 150 },
      'Rushing Touchdowns': { avg: 0.8, std: 0.8, min: 0, max: 3 },
      'Receiving Yards': { avg: 45, std: 20, min: 10, max: 100 },
      'Receiving Receptions': { avg: 4.5, std: 2.0, min: 1, max: 8 }
    }
  },
  'hill-tyreek': {
    name: 'Tyreek Hill',
    team: 'MIA',
    position: 'WR',
    props: {
      'Receiving Yards': { avg: 75, std: 30, min: 20, max: 150 },
      'Receiving Receptions': { avg: 5.2, std: 2.5, min: 1, max: 10 },
      'Receiving Touchdowns': { avg: 0.6, std: 0.8, min: 0, max: 3 }
    }
  },
  'kelce-travis': {
    name: 'Travis Kelce',
    team: 'KC',
    position: 'TE',
    props: {
      'Receiving Yards': { avg: 65, std: 25, min: 20, max: 120 },
      'Receiving Receptions': { avg: 5.8, std: 2.2, min: 2, max: 10 },
      'Receiving Touchdowns': { avg: 0.5, std: 0.7, min: 0, max: 2 }
    }
  }
};

const OPPONENTS = ['JAX', 'DEN', 'LAC', 'NE', 'NYJ', 'CIN', 'PIT', 'CLE', 'HOU', 'IND', 'TEN', 'BAL'];

function generateNormalValue(avg, std, min, max) {
  // Box-Muller transformation for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const value = avg + std * z0;
  
  // Clamp to min/max and round appropriately
  const clamped = Math.max(min, Math.min(max, value));
  
  // Round based on prop type
  if (avg < 10) {
    return Math.round(clamped); // Touchdowns, receptions
  } else {
    return Math.round(clamped * 10) / 10; // Yards
  }
}

function generateGameLogs(playerId, playerData, numGames = 20) {
  const gameLogs = [];
  const today = new Date();
  
  for (let i = 0; i < numGames; i++) {
    const gameDate = new Date(today);
    gameDate.setDate(gameDate.getDate() - (i * 7)); // One game per week
    const dateStr = gameDate.toISOString().split('T')[0];
    const season = gameDate.getFullYear();
    
    const opponent = OPPONENTS[i % OPPONENTS.length];
    
    // Generate stats for each prop type
    for (const [propType, stats] of Object.entries(playerData.props)) {
      const value = generateNormalValue(stats.avg, stats.std, stats.min, stats.max);
      
      gameLogs.push({
        player_id: playerId,
        player_name: playerData.name,
        team: playerData.team,
        opponent: opponent,
        season: season,
        date: dateStr,
        prop_type: propType,
        value: value,
        position: playerData.position,
        sport: 'nfl'
      });
    }
  }
  
  return gameLogs;
}

async function ingestRealisticData() {
  try {
    console.log('🚀 Starting realistic historical data ingestion...');
    
    // Clear existing data
    console.log('🗑️ Clearing existing data...');
    const { error: deleteError } = await supabase
      .from('playergamelogs')
      .delete()
      .eq('sport', 'nfl');
    
    if (deleteError) {
      console.warn('⚠️ Could not clear existing data:', deleteError.message);
    } else {
      console.log('✅ Cleared existing data');
    }
    
    // Generate game logs for each player
    let allGameLogs = [];
    
    for (const [playerId, playerData] of Object.entries(PLAYER_DATA)) {
      console.log(`📊 Generating data for ${playerData.name}...`);
      const gameLogs = generateGameLogs(playerId, playerData, 20);
      allGameLogs = allGameLogs.concat(gameLogs);
      console.log(`✅ Generated ${gameLogs.length} game logs for ${playerData.name}`);
    }
    
    console.log(`📈 Total game logs generated: ${allGameLogs.length}`);
    
    // Save to database in batches
    const batchSize = 100;
    for (let i = 0; i < allGameLogs.length; i += batchSize) {
      const batch = allGameLogs.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('playergamelogs')
        .insert(batch);
      
      if (error) {
        console.error(`❌ Error saving batch ${i}-${i + batchSize}:`, error);
      } else {
        console.log(`✅ Saved batch ${i + 1}-${Math.min(i + batchSize, allGameLogs.length)}`);
      }
    }
    
    // Verify data was saved
    const { data: sampleData, error: verifyError } = await supabase
      .from('playergamelogs')
      .select('*')
      .limit(10);
    
    if (verifyError) {
      console.error('❌ Error verifying saved data:', verifyError);
    } else {
      console.log('✅ Verification successful. Sample data:');
      console.table(sampleData);
    }
    
    // Show analytics preview
    console.log('\n📊 Analytics Preview:');
    for (const [playerId, playerData] of Object.entries(PLAYER_DATA)) {
      const { data: hitRate } = await supabase.rpc('calculate_hit_rate', {
        p_player_id: playerId,
        p_prop_type: Object.keys(playerData.props)[0],
        p_line: playerData.props[Object.keys(playerData.props)[0]].avg,
        p_direction: 'over',
        p_games_limit: 5
      });
      
      if (hitRate && hitRate[0]) {
        console.log(`${playerData.name}: ${hitRate[0].hits}/${hitRate[0].total} (${(hitRate[0].hit_rate * 100).toFixed(1)}%)`);
      }
    }
    
    console.log('\n🎉 Realistic historical data ingestion completed!');
    console.log('📈 Analytics should now show real values instead of N/A and 0/0');
    
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    throw error;
  }
}

// Run the ingestion
if (import.meta.url === `file://${process.argv[1]}`) {
  ingestRealisticData()
    .then(() => {
      console.log('✅ Ingestion completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ingestion failed:', error);
      process.exit(1);
    });
}

export { ingestRealisticData };
