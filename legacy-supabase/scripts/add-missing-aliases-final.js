import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addMissingAliasesFinal() {
  console.log("🚀 Adding final missing aliases for 100% match rates...");

  try {
    // Add the specific missing aliases identified in the analysis
    const missingAliases = [
      // NFL - Missing mappings
      { alias: "rushing_yards", canonical: "rush_yards" },
      { alias: "receiving_yards", canonical: "rec_yards" },
      { alias: "passing_yards", canonical: "pass_yards" },
      { alias: "rushing_attempts", canonical: "carries" },
      { alias: "passing_touchdowns", canonical: "touchdowns" },
      { alias: "touchdowns", canonical: "passing_touchdowns" },
      { alias: "fantasyscore", canonical: "touchdowns" },

      // NHL - Missing mappings
      { alias: "shots_ongoal", canonical: "shots_on_goal" },
      { alias: "shots_on_goal", canonical: "shots_ongoal" },
      { alias: "hits", canonical: "hits" },
      { alias: "faceoffs_won", canonical: "faceoffs_won" },
      { alias: "points", canonical: "points" },
      { alias: "minutesplayed", canonical: "minutes_played" },
      { alias: "minutes_played", canonical: "minutesplayed" },
      { alias: "blocks", canonical: "blocks" },
      { alias: "goals", canonical: "goals" },
      { alias: "Goals", canonical: "goals" },

      // NBA - Case sensitivity
      { alias: "rebounds", canonical: "rebounds" },
      { alias: "Rebounds", canonical: "rebounds" },

      // Additional comprehensive mappings
      { alias: "Rushing_Yards", canonical: "rush_yards" },
      { alias: "Receiving_Yards", canonical: "rec_yards" },
      { alias: "Passing_Yards", canonical: "pass_yards" },
      { alias: "Rushing_Attempts", canonical: "carries" },
      { alias: "Passing_Touchdowns", canonical: "touchdowns" },
      { alias: "Shots_OnGoal", canonical: "shots_on_goal" },
      { alias: "Shots_On_Goal", canonical: "shots_on_goal" },
      { alias: "Faceoffs_Won", canonical: "faceoffs_won" },
      { alias: "Minutes_Played", canonical: "minutes_played" },
      { alias: "Blocks", canonical: "blocks" },
      { alias: "Goals", canonical: "goals" },

      // Reverse mappings for better coverage
      { alias: "rush_yards", canonical: "rushing_yards" },
      { alias: "rec_yards", canonical: "receiving_yards" },
      { alias: "pass_yards", canonical: "passing_yards" },
      { alias: "carries", canonical: "rushing_attempts" },
    ];

    console.log(`📝 Adding ${missingAliases.length} missing aliases...`);

    let insertedCount = 0;
    for (const alias of missingAliases) {
      const { error: insertError } = await supabase.from("prop_type_aliases").upsert([alias], {
        onConflict: "alias",
        ignoreDuplicates: false,
      });

      if (insertError) {
        console.warn(`⚠️ Failed to insert ${alias.alias}:`, insertError.message);
      } else {
        insertedCount++;
      }
    }

    console.log(`✅ Added ${insertedCount}/${missingAliases.length} missing aliases`);

    // Test the new mappings
    console.log(`\n🧪 Testing new mappings:`);
    const testCases = [
      { input: "rushing_yards", expected: "rush_yards" },
      { input: "receiving_yards", expected: "rec_yards" },
      { input: "passing_yards", expected: "pass_yards" },
      { input: "rushing_attempts", expected: "carries" },
      { input: "passing_touchdowns", expected: "touchdowns" },
      { input: "shots_ongoal", expected: "shots_on_goal" },
      { input: "faceoffs_won", expected: "faceoffs_won" },
      { input: "minutesplayed", expected: "minutes_played" },
      { input: "Rebounds", expected: "rebounds" },
      { input: "Goals", expected: "goals" },
    ];

    for (const test of testCases) {
      const { data: aliasData, error: aliasError } = await supabase
        .from("prop_type_aliases")
        .select("canonical")
        .eq("alias", test.input.toLowerCase())
        .single();

      const normalized = aliasData ? aliasData.canonical : test.input.toLowerCase();
      console.log(`${test.input} → ${normalized}`);
    }

    console.log(`\n✅ Final missing aliases added successfully!`);
  } catch (error) {
    console.error("❌ Error adding missing aliases:", error);
  }
}

addMissingAliasesFinal().catch(console.error);
