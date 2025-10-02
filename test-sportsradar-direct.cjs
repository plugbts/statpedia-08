/**
 * Test SportsRadar API Direct Connection
 * Check if SportsRadar endpoints are working and returning data
 */

const https = require('https');

const SPORTSRADAR_CONFIG = {
  API_KEY: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  BASE_URL: 'https://api.sportradar.com',
  ENDPOINTS: {
    NFL: '/nfl/official/trial/v7/en/games/2025/REG/schedule.json',
    NBA: '/nba/trial/v7/en/games/2025/REG/schedule.json',
    MLB: '/mlb/trial/v7/en/games/2025/REG/schedule.json',
    NHL: '/nhl/trial/v7/en/games/2025/REG/schedule.json'
  }
};

async function testSportsRadarEndpoint(sport, endpoint) {
  console.log(`\n🔍 Testing ${sport} endpoint: ${endpoint}`);
  
  const url = `${SPORTSRADAR_CONFIG.BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Statpedia/2.0-Test',
        'x-api-key': SPORTSRADAR_CONFIG.API_KEY
      },
      signal: AbortSignal.timeout(15000)
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error Response: ${errorText.substring(0, 300)}...`);
      return {
        sport,
        success: false,
        status: response.status,
        error: errorText.substring(0, 200)
      };
    }

    const data = await response.json();
    const dataSize = JSON.stringify(data).length;
    
    console.log(`✅ Success! Data size: ${(dataSize / 1024).toFixed(2)} KB`);
    console.log(`📊 Data structure: ${Object.keys(data).join(', ')}`);
    
    // Analyze the data structure
    let gamesCount = 0;
    if (data.weeks && Array.isArray(data.weeks)) {
      gamesCount = data.weeks.reduce((sum, week) => sum + (week.games?.length || 0), 0);
      console.log(`🏈 NFL Structure: ${data.weeks.length} weeks, ${gamesCount} total games`);
    } else if (data.games && Array.isArray(data.games)) {
      gamesCount = data.games.length;
      console.log(`🏀 ${sport} Structure: ${gamesCount} games`);
    } else if (data.league) {
      console.log(`🏟️ League data structure detected`);
    }
    
    // Check for upcoming games (next 14 days)
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    let upcomingGames = 0;
    
    if (data.weeks) {
      data.weeks.forEach(week => {
        if (week.games) {
          week.games.forEach(game => {
            if (game.scheduled) {
              const gameDate = new Date(game.scheduled);
              if (gameDate >= now && gameDate <= twoWeeksFromNow) {
                upcomingGames++;
              }
            }
          });
        }
      });
    } else if (data.games) {
      data.games.forEach(game => {
        if (game.scheduled) {
          const gameDate = new Date(game.scheduled);
          if (gameDate >= now && gameDate <= twoWeeksFromNow) {
            upcomingGames++;
          }
        }
      });
    }
    
    console.log(`📅 Upcoming games (next 14 days): ${upcomingGames}`);
    
    return {
      sport,
      success: true,
      status: response.status,
      dataSize,
      gamesCount,
      upcomingGames,
      structure: Object.keys(data)
    };
    
  } catch (error) {
    console.log(`🚨 Network Error: ${error.message}`);
    return {
      sport,
      success: false,
      error: error.message
    };
  }
}

async function testAllSportsRadarEndpoints() {
  console.log('🚀 TESTING SPORTSRADAR API ENDPOINTS');
  console.log('=' .repeat(50));
  console.log(`🔑 Using API Key: ${SPORTSRADAR_CONFIG.API_KEY.substring(0, 10)}...`);
  console.log(`🌐 Base URL: ${SPORTSRADAR_CONFIG.BASE_URL}`);
  
  const results = [];
  
  for (const [sport, endpoint] of Object.entries(SPORTSRADAR_CONFIG.ENDPOINTS)) {
    const result = await testSportsRadarEndpoint(sport, endpoint);
    results.push(result);
    
    // Wait 1 second between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 SPORTSRADAR API TEST SUMMARY');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎉 Working Endpoints:');
    successful.forEach(result => {
      console.log(`  ${result.sport}: ${result.gamesCount || 0} games, ${result.upcomingGames || 0} upcoming`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n💥 Failed Endpoints:');
    failed.forEach(result => {
      console.log(`  ${result.sport}: ${result.status || 'Network Error'} - ${result.error?.substring(0, 100) || 'Unknown error'}`);
    });
  }
  
  // Analysis and recommendations
  console.log('\n💡 ANALYSIS:');
  
  if (successful.length === 0) {
    console.log('❌ ALL ENDPOINTS FAILED - This explains why no player props are loading!');
    console.log('🔧 Possible causes:');
    console.log('   - API key is invalid or expired');
    console.log('   - Rate limiting or quota exceeded');
    console.log('   - SportsRadar API endpoints changed');
    console.log('   - Network connectivity issues');
  } else if (successful.length < results.length) {
    console.log('⚠️ SOME ENDPOINTS FAILED - Partial functionality');
    console.log('🔧 Working sports will have player props, failed sports will not');
  } else {
    console.log('✅ ALL ENDPOINTS WORKING - API connectivity is good');
    
    const totalUpcoming = successful.reduce((sum, r) => sum + (r.upcomingGames || 0), 0);
    if (totalUpcoming === 0) {
      console.log('⚠️ NO UPCOMING GAMES FOUND - This could explain empty player props');
      console.log('🔧 Possible causes:');
      console.log('   - Off-season for all sports');
      console.log('   - Date filtering too restrictive');
      console.log('   - Game scheduling not yet available');
    } else {
      console.log(`✅ ${totalUpcoming} upcoming games found - Should generate player props`);
    }
  }
  
  console.log('\n🎯 RECOMMENDATIONS:');
  if (failed.length > 0) {
    console.log('1. Check SportsRadar API key validity');
    console.log('2. Verify API quota and rate limits');
    console.log('3. Test endpoints manually in Postman');
    console.log('4. Check SportsRadar API documentation for changes');
  }
  
  if (successful.length > 0) {
    const totalUpcoming = successful.reduce((sum, r) => sum + (r.upcomingGames || 0), 0);
    if (totalUpcoming === 0) {
      console.log('1. Adjust date filtering to include more games');
      console.log('2. Check if sports are in-season');
      console.log('3. Consider using historical games for testing');
    }
  }
  
  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    totalUpcomingGames: successful.reduce((sum, r) => sum + (r.upcomingGames || 0), 0),
    results
  };
}

// Run the test
testAllSportsRadarEndpoints().catch(console.error);
