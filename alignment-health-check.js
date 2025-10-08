import { createClient } from "@supabase/supabase-js";

export async function runAlignmentHealthCheck(supabaseUrl, supabaseKey) {
  console.log("🔍 RUNNING ALIGNMENT HEALTH CHECK...\n");
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Row counts
    console.log("📊 1. ROW COUNTS:");
    const { data: proplinesCount, error: proplinesCountError } = await supabase
      .from("proplines")
      .select("id", { count: "exact", head: true });
    
    const { data: gameLogsCount, error: gameLogsCountError } = await supabase
      .from("player_game_logs")
      .select("id", { count: "exact", head: true });

    console.log(`   Proplines: ${proplinesCount?.length || 0} rows`);
    console.log(`   Player Game Logs: ${gameLogsCount?.length || 0} rows`);

    if (proplinesCountError) console.log("   Proplines error:", proplinesCountError);
    if (gameLogsCountError) console.log("   Game Logs error:", gameLogsCountError);

    // 2. Date ranges
    console.log("\n📅 2. DATE RANGES:");
    const { data: proplinesDates, error: proplinesDatesError } = await supabase
      .from("proplines")
      .select("date")
      .order("date", { ascending: true })
      .limit(1);
    
    const { data: proplinesDatesMax, error: proplinesDatesMaxError } = await supabase
      .from("proplines")
      .select("date")
      .order("date", { ascending: false })
      .limit(1);

    const { data: gameLogsDates, error: gameLogsDatesError } = await supabase
      .from("player_game_logs")
      .select("date")
      .order("date", { ascending: true })
      .limit(1);
    
    const { data: gameLogsDatesMax, error: gameLogsDatesMaxError } = await supabase
      .from("player_game_logs")
      .select("date")
      .order("date", { ascending: false })
      .limit(1);

    console.log(`   Proplines: ${proplinesDates?.[0]?.date || 'N/A'} to ${proplinesDatesMax?.[0]?.date || 'N/A'}`);
    console.log(`   Game Logs: ${gameLogsDates?.[0]?.date || 'N/A'} to ${gameLogsDatesMax?.[0]?.date || 'N/A'}`);

    // 3. Sample data structure
    console.log("\n🔍 3. SAMPLE DATA STRUCTURE:");
    const { data: proplinesSample, error: proplinesSampleError } = await supabase
      .from("proplines")
      .select("*")
      .limit(2);

    const { data: gameLogsSample, error: gameLogsSampleError } = await supabase
      .from("player_game_logs")
      .select("*")
      .limit(2);

    console.log("   Proplines sample:", JSON.stringify(proplinesSample?.[0], null, 2));
    console.log("   Game Logs sample:", JSON.stringify(gameLogsSample?.[0], null, 2));

    // 4. Distinct prop types
    console.log("\n🏷️  4. DISTINCT PROP TYPES:");
    const { data: proplinesProps, error: proplinesPropsError } = await supabase
      .from("proplines")
      .select("prop_type");
    
    const { data: gameLogsProps, error: gameLogsPropsError } = await supabase
      .from("player_game_logs")
      .select("prop_type");

    const proplinesPropTypes = [...new Set(proplinesProps?.map(r => r.prop_type) || [])];
    const gameLogsPropTypes = [...new Set(gameLogsProps?.map(r => r.prop_type) || [])];

    console.log(`   Proplines prop types (${proplinesPropTypes.length}):`, proplinesPropTypes.slice(0, 5));
    console.log(`   Game Logs prop types (${gameLogsPropTypes.length}):`, gameLogsPropTypes.slice(0, 5));

    // 5. Overlap check
    console.log("\n🔗 5. OVERLAP CHECK:");
    const overlap = proplinesPropTypes.filter(type => gameLogsPropTypes.includes(type));
    const proplinesOnly = proplinesPropTypes.filter(type => !gameLogsPropTypes.includes(type));
    const gameLogsOnly = gameLogsPropTypes.filter(type => !proplinesPropTypes.includes(type));

    console.log(`   Overlapping prop types: ${overlap.length}`);
    console.log(`   Proplines only: ${proplinesOnly.length} (${proplinesOnly.slice(0, 3)})`);
    console.log(`   Game Logs only: ${gameLogsOnly.length} (${gameLogsOnly.slice(0, 3)})`);

    // 6. League distribution
    console.log("\n🏆 6. LEAGUE DISTRIBUTION:");
    const { data: proplinesLeagues, error: proplinesLeaguesError } = await supabase
      .from("proplines")
      .select("league");
    
    const { data: gameLogsLeagues, error: gameLogsLeaguesError } = await supabase
      .from("player_game_logs")
      .select("league");

    const proplinesLeagueCounts = {};
    const gameLogsLeagueCounts = {};

    proplinesLeagues?.forEach(r => {
      proplinesLeagueCounts[r.league] = (proplinesLeagueCounts[r.league] || 0) + 1;
    });

    gameLogsLeagues?.forEach(r => {
      gameLogsLeagueCounts[r.league] = (gameLogsLeagueCounts[r.league] || 0) + 1;
    });

    console.log("   Proplines leagues:", proplinesLeagueCounts);
    console.log("   Game Logs leagues:", gameLogsLeagueCounts);

    // 7. Player ID format check
    console.log("\n👤 7. PLAYER ID FORMAT CHECK:");
    const { data: proplinesPlayers, error: proplinesPlayersError } = await supabase
      .from("proplines")
      .select("player_id, player_name")
      .limit(5);

    const { data: gameLogsPlayers, error: gameLogsPlayersError } = await supabase
      .from("player_game_logs")
      .select("player_id, player_name")
      .limit(5);

    console.log("   Proplines player samples:", proplinesPlayers?.map(p => `${p.player_id} (${p.player_name})`));
    console.log("   Game Logs player samples:", gameLogsPlayers?.map(p => `${p.player_id} (${p.player_name})`));

    // 8. Recent data check (last 7 days)
    console.log("\n⏰ 8. RECENT DATA CHECK (Last 7 days):");
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { data: recentProplines, error: recentProplinesError } = await supabase
      .from("proplines")
      .select("id", { count: "exact", head: true })
      .gte("date", sevenDaysAgo);

    const { data: recentGameLogs, error: recentGameLogsError } = await supabase
      .from("player_game_logs")
      .select("id", { count: "exact", head: true })
      .gte("date", sevenDaysAgo);

    console.log(`   Recent Proplines (${sevenDaysAgo}+): ${recentProplines?.length || 0}`);
    console.log(`   Recent Game Logs (${sevenDaysAgo}+): ${recentGameLogs?.length || 0}`);

    // 9. Diagnosis
    console.log("\n🔍 9. DIAGNOSIS:");
    
    const issues = [];
    if ((proplinesCount?.length || 0) === 0) issues.push("❌ No proplines data");
    if ((gameLogsCount?.length || 0) === 0) issues.push("❌ No game logs data");
    if (overlap.length === 0) issues.push("❌ No overlapping prop types between tables");
    if ((recentProplines?.length || 0) === 0) issues.push("❌ No recent proplines data (last 7 days)");
    if ((recentGameLogs?.length || 0) === 0) issues.push("❌ No recent game logs data (last 7 days)");

    if (issues.length === 0) {
      console.log("✅ No major issues detected");
    } else {
      console.log("🚨 Issues found:");
      issues.forEach(issue => console.log(`   ${issue}`));
    }

    return {
      proplinesCount: proplinesCount?.length || 0,
      gameLogsCount: gameLogsCount?.length || 0,
      proplinesPropTypes: proplinesPropTypes.length,
      gameLogsPropTypes: gameLogsPropTypes.length,
      overlap: overlap.length,
      recentProplines: recentProplines?.length || 0,
      recentGameLogs: recentGameLogs?.length || 0,
      issues: issues
    };

  } catch (error) {
    console.error("❌ Health check failed:", error);
    return { error: error.message };
  }
}

// Run the health check
const SUPABASE_URL = process.env.SUPABASE_URL || "https://rfdrifnsfobqlzorcesn.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjM2MjY1MCwiZXhwIjoyMDUxOTM4NjUwfQ.7Xz8QwJ8QwJ8QwJ8QwJ8QwJ8QwJ8QwJ8QwJ8QwJ8";

runAlignmentHealthCheck(SUPABASE_URL, SUPABASE_KEY).then(result => {
  console.log("\n📋 HEALTH CHECK SUMMARY:", JSON.stringify(result, null, 2));
});
