import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { players, teams, games, playerGameLogs, defenseRanks } from '../src/db/schema/index';
import { eq, and } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

// NFL Team mapping from nflfastR to our teams table
const NFL_TEAM_MAP: Record<string, string> = {
  'ARI': 'Arizona Cardinals',
  'ATL': 'Atlanta Falcons', 
  'BAL': 'Baltimore Ravens',
  'BUF': 'Buffalo Bills',
  'CAR': 'Carolina Panthers',
  'CHI': 'Chicago Bears',
  'CIN': 'Cincinnati Bengals',
  'CLE': 'Cleveland Browns',
  'DAL': 'Dallas Cowboys',
  'DEN': 'Denver Broncos',
  'DET': 'Detroit Lions',
  'GB': 'Green Bay Packers',
  'HOU': 'Houston Texans',
  'IND': 'Indianapolis Colts',
  'JAX': 'Jacksonville Jaguars',
  'KC': 'Kansas City Chiefs',
  'LV': 'Las Vegas Raiders',
  'LAC': 'Los Angeles Chargers',
  'LAR': 'Los Angeles Rams',
  'MIA': 'Miami Dolphins',
  'MIN': 'Minnesota Vikings',
  'NE': 'New England Patriots',
  'NO': 'New Orleans Saints',
  'NYG': 'New York Giants',
  'NYJ': 'New York Jets',
  'PHI': 'Philadelphia Eagles',
  'PIT': 'Pittsburgh Steelers',
  'SF': 'San Francisco 49ers',
  'SEA': 'Seattle Seahawks',
  'TB': 'Tampa Bay Buccaneers',
  'TEN': 'Tennessee Titans',
  'WAS': 'Washington Commanders'
};

