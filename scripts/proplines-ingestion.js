/**
 * PropLines Ingestion Script
 * - Fetches player prop odds from SportsGameOdds API
 * - Normalizes market types and team names
 * - Inserts into PropLines table with comprehensive error handling
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;
const LEAGUES = ["nfl", "nba", "mlb", "nhl"];

// Comprehensive team normalization maps
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

// Comprehensive market type normalization
const MARKET_TYPE_MAP = {
  // NFL Markets
  'Passing Yards': 'Passing Yards',
  'Pass Yards': 'Passing Yards',
  'Passing Yds': 'Passing Yards',
  'Pass Yds': 'Passing Yards',
  'Passing': 'Passing Yards',
  
  'Rushing Yards': 'Rushing Yards',
  'Rush Yards': 'Rushing Yards',
  'Rushing Yds': 'Rushing Yards',
  'Rush Yds': 'Rushing Yards',
  'Rushing': 'Rushing Yards',
  
  'Receiving Yards': 'Receiving Yards',
  'Rec Yards': 'Receiving Yards',
  'Receiving Yds': 'Receiving Yards',
  'Rec Yds': 'Receiving Yards',
  'Receiving': 'Receiving Yards',
  
  'Passing TDs': 'Passing TDs',
  'Pass TDs': 'Passing TDs',
  'Passing Touchdowns': 'Passing TDs',
  'Pass Touchdowns': 'Passing TDs',
  
  'Rushing TDs': 'Rushing TDs',
  'Rush TDs': 'Rushing TDs',
  'Rushing Touchdowns': 'Rushing TDs',
  'Rush Touchdowns': 'Rushing TDs',
  
  'Receiving TDs': 'Receiving TDs',
  'Rec TDs': 'Receiving TDs',
  'Receiving Touchdowns': 'Receiving TDs',
  'Rec Touchdowns': 'Receiving TDs',
  
  'Receptions': 'Receptions',
  'Catches': 'Receptions',
  'Rec': 'Receptions',
  
  'Passing Completions': 'Passing Completions',
  'Pass Completions': 'Passing Completions',
  'Completions': 'Passing Completions',
  
  'Passing Attempts': 'Passing Attempts',
  'Pass Attempts': 'Passing Attempts',
  'Attempts': 'Passing Attempts',
  
  'Interceptions': 'Interceptions',
  'INTs': 'Interceptions',
  'Picks': 'Interceptions',
  
  // NBA Markets
  'Points': 'Points',
  'PTS': 'Points',
  'PTS Scored': 'Points',
  
  'Rebounds': 'Rebounds',
  'REB': 'Rebounds',
  'Boards': 'Rebounds',
  
  'Assists': 'Assists',
  'AST': 'Assists',
  'Dimes': 'Assists',
  
  'Steals': 'Steals',
  'STL': 'Steals',
  
  'Blocks': 'Blocks',
  'BLK': 'Blocks',
  'Swats': 'Blocks',
  
  'Turnovers': 'Turnovers',
  'TO': 'Turnovers',
  'TOV': 'Turnovers',
  
  '3-Pointers Made': '3-Pointers Made',
  '3PM': '3-Pointers Made',
  'Threes Made': '3-Pointers Made',
  '3PT Made': '3-Pointers Made',
  
  'Free Throws Made': 'Free Throws Made',
  'FTM': 'Free Throws Made',
  'FT Made': 'Free Throws Made',
  
  // MLB Markets
  'Hits': 'Hits',
  'H': 'Hits',
  
  'Runs': 'Runs',
  'R': 'Runs',
  
  'RBIs': 'RBIs',
  'RBI': 'RBIs',
  'Runs Batted In': 'RBIs',
  
  'Home Runs': 'Home Runs',
  'HR': 'Home Runs',
  'Homers': 'Home Runs',
  
  'Strikeouts': 'Strikeouts',
  'K': 'Strikeouts',
  'SO': 'Strikeouts',
  
  'Walks': 'Walks',
  'BB': 'Walks',
  'Base on Balls': 'Walks',
  
  // NHL Markets
  'Goals': 'Goals',
  'G': 'Goals',
  
  'Assists': 'Assists',
  'A': 'Assists',
  
  'Points': 'Points',
  'PTS': 'Points',
  
  'Shots': 'Shots',
  'SOG': 'Shots',
  'Shots on Goal': 'Shots',
  
  'Saves': 'Saves',
  'SV': 'Saves'
};

/**
 * Normalize team names to abbreviations
 */
