import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://rfdrifnsfobqlzorcesn.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g"
);

async function checkRepeatMatchups() {
  console.log("🔍 Checking for repeat player-opponent matchups...");
  
  try {
    // First, let's check total counts
    const { count: totalLogs, error: logsError } = await supabase
      .from("player_game_logs")
      .select("*", { count: "exact", head: true });
      
    const { count: totalProps, error: propsError } = await supabase
      .from("proplines")
      .select("*", { count: "exact", head: true });
      
    if (logsError || propsError) {
      console.error("❌ Error getting counts:", logsError || propsError);
      return;
    }
    
    console.log(`📊 Total records:`);
    console.log(`- player_game_logs: ${totalLogs || 0}`);
    console.log(`- proplines: ${totalProps || 0}`);
    
    // Check for repeat matchups using a raw SQL query
    const { data: repeatMatchups, error: repeatError } = await supabase.rpc('check_h2h_matchups');
    
    if (repeatError) {
      console.log("⚠️ RPC function not found, using manual query...");
      
      // Manual query to find repeat matchups
      const { data: allLogs, error: allLogsError } = await supabase
        .from("player_game_logs")
        .select("player_id, opponent, player_name, league, date, prop_type")
        .not("opponent", "is", null)
        .not("opponent", "eq", "UNK");
        
      if (allLogsError) {
        console.error("❌ Error fetching logs:", allLogsError);
        return;
      }
      
      console.log(`📊 Fetched ${allLogs?.length || 0} game logs with valid opponents`);
      
      // Group by player_id + opponent combination
      const matchupCounts = {};
      
      allLogs?.forEach(log => {
        const key = `${log.player_id}|${log.opponent}|${log.league}|${log.prop_type}`;
        if (!matchupCounts[key]) {
          matchupCounts[key] = {
            player_id: log.player_id,
            player_name: log.player_name,
            opponent: log.opponent,
            league: log.league,
            prop_type: log.prop_type,
            count: 0,
            dates: []
          };
        }
        matchupCounts[key].count++;
        matchupCounts[key].dates.push(log.date);
      });
      
      // Filter for matchups with 2+ games
      const repeatMatchups = Object.values(matchupCounts).filter(m => m.count >= 2);
      
      console.log(`\n📊 Repeat Matchups Found: ${repeatMatchups.length}`);
      
      if (repeatMatchups.length > 0) {
        console.log("\n🏆 Top 10 Repeat Matchups:");
        repeatMatchups
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .forEach((matchup, i) => {
            console.log(`${i + 1}. ${matchup.player_name} vs ${matchup.opponent} (${matchup.league}, ${matchup.prop_type}): ${matchup.count} games`);
            console.log(`   Dates: ${matchup.dates.slice(0, 3).join(', ')}${matchup.dates.length > 3 ? '...' : ''}`);
          });
          
        // Check by league
        const leagueBreakdown = {};
        repeatMatchups.forEach(matchup => {
          if (!leagueBreakdown[matchup.league]) {
            leagueBreakdown[matchup.league] = 0;
          }
          leagueBreakdown[matchup.league]++;
        });
        
        console.log("\n📊 Repeat Matchups by League:");
        Object.entries(leagueBreakdown).forEach(([league, count]) => {
          console.log(`- ${league}: ${count} repeat matchups`);
        });
        
        return true; // Found repeat matchups
      } else {
        console.log("\n❌ No repeat matchups found!");
        return false; // No repeat matchups
      }
    } else {
      console.log(`📊 Repeat Matchups Found: ${repeatMatchups?.length || 0}`);
      return (repeatMatchups?.length || 0) > 0;
    }
    
  } catch (error) {
    console.error("❌ Error checking repeat matchups:", error);
    return false;
  }
}

// Run the check
(async () => {
  const hasRepeatMatchups = await checkRepeatMatchups();
  
  if (!hasRepeatMatchups) {
    console.log("\n🚀 No repeat matchups found. Need to extend backfill period to 365 days.");
    console.log("Run: node backfill-ingestion-loop-365.js");
  } else {
    console.log("\n✅ Found repeat matchups! H2H data should be available.");
  }
})();
