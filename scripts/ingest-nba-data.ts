import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, desc, sql } from 'drizzle-orm';
import { players, teams, games, player_game_logs, leagues } from '../src/db/schema/index';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

interface NBAGameData {
  id: number;
  date: string;
  home_team: {
    id: number;
    abbreviation: string;
    name: string;
  };
  visitor_team: {
    id: number;
    abbreviation: string;
    name: string;
  };
  home_team_score: number;
  visitor_team_score: number;
  status: string;
}

interface NBAPlayerStats {
  player: {
    id: number;
    first_name: string;
    last_name: string;
    position: string;
  };
  team: {
    id: number;
    abbreviation: string;
    name: string;
  };
  game: {
    id: number;
    date: string;
  };
  pts: number;
  ast: number;
  reb: number;
  fg3m: number; // 3-pointers made
  stl: number;
  blk: number;
  turnover: number;
  min: string; // minutes as string like "32:45"
}

/**
 * Fetch NBA games from balldontlie API
 */
async function fetchNBAGames(): Promise<NBAGameData[]> {
  try {
    console.log('📡 Fetching NBA games from balldontlie API...');
    
    const allGames: NBAGameData[] = [];
    let page = 0;
    let hasMore = true;
    
    while (hasMore && page < 10) { // Limit to prevent infinite loops
      const url = `https://www.balldontlie.io/api/v1/games?page=${page}&per_page=100&seasons[]=2023&seasons[]=2024`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch NBA games: ${response.status}`);
      }
      
      const data = await response.json();
      const games = data.data || [];
      
      if (games.length === 0) {
        hasMore = false;
      } else {
        allGames.push(...games);
        page++;
      }
      
      // Add delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Fetched ${allGames.length} NBA games`);
    return allGames;
    
  } catch (error) {
    console.error('❌ Error fetching NBA games:', error);
    return [];
  }
}

/**
 * Fetch NBA player stats from balldontlie API
 */
async function fetchNBAPlayerStats(): Promise<NBAPlayerStats[]> {
  try {
    console.log('📡 Fetching NBA player stats from balldontlie API...');
    
    const allStats: NBAPlayerStats[] = [];
    let page = 0;
    let hasMore = true;
    
    while (hasMore && page < 50) { // Limit to prevent infinite loops
      const url = `https://www.balldontlie.io/api/v1/stats?page=${page}&per_page=100&seasons[]=2023&seasons[]=2024`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch NBA player stats: ${response.status}`);
      }
      
      const data = await response.json();
      const stats = data.data || [];
      
      if (stats.length === 0) {
        hasMore = false;
      } else {
        allStats.push(...stats);
        page++;
      }
      
      // Add delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Fetched ${allStats.length} NBA player stat records`);
    return allStats;
    
  } catch (error) {
    console.error('❌ Error fetching NBA player stats:', error);
    return [];
  }
}

/**
 * Get or create team ID from balldontlie team data
 */
async function getOrCreateNBATeam(teamData: { id: number; abbreviation: string; name: string }): Promise<string> {
  // First try to find existing team
  const existingTeam = await db.execute(sql`
    SELECT t.id 
    FROM teams t 
    JOIN leagues l ON t.league_id = l.id 
    WHERE t.abbreviation = ${teamData.abbreviation} AND l.code = 'NBA'
    LIMIT 1
  `);
  
  if (existingTeam.length > 0) {
    return existingTeam[0].id;
  }
  
  // Create new team if not found
  const league = await db.select().from(leagues).where(eq(leagues.code, 'NBA')).limit(1);
  if (league.length === 0) {
    throw new Error(`NBA league not found`);
  }
  
  const newTeam = await db.insert(teams).values({
    abbreviation: teamData.abbreviation,
    name: teamData.name,
    leagueId: league[0].id,
    city: teamData.name.split(' ')[0], // Extract city from team name
    conference: '',
    division: '',
  }).returning();
  
  return newTeam[0].id;
}

/**
 * Get or create player ID from balldontlie player data
 */
async function getOrCreateNBAPlayer(playerData: { id: number; first_name: string; last_name: string; position: string }, teamId: string): Promise<string> {
  const fullName = `${playerData.first_name} ${playerData.last_name}`;
  
  // First try to find existing player
  const existingPlayer = await db.execute(sql`
    SELECT p.id 
    FROM players p 
    JOIN teams t ON p.team_id = t.id 
    JOIN leagues l ON t.league_id = l.id 
    WHERE p.name = ${fullName} AND t.id = ${teamId} AND l.code = 'NBA'
    LIMIT 1
  `);
  
  if (existingPlayer.length > 0) {
    return existingPlayer[0].id;
  }
  
  // Create new player if not found
  const newPlayer = await db.insert(players).values({
    name: fullName,
    teamId,
    position: playerData.position,
  }).returning();
  
  return newPlayer[0].id;
}

