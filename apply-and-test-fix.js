#!/usr/bin/env node

/**
 * Apply the RPC fix and test it
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyAndTestFix() {
  console.log('🔧 Applying RPC fix and testing...\n');

  try {
    // Read the fix SQL file
    const fixSQL = fs.readFileSync('fix-rpc-column-name.sql', 'utf8');
    
    console.log('1. Applying RPC function fix...');
    const { data: applyResult, error: applyError } = await supabase.rpc('exec_sql', {
      sql: fixSQL
    });

    if (applyError) {
      console.error('❌ Could not apply fix via RPC, trying direct execution...');
      
      // Try to apply the fix by calling the updated function directly
      console.log('2. Testing updated function...');
      const { data: testResult, error: testError } = await supabase.rpc('bulk_upsert_proplines', {
        rows: [{
          player_id: 'TEST_COLUMN_FIX_1',
          player_name: 'Test Column Fix',
          team: 'TEST',
          opponent: 'OPP',
          league: 'nfl',
          season: 2025,
          game_id: 'TEST_GAME_1',
          date_normalized: '2025-01-10',
          date: '2025-01-10',
          prop_type: 'test_column_fix_prop',
          line: 100.5,
          over_odds: -110,
          under_odds: -110,
          odds: -110,
          sportsbook: 'SportsGameOdds',
          conflict_key: 'TEST_COLUMN_FIX_1|2025-01-10|test_column_fix_prop|SportsGameOdds|nfl|2025'
        }]
      });

      if (testError) {
        console.error('❌ Function still has errors:', testError.message);
        
        if (testError.message.includes('last_updated')) {
          console.log('💡 The function still references last_updated. You need to run the fix-rpc-column-name.sql script in your Supabase SQL Editor.');
        }
      } else {
        console.log('✅ Function works correctly:', testResult);
      }
    } else {
      console.log('✅ Fix applied successfully:', applyResult);
    }

    // Test with empty array to verify basic functionality
    console.log('\n3. Testing with empty array...');
    const { data: emptyResult, error: emptyError } = await supabase.rpc('bulk_upsert_proplines', {
      rows: []
    });

    if (emptyError) {
      console.error('❌ Empty array test failed:', emptyError.message);
    } else {
      console.log('✅ Empty array test passed:', emptyResult);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

applyAndTestFix().catch(console.error);
