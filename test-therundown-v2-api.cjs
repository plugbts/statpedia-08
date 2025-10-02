/**
 * Test TheRundown v2 API with the correct base URL
 * Verify the v2 endpoints are working
 */

const API_KEY = 'ef9ac9bff0mshbbf0d0fa5c5de6bp1cb40ajsn49acdbd702a0';
const BASE_URL_V2 = 'https://therundown-v2.p.rapidapi.com';

async function testTheRundownV2API() {
  console.log('🏃 TESTING THERUNDOWN V2 API');
  console.log('=' .repeat(60));
  console.log(`API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 10)}`);
  console.log(`Base URL: ${BASE_URL_V2}\n`);

  const endpoints = [
    {
      name: 'Sports List',
      url: `${BASE_URL_V2}/sports`,
      description: 'Get available sports'
    },
    {
      name: 'NFL Events',
      url: `${BASE_URL_V2}/events?sport_id=2`,
      description: 'Get NFL events'
    },
    {
      name: 'NBA Events', 
      url: `${BASE_URL_V2}/events?sport_id=4`,
      description: 'Get NBA events'
    },
    {
      name: 'NFL Odds',
      url: `${BASE_URL_V2}/odds?sport_id=2`,
      description: 'Get NFL odds'
    },
    {
      name: 'Sportsbooks',
      url: `${BASE_URL_V2}/sportsbooks`,
      description: 'Get available sportsbooks'
    }
  ];

  const results = [];

  for (const endpoint of endpoints) {
    console.log(`🧪 Testing: ${endpoint.name}`);
    console.log(`📡 ${endpoint.description}`);
    console.log(`🔗 ${endpoint.url}`);
    
    try {
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-RapidAPI-Key': API_KEY,
          'X-RapidAPI-Host': 'therundown-v2.p.rapidapi.com',
          'User-Agent': 'Statpedia/2.0-TheRundown-V2-Test'
        },
        signal: AbortSignal.timeout(15000)
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        console.log(`  ❌ ${endpoint.name}: ${response.status} ${response.statusText}`);
        console.log(`  📄 Response: ${responseText.substring(0, 200)}...`);
        
        results.push({
          endpoint: endpoint.name,
          success: false,
          status: response.status,
          error: `${response.status} ${response.statusText}`,
          response: responseText.substring(0, 200)
        });
      } else {
        const data = JSON.parse(responseText);
        const dataSize = (responseText.length / 1024).toFixed(1);
        
        console.log(`  ✅ ${endpoint.name}: 200 OK (${dataSize} KB)`);
        
        // Analyze response structure
        if (data.data && Array.isArray(data.data)) {
          console.log(`  📊 Data: ${data.data.length} items in data array`);
          if (data.data.length > 0) {
            const sample = data.data[0];
            console.log(`  🔍 Sample keys: ${Object.keys(sample).slice(0, 5).join(', ')}`);
          }
        } else if (Array.isArray(data)) {
          console.log(`  📊 Data: ${data.length} items (direct array)`);
          if (data.length > 0) {
            console.log(`  🔍 Sample keys: ${Object.keys(data[0]).slice(0, 5).join(', ')}`);
          }
        } else if (typeof data === 'object') {
          console.log(`  📊 Data: Object with keys: ${Object.keys(data).join(', ')}`);
        }
        
        results.push({
          endpoint: endpoint.name,
          success: true,
          status: 200,
          dataSize: dataSize,
          structure: Array.isArray(data) ? 'array' : data.data ? 'object_with_data' : 'object',
          itemCount: data.data?.length || (Array.isArray(data) ? data.length : Object.keys(data).length)
        });
      }
      
    } catch (error) {
      console.log(`  🚨 ${endpoint.name}: Network Error - ${error.message}`);
      results.push({
        endpoint: endpoint.name,
        success: false,
        error: error.message
      });
    }
    
    console.log('---\n');
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Summary
  console.log('📋 THERUNDOWN V2 API TEST SUMMARY');
  console.log('=' .repeat(40));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎉 WORKING ENDPOINTS:');
    successful.forEach(result => {
      console.log(`  ✅ ${result.endpoint}: ${result.itemCount} items (${result.dataSize} KB, ${result.structure})`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n⚠️ FAILED ENDPOINTS:');
    failed.forEach(result => {
      console.log(`  ❌ ${result.endpoint}: ${result.error}`);
      if (result.response) {
        console.log(`     Response: ${result.response}...`);
      }
    });
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (successful.length === results.length) {
    console.log('🎯 All v2 endpoints working! TheRundown v2 API is fully functional.');
    console.log('🚀 Ready to integrate with Dual Sports API system.');
    console.log('📊 Expected improvement: 0/30 → 30/30 in integration tests.');
    console.log('🔧 Update dual-sports-api.ts to use working endpoints.');
  } else if (successful.length > 0) {
    console.log('⚡ Some v2 endpoints working. Partial integration possible.');
    console.log('🔧 Focus on working endpoints for player props generation.');
    console.log('📋 Update API service to use only working endpoints.');
  } else {
    console.log('🚨 No v2 endpoints working. Possible issues:');
    console.log('   1. API key subscription doesn\'t include v2 access');
    console.log('   2. Different endpoint structure in v2');
    console.log('   3. Need to check your forked Postman collection');
    console.log('🔍 Check your RapidAPI dashboard for v2 access.');
  }
  
  // Next steps
  console.log('\n🚀 NEXT STEPS:');
  if (successful.length > 0) {
    console.log('1. Update therundown-api.ts with working endpoint patterns');
    console.log('2. Test dual system in Dev Console');
    console.log('3. Verify player props display in UI');
    console.log('4. Check integration test results (should improve from 0/30)');
  } else {
    console.log('1. Check your Postman collection for correct v2 endpoints');
    console.log('2. Verify API key has v2 access on RapidAPI dashboard');
    console.log('3. Try alternative endpoint patterns');
    console.log('4. Fall back to SportsRadar-only system if needed');
  }
  
  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    results,
    workingEndpoints: successful.map(r => r.endpoint)
  };
}

// Run the test
testTheRundownV2API()
  .then(summary => {
    console.log(`\n🏁 TheRundown v2 Test completed: ${summary.successful}/${summary.total} endpoints working`);
    
    if (summary.successful > 0) {
      console.log('✅ Ready to proceed with dual system integration!');
    } else {
      console.log('⚠️ May need to rely on SportsRadar-only system for now.');
    }
  })
  .catch(error => {
    console.error('🚨 Test failed:', error);
  });
