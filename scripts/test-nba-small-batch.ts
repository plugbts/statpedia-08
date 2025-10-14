import fetch from "node-fetch";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { players, teams, games, player_game_logs, defense_ranks, leagues, team_abbrev_map } from '../src/db/schema/index';
import { eq, and, desc, sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

// NBA player and team mappings
let nbaPlayerIdMap: Record<string, string> = {};
let nbaTeamIdMap: Record<string, string> = {};

// Initialize NBA mappings
async function initializeNBAMappings() {
  console.log('Initializing NBA mappings...');
  
  // Load team mappings
  const teamMappings = await db.execute(sql`
    SELECT tam.api_abbrev, t.id 
    FROM team_abbrev_map tam 
    JOIN teams t ON tam.team_id = t.id 
    JOIN leagues l ON t.league_id = l.id 
    WHERE l.code = 'NBA'
  `);
  
  nbaTeamIdMap = {};
  for (const mapping of teamMappings) {
    nbaTeamIdMap[mapping.api_abbrev] = mapping.id;
  }
  
  // Load player mappings (by both external_id and name)
  const playerMappings = await db.execute(sql`
    SELECT p.external_id, p.name, p.id 
    FROM players p 
    JOIN teams t ON p.team_id = t.id 
    JOIN leagues l ON t.league_id = l.id 
    WHERE l.code = 'NBA'
  `);
  
  nbaPlayerIdMap = {};
  for (const player of playerMappings) {
    if (player.external_id) {
      nbaPlayerIdMap[player.external_id] = player.id;
    }
    nbaPlayerIdMap[player.name] = player.id;
  }
  
  console.log(`Loaded ${Object.keys(nbaTeamIdMap).length} team mappings and ${Object.keys(nbaPlayerIdMap).length} players for NBA`);
}

// Test NBA boxscore API for a single game
async function testSingleGameBoxScore(gameId: string) {
  const url = `https://stats.nba.com/stats/boxscoretraditionalv2?GameID=${gameId}&StartPeriod=0&EndPeriod=14`;
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Origin': 'https://www.nba.com',
    'Referer': 'https://www.nba.com/',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site'
  };
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    
    if (!data.resultSets || data.resultSets.length === 0) {
      console.warn(`No result sets for game ${gameId}`);
      return [];
    }
    
    // Get player stats (resultSets[0] is usually player stats)
    const playerStats = data.resultSets[0];
    if (!playerStats.rowSet || playerStats.rowSet.length === 0) {
      console.warn(`No player stats for game ${gameId}`);
      return [];
    }
    
    console.log(`Found ${playerStats.rowSet.length} player stats for game ${gameId}`);
    
    // Process first few player stats
    const processedLogs = [];
    for (let i = 0; i < Math.min(3, playerStats.rowSet.length); i++) {
      const playerRow = playerStats.rowSet[i];
      const headers = playerStats.headers;
      
      // Create a mapping of headers to indices
      const headerMap: Record<string, number> = {};
      headers.forEach((header: string, index: number) => {
        headerMap[header] = index;
      });
      
      // Extract player data
      const playerId = playerRow[headerMap['PLAYER_ID']];
      const playerName = playerRow[headerMap['PLAYER_NAME']];
      const teamAbbrev = playerRow[headerMap['TEAM_ABBREVIATION']];
      const points = playerRow[headerMap['PTS']];
      const assists = playerRow[headerMap['AST']];
      const rebounds = playerRow[headerMap['REB']];
      const threePointers = playerRow[headerMap['FG3M']];
      const steals = playerRow[headerMap['STL']];
      const blocks = playerRow[headerMap['BLK']];
      
      console.log(`Processing player: ${playerName} (${playerId}) from team ${teamAbbrev}`);
      console.log(`  Stats: ${points} pts, ${assists} ast, ${rebounds} reb, ${threePointers} 3PM`);
      
      // Resolve team ID
      const teamId = nbaTeamIdMap[teamAbbrev];
      if (!teamId) {
        console.warn(`❌ Team ${teamAbbrev} not found in mapping`);
        continue;
      }
      
      // Resolve player ID
      let resolvedPlayerId = nbaPlayerIdMap[playerId] || nbaPlayerIdMap[playerName];
      if (!resolvedPlayerId) {
        console.log(`Creating new player: ${playerName} (${playerId}) for team ${teamAbbrev}`);
        
        try {
          // Insert new player with external_id
          const newPlayerResult = await db.execute(sql`
            INSERT INTO players (name, team_id, external_id, league, position, status)
            VALUES (${playerName}, ${teamId}, ${playerId}, 'NBA', 'Unknown', 'active')
            RETURNING id
          `);
          
          if (newPlayerResult.length > 0) {
            resolvedPlayerId = newPlayerResult[0].id;
            // Update the mapping for future lookups
            nbaPlayerIdMap[playerId] = resolvedPlayerId;
            nbaPlayerIdMap[playerName] = resolvedPlayerId;
            console.log(`✅ Created new player: ${playerName} with ID: ${resolvedPlayerId}`);
          }
        } catch (err) {
          console.error(`❌ Failed to create player ${playerName}:`, err.message);
          continue;
        }
      }
      
      console.log(`✅ Resolved: player=${resolvedPlayerId}, team=${teamId}`);
      
      processedLogs.push({
        playerId,
        playerName,
        teamAbbrev,
        teamId,
        resolvedPlayerId,
        stats: { points, assists, rebounds, threePointers, steals, blocks }
      });
    }
    
    return processedLogs;
    
  } catch (error) {
    console.error(`Error fetching boxscore for game ${gameId}:`, error);
    return [];
  }
}

