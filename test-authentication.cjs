/**
 * Test Authentication for Forked SportsRadar Collections
 * Verifies API key authentication and environment setup
 */

const fs = require('fs');

// Load environment configuration
const envConfig = JSON.parse(fs.readFileSync('postman-environment-setup.json', 'utf8'));

// Extract environment variables
const ENV_VARS = {};
envConfig.values.forEach(item => {
  ENV_VARS[item.key] = item.value;
});

console.log('🔐 SportsRadar Authentication Testing\n');
console.log(`🔑 API Key: ${ENV_VARS.sportsradar_api_key.substring(0, 10)}...${ENV_VARS.sportsradar_api_key.substring(-5)}`);
console.log(`🌐 Base URL: ${ENV_VARS.base_url}`);
console.log(`📅 Current Year: ${ENV_VARS.current_year}`);
console.log(`🏆 Season: ${ENV_VARS.current_season}\n`);

// Test function with detailed authentication analysis
async function testAuthenticatedEndpoint(name, url, expectedStatus = 200) {
  console.log(`🧪 Testing ${name}...`);
  console.log(`URL: ${url}`);
  
  const headers = {
    'x-api-key': ENV_VARS.sportsradar_api_key,
    'accept': 'application/json',
    'user-agent': 'Statpedia/1.0 Postman-Testing'
  };
  
  console.log(`🔑 Headers: x-api-key: ${headers['x-api-key'].substring(0, 10)}...`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });
    const responseTime = Date.now() - startTime;
    
    const status = response.status;
    const isSuccess = status === expectedStatus || (Array.isArray(expectedStatus) && expectedStatus.includes(status));
    
    console.log(`⏱️ Response Time: ${responseTime}ms`);
    console.log(`📊 Status: ${status} ${isSuccess ? '✅' : '❌'}`);
    console.log(`🔒 Authentication: ${status === 403 ? 'FAILED ❌' : status === 401 ? 'UNAUTHORIZED ❌' : 'PASSED ✅'}`);
    
    if (response.ok) {
      const data = await response.json();
      const dataSize = JSON.stringify(data).length;
      
      console.log(`📦 Response Size: ${(dataSize / 1024).toFixed(2)} KB`);
      console.log(`🏗️ Data Structure:`, Object.keys(data));
      
      // Analyze specific data types
      if (data.weeks) {
        console.log(`📅 Weeks Found: ${data.weeks.length}`);
        if (data.weeks[0] && data.weeks[0].games) {
          console.log(`🎮 Games in Week 1: ${data.weeks[0].games.length}`);
        }
      } else if (data.games) {
        console.log(`🎮 Games Found: ${data.games.length}`);
      } else if (data.conferences) {
        console.log(`🏈 Conferences Found: ${data.conferences.length}`);
        const totalTeams = data.conferences.reduce((sum, conf) => {
          return sum + (conf.divisions ? conf.divisions.reduce((divSum, div) => divSum + (div.teams ? div.teams.length : 0), 0) : 0);
        }, 0);
        console.log(`👥 Total Teams: ${totalTeams}`);
      }
      
      return {
        name,
        status,
        success: true,
        url,
        responseTime,
        dataSize,
        authentication: 'PASSED',
        dataKeys: Object.keys(data)
      };
      
    } else {
      const errorText = await response.text();
      const authStatus = status === 403 ? 'FORBIDDEN' : status === 401 ? 'UNAUTHORIZED' : status === 502 ? 'BAD_GATEWAY' : 'OTHER_ERROR';
      
      console.log(`❌ Error Type: ${authStatus}`);
      console.log(`📄 Error Details: ${errorText.substring(0, 200)}...`);
      
      return {
        name,
        status,
        success: false,
        url,
        responseTime,
        authentication: authStatus,
        error: errorText.substring(0, 200)
      };
    }
    
  } catch (error) {
    console.log(`🚨 Network Error: ${error.message}`);
    return {
      name,
      status: 'NETWORK_ERROR',
      success: false,
      url,
      authentication: 'NETWORK_FAILED',
      error: error.message
    };
  }
}

// Test Core Working APIs
async function testCoreAPIs() {
  console.log('🏆 Testing Core Working APIs (Should authenticate successfully)\n');
  
  const coreEndpoints = [
    {
      name: 'NFL Schedule 2025',
      url: `${ENV_VARS.base_url}/nfl/official/trial/v7/en/games/${ENV_VARS.current_year}/${ENV_VARS.current_season}/schedule.json`
    },
    {
      name: 'NFL Teams Hierarchy',
      url: `${ENV_VARS.base_url}/nfl/official/trial/v7/en/league/hierarchy.json`
    },
    {
      name: 'NBA Schedule 2025',
      url: `${ENV_VARS.base_url}/nba/trial/v7/en/games/${ENV_VARS.current_year}/${ENV_VARS.current_season}/schedule.json`
    },
    {
      name: 'NBA Teams Hierarchy',
      url: `${ENV_VARS.base_url}/nba/trial/v7/en/league/hierarchy.json`
    },
    {
      name: 'MLB Schedule 2025',
      url: `${ENV_VARS.base_url}/mlb/trial/v7/en/games/${ENV_VARS.current_year}/${ENV_VARS.current_season}/schedule.json`
    },
    {
      name: 'NHL Schedule 2025',
      url: `${ENV_VARS.base_url}/nhl/trial/v7/en/games/${ENV_VARS.current_year}/${ENV_VARS.current_season}/schedule.json`
    }
  ];
  
  const results = [];
  for (const endpoint of coreEndpoints) {
    const result = await testAuthenticatedEndpoint(endpoint.name, endpoint.url, 200);
    results.push(result);
    console.log('─'.repeat(80) + '\n');
  }
  
  return results;
}

