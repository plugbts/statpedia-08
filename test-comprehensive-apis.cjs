/**
 * Comprehensive API Testing
 * Tests all our APIs and provides detailed results for Postman setup
 */

const https = require('https');
const http = require('http');

// Test configuration
const TEST_CONFIG = {
  sportsRadarAPIKey: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  devServerUrl: 'http://localhost:8084',
  currentYear: '2025',
  currentDate: '2025-01-05'
};

// Test function
async function testEndpoint(name, url, method = 'GET', headers = {}) {
  console.log(`🧪 Testing ${name}...`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        'accept': 'application/json',
        ...headers
      }
    });
    
    const status = response.status;
    const isSuccess = status >= 200 && status < 300;
    
    console.log(`Status: ${status} ${isSuccess ? '✅' : '❌'}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success - Response structure:`, Object.keys(data));
      
      // Analyze response based on endpoint type
      if (name.includes('Schedule')) {
        if (data.weeks) {
          console.log(`📅 Found ${data.weeks.length} weeks (NFL structure)`);
        } else if (data.games) {
          console.log(`🎮 Found ${data.games.length} games`);
        } else if (data.league) {
          console.log(`🏆 League: ${data.league.name}`);
        }
      } else if (name.includes('Player Props')) {
        if (data.player_props) {
          console.log(`⚽ Found ${data.player_props.length} player props`);
        } else if (Array.isArray(data)) {
          console.log(`📊 Found ${data.length} items`);
        }
      } else if (name.includes('Teams')) {
        if (data.conferences) {
          console.log(`🏈 Found ${data.conferences.length} conferences`);
        } else if (data.teams) {
          console.log(`👥 Found ${data.teams.length} teams`);
        }
      }
      
      return {
        name,
        status,
        success: true,
        url,
        data: data,
        responseTime: Date.now()
      };
    } else {
      const errorText = await response.text();
      console.log(`❌ Error: ${status} - ${errorText.substring(0, 200)}...`);
      return {
        name,
        status,
        success: false,
        url,
        error: errorText,
        responseTime: Date.now()
      };
    }
    
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`);
    return {
      name,
      status: 'ERROR',
      success: false,
      url,
      error: error.message,
      responseTime: Date.now()
    };
  }
}

// Test SportsRadar Core APIs
async function testSportsRadarCore() {
  console.log('🔗 Testing SportsRadar Core APIs\n');
  
  const endpoints = [
    {
      name: 'NFL Schedule 2025',
      url: `https://api.sportradar.com/nfl/official/trial/v7/en/games/${TEST_CONFIG.currentYear}/REG/schedule.json`,
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    },
    {
      name: 'NBA Schedule 2025',
      url: `https://api.sportradar.com/nba/trial/v7/en/games/${TEST_CONFIG.currentYear}/REG/schedule.json`,
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    },
    {
      name: 'MLB Schedule 2025',
      url: `https://api.sportradar.com/mlb/trial/v7/en/games/${TEST_CONFIG.currentYear}/REG/schedule.json`,
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    },
    {
      name: 'NHL Schedule 2025',
      url: `https://api.sportradar.com/nhl/trial/v7/en/games/${TEST_CONFIG.currentYear}/REG/schedule.json`,
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    },
    {
      name: 'NFL Teams',
      url: 'https://api.sportradar.com/nfl/official/trial/v7/en/league/hierarchy.json',
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    },
    {
      name: 'NBA Teams',
      url: 'https://api.sportradar.com/nba/trial/v7/en/league/hierarchy.json',
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    }
  ];
  
  const results = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.name, endpoint.url, 'GET', endpoint.headers);
    results.push(result);
    console.log('---\n');
  }
  
  return results;
}

// Test SportsRadar Odds APIs
async function testSportsRadarOdds() {
  console.log('🎯 Testing SportsRadar Odds APIs\n');
  
  const endpoints = [
    {
      name: 'Books (Bookmakers)',
      url: 'https://api.sportradar.com/oddscomparison/v1/en/books.json',
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    },
    {
      name: 'NFL Player Props',
      url: 'https://api.sportradar.com/oddscomparison/v1/en/sports/1/player_props.json',
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    },
    {
      name: 'NBA Player Props',
      url: 'https://api.sportradar.com/oddscomparison/v1/en/sports/2/player_props.json',
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    },
    {
      name: 'Daily Schedules',
      url: `https://api.sportradar.com/oddscomparison/v1/en/schedules/${TEST_CONFIG.currentDate}.json`,
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    }
  ];
  
  const results = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.name, endpoint.url, 'GET', endpoint.headers);
    results.push(result);
    console.log('---\n');
  }
  
  return results;
}

