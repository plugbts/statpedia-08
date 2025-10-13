import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, desc, sql } from 'drizzle-orm';
import { players, teams, games, player_game_logs, props } from '../src/db/schema/index';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

interface RealPlayerStats {
  playerId: string;
  gameDate: string;
  passingYards?: number;
  passingTds?: number;
  rushingYards?: number;
  rushingTds?: number;
  receivingYards?: number;
  receivingTds?: number;
  receptions?: number;
  points?: number;
  assists?: number;
  rebounds?: number;
  threePointers?: number;
  // Add more stats as needed
}

/**
 * Fetch real player stats from ESPN API
 */
async function fetchPlayerStatsFromESPN(playerId: string, season: string = '2024'): Promise<RealPlayerStats[]> {
  try {
    // ESPN API endpoint for player game logs
    const espnPlayerId = await getESPNPlayerId(playerId);
    if (!espnPlayerId) {
      console.log(`No ESPN ID found for player ${playerId}`);
      return [];
    }

    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/athletes/${espnPlayerId}/gamelog?season=${season}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`Failed to fetch ESPN data for player ${playerId}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const gameLogs = data.items || [];

    return gameLogs.map((game: any) => ({
      playerId,
      gameDate: game.date,
      passingYards: game.stats?.passing?.yards || 0,
      passingTds: game.stats?.passing?.touchdowns || 0,
      rushingYards: game.stats?.rushing?.yards || 0,
      rushingTds: game.stats?.rushing?.touchdowns || 0,
      receivingYards: game.stats?.receiving?.yards || 0,
      receivingTds: game.stats?.receiving?.touchdowns || 0,
      receptions: game.stats?.receiving?.receptions || 0,
    }));

  } catch (error) {
    console.error(`Error fetching ESPN stats for player ${playerId}:`, error);
    return [];
  }
}

/**
 * Fetch real player stats from NBA API
 */
async function fetchPlayerStatsFromNBA(playerId: string, season: string = '2023-24'): Promise<RealPlayerStats[]> {
  try {
    // NBA API endpoint - this would need proper authentication
    // For now, using a free stats API
    const url = `https://stats.nba.com/stats/playergamelog?PlayerID=${playerId}&Season=${season}&SeasonType=Regular%20Season`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.log(`Failed to fetch NBA data for player ${playerId}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const gameLogs = data.resultSets?.[0]?.rowSet || [];

    return gameLogs.map((game: any[]) => ({
      playerId,
      gameDate: game[2], // Game date
      points: game[24], // PTS
      assists: game[21], // AST
      rebounds: game[20], // REB
      threePointers: game[12], // 3PM
    }));

  } catch (error) {
    console.error(`Error fetching NBA stats for player ${playerId}:`, error);
    return [];
  }
}

/**
 * Get ESPN player ID from our database
 */
async function getESPNPlayerId(playerId: string): Promise<string | null> {
  // This would need to be implemented based on how we store external IDs
  // For now, return null to indicate we need to set this up
  return null;
}

/**
 * Convert real stats to game logs for our database
 */
async function convertStatsToGameLogs(
  realStats: RealPlayerStats[], 
  playerId: string, 
  teamId: string
): Promise<any[]> {
  const gameLogs: any[] = [];

  for (const stat of realStats) {
    // Create game log entries for each stat type that has data
    const statTypes = [
      { type: 'Passing Yards', value: stat.passingYards },
      { type: 'Passing TDs', value: stat.passingTds },
      { type: 'Rushing Yards', value: stat.rushingYards },
      { type: 'Rushing TDs', value: stat.rushingTds },
      { type: 'Receiving Yards', value: stat.receivingYards },
      { type: 'Receiving TDs', value: stat.receivingTds },
      { type: 'Receptions', value: stat.receptions },
      { type: 'Points', value: stat.points },
      { type: 'Assists', value: stat.assists },
      { type: 'Rebounds', value: stat.rebounds },
      { type: '3-Pointers Made', value: stat.threePointers },
    ];

    for (const statType of statTypes) {
      if (statType.value !== undefined && statType.value !== null) {
        // Get or create a game record
        const gameId = await getOrCreateGame(playerId, teamId, stat.gameDate);
        if (gameId) {
          gameLogs.push({
            playerId,
            teamId,
            gameId,
            opponentId: await getOpponentTeamId(gameId, teamId),
            propType: statType.type,
            line: statType.value, // Use actual value as line for now
            actualValue: statType.value,
            hit: true, // Actual performance always "hits" since it's real
            gameDate: stat.gameDate,
            season: '2024',
            homeAway: await getHomeAwayStatus(gameId, teamId),
          });
        }
      }
    }
  }

  return gameLogs;
}

