#!/usr/bin/env node

/**
 * Test Service Role vs Anon Key
 * 
 * This script tests if RLS is blocking the Edge Function
 */

const SUPABASE_URL = 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';
// You'll need to get your service role key from Supabase Dashboard > Settings > API
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE'; // Replace with actual service role key

async function testServiceRole() {
  console.log('🔐 Testing Service Role vs Anon Key');
  console.log('====================================\n');

  try {
    const today = new Date().toISOString().split('T')[0];
    const sampleRecord = {
      player_id: 'SERVICE_ROLE_TEST_NFL',
      player_name: 'Service Role Test',
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

    // Test with anon key (what Edge Function currently uses)
    console.log('🔑 Testing with ANON key (current Edge Function approach):');
    const anonResponse = await fetch(`${SUPABASE_URL}/rest/v1/proplines`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(sampleRecord)
    });

    console.log(`   Status: ${anonResponse.status} ${anonResponse.statusText}`);
    
    if (!anonResponse.ok) {
      const errorText = await anonResponse.text();
      console.log(`   Error: ${errorText}`);
    } else {
      console.log('   ✅ Anon key works');
    }

    // Clean up
    await fetch(`${SUPABASE_URL}/rest/v1/proplines?player_id=eq.SERVICE_ROLE_TEST_NFL`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
      console.log('\n⚠️  To test service role key:');
      console.log('   1. Go to Supabase Dashboard > Settings > API');
      console.log('   2. Copy the "service_role" key');
      console.log('   3. Replace YOUR_SERVICE_ROLE_KEY_HERE in this script');
      console.log('   4. Run again');
      return;
    }

    // Test with service role key (bypasses RLS)
    console.log('\n🔑 Testing with SERVICE ROLE key (bypasses RLS):');
    const serviceResponse = await fetch(`${SUPABASE_URL}/rest/v1/proplines`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(sampleRecord)
    });

    console.log(`   Status: ${serviceResponse.status} ${serviceResponse.statusText}`);
    
    if (!serviceResponse.ok) {
      const errorText = await serviceResponse.text();
      console.log(`   Error: ${errorText}`);
    } else {
      console.log('   ✅ Service role key works');
    }

    // Clean up
    await fetch(`${SUPABASE_URL}/rest/v1/proplines?player_id=eq.SERVICE_ROLE_TEST_NFL`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n🧹 Test records cleaned up');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testServiceRole().catch(console.error);
