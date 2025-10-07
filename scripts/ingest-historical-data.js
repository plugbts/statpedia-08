/**
 * Historical Data Ingestion Script
 * Fetches real box scores from SportsGameOdds and populates PlayerGameLogs table
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';
const API_KEY = process.env.SPORTSGAMEODDS_API_KEY || 'd5dc1f00bc42133550bc1605dd8f457f';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Player name to ID mapping for consistent analytics
const PLAYER_ID_MAPPING = {
  'Patrick Mahomes': 'mahomes-patrick',
  'Josh Allen': 'allen-josh',
  'Lamar Jackson': 'jackson-lamar',
  'Dak Prescott': 'prescott-dak',
  'Aaron Rodgers': 'rodgers-aaron',
  'Tom Brady': 'brady-tom',
  'Christian McCaffrey': 'mccaffrey-christian',
  'Derrick Henry': 'henry-derrick',
  'Saquon Barkley': 'barkley-saquon',
  'Nick Chubb': 'chubb-nick',
  'Alvin Kamara': 'kamara-alvin',
  'Tyreek Hill': 'hill-tyreek',
  'Davante Adams': 'adams-davante',
  'AJ Brown': 'brown-aj',
  'Stefon Diggs': 'diggs-stefon',
  'Cooper Kupp': 'kupp-cooper',
  'Mike Evans': 'evans-mike',
  'Travis Kelce': 'kelce-travis',
  'George Kittle': 'kittle-george',
  'Mark Andrews': 'andrews-mark',
  'Darren Waller': 'waller-darren',
  'Wil Lutz': 'lutz-wil',
  'Justin Tucker': 'tucker-justin',
  'Harrison Butker': 'butker-harrison',
  'Daniel Carlson': 'carlson-daniel'
};

// Prop type mapping from SportsGameOdds to our format
const PROP_TYPE_MAPPING = {
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
  'Extra Points Made': 'Extra Points Made'
};

// Team abbreviation mapping
const TEAM_MAPPING = {
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
  'Cleveland Browns': 'CLE'
};

function normalizePlayerId(playerName) {
  if (PLAYER_ID_MAPPING[playerName]) {
    return PLAYER_ID_MAPPING[playerName];
  }
  return playerName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function normalizeTeamName(teamName) {
  if (TEAM_MAPPING[teamName]) {
    return TEAM_MAPPING[teamName];
  }
  return teamName.substring(0, 3).toUpperCase();
}

function normalizePropType(propType) {
  return PROP_TYPE_MAPPING[propType] || propType;
}

async function fetchEventsWithBoxScores(league, season, limit = 50) {
  console.log(`📡 Fetching events for ${league} ${season}...`);
  
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
  console.log(`✅ Fetched ${data.data?.length || 0} events`);
  
  return data.data || [];
}

async function processEventForPlayerLogs(event) {
  const gameLogs = [];
  const gameDate = event.status?.startsAt ? new Date(event.status.startsAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const season = new Date(gameDate).getFullYear();
  
  // Extract team info
  const homeTeam = event.teams?.home?.names?.long || 'Unknown';
  const awayTeam = event.teams?.away?.names?.long || 'Unknown';
  const homeTeamAbbr = normalizeTeamName(homeTeam);
  const awayTeamAbbr = normalizeTeamName(awayTeam);
  
  console.log(`🏈 Processing game: ${awayTeam} @ ${homeTeam} (${gameDate})`);
  
  // Process player stats if available
  if (event.playerStats) {
    for (const [playerId, playerStats] of Object.entries(event.playerStats)) {
      const playerName = playerStats.name || playerId;
      const normalizedPlayerId = normalizePlayerId(playerName);
      
      // Determine which team the player is on
      const isHomePlayer = playerStats.team === homeTeam || playerStats.team === homeTeamAbbr;
      const playerTeam = isHomePlayer ? homeTeamAbbr : awayTeamAbbr;
      const opponent = isHomePlayer ? awayTeamAbbr : homeTeamAbbr;
      
      // Process each stat category
      const statCategories = ['passing', 'rushing', 'receiving', 'kicking'];
      
      for (const category of statCategories) {
        if (playerStats[category]) {
          const stats = playerStats[category];
          
          // Map stats to prop types
          const statMappings = {
            passing: {
              'Passing Yards': stats.yards,
              'Passing Touchdowns': stats.touchdowns,
              'Passing Completions': stats.completions,
              'Passing Attempts': stats.attempts
            },
            rushing: {
              'Rushing Yards': stats.yards,
              'Rushing Touchdowns': stats.touchdowns,
              'Rushing Attempts': stats.attempts
            },
            receiving: {
              'Receiving Yards': stats.yards,
              'Receiving Receptions': stats.receptions,
              'Receiving Touchdowns': stats.touchdowns
            },
            kicking: {
              'Field Goals Made': stats.fieldGoalsMade,
              'Field Goals Attempted': stats.fieldGoalsAttempted,
              'Extra Points Made': stats.extraPointsMade
            }
          };
          
          const mappings = statMappings[category] || {};
          
          for (const [propType, value] of Object.entries(mappings)) {
            if (value !== undefined && value !== null && !isNaN(value)) {
              gameLogs.push({
                player_id: normalizedPlayerId,
                player_name: playerName,
                team: playerTeam,
                opponent: opponent,
                season: season,
                date: gameDate,
                prop_type: normalizePropType(propType),
                value: parseFloat(value),
                position: playerStats.position || 'UNK',
                sport: 'nfl'
              });
            }
          }
        }
      }
    }
  }
  
  // If no player stats, try to extract from odds data
  if (event.odds && event.odds.playerProps) {
    for (const prop of event.odds.playerProps) {
      if (prop.playerName && prop.statValue !== undefined) {
        const normalizedPlayerId = normalizePlayerId(prop.playerName);
        const propType = normalizePropType(prop.statName || prop.propType);
        
        // Determine team (this is a fallback, might not be accurate)
        const playerTeam = homeTeamAbbr; // Default to home team
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
          position: prop.position || 'UNK',
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
      console.log(`✅ Saved chunk ${i + 1}-${Math.min(i + chunkSize, gameLogs.length)}`);
    }
  }
}

async function ingestPlayerGameLogs(league = 'NFL', season = 2025, limit = 50) {
  try {
    console.log(`🚀 Starting historical data ingestion for ${league} ${season}`);
    console.log(`📊 Limit: ${limit} events`);
    
    // Clear existing data for this season (optional)
    console.log('🗑️ Clearing existing data for this season...');
    const { error: deleteError } = await supabase
      .from('playergamelogs')
      .delete()
      .eq('season', season)
      .eq('sport', 'nfl');
    
    if (deleteError) {
      console.warn('⚠️ Could not clear existing data:', deleteError.message);
    } else {
      console.log('✅ Cleared existing data');
    }
    
    // Fetch events
    const events = await fetchEventsWithBoxScores(league, season, limit);
    
    if (events.length === 0) {
      console.log('❌ No events found');
      return;
    }
    
    // Process each event
    let totalGameLogs = [];
    for (const event of events) {
      try {
        const gameLogs = await processEventForPlayerLogs(event);
        totalGameLogs = totalGameLogs.concat(gameLogs);
      } catch (error) {
        console.error(`❌ Error processing event ${event.eventID}:`, error.message);
      }
    }
    
    console.log(`📈 Total game logs generated: ${totalGameLogs.length}`);
    
    // Save to database
    await savePlayerGameLogs(totalGameLogs);
    
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
      console.log(savedData);
    }
    
    console.log('🎉 Historical data ingestion completed!');
    
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    throw error;
  }
}

// Run the ingestion
if (import.meta.url === `file://${process.argv[1]}`) {
  const league = process.argv[2] || 'NFL';
  const season = parseInt(process.argv[3]) || 2025;
  const limit = parseInt(process.argv[4]) || 50;
  
  console.log(`🏈 Starting ingestion: ${league} ${season} (limit: ${limit})`);
  
  ingestPlayerGameLogs(league, season, limit)
    .then(() => {
      console.log('✅ Ingestion completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ingestion failed:', error);
      process.exit(1);
    });
}

export { ingestPlayerGameLogs, fetchEventsWithBoxScores, processEventForPlayerLogs };
