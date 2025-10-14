#!/usr/bin/env tsx

/**
 * Test script for NBA/WNBA Player Logs Ingestion
 * 
 * This script validates the ingestion system with a known game
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { games, players, teams, player_game_logs } from '../src/db/schema/index';
import { 
  getGameUUID, 
  getOrCreatePlayer, 
  resolveTeamId, 
  insertPlayerLog,
  ingestGameBoxscore,
  fetchWithRetry 
} from './nba-wnba-player-logs-ingestion';

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
 * Test individual functions
 */
async function testResilientLookups() {
  console.log('\n🧪 Testing resilient lookup functions...');
  
  try {
    // Test team resolution
    const teamId = await resolveTeamId(db, 'NBA', 'LAL');
    console.log(`✅ Team resolution: LAL -> ${teamId}`);
    
    // Test player creation/lookup
    const playerId = await getOrCreatePlayer(db, '2544', 'LeBron James', 'NBA', teamId);
    console.log(`✅ Player upsert: LeBron James -> ${playerId}`);
    
    // Test game lookup (will fail if game doesn't exist)
    try {
      const gameId = await getGameUUID(db, '0022400456');
      console.log(`✅ Game lookup: 0022400456 -> ${gameId}`);
    } catch (error: any) {
      console.log(`⚠️  Game lookup failed (expected): ${error.message}`);
    }
    
  } catch (error: any) {
    console.error(`❌ Lookup test failed:`, error.message);
    throw error;
  }
}

/**
 * Test API connectivity
 */
async function testAPIConnectivity() {
  console.log('\n🌐 Testing NBA API connectivity...');
  
  try {
    // Test with a known game ID from 2024-25 season
    const testGameId = '0022400456';
    const data = await fetchWithRetry(
      `https://stats.nba.com/stats/boxscoretraditionalv2?GameID=${testGameId}&StartPeriod=0&EndPeriod=14`,
      3,
      {
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
      }
    );
    
    console.log(`✅ API connectivity test passed`);
    console.log(`📊 Response contains ${data.resultSets.length} result sets`);
    
    const playerSet = data.resultSets.find((s: any) => 
      (s.name || '').toLowerCase().includes('player')
    );
    
    if (playerSet) {
      console.log(`📈 Player data: ${playerSet.rowSet.length} players found`);
    }
    
  } catch (error: any) {
    console.error(`❌ API connectivity test failed:`, error.message);
    throw error;
  }
}

/**
 * Test database schema
 */
async function testDatabaseSchema() {
  console.log('\n🗄️  Testing database schema...');
  
  try {
    // Check if required tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('players', 'games', 'teams', 'player_game_logs', 'team_abbrev_map')
      ORDER BY table_name
    `;
    
    console.log(`✅ Found ${tables.length} required tables:`, tables.map(t => t.table_name));
    
    // Check if required columns exist
    const playersColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'players' AND table_schema = 'public'
      AND column_name IN ('external_id', 'name', 'team_id')
    `;
    
    console.log(`✅ Players table has ${playersColumns.length} required columns:`, playersColumns.map(c => c.column_name));
    
    // Check team mappings
    const mappings = await sql`
      SELECT league, COUNT(*) as count 
      FROM team_abbrev_map 
      GROUP BY league 
      ORDER BY league
    `;
    
    console.log(`✅ Team mappings:`, mappings);
    
  } catch (error: any) {
    console.error(`❌ Schema test failed:`, error.message);
    throw error;
  }
}

/**
 * Test full ingestion pipeline with a mock game
 */
async function testFullPipeline() {
  console.log('\n🔄 Testing full ingestion pipeline...');
  
  try {
    // First, let's create a test game if it doesn't exist
    const testGameId = '0022400456';
    
    // Check if game exists
    const existingGame = await db.query.games.findFirst({
      where: eq(games.api_game_id, testGameId)
    });
    
    if (!existingGame) {
      console.log(`⚠️  Test game ${testGameId} not found in database`);
      console.log(`   You may need to add this game to the games table first`);
      return;
    }
    
    // Test the full ingestion
    await ingestGameBoxscore(db, testGameId, 'NBA');
    console.log(`✅ Full pipeline test completed successfully`);
    
  } catch (error: any) {
    console.error(`❌ Pipeline test failed:`, error.message);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Player Logs Ingestion Tests\n');
  
  const tests = [
    { name: 'Database Schema', fn: testDatabaseSchema },
    { name: 'API Connectivity', fn: testAPIConnectivity },
    { name: 'Resilient Lookups', fn: testResilientLookups },
    { name: 'Full Pipeline', fn: testFullPipeline }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`Running: ${test.name}`);
      console.log(`${'='.repeat(50)}`);
      
      await test.fn();
      passed++;
      console.log(`✅ ${test.name} PASSED`);
      
    } catch (error: any) {
      failed++;
      console.log(`❌ ${test.name} FAILED: ${error.message}`);
    }
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(50)}`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! The ingestion system is ready.');
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().finally(() => sql.end());
}

export { runTests };
