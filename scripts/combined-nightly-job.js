/**
 * Combined Nightly Job:
 * 1. Incremental ingestion (last 24h of events)
 * 2. Precompute analytics into PlayerAnalytics
 * 
 * This script orchestrates the complete nightly data pipeline
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { ingestPropLines } from './proplines-ingestion.js';
import { precomputeAnalytics as enhancedPrecomputeAnalytics } from './enhanced-precompute-analytics.js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;
const LEAGUES = ["nfl", "nba", "mlb", "nhl"];

// Import normalization functions from existing ingestion scripts
const TEAM_MAPS = {
  NFL: { 
    "Arizona Cardinals": "ARI", "Atlanta Falcons": "ATL", "Baltimore Ravens": "BAL", 
    "Buffalo Bills": "BUF", "Carolina Panthers": "CAR", "Chicago Bears": "CHI", 
    "Cincinnati Bengals": "CIN", "Cleveland Browns": "CLE", "Dallas Cowboys": "DAL", 
    "Denver Broncos": "DEN", "Detroit Lions": "DET", "Green Bay Packers": "GB", 
    "Houston Texans": "HOU", "Indianapolis Colts": "IND", "Jacksonville Jaguars": "JAX", 
    "Kansas City Chiefs": "KC", "Las Vegas Raiders": "LV", "Los Angeles Chargers": "LAC", 
    "Los Angeles Rams": "LAR", "Miami Dolphins": "MIA", "Minnesota Vikings": "MIN", 
    "New England Patriots": "NE", "New Orleans Saints": "NO", "New York Giants": "NYG", 
    "New York Jets": "NYJ", "Philadelphia Eagles": "PHI", "Pittsburgh Steelers": "PIT", 
    "San Francisco 49ers": "SF", "Seattle Seahawks": "SEA", "Tampa Bay Buccaneers": "TB", 
    "Tennessee Titans": "TEN", "Washington Commanders": "WAS" 
  },
  NBA: { 
    "Atlanta Hawks": "ATL", "Boston Celtics": "BOS", "Brooklyn Nets": "BKN", 
    "Charlotte Hornets": "CHA", "Chicago Bulls": "CHI", "Cleveland Cavaliers": "CLE", 
    "Dallas Mavericks": "DAL", "Denver Nuggets": "DEN", "Detroit Pistons": "DET", 
    "Golden State Warriors": "GSW", "Houston Rockets": "HOU", "Indiana Pacers": "IND", 
    "Los Angeles Clippers": "LAC", "Los Angeles Lakers": "LAL", "Memphis Grizzlies": "MEM", 
    "Miami Heat": "MIA", "Milwaukee Bucks": "MIL", "Minnesota Timberwolves": "MIN", 
    "New Orleans Pelicans": "NOP", "New York Knicks": "NYK", "Oklahoma City Thunder": "OKC", 
    "Orlando Magic": "ORL", "Philadelphia 76ers": "PHI", "Phoenix Suns": "PHX", 
    "Portland Trail Blazers": "POR", "Sacramento Kings": "SAC", "San Antonio Spurs": "SAS", 
    "Toronto Raptors": "TOR", "Utah Jazz": "UTA", "Washington Wizards": "WAS" 
  },
  MLB: { 
    "Arizona Diamondbacks": "ARI", "Atlanta Braves": "ATL", "Baltimore Orioles": "BAL", 
    "Boston Red Sox": "BOS", "Chicago Cubs": "CHC", "Chicago White Sox": "CWS", 
    "Cincinnati Reds": "CIN", "Cleveland Guardians": "CLE", "Colorado Rockies": "COL", 
    "Detroit Tigers": "DET", "Houston Astros": "HOU", "Kansas City Royals": "KC", 
    "Los Angeles Angels": "LAA", "Los Angeles Dodgers": "LAD", "Miami Marlins": "MIA", 
    "Milwaukee Brewers": "MIL", "Minnesota Twins": "MIN", "New York Mets": "NYM", 
    "New York Yankees": "NYY", "Oakland Athletics": "OAK", "Philadelphia Phillies": "PHI", 
    "Pittsburgh Pirates": "PIT", "San Diego Padres": "SD", "San Francisco Giants": "SF", 
    "Seattle Mariners": "SEA", "St. Louis Cardinals": "STL", "Tampa Bay Rays": "TB", 
    "Texas Rangers": "TEX", "Toronto Blue Jays": "TOR", "Washington Nationals": "WSH" 
  },
  NHL: { 
    "Anaheim Ducks": "ANA", "Arizona Coyotes": "ARI", "Boston Bruins": "BOS", 
    "Buffalo Sabres": "BUF", "Calgary Flames": "CGY", "Carolina Hurricanes": "CAR", 
    "Chicago Blackhawks": "CHI", "Colorado Avalanche": "COL", "Columbus Blue Jackets": "CBJ", 
    "Dallas Stars": "DAL", "Detroit Red Wings": "DET", "Edmonton Oilers": "EDM", 
    "Florida Panthers": "FLA", "Los Angeles Kings": "LAK", "Minnesota Wild": "MIN", 
    "Montreal Canadiens": "MTL", "Nashville Predators": "NSH", "New Jersey Devils": "NJD", 
    "New York Islanders": "NYI", "New York Rangers": "NYR", "Ottawa Senators": "OTT", 
    "Philadelphia Flyers": "PHI", "Pittsburgh Penguins": "PIT", "San Jose Sharks": "SJ", 
    "Seattle Kraken": "SEA", "St. Louis Blues": "STL", "Tampa Bay Lightning": "TB", 
    "Toronto Maple Leafs": "TOR", "Vancouver Canucks": "VAN", "Vegas Golden Knights": "VGK", 
    "Washington Capitals": "WSH", "Winnipeg Jets": "WPG" 
  }
};

const MARKET_TYPE_MAP = {
  // NFL
  'Passing Yards': 'Passing Yards',
  'Rushing Yards': 'Rushing Yards',
  'Receiving Yards': 'Receiving Yards',
  'Passing TDs': 'Passing TDs',
  'Rushing TDs': 'Rushing TDs',
  'Receiving TDs': 'Receiving TDs',
  'Receptions': 'Receptions',
  'Interceptions': 'Interceptions',
  
  // NBA
  'Points': 'Points',
  'Rebounds': 'Rebounds',
  'Assists': 'Assists',
  'Steals': 'Steals',
  'Blocks': 'Blocks',
  'Turnovers': 'Turnovers',
  '3-Pointers Made': '3-Pointers Made',
  'Free Throws Made': 'Free Throws Made',
  
  // MLB
  'Hits': 'Hits',
  'Runs': 'Runs',
  'RBIs': 'RBIs',
  'Home Runs': 'Home Runs',
  'Strikeouts': 'Strikeouts',
  'Walks': 'Walks',
  
  // NHL
  'Goals': 'Goals',
  'Assists': 'Assists',
  'Points': 'Points',
  'Shots': 'Shots',
  'Saves': 'Saves'
};

function normalizeOpponent(teamName, league) {
  const leagueMap = TEAM_MAPS[league.toUpperCase()];
  return leagueMap[teamName] || teamName;
}

function normalizeMarketType(statType) {
  return MARKET_TYPE_MAP[statType] || statType;
}

function normalizePlayerId(playerName) {
  return playerName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Get date 24 hours ago
 */
