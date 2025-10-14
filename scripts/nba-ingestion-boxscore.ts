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

// NBA Stats API response structure
interface NBAGameFinderResponse {
  resultSets: Array<{
    name: string;
    headers: string[];
    rowSet: any[][];
  }>;
}

interface NBABoxScoreResponse {
  resultSets: Array<{
    name: string;
    headers: string[];
    rowSet: any[][];
  }>;
}

interface NBAGame {
  id: string;
  externalId: string;
  season: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: string;
  awayTeamId: string;
}

interface NBAPlayerLog {
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

// NBA team mappings (exclude WNBA teams)
const NBA_TEAMS = [
  'ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW', 'GS',
  'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NO',
  'NYK', 'NY', 'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'SA',
  'TOR', 'UTA', 'WAS'
];

// Team ID mapping for NBA
const nbaTeamIdMap: Record<string, string> = {};
const nbaPlayerIdMap: Record<string, string> = {};

// NBA Stats API column mappings (based on leaguegamefinder response)
const NBA_COLUMNS = {
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

// Initialize NBA team and player mappings
async function initializeNBAMappings() {
  console.log('Initializing NBA mappings...');
  
  // Get NBA league ID
  const leagueRecord = await db.select().from(leagues).where(eq(leagues.code, 'NBA')).limit(1);
  if (leagueRecord.length === 0) {
    console.warn('NBA league not found in database');
    return;
  }
  
  const leagueId = leagueRecord[0].id;
  
  // Load team abbreviation mappings
  const teamMappingsResult = await db.execute(sql`
    SELECT api_abbrev, team_id FROM team_abbrev_map 
    WHERE league = 'NBA'
  `);
  
  const teamMappings = teamMappingsResult || [];
  teamMappings.forEach((row: any) => {
    nbaTeamIdMap[row.api_abbrev] = row.team_id;
  });
  
  // Load players by external_id and name (NBA Stats API player ID)
  const leaguePlayersResult = await db.execute(sql`
    SELECT p.id, p.name, p.external_id, t.name as team_name FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE t.league_id = ${leagueId}
  `);

  const leaguePlayers = leaguePlayersResult || [];
  leaguePlayers.forEach((row: any) => {
    // Map by external_id if available
    if (row.external_id) {
      nbaPlayerIdMap[row.external_id] = row.id;
    }
    // Map by name for backward compatibility
    nbaPlayerIdMap[row.name] = row.id;
  });
  
  console.log(`Loaded ${teamMappings.length} team mappings and ${leaguePlayers.length} players for NBA`);
}

// Enhanced NBA Stats API fetcher using boxscoretraditionalv2 for player data
async function fetchNBAGamesAndLogs(season: string = '2023-24') {
  console.log(`Fetching NBA data for ${season} season...`);
  
  try {
    const baseUrl = 'https://stats.nba.com/stats';
    
    // Step 1: Get games using leaguegamefinder
    const gameFinderUrl = `${baseUrl}/leaguegamefinder?Season=${season}&SeasonType=Regular%20Season`;
    
    console.log(`Step 1: Fetching games from: ${gameFinderUrl}`);
    
    const response = await fetch(gameFinderUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.nba.com/',
        'Origin': 'https://www.nba.com'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch NBA games: ${response.status} ${response.statusText}`);
    }
    
    const data: NBAGameFinderResponse = await response.json();
    
    if (!data.resultSets || data.resultSets.length === 0) {
      throw new Error('No result sets found in NBA API response');
    }
    
    const gameFinderData = data.resultSets[0];
    const games = gameFinderData.rowSet || [];
    
    console.log(`Found ${games.length} total game records for ${season}`);
    
    // Filter for NBA teams only and get unique games
    const nbaGames = games.filter(game => {
      const teamAbbr = game[NBA_COLUMNS.TEAM_ABBREVIATION];
      return NBA_TEAMS.includes(teamAbbr);
    });
    
    // Get unique game IDs
    const uniqueGameIds = new Set<string>();
    const processedGames = new Map<string, NBAGame>();
    
    for (const game of nbaGames) {
      const gameId = game[NBA_COLUMNS.GAME_ID]?.toString();
      const teamAbbr = game[NBA_COLUMNS.TEAM_ABBREVIATION];
      const gameDate = game[NBA_COLUMNS.GAME_DATE];
      const matchup = game[NBA_COLUMNS.MATCHUP];
      
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
      
      if (!opponent || !NBA_TEAMS.includes(opponent)) {
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
        homeTeamId: nbaTeamIdMap[homeTeam] || '',
        awayTeamId: nbaTeamIdMap[awayTeam] || ''
      });
    }
    
    console.log(`Step 1 Complete: Processed ${processedGames.size} unique NBA games`);
    
    // Step 2: Get player data using boxscoretraditionalv2 for each game
    console.log(`Step 2: Fetching player data for ${processedGames.size} games...`);
    
    const processedLogs: NBAPlayerLog[] = [];
    let gamesProcessed = 0;
    
    for (const [gameId, game] of processedGames) {
      try {
        // Fetch box score for this game with retry logic
        const boxscoreUrl = `${baseUrl}/boxscoretraditionalv2?GameID=${gameId}&StartPeriod=0&EndPeriod=14`;
        
        const boxscoreResponse = await fetchWithRetry(boxscoreUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.nba.com/',
            'Origin': 'https://www.nba.com'
          }
        });
        
        if (!boxscoreResponse.ok) {
          console.warn(`Failed to fetch boxscore for game ${gameId}: ${boxscoreResponse.status}`);
          continue;
        }
        
        const boxscoreData = await boxscoreResponse.json();
        
        if (!boxscoreData.resultSets || boxscoreData.resultSets.length === 0) {
          console.warn(`Invalid boxscore data for game ${gameId}`);
          continue;
        }
        
        // Parse the correct dataset structure
        const headersArr = boxscoreData.resultSets[0].headers;
        const rows = boxscoreData.resultSets[0].rowSet || [];
        
        // Convert rows to objects using headers
        const playerLogs = rows.map((row: any) => {
          const log: any = {};
          headersArr.forEach((header: string, i: number) => {
            log[header] = row[i];
          });
          return log;
        });
        
        // Process all player logs
        for (const playerLog of playerLogs) {
          if (playerLog.PLAYER_ID && playerLog.PLAYER_NAME) {
            // Determine team based on player's team
            const playerTeam = playerLog.TEAM_ABBREVIATION;
            const opponent = playerTeam === game.homeTeam ? game.awayTeam : game.homeTeam;
            
            const processedLog = processPlayerBoxScoreFromObject(playerLog, playerTeam, opponent, game.id, game.date);
            if (processedLog) {
              processedLogs.push(processedLog);
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
        await upsertNBAGame(game);
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
        await upsertNBAPlayerLog(log, game.externalId); // Pass API game ID, not UUID
        logsInserted++;
      }
    }
    
    console.log(`✅ Successfully inserted ${gamesInserted} games and ${logsInserted} player logs`);
    
  } catch (error) {
    console.error('Error fetching NBA data:', error);
    throw error;
  }
}

// Process individual player box score data from object structure
function processPlayerBoxScoreFromObject(
  player: any, 
  team: string, 
  opponent: string, 
  gameId: string, 
  gameDate: string
): NBAPlayerLog | null {
  const playerId = player.PLAYER_ID?.toString();
  const playerName = player.PLAYER_NAME;
  const minutes = player.MIN;
  
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
      points: player.PTS || undefined,
      assists: player.AST || undefined,
      rebounds: player.REB || undefined,
      threePointers: player.FG3M || undefined,
      steals: player.STL || undefined,
      blocks: player.BLK || undefined,
      turnovers: player.TOV || undefined,
      minutes: minutesDecimal,
      fieldGoalsMade: player.FGM || undefined,
      fieldGoalsAttempted: player.FGA || undefined,
      freeThrowsMade: player.FTM || undefined,
      freeThrowsAttempted: player.FTA || undefined
    }
  };
}

// Process individual player box score data (legacy array structure)
function processPlayerBoxScore(
  player: any[], 
  team: string, 
  opponent: string, 
  gameId: string, 
  gameDate: string
): NBAPlayerLog | null {
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

// Upsert NBA game
async function upsertNBAGame(game: NBAGame) {
  const leagueRecord = await db.select().from(leagues).where(eq(leagues.code, 'NBA')).limit(1);
  if (leagueRecord.length === 0) {
    console.warn('NBA league not found');
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

// Upsert NBA player log
async function upsertNBAPlayerLog(log: NBAPlayerLog, apiGameId: string) {
  // Resolve the UUID from the API game ID
  const gameResult = await db.execute(sql`SELECT * FROM games WHERE api_game_id = ${apiGameId} LIMIT 1`);
  const game = gameResult.length > 0 ? gameResult[0] : null;
  
  if (!game) {
    console.warn(`Game with api_game_id ${apiGameId} not found`);
    return;
  }
  
  const gameId = game.id; // Use the resolved UUID
  
  let playerId = nbaPlayerIdMap[log.playerId] || nbaPlayerIdMap[log.playerName];
  const teamId = nbaTeamIdMap[log.team];
  const opponentTeamId = nbaTeamIdMap[log.opponent];
  
  // If player found by name but not by external_id, update their external_id
  if (playerId && !nbaPlayerIdMap[log.playerId] && teamId) {
    console.log(`Updating existing player ${log.playerName} with external_id: ${log.playerId}`);
    
    await db.update(players)
      .set({ external_id: log.playerId })
      .where(eq(players.id, playerId));
    
    // Update the mapping for future lookups
    nbaPlayerIdMap[log.playerId] = playerId;
  }
  
  // If player not found at all, create a new player record
  if (!playerId && teamId) {
    console.log(`Creating new player: ${log.playerName} (${log.playerId}) for team ${log.team}`);
    
    // Insert new player with external_id
    const newPlayerResult = await db.insert(players).values({
      name: log.playerName,
      team_id: teamId,
      external_id: log.playerId,
      league: 'NBA',
      position: 'Unknown', // Will be updated when we get more data
      status: 'active'
    }).returning({ id: players.id });
    
    if (newPlayerResult.length > 0) {
      playerId = newPlayerResult[0].id;
      // Update the mapping for future lookups
      nbaPlayerIdMap[log.playerId] = playerId;
      nbaPlayerIdMap[log.playerName] = playerId;
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
  const season = args[0] || '2023-24';
  
  try {
    console.log(`🏀 Starting NBA data ingestion for ${season} season...`);
    
    // Initialize mappings
    await initializeNBAMappings();
    
    // Fetch and process NBA data
    await fetchNBAGamesAndLogs(season);
    
    console.log(`✅ NBA data ingestion completed for ${season} season!`);
    
  } catch (error) {
    console.error('❌ NBA data ingestion failed:', error);
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
  fetchNBAGamesAndLogs,
  initializeNBAMappings,
  upsertNBAGame,
  upsertNBAPlayerLog
};
