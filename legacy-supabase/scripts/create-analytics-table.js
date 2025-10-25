/**
 * Script to create the player_analytics table
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY,
);

async function createAnalyticsTable() {
  console.log("🔧 Creating player_analytics table...");

  try {
    // First, try to create the table by attempting an insert that will fail
    // This will help us understand what columns might already exist
    console.log("📋 Checking if table exists...");

    const { data, error } = await supabase.from("player_analytics").select("id").limit(1);

    if (error && error.message.includes('relation "player_analytics" does not exist')) {
      console.log("❌ Table does not exist. Please create it manually in Supabase dashboard.");
      console.log("💡 SQL to run in Supabase SQL Editor:");
      console.log(`
CREATE TABLE player_analytics (
  id SERIAL PRIMARY KEY,
  player_id VARCHAR(64) NOT NULL,
  player_name VARCHAR(128),
  prop_type VARCHAR(64) NOT NULL,
  line FLOAT NOT NULL,
  direction VARCHAR(8) NOT NULL,
  season INT NOT NULL,
  season_hits INT DEFAULT 0,
  season_total INT DEFAULT 0,
  season_pct FLOAT DEFAULT 0.0,
  l20_hits INT DEFAULT 0,
  l20_total INT DEFAULT 0,
  l20_pct FLOAT DEFAULT 0.0,
  l10_hits INT DEFAULT 0,
  l10_total INT DEFAULT 0,
  l10_pct FLOAT DEFAULT 0.0,
  l5_hits INT DEFAULT 0,
  l5_total INT DEFAULT 0,
  l5_pct FLOAT DEFAULT 0.0,
  streak_current INT DEFAULT 0,
  streak_longest INT DEFAULT 0,
  streak_direction VARCHAR(16) DEFAULT 'none',
  last_computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, prop_type, line, direction, season)
);

-- Enable RLS
ALTER TABLE player_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for anonymous access
CREATE POLICY "Allow all access to player_analytics" ON player_analytics
FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON player_analytics TO anon;
GRANT ALL ON player_analytics TO authenticated;
GRANT USAGE ON SEQUENCE player_analytics_id_seq TO anon;
GRANT USAGE ON SEQUENCE player_analytics_id_seq TO authenticated;
      `);
    } else if (error) {
      console.log("❌ Error checking table:", error.message);
    } else {
      console.log("✅ Table exists and is accessible");
      console.log(`📊 Found ${data?.length || 0} existing records`);
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

// Run the script
createAnalyticsTable()
  .then(() => {
    console.log("✅ Table check complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