function getYesterday() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Incremental ingestion - fetch last 24h of events
 */
async function ingestIncremental() {
  console.log('🌙 Starting incremental ingestion (last 24h)...');
  
  if (!API_KEY) {
    throw new Error('SPORTSGAMEODDS_API_KEY not found in environment variables');
  }
  
  const yesterday = getYesterday();
  const currentYear = new Date().getFullYear();
  const results = {};
  let totalRecords = 0;
  
  for (const league of LEAGUES) {
    console.log(`📊 Processing ${league.toUpperCase()}...`);
    
    try {
      // Get events from yesterday
      const url = `https://api.sportsgameodds.com/v1/${league}/events?season=${currentYear}&date=${yesterday}&limit=100`;
      
      const res = await fetch(url, { 
        headers: { 'x-api-key': API_KEY } 
      });
      
      if (!res.ok) {
        console.error(`❌ API request failed for ${league}: ${res.status} ${res.statusText}`);
        results[league] = 0;
        continue;
      }
      
      const data = await res.json();
      
      if (!data.events || data.events.length === 0) {
        console.log(`ℹ️ No events found for ${league.toUpperCase()} on ${yesterday}`);
        results[league] = 0;
        continue;
      }
      
      const rows = [];
      
      for (const event of data.events) {
        if (!event.players || event.players.length === 0) {
          continue;
        }
        
        // Normalize teams
        const homeTeam = normalizeOpponent(event.home_team, league);
        const awayTeam = normalizeOpponent(event.away_team, league);
        
        for (const player of event.players) {
          if (!player.stats || Object.keys(player.stats).length === 0) {
            continue;
          }
          
          // Determine team and opponent
          const playerTeam = player.team === event.home_team ? homeTeam : awayTeam;
          const opponent = player.team === event.home_team ? awayTeam : homeTeam;
          
          // Process each stat
          for (const [statType, value] of Object.entries(player.stats)) {
            if (value === null || value === undefined) continue;
            
            const normalizedStatType = normalizeMarketType(statType);
            const normalizedPlayerId = normalizePlayerId(player.name);
            
            rows.push({
              player_id: normalizedPlayerId,
              player_name: player.name,
              team: playerTeam,
              opponent: opponent,
              season: currentYear,
              date: event.date,
              prop_type: normalizedStatType,
              value: Number(value),
              position: player.position || 'UNK',
              sport: league.toLowerCase()
            });
          }
        }
      }
      
      if (rows.length > 0) {
        const { error } = await supabase
          .from("playergamelogs")
          .upsert(rows, {
            onConflict: 'player_id,date,prop_type',
            ignoreDuplicates: false
          });
        
        if (error) {
          console.error(`❌ Insert error for ${league}:`, error);
          results[league] = 0;
        } else {
          console.log(`✅ Inserted ${rows.length} rows for ${league.toUpperCase()}`);
          results[league] = rows.length;
          totalRecords += rows.length;
        }
      } else {
        results[league] = 0;
      }
      
      // Small delay between leagues
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Error ingesting ${league.toUpperCase()}:`, error);
      results[league] = 0;
      continue;
    }
  }
  
  console.log('\n📊 Incremental Ingestion Summary:');
  console.log('=' .repeat(40));
  for (const [league, count] of Object.entries(results)) {
    console.log(`${league.toUpperCase()}: ${count} records`);
  }
  console.log(`\n🎉 Total: ${totalRecords} records inserted`);
  
  return { results, totalRecords };
}

/**
 * Precompute analytics into PlayerAnalytics table
 */
async function precomputeAnalytics(season = new Date().getFullYear()) {
  console.log(`\n📈 Starting analytics precomputation for season ${season}...`);
  
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
      return { success: false, recordsProcessed: 0 };
    }

    if (!players || players.length === 0) {
      console.log('⚠️ No players found for the specified season');
      return { success: false, recordsProcessed: 0 };
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

          if (linesError || !currentLines || currentLines.length === 0) {
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
      return { success: true, recordsProcessed: successfulUpserts };
    }

    return { success: true, recordsProcessed: 0 };

  } catch (error) {
    console.error('❌ Fatal error in analytics precomputation:', error);
    return { success: false, recordsProcessed: 0 };
  }
}

/**
 * Main combined nightly job
 */
async function runNightlyJob() {
  const startTime = Date.now();
  console.log("🚀 Starting combined nightly job...");
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('=' .repeat(60));
  
  const results = {
    ingestion: { success: false, records: 0, leagues: {} },
    proplines: { success: false, records: 0, leagues: {} },
    analytics: { success: false, recordsProcessed: 0 },
    totalTime: 0
  };
  
  try {
    // Step 1: Incremental Ingestion
    console.log('\n📥 STEP 1: Incremental Ingestion');
    console.log('-'.repeat(40));
    
    const ingestionResults = await ingestIncremental();
    results.ingestion = {
      success: true,
      records: ingestionResults.totalRecords,
      leagues: ingestionResults.results
    };
    
    // Step 2: PropLines Ingestion
    console.log('\n🎯 STEP 2: PropLines Ingestion');
    console.log('-'.repeat(40));
    
    const proplinesResults = await ingestPropLines();
    results.proplines = {
      success: true,
      records: proplinesResults.totalRecords,
      leagues: proplinesResults.results
    };
    
    // Step 3: Enhanced Analytics Precomputation (with real betting lines)
    console.log('\n📊 STEP 3: Enhanced Analytics Precomputation');
    console.log('-'.repeat(40));
    
    const analyticsResults = await enhancedPrecomputeAnalytics(new Date().getFullYear());
    results.analytics = analyticsResults;
    
    // Calculate total time
    results.totalTime = Date.now() - startTime;
    
    // Final Summary
    console.log('\n🎉 COMBINED NIGHTLY JOB COMPLETE');
    console.log('=' .repeat(60));
    console.log(`⏱️ Total execution time: ${(results.totalTime / 1000).toFixed(2)}s`);
    console.log('\n📊 INGESTION RESULTS:');
    for (const [league, count] of Object.entries(results.ingestion.leagues)) {
      console.log(`  ${league.toUpperCase()}: ${count} records`);
    }
    console.log(`  Total: ${results.ingestion.records} records`);
    console.log('\n🎯 PROPLINES RESULTS:');
    for (const [league, count] of Object.entries(results.proplines.leagues)) {
      console.log(`  ${league.toUpperCase()}: ${count} records`);
    }
    console.log(`  Total: ${results.proplines.records} records`);
    console.log('\n📈 ANALYTICS RESULTS:');
    console.log(`  Records processed: ${results.analytics.recordsProcessed}`);
    console.log(`  Success: ${results.analytics.success ? '✅' : '❌'}`);
    
    console.log('\n✅ Nightly job completed successfully!');
    
    return results;
    
  } catch (error) {
    results.totalTime = Date.now() - startTime;
    console.error('\n❌ COMBINED NIGHTLY JOB FAILED');
    console.error('=' .repeat(60));
    console.error(`⏱️ Execution time before failure: ${(results.totalTime / 1000).toFixed(2)}s`);
    console.error('Error:', error);
    
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    await runNightlyJob();
    process.exit(0);
  } catch (error) {
    console.error('❌ Combined nightly job failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runNightlyJob, ingestIncremental, precomputeAnalytics };
