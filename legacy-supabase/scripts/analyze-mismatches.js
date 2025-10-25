import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function analyzeMismatches() {
  console.log("🔍 Analyzing prop type mismatches for 100% match rates...");

  try {
    // Get sample data from both tables
    const { data: gameLogs, error: glErr } = await supabase
      .from("player_game_logs")
      .select("player_id, game_id, prop_type, league, date, conflict_key")
      .limit(200);

    const { data: props, error: prErr } = await supabase
      .from("proplines")
      .select("player_id, game_id, prop_type, league, date, date_normalized, conflict_key")
      .limit(200);

    if (glErr || prErr) {
      console.error("❌ Error fetching data:", glErr || prErr);
      return;
    }

    console.log(`📊 Analyzing ${gameLogs?.length || 0} game logs vs ${props?.length || 0} props`);

    // Analyze by league
    const leagueAnalysis = {};

    gameLogs?.forEach((gameLog) => {
      const league = gameLog.league?.toLowerCase();
      if (!leagueAnalysis[league]) {
        leagueAnalysis[league] = {
          gameLogs: new Set(),
          props: new Set(),
          gameLogProps: [],
          propProps: [],
          mismatches: [],
        };
      }

      leagueAnalysis[league].gameLogs.add(gameLog.prop_type);
      leagueAnalysis[league].gameLogProps.push(gameLog);
    });

    props?.forEach((prop) => {
      const league = prop.league?.toLowerCase();
      if (!leagueAnalysis[league]) {
        leagueAnalysis[league] = {
          gameLogs: new Set(),
          props: new Set(),
          gameLogProps: [],
          propProps: [],
          mismatches: [],
        };
      }

      leagueAnalysis[league].props.add(prop.prop_type);
      leagueAnalysis[league].propProps.push(prop);
    });

    // Analyze mismatches
    Object.entries(leagueAnalysis).forEach(([league, data]) => {
      console.log(`\n🏈 ${league.toUpperCase()} Analysis:`);
      console.log(
        `  Game Log Prop Types (${data.gameLogs.size}):`,
        Array.from(data.gameLogs).join(", "),
      );
      console.log(`  Props Prop Types (${data.props.size}):`, Array.from(data.props).join(", "));

      const overlapping = new Set([...data.gameLogs].filter((x) => data.props.has(x)));
      const onlyInGameLogs = new Set([...data.gameLogs].filter((x) => !data.props.has(x)));
      const onlyInProps = new Set([...data.props].filter((x) => !data.gameLogs.has(x)));

      console.log(`  Overlapping (${overlapping.size}):`, Array.from(overlapping).join(", "));
      console.log(
        `  Only in Game Logs (${onlyInGameLogs.size}):`,
        Array.from(onlyInGameLogs).join(", "),
      );
      console.log(`  Only in Props (${onlyInProps.size}):`, Array.from(onlyInProps).join(", "));

      // Check for potential matches with different prop types
      console.log(`\n  🔍 Potential matches analysis:`);
      let potentialMatches = 0;

      data.gameLogProps.forEach((gameLog) => {
        const candidates = data.propProps.filter(
          (prop) => prop.player_id === gameLog.player_id && prop.game_id === gameLog.game_id,
        );

        if (candidates.length > 0) {
          const exactMatch = candidates.find((prop) => prop.prop_type === gameLog.prop_type);
          if (!exactMatch) {
            potentialMatches++;
            console.log(`    Player ${gameLog.player_id}, Game ${gameLog.game_id}:`);
            console.log(`      Game Log: ${gameLog.prop_type}`);
            console.log(`      Available Props: ${candidates.map((c) => c.prop_type).join(", ")}`);
          }
        }
      });

      console.log(`  Total potential matches with different prop types: ${potentialMatches}`);
    });

    // Check prop type aliases
    console.log(`\n📝 Current prop type aliases:`);
    const { data: aliases, error: aliasErr } = await supabase
      .from("prop_type_aliases")
      .select("alias, canonical")
      .limit(20);

    if (!aliasErr && aliases) {
      aliases.forEach((alias) => {
        console.log(`  ${alias.alias} → ${alias.canonical}`);
      });
    }

    console.log(`\n✅ Mismatch analysis completed!`);
  } catch (error) {
    console.error("❌ Error analyzing mismatches:", error);
  }
}

analyzeMismatches().catch(console.error);
