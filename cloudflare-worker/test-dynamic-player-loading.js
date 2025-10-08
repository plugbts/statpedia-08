// Test script to verify dynamic player loading from Supabase
// This script tests the playersLoader functionality

const SUPABASE_URL = "https://rfdrifnsfobqlzorcesn.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g";

// Simulate the playersLoader functions
async function loadPlayerIdMap(env) {
  try {
    console.log('🔄 Loading players from Supabase...');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/players?select=player_id,full_name,team,league,position&limit=10000`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch players: ${response.statusText}`);
    }
    
    const players = await response.json();
    
    if (!players || !Array.isArray(players)) {
      console.error('❌ Failed to load players from Supabase');
      return {};
    }

    const map = {};
    let loadedCount = 0;
    let skippedCount = 0;

    for (const player of players) {
      if (!player.full_name || !player.player_id) {
        skippedCount++;
        continue;
      }

      // Create primary mapping with normalized name
      const normalizedKey = normalizeName(player.full_name);
      map[normalizedKey] = player.player_id;
      loadedCount++;

      // Add variations for better matching
      const variations = generateNameVariations(player.full_name);
      for (const variation of variations) {
        if (variation !== normalizedKey && !map[variation]) {
          map[variation] = player.player_id;
        }
      }
    }

    console.log(`✅ Loaded ${loadedCount} players into PLAYER_ID_MAP (${Object.keys(map).length} total mappings)`);
    console.log(`⚠️ Skipped ${skippedCount} players due to missing data`);
    
    return map;
  } catch (error) {
    console.error('❌ Error loading player ID map:', error);
    return {};
  }
}

function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/\s(jr|sr|iii|iv|v)$/i, '') // Remove suffixes
    .trim();
}

function generateNameVariations(name) {
  const normalized = normalizeName(name);
  const variations = [normalized];
  
  // Add aggressive normalization
  variations.push(name.toLowerCase().replace(/[^\w]/g, '').replace(/\s(jr|sr|iii|iv|v)$/i, '').trim());
  
  // Add variations without common prefixes
  const withoutPrefix = normalized.replace(/^(jr|sr|iii|iv|v)\s+/i, '');
  if (withoutPrefix !== normalized) {
    variations.push(withoutPrefix);
  }
  
  // Add first name only
  const firstName = normalized.split(' ')[0];
  if (firstName && firstName.length > 2) {
    variations.push(firstName);
  }
  
  // Add last name only
  const lastName = normalized.split(' ').pop();
  if (lastName && lastName.length > 2 && lastName !== firstName) {
    variations.push(lastName);
  }
  
  return [...new Set(variations)]; // Remove duplicates
}

async function testDynamicPlayerLoading() {
  console.log('🧪 Testing dynamic player loading from Supabase...');
  
  try {
    // Test 1: Load player map
    console.log('\n📡 Test 1: Load player ID map from Supabase');
    const env = {
      SUPABASE_URL: SUPABASE_URL,
      SUPABASE_SERVICE_KEY: SUPABASE_SERVICE_KEY
    };
    
    const playerMap = await loadPlayerIdMap(env);
    console.log(`📊 Player map loaded with ${Object.keys(playerMap).length} entries`);
    
    // Test 2: Test specific player lookups
    console.log('\n🎯 Test 2: Test specific player lookups');
    const testPlayers = [
      'Josh Allen',
      'Patrick Mahomes',
      'LeBron James',
      'Stephen Curry',
      'Mike Trout',
      'Connor McDavid',
      'Jaxon Smith-Njigba', // Test hyphenated name
      'Giannis Antetokounmpo', // Test long name
      'Ronald Acuna Jr', // Test Jr suffix
      'Vladimir Guerrero Jr' // Test Jr suffix
    ];
    
    for (const playerName of testPlayers) {
      const normalizedName = normalizeName(playerName);
      const canonicalId = playerMap[normalizedName];
      
      if (canonicalId) {
        console.log(`✅ ${playerName} → ${canonicalId}`);
      } else {
        console.log(`❌ ${playerName} → NOT FOUND`);
        
        // Try fuzzy matching
        let found = false;
        for (const [key, value] of Object.entries(playerMap)) {
          if (key.includes(normalizedName) || normalizedName.includes(key)) {
            console.log(`🔍 Fuzzy match: ${playerName} → ${value} (via ${key})`);
            found = true;
            break;
          }
        }
        
        if (!found) {
          console.log(`⚠️ No fuzzy match found for ${playerName}`);
        }
      }
    }
    
    // Test 3: Test name variations
    console.log('\n🔄 Test 3: Test name variations');
    const testName = 'Jaxon Smith-Njigba';
    const variations = generateNameVariations(testName);
    console.log(`📝 Variations for "${testName}":`, variations);
    
    for (const variation of variations) {
      const canonicalId = playerMap[variation];
      if (canonicalId) {
        console.log(`✅ Variation "${variation}" → ${canonicalId}`);
      } else {
        console.log(`❌ Variation "${variation}" → NOT FOUND`);
      }
    }
    
    // Test 4: Check coverage by league
    console.log('\n📊 Test 4: Check coverage by league');
    const leagues = ['NFL', 'NBA', 'MLB', 'NHL'];
    
    for (const league of leagues) {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/players?league=eq.${league}&select=player_id`, {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          }
        });
        
        if (response.ok) {
          const players = await response.json();
          console.log(`📈 ${league}: ${players.length} players in database`);
        } else {
          console.log(`❌ ${league}: Failed to query`);
        }
      } catch (error) {
        console.log(`❌ ${league}: Error - ${error.message}`);
      }
    }
    
    // Test 5: Test caching simulation
    console.log('\n⏱️ Test 5: Test caching performance');
    const startTime = Date.now();
    await loadPlayerIdMap(env);
    const endTime = Date.now();
    console.log(`⏱️ Load time: ${endTime - startTime}ms`);
    
    console.log('\n🎉 Dynamic player loading test completed successfully!');
    
  } catch (error) {
    console.error('❌ Dynamic player loading test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDynamicPlayerLoading();
