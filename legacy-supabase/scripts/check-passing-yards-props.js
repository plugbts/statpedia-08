#!/usr/bin/env node

/**
 * Check where passing yards props are and their current status
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://rfdrifnsfobqlzorcesn.supabase.co";
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPassingYardsProps() {
  console.log("🔍 Checking passing yards props...\n");

  try {
    // 1. Check all passing yards related props
    console.log("1. All passing yards related props:");
    const { data: passingProps, error: passingError } = await supabase
      .from("proplines")
      .select("player_name, prop_type, line, team, opponent, date, sportsbook")
      .or("prop_type.eq.passing_yards,prop_type.eq.Passing Yards,prop_type.ilike.%passing%")
      .eq("league", "nfl")
      .order("line", { ascending: false })
      .limit(20);

    if (passingError) {
      console.error("❌ Error getting passing props:", passingError.message);
    } else if (passingProps && passingProps.length > 0) {
      console.log(`   Found ${passingProps.length} passing-related props:`);
      passingProps.forEach((prop) => {
        console.log(
          `   ${prop.player_name}: ${prop.prop_type} ${prop.line} (${prop.team} vs ${prop.opponent}) - ${prop.date}`,
        );
      });
    } else {
      console.log("   No passing-related props found");
    }

    // 2. Check specific prop types
    console.log('\n2. Prop types containing "passing":');
    const { data: propTypes, error: typesError } = await supabase
      .from("proplines")
      .select("prop_type")
      .eq("league", "nfl")
      .ilike("prop_type", "%passing%");

    if (typesError) {
      console.error("❌ Error getting prop types:", typesError.message);
    } else if (propTypes && propTypes.length > 0) {
      const uniqueTypes = [...new Set(propTypes.map((p) => p.prop_type))];
      console.log(`   Unique passing prop types: ${uniqueTypes.join(", ")}`);

      // Count each type
      for (const type of uniqueTypes) {
        const { count } = await supabase
          .from("proplines")
          .select("*", { count: "exact", head: true })
          .eq("league", "nfl")
          .eq("prop_type", type);
        console.log(`   ${type}: ${count} props`);
      }
    } else {
      console.log("   No passing prop types found");
    }

    // 3. Check if there are any props with high line values (typical for passing yards)
    console.log("\n3. Props with high line values (200+):");
    const { data: highLineProps, error: highError } = await supabase
      .from("proplines")
      .select("player_name, prop_type, line, team, opponent, date")
      .eq("league", "nfl")
      .gte("line", 200)
      .order("line", { ascending: false })
      .limit(10);

    if (highError) {
      console.error("❌ Error getting high line props:", highError.message);
    } else if (highLineProps && highLineProps.length > 0) {
      console.log(`   Found ${highLineProps.length} props with lines 200+:`);
      highLineProps.forEach((prop) => {
        console.log(
          `   ${prop.player_name}: ${prop.prop_type} ${prop.line} (${prop.team} vs ${prop.opponent})`,
        );
      });
    } else {
      console.log("   No props with high line values found");
    }

    // 4. Check recent props by date
    console.log("\n4. Recent NFL props by date:");
    const { data: recentProps, error: recentError } = await supabase
      .from("proplines")
      .select("date, prop_type, COUNT(*) as count")
      .eq("league", "nfl")
      .order("date", { ascending: false })
      .limit(5);

    if (recentError) {
      console.error("❌ Error getting recent props:", recentError.message);
    } else if (recentProps && recentProps.length > 0) {
      console.log("   Recent dates with NFL props:");
      for (const dateGroup of recentProps) {
        const { data: propsForDate } = await supabase
          .from("proplines")
          .select("prop_type, COUNT(*) as count")
          .eq("league", "nfl")
          .eq("date", dateGroup.date)
          .order("count", { ascending: false });

        console.log(`   ${dateGroup.date}:`);
        if (propsForDate) {
          propsForDate.forEach((prop) => {
            console.log(`     ${prop.prop_type}: ${prop.count} props`);
          });
        }
      }
    }

    // 5. Check if there are any over/under props left
    console.log("\n5. Remaining over/under props:");
    const { data: remainingOverUnder, error: overUnderError } = await supabase
      .from("proplines")
      .select("player_name, prop_type, line, team, opponent, date")
      .eq("league", "nfl")
      .eq("prop_type", "over/under")
      .limit(10);

    if (overUnderError) {
      console.error("❌ Error getting remaining over/under props:", overUnderError.message);
    } else if (remainingOverUnder && remainingOverUnder.length > 0) {
      console.log(`   Found ${remainingOverUnder.length} remaining over/under props:`);
      remainingOverUnder.forEach((prop) => {
        console.log(
          `   ${prop.player_name}: ${prop.prop_type} ${prop.line} (${prop.team} vs ${prop.opponent})`,
        );
      });
    } else {
      console.log("   No remaining over/under props found ✅");
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
  }
}

checkPassingYardsProps().catch(console.error);
