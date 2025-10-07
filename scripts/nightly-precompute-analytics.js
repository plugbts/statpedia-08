/**
 * Nightly precompute job for PlayerAnalytics
 * - Reads PlayerGameLogs
 * - Uses calculate_hit_rate & calculate_streak database functions
 * - Upserts into PlayerAnalytics
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_ANON_KEY
);

async function precomputeAnalytics(season = 2025) {
  console.log(`🚀 Starting nightly analytics precompute for season ${season}`);
  
  try {
    // 1. Fetch distinct players + props
    console.log('📊 Fetching distinct players and prop types...');
    const { data: players, error: playersError } = await supabase
      .from('playergamelogs')
      .select('player_id, player_name, prop_type')
      .eq('season', season)
      .neq('value', null)
      .neq('value', 0)
      .order('player_id');

    if (playersError) {
      console.error('❌ Error fetching players:', playersError);
      return;
    }

    if (!players || players.length === 0) {
      console.log('⚠️ No players found for the specified season');
      return;
    }

    console.log(`✅ Found ${players.length} player-prop combinations to process`);

    // Get unique combinations
    const uniqueCombinations = players.reduce((acc, player) => {
      const key = `${player.player_id}-${player.prop_type}`;
      if (!acc.has(key)) {
        acc.set(key, player);
      }
      return acc;
    }, new Map());

    const results = [];
    const batchSize = 50; // Process in batches for performance
    const combinations = Array.from(uniqueCombinations.values());

    for (let i = 0; i < combinations.length; i += batchSize) {
      const batch = combinations.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(combinations.length/batchSize)}`);

      const batchPromises = batch.map(async ({ player_id, player_name, prop_type }) => {
        try {
          // 2. Get current lines for this player-prop combination
          const { data: currentLines, error: linesError } = await supabase
            .from('player_props')
            .select('line, sport')
            .eq('player_name', player_name)
            .eq('prop_type', prop_type)
            .limit(1);

          if (linesError) {
            console.error(`❌ Error fetching lines for ${player_name} - ${prop_type}:`, linesError);
            return null;
          }

          if (!currentLines || currentLines.length === 0) {
            console.log(`⚠️ No current lines found for ${player_name} - ${prop_type}`);
            return null;
          }

          const { line, sport } = currentLines[0];

          // 3. Calculate analytics for both over and under directions
          const directions = ['over', 'under'];
          const analyticsResults = [];

          for (const direction of directions) {
            try {
              // Calculate hit rates for different time periods
              const hitRatePromises = [
                supabase.rpc('calculate_hit_rate', {
                  p_player_id: player_id,
                  p_prop_type: prop_type,
                  p_line: line,
                  p_direction: direction,
                  p_games_limit: null // Season total
                }),
                supabase.rpc('calculate_hit_rate', {
                  p_player_id: player_id,
                  p_prop_type: prop_type,
                  p_line: line,
                  p_direction: direction,
                  p_games_limit: 20 // Last 20 games
                }),
                supabase.rpc('calculate_hit_rate', {
                  p_player_id: player_id,
                  p_prop_type: prop_type,
                  p_line: line,
                  p_direction: direction,
                  p_games_limit: 10 // Last 10 games
                }),
                supabase.rpc('calculate_hit_rate', {
                  p_player_id: player_id,
                  p_prop_type: prop_type,
                  p_line: line,
                  p_direction: direction,
                  p_games_limit: 5 // Last 5 games
                })
              ];

              const [seasonResult, l20Result, l10Result, l5Result] = await Promise.all(hitRatePromises);

              // Calculate streak
              const { data: streakData, error: streakError } = await supabase.rpc('calculate_streak', {
                p_player_id: player_id,
                p_prop_type: prop_type,
                p_line: line,
                p_direction: direction
              });

              if (streakError) {
                console.error(`❌ Error calculating streak for ${player_name} - ${prop_type} - ${direction}:`, streakError);
                continue;
              }

              // Get chart data
              const { data: chartData, error: chartError } = await supabase.rpc('get_player_chart_data', {
                p_player_id: player_id,
                p_prop_type: prop_type,
                p_limit: 20
              });

              if (chartError) {
                console.error(`❌ Error getting chart data for ${player_name} - ${prop_type}:`, chartError);
              }

              // Get defensive rank (placeholder for now)
              const { data: rankData, error: rankError } = await supabase.rpc('get_defensive_rank', {
                p_team: 'TBD', // This would need to be fetched from player data
                p_opponent: 'TBD',
                p_prop_type: prop_type,
                p_position: 'TBD',
                p_season: season
              });

              const analytics = {
                player_id,
                player_name,
                prop_type,
                line,
                direction,
                
                // Hit rates
                season_hits: seasonResult.data?.[0]?.hits || 0,
                season_total: seasonResult.data?.[0]?.total || 0,
                season_pct: seasonResult.data?.[0]?.hit_rate || 0.0,
                
                l20_hits: l20Result.data?.[0]?.hits || 0,
                l20_total: l20Result.data?.[0]?.total || 0,
                l20_pct: l20Result.data?.[0]?.hit_rate || 0.0,
                
                l10_hits: l10Result.data?.[0]?.hits || 0,
                l10_total: l10Result.data?.[0]?.total || 0,
                l10_pct: l10Result.data?.[0]?.hit_rate || 0.0,
                
                l5_hits: l5Result.data?.[0]?.hits || 0,
                l5_total: l5Result.data?.[0]?.total || 0,
                l5_pct: l5Result.data?.[0]?.hit_rate || 0.0,
                
                // Streak data
                streak_current: streakData?.[0]?.current_streak || 0,
                streak_longest: streakData?.[0]?.longest_streak || 0,
                streak_direction: streakData?.[0]?.streak_direction || 'mixed',
                
                // Additional data
                chart_data: chartData || [],
                matchup_rank_value: rankData?.[0]?.rank || 0,
                matchup_rank_display: rankData?.[0]?.display || 'N/A',
                
                // Metadata
                last_computed_at: new Date().toISOString(),
                season,
                sport: sport || 'nfl'
              };

              analyticsResults.push(analytics);

            } catch (error) {
              console.error(`❌ Error processing ${player_name} - ${prop_type} - ${direction}:`, error);
              continue;
            }
          }

          return analyticsResults;

        } catch (error) {
          console.error(`❌ Error processing ${player_name} - ${prop_type}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter(result => result !== null).flat();
      
      if (validResults.length > 0) {
        results.push(...validResults);
      }
    }

    console.log(`✅ Computed analytics for ${results.length} player-prop-direction combinations`);

    // 4. Upsert results into PlayerAnalytics
    if (results.length > 0) {
      console.log('💾 Upserting analytics data...');
      
      const upsertPromises = results.map(async (analytics) => {
        const { error } = await supabase
          .from('PlayerAnalytics')
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
      
      console.log(`✅ Successfully upserted ${successfulUpserts}/${results.length} analytics records`);
    }

    console.log('🎉 Nightly analytics precompute completed successfully!');

  } catch (error) {
    console.error('❌ Fatal error in nightly analytics precompute:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const season = process.argv[2] || 2025;
  
  try {
    await precomputeAnalytics(parseInt(season));
    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { precomputeAnalytics };
