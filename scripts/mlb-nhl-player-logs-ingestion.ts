#!/usr/bin/env tsx

/**
 * MLB/NHL Player Logs Ingestion System
 * Unified script for ingesting player game logs from MLB and NHL APIs
 * 
 * Usage:
 *   npm run mlb-nhl:test
 *   npm run mlb-nhl:debug <game_id> <league>
 *   npm run mlb-nhl:batch <game_ids> <league>
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { games, players, teams, player_game_logs } from '../src/db/schema/index';
import { eq, sql } from 'drizzle-orm';

// Load environment variables
config({ path: '.env.local' });

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Database connection string not found. Please check your .env.local file.');
}

const sql_client = postgres(connectionString);
const db = drizzle(sql_client, { schema: { games, players, teams, player_game_logs } });

/**
 * Fetch data with retry logic and exponential backoff
 */
async function fetchWithRetry(url: string, retries = 3, customHeaders?: any): Promise<any> {
  const headers = customHeaders || {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Fetching: ${url} (attempt ${i + 1}/${retries})`);
      const res = await fetch(url, { headers });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log(`✅ Successfully fetched data from ${url}`);
      return data;
    } catch (error: any) {
      console.error(`❌ Attempt ${i + 1} failed:`, error.message);
      
      if (i === retries - 1) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = 1000 * Math.pow(2, i);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Resolve game UUID by api_game_id, create if doesn't exist
 */
async function getOrCreateGameUUID(db: any, apiGameId: string, league: string): Promise<string> {
  const game = await db.query.games.findFirst({
    where: eq(games.api_game_id, apiGameId)
  });
  
  if (game) {
    return game.id;
  }
  
  // For now, just throw an error - we need proper game data to create games
  throw new Error(`Game ${apiGameId} not found. Please ensure games are created with proper team and league data first.`);
}

/**
 * Upsert player by external_id (MLB/NHL numeric ID)
 */
async function getOrCreatePlayer(db: any, extId: string, name: string, league: string, teamId?: string): Promise<string> {
  // First try to find by external_id
  let player = await db.query.players.findFirst({
    where: eq(players.external_id, extId)
  });
  
  if (player) {
    return player.id;
  }
  
  // If not found, create new player
  const inserted = await db.insert(players).values({
    id: crypto.randomUUID(),
    external_id: extId,
    name: name,
    league: league,
    team_id: teamId ?? null,
    status: 'active'
  }).returning({ id: players.id });
  
  console.log(`✅ Created new player: ${name} (${extId})`);
  return inserted[0].id;
}

/**
 * Resolve team_id via mapping
 */
async function resolveTeamId(db: any, league: string, apiAbbrev: string): Promise<string> {
  const result = await db.execute(sql`
    SELECT team_id FROM team_abbrev_map 
    WHERE league = ${league} AND api_abbrev = ${apiAbbrev} 
    LIMIT 1
  `);
  
  if (!result[0]) {
    throw new Error(`Missing team mapping ${league}:${apiAbbrev}`);
  }
  
  return result[0].team_id;
}

/**
 * Insert one player log with full checks
 */
async function insertPlayerLog(db: any, apiGameId: string, apiPlayerId: string, playerName: string, league: string, teamAbbrev: string, stats: any): Promise<void> {
  try {
    const gameId = await getOrCreateGameUUID(db, apiGameId, league);
    const teamId = await resolveTeamId(db, league, teamAbbrev);
    const playerId = await getOrCreatePlayer(db, apiPlayerId, playerName, league, teamId);
    
    // Create log entries for each stat type
    const logEntries = [];
    
    // Process stats based on league
    if (league === 'MLB') {
      // MLB stats
      if (stats.hits !== undefined) {
        logEntries.push({
          id: crypto.randomUUID(),
          player_id: playerId,
          team_id: teamId,
          game_id: gameId,
          opponent_id: teamId, // Temporary - should be resolved from game data
          prop_type: 'Hits',
          line: stats.hits,
          actual_value: stats.hits,
          hit: true,
          game_date: new Date().toISOString().split('T')[0], // Temporary
          season: new Date().getFullYear().toString(),
          home_away: 'away' as const
        });
      }
      
      if (stats.runs !== undefined) {
        logEntries.push({
          id: crypto.randomUUID(),
          player_id: playerId,
          team_id: teamId,
          game_id: gameId,
          opponent_id: teamId,
          prop_type: 'Runs',
          line: stats.runs,
          actual_value: stats.runs,
          hit: true,
          game_date: new Date().toISOString().split('T')[0],
          season: new Date().getFullYear().toString(),
          home_away: 'away' as const
        });
      }
      
      if (stats.homeRuns !== undefined) {
        logEntries.push({
          id: crypto.randomUUID(),
          player_id: playerId,
          team_id: teamId,
          game_id: gameId,
          opponent_id: teamId,
          prop_type: 'Home Runs',
          line: stats.homeRuns,
          actual_value: stats.homeRuns,
          hit: true,
          game_date: new Date().toISOString().split('T')[0],
          season: new Date().getFullYear().toString(),
          home_away: 'away' as const
        });
      }
    } else if (league === 'NHL') {
      // NHL stats
      if (stats.goals !== undefined) {
        logEntries.push({
          id: crypto.randomUUID(),
          player_id: playerId,
          team_id: teamId,
          game_id: gameId,
          opponent_id: teamId,
          prop_type: 'Goals',
          line: stats.goals,
          actual_value: stats.goals,
          hit: true,
          game_date: new Date().toISOString().split('T')[0],
          season: new Date().getFullYear().toString(),
          home_away: 'away' as const
        });
      }
      
      if (stats.assists !== undefined) {
        logEntries.push({
          id: crypto.randomUUID(),
          player_id: playerId,
          team_id: teamId,
          game_id: gameId,
          opponent_id: teamId,
          prop_type: 'Assists',
          line: stats.assists,
          actual_value: stats.assists,
          hit: true,
          game_date: new Date().toISOString().split('T')[0],
          season: new Date().getFullYear().toString(),
          home_away: 'away' as const
        });
      }
      
      if (stats.points !== undefined) {
        logEntries.push({
          id: crypto.randomUUID(),
          player_id: playerId,
          team_id: teamId,
          game_id: gameId,
          opponent_id: teamId,
          prop_type: 'Points',
          line: stats.points,
          actual_value: stats.points,
          hit: true,
          game_date: new Date().toISOString().split('T')[0],
          season: new Date().getFullYear().toString(),
          home_away: 'away' as const
        });
      }
    }
    
    if (logEntries.length > 0) {
      await db.insert(player_game_logs).values(logEntries).onConflictDoNothing();
      console.log(`✅ Inserted player log: ${playerName} (${apiPlayerId}) for game ${apiGameId}`);
    }
    
  } catch (err: any) {
    console.error('❌ Player log insert failed', {
      apiGameId,
      apiPlayerId,
      playerName,
      league,
      teamAbbrev,
      error: err.message
    });
    throw err;
  }
}

/**
 * Fetch and parse MLB boxscore for one game
 */
async function ingestMLBGameBoxscore(db: any, apiGameId: string): Promise<void> {
  console.log(`\n🎯 Starting MLB ingestion for game ${apiGameId}`);
  
  try {
    const data = await fetchWithRetry(
      `https://statsapi.mlb.com/api/v1/game/${apiGameId}/boxscore`,
      3,
      {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.mlb.com/',
        'Origin': 'https://www.mlb.com'
      }
    );
    
    // Process home team players
    if (data.teams?.home?.players) {
      for (const [playerKey, player] of Object.entries(data.teams.home.players)) {
        const playerData = player as any;
        const playerId = playerData.person?.id?.toString();
        const playerName = playerData.person?.fullName;
        const teamAbbrev = data.teams.home.team.abbreviation;
        
        if (playerId && playerName && playerData.stats) {
          const batting = playerData.stats.batting;
          const pitching = playerData.stats.pitching;
          
          const stats: any = {};
          if (batting) {
            stats.hits = batting.hits || 0;
            stats.runs = batting.runs || 0;
            stats.homeRuns = batting.homeRuns || 0;
            stats.strikeOuts = batting.strikeOuts || 0;
            stats.rbi = batting.rbi || 0;
          }
          if (pitching) {
            stats.inningsPitched = parseInningsPitched(pitching.inningsPitched);
            stats.strikeOuts = pitching.strikeOuts || 0;
          }
          
          if (Object.keys(stats).length > 0) {
            await insertPlayerLog(db, apiGameId, playerId, playerName, 'MLB', teamAbbrev, stats);
          }
        }
      }
    }
    
    // Process away team players
    if (data.teams?.away?.players) {
      for (const [playerKey, player] of Object.entries(data.teams.away.players)) {
        const playerData = player as any;
        const playerId = playerData.person?.id?.toString();
        const playerName = playerData.person?.fullName;
        const teamAbbrev = data.teams.away.team.abbreviation;
        
        if (playerId && playerName && playerData.stats) {
          const batting = playerData.stats.batting;
          const pitching = playerData.stats.pitching;
          
          const stats: any = {};
          if (batting) {
            stats.hits = batting.hits || 0;
            stats.runs = batting.runs || 0;
            stats.homeRuns = batting.homeRuns || 0;
            stats.strikeOuts = batting.strikeOuts || 0;
            stats.rbi = batting.rbi || 0;
          }
          if (pitching) {
            stats.inningsPitched = parseInningsPitched(pitching.inningsPitched);
            stats.strikeOuts = pitching.strikeOuts || 0;
          }
          
          if (Object.keys(stats).length > 0) {
            await insertPlayerLog(db, apiGameId, playerId, playerName, 'MLB', teamAbbrev, stats);
          }
        }
      }
    }
    
    console.log(`✅ Successfully processed MLB game ${apiGameId}`);
    
  } catch (error: any) {
    console.error(`❌ Failed to ingest MLB game ${apiGameId}:`, error.message);
    throw error;
  }
}

