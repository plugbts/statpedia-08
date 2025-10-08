// Test Supabase connection from the worker
const SUPABASE_URL = 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g';

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase connection...\n');
  
  try {
    // Test 1: Check if proplines table exists
    console.log('1. Testing proplines table access...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/proplines?select=count`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Prefer': 'count=exact'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ proplines table accessible:', data);
    } else {
      const errorText = await response.text();
      console.log('❌ proplines table error:', errorText);
    }
    
    // Test 2: Try to insert a simple test record
    console.log('\n2. Testing simple insert...');
    const testProp = {
      player_id: 'TEST_PLAYER_123',
      player_name: 'Test Player',
      team: 'TEST',
      opponent: 'OPP',
      season: 2025,
      date: '2025-01-01',
      prop_type: 'Test Prop',
      line: 1.5,
      over_odds: -110,
      under_odds: -110,
      sportsbook: 'Test Sportsbook'
    };
    
    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/proplines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify([testProp])
    });
    
    console.log('Insert response status:', insertResponse.status);
    
    if (insertResponse.ok) {
      const insertData = await insertResponse.text();
      console.log('✅ Insert successful:', insertData);
      
      // Clean up test record
      console.log('\n3. Cleaning up test record...');
      const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/proplines?player_id=eq.TEST_PLAYER_123`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY
        }
      });
      console.log('Delete response status:', deleteResponse.status);
    } else {
      const errorText = await insertResponse.text();
      console.log('❌ Insert failed:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSupabaseConnection();
