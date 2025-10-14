#!/usr/bin/env tsx

/**
 * Create Analytics API
 * 
 * This script creates a simple analytics API that can be used
 * by the frontend to display player prop analytics
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const connectionString = process.env.NEON_DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
  console.log('🚀 Creating Analytics API...\n');
  
  try {
    // Create a view for player analytics
    await createPlayerAnalyticsView();
    
    // Test the analytics
    await testAnalytics();
    
    console.log('\n✅ Analytics API created successfully!');
    
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Create a view for player analytics
 */
async function createPlayerAnalyticsView() {
  console.log('📊 Creating player analytics view...');
  
  await db.execute(sql`
    CREATE OR REPLACE VIEW player_analytics AS
    SELECT 
      pgl.player_id,
      pgl.game_id,
      pgl.prop_type,
      pgl.game_date,
      pgl.season,
      pgl.home_away,
      pgl.actual_value,
      pgl.line,
      pgl.hit,
      
      -- Basic stats
      COUNT(*) OVER (PARTITION BY pgl.player_id, pgl.prop_type) as total_games,
      AVG(pgl.actual_value) OVER (PARTITION BY pgl.player_id, pgl.prop_type) as career_avg,
      AVG(pgl.hit::int) OVER (PARTITION BY pgl.player_id, pgl.prop_type) as career_hit_rate,
      
      -- Recent performance (last 5 games if available)
      AVG(pgl.actual_value) OVER (
        PARTITION BY pgl.player_id, pgl.prop_type 
        ORDER BY pgl.game_date 
        ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
      ) as avg_l5,
      
      AVG(pgl.hit::int) OVER (
        PARTITION BY pgl.player_id, pgl.prop_type 
        ORDER BY pgl.game_date 
        ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
      ) as hit_rate_l5,
      
      -- Row number for filtering
      ROW_NUMBER() OVER (
        PARTITION BY pgl.player_id, pgl.prop_type 
        ORDER BY pgl.game_date
      ) as game_number
      
    FROM player_game_logs pgl
    ORDER BY pgl.player_id, pgl.prop_type, pgl.game_date
  `);
  
  console.log('✅ Player analytics view created');
}

/**
 * Test the analytics
 */
async function testAnalytics() {
  console.log('🧪 Testing analytics...');
  
  // Get sample analytics data
  const sample = await db.execute(sql`
    SELECT 
      pa.player_id,
      p.name as player_name,
      pa.prop_type,
      pa.game_date,
      pa.actual_value,
      pa.line,
      pa.hit,
      pa.career_avg,
      pa.career_hit_rate,
      pa.avg_l5,
      pa.hit_rate_l5,
      pa.game_number
    FROM player_analytics pa
    JOIN players p ON pa.player_id = p.id
    WHERE pa.prop_type = 'Points'
      AND pa.game_number >= 5  -- Only players with enough history
    ORDER BY pa.game_date DESC
    LIMIT 10
  `);
  
  console.log('\n📊 Sample analytics data:');
  console.table(sample);
  
  // Get top performers
  const topPerformers = await db.execute(sql`
    SELECT 
      p.name as player_name,
      pa.prop_type,
      pa.career_avg,
      pa.career_hit_rate,
      pa.total_games
    FROM player_analytics pa
    JOIN players p ON pa.player_id = p.id
    WHERE pa.game_number = 1  -- Latest game for each player
      AND pa.prop_type = 'Points'
      AND pa.total_games >= 3
    ORDER BY pa.career_avg DESC
    LIMIT 10
  `);
  
  console.log('\n🏆 Top performers by average:');
  console.table(topPerformers);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as createAnalyticsAPI };