/**
 * Fetch and parse NHL boxscore for one game
 */
async function ingestNHLGameBoxscore(db: any, apiGameId: string): Promise<void> {
  console.log(`\n🎯 Starting NHL ingestion for game ${apiGameId}`);
  
  try {
    const data = await fetchWithRetry(
      `https://api-web.nhle.com/v1/gamecenter/${apiGameId}/boxscore`,
      3,
      {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.nhl.com/',
        'Origin': 'https://www.nhl.com'
      }
    );
    
    // Process home team players
    if (data.playerByGameStats?.homeTeam) {
      const homeTeam = data.playerByGameStats.homeTeam;
      const teamAbbrev = data.homeTeam.abbrev;
      
      // Process forwards
      if (homeTeam.forwards) {
        for (const player of homeTeam.forwards) {
          const playerId = player.playerId?.toString();
          const playerName = player.name?.default;
          
          if (playerId && playerName) {
            const stats = {
              goals: player.goals || 0,
              assists: player.assists || 0,
              points: player.points || 0,
              shots: player.sog || 0,
              hits: player.hits || 0,
              plusMinus: player.plusMinus || 0,
              penaltyMinutes: player.pim || 0,
              timeOnIce: player.toi || '0:00'
            };
            
            await insertPlayerLog(db, apiGameId, playerId, playerName, 'NHL', teamAbbrev, stats);
          }
        }
      }
      
      // Process defense
      if (homeTeam.defense) {
        for (const player of homeTeam.defense) {
          const playerId = player.playerId?.toString();
          const playerName = player.name?.default;
          
          if (playerId && playerName) {
            const stats = {
              goals: player.goals || 0,
              assists: player.assists || 0,
              points: player.points || 0,
              shots: player.sog || 0,
              hits: player.hits || 0,
              plusMinus: player.plusMinus || 0,
              penaltyMinutes: player.pim || 0,
              timeOnIce: player.toi || '0:00'
            };
            
            await insertPlayerLog(db, apiGameId, playerId, playerName, 'NHL', teamAbbrev, stats);
          }
        }
      }
      
      // Process goalies
      if (homeTeam.goalies) {
        for (const player of homeTeam.goalies) {
          const playerId = player.playerId?.toString();
          const playerName = player.name?.default;
          
          if (playerId && playerName) {
            const stats = {
              saves: player.saves || 0,
              shotsAgainst: player.shotsAgainst || 0,
              savePercentage: player.savePctg || 0,
              goalsAgainst: player.goalsAgainst || 0,
              timeOnIce: player.toi || '0:00'
            };
            
            await insertPlayerLog(db, apiGameId, playerId, playerName, 'NHL', teamAbbrev, stats);
          }
        }
      }
    }
    
    // Process away team players
    if (data.playerByGameStats?.awayTeam) {
      const awayTeam = data.playerByGameStats.awayTeam;
      const teamAbbrev = data.awayTeam.abbrev;
      
      // Process forwards
      if (awayTeam.forwards) {
        for (const player of awayTeam.forwards) {
          const playerId = player.playerId?.toString();
          const playerName = player.name?.default;
          
          if (playerId && playerName) {
            const stats = {
              goals: player.goals || 0,
              assists: player.assists || 0,
              points: player.points || 0,
              shots: player.sog || 0,
              hits: player.hits || 0,
              plusMinus: player.plusMinus || 0,
              penaltyMinutes: player.pim || 0,
              timeOnIce: player.toi || '0:00'
            };
            
            await insertPlayerLog(db, apiGameId, playerId, playerName, 'NHL', teamAbbrev, stats);
          }
        }
      }
      
      // Process defense
      if (awayTeam.defense) {
        for (const player of awayTeam.defense) {
          const playerId = player.playerId?.toString();
          const playerName = player.name?.default;
          
          if (playerId && playerName) {
            const stats = {
              goals: player.goals || 0,
              assists: player.assists || 0,
              points: player.points || 0,
              shots: player.sog || 0,
              hits: player.hits || 0,
              plusMinus: player.plusMinus || 0,
              penaltyMinutes: player.pim || 0,
              timeOnIce: player.toi || '0:00'
            };
            
            await insertPlayerLog(db, apiGameId, playerId, playerName, 'NHL', teamAbbrev, stats);
          }
        }
      }
      
      // Process goalies
      if (awayTeam.goalies) {
        for (const player of awayTeam.goalies) {
          const playerId = player.playerId?.toString();
          const playerName = player.name?.default;
          
          if (playerId && playerName) {
            const stats = {
              saves: player.saves || 0,
              shotsAgainst: player.shotsAgainst || 0,
              savePercentage: player.savePctg || 0,
              goalsAgainst: player.goalsAgainst || 0,
              timeOnIce: player.toi || '0:00'
            };
            
            await insertPlayerLog(db, apiGameId, playerId, playerName, 'NHL', teamAbbrev, stats);
          }
        }
      }
    }
    
    console.log(`✅ Successfully processed NHL game ${apiGameId}`);
    
  } catch (error: any) {
    console.error(`❌ Failed to ingest NHL game ${apiGameId}:`, error.message);
    throw error;
  }
}

