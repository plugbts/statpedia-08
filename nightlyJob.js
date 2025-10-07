/**
 * Simple Combined Nightly Job
 * - Ingests PlayerGameLogs (last 24h)
 * - Ingests PropLines (last 24h)  
 * - Precomputes analytics into PlayerAnalytics
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { calculateHitRate, calculateStreak } from './analyticsCalculators.js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;
const LEAGUES = ["nfl", "nba", "mlb", "nhl"];

async function runNightlyJob() {
  console.log("🚀 Starting simple nightly job...");
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('=' .repeat(60));
  
  const results = {
    gameLogs: { records: 0, leagues: {} },
    propLines: { records: 0, leagues: {} },
    analytics: { records: 0 }
  };
  
  try {
    // Step 1: Ingest PlayerGameLogs
    console.log('\n📥 STEP 1: Ingest PlayerGameLogs');
    console.log('-'.repeat(40));
    results.gameLogs = await ingestGameLogs();
    
    // Step 2: Ingest PropLines
    console.log('\n🎯 STEP 2: Ingest PropLines');
    console.log('-'.repeat(40));
    results.propLines = await ingestPropLines();
    
    // Step 3: Precompute Analytics
    console.log('\n📊 STEP 3: Precompute Analytics');
    console.log('-'.repeat(40));
    results.analytics = await precomputeAnalytics(new Date().getFullYear());
    
    // Summary
    console.log('\n🎉 SIMPLE NIGHTLY JOB COMPLETE');
    console.log('=' .repeat(60));
    console.log('\n📊 GAME LOGS RESULTS:');
    for (const [league, count] of Object.entries(results.gameLogs.leagues)) {
      console.log(`  ${league.toUpperCase()}: ${count} records`);
    }
    console.log(`  Total: ${results.gameLogs.records} records`);
    
    console.log('\n🎯 PROP LINES RESULTS:');
    for (const [league, count] of Object.entries(results.propLines.leagues)) {
      console.log(`  ${league.toUpperCase()}: ${count} records`);
    }
    console.log(`  Total: ${results.propLines.records} records`);
    
    console.log('\n📈 ANALYTICS RESULTS:');
    console.log(`  Records processed: ${results.analytics.records}`);
    
    console.log('\n✅ Simple nightly job completed successfully!');
    
  } catch (error) {
    console.error('\n❌ SIMPLE NIGHTLY JOB FAILED');
    console.error('=' .repeat(60));
    console.error('Error:', error);
    throw error;
  }
}

/* ------------------------------
   1. Ingest PlayerGameLogs
--------------------------------*/
async function ingestGameLogs() {
  const since = new Date(Date.now() - 24*60*60*1000).toISOString();
  const results = { records: 0, leagues: {} };
  
  for (const league of LEAGUES) {
    console.log(`📊 Processing ${league.toUpperCase()} game logs...`);
    let leagueRecords = 0;
    let nextCursor = null;
    
    do {
      try {
        const url = `https://api.sportsgameodds.com/v1/${league}/events?since=${since}&limit=100${nextCursor ? `&cursor=${nextCursor}` : ""}`;
        const res = await fetch(url, { headers: { 'x-api-key': API_KEY } });
        
        if (!res.ok) {
          console.error(`❌ API request failed for ${league}: ${res.status} ${res.statusText}`);
          break;
        }
        
        const data = await res.json();

        const rows = [];
        for (const event of data.events || []) {
          for (const player of event.players || []) {
            if (!player.stats || Object.keys(player.stats).length === 0) {
              continue;
            }
            
            // Process each stat
            for (const [statType, value] of Object.entries(player.stats)) {
              if (value === null || value === undefined) continue;
              
              rows.push({
                player_id: player.id || normalizePlayerId(player.name),
                player_name: player.name,
                team: normalizeTeam(player.team, league),
                opponent: normalizeTeam(event.opponent, league),
                season: event.season || new Date().getFullYear(),
                date: event.date,
                prop_type: normalizeMarketType(statType),
                value: Number(value),
                position: player.position || 'UNK'
              });
            }
          }
        }

        if (rows.length > 0) {
          const { error } = await supabase.from("playergamelogs")
            .upsert(rows, { onConflict: ['player_id','date','prop_type'] });
          
          if (error) {
            console.error(`❌ Insert error for ${league}:`, error);
          } else {
            leagueRecords += rows.length;
            console.log(`  ✅ Inserted ${rows.length} game log records`);
          }
        }

        nextCursor = data.nextCursor;
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error processing ${league}:`, error);
        break;
      }
    } while (nextCursor);
    
    results.leagues[league] = leagueRecords;
    results.records += leagueRecords;
    console.log(`✅ ${league.toUpperCase()}: ${leagueRecords} game log records`);
  }
  
  return results;
}

/* ------------------------------
   2. Ingest PropLines
--------------------------------*/
async function ingestPropLines() {
  const since = new Date(Date.now() - 24*60*60*1000).toISOString();
  const results = { records: 0, leagues: {} };
  
  for (const league of LEAGUES) {
    console.log(`🎯 Processing ${league.toUpperCase()} prop lines...`);
    let leagueRecords = 0;
    let nextCursor = null;
    
    do {
      try {
        const url = `https://api.sportsgameodds.com/v1/${league}/props?since=${since}&limit=100${nextCursor ? `&cursor=${nextCursor}` : ""}`;
        const res = await fetch(url, { headers: { 'x-api-key': API_KEY } });
        
        if (!res.ok) {
          console.error(`❌ API request failed for ${league}: ${res.status} ${res.statusText}`);
          break;
        }
        
        const data = await res.json();

        const rows = [];
        for (const prop of data.props || []) {
          if (!prop.player || !prop.player.id || !prop.player.name) {
            continue;
          }
          
          rows.push({
            player_id: prop.player.id,
            player_name: prop.player.name,
            team: normalizeTeam(prop.team, league),
            opponent: normalizeTeam(prop.opponent, league),
            season: prop.season || new Date().getFullYear(),
            date: prop.date,
            prop_type: normalizeMarketType(prop.market),
            line: Number(prop.line),
            over_odds: parseOdds(prop.overOdds),
            under_odds: parseOdds(prop.underOdds),
            sportsbook: prop.sportsbook || "Consensus",
            league: league.toLowerCase()
          });
        }

        if (rows.length > 0) {
          const { error } = await supabase.from("proplines")
            .upsert(rows, { onConflict: ['player_id','date','prop_type','sportsbook'] });
          
          if (error) {
            console.error(`❌ Insert error for ${league}:`, error);
          } else {
            leagueRecords += rows.length;
            console.log(`  ✅ Inserted ${rows.length} prop line records`);
          }
        }

        nextCursor = data.nextCursor;
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error processing ${league}:`, error);
        break;
      }
    } while (nextCursor);
    
    results.leagues[league] = leagueRecords;
    results.records += leagueRecords;
    console.log(`✅ ${league.toUpperCase()}: ${leagueRecords} prop line records`);
  }
  
  return results;
}

/* ------------------------------
   3. Precompute Analytics
--------------------------------*/
async function precomputeAnalytics(season) {
  console.log(`📊 Precomputing analytics for season ${season}...`);
  
  try {
    // Get unique player/prop combinations
    const { data: combos, error: combosError } = await supabase
      .from('playergamelogs')
      .select('player_id, player_name, prop_type')
      .eq('season', season)
      .neq('value', null)
      .neq('value', 0);

    if (combosError) {
      console.error('❌ Error fetching combinations:', combosError);
      return { records: 0 };
    }

    if (!combos || combos.length === 0) {
      console.log('⚠️ No combinations found for analytics');
      return { records: 0 };
    }

    console.log(`✅ Found ${combos.length} player/prop combinations`);

    // Get unique combinations
    const uniqueCombinations = combos.reduce((acc, combo) => {
      const key = `${combo.player_id}-${combo.prop_type}`;
      if (!acc.has(key)) {
        acc.set(key, combo);
      }
      return acc;
    }, new Map());

    const results = [];
    let processed = 0;

    for (const { player_id, player_name, prop_type } of uniqueCombinations.values()) {
      try {
        // Join game logs with prop lines
        const { data: joined, error: joinError } = await supabase
          .from('playergamelogs')
          .select(`
            date,
            value,
            proplines!inner(line)
          `)
          .eq('player_id', player_id)
          .eq('prop_type', prop_type)
          .eq('season', season)
          .order('date', { ascending: false });

        if (joinError) {
          console.error(`❌ Join error for ${player_name} ${prop_type}:`, joinError);
          continue;
        }

        if (!joined || joined.length === 0) {
          continue;
        }

        // Process data for analytics
        const processedData = joined.map(game => ({
          date: game.date,
          value: game.value,
          line: game.proplines.line
        }));

        // Calculate analytics for both directions
        const directions = ['over', 'under'];
        
        for (const direction of directions) {
          const hitRateL5 = calculateHitRate(processedData, direction, 5);
          const hitRateL10 = calculateHitRate(processedData, direction, 10);
          const hitRateL20 = calculateHitRate(processedData, direction, 20);
          const hitRateSeason = calculateHitRate(processedData, direction);
          const streak = calculateStreak(processedData, direction);

          results.push({
            player_id,
            player_name,
            prop_type,
            line: processedData[0]?.line || 0,
            direction,
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
            streak_current: streak.currentStreak,
            streak_longest: streak.longestStreak,
            streak_direction: streak.streakDirection,
            last_computed_at: new Date().toISOString(),
            season
          });
        }

        processed++;
        if (processed % 50 === 0) {
          console.log(`  📊 Processed ${processed}/${uniqueCombinations.size} combinations`);
        }

      } catch (error) {
        console.error(`❌ Error processing ${player_name} - ${prop_type}:`, error);
        continue;
      }
    }

    // Upsert analytics results
    if (results.length > 0) {
      console.log(`💾 Upserting ${results.length} analytics records...`);
      
      const { error: upsertError } = await supabase.from('playeranalytics')
        .upsert(results, { onConflict: ['player_id','prop_type','line','direction'] });
      
      if (upsertError) {
        console.error('❌ Upsert error:', upsertError);
        return { records: 0 };
      } else {
        console.log(`✅ Successfully upserted ${results.length} analytics records`);
        return { records: results.length };
      }
    }

    return { records: 0 };

  } catch (error) {
    console.error('❌ Fatal error in analytics precomputation:', error);
    return { records: 0 };
  }
}

/* ------------------------------
   Helper Functions
--------------------------------*/
function normalizeMarketType(market) {
  if (!market) return "";
  const lower = market.toLowerCase();
  if (lower.includes("pass yard")) return "Passing Yards";
  if (lower.includes("rush yard")) return "Rushing Yards";
  if (lower.includes("rec yard")) return "Receiving Yards";
  if (lower.includes("comp")) return "Passing Completions";
  if (lower.includes("att")) return "Passing Attempts";
  if (lower.includes("td")) return "Touchdowns";
  if (lower.includes("point")) return "Points";
  if (lower.includes("rebound")) return "Rebounds";
  if (lower.includes("assist")) return "Assists";
  if (lower.includes("hit")) return "Hits";
  if (lower.includes("run")) return "Runs";
  if (lower.includes("rbi")) return "RBIs";
  if (lower.includes("home run")) return "Home Runs";
  if (lower.includes("strikeout")) return "Strikeouts";
  if (lower.includes("walk")) return "Walks";
  if (lower.includes("goal")) return "Goals";
  if (lower.includes("shot")) return "Shots";
  if (lower.includes("save")) return "Saves";
  return market;
}

function normalizeTeam(teamName, league) {
  if (!teamName) return teamName;
  
  const teamMaps = {
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
  
  const leagueMap = teamMaps[league.toUpperCase()];
  return leagueMap?.[teamName] || teamName;
}

function normalizePlayerId(playerName) {
  if (!playerName) return "";
  return playerName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseOdds(oddsStr) {
  if (!oddsStr) return null;
  
  const clean = oddsStr.toString().trim();
  if (!isNaN(clean)) {
    return parseInt(clean);
  }
  
  const match = clean.match(/^([+-]?)(\d+)$/);
  if (match) {
    const sign = match[1] === '-' ? -1 : 1;
    const value = parseInt(match[2]);
    return sign * value;
  }
  
  return null;
}

/**
 * Main execution function
 */
async function main() {
  try {
    await runNightlyJob();
    process.exit(0);
  } catch (error) {
    console.error('❌ Simple nightly job failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runNightlyJob, ingestGameLogs, ingestPropLines, precomputeAnalytics };
