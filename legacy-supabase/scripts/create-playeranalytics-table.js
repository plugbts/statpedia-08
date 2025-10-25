/**
 * Create playeranalytics table if it doesn't exist
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

async function createPlayerAnalyticsTable() {
  console.log("🔧 Creating playeranalytics table...");

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS playeranalytics (
      id SERIAL PRIMARY KEY,
      player_id VARCHAR(64) NOT NULL,
      player_name VARCHAR(128),
      prop_type VARCHAR(64) NOT NULL,
      line FLOAT NOT NULL,
      direction VARCHAR(8) NOT NULL,
      season INT DEFAULT 2025,
      
      -- Hit rates
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
      
      -- Streaks
      streak_current INT DEFAULT 0,
      streak_longest INT DEFAULT 0,
      streak_direction VARCHAR(16) DEFAULT 'none',
      
      -- Metadata
      last_computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      -- Unique constraint
      UNIQUE(player_id, prop_type, line, direction)
    );
    
    ALTER TABLE playeranalytics ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY IF NOT EXISTS "Allow all access to playeranalytics" ON playeranalytics FOR ALL USING (true);
    
    GRANT ALL ON playeranalytics TO anon;
    GRANT ALL ON playeranalytics TO authenticated;
    GRANT USAGE ON SEQUENCE playeranalytics_id_seq TO anon;
    GRANT USAGE ON SEQUENCE playeranalytics_id_seq TO authenticated;
  `;

  try {
    // Try to create the table using RPC
    const { error: rpcError } = await supabase.rpc("exec_sql", { sql: createTableSQL });

    if (rpcError) {
      console.log("⚠️ RPC method failed, trying alternative approach...");

      // Alternative: Try to insert a test record to see if table exists
      const { error: testError } = await supabase.from("playeranalytics").select("id").limit(1);

      if (testError) {
        if (testError.message.includes('relation "public.playeranalytics" does not exist')) {
          console.log("❌ Table does not exist and cannot be created via RPC");
          console.log("\n💡 MANUAL SOLUTION:");
          console.log("1. Go to: https://supabase.com/dashboard/project/oalssjwhzbukrswjriaj");
          console.log("2. Navigate to: SQL Editor");
          console.log("3. Run this SQL:");
          console.log(createTableSQL);
          console.log("4. Then run: node nightlyJob.js");
        } else {
          console.error("❌ Error checking table:", testError);
        }
      } else {
        console.log("✅ playeranalytics table already exists");
      }
    } else {
      console.log("✅ playeranalytics table created successfully via RPC");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

createPlayerAnalyticsTable().catch(console.error);
