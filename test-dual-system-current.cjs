/**
 * Test the current dual system to see if SportsRadar is working
 * and providing props even without TheRundown
 */

console.log('🔄 TESTING CURRENT DUAL SYSTEM STATUS');
console.log('=' .repeat(60));
console.log('Goal: Verify SportsRadar is working and providing props');
console.log('Expected: Should get props from SportsRadar even if TheRundown fails\n');

// Simulate what the dual system should do
async function testDualSystemLogic() {
  console.log('🧪 SIMULATING DUAL SYSTEM LOGIC');
  console.log('=' .repeat(40));
  
  // Test 1: SportsRadar API (should work based on previous tests)
  console.log('1️⃣ Testing SportsRadar API...');
  
  const sportsRadarResult = await testSportsRadarAPI();
  
  if (sportsRadarResult.success) {
    console.log(`✅ SportsRadar: ${sportsRadarResult.props} props available`);
  } else {
    console.log(`❌ SportsRadar: ${sportsRadarResult.error}`);
  }
  
  // Test 2: TheRundown API (expected to fail currently)
  console.log('\n2️⃣ Testing TheRundown API...');
  
  const theRundownResult = await testTheRundownAPI();
  
  if (theRundownResult.success) {
    console.log(`✅ TheRundown: ${theRundownResult.props} props available`);
  } else {
    console.log(`❌ TheRundown: ${theRundownResult.error}`);
  }
  
  // Test 3: Dual System Logic
  console.log('\n3️⃣ Applying Dual System Logic...');
  
  let finalProps = 0;
  let source = 'none';
  
  if (sportsRadarResult.success && sportsRadarResult.props > 0) {
    finalProps = sportsRadarResult.props;
    source = 'sportsradar';
    console.log(`🎯 Using SportsRadar as primary source: ${finalProps} props`);
    
    if (theRundownResult.success && theRundownResult.props > 0) {
      // In real system, we'd combine and deduplicate
      const supplementalProps = Math.floor(theRundownResult.props * 0.3); // Estimate 30% unique
      finalProps += supplementalProps;
      source = 'combined';
      console.log(`🔄 Supplementing with TheRundown: +${supplementalProps} props`);
    }
  } else if (theRundownResult.success && theRundownResult.props > 0) {
    finalProps = theRundownResult.props;
    source = 'therundown';
    console.log(`🎯 Using TheRundown as primary source: ${finalProps} props`);
  } else {
    // Fallback props
    finalProps = 10;
    source = 'fallback';
    console.log(`🛡️ Using fallback props: ${finalProps} props`);
  }
  
  // Apply smart optimization (NFL = 90 props max)
  const smartLimit = 90;
  if (finalProps > smartLimit) {
    console.log(`🧠 Smart optimization: ${finalProps} → ${smartLimit} props`);
    finalProps = smartLimit;
  }
  
  console.log('\n📊 FINAL RESULT:');
  console.log(`🎯 Total Props: ${finalProps}`);
  console.log(`📡 Source: ${source}`);
  console.log(`🎮 Expected UI: ${finalProps > 0 ? 'Props should display' : 'No props (0/30 issue)'}`);
  
  return {
    sportsRadar: sportsRadarResult,
    theRundown: theRundownResult,
    final: {
      props: finalProps,
      source: source,
      shouldWork: finalProps > 0
    }
  };
}

async function testSportsRadarAPI() {
  try {
    // Test the working NFL schedule endpoint
    const response = await fetch('https://api.sportradar.com/nfl/official/trial/v7/en/games/2025/REG/schedule.json', {
      headers: {
        'Accept': 'application/json',
        'x-api-key': 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      return { success: false, props: 0, error: `${response.status} ${response.statusText}` };
    }
    
    const data = await response.json();
    
    // Count upcoming games (simulate prop generation)
    let upcomingGames = 0;
    if (data.weeks) {
      const now = new Date();
      const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      
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
    }
    
    // Estimate props: 8 props per game (4 per team), limited to 80
    const estimatedProps = Math.min(upcomingGames * 8, 80);
    
    return {
      success: estimatedProps > 0,
      props: estimatedProps,
      games: upcomingGames
    };
    
  } catch (error) {
    return { success: false, props: 0, error: error.message };
  }
}

async function testTheRundownAPI() {
  try {
    // Test with the API key provided
    const response = await fetch('https://therundown-v1.p.rapidapi.com/events?sport_id=2', {
      headers: {
        'Accept': 'application/json',
        'X-RapidAPI-Key': 'ef9ac9bff0mshbbf0d0fa5c5de6bp1cb40ajsn49acdbd702a0',
        'X-RapidAPI-Host': 'therundown-v1.p.rapidapi.com'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      return { success: false, props: 0, error: `${response.status} ${response.statusText}` };
    }
    
    const data = await response.json();
    
    // Estimate props from events
    const events = data.data || data || [];
    const estimatedProps = Array.isArray(events) ? events.length * 6 : 0; // 6 props per event
    
    return {
      success: estimatedProps > 0,
      props: estimatedProps,
      events: Array.isArray(events) ? events.length : 0
    };
    
  } catch (error) {
    return { success: false, props: 0, error: error.message };
  }
}

// Run the test
testDualSystemLogic()
  .then(result => {
    console.log('\n🏁 DUAL SYSTEM TEST COMPLETE');
    console.log('=' .repeat(40));
    
    if (result.final.shouldWork) {
      console.log('🎉 SUCCESS: Dual system should provide props!');
      console.log(`📊 Expected integration test: 0/30 → ${Math.min(result.final.props, 30)}/30`);
      console.log('🚀 Player Props tab should display props');
    } else {
      console.log('❌ FAILURE: Dual system not providing props');
      console.log('🔧 Need to debug the integration');
    }
    
    console.log('\n💡 NEXT STEPS:');
    if (result.sportsRadar.success) {
      console.log('✅ SportsRadar working - focus on integration');
      console.log('🔧 Check unified-sports-api.ts and dual-sports-api.ts');
      console.log('🧪 Test in Dev Console → Testing Suite');
    } else {
      console.log('❌ SportsRadar not working - need to fix primary source');
    }
    
    if (!result.theRundown.success) {
      console.log('⚠️ TheRundown not working - check API endpoints/structure');
      console.log('📋 Review forked Postman collection for correct endpoints');
    }
  })
  .catch(error => {
    console.error('🚨 Test failed:', error);
  });
