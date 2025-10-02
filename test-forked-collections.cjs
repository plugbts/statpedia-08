/**
 * Test Forked SportsRadar Collections
 * Tests all forked SportsRadar collections to verify functionality
 */

const fs = require('fs');

// Load the fork checklist
const forkChecklist = JSON.parse(fs.readFileSync('sportsradar-fork-checklist.json', 'utf8'));

// Test configuration
const TEST_CONFIG = {
  sportsRadarAPIKey: forkChecklist.environment_variables.sportsradar_api_key,
  baseUrl: forkChecklist.environment_variables.base_url,
  currentYear: forkChecklist.environment_variables.current_year,
  currentSeason: forkChecklist.environment_variables.current_season,
  currentDate: forkChecklist.environment_variables.current_date
};

// Test function
async function testEndpoint(name, url, headers = {}) {
  console.log(`🧪 Testing ${name}...`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
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
          console.log(`📅 Found ${data.weeks.length} weeks`);
        } else if (data.games) {
          console.log(`🎮 Found ${data.games.length} games`);
        }
      } else if (name.includes('Teams') || name.includes('Hierarchy')) {
        if (data.conferences) {
          console.log(`🏈 Found ${data.conferences.length} conferences`);
        } else if (data.divisions) {
          console.log(`📊 Found ${data.divisions.length} divisions`);
        }
      } else if (name.includes('Player Props')) {
        if (data.player_props) {
          console.log(`⚽ Found ${data.player_props.length} player props`);
        }
      }
      
      return {
        name,
        status,
        success: true,
        url,
        dataKeys: Object.keys(data),
        responseSize: JSON.stringify(data).length
      };
    } else {
      const errorText = await response.text();
      console.log(`❌ Error: ${status} - ${errorText.substring(0, 200)}...`);
      return {
        name,
        status,
        success: false,
        url,
        error: errorText.substring(0, 200)
      };
    }
    
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`);
    return {
      name,
      status: 'ERROR',
      success: false,
      url,
      error: error.message
    };
  }
}

// Test Critical Priority Collections
async function testCriticalCollections() {
  console.log('🚨 Testing CRITICAL Priority Collections\n');
  
  const endpoints = [
    {
      name: 'NFL Player Props (Odds API)',
      url: `${TEST_CONFIG.baseUrl}/oddscomparison/v1/en/sports/1/player_props.json`,
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    },
    {
      name: 'NBA Player Props (Odds API)',
      url: `${TEST_CONFIG.baseUrl}/oddscomparison/v1/en/sports/2/player_props.json`,
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    },
    {
      name: 'Books (Bookmakers)',
      url: `${TEST_CONFIG.baseUrl}/oddscomparison/v1/en/books.json`,
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    }
  ];
  
  const results = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.name, endpoint.url, endpoint.headers);
    results.push(result);
    console.log('---\n');
  }
  
  return results;
}

// Test High Priority Collections
async function testHighPriorityCollections() {
  console.log('⭐ Testing HIGH Priority Collections\n');
  
  const endpoints = [
    {
      name: 'NFL Schedule 2025',
      url: `${TEST_CONFIG.baseUrl}/nfl/official/trial/v7/en/games/${TEST_CONFIG.currentYear}/${TEST_CONFIG.currentSeason}/schedule.json`,
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    },
    {
      name: 'NFL Teams Hierarchy',
      url: `${TEST_CONFIG.baseUrl}/nfl/official/trial/v7/en/league/hierarchy.json`,
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    },
    {
      name: 'NBA Schedule 2025',
      url: `${TEST_CONFIG.baseUrl}/nba/trial/v7/en/games/${TEST_CONFIG.currentYear}/${TEST_CONFIG.currentSeason}/schedule.json`,
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    },
    {
      name: 'NBA Teams Hierarchy',
      url: `${TEST_CONFIG.baseUrl}/nba/trial/v7/en/league/hierarchy.json`,
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    },
    {
      name: 'MLB Schedule 2025',
      url: `${TEST_CONFIG.baseUrl}/mlb/trial/v7/en/games/${TEST_CONFIG.currentYear}/${TEST_CONFIG.currentSeason}/schedule.json`,
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    },
    {
      name: 'NHL Schedule 2025',
      url: `${TEST_CONFIG.baseUrl}/nhl/trial/v7/en/games/${TEST_CONFIG.currentYear}/${TEST_CONFIG.currentSeason}/schedule.json`,
      headers: { 'x-api-key': TEST_CONFIG.sportsRadarAPIKey }
    }
  ];
  
  const results = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.name, endpoint.url, endpoint.headers);
    results.push(result);
    console.log('---\n');
  }
  
  return results;
}

// Generate fork status report
function generateForkReport(criticalResults, highPriorityResults) {
  const allResults = [...criticalResults, ...highPriorityResults];
  const working = allResults.filter(r => r.success);
  const failing = allResults.filter(r => !r.success);
  
  console.log('\n📊 Fork Testing Results Summary\n');
  
  console.log('🚨 CRITICAL Priority Collections:');
  criticalResults.forEach(result => {
    console.log(`  ${result.success ? '✅' : '❌'} ${result.name}: ${result.status}`);
  });
  
  console.log('\n⭐ HIGH Priority Collections:');
  highPriorityResults.forEach(result => {
    console.log(`  ${result.success ? '✅' : '❌'} ${result.name}: ${result.status}`);
  });
  
  console.log('\n📈 Overall Statistics:');
  console.log(`  Total Endpoints Tested: ${allResults.length}`);
  console.log(`  Working: ${working.length} (${Math.round(working.length / allResults.length * 100)}%)`);
  console.log(`  Failing: ${failing.length} (${Math.round(failing.length / allResults.length * 100)}%)`);
  
  console.log('\n✅ Ready for Postman Fork:');
  working.forEach(result => {
    console.log(`  - ${result.name} (${result.status})`);
  });
  
  console.log('\n⚠️ May Require Special Permissions:');
  failing.forEach(result => {
    console.log(`  - ${result.name} (${result.status})`);
  });
  
  return {
    critical: criticalResults,
    highPriority: highPriorityResults,
    working,
    failing,
    totalTested: allResults.length,
    successRate: Math.round(working.length / allResults.length * 100)
  };
}

// Main test function
async function testForkedCollections() {
  console.log('🚀 Testing SportsRadar Collections Before/After Forking\n');
  console.log(`🔗 Your Postman Workspace: ${forkChecklist.workspace.url}\n`);
  console.log(`📋 SportsRadar Source: ${forkChecklist.source_workspace.url}\n`);
  
  // Test critical collections first
  const criticalResults = await testCriticalCollections();
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test high priority collections
  const highPriorityResults = await testHighPriorityCollections();
  
  // Generate report
  const report = generateForkReport(criticalResults, highPriorityResults);
  
  console.log('\n🎯 Forking Priority Recommendations:');
  console.log('\n1. FORK IMMEDIATELY (Working):');
  report.working.forEach(result => {
    console.log(`   ✅ ${result.name} - Use for player props backend`);
  });
  
  console.log('\n2. FORK FOR TESTING (May need permissions):');
  report.failing.forEach(result => {
    console.log(`   ⚠️ ${result.name} - Test after forking, may work in Postman`);
  });
  
  console.log('\n📋 Next Steps:');
  console.log('1. Fork all collections from SportsRadar workspace');
  console.log('2. Set up environment variables in Postman');
  console.log('3. Test forked collections with your API key');
  console.log('4. Use working endpoints in your player props backend');
  console.log('5. Monitor API usage and rate limits');
  
  console.log('\n🔗 Collections to Fork:');
  console.log(`   Critical: ${forkChecklist.collections_to_fork.critical_priority.length} collections`);
  console.log(`   High: ${forkChecklist.collections_to_fork.high_priority.length} collections`);
  console.log(`   Medium: ${forkChecklist.collections_to_fork.medium_priority.length} collections`);
  console.log(`   Low: ${forkChecklist.collections_to_fork.low_priority.length} collections`);
  
  return report;
}

// Run the tests
if (require.main === module) {
  testForkedCollections().catch(console.error);
}

module.exports = {
  testForkedCollections,
  testCriticalCollections,
  testHighPriorityCollections,
  generateForkReport
};
