#!/usr/bin/env node

// Test frontend integration with mock data
// This script tests the Player Props tab with mock data that includes team enrichment

console.log('🧪 Testing Frontend Integration with Mock Data');
console.log('==============================================\n');

// Mock data that simulates what the enhanced team enrichment should produce
const mockPlayerProps = [
  {
    id: 'prop-1',
    playerId: 'kenneth-walker-iii',
    playerName: 'Kenneth Walker III',
    team: 'SEA',
    teamAbbr: 'SEA',
    opponent: 'ARI',
    opponentAbbr: 'ARI',
    propType: 'Rushing Yards',
    line: 85.5,
    overOdds: -110,
    underOdds: -110,
    gameDate: '2025-10-11',
    gameTime: '2025-10-11T20:00:00Z',
    sport: 'nfl',
    gameId: 'game-1'
  },
  {
    id: 'prop-2',
    playerId: 'lebron-james',
    playerName: 'LeBron James',
    team: 'LAL',
    teamAbbr: 'LAL',
    opponent: 'GSW',
    opponentAbbr: 'GSW',
    propType: 'Points',
    line: 25.5,
    overOdds: -105,
    underOdds: -115,
    gameDate: '2025-10-11',
    gameTime: '2025-10-11T22:30:00Z',
    sport: 'nba',
    gameId: 'game-2'
  },
  {
    id: 'prop-3',
    playerId: 'aaron-rodgers',
    playerName: 'Aaron Rodgers',
    team: 'NYJ',
    teamAbbr: 'NYJ',
    opponent: 'NE',
    opponentAbbr: 'NE',
    propType: 'Passing Yards',
    line: 275.5,
    overOdds: -120,
    underOdds: +100,
    gameDate: '2025-10-11',
    gameTime: '2025-10-11T13:00:00Z',
    sport: 'nfl',
    gameId: 'game-3'
  }
];

async function testCloudflareWorkerWithMockData() {
  console.log('📡 Testing Cloudflare Worker with Mock Data...');
  
  try {
    // Test if we can reach the worker
    const response = await fetch('https://statpedia-player-props.statpedia.workers.dev/');
    const data = await response.json();
    
    console.log('✅ Worker Status:', data.message);
    console.log('✅ Available Leagues:', data.leagues.join(', '));
    
    // Test the API endpoint structure
    console.log('\n🔍 Testing API Endpoint Structure...');
    const apiResponse = await fetch('https://statpedia-player-props.statpedia.workers.dev/api/player-props?sport=nfl');
    const apiData = await apiResponse.json();
    
    console.log('✅ API Response Structure:', {
      success: apiData.success,
      hasData: !!apiData.data,
      dataLength: apiData.data?.length || 0,
      totalProps: apiData.totalProps,
      totalEvents: apiData.totalEvents
    });
    
    if (apiData.success && apiData.data) {
      console.log('✅ API is working and returning data structure');
      
      // Check for UNK values in the response
      const unkCount = apiData.data.filter(prop => 
        prop.team === 'UNK' || prop.opponent === 'UNK' ||
        prop.teamAbbr === 'UNK' || prop.opponentAbbr === 'UNK'
      ).length;
      
      console.log(`📊 UNK Analysis: ${unkCount}/${apiData.data.length} props have UNK values`);
      
      if (unkCount === 0) {
        console.log('✅ Perfect! No UNK values found in API response');
      } else {
        console.log('⚠️  Some UNK values found - team enrichment may need adjustment');
      }
    } else {
      console.log('ℹ️  No data returned (likely due to API key issue)');
    }
    
  } catch (error) {
    console.log('❌ Worker test failed:', error.message);
  }
  
  console.log('');
}

function analyzeMockData() {
  console.log('🎯 Analyzing Mock Data for Team Enrichment...');
  
  console.log('\n📋 Mock Player Props:');
  mockPlayerProps.forEach((prop, index) => {
    console.log(`   ${index + 1}. ${prop.playerName}`);
    console.log(`      Team: ${prop.team} vs ${prop.opponent}`);
    console.log(`      Prop: ${prop.propType} ${prop.line}`);
    console.log(`      Sport: ${prop.sport.toUpperCase()}`);
    console.log('');
  });
  
  // Check for UNK values in mock data
  const unkCount = mockPlayerProps.filter(prop => 
    prop.team === 'UNK' || prop.opponent === 'UNK' ||
    prop.teamAbbr === 'UNK' || prop.opponentAbbr === 'UNK'
  ).length;
  
  console.log('📊 Mock Data Analysis:');
  console.log(`   Total props: ${mockPlayerProps.length}`);
  console.log(`   UNK count: ${unkCount}`);
  console.log(`   Resolution rate: ${((mockPlayerProps.length - unkCount) / mockPlayerProps.length * 100).toFixed(1)}%`);
  
  if (unkCount === 0) {
    console.log('✅ Perfect! Mock data has no UNK values');
  } else {
    console.log('⚠️  Mock data has UNK values');
  }
  
  console.log('');
}

