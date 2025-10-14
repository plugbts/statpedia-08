#!/usr/bin/env tsx

/**
 * Test Analytics API
 * 
 * This script tests the player analytics API to ensure it works correctly
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

async function testAnalyticsAPI() {
  console.log('🧪 Testing Analytics API...\n');
  
  try {
    // Get a sample player
    const player = await db.execute(sql`
      SELECT id, name 
      FROM players 
      WHERE id IN (SELECT player_id FROM player_game_logs WHERE prop_type = 'Points') 
      LIMIT 1
    `);
    
    if (player.length === 0) {
      console.log('❌ No players found with Points data');
      return;
    }
    
    const playerId = player[0].id;
    const playerName = player[0].name;
    const propType = 'Points';
    const season = '2025';
    
    console.log(`📊 Testing analytics for ${playerName} (${playerId})`);
    console.log(`   Prop Type: ${propType}`);
    console.log(`   Season: ${season}\n`);
    
    // Test the analytics query
    const analytics = await db.execute(sql`
      WITH player_stats AS (
        SELECT 
          pgl.player_id,
          pgl.prop_type,
          pgl.season,
          COUNT(*) as total_games,
          AVG(pgl.actual_value) as career_avg,
          AVG(pgl.hit::int) as career_hit_rate,
          MAX(pgl.game_date) as last_game_date,
          MIN(pgl.game_date) as first_game_date
        FROM player_game_logs pgl
        WHERE pgl.player_id = ${playerId}
          AND pgl.prop_type = ${propType}
          AND pgl.season = ${season}
        GROUP BY pgl.player_id, pgl.prop_type, pgl.season
      ),
      recent_games AS (
        SELECT 
          pgl.player_id,
          pgl.prop_type,
          pgl.game_date,
          pgl.actual_value,
          pgl.line,
          pgl.hit,
          ROW_NUMBER() OVER (ORDER BY pgl.game_date DESC) as rn
        FROM player_game_logs pgl
        WHERE pgl.player_id = ${playerId}
          AND pgl.prop_type = ${propType}
          AND pgl.season = ${season}
        ORDER BY pgl.game_date DESC
      ),
      rolling_stats AS (
        SELECT 
          AVG(actual_value) as avg_l5,
          AVG(hit::int) as hit_rate_l5
        FROM recent_games
        WHERE rn <= 5
      ),
      streak_data AS (
        SELECT 
          hit,
          COUNT(*) as streak_length,
          ROW_NUMBER() OVER (ORDER BY game_date DESC) as rn
        FROM recent_games
        WHERE rn <= 10
        GROUP BY hit, game_date
        ORDER BY game_date DESC
        LIMIT 1
      )
      SELECT 
        ps.total_games,
        ps.career_avg,
        ps.career_hit_rate,
        ps.last_game_date,
        ps.first_game_date,
        COALESCE(rs.avg_l5, 0) as avg_l5,
        COALESCE(rs.hit_rate_l5, 0) as hit_rate_l5,
        COALESCE(sd.streak_length, 0) as current_streak,
        COALESCE(sd.hit, false) as current_streak_type
      FROM player_stats ps
      LEFT JOIN rolling_stats rs ON 1=1
      LEFT JOIN streak_data sd ON sd.rn = 1
    `);
    
    console.log('📈 Analytics Results:');
    console.table(analytics);
    
    // Test recent games
    const recentGames = await db.execute(sql`
      SELECT 
        pgl.game_date,
        pgl.actual_value,
        pgl.line,
        pgl.hit,
        g.home_team_id,
        g.away_team_id,
        ht.name as home_team,
        at.name as away_team,
        pgl.home_away
      FROM player_game_logs pgl
      JOIN games g ON pgl.game_id = g.id
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE pgl.player_id = ${playerId}
        AND pgl.prop_type = ${propType}
        AND pgl.season = ${season}
      ORDER BY pgl.game_date DESC
      LIMIT 5
    `);
    
    console.log('\n🎮 Recent Games:');
    console.table(recentGames);
    
    // Test bulk analytics
    const playerIds = [playerId];
    const bulkAnalytics = await db.execute(sql`
      WITH player_stats AS (
        SELECT 
          pgl.player_id,
          pgl.prop_type,
          pgl.season,
          COUNT(*) as total_games,
          AVG(pgl.actual_value) as career_avg,
          AVG(pgl.hit::int) as career_hit_rate
        FROM player_game_logs pgl
        WHERE pgl.player_id = ANY(${playerIds})
          AND pgl.prop_type = ${propType}
          AND pgl.season = ${season}
        GROUP BY pgl.player_id, pgl.prop_type, pgl.season
      )
      SELECT 
        ps.player_id,
        p.name as player_name,
        ps.total_games,
        ps.career_avg,
        ps.career_hit_rate
      FROM player_stats ps
      JOIN players p ON ps.player_id = p.id
      ORDER BY ps.career_avg DESC
    `);
    
    console.log('\n👥 Bulk Analytics:');
    console.table(bulkAnalytics);
    
    console.log('\n✅ Analytics API test completed successfully!');
    
  } catch (error: any) {
    console.error('❌ Analytics API test failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testAnalyticsAPI().catch(console.error);
}

export { testAnalyticsAPI };
