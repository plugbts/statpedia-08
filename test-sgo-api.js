// Test script to inspect SportsGameOdds API response structure
// This will help us understand where team data is hiding

const SUPABASE_URL = 'https://oalssjwhzbukrswjriaj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hbHNzandoemJ1a3Jzd2pyaWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDA5MDcsImV4cCI6MjA3NDY3NjkwN30.jNALgg9m1MAId8mH-ViKbVf1IhXssBWOb31HEDQ2dvs';

async function testSportsGameOddsAPI() {
  console.log('🔍 Testing SportsGameOdds API response structure...');
  
  try {
    // Fetch from the worker's debug endpoint (if available)
    const response = await fetch('https://statpedia-player-props.statpedia.workers.dev/api/player-props?sport=nfl&force_refresh=true');
    const data = await response.json();
    
    console.log('📊 Sample prop data from worker:');
    console.log(JSON.stringify(data.data[0], null, 2));
    
    // Check what fields are available
    const sample = data.data[0];
    console.log('\n🔍 Available fields in sample prop:');
    Object.keys(sample).forEach(key => {
      console.log(`  ${key}: ${typeof sample[key]} = ${JSON.stringify(sample[key])}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSportsGameOddsAPI().catch(console.error);