/**
 * Upsert NBA games into database
 */
async function upsertNBAGames(gamesData: NBAGameData[]) {
  console.log(`🏀 Upserting ${gamesData.length} NBA games...`);
  
  for (const game of gamesData) {
    try {
      const homeTeamId = await getOrCreateNBATeam(game.home_team);
      const awayTeamId = await getOrCreateNBATeam(game.visitor_team);
      
      await db.insert(games).values({
        externalId: game.id.toString(),
        leagueId: (await db.select().from(leagues).where(eq(leagues.code, 'NBA')).limit(1))[0].id,
        homeTeamId,
        awayTeamId,
        season: '2023', // Will be updated based on actual date
        gameDate: new Date(game.date),
        status: game.status === 'Final' ? 'completed' : 'scheduled',
        homeScore: game.home_team_score,
        awayScore: game.visitor_team_score,
      }).onConflictDoUpdate({
        target: games.externalId,
        set: {
          homeScore: game.home_team_score,
          awayScore: game.visitor_team_score,
          status: game.status === 'Final' ? 'completed' : 'scheduled',
          updatedAt: new Date(),
        }
      });
      
    } catch (error) {
      console.error(`❌ Error upserting game ${game.id}:`, error);
    }
  }
  
  console.log(`✅ Completed upserting NBA games`);
}

/**
 * Upsert NBA player stats into database
 */
async function upsertNBAPlayerStats(playerData: NBAPlayerStats[]) {
  console.log(`👥 Upserting ${playerData.length} NBA player stat records...`);
  
  let processed = 0;
  
  for (const stat of playerData) {
    try {
      // Get team ID
      const teamId = await getOrCreateNBATeam(stat.team);
      
      // Get or create player
      const playerId = await getOrCreateNBAPlayer(stat.player, teamId);
      
      // Get game ID
      const game = await db.select().from(games).where(eq(games.externalId, stat.game.id.toString())).limit(1);
      if (game.length === 0) {
        console.log(`⚠️ Game ${stat.game.id} not found, skipping player stats`);
        continue;
      }
      
      const gameId = game[0].id;
      const opponentTeamId = game[0].homeTeamId === teamId ? game[0].awayTeamId : game[0].homeTeamId;
      
      // Convert minutes from "32:45" to decimal
      const minutes = parseMinutes(stat.min);
      
      // Insert player game log
      await db.insert(player_game_logs).values({
        playerId,
        teamId,
        opponentTeamId,
        gameId,
        gameDate: new Date(stat.game.date),
        league: 'NBA',
        points: stat.pts,
        assists: stat.ast,
        rebounds: stat.reb,
        threePointersMade: stat.fg3m,
        steals: stat.stl,
        blocks: stat.blk,
        turnovers: stat.turnover,
        minutes,
      }).onConflictDoNothing();
      
      processed++;
      if (processed % 100 === 0) {
        console.log(`📊 Processed ${processed}/${playerData.length} player stat records...`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing player ${stat.player.first_name} ${stat.player.last_name}:`, error);
    }
  }
  
  console.log(`✅ Completed upserting NBA player stats (${processed} records)`);
}

/**
 * Parse minutes from "32:45" format to decimal
 */
function parseMinutes(minStr: string): number | null {
  if (!minStr || minStr === '') return null;
  
  const parts = minStr.split(':');
  if (parts.length !== 2) return null;
  
  const minutes = parseInt(parts[0]);
  const seconds = parseInt(parts[1]);
  
  return minutes + (seconds / 60);
}

/**
 * Main NBA ingestion function
 */
async function ingestNBAData() {
  try {
    console.log('🏀 Starting NBA data ingestion...');
    
    // Fetch games
    const gamesData = await fetchNBAGames();
    
    // Upsert games
    await upsertNBAGames(gamesData);
    
    // Fetch player stats
    const playerStats = await fetchNBAPlayerStats();
    
    // Upsert player stats
    await upsertNBAPlayerStats(playerStats);
    
    console.log('🎉 NBA data ingestion completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in NBA data ingestion:', error);
  } finally {
    await client.end();
  }
}

// Run if called directly
ingestNBAData().catch(console.error);

export { ingestNBAData };