function testFrontendQueryStructure() {
  console.log('🔍 Testing Frontend Query Structure...');
  
  // Simulate what the frontend should expect
  const expectedFields = [
    'id', 'playerId', 'playerName', 'team', 'teamAbbr', 'opponent', 'opponentAbbr',
    'propType', 'line', 'overOdds', 'underOdds', 'gameDate', 'gameTime', 'sport'
  ];
  
  console.log('📋 Expected Frontend Fields:');
  expectedFields.forEach(field => {
    console.log(`   ✓ ${field}`);
  });
  
  console.log('\n🔍 Mock Data Field Analysis:');
  mockPlayerProps.forEach((prop, index) => {
    const missingFields = expectedFields.filter(field => !(field in prop));
    
    if (missingFields.length === 0) {
      console.log(`   ✅ Prop ${index + 1}: All expected fields present`);
    } else {
      console.log(`   ❌ Prop ${index + 1}: Missing fields: ${missingFields.join(', ')}`);
    }
  });
  
  console.log('');
}

function generateFrontendTestInstructions() {
  console.log('📋 Frontend Integration Test Instructions');
  console.log('==========================================');
  console.log('');
  console.log('🎯 What to Test in Your UI:');
  console.log('');
  console.log('1. **Player Props Tab Loading**:');
  console.log('   - Open your app and navigate to Player Props tab');
  console.log('   - Check browser console for API calls to Cloudflare Worker');
  console.log('   - Look for calls to: /api/player-props?sport=nfl');
  console.log('');
  console.log('2. **Team Display**:');
  console.log('   - Look for team abbreviations like "SEA", "ARI", "LAL", "GSW"');
  console.log('   - Verify no "UNK" values in team/opponent fields');
  console.log('   - Check that team logos are displaying correctly');
  console.log('');
  console.log('3. **Data Structure**:');
  console.log('   - Verify player names are displaying');
  console.log('   - Check prop types (Rushing Yards, Points, etc.)');
  console.log('   - Verify odds and lines are showing');
  console.log('');
  console.log('4. **Error Handling**:');
  console.log('   - If no data shows, check browser console for errors');
  console.log('   - Look for 401 (API key) or 404 (endpoint) errors');
  console.log('   - Check if fallback to Supabase is working');
  console.log('');
  console.log('🔧 Debugging Commands:');
  console.log('');
  console.log('```javascript');
  console.log('// Test in browser console:');
  console.log('fetch("https://statpedia-player-props.statpedia.workers.dev/api/player-props?sport=nfl")');
  console.log('  .then(r => r.json())');
  console.log('  .then(data => console.log("API Response:", data));');
  console.log('```');
  console.log('');
  console.log('🎯 Expected Results:');
  console.log('');
  console.log('✅ **Success Case**:');
  console.log('   - Player Props tab shows data');
  console.log('   - Teams display as "SEA vs ARI", "LAL vs GSW"');
  console.log('   - No UNK values anywhere');
  console.log('   - Props are properly formatted');
  console.log('');
  console.log('❌ **Failure Cases**:');
  console.log('   - Empty Player Props tab');
  console.log('   - UNK values in team/opponent fields');
  console.log('   - API errors in console');
  console.log('   - Fallback to Supabase (indicates worker issue)');
  console.log('');
}

// Main execution
async function main() {
  await testCloudflareWorkerWithMockData();
  analyzeMockData();
  testFrontendQueryStructure();
  generateFrontendTestInstructions();
  
  console.log('🎉 Frontend Integration Testing Complete!');
  console.log('');
  console.log('💡 Next Steps:');
  console.log('   1. Test your Player Props tab in the UI');
  console.log('   2. Check for team abbreviations (SEA, ARI, LAL, etc.)');
  console.log('   3. Verify no UNK values are showing');
  console.log('   4. If issues persist, check browser console for errors');
}

main().catch(console.error);
