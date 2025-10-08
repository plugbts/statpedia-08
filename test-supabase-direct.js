#!/usr/bin/env node

/**
 * Test Supabase Direct Insert
 * 
 * This script tests the Supabase insert directly to see what response format we get.
 */

const SUPABASE_URL = 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g';

async function testSupabaseInsert() {
  console.log('🔍 Testing Supabase Direct Insert...\n');
  
  const timestamp = Date.now();
  const testProp = {
    player_id: `TEST_PLAYER_${timestamp}`,
    player_name: `Test Player ${timestamp}`,
    team: "TEST",
    opponent: "TEST2",
    season: 2025,
    date: "2025-10-08",
    prop_type: "Test Prop",
    sportsbook: "TestBook",
    line: 100.5,
    over_odds: -110,
    under_odds: -110,
    league: "nfl",
    game_id: `TEST-GAME-${timestamp}`,
    conflict_key: `TEST_CONFLICT_${timestamp}`
  };
  
  console.log('📊 Test data:', JSON.stringify(testProp, null, 2));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/proplines`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify([testProp])
    });
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log(`📊 Raw Response: "${responseText}"`);
    console.log(`📊 Response Length: ${responseText.length}`);
    
    if (response.ok) {
      if (responseText.trim() === '') {
        console.log('✅ Insert successful - Empty response (normal for Supabase inserts)');
        return true;
      } else {
        try {
          const data = JSON.parse(responseText);
          console.log('✅ Insert successful - JSON response:', JSON.stringify(data, null, 2));
          return true;
        } catch (e) {
          console.log('⚠️ Insert successful but response is not JSON:', responseText);
          return true;
        }
      }
    } else {
      console.log('❌ Insert failed:', responseText);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Insert failed with exception:', error.message);
    return false;
  }
}

async function testSupabaseQuery() {
  console.log('\n🔍 Testing Supabase Query...\n');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/proplines?limit=1&select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Query Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Query successful:', JSON.stringify(data, null, 2));
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Query failed:', errorText);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Query failed with exception:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Supabase Direct Access\n');
  
  const queryWorking = await testSupabaseQuery();
  const insertWorking = await testSupabaseInsert();
  
  console.log('\n📊 TEST SUMMARY:');
  console.log(`✅ Query Test: ${queryWorking ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Insert Test: ${insertWorking ? 'PASS' : 'FAIL'}`);
  
  if (queryWorking && insertWorking) {
    console.log('\n🎉 Supabase is working correctly!');
    console.log('🔧 The issue might be in the Worker\'s supabaseFetch function');
  } else {
    console.log('\n⚠️ Supabase has issues that need to be resolved');
  }
}

main().catch(console.error);
