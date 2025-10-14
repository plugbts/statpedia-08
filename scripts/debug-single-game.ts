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

// Test a single game insertion with full debug logging
async function debugSingleGame() {
  try {
    console.log('🧪 Testing single game insertion with debug logging...');
    
    // Use a known game ID that exists in the database
    const testApiGameId = '0022400456';
    
    // Check if game exists
    const existingGame = await db.execute(sql`SELECT * FROM games WHERE api_game_id = ${testApiGameId} LIMIT 1`);
    if (existingGame.length === 0) {
      console.error(`❌ Game with api_game_id ${testApiGameId} not found`);
      return;
    }
    
    const game = existingGame[0];
    console.log(`✅ Found game: ${game.id} with api_game_id: ${game.api_game_id}`);
    
    // Test UUID resolution
    const resolvedGame = await db.execute(sql`SELECT * FROM games WHERE api_game_id = ${testApiGameId} LIMIT 1`);
    if (resolvedGame.length > 0 && resolvedGame[0].id === game.id) {
      console.log('✅ UUID resolution works correctly');
    } else {
      console.log('❌ UUID resolution failed');
      return;
    }
    
    // Get a real player and team
    const player = await db.execute(sql`SELECT * FROM players LIMIT 1`);
    if (player.length === 0) {
      console.error('❌ No players found in database');
      return;
    }
    
    const team = await db.execute(sql`SELECT * FROM teams WHERE league_id = (SELECT id FROM leagues WHERE code = 'NBA') LIMIT 1`);
    if (team.length === 0) {
      console.error('❌ No NBA teams found');
      return;
    }
    
    console.log(`✅ Found player: ${player[0].name} (${player[0].id})`);
    console.log(`✅ Found team: ${team[0].name} (${team[0].id})`);
    
    // Create a test player log entry
    const testLogEntry = {
      player_id: player[0].id,
      team_id: team[0].id,
      game_id: game.id, // Use the resolved UUID
      opponent_id: team[0].id, // Use same team as opponent for test
      prop_type: 'Points',
      line: 15,
      actual_value: 18,
      hit: true,
      game_date: game.game_date,
      season: game.season,
      home_away: 'home'
    };
    
    console.log('🔍 DEBUG: Attempting to insert test player log...');
    console.log(`   - apiGameId: ${testApiGameId}`);
    console.log(`   - resolved gameId: ${game.id}`);
    console.log(`   - playerId: ${player[0].id}`);
    console.log(`   - teamId: ${team[0].id}`);
    console.log(`   - opponentId: ${team[0].id}`);
    
    // Insert test player log
    try {
      await db.insert(player_game_logs).values(testLogEntry);
      console.log('✅ Test player log inserted successfully!');
      
      // Verify it was inserted
      const insertedLog = await db.execute(sql`SELECT * FROM player_game_logs WHERE game_id = ${game.id} AND player_id = ${player[0].id} AND prop_type = 'Points' LIMIT 1`);
      if (insertedLog.length > 0) {
        console.log('✅ Player log verified in database!');
        console.log(`   - Log ID: ${insertedLog[0].id}`);
        console.log(`   - Game ID: ${insertedLog[0].game_id}`);
        console.log(`   - Player ID: ${insertedLog[0].player_id}`);
        console.log(`   - Prop Type: ${insertedLog[0].prop_type}`);
      } else {
        console.log('❌ Player log not found in database after insertion');
      }
      
      // Clean up test log
      await db.execute(sql`DELETE FROM player_game_logs WHERE game_id = ${game.id} AND player_id = ${player[0].id} AND prop_type = 'Points'`);
      console.log('✅ Test completed and cleaned up');
      
    } catch (insertError) {
      console.error('❌ Test player log insertion failed:', {
        apiGameId: testApiGameId,
        resolvedGameId: game.id,
        playerId: player[0].id,
        teamId: team[0].id,
        opponentId: team[0].id,
        error: insertError.message
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.end();
  }
}

debugSingleGame();
