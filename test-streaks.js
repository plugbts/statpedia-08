const BASE_URL = "https://statpedia-player-props.statpedia.workers.dev";

async function testStreaks() {
  console.log("🔥 Testing TRUE Streaks System...\n");

  try {
    // 1. Test basic streak endpoint
    console.log("📊 Testing NFL streaks...");
    const nflResponse = await fetch(`${BASE_URL}/analytics/streaks?league=nfl&limit=5`);
    const nflResult = await nflResponse.json();
    
    console.log("NFL Result:", JSON.stringify(nflResult, null, 2));

    // 2. Test all leagues
    console.log("\n📊 Testing all leagues...");
    const allResponse = await fetch(`${BASE_URL}/analytics/streaks?league=all&limit=10`);
    const allResult = await allResponse.json();
    
    console.log("All Leagues Result:", JSON.stringify(allResult, null, 2));

    // 3. Test with lower limit to see if there's any data
    console.log("\n📊 Testing with limit=1...");
    const limit1Response = await fetch(`${BASE_URL}/analytics/streaks?league=all&limit=1`);
    const limit1Result = await limit1Response.json();
    
    console.log("Limit 1 Result:", JSON.stringify(limit1Result, null, 2));

    // 4. Check if we have any data in the system
    console.log("\n📊 Checking system status...");
    const statusResponse = await fetch(`${BASE_URL}/status`);
    const statusResult = await statusResponse.json();
    
    console.log("System Status:", JSON.stringify(statusResult, null, 2));

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testStreaks();
