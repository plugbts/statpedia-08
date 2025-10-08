/**
 * Test inserting a record into playeranalytics table
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

async function testInsert() {
  console.log('🧪 Testing insert into playeranalytics table...');
  
  const testRecord = {
    player_id: 'TEST_PLAYER_1',
    player_name: 'Test Player',
    prop_type: 'Receptions',
    line: 5.5,
    direction: 'over',
    season_hits: 10,
    season_total: 20,
    season_pct: 50.0,
    l20_hits: 5,
    l20_total: 10,
    l20_pct: 50.0,
    l10_hits: 3,
    l10_total: 6,
    l10_pct: 50.0,
    l5_hits: 2,
    l5_total: 4,
    l5_pct: 50.0,
    streak_current: 2,
    streak_longest: 3,
    streak_direction: 'over',
    last_computed_at: new Date().toISOString(),
    season: 2025
  };
  
  try {
    const { data, error } = await supabase
      .from('playeranalytics')
      .insert([testRecord]);
    
    if (error) {
      console.error('❌ Insert error:', error);
    } else {
      console.log('✅ Test insert successful:', data);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

testInsert().catch(console.error);
