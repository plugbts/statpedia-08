/**
 * Real Data Ingestion Script
 * Fetches actual box scores from SportsGameOdds API and populates PlayerGameLogs
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';
const API_KEY = process.env.SPORTSGAMEODDS_API_KEY || 'f05c244cbea5222d806f91c412350940';

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
    // Try the v2 events endpoint first with player props
    const url = `https://api.sportsgameodds.com/v2/events?leagueID=${league}&season=${season}&marketOddsAvailable=true&playerProps=true&limit=${limit}`;
    
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
    
    // Add debug logging to see API response structure
    if (data.data && data.data.length > 0) {
      console.log('🔍 DEBUG: Found', data.data.length, 'events with markets data');
    }
    
    return data.data || [];
    
  } catch (error) {
    console.warn(`⚠️ v2 API failed, trying v1: ${error.message}`);
    
    try {
      // Fallback to v1 events endpoint with player props
      const url = `https://api.sportsgameodds.com/v1/${league}/events?season=${season}&playerProps=true&limit=${limit}`;
      
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
      
      // Add debug logging to see API response structure
      if (data.events && data.events.length > 0) {
        console.log('🔍 DEBUG: Found', data.events.length, 'events with markets data (v1)');
      }
      
      return data.events || [];
      
    } catch (v1Error) {
      console.error(`❌ Both API versions failed:`, v1Error.message);
      throw v1Error;
    }
  }
}

async function processEventForPlayerLogs(event, season) {
  const props = [];
  
  // Filter events by status as you suggested
  // Skip cancelled events, but allow completed events (they have player props)
  if (event.status?.cancelled) {
    return props;
  }
  
  // Extract basic game info
  const gameDate = event.status?.startsAt ? 
    new Date(event.status.startsAt).toISOString().split('T')[0] : 
    new Date().toISOString().split('T')[0];
  
  const homeTeam = event.teams?.home?.names?.long || event.homeTeam || 'Unknown';
  const awayTeam = event.teams?.away?.names?.long || event.awayTeam || 'Unknown';
  const homeTeamAbbr = normalizeOpponent(homeTeam);
  const awayTeamAbbr = normalizeOpponent(awayTeam);
  
  console.log(`🏈 Processing game: ${awayTeamAbbr} @ ${homeTeamAbbr} (${gameDate}) - Status: ${JSON.stringify(event.status)}`);
  
  // Process markets (player props) as you suggested
  // The markets are in event.odds, not directly in the event object
  const odds = event.odds || {};
  const oddsKeys = Object.keys(odds);
  console.log(`🔍 Odds keys: ${oddsKeys.slice(0, 10).join(', ')}...`);
  
  // Let's check if there are player prop keys in the entire event object
  const allEventKeys = Object.keys(event);
  const playerPropKeys = allEventKeys.filter(key => 
    key.includes('_NFL') && key.includes('-')
  );
  
  console.log(`🔍 Found ${playerPropKeys.length} player prop keys in event`);
  if (playerPropKeys.length > 0) {
    console.log(`🔍 Sample player prop keys: ${playerPropKeys.slice(0, 3).join(', ')}`);
  }
  
  for (const marketKey of playerPropKeys) {
    const market = event[marketKey];
    
    // Skip if not a player prop market
    if (!market.playerID || !market.statID || !market.marketName) {
      continue;
    }
    
    console.log(`📊 Processing market: ${market.marketName} (${market.statID})`);
    
    // Extract player info
    const playerId = market.playerID;
    const playerName = market.marketName.split(' ')[0] + ' ' + (market.marketName.split(' ')[1] || '');
    const statId = market.statID;
    const line = parseFloat(market.fairOverUnder || market.bookOverUnder || '0');
    const overOdds = market.fairOdds || market.bookOdds;
    const underOdds = market.opposingOddID ? event[market.opposingOddID]?.fairOdds || event[market.opposingOddID]?.bookOdds : null;
    
    // Determine team from player stats or market name
    let playerTeam = homeTeamAbbr;
    if (event.playerStats && event.playerStats[playerId]) {
      const playerStats = event.playerStats[playerId];
      if (playerStats.team === awayTeam || playerStats.team === awayTeamAbbr) {
        playerTeam = awayTeamAbbr;
      }
    }
    
    const opponent = playerTeam === homeTeamAbbr ? awayTeamAbbr : homeTeamAbbr;
    
    // Normalize prop type
    const propType = normalizePropType(statId);
    
    // Create prop entries for both over and under
    if (overOdds && line > 0) {
      props.push({
        player_id: playerId,
        player_name: playerName,
        team: playerTeam,
        opponent: opponent,
        season: season,
        date: gameDate,
        prop_type: propType,
        line: line,
        odds: overOdds,
        side: 'over',
        market_key: marketKey,
        sport: 'nfl'
      });
    }
    
    if (underOdds && line > 0) {
      props.push({
        player_id: playerId,
        player_name: playerName,
        team: playerTeam,
        opponent: opponent,
        season: season,
        date: gameDate,
        prop_type: propType,
        line: line,
        odds: underOdds,
        side: 'under',
        market_key: marketKey,
        sport: 'nfl'
      });
    }
  }
  
  console.log(`📊 Generated ${props.length} player props for this event`);
  return props;
}

// Helper function to normalize prop types
function normalizePropType(statId) {
  const mappings = {
    'passing_yards': 'Passing Yards',
    'passing_touchdowns': 'Passing Touchdowns',
    'passing_completions': 'Passing Completions',
    'passing_attempts': 'Passing Attempts',
    'passing_interceptions': 'Passing Interceptions',
    'rushing_yards': 'Rushing Yards',
    'rushing_touchdowns': 'Rushing Touchdowns',
    'rushing_attempts': 'Rushing Attempts',
    'receiving_yards': 'Receiving Yards',
    'receiving_touchdowns': 'Receiving Touchdowns',
    'receiving_receptions': 'Receptions',
    'defense_sacks': 'Sacks',
    'defense_interceptions': 'Interceptions',
    'defense_combinedTackles': 'Combined Tackles',
    'fieldGoals_made': 'Field Goals Made',
    'extraPoints_kicksMade': 'Extra Points Made',
    'kicking_totalPoints': 'Kicking Total Points',
    'touchdowns': 'Any Touchdowns'
  };
  
  return mappings[statId] || statId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
    let totalProps = [];
    let processedEvents = 0;
    
    for (const event of events) {
      try {
        const props = await processEventForPlayerLogs(event, season);
        totalProps = totalProps.concat(props);
        processedEvents++;
        
        if (processedEvents % 10 === 0) {
          console.log(`📊 Processed ${processedEvents}/${events.length} events (${totalProps.length} props so far)`);
    if (processedEvents >= 5) break; // Stop after 5 events for debugging
        }
      } catch (error) {
        console.error(`❌ Error processing event ${event.eventID || 'unknown'}:`, error.message);
      }
    }
    
    console.log(`📈 Total props generated: ${totalProps.length} from ${processedEvents} events`);
    
    // Save to database
    const savedCount = await savePlayerGameLogs(totalProps);
    
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
    console.log(`📊 Saved ${savedCount} props for ${league} ${season}`);
    
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
