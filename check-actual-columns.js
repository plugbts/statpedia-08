/**
 * Check what columns actually exist in the playeranalytics table
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

async function checkActualColumns() {
  console.log('🔍 Checking actual columns in playeranalytics table...');
  
  // Try to insert a minimal record to see what columns are missing
  const minimalRecord = {
    player_id: 'TEST_PLAYER_2',
    player_name: 'Test Player 2',
    prop_type: 'Receptions'
  };
  
  try {
    const { data, error } = await supabase
      .from('playeranalytics')
      .insert([minimalRecord])
      .select();
    
    if (error) {
      console.error('❌ Minimal insert error:', error);
      
      // If it's a column error, try to figure out what columns exist
      if (error.message.includes('column')) {
        console.log('\n🔍 Let me try to determine existing columns...');
        
        // Try selecting basic columns one by one
        const basicColumns = [
          'id', 'player_id', 'player_name', 'prop_type', 'line', 
          'season', 'season_hits', 'season_total', 'season_pct'
        ];
        
        for (const col of basicColumns) {
          try {
            const { error: colError } = await supabase
              .from('playeranalytics')
              .select(col)
              .limit(1);
            
            if (colError) {
              console.log(`❌ Column '${col}' does not exist`);
            } else {
              console.log(`✅ Column '${col}' exists`);
            }
          } catch (err) {
            console.log(`❓ Column '${col}' test failed:`, err.message);
          }
        }
      }
    } else {
      console.log('✅ Minimal insert successful:', data);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

checkActualColumns().catch(console.error);
