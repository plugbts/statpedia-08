import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testPropTypeSync() {
  console.log("🧪 Testing prop type sync functionality...");
  
  try {
    // Test the database-driven normalization
    const { data, error } = await supabase
      .from("prop_type_aliases")
      .select("alias, canonical");
    
    if (error) {
      console.error("❌ Error loading aliases:", error);
      return;
    }
    
    console.log(`📊 Loaded ${data?.length || 0} aliases from database`);
    
    // Create a simple normalization function like the worker uses
    const aliasCache = {};
    data?.forEach((row) => {
      aliasCache[row.alias.toLowerCase()] = row.canonical.toLowerCase();
    });
    
    function normalizePropType(propType) {
      if (!propType) return "";
      const key = propType.toLowerCase();
      return aliasCache[key] || key;
    }
    
    // Test specific normalizations that should improve NBA/MLB/NHL matches
    const testCases = [
      { input: 'pts', expected: 'points', league: 'NBA' },
      { input: 'reb', expected: 'rebounds', league: 'NBA' },
      { input: 'ast', expected: 'assists', league: 'NBA' },
      { input: 'hr', expected: 'home_runs', league: 'MLB' },
      { input: 'rbi', expected: 'runs_batted_in', league: 'MLB' },
      { input: 'sog', expected: 'shots_on_goal', league: 'NHL' },
      { input: 'sacks', expected: 'defense_sacks', league: 'NFL' },
      { input: 'td', expected: 'fantasyscore', league: 'NFL' }
    ];
    
    console.log("\n🧪 Testing normalizations:");
    testCases.forEach(test => {
      const result = normalizePropType(test.input);
      const status = result === test.expected ? "✅" : "❌";
      console.log(`${status} ${test.input} → ${result} (${test.league}) ${result === test.expected ? '' : `(expected: ${test.expected})`}`);
    });
    
    // Test some actual data from the database to see what prop types exist
    console.log("\n📊 Sample prop types from player_game_logs:");
    const { data: gameLogs } = await supabase
      .from("player_game_logs")
      .select("prop_type, league")
      .limit(10);
    
    gameLogs?.forEach(log => {
      const normalized = normalizePropType(log.prop_type);
      console.log(`${log.league.toUpperCase()}: ${log.prop_type} → ${normalized}`);
    });
    
    console.log("\n📊 Sample prop types from proplines:");
    const { data: props } = await supabase
      .from("proplines")
      .select("prop_type, league")
      .limit(10);
    
    props?.forEach(prop => {
      const normalized = normalizePropType(prop.prop_type);
      console.log(`${prop.league.toUpperCase()}: ${prop.prop_type} → ${normalized}`);
    });
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testPropTypeSync().catch(console.error);
