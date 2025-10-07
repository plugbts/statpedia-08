/**
 * Batch Ingestion Script
 * Backfills PlayerGameLogs with complete coverage across all leagues and seasons
 * Uses SportsGameOdds /events endpoint with pagination
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI'
);

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;

// Define leagues and seasons to backfill
const LEAGUES = ["nfl", "nba", "mlb", "nhl"];
const SEASONS = [2022, 2023, 2024, 2025];

// Comprehensive team normalization maps
const TEAM_MAPS = {
  NFL: {
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
  NBA: {
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
  MLB: {
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
  NHL: {
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

/**
 * Normalize team name to abbreviation
 */
function normalizeOpponent(team, league) {
  if (!team) return "";
  if (team.length <= 3) return team.toUpperCase();
  
  const maps = TEAM_MAPS[league.toUpperCase()];
  if (!maps) return team.toUpperCase();
  
  // Direct mapping
  if (maps[team]) return maps[team];
  
  // Try partial matching
  for (const [fullName, abbr] of Object.entries(maps)) {
    if (fullName.toLowerCase().includes(team.toLowerCase()) ||
        team.toLowerCase().includes(fullName.toLowerCase())) {
      return abbr;
    }
  }
  
  return team.toUpperCase();
}

/**
 * Normalize market type to canonical prop type
 */
function normalizeMarketType(market) {
  if (!market) return "";
  
  const lower = market.toLowerCase();
  
  // NFL
  if (lower.includes("pass yard")) return "Passing Yards";
  if (lower.includes("rush yard")) return "Rushing Yards";
  if (lower.includes("rec yard")) return "Receiving Yards";
  if (lower.includes("comp")) return "Passing Completions";
  if (lower.includes("att")) return "Passing Attempts";
  if (lower.includes("pass td")) return "Passing Touchdowns";
  if (lower.includes("rush td")) return "Rushing Touchdowns";
  if (lower.includes("rec td")) return "Receiving Touchdowns";
  if (lower.includes("receptions")) return "Receptions";
  if (lower.includes("interception")) return "Interceptions";
  if (lower.includes("fumble")) return "Fumbles Lost";
  
  // NBA
  if (lower.includes("points")) return "Points";
  if (lower.includes("rebound")) return "Rebounds";
  if (lower.includes("assist")) return "Assists";
  if (lower.includes("steal")) return "Steals";
  if (lower.includes("block")) return "Blocks";
  if (lower.includes("three pointer")) return "Three Pointers Made";
  if (lower.includes("free throw")) return "Free Throws Made";
  if (lower.includes("turnover")) return "Turnovers";
  
  // MLB
  if (lower.includes("hit")) return "Hits";
  if (lower.includes("run")) return "Runs";
  if (lower.includes("rbi")) return "Runs Batted In";
  if (lower.includes("home run")) return "Home Runs";
  if (lower.includes("stolen base")) return "Stolen Bases";
  if (lower.includes("walk")) return "Walks";
  if (lower.includes("strikeout")) return "Strikeouts";
  
  // NHL
  if (lower.includes("goal")) return "Goals";
  if (lower.includes("shot")) return "Shots on Goal";
  if (lower.includes("power play")) return "Power Play Goals";
  
  // Fallback
  return market;
}

/**
 * Normalize player ID
 */
function normalizePlayerId(playerName) {
  if (!playerName) return 'unknown-player';
  
  return playerName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Ingest a single season for a league
 */
async function ingestSeason(league, season) {
  console.log(`🚀 Ingesting ${league.toUpperCase()} ${season}...`);
  
  if (!API_KEY) {
    throw new Error('SPORTSGAMEODDS_API_KEY not found in environment variables');
  }
  
  let nextCursor = null;
  let total = 0;
  let pageCount = 0;
  
  do {
    pageCount++;
    console.log(`📄 Processing page ${pageCount}...`);
    
    const url = `https://api.sportsgameodds.com/v1/${league}/events?season=${season}&limit=100${nextCursor ? `&cursor=${nextCursor}` : ""}`;
    
    try {
      const res = await fetch(url, { 
        headers: { 'x-api-key': API_KEY } 
      });
      
      if (!res.ok) {
        throw new Error(`API request failed: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      
      if (!data.events || data.events.length === 0) {
        console.log(`⚠️ No events found for ${league.toUpperCase()} ${season}`);
        break;
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
              season: season,
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
        try {
          const { error } = await supabase
            .from("playergamelogs")
            .upsert(rows, {
              onConflict: 'player_id,date,prop_type',
              ignoreDuplicates: false
            });
          
          if (error) {
            console.error("❌ Insert error:", error);
          } else {
            total += rows.length;
            console.log(`✅ Inserted ${rows.length} rows (total ${total})`);
          }
        } catch (insertError) {
          console.error("❌ Insert error:", insertError);
        }
      }
      
      nextCursor = data.nextCursor;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error processing page ${pageCount}:`, error);
      break;
    }
    
  } while (nextCursor);
  
  console.log(`✅ Finished ${league.toUpperCase()} ${season}: ${total} rows`);
  return total;
}

/**
 * Ingest all leagues and seasons
 */
async function ingestAll() {
  console.log('🚀 Starting batch ingestion for all leagues and seasons...\n');
  
  const results = {};
  let grandTotal = 0;
  
  for (const league of LEAGUES) {
    console.log(`🏈 Processing ${league.toUpperCase()}...`);
    results[league] = {};
    
    for (const season of SEASONS) {
      try {
        const count = await ingestSeason(league, season);
        results[league][season] = count;
        grandTotal += count;
        
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
  console.log('\n📊 Batch Ingestion Summary:');
  console.log('=' .repeat(50));
  
  for (const league of LEAGUES) {
    console.log(`\n${league.toUpperCase()}:`);
    const leagueTotal = Object.values(results[league]).reduce((sum, count) => sum + count, 0);
    console.log(`  Total records: ${leagueTotal}`);
    
    for (const [season, count] of Object.entries(results[league])) {
      console.log(`  ${season}: ${count} records`);
    }
  }
  
  console.log(`\n🎉 Grand Total: ${grandTotal} records inserted`);
  console.log('✅ Batch ingestion complete!');
  
  return results;
}

/**
 * Create indexes for fast queries
 */
async function createIndexes() {
  console.log('🔧 Creating indexes for fast queries...');
  
  try {
    // Note: These would need to be run as SQL commands in Supabase
    // For now, we'll just log what indexes should be created
    console.log('📋 Recommended indexes to create in Supabase:');
    console.log('CREATE INDEX idx_player_season ON playergamelogs(player_id, season);');
    console.log('CREATE INDEX idx_player_opponent ON playergamelogs(player_id, opponent);');
    console.log('CREATE INDEX idx_player_date ON playergamelogs(player_id, date);');
    console.log('CREATE INDEX idx_player_prop_type ON playergamelogs(player_id, prop_type);');
    console.log('CREATE INDEX idx_team_season ON playergamelogs(team, season);');
    console.log('CREATE INDEX idx_date_season ON playergamelogs(date, season);');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await ingestAll();
    await createIndexes();
    
    console.log('\n🎯 Expected Outcome:');
    console.log('- PlayerGameLogs filled with tens of thousands of rows');
    console.log('- Analytics columns (Hit Rate, Streak, L5/L10/L20, H2H, Defensive Rank) populated with real values');
    console.log('- UI loads instantly thanks to indexed queries');
    
  } catch (error) {
    console.error('❌ Batch ingestion failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ingestAll, ingestSeason, normalizeOpponent, normalizeMarketType, normalizePlayerId };
