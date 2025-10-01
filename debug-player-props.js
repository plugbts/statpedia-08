// Debug script to test player props loading
import { sportsDataIOAPI } from './src/services/sportsdataio-api.js';

async function debugPlayerProps() {
  console.log('🔍 Debugging player props loading...');
  
  try {
    console.log('📡 Testing NFL player props...');
    const nflProps = await sportsDataIOAPI.getPlayerProps('nfl');
    console.log('✅ NFL props loaded:', nflProps.length, 'items');
    
    if (nflProps.length > 0) {
      console.log('🔍 First NFL prop:', JSON.stringify(nflProps[0], null, 2));
    }
    
    console.log('📡 Testing NBA player props...');
    const nbaProps = await sportsDataIOAPI.getPlayerProps('nba');
    console.log('✅ NBA props loaded:', nbaProps.length, 'items');
    
  } catch (error) {
    console.error('❌ Error loading player props:', error);
    console.error('Stack trace:', error.stack);
  }
}

debugPlayerProps();
