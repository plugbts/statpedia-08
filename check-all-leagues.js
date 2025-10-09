#!/usr/bin/env node

/**
 * Check All Leagues in Database
 * See what leagues we have data for
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rfdrifnsfobqlzorcesn.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAllLeagues() {
  console.log('🔍 Checking all leagues in database...\n');

  try {
    // Check player_game_logs leagues
    console.log('📊 Checking player_game_logs leagues...');
    const { data: gameLogs, error: gameLogsError } = await supabase
      .from('player_game_logs')
      .select('league')
      .not('league', 'is', null);

    if (gameLogsError) {
      console.error('❌ Game logs query failed:', gameLogsError.message);
    } else {
      const gameLogLeagues = [...new Set(gameLogs?.map(log => log.league) || [])];
      console.log(`✅ Game logs leagues: ${gameLogLeagues.join(', ')}`);
      console.log(`📊 Total game logs: ${gameLogs?.length || 0}`);
    }

    // Check proplines leagues
    console.log('\n📊 Checking proplines leagues...');
    const { data: propLines, error: propLinesError } = await supabase
      .from('proplines')
      .select('league')
      .not('league', 'is', null);

    if (propLinesError) {
      console.error('❌ Prop lines query failed:', propLinesError.message);
    } else {
      const propLineLeagues = [...new Set(propLines?.map(prop => prop.league) || [])];
      console.log(`✅ Prop lines leagues: ${propLineLeagues.join(', ')}`);
      console.log(`📊 Total prop lines: ${propLines?.length || 0}`);
    }

    // Check counts by league
    console.log('\n📊 League breakdown:');
    
    const leagues = ['nfl', 'nba', 'mlb', 'nhl'];
    
    for (const league of leagues) {
      const { count: gameLogCount, error: gameLogCountError } = await supabase
        .from('player_game_logs')
        .select('id', { count: 'exact', head: true })
        .eq('league', league);
        
      const { count: propLineCount, error: propLineCountError } = await supabase
        .from('proplines')
        .select('id', { count: 'exact', head: true })
        .eq('league', league);
        
      console.log(`${league.toUpperCase()}:`);
      console.log(`  Game logs: ${gameLogCount || 0}`);
      console.log(`  Prop lines: ${propLineCount || 0}`);
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkAllLeagues().then(() => {
  console.log('\n✅ League check completed');
}).catch(error => {
  console.error('❌ Check script failed:', error);
  process.exit(1);
});
