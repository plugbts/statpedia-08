// Quick Status Check - Get immediate progress update
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://rfdrifnsfobqlzorcesn.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZnJzZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g"
);

async function quickStatusCheck() {
  console.log(`🚀 Quick Status Check - ${new Date().toLocaleTimeString()}`);
  console.log('=' .repeat(50));

  try {
    // Get current record counts
    const { count: logsCount, error: logsError } = await supabase
      .from("player_game_logs")
      .select("*", { count: "exact", head: true });
      
    const { count: propsCount, error: propsError } = await supabase
      .from("proplines")
      .select("*", { count: "exact", head: true });

    if (logsError || propsError) {
      console.error("❌ Error fetching counts:", logsError || propsError);
      return;
    }

    console.log(`📊 Current Records:`);
    console.log(`   player_game_logs: ${(logsCount || 0).toLocaleString()}`);
    console.log(`   proplines: ${(propsCount || 0).toLocaleString()}`);
    console.log(`   Total: ${((logsCount || 0) + (propsCount || 0)).toLocaleString()}`);

    // Check league breakdown
    const { data: leagueBreakdown, error: leagueError } = await supabase
      .from("player_game_logs")
      .select("league")
      .not("league", "is", null);

    if (!leagueError && leagueBreakdown) {
      const leagueCounts = leagueBreakdown.reduce((acc, row) => {
        acc[row.league] = (acc[row.league] || 0) + 1;
        return acc;
      }, {});

      console.log(`\n🏈 League Breakdown:`);
      Object.entries(leagueCounts).forEach(([league, count]) => {
        console.log(`   ${league.toUpperCase()}: ${count.toLocaleString()} records`);
      });
    }

    // Check for H2H data
    const { data: h2hData, error: h2hError } = await supabase
      .from("player_game_logs")
      .select("player_id, opponent")
      .not("opponent", "is", null)
      .not("opponent", "eq", "UNK")
      .limit(1000);

    if (!h2hError && h2hData) {
      const matchupCounts = new Map();
      h2hData.forEach(log => {
        const key = `${log.player_id}-${log.opponent}`;
        matchupCounts.set(key, (matchupCounts.get(key) || 0) + 1);
      });

      let repeatMatchups = 0;
      for (const count of matchupCounts.values()) {
        if (count > 1) {
          repeatMatchups++;
        }
      }

      console.log(`\n🎯 H2H Status:`);
      console.log(`   Valid opponents: ${h2hData.length.toLocaleString()}`);
      console.log(`   Unique matchups: ${matchupCounts.size.toLocaleString()}`);
      console.log(`   Repeat matchups: ${repeatMatchups.toLocaleString()}`);
      
      if (repeatMatchups > 0) {
        console.log(`   ✅ H2H data is ready!`);
      } else {
        console.log(`   ⏳ Still building H2H data...`);
      }
    }

    // Estimate completion based on current rate
    const totalRecords = (logsCount || 0) + (propsCount || 0);
    const targetRecords = 50000; // Rough estimate
    const progress = (totalRecords / targetRecords * 100).toFixed(1);
    
    console.log(`\n📈 Progress: ${progress}% complete`);
    
    if (totalRecords > 0) {
      console.log(`🎯 Status: Backfill is running smoothly!`);
    } else {
      console.log(`⚠️ Status: No records found yet - backfill may still be starting`);
    }

  } catch (error) {
    console.error("❌ Error checking status:", error);
  }
}

quickStatusCheck();
