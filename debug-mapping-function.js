// Debug the createPlayerPropsFromOdd mapping function
// This will help us understand why props are being skipped

async function testMappingFunction() {
  console.log('🔍 Testing createPlayerPropsFromOdd mapping function...');
  
  // Test the mapping function directly
  const testUrl = 'https://statpedia-player-props.statpedia.workers.dev/debug-extraction';
  
  try {
    const response = await fetch(testUrl);
    const data = await response.json();
    
    if (data.success && data.firstExtractedProp) {
      console.log('📊 Testing with extracted prop:', data.firstExtractedProp);
      
      // Create a test mapping request
      const mockOdd = {
        player: {
          name: data.firstExtractedProp.playerName,
          team: 'PHI' // Default team
        },
        player_name: data.firstExtractedProp.playerName,
        playerID: 'TEST_PLAYER_ID',
        market_key: data.firstExtractedProp.marketName,
        point: data.firstExtractedProp.line,
        over_price: data.firstExtractedProp.overUnder === 'over' ? data.firstExtractedProp.odds : null,
        under_price: data.firstExtractedProp.overUnder === 'under' ? data.firstExtractedProp.odds : null,
        bookmaker_name: data.firstExtractedProp.sportsbook,
        id: 'TEST_ODD_ID'
      };
      
      const mockEvent = {
        eventID: data.firstEvent.eventID,
        date: new Date().toISOString(),
        homeTeam: 'HOME',
        awayTeam: 'AWAY',
        teams: ['HOME', 'AWAY']
      };
      
      console.log('📊 Mock odd object:', JSON.stringify(mockOdd, null, 2));
      console.log('📊 Mock event object:', JSON.stringify(mockEvent, null, 2));
      
      // Test the mapping by calling a debug endpoint
      const mappingTestUrl = 'https://statpedia-player-props.statpedia.workers.dev/debug-insert';
      const mappingResponse = await fetch(mappingTestUrl);
      const mappingData = await mappingResponse.json();
      
      console.log('📊 Mapping test result:', mappingData);
      
    } else {
      console.error('❌ Failed to get extracted prop data');
    }
    
  } catch (error) {
    console.error('❌ Error testing mapping function:', error);
  }
}

testMappingFunction();
