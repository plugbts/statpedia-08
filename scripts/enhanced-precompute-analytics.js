/**
 * Enhanced Precompute Job: Joins PlayerGameLogs with PropLines
 * - For each player/prop/date, compare actual value vs sportsbook line
 * - Compute hit rates (L5/L10/L20) and streaks using real betting lines
 * - Upsert into PlayerAnalytics with comprehensive analytics
 */

import { createClient } from '@supabase/supabase-js';
import { 
  calculateHitRate, 
  calculateStreak, 
  calculateAverage, 
  calculateStandardDeviation,
  calculateConsistency,
  calculateEdge,
  calculateKellyCriterion,
  calculateTrend
} from './analyticsCalculators.js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Enhanced precompute analytics with real betting lines
 */
async function precomputeAnalytics(season = new Date().getFullYear()) {
  console.log(`🔄 Starting enhanced analytics precomputation for season ${season}...`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('=' .repeat(60));
  
  try {
    // 1. Fetch distinct player/prop combinations from PlayerGameLogs
    console.log('📊 Fetching distinct player/prop combinations...');
    const { data: combos, error: combosError } = await supabase
      .from('playergamelogs')
      .select('player_id, player_name, prop_type')
      .eq('season', season)
      .neq('value', null)
      .neq('value', 0)
      .order('player_id');

    if (combosError) {
      console.error('❌ Error fetching player/prop combinations:', combosError);
      return { success: false, recordsProcessed: 0 };
    }

    if (!combos || combos.length === 0) {
      console.log('⚠️ No player/prop combinations found for the specified season');
      return { success: false, recordsProcessed: 0 };
    }

    console.log(`✅ Found ${combos.length} player/prop combinations to process`);

    // Get unique combinations
    const uniqueCombinations = combos.reduce((acc, combo) => {
      const key = `${combo.player_id}-${combo.prop_type}`;
      if (!acc.has(key)) {
        acc.set(key, combo);
      }
      return acc;
    }, new Map());

    const results = [];
    const batchSize = 25; // Smaller batch size for complex joins
    const combinations = Array.from(uniqueCombinations.values());

    for (let i = 0; i < combinations.length; i += batchSize) {
      const batch = combinations.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(combinations.length/batchSize)}`);

      const batchPromises = batch.map(async ({ player_id, player_name, prop_type }) => {
        try {
          // 2. Join PlayerGameLogs with PropLines on (player_id, date, prop_type)
          console.log(`  📊 Processing ${player_name} - ${prop_type}...`);
          
          const { data: joined, error: joinError } = await supabase
            .from('playergamelogs')
            .select(`
              date,
              value,
              season,
              team,
              opponent,
              proplines!inner(
                line,
                over_odds,
                under_odds,
                sportsbook
              )
            `)
            .eq('player_id', player_id)
            .eq('prop_type', prop_type)
            .eq('season', season)
            .order('date', { ascending: false });

          if (joinError) {
            console.error(`  ❌ Join error for ${player_name} ${prop_type}:`, joinError);
            return null;
          }

          if (!joined || joined.length === 0) {
            console.log(`  ⚠️ No joined data found for ${player_name} - ${prop_type}`);
            return null;
          }

          console.log(`  ✅ Found ${joined.length} games with prop lines for ${player_name} - ${prop_type}`);

          // 3. Process joined data and calculate analytics
          const processedData = joined.map(game => ({
            date: game.date,
            value: game.value,
            line: game.proplines.line,
            over_odds: game.proplines.over_odds,
            under_odds: game.proplines.under_odds,
            sportsbook: game.proplines.sportsbook
          }));

          // Calculate analytics for both over and under directions
          const directions = ['over', 'under'];
          const analyticsResults = [];

          for (const direction of directions) {
            try {
              // Calculate hit rates for different time periods
              const hitRateL5 = calculateHitRate(processedData, direction, 5);
              const hitRateL10 = calculateHitRate(processedData, direction, 10);
              const hitRateL20 = calculateHitRate(processedData, direction, 20);
              const hitRateSeason = calculateHitRate(processedData, direction);

              // Calculate streaks
              const streak = calculateStreak(processedData, direction);

              // Calculate averages
              const avgL5 = calculateAverage(processedData, 5);
              const avgL10 = calculateAverage(processedData, 10);
              const avgSeason = calculateAverage(processedData);

              // Calculate consistency
              const consistencyL10 = calculateConsistency(processedData, 10);
              const consistencySeason = calculateConsistency(processedData);

              // Calculate trend analysis
              const trend = calculateTrend(processedData, direction, 5);

              // Get most common line for this direction
              const mostRecentLine = processedData[0]?.line;
              const avgLine = calculateAverage(processedData.map(d => ({ value: d.line })));

              // Calculate edge if we have odds data
              const mostRecentOverOdds = processedData[0]?.over_odds;
              const mostRecentUnderOdds = processedData[0]?.under_odds;
              
              let edge = 0;
              let kelly = 0;
              
              if (direction === 'over' && mostRecentOverOdds) {
                edge = calculateEdge(hitRateSeason.hitRate, mostRecentOverOdds);
                kelly = calculateKellyCriterion(hitRateSeason.hitRate, mostRecentOverOdds);
              } else if (direction === 'under' && mostRecentUnderOdds) {
                edge = calculateEdge(hitRateSeason.hitRate, mostRecentUnderOdds);
                kelly = calculateKellyCriterion(hitRateSeason.hitRate, mostRecentUnderOdds);
              }

              const analytics = {
                player_id,
                player_name,
                prop_type,
                line: mostRecentLine || avgLine,
                direction,
                
                // Hit rates with real lines
                season_hits: hitRateSeason.hits,
                season_total: hitRateSeason.total,
                season_pct: hitRateSeason.hitRate,
                
                l20_hits: hitRateL20.hits,
                l20_total: hitRateL20.total,
                l20_pct: hitRateL20.hitRate,
                
                l10_hits: hitRateL10.hits,
                l10_total: hitRateL10.total,
                l10_pct: hitRateL10.hitRate,
                
                l5_hits: hitRateL5.hits,
                l5_total: hitRateL5.total,
                l5_pct: hitRateL5.hitRate,
                
                // Streak data
                streak_current: streak.currentStreak,
                streak_longest: streak.longestStreak,
                streak_direction: streak.streakDirection,
                
                // Additional analytics
                avg_value_l5: avgL5,
                avg_value_l10: avgL10,
                avg_value_season: avgSeason,
                consistency_l10: consistencyL10,
                consistency_season: consistencySeason,
                trend: trend.trend,
                trend_strength: trend.trendStrength,
                trend_difference: trend.trendDifference,
                
                // Betting analytics
                edge: edge,
                kelly_criterion: kelly,
                most_recent_over_odds: mostRecentOverOdds,
                most_recent_under_odds: mostRecentUnderOdds,
                
                // Chart data (last 20 games)
                chart_data: processedData.slice(0, 20).map(game => ({
                  date: game.date,
                  value: game.value,
                  line: game.line,
                  hit: direction === 'over' ? game.value > game.line : game.value < game.line
                })),
                
                // Metadata
                last_computed_at: new Date().toISOString(),
                season,
                sport: 'nfl', // Default, could be enhanced to detect from data
                games_with_lines: processedData.length
              };

              analyticsResults.push(analytics);

            } catch (error) {
              console.error(`  ❌ Error calculating analytics for ${player_name} - ${prop_type} - ${direction}:`, error);
              continue;
            }
          }

          console.log(`  ✅ Calculated analytics for ${analyticsResults.length} directions for ${player_name} - ${prop_type}`);
          return analyticsResults;

        } catch (error) {
          console.error(`  ❌ Error processing ${player_name} - ${prop_type}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter(result => result !== null).flat();
      
      if (validResults.length > 0) {
        results.push(...validResults);
      }
    }

    console.log(`✅ Computed enhanced analytics for ${results.length} player-prop-direction combinations`);

    // 4. Upsert results into PlayerAnalytics
    if (results.length > 0) {
      console.log('💾 Upserting enhanced analytics data...');
      
      const upsertPromises = results.map(async (analytics) => {
        const { error } = await supabase
          .from('playeralytics')
          .upsert(analytics, {
            onConflict: 'player_id,prop_type,line,direction'
          });

        if (error) {
          console.error(`❌ Error upserting analytics for ${analytics.player_name} - ${analytics.prop_type} - ${analytics.direction}:`, error);
          return false;
        }
        return true;
      });

      const upsertResults = await Promise.all(upsertPromises);
      const successfulUpserts = upsertResults.filter(Boolean).length;
      
      console.log(`✅ Successfully upserted ${successfulUpserts}/${results.length} enhanced analytics records`);
      return { success: true, recordsProcessed: successfulUpserts };
    }

    return { success: true, recordsProcessed: 0 };

  } catch (error) {
    console.error('❌ Fatal error in enhanced analytics precomputation:', error);
    return { success: false, recordsProcessed: 0 };
  }
}

