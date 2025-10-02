// Test script to debug the player props API issue
console.log('🔍 Starting player props debugging...');

// Test the API calls directly
async function testAPIs() {
  try {
    console.log('\n=== Testing SportsGameOdds API Direct ===');
    
    // Import the API (this will work in browser console)
    const { sportsGameOddsAPI } = await import('./src/services/sportsgameodds-api.js');
    
    // Test cache status first
    console.log('Cache Status:', sportsGameOddsAPI.getPlayerPropsCacheStatus());
    console.log('Cached Sports:', sportsGameOddsAPI.getCachedSports());
    console.log('Last Cache Update:', sportsGameOddsAPI.getLastCacheUpdate());
    
    // Clear cache and test fresh fetch
    console.log('\n--- Clearing cache and testing fresh fetch ---');
    sportsGameOddsAPI.clearPlayerPropsCache();
    
    // Test NFL props
    console.log('Fetching NFL props...');
    const nflProps = await sportsGameOddsAPI.getPlayerProps('nfl');
    console.log(`NFL Props Count: ${nflProps.length}`);
    
    if (nflProps.length > 0) {
      console.log('First NFL Prop:', nflProps[0]);
      console.log('Sample props:', nflProps.slice(0, 3));
    } else {
      console.log('❌ No NFL props returned');
    }
    
    // Check cache status after fetch
    console.log('\n--- After fetch ---');
    console.log('Cache Status:', sportsGameOddsAPI.getPlayerPropsCacheStatus());
    console.log('Cached Sports:', sportsGameOddsAPI.getCachedSports());
    
    // Test unified API chain
    console.log('\n=== Testing Unified API Chain ===');
    const { unifiedSportsAPI } = await import('./src/services/unified-sports-api.js');
    
    const unifiedProps = await unifiedSportsAPI.getPlayerProps('nfl');
    console.log(`Unified API Props Count: ${unifiedProps.length}`);
    
    if (unifiedProps.length > 0) {
      console.log('First Unified Prop:', unifiedProps[0]);
    } else {
      console.log('❌ No unified props returned');
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testAPIs();
