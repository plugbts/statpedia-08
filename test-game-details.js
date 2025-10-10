// Test script to fetch game details directly from SportsGameOdds API
// This will help us understand if the API provides team information

const SUPABASE_URL = 'https://oalssjwhzbukrswjriaj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hbHNzandoemJ1a3Jzd2pyaWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDA5MDcsImV4cCI6MjA3NDY3NjkwN30.jNALgg9m1MAId8mH-ViKbVf1IhXssBWOb31HEDQ2dvs';

async function testGameDetails() {
  console.log('🔍 Testing SportsGameOdds API game details endpoint...');
  
  // Get a sample game ID from our database
  try {
    const response = await fetch('https://statpedia-player-props.statpedia.workers.dev/api/player-props?sport=nfl&force_refresh=true');
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      const sampleGameId = data.data[0].gameId;
      console.log(`📊 Sample game ID: ${sampleGameId}`);
      
      // Test if we can fetch game details directly
      console.log(`🔍 Testing direct game details fetch for ${sampleGameId}...`);
      
      // Note: We can't directly call the SportsGameOdds API from here since we don't have the API key
      // But we can see what the worker logs show us
      console.log('📝 This test shows the game ID format that should be used for API calls');
      console.log('📝 The worker should be making calls to: https://api.sportsgameodds.com/v2/games/' + sampleGameId);
      
    } else {
      console.log('❌ No data found in API response');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGameDetails().catch(console.error);