// Test inserting player logs for a single game
async function testPlayerLogInsertion() {
  try {
    console.log('🧪 Testing NBA player log insertion with debug logging...');
    
    // Initialize mappings
    await initializeNBAMappings();
    
    // Use a known game ID
    const testApiGameId = '0022400456';
    
    // Check if game exists
    const existingGame = await db.execute(sql`SELECT * FROM games WHERE api_game_id = ${testApiGameId} LIMIT 1`);
    if (existingGame.length === 0) {
      console.error(`❌ Game with api_game_id ${testApiGameId} not found`);
      return;
    }
    
    const game = existingGame[0];
    console.log(`✅ Found game: ${game.id} with api_game_id: ${game.api_game_id}`);
    
    // Get player stats from API
    const playerLogs = await testSingleGameBoxScore(testApiGameId);
    
    if (playerLogs.length === 0) {
      console.error('❌ No player logs found from API');
      return;
    }
    
    // Test inserting player logs
    for (const log of playerLogs) {
      console.log(`\n🔍 Testing insertion for player: ${log.playerName}`);
      
      // Create log entries
      const logEntries = [];
      
      if (log.stats.points !== undefined) {
        logEntries.push({
          player_id: log.resolvedPlayerId,
          team_id: log.teamId,
          game_id: game.id,
          opponent_id: log.teamId, // Use same team for test
          prop_type: 'Points',
          line: log.stats.points,
          actual_value: log.stats.points,
          hit: true,
          game_date: game.game_date,
          season: game.season,
          home_away: 'home'
        });
      }
      
      if (logEntries.length > 0) {
        try {
          console.log(`🔍 DEBUG: Inserting ${logEntries.length} player logs for game ${testApiGameId}`);
          console.log(`   - apiGameId: ${testApiGameId}`);
          console.log(`   - resolved gameId: ${game.id}`);
          console.log(`   - apiPlayerId: ${log.playerId}`);
          console.log(`   - resolved playerId: ${log.resolvedPlayerId}`);
          console.log(`   - teamId: ${log.teamId}`);
          
          await db.insert(player_game_logs).values(logEntries);
          console.log(`✅ Successfully inserted ${logEntries.length} player logs for ${log.playerName}`);
          
          // Clean up
          await db.execute(sql`DELETE FROM player_game_logs WHERE game_id = ${game.id} AND player_id = ${log.resolvedPlayerId} AND prop_type = 'Points'`);
          console.log(`✅ Cleaned up test data for ${log.playerName}`);
          
        } catch (err) {
          console.error(`❌ Insert failed for player ${log.playerName}:`, {
            apiGameId: testApiGameId,
            apiPlayerId: log.playerId,
            resolvedGameId: game.id,
            resolvedPlayerId: log.resolvedPlayerId,
            resolvedTeamId: log.teamId,
            error: err.message
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.end();
  }
}

testPlayerLogInsertion();
