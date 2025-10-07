/**
 * Comprehensive Backfill Ingestion Script
 * Backfills PlayerGameLogs with complete coverage across all teams, players, and weeks
 * Uses SportsGameOdds /events endpoint with proper pagination
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI'
);

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;

// Comprehensive team normalization for all leagues
const TEAM_MAPPINGS = {
  // NFL
  nfl: {
    'Arizona Cardinals': 'ARI', 'Atlanta Falcons': 'ATL', 'Baltimore Ravens': 'BAL',
    'Buffalo Bills': 'BUF', 'Carolina Panthers': 'CAR', 'Chicago Bears': 'CHI',
    'Cincinnati Bengals': 'CIN', 'Cleveland Browns': 'CLE', 'Dallas Cowboys': 'DAL',
    'Denver Broncos': 'DEN', 'Detroit Lions': 'DET', 'Green Bay Packers': 'GB',
    'Houston Texans': 'HOU', 'Indianapolis Colts': 'IND', 'Jacksonville Jaguars': 'JAX',
    'Kansas City Chiefs': 'KC', 'Las Vegas Raiders': 'LV', 'Los Angeles Chargers': 'LAC',
    'Los Angeles Rams': 'LAR', 'Miami Dolphins': 'MIA', 'Minnesota Vikings': 'MIN',
    'New England Patriots': 'NE', 'New Orleans Saints': 'NO', 'New York Giants': 'NYG',
    'New York Jets': 'NYJ', 'Philadelphia Eagles': 'PHI', 'Pittsburgh Steelers': 'PIT',
    'San Francisco 49ers': 'SF', 'Seattle Seahawks': 'SEA', 'Tampa Bay Buccaneers': 'TB',
    'Tennessee Titans': 'TEN', 'Washington Commanders': 'WSH'
  },
  // NBA
  nba: {
    'Atlanta Hawks': 'ATL', 'Boston Celtics': 'BOS', 'Brooklyn Nets': 'BKN',
    'Charlotte Hornets': 'CHA', 'Chicago Bulls': 'CHI', 'Cleveland Cavaliers': 'CLE',
    'Dallas Mavericks': 'DAL', 'Denver Nuggets': 'DEN', 'Detroit Pistons': 'DET',
    'Golden State Warriors': 'GSW', 'Houston Rockets': 'HOU', 'Indiana Pacers': 'IND',
    'LA Clippers': 'LAC', 'Los Angeles Lakers': 'LAL', 'Memphis Grizzlies': 'MEM',
    'Miami Heat': 'MIA', 'Milwaukee Bucks': 'MIL', 'Minnesota Timberwolves': 'MIN',
    'New Orleans Pelicans': 'NOP', 'New York Knicks': 'NYK', 'Oklahoma City Thunder': 'OKC',
    'Orlando Magic': 'ORL', 'Philadelphia 76ers': 'PHI', 'Phoenix Suns': 'PHX',
    'Portland Trail Blazers': 'POR', 'Sacramento Kings': 'SAC', 'San Antonio Spurs': 'SAS',
    'Toronto Raptors': 'TOR', 'Utah Jazz': 'UTA', 'Washington Wizards': 'WAS'
  },
  // MLB
  mlb: {
    'Arizona Diamondbacks': 'ARI', 'Atlanta Braves': 'ATL', 'Baltimore Orioles': 'BAL',
    'Boston Red Sox': 'BOS', 'Chicago Cubs': 'CHC', 'Chicago White Sox': 'CWS',
    'Cincinnati Reds': 'CIN', 'Cleveland Guardians': 'CLE', 'Colorado Rockies': 'COL',
    'Detroit Tigers': 'DET', 'Houston Astros': 'HOU', 'Kansas City Royals': 'KC',
    'Los Angeles Angels': 'LAA', 'Los Angeles Dodgers': 'LAD', 'Miami Marlins': 'MIA',
    'Milwaukee Brewers': 'MIL', 'Minnesota Twins': 'MIN', 'New York Mets': 'NYM',
    'New York Yankees': 'NYY', 'Oakland Athletics': 'OAK', 'Philadelphia Phillies': 'PHI',
    'Pittsburgh Pirates': 'PIT', 'San Diego Padres': 'SD', 'San Francisco Giants': 'SF',
    'Seattle Mariners': 'SEA', 'St. Louis Cardinals': 'STL', 'Tampa Bay Rays': 'TB',
    'Texas Rangers': 'TEX', 'Toronto Blue Jays': 'TOR', 'Washington Nationals': 'WSH'
  },
  // NHL
  nhl: {
    'Anaheim Ducks': 'ANA', 'Arizona Coyotes': 'ARI', 'Boston Bruins': 'BOS',
    'Buffalo Sabres': 'BUF', 'Calgary Flames': 'CGY', 'Carolina Hurricanes': 'CAR',
    'Chicago Blackhawks': 'CHI', 'Colorado Avalanche': 'COL', 'Columbus Blue Jackets': 'CBJ',
    'Dallas Stars': 'DAL', 'Detroit Red Wings': 'DET', 'Edmonton Oilers': 'EDM',
    'Florida Panthers': 'FLA', 'Los Angeles Kings': 'LAK', 'Minnesota Wild': 'MIN',
    'Montreal Canadiens': 'MTL', 'Nashville Predators': 'NSH', 'New Jersey Devils': 'NJD',
    'New York Islanders': 'NYI', 'New York Rangers': 'NYR', 'Ottawa Senators': 'OTT',
    'Philadelphia Flyers': 'PHI', 'Pittsburgh Penguins': 'PIT', 'San Jose Sharks': 'SJ',
    'Seattle Kraken': 'SEA', 'St. Louis Blues': 'STL', 'Tampa Bay Lightning': 'TB',
    'Toronto Maple Leafs': 'TOR', 'Vancouver Canucks': 'VAN', 'Vegas Golden Knights': 'VGK',
    'Washington Capitals': 'WSH', 'Winnipeg Jets': 'WPG'
  }
};

// Market type normalization
const MARKET_TYPE_MAPPINGS = {
  // NFL
  'passing_yards': 'Passing Yards',
  'rushing_yards': 'Rushing Yards', 
  'receiving_yards': 'Receiving Yards',
  'receptions': 'Receptions',
  'passing_touchdowns': 'Passing Touchdowns',
  'rushing_touchdowns': 'Rushing Touchdowns',
  'receiving_touchdowns': 'Receiving Touchdowns',
  'passing_interceptions': 'Interceptions',
  'fumbles_lost': 'Fumbles Lost',
  'passing_completions': 'Passing Completions',
  'passing_attempts': 'Passing Attempts',
  'rushing_attempts': 'Rushing Attempts',
  'field_goals_made': 'Field Goals Made',
  'extra_points_made': 'Extra Points Made',
  'kicking_total_points': 'Kicking Total Points',
  'defense_combined_tackles': 'Combined Tackles',
  'defense_sacks': 'Sacks',
  'fantasy_score': 'Fantasy Score',
  // NBA
  'points': 'Points',
  'rebounds': 'Rebounds',
  'assists': 'Assists',
  'steals': 'Steals',
  'blocks': 'Blocks',
  'three_pointers_made': 'Three Pointers Made',
  'free_throws_made': 'Free Throws Made',
  'turnovers': 'Turnovers',
  // MLB
  'hits': 'Hits',
  'runs': 'Runs',
  'runs_batted_in': 'Runs Batted In',
  'home_runs': 'Home Runs',
  'stolen_bases': 'Stolen Bases',
  'walks': 'Walks',
  'strikeouts': 'Strikeouts',
  // NHL
  'goals': 'Goals',
  'assists': 'Assists',
  'points': 'Points',
  'shots_on_goal': 'Shots on Goal',
  'power_play_goals': 'Power Play Goals',
  'power_play_assists': 'Power Play Assists'
};

// Position normalization
const POSITION_MAPPINGS = {
  // NFL
  'QB': 'QB', 'Quarterback': 'QB', 'Running Back': 'RB', 'RB': 'RB',
  'Wide Receiver': 'WR', 'WR': 'WR', 'Tight End': 'TE', 'TE': 'TE',
  'Kicker': 'K', 'K': 'K', 'Defensive Lineman': 'DL', 'DL': 'DL',
  'Linebacker': 'LB', 'LB': 'LB', 'Defensive Back': 'DB', 'DB': 'DB',
  // NBA
  'Point Guard': 'PG', 'PG': 'PG', 'Shooting Guard': 'SG', 'SG': 'SG',
  'Small Forward': 'SF', 'SF': 'SF', 'Power Forward': 'PF', 'PF': 'PF',
  'Center': 'C', 'C': 'C',
  // MLB
  'Pitcher': 'P', 'P': 'P', 'Catcher': 'C', 'C': 'C', 'First Base': '1B', '1B': '1B',
  'Second Base': '2B', '2B': '2B', 'Third Base': '3B', '3B': '3B',
  'Shortstop': 'SS', 'SS': 'SS', 'Left Field': 'LF', 'LF': 'LF',
  'Center Field': 'CF', 'CF': 'CF', 'Right Field': 'RF', 'RF': 'RF',
  'Designated Hitter': 'DH', 'DH': 'DH',
  // NHL
  'Center': 'C', 'Left Wing': 'LW', 'LW': 'LW', 'Right Wing': 'RW', 'RW': 'RW',
  'Defenseman': 'D', 'D': 'D', 'Goalie': 'G', 'G': 'G'
};

/**
 * Normalize team name to abbreviation
 */
