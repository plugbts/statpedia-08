/**
 * Clear Historical Data Script
 * Removes existing player game logs to start fresh
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function clearHistoricalData(season = 2025) {
  try {
    console.log(`🗑️ Clearing historical data for season ${season}...`);
    
    // Count existing records
    const { count: beforeCount } = await supabase
      .from('playergamelogs')
      .select('*', { count: 'exact', head: true })
      .eq('season', season);
    
    console.log(`📊 Found ${beforeCount || 0} existing records for season ${season}`);
    
    if (beforeCount === 0) {
      console.log('✅ No data to clear');
      return;
    }
    
    // Delete records
    const { error } = await supabase
      .from('playergamelogs')
      .delete()
      .eq('season', season);
    
    if (error) {
      console.error('❌ Error clearing data:', error);
      throw error;
    }
    
    // Verify deletion
    const { count: afterCount } = await supabase
      .from('playergamelogs')
      .select('*', { count: 'exact', head: true })
      .eq('season', season);
    
    console.log(`✅ Cleared ${beforeCount - (afterCount || 0)} records`);
    console.log(`📊 Remaining records for season ${season}: ${afterCount || 0}`);
    
  } catch (error) {
    console.error('❌ Clear operation failed:', error);
    throw error;
  }
}

// Run the clear operation
if (import.meta.url === `file://${process.argv[1]}`) {
  const season = parseInt(process.argv[2]) || 2025;
  
  clearHistoricalData(season)
    .then(() => {
      console.log('✅ Clear operation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Clear operation failed:', error);
      process.exit(1);
    });
}

export { clearHistoricalData };
