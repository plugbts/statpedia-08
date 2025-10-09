#!/usr/bin/env node

/**
 * Test Specific Player Matching
 * Look for the same player in both tables to see if we can find matches
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rfdrifnsfobqlzorcesn.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSpecificMatch() {
  console.log('🔍 Testing specific player matching...\n');

  try {
    // Get all NFL data from both tables
    const { data: gameLogs, error: gameLogsError } = await supabase
      .from('player_game_logs')
      .select('*')
      .eq('league', 'nfl');

    if (gameLogsError) {
      console.error('❌ Game logs query failed:', gameLogsError.message);
      return;
    }

    const { data: propLines, error: propLinesError } = await supabase
      .from('proplines')
      .select('*')
      .eq('league', 'nfl');

    if (propLinesError) {
      console.error('❌ Prop lines query failed:', propLinesError.message);
      return;
    }

    console.log(`📊 Game logs: ${gameLogs?.length || 0} records`);
    console.log(`📊 Prop lines: ${propLines?.length || 0} records\n`);

    // Find players that exist in both tables
    const gameLogPlayers = new Set(gameLogs?.map(log => log.player_id) || []);
    const propLinePlayers = new Set(propLines?.map(prop => prop.player_id) || []);
    
    const commonPlayers = [...gameLogPlayers].filter(playerId => propLinePlayers.has(playerId));
    
    console.log(`🔍 Players in both tables: ${commonPlayers.length}`);
    
    if (commonPlayers.length > 0) {
      console.log(`\n📋 Common players:`);
      commonPlayers.slice(0, 10).forEach(playerId => {
        console.log(`  - ${playerId}`);
      });
      
      // Check for exact matches on common players
      console.log(`\n🔍 Checking for exact matches on common players...\n`);
      
      let exactMatches = 0;
      for (const playerId of commonPlayers.slice(0, 5)) {
        const playerGameLogs = gameLogs?.filter(log => log.player_id === playerId) || [];
        const playerPropLines = propLines?.filter(prop => prop.player_id === playerId) || [];
        
        console.log(`👤 Player: ${playerId}`);
        console.log(`   Game logs: ${playerGameLogs.length} records`);
        playerGameLogs.forEach(log => {
          console.log(`     - ${log.prop_type} on ${log.date} (value: ${log.value})`);
        });
        
        console.log(`   Prop lines: ${playerPropLines.length} records`);
        playerPropLines.forEach(prop => {
          console.log(`     - ${prop.prop_type} on ${prop.date} (line: ${prop.line})`);
        });
        
        // Check for exact matches
        for (const gameLog of playerGameLogs) {
          const matchingProp = playerPropLines.find(prop => 
            prop.prop_type === gameLog.prop_type &&
            prop.date === gameLog.date
          );
          
          if (matchingProp) {
            exactMatches++;
            console.log(`   ✅ EXACT MATCH: ${gameLog.prop_type} on ${gameLog.date}`);
            console.log(`      Game log value: ${gameLog.value}`);
            console.log(`      Prop line: ${matchingProp.line}`);
            console.log(`      Hit: ${gameLog.value >= matchingProp.line ? 'YES' : 'NO'}`);
          }
        }
        
        console.log('');
      }
      
      console.log(`📊 Total exact matches found: ${exactMatches}`);
      
    } else {
      console.log(`\n❌ No players found in both tables`);
      console.log(`\n🔍 Sample game log players:`);
      [...gameLogPlayers].slice(0, 5).forEach(playerId => {
        console.log(`  - ${playerId}`);
      });
      console.log(`\n🔍 Sample prop line players:`);
      [...propLinePlayers].slice(0, 5).forEach(playerId => {
        console.log(`  - ${playerId}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSpecificMatch().then(() => {
  console.log('\n✅ Specific matching test completed');
}).catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