/**
 * Get analytics summary for a specific player/prop combination
 */
async function getPlayerPropAnalytics(playerId, propType, season = new Date().getFullYear()) {
  try {
    const { data, error } = await supabase
      .from('playeralytics')
      .select('*')
      .eq('player_id', playerId)
      .eq('prop_type', propType)
      .eq('season', season)
      .order('direction');

    if (error) {
      console.error('Error fetching player analytics:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getPlayerPropAnalytics:', error);
    return null;
  }
}

/**
 * Get top performers by hit rate
 */
async function getTopPerformers(propType, direction = 'over', season = new Date().getFullYear(), limit = 10) {
  try {
    const { data, error } = await supabase
      .from('playeralytics')
      .select('*')
      .eq('prop_type', propType)
      .eq('direction', direction)
      .eq('season', season)
      .gte('season_total', 5) // Minimum 5 games
      .order('season_pct', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching top performers:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getTopPerformers:', error);
    return null;
  }
}

/**
 * Main execution function
 */
async function main() {
  const season = process.argv[2] || new Date().getFullYear();
  
  try {
    const results = await precomputeAnalytics(parseInt(season));
    
    if (results.success) {
      console.log(`🎉 Enhanced analytics precomputation completed successfully!`);
      console.log(`📊 Processed ${results.recordsProcessed} records`);
    } else {
      console.error('❌ Enhanced analytics precomputation failed');
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Enhanced precompute script failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { precomputeAnalytics, getPlayerPropAnalytics, getTopPerformers };
