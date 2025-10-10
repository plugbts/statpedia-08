import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runCoverageReport() {
  console.log("🔍 Running comprehensive coverage report...");
  
  try {
    // 1. Get total counts by league
    console.log("\n📊 Total records by league:");
    
    const { data: logCounts, error: logCountErr } = await supabase
      .from("player_game_logs")
      .select("league");
    
    const { data: propCounts, error: propCountErr } = await supabase
      .from("proplines")
      .select("league");
    
    if (logCountErr || propCountErr) {
      console.error("❌ Error getting counts:", logCountErr || propCountErr);
      return;
    }
    
    const logLeagueMap = {};
    const propLeagueMap = {};
    
    logCounts?.forEach(row => {
      const league = row.league?.toLowerCase();
      logLeagueMap[league] = (logLeagueMap[league] || 0) + 1;
    });
    
    propCounts?.forEach(row => {
      const league = row.league?.toLowerCase();
      propLeagueMap[league] = (propLeagueMap[league] || 0) + 1;
    });
    
    console.log("📊 Game Logs by League:");
    Object.entries(logLeagueMap).forEach(([league, count]) => {
      console.log(`   ${league}: ${count} records`);
    });
    
    console.log("📊 Props by League:");
    Object.entries(propLeagueMap).forEach(([league, count]) => {
      console.log(`   ${league}: ${count} records`);
    });
    
    // 2. Get distinct prop types by league
    console.log("\n📊 Distinct prop types by league:");
    
    const { data: logTypes, error: logErr } = await supabase
      .from("player_game_logs")
      .select("league, prop_type")
      .neq("prop_type", null);
    
    const { data: propTypes, error: propErr } = await supabase
      .from("proplines")
      .select("league, prop_type")
      .neq("prop_type", null);
    
    if (logErr || propErr) {
      console.error("❌ Error getting prop types:", logErr || propErr);
      return;
    }
    
    const logPropMap = {};
    const propPropMap = {};
    
    logTypes?.forEach(row => {
      const league = row.league?.toLowerCase();
      if (!league) return;
      if (!logPropMap[league]) logPropMap[league] = new Set();
      logPropMap[league].add(row.prop_type.toLowerCase());
    });
    
    propTypes?.forEach(row => {
      const league = row.league?.toLowerCase();
      if (!league) return;
      if (!propPropMap[league]) propPropMap[league] = new Set();
      propPropMap[league].add(row.prop_type.toLowerCase());
    });
    
    // Print detailed coverage for each league
    Object.keys({...logPropMap, ...propPropMap}).forEach(league => {
      const logProps = logPropMap[league] || new Set();
      const propProps = propPropMap[league] || new Set();
      
      const onlyInLogs = [...logProps].filter(t => !propProps.has(t));
      const onlyInProps = [...propProps].filter(t => !logProps.has(t));
      const overlap = [...logProps].filter(t => propProps.has(t));
      
      console.log(`\n🏈 ${league.toUpperCase()}:`);
      console.log(`   📊 Logs: ${logProps.size} prop types`);
      console.log(`   📊 Props: ${propProps.size} prop types`);
      console.log(`   ✅ Overlap: ${overlap.length} prop types`);
      console.log(`   ❌ Logs only: ${onlyInLogs.length} prop types`);
      console.log(`   ❌ Props only: ${onlyInProps.length} prop types`);
      
      if (overlap.length > 0) {
        console.log(`   ✅ Overlapping: ${overlap.join(", ")}`);
      }
      
      if (onlyInLogs.length > 0) {
        console.log(`   ⚠️  Logs only: ${onlyInLogs.join(", ")}`);
      }
      
      if (onlyInProps.length > 0) {
        console.log(`   ⚠️  Props only: ${onlyInProps.slice(0, 10).join(", ")}${onlyInProps.length > 10 ? `... (+${onlyInProps.length - 10} more)` : ""}`);
      }
    });
    
  } catch (error) {
    console.error("❌ Coverage report failed:", error);
  }
}

runCoverageReport().catch(console.error);