async function fetchNFLGames(season: number) {
  console.log(`Fetching NFL games for ${season} season...`);
  
  try {
    // Fetch NFL schedule from nflfastR
    const scheduleUrl = `https://raw.githubusercontent.com/nflverse/nflfastR-data/master/schedules/sched_${season}.csv`;
    const response = await fetch(scheduleUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch schedule: ${response.status} ${response.statusText}`);
    }
    
    const scheduleData = await response.text();
    const lines = scheduleData.split('\n');
    const headers = lines[0].split(',');
    
    const games: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',');
        const game: any = {};
        
        headers.forEach((header, index) => {
          game[header.trim()] = values[index]?.trim() || '';
        });
        
        games.push(game);
      }
    }
    
    console.log(`Fetched ${games.length} games`);
    return games;
    
  } catch (error) {
    console.error('Error fetching NFL games:', error);
    throw error;
  }
}

async function fetchNFLPlayerStats(season: number) {
  console.log(`Fetching NFL player stats for ${season} season...`);
  
  try {
    // Fetch player stats from nflfastR
    const statsUrl = `https://raw.githubusercontent.com/nflverse/nflfastR-data/master/data/player_stats/player_stats_${season}.csv`;
    const response = await fetch(statsUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch player stats: ${response.status} ${response.statusText}`);
    }
    
    const statsData = await response.text();
    const lines = statsData.split('\n');
    const headers = lines[0].split(',');
    
    const stats: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',');
        const stat: any = {};
        
        headers.forEach((header, index) => {
          stat[header.trim()] = values[index]?.trim() || '';
        });
        
        stats.push(stat);
      }
    }
    
    console.log(`Fetched ${stats.length} player stat records`);
    return stats;
    
  } catch (error) {
    console.error('Error fetching NFL player stats:', error);
    throw error;
  }
}

async function getOrCreateTeam(teamAbbr: string, teamName: string) {
  try {
    // First try to find existing team
    const existingTeams = await db.select().from(teams).where(eq(teams.abbreviation, teamAbbr));
    
    if (existingTeams.length > 0) {
      return existingTeams[0];
    }
    
    // Create new team if not found
    const newTeam = await db.insert(teams).values({
      abbreviation: teamAbbr,
      name: teamName,
      league: 'NFL'
    }).returning();
    
    return newTeam[0];
    
  } catch (error) {
    console.error(`Error getting/creating team ${teamAbbr}:`, error);
    throw error;
  }
}

async function getOrCreatePlayer(playerName: string, teamId: string, position: string) {
  try {
    // First try to find existing player
    const existingPlayers = await db.select().from(players).where(
      and(
        eq(players.name, playerName),
        eq(players.team_id, teamId)
      )
    );
    
    if (existingPlayers.length > 0) {
      return existingPlayers[0];
    }
    
    // Create new player if not found
    const newPlayer = await db.insert(players).values({
      name: playerName,
      team_id: teamId,
      position: position,
      league: 'NFL'
    }).returning();
    
    return newPlayer[0];
    
  } catch (error) {
    console.error(`Error getting/creating player ${playerName}:`, error);
    throw error;
  }
}

async function ingestNFLData(season: number = 2023) {
  console.log(`Starting NFL data ingestion for ${season} season...`);
  
  try {
    // Fetch real data from APIs
    const [gamesData, playerStatsData] = await Promise.all([
      fetchNFLGames(season),
      fetchNFLPlayerStats(season)
    ]);
    
    console.log(`Processing ${gamesData.length} games and ${playerStatsData.length} player stats...`);
    
    // Process games and create teams
    const gameMap = new Map();
    const teamMap = new Map();
    
    for (const game of gamesData) {
      if (!game.away_team || !game.home_team) continue;
      
      // Get or create teams
      const awayTeam = await getOrCreateTeam(game.away_team, NFL_TEAM_MAP[game.away_team] || game.away_team);
      const homeTeam = await getOrCreateTeam(game.home_team, NFL_TEAM_MAP[game.home_team] || game.home_team);
      
      teamMap.set(game.away_team, awayTeam);
      teamMap.set(game.home_team, homeTeam);
      
      // Store game info
      gameMap.set(game.game_id, {
        id: game.game_id,
        away_team_id: awayTeam.id,
        home_team_id: homeTeam.id,
        game_date: game.gameday,
        season: season.toString()
      });
    }
    
    console.log(`Created/found ${teamMap.size} teams and ${gameMap.size} games`);
    
    // Process player stats and create game logs
    let logsCreated = 0;
    
    for (const stat of playerStatsData) {
      if (!stat.player_name || !stat.team_abbr || !stat.game_id) continue;
      
      const team = teamMap.get(stat.team_abbr);
      if (!team) continue;
      
      const game = gameMap.get(stat.game_id);
      if (!game) continue;
      
      // Get or create player
      const player = await getOrCreatePlayer(
        stat.player_name,
        team.id,
        stat.position || 'UNKNOWN'
      );
      
      // Create game log entries for different prop types
      const logEntries = [];
      
      // Passing props
      if (stat.passing_yards && parseFloat(stat.passing_yards) > 0) {
        logEntries.push({
          player_id: player.id,
          team_id: team.id,
          game_id: game.id,
          opponent_id: stat.team_abbr === game.away_team ? game.home_team_id : game.away_team_id,
          prop_type: 'Passing Yards',
          line: parseFloat(stat.passing_yards),
          actual_value: parseFloat(stat.passing_yards),
          hit: true, // They achieved this since it's their actual stat
          game_date: game.game_date,
          season: season.toString(),
          home_away: stat.team_abbr === game.home_team ? 'home' : 'away'
        });
      }
      
      // Rushing props
      if (stat.rushing_yards && parseFloat(stat.rushing_yards) > 0) {
        logEntries.push({
          player_id: player.id,
          team_id: team.id,
          game_id: game.id,
          opponent_id: stat.team_abbr === game.away_team ? game.home_team_id : game.away_team_id,
          prop_type: 'Rushing Yards',
          line: parseFloat(stat.rushing_yards),
          actual_value: parseFloat(stat.rushing_yards),
          hit: true,
          game_date: game.game_date,
          season: season.toString(),
          home_away: stat.team_abbr === game.home_team ? 'home' : 'away'
        });
      }
      
      // Receiving props
      if (stat.receiving_yards && parseFloat(stat.receiving_yards) > 0) {
        logEntries.push({
          player_id: player.id,
          team_id: team.id,
          game_id: game.id,
          opponent_id: stat.team_abbr === game.away_team ? game.home_team_id : game.away_team_id,
          prop_type: 'Receiving Yards',
          line: parseFloat(stat.receiving_yards),
          actual_value: parseFloat(stat.receiving_yards),
          hit: true,
          game_date: game.game_date,
          season: season.toString(),
          home_away: stat.team_abbr === game.home_team ? 'home' : 'away'
        });
      }
      
      // Insert all log entries
      if (logEntries.length > 0) {
        await db.insert(playerGameLogs).values(logEntries);
        logsCreated += logEntries.length;
      }
    }
    
    console.log(`Successfully created ${logsCreated} player game logs`);
    
    // Calculate defense ranks based on real data
    await calculateDefenseRanks(season);
    
  } catch (error) {
    console.error('Error in NFL data ingestion:', error);
    throw error;
  }
}

async function calculateDefenseRanks(season: number) {
  console.log('Calculating defense ranks from real data...');
  
  try {
    // Get all unique team/prop type combinations from game logs
    const teamPropCombos = await db.execute(`
      SELECT 
        pgl.team_id,
        pgl.prop_type,
        COUNT(*) as games_played,
        AVG(pgl.actual_value) as avg_allowed
      FROM player_game_logs pgl
      WHERE pgl.season = '${season}'
      GROUP BY pgl.team_id, pgl.prop_type
      HAVING COUNT(*) >= 5
    `);
    
    // Calculate ranks for each prop type
    const propTypes = [...new Set(teamPropCombos.map((row: any) => row.prop_type))];
    
    for (const propType of propTypes) {
      const teamsForProp = teamPropCombos.filter((row: any) => row.prop_type === propType);
      
      // Sort by avg_allowed (higher = worse defense)
      teamsForProp.sort((a: any, b: any) => b.avg_allowed - a.avg_allowed);
      
      // Create defense rank entries
      const rankEntries = teamsForProp.map((team: any, index: number) => ({
        team_id: team.team_id,
        league: 'NFL',
        prop_type: propType,
        rank: index + 1,
        rank_percentile: ((teamsForProp.length - index) / teamsForProp.length) * 100,
        season: season.toString(),
        games_tracked: team.games_played
      }));
      
      if (rankEntries.length > 0) {
        await db.insert(defenseRanks).values(rankEntries);
      }
    }
    
    console.log(`Created defense ranks for ${propTypes.length} prop types`);
    
  } catch (error) {
    console.error('Error calculating defense ranks:', error);
    throw error;
  }
}

async function main() {
  try {
    await ingestNFLData(2023);
    console.log('NFL data ingestion completed successfully!');
  } catch (error) {
    console.error('NFL data ingestion failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
