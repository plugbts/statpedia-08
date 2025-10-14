#!/usr/bin/env tsx

/**
 * Simple Analytics Enrichment
 * 
 * This script computes basic analytics for player props:
 * - Rolling averages (L5, L10, L20)
 * - Hit rates
 * - Basic streaks
 * 
 * Works with current data structure
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
  console.log('🚀 Starting Simple Analytics Enrichment...\n');
  
  try {
    // Step 1: Compute rolling averages and hit rates
    await computeRollingAverages();
    
    // Step 2: Compute basic streaks
    await computeBasicStreaks();
    
    console.log('\n✅ Simple Analytics Enrichment Complete!');
    
  } catch (error: any) {
    console.error('❌ Enrichment failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Compute rolling averages and hit rates
 */
async function computeRollingAverages() {
  console.log('📈 Computing rolling averages and hit rates...');
  
  // Clear existing enriched stats
  await db.execute(sql`DELETE FROM player_enriched_stats`);
  
  // Compute rolling averages for each player and prop type
  const result = await db.execute(sql`
    INSERT INTO player_enriched_stats (
      player_id, game_id, prop_type, game_date, season, home_away,
      avg_l5, avg_l10, avg_l20,
      hit_rate_l5, hit_rate_l10, hit_rate_l20, hit_rate_overall,
      actual_value, line, hit
    )
    WITH rolling_stats AS (
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
        
        -- Rolling averages
        AVG(pgl.actual_value) OVER (
          PARTITION BY pgl.player_id, pgl.prop_type 
          ORDER BY pgl.game_date 
          ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
        ) as avg_l5,
        
        AVG(pgl.actual_value) OVER (
          PARTITION BY pgl.player_id, pgl.prop_type 
          ORDER BY pgl.game_date 
          ROWS BETWEEN 9 PRECEDING AND CURRENT ROW
        ) as avg_l10,
        
        AVG(pgl.actual_value) OVER (
          PARTITION BY pgl.player_id, pgl.prop_type 
          ORDER BY pgl.game_date 
          ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
        ) as avg_l20,
        
        -- Rolling hit rates
        AVG(pgl.hit::int) OVER (
          PARTITION BY pgl.player_id, pgl.prop_type 
          ORDER BY pgl.game_date 
          ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
        ) as hit_rate_l5,
        
        AVG(pgl.hit::int) OVER (
          PARTITION BY pgl.player_id, pgl.prop_type 
          ORDER BY pgl.game_date 
          ROWS BETWEEN 9 PRECEDING AND CURRENT ROW
        ) as hit_rate_l10,
        
        AVG(pgl.hit::int) OVER (
          PARTITION BY pgl.player_id, pgl.prop_type 
          ORDER BY pgl.game_date 
          ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
        ) as hit_rate_l20,
        
        -- Overall hit rate
        AVG(pgl.hit::int) OVER (
          PARTITION BY pgl.player_id, pgl.prop_type
        ) as hit_rate_overall,
        
        -- Row number for filtering
        ROW_NUMBER() OVER (
          PARTITION BY pgl.player_id, pgl.prop_type 
          ORDER BY pgl.game_date
        ) as row_num
        
      FROM player_game_logs pgl
      ORDER BY pgl.player_id, pgl.prop_type, pgl.game_date
    )
    SELECT 
      player_id, game_id, prop_type, game_date, season, home_away,
      avg_l5, avg_l10, avg_l20,
      hit_rate_l5, hit_rate_l10, hit_rate_l20, hit_rate_overall,
      actual_value, line, hit
    FROM rolling_stats
    WHERE row_num >= 5  -- Only include records with enough history for L5
  `);
  
  console.log(`✅ Rolling averages computed for ${result.rowCount} records`);
}

/**
 * Compute basic streaks
 */
async function computeBasicStreaks() {
  console.log('🔥 Computing basic streaks...');
  
  // Clear existing streaks
  await db.execute(sql`DELETE FROM player_streaks`);
  
  // Compute streaks for each player and prop type
  const result = await db.execute(sql`
    INSERT INTO player_streaks (
      player_id, prop_type, condition_type, condition_value, season,
      current_streak, max_streak, games_count
    )
    WITH streak_data AS (
      SELECT 
        pgl.player_id,
        pgl.prop_type,
        pgl.season,
        pgl.game_date,
        pgl.hit,
        pgl.actual_value,
        pgl.line,
        
        -- Identify streak changes
        CASE 
          WHEN LAG(pgl.hit) OVER (PARTITION BY pgl.player_id, pgl.prop_type ORDER BY pgl.game_date) IS NULL THEN 1
          WHEN LAG(pgl.hit) OVER (PARTITION BY pgl.player_id, pgl.prop_type ORDER BY pgl.game_date) != pgl.hit THEN 1
          ELSE 0
        END as streak_start,
        
        -- Assign streak groups
        SUM(CASE 
          WHEN LAG(pgl.hit) OVER (PARTITION BY pgl.player_id, pgl.prop_type ORDER BY pgl.game_date) IS NULL THEN 1
          WHEN LAG(pgl.hit) OVER (PARTITION BY pgl.player_id, pgl.prop_type ORDER BY pgl.game_date) != pgl.hit THEN 1
          ELSE 0
        END) OVER (PARTITION BY pgl.player_id, pgl.prop_type ORDER BY pgl.game_date) as streak_group
        
      FROM player_game_logs pgl
      ORDER BY pgl.player_id, pgl.prop_type, pgl.game_date
    ),
    streak_lengths AS (
      SELECT 
        player_id,
        prop_type,
        season,
        hit,
        streak_group,
        COUNT(*) as streak_length,
        AVG(line) as avg_line
      FROM streak_data
      GROUP BY player_id, prop_type, season, hit, streak_group
    ),
    player_streak_summary AS (
      SELECT 
        player_id,
        prop_type,
        season,
        hit,
        MAX(streak_length) as max_streak,
        AVG(avg_line) as avg_line,
        COUNT(*) as streak_count
      FROM streak_lengths
      GROUP BY player_id, prop_type, season, hit
    )
    SELECT 
      player_id,
      prop_type,
      CASE WHEN hit THEN 'over' ELSE 'under' END as condition_type,
      avg_line as condition_value,
      season,
      max_streak as current_streak,
      max_streak as max_streak,
      streak_count as games_count
    FROM player_streak_summary
    WHERE max_streak > 0
  `);
  
  console.log(`✅ Basic streaks computed for ${result.rowCount} records`);
  
  // Show sample results
  const sample = await db.execute(sql`
    SELECT 
      ps.player_id,
      p.name as player_name,
      ps.prop_type,
      ps.condition_type,
      ps.current_streak,
      ps.max_streak,
      ps.season
    FROM player_streaks ps
    JOIN players p ON ps.player_id = p.id
    ORDER BY ps.max_streak DESC
    LIMIT 10
  `);
  
  console.log('\n📊 Sample streaks:');
  console.table(sample);
}

// Run the enrichment
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as runSimpleAnalyticsEnrichment };
