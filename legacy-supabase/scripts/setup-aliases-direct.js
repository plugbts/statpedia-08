import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setupPropTypeAliases() {
  console.log("🔧 Setting up prop_type_aliases table...");

  try {
    // First, try to create the table using a simple query
    const { error: createError } = await supabase.from("prop_type_aliases").select("*").limit(1);

    if (createError && createError.code === "PGRST116") {
      console.log("📝 Table doesn't exist, creating it...");

      // Create table using SQL editor approach
      const createTableSQL = `
        CREATE TABLE prop_type_aliases (
          id SERIAL PRIMARY KEY,
          alias VARCHAR(100) NOT NULL,
          canonical VARCHAR(100) NOT NULL,
          league VARCHAR(10),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(alias, league)
        );
      `;

      // For now, let's just insert the data and let Supabase handle the table creation
      console.log("⚠️ Table creation requires manual setup. Proceeding with data insertion...");
    } else if (createError) {
      console.error("❌ Error checking table:", createError);
      return;
    } else {
      console.log("✅ Table exists, proceeding with data insertion...");
    }

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
      console.log("📝 This might be because the table doesn't exist yet.");
      console.log("📝 Please create the table manually in the Supabase dashboard:");
      console.log("📝 CREATE TABLE prop_type_aliases (");
      console.log("📝   id SERIAL PRIMARY KEY,");
      console.log("📝   alias VARCHAR(100) NOT NULL,");
      console.log("📝   canonical VARCHAR(100) NOT NULL,");
      console.log("📝   league VARCHAR(10),");
      console.log("📝   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),");
      console.log("📝   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),");
      console.log("📝   UNIQUE(alias, league)");
      console.log("📝 );");
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

setupPropTypeAliases().catch(console.error);
