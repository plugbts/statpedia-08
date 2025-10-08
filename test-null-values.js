#!/usr/bin/env node

/**
 * Test NULL Values Issue
 * 
 * This script tests if NULL values are causing the insert failures
 */

const SUPABASE_URL = 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

async function testNullValues() {
  console.log('🔍 Testing NULL Values Issue');
  console.log('============================\n');

  try {
    const today = new Date().toISOString().split('T')[0];

    // Test 1: Record with NULL sportsbook (might be the issue)
    console.log('🧪 Test 1: Record with NULL sportsbook');
    const nullSportsbookRecord = {
      player_id: 'NULL_TEST_NFL',
      player_name: 'NULL Test Player',
      team: 'TEST',
      opponent: 'TEST_OPP',
      prop_type: 'Passing Yards',
      line: 250.5,
      over_odds: -110,
      under_odds: -110,
      sportsbook: null, // NULL sportsbook
      season: 2025,
      date: today
    };

    const nullSportsbookResponse = await fetch(`${SUPABASE_URL}/rest/v1/proplines`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(nullSportsbookRecord)
    });

    console.log(`   Status: ${nullSportsbookResponse.status} ${nullSportsbookResponse.statusText}`);
    
    if (!nullSportsbookResponse.ok) {
      const errorText = await nullSportsbookResponse.text();
      console.log(`   Error: ${errorText}`);
      console.log('   ❌ NULL sportsbook causes failure');
    } else {
      console.log('   ✅ NULL sportsbook works (has default value)');
    }

    // Clean up
    await fetch(`${SUPABASE_URL}/rest/v1/proplines?player_id=eq.NULL_TEST_NFL`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // Test 2: Record with NULL opponent (optional field)
    console.log('\n🧪 Test 2: Record with NULL opponent');
    const nullOpponentRecord = {
      player_id: 'NULL_TEST_2_NFL',
      player_name: 'NULL Test Player 2',
      team: 'TEST',
      opponent: null, // NULL opponent
      prop_type: 'Passing Yards',
      line: 250.5,
      over_odds: -110,
      under_odds: -110,
      sportsbook: 'Test Sportsbook',
      season: 2025,
      date: today
    };

    const nullOpponentResponse = await fetch(`${SUPABASE_URL}/rest/v1/proplines`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(nullOpponentRecord)
    });

    console.log(`   Status: ${nullOpponentResponse.status} ${nullOpponentResponse.statusText}`);
    
    if (!nullOpponentResponse.ok) {
      const errorText = await nullOpponentResponse.text();
      console.log(`   Error: ${errorText}`);
      console.log('   ❌ NULL opponent causes failure');
    } else {
      console.log('   ✅ NULL opponent works (optional field)');
    }

    // Clean up
    await fetch(`${SUPABASE_URL}/rest/v1/proplines?player_id=eq.NULL_TEST_2_NFL`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // Test 3: Record with missing required fields
    console.log('\n🧪 Test 3: Record with missing required fields');
    const incompleteRecord = {
      player_id: 'INCOMPLETE_TEST_NFL',
      player_name: 'Incomplete Test Player',
      // Missing team, opponent, prop_type, line, over_odds, under_odds, sportsbook, season, date
    };

    const incompleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/proplines`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(incompleteRecord)
    });

    console.log(`   Status: ${incompleteResponse.status} ${incompleteResponse.statusText}`);
    
    if (!incompleteResponse.ok) {
      const errorText = await incompleteResponse.text();
      console.log(`   Error: ${errorText}`);
      console.log('   ❌ Missing required fields cause failure');
    } else {
      console.log('   ✅ Missing required fields unexpectedly work');
    }

    // Clean up
    await fetch(`${SUPABASE_URL}/rest/v1/proplines?player_id=eq.INCOMPLETE_TEST_NFL`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n🧹 Cleanup complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testNullValues().catch(console.error);
