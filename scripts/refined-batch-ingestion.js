/**
 * Batch ingestion script for SportsGameOdds → Supabase
 * Covers NFL, NBA, MLB, NHL with full team maps
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI'
);

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;

const LEAGUES = ["nfl", "nba", "mlb", "nhl"];
const SEASONS = [2022, 2023, 2024, 2025];

async function ingestAll() {
  console.log('🚀 Starting batch ingestion for all leagues and seasons...\n');
  
  for (const league of LEAGUES) {
    for (const season of SEASONS) {
      console.log(`Ingesting ${league.toUpperCase()} ${season}...`);
      await ingestSeason(league, season);
      
      // Small delay between seasons to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Delay between leagues
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✅ Batch ingestion complete!');
}

async function ingestSeason(league, season) {
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

      const rows = [];
      for (const event of data.events || []) {
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
            
            rows.push({
              player_id: normalizePlayerId(player.name),
              player_name: player.name,
              team: playerTeam,
              opponent: opponent,
              season,
              date: event.date,
              prop_type: normalizeMarketType(statType),
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
          console.error("❌ Insert error:", error);
        } else {
          total += rows.length;
          console.log(`✅ Inserted ${rows.length} rows (total ${total})`);
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

// --- Normalization helpers with full maps ---

function normalizeOpponent(team, league) {
  if (!team) return "";
  if (team.length <= 3) return team.toUpperCase();

  const maps = {
    NFL: {
      "Arizona Cardinals": "ARI", "Atlanta Falcons": "ATL", "Baltimore Ravens": "BAL", "Buffalo Bills": "BUF",
      "Carolina Panthers": "CAR", "Chicago Bears": "CHI", "Cincinnati Bengals": "CIN", "Cleveland Browns": "CLE",
      "Dallas Cowboys": "DAL", "Denver Broncos": "DEN", "Detroit Lions": "DET", "Green Bay Packers": "GB",
      "Houston Texans": "HOU", "Indianapolis Colts": "IND", "Jacksonville Jaguars": "JAX", "Kansas City Chiefs": "KC",
      "Las Vegas Raiders": "LV", "Los Angeles Chargers": "LAC", "Los Angeles Rams": "LAR", "Miami Dolphins": "MIA",
      "Minnesota Vikings": "MIN", "New England Patriots": "NE", "New Orleans Saints": "NO", "New York Giants": "NYG",
      "New York Jets": "NYJ", "Philadelphia Eagles": "PHI", "Pittsburgh Steelers": "PIT", "San Francisco 49ers": "SF",
      "Seattle Seahawks": "SEA", "Tampa Bay Buccaneers": "TB", "Tennessee Titans": "TEN", "Washington Commanders": "WAS"
    },
    NBA: {
      "Atlanta Hawks": "ATL", "Boston Celtics": "BOS", "Brooklyn Nets": "BKN", "Charlotte Hornets": "CHA",
      "Chicago Bulls": "CHI", "Cleveland Cavaliers": "CLE", "Dallas Mavericks": "DAL", "Denver Nuggets": "DEN",
      "Detroit Pistons": "DET", "Golden State Warriors": "GSW", "Houston Rockets": "HOU", "Indiana Pacers": "IND",
      "LA Clippers": "LAC", "Los Angeles Lakers": "LAL", "Memphis Grizzlies": "MEM", "Miami Heat": "MIA",
      "Milwaukee Bucks": "MIL", "Minnesota Timberwolves": "MIN", "New Orleans Pelicans": "NOP", "New York Knicks": "NYK",
      "Oklahoma City Thunder": "OKC", "Orlando Magic": "ORL", "Philadelphia 76ers": "PHI", "Phoenix Suns": "PHX",
      "Portland Trail Blazers": "POR", "Sacramento Kings": "SAC", "San Antonio Spurs": "SAS", "Toronto Raptors": "TOR",
      "Utah Jazz": "UTA", "Washington Wizards": "WAS"
    },
    MLB: {
      "Arizona Diamondbacks": "ARI", "Atlanta Braves": "ATL", "Baltimore Orioles": "BAL", "Boston Red Sox": "BOS",
      "Chicago Cubs": "CHC", "Chicago White Sox": "CWS", "Cincinnati Reds": "CIN", "Cleveland Guardians": "CLE",
      "Colorado Rockies": "COL", "Detroit Tigers": "DET", "Houston Astros": "HOU", "Kansas City Royals": "KC",
      "Los Angeles Angels": "LAA", "Los Angeles Dodgers": "LAD", "Miami Marlins": "MIA", "Milwaukee Brewers": "MIL",
      "Minnesota Twins": "MIN", "New York Mets": "NYM", "New York Yankees": "NYY", "Oakland Athletics": "OAK",
      "Philadelphia Phillies": "PHI", "Pittsburgh Pirates": "PIT", "San Diego Padres": "SD", "San Francisco Giants": "SF",
      "Seattle Mariners": "SEA", "St. Louis Cardinals": "STL", "Tampa Bay Rays": "TB", "Texas Rangers": "TEX",
      "Toronto Blue Jays": "TOR", "Washington Nationals": "WSH"
    },
    NHL: {
      "Anaheim Ducks": "ANA", "Arizona Coyotes": "ARI", "Boston Bruins": "BOS", "Buffalo Sabres": "BUF",
      "Calgary Flames": "CGY", "Carolina Hurricanes": "CAR", "Chicago Blackhawks": "CHI", "Colorado Avalanche": "COL",
      "Columbus Blue Jackets": "CBJ", "Dallas Stars": "DAL", "Detroit Red Wings": "DET", "Edmonton Oilers": "EDM",
      "Florida Panthers": "FLA", "Los Angeles Kings": "LAK", "Minnesota Wild": "MIN", "Montreal Canadiens": "MTL",
      "Nashville Predators": "NSH", "New Jersey Devils": "NJD", "New York Islanders": "NYI", "New York Rangers": "NYR",
      "Ottawa Senators": "OTT", "Philadelphia Flyers": "PHI", "Pittsburgh Penguins": "PIT", "San Jose Sharks": "SJ",
      "Seattle Kraken": "SEA", "St. Louis Blues": "STL", "Tampa Bay Lightning": "TB", "Toronto Maple Leafs": "TOR",
      "Vancouver Canucks": "VAN", "Vegas Golden Knights": "VGK", "Washington Capitals": "WSH", "Winnipeg Jets": "WPG"
    }
  };

  const leagueMap = maps[league.toUpperCase()];
  if (!leagueMap) return team.toUpperCase();
  
  // Direct mapping
  if (leagueMap[team]) return leagueMap[team];
  
  // Try partial matching
  for (const [fullName, abbr] of Object.entries(leagueMap)) {
    if (fullName.toLowerCase().includes(team.toLowerCase()) ||
        team.toLowerCase().includes(fullName.toLowerCase())) {
      return abbr;
    }
  }
  
  return team.toUpperCase();
}

function normalizeMarketType(market) {
  if (!market) return "";
  
  const lower = market.toLowerCase();
  
  // NFL - More specific patterns first
  if (lower.includes("passing_yards") || lower.includes("pass_yards")) return "Passing Yards";
  if (lower.includes("rushing_yards") || lower.includes("rush_yards")) return "Rushing Yards";
  if (lower.includes("receiving_yards") || lower.includes("rec_yards")) return "Receiving Yards";
  if (lower.includes("passing_completions") || lower.includes("completions")) return "Passing Completions";
  if (lower.includes("passing_attempts") || lower.includes("attempts")) return "Passing Attempts";
  if (lower.includes("passing_touchdowns") || lower.includes("pass_td")) return "Passing Touchdowns";
  if (lower.includes("rushing_touchdowns") || lower.includes("rush_td")) return "Rushing Touchdowns";
  if (lower.includes("receiving_touchdowns") || lower.includes("rec_td")) return "Receiving Touchdowns";
  if (lower.includes("receptions")) return "Receptions";
  if (lower.includes("interceptions")) return "Interceptions";
  if (lower.includes("fumbles")) return "Fumbles Lost";
  
  // NBA
  if (lower.includes("points")) return "Points";
  if (lower.includes("rebounds")) return "Rebounds";
  if (lower.includes("assists")) return "Assists";
  if (lower.includes("steals")) return "Steals";
  if (lower.includes("blocks")) return "Blocks";
  if (lower.includes("three_pointers_made") || lower.includes("3pt")) return "Three Pointers Made";
  if (lower.includes("free_throws_made") || lower.includes("ft")) return "Free Throws Made";
  if (lower.includes("turnovers")) return "Turnovers";
  
  // MLB - More specific patterns
  if (lower.includes("home_runs") || lower.includes("hr")) return "Home Runs";
  if (lower.includes("runs_batted_in") || lower.includes("rbi")) return "Runs Batted In";
  if (lower.includes("hits") && !lower.includes("home")) return "Hits";
  if (lower.includes("runs") && !lower.includes("batted") && !lower.includes("home")) return "Runs";
  if (lower.includes("stolen_bases") || lower.includes("sb")) return "Stolen Bases";
  if (lower.includes("walks") || lower.includes("bb")) return "Walks";
  if (lower.includes("strikeouts") || lower.includes("so")) return "Strikeouts";
  
  // NHL - More specific patterns
  if (lower.includes("goals") && !lower.includes("shot") && !lower.includes("play")) return "Goals";
  if (lower.includes("shots_on_goal") || lower.includes("sog")) return "Shots on Goal";
  if (lower.includes("power_play_goals") || lower.includes("ppg")) return "Power Play Goals";
  
  // Fallback - capitalize and format
  return market.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function normalizePlayerId(playerName) {
  if (!playerName) return 'unknown-player';
  
  return playerName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  ingestAll().catch(console.error);
}

export { ingestAll, ingestSeason, normalizeOpponent, normalizeMarketType, normalizePlayerId };
