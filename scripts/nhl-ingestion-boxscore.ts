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

// NHL Stats API response structure
interface NHLScheduleResponse {
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

interface NHLBoxScoreResponse {
  teams: {
    home: {
      team: { id: number; name: string; abbreviation: string };
      players: Record<string, {
        person: { id: number; fullName: string };
        stats: {
          skaterStats?: {
            goals: number;
            assists: number;
            points: number;
            shots: number;
            hits: number;
            penaltyMinutes: number;
            plusMinus: number;
            timeOnIce: string;
          };
          goalieStats?: {
            timeOnIce: string;
            shots: number;
            saves: number;
            savePercentage: number;
          };
        };
      }>;
    };
    away: {
      team: { id: number; name: string; abbreviation: string };
      players: Record<string, {
        person: { id: number; fullName: string };
        stats: {
          skaterStats?: {
            goals: number;
            assists: number;
            points: number;
            shots: number;
            hits: number;
            penaltyMinutes: number;
            plusMinus: number;
            timeOnIce: string;
          };
          goalieStats?: {
            timeOnIce: string;
            shots: number;
            saves: number;
            savePercentage: number;
          };
        };
      }>;
    };
  };
}

interface NHLGame {
  id: string;
  externalId: string;
  season: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: string;
  awayTeamId: string;
}

interface NHLPlayerLog {
  playerId: string;
  playerName: string;
  team: string;
  opponent: string;
  gameId: string;
  date: string;
  stats: {
    goals?: number;
    assists?: number;
    points?: number;
    shots?: number;
    hits?: number;
    penaltyMinutes?: number;
    plusMinus?: number;
    timeOnIce?: number;
    saves?: number;
    savePercentage?: number;
  };
}

// NHL team mappings (32 teams including Utah Mammoth)
const NHL_TEAMS = [
  'ANA', 'ARI', 'BOS', 'BUF', 'CGY', 'CAR', 'CHI', 'COL', 'CBJ', 'DAL',
  'DET', 'EDM', 'FLA', 'LAK', 'MIN', 'MTL', 'NSH', 'NJD', 'NYI', 'NYR',
  'OTT', 'PHI', 'PIT', 'SJS', 'SEA', 'STL', 'TBL', 'TOR', 'VAN', 'VGK',
  'WSH', 'WPG', 'UTA' // Utah Mammoth (2025 expansion)
];

// Team ID mapping for NHL
const nhlTeamIdMap: Record<string, string> = {};
const nhlPlayerIdMap: Record<string, string> = {};

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

// Initialize NHL team and player mappings
async function initializeNHLMappings() {
  console.log('Initializing NHL mappings...');
  
  // Get NHL league ID
  const leagueRecord = await db.select().from(leagues).where(eq(leagues.code, 'NHL')).limit(1);
  if (leagueRecord.length === 0) {
    console.warn('NHL league not found in database');
    return;
  }
  
  const leagueId = leagueRecord[0].id;
  
  // Load team abbreviation mappings
  const teamMappingsResult = await db.execute(sql`
    SELECT api_abbrev, team_id FROM team_abbrev_map 
    WHERE league = 'NHL'
  `);
  
  const teamMappings = teamMappingsResult || [];
  teamMappings.forEach((row: any) => {
    nhlTeamIdMap[row.api_abbrev] = row.team_id;
  });
  
  // Load players
  const leaguePlayersResult = await db.execute(sql`
    SELECT p.* FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE t.league_id = ${leagueId}
  `);
  
  const leaguePlayers = leaguePlayersResult || [];
  leaguePlayers.forEach((row: any) => {
    nhlPlayerIdMap[row.name] = row.id;
  });
  
  console.log(`Loaded ${teamMappings.length} team mappings and ${leaguePlayers.length} players for NHL`);
}

// NHL Stats API fetcher
async function fetchNHLGamesAndLogs(startDate: string, endDate: string) {
  console.log(`Fetching NHL data from ${startDate} to ${endDate}...`);
  
  try {
    const processedGames = new Map<string, NHLGame>();
    const processedLogs: NHLPlayerLog[] = [];
    
    // Generate date range
    const dates = generateDateRange(startDate, endDate);
    console.log(`Processing ${dates.length} dates...`);
    
    for (const date of dates) {
      try {
        console.log(`Processing date: ${date}`);
        
        // Fetch schedule for this date
        const scheduleUrl = `https://api-web.nhle.com/v1/schedule/${date}`;
        const scheduleResponse = await fetchWithRetry(scheduleUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.nhl.com/',
            'Origin': 'https://www.nhl.com'
          }
        });
        
        const scheduleData: NHLScheduleResponse = await scheduleResponse.json();
        
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
              homeTeamId: nhlTeamIdMap[homeTeam] || '',
              awayTeamId: nhlTeamIdMap[awayTeam] || ''
            });
          }
          
          // Fetch box score for player stats
          try {
            const boxscoreUrl = `https://api-web.nhle.com/v1/gamecenter/${game.gamePk}/play-by-play`;
            const boxscoreResponse = await fetchWithRetry(boxscoreUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json, text/plain, */*',
                'Referer': 'https://www.nhl.com/',
                'Origin': 'https://www.nhl.com'
              }
            });
            
            const boxscoreData = await boxscoreResponse.json();
            
            // Process home team players
            if (boxscoreData.homeTeam?.players) {
              for (const [playerKey, player] of Object.entries(boxscoreData.homeTeam.players)) {
                const playerLog = processNHLPlayer(player, homeTeam, awayTeam, gameId, gameDate);
                if (playerLog) {
                  processedLogs.push(playerLog);
                }
              }
            }
            
            // Process away team players
            if (boxscoreData.awayTeam?.players) {
              for (const [playerKey, player] of Object.entries(boxscoreData.awayTeam.players)) {
                const playerLog = processNHLPlayer(player, awayTeam, homeTeam, gameId, gameDate);
                if (playerLog) {
                  processedLogs.push(playerLog);
                }
              }
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between requests
            
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
    
    console.log(`Processed ${processedGames.size} unique NHL games and ${processedLogs.length} player logs`);
    
    // Upsert games
    console.log(`Upserting games...`);
    let gamesInserted = 0;
    for (const game of processedGames.values()) {
      if (game.homeTeamId && game.awayTeamId) {
        await upsertNHLGame(game);
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
        await upsertNHLPlayerLog(log, game.id);
        logsInserted++;
      }
    }
    
    console.log(`✅ Successfully inserted ${gamesInserted} games and ${logsInserted} player logs`);
    
  } catch (error) {
    console.error('Error fetching NHL data:', error);
    throw error;
  }
}

// Process individual NHL player data
function processNHLPlayer(
  player: any,
  team: string,
  opponent: string,
  gameId: string,
  gameDate: string
): NHLPlayerLog | null {
  const playerId = player.person?.id?.toString();
  const playerName = player.person?.fullName;
  
  if (!playerId || !playerName) {
    return null;
  }
  
  const skaterStats = player.stats?.skaterStats;
  const goalieStats = player.stats?.goalieStats;
  
  // Only include players with meaningful stats
  if (!skaterStats && !goalieStats) {
    return null;
  }
  
  const stats: any = {};
  
  // Skater stats
  if (skaterStats) {
    stats.goals = skaterStats.goals || 0;
    stats.assists = skaterStats.assists || 0;
    stats.points = skaterStats.points || 0;
    stats.shots = skaterStats.shots || 0;
    stats.hits = skaterStats.hits || 0;
    stats.penaltyMinutes = skaterStats.penaltyMinutes || 0;
    stats.plusMinus = skaterStats.plusMinus || 0;
    stats.timeOnIce = parseTimeOnIce(skaterStats.timeOnIce);
  }
  
  // Goalie stats
  if (goalieStats) {
    stats.saves = goalieStats.saves || 0;
    stats.savePercentage = goalieStats.savePercentage || 0;
    stats.timeOnIce = parseTimeOnIce(goalieStats.timeOnIce);
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

// Convert time on ice from "MM:SS" format to decimal minutes
function parseTimeOnIce(timeOnIce: string): number {
  if (!timeOnIce) return 0;
  
  const parts = timeOnIce.split(':');
  if (parts.length !== 2) return 0;
  
  const minutes = parseInt(parts[0]) || 0;
  const seconds = parseInt(parts[1]) || 0;
  
  return minutes + (seconds / 60);
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

// Upsert NHL game
async function upsertNHLGame(game: NHLGame) {
  const leagueRecord = await db.select().from(leagues).where(eq(leagues.code, 'NHL')).limit(1);
  if (leagueRecord.length === 0) {
    console.warn('NHL league not found');
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

// Upsert NHL player log
async function upsertNHLPlayerLog(log: NHLPlayerLog, gameId: string) {
  const playerId = nhlPlayerIdMap[log.playerName] || nhlPlayerIdMap[log.playerId];
  const teamId = nhlTeamIdMap[log.team];
  const opponentTeamId = nhlTeamIdMap[log.opponent];
  
  if (!playerId || !teamId || !opponentTeamId) {
    console.warn(`Missing IDs for player log: player=${log.playerName}, team=${log.team}, opponent=${log.opponent}`);
    return;
  }
  
  // Create game log entries for each stat type
  const logEntries = [];
  
  // Goals
  if (log.stats.goals !== undefined) {
    logEntries.push({
      player_id: playerId,
      team_id: teamId,
      game_id: gameId,
      opponent_id: opponentTeamId,
      prop_type: 'Goals',
      line: log.stats.goals,
      actual_value: log.stats.goals,
      hit: true,
      game_date: log.date,
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
      game_date: log.date,
      season: new Date(log.date).getFullYear().toString(),
      home_away: 'away' as const
    });
  }
  
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
      game_date: log.date,
      season: new Date(log.date).getFullYear().toString(),
      home_away: 'away' as const
    });
  }
  
  // Shots
  if (log.stats.shots !== undefined) {
    logEntries.push({
      player_id: playerId,
      team_id: teamId,
      game_id: gameId,
      opponent_id: opponentTeamId,
      prop_type: 'Shots',
      line: log.stats.shots,
      actual_value: log.stats.shots,
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
  const startDate = args[0] || '2024-10-01';
  const endDate = args[1] || '2025-04-30';
  
  try {
    console.log(`🏒 Starting NHL data ingestion from ${startDate} to ${endDate}...`);
    
    // Initialize mappings
    await initializeNHLMappings();
    
    // Fetch and process NHL data
    await fetchNHLGamesAndLogs(startDate, endDate);
    
    console.log(`✅ NHL data ingestion completed!`);
    
  } catch (error) {
    console.error('❌ NHL data ingestion failed:', error);
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
  fetchNHLGamesAndLogs,
  initializeNHLMappings,
  upsertNHLGame,
  upsertNHLPlayerLog
};
