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

// Test the fixed NBA ingestion logic with just 5 games
async function testNBAIngestionLogic() {
  try {
    console.log('🧪 Testing fixed NBA ingestion logic with 5 games...');
    
    // Import the fixed functions from the NBA ingestion script
    const { initializeNBAMappings, fetchNBAGamesAndLogs } = await import('./nba-ingestion-boxscore.js');
    
    // Initialize mappings
    await initializeNBAMappings();
    
    // Test with a small batch of games (just first 5 games)
    console.log('Testing with first 5 games from 2023-24 season...');
    
    // This will use the fixed logic that creates players on the fly
    await fetchNBAGamesAndLogs('2023-24');
    
    // Check results
    const gameCount = await db.execute(sql`SELECT COUNT(*) as count FROM games WHERE api_game_id IS NOT NULL`);
    const playerLogCount = await db.execute(sql`SELECT COUNT(*) as count FROM player_game_logs`);
    const playerCount = await db.execute(sql`SELECT COUNT(*) as count FROM players WHERE external_id IS NOT NULL`);
    
    console.log('\n📊 Results:');
    console.log(`Games with api_game_id: ${gameCount[0].count}`);
    console.log(`Player logs: ${playerLogCount[0].count}`);
    console.log(`Players with external_id: ${playerCount[0].count}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.end();
  }
}

testNBAIngestionLogic();
