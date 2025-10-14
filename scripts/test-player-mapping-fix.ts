import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { players, teams, games, player_game_logs, leagues } from '../src/db/schema/index';
import { eq, sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

// Test player mapping logic
async function testPlayerMapping() {
  try {
    console.log('🧪 Testing player mapping logic...');
    
    // Simulate the same logic as the ingestion script
    const nbaPlayerIdMap: Record<string, string> = {};
    
    // Load players exactly like the ingestion script does
    const leagueRecord = await db.select().from(leagues).where(eq(leagues.code, 'NBA')).limit(1);
    if (leagueRecord.length === 0) {
      console.error('NBA league not found');
      return;
    }
    
    const leagueId = leagueRecord[0].id;
    const leaguePlayersResult = await db.execute(sql`
      SELECT p.id, p.name, p.external_id, t.name as team_name FROM players p
      JOIN teams t ON p.team_id = t.id
      WHERE t.league_id = ${leagueId}
    `);

    const leaguePlayers = leaguePlayersResult || [];
    leaguePlayers.forEach((row: any) => {
      // Map by external_id if available
      if (row.external_id) {
        nbaPlayerIdMap[row.external_id] = row.id;
      }
      // Map by name for backward compatibility
      nbaPlayerIdMap[row.name] = row.id;
    });
    
    console.log(`Loaded ${leaguePlayers.length} players for NBA`);
    console.log(`Player mapping keys: ${Object.keys(nbaPlayerIdMap).length}`);
    
    // Test specific players from our previous test
    const testCases = [
      { apiId: '203897', apiName: 'Zach LaVine' },
      { apiId: '1630172', apiName: 'Patrick Williams' },
      { apiId: '202696', apiName: 'Nikola Vučević' }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🔍 Testing: ${testCase.apiName} (${testCase.apiId})`);
      
      // Test lookup by API ID
      const byApiId = nbaPlayerIdMap[testCase.apiId];
      console.log(`  Lookup by API ID (${testCase.apiId}): ${byApiId || 'NOT FOUND'}`);
      
      // Test lookup by name
      const byName = nbaPlayerIdMap[testCase.apiName];
      console.log(`  Lookup by name (${testCase.apiName}): ${byName || 'NOT FOUND'}`);
      
      // Show what names are actually in the mapping
      const matchingNames = Object.keys(nbaPlayerIdMap).filter(key => 
        key.toLowerCase().includes(testCase.apiName.toLowerCase()) || 
        testCase.apiName.toLowerCase().includes(key.toLowerCase())
      );
      console.log(`  Similar names in mapping: ${matchingNames.join(', ') || 'NONE'}`);
    }
    
    // Show some actual player names in the database
    console.log('\n📋 Sample player names in database:');
    const samplePlayers = await db.execute(sql`
      SELECT p.name FROM players p
      JOIN teams t ON p.team_id = t.id
      WHERE t.league_id = ${leagueId}
      LIMIT 10
    `);
    
    samplePlayers.forEach((player: any) => {
      console.log(`  - "${player.name}"`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.end();
  }
}

testPlayerMapping();
