#!/usr/bin/env node

// Debug script to check what data is in our tables
const SUPABASE_URL = "https://rfdrifnsfobqlzorcesn.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjM0OTI2MCwiZXhwIjoyMDUxOTI1MjYwfQ.8p2KqVqKqVqKqVqKqVqKqVqKqVqKqVqKqVqKqVqKqVq";

async function checkData() {
  console.log("🔍 Checking data in our tables...\n");

  // Check proplines table
  console.log("📊 Checking proplines table...");
  try {
    const proplinesResponse = await fetch(`${SUPABASE_URL}/rest/v1/proplines?limit=5&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (proplinesResponse.ok) {
      const proplinesData = await proplinesResponse.json();
      console.log(`✅ Proplines: Found ${proplinesData.length} records`);
      if (proplinesData.length > 0) {
        console.log("Sample proplines record:");
        console.log(JSON.stringify(proplinesData[0], null, 2));
      }
    } else {
      console.log(`❌ Proplines error: ${proplinesResponse.status} ${await proplinesResponse.text()}`);
    }
  } catch (error) {
    console.log(`❌ Proplines error: ${error.message}`);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Check player_game_logs table
  console.log("📊 Checking player_game_logs table...");
  try {
    const gameLogsResponse = await fetch(`${SUPABASE_URL}/rest/v1/player_game_logs?limit=5&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (gameLogsResponse.ok) {
      const gameLogsData = await gameLogsResponse.json();
      console.log(`✅ Player Game Logs: Found ${gameLogsData.length} records`);
      if (gameLogsData.length > 0) {
        console.log("Sample game logs record:");
        console.log(JSON.stringify(gameLogsData[0], null, 2));
      }
    } else {
      console.log(`❌ Game Logs error: ${gameLogsResponse.status} ${await gameLogsResponse.text()}`);
    }
  } catch (error) {
    console.log(`❌ Game Logs error: ${error.message}`);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Check for matching data
  console.log("🔗 Checking for matching data between tables...");
  try {
    const matchResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_data_matches`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (matchResponse.ok) {
      const matchData = await matchResponse.json();
      console.log(`✅ Match check result:`, matchData);
    } else {
      console.log(`❌ Match check error: ${matchResponse.status} ${await matchResponse.text()}`);
    }
  } catch (error) {
    console.log(`❌ Match check error: ${error.message}`);
  }
}

checkData().catch(console.error);
