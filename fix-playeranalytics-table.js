/**
 * Fix playeranalytics table by adding missing direction column
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

async function fixPlayerAnalyticsTable() {
  console.log('🔧 Fixing playeranalytics table...');
  
  const addDirectionColumnSQL = `
    ALTER TABLE playeranalytics 
    ADD COLUMN IF NOT EXISTS direction VARCHAR(8) DEFAULT 'over';
    
    -- Update existing records to have a direction
    UPDATE playeranalytics SET direction = 'over' WHERE direction IS NULL;
    
    -- Make direction NOT NULL
    ALTER TABLE playeranalytics 
    ALTER COLUMN direction SET NOT NULL;
    
    -- Drop the old unique constraint if it exists
    ALTER TABLE playeranalytics 
    DROP CONSTRAINT IF EXISTS playeranalytics_player_id_prop_type_line_direction_season_key;
    
    -- Add the correct unique constraint
    ALTER TABLE playeranalytics 
    ADD CONSTRAINT playeranalytics_player_id_prop_type_line_direction_key 
    UNIQUE (player_id, prop_type, line, direction);
  `;

  try {
    // Try to add the direction column using RPC
    const { error: rpcError } = await supabase.rpc('exec_sql', { sql: addDirectionColumnSQL });
    
    if (rpcError) {
      console.log('⚠️ RPC method failed:', rpcError.message);
      console.log('\n💡 MANUAL SOLUTION:');
      console.log('1. Go to: https://supabase.com/dashboard/project/oalssjwhzbukrswjriaj');
      console.log('2. Navigate to: SQL Editor');
      console.log('3. Run this SQL:');
      console.log(addDirectionColumnSQL);
      console.log('4. Then run: node nightlyJob.js');
    } else {
      console.log('✅ Direction column added successfully');
      
      // Test the fix
      const { error: testError } = await supabase
        .from('playeranalytics')
        .select('direction')
        .limit(1);
      
      if (testError) {
        console.error('❌ Test failed:', testError);
      } else {
        console.log('✅ Table fix verified - direction column is accessible');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixPlayerAnalyticsTable().catch(console.error);
