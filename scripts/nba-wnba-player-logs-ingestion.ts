#!/usr/bin/env tsx

/**
 * NBA/WNBA Player Logs Ingestion System
 * 
 * This script implements resilient data ingestion for NBA/WNBA player game logs
 * with proper schema validation, error handling, and observability.
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { games, players, teams, player_game_logs } from '../src/db/schema/index';
import { randomUUID } from 'crypto';

// Load environment variables
config({ path: '.env.local' });

// Database connection
const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Database connection string not found. Please check your .env.local file.');
}

const sql = postgres(connectionString);
const db = drizzle(sql, { schema: { games, players, teams, player_game_logs } });

/**
 * Fetch data with retry logic and exponential backoff
 */
async function fetchWithRetry(url: string, retries = 3, customHeaders?: any): Promise<any> {
  const headers = customHeaders || {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.nba.com/',
    'Origin': 'https://www.nba.com',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
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
 * Resolve game UUID by api_game_id
 */
async function getGameUUID(db: any, apiGameId: string): Promise<string> {
  const game = await db.query.games.findFirst({ 
    where: eq(games.api_game_id, apiGameId) 
  });
  
  if (!game) {
    throw new Error(`Game ${apiGameId} not found`);
  }
  
  return game.id;
}

/**
 * Upsert player by external_id (NBA/WNBA numeric ID)
 */
async function getOrCreatePlayer(
  db: any, 
  extId: string, 
  name: string, 
  league: string, 
  teamId?: string
): Promise<string> {
  // First try to find existing player by external_id
  const existingPlayer = await db.query.players.findFirst({ 
    where: eq(players.external_id, extId) 
  });
  
  if (existingPlayer) {
    return existingPlayer.id;
  }
  
  // Create new player
  const newPlayerId = randomUUID();
  const inserted = await db.insert(players).values({
    id: newPlayerId,
    external_id: extId,
    name: name,
    position: 'Unknown', // Will be updated later
    status: 'Active',
    team_id: teamId || null,
    created_at: new Date(),
    updated_at: new Date()
  }).returning({ id: players.id });
  
  console.log(`✅ Created new player: ${name} (${extId})`);
  return inserted[0].id;
}

/**
 * Resolve team_id via mapping (handles PHO/PHX alternates)
 */
async function resolveTeamId(db: any, league: string, apiAbbrev: string): Promise<string> {
  const result = await sql`
    SELECT team_id FROM team_abbrev_map 
    WHERE league = ${league} AND api_abbrev = ${apiAbbrev} 
    LIMIT 1
  `;
  
  if (!result[0]) {
    throw new Error(`Missing team mapping ${league}:${apiAbbrev}`);
  }
  
  return result[0].team_id;
}

/**
 * Insert one player log with full validation and error handling
 */
async function insertPlayerLog(
  db: any,
  apiGameId: string,
  apiPlayerId: string,
  playerName: string,
  league: string,
  teamAbbrev: string,
  stats: any
): Promise<void> {
  try {
    const gameId = await getGameUUID(db, apiGameId);
    const teamId = await resolveTeamId(db, league, teamAbbrev);
    const playerId = await getOrCreatePlayer(db, apiPlayerId, playerName, league, teamId);

    // Insert player game log
    await db.insert(player_game_logs).values({
      id: randomUUID(),
      player_id: playerId,
      team_id: teamId,
      game_id: gameId,
      opponent_id: teamId, // Use same team for now, will be fixed later
      prop_type: 'Game Stats', // Generic prop type for now
      line: 0, // Not applicable for raw stats
      actual_value: stats.PTS || 0, // Use points as primary metric
      hit: false, // Not applicable for raw stats
      game_date: '2024-10-14', // Will be populated from game data
      season: '2024-25', // Will be dynamic
      home_away: 'home' as const, // Will be determined from game context
      created_at: new Date(),
      updated_at: new Date()
    }).onConflictDoNothing(); // Safe after uniqueness index exists

    console.log(`✅ Inserted player log: ${playerName} (${apiPlayerId}) for game ${apiGameId}`);
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
 * Fetch and parse boxscoretraditionalv2 for one game
 */
async function ingestGameBoxscore(db: any, apiGameId: string, league = 'NBA'): Promise<void> {
  console.log(`\n🎯 Starting ingestion for game ${apiGameId} (${league})`);
  
  try {
    // Use appropriate API endpoint based on league
    const baseUrl = league === 'WNBA' 
      ? 'https://stats.wnba.com/stats'
      : 'https://stats.nba.com/stats';
    
    const requestHeaders = league === 'WNBA' 
      ? {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.wnba.com/',
          'Origin': 'https://www.wnba.com'
        }
      : {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.nba.com/',
          'Origin': 'https://www.nba.com',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        };

    const data = await fetchWithRetry(
      `${baseUrl}/boxscoretraditionalv2?GameID=${apiGameId}&StartPeriod=0&EndPeriod=14`,
      3,
      requestHeaders
    );

    const playerSet = data.resultSets.find((s: any) => 
      (s.name || '').toLowerCase().includes('player')
    );
    
    if (!playerSet) {
      throw new Error('No player data found in response');
    }

    const headers = playerSet.headers;
    const rows = playerSet.rowSet;

    console.log(`📊 Found ${rows.length} player records`);

    // Convert rows to objects
    const toObj = (row: any[]) => {
      const o: any = {};
      headers.forEach((h: string, i: number) => o[h] = row[i]);
      return o;
    };

    let processed = 0;
    for (const row of rows) {
      const player = toObj(row);
      const apiPlayerId = String(player.PLAYER_ID);
      const playerName = player.PLAYER_NAME;
      const teamAbbrev = player.TEAM_ABBREVIATION;

      // Skip if player didn't play
      if (!player.MIN || player.MIN === '') {
        continue;
      }

      await insertPlayerLog(db, apiGameId, apiPlayerId, playerName, league, teamAbbrev, {
        MIN: player.MIN,
        PTS: player.PTS,
        REB: player.REB,
        AST: player.AST,
        STL: player.STL,
        BLK: player.BLK,
        TOV: player.TOV
      });

      processed++;
    }

    console.log(`✅ Successfully processed ${processed} players for game ${apiGameId}`);
  } catch (error: any) {
    console.error(`❌ Failed to ingest game ${apiGameId}:`, error.message);
    throw error;
  }
}

/**
 * Process games sequentially with throttling and metrics
 */
async function ingestAllGames(db: any, gameIds: string[], league = 'NBA'): Promise<void> {
  console.log(`\n🚀 Starting batch ingestion for ${gameIds.length} games (${league})`);
  
  let inserted = 0;
  let failed = 0;
  const startTime = Date.now();

  for (const gameId of gameIds) {
    try {
      await ingestGameBoxscore(db, gameId, league);
      inserted++;
    } catch (error: any) {
      failed++;
      console.error(`❌ Game ingestion failed for ${gameId}:`, error.message);
    }

    // Throttle requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const duration = Date.now() - startTime;
  console.log(`\n📈 Batch complete:`, {
    gamesProcessed: gameIds.length,
    inserted,
    failed,
    duration: `${(duration / 1000).toFixed(1)}s`,
    avgTimePerGame: `${(duration / gameIds.length / 1000).toFixed(1)}s`
  });
}

/**
 * Single-game debug harness
 */
async function debugSingleGame(apiGameId: string, league = 'NBA'): Promise<void> {
  console.log(`🔍 Debug mode: Testing single game ${apiGameId}`);
  
  try {
    await ingestGameBoxscore(db, apiGameId, league);
    console.log(`✅ Debug test successful for game ${apiGameId}`);
  } catch (error: any) {
    console.error(`❌ Debug test failed for game ${apiGameId}:`, error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const gameId = args[1];
  const league = args[2] || 'NBA';

  try {
    switch (command) {
      case 'debug':
        if (!gameId) {
          throw new Error('Game ID required for debug mode');
        }
        await debugSingleGame(gameId, league);
        break;

      case 'batch':
        if (!gameId) {
          throw new Error('Comma-separated game IDs required for batch mode');
        }
        const gameIds = gameId.split(',').map(id => id.trim());
        await ingestAllGames(db, gameIds, league);
        break;

      default:
        console.log(`
Usage:
  npm run ingest:debug <gameId> [league]     # Test single game
  npm run ingest:batch <gameId1,gameId2,...> [league]  # Process multiple games

Examples:
  npm run ingest:debug 0022400456 NBA
  npm run ingest:batch "0022400456,0022400457" NBA
        `);
    }
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  getGameUUID,
  getOrCreatePlayer,
  resolveTeamId,
  insertPlayerLog,
  ingestGameBoxscore,
  ingestAllGames,
  debugSingleGame,
  fetchWithRetry
};
