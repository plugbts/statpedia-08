#!/usr/bin/env node

/**
 * Test Duplicate Insert Issue
 * 
 * This script tests if the Edge Function is trying to insert duplicates
 */

const SUPABASE_URL = 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

async function testDuplicateInserts() {
  console.log('🔄 Testing Duplicate Insert Issue');
  console.log('==================================\n');

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Create a base record
    const baseRecord = {
      player_id: 'DUPLICATE_TEST_NFL',
      player_name: 'Duplicate Test Player',
      team: 'TEST',
      opponent: 'TEST_OPP',
      prop_type: 'Passing Yards',
      line: 250.5,
      over_odds: -110,
      under_odds: -110,
      sportsbook: 'Test Sportsbook',
      season: 2025,
      date: today
    };

    console.log('📝 Base record:');
    console.log(JSON.stringify(baseRecord, null, 2));

    // Test 1: Insert the first record (should work)
    console.log('\n🧪 Test 1: Inserting first record (should work)');
    const firstResponse = await fetch(`${SUPABASE_URL}/rest/v1/proplines`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(baseRecord)
    });

    console.log(`   Status: ${firstResponse.status} ${firstResponse.statusText}`);
    
    if (!firstResponse.ok) {
      const errorText = await firstResponse.text();
      console.log(`   Error: ${errorText}`);
    } else {
      console.log('   ✅ First insert successful');
    }

    // Test 2: Try to insert the exact same record (should fail with constraint violation)
    console.log('\n🧪 Test 2: Inserting duplicate record (should fail)');
    const duplicateResponse = await fetch(`${SUPABASE_URL}/rest/v1/proplines`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(baseRecord)
    });

    console.log(`   Status: ${duplicateResponse.status} ${duplicateResponse.statusText}`);
    
    if (!duplicateResponse.ok) {
      const errorText = await duplicateResponse.text();
      console.log(`   Error: ${errorText}`);
      console.log('   ✅ Duplicate insert correctly failed (constraint violation)');
    } else {
      console.log('   ⚠️  Duplicate insert unexpectedly succeeded');
    }

    // Test 3: Insert a different record (should work)
    console.log('\n🧪 Test 3: Inserting different record (should work)');
    const differentRecord = {
      ...baseRecord,
      player_id: 'DUPLICATE_TEST_2_NFL', // Different player_id
      player_name: 'Duplicate Test Player 2'
    };
    
    const differentResponse = await fetch(`${SUPABASE_URL}/rest/v1/proplines`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(differentRecord)
    });

    console.log(`   Status: ${differentResponse.status} ${differentResponse.statusText}`);
    
    if (!differentResponse.ok) {
      const errorText = await differentResponse.text();
      console.log(`   Error: ${errorText}`);
    } else {
      console.log('   ✅ Different record insert successful');
    }

    // Clean up all test records
    console.log('\n🧹 Cleaning up test records...');
    await fetch(`${SUPABASE_URL}/rest/v1/proplines?player_id=eq.DUPLICATE_TEST_NFL`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    await fetch(`${SUPABASE_URL}/rest/v1/proplines?player_id=eq.DUPLICATE_TEST_2_NFL`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Cleanup complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDuplicateInserts().catch(console.error);
