import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testPlayerGameLogs() {
  console.log("🔍 Testing player_game_logs table...");
  
  try {
    // Test 1: Get total count by league
    const { data: leagueCounts, error: countError } = await supabase
      .from("player_game_logs")
      .select("league")
      .limit(1000);
    
    if (countError) {
      console.error("❌ Error getting league counts:", countError);
      return;
    }
    
    const leagueMap = {};
    leagueCounts?.forEach(row => {
      const league = row.league?.toLowerCase();
      leagueMap[league] = (leagueMap[league] || 0) + 1;
    });
    
    console.log("📊 League distribution in player_game_logs:");
    Object.entries(leagueMap).forEach(([league, count]) => {
      console.log(`  ${league}: ${count} records`);
    });
    
    // Test 2: Get sample records by league
    console.log("\n📊 Sample records by league:");
    for (const league of ['nfl', 'nba', 'mlb', 'nhl']) {
      const { data: sample, error: sampleError } = await supabase
        .from("player_game_logs")
        .select("league, prop_type, date")
        .eq("league", league.toUpperCase())
        .limit(3);
      
      if (sampleError) {
        console.log(`  ${league}: Error - ${sampleError.message}`);
      } else if (sample && sample.length > 0) {
        console.log(`  ${league}: ${sample.length} records`);
        sample.forEach((row, i) => {
          console.log(`    ${i + 1}. ${row.prop_type} on ${row.date}`);
        });
      } else {
        console.log(`  ${league}: No records found`);
      }
    }
    
    // Test 3: Get all unique leagues
    const { data: uniqueLeagues, error: leagueError } = await supabase
      .from("player_game_logs")
      .select("league")
      .not("league", "is", null);
    
    if (leagueError) {
      console.error("❌ Error getting unique leagues:", leagueError);
      return;
    }
    
    const leagues = [...new Set(uniqueLeagues?.map(row => row.league) || [])];
    console.log(`\n📊 Unique leagues found: ${leagues.join(", ")}`);
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testPlayerGameLogs().catch(console.error);
