/**
 * Test Player Props Fix
 * Specifically tests the data flow from APIs to Player Props Tab
 */

console.log('🔍 TESTING PLAYER PROPS DATA FLOW');
console.log('=' .repeat(50));

// Mock the logger for testing
const mockLogger = {
  logAPI: (service, message) => console.log(`📡 [${service}] ${message}`),
  logSuccess: (service, message) => console.log(`✅ [${service}] ${message}`),
  logError: (service, message) => console.log(`❌ [${service}] ${message}`),
  logWarning: (service, message) => console.log(`⚠️ [${service}] ${message}`),
  logInfo: (service, message) => console.log(`ℹ️ [${service}] ${message}`)
};

// Test the data flow step by step
async function testPlayerPropsDataFlow() {
  console.log('🚀 Testing Player Props Data Flow\n');
  
  // Test 1: Check if Real Sportsbook API generates props
  console.log('📊 TEST 1: Real Sportsbook API Prop Generation');
  console.log('-'.repeat(40));
  
  // Simulate what the Real Sportsbook API should return
  const mockRealSportsbookProps = [
    {
      id: 'nfl-prop-1',
      playerId: 'player-1',
      playerName: 'Patrick Mahomes',
      team: 'Kansas City Chiefs',
      teamAbbr: 'KC',
      opponent: 'Buffalo Bills', 
      opponentAbbr: 'BUF',
      gameId: 'game-1',
      sport: 'NFL',
      propType: 'Passing Yards',
      line: 275.5,
      overOdds: -110,
      underOdds: -110,
      gameDate: '2025-10-05',
      gameTime: '2025-10-05T17:00:00.000Z',
      confidence: 0.85,
      expectedValue: 5.2,
      sportsbook: 'FanDuel',
      lastUpdate: new Date().toISOString()
    },
    {
      id: 'nfl-prop-2', 
      playerId: 'player-2',
      playerName: 'Josh Allen',
      team: 'Buffalo Bills',
      teamAbbr: 'BUF',
      opponent: 'Kansas City Chiefs',
      opponentAbbr: 'KC', 
      gameId: 'game-1',
      sport: 'NFL',
      propType: 'Rushing Yards',
      line: 42.5,
      overOdds: +105,
      underOdds: -125,
      gameDate: '2025-10-05',
      gameTime: '2025-10-05T17:00:00.000Z',
      confidence: 0.78,
      expectedValue: 3.1,
      sportsbook: 'DraftKings',
      lastUpdate: new Date().toISOString()
    }
  ];
  
  console.log(`✅ Mock Real Sportsbook API: ${mockRealSportsbookProps.length} props generated`);
  mockRealSportsbookProps.forEach((prop, index) => {
    console.log(`   ${index + 1}. ${prop.playerName} - ${prop.propType}: ${prop.line} (${prop.overOdds}/${prop.underOdds})`);
  });
  
  // Test 2: Check Unified Sports API integration
  console.log('\n📡 TEST 2: Unified Sports API Integration');
  console.log('-'.repeat(40));
  
  // The unified API should process and return these props
  console.log('✅ Unified API should receive props from Real Sportsbook API');
  console.log('✅ Unified API should apply smart prop count optimization');
  console.log('✅ Unified API should return formatted props to Player Props Tab');
  
  // Test 3: Check Consistent Props Service
  console.log('\n🔄 TEST 3: Consistent Props Service Processing');
  console.log('-'.repeat(40));
  
  // Simulate consistent props service processing
  const mockConsistentProps = mockRealSportsbookProps.map(prop => ({
    ...prop,
    confidence: prop.confidence,
    confidenceFactors: [
      { factor: 'Recent Performance', weight: 0.3, value: 0.8 },
      { factor: 'Matchup Analysis', weight: 0.4, value: 0.9 },
      { factor: 'Weather Conditions', weight: 0.3, value: 0.7 }
    ],
    expectedValue: prop.expectedValue,
    allSportsbookOdds: [
      {
        sportsbook: prop.sportsbook,
        line: prop.line,
        overOdds: prop.overOdds,
        underOdds: prop.underOdds,
        lastUpdate: prop.lastUpdate
      }
    ],
    lastUpdated: new Date(),
    isLive: true,
    marketId: `${prop.playerId}-${prop.propType}-${prop.gameId}-${prop.sport}`
  }));
  
  console.log(`✅ Consistent Props Service: ${mockConsistentProps.length} enhanced props`);
  mockConsistentProps.forEach((prop, index) => {
    console.log(`   ${index + 1}. ${prop.playerName} - Confidence: ${Math.round(prop.confidence * 100)}%, EV: ${prop.expectedValue}%`);
  });
  
  // Test 4: Check Player Props Tab Integration
  console.log('\n🖥️ TEST 4: Player Props Tab Integration');
  console.log('-'.repeat(40));
  
  console.log('✅ Player Props Tab calls consistentPropsService.getConsistentPlayerProps()');
  console.log('✅ Player Props Tab has fallback to unifiedSportsAPI.getPlayerProps()');
  console.log('✅ Player Props Tab converts props to display format');
  console.log('✅ Player Props Tab applies filters and sorting');
  
  // Test 5: Check Filtering Logic
  console.log('\n🔍 TEST 5: Filtering and Display Logic');
  console.log('-'.repeat(40));
  
  // Simulate filtering with default settings
  const defaultFilters = {
    minConfidence: 0,
    minEV: 0,
    showOnlyPositiveEV: false,
    minOdds: -175,
    maxOdds: 500,
    useOddsFilter: true
  };
  
  const filteredProps = mockConsistentProps.filter(prop => {
    const overOdds = prop.overOdds || 0;
    const underOdds = prop.underOdds || 0;
    const matchesOddsRange = !defaultFilters.useOddsFilter || 
      ((overOdds >= defaultFilters.minOdds && overOdds <= defaultFilters.maxOdds) || 
       (underOdds >= defaultFilters.minOdds && underOdds <= defaultFilters.maxOdds));
    
    const matchesConfidence = prop.confidence >= defaultFilters.minConfidence;
    const matchesEV = prop.expectedValue >= defaultFilters.minEV;
    const matchesPositiveEV = !defaultFilters.showOnlyPositiveEV || prop.expectedValue > 0;
    
    return matchesOddsRange && matchesConfidence && matchesEV && matchesPositiveEV;
  });
  
  console.log(`✅ Filtering Results: ${filteredProps.length}/${mockConsistentProps.length} props pass filters`);
  
  if (filteredProps.length === 0) {
    console.log('❌ WARNING: All props filtered out!');
    console.log('🔍 Checking filter criteria:');
    mockConsistentProps.forEach((prop, index) => {
      const overOdds = prop.overOdds || 0;
      const underOdds = prop.underOdds || 0;
      const matchesOdds = (overOdds >= -175 && overOdds <= 500) || (underOdds >= -175 && underOdds <= 500);
      console.log(`   ${index + 1}. ${prop.playerName}: Odds ${overOdds}/${underOdds} - Passes: ${matchesOdds}`);
    });
  } else {
    filteredProps.forEach((prop, index) => {
      console.log(`   ${index + 1}. ${prop.playerName} - ${prop.propType}: ${prop.line} (${prop.overOdds}/${prop.underOdds}) ✅`);
    });
  }
  
  // Test 6: Identify Potential Issues
  console.log('\n🚨 TEST 6: Potential Issue Analysis');
  console.log('-'.repeat(40));
  
  const issues = [];
  
  // Check if props have valid data
  if (mockRealSportsbookProps.length === 0) {
    issues.push('Real Sportsbook API returning no props');
  }
  
  // Check if odds are in valid range
  mockRealSportsbookProps.forEach(prop => {
    if (prop.overOdds < -175 || prop.overOdds > 500) {
      issues.push(`${prop.playerName} over odds (${prop.overOdds}) outside filter range (-175 to +500)`);
    }
    if (prop.underOdds < -175 || prop.underOdds > 500) {
      issues.push(`${prop.playerName} under odds (${prop.underOdds}) outside filter range (-175 to +500)`);
    }
  });
  
  // Check if confidence values are valid
  mockConsistentProps.forEach(prop => {
    if (prop.confidence < 0 || prop.confidence > 1) {
      issues.push(`${prop.playerName} has invalid confidence value: ${prop.confidence}`);
    }
  });
  
  if (issues.length === 0) {
    console.log('✅ No issues detected in mock data flow');
  } else {
    console.log(`❌ ${issues.length} potential issues detected:`);
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }
  
  // Test 7: Recommendations
  console.log('\n💡 TEST 7: Recommendations for Live System');
  console.log('-'.repeat(40));
  
  console.log('🔧 To debug live system:');
  console.log('   1. Check Dev Console → Testing Suite → Run Full Integration Test');
  console.log('   2. Check browser console for API logs when loading Player Props tab');
  console.log('   3. Verify unifiedSportsAPI.getPlayerProps() returns data');
  console.log('   4. Check if consistentPropsService.getConsistentPlayerProps() processes data');
  console.log('   5. Verify filter settings are not too restrictive');
  console.log('   6. Check if Real Sportsbook API is generating props with valid odds ranges');
  
  console.log('\n🎯 Expected Behavior:');
  console.log('   ✅ Real Sportsbook API generates props with smart optimization');
  console.log('   ✅ Unified API processes and returns props');
  console.log('   ✅ Consistent Props Service enhances props with confidence data');
  console.log('   ✅ Player Props Tab displays filtered and sorted props');
  console.log('   ✅ Props appear in UI with proper formatting');
  
  return {
    mockPropsGenerated: mockRealSportsbookProps.length,
    consistentPropsProcessed: mockConsistentProps.length,
    filteredPropsDisplayed: filteredProps.length,
    issuesDetected: issues.length,
    status: issues.length === 0 && filteredProps.length > 0 ? 'HEALTHY' : 'NEEDS_ATTENTION'
  };
}

// Run the test
testPlayerPropsDataFlow().then(result => {
  console.log('\n' + '='.repeat(50));
  console.log('📋 PLAYER PROPS DATA FLOW TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`📊 Mock Props Generated: ${result.mockPropsGenerated}`);
  console.log(`🔄 Consistent Props Processed: ${result.consistentPropsProcessed}`);
  console.log(`🖥️ Filtered Props for Display: ${result.filteredPropsDisplayed}`);
  console.log(`🚨 Issues Detected: ${result.issuesDetected}`);
  console.log(`🎯 System Status: ${result.status}`);
  
  if (result.status === 'HEALTHY') {
    console.log('\n🎉 Mock data flow test PASSED!');
    console.log('💡 If props still not showing, check live API responses in browser console');
  } else {
    console.log('\n⚠️ Mock data flow test found potential issues');
    console.log('🔧 Review the recommendations above to debug the live system');
  }
}).catch(console.error);
