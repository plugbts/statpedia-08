#!/usr/bin/env node

/**
 * Test Worker Query Format
 * Test the exact query format that the Worker uses
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rfdrifnsfobqlzorcesn.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testWorkerQuery() {
  console.log("🔍 Testing Worker query format...\n");

  try {
    // Test the exact query that the Worker constructs
    const league = "nfl";
    let query = "player_game_logs";
    const params = [];

    if (league !== "all") {
      params.push(`league=eq.${league}`);
    }
    params.push(`order=date.desc`);

    if (params.length > 0) {
      query += `?${params.join("&")}`;
    }

    console.log(`📊 Query: ${query}`);

    // Test using the REST API directly (like supabaseFetch does)
    const url = `${supabaseUrl}/rest/v1/${query}`;
    console.log(`📊 Full URL: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log(`📊 Response text length: ${text.length}`);

    if (text.trim() === "") {
      console.log("❌ Empty response - this is the problem!");
    } else {
      try {
        const data = JSON.parse(text);
        console.log(`✅ Parsed data: ${Array.isArray(data) ? data.length : "not array"} records`);
        if (Array.isArray(data) && data.length > 0) {
          console.log("📋 Sample record:", JSON.stringify(data[0], null, 2));
        }
      } catch (e) {
        console.log("❌ Failed to parse JSON:", e.message);
        console.log("📋 Raw response:", text.substring(0, 200));
      }
    }

    // Compare with direct Supabase client
    console.log("\n📊 Compare with direct Supabase client:");
    const { data: directData, error: directError } = await supabase
      .from("player_game_logs")
      .select("*")
      .eq("league", "nfl")
      .order("date", { ascending: false });

    if (directError) {
      console.error("❌ Direct query failed:", directError.message);
    } else {
      console.log(`✅ Direct query: ${directData?.length || 0} records`);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testWorkerQuery()
  .then(() => {
    console.log("\n✅ Worker query test completed");
  })
  .catch((error) => {
    console.error("❌ Test script failed:", error);
    process.exit(1);
  });