function normalizeOpponent(teamName, league) {
  if (!teamName || !league) return 'UNK';
  
  const mappings = TEAM_MAPPINGS[league.toLowerCase()];
  if (!mappings) return teamName;
  
  // Direct mapping
  if (mappings[teamName]) return mappings[teamName];
  
  // Try partial matching
  for (const [fullName, abbr] of Object.entries(mappings)) {
    if (fullName.toLowerCase().includes(teamName.toLowerCase()) ||
        teamName.toLowerCase().includes(fullName.toLowerCase())) {
      return abbr;
    }
  }
  
  return teamName;
}

/**
 * Normalize market type to canonical prop type
 */
function normalizeMarketType(marketType) {
  if (!marketType) return 'Unknown';
  
  const lowerMarket = marketType.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  // Direct mapping
  if (MARKET_TYPE_MAPPINGS[lowerMarket]) {
    return MARKET_TYPE_MAPPINGS[lowerMarket];
  }
  
  // Try partial matching
  for (const [key, value] of Object.entries(MARKET_TYPE_MAPPINGS)) {
    if (lowerMarket.includes(key) || key.includes(lowerMarket)) {
      return value;
    }
  }
  
  // Fallback: capitalize words
  return marketType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalize position
 */
function normalizePosition(position) {
  if (!position) return 'UNK';
  
  // Direct mapping
  if (POSITION_MAPPINGS[position]) return POSITION_MAPPINGS[position];
  
  // Try partial matching
  for (const [key, value] of Object.entries(POSITION_MAPPINGS)) {
    if (position.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(position.toLowerCase())) {
      return value;
    }
  }
  
  return position;
}

/**
 * Normalize player ID (convert name to consistent format)
 */
function normalizePlayerId(playerName) {
  if (!playerName) return 'unknown-player';
  
  return playerName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Fetch all events for a league and season using pagination
 */
async function fetchAllEvents(league, season) {
  console.log(`📡 Fetching all events for ${league.toUpperCase()} ${season}...`);
  
  if (!API_KEY) {
    throw new Error('SPORTSGAMEODDS_API_KEY not found in environment variables');
  }
  
  const allEvents = [];
  let nextCursor = null;
  let pageCount = 0;
  
  do {
    pageCount++;
    console.log(`📄 Fetching page ${pageCount}...`);
    
    const url = `https://api.sportsgameodds.com/v1/${league}/events?season=${season}&limit=100&cursor=${nextCursor || ""}`;
    
    const response = await fetch(url, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.events && data.events.length > 0) {
      allEvents.push(...data.events);
      console.log(`✅ Page ${pageCount}: ${data.events.length} events (Total: ${allEvents.length})`);
    }
    
    nextCursor = data.nextCursor;
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
    
  } while (nextCursor);
  
  console.log(`🎉 Fetched ${allEvents.length} total events for ${league.toUpperCase()} ${season}`);
  return allEvents;
}

/**
 * Process events and insert into PlayerGameLogs
 */
async function processEventsToGameLogs(events, league, season) {
  console.log(`🔄 Processing ${events.length} events for ${league.toUpperCase()} ${season}...`);
  
  const rows = [];
  let processedEvents = 0;
  let processedPlayers = 0;
  
  for (const event of events) {
    processedEvents++;
    
    if (!event.players || event.players.length === 0) {
      continue;
    }
    
    // Normalize teams
    const homeTeam = normalizeOpponent(event.home_team, league);
    const awayTeam = normalizeOpponent(event.away_team, league);
    
    // Process each player
    for (const player of event.players) {
      processedPlayers++;
      
      // Skip if no stats
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
        const normalizedPosition = normalizePosition(player.position);
        
        rows.push({
          player_id: normalizedPlayerId,
          player_name: player.name,
          team: playerTeam,
          opponent: opponent,
          season: season,
          date: event.date,
          prop_type: normalizedStatType,
          value: Number(value),
          position: normalizedPosition,
          sport: league.toLowerCase()
        });
      }
    }
    
    // Log progress every 50 events
    if (processedEvents % 50 === 0) {
      console.log(`📈 Processed ${processedEvents}/${events.length} events, ${processedPlayers} players, ${rows.length} stat rows`);
    }
  }
  
  console.log(`✅ Processing complete: ${processedEvents} events, ${processedPlayers} players, ${rows.length} stat rows`);
  return rows;
}

/**
 * Insert game logs into database
 */
async function insertGameLogs(rows, league, season) {
  if (rows.length === 0) {
    console.log(`⚠️ No valid player stats found for ${league} ${season}`);
    return 0;
  }
  
  console.log(`💾 Inserting ${rows.length} rows into PlayerGameLogs...`);
  
  try {
    const { error } = await supabase
      .from('playergamelogs')
      .upsert(rows, {
        onConflict: 'player_id,date,prop_type',
        ignoreDuplicates: false
      });
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Successfully inserted ${rows.length} game logs for ${league.toUpperCase()} ${season}`);
    return rows.length;
    
  } catch (error) {
    console.error(`❌ Insert error for ${league} ${season}:`, error);
    throw error;
  }
}

/**
 * Clear existing data for a league/season
 */
async function clearExistingData(league, season) {
  console.log(`🗑️ Clearing existing data for ${league} ${season}...`);
  
  try {
    const { error } = await supabase
      .from('playergamelogs')
      .delete()
      .eq('sport', league.toLowerCase())
      .eq('season', season);
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Cleared existing data for ${league} ${season}`);
  } catch (error) {
    console.error(`❌ Clear error for ${league} ${season}:`, error);
    throw error;
  }
}

