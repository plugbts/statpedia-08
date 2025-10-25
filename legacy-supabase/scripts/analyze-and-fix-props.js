#!/usr/bin/env node

/**
 * Analyze prop types and create intelligent mappings to fix over/under issue
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://rfdrifnsfobqlzorcesn.supabase.co";
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeAndFixProps() {
  console.log("🔍 Analyzing prop types to fix over/under issue...\n");

  try {
    // 1. Analyze current prop types and their line ranges
    console.log("1. Analyzing current prop types and line ranges...");
    const { data: propAnalysis, error: analysisError } = await supabase
      .from("proplines")
      .select("prop_type, line, sport, COUNT(*)")
      .not("prop_type", "is", null)
      .group("prop_type, line, sport")
      .order("prop_type")
      .limit(100);

    if (analysisError) {
      console.error("❌ Analysis error:", analysisError.message);
      return;
    }

    console.log("📊 Prop type analysis:");
    const propTypeStats = {};

    propAnalysis?.forEach((prop) => {
      const key = `${prop.prop_type}_${prop.sport}`;
      if (!propTypeStats[key]) {
        propTypeStats[key] = {
          prop_type: prop.prop_type,
          sport: prop.sport,
          lines: [],
          count: 0,
        };
      }
      propTypeStats[key].lines.push(prop.line);
      propTypeStats[key].count += parseInt(prop.count);
    });

    // Display analysis
    Object.values(propTypeStats).forEach((stat) => {
      const minLine = Math.min(...stat.lines);
      const maxLine = Math.max(...stat.lines);
      console.log(
        `   ${stat.prop_type} (${stat.sport}): ${stat.count} props, line range ${minLine}-${maxLine}`,
      );
    });

    // 2. Create intelligent mappings based on line ranges
    console.log("\n2. Creating intelligent prop type mappings...");

    const intelligentMappings = [];

    // NFL line-based mappings
    const nflMappings = [
      { range: [200, 500], prop: "passing_yards", description: "NFL Passing Yards" },
      { range: [50, 200], prop: "rushing_yards", description: "NFL Rushing Yards" },
      { range: [50, 150], prop: "receiving_yards", description: "NFL Receiving Yards" },
      { range: [1, 5], prop: "passing_touchdowns", description: "NFL Passing TDs" },
      { range: [1, 5], prop: "rushing_touchdowns", description: "NFL Rushing TDs" },
      { range: [1, 5], prop: "receiving_touchdowns", description: "NFL Receiving TDs" },
      { range: [1, 10], prop: "receptions", description: "NFL Receptions" },
      { range: [15, 35], prop: "rushing_attempts", description: "NFL Rushing Attempts" },
      { range: [20, 50], prop: "passing_attempts", description: "NFL Passing Attempts" },
    ];

    // NBA line-based mappings
    const nbaMappings = [
      { range: [10, 40], prop: "points", description: "NBA Points" },
      { range: [5, 15], prop: "rebounds", description: "NBA Rebounds" },
      { range: [5, 15], prop: "assists", description: "NBA Assists" },
      { range: [1, 5], prop: "steals", description: "NBA Steals" },
      { range: [1, 5], prop: "blocks", description: "NBA Blocks" },
      { range: [1, 5], prop: "three_pointers_made", description: "NBA 3-Pointers Made" },
      { range: [5, 15], prop: "field_goals_made", description: "NBA Field Goals Made" },
    ];

    // NHL line-based mappings
    const nhlMappings = [
      { range: [0.5, 3], prop: "goals", description: "NHL Goals" },
      { range: [0.5, 3], prop: "assists", description: "NHL Assists" },
      { range: [1, 5], prop: "points", description: "NHL Points" },
      { range: [1, 8], prop: "shots_on_goal", description: "NHL Shots on Goal" },
      { range: [20, 50], prop: "goalie_saves", description: "NHL Goalie Saves" },
    ];

    // 3. Generate SQL to fix over/under props
    console.log("\n3. Generating SQL to fix over/under props...");

    let fixSQL = "-- Intelligent prop type fixes based on line analysis\n";
    fixSQL += "UPDATE proplines SET prop_type = CASE\n";

    // Add NFL mappings
    nflMappings.forEach((mapping) => {
      fixSQL += `  WHEN prop_type = 'over/under' AND sport = 'nfl' AND line >= ${mapping.range[0]} AND line <= ${mapping.range[1]} THEN '${mapping.prop}' -- ${mapping.description}\n`;
    });

    // Add NBA mappings
    nbaMappings.forEach((mapping) => {
      fixSQL += `  WHEN prop_type = 'over/under' AND sport = 'nba' AND line >= ${mapping.range[0]} AND line <= ${mapping.range[1]} THEN '${mapping.prop}' -- ${mapping.description}\n`;
    });

    // Add NHL mappings
    nhlMappings.forEach((mapping) => {
      fixSQL += `  WHEN prop_type = 'over/under' AND sport = 'nhl' AND line >= ${mapping.range[0]} AND line <= ${mapping.range[1]} THEN '${mapping.prop}' -- ${mapping.description}\n`;
    });

    fixSQL += `  ELSE prop_type\n`;
    fixSQL += `END\n`;
    fixSQL += `WHERE prop_type = 'over/under';\n\n`;

    // Add verification query
    fixSQL += "-- Verification query\n";
    fixSQL +=
      "SELECT prop_type, sport, COUNT(*) as count, MIN(line) as min_line, MAX(line) as max_line\n";
    fixSQL += "FROM proplines\n";
    fixSQL += "GROUP BY prop_type, sport\n";
    fixSQL += "ORDER BY count DESC;\n";

    // Save the SQL to a file
    const fs = await import("fs");
    fs.writeFileSync("intelligent-prop-fix.sql", fixSQL);
    console.log("✅ Generated intelligent-prop-fix.sql");

    // 4. Show what would be fixed
    console.log("\n4. Analyzing what would be fixed...");
    const { data: overUnderProps, error: overUnderError } = await supabase
      .from("proplines")
      .select("line, sport, COUNT(*)")
      .eq("prop_type", "over/under")
      .group("line, sport")
      .order("sport, line");

    if (overUnderError) {
      console.error("❌ Over/under analysis error:", overUnderError.message);
    } else {
      console.log("📋 Over/under props that would be fixed:");
      overUnderProps?.forEach((prop) => {
        const mapping = findBestMapping(
          prop.line,
          prop.sport,
          nflMappings,
          nbaMappings,
          nhlMappings,
        );
        console.log(`   Line ${prop.line} (${prop.sport}): ${prop.count} props → ${mapping}`);
      });
    }

    console.log("\n" + "=".repeat(50));
    console.log("📋 SUMMARY");
    console.log("=".repeat(50));
    console.log("✅ Analysis complete");
    console.log("✅ Generated intelligent-prop-fix.sql");
    console.log("📝 NEXT STEPS:");
    console.log("   1. Run fix-prop-type-aliases.sql to populate aliases table");
    console.log("   2. Run intelligent-prop-fix.sql to fix over/under props");
    console.log("   3. Test the fixes");
  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
  }
}

function findBestMapping(line, sport, nflMappings, nbaMappings, nhlMappings) {
  let mappings = [];

  if (sport === "nfl") mappings = nflMappings;
  else if (sport === "nba") mappings = nbaMappings;
  else if (sport === "nhl") mappings = nhlMappings;

  const mapping = mappings.find((m) => line >= m.range[0] && line <= m.range[1]);
  return mapping ? mapping.prop : "unknown";
}

analyzeAndFixProps().catch(console.error);
