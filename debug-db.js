// Simple Node.js script to test database connection
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://rfdrifnsfobqlzorcesn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugDatabase() {
  console.log("🔍 Checking database state...");
  
  try {
    // Check if PlayerGameLogs table exists and has data
    console.log("📊 Checking PlayerGameLogs table...");
    const { data: countData, error: countError } = await supabase
      .from('PlayerGameLogs')
      .select('*', { count: 'exact', head: true });
    
    console.log("PlayerGameLogs count:", countData, "Error:", countError);
    
    // Get sample data
    const { data: sampleData, error: sampleError } = await supabase
      .from('PlayerGameLogs')
      .select('*')
      .limit(5);
    
    console.log("Sample data:", sampleData, "Error:", sampleError);
    
    // Test RPC functions
    console.log("🔄 Testing RPC functions...");
    
    const { data: hitRateData, error: hitRateError } = await supabase
      .rpc('calculate_hit_rate', {
        p_player_id: 'mahomes-patrick',
        p_prop_type: 'Passing Yards',
        p_line: 275.0,
        p_direction: 'over',
        p_games_limit: 5
      });
    
    console.log("Hit rate result:", hitRateData, "Error:", hitRateError);
    
  } catch (error) {
    console.error("❌ Database test failed:", error);
  }
}

debugDatabase();
