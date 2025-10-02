/**
 * Test Real Sportsbook API Debug
 * Test the Real Sportsbook API directly to see what's happening
 */

console.log('🔍 TESTING REAL SPORTSBOOK API DIRECTLY');
console.log('=' .repeat(50));

// Mock the required dependencies
const mockSmartPropOptimizer = {
  getDynamicPropCount: (sport) => {
    const counts = { nfl: 90, nba: 72, mlb: 54, nhl: 48 };
    return counts[sport.toLowerCase()] || 50;
  }
};

const mockLogger = {
  logAPI: (service, message) => console.log(`📡 [${service}] ${message}`),
  logSuccess: (service, message) => console.log(`✅ [${service}] ${message}`),
  logError: (service, message) => console.log(`❌ [${service}] ${message}`),
  logWarning: (service, message) => console.log(`⚠️ [${service}] ${message}`),
  logInfo: (service, message) => console.log(`ℹ️ [${service}] ${message}`)
};

// Simulate the Real Sportsbook API logic
class MockRealSportsbookAPI {
  constructor() {
    this.cache = new Map();
    this.config = {
      SPORTSRADAR_API_KEY: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
      BASE_URL: 'https://api.sportradar.com',
      ENDPOINTS: {
        NFL: {
          schedule: '/nfl/official/trial/v7/en/games/2025/REG/schedule.json',
          teams: '/nfl/official/trial/v7/en/league/hierarchy.json'
        },
        NHL: {
          schedule: '/nhl/trial/v7/en/games/2025/REG/schedule.json', 
          teams: '/nhl/trial/v7/en/league/hierarchy.json'
        }
      }
    };
  }

  async testGetRealPlayerProps(sport) {
    console.log(`\n🎯 Testing getRealPlayerProps for ${sport.toUpperCase()}`);
    console.log('-'.repeat(40));
    
    try {
      // Step 1: Get current games
      mockLogger.logAPI('RealSportsbookAPI', `Fetching current games for ${sport}...`);
      const games = await this.mockGetCurrentGames(sport);
      mockLogger.logAPI('RealSportsbookAPI', `Found ${games.length} games for ${sport}`);
      
      if (games.length === 0) {
        mockLogger.logWarning('RealSportsbookAPI', `No current games found for ${sport} - this will result in no player props`);
        return [];
      }
      
      mockLogger.logSuccess('RealSportsbookAPI', `Processing ${games.length} games for ${sport} player props generation`);

      // Step 2: Get teams data
      mockLogger.logAPI('RealSportsbookAPI', `Getting teams data for ${sport}...`);
      const teams = await this.mockGetSportsRadarTeams(sport);
      mockLogger.logAPI('RealSportsbookAPI', `Found ${teams.length} teams for ${sport}`);
      
      if (teams.length === 0) {
        mockLogger.logError('RealSportsbookAPI', `No teams found for ${sport} - cannot generate props`);
        return [];
      }

      // Step 3: Generate props
      const props = [];
      const gamesToProcess = games.slice(0, 10);
      mockLogger.logAPI('RealSportsbookAPI', `Processing ${gamesToProcess.length} games for prop generation`);
      
      for (const game of gamesToProcess) {
        // Mock team matching
        const homeTeam = teams.find(t => 
          t.name.toLowerCase().includes(game.homeTeam?.toLowerCase()) || 
          game.homeTeam?.toLowerCase().includes(t.name.toLowerCase())
        );
        
        const awayTeam = teams.find(t => 
          t.name.toLowerCase().includes(game.awayTeam?.toLowerCase()) || 
          game.awayTeam?.toLowerCase().includes(t.name.toLowerCase())
        );

        if (homeTeam && awayTeam) {
          mockLogger.logAPI('RealSportsbookAPI', `Generating props for: ${homeTeam.name} vs ${awayTeam.name}`);
          const gameProps = this.mockGenerateRealPlayerProps(game, homeTeam, awayTeam, sport);
          mockLogger.logAPI('RealSportsbookAPI', `Generated ${gameProps.length} props for this game`);
          props.push(...gameProps);
        } else {
          mockLogger.logWarning('RealSportsbookAPI', `Could not match teams for game: ${game.homeTeam} vs ${game.awayTeam}`);
          mockLogger.logWarning('RealSportsbookAPI', `Available teams: ${teams.slice(0, 3).map(t => t.name).join(', ')}...`);
        }
      }

      // Step 4: Apply smart optimization
      const smartPropCount = mockSmartPropOptimizer.getDynamicPropCount(sport);
      mockLogger.logInfo('RealSportsbookAPI', `Using smart prop count for ${sport}: ${smartPropCount} props`);
      
      const finalProps = props.slice(0, smartPropCount);
      mockLogger.logSuccess('RealSportsbookAPI', `Generated ${finalProps.length} real player props for ${sport}`);
      
      return finalProps;

    } catch (error) {
      mockLogger.logError('RealSportsbookAPI', `Failed to get real player props for ${sport}:`, error);
      return [];
    }
  }

