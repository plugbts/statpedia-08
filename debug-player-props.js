// Debug script to test player props API calls
import { sportsGameOddsAPI } from './src/services/sportsgameodds-api.js';

async function debugPlayerProps() {
  console.log('🔍 Starting player props debugging...');
  
  try {
    // Test NFL player props
    console.log('\n=== Testing NFL Player Props ===');
    const nflProps = await sportsGameOddsAPI.getPlayerProps('nfl');
    console.log(`NFL Props Count: ${nflProps.length}`);
    
    if (nflProps.length > 0) {
      console.log('First NFL Prop:', nflProps[0]);
    }
    
    // Test cache status
    console.log('\n=== Cache Status ===');
    console.log('Cache Status:', sportsGameOddsAPI.getPlayerPropsCacheStatus());
    console.log('Cached Sports:', sportsGameOddsAPI.getCachedSports());
    console.log('Last Cache Update:', sportsGameOddsAPI.getLastCacheUpdate());
    
    // Test usage stats
    console.log('\n=== Usage Stats ===');
    const usageStats = sportsGameOddsAPI.getUsageStats();
    console.log('Usage Stats:', usageStats);
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

debugPlayerProps();
