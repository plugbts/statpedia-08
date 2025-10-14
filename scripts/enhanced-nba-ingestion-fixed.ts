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

// WNBA team mappings
const WNBA_TEAMS = [
  'CON', 'LVA', 'LAS', 'NYL', 'GSV', 'PHO', 'SEA', 'CHI', 'WAS', 'MIN', 'ATL', 'IND', 'DAL'
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
  
  // Load players
  const leaguePlayersResult = await db.execute(sql`
    SELECT p.* FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE t.league_id = ${leagueId}
  `);
  
  const leaguePlayers = leaguePlayersResult || [];
  leaguePlayers.forEach((row: any) => {
    nbaPlayerIdMap[row.name] = row.id;
  });
  
  console.log(`Loaded ${teamMappings.length} team mappings and ${leaguePlayers.length} players for NBA`);
}

// Enhanced NBA Stats API fetcher with proper NBA/WNBA separation
async function fetchNBAGamesAndLogs(season: string = '2023-24') {
  console.log(`Fetching NBA data for ${season} season...`);
  
  try {
    const baseUrl = 'https://stats.nba.com/stats';
    
    // Use leaguegamefinder to get comprehensive game and player data
    const gameFinderUrl = `${baseUrl}/leaguegamefinder?Season=${season}&SeasonType=Regular%20Season`;
    
    console.log(`Fetching from: ${gameFinderUrl}`);
    
    const response = await fetch(gameFinderUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://stats.nba.com/',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch NBA data: ${response.status} ${response.statusText}`);
    }
    
    const data: NBAGameFinderResponse = await response.json();
    
    if (!data.resultSets || data.resultSets.length === 0) {
      throw new Error('No result sets found in NBA API response');
    }
    
    const gameFinderData = data.resultSets[0];
    const games = gameFinderData.rowSet || [];
    
    console.log(`Found ${games.length} total game records for ${season}`);
    
    // Filter for NBA teams only
    const nbaGames = games.filter(game => {
      const teamAbbr = game[NBA_COLUMNS.TEAM_ABBREVIATION];
      return NBA_TEAMS.includes(teamAbbr);
    });
    
    console.log(`Filtered to ${nbaGames.length} NBA games (excluding WNBA)`);
    console.log('Sample NBA game data:', nbaGames.slice(0, 2));
    
    // Debug: Check for player data in sample
    console.log('Checking for player data in sample games...');
    const sampleWithPlayers = nbaGames.filter(game => {
      const playerId = game[NBA_COLUMNS.PLAYER_ID]?.toString();
      const playerName = game[NBA_COLUMNS.PLAYER_NAME];
      return playerId && playerName && playerId !== '0' && playerName !== '';
    });
    console.log(`Found ${sampleWithPlayers.length} records with player data out of ${nbaGames.length} total`);
    if (sampleWithPlayers.length > 0) {
      console.log('Sample player record:', sampleWithPlayers[0]);
    }
    
    // Process games and player logs
    const processedGames = new Map<string, NBAGame>();
    const processedLogs: NBAPlayerLog[] = [];
    
    for (const game of nbaGames) {
      const gameId = game[NBA_COLUMNS.GAME_ID]?.toString();
      const teamAbbr = game[NBA_COLUMNS.TEAM_ABBREVIATION];
      const gameDate = game[NBA_COLUMNS.GAME_DATE];
      const matchup = game[NBA_COLUMNS.MATCHUP];
      
      if (!gameId || !teamAbbr || !gameDate) {
        continue;
      }
      
      // Parse matchup to get opponent (e.g., "LAL @ GSW" or "GSW vs. LAL")
      let opponent = '';
      let isHome = false;
      
      if (matchup.includes(' vs. ')) {
        // Home game: "GSW vs. LAL"
        const parts = matchup.split(' vs. ');
        if (parts.length === 2) {
          opponent = parts[1].trim();
          isHome = true;
        }
      } else if (matchup.includes(' @ ')) {
        // Away game: "LAL @ GSW"
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
      
      // Store unique games
      if (!processedGames.has(gameId)) {
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
      
      // Process player stats - check if this is a player record (has player data)
      const playerId = game[NBA_COLUMNS.PLAYER_ID]?.toString();
      const playerName = game[NBA_COLUMNS.PLAYER_NAME];
      
      // Only process if this is a player record (not a team total)
      if (playerId && playerName && playerId !== '0' && playerName !== '') {
        // Check if we have meaningful stats (not all zeros)
        const points = game[NBA_COLUMNS.PTS] || 0;
        const assists = game[NBA_COLUMNS.AST] || 0;
        const rebounds = game[NBA_COLUMNS.REB] || 0;
        const minutes = game[NBA_COLUMNS.MIN] || 0;
        
        // Only include players who actually played (have minutes and stats)
        if (minutes > 0 && (points > 0 || assists > 0 || rebounds > 0)) {
          processedLogs.push({
            playerId: playerId,
            playerName: playerName,
            team: teamAbbr,
            opponent: opponent,
            gameId: gameId,
            date: gameDate,
            stats: {
              points: points || undefined,
              assists: assists || undefined,
              rebounds: rebounds || undefined,
              threePointers: game[NBA_COLUMNS.FG3M] || undefined,
              steals: game[NBA_COLUMNS.STL] || undefined,
              blocks: game[NBA_COLUMNS.BLK] || undefined,
              turnovers: game[NBA_COLUMNS.TOV] || undefined,
              minutes: minutes || undefined,
              fieldGoalsMade: game[NBA_COLUMNS.FGM] || undefined,
              fieldGoalsAttempted: game[NBA_COLUMNS.FGA] || undefined,
              freeThrowsMade: game[NBA_COLUMNS.FTM] || undefined,
              freeThrowsAttempted: game[NBA_COLUMNS.FTA] || undefined
            }
          });
        }
      }
    }
    
    console.log(`Processed ${processedGames.size} unique NBA games and ${processedLogs.length} player logs`);
    
    // Upsert games
    let gamesInserted = 0;
    for (const game of processedGames.values()) {
      if (game.homeTeamId && game.awayTeamId) {
        await upsertNBAGame(game);
        gamesInserted++;
      } else {
        console.warn(`Missing team IDs for game ${game.id}: home=${game.homeTeam}, away=${game.awayTeam}`);
      }
    }
    
    // Upsert player logs
    let logsInserted = 0;
    for (const log of processedLogs) {
      const game = processedGames.get(log.gameId);
      if (game) {
        await upsertNBAPlayerLog(log, game.id);
        logsInserted++;
      }
    }
    
    console.log(`Successfully inserted ${gamesInserted} NBA games and ${logsInserted} player logs`);
    
  } catch (error) {
    console.error('Error fetching NBA data:', error);
    throw error;
  }
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
    external_id: game.externalId
  }).onConflictDoNothing();
}

// Upsert NBA player log
async function upsertNBAPlayerLog(log: NBAPlayerLog, gameId: string) {
  const playerId = nbaPlayerIdMap[log.playerName] || nbaPlayerIdMap[log.playerId];
  const teamId = nbaTeamIdMap[log.team];
  const opponentTeamId = nbaTeamIdMap[log.opponent];
  
  if (!playerId || !teamId || !opponentTeamId) {
    console.warn(`Missing IDs for player log: player=${log.playerName}, team=${log.team}, opponent=${log.opponent}`);
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
