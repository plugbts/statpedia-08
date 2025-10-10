import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function populatePropTypeAliases() {
  console.log("🔧 Populating prop_type_aliases table...");
  
  try {
    // Insert comprehensive prop type aliases
    const aliases = [
      // NFL aliases
      { alias: 'sacks', canonical: 'defense_sacks' },
      { alias: 'td', canonical: 'fantasyscore' },
      { alias: 'touchdowns', canonical: 'fantasyscore' },
      { alias: 'pass_yards', canonical: 'passing_yards' },
      { alias: 'rush_yards', canonical: 'rushing_yards' },
      { alias: 'rec_yards', canonical: 'receiving_yards' },
      { alias: 'passing_interceptions', canonical: 'interceptions' },
      { alias: 'rushing_attempts', canonical: 'carries' },
      { alias: 'passing_completions', canonical: 'completions' },
      { alias: 'passing_touchdowns', canonical: 'pass_tds' },
      { alias: 'receiving_touchdowns', canonical: 'rec_tds' },
      { alias: 'rushing_touchdowns', canonical: 'rush_tds' },
      
      // NBA aliases
      { alias: 'pts', canonical: 'points' },
      { alias: 'reb', canonical: 'rebounds' },
      { alias: 'ast', canonical: 'assists' },
      { alias: 'stl', canonical: 'steals' },
      { alias: 'blk', canonical: 'blocks' },
      { alias: 'fgm', canonical: 'field_goals_made' },
      { alias: 'fga', canonical: 'field_goals_attempted' },
      { alias: '3pm', canonical: 'three_pointers_made' },
      { alias: '3pa', canonical: 'three_pointers_attempted' },
      
      // MLB aliases
      { alias: 'hr', canonical: 'home_runs' },
      { alias: 'rbi', canonical: 'runs_batted_in' },
      { alias: 'sb', canonical: 'stolen_bases' },
      { alias: 'hits', canonical: 'hits' },
      { alias: 'runs', canonical: 'runs' },
      { alias: 'walks', canonical: 'walks' },
      { alias: 'strikeouts', canonical: 'strikeouts' },
      
      // NHL aliases
      { alias: 'sog', canonical: 'shots_on_goal' },
      { alias: 'saves', canonical: 'goalie_saves' },
      { alias: 'goals', canonical: 'goals' },
      { alias: 'assists', canonical: 'assists' },
      { alias: 'points', canonical: 'points' },
      { alias: 'shots', canonical: 'shots' },
      { alias: 'blocks', canonical: 'blocks' },
      { alias: 'hits', canonical: 'hits' },
      { alias: 'pims', canonical: 'penalty_minutes' }
    ];
    
    // Insert aliases one by one to avoid conflicts
    let insertedCount = 0;
    for (const alias of aliases) {
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
    
    console.log(`✅ Inserted ${insertedCount}/${aliases.length} prop type aliases`);
    
    // Verify the data
    const { data, error: selectError } = await supabase
      .from("prop_type_aliases")
      .select("alias, canonical")
      .limit(10);
    
    if (selectError) {
      console.error("❌ Error selecting aliases:", selectError);
      return;
    }
    
    console.log("📊 Sample aliases:");
    data?.forEach((row, i) => {
      console.log(`${i + 1}. ${row.alias} → ${row.canonical}`);
    });
    
    // Test the normalization
    console.log("\n🧪 Testing normalization:");
    console.log("sacks →", aliases.find(a => a.alias === 'sacks')?.canonical || 'not found');
    console.log("td →", aliases.find(a => a.alias === 'td')?.canonical || 'not found');
    console.log("pts →", aliases.find(a => a.alias === 'pts')?.canonical || 'not found');
    
  } catch (error) {
    console.error("❌ Setup failed:", error);
  }
}

populatePropTypeAliases().catch(console.error);
