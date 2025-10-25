import { createClient } from "@supabase/supabase-js";

async function checkTables() {
  console.log("🔍 CHECKING TABLE EXISTENCE AND STRUCTURE...\n");

  const SUPABASE_URL = "https://rfdrifnsfobqlzorcesn.supabase.co";
  const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjM2MjY1MCwiZXhwIjoyMDUxOTM4NjUwfQ.7Xz8QwJ8QwJ8QwJ8QwJ8QwJ8QwJ8QwJ8QwJ8QwJ8";

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // Check if tables exist by trying to list them
    console.log("📋 1. CHECKING TABLE EXISTENCE:");

    // Try to get table info from information_schema
    const { data: tables, error: tablesError } = await supabase.rpc("exec_sql", {
      sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('proplines', 'player_game_logs')",
    });

    if (tablesError) {
      console.log("❌ Could not check tables via RPC:", tablesError);

      // Try direct table access instead
      console.log("\n📊 2. TRYING DIRECT TABLE ACCESS:");

      // Test proplines table
      try {
        const { data: proplinesTest, error: proplinesError } = await supabase
          .from("proplines")
          .select("*")
          .limit(1);
        console.log("✅ Proplines table accessible:", proplinesTest?.length || 0, "rows");
        if (proplinesError) console.log("   Error:", proplinesError);
      } catch (e) {
        console.log("❌ Proplines table error:", e.message);
      }

      // Test player_game_logs table
      try {
        const { data: gameLogsTest, error: gameLogsError } = await supabase
          .from("player_game_logs")
          .select("*")
          .limit(1);
        console.log("✅ Player Game Logs table accessible:", gameLogsTest?.length || 0, "rows");
        if (gameLogsError) console.log("   Error:", gameLogsError);
      } catch (e) {
        console.log("❌ Player Game Logs table error:", e.message);
      }
    } else {
      console.log("✅ Tables found:", tables);
    }

    // Check connection
    console.log("\n🔗 3. CHECKING CONNECTION:");
    const { data: connectionTest, error: connectionError } = await supabase
      .from("proplines")
      .select("count", { count: "exact", head: true });

    if (connectionError) {
      console.log("❌ Connection error:", connectionError);
    } else {
      console.log("✅ Connection successful");
    }

    // Check if we can insert
    console.log("\n📝 4. TESTING INSERT:");
    const testRecord = {
      player_id: "CONNECTION_TEST",
      player_name: "Connection Test",
      team: "TEST",
      opponent: "TEST",
      season: 2025,
      date: "2025-10-08",
      prop_type: "Test",
      sportsbook: "TestBook",
      line: 1.5,
      over_odds: -110,
      under_odds: -110,
      league: "nfl",
      game_id: "test-connection",
      conflict_key: "test-connection-key",
    };

    const { data: insertResult, error: insertError } = await supabase
      .from("proplines")
      .insert(testRecord)
      .select();

    if (insertError) {
      console.log("❌ Insert error:", insertError);
    } else {
      console.log("✅ Insert successful:", insertResult);
    }
  } catch (error) {
    console.error("❌ Check failed:", error);
  }
}

checkTables();
