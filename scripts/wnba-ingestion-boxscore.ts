import fetch from "node-fetch";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { players, teams, games, player_game_logs, defense_ranks, leagues } from '../src/db/schema/index';
import { eq, and, desc, sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

// WNBA Stats API response structure
interface WNBAGameFinderResponse {
  resultSets: Array<{
    name: string;
    headers: string[];
    rowSet: any[][];
  }>;
}

interface WNBABoxScoreResponse {
  resultSets: Array<{
    name: string;
    headers: string[];
    rowSet: any[][];
  }>;
}

interface WNBAGame {
  id: string;
  externalId: string;
  season: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: string;
  awayTeamId: string;
}

interface WNBAPlayerLog {
  playerId: string;
  playerName: string;
  team: string;
  opponent: string;
  gameId: string;
  date: string;
  stats: {
    points?: number;
    assists?: number;
    rebounds?: number;
    threePointers?: number;
    steals?: number;
    blocks?: number;
    turnovers?: number;
    minutes?: number;
    fieldGoalsMade?: number;
    fieldGoalsAttempted?: number;
    freeThrowsMade?: number;
    freeThrowsAttempted?: number;
  };
}

// WNBA team mappings (12 teams + 2025 expansion)
const WNBA_TEAMS = [
  'ATL', 'CHI', 'CON', 'CONN', 'DAL', 'IND', 'LVA', 'LAS', 'MIN', 'NYL', 'PHX', 'SEA', 'WAS', 'GSV'
];

// Team ID mapping for WNBA
const wnbaTeamIdMap: Record<string, string> = {};
const wnbaPlayerIdMap: Record<string, string> = {};

// WNBA Stats API column mappings (based on leaguegamefinder response)
const WNBA_COLUMNS = {
  SEASON_ID: 0,
  TEAM_ID: 1,
  TEAM_ABBREVIATION: 2,
  TEAM_NAME: 3,
  GAME_ID: 4,
  GAME_DATE: 5,
  MATCHUP: 6,
  WL: 7,
  MIN: 8,
  FGM: 9,
  FGA: 10,
  FG_PCT: 11,
  FG3M: 12,
  FG3A: 13,
  FG3_PCT: 14,
  FTM: 15,
  FTA: 16,
  FT_PCT: 17,
  OREB: 18,
  DREB: 19,
  REB: 20,
  AST: 21,
  STL: 22,
  BLK: 23,
  TOV: 24,
  PF: 25,
  PTS: 26,
  PLUS_MINUS: 27,
  PLAYER_ID: 28,
  PLAYER_NAME: 29,
  PLAYER_POSITION: 30
};

// Fetch with exponential backoff retry
async function fetchWithRetry(url: string, options: any, maxRetries: number = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      
      // If not the last attempt, wait and retry
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.warn(`Request failed (${response.status}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`Request error, retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error(`Failed to fetch after ${maxRetries} attempts`);
}

// Initialize WNBA team and player mappings
async function initializeWNBAMappings() {
  console.log('Initializing WNBA mappings...');
  
  // Get WNBA league ID
  const leagueRecord = await db.select().from(leagues).where(eq(leagues.code, 'WNBA')).limit(1);
  if (leagueRecord.length === 0) {
    console.warn('WNBA league not found in database');
    return;
  }
  
  const leagueId = leagueRecord[0].id;
  
  // Load team abbreviation mappings
  const teamMappingsResult = await db.execute(sql`
    SELECT api_abbrev, team_id FROM team_abbrev_map 
    WHERE league = 'WNBA'
  `);
  
  const teamMappings = teamMappingsResult || [];
  teamMappings.forEach((row: any) => {
    wnbaTeamIdMap[row.api_abbrev] = row.team_id;
  });
  
  // Load players by external_id and name (WNBA Stats API player ID)
  const leaguePlayersResult = await db.execute(sql`
    SELECT p.id, p.name, p.external_id, t.name as team_name FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE t.league_id = ${leagueId}
  `);

  const leaguePlayers = leaguePlayersResult || [];
  leaguePlayers.forEach((row: any) => {
    // Map by external_id if available
    if (row.external_id) {
      wnbaPlayerIdMap[row.external_id] = row.id;
    }
    // Map by name for backward compatibility
    wnbaPlayerIdMap[row.name] = row.id;
  });
  
  console.log(`Loaded ${teamMappings.length} team mappings and ${leaguePlayers.length} players for WNBA`);
}

// Enhanced WNBA Stats API fetcher using boxscoretraditionalv2 for player data
async function fetchWNBAGamesAndLogs(season: string = '2024') {
  console.log(`Fetching WNBA data for ${season} season...`);
  
  try {
    const baseUrl = 'https://stats.wnba.com/stats';
    
    // Step 1: Get games using leaguegamefinder
    const gameFinderUrl = `${baseUrl}/leaguegamefinder?Season=${season}&SeasonType=Regular%20Season`;
    
    console.log(`Step 1: Fetching games from: ${gameFinderUrl}`);
    
    const response = await fetch(gameFinderUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.wnba.com/',
        'Origin': 'https://www.wnba.com'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch WNBA games: ${response.status} ${response.statusText}`);
    }
    
    const data: WNBAGameFinderResponse = await response.json();
    
    if (!data.resultSets || data.resultSets.length === 0) {
      throw new Error('No result sets found in WNBA API response');
    }
    
    const gameFinderData = data.resultSets[0];
    const games = gameFinderData.rowSet || [];
    
    console.log(`Found ${games.length} total game records for ${season}`);
    
    // Filter for WNBA teams only and get unique games
    const wnbaGames = games.filter(game => {
      const teamAbbr = game[WNBA_COLUMNS.TEAM_ABBREVIATION];
      return WNBA_TEAMS.includes(teamAbbr);
    });
    
    // Get unique game IDs
    const uniqueGameIds = new Set<string>();
    const processedGames = new Map<string, WNBAGame>();
    
    for (const game of wnbaGames) {
      const gameId = game[WNBA_COLUMNS.GAME_ID]?.toString();
      const teamAbbr = game[WNBA_COLUMNS.TEAM_ABBREVIATION];
      const gameDate = game[WNBA_COLUMNS.GAME_DATE];
      const matchup = game[WNBA_COLUMNS.MATCHUP];
      
      if (!gameId || !teamAbbr || !gameDate || uniqueGameIds.has(gameId)) {
        continue;
      }
      
      uniqueGameIds.add(gameId);
      
      // Parse matchup to get opponent
      let opponent = '';
      let isHome = false;
      
      if (matchup.includes(' vs. ')) {
        const parts = matchup.split(' vs. ');
        if (parts.length === 2) {
          opponent = parts[1].trim();
          isHome = true;
        }
      } else if (matchup.includes(' @ ')) {
        const parts = matchup.split(' @ ');
        if (parts.length === 2) {
          opponent = parts[1].trim();
          isHome = false;
        }
      }
      
      if (!opponent || !WNBA_TEAMS.includes(opponent)) {
        console.warn(`Could not parse valid opponent from matchup: ${matchup}`);
        continue;
      }
      
      // Determine home/away teams
      const homeTeam = isHome ? teamAbbr : opponent;
      const awayTeam = isHome ? opponent : teamAbbr;
      
      processedGames.set(gameId, {
        id: uuidv4(),
        externalId: gameId,
        season: season,
        date: gameDate,
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        homeTeamId: wnbaTeamIdMap[homeTeam] || '',
        awayTeamId: wnbaTeamIdMap[awayTeam] || ''
      });
    }
    
    console.log(`Step 1 Complete: Processed ${processedGames.size} unique WNBA games`);
    
    // Step 2: Get player data using boxscoretraditionalv2 for each game
    console.log(`Step 2: Fetching player data for ${processedGames.size} games...`);
    
    const processedLogs: WNBAPlayerLog[] = [];
    let gamesProcessed = 0;
    
    for (const [gameId, game] of processedGames) {
      try {
        // Fetch box score for this game
        const boxscoreUrl = `${baseUrl}/boxscoretraditionalv2?GameID=${gameId}`;
        
        const boxscoreResponse = await fetchWithRetry(boxscoreUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.wnba.com/',
            'Origin': 'https://www.wnba.com'
          }
        });
        
        if (!boxscoreResponse.ok) {
          console.warn(`Failed to fetch boxscore for game ${gameId}: ${boxscoreResponse.status}`);
          continue;
        }
        
        const boxscoreData = await boxscoreResponse.json();
        
        if (!boxscoreData.resultSets || boxscoreData.resultSets.length < 2) {
          console.warn(`Invalid boxscore data for game ${gameId}`);
          continue;
        }
        
        // Process home team players
        const homeTeamPlayers = boxscoreData.resultSets[0]?.rowSet || [];
        const awayTeamPlayers = boxscoreData.resultSets[1]?.rowSet || [];
        
        // Process home team players
        for (const player of homeTeamPlayers) {
          if (player && player.length > 20) {
            const playerLog = processPlayerBoxScore(player, game.homeTeam, game.awayTeam, game.id, game.date);
            if (playerLog) {
              processedLogs.push(playerLog);
            }
          }
        }
        
        // Process away team players
        for (const player of awayTeamPlayers) {
          if (player && player.length > 20) {
            const playerLog = processPlayerBoxScore(player, game.awayTeam, game.homeTeam, game.id, game.date);
            if (playerLog) {
              processedLogs.push(playerLog);
            }
          }
        }
        
        gamesProcessed++;
        
        // Rate limiting - 1 request per second
        if (gamesProcessed % 10 === 0) {
          console.log(`Processed ${gamesProcessed}/${processedGames.size} games...`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between requests
        
      } catch (error) {
        console.warn(`Error processing game ${gameId}:`, error);
        continue;
      }
    }
    
    console.log(`Step 2 Complete: Processed ${processedLogs.length} player logs from ${gamesProcessed} games`);
    
    // Step 3: Upsert games
    console.log(`Step 3: Upserting games...`);
    let gamesInserted = 0;
    for (const game of processedGames.values()) {
      if (game.homeTeamId && game.awayTeamId) {
        await upsertWNBAGame(game);
        gamesInserted++;
      } else {
        console.warn(`Missing team IDs for game ${game.id}: home=${game.homeTeam}, away=${game.awayTeam}`);
      }
    }
    
    // Step 4: Upsert player logs
    console.log(`Step 4: Upserting player logs...`);
    let logsInserted = 0;
    for (const log of processedLogs) {
      const game = processedGames.get(log.gameId);
      if (game) {
        await upsertWNBAPlayerLog(log, game.externalId); // Pass API game ID, not UUID
        logsInserted++;
      }
    }
    
    console.log(`✅ Successfully inserted ${gamesInserted} games and ${logsInserted} player logs`);
    
  } catch (error) {
    console.error('Error fetching WNBA data:', error);
    throw error;
  }
}

// Process individual player box score data
function processPlayerBoxScore(
  player: any[], 
  team: string, 
  opponent: string, 
  gameId: string, 
  gameDate: string
): WNBAPlayerLog | null {
  // boxscoretraditionalv2 column structure
  const PLAYER_COLUMNS = {
    PLAYER_ID: 4,
    PLAYER_NAME: 1,
    MIN: 8,
    FGM: 9,
    FGA: 10,
    FG3M: 12,
    FG3A: 13,
    FTM: 15,
    FTA: 16,
    OREB: 18,
    DREB: 19,
    REB: 20,
    AST: 21,
    STL: 22,
    BLK: 23,
    TOV: 24,
    PF: 25,
    PTS: 26,
    PLUS_MINUS: 27
  };
  
  const playerId = player[PLAYER_COLUMNS.PLAYER_ID]?.toString();
  const playerName = player[PLAYER_COLUMNS.PLAYER_NAME];
  const minutes = player[PLAYER_COLUMNS.MIN];
  
  // Only include players who actually played
  if (!playerId || !playerName || !minutes || minutes === '0:00' || minutes === '') {
    return null;
  }
  
  // Convert minutes from "MM:SS" to decimal
  const minutesDecimal = parseMinutes(minutes);
  if (minutesDecimal === 0) {
    return null;
  }
  
  return {
    playerId: playerId,
    playerName: playerName,
    team: team,
    opponent: opponent,
    gameId: gameId,
    date: gameDate,
    stats: {
      points: player[PLAYER_COLUMNS.PTS] || undefined,
      assists: player[PLAYER_COLUMNS.AST] || undefined,
      rebounds: player[PLAYER_COLUMNS.REB] || undefined,
      threePointers: player[PLAYER_COLUMNS.FG3M] || undefined,
      steals: player[PLAYER_COLUMNS.STL] || undefined,
      blocks: player[PLAYER_COLUMNS.BLK] || undefined,
      turnovers: player[PLAYER_COLUMNS.TOV] || undefined,
      minutes: minutesDecimal,
      fieldGoalsMade: player[PLAYER_COLUMNS.FGM] || undefined,
      fieldGoalsAttempted: player[PLAYER_COLUMNS.FGA] || undefined,
      freeThrowsMade: player[PLAYER_COLUMNS.FTM] || undefined,
      freeThrowsAttempted: player[PLAYER_COLUMNS.FTA] || undefined
    }
  };
}

// Convert minutes from "MM:SS" format to decimal
function parseMinutes(minutes: string | number): number {
  if (!minutes || minutes === '0:00' || minutes === '' || minutes === 0) {
    return 0;
  }
  
  // If it's already a number, return it
  if (typeof minutes === 'number') {
    return minutes;
  }
  
  // If it's a string, parse it
  const parts = minutes.split(':');
  if (parts.length !== 2) {
    return 0;
  }
  
  const mins = parseInt(parts[0]) || 0;
  const secs = parseInt(parts[1]) || 0;
  
  return mins + (secs / 60);
}

// Upsert WNBA game
async function upsertWNBAGame(game: WNBAGame) {
  const leagueRecord = await db.select().from(leagues).where(eq(leagues.code, 'WNBA')).limit(1);
  if (leagueRecord.length === 0) {
    console.warn('WNBA league not found');
    return;
  }
  
  await db.insert(games).values({
    id: game.id,
    league_id: leagueRecord[0].id,
    season: game.season,
    game_date: game.date, // Already in YYYY-MM-DD format
    home_team_id: game.homeTeamId,
    away_team_id: game.awayTeamId,
    external_id: game.externalId,
    api_game_id: game.externalId // Store the API game ID for lookup
  }).onConflictDoNothing();
}

// Upsert WNBA player log
async function upsertWNBAPlayerLog(log: WNBAPlayerLog, apiGameId: string) {
  // Resolve the UUID from the API game ID
  const gameResult = await db.execute(sql`SELECT * FROM games WHERE api_game_id = ${apiGameId} LIMIT 1`);
  const game = gameResult.length > 0 ? gameResult[0] : null;
  
  if (!game) {
    console.warn(`Game with api_game_id ${apiGameId} not found`);
    return;
  }
  
  const gameId = game.id; // Use the resolved UUID
  
  let playerId = wnbaPlayerIdMap[log.playerId] || wnbaPlayerIdMap[log.playerName];
  const teamId = wnbaTeamIdMap[log.team];
  const opponentTeamId = wnbaTeamIdMap[log.opponent];

  // If player found by name but not by external_id, update their external_id
  if (playerId && !wnbaPlayerIdMap[log.playerId] && teamId) {
    console.log(`Updating existing player ${log.playerName} with external_id: ${log.playerId}`);
    
    await db.update(players)
      .set({ external_id: log.playerId })
      .where(eq(players.id, playerId));
    
    // Update the mapping for future lookups
    wnbaPlayerIdMap[log.playerId] = playerId;
  }

  // If player not found at all, create a new player record
  if (!playerId && teamId) {
    console.log(`Creating new player: ${log.playerName} (${log.playerId}) for team ${log.team}`);

    // Insert new player with external_id
    const newPlayerResult = await db.insert(players).values({
      name: log.playerName,
      team_id: teamId,
      external_id: log.playerId,
      league: 'WNBA',
      position: 'Unknown', // Will be updated when we get more data
      status: 'active'
    }).returning({ id: players.id });

    if (newPlayerResult.length > 0) {
      playerId = newPlayerResult[0].id;
      // Update the mapping for future lookups
      wnbaPlayerIdMap[log.playerId] = playerId;
      wnbaPlayerIdMap[log.playerName] = playerId;
    }
  }
  
  if (!playerId || !teamId || !opponentTeamId) {
    console.warn(`Missing IDs for player log: player=${log.playerName} (${log.playerId}), team=${log.team}, opponent=${log.opponent}`);
    return;
  }
  
  // Create game log entries for each stat type
  const logEntries = [];
  
  // Points
  if (log.stats.points !== undefined) {
    logEntries.push({
      player_id: playerId,
      team_id: teamId,
      game_id: gameId,
      opponent_id: opponentTeamId,
      prop_type: 'Points',
      line: log.stats.points,
      actual_value: log.stats.points,
      hit: true,
      game_date: log.date, // Already in YYYY-MM-DD format
      season: new Date(log.date).getFullYear().toString(),
      home_away: 'away' as const
    });
  }
  
  // Assists
  if (log.stats.assists !== undefined) {
    logEntries.push({
      player_id: playerId,
      team_id: teamId,
      game_id: gameId,
      opponent_id: opponentTeamId,
      prop_type: 'Assists',
      line: log.stats.assists,
      actual_value: log.stats.assists,
      hit: true,
      game_date: log.date, // Already in YYYY-MM-DD format
      season: new Date(log.date).getFullYear().toString(),
      home_away: 'away' as const
    });
  }
  
  // Rebounds
  if (log.stats.rebounds !== undefined) {
    logEntries.push({
      player_id: playerId,
      team_id: teamId,
      game_id: gameId,
      opponent_id: opponentTeamId,
      prop_type: 'Rebounds',
      line: log.stats.rebounds,
      actual_value: log.stats.rebounds,
      hit: true,
      game_date: log.date, // Already in YYYY-MM-DD format
      season: new Date(log.date).getFullYear().toString(),
      home_away: 'away' as const
    });
  }
  
  // 3-Pointers Made
  if (log.stats.threePointers !== undefined) {
    logEntries.push({
      player_id: playerId,
      team_id: teamId,
      game_id: gameId,
      opponent_id: opponentTeamId,
      prop_type: '3-Pointers Made',
      line: log.stats.threePointers,
      actual_value: log.stats.threePointers,
      hit: true,
      game_date: log.date, // Already in YYYY-MM-DD format
      season: new Date(log.date).getFullYear().toString(),
      home_away: 'away' as const
    });
  }
  
  // Steals
  if (log.stats.steals !== undefined) {
    logEntries.push({
      player_id: playerId,
      team_id: teamId,
      game_id: gameId,
      opponent_id: opponentTeamId,
      prop_type: 'Steals',
      line: log.stats.steals,
      actual_value: log.stats.steals,
      hit: true,
      game_date: log.date, // Already in YYYY-MM-DD format
      season: new Date(log.date).getFullYear().toString(),
      home_away: 'away' as const
    });
  }
  
  // Blocks
  if (log.stats.blocks !== undefined) {
    logEntries.push({
      player_id: playerId,
      team_id: teamId,
      game_id: gameId,
      opponent_id: opponentTeamId,
      prop_type: 'Blocks',
      line: log.stats.blocks,
      actual_value: log.stats.blocks,
      hit: true,
      game_date: log.date, // Already in YYYY-MM-DD format
      season: new Date(log.date).getFullYear().toString(),
      home_away: 'away' as const
    });
  }
  
  // Insert all log entries
  if (logEntries.length > 0) {
    await db.insert(player_game_logs).values(logEntries);
  }
}

// Main execution function
async function main() {
  const args = process.argv.slice(2);
  const season = args[0] || '2024';
  
  try {
    console.log(`🏀 Starting WNBA data ingestion for ${season} season...`);
    
    // Initialize mappings
    await initializeWNBAMappings();
    
    // Fetch and process WNBA data
    await fetchWNBAGamesAndLogs(season);
    
    console.log(`✅ WNBA data ingestion completed for ${season} season!`);
    
  } catch (error) {
    console.error('❌ WNBA data ingestion failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  fetchWNBAGamesAndLogs,
  initializeWNBAMappings,
  upsertWNBAGame,
  upsertWNBAPlayerLog
};
