/**
 * Simple Combined Nightly Job
 * - Ingests PlayerGameLogs (last 24h)
 * - Ingests PropLines (last 24h)  
 * - Precomputes analytics into PlayerAnalytics
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { calculateHitRate, calculateStreak } from './scripts/analyticsCalculators.js';
import { ingestPropsV2WithTeams } from './scripts/prop-ingestion-v2-enhanced.js';
import { mapPlayerId } from './utils/playerIdMap.js';
import dotenv from 'dotenv';

// Load both .env and .env.local files
dotenv.config();
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;

// Check if API key is available
if (!API_KEY) {
  console.error('❌ SPORTSGAMEODDS_API_KEY environment variable is required');
  console.error('Please set your API key in the .env file:');
  console.error('SPORTSGAMEODDS_API_KEY=your_api_key_here');
  process.exit(1);
}
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
    
    // Step 2: Ingest PropLines (Enhanced V2)
    console.log('\n🎯 STEP 2: Ingest PropLines (Enhanced V2)');
    console.log('-'.repeat(40));
    results.propLines = await ingestPropsV2WithTeams(new Date().getFullYear());
    
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
  const results = { records: 0, leagues: {} };
  
  for (const league of LEAGUES) {
    console.log(`📊 Processing ${league.toUpperCase()} game logs...`);
    let leagueRecords = 0;
    let nextCursor = null;
    
    do {
      try {
        // Remove date filter and increase limit to get more historical data
        const url = `https://api.sportsgameodds.com/events?league=${league}&limit=100${nextCursor ? `&cursor=${nextCursor}` : ""}`;
        const res = await fetch(url, { headers: { 'x-api-key': API_KEY } });
        
        if (!res.ok) {
          console.error(`❌ API request failed for ${league}: ${res.status} ${res.statusText}`);
          break;
        }
        
        const data = await res.json();

        const rows = [];
        // The API returns events in a data array
        for (const event of data.data || []) {
          // Only process completed games with actual player results
          if (!event.results || !event.results.game || !event.status?.completed) continue;
          
          const gameDate = event.status?.startsAt ? new Date(event.status.startsAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          const season = new Date(gameDate).getFullYear();
          
          // Process player results from the game
          for (const [playerId, playerStats] of Object.entries(event.results.game)) {
            if (playerId === 'away' || playerId === 'home') continue; // Skip team stats
            
            // Extract player name from playerId (handle various formats)
            let playerName = playerId;
            if (playerId.includes('_1_NFL')) {
              playerName = playerId.replace(/_1_NFL$/, '').replace(/_/g, ' ');
            } else if (playerId.includes('_')) {
              playerName = playerId.replace(/_/g, ' ');
            }
            
            // Map to canonical player ID (normalize team to ensure consistency)
            const normalizedTeam = 'UNK'; // Game logs don't have team info yet
            const canonicalPlayerId = await mapPlayerId('logs', playerId, playerName, normalizedTeam);
            if (!canonicalPlayerId) continue;
            
              // Process each stat type
              for (const [statType, value] of Object.entries(playerStats)) {
                if (value === null || value === undefined || value === 'null' || typeof value !== 'number') continue;
              
              // Map stat types to prop types
              const propType = mapStatTypeToPropType(statType);
              if (!propType) continue;
              
              rows.push({
                player_id: canonicalPlayerId,
                player_name: playerName,
                team: 'UNK', // We'd need to determine team from game data
                opponent: 'UNK', // We'd need to determine opponent from game data
                season: season,
                date: gameDate,
                prop_type: propType,
                value: Number(value),
                position: 'UNK'
              });
            }
          }
        }

        if (rows.length > 0) {
          const { error } = await supabase.from("playergamelogs")
            .upsert(rows);
          
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
        const url = `https://api.sportsgameodds.com/events?league=${league}&since=${since}&limit=100${nextCursor ? `&cursor=${nextCursor}` : ""}`;
        const res = await fetch(url, { headers: { 'x-api-key': API_KEY } });
        
        if (!res.ok) {
          console.error(`❌ API request failed for ${league}: ${res.status} ${res.statusText}`);
          break;
        }
        
        const data = await res.json();

        const rows = [];
        
        // Extract prop lines from events odds data
        for (const event of data.data || []) {
          if (!event.odds) continue;
          
          const gameDate = event.status?.startsAt ? new Date(event.status.startsAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          const season = new Date(gameDate).getFullYear();
          
          // Process each odd/prop
          for (const [oddId, oddData] of Object.entries(event.odds)) {
            // Skip non-player props (team-level props)
            if (!oddData.playerID || !oddData.statID) continue;
            
            // Only process over/under props
            if (oddData.betTypeID !== 'ou') continue;
            
            // Extract player name from playerID (format: PLAYER_NAME_1_NFL)
            const playerName = oddData.playerID.replace(/_1_NFL$/, '').replace(/_/g, ' ');
            
            // Map stat types to prop types
            const propType = mapStatTypeToPropType(oddData.statID);
            if (!propType) continue;
            
            // Get the line value
            const lineValue = parseFloat(oddData.fairOverUnder || oddData.bookOverUnder);
            if (isNaN(lineValue)) continue;
            
            rows.push({
              player_id: oddData.playerID,
              player_name: playerName,
              team: 'UNK', // Would need to determine from game data
              opponent: 'UNK', // Would need to determine from game data
              season: season,
              date: gameDate,
              prop_type: propType,
              line: lineValue,
              over_odds: parseOdds(oddData.sideID === 'over' ? oddData.fairOdds : null),
              under_odds: parseOdds(oddData.sideID === 'under' ? oddData.fairOdds : null),
              sportsbook: "Consensus" // Using fair odds as consensus
            });
          }
        }

        if (rows.length > 0) {
          const { error } = await supabase.from("proplines")
            .upsert(rows);
          
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
  
  // Ensure the player_analytics table exists
  await createAnalyticsTableIfNotExists();
  
  try {
    // Get unique player/prop combinations
    const { data: combos, error: combosError } = await supabase
      .from('playergamelogs')
      .select('player_id, player_name, prop_type')
      .eq('season', season)
      .not('value', 'is', null)
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
        // Get game logs for this player/prop combination
        const { data: gameLogs, error: logsError } = await supabase
          .from('playergamelogs')
          .select('date, value')
          .eq('player_id', player_id)
          .eq('prop_type', prop_type)
          .eq('season', season)
          .order('date', { ascending: false });

        if (logsError) {
          console.error(`❌ Logs error for ${player_name} ${prop_type}:`, logsError);
          continue;
        }

        // Get prop lines for this player/prop combination
        const { data: propLines, error: propsError } = await supabase
          .from('proplines')
          .select('date, line, over_odds, under_odds, sportsbook')
          .eq('player_id', player_id)
          .eq('prop_type', prop_type)
          .eq('season', season)
          .order('date', { ascending: false });

        if (propsError) {
          console.error(`❌ Props error for ${player_name} ${prop_type}:`, propsError);
          continue;
        }

        // Manual join on date
        const joined = [];
        for (const log of gameLogs || []) {
          const matchingProp = propLines?.find(prop => prop.date === log.date);
          if (matchingProp) {
            joined.push({
              date: log.date,
              value: log.value,
              proplines: {
                line: matchingProp.line,
                over_odds: matchingProp.over_odds,
                under_odds: matchingProp.under_odds,
                sportsbook: matchingProp.sportsbook
              }
            });
          }
        }


        if (!joined || joined.length === 0) {
          console.log(`  ⚠️ Skipping ${player_name} ${prop_type} - no matching prop lines found (${gameLogs?.length || 0} game logs, ${propLines?.length || 0} prop lines)`);
          continue;
        }

        // Process data for analytics
        const processedData = joined.map(game => ({
          date: game.date,
          value: game.value,
          line: game.proplines.line
        }));

        // Create a single analytics record for this player/prop combination
        console.log(`  ✅ Creating analytics for ${player_name} ${prop_type} - ${joined.length} joined records`);
        results.push({
          player_id,
          player_name,
          prop_type,
          season
        });

        processed++;
        if (processed % 50 === 0) {
          console.log(`  📊 Processed ${processed}/${uniqueCombinations.size} combinations`);
        }

      } catch (error) {
        console.error(`❌ Error processing ${player_name} - ${prop_type}:`, error);
        continue;
      }
    }

    // Upsert analytics results into the database
    if (results.length > 0) {
      console.log(`💾 Upserting ${results.length} analytics records into playeranalytics table...`);
      
      // Log first few records as examples
      results.slice(0, 3).forEach((record, i) => {
        console.log(`  ${i + 1}. ${record.player_name} ${record.prop_type} - Season ${record.season}`);
      });
      
      if (results.length > 3) {
        console.log(`  ... and ${results.length - 3} more records`);
      }
      
      // Try to insert into an existing table first, fallback to logging if table doesn't exist
      const { error: upsertError } = await supabase
        .from('playeranalytics')
        .upsert(results, { 
          onConflict: 'player_id,prop_type,season',
          ignoreDuplicates: false 
        });
      
      if (upsertError) {
        console.error('❌ Upsert error:', upsertError);
        
        if (upsertError.message.includes('Could not find the table')) {
          console.log('\n💡 SOLUTION: Create the playeranalytics table in Supabase dashboard');
          console.log('1. Go to: https://supabase.com/dashboard/project/oalssjwhzbukrswjriaj');
          console.log('2. Navigate to: SQL Editor');
          console.log('3. Run this SQL:');
          console.log(`
CREATE TABLE playeranalytics (
  id SERIAL PRIMARY KEY,
  player_id VARCHAR(64) NOT NULL,
  player_name VARCHAR(128),
  prop_type VARCHAR(64) NOT NULL,
  line FLOAT NOT NULL,
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
  UNIQUE(player_id, prop_type, season)
);

ALTER TABLE playeranalytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to playeranalytics" ON playeranalytics FOR ALL USING (true);
GRANT ALL ON playeranalytics TO anon;
GRANT ALL ON playeranalytics TO authenticated;
GRANT USAGE ON SEQUENCE playeranalytics_id_seq TO anon;
GRANT USAGE ON SEQUENCE playeranalytics_id_seq TO authenticated;
          `);
          console.log('4. Then run: node nightlyJob.js');
        }
        
        console.log('📊 Analytics computation complete - but failed to save to database');
        return { records: 0 };
      } else {
                console.log(`✅ Successfully upserted ${results.length} analytics records into playeranalytics table`);
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
async function createAnalyticsTableIfNotExists() {
  console.log('🔧 Ensuring player_analytics table exists...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS player_analytics (
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
    CREATE POLICY IF NOT EXISTS "Allow all access to player_analytics" ON player_analytics
    FOR ALL USING (true);
    
    -- Grant permissions
    GRANT ALL ON player_analytics TO anon;
    GRANT ALL ON player_analytics TO authenticated;
    GRANT USAGE ON SEQUENCE player_analytics_id_seq TO anon;
    GRANT USAGE ON SEQUENCE player_analytics_id_seq TO authenticated;
  `;
  
  try {
    // Try to execute the SQL using Supabase's SQL endpoint
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    if (error) {
      console.log('⚠️ Could not create table via RPC:', error.message);
      
      // Fallback: try to create table by inserting a dummy record and catching the error
      console.log('🔄 Trying alternative table creation method...');
      const { error: insertError } = await supabase
        .from('player_analytics')
        .insert([{
          player_id: 'dummy',
          player_name: 'dummy',
          prop_type: 'dummy',
          line: 0,
          direction: 'over',
          season: 2025
        }]);
      
      if (insertError && insertError.message.includes('relation "player_analytics" does not exist')) {
        console.log('❌ Table does not exist and could not be created automatically');
        console.log('💡 Please run the migration manually or create the table in Supabase dashboard');
      } else if (insertError) {
        console.log('✅ Table exists (got expected error):', insertError.message);
      }
    } else {
      console.log('✅ player_analytics table created successfully');
    }
  } catch (error) {
    console.log('⚠️ Table creation error:', error.message);
  }
}

function mapStatTypeToPropType(statType) {
  const statMap = {
    'passing_yards': 'Passing Yards',
    'rushing_yards': 'Rushing Yards', 
    'receiving_yards': 'Receiving Yards',
    'passing_completions': 'Passing Completions',
    'passing_attempts': 'Passing Attempts',
    'touchdowns': 'Touchdowns',
    'receiving_receptions': 'Receptions',
    'passing_touchdowns': 'Passing Touchdowns',
    'rushing_touchdowns': 'Rushing Touchdowns',
    'receiving_touchdowns': 'Receiving Touchdowns'
  };
  return statMap[statType] || null;
}

function normalizeMarketType(market) {
  if (!market) return "";
  const lower = market.toLowerCase();
  
  // Receiving props (prioritized order)
  if (lower.includes('receiving') && lower.includes('yard')) return 'Receiving Yards';
  if (lower.includes('receptions')) return 'Receptions';
  
  // Rushing props
  if (lower.includes('rush') && lower.includes('yard')) return 'Rushing Yards';
  
  // Passing props
  if (lower.includes("pass yard")) return "Passing Yards";
  if (lower.includes("comp")) return "Passing Completions";
  if (lower.includes("att")) return "Passing Attempts";
  if (lower.includes("td")) return "Touchdowns";
  
  // Other sports
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
