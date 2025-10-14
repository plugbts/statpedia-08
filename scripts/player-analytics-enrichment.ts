#!/usr/bin/env tsx

/**
 * Player Analytics Enrichment Job
 * 
 * This script computes and caches player analytics including:
 * - Rolling averages (L5, L10, L20)
 * - Streaks (current and max)
 * - Matchup rankings
 * - Hit rates
 * 
 * Run this nightly or after new game data ingestion
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
  console.log('🚀 Starting Player Analytics Enrichment...\n');
  
  try {
    // Step 1: Compute team defensive stats
    await computeTeamDefensiveStats();
    
    // Step 2: Compute rolling averages and hit rates
    await computeRollingAverages();
    
    // Step 3: Compute streaks
    await computeStreaks();
    
    // Step 4: Compute matchup grades
    await computeMatchupGrades();
    
    console.log('\n✅ Player Analytics Enrichment Complete!');
    
  } catch (error: any) {
    console.error('❌ Enrichment failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Compute team defensive stats for matchup rankings
 */
async function computeTeamDefensiveStats() {
  console.log('📊 Computing team defensive stats...');
  
  // Get all unique prop types
  const propTypes = await db.execute(sql`
    SELECT DISTINCT prop_type 
    FROM player_game_logs 
    WHERE prop_type IS NOT NULL
  `);
  
  for (const row of propTypes) {
    const propType = row.prop_type;
    console.log(`  Processing ${propType}...`);
    
    // Compute defensive stats for each team
    await db.execute(sql`
      INSERT INTO team_defensive_stats (
        team_id, league_id, prop_type, season,
        avg_allowed, rank, rank_percentile, games_tracked,
        avg_allowed_home, avg_allowed_away
      )
      WITH team_stats AS (
        SELECT 
          pgl.opponent_id as team_id,
          t.league_id,
          pgl.prop_type,
          pgl.season,
          AVG(pgl.actual_value) as avg_allowed,
          COUNT(*) as games_tracked,
          AVG(CASE WHEN pgl.home_away = 'home' THEN pgl.actual_value END) as avg_allowed_home,
          AVG(CASE WHEN pgl.home_away = 'away' THEN pgl.actual_value END) as avg_allowed_away
        FROM player_game_logs pgl
        JOIN teams t ON pgl.opponent_id = t.id
        WHERE pgl.prop_type = ${propType}
        GROUP BY pgl.opponent_id, t.league_id, pgl.prop_type, pgl.season
      ),
      ranked_teams AS (
        SELECT *,
          ROW_NUMBER() OVER (PARTITION BY league_id, prop_type, season ORDER BY avg_allowed ASC) as rank,
          PERCENT_RANK() OVER (PARTITION BY league_id, prop_type, season ORDER BY avg_allowed ASC) * 100 as rank_percentile
        FROM team_stats
      )
      SELECT 
        team_id, league_id, prop_type, season,
        avg_allowed, rank, rank_percentile, games_tracked,
        avg_allowed_home, avg_allowed_away
      FROM ranked_teams
      ON CONFLICT (team_id, prop_type, season) 
      DO UPDATE SET
        avg_allowed = EXCLUDED.avg_allowed,
        rank = EXCLUDED.rank,
        rank_percentile = EXCLUDED.rank_percentile,
        games_tracked = EXCLUDED.games_tracked,
        avg_allowed_home = EXCLUDED.avg_allowed_home,
        avg_allowed_away = EXCLUDED.avg_allowed_away,
        updated_at = NOW()
    `);
  }
  
  console.log('✅ Team defensive stats computed');
}

/**
 * Compute rolling averages and hit rates
 */
