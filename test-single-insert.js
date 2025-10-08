#!/usr/bin/env node

/**
 * Test Single Insert to Database
 * 
 * This script tests inserting a single record to see what the actual error is
 */

const SUPABASE_URL = 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

async function testSingleInsert() {
  console.log('🧪 Testing Single Database Insert');
  console.log('==================================\n');

  try {
    // Test inserting a sample record
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    // Test different data formats to match what Edge Function might send
    const sampleRecord = {
      player_id: 'TEST_PLAYER_1_NFL',
      player_name: 'Test Player',
      team: 'TEST',
      opponent: 'TEST_OPP',
      prop_type: 'Passing Yards',
      line: 250.5,  // Test as number
      over_odds: -110,  // Test as number
      under_odds: -110,  // Test as number
      sportsbook: 'Test Sportsbook',
      season: 2025,  // Test as number
      date: today  // Test as string "YYYY-MM-DD"
    };

    console.log('📝 Testing with numeric types:');
    console.log(JSON.stringify(sampleRecord, null, 2));

    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/proplines`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(sampleRecord)
    });

    console.log(`\n📊 Insert Response Status: ${insertResponse.status} ${insertResponse.statusText}`);
    
    if (insertResponse.ok) {
      console.log('✅ Insert successful with numeric types!');
    } else {
      const errorText = await insertResponse.text();
      console.log('❌ Insert failed with numeric types:');
      console.log(errorText);
    }

    // Clean up
    await fetch(`${SUPABASE_URL}/rest/v1/proplines?player_id=eq.TEST_PLAYER_1_NFL`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // Now test with string formats (what Edge Function might send)
    console.log('\n🧪 Testing with string formats (like Edge Function might send):');
    const stringRecord = {
      player_id: 'TEST_PLAYER_2_NFL',
      player_name: 'Test Player 2',
      team: 'TEST',
      opponent: 'TEST_OPP',
      prop_type: 'Passing Yards',
      line: '250.5',  // String instead of number
      over_odds: '-110',  // String instead of number
      under_odds: '-110',  // String instead of number
      sportsbook: 'Test Sportsbook',
      season: '2025',  // String instead of number
      date: today
    };

    console.log(JSON.stringify(stringRecord, null, 2));

    const stringInsertResponse = await fetch(`${SUPABASE_URL}/rest/v1/proplines`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(stringRecord)
    });

    console.log(`\n📊 String Insert Response Status: ${stringInsertResponse.status} ${stringInsertResponse.statusText}`);
    
    if (stringInsertResponse.ok) {
      console.log('✅ Insert successful with string types!');
    } else {
      const errorText = await stringInsertResponse.text();
      console.log('❌ Insert failed with string types:');
      console.log(errorText);
    }

    // Clean up both test records
    await fetch(`${SUPABASE_URL}/rest/v1/proplines?player_id=eq.TEST_PLAYER_1_NFL`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    await fetch(`${SUPABASE_URL}/rest/v1/proplines?player_id=eq.TEST_PLAYER_2_NFL`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('🧹 Test records cleaned up');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testSingleInsert().catch(console.error);
