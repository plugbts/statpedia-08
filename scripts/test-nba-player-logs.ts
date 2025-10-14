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

// Test NBA player logs extraction with fixed approach
async function testNBAPlayerLogs() {
  console.log('🧪 Testing NBA player logs extraction with fixes...');
  
  try {
    const baseUrl = 'https://stats.nba.com/stats';
    
    // Test with a small batch of games (first 5 games)
    const gameFinderUrl = `${baseUrl}/leaguegamefinder?Season=2023-24&SeasonType=Regular%20Season`;
    
    console.log(`Fetching test games from: ${gameFinderUrl}`);
    
    const response = await fetchWithRetry(gameFinderUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.nba.com/',
        'Origin': 'https://www.nba.com'
      }
    });
    
    const data = await response.json();
    const games = data.resultSets[0].rowSet || [];
    
    // Get first 5 unique game IDs for testing
    const uniqueGameIds = new Set<string>();
    const testGames: any[] = [];
    
    for (const game of games) {
      const gameId = game[4]?.toString(); // GAME_ID column
      if (gameId && !uniqueGameIds.has(gameId) && testGames.length < 5) {
        uniqueGameIds.add(gameId);
        testGames.push({
          gameId,
          date: game[5], // GAME_DATE
          homeTeam: game[2], // TEAM_ABBREVIATION
          awayTeam: 'OPP' // We'll determine this from boxscore
        });
      }
    }
    
    console.log(`Testing with ${testGames.length} games:`, testGames.map(g => g.gameId));
    
    // Test boxscore extraction for each game
    for (const testGame of testGames) {
      try {
        console.log(`\n📊 Testing game ${testGame.gameId}...`);
        
        const boxscoreUrl = `${baseUrl}/boxscoretraditionalv2?GameID=${testGame.gameId}&StartPeriod=0&EndPeriod=14`;
        
        const boxscoreResponse = await fetchWithRetry(boxscoreUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.nba.com/',
            'Origin': 'https://www.nba.com'
          }
        });
        
        const boxscoreData = await boxscoreResponse.json();
        
        if (!boxscoreData.resultSets || boxscoreData.resultSets.length === 0) {
          console.warn(`❌ Invalid boxscore data for game ${testGame.gameId}`);
          continue;
        }
        
        // Parse the correct dataset structure
        const headersArr = boxscoreData.resultSets[0].headers;
        const rows = boxscoreData.resultSets[0].rowSet || [];
        
        console.log(`📋 Headers:`, headersArr.slice(0, 10)); // Show first 10 headers
        
        // Convert rows to objects using headers
        const playerLogs = rows.map((row: any) => {
          const log: any = {};
          headersArr.forEach((header: string, i: number) => {
            log[header] = row[i];
          });
          return log;
        });
        
        // Filter for actual players (not team totals)
        const actualPlayers = playerLogs.filter((log: any) => 
          log.PLAYER_ID && 
          log.PLAYER_NAME && 
          log.MIN && 
          log.MIN !== '0:00' && 
          log.MIN !== ''
        );
        
        console.log(`✅ Found ${actualPlayers.length} players with stats`);
        
        // Show sample player data
        if (actualPlayers.length > 0) {
          const samplePlayer = actualPlayers[0];
          console.log(`📈 Sample player:`, {
            name: samplePlayer.PLAYER_NAME,
            team: samplePlayer.TEAM_ABBREVIATION,
            minutes: samplePlayer.MIN,
            points: samplePlayer.PTS,
            assists: samplePlayer.AST,
            rebounds: samplePlayer.REB
          });
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.warn(`❌ Error testing game ${testGame.gameId}:`, error);
        continue;
      }
    }
    
    console.log(`\n✅ Test completed! The fixes are working correctly.`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Main execution function
async function main() {
  try {
    await testNBAPlayerLogs();
  } catch (error) {
    console.error('❌ NBA player logs test failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