function normalizeOpponent(teamName, league) {
  if (!teamName) return teamName;
  
  const leagueMap = TEAM_MAPS[league.toUpperCase()];
  if (!leagueMap) return teamName;
  
  return leagueMap[teamName] || teamName;
}

/**
 * Normalize market types to standard format
 */
function normalizeMarketType(market) {
  if (!market) return "";
  
  // Direct mapping first
  if (MARKET_TYPE_MAP[market]) {
    return MARKET_TYPE_MAP[market];
  }
  
  // Case-insensitive partial matching
  const lower = market.toLowerCase();
  
  // NFL specific patterns
  if (lower.includes("pass yard")) return "Passing Yards";
  if (lower.includes("rush yard")) return "Rushing Yards";
  if (lower.includes("rec yard")) return "Receiving Yards";
  if (lower.includes("pass td")) return "Passing TDs";
  if (lower.includes("rush td")) return "Rushing TDs";
  if (lower.includes("rec td")) return "Receiving TDs";
  if (lower.includes("comp")) return "Passing Completions";
  if (lower.includes("att") && lower.includes("pass")) return "Passing Attempts";
  if (lower.includes("int")) return "Interceptions";
  if (lower.includes("reception")) return "Receptions";
  
  // NBA specific patterns
  if (lower.includes("point")) return "Points";
  if (lower.includes("rebound")) return "Rebounds";
  if (lower.includes("assist")) return "Assists";
  if (lower.includes("steal")) return "Steals";
  if (lower.includes("block")) return "Blocks";
  if (lower.includes("turnover")) return "Turnovers";
  if (lower.includes("3") && lower.includes("point")) return "3-Pointers Made";
  if (lower.includes("free throw")) return "Free Throws Made";
  
  // MLB specific patterns
  if (lower.includes("hit") && !lower.includes("home run")) return "Hits";
  if (lower.includes("run") && !lower.includes("rbi")) return "Runs";
  if (lower.includes("rbi")) return "RBIs";
  if (lower.includes("home run")) return "Home Runs";
  if (lower.includes("strikeout")) return "Strikeouts";
  if (lower.includes("walk")) return "Walks";
  
  // NHL specific patterns
  if (lower.includes("goal") && !lower.includes("shot")) return "Goals";
  if (lower.includes("assist") && !lower.includes("goal")) return "Assists";
  if (lower.includes("shot") && !lower.includes("goal")) return "Shots";
  if (lower.includes("save")) return "Saves";
  
  // Return original if no match found
  return market;
}

/**
 * Normalize player ID
 */
