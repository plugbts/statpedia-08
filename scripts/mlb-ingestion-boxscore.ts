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

// MLB Stats API response structure
interface MLBScheduleResponse {
  dates: Array<{
    date: string;
    games: Array<{
      gamePk: number;
      gameDate: string;
      teams: {
        home: { team: { id: number; name: string; abbreviation: string } };
        away: { team: { id: number; name: string; abbreviation: string } };
      };
    }>;
  }>;
}

interface MLBBoxScoreResponse {
  teams: {
    home: {
      team: { id: number; name: string; abbreviation: string };
      players: Record<string, {
        person: { id: number; fullName: string };
        stats: {
          batting?: {
            atBats: number;
            hits: number;
            runs: number;
            homeRuns: number;
            strikeOuts: number;
            walks: number;
            rbi: number;
          };
          pitching?: {
            inningsPitched: string;
            hits: number;
            runs: number;
            earnedRuns: number;
            walks: number;
            strikeOuts: number;
            homeRuns: number;
          };
        };
      }>;
    };
    away: {
      team: { id: number; name: string; abbreviation: string };
      players: Record<string, {
        person: { id: number; fullName: string };
        stats: {
          batting?: {
            atBats: number;
            hits: number;
            runs: number;
            homeRuns: number;
            strikeOuts: number;
            walks: number;
            rbi: number;
          };
          pitching?: {
            inningsPitched: string;
            hits: number;
            runs: number;
            earnedRuns: number;
            walks: number;
            strikeOuts: number;
            homeRuns: number;
          };
        };
      }>;
    };
  };
}

interface MLBGame {
  id: string;
  externalId: string;
  season: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: string;
  awayTeamId: string;
}

interface MLBPlayerLog {
  playerId: string;
  playerName: string;
  team: string;
  opponent: string;
  gameId: string;
  date: string;
  stats: {
    hits?: number;
    runs?: number;
    homeRuns?: number;
    strikeOuts?: number;
    walks?: number;
    rbi?: number;
    atBats?: number;
    inningsPitched?: number;
    earnedRuns?: number;
  };
}

// MLB team mappings (30 teams)
const MLB_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BOS', 'CHC', 'CWS', 'CIN', 'CLE', 'COL', 'DET',
  'HOU', 'KC', 'LAA', 'LAD', 'MIA', 'MIL', 'MIN', 'NYM', 'NYY', 'OAK',
  'PHI', 'PIT', 'SD', 'SF', 'SEA', 'STL', 'TB', 'TEX', 'TOR', 'WSH'
];

// Team ID mapping for MLB
const mlbTeamIdMap: Record<string, string> = {};
const mlbPlayerIdMap: Record<string, string> = {};

// Initialize MLB team and player mappings
async function initializeMLBMappings() {
  console.log('Initializing MLB mappings...');
  
  // Get MLB league ID
  const leagueRecord = await db.select().from(leagues).where(eq(leagues.code, 'MLB')).limit(1);
  if (leagueRecord.length === 0) {
    console.warn('MLB league not found in database');
    return;
  }
  
  const leagueId = leagueRecord[0].id;
  
  // Load team abbreviation mappings
  const teamMappingsResult = await db.execute(sql`
    SELECT api_abbrev, team_id FROM team_abbrev_map 
    WHERE league = 'MLB'
  `);
  
  const teamMappings = teamMappingsResult || [];
  teamMappings.forEach((row: any) => {
    mlbTeamIdMap[row.api_abbrev] = row.team_id;
  });
  
  // Load players
  const leaguePlayersResult = await db.execute(sql`
    SELECT p.* FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE t.league_id = ${leagueId}
  `);
  
  const leaguePlayers = leaguePlayersResult || [];
  leaguePlayers.forEach((row: any) => {
    mlbPlayerIdMap[row.name] = row.id;
  });
  
  console.log(`Loaded ${teamMappings.length} team mappings and ${leaguePlayers.length} players for MLB`);
}

