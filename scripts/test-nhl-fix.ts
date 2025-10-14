import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { players, teams, games, player_game_logs, leagues } from '../src/db/schema/index';
import { eq, and, desc, sql } from 'drizzle-orm';
import { config } from 'dotenv';
import fetch from 'node-fetch';
import { randomUUID } from 'crypto';

// Load environment variables
config({ path: '.env.local' });

const connectionString = process.env.NEON_DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client, { schema: { games, players, teams, player_game_logs, leagues } });

async function testNHLFix() {
  console.log('🧪 Testing NHL team mapping fix...\n');
  
  // Test game: TBL vs VAN on 2024-10-15
  const testGame = {
    gameId: 2024020048,
    homeTeam: 'TBL',
    awayTeam: 'VAN',
    gameDate: '2024-10-15'
  };
  
  console.log(`Testing game: ${testGame.awayTeam} @ ${testGame.homeTeam} (${testGame.gameId})`);
  
  // Get NHL league ID
  const leagueRecord = await db.execute(sql`SELECT id FROM leagues WHERE code = 'NHL' LIMIT 1`);
  const leagueId = leagueRecord[0].id;
  console.log(`✅ NHL League ID: ${leagueId}`);
  
  // Test team mapping
  const homeTeamResult = await db.execute(sql.raw(`SELECT team_id as id FROM team_abbrev_map WHERE league = 'NHL' AND api_abbrev = '${testGame.homeTeam}' LIMIT 1`));
  const awayTeamResult = await db.execute(sql.raw(`SELECT team_id as id FROM team_abbrev_map WHERE league = 'NHL' AND api_abbrev = '${testGame.awayTeam}' LIMIT 1`));
  
  const homeTeam = homeTeamResult[0];
  const awayTeam = awayTeamResult[0];
  
  console.log(`Home team (${testGame.homeTeam}):`, homeTeam ? '✅ Found' : '❌ Not found');
  console.log(`Away team (${testGame.awayTeam}):`, awayTeam ? '✅ Found' : '❌ Not found');
  
  if (homeTeam && awayTeam) {
    // Get team names for verification
    const homeTeamName = await db.execute(sql.raw(`SELECT name FROM teams WHERE id = '${homeTeam.id}' LIMIT 1`));
    const awayTeamName = await db.execute(sql.raw(`SELECT name FROM teams WHERE id = '${awayTeam.id}' LIMIT 1`));
    
    console.log(`✅ Home team: ${homeTeamName[0].name}`);
    console.log(`✅ Away team: ${awayTeamName[0].name}`);
    
    // Test creating the game
    const gameId = randomUUID();
    await db.insert(games).values({
      id: gameId,
      league_id: leagueId,
      home_team_id: homeTeam.id,
      away_team_id: awayTeam.id,
      season: '2024-25',
      season_type: 'regular',
      game_date: testGame.gameDate,
      status: 'completed',
      api_game_id: testGame.gameId.toString()
    });
    
    console.log(`✅ Game created successfully with ID: ${gameId}`);
    
    // Clean up test game
    await db.execute(sql.raw(`DELETE FROM games WHERE id = '${gameId}'`));
    console.log(`✅ Test game cleaned up`);
    
  } else {
    console.log('❌ Team mapping failed - cannot proceed');
  }
  
  await client.end();
}

testNHLFix().catch(console.error);