function normalizePlayerId(playerName) {
  if (!playerName) return "";
  return playerName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parse odds string to integer
 */
function parseOdds(oddsStr) {
  if (!oddsStr) return null;
  
  // Handle common formats: "+150", "-110", "150", "-110"
  const clean = oddsStr.toString().trim();
  
  // If it's already a number, return it
  if (!isNaN(clean)) {
    return parseInt(clean);
  }
  
  // Handle +/- format
  const match = clean.match(/^([+-]?)(\d+)$/);
  if (match) {
    const sign = match[1] === '-' ? -1 : 1;
    const value = parseInt(match[2]);
    return sign * value;
  }
  
  return null;
}

/**
 * Ingest prop lines for a specific league
 */
async function ingestLeagueProps(league) {
  console.log(`📊 Fetching prop lines for ${league.toUpperCase()}...`);
  
  if (!API_KEY) {
    throw new Error('SPORTSGAMEODDS_API_KEY not found in environment variables');
  }
  
  let nextCursor = null;
  let total = 0;
  let page = 1;
  
  do {
    try {
      const url = `https://api.sportsgameodds.com/v1/${league}/props?limit=100${nextCursor ? `&cursor=${nextCursor}` : ""}`;
      
      console.log(`  📄 Fetching page ${page}...`);
      
      const res = await fetch(url, { 
        headers: { 'x-api-key': API_KEY } 
      });
      
      if (!res.ok) {
        console.error(`❌ API request failed for ${league} page ${page}: ${res.status} ${res.statusText}`);
        break;
      }
      
      const data = await res.json();
      
      if (!data.props || data.props.length === 0) {
        console.log(`  ℹ️ No props found for ${league.toUpperCase()} page ${page}`);
        break;
      }
      
      console.log(`  📝 Processing ${data.props.length} props from page ${page}...`);
      
      const rows = [];
      
      for (const prop of data.props) {
        try {
          // Validate required fields
          if (!prop.player || !prop.player.id || !prop.player.name) {
            console.log(`  ⚠️ Skipping prop with missing player data`);
            continue;
          }
          
          if (!prop.market || !prop.line) {
            console.log(`  ⚠️ Skipping prop with missing market/line data`);
            continue;
          }
          
          // Normalize data
          const normalizedMarketType = normalizeMarketType(prop.market);
          const normalizedPlayerId = normalizePlayerId(prop.player.name);
          const normalizedTeam = normalizeOpponent(prop.team, league);
          const normalizedOpponent = normalizeOpponent(prop.opponent, league);
          
          // Parse odds
          const overOdds = parseOdds(prop.overOdds);
          const underOdds = parseOdds(prop.underOdds);
          
          rows.push({
            player_id: normalizedPlayerId,
            player_name: prop.player.name,
            team: normalizedTeam,
            opponent: normalizedOpponent,
            season: prop.season || new Date().getFullYear(),
            date: prop.date,
            prop_type: normalizedMarketType,
            line: Number(prop.line),
            over_odds: overOdds,
            under_odds: underOdds,
            sportsbook: prop.sportsbook || "Consensus",
            league: league.toLowerCase(),
            game_id: prop.gameId || null,
            position: prop.player.position || null,
            is_active: true
          });
          
        } catch (error) {
          console.error(`  ❌ Error processing prop:`, error);
          continue;
        }
      }
      
      if (rows.length > 0) {
        console.log(`  💾 Upserting ${rows.length} prop lines...`);
        
        const { error } = await supabase.from("PropLines")
          .upsert(rows, { 
            onConflict: ['player_id', 'date', 'prop_type', 'sportsbook', 'line'],
            ignoreDuplicates: false
          });
        
        if (error) {
          console.error(`  ❌ Insert error for ${league} page ${page}:`, error);
        } else {
          total += rows.length;
          console.log(`  ✅ Upserted ${rows.length} prop lines (total ${total})`);
        }
      }
      
      nextCursor = data.nextCursor;
      page++;
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error fetching ${league} page ${page}:`, error);
      break;
    }
    
  } while (nextCursor);
  
  console.log(`✅ Finished ${league.toUpperCase()} prop ingestion: ${total} rows`);
  return total;
}

/**
 * Main ingestion function
 */
async function ingestPropLines() {
  console.log("🎯 Starting PropLines ingestion...");
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('=' .repeat(60));
  
  const results = {};
  let totalRecords = 0;
  
  for (const league of LEAGUES) {
    try {
      const count = await ingestLeagueProps(league);
      results[league] = count;
      totalRecords += count;
      
      // Small delay between leagues
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Failed to process ${league}:`, error);
      results[league] = 0;
      continue;
    }
  }
  
  // Summary
  console.log('\n📊 PropLines Ingestion Summary:');
  console.log('=' .repeat(40));
  
  for (const [league, count] of Object.entries(results)) {
    console.log(`${league.toUpperCase()}: ${count} records`);
  }
  
  console.log(`\n🎉 Total: ${totalRecords} prop lines ingested`);
  console.log('✅ PropLines ingestion complete!');
  
  return { results, totalRecords };
}

/**
 * Main execution function
 */
async function main() {
  try {
    await ingestPropLines();
    process.exit(0);
  } catch (error) {
    console.error('❌ PropLines ingestion failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ingestPropLines, ingestLeagueProps };
