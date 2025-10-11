#!/usr/bin/env node

/**
 * Debug script to check specific RPC errors
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugRPCErrors() {
  console.log('🔍 Debugging RPC errors...\n');

  // Test proplines with detailed error logging
  const sampleProplinesData = [
    {
      player_id: 'TEST_PLAYER_1',
      player_name: 'Test Player',
      team: 'TEST',
      opponent: 'OPP',
      league: 'nfl',
      season: 2025,
      game_id: 'TEST_GAME_1',
      date_normalized: '2025-01-10',
      date: '2025-01-10',
      prop_type: 'test_prop',
      line: 100.5,
      over_odds: -110,
      under_odds: -110,
      odds: -110,
      sportsbook: 'SportsGameOdds',
      conflict_key: 'TEST_PLAYER_1|2025-01-10|test_prop|SportsGameOdds|nfl|2025'
    }
  ];

  console.log('Testing proplines function...');
  const { data: result, error } = await supabase.rpc('bulk_upsert_proplines', {
    rows: sampleProplinesData
  });

  if (error) {
    console.error('❌ Function error:', error);
  } else {
    console.log('✅ Function result:', JSON.stringify(result, null, 2));
    
    if (result && result[0] && result[0].errors && result[0].errors.length > 0) {
      console.log('❌ Detailed errors:', JSON.stringify(result[0].errors, null, 2));
    }
  }

  // Check if the proplines table exists and has the right structure
  console.log('\nChecking proplines table structure...');
  const { data: tableInfo, error: tableError } = await supabase
    .from('proplines')
    .select('*')
    .limit(1);

  if (tableError) {
    console.error('❌ Table access error:', tableError.message);
  } else {
    console.log('✅ Table accessible');
  }

  // Check constraints
  console.log('\nChecking table constraints...');
  const { data: constraints, error: constraintError } = await supabase.rpc('check_table_constraints', {
    table_name: 'proplines'
  });

  if (constraintError) {
    console.log('⚠️  Could not check constraints (function may not exist):', constraintError.message);
  } else {
    console.log('✅ Constraints:', JSON.stringify(constraints, null, 2));
  }
}

debugRPCErrors().catch(console.error);
