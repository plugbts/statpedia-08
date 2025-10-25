import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createPropTypeAliasesTable() {
  console.log("🔧 Creating prop_type_aliases table...");

  try {
    // Create the table
    const { error: createError } = await supabase.rpc("exec", {
      sql: `
        CREATE TABLE IF NOT EXISTS prop_type_aliases (
          id SERIAL PRIMARY KEY,
          alias VARCHAR(100) NOT NULL,
          canonical VARCHAR(100) NOT NULL,
          league VARCHAR(10),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(alias, league)
        );
        
        CREATE INDEX IF NOT EXISTS idx_prop_type_aliases_alias ON prop_type_aliases(alias);
        CREATE INDEX IF NOT EXISTS idx_prop_type_aliases_canonical ON prop_type_aliases(canonical);
      `,
    });

    if (createError) {
      console.error("❌ Error creating table:", createError);
      return;
    }

    console.log("✅ Table created successfully");

    // Insert initial data
    const aliases = [
      // NFL aliases
      { alias: "sacks", canonical: "defense_sacks", league: "nfl" },
      { alias: "td", canonical: "fantasyscore", league: "nfl" },
      { alias: "touchdowns", canonical: "fantasyscore", league: "nfl" },
      { alias: "pass_yards", canonical: "passing_yards", league: "nfl" },
      { alias: "rush_yards", canonical: "rushing_yards", league: "nfl" },
      { alias: "rec_yards", canonical: "receiving_yards", league: "nfl" },

      // NBA aliases
      { alias: "pts", canonical: "points", league: "nba" },
      { alias: "reb", canonical: "rebounds", league: "nba" },
      { alias: "ast", canonical: "assists", league: "nba" },
      { alias: "stl", canonical: "steals", league: "nba" },
      { alias: "blk", canonical: "blocks", league: "nba" },

      // MLB aliases
      { alias: "hr", canonical: "home_runs", league: "mlb" },
      { alias: "rbi", canonical: "runs_batted_in", league: "mlb" },
      { alias: "sb", canonical: "stolen_bases", league: "mlb" },

      // NHL aliases
      { alias: "sog", canonical: "shots_on_goal", league: "nhl" },
      { alias: "saves", canonical: "goalie_saves", league: "nhl" },
    ];

    const { error: insertError } = await supabase.from("prop_type_aliases").upsert(aliases, {
      onConflict: "alias,league",
      ignoreDuplicates: false,
    });

    if (insertError) {
      console.error("❌ Error inserting aliases:", insertError);
      return;
    }

    console.log(`✅ Inserted ${aliases.length} prop type aliases`);

    // Verify the data
    const { data, error: selectError } = await supabase
      .from("prop_type_aliases")
      .select("alias, canonical, league")
      .limit(5);

    if (selectError) {
      console.error("❌ Error selecting aliases:", selectError);
      return;
    }

    console.log("📊 Sample aliases:");
    data?.forEach((row, i) => {
      console.log(`${i + 1}. ${row.alias} → ${row.canonical} (${row.league})`);
    });
  } catch (error) {
    console.error("❌ Setup failed:", error);
  }
}

createPropTypeAliasesTable().catch(console.error);
