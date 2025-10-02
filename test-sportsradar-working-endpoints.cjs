/**
 * Test SportsRadar Working Endpoints Only
 * Focus on endpoints that actually work with our API key
 */

const SPORTSRADAR_CONFIG = {
  API_KEY: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  BASE_URL: 'https://api.sportradar.com',
  
  // WORKING ENDPOINTS (confirmed 200 status)
  WORKING_ENDPOINTS: {
    NFL: {
      schedule: '/nfl/official/trial/v7/en/games/2025/REG/schedule.json',
      teams: '/nfl/official/trial/v7/en/league/hierarchy.json'
    },
    NBA: {
      schedule: '/nba/trial/v7/en/games/2025/REG/schedule.json',
      teams: '/nba/trial/v7/en/league/hierarchy.json'
    },
    MLB: {
      schedule: '/mlb/trial/v7/en/games/2025/REG/schedule.json',
      teams: '/mlb/trial/v7/en/league/hierarchy.json'
    },
    NHL: {
      schedule: '/nhl/trial/v7/en/games/2025/REG/schedule.json',
      teams: '/nhl/trial/v7/en/league/hierarchy.json'
    }
  },
  
  // NON-WORKING ENDPOINTS (403/502 errors - require higher permissions)
  NON_WORKING_ENDPOINTS: {
    PLAYER_PROPS: '/odds-comparison/v2/en/us/sports/sr:sport:1/player_props',
    BOOKMAKERS: '/odds-comparison/v2/en/us/bookmakers',
    DAILY_SCHEDULES: '/odds-comparison/v2/en/us/schedules/live',
    COMPETITIONS: '/odds-comparison/v2/en/us/competitions'
  }
};

async function testWorkingEndpoints() {
  console.log('🔍 TESTING ONLY WORKING SPORTSRADAR ENDPOINTS');
  console.log('=' .repeat(60));
  console.log('Focus: Generate player props from schedule + teams data only\n');
  
  const results = [];
  
  for (const [sport, endpoints] of Object.entries(SPORTSRADAR_CONFIG.WORKING_ENDPOINTS)) {
    console.log(`🏈 Testing ${sport}...`);
    
    // Test schedule endpoint
    const scheduleResult = await testEndpoint(`${sport} Schedule`, endpoints.schedule);
    
    // Test teams endpoint  
    const teamsResult = await testEndpoint(`${sport} Teams`, endpoints.teams);
    
    if (scheduleResult.success && teamsResult.success) {
      console.log(`✅ ${sport}: Both endpoints working - can generate props`);
      
      // Analyze the data for prop generation
      const propAnalysis = analyzeDataForProps(scheduleResult.data, teamsResult.data, sport);
      console.log(`📊 Prop Generation Potential:`);
      console.log(`   Games: ${propAnalysis.upcomingGames}`);
      console.log(`   Teams: ${propAnalysis.teams}`);
      console.log(`   Estimated Props: ${propAnalysis.estimatedProps}`);
      
      results.push({
        sport,
        working: true,
        ...propAnalysis
      });
    } else {
      console.log(`❌ ${sport}: Some endpoints failing`);
      results.push({
        sport,
        working: false,
        upcomingGames: 0,
        teams: 0,
        estimatedProps: 0
      });
    }
    
    console.log('---\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

async function testEndpoint(name, endpoint) {
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

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`  ❌ ${name}: ${response.status} ${response.statusText}`);
      return { success: false, status: response.status, error: errorText };
    }

    const data = await response.json();
    console.log(`  ✅ ${name}: 200 OK (${(JSON.stringify(data).length / 1024).toFixed(1)} KB)`);
    
    return { success: true, status: 200, data };
    
  } catch (error) {
    console.log(`  🚨 ${name}: Network Error - ${error.message}`);
    return { success: false, error: error.message };
  }
}

function analyzeDataForProps(scheduleData, teamsData, sport) {
  let upcomingGames = 0;
  let teams = 0;
  
  // Count upcoming games (next 14 days)
  const now = new Date();
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  
  if (scheduleData.weeks) {
    // NFL structure
    scheduleData.weeks.forEach(week => {
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
  } else if (scheduleData.games) {
    // Other sports
    scheduleData.games.forEach(game => {
      if (game.scheduled) {
        const gameDate = new Date(game.scheduled);
        if (gameDate >= now && gameDate <= twoWeeksFromNow) {
          upcomingGames++;
        }
      }
    });
  }
  
  // Count teams
  if (teamsData.conferences) {
    teams = teamsData.conferences.reduce((sum, conf) => 
      sum + (conf.divisions?.reduce((divSum, div) => divSum + (div.teams?.length || 0), 0) || 0), 0
    );
  }
  
  // Estimate props (4 props per team per game, limited by smart optimization)
  const propsPerGame = 8; // 4 props per team, 2 teams per game
  const maxGamesToProcess = 10; // We limit to 10 games
  const smartPropLimit = { NFL: 90, NBA: 72, MLB: 54, NHL: 48 }[sport] || 50;
  
  const theoreticalProps = Math.min(upcomingGames, maxGamesToProcess) * propsPerGame;
  const estimatedProps = Math.min(theoreticalProps, smartPropLimit);
  
  return {
    upcomingGames,
    teams,
    estimatedProps,
    theoreticalProps
  };
}

async function generateRealPropsFromWorkingData() {
  console.log('\n🎯 GENERATING REAL PROPS FROM WORKING DATA');
  console.log('=' .repeat(60));
  
  const results = await testWorkingEndpoints();
  const workingSports = results.filter(r => r.working);
  
  console.log('📋 PROP GENERATION SUMMARY:');
  console.log('=' .repeat(40));
  
  let totalEstimatedProps = 0;
  
  workingSports.forEach(sport => {
    console.log(`🏈 ${sport.sport}:`);
    console.log(`   📅 Upcoming Games: ${sport.upcomingGames}`);
    console.log(`   👥 Teams Available: ${sport.teams}`);
    console.log(`   ⚽ Estimated Props: ${sport.estimatedProps}`);
    console.log(`   🧠 Smart Limit Applied: Yes`);
    totalEstimatedProps += sport.estimatedProps;
  });
  
  console.log(`\n📊 TOTAL ESTIMATED PROPS: ${totalEstimatedProps}`);
  
  if (totalEstimatedProps === 0) {
    console.log('\n❌ ZERO PROPS ESTIMATED - This explains the 0/30, 0/20 issue!');
    console.log('🔧 Possible causes:');
    console.log('   1. All sports are off-season (no upcoming games)');
    console.log('   2. Date filtering is too restrictive');
    console.log('   3. Team matching logic is failing');
    console.log('   4. Prop generation logic has bugs');
  } else {
    console.log('\n✅ PROPS SHOULD BE GENERATED');
    console.log('🔧 If still seeing 0/30, 0/20, check:');
    console.log('   1. Real Sportsbook API implementation');
    console.log('   2. Team matching logic');
    console.log('   3. Error handling in prop generation');
    console.log('   4. Cache invalidation');
  }
  
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('1. Focus on NFL and NHL (have upcoming games)');
  console.log('2. Verify team matching works with real SportsRadar team names');
  console.log('3. Add more detailed logging to prop generation');
  console.log('4. Test with a single sport first (NFL)');
  console.log('5. Ensure cache is being populated correctly');
  
  return {
    workingSports: workingSports.length,
    totalSports: results.length,
    totalEstimatedProps,
    sportBreakdown: workingSports
  };
}

// Run the test
generateRealPropsFromWorkingData().catch(console.error);