// MLB Stats API fetcher
async function fetchMLBGamesAndLogs(startDate: string, endDate: string) {
  console.log(`Fetching MLB data from ${startDate} to ${endDate}...`);
  
  try {
    const processedGames = new Map<string, MLBGame>();
    const processedLogs: MLBPlayerLog[] = [];
    
    // Generate date range
    const dates = generateDateRange(startDate, endDate);
    console.log(`Processing ${dates.length} dates...`);
    
    for (const date of dates) {
      try {
        console.log(`Processing date: ${date}`);
        
        // Fetch schedule for this date
        const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}`;
        const scheduleResponse = await fetch(scheduleUrl);
        
        if (!scheduleResponse.ok) {
          console.warn(`Failed to fetch schedule for ${date}: ${scheduleResponse.status}`);
          continue;
        }
        
        const scheduleData: MLBScheduleResponse = await scheduleResponse.json();
        
        if (!scheduleData.dates || scheduleData.dates.length === 0) {
          console.log(`No games found for ${date}`);
          continue;
        }
        
        const games = scheduleData.dates[0].games || [];
        console.log(`Found ${games.length} games for ${date}`);
        
        // Process each game
        for (const game of games) {
          const gameId = game.gamePk.toString();
          const homeTeam = game.teams.home.team.abbreviation;
          const awayTeam = game.teams.away.team.abbreviation;
          const gameDate = game.gameDate.split('T')[0]; // Extract date part
          
          // Store unique games
          if (!processedGames.has(gameId)) {
            processedGames.set(gameId, {
              id: uuidv4(),
              externalId: gameId,
              season: new Date(gameDate).getFullYear().toString(),
              date: gameDate,
              homeTeam: homeTeam,
              awayTeam: awayTeam,
              homeTeamId: mlbTeamIdMap[homeTeam] || '',
              awayTeamId: mlbTeamIdMap[awayTeam] || ''
            });
          }
          
          // Fetch box score for player stats
          try {
            const boxscoreUrl = `https://statsapi.mlb.com/api/v1/game/${game.gamePk}/boxscore`;
            const boxscoreResponse = await fetch(boxscoreUrl);
            
            if (!boxscoreResponse.ok) {
              console.warn(`Failed to fetch boxscore for game ${gameId}: ${boxscoreResponse.status}`);
              continue;
            }
            
            const boxscoreData: MLBBoxScoreResponse = await boxscoreResponse.json();
            
            // Process home team players
            if (boxscoreData.teams.home.players) {
              for (const [playerKey, player] of Object.entries(boxscoreData.teams.home.players)) {
                const playerLog = processMLBPlayer(player, homeTeam, awayTeam, gameId, gameDate);
                if (playerLog) {
                  processedLogs.push(playerLog);
                }
              }
            }
            
            // Process away team players
            if (boxscoreData.teams.away.players) {
              for (const [playerKey, player] of Object.entries(boxscoreData.teams.away.players)) {
                const playerLog = processMLBPlayer(player, awayTeam, homeTeam, gameId, gameDate);
                if (playerLog) {
                  processedLogs.push(playerLog);
                }
              }
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay between games
            
          } catch (error) {
            console.warn(`Error processing boxscore for game ${gameId}:`, error);
            continue;
          }
        }
        
      } catch (error) {
        console.warn(`Error processing date ${date}:`, error);
        continue;
      }
    }
    
    console.log(`Processed ${processedGames.size} unique MLB games and ${processedLogs.length} player logs`);
    
    // Upsert games
    console.log(`Upserting games...`);
    let gamesInserted = 0;
    for (const game of processedGames.values()) {
      if (game.homeTeamId && game.awayTeamId) {
        await upsertMLBGame(game);
        gamesInserted++;
      } else {
        console.warn(`Missing team IDs for game ${game.id}: home=${game.homeTeam}, away=${game.awayTeam}`);
      }
    }
    
    // Upsert player logs
    console.log(`Upserting player logs...`);
    let logsInserted = 0;
    for (const log of processedLogs) {
      const game = processedGames.get(log.gameId);
      if (game) {
        await upsertMLBPlayerLog(log, game.id);
        logsInserted++;
      }
    }
    
    console.log(`✅ Successfully inserted ${gamesInserted} games and ${logsInserted} player logs`);
    
  } catch (error) {
    console.error('Error fetching MLB data:', error);
    throw error;
  }
}

// Process individual MLB player data
function processMLBPlayer(
  player: any,
  team: string,
  opponent: string,
  gameId: string,
  gameDate: string
): MLBPlayerLog | null {
  const playerId = player.person?.id?.toString();
  const playerName = player.person?.fullName;
  
  if (!playerId || !playerName) {
    return null;
  }
  
  const batting = player.stats?.batting;
  const pitching = player.stats?.pitching;
  
  // Only include players with meaningful stats
  if (!batting && !pitching) {
    return null;
  }
  
  const stats: any = {};
  
  // Batting stats
  if (batting) {
    if (batting.atBats > 0) {
      stats.atBats = batting.atBats;
      stats.hits = batting.hits || 0;
      stats.runs = batting.runs || 0;
      stats.homeRuns = batting.homeRuns || 0;
      stats.strikeOuts = batting.strikeOuts || 0;
      stats.walks = batting.walks || 0;
      stats.rbi = batting.rbi || 0;
    }
  }
  
  // Pitching stats
  if (pitching) {
    stats.inningsPitched = parseInningsPitched(pitching.inningsPitched);
    stats.hits = pitching.hits || 0;
    stats.runs = pitching.runs || 0;
    stats.earnedRuns = pitching.earnedRuns || 0;
    stats.walks = pitching.walks || 0;
    stats.strikeOuts = pitching.strikeOuts || 0;
    stats.homeRuns = pitching.homeRuns || 0;
  }
  
  // Only include if there are meaningful stats
  if (Object.keys(stats).length === 0) {
    return null;
  }
  
  return {
    playerId: playerId,
    playerName: playerName,
    team: team,
    opponent: opponent,
    gameId: gameId,
    date: gameDate,
    stats: stats
  };
}

