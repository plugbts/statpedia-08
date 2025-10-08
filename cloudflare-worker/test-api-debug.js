// Debug script to test API directly from worker environment

const WORKER_URL = "https://statpedia-player-props.statpedia.workers.dev";

async function testAPIDebug() {
  console.log('🔍 Testing API Debug...\n');
  
  try {
    // Test 1: Check if we can get events directly
    console.log('📊 Test 1: Direct API Test');
    
    const response = await fetch(`${WORKER_URL}/debug-api`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Debug Response:', data);
    } else {
      console.log('❌ API Debug failed:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.error('❌ API Debug test failed:', error.message);
  }
}

// Run the test
testAPIDebug();
