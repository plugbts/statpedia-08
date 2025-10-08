/**
 * Check the structure of the playeranalytics table
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

async function checkTableStructure() {
  console.log('🔍 Checking playeranalytics table structure...');
  
  try {
    // Try to select from the table to see what columns exist
    const { data, error } = await supabase
      .from('playeranalytics')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error selecting from table:', error);
      
      // Try to get column information
      const { data: columns, error: columnError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'playeranalytics')
        .eq('table_schema', 'public');
      
      if (columnError) {
        console.error('❌ Error getting column info:', columnError);
      } else {
        console.log('📋 Table columns:');
        columns?.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type}`);
        });
      }
    } else {
      console.log('✅ Table accessible, sample data:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

checkTableStructure().catch(console.error);
