import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function comprehensiveDataAnalysis() {
  console.log("🔍 Comprehensive Data Availability Analysis...");
  
  try {
    // 1. Check total records by table
    const { count: gameLogsCount, error: glCountErr } = await supabase
      .from("player_game_logs")
      .select("*", { count: 'exact', head: true });
    
    const { count: propsCount, error: prCountErr } = await supabase
      .from("proplines")
      .select("*", { count: 'exact', head: true });
    
    console.log(`📊 Total Records:`);
    console.log(`  player_game_logs: ${gameLogsCount || 0}`);
    console.log(`  proplines: ${propsCount || 0}`);
    
    // 2. Check data by league
    const { data: gameLogsByLeague, error: glLeagueErr } = await supabase
      .from("player_game_logs")
      .select("league")
      .not("league", "is", null);
    
    const { data: propsByLeague, error: prLeagueErr } = await supabase
      .from("proplines")
      .select("league")
      .not("league", "is", null);
    
    if (glLeagueErr || prLeagueErr) {
      console.error("❌ Error fetching league data:", glLeagueErr || prLeagueErr);
      return;
    }
    
    // Count by league
    const gameLogLeagueCounts = {};
    gameLogsByLeague?.forEach(row => {
      const league = row.league?.toLowerCase();
      gameLogLeagueCounts[league] = (gameLogLeagueCounts[league] || 0) + 1;
    });
    
    const propsLeagueCounts = {};
    propsByLeague?.forEach(row => {
      const league = row.league?.toLowerCase();
      propsLeagueCounts[league] = (propsLeagueCounts[league] || 0) + 1;
    });
    
    console.log(`\n📊 Records by League:`);
    console.log(`  player_game_logs:`);
    Object.entries(gameLogLeagueCounts).forEach(([league, count]) => {
      console.log(`    ${league}: ${count} records`);
    });
    
    console.log(`  proplines:`);
    Object.entries(propsLeagueCounts).forEach(([league, count]) => {
      console.log(`    ${league}: ${count} records`);
    });
    
    // 3. Check prop types by league
    const { data: gameLogPropTypes, error: glPropErr } = await supabase
      .from("player_game_logs")
      .select("league, prop_type")
      .not("league", "is", null)
      .not("prop_type", "is", null);
    
    const { data: propsPropTypes, error: prPropErr } = await supabase
      .from("proplines")
      .select("league, prop_type")
      .not("league", "is", null)
      .not("prop_type", "is", null);
    
    if (glPropErr || prPropErr) {
      console.error("❌ Error fetching prop type data:", glPropErr || prPropErr);
      return;
    }
    
    // Group prop types by league
    const gameLogPropTypesByLeague = {};
    gameLogPropTypes?.forEach(row => {
      const league = row.league?.toLowerCase();
      if (!gameLogPropTypesByLeague[league]) gameLogPropTypesByLeague[league] = new Set();
      gameLogPropTypesByLeague[league].add(row.prop_type);
    });
    
    const propsPropTypesByLeague = {};
    propsPropTypes?.forEach(row => {
      const league = row.league?.toLowerCase();
      if (!propsPropTypesByLeague[league]) propsPropTypesByLeague[league] = new Set();
      propsPropTypesByLeague[league].add(row.prop_type);
    });
    
    console.log(`\n📊 Prop Types by League:`);
    const allLeagues = new Set([
      ...Object.keys(gameLogPropTypesByLeague),
      ...Object.keys(propsPropTypesByLeague)
    ]);
    
    allLeagues.forEach(league => {
      const gameLogTypes = gameLogPropTypesByLeague[league] || new Set();
      const propsTypes = propsPropTypesByLeague[league] || new Set();
      const overlapping = new Set([...gameLogTypes].filter(x => propsTypes.has(x)));
      
      console.log(`\n  ${league.toUpperCase()}:`);
      console.log(`    Game Logs: ${gameLogTypes.size} prop types`);
      console.log(`    Props: ${propsTypes.size} prop types`);
      console.log(`    Overlapping: ${overlapping.size} prop types`);
      console.log(`    Coverage: ${gameLogTypes.size > 0 ? Math.round((overlapping.size / gameLogTypes.size) * 100) : 0}%`);
      
      if (gameLogTypes.size > 0) {
        console.log(`    Game Log Types: ${Array.from(gameLogTypes).join(', ')}`);
      }
      if (propsTypes.size > 0) {
        console.log(`    Props Types: ${Array.from(propsTypes).join(', ')}`);
      }
      if (overlapping.size > 0) {
        console.log(`    Overlapping: ${Array.from(overlapping).join(', ')}`);
      }
    });
    
    // 4. Check dates by league
    const { data: gameLogDates, error: glDateErr } = await supabase
      .from("player_game_logs")
      .select("league, date")
      .not("league", "is", null)
      .not("date", "is", null);
    
    const { data: propsDates, error: prDateErr } = await supabase
      .from("proplines")
      .select("league, date, date_normalized")
      .not("league", "is", null)
      .not("date", "is", null);
    
    if (glDateErr || prDateErr) {
      console.error("❌ Error fetching date data:", glDateErr || prDateErr);
      return;
    }
    
    console.log(`\n📊 Date Analysis by League:`);
    const gameLogDatesByLeague = {};
    gameLogDates?.forEach(row => {
      const league = row.league?.toLowerCase();
      if (!gameLogDatesByLeague[league]) gameLogDatesByLeague[league] = new Set();
      gameLogDatesByLeague[league].add(row.date);
    });
    
    const propsDatesByLeague = {};
    propsDates?.forEach(row => {
      const league = row.league?.toLowerCase();
      if (!propsDatesByLeague[league]) propsDatesByLeague[league] = new Set();
      propsDatesByLeague[league].add(row.date);
      if (row.date_normalized) {
        propsDatesByLeague[league].add(row.date_normalized);
      }
    });
    
    allLeagues.forEach(league => {
      const gameLogDates = gameLogDatesByLeague[league] || new Set();
      const propsDates = propsDatesByLeague[league] || new Set();
      const overlappingDates = new Set([...gameLogDates].filter(x => propsDates.has(x)));
      
      console.log(`\n  ${league.toUpperCase()}:`);
      console.log(`    Game Log Dates: ${gameLogDates.size} unique dates`);
      console.log(`    Props Dates: ${propsDates.size} unique dates`);
      console.log(`    Overlapping Dates: ${overlappingDates.size} unique dates`);
      
      if (gameLogDates.size > 0) {
        console.log(`    Sample Game Log Dates: ${Array.from(gameLogDates).slice(0, 5).join(', ')}`);
      }
      if (propsDates.size > 0) {
        console.log(`    Sample Props Dates: ${Array.from(propsDates).slice(0, 5).join(', ')}`);
      }
    });
    
    console.log(`\n✅ Comprehensive data analysis completed!`);
    
  } catch (error) {
    console.error("❌ Error in comprehensive analysis:", error);
  }
}

comprehensiveDataAnalysis().catch(console.error);
