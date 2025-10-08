/**
 * Normalize existing data using player_id_map
 * This script updates both playergamelogs and proplines to use canonical player IDs
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

async function normalizeExistingData() {
  console.log('🔄 Starting data normalization...');
  console.log('='.repeat(50));

  try {
    // Step 1: Update playergamelogs to use canonical IDs
    console.log('\n📊 Step 1: Normalizing playergamelogs player IDs...');
    
    const { data: gameLogsUpdate, error: gameLogsError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE playergamelogs g
        SET player_id = m.canonical_player_id
        FROM player_id_map m
        WHERE m.source = 'logs' AND m.source_player_id = g.player_id
        AND g.player_id != m.canonical_player_id;
      `
    });

    if (gameLogsError) {
      console.error('❌ Error updating playergamelogs:', gameLogsError);
      console.log('\n💡 Manual SQL to run in Supabase dashboard:');
      console.log(`
        UPDATE playergamelogs g
        SET player_id = m.canonical_player_id
        FROM player_id_map m
        WHERE m.source = 'logs' AND m.source_player_id = g.player_id
        AND g.player_id != m.canonical_player_id;
      `);
    } else {
      console.log('✅ playergamelogs player IDs normalized successfully');
    }

    // Step 2: Update proplines to use canonical IDs
    console.log('\n🎯 Step 2: Normalizing proplines player IDs...');
    
    const { data: propLinesUpdate, error: propLinesError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE proplines p
        SET player_id = m.canonical_player_id
        FROM player_id_map m
        WHERE m.source = 'props' AND m.source_player_id = p.player_id
        AND p.player_id != m.canonical_player_id;
      `
    });

    if (propLinesError) {
      console.error('❌ Error updating proplines:', propLinesError);
      console.log('\n💡 Manual SQL to run in Supabase dashboard:');
      console.log(`
        UPDATE proplines p
        SET player_id = m.canonical_player_id
        FROM player_id_map m
        WHERE m.source = 'props' AND m.source_player_id = p.player_id
        AND p.player_id != m.canonical_player_id;
      `);
    } else {
      console.log('✅ proplines player IDs normalized successfully');
    }

    // Step 3: Check overlap before normalization
    console.log('\n📈 Step 3: Checking player overlap...');
    
    const { data: overlapBefore, error: overlapError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT COUNT(DISTINCT g.player_id) as overlap_count
        FROM playergamelogs g
        JOIN proplines p ON g.player_id = p.player_id;
      `
    });

    if (overlapError) {
      console.error('❌ Error checking overlap:', overlapError);
      console.log('\n💡 Manual SQL to check overlap:');
      console.log(`
        SELECT COUNT(DISTINCT g.player_id) as overlap_count
        FROM playergamelogs g
        JOIN proplines p ON g.player_id = p.player_id;
      `);
    } else {
      console.log(`✅ Player overlap after normalization: ${overlapBefore?.[0]?.overlap_count || 'Unknown'} players`);
    }

    // Step 4: Check unique players in each table
    console.log('\n📊 Step 4: Checking unique player counts...');
    
    const { data: gameLogsCount, error: gameLogsCountError } = await supabase
      .from('playergamelogs')
      .select('player_id', { count: 'exact', head: true });
    
    const { data: propLinesCount, error: propLinesCountError } = await supabase
      .from('proplines')
      .select('player_id', { count: 'exact', head: true });

    if (gameLogsCountError) {
      console.error('❌ Error counting game logs players:', gameLogsCountError);
    } else {
      console.log(`📊 Unique players in playergamelogs: ${gameLogsCount || 'Unknown'}`);
    }

    if (propLinesCountError) {
      console.error('❌ Error counting prop lines players:', propLinesCountError);
    } else {
      console.log(`🎯 Unique players in proplines: ${propLinesCount || 'Unknown'}`);
    }

    console.log('\n🎉 Data normalization complete!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Fatal error during normalization:', error);
  }
}

normalizeExistingData().catch(console.error);
