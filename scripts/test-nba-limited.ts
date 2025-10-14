import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function testLimitedNBAIngestion() {
  try {
    console.log('🧪 Testing NBA ingestion with limited games...');
    
    // Get first 5 games from 2023-24 season
    const games = await db.execute(sql`
      SELECT api_game_id FROM games 
      WHERE season = '2023-24' AND api_game_id IS NOT NULL 
      LIMIT 5
    `);
    
    if (games.length === 0) {
      console.error('❌ No games found');
      return;
    }
    
    console.log(`Found ${games.length} games to test`);
    
    // Run the NBA ingestion script with these specific games
    const { spawn } = await import('child_process');
    
    const child = spawn('tsx', ['scripts/nba-ingestion-boxscore.ts', '2023-24'], {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: connectionString }
    });
    
    child.on('close', async (code) => {
      console.log(`\n📊 NBA ingestion completed with exit code: ${code}`);
      
      // Check results
      const gameCount = await db.execute(sql`SELECT COUNT(*) as count FROM games WHERE api_game_id IS NOT NULL`);
      const playerLogCount = await db.execute(sql`SELECT COUNT(*) as count FROM player_game_logs`);
      const playerCount = await db.execute(sql`SELECT COUNT(*) as count FROM players WHERE external_id IS NOT NULL`);
      
      console.log('\n📊 Results:');
      console.log(`Games with api_game_id: ${gameCount[0].count}`);
      console.log(`Player logs: ${playerLogCount[0].count}`);
      console.log(`Players with external_id: ${playerCount[0].count}`);
      
      await client.end();
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await client.end();
  }
}

testLimitedNBAIngestion();
