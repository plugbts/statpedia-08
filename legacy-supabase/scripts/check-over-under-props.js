#!/usr/bin/env node

/**
 * Check what specific over/under props we have that need fixing
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://rfdrifnsfobqlzorcesn.supabase.co";
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOverUnderProps() {
  console.log("🔍 Checking over/under props that need fixing...\n");

  try {
    // Get sample over/under props by league
    const leagues = ["nfl", "mlb"];

    for (const league of leagues) {
      console.log(`\n🏈 ${league.toUpperCase()} over/under props:`);

      const { data: overUnderProps, error } = await supabase
        .from("proplines")
        .select("player_name, prop_type, line, team, opponent, date")
        .eq("league", league)
        .eq("prop_type", "over/under")
        .limit(10);

      if (error) {
        console.error(`❌ Error getting ${league} props:`, error.message);
        continue;
      }

      if (!overUnderProps || overUnderProps.length === 0) {
        console.log(`   No over/under props found for ${league}`);
        continue;
      }

      console.log(`   Found ${overUnderProps.length} sample over/under props:`);
      overUnderProps.forEach((prop) => {
        console.log(
          `   ${prop.player_name}: ${prop.prop_type} ${prop.line} (${prop.team} vs ${prop.opponent}) - ${prop.date}`,
        );
      });

      // Analyze line ranges
      const lines = overUnderProps.map((p) => p.line);
      const minLine = Math.min(...lines);
      const maxLine = Math.max(...lines);
      const uniqueLines = [...new Set(lines)].sort((a, b) => a - b);

      console.log(`   Line range: ${minLine} - ${maxLine}`);
      console.log(
        `   Unique lines: ${uniqueLines.slice(0, 10).join(", ")}${uniqueLines.length > 10 ? "..." : ""}`,
      );
    }

    // Get total counts
    console.log("\n📊 Total over/under props by league:");
    for (const league of leagues) {
      const { count, error } = await supabase
        .from("proplines")
        .select("*", { count: "exact", head: true })
        .eq("league", league)
        .eq("prop_type", "over/under");

      if (error) {
        console.error(`❌ Error counting ${league} props:`, error.message);
      } else {
        console.log(`   ${league}: ${count} over/under props`);
      }
    }

    console.log("\n💡 Next Steps:");
    console.log("1. Run the SQL fix scripts to clean up existing over/under props");
    console.log("2. The worker fix will prevent NEW props from becoming over/under");
    console.log("3. Both fixes together will resolve the issue completely");
  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
  }
}

checkOverUnderProps().catch(console.error);