/**
 * Convert innings pitched from "X.X" format to decimal
 */
function parseInningsPitched(innings: string): number {
  if (!innings) return 0;
  
  const parts = innings.split('.');
  if (parts.length !== 2) return 0;
  
  const fullInnings = parseInt(parts[0]) || 0;
  const outs = parseInt(parts[1]) || 0;
  
  return fullInnings + (outs / 3);
}

/**
 * Batch processing with observability and guardrails
 */
async function ingestAllGames(db: any, gameIds: string[], league: string): Promise<void> {
  console.log(`\n🚀 Starting batch ingestion for ${gameIds.length} games (${league})`);
  
  const startTime = Date.now();
  let inserted = 0;
  let failed = 0;
  
  for (const gameId of gameIds) {
    try {
      if (league === 'MLB') {
        await ingestMLBGameBoxscore(db, gameId);
      } else if (league === 'NHL') {
        await ingestNHLGameBoxscore(db, gameId);
      }
      inserted++;
    } catch (e: any) {
      failed++;
      console.error('❌ Game ingestion failed', { gameId, error: e.message });
    }
    
    // Throttle ~1 req/sec
    await new Promise(r => setTimeout(r, 1000));
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgTimePerGame = (parseFloat(duration) / gameIds.length).toFixed(1);
  
  console.log(`\n📈 Batch complete: {
  gamesProcessed: ${gameIds.length},
  inserted: ${inserted},
  failed: ${failed},
  duration: '${duration}s',
  avgTimePerGame: '${avgTimePerGame}s'
}`);
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0];
  const gameIdOrIds = args[1];
  const league = args[2] || 'MLB';
  
  try {
    if (mode === 'debug' && gameIdOrIds) {
      console.log(`🔍 Debug mode: Testing single game ${gameIdOrIds}`);
      
      if (league === 'MLB') {
        await ingestMLBGameBoxscore(db, gameIdOrIds);
      } else if (league === 'NHL') {
        await ingestNHLGameBoxscore(db, gameIdOrIds);
      } else {
        throw new Error(`Unsupported league: ${league}`);
      }
      
      console.log(`✅ Debug test successful for game ${gameIdOrIds}`);
      
    } else if (mode === 'batch' && gameIdOrIds) {
      const gameIds = gameIdOrIds.split(',').map(id => id.trim());
      await ingestAllGames(db, gameIds, league);
      
    } else {
      console.log(`
Usage:
  npm run mlb-nhl:debug <game_id> <league>
  npm run mlb-nhl:batch <game_ids> <league>
  
Examples:
  npm run mlb-nhl:debug 123456789 MLB
  npm run mlb-nhl:debug 2024020001 NHL
  npm run mlb-nhl:batch "123456789,123456790" MLB
  npm run mlb-nhl:batch "2024020001,2024020002" NHL
      `);
    }
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await sql_client.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  ingestMLBGameBoxscore,
  ingestNHLGameBoxscore,
  ingestAllGames,
  getOrCreateGameUUID,
  getOrCreatePlayer,
  resolveTeamId,
  insertPlayerLog
};
