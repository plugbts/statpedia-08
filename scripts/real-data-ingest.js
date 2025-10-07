/**
 * Real Data Ingestion Script
 * Fetches actual box scores from SportsGameOdds API and populates PlayerGameLogs
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';
const API_KEY = process.env.SPORTSGAMEODDS_API_KEY || 'd5dc1f00bc42133550bc1605dd8f457f';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Normalization mappings
const TEAM_NORMALIZATION = {
  'Kansas City Chiefs': 'KC',
  'Buffalo Bills': 'BUF',
  'Baltimore Ravens': 'BAL',
  'Dallas Cowboys': 'DAL',
  'Green Bay Packers': 'GB',
  'Tampa Bay Buccaneers': 'TB',
  'San Francisco 49ers': 'SF',
  'Tennessee Titans': 'TEN',
  'New York Giants': 'NYG',
  'Philadelphia Eagles': 'PHI',
  'Miami Dolphins': 'MIA',
  'Las Vegas Raiders': 'LV',
  'Los Angeles Rams': 'LAR',
  'Jacksonville Jaguars': 'JAX',
  'Denver Broncos': 'DEN',
  'Los Angeles Chargers': 'LAC',
  'New England Patriots': 'NE',
  'New York Jets': 'NYJ',
  'Cincinnati Bengals': 'CIN',
  'Pittsburgh Steelers': 'PIT',
  'Cleveland Browns': 'CLE',
  'Houston Texans': 'HOU',
  'Indianapolis Colts': 'IND',
  'Atlanta Falcons': 'ATL',
  'Carolina Panthers': 'CAR',
  'New Orleans Saints': 'NO',
  'Arizona Cardinals': 'ARI',
  'Seattle Seahawks': 'SEA',
  'Washington Commanders': 'WAS',
  'Chicago Bears': 'CHI',
  'Detroit Lions': 'DET',
  'Minnesota Vikings': 'MIN'
};

const PROP_TYPE_NORMALIZATION = {
  'Passing Yards': 'Passing Yards',
  'Passing Touchdowns': 'Passing Touchdowns',
  'Passing Completions': 'Passing Completions',
  'Passing Attempts': 'Passing Attempts',
  'Rushing Yards': 'Rushing Yards',
  'Rushing Touchdowns': 'Rushing Touchdowns',
  'Rushing Attempts': 'Rushing Attempts',
  'Receiving Yards': 'Receiving Yards',
  'Receiving Receptions': 'Receiving Receptions',
  'Receiving Touchdowns': 'Receiving Touchdowns',
  'Field Goals Made': 'Field Goals Made',
  'Field Goals Attempted': 'Field Goals Attempted',
  'Extra Points Made': 'Extra Points Made',
  'Longest Completion': 'Longest Completion',
  'Longest Rush': 'Longest Rush',
  'Longest Reception': 'Longest Reception'
};

const POSITION_MAPPING = {
  'QB': 'QB',
  'RB': 'RB',
  'WR': 'WR',
  'TE': 'TE',
  'K': 'K',
  'DEF': 'DEF'
};

function normalizeOpponent(teamName, league = 'NFL') {
  if (!teamName) return 'UNK';
  
  // Direct mapping
  if (TEAM_NORMALIZATION[teamName]) {
    return TEAM_NORMALIZATION[teamName];
  }
  
  // Try to extract abbreviation from common patterns
  const words = teamName.split(' ');
  if (words.length >= 2) {
    const lastWord = words[words.length - 1];
    if (lastWord.length <= 4) {
      return lastWord.toUpperCase();
    }
  }
  
  // Fallback: first 3 characters
  return teamName.substring(0, 3).toUpperCase();
}

function normalizeMarketType(statType) {
  if (!statType) return 'Unknown';
  
  // Direct mapping
  if (PROP_TYPE_NORMALIZATION[statType]) {
    return PROP_TYPE_NORMALIZATION[statType];
  }
  
  // Try to match common patterns
  const lowerStat = statType.toLowerCase();
  if (lowerStat.includes('passing') && lowerStat.includes('yard')) return 'Passing Yards';
  if (lowerStat.includes('passing') && lowerStat.includes('touchdown')) return 'Passing Touchdowns';
  if (lowerStat.includes('rushing') && lowerStat.includes('yard')) return 'Rushing Yards';
  if (lowerStat.includes('rushing') && lowerStat.includes('touchdown')) return 'Rushing Touchdowns';
  if (lowerStat.includes('receiving') && lowerStat.includes('yard')) return 'Receiving Yards';
  if (lowerStat.includes('receiving') && lowerStat.includes('reception')) return 'Receiving Receptions';
  if (lowerStat.includes('receiving') && lowerStat.includes('touchdown')) return 'Receiving Touchdowns';
  if (lowerStat.includes('field goal')) return 'Field Goals Made';
  
  return statType; // Return as-is if no match
}

function normalizePosition(position) {
  if (!position) return 'UNK';
  return POSITION_MAPPING[position] || position;
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

async function processEventForPlayerLogs(event, season) {
  const gameLogs = [];
  
  // Extract basic game info
  const gameDate = event.status?.startsAt ? 
    new Date(event.status.startsAt).toISOString().split('T')[0] : 
    new Date().toISOString().split('T')[0];
  
  const homeTeam = event.teams?.home?.names?.long || event.homeTeam || 'Unknown';
  const awayTeam = event.teams?.away?.names?.long || event.awayTeam || 'Unknown';
  const homeTeamAbbr = normalizeOpponent(homeTeam);
  const awayTeamAbbr = normalizeOpponent(awayTeam);
  
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
                position: normalizePosition(playerStats.position),
                sport: 'nfl'
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
          position: normalizePosition(prop.position),
          sport: 'nfl'
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
    return;
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
    console.log(`🚀 Starting real data ingestion for ${league} ${season}`);
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
        const gameLogs = await processEventForPlayerLogs(event, season);
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
      .limit(5);
    
    if (verifyError) {
      console.error('❌ Error verifying saved data:', verifyError);
    } else {
      console.log('✅ Verification successful. Sample data:');
      console.table(savedData);
    }
    
    // Test analytics with real data
    console.log('\n🧪 Testing analytics with real data...');
    await testAnalyticsWithRealData();
    
    console.log('🎉 Real data ingestion completed!');
    console.log(`📊 Saved ${savedCount} game logs for ${league} ${season}`);
    
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    throw error;
  }
}

async function testAnalyticsWithRealData() {
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
  
  console.log(`🏈 Starting real data ingestion: ${league} ${season} (limit: ${limit})`);
  
  ingestPlayerGameLogs(league, season, limit)
    .then(() => {
      console.log('✅ Real data ingestion completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Real data ingestion failed:', error);
      process.exit(1);
    });
}

export { ingestPlayerGameLogs, fetchEventsWithBoxScores, processEventForPlayerLogs };
