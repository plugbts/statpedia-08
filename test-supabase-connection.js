const BASE_URL = "https://statpedia-player-props.statpedia.workers.dev";

async function testSupabaseConnection() {
  console.log("🔍 Testing Supabase connection through Worker...\n");

  try {
    // Test 1: Debug insert (this works)
    console.log("📝 Test 1: Debug Insert");
    const insertResponse = await fetch(`${BASE_URL}/debug-insert`);
    const insertResult = await insertResponse.json();
    console.log("✅ Debug insert result:", insertResult.success);

    // Test 2: Check if the test record appears
    console.log("\n📊 Test 2: Check if test record appears");
    const queryResponse = await fetch(`${BASE_URL}/debug-query?table=proplines&limit=5`);
    const queryResult = await queryResponse.json();
    console.log("📊 Proplines count:", queryResult.count);
    console.log("📊 Proplines data:", queryResult.data);

    // Test 3: Check player_game_logs
    console.log("\n📊 Test 3: Check player_game_logs");
    const gamelogsResponse = await fetch(`${BASE_URL}/debug-query?table=player_game_logs&limit=5`);
    const gamelogsResult = await gamelogsResponse.json();
    console.log("📊 Game logs count:", gamelogsResult.count);
    console.log("📊 Game logs data:", gamelogsResult.data);

    // Test 4: Try a small backfill
    console.log("\n🔄 Test 4: Small backfill test");
    const backfillResponse = await fetch(`${BASE_URL}/backfill-league/nfl`);
    const backfillResult = await backfillResponse.json();
    console.log("✅ Backfill result:", backfillResult.success);
    console.log("📊 Props inserted:", backfillResult.totalProps);

    // Test 5: Check again after backfill
    console.log("\n📊 Test 5: Check again after backfill");
    const finalQueryResponse = await fetch(`${BASE_URL}/debug-query?table=proplines&limit=5`);
    const finalQueryResult = await finalQueryResponse.json();
    console.log("📊 Final proplines count:", finalQueryResult.count);

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testSupabaseConnection();