// Test our Backend APIs
async function testBackendAPIs() {
  console.log('🔧 Testing Backend APIs\n');
  
  const endpoints = [
    {
      name: 'Health Check',
      url: `${TEST_CONFIG.devServerUrl}/`
    },
    {
      name: 'Get Player Props (NFL)',
      url: `${TEST_CONFIG.devServerUrl}/api/player-props?sport=nfl`
    },
    {
      name: 'Get Player Props (NBA)',
      url: `${TEST_CONFIG.devServerUrl}/api/player-props?sport=nba`
    },
    {
      name: 'Get Player Props (MLB)',
      url: `${TEST_CONFIG.devServerUrl}/api/player-props?sport=mlb`
    },
    {
      name: 'Get Player Props (NHL)',
      url: `${TEST_CONFIG.devServerUrl}/api/player-props?sport=nhl`
    },
    {
      name: 'Test SportsRadar Backend',
      url: `${TEST_CONFIG.devServerUrl}/api/sportsradar/test`
    },
    {
      name: 'Get API Usage Stats',
      url: `${TEST_CONFIG.devServerUrl}/api/stats`
    }
  ];
  
  const results = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.name, endpoint.url);
    results.push(result);
    console.log('---\n');
  }
  
  return results;
}

// Generate Postman test results
function generatePostmanTestResults(allResults) {
  const working = allResults.filter(r => r.success);
  const failing = allResults.filter(r => !r.success);
  
  console.log('\n📊 Postman Test Results Summary\n');
  
  console.log('✅ Working Endpoints (Ready for Postman):');
  working.forEach(result => {
    console.log(`  ${result.name}: ${result.status}`);
  });
  
  console.log('\n⚠️ Endpoints Requiring Attention:');
  failing.forEach(result => {
    console.log(`  ${result.name}: ${result.status}`);
  });
  
  console.log('\n🎯 Postman Collection Status:');
  console.log(`  Total Endpoints: ${allResults.length}`);
  console.log(`  Working: ${working.length} (${Math.round(working.length / allResults.length * 100)}%)`);
  console.log(`  Failing: ${failing.length} (${Math.round(failing.length / allResults.length * 100)}%)`);
  
  return {
    working,
    failing,
    total: allResults.length,
    successRate: Math.round(working.length / allResults.length * 100)
  };
}

// Main test function
async function runComprehensiveTests() {
  console.log('🚀 Comprehensive API Testing for Postman Setup\n');
  console.log(`🔗 Your Postman Workspace: https://lifesplugg-9889449.postman.co/workspace/Statpedia~4f4e954c-f368-4c54-b419-e3b4206b3f36\n`);
  
  // Test all API categories
  const coreResults = await testSportsRadarCore();
  console.log('\n' + '='.repeat(60) + '\n');
  
  const oddsResults = await testSportsRadarOdds();
  console.log('\n' + '='.repeat(60) + '\n');
  
  const backendResults = await testBackendAPIs();
  
  // Combine all results
  const allResults = [...coreResults, ...oddsResults, ...backendResults];
  
  // Generate summary
  const summary = generatePostmanTestResults(allResults);
  
  console.log('\n💡 Next Steps:');
  console.log('1. Import comprehensive-postman-collection.json into Postman');
  console.log('2. Fork SportsRadar collections as described in POSTMAN_FORK_GUIDE.md');
  console.log('3. Set up environment variables in Postman');
  console.log('4. Test the working endpoints in Postman');
  console.log('5. Use the working endpoints in our backend code');
  
  console.log('\n🔗 SportsRadar Collections to Fork:');
  console.log('  - Media APIs: https://www.postman.com/sportradar-media-apis/sportradar-media-apis/overview');
  console.log('  - Odds Player Props v2: https://www.postman.com/sportradar-media-apis/sportradar-media-apis/collection/8eu5kcm/sportradar-odds-comparison-player-props-v2');
  
  return summary;
}

// Run the comprehensive tests
if (require.main === module) {
  runComprehensiveTests().catch(console.error);
}

module.exports = {
  runComprehensiveTests,
  testSportsRadarCore,
  testSportsRadarOdds,
  testBackendAPIs,
  generatePostmanTestResults
};
