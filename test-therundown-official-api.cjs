/**
 * Test TheRundown Official API Implementation
 * Based on official documentation and endpoint structure
 */

const API_KEY = 'ef9ac9bff0mshbbf0d0fa5c5de6bp1cb40ajsn49acdbd702a0';
const RAPIDAPI_HOST = 'therundown-v1.p.rapidapi.com';

// Sport IDs from official documentation
const SPORT_IDS = {
  NFL: 2,
  NBA: 4,
  MLB: 3,
  NHL: 1
};

async function testTheRundownOfficialAPI() {
  console.log('🏃 TESTING THERUNDOWN OFFICIAL API IMPLEMENTATION');
  console.log('=' .repeat(70));
  console.log(`API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 10)}`);
  console.log(`RapidAPI Host: ${RAPIDAPI_HOST}`);
  console.log('Based on: Official TheRundown API Documentation\n');

  const results = [];
  const currentDate = new Date().toISOString().split('T')[0];

  // Test endpoints based on official documentation
  const endpoints = [
    {
      name: 'Get Available Sports',
      url: `https://${RAPIDAPI_HOST}/sports`,
      description: 'Official V1 endpoint for available sports',
      version: 'v1'
    },
    {
      name: 'Get Affiliates (Sportsbooks)',
      url: `https://${RAPIDAPI_HOST}/affiliates`,
      description: 'Official V1 endpoint for sportsbooks',
      version: 'v1'
    },
    {
      name: 'Get NFL Dates',
      url: `https://${RAPIDAPI_HOST}/${SPORT_IDS.NFL}/dates`,
      description: 'Official V1 endpoint for NFL available dates',
      version: 'v1'
    },
    {
      name: 'Get NFL Events (V1)',
      url: `https://${RAPIDAPI_HOST}/${SPORT_IDS.NFL}/events/${currentDate}?include=scores`,
      description: 'Official V1 endpoint for NFL events',
      version: 'v1'
    },
    {
      name: 'Get NBA Events (V1)',
      url: `https://${RAPIDAPI_HOST}/${SPORT_IDS.NBA}/events/${currentDate}?include=scores`,
      description: 'Official V1 endpoint for NBA events',
      version: 'v1'
    },
    {
      name: 'Get NFL Events (V2)',
      url: `https://${RAPIDAPI_HOST}/v2/${SPORT_IDS.NFL}/events/${currentDate}?include=scores`,
      description: 'Official V2 endpoint for NFL events',
      version: 'v2'
    },
    {
      name: 'Get NBA Events (V2)',
      url: `https://${RAPIDAPI_HOST}/v2/${SPORT_IDS.NBA}/events/${currentDate}?include=scores`,
      description: 'Official V2 endpoint for NBA events',
      version: 'v2'
    },
    {
      name: 'Get NFL Player Props (V2)',
      url: `https://${RAPIDAPI_HOST}/v2/${SPORT_IDS.NFL}/events/${currentDate}?include=scores&market_ids=4,5,6,7,8,9,10,11,12,13,14,15&participant_type=TYPE_PLAYER`,
      description: 'Official V2 endpoint for NFL player props',
      version: 'v2'
    },
    {
      name: 'Get All Markets (V2)',
      url: `https://${RAPIDAPI_HOST}/v2/markets`,
      description: 'Official V2 endpoint for all available markets',
      version: 'v2'
    }
  ];

  for (const endpoint of endpoints) {
    console.log(`🧪 Testing: ${endpoint.name} (${endpoint.version.toUpperCase()})`);
    console.log(`📡 ${endpoint.description}`);
    console.log(`🔗 ${endpoint.url}`);
    
    try {
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-RapidAPI-Key': API_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST,
          'User-Agent': 'Statpedia/2.0-TheRundown-Official-Test'
        },
        signal: AbortSignal.timeout(15000)
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        console.log(`  ❌ ${endpoint.name}: ${response.status} ${response.statusText}`);
        console.log(`  📄 Response: ${responseText.substring(0, 200)}...`);
        
        results.push({
          endpoint: endpoint.name,
          version: endpoint.version,
          success: false,
          status: response.status,
          error: `${response.status} ${response.statusText}`,
          response: responseText.substring(0, 200)
        });
      } else {
        const data = JSON.parse(responseText);
        const dataSize = (responseText.length / 1024).toFixed(1);
        
        console.log(`  ✅ ${endpoint.name}: 200 OK (${dataSize} KB)`);
        
        // Analyze response structure based on official documentation
        let itemCount = 0;
        let dataType = 'unknown';
        
        if (data.sports && Array.isArray(data.sports)) {
          itemCount = data.sports.length;
          dataType = 'sports';
          console.log(`  📊 Sports: ${itemCount} available`);
        } else if (data.events && Array.isArray(data.events)) {
          itemCount = data.events.length;
          dataType = 'events';
          console.log(`  📊 Events: ${itemCount} found`);
          if (itemCount > 0) {
            const sampleEvent = data.events[0];
            console.log(`  🔍 Sample event: ${sampleEvent.teams_normalized?.[0]?.name || 'Unknown'} vs ${sampleEvent.teams_normalized?.[1]?.name || 'Unknown'}`);
          }
        } else if (data.affiliates && Array.isArray(data.affiliates)) {
          itemCount = data.affiliates.length;
          dataType = 'affiliates';
          console.log(`  📊 Sportsbooks: ${itemCount} available`);
        } else if (data.markets && Array.isArray(data.markets)) {
          itemCount = data.markets.length;
          dataType = 'markets';
          console.log(`  📊 Markets: ${itemCount} available`);
        } else if (data.dates && Array.isArray(data.dates)) {
          itemCount = data.dates.length;
          dataType = 'dates';
          console.log(`  📊 Available dates: ${itemCount}`);
        } else if (Array.isArray(data)) {
          itemCount = data.length;
          dataType = 'array';
          console.log(`  📊 Array items: ${itemCount}`);
        } else {
          console.log(`  📊 Object keys: ${Object.keys(data).join(', ')}`);
          dataType = 'object';
        }
        
        results.push({
          endpoint: endpoint.name,
          version: endpoint.version,
          success: true,
          status: 200,
          dataSize: dataSize,
          itemCount: itemCount,
          dataType: dataType
        });
      }
      
    } catch (error) {
      console.log(`  🚨 ${endpoint.name}: Network Error - ${error.message}`);
      results.push({
        endpoint: endpoint.name,
        version: endpoint.version,
        success: false,
        error: error.message
      });
    }
    
    console.log('---\n');
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Comprehensive Summary
  console.log('📋 THERUNDOWN OFFICIAL API TEST SUMMARY');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const v1Results = results.filter(r => r.version === 'v1');
  const v2Results = results.filter(r => r.version === 'v2');
  const v1Success = v1Results.filter(r => r.success);
  const v2Success = v2Results.filter(r => r.success);
  
  console.log(`✅ Overall Success: ${successful.length}/${results.length} endpoints`);
  console.log(`📊 V1 Success: ${v1Success.length}/${v1Results.length} endpoints`);
  console.log(`📊 V2 Success: ${v2Success.length}/${v2Results.length} endpoints`);
  console.log(`❌ Failed: ${failed.length}/${results.length} endpoints`);
  
  if (successful.length > 0) {
    console.log('\n🎉 WORKING ENDPOINTS:');
    successful.forEach(result => {
      const icon = result.version === 'v2' ? '🚀' : '📡';
      console.log(`  ${icon} ${result.endpoint} (${result.version.toUpperCase()}): ${result.itemCount} ${result.dataType} (${result.dataSize} KB)`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n⚠️ FAILED ENDPOINTS:');
    failed.forEach(result => {
      console.log(`  ❌ ${result.endpoint} (${result.version.toUpperCase()}): ${result.error}`);
    });
  }
  
  // Analysis and Recommendations
  console.log('\n💡 ANALYSIS & RECOMMENDATIONS:');
  
  if (successful.length === results.length) {
    console.log('🎯 PERFECT! All official endpoints working!');
    console.log('✅ TheRundown API is fully functional with both V1 and V2');
    console.log('🚀 Ready for full dual system integration');
    console.log('📊 Expected: 0/30 → 30/30 integration test improvement');
  } else if (v1Success.length === v1Results.length && v2Success.length === 0) {
    console.log('📡 V1 endpoints working, V2 endpoints failing');
    console.log('⚡ Can implement basic integration with V1 events');
    console.log('🔧 V2 player props may need different approach or permissions');
  } else if (v1Success.length > 0 || v2Success.length > 0) {
    console.log('⚡ Partial success - some endpoints working');
    console.log('🔧 Focus on working endpoints for integration');
    console.log('📋 May need to adjust API service implementation');
  } else {
    console.log('🚨 No endpoints working - major issue detected');
    console.log('🔍 Check API key validity and RapidAPI subscription');
    console.log('📞 May need to contact TheRundown support');
  }
  
  // Integration Readiness Assessment
  console.log('\n🎯 INTEGRATION READINESS ASSESSMENT:');
  
  const hasBasicData = successful.some(r => r.dataType === 'sports' || r.dataType === 'events');
  const hasPlayerProps = successful.some(r => r.endpoint.includes('Player Props'));
  const hasV2Support = v2Success.length > 0;
  
  if (hasBasicData && hasPlayerProps && hasV2Support) {
    console.log('🟢 READY: Full integration possible with player props');
  } else if (hasBasicData && hasV2Support) {
    console.log('🟡 PARTIAL: V2 integration possible, may need prop generation');
  } else if (hasBasicData) {
    console.log('🟡 BASIC: V1 integration possible with fallback prop generation');
  } else {
    console.log('🔴 NOT READY: Need to resolve API connectivity issues');
  }
  
  console.log('\n🚀 NEXT STEPS:');
  if (successful.length > 0) {
    console.log('1. Update therundown-api-official.ts with working endpoints');
    console.log('2. Test dual system integration in Dev Console');
    console.log('3. Verify player props display in UI');
    console.log('4. Run integration tests to confirm 0/30 → 30/30 improvement');
  } else {
    console.log('1. Verify API key is active on RapidAPI dashboard');
    console.log('2. Check TheRundown subscription status');
    console.log('3. Test endpoints manually in Postman');
    console.log('4. Contact TheRundown support if issues persist');
  }
  
  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    v1Success: v1Success.length,
    v2Success: v2Success.length,
    readyForIntegration: hasBasicData,
    hasPlayerProps: hasPlayerProps,
    results: results
  };
}

// Run the comprehensive test
testTheRundownOfficialAPI()
  .then(summary => {
    console.log(`\n🏁 TheRundown Official API Test Complete`);
    console.log(`📊 Results: ${summary.successful}/${summary.total} endpoints working`);
    console.log(`🎯 Integration Ready: ${summary.readyForIntegration ? 'YES' : 'NO'}`);
    
    if (summary.readyForIntegration) {
      console.log('✅ Proceeding with dual system integration!');
    } else {
      console.log('⚠️ Need to resolve API issues before integration.');
    }
  })
  .catch(error => {
    console.error('🚨 Test suite failed:', error);
  });
