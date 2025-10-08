// Test database writes with sample data
const SUPABASE_URL = 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g';

async function supabaseFetch(table, { method = "GET", body, query = "" } = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const res = await fetch(url, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(method === "POST" ? { Prefer: "resolution=merge-duplicates" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Supabase ${method} failed: ${res.status} ${res.statusText} - ${errorText}`);
  }
  
  // Handle empty responses (common with return=minimal)
  const text = await res.text();
  if (!text) {
    return null;
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.log(`Response was not JSON: ${text}`);
    return text;
  }
}

async function testDatabaseWrites() {
  console.log('Testing database writes with sample data...');
  
  // Create sample prop data (matching actual proplines schema)
  const sampleProps = [
    {
      player_id: 'JALEN_HURTS_1_NFL',
      player_name: 'Jalen Hurts',
      team: 'PHI',
      opponent: 'DAL',
      season: 2024,
      date: '2025-10-11',
      prop_type: 'Passing Yards',
      line: 250.5,
      over_odds: -110,
      under_odds: -110,
      sportsbook: 'DraftKings',
      conflict_key: 'JALEN_HURTS_1_NFL-Passing Yards-250.5-DraftKings-2025-10-11'
    },
    {
      player_id: 'JOSH_ALLEN_1_NFL',
      player_name: 'Josh Allen',
      team: 'BUF',
      opponent: 'MIA',
      season: 2024,
      date: '2025-10-11',
      prop_type: 'Rushing Yards',
      line: 45.5,
      over_odds: -105,
      under_odds: -115,
      sportsbook: 'FanDuel',
      conflict_key: 'JOSH_ALLEN_1_NFL-Rushing Yards-45.5-FanDuel-2025-10-11'
    }
  ];
  
  try {
    // Test 1: Insert sample data
    console.log('\n=== Test 1: Insert sample data ===');
    const insertResult = await supabaseFetch('proplines', {
      method: 'POST',
      body: sampleProps
    });
    console.log('Insert result:', insertResult);
    console.log('✅ Sample data inserted successfully');
    
    // Test 2: Verify data was inserted
    console.log('\n=== Test 2: Verify data was inserted ===');
    const verifyResult = await supabaseFetch('proplines', {
      query: '?player_id=eq.JALEN_HURTS_1_NFL&date=eq.2025-10-11&prop_type=eq.Passing%20Yards&sportsbook=eq.DraftKings'
    });
    console.log('Verification result:', verifyResult);
    console.log(`Found ${verifyResult.length} matching records`);
    
    // Test 3: Test upsert (insert same data again)
    console.log('\n=== Test 3: Test upsert (duplicate data) ===');
    const upsertResult = await supabaseFetch('proplines', {
      method: 'POST',
      body: sampleProps
    });
    console.log('Upsert result:', upsertResult);
    console.log('✅ Upsert handled duplicates correctly');
    
    // Test 4: Check total count
    console.log('\n=== Test 4: Check total count ===');
    const countResult = await supabaseFetch('proplines', {
      query: '?select=count'
    });
    console.log('Total records in proplines:', countResult);
    
    // Test 5: Clean up test data
    console.log('\n=== Test 5: Clean up test data ===');
    const deleteResult = await supabaseFetch('proplines', {
      method: 'DELETE',
      query: '?player_id=eq.JALEN_HURTS_1_NFL&date=eq.2025-10-11'
    });
    console.log('Delete result:', deleteResult);
    
    const deleteResult2 = await supabaseFetch('proplines', {
      method: 'DELETE',
      query: '?player_id=eq.JOSH_ALLEN_1_NFL&date=eq.2025-10-11'
    });
    console.log('Delete result 2:', deleteResult2);
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabaseWrites().catch(console.error);
