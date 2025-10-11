#!/usr/bin/env node

/**
 * Final comprehensive test of RPC functions
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function finalRpcTest() {
  console.log('🧪 Final RPC Function Test Results\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Empty array (should always work)
    console.log('\n1️⃣  Testing empty array handling...');
    const { data: emptyResult, error: emptyError } = await supabase.rpc('bulk_upsert_proplines', {
      rows: []
    });

    if (emptyError) {
      console.error('❌ Empty array test failed:', emptyError.message);
    } else {
      console.log('✅ Empty array test passed');
    }

    // Test 2: Sample data (will show current issues)
    console.log('\n2️⃣  Testing with sample data...');
    const sampleData = [{
      player_id: 'FINAL_TEST_1',
      player_name: 'Final Test Player',
      team: 'TEST',
      opponent: 'OPP',
      league: 'nfl',
      season: 2025,
      game_id: 'FINAL_TEST_GAME',
      date_normalized: '2025-01-10',
      date: '2025-01-10',
      prop_type: 'final_test_prop',
      line: 100.5,
      over_odds: -110,
      under_odds: -110,
      odds: -110,
      sportsbook: 'SportsGameOdds',
      conflict_key: 'FINAL_TEST_1|2025-01-10|final_test_prop|SportsGameOdds|nfl|2025'
    }];

    const { data: sampleResult, error: sampleError } = await supabase.rpc('bulk_upsert_proplines', {
      rows: sampleData
    });

    if (sampleError) {
      console.error('❌ Sample data test failed:', sampleError.message);
    } else {
      console.log('✅ Sample data test result:', sampleResult);
      
      if (sampleResult && sampleResult[0] && sampleResult[0].error_count > 0) {
        console.log('⚠️  Errors found:', JSON.stringify(sampleResult[0].errors, null, 2));
      }
    }

    // Test 3: Player game logs function
    console.log('\n3️⃣  Testing player_game_logs function...');
    const { data: gameLogsResult, error: gameLogsError } = await supabase.rpc('bulk_upsert_player_game_logs', {
      rows: []
    });

    if (gameLogsError) {
      console.error('❌ Player game logs test failed:', gameLogsError.message);
    } else {
      console.log('✅ Player game logs test passed');
    }

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📋 TEST SUMMARY');
    console.log('=' .repeat(50));
    
    if (emptyError || gameLogsError) {
      console.log('❌ CRITICAL ISSUES: Basic functionality is broken');
      console.log('   - Syntax errors or missing functions');
    } else {
      console.log('✅ BASIC FUNCTIONALITY: RPC functions are accessible');
      
      if (sampleResult && sampleResult[0] && sampleResult[0].error_count > 0) {
        const error = sampleResult[0].errors[0];
        console.log('⚠️  DATA ISSUES:');
        
        if (error.error.includes('last_updated')) {
          console.log('   - Column name mismatch: function expects "last_updated" but table has "updated_at"');
          console.log('   - SOLUTION: Run fix-rpc-column-name.sql in Supabase SQL Editor');
        } else if (error.error.includes('constraint')) {
          console.log('   - Missing unique constraint on proplines table');
          console.log('   - SOLUTION: Run fix-proplines-constraint.sql in Supabase SQL Editor');
        } else {
          console.log('   - Other data issue:', error.error);
        }
      } else {
        console.log('✅ ALL TESTS PASSED: RPC functions are working correctly!');
      }
    }

    console.log('\n📝 NEXT STEPS:');
    console.log('1. If you see column name issues, run: fix-rpc-column-name.sql');
    console.log('2. If you see constraint issues, run: fix-proplines-constraint.sql');
    console.log('3. If you see syntax errors, the functions need to be recreated');
    console.log('4. All fixes should be applied in Supabase SQL Editor');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

finalRpcTest().catch(console.error);
