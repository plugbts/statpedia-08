#!/usr/bin/env node

/**
 * Test script to verify RPC constraint fixes
 * This script tests the bulk upsert functions to ensure they work properly
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPCConstraints() {
  console.log('🧪 Testing RPC constraint fixes...\n');

  try {
    // Test 1: Test proplines function with empty array
    console.log('1. Testing bulk_upsert_proplines with empty array...');
    const { data: proplinesResult, error: proplinesError } = await supabase.rpc('bulk_upsert_proplines', {
      rows: []
    });

    if (proplinesError) {
      console.error('❌ Proplines function error:', proplinesError.message);
    } else {
      console.log('✅ Proplines function works:', proplinesResult);
    }

    // Test 2: Test player_game_logs function with empty array
    console.log('\n2. Testing bulk_upsert_player_game_logs with empty array...');
    const { data: gameLogsResult, error: gameLogsError } = await supabase.rpc('bulk_upsert_player_game_logs', {
      rows: []
    });

    if (gameLogsError) {
      console.error('❌ Player game logs function error:', gameLogsError.message);
    } else {
      console.log('✅ Player game logs function works:', gameLogsResult);
    }

    // Test 3: Test with sample data (proplines)
    console.log('\n3. Testing bulk_upsert_proplines with sample data...');
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

    const { data: sampleProplinesResult, error: sampleProplinesError } = await supabase.rpc('bulk_upsert_proplines', {
      rows: sampleProplinesData
    });

    if (sampleProplinesError) {
      console.error('❌ Sample proplines data error:', sampleProplinesError.message);
    } else {
      console.log('✅ Sample proplines data works:', sampleProplinesResult);
    }

    // Test 4: Test with sample data (player_game_logs)
    console.log('\n4. Testing bulk_upsert_player_game_logs with sample data...');
    const sampleGameLogsData = [
      {
        player_id: 'TEST_PLAYER_1',
        player_name: 'Test Player',
        team: 'TEST',
        opponent: 'OPP',
        season: 2025,
        date: '2025-01-10',
        prop_type: 'test_prop',
        value: 105.0,
        sport: 'NFL',
        league: 'nfl',
        game_id: 'TEST_GAME_1',
        home_away: 'HOME',
        weather_conditions: 'Clear',
        injury_status: 'Healthy'
      }
    ];

    const { data: sampleGameLogsResult, error: sampleGameLogsError } = await supabase.rpc('bulk_upsert_player_game_logs', {
      rows: sampleGameLogsData
    });

    if (sampleGameLogsError) {
      console.error('❌ Sample game logs data error:', sampleGameLogsError.message);
    } else {
      console.log('✅ Sample game logs data works:', sampleGameLogsResult);
    }

    // Test 5: Test duplicate handling (should update, not insert)
    console.log('\n5. Testing duplicate handling (should update existing row)...');
    const { data: duplicateResult, error: duplicateError } = await supabase.rpc('bulk_upsert_proplines', {
      rows: sampleProplinesData // Same data as before
    });

    if (duplicateError) {
      console.error('❌ Duplicate handling error:', duplicateError.message);
    } else {
      console.log('✅ Duplicate handling works (should show 1 update):', duplicateResult);
    }

    console.log('\n🎉 All RPC constraint tests completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the test
testRPCConstraints().catch(console.error);
