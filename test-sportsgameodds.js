// Test SportsGameOdds API directly
const SPORTSGAMEODDS_API_KEY = '740556c91b9aa5616c0521cc2f09ed74';
const SPORTSGAMEODDS_BASE_URL = 'https://api.sportsgameodds.com';

async function testSportsGameOddsAPI() {
  console.log('🧪 Testing SportsGameOdds API...');
  
  try {
    // Test getting games for NFL
    const response = await fetch(`${SPORTSGAMEODDS_BASE_URL}/v2/sports/1/games`, {
      headers: {
        'Authorization': `Bearer ${SPORTSGAMEODDS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ API Response:', JSON.stringify(data, null, 2));
    
    if (data.games) {
      console.log(`🎯 Found ${data.games.length} games`);
      data.games.slice(0, 3).forEach((game, index) => {
        console.log(`Game ${index + 1}:`, {
          id: game.id,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          gameTime: game.gameTime,
          status: game.status
        });
      });
    } else {
      console.log('⚠️ No games found in response');
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error);
  }
}

// Test getting player props
async function testPlayerPropsAPI() {
  console.log('🧪 Testing SportsGameOdds Player Props API...');
  
  try {
    const response = await fetch(`${SPORTSGAMEODDS_BASE_URL}/v2/sports/1/player-props`, {
      headers: {
        'Authorization': `Bearer ${SPORTSGAMEODDS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Player Props Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Player Props API Error:', response.status, errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Player Props Response:', JSON.stringify(data, null, 2));
    
    if (data.playerProps) {
      console.log(`🎯 Found ${data.playerProps.length} player props`);
    } else {
      console.log('⚠️ No player props found in response');
    }
    
  } catch (error) {
    console.error('❌ Player Props Network Error:', error);
  }
}

// Run tests
testSportsGameOddsAPI().then(() => {
  console.log('\n' + '='.repeat(50) + '\n');
  return testPlayerPropsAPI();
}).then(() => {
  console.log('\n✅ All tests completed');
}).catch(error => {
  console.error('❌ Test failed:', error);
});
