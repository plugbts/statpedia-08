#!/usr/bin/env node

/**
 * Test script to verify the fixed RPC functions work without syntax errors
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://rfdrifnsfobqlzorcesn.supabase.co";
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixedRPC() {
  console.log("🧪 Testing fixed RPC functions...\n");

  try {
    // Test 1: Test proplines function with empty array (should not have syntax errors)
    console.log("1. Testing bulk_upsert_proplines with empty array...");
    const { data: proplinesResult, error: proplinesError } = await supabase.rpc(
      "bulk_upsert_proplines",
      {
        rows: [],
      },
    );

    if (proplinesError) {
      console.error("❌ Proplines function error:", proplinesError.message);
      if (proplinesError.message.includes("GET DIAGNOSTICS")) {
        console.error("❌ Still has GET DIAGNOSTICS syntax error!");
      }
    } else {
      console.log("✅ Proplines function works (no syntax errors):", proplinesResult);
    }

    // Test 2: Test player_game_logs function with empty array
    console.log("\n2. Testing bulk_upsert_player_game_logs with empty array...");
    const { data: gameLogsResult, error: gameLogsError } = await supabase.rpc(
      "bulk_upsert_player_game_logs",
      {
        rows: [],
      },
    );

    if (gameLogsError) {
      console.error("❌ Player game logs function error:", gameLogsError.message);
      if (gameLogsError.message.includes("GET DIAGNOSTICS")) {
        console.error("❌ Still has GET DIAGNOSTICS syntax error!");
      }
    } else {
      console.log("✅ Player game logs function works (no syntax errors):", gameLogsResult);
    }

    console.log("\n🎉 RPC syntax error fix verification complete!");
    console.log("If you see ✅ above, the GET DIAGNOSTICS syntax error has been fixed.");
  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
    process.exit(1);
  }
}

// Run the test
testFixedRPC().catch(console.error);
