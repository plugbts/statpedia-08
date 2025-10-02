/**
 * Test TheRundown API with the actual API key
 * Verify authentication and data retrieval
 */

const API_KEY = 'ef9ac9bff0mshbbf0d0fa5c5de6bp1cb40ajsn49acdbd702a0';
const BASE_URL = 'https://therundown-v1.p.rapidapi.com';

async function testTheRundownAPI() {
  console.log('🏃 TESTING THERUNDOWN API WITH ACTUAL KEY');
  console.log('=' .repeat(60));
  console.log(`API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 10)}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  const endpoints = [
    {
      name: 'Available Sports',
      url: `${BASE_URL}/sports`,
      description: 'Get list of supported sports'
    },
    {
      name: 'Available Sportsbooks',
      url: `${BASE_URL}/sportsbooks`,
      description: 'Get list of supported sportsbooks'
    },
    {
      name: 'NFL Events Today',
      url: `${BASE_URL}/events?sport_id=2&date=${new Date().toISOString().split('T')[0]}`,
      description: 'Get NFL events for today'
    },
    {
      name: 'NBA Events Today',
      url: `${BASE_URL}/events?sport_id=4&date=${new Date().toISOString().split('T')[0]}`,
      description: 'Get NBA events for today'
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
          'X-RapidAPI-Host': 'therundown-v1.p.rapidapi.com',
          'User-Agent': 'Statpedia/2.0-TheRundown-Test'
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
        
        // Log data structure
        if (data.data && Array.isArray(data.data)) {
          console.log(`  📊 Data: ${data.data.length} items`);
          if (data.data.length > 0) {
            console.log(`  🔍 Sample: ${JSON.stringify(data.data[0]).substring(0, 100)}...`);
          }
        } else if (Array.isArray(data)) {
          console.log(`  📊 Data: ${data.length} items`);
          if (data.length > 0) {
            console.log(`  🔍 Sample: ${JSON.stringify(data[0]).substring(0, 100)}...`);
          }
        } else {
          console.log(`  📊 Data: ${Object.keys(data).join(', ')}`);
        }
        
        results.push({
          endpoint: endpoint.name,
          success: true,
          status: 200,
          dataSize: dataSize,
          itemCount: data.data?.length || data.length || Object.keys(data).length
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
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('📋 THERUNDOWN API TEST SUMMARY');
  console.log('=' .repeat(40));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎉 WORKING ENDPOINTS:');
    successful.forEach(result => {
      console.log(`  ✅ ${result.endpoint}: ${result.itemCount} items (${result.dataSize} KB)`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n⚠️ FAILED ENDPOINTS:');
    failed.forEach(result => {
      console.log(`  ❌ ${result.endpoint}: ${result.error}`);
    });
  }
  
  console.log('\n💡 RECOMMENDATIONS:');
  if (successful.length === results.length) {
    console.log('🎯 All endpoints working! TheRundown API is fully functional.');
    console.log('🚀 Ready to integrate with Dual Sports API system.');
    console.log('📊 Expected improvement: 0/30 → 30/30 in integration tests.');
  } else if (successful.length > 0) {
    console.log('⚡ Some endpoints working. Partial integration possible.');
    console.log('🔧 Focus on working endpoints for player props generation.');
  } else {
    console.log('🚨 No endpoints working. Check API key and subscription status.');
    console.log('🔍 Verify API key is active on RapidAPI dashboard.');
  }
  
  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    results
  };
}

// Run the test
testTheRundownAPI()
  .then(summary => {
    console.log(`\n🏁 Test completed: ${summary.successful}/${summary.total} endpoints working`);
  })
  .catch(error => {
    console.error('🚨 Test failed:', error);
  });
