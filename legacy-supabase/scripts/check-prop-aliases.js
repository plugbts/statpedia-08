#!/usr/bin/env node

/**
 * Check the prop_type_aliases table and see what's causing the over/under issue
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://rfdrifnsfobqlzorcesn.supabase.co";
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPropAliases() {
  console.log("🔍 Checking prop_type_aliases table...\n");

  try {
    // Check if the table exists and has data
    console.log("1. Checking if prop_type_aliases table exists...");
    const { data: aliases, error: aliasesError } = await supabase
      .from("prop_type_aliases")
      .select("*")
      .limit(10);

    if (aliasesError) {
      console.error("❌ prop_type_aliases table error:", aliasesError.message);

      if (aliasesError.message.includes('relation "prop_type_aliases" does not exist')) {
        console.log("💡 The prop_type_aliases table does not exist!");
        console.log("   This is why prop names are showing as over/under.");
        console.log(
          "   SOLUTION: Create the prop_type_aliases table and populate it with proper mappings.",
        );
      }
    } else {
      console.log("✅ prop_type_aliases table exists");
      console.log("📊 Sample aliases:", aliases);
      console.log(`📈 Total aliases: ${aliases?.length || 0}`);
    }

    // Check what prop types are actually in the proplines table
    console.log("\n2. Checking actual prop types in proplines table...");
    const { data: propTypes, error: propTypesError } = await supabase
      .from("proplines")
      .select("prop_type")
      .limit(20);

    if (propTypesError) {
      console.error("❌ proplines table error:", propTypesError.message);
    } else {
      console.log("✅ proplines table accessible");
      const uniquePropTypes = [...new Set(propTypes?.map((p) => p.prop_type))];
      console.log("📋 Unique prop types found:", uniquePropTypes);

      // Check for over/under specifically
      const overUnderProps = uniquePropTypes.filter(
        (p) =>
          p?.toLowerCase().includes("over") ||
          p?.toLowerCase().includes("under") ||
          p === "over" ||
          p === "under",
      );

      if (overUnderProps.length > 0) {
        console.log("⚠️  Found over/under prop types:", overUnderProps);
        console.log(
          "   This confirms the issue - prop names are being stored as over/under instead of proper names.",
        );
      }
    }

    // Check player_game_logs table too
    console.log("\n3. Checking prop types in player_game_logs table...");
    const { data: gameLogProps, error: gameLogError } = await supabase
      .from("player_game_logs")
      .select("prop_type")
      .limit(20);

    if (gameLogError) {
      console.error("❌ player_game_logs table error:", gameLogError.message);
    } else {
      console.log("✅ player_game_logs table accessible");
      const uniqueGameLogProps = [...new Set(gameLogProps?.map((p) => p.prop_type))];
      console.log("📋 Unique game log prop types:", uniqueGameLogProps);
    }

    console.log("\n" + "=".repeat(50));
    console.log("📋 DIAGNOSIS SUMMARY");
    console.log("=".repeat(50));

    if (aliasesError?.message.includes("does not exist")) {
      console.log("❌ ROOT CAUSE: prop_type_aliases table does not exist");
      console.log("💡 SOLUTION: Create and populate the prop_type_aliases table");
      console.log("📝 NEXT STEPS:");
      console.log("   1. Create the prop_type_aliases table");
      console.log("   2. Populate it with proper prop name mappings");
      console.log("   3. Test the normalization");
    } else if (aliases?.length === 0) {
      console.log("❌ ROOT CAUSE: prop_type_aliases table is empty");
      console.log("💡 SOLUTION: Populate the prop_type_aliases table with proper mappings");
    } else {
      console.log("✅ prop_type_aliases table exists and has data");
      console.log("🔍 Need to investigate further - check if mappings are correct");
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
  }
}

checkPropAliases().catch(console.error);