async function computeRollingAverages() {
  console.log('📈 Computing rolling averages and hit rates...');
  
  // Clear existing enriched stats
  await db.execute(sql`DELETE FROM player_enriched_stats`);
  
  // Compute rolling averages for each player and prop type
  await db.execute(sql`
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
  
  console.log('✅ Rolling averages computed');
}

/**
 * Compute streaks
 */
async function computeStreaks() {
  console.log('🔥 Computing streaks...');
  
  // Clear existing streaks
  await db.execute(sql`DELETE FROM player_streaks`);
  
  // Compute streaks for each player and prop type
  await db.execute(sql`
    INSERT INTO player_streaks (
      player_id, prop_type, condition_type, condition_value, season,
      current_streak, max_streak, streak_start_date, games_count
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
        MIN(game_date) as streak_start_date,
        MAX(game_date) as streak_end_date
      FROM streak_data
      GROUP BY player_id, prop_type, season, hit, streak_group
    ),
    current_streaks AS (
      SELECT 
        player_id,
        prop_type,
        season,
        hit,
        streak_length,
        streak_start_date,
        ROW_NUMBER() OVER (PARTITION BY player_id, prop_type, season ORDER BY streak_end_date DESC) as rn
      FROM streak_lengths
    )
    SELECT 
      player_id,
      prop_type,
      CASE WHEN hit THEN 'over' ELSE 'under' END as condition_type,
      AVG(actual_value) as condition_value, -- Average line for this streak
      season,
      CASE WHEN rn = 1 THEN streak_length ELSE 0 END as current_streak,
      MAX(streak_length) as max_streak,
      CASE WHEN rn = 1 THEN streak_start_date ELSE NULL END as streak_start_date,
      COUNT(*) as games_count
    FROM current_streaks cs
    JOIN player_game_logs pgl ON cs.player_id = pgl.player_id 
      AND cs.prop_type = pgl.prop_type 
      AND cs.season = pgl.season
    GROUP BY player_id, prop_type, season, hit, streak_length, streak_start_date, rn
    HAVING COUNT(*) > 0
  `);
  
  // Update current streaks in enriched stats
  await db.execute(sql`
    UPDATE player_enriched_stats 
    SET current_streak = (
      SELECT 
        CASE 
          WHEN hit THEN current_streak 
          ELSE -current_streak 
        END
      FROM player_streaks ps
      WHERE ps.player_id = player_enriched_stats.player_id
        AND ps.prop_type = player_enriched_stats.prop_type
        AND ps.season = player_enriched_stats.season
      ORDER BY ps.games_count DESC
      LIMIT 1
    )
    WHERE EXISTS (
      SELECT 1 FROM player_streaks ps
      WHERE ps.player_id = player_enriched_stats.player_id
        AND ps.prop_type = player_enriched_stats.prop_type
        AND ps.season = player_enriched_stats.season
    )
  `);
  
  console.log('✅ Streaks computed');
}

/**
 * Compute matchup grades
 */
async function computeMatchupGrades() {
  console.log('🎯 Computing matchup grades...');
  
  // Update matchup grades in enriched stats
  await db.execute(sql`
    UPDATE player_enriched_stats 
    SET 
      opponent_rank = tds.rank,
      matchup_grade = (
        CASE 
          WHEN tds.rank_percentile <= 25 THEN 1.0  -- Top 25% = A grade
          WHEN tds.rank_percentile <= 50 THEN 0.75 -- 25-50% = B grade  
          WHEN tds.rank_percentile <= 75 THEN 0.5  -- 50-75% = C grade
          ELSE 0.25  -- Bottom 25% = D grade
        END
      )
    FROM team_defensive_stats tds
    JOIN player_game_logs pgl ON pgl.game_id = player_enriched_stats.game_id
      AND pgl.player_id = player_enriched_stats.player_id
      AND pgl.prop_type = player_enriched_stats.prop_type
    WHERE tds.team_id = pgl.opponent_id
      AND tds.prop_type = player_enriched_stats.prop_type
      AND tds.season = player_enriched_stats.season
  `);
  
  console.log('✅ Matchup grades computed');
}

// Run the enrichment job
if (require.main === module) {
  main().catch(console.error);
}

export { main as runPlayerAnalyticsEnrichment };
