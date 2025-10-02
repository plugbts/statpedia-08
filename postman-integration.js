/**
 * Postman Integration Script
 * Connects to your Postman workspace and syncs with our development
 */

const https = require('https');
const fs = require('fs');

// Your Postman workspace details
const POSTMAN_CONFIG = {
  workspaceId: '4f4e954c-f368-4c54-b419-e3b4206b3f36',
  collectionId: '48955153-9a828761-a669-47c8-893d-2d26b5c645ef',
  apiKey: process.env.POSTMAN_API_KEY || 'your_postman_api_key_here'
};

// API endpoints we want to test
const TEST_ENDPOINTS = [
  {
    name: 'NFL Schedule 2025',
    url: 'https://api.sportradar.com/nfl/official/trial/v7/en/games/2025/REG/schedule.json',
    headers: {
      'x-api-key': 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
      'accept': 'application/json'
    },
    expectedStatus: 200
  },
  {
    name: 'NBA Schedule 2025',
    url: 'https://api.sportradar.com/nba/trial/v7/en/games/2025/REG/schedule.json',
    headers: {
      'x-api-key': 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
      'accept': 'application/json'
    },
    expectedStatus: 200
  },
  {
    name: 'MLB Schedule 2025',
    url: 'https://api.sportradar.com/mlb/trial/v7/en/games/2025/REG/schedule.json',
    headers: {
      'x-api-key': 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
      'accept': 'application/json'
    },
    expectedStatus: 200
  },
  {
    name: 'NFL Player Props',
    url: 'https://api.sportradar.com/oddscomparison/v1/en/sports/1/player_props.json',
    headers: {
      'x-api-key': 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
      'accept': 'application/json'
    },
    expectedStatus: [200, 403, 502] // May not work with trial key
  }
];

// Test function
async function testEndpoint(endpoint) {
  console.log(`🧪 Testing ${endpoint.name}...`);
  console.log(`URL: ${endpoint.url}`);
  
  try {
    const response = await fetch(endpoint.url, {
      method: 'GET',
      headers: endpoint.headers
    });
    
    const status = response.status;
    const expectedStatuses = Array.isArray(endpoint.expectedStatus) ? endpoint.expectedStatus : [endpoint.expectedStatus];
    const isExpected = expectedStatuses.includes(status);
    
    console.log(`Status: ${status} ${isExpected ? '✅' : '❌'}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success - Response structure:`, Object.keys(data));
      
      // Analyze response
      if (data.weeks) {
        console.log(`📅 Found ${data.weeks.length} weeks (NFL structure)`);
      } else if (data.games) {
        console.log(`🎮 Found ${data.games.length} games`);
      } else if (data.player_props) {
        console.log(`⚽ Found ${data.player_props.length} player props`);
      } else {
        console.log(`📊 Data structure:`, Object.keys(data));
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Error: ${status} - ${errorText.substring(0, 200)}...`);
    }
    
    return {
      name: endpoint.name,
      status: status,
      success: isExpected,
      url: endpoint.url
    };
    
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`);
    return {
      name: endpoint.name,
      status: 'ERROR',
      success: false,
      url: endpoint.url,
      error: error.message
    };
  }
}

// Generate Postman collection JSON for your workspace
function generatePostmanCollection() {
  const collection = {
    info: {
      name: "Statpedia Sports APIs - Cursor Integration",
      description: "Collection synced with Cursor development environment",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: TEST_ENDPOINTS.map(endpoint => ({
      name: endpoint.name,
      request: {
        method: "GET",
        header: Object.entries(endpoint.headers).map(([key, value]) => ({
          key: key,
          value: value,
          type: "text"
        })),
        url: {
          raw: endpoint.url,
          protocol: endpoint.url.split('://')[0],
          host: endpoint.url.split('://')[1].split('/'),
          path: endpoint.url.split('/').slice(3)
        }
      }
    }))
  };
  
  return collection;
}

// Main function
async function runPostmanIntegration() {
  console.log('🚀 Postman Integration with Cursor\n');
  console.log(`📋 Your Postman Workspace: https://lifesplugg-9889449.postman.co/workspace/Statpedia~${POSTMAN_CONFIG.workspaceId}`);
  console.log(`📁 Collection ID: ${POSTMAN_CONFIG.collectionId}\n`);
  
  // Test all endpoints
  console.log('🧪 Testing API Endpoints...\n');
  
  const results = [];
  for (const endpoint of TEST_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    console.log('---\n');
  }
  
  // Summary
  console.log('📊 Test Results Summary\n');
  
  const working = results.filter(r => r.success);
  const failing = results.filter(r => !r.success);
  
  console.log('✅ Working Endpoints:');
  working.forEach(result => {
    console.log(`  - ${result.name} (${result.status})`);
  });
  
  console.log('\n⚠️ Endpoints Requiring Attention:');
  failing.forEach(result => {
    console.log(`  - ${result.name} (${result.status})`);
  });
  
  // Generate collection JSON
  const collection = generatePostmanCollection();
  fs.writeFileSync('cursor-postman-collection.json', JSON.stringify(collection, null, 2));
  console.log('\n📁 Generated cursor-postman-collection.json for your Postman workspace');
  
  // Instructions
  console.log('\n🎯 Next Steps:');
  console.log('1. Import cursor-postman-collection.json into your Postman workspace');
  console.log('2. Test the endpoints in Postman');
  console.log('3. Use the working endpoints in our backend');
  console.log('4. Set up environment variables in Postman for easier testing');
  
  console.log('\n💡 Pro Tips:');
  console.log('- Use Postman environment variables for API keys');
  console.log('- Set up automated tests in Postman');
  console.log('- Use Postman monitors for API health checks');
  console.log('- Export collection for team sharing');
  
  return results;
}

// Run the integration
if (require.main === module) {
  runPostmanIntegration().catch(console.error);
}

module.exports = {
  runPostmanIntegration,
  testEndpoint,
  generatePostmanCollection,
  TEST_ENDPOINTS
};