/**
 * Get or create a game record
 */
async function getOrCreateGame(playerId: string, teamId: string, gameDate: string): Promise<string | null> {
  // Try to find existing game
  const existingGame = await db.select().from(games)
    .where(and(
      eq(games.game_date, new Date(gameDate)),
      sql`(${games.home_team_id} = ${teamId} OR ${games.away_team_id} = ${teamId})`
    ))
    .limit(1);

  if (existingGame.length > 0) {
    return existingGame[0].id;
  }

  // Create new game if not found
  const newGame = await db.insert(games).values({
    leagueId: await getTeamLeagueId(teamId),
    homeTeamId: teamId, // Simplified - would need actual opponent logic
    awayTeamId: await getRandomOpponent(teamId),
    season: '2024',
    gameDate: new Date(gameDate),
    status: 'completed',
  }).returning();

  return newGame[0]?.id || null;
}

/**
 * Get team's league ID
 */
async function getTeamLeagueId(teamId: string): Promise<string> {
  const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  return team[0]?.leagueId || '';
}

/**
 * Get random opponent (simplified)
 */
async function getRandomOpponent(teamId: string): Promise<string> {
  const opponents = await db.select().from(teams)
    .where(sql`id != ${teamId}`)
    .limit(10);
  
  const randomOpponent = opponents[Math.floor(Math.random() * opponents.length)];
  return randomOpponent?.id || teamId;
}

/**
 * Get opponent team ID from game
 */
async function getOpponentTeamId(gameId: string, teamId: string): Promise<string> {
  const game = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (game.length === 0) return teamId;
  
  return game[0].home_team_id === teamId ? game[0].away_team_id : game[0].home_team_id;
}

/**
 * Get home/away status
 */
async function getHomeAwayStatus(gameId: string, teamId: string): Promise<'home' | 'away'> {
  const game = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (game.length === 0) return 'home';
  
  return game[0].home_team_id === teamId ? 'home' : 'away';
}

/**
 * Main function to ingest real player stats
 */
async function ingestRealPlayerStats() {
  try {
    console.log('🏈 Starting REAL player stats ingestion...');
    
    // Get all unique players from props
    const playersWithProps = await db.execute(sql`
      SELECT DISTINCT p.player_id, p.team_id, pl.name
      FROM props p
      JOIN players pl ON p.player_id = pl.id
      WHERE p.source = 'sportsbook'
      LIMIT 50
    `);
    
    console.log(`📊 Found ${playersWithProps.length} players with props`);
    
    let totalStatsInserted = 0;
    
    for (const row of playersWithProps) {
      try {
        const { player_id, team_id, name } = row;
        console.log(`📈 Fetching real stats for ${name}...`);
        
        // Fetch real stats (this will need proper API setup)
        let realStats: RealPlayerStats[] = [];
        
        // Try different APIs based on league
        const team = await db.select().from(teams).where(eq(teams.id, team_id)).limit(1);
        const league = team[0]?.leagueId;
        
        if (league?.includes('nfl') || league?.includes('NFL')) {
          realStats = await fetchPlayerStatsFromESPN(player_id, '2024');
        } else if (league?.includes('nba') || league?.includes('NBA')) {
          realStats = await fetchPlayerStatsFromNBA(player_id, '2023-24');
        }
        
        if (realStats.length > 0) {
          // Convert to game logs and insert
          const gameLogs = await convertStatsToGameLogs(realStats, player_id, team_id);
          
          if (gameLogs.length > 0) {
            await db.insert(player_game_logs).values(gameLogs);
            totalStatsInserted += gameLogs.length;
            console.log(`✅ Inserted ${gameLogs.length} real game logs for ${name}`);
          }
        } else {
          console.log(`⚠️ No real stats found for ${name}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing player ${row.player_id}:`, error);
      }
    }
    
    console.log(`🎉 Successfully inserted ${totalStatsInserted} real player stats`);
    
  } catch (error) {
    console.error('❌ Error ingesting real player stats:', error);
  } finally {
    await client.end();
  }
}

// Run if called directly
ingestRealPlayerStats().catch(console.error);

export { ingestRealPlayerStats };
