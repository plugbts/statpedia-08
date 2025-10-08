/**
 * Check current status with overlap count of 19
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function checkOverlap19() {
  console.log('🔍 Checking Overlap Status (Count: 19)');
  console.log('='.repeat(40));

  try {
    // Check what player IDs we have in each table
    console.log('\n📊 Sample Player IDs:');
    
    const { data: gameLogs, error: gameLogsError } = await supabase
      .from('playergamelogs')
      .select('player_id, player_name')
      .limit(15);

    const { data: propLines, error: propLinesError } = await supabase
      .from('proplines')
      .select('player_id, player_name')
      .limit(15);

    if (gameLogsError || propLinesError) {
      console.error('❌ Error:', gameLogsError || propLinesError);
    } else {
      console.log('Game Logs:');
      gameLogs?.forEach((log, i) => {
        console.log(`  ${i + 1}. ${log.player_name}: ${log.player_id}`);
      });
      
      console.log('\nProp Lines:');
      propLines?.forEach((prop, i) => {
        console.log(`  ${i + 1}. ${prop.player_name}: ${prop.player_id}`);
      });
    }

    // Check for any remaining unmapped players
    console.log('\n🔍 Checking for Unmapped Players:');
    
    const { data: unmappedGameLogs, error: unmappedGameLogsError } = await supabase
      .from('playergamelogs')
      .select('player_id, player_name')
      .not('player_id', 'like', '%-%') // IDs without canonical format
      .limit(10);

    const { data: unmappedPropLines, error: unmappedPropLinesError } = await supabase
      .from('proplines')
      .select('player_id, player_name')
      .not('player_id', 'like', '%-%') // IDs without canonical format
      .limit(10);

    if (unmappedGameLogsError || unmappedPropLinesError) {
      console.error('❌ Error checking unmapped:', unmappedGameLogsError || unmappedPropLinesError);
    } else {
      console.log(`📊 Unmapped game logs: ${unmappedGameLogs?.length || 0}`);
      unmappedGameLogs?.forEach((log, i) => {
        console.log(`  ${i + 1}. ${log.player_name}: ${log.player_id}`);
      });
      
      console.log(`🎯 Unmapped prop lines: ${unmappedPropLines?.length || 0}`);
      unmappedPropLines?.forEach((prop, i) => {
        console.log(`  ${i + 1}. ${prop.player_name}: ${prop.player_id}`);
      });
    }

    // Check for inconsistent formats
    console.log('\n🔍 Checking for Inconsistent Formats:');
    
    const { data: inconsistentPropLines, error: inconsistentError } = await supabase
      .from('proplines')
      .select('player_id, player_name')
      .or('player_id.like.*-_*,player_id.like.*_1_NBA-*')
      .limit(10);

    if (inconsistentError) {
      console.error('❌ Error checking inconsistent:', inconsistentError);
    } else {
      console.log(`🎯 Inconsistent prop line formats: ${inconsistentPropLines?.length || 0}`);
      inconsistentPropLines?.forEach((prop, i) => {
        console.log(`  ${i + 1}. ${prop.player_name}: ${prop.player_id}`);
      });
    }

    // Check JAXON SMITHNJIGBA specifically
    console.log('\n🎯 JAXON SMITHNJIGBA Status:');
    const { data: jaxonGameLogs, error: jaxonGameLogsError } = await supabase
      .from('playergamelogs')
      .select('player_id, player_name')
      .or('player_name.ilike.%jaxon%')
      .limit(3);

    const { data: jaxonPropLines, error: jaxonPropLinesError } = await supabase
      .from('proplines')
      .select('player_id, player_name')
      .or('player_name.ilike.%jaxon%')
      .limit(3);

    if (jaxonGameLogsError || jaxonPropLinesError) {
      console.error('❌ Jaxon error:', jaxonGameLogsError || jaxonPropLinesError);
    } else {
      console.log('Game logs:');
      jaxonGameLogs?.forEach((log, i) => {
        console.log(`  ${i + 1}. ${log.player_name}: ${log.player_id}`);
      });
      console.log('Prop lines:');
      jaxonPropLines?.forEach((prop, i) => {
        console.log(`  ${i + 1}. ${prop.player_name}: ${prop.player_id}`);
      });
      
      // Check if they match
      if (jaxonGameLogs?.length > 0 && jaxonPropLines?.length > 0) {
        const gameLogId = jaxonGameLogs[0].player_id;
        const propLineId = jaxonPropLines[0].player_id;
        if (gameLogId === propLineId) {
          console.log('✅ JAXON SMITHNJIGBA IDs match!');
        } else {
          console.log('❌ JAXON SMITHNJIGBA IDs still don\'t match');
          console.log(`   Game logs: ${gameLogId}`);
          console.log(`   Prop lines: ${propLineId}`);
        }
      }
    }

    console.log('\n🎉 Overlap check complete!');
    console.log('='.repeat(40));

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

checkOverlap19().catch(console.error);
