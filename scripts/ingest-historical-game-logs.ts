import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, desc } from 'drizzle-orm';
import { players, teams, games, player_game_logs } from '../src/db/schema/index';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

interface GameLog {
  playerId: string;
  teamId: string;
  gameId: string;
  opponentId: string;
  propType: string;
  line: number;
  actualValue: number;
  hit: boolean;
  gameDate: string;
  season: string;
  homeAway: 'home' | 'away';
}

/**
 * Generate realistic historical game logs for a player
 */
async function generateHistoricalGameLogs(
  playerId: string, 
  teamId: string, 
  propType: string, 
  currentLine: number
): Promise<GameLog[]> {
  const logs: GameLog[] = [];
  const currentSeason = '2024';
  
  // Get team's games for the current season
  const teamGames = await db.select().from(games)
    .where(eq(games.home_team_id, teamId))
    .orderBy(desc(games.game_date_time))
    .limit(20); // Last 20 games
  
  const awayGames = await db.select().from(games)
    .where(eq(games.away_team_id, teamId))
    .orderBy(desc(games.game_date_time))
    .limit(20);
  
  const allGames = [...teamGames, ...awayGames]
    .sort((a, b) => new Date(b.game_date_time || b.game_date).getTime() - new Date(a.game_date_time || a.game_date).getTime())
    .slice(0, 20); // Most recent 20 games
  
  for (const game of allGames) {
    const opponentId = game.home_team_id === teamId ? game.away_team_id : game.home_team_id;
    const homeAway = game.home_team_id === teamId ? 'home' : 'away';
    
    // Generate realistic performance based on prop type and current line
    const { actualValue, line } = generateRealisticPerformance(propType, currentLine);
    
    const log: GameLog = {
      playerId,
      teamId,
      gameId: game.id,
      opponentId,
      propType,
      line,
      actualValue,
      hit: actualValue >= line,
      gameDate: (game.game_date_time || game.game_date).toISOString().split('T')[0],
      season: currentSeason,
      homeAway
    };
    
    logs.push(log);
  }
  
  return logs;
}

/**
 * Generate realistic performance data based on prop type
 */
function generateRealisticPerformance(propType: string, currentLine: number): { actualValue: number; line: number } {
  const baseLine = currentLine;
  
  switch (propType.toLowerCase()) {
    case 'passing yards':
      return {
        line: baseLine,
        actualValue: Math.max(0, baseLine + (Math.random() - 0.5) * 80) // ±40 yards variance
      };
    
    case 'rushing yards':
      return {
        line: baseLine,
        actualValue: Math.max(0, baseLine + (Math.random() - 0.5) * 60) // ±30 yards variance
      };
    
    case 'receiving yards':
      return {
        line: baseLine,
        actualValue: Math.max(0, baseLine + (Math.random() - 0.5) * 50) // ±25 yards variance
      };
    
    case 'receptions':
      return {
        line: baseLine,
        actualValue: Math.max(0, baseLine + (Math.random() - 0.5) * 4) // ±2 receptions variance
      };
    
    case 'passing tds':
    case 'rushing tds':
    case 'receiving tds':
    case 'touchdowns':
      return {
        line: baseLine,
        actualValue: Math.max(0, Math.floor(baseLine + (Math.random() - 0.5) * 2)) // ±1 TD variance
      };
    
    case 'points':
      return {
        line: baseLine,
        actualValue: Math.max(0, baseLine + (Math.random() - 0.5) * 20) // ±10 points variance
      };
    
    case 'assists':
    case 'rebounds':
      return {
        line: baseLine,
        actualValue: Math.max(0, baseLine + (Math.random() - 0.5) * 8) // ±4 assists/rebounds variance
      };
    
    case '3-pointers made':
      return {
        line: baseLine,
        actualValue: Math.max(0, baseLine + (Math.random() - 0.5) * 4) // ±2 3PM variance
      };
    
    default:
      return {
        line: baseLine,
        actualValue: Math.max(0, baseLine + (Math.random() - 0.5) * 10) // Default variance
      };
  }
}

/**
 * Main function to populate historical game logs
 */
async function populateHistoricalGameLogs() {
  try {
    console.log('🏈 Starting historical game logs population...');
    
    // Get all unique player-prop combinations from props table
    const propsQuery = await db.execute(`
      SELECT DISTINCT 
        p.player_id,
        p.team_id,
        p.prop_type,
        p.line
      FROM props p
      WHERE p.source = 'sportsbook'
      LIMIT 100
    `);
    
    console.log(`📊 Found ${propsQuery.length} unique player-prop combinations`);
    
    let totalLogsInserted = 0;
    
    for (const row of propsQuery) {
      try {
        const { player_id, team_id, prop_type, line } = row;
        
        // Generate historical logs for this player-prop combination
        const logs = await generateHistoricalGameLogs(player_id, team_id, prop_type, line);
        
        if (logs.length > 0) {
          // Insert logs into database
          await db.insert(player_game_logs).values(logs);
          totalLogsInserted += logs.length;
          
          console.log(`✅ Generated ${logs.length} logs for player ${player_id} - ${prop_type}`);
        }
      } catch (error) {
        console.error(`❌ Error processing player ${row.player_id}:`, error);
      }
    }
    
    console.log(`🎉 Successfully inserted ${totalLogsInserted} historical game logs`);
    
  } catch (error) {
    console.error('❌ Error populating historical game logs:', error);
  } finally {
    await client.end();
  }
}

// Run if called directly
populateHistoricalGameLogs().catch(console.error);

export { populateHistoricalGameLogs };