// Convert innings pitched from "X.X" format to decimal
function parseInningsPitched(innings: string): number {
  if (!innings) return 0;
  
  const parts = innings.split('.');
  if (parts.length !== 2) return 0;
  
  const fullInnings = parseInt(parts[0]) || 0;
  const outs = parseInt(parts[1]) || 0;
  
  return fullInnings + (outs / 3);
}

// Generate date range
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  
  return dates;
}

// Upsert MLB game
async function upsertMLBGame(game: MLBGame) {
  const leagueRecord = await db.select().from(leagues).where(eq(leagues.code, 'MLB')).limit(1);
  if (leagueRecord.length === 0) {
    console.warn('MLB league not found');
    return;
  }
  
  await db.insert(games).values({
    id: game.id,
    league_id: leagueRecord[0].id,
    season: game.season,
    game_date: game.date,
    home_team_id: game.homeTeamId,
    away_team_id: game.awayTeamId,
    external_id: game.externalId
  }).onConflictDoNothing();
}

// Upsert MLB player log
async function upsertMLBPlayerLog(log: MLBPlayerLog, gameId: string) {
  const playerId = mlbPlayerIdMap[log.playerName] || mlbPlayerIdMap[log.playerId];
  const teamId = mlbTeamIdMap[log.team];
  const opponentTeamId = mlbTeamIdMap[log.opponent];
  
  if (!playerId || !teamId || !opponentTeamId) {
    console.warn(`Missing IDs for player log: player=${log.playerName}, team=${log.team}, opponent=${log.opponent}`);
    return;
  }
  
  // Create game log entries for each stat type
  const logEntries = [];
  
  // Hits
  if (log.stats.hits !== undefined) {
    logEntries.push({
      player_id: playerId,
      team_id: teamId,
      game_id: gameId,
      opponent_id: opponentTeamId,
      prop_type: 'Hits',
      line: log.stats.hits,
      actual_value: log.stats.hits,
      hit: true,
      game_date: log.date,
      season: new Date(log.date).getFullYear().toString(),
      home_away: 'away' as const
    });
  }
  
  // Runs
  if (log.stats.runs !== undefined) {
    logEntries.push({
      player_id: playerId,
      team_id: teamId,
      game_id: gameId,
      opponent_id: opponentTeamId,
      prop_type: 'Runs',
      line: log.stats.runs,
      actual_value: log.stats.runs,
      hit: true,
      game_date: log.date,
      season: new Date(log.date).getFullYear().toString(),
      home_away: 'away' as const
    });
  }
  
  // Home Runs
  if (log.stats.homeRuns !== undefined) {
    logEntries.push({
      player_id: playerId,
      team_id: teamId,
      game_id: gameId,
      opponent_id: opponentTeamId,
      prop_type: 'Home Runs',
      line: log.stats.homeRuns,
      actual_value: log.stats.homeRuns,
      hit: true,
      game_date: log.date,
      season: new Date(log.date).getFullYear().toString(),
      home_away: 'away' as const
    });
  }
  
  // Strikeouts (for batters)
  if (log.stats.strikeOuts !== undefined && log.stats.atBats !== undefined) {
    logEntries.push({
      player_id: playerId,
      team_id: teamId,
      game_id: gameId,
      opponent_id: opponentTeamId,
      prop_type: 'Strikeouts',
      line: log.stats.strikeOuts,
      actual_value: log.stats.strikeOuts,
      hit: true,
      game_date: log.date,
      season: new Date(log.date).getFullYear().toString(),
      home_away: 'away' as const
    });
  }
  
  // RBI
  if (log.stats.rbi !== undefined) {
    logEntries.push({
      player_id: playerId,
      team_id: teamId,
      game_id: gameId,
      opponent_id: opponentTeamId,
      prop_type: 'RBI',
      line: log.stats.rbi,
      actual_value: log.stats.rbi,
      hit: true,
      game_date: log.date,
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
  const startDate = args[0] || '2024-04-01';
  const endDate = args[1] || '2024-10-31';
  
  try {
    console.log(`⚾ Starting MLB data ingestion from ${startDate} to ${endDate}...`);
    
    // Initialize mappings
    await initializeMLBMappings();
    
    // Fetch and process MLB data
    await fetchMLBGamesAndLogs(startDate, endDate);
    
    console.log(`✅ MLB data ingestion completed!`);
    
  } catch (error) {
    console.error('❌ MLB data ingestion failed:', error);
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
  fetchMLBGamesAndLogs,
  initializeMLBMappings,
  upsertMLBGame,
  upsertMLBPlayerLog
};
