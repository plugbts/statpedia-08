/**
 * Test API Connectivity for Trio System
 * Tests each API individually to identify failures
 */

const https = require('https');
const http = require('http');

// API Configurations
const APIs = {
  ODDSBLAZE: {
    name: 'OddsBlaze',
    key: '11c20a93-06bb-4ec2-9e3e-513fd55655b5',
    testUrl: 'https://api.oddsblaze.com/v2/leagues.json?key=11c20a93-06bb-4ec2-9e3e-513fd55655b5',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Statpedia/2.0-Test'
    }
  },
  SPORTSGAMEODDS: {
    name: 'SportsGameOdds',
    key: '740556c91b9aa5616c0521cc2f09ed74',
    testUrl: 'https://api.sportsgameodds.com/v2/sports',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'x-api-key': '740556c91b9aa5616c0521cc2f09ed74',
      'User-Agent': 'Statpedia/2.0-Test'
    }
  },
  SPORTSRADAR: {
    name: 'SportsRadar',
    key: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
    testUrl: 'https://api.sportradar.com/nfl/official/trial/v7/en/games/2025/REG/schedule.json',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'x-api-key': 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
      'User-Agent': 'Statpedia/2.0-Test'
    }
  }
};

function makeRequest(config) {
  return new Promise((resolve, reject) => {
    const url = new URL(config.testUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: config.method,
      headers: config.headers,
      timeout: 15000
    };

    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          data: data.substring(0, 500) // First 500 chars
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function testAPI(apiName, config) {
  console.log(`\n🧪 Testing ${config.name} API...`);
  console.log(`📡 URL: ${config.testUrl}`);
  console.log(`🔑 Key: ${config.key.substring(0, 8)}...`);
  
  try {
    const result = await makeRequest(config);
    
    if (result.statusCode === 200) {
      console.log(`✅ ${config.name}: SUCCESS`);
      console.log(`📊 Response: ${result.data.substring(0, 100)}...`);
      return { success: true, status: result.statusCode };
    } else {
      console.log(`❌ ${config.name}: HTTP ${result.statusCode} - ${result.statusMessage}`);
      console.log(`📄 Response: ${result.data}`);
      return { success: false, status: result.statusCode, error: result.statusMessage };
    }
  } catch (error) {
    console.log(`🚨 ${config.name}: ERROR - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testAllAPIs() {
  console.log('🏆 TRIO SYSTEM API CONNECTIVITY TEST');
  console.log('=' .repeat(60));
  console.log(`📅 Test Date: ${new Date().toISOString()}`);
  
  const results = {};
  
  // Test each API
  for (const [apiName, config] of Object.entries(APIs)) {
    results[apiName] = await testAPI(apiName, config);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between tests
  }
  
  // Summary
  console.log('\n📊 TEST SUMMARY:');
  console.log('=' .repeat(60));
  
  const successful = Object.entries(results).filter(([_, result]) => result.success);
  const failed = Object.entries(results).filter(([_, result]) => !result.success);
  
  console.log(`✅ Successful: ${successful.length}/${Object.keys(APIs).length}`);
  successful.forEach(([api, result]) => {
    console.log(`   ${APIs[api].name}: HTTP ${result.status}`);
  });
  
  console.log(`❌ Failed: ${failed.length}/${Object.keys(APIs).length}`);
  failed.forEach(([api, result]) => {
    console.log(`   ${APIs[api].name}: ${result.error || `HTTP ${result.status}`}`);
  });
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('=' .repeat(60));
  
  if (failed.length === 0) {
    console.log('🎉 All APIs are working correctly!');
  } else {
    failed.forEach(([api, result]) => {
      const config = APIs[api];
      console.log(`\n🔧 ${config.name}:`);
      
      if (result.status === 401 || result.status === 403) {
        console.log('   Issue: Authentication failed');
        console.log('   Fix: Check API key validity');
        if (api === 'ODDSBLAZE') {
          console.log('   Note: OddsBlaze keys expire after 24 hours');
        }
      } else if (result.status === 404) {
        console.log('   Issue: Endpoint not found');
        console.log('   Fix: Verify API endpoint URL');
      } else if (result.status === 429) {
        console.log('   Issue: Rate limit exceeded');
        console.log('   Fix: Implement rate limiting or wait');
      } else if (result.error && result.error.includes('timeout')) {
        console.log('   Issue: Request timeout');
        console.log('   Fix: Check network connectivity');
      } else {
        console.log(`   Issue: ${result.error || 'Unknown error'}`);
        console.log('   Fix: Check API documentation and configuration');
      }
    });
  }
  
  return results;
}

// Run the test
testAllAPIs().catch(console.error);
