// Debug script for SportsRadar API
const SPORTRADAR_API_KEY = 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D';

async function testSportsRadarEndpoints() {
  console.log('🔍 Debugging SportsRadar API...\n');
  
  // Test different base URLs and endpoint formats
  const baseUrls = [
    'https://api.sportradar.com',
    'https://api.sportradar.us'
  ];
  
  const endpoints = [
    // Player Props API endpoints
    '/oddscomparison-player-props/trial/v2/en/sports/sr:sport:1/competitions',
    '/oddscomparison-player-props/trial/v2/en/competitions',
    '/oddscomparison-player-props/trial/v2/en/sports/sr:sport:1/categories',
    '/oddscomparison-player-props/trial/v2/en/sports/sr:sport:1/competition_schedules',
    '/oddscomparison-player-props/trial/v2/en/competition_schedules',
    
    // Regular odds comparison endpoints
    '/oddscomparison/nfl/trial/v2/en/sports/sr:sport:1/competitions',
    '/oddscomparison/nfl/trial/v2/en/competitions',
    '/oddscomparison/nfl/trial/v2/en/sports/sr:sport:1/categories',
    
    // Core sports data endpoints
    '/nfl/trial/v7/en/games/schedule.json',
    '/nfl/trial/v7/en/league/hierarchy.json',
    '/nfl/trial/v7/en/teams.json',
    
    // Different sport IDs
    '/oddscomparison-player-props/trial/v2/en/sports/sr:sport:2/competitions', // NBA
    '/oddscomparison-player-props/trial/v2/en/sports/sr:sport:3/competitions', // MLB
    '/oddscomparison-player-props/trial/v2/en/sports/sr:sport:4/competitions', // NHL
  ];
  
  const headers = [
    { 'X-API-Key': SPORTRADAR_API_KEY },
    { 'x-api-key': SPORTRADAR_API_KEY },
    { 'Authorization': `Bearer ${SPORTRADAR_API_KEY}` },
    { 'api-key': SPORTRADAR_API_KEY }
  ];
  
  let workingEndpoints = [];
  
  for (const baseUrl of baseUrls) {
    console.log(`\n🌐 Testing base URL: ${baseUrl}`);
    
    for (const endpoint of endpoints) {
      const fullUrl = `${baseUrl}${endpoint}`;
      
      for (const headerSet of headers) {
        try {
          console.log(`📡 Testing: ${fullUrl}`);
          console.log(`🔑 Headers: ${JSON.stringify(headerSet)}`);
          
          const response = await fetch(fullUrl, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Statpedia/1.0',
              ...headerSet
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
            workingEndpoints.push({ url: fullUrl, headers: headerSet, data });
            break; // Found working combination, move to next endpoint
          } else {
            const errorText = await response.text();
            console.log('❌ Error:', errorText.substring(0, 200));
          }
        } catch (error) {
          console.log('❌ Exception:', error.message);
        }
      }
      
      console.log('---');
    }
  }
  
  console.log('\n🎯 SUMMARY:');
  if (workingEndpoints.length > 0) {
    console.log('✅ Working endpoints found:');
    workingEndpoints.forEach((ep, index) => {
      console.log(`${index + 1}. ${ep.url}`);
      console.log(`   Headers: ${JSON.stringify(ep.headers)}`);
    });
  } else {
    console.log('❌ No working endpoints found');
  }
  
  return workingEndpoints;
}

async function testAPIKeyValidity() {
  console.log('\n🔑 Testing API Key validity...');
  
  // Test with a simple endpoint that should work
  const testEndpoints = [
    'https://api.sportradar.com/nfl/trial/v7/en/teams.json',
    'https://api.sportradar.us/nfl/trial/v7/en/teams.json'
  ];
  
  for (const endpoint of testEndpoints) {
    try {
      console.log(`📡 Testing: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        headers: {
          'X-API-Key': SPORTRADAR_API_KEY,
          'Accept': 'application/json'
        }
      });
      
      console.log(`📊 Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API Key is valid! Teams count:', data.teams?.length || 'Unknown');
        return true;
      } else {
        const errorText = await response.text();
        console.log('❌ Error:', errorText);
      }
    } catch (error) {
      console.log('❌ Exception:', error.message);
    }
  }
  
  return false;
}

async function runDebug() {
  console.log('🚀 Starting SportsRadar API Debug...\n');
  
  const isKeyValid = await testAPIKeyValidity();
  
  if (isKeyValid) {
    console.log('\n✅ API Key is valid, testing endpoints...');
    await testSportsRadarEndpoints();
  } else {
    console.log('\n❌ API Key appears to be invalid or expired');
  }
  
  console.log('\n✅ Debug completed!');
}

runDebug();
