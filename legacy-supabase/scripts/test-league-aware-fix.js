#!/usr/bin/env node

/**
 * Test the league-aware prop type fix to ensure over/under issue is resolved across all leagues
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://rfdrifnsfobqlzorcesn.supabase.co";
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLeagueAwareFix() {
  console.log("🧪 Testing league-aware prop type fix...\n");

  try {
    // 1. Check current prop types by league
    console.log("1. Checking current prop types by league...");
    // Get all props first, then group them manually
    const { data: allProps, error: currentError } = await supabase
      .from("proplines")
      .select("prop_type, league")
      .limit(1000);

    if (currentError) {
      console.error("❌ Error getting current props:", currentError.message);
      return;
    }

    console.log("📊 Current prop types by league:");
    const leagueStats = {};
    const propTypeStats = {};

    allProps?.forEach((prop) => {
      const key = `${prop.league}_${prop.prop_type}`;
      if (!propTypeStats[key]) {
        propTypeStats[key] = { league: prop.league, prop_type: prop.prop_type, count: 0 };
      }
      propTypeStats[key].count++;
    });

    // Group by league
    Object.values(propTypeStats).forEach((stat) => {
      if (!leagueStats[stat.league]) {
        leagueStats[stat.league] = { total: 0, overUnder: 0, other: 0 };
      }
      leagueStats[stat.league].total += stat.count;
      if (stat.prop_type === "over/under") {
        leagueStats[stat.league].overUnder += stat.count;
      } else {
        leagueStats[stat.league].other += stat.count;
      }

      console.log(`   ${stat.league}: ${stat.prop_type} (${stat.count} props)`);
    });

    // 2. Check for remaining over/under props by league
    console.log("\n2. Over/under props remaining by league:");
    Object.entries(leagueStats).forEach(([league, stats]) => {
      const percentage = stats.total > 0 ? ((stats.overUnder / stats.total) * 100).toFixed(1) : 0;
      console.log(`   ${league}: ${stats.overUnder}/${stats.total} over/under (${percentage}%)`);
    });

    // 3. Check prop type aliases
    console.log("\n3. Checking prop type aliases...");
    const { data: aliases, error: aliasesError } = await supabase
      .from("prop_type_aliases")
      .select("COUNT(*)");

    if (aliasesError) {
      console.error("❌ Error getting aliases:", aliasesError.message);
    } else {
      console.log(`✅ Prop type aliases: ${aliases?.[0]?.count || 0} entries`);
    }

    // 4. Show sample of fixed props by league
    console.log("\n4. Sample of fixed props by league...");

    const leagues = ["nfl", "nba", "nhl", "mlb", "college_football", "college_basketball"];

    for (const league of leagues) {
      console.log(`\n🏈 ${league.toUpperCase()}:`);

      const { data: sampleProps, error: sampleError } = await supabase
        .from("proplines")
        .select("player_name, prop_type, line, team, opponent")
        .eq("league", league)
        .neq("prop_type", "over/under")
        .order("line", { ascending: false })
        .limit(5);

      if (sampleError) {
        console.error(`❌ Error getting ${league} props:`, sampleError.message);
      } else if (sampleProps && sampleProps.length > 0) {
        sampleProps.forEach((prop) => {
          console.log(
            `   ${prop.player_name}: ${prop.prop_type} ${prop.line} (${prop.team} vs ${prop.opponent})`,
          );
        });
      } else {
        console.log(`   No props found for ${league}`);
      }
    }

    // 5. Test specific prop type mappings
    console.log("\n5. Testing specific prop type mappings...");

    const testMappings = [
      {
        league: "nfl",
        expectedProps: [
          "passing_yards",
          "rushing_yards",
          "rushing_attempts",
          "receptions",
          "passing_touchdowns",
        ],
      },
      { league: "nba", expectedProps: ["points", "rebounds", "assists", "steals", "blocks"] },
      { league: "nhl", expectedProps: ["goals", "assists", "points", "shots_on_goal"] },
      { league: "mlb", expectedProps: ["hits", "home_runs", "runs_batted_in", "strikeouts"] },
    ];

    for (const mapping of testMappings) {
      const { data: mappingProps, error: mappingError } = await supabase
        .from("proplines")
        .select("prop_type, COUNT(*)")
        .eq("league", mapping.league)
        .in("prop_type", mapping.expectedProps)
        .group("prop_type");

      if (mappingError) {
        console.error(`❌ Error testing ${mapping.league} mappings:`, mappingError.message);
      } else {
        console.log(`   ${mapping.league}: ${mappingProps?.length || 0} proper prop types found`);
        mappingProps?.forEach((prop) => {
          console.log(`     ${prop.prop_type}: ${prop.count} props`);
        });
      }
    }

    // 6. Summary
    console.log("\n" + "=".repeat(60));
    console.log("📋 LEAGUE-AWARE TEST RESULTS");
    console.log("=".repeat(60));

    const totalOverUnder = Object.values(leagueStats).reduce(
      (sum, stats) => sum + stats.overUnder,
      0,
    );
    const totalProps = Object.values(leagueStats).reduce((sum, stats) => sum + stats.total, 0);

    if (totalOverUnder === 0) {
      console.log("✅ SUCCESS: No more over/under props found across any league!");
      console.log("🎯 League-aware prop type normalization is working correctly");
    } else {
      console.log(
        `⚠️  PARTIAL: ${totalOverUnder} over/under props still remain across all leagues`,
      );

      // Show which leagues still have issues
      const leaguesWithIssues = Object.entries(leagueStats)
        .filter(([_, stats]) => stats.overUnder > 0)
        .map(([league, stats]) => `${league} (${stats.overUnder})`)
        .join(", ");

      console.log(`💡 Leagues with remaining issues: ${leaguesWithIssues}`);
    }

    const totalAliases = aliases?.[0]?.count || 0;
    if (totalAliases > 100) {
      console.log("✅ Prop type aliases table is well populated for all leagues");
    } else {
      console.log("⚠️  Prop type aliases table may need more entries");
    }

    console.log("\n📊 League-by-league status:");
    Object.entries(leagueStats).forEach(([league, stats]) => {
      const status = stats.overUnder === 0 ? "✅ FIXED" : `⚠️  ${stats.overUnder} remaining`;
      console.log(`   ${league}: ${status}`);
    });

    console.log("\n📝 NEXT STEPS:");
    if (totalOverUnder === 0) {
      console.log("1. ✅ All leagues fixed - test the frontend");
      console.log("2. ✅ Verify prop names display correctly across all leagues");
      console.log("3. ✅ Test prop filtering and sorting");
    } else {
      console.log("1. 🔄 Run fix-league-aware-prop-types.sql again");
      console.log("2. 🔍 Check for any leagues not covered in the mapping");
      console.log("3. 🔧 Add manual fixes for remaining edge cases");
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
  }
}

testLeagueAwareFix().catch(console.error);
