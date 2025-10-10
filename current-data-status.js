import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCurrentDataStatus() {
  console.log("🔍 Checking Current Data Status...");
  
  try {
    // Check current counts by league
    const leagues = ['nfl', 'nba', 'mlb', 'nhl'];
    
    console.log("📊 Current Data by League:");
    
    for (const league of leagues) {
      const { count: gameLogCount, error: glErr } = await supabase
        .from("player_game_logs")
        .select("*", { count: 'exact', head: true })
        .eq("league", league);
      
      const { count: propsCount, error: prErr } = await supabase
        .from("proplines")
        .select("*", { count: 'exact', head: true })
        .eq("league", league);
      
      if (!glErr && !prErr) {
        console.log(`  ${league.toUpperCase()}:`);
        console.log(`    Game Logs: ${gameLogCount || 0} records`);
        console.log(`    Props: ${propsCount || 0} records`);
      }
    }
    
    // Check recent ingestion activity
    const { data: recentProps, error: recentErr } = await supabase
      .from("proplines")
      .select("league, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (!recentErr && recentProps) {
      console.log("\n📊 Recent Ingestion Activity:");
      const leagueCounts = {};
      recentProps.forEach(prop => {
        const league = prop.league?.toLowerCase();
        leagueCounts[league] = (leagueCounts[league] || 0) + 1;
      });
      
      Object.entries(leagueCounts).forEach(([league, count]) => {
        console.log(`  ${league.toUpperCase()}: ${count} recent records`);
      });
      
      console.log(`  Latest Record: ${recentProps[0]?.created_at}`);
    }
    
    // Check total counts
    const { count: totalGameLogs, error: totalGlErr } = await supabase
      .from("player_game_logs")
      .select("*", { count: 'exact', head: true });
    
    const { count: totalProps, error: totalPrErr } = await supabase
      .from("proplines")
      .select("*", { count: 'exact', head: true });
    
    if (!totalGlErr && !totalPrErr) {
      console.log(`\n📊 Total Records:`);
      console.log(`  Game Logs: ${totalGameLogs || 0}`);
      console.log(`  Props: ${totalProps || 0}`);
    }
    
    // Test API endpoints
    console.log("\n🧪 Testing API Endpoints:");
    
    const testLeagues = ['nfl', 'nba', 'mlb', 'nhl'];
    for (const league of testLeagues) {
      try {
        const response = await fetch(`https://statpedia-player-props.statpedia.workers.dev/api/player-props?sport=${league}`);
        const data = await response.json();
        console.log(`  ${league.toUpperCase()}: ${data.totalProps || 0} props returned`);
      } catch (error) {
        console.log(`  ${league.toUpperCase()}: Error - ${error.message}`);
      }
    }
    
    console.log("\n✅ Current data status check completed!");
    
  } catch (error) {
    console.error("❌ Error checking current data status:", error);
  }
}

checkCurrentDataStatus().catch(console.error);