// Test Odds APIs (may require different permissions)
async function testOddsAPIs() {
  console.log('🎯 Testing Odds APIs (May require special permissions)\n');
  
  const oddsEndpoints = [
    {
      name: 'Books (Bookmakers)',
      url: `${ENV_VARS.base_url}/oddscomparison/v1/en/books.json`,
      expectedStatus: [200, 403, 502]
    },
    {
      name: 'NFL Player Props',
      url: `${ENV_VARS.base_url}/oddscomparison/v1/en/sports/${ENV_VARS.nfl_sport_id}/player_props.json`,
      expectedStatus: [200, 403, 502]
    },
    {
      name: 'NBA Player Props',
      url: `${ENV_VARS.base_url}/oddscomparison/v1/en/sports/${ENV_VARS.nba_sport_id}/player_props.json`,
      expectedStatus: [200, 403, 502]
    },
    {
      name: 'Daily Schedules',
      url: `${ENV_VARS.base_url}/oddscomparison/v1/en/schedules/${ENV_VARS.current_date}.json`,
      expectedStatus: [200, 403, 502]
    }
  ];
  
  const results = [];
  for (const endpoint of oddsEndpoints) {
    const result = await testAuthenticatedEndpoint(endpoint.name, endpoint.url, endpoint.expectedStatus);
    results.push(result);
    console.log('─'.repeat(80) + '\n');
  }
  
  return results;
}

// Generate authentication report
function generateAuthReport(coreResults, oddsResults) {
  const allResults = [...coreResults, ...oddsResults];
  const authenticated = allResults.filter(r => r.authentication === 'PASSED');
  const authFailed = allResults.filter(r => r.authentication === 'FORBIDDEN' || r.authentication === 'UNAUTHORIZED');
  const otherErrors = allResults.filter(r => r.authentication !== 'PASSED' && r.authentication !== 'FORBIDDEN' && r.authentication !== 'UNAUTHORIZED');
  
  console.log('📊 Authentication Report Summary\n');
  
  console.log('✅ Successfully Authenticated APIs:');
  authenticated.forEach(result => {
    console.log(`  🔑 ${result.name}: ${result.status} (${result.responseTime}ms)`);
  });
  
  console.log('\n🚫 Authentication Failed APIs:');
  authFailed.forEach(result => {
    console.log(`  ❌ ${result.name}: ${result.status} (${result.authentication})`);
  });
  
  console.log('\n⚠️ Other Issues:');
  otherErrors.forEach(result => {
    console.log(`  🔧 ${result.name}: ${result.status} (${result.authentication})`);
  });
  
  console.log('\n📈 Authentication Statistics:');
  console.log(`  Total APIs Tested: ${allResults.length}`);
  console.log(`  Successfully Authenticated: ${authenticated.length} (${Math.round(authenticated.length / allResults.length * 100)}%)`);
  console.log(`  Authentication Failed: ${authFailed.length} (${Math.round(authFailed.length / allResults.length * 100)}%)`);
  console.log(`  Other Errors: ${otherErrors.length} (${Math.round(otherErrors.length / allResults.length * 100)}%)`);
  
  return {
    total: allResults.length,
    authenticated: authenticated.length,
    authFailed: authFailed.length,
    otherErrors: otherErrors.length,
    successRate: Math.round(authenticated.length / allResults.length * 100),
    workingAPIs: authenticated,
    failedAPIs: authFailed
  };
}

// Main authentication test
async function testAuthentication() {
  console.log('🚀 SportsRadar Authentication & Environment Setup Test\n');
  console.log(`🔗 Your Postman Workspace: https://lifesplugg-9889449.postman.co/workspace/Statpedia~4f4e954c-f368-4c54-b419-e3b4206b3f36\n`);
  
  // Test core APIs
  const coreResults = await testCoreAPIs();
  console.log('\n' + '='.repeat(100) + '\n');
  
  // Test odds APIs
  const oddsResults = await testOddsAPIs();
  
  // Generate report
  const report = generateAuthReport(coreResults, oddsResults);
  
  console.log('\n🎯 Postman Environment Setup Recommendations:\n');
  
  console.log('1. ✅ WORKING APIS - Ready for Postman:');
  report.workingAPIs.forEach(api => {
    console.log(`   🔑 ${api.name} - Use in your forked collections`);
  });
  
  console.log('\n2. ⚠️ AUTHENTICATION ISSUES - Need attention:');
  report.failedAPIs.forEach(api => {
    console.log(`   🚫 ${api.name} - May need different API key or permissions`);
  });
  
  console.log('\n📋 Postman Environment Variables (Ready to import):');
  envConfig.values.forEach(variable => {
    if (variable.type === 'secret') {
      console.log(`   🔐 ${variable.key}: ${variable.value.substring(0, 10)}... (SECRET)`);
    } else {
      console.log(`   📝 ${variable.key}: ${variable.value}`);
    }
  });
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Import postman-environment-setup.json into Postman');
  console.log('2. Set "Statpedia Development" as your active environment');
  console.log('3. Test your forked collections with the environment');
  console.log('4. Use working APIs for your player props backend');
  console.log('5. Monitor authentication status in collection runs');
  
  console.log('\n💡 Authentication Tips:');
  console.log('- Use {{sportsradar_api_key}} variable in request headers');
  console.log('- Set x-api-key header in all SportsRadar requests');
  console.log('- Monitor rate limits and usage quotas');
  console.log('- Test forked collections before using in production');
  
  return report;
}

// Run authentication tests
if (require.main === module) {
  testAuthentication().catch(console.error);
}

module.exports = {
  testAuthentication,
  testCoreAPIs,
  testOddsAPIs,
  generateAuthReport,
  ENV_VARS
};
