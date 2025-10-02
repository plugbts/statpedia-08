/**
 * Test Backend API Endpoints
 * Tests our backend API to ensure it's working properly
 */

const https = require('https');
const http = require('http');

// Test function
async function testEndpoint(url, method = 'GET', headers = {}) {
  console.log(`🧪 Testing ${method} ${url}...`);
  
  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        'accept': 'application/json',
        ...headers
      }
    });
    
    const status = response.status;
    console.log(`Status: ${status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success - Response:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
      return { success: true, status, data };
    } else {
      const errorText = await response.text();
      console.log(`❌ Error: ${status} - ${errorText.substring(0, 200)}...`);
      return { success: false, status, error: errorText };
    }
    
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`);
    return { success: false, status: 'ERROR', error: error.message };
  }
}

// Test SportsRadar API directly
async function testSportsRadarAPI() {
  console.log('🔗 Testing SportsRadar API Directly\n');
  
  const endpoints = [
    {
      name: 'NFL Schedule 2025',
      url: 'https://api.sportradar.com/nfl/official/trial/v7/en/games/2025/REG/schedule.json',
      headers: {
        'x-api-key': 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D'
      }
    },
    {
      name: 'NBA Schedule 2025',
      url: 'https://api.sportradar.com/nba/trial/v7/en/games/2025/REG/schedule.json',
      headers: {
        'x-api-key': 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D'
      }
    }
  ];
  
  const results = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.url, 'GET', endpoint.headers);
    results.push({ ...result, name: endpoint.name });
    console.log('---\n');
  }
  
  return results;
}

// Test our backend (if it exists)
async function testBackendAPI() {
  console.log('🔧 Testing Backend API\n');
  
  const endpoints = [
    {
      name: 'Health Check',
      url: 'http://localhost:8080/'
    },
    {
      name: 'Player Props (NFL)',
      url: 'http://localhost:8080/api/player-props?sport=nfl'
    },
    {
      name: 'Player Props (NBA)',
      url: 'http://localhost:8080/api/player-props?sport=nba'
    }
  ];
  
  const results = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.url);
    results.push({ ...result, name: endpoint.name });
    console.log('---\n');
  }
  
  return results;
}

// Main test function
async function runBackendTests() {
  console.log('🚀 Backend API Testing\n');
  
  // Test SportsRadar API
  const sportsRadarResults = await testSportsRadarAPI();
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test our backend
  const backendResults = await testBackendAPI();
  
  // Summary
  console.log('\n📊 Test Results Summary\n');
  
  console.log('🔗 SportsRadar API:');
  sportsRadarResults.forEach(result => {
    console.log(`  ${result.success ? '✅' : '❌'} ${result.name}: ${result.status}`);
  });
  
  console.log('\n🔧 Backend API:');
  backendResults.forEach(result => {
    console.log(`  ${result.success ? '✅' : '❌'} ${result.name}: ${result.status}`);
  });
  
  console.log('\n💡 Recommendations:');
  console.log('- If SportsRadar API returns 403, the API key may have expired');
  console.log('- If Backend API returns 404, we need to implement the API endpoints');
  console.log('- Use Postman to test the working endpoints');
  
  return {
    sportsRadar: sportsRadarResults,
    backend: backendResults
  };
}

// Run the tests
if (require.main === module) {
  runBackendTests().catch(console.error);
}

module.exports = {
  runBackendTests,
  testEndpoint,
  testSportsRadarAPI,
  testBackendAPI
};
