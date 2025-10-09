/**
 * Comprehensive Data Ingestion Script
 * Fetches real box scores from SportsGameOdds API with multi-league support
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';
const API_KEY = process.env.SPORTSGAMEODDS_API_KEY || 'f05c244cbea5222d806f91c412350940';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Multi-league team normalization
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
    "Philadelphia Flyers": "PHI", "Pittsburgh Penguins": "PIT", "San Jose Sharks": "SJS", 
    "Seattle Kraken": "SEA", "St. Louis Blues": "STL", "Tampa Bay Lightning": "TBL", 
    "Toronto Maple Leafs": "TOR", "Vancouver Canucks": "VAN", "Vegas Golden Knights": "VGK", 
    "Washington Capitals": "WSH", "Winnipeg Jets": "WPG" 
  }
};

function normalizeOpponent(team, league = 'NFL') {
  if (!team) return "";
  if (team.length <= 3) return team.toUpperCase();
  return TEAM_MAPS[league.toUpperCase()]?.[team] || team.toUpperCase();
}

function normalizeMarketType(market) {
  if (!market) return "";
  const lower = market.toLowerCase();
  
  // NFL specific
  if (lower.includes("pass yard")) return "Passing Yards";
  if (lower.includes("rush yard")) return "Rushing Yards";
  if (lower.includes("rec yard")) return "Receiving Yards";
  if (lower.includes("passing yards")) return "Passing Yards";
  if (lower.includes("rushing yards")) return "Rushing Yards";
  if (lower.includes("receiving yards")) return "Receiving Yards";
  if (lower.includes("passing touchdowns")) return "Passing Touchdowns";
  if (lower.includes("rushing touchdowns")) return "Rushing Touchdowns";
  if (lower.includes("receiving touchdowns")) return "Receiving Touchdowns";
  if (lower.includes("passing completions")) return "Passing Completions";
  if (lower.includes("passing attempts")) return "Passing Attempts";
  if (lower.includes("receiving receptions")) return "Receiving Receptions";
  if (lower.includes("field goals made")) return "Field Goals Made";
  if (lower.includes("field goals attempted")) return "Field Goals Attempted";
  if (lower.includes("extra points made")) return "Extra Points Made";
  if (lower.includes("longest completion")) return "Longest Completion";
  if (lower.includes("longest rush")) return "Longest Rush";
  if (lower.includes("longest reception")) return "Longest Reception";
  
  // NBA specific
  if (lower.includes("points")) return "Points";
  if (lower.includes("rebounds")) return "Rebounds";
  if (lower.includes("assists")) return "Assists";
  if (lower.includes("steals")) return "Steals";
  if (lower.includes("blocks")) return "Blocks";
  if (lower.includes("three pointers")) return "Three Pointers";
  if (lower.includes("free throws")) return "Free Throws";
  
  // MLB specific
  if (lower.includes("hits")) return "Hits";
  if (lower.includes("runs")) return "Runs";
  if (lower.includes("rbis")) return "RBIs";
  if (lower.includes("home runs")) return "Home Runs";
  if (lower.includes("strikeouts")) return "Strikeouts";
  if (lower.includes("walks")) return "Walks";
  
  // NHL specific
  if (lower.includes("goals")) return "Goals";
  if (lower.includes("assists")) return "Assists";
  if (lower.includes("saves")) return "Saves";
  if (lower.includes("shots")) return "Shots";
  
  // Generic patterns
  if (lower.includes("comp")) return "Passing Completions";
  if (lower.includes("att")) return "Passing Attempts";
  if (lower.includes("td")) return "Touchdowns";
  
  return market;
}

function normalizePosition(position, league = 'NFL') {
  if (!position) return "UNK";
  
  const positionMaps = {
    NFL: {
      'QB': 'QB', 'Quarterback': 'QB',
      'RB': 'RB', 'Running Back': 'RB', 'Halfback': 'RB', 'Fullback': 'RB',
      'WR': 'WR', 'Wide Receiver': 'WR',
      'TE': 'TE', 'Tight End': 'TE',
      'K': 'K', 'Kicker': 'K',
      'DEF': 'DEF', 'Defense': 'DEF', 'D/ST': 'DEF'
    },
    NBA: {
      'PG': 'PG', 'Point Guard': 'PG',
      'SG': 'SG', 'Shooting Guard': 'SG',
      'SF': 'SF', 'Small Forward': 'SF',
      'PF': 'PF', 'Power Forward': 'PF',
      'C': 'C', 'Center': 'C'
    },
    MLB: {
      'P': 'P', 'Pitcher': 'P',
      'C': 'C', 'Catcher': 'C',
      '1B': '1B', 'First Base': '1B',
      '2B': '2B', 'Second Base': '2B',
      '3B': '3B', 'Third Base': '3B',
      'SS': 'SS', 'Shortstop': 'SS',
      'LF': 'LF', 'Left Field': 'LF',
      'CF': 'CF', 'Center Field': 'CF',
      'RF': 'RF', 'Right Field': 'RF',
      'DH': 'DH', 'Designated Hitter': 'DH'
    },
    NHL: {
      'G': 'G', 'Goalie': 'G', 'Goaltender': 'G',
      'D': 'D', 'Defenseman': 'D', 'Defenceman': 'D',
      'C': 'C', 'Center': 'C',
      'LW': 'LW', 'Left Wing': 'LW',
      'RW': 'RW', 'Right Wing': 'RW'
    }
  };
  
  const map = positionMaps[league.toUpperCase()] || positionMaps['NFL'];
  return map[position] || position.toUpperCase();
}

function normalizePlayerId(playerName) {
  if (!playerName) return 'unknown-player';
  return playerName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

async function fetchEventsWithBoxScores(league, season, limit = 100) {
  console.log(`📡 Fetching events for ${league} ${season} (limit: ${limit})...`);
  
  try {
    // Try the v2 events endpoint first
    const url = `https://api.sportsgameodds.com/v2/events?leagueID=${league}&season=${season}&marketOddsAvailable=true&limit=${limit}`;
    
    const response = await fetch(url, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.data?.length || 0} events from v2 API`);
    
    return data.data || [];
    
  } catch (error) {
    console.warn(`⚠️ v2 API failed, trying v1: ${error.message}`);
    
    try {
      // Fallback to v1 events endpoint
      const url = `https://api.sportsgameodds.com/v1/${league}/events?season=${season}&limit=${limit}`;
      
      const response = await fetch(url, {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`v1 API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Fetched ${data.events?.length || 0} events from v1 API`);
      
      return data.events || [];
      
    } catch (v1Error) {
      console.error(`❌ Both API versions failed:`, v1Error.message);
      throw v1Error;
    }
  }
}

async function processEventForPlayerLogs(event, season, league) {
  const gameLogs = [];
  
  // Extract basic game info
  const gameDate = event.status?.startsAt ? 
    new Date(event.status.startsAt).toISOString().split('T')[0] : 
    new Date().toISOString().split('T')[0];
  
  const homeTeam = event.teams?.home?.names?.long || event.homeTeam || 'Unknown';
  const awayTeam = event.teams?.away?.names?.long || event.awayTeam || 'Unknown';
  const homeTeamAbbr = normalizeOpponent(homeTeam, league);
  const awayTeamAbbr = normalizeOpponent(awayTeam, league);
  
  console.log(`🏈 Processing game: ${awayTeamAbbr} @ ${homeTeamAbbr} (${gameDate})`);
  
  // Process player stats if available
  if (event.playerStats) {
    for (const [playerId, playerStats] of Object.entries(event.playerStats)) {
      const playerName = playerStats.name || playerId;
      const normalizedPlayerId = normalizePlayerId(playerName);
      
      // Determine which team the player is on
      const playerTeam = playerStats.team === homeTeam || playerStats.team === homeTeamAbbr ? homeTeamAbbr : awayTeamAbbr;
      const opponent = playerStats.team === homeTeam || playerStats.team === homeTeamAbbr ? awayTeamAbbr : homeTeamAbbr;
      
      // Process each stat category
      const statCategories = ['passing', 'rushing', 'receiving', 'kicking'];
      
      for (const category of statCategories) {
        if (playerStats[category] && typeof playerStats[category] === 'object') {
          const stats = playerStats[category];
          
          // Map stats to prop types
          const statMappings = {
            passing: {
              'Passing Yards': stats.yards,
              'Passing Touchdowns': stats.touchdowns,
              'Passing Completions': stats.completions,
              'Passing Attempts': stats.attempts,
              'Longest Completion': stats.longestCompletion
            },
            rushing: {
              'Rushing Yards': stats.yards,
              'Rushing Touchdowns': stats.touchdowns,
              'Rushing Attempts': stats.attempts,
              'Longest Rush': stats.longestRush
            },
            receiving: {
              'Receiving Yards': stats.yards,
              'Receiving Receptions': stats.receptions,
              'Receiving Touchdowns': stats.touchdowns,
              'Longest Reception': stats.longestReception
            },
            kicking: {
              'Field Goals Made': stats.fieldGoalsMade,
              'Field Goals Attempted': stats.fieldGoalsAttempted,
              'Extra Points Made': stats.extraPointsMade
            }
          };
          
          const mappings = statMappings[category] || {};
          
          for (const [propType, value] of Object.entries(mappings)) {
            if (value !== undefined && value !== null && !isNaN(value) && value >= 0) {
              gameLogs.push({
                player_id: normalizedPlayerId,
                player_name: playerName,
                team: playerTeam,
                opponent: opponent,
                season: season,
                date: gameDate,
                prop_type: normalizeMarketType(propType),
                value: parseFloat(value),
                position: normalizePosition(playerStats.position, league),
                sport: league.toLowerCase()
              });
            }
          }
        }
      }
    }
  }
  
  // Process player props from odds if available
  if (event.odds && event.odds.playerProps) {
    for (const prop of event.odds.playerProps) {
      if (prop.playerName && prop.statValue !== undefined && prop.statValue !== null) {
        const normalizedPlayerId = normalizePlayerId(prop.playerName);
        const propType = normalizeMarketType(prop.statName || prop.propType);
        
        // Try to determine team from player name or prop context
        const playerTeam = homeTeamAbbr; // Default fallback
        const opponent = awayTeamAbbr;
        
        gameLogs.push({
          player_id: normalizedPlayerId,
          player_name: prop.playerName,
          team: playerTeam,
          opponent: opponent,
          season: season,
          date: gameDate,
          prop_type: propType,
          value: parseFloat(prop.statValue),
          position: normalizePosition(prop.position, league),
          sport: league.toLowerCase()
        });
      }
    }
  }
  
  console.log(`📊 Generated ${gameLogs.length} player game logs for this event`);
  return gameLogs;
}

async function savePlayerGameLogs(gameLogs) {
  if (gameLogs.length === 0) {
    console.log('📭 No game logs to save');
    return 0;
  }
  
  console.log(`💾 Saving ${gameLogs.length} player game logs to database...`);
  
  // Batch insert in chunks of 100
  const chunkSize = 100;
  let savedCount = 0;
  
  for (let i = 0; i < gameLogs.length; i += chunkSize) {
    const chunk = gameLogs.slice(i, i + chunkSize);
    
    const { error } = await supabase
      .from('playergamelogs')
      .upsert(chunk, { 
        onConflict: 'player_id,date,prop_type',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error(`❌ Error saving chunk ${i}-${i + chunkSize}:`, error);
    } else {
      savedCount += chunk.length;
      console.log(`✅ Saved chunk ${i + 1}-${Math.min(i + chunkSize, gameLogs.length)} (${savedCount} total)`);
    }
  }
  
  return savedCount;
}

async function ingestPlayerGameLogs(league = 'NFL', season = 2025, limit = 100) {
  try {
    console.log(`🚀 Starting comprehensive data ingestion for ${league} ${season}`);
    console.log(`📊 Limit: ${limit} events`);
    console.log(`🔑 Using API key: ${API_KEY.substring(0, 8)}...`);
    
    // Fetch events
    const events = await fetchEventsWithBoxScores(league, season, limit);
    
    if (events.length === 0) {
      console.log('❌ No events found');
      return;
    }
    
    console.log(`📈 Processing ${events.length} events...`);
    
    // Process each event
    let totalGameLogs = [];
    let processedEvents = 0;
    
    for (const event of events) {
      try {
        const gameLogs = await processEventForPlayerLogs(event, season, league);
        totalGameLogs = totalGameLogs.concat(gameLogs);
        processedEvents++;
        
        if (processedEvents % 10 === 0) {
          console.log(`📊 Processed ${processedEvents}/${events.length} events (${totalGameLogs.length} game logs so far)`);
        }
      } catch (error) {
        console.error(`❌ Error processing event ${event.eventID || 'unknown'}:`, error.message);
      }
    }
    
    console.log(`📈 Total game logs generated: ${totalGameLogs.length} from ${processedEvents} events`);
    
    // Save to database
    const savedCount = await savePlayerGameLogs(totalGameLogs);
    
    // Verify data was saved
    const { data: savedData, error: verifyError } = await supabase
      .from('playergamelogs')
      .select('*')
      .eq('season', season)
      .eq('sport', league.toLowerCase())
      .limit(5);
    
    if (verifyError) {
      console.error('❌ Error verifying saved data:', verifyError);
    } else {
      console.log('✅ Verification successful. Sample data:');
      console.table(savedData);
    }
    
    // Test analytics with real data
    console.log('\n🧪 Testing analytics with real data...');
    await testAnalyticsWithRealData(league);
    
    console.log('🎉 Comprehensive data ingestion completed!');
    console.log(`📊 Saved ${savedCount} game logs for ${league} ${season}`);
    
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    throw error;
  }
}

async function testAnalyticsWithRealData(league) {
  try {
    // Test hit rate calculation
    const { data: hitRate } = await supabase.rpc('calculate_hit_rate', {
      p_player_id: 'mahomes-patrick',
      p_prop_type: 'Passing Yards',
      p_line: 275,
      p_direction: 'over',
      p_games_limit: 10
    });
    
    if (hitRate && hitRate[0]) {
      console.log(`✅ Patrick Mahomes Passing Yards 275+ over: ${hitRate[0].hits}/${hitRate[0].total} (${(hitRate[0].hit_rate * 100).toFixed(1)}%)`);
    }
    
    // Test defensive rank
    const { data: defensiveRank } = await supabase.rpc('get_defensive_rank', {
      p_team: 'KC',
      p_opponent: 'JAX',
      p_prop_type: 'Passing Yards',
      p_position: 'QB',
      p_season: 2025
    });
    
    if (defensiveRank && defensiveRank[0]) {
      console.log(`✅ Defensive Rank KC vs JAX: ${defensiveRank[0].display}`);
    }
    
    // Test streak calculation
    const { data: streak } = await supabase.rpc('calculate_streak', {
      p_player_id: 'mahomes-patrick',
      p_prop_type: 'Passing Yards',
      p_line: 275,
      p_direction: 'over'
    });
    
    if (streak && streak[0]) {
      console.log(`✅ Patrick Mahomes streak: ${streak[0].current_streak} (${streak[0].streak_direction})`);
    }
    
  } catch (error) {
    console.error('❌ Analytics test failed:', error);
  }
}

// Run the ingestion
if (import.meta.url === `file://${process.argv[1]}`) {
  const league = process.argv[2] || 'NFL';
  const season = parseInt(process.argv[3]) || 2025;
  const limit = parseInt(process.argv[4]) || 100;
  
  console.log(`🏈 Starting comprehensive data ingestion: ${league} ${season} (limit: ${limit})`);
  
  ingestPlayerGameLogs(league, season, limit)
    .then(() => {
      console.log('✅ Comprehensive data ingestion completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Comprehensive data ingestion failed:', error);
      process.exit(1);
    });
}

export { ingestPlayerGameLogs, fetchEventsWithBoxScores, processEventForPlayerLogs };
