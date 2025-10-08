/**
 * Debug player ID mapping to see why prop lines aren't using canonical IDs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { mapPlayerId } from './utils/playerIdMap.js';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function debugPlayerIdMapping() {
  console.log('🔍 Debugging Player ID Mapping');
  console.log('='.repeat(50));

  try {
    // Check player_id_map for JAXON SMITHNJIGBA
    console.log('\n🗺️ Player ID Map Entries for JAXON SMITHNJIGBA:');
    const { data: mappings, error: mappingsError } = await supabase
      .from('player_id_map')
      .select('*')
      .or('source_player_id.ilike.%jaxon%')
      .order('source');

    if (mappingsError) {
      console.error('❌ Error fetching mappings:', mappingsError);
    } else {
      console.log(`Found ${mappings?.length || 0} mappings:`);
      mappings?.forEach((mapping, i) => {
        console.log(`${i + 1}. ${mapping.source}: ${mapping.source_player_id} → ${mapping.canonical_player_id}`);
      });
    }

    // Check what player IDs are actually in prop lines
    console.log('\n🎯 Prop Lines Player IDs for JAXON SMITHNJIGBA:');
    const { data: propLines, error: propLinesError } = await supabase
      .from('proplines')
      .select('player_id, player_name')
      .or('player_name.ilike.%jaxon%')
      .limit(5);

    if (propLinesError) {
      console.error('❌ Error fetching prop lines:', propLinesError);
    } else {
      console.log(`Found ${propLines?.length || 0} prop line records:`);
      propLines?.forEach((prop, i) => {
        console.log(`${i + 1}. ${prop.player_name}: ${prop.player_id}`);
      });
    }

    // Check what player IDs are in game logs
    console.log('\n📊 Game Logs Player IDs for JAXON SMITHNJIGBA:');
    const { data: gameLogs, error: gameLogsError } = await supabase
      .from('playergamelogs')
      .select('player_id, player_name')
      .or('player_name.ilike.%jaxon%')
      .limit(5);

    if (gameLogsError) {
      console.error('❌ Error fetching game logs:', gameLogsError);
    } else {
      console.log(`Found ${gameLogs?.length || 0} game log records:`);
      gameLogs?.forEach((log, i) => {
        console.log(`${i + 1}. ${log.player_name}: ${log.player_id}`);
      });
    }

    // Test the mapping function directly
    console.log('\n🧪 Testing mapPlayerId Function:');
    const testRawId = 'JAXON_SMITHNJIGBA_1_NFL';
    const testPlayerName = 'JAXON SMITHNJIGBA';
    const testTeam = 'UNK';

    console.log(`Testing: mapPlayerId('props', '${testRawId}', '${testPlayerName}', '${testTeam}')`);
    const canonicalId = await mapPlayerId('props', testRawId, testPlayerName, testTeam);
    console.log(`Result: ${canonicalId}`);

    // Check if there are any prop lines that should have been mapped but weren't
    console.log('\n🔍 Checking for Unmapped Prop Lines:');
    const { data: unmappedProps, error: unmappedError } = await supabase
      .from('proplines')
      .select('player_id, player_name')
      .not('player_id', 'like', '%-%') // IDs without canonical format
      .limit(10);

    if (unmappedError) {
      console.error('❌ Error fetching unmapped props:', unmappedError);
    } else {
      console.log(`Found ${unmappedProps?.length || 0} prop lines that might need mapping:`);
      unmappedProps?.forEach((prop, i) => {
        console.log(`${i + 1}. ${prop.player_name}: ${prop.player_id}`);
      });
    }

    console.log('\n🎉 Player ID mapping debug complete!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Fatal error during player ID mapping debug:', error);
  }
}

debugPlayerIdMapping().catch(console.error);
