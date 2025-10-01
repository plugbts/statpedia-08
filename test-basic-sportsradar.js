// Test basic SportsRadar API endpoints
const SPORTRADAR_API_KEY = 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D';

async function testBasicEndpoints() {
  console.log('🔍 Testing basic SportsRadar API endpoints...\n');
  
  // Test basic NFL endpoints first
  const basicEndpoints = [
    // Basic NFL endpoints
    'https://api.sportradar.com/nfl/trial/v7/en/games/schedule.json',
    'https://api.sportradar.com/nfl/trial/v7/en/teams.json',
    'https://api.sportradar.com/nfl/trial/v7/en/league/hierarchy.json',
    
    // Try different base URLs
    'https://api.sportradar.us/nfl/trial/v7/en/games/schedule.json',
    'https://api.sportradar.us/nfl/trial/v7/en/teams.json',
    
    // Try different versions
    'https://api.sportradar.com/nfl/trial/v6/en/games/schedule.json',
    'https://api.sportradar.com/nfl/trial/v5/en/games/schedule.json',
    
    // Try without trial
    'https://api.sportradar.com/nfl/v7/en/games/schedule.json',
  ];
  
  for (const endpoint of basicEndpoints) {
    try {
      console.log(`📡 Testing: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        headers: {
          'X-API-Key': SPORTRADAR_API_KEY,
          'Accept': 'application/json',
          'User-Agent': 'Statpedia/1.0'
        }
      });
      
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ SUCCESS! Response type:', typeof data);
        console.log('✅ Response keys:', Object.keys(data));
        if (Array.isArray(data)) {
          console.log('✅ Array length:', data.length);
        }
        console.log('🎯 This endpoint works!');
        return endpoint;
      } else {
        const errorText = await response.text();
        console.log('❌ Error:', errorText.substring(0, 200));
      }
    } catch (error) {
      console.log('❌ Exception:', error.message);
    }
    
    console.log('---');
  }
  
  return null;
}

async function testPlayerPropsEndpoints(workingBaseUrl) {
  console.log('\n🔍 Testing Player Props endpoints...\n');
  
  if (!workingBaseUrl) {
    console.log('❌ No working base URL found, skipping player props tests');
    return;
  }
  
  // Extract base URL
  const baseUrl = workingBaseUrl.replace('/nfl/trial/v7/en/games/schedule.json', '');
  console.log(`🌐 Using base URL: ${baseUrl}`);
  
  const playerPropsEndpoints = [
    // Try different player props endpoint formats
    '/oddscomparison-player-props/trial/v2/en/sports/sr:sport:1/competitions',
    '/oddscomparison-player-props/trial/v2/en/competitions',
    '/oddscomparison-player-props/trial/v2/en/sports/sr:sport:1/categories',
    '/oddscomparison-player-props/trial/v2/en/sports/sr:sport:1/competition_schedules',
    '/oddscomparison-player-props/trial/v2/en/competition_schedules',
    
    // Try different versions
    '/oddscomparison-player-props/trial/v1/en/sports/sr:sport:1/competitions',
    '/oddscomparison-player-props/trial/v3/en/sports/sr:sport:1/competitions',
    
    // Try without trial
    '/oddscomparison-player-props/v2/en/sports/sr:sport:1/competitions',
    
    // Try different sport formats
    '/oddscomparison-player-props/trial/v2/en/sports/1/competitions',
    '/oddscomparison-player-props/trial/v2/en/sports/nfl/competitions',
  ];
  
  for (const endpoint of playerPropsEndpoints) {
    try {
      const fullUrl = `${baseUrl}${endpoint}`;
      console.log(`📡 Testing: ${fullUrl}`);
      
      const response = await fetch(fullUrl, {
        headers: {
          'X-API-Key': SPORTRADAR_API_KEY,
          'Accept': 'application/json',
          'User-Agent': 'Statpedia/1.0'
        }
      });
      
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ SUCCESS! Response type:', typeof data);
        console.log('✅ Response keys:', Object.keys(data));
        if (Array.isArray(data)) {
          console.log('✅ Array length:', data.length);
        }
        console.log('🎯 Player Props endpoint works!');
        return fullUrl;
      } else {
        const errorText = await response.text();
        console.log('❌ Error:', errorText.substring(0, 200));
      }
    } catch (error) {
      console.log('❌ Exception:', error.message);
    }
    
    console.log('---');
  }
  
  return null;
}

async function runTest() {
  console.log('🚀 Starting SportsRadar API Basic Test...\n');
  
  const workingEndpoint = await testBasicEndpoints();
  const workingPlayerPropsEndpoint = await testPlayerPropsEndpoints(workingEndpoint);
  
  console.log('\n🎯 SUMMARY:');
  if (workingEndpoint) {
    console.log('✅ Basic endpoint works:', workingEndpoint);
  } else {
    console.log('❌ No basic endpoints work');
  }
  
  if (workingPlayerPropsEndpoint) {
    console.log('✅ Player Props endpoint works:', workingPlayerPropsEndpoint);
  } else {
    console.log('❌ No Player Props endpoints work');
  }
  
  console.log('\n✅ Test completed!');
}

runTest();
