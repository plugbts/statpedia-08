import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addMissingAliases() {
  console.log("🔧 Adding missing prop type aliases...");
  
  try {
    // Add the missing aliases we identified
    const additionalAliases = [
      // Case variations
      { alias: 'Goals', canonical: 'goals' },
      { alias: 'Assists', canonical: 'assists' },
      { alias: 'Points', canonical: 'points' },
      { alias: 'Rebounds', canonical: 'rebounds' },
      { alias: 'Sacks', canonical: 'defense_sacks' },
      
      // NFL specific
      { alias: 'receptions', canonical: 'receptions' },
      { alias: 'turnovers', canonical: 'turnovers' },
      { alias: 'rushing_yards', canonical: 'rushing_yards' },
      { alias: 'passing_yards', canonical: 'passing_yards' },
      { alias: 'receiving_yards', canonical: 'receiving_yards' },
      
      // NHL specific variations
      { alias: 'goals', canonical: 'goals' },
      { alias: 'assists', canonical: 'assists' },
      { alias: 'shots_on_goal', canonical: 'shots_on_goal' },
      { alias: 'shots', canonical: 'shots_on_goal' },
      
      // NBA specific variations
      { alias: 'points', canonical: 'points' },
      { alias: 'rebounds', canonical: 'rebounds' },
      { alias: 'assists', canonical: 'assists' },
      { alias: 'steals', canonical: 'steals' },
      { alias: 'blocks', canonical: 'blocks' },
      
      // MLB specific variations
      { alias: 'home_runs', canonical: 'home_runs' },
      { alias: 'runs_batted_in', canonical: 'runs_batted_in' },
      { alias: 'stolen_bases', canonical: 'stolen_bases' },
      { alias: 'hits', canonical: 'hits' },
      { alias: 'batting_basesonballs', canonical: 'walks' },
      { alias: 'batting_basesOnBalls', canonical: 'walks' }
    ];
    
    // Insert aliases one by one
    let insertedCount = 0;
    for (const alias of additionalAliases) {
      const { error: insertError } = await supabase
        .from('prop_type_aliases')
        .upsert([alias], { 
          onConflict: 'alias',
          ignoreDuplicates: false 
        });
      
      if (insertError) {
        console.warn(`⚠️ Failed to insert ${alias.alias}:`, insertError.message);
      } else {
        insertedCount++;
      }
    }
    
    console.log(`✅ Added ${insertedCount}/${additionalAliases.length} additional aliases`);
    
    // Verify total count
    const { data, error: countError } = await supabase
      .from("prop_type_aliases")
      .select("alias, canonical");
    
    if (countError) {
      console.error("❌ Error counting aliases:", countError);
      return;
    }
    
    console.log(`📊 Total aliases in database: ${data?.length || 0}`);
    
    // Test some specific normalizations
    const aliasCache = {};
    data?.forEach((row) => {
      aliasCache[row.alias.toLowerCase()] = row.canonical.toLowerCase();
    });
    
    function normalizePropType(propType) {
      if (!propType) return "";
      const key = propType.toLowerCase();
      return aliasCache[key] || key;
    }
    
    console.log("\n🧪 Testing new normalizations:");
    const testCases = [
      'Goals', 'goals', 'receptions', 'turnovers', 'batting_basesOnBalls', 'Sacks'
    ];
    
    testCases.forEach(test => {
      const result = normalizePropType(test);
      console.log(`${test} → ${result}`);
    });
    
  } catch (error) {
    console.error("❌ Failed to add aliases:", error);
  }
}

addMissingAliases().catch(console.error);