/**
 * Ingest player game logs for a specific league and season
 */
async function ingestPlayerGameLogs(league, season, clearFirst = true) {
  console.log(`🚀 Starting ingestion for ${league.toUpperCase()} ${season}...`);
  
  try {
    // Clear existing data first if requested
    if (clearFirst) {
      await clearExistingData(league, season);
    }
    
    // Fetch all events with pagination
    const events = await fetchAllEvents(league, season);
    
    if (events.length === 0) {
      console.log(`⚠️ No events found for ${league} ${season}`);
      return 0;
    }
    
    // Process events into game logs
    const rows = await processEventsToGameLogs(events, league, season);
    
    // Insert into database
    const insertedCount = await insertGameLogs(rows, league, season);
    
    console.log(`\n✅ Completed ${league.toUpperCase()} ${season}: ${insertedCount} records inserted\n`);
    
    return insertedCount;
    
  } catch (error) {
    console.error(`❌ Error ingesting ${league} ${season}:`, error);
    throw error;
  }
}

/**
 * Main backfill function
 */
async function main() {
  console.log('🚀 Starting Comprehensive Backfill Ingestion...\n');
  
  // Define leagues and seasons to backfill
  const leagues = ['nfl', 'nba', 'mlb', 'nhl'];
  const currentYear = new Date().getFullYear();
  
  // Define seasons for each league
  const seasons = {
    nfl: [2022, 2023, 2024, currentYear], // NFL: past 2-3 seasons + current
    nba: [2022, 2023, 2024, currentYear], // NBA: past 2-3 seasons + current
    mlb: [2022, 2023, 2024, currentYear], // MLB: past 2-3 seasons + current
    nhl: [2022, 2023, 2024, currentYear]  // NHL: past 2-3 seasons + current
  };
  
  const results = {};
  let totalRecords = 0;
  
  // Process each league sequentially to avoid rate limiting
  for (const league of leagues) {
    console.log(`🏈 Processing ${league.toUpperCase()}...`);
    results[league] = {};
    
    const leagueSeasons = seasons[league];
    
    // Process each season sequentially
    for (const season of leagueSeasons) {
      try {
        const count = await ingestPlayerGameLogs(league, season, true);
        results[league][season] = count;
        totalRecords += count;
        
        // Delay between seasons to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed to process ${league} ${season}:`, error);
        results[league][season] = 0;
        continue;
      }
    }
    
    // Delay between leagues
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Final summary
  console.log('📊 Final Backfill Summary:');
  console.log('=' .repeat(50));
  
  for (const league of leagues) {
    console.log(`\n${league.toUpperCase()}:`);
    const leagueTotal = Object.values(results[league]).reduce((sum, count) => sum + count, 0);
    console.log(`  Total records: ${leagueTotal}`);
    
    for (const [season, count] of Object.entries(results[league])) {
      console.log(`  ${season}: ${count} records`);
    }
  }
  
  console.log(`\n🎉 Total records inserted: ${totalRecords}`);
  console.log('✅ Comprehensive backfill completed!');
  
  // Return results for verification
  return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { 
  ingestPlayerGameLogs, 
  fetchAllEvents, 
  processEventsToGameLogs,
  normalizeOpponent, 
  normalizeMarketType, 
  normalizePosition, 
  normalizePlayerId 
};
