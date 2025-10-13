import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, desc, sql } from 'drizzle-orm';
import { players, teams, games, player_game_logs, leagues } from '../src/db/schema/index';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

interface NFLGameData {
  game_id: string;
  season: number;
  week: number;
  game_date: string;
  home_team: string;
  away_team: string;
  home_score?: number;
  away_score?: number;
  game_type: string;
}

interface NFLPlayerData {
  player_id: string;
  player_name: string;
  team: string;
  position: string;
  game_id: string;
  game_date: string;
  passing_yards?: number;
  passing_tds?: number;
  passing_completions?: number;
  passing_attempts?: number;
  interceptions?: number;
  rushing_yards?: number;
  rushing_tds?: number;
  rushing_attempts?: number;
  receiving_yards?: number;
  receiving_tds?: number;
  receptions?: number;
  longest_reception?: number;
  fumbles?: number;
}

/**
 * Fetch NFL games from nflfastR data
 */
async function fetchNFLGames(season: number = 2024): Promise<NFLGameData[]> {
  try {
    // Using nflfastR's CSV endpoint for games
    const url = `https://raw.githubusercontent.com/nflverse/nflfastR-data/master/data/schedules/sched_${season}.csv`;
    
    console.log(`📡 Fetching NFL games for season ${season}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch NFL games: ${response.status}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    const games: NFLGameData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',');
      if (values.length < headers.length) continue;
      
      const game: any = {};
      headers.forEach((header, index) => {
        game[header.trim()] = values[index]?.trim() || '';
      });
      
      if (game.game_id && game.season) {
        games.push({
          game_id: game.game_id,
          season: parseInt(game.season),
          week: parseInt(game.week),
          game_date: game.gameday,
          home_team: game.home_team,
          away_team: game.away_team,
          home_score: game.home_score ? parseInt(game.home_score) : undefined,
          away_score: game.away_score ? parseInt(game.away_score) : undefined,
          game_type: game.game_type || 'REG'
        });
      }
    }
    
    console.log(`✅ Fetched ${games.length} NFL games for season ${season}`);
    return games;
    
  } catch (error) {
    console.error('❌ Error fetching NFL games:', error);
    return [];
  }
}

/**
 * Fetch NFL player stats from nflfastR data
 */
async function fetchNFLPlayerStats(season: number = 2024): Promise<NFLPlayerData[]> {
  try {
    // Using nflfastR's CSV endpoint for player stats
    const url = `https://raw.githubusercontent.com/nflverse/nflfastR-data/master/data/player_stats/player_stats_${season}.csv`;
    
    console.log(`📡 Fetching NFL player stats for season ${season}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch NFL player stats: ${response.status}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    const players: NFLPlayerData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',');
      if (values.length < headers.length) continue;
      
      const player: any = {};
      headers.forEach((header, index) => {
        player[header.trim()] = values[index]?.trim() || '';
      });
      
      if (player.player_id && player.game_id) {
        players.push({
          player_id: player.player_id,
          player_name: player.player_display_name,
          team: player.recent_team,
          position: player.position,
          game_id: player.game_id,
          game_date: player.game_date,
          passing_yards: player.passing_yards ? parseFloat(player.passing_yards) : undefined,
          passing_tds: player.passing_tds ? parseInt(player.passing_tds) : undefined,
          passing_completions: player.completions ? parseInt(player.completions) : undefined,
          passing_attempts: player.attempts ? parseInt(player.attempts) : undefined,
          interceptions: player.interceptions ? parseInt(player.interceptions) : undefined,
          rushing_yards: player.rushing_yards ? parseFloat(player.rushing_yards) : undefined,
          rushing_tds: player.rushing_tds ? parseInt(player.rushing_tds) : undefined,
          rushing_attempts: player.carries ? parseInt(player.carries) : undefined,
          receiving_yards: player.receiving_yards ? parseFloat(player.receiving_yards) : undefined,
          receiving_tds: player.receiving_tds ? parseInt(player.receiving_tds) : undefined,
          receptions: player.receptions ? parseInt(player.receptions) : undefined,
          longest_reception: player.receiving_yac ? parseFloat(player.receiving_yac) : undefined,
          fumbles: player.fumbles ? parseInt(player.fumbles) : undefined,
        });
      }
    }
    
    console.log(`✅ Fetched ${players.length} NFL player stat records for season ${season}`);
    return players;
    
  } catch (error) {
    console.error('❌ Error fetching NFL player stats:', error);
    return [];
  }
}

/**
 * Get or create team ID from abbreviation
 */
async function getOrCreateTeam(abbreviation: string, leagueCode: string): Promise<string> {
  // First try to find existing team
  const existingTeam = await db.execute(sql`
    SELECT t.id 
    FROM teams t 
    JOIN leagues l ON t.league_id = l.id 
    WHERE t.abbreviation = ${abbreviation} AND l.code = ${leagueCode}
    LIMIT 1
  `);
  
  if (existingTeam.length > 0) {
    return existingTeam[0].id;
  }
  
  // Create new team if not found
  const league = await db.select().from(leagues).where(eq(leagues.code, leagueCode)).limit(1);
  if (league.length === 0) {
    throw new Error(`League ${leagueCode} not found`);
  }
  
  const newTeam = await db.insert(teams).values({
    abbreviation,
    name: abbreviation, // Will be updated later with full name
    leagueId: league[0].id,
    city: '',
    conference: '',
    division: '',
  }).returning();
  
  return newTeam[0].id;
}

/**
 * Upsert games into database
 */
async function upsertNFLGames(gamesData: NFLGameData[], leagueCode: string = 'NFL') {
  console.log(`🏈 Upserting ${gamesData.length} NFL games...`);
  
  for (const game of gamesData) {
    try {
      const homeTeamId = await getOrCreateTeam(game.home_team, leagueCode);
      const awayTeamId = await getOrCreateTeam(game.away_team, leagueCode);
      
      await db.insert(games).values({
        externalId: game.game_id,
        leagueId: (await db.select().from(leagues).where(eq(leagues.code, leagueCode)).limit(1))[0].id,
        homeTeamId,
        awayTeamId,
        season: game.season.toString(),
        week: game.week,
        gameDate: new Date(game.game_date),
        status: game.home_score !== undefined ? 'completed' : 'scheduled',
        homeScore: game.home_score,
        awayScore: game.away_score,
      }).onConflictDoUpdate({
        target: games.externalId,
        set: {
          homeScore: game.home_score,
          awayScore: game.away_score,
          status: game.home_score !== undefined ? 'completed' : 'scheduled',
          updatedAt: new Date(),
        }
      });
      
    } catch (error) {
      console.error(`❌ Error upserting game ${game.game_id}:`, error);
    }
  }
  
  console.log(`✅ Completed upserting NFL games`);
}

/**
 * Upsert player stats into database
 */
async function upsertNFLPlayerStats(playerData: NFLPlayerData[], leagueCode: string = 'NFL') {
  console.log(`👥 Upserting ${playerData.length} NFL player stat records...`);
  
  let processed = 0;
  
  for (const player of playerData) {
    try {
      // Get team ID
      const teamId = await getOrCreateTeam(player.team, leagueCode);
      
      // Get or create player
      let playerId: string;
      const existingPlayer = await db.execute(sql`
        SELECT p.id 
        FROM players p 
        JOIN teams t ON p.team_id = t.id 
        JOIN leagues l ON t.league_id = l.id 
        WHERE p.name = ${player.player_name} AND t.abbreviation = ${player.team} AND l.code = ${leagueCode}
        LIMIT 1
      `);
      
      if (existingPlayer.length > 0) {
        playerId = existingPlayer[0].id;
      } else {
        const newPlayer = await db.insert(players).values({
          name: player.player_name,
          teamId,
          position: player.position,
        }).returning();
        playerId = newPlayer[0].id;
      }
      
      // Get game ID
      const game = await db.select().from(games).where(eq(games.externalId, player.game_id)).limit(1);
      if (game.length === 0) {
        console.log(`⚠️ Game ${player.game_id} not found, skipping player stats`);
        continue;
      }
      
      const gameId = game[0].id;
      const opponentTeamId = game[0].homeTeamId === teamId ? game[0].awayTeamId : game[0].homeTeamId;
      
      // Insert player game log
      await db.insert(player_game_logs).values({
        playerId,
        teamId,
        opponentTeamId,
        gameId,
        gameDate: new Date(player.game_date),
        league: leagueCode,
        passingYards: player.passing_yards,
        passingTds: player.passing_tds,
        passingCompletions: player.passing_completions,
        passingAttempts: player.passing_attempts,
        interceptions: player.interceptions,
        rushYards: player.rushing_yards,
        rushAttempts: player.rushing_attempts,
        rushTds: player.rushing_tds,
        recYards: player.receiving_yards,
        recReceptions: player.receptions,
        recTds: player.receiving_tds,
        longestReception: player.longest_reception,
        fumbles: player.fumbles,
      }).onConflictDoNothing();
      
      processed++;
      if (processed % 100 === 0) {
        console.log(`📊 Processed ${processed}/${playerData.length} player stat records...`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing player ${player.player_name}:`, error);
    }
  }
  
  console.log(`✅ Completed upserting NFL player stats (${processed} records)`);
}

/**
 * Main NFL ingestion function
 */
async function ingestNFLData() {
  try {
    console.log('🏈 Starting NFL data ingestion...');
    
    // Fetch 2023 season data (most complete)
    const season = 2023;
    
    // Fetch games for 2023
    const games = await fetchNFLGames(season);
    
    // Upsert games
    await upsertNFLGames(games);
    
    // Fetch player stats for 2023
    const stats = await fetchNFLPlayerStats(season);
    
    // Upsert player stats
    await upsertNFLPlayerStats(stats);
    
    console.log('🎉 NFL data ingestion completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in NFL data ingestion:', error);
  } finally {
    await client.end();
  }
}

// Run if called directly
ingestNFLData().catch(console.error);

export { ingestNFLData };
