const BASE_URL = "https://statpedia-player-props.statpedia.workers.dev";

async function checkData() {
  console.log("🔍 Checking what data we have...\n");

  try {
    // Test a simple query to see if we have any data at all
    console.log("📊 Testing direct data query...");
    
    // Let's try to query the worker logs to see what's happening
    const response = await fetch(`${BASE_URL}/status`);
    const result = await response.json();
    
    console.log("System Status:", JSON.stringify(result, null, 2));
    
    // Try to get some raw data
    console.log("\n📊 Testing raw data access...");
    const dataResponse = await fetch(`${BASE_URL}/debug-insert`);
    const dataResult = await dataResponse.json();
    
    console.log("Debug Insert Result:", JSON.stringify(dataResult, null, 2));

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

checkData();
