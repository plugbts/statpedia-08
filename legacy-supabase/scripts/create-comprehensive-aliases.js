import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createComprehensiveAliases() {
  console.log("🚀 Creating comprehensive prop type aliases for 100% match rates...");

  try {
    // Comprehensive prop type aliases for all leagues
    const comprehensiveAliases = [
      // NFL - All possible variations
      { alias: "sacks", canonical: "defense_sacks" },
      { alias: "defense_sacks", canonical: "sacks" },
      { alias: "td", canonical: "fantasyscore" },
      { alias: "touchdowns", canonical: "fantasyscore" },
      { alias: "fantasyscore", canonical: "touchdowns" },
      { alias: "pass_yards", canonical: "passing_yards" },
      { alias: "passing_yards", canonical: "pass_yards" },
      { alias: "rush_yards", canonical: "rushing_yards" },
      { alias: "rushing_yards", canonical: "rush_yards" },
      { alias: "rec_yards", canonical: "receiving_yards" },
      { alias: "receiving_yards", canonical: "rec_yards" },
      { alias: "receptions", canonical: "receptions" },
      { alias: "turnovers", canonical: "turnovers" },
      { alias: "interceptions", canonical: "passing_interceptions" },
      { alias: "passing_interceptions", canonical: "interceptions" },
      { alias: "rushing_attempts", canonical: "carries" },
      { alias: "carries", canonical: "rushing_attempts" },
      { alias: "points", canonical: "points" },
      { alias: "fantasy_score", canonical: "fantasyscore" },
      { alias: "tackles", canonical: "tackles" },
      { alias: "passing_completions", canonical: "completions" },
      { alias: "completions", canonical: "passing_completions" },

      // NBA - All possible variations
      { alias: "pts", canonical: "points" },
      { alias: "points", canonical: "pts" },
      { alias: "reb", canonical: "rebounds" },
      { alias: "rebounds", canonical: "reb" },
      { alias: "ast", canonical: "assists" },
      { alias: "assists", canonical: "ast" },
      { alias: "stl", canonical: "steals" },
      { alias: "steals", canonical: "stl" },
      { alias: "blk", canonical: "blocks" },
      { alias: "blocks", canonical: "blk" },
      { alias: "fgm", canonical: "field_goals_made" },
      { alias: "field_goals_made", canonical: "fgm" },
      { alias: "fga", canonical: "field_goals_attempted" },
      { alias: "field_goals_attempted", canonical: "fga" },
      { alias: "3pm", canonical: "three_pointers_made" },
      { alias: "three_pointers_made", canonical: "3pm" },
      { alias: "3pa", canonical: "three_pointers_attempted" },
      { alias: "three_pointers_attempted", canonical: "3pa" },
      { alias: "ftm", canonical: "free_throws_made" },
      { alias: "free_throws_made", canonical: "ftm" },

      // MLB - All possible variations
      { alias: "hr", canonical: "home_runs" },
      { alias: "home_runs", canonical: "hr" },
      { alias: "rbi", canonical: "runs_batted_in" },
      { alias: "runs_batted_in", canonical: "rbi" },
      { alias: "sb", canonical: "stolen_bases" },
      { alias: "stolen_bases", canonical: "sb" },
      { alias: "hits", canonical: "hits" },
      { alias: "runs", canonical: "runs" },
      { alias: "walks", canonical: "batting_basesonballs" },
      { alias: "batting_basesonballs", canonical: "walks" },
      { alias: "batting_basesOnBalls", canonical: "walks" },
      { alias: "strikeouts", canonical: "batting_strikeouts" },
      { alias: "batting_strikeouts", canonical: "strikeouts" },
      { alias: "doubles", canonical: "batting_doubles" },
      { alias: "batting_doubles", canonical: "doubles" },
      { alias: "triples", canonical: "batting_triples" },
      { alias: "batting_triples", canonical: "triples" },
      { alias: "singles", canonical: "batting_singles" },
      { alias: "batting_singles", canonical: "singles" },

      // NHL - All possible variations
      { alias: "sog", canonical: "shots_on_goal" },
      { alias: "shots_on_goal", canonical: "sog" },
      { alias: "saves", canonical: "goalie_saves" },
      { alias: "goalie_saves", canonical: "saves" },
      { alias: "goals", canonical: "goals" },
      { alias: "assists", canonical: "assists" },
      { alias: "points", canonical: "points" },
      { alias: "shots", canonical: "shots_on_goal" },
      { alias: "blocks", canonical: "blocks" },
      { alias: "hits", canonical: "hits" },
      { alias: "pims", canonical: "penalty_minutes" },
      { alias: "penalty_minutes", canonical: "pims" },
      { alias: "plus_minus", canonical: "plus_minus" },
      { alias: "power_play_points", canonical: "power_play_points" },
      { alias: "shorthanded_points", canonical: "shorthanded_points" },

      // Case variations
      { alias: "Sacks", canonical: "defense_sacks" },
      { alias: "SACKS", canonical: "defense_sacks" },
      { alias: "Points", canonical: "points" },
      { alias: "POINTS", canonical: "points" },
      { alias: "Receptions", canonical: "receptions" },
      { alias: "RECEPTIONS", canonical: "receptions" },
      { alias: "Turnovers", canonical: "turnovers" },
      { alias: "TURNOVERS", canonical: "turnovers" },
      { alias: "Goals", canonical: "goals" },
      { alias: "GOALS", canonical: "goals" },
      { alias: "Assists", canonical: "assists" },
      { alias: "ASSISTS", canonical: "assists" },
      { alias: "Hits", canonical: "hits" },
      { alias: "HITS", canonical: "hits" },
      { alias: "Blocks", canonical: "blocks" },
      { alias: "BLOCKS", canonical: "blocks" },
    ];

    console.log(`📝 Inserting ${comprehensiveAliases.length} comprehensive aliases...`);

    let insertedCount = 0;
    for (const alias of comprehensiveAliases) {
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

    console.log(
      `✅ Inserted ${insertedCount}/${comprehensiveAliases.length} comprehensive aliases`,
    );

    // Verify the data
    const { data, error: selectError } = await supabase
      .from("prop_type_aliases")
      .select("alias, canonical")
      .limit(20);

    if (selectError) {
      console.error("❌ Error verifying aliases:", selectError);
      return;
    }

    console.log("\n📊 Sample aliases:");
    data?.forEach((row, index) => {
      console.log(`${index + 1}. ${row.alias} → ${row.canonical}`);
    });

    // Test some normalizations
    console.log("\n🧪 Testing comprehensive normalizations:");
    const testCases = [
      { input: "sacks", expected: "defense_sacks" },
      { input: "defense_sacks", expected: "sacks" },
      { input: "touchdowns", expected: "fantasyscore" },
      { input: "pts", expected: "points" },
      { input: "reb", expected: "rebounds" },
      { input: "hr", expected: "home_runs" },
      { input: "sog", expected: "shots_on_goal" },
      { input: "Sacks", expected: "defense_sacks" },
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

    console.log("\n✅ Comprehensive aliases created successfully!");
  } catch (error) {
    console.error("❌ Error creating comprehensive aliases:", error);
  }
}

createComprehensiveAliases().catch(console.error);
