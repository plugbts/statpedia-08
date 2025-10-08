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
    const sampleRecord = {
      player_id: 'TEST_PLAYER_1_NFL',
      player_name: 'Test Player',
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

    console.log('📝 Sample record to insert:');
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
      console.log('✅ Insert successful!');
    } else {
      const errorText = await insertResponse.text();
      console.log('❌ Insert failed:');
      console.log(errorText);
    }

    // Clean up - delete the test record
    const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/proplines?player_id=eq.TEST_PLAYER_1_NFL`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (deleteResponse.ok) {
      console.log('🧹 Test record cleaned up');
    } else {
      console.log('⚠️  Could not clean up test record');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testSingleInsert().catch(console.error);