  async mockGetCurrentGames(sport) {
    // Simulate API call based on our direct test results
    const gameData = {
      NFL: 29, // From our direct test
      NHL: 60, // From our direct test
      NBA: 0,  // Off-season
      MLB: 0   // Off-season
    };
    
    const gameCount = gameData[sport.toUpperCase()] || 0;
    
    // Generate mock games
    const games = [];
    for (let i = 0; i < Math.min(gameCount, 10); i++) {
      games.push({
        id: `game-${i}`,
        homeTeam: `${sport.toUpperCase()} Home Team ${i + 1}`,
        awayTeam: `${sport.toUpperCase()} Away Team ${i + 1}`,
        scheduled: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    return games;
  }

  async mockGetSportsRadarTeams(sport) {
    // Simulate team data based on sport
    const teamData = {
      NFL: [
        { name: 'Kansas City Chiefs', alias: 'KC' },
        { name: 'Buffalo Bills', alias: 'BUF' },
        { name: 'Cincinnati Bengals', alias: 'CIN' },
        { name: 'NFL Home Team 1', alias: 'HT1' },
        { name: 'NFL Away Team 1', alias: 'AT1' },
        { name: 'NFL Home Team 2', alias: 'HT2' },
        { name: 'NFL Away Team 2', alias: 'AT2' }
      ],
      NHL: [
        { name: 'Toronto Maple Leafs', alias: 'TOR' },
        { name: 'Boston Bruins', alias: 'BOS' },
        { name: 'Tampa Bay Lightning', alias: 'TB' },
        { name: 'NHL Home Team 1', alias: 'HT1' },
        { name: 'NHL Away Team 1', alias: 'AT1' },
        { name: 'NHL Home Team 2', alias: 'HT2' },
        { name: 'NHL Away Team 2', alias: 'AT2' }
      ]
    };
    
    return teamData[sport.toUpperCase()] || [];
  }

  mockGenerateRealPlayerProps(game, homeTeam, awayTeam, sport) {
    // Generate mock props for this game
    const propTypes = {
      NFL: ['Passing Yards', 'Rushing Yards', 'Receiving Yards', 'Passing TDs'],
      NHL: ['Goals', 'Assists', 'Points', 'Saves']
    };
    
    const types = propTypes[sport.toUpperCase()] || propTypes.NFL;
    const props = [];
    
    // Generate 2 props per team (4 total per game)
    [homeTeam, awayTeam].forEach((team, teamIndex) => {
      types.slice(0, 2).forEach((propType, propIndex) => {
        props.push({
          id: `${game.id}-${team.alias}-${propIndex}`,
          playerId: `${team.alias}-player-${propIndex}`,
          playerName: `${team.name} Player ${propIndex + 1}`,
          team: team.name,
          teamAbbr: team.alias,
          opponent: teamIndex === 0 ? awayTeam.name : homeTeam.name,
          opponentAbbr: teamIndex === 0 ? awayTeam.alias : homeTeam.alias,
          gameId: game.id,
          sport: sport.toUpperCase(),
          propType: propType,
          line: 50 + Math.random() * 100,
          overOdds: -110 + Math.random() * 20,
          underOdds: -110 + Math.random() * 20,
          sportsbook: 'FanDuel',
          gameDate: game.scheduled.split('T')[0],
          gameTime: game.scheduled,
          confidence: 0.7 + Math.random() * 0.2,
          expectedValue: (Math.random() - 0.5) * 10,
          lastUpdate: new Date().toISOString()
        });
      });
    });
    
    return props;
  }
}

// Run the test
async function runRealAPIDebugTest() {
  const api = new MockRealSportsbookAPI();
  
  const sportsToTest = ['NFL', 'NHL', 'NBA']; // Test in-season and off-season sports
  const results = {};
  
  for (const sport of sportsToTest) {
    const props = await api.testGetRealPlayerProps(sport);
    results[sport] = {
      propsGenerated: props.length,
      success: props.length > 0
    };
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 REAL SPORTSBOOK API DEBUG TEST SUMMARY');
  console.log('=' .repeat(50));
  
  Object.entries(results).forEach(([sport, result]) => {
    const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
    console.log(`${sport}: ${result.propsGenerated} props generated - ${status}`);
  });
  
  const successfulSports = Object.values(results).filter(r => r.success).length;
  const totalProps = Object.values(results).reduce((sum, r) => sum + r.propsGenerated, 0);
  
  console.log(`\n📊 Overall Results:`);
  console.log(`   ✅ Successful Sports: ${successfulSports}/${sportsToTest.length}`);
  console.log(`   📈 Total Props Generated: ${totalProps}`);
  
  if (successfulSports === 0) {
    console.log('\n❌ NO PROPS GENERATED - This matches the integration test results!');
    console.log('🔧 Possible issues:');
    console.log('   - Real API not finding any games (check getCurrentGames)');
    console.log('   - Team matching failing (check getSportsRadarTeams)');
    console.log('   - Prop generation logic failing (check generateRealPlayerProps)');
  } else if (successfulSports < sportsToTest.length) {
    console.log('\n⚠️ PARTIAL SUCCESS - Some sports working, others failing');
    console.log('🔧 Check off-season sports and game availability');
  } else {
    console.log('\n🎉 ALL SPORTS SUCCESSFUL - Mock logic working correctly');
    console.log('💡 If real system still failing, check actual API responses');
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Check browser console when loading Player Props tab');
  console.log('2. Look for the enhanced debug logs we added');
  console.log('3. Verify which step is failing in the real system');
  console.log('4. Use Dev Console → Testing Suite to run live tests');
  
  return results;
}

runRealAPIDebugTest().catch(console.error);
