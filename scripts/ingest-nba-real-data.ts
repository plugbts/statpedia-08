import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { players, teams, games, playerGameLogs, defenseRanks } from '../src/db/schema/index';
import { eq, and } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

// NBA Team mapping from balldontlie to our teams table
const NBA_TEAM_MAP: Record<number, string> = {
  1: 'Atlanta Hawks',
  2: 'Boston Celtics',
  3: 'Brooklyn Nets',
  4: 'Charlotte Hornets',
  5: 'Chicago Bulls',
  6: 'Cleveland Cavaliers',
  7: 'Dallas Mavericks',
  8: 'Denver Nuggets',
  9: 'Detroit Pistons',
  10: 'Golden State Warriors',
  11: 'Houston Rockets',
  12: 'Indiana Pacers',
  13: 'LA Clippers',
  14: 'Los Angeles Lakers',
  15: 'Memphis Grizzlies',
  16: 'Miami Heat',
  17: 'Milwaukee Bucks',
  18: 'Minnesota Timberwolves',
  19: 'New Orleans Pelicans',
  20: 'New York Knicks',
  21: 'Oklahoma City Thunder',
  22: 'Orlando Magic',
  23: 'Philadelphia 76ers',
  24: 'Phoenix Suns',
  25: 'Portland Trail Blazers',
  26: 'Sacramento Kings',
  27: 'San Antonio Spurs',
  28: 'Toronto Raptors',
  29: 'Utah Jazz',
  30: 'Washington Wizards'
};

const NBA_TEAM_ABBR_MAP: Record<number, string> = {
  1: 'ATL', 2: 'BOS', 3: 'BKN', 4: 'CHA', 5: 'CHI',
  6: 'CLE', 7: 'DAL', 8: 'DEN', 9: 'DET', 10: 'GSW',
  11: 'HOU', 12: 'IND', 13: 'LAC', 14: 'LAL', 15: 'MEM',
  16: 'MIA', 17: 'MIL', 18: 'MIN', 19: 'NOP', 20: 'NYK',
  21: 'OKC', 22: 'ORL', 23: 'PHI', 24: 'PHX', 25: 'POR',
  26: 'SAC', 27: 'SAS', 28: 'TOR', 29: 'UTA', 30: 'WAS'
};

async function fetchNBAGames(season: number) {
  console.log(`Fetching NBA games for ${season} season...`);
  
  try {
    const games = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await fetch(`https://www.balldontlie.io/api/v1/games?seasons[]=${season}&page=${page}&per_page=100`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch games: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        games.push(...data.data);
        page++;
        
        // Check if we've reached the last page
        if (page > data.meta.total_pages) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
      
      // Rate limiting - wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Fetched ${games.length} games`);
    return games;
    
  } catch (error) {
    console.error('Error fetching NBA games:', error);
    throw error;
  }
}

async function fetchNBAPlayerStats(season: number) {
  console.log(`Fetching NBA player stats for ${season} season...`);
  
  try {
    const stats = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await fetch(`https://www.balldontlie.io/api/v1/stats?seasons[]=${season}&page=${page}&per_page=100`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch player stats: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        stats.push(...data.data);
        page++;
        
        // Check if we've reached the last page
        if (page > data.meta.total_pages) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
      
      // Rate limiting - wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Fetched ${stats.length} player stat records`);
    return stats;
    
  } catch (error) {
    console.error('Error fetching NBA player stats:', error);
    throw error;
  }
}

async function getOrCreateTeam(teamId: number, teamName: string) {
  try {
    const abbreviation = NBA_TEAM_ABBR_MAP[teamId];
    
    // First try to find existing team
    const existingTeams = await db.select().from(teams).where(eq(teams.abbreviation, abbreviation));
    
    if (existingTeams.length > 0) {
      return existingTeams[0];
    }
    
    // Create new team if not found
    const newTeam = await db.insert(teams).values({
      abbreviation: abbreviation,
      name: teamName,
      league: 'NBA'
    }).returning();
    
    return newTeam[0];
    
  } catch (error) {
    console.error(`Error getting/creating team ${teamName}:`, error);
    throw error;
  }
}

async function getOrCreatePlayer(playerId: number, playerName: string, teamId: string, position: string) {
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
      league: 'NBA'
    }).returning();
    
    return newPlayer[0];
    
  } catch (error) {
    console.error(`Error getting/creating player ${playerName}:`, error);
    throw error;
  }
}

async function ingestNBAData(season: number = 2023) {
  console.log(`Starting NBA data ingestion for ${season} season...`);
  
  try {
    // Fetch real data from APIs
    const [gamesData, playerStatsData] = await Promise.all([
      fetchNBAGames(season),
      fetchNBAPlayerStats(season)
    ]);
    
    console.log(`Processing ${gamesData.length} games and ${playerStatsData.length} player stats...`);
    
    // Process games and create teams
    const gameMap = new Map();
    const teamMap = new Map();
    
    for (const game of gamesData) {
      if (!game.home_team || !game.visitor_team) continue;
      
      // Get or create teams
      const homeTeam = await getOrCreateTeam(game.home_team.id, game.home_team.full_name);
      const visitorTeam = await getOrCreateTeam(game.visitor_team.id, game.visitor_team.full_name);
      
      teamMap.set(game.home_team.id, homeTeam);
      teamMap.set(game.visitor_team.id, visitorTeam);
      
      // Store game info
      gameMap.set(game.id, {
        id: game.id,
        away_team_id: visitorTeam.id,
        home_team_id: homeTeam.id,
        game_date: game.date,
        season: season.toString()
      });
    }
    
    console.log(`Created/found ${teamMap.size} teams and ${gameMap.size} games`);
    
    // Process player stats and create game logs
    let logsCreated = 0;
    
    for (const stat of playerStatsData) {
      if (!stat.player || !stat.team || !stat.game) continue;
      
      const team = teamMap.get(stat.team.id);
      if (!team) continue;
      
      const game = gameMap.get(stat.game.id);
      if (!game) continue;
      
      // Get or create player
      const player = await getOrCreatePlayer(
        stat.player.id,
        stat.player.first_name + ' ' + stat.player.last_name,
        team.id,
        stat.player.position || 'UNKNOWN'
      );
      
      // Create game log entries for different prop types
      const logEntries = [];
      
      // Points props
      if (stat.pts !== null && stat.pts > 0) {
        logEntries.push({
          player_id: player.id,
          team_id: team.id,
          game_id: game.id,
          opponent_id: stat.team.id === game.home_team_id ? game.away_team_id : game.home_team_id,
          prop_type: 'Points',
          line: stat.pts,
          actual_value: stat.pts,
          hit: true,
          game_date: game.game_date,
          season: season.toString(),
          home_away: stat.team.id === game.home_team_id ? 'home' : 'away'
        });
      }
      
      // Assists props
      if (stat.ast !== null && stat.ast > 0) {
        logEntries.push({
          player_id: player.id,
          team_id: team.id,
          game_id: game.id,
          opponent_id: stat.team.id === game.home_team_id ? game.away_team_id : game.home_team_id,
          prop_type: 'Assists',
          line: stat.ast,
          actual_value: stat.ast,
          hit: true,
          game_date: game.game_date,
          season: season.toString(),
          home_away: stat.team.id === game.home_team_id ? 'home' : 'away'
        });
      }
      
      // Rebounds props
      if (stat.reb !== null && stat.reb > 0) {
        logEntries.push({
          player_id: player.id,
          team_id: team.id,
          game_id: game.id,
          opponent_id: stat.team.id === game.home_team_id ? game.away_team_id : game.home_team_id,
          prop_type: 'Rebounds',
          line: stat.reb,
          actual_value: stat.reb,
          hit: true,
          game_date: game.game_date,
          season: season.toString(),
          home_away: stat.team.id === game.home_team_id ? 'home' : 'away'
        });
      }
      
      // 3-Pointers Made props
      if (stat.fg3m !== null && stat.fg3m > 0) {
        logEntries.push({
          player_id: player.id,
          team_id: team.id,
          game_id: game.id,
          opponent_id: stat.team.id === game.home_team_id ? game.away_team_id : game.home_team_id,
          prop_type: '3-Pointers Made',
          line: stat.fg3m,
          actual_value: stat.fg3m,
          hit: true,
          game_date: game.game_date,
          season: season.toString(),
          home_away: stat.team.id === game.home_team_id ? 'home' : 'away'
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
    console.error('Error in NBA data ingestion:', error);
    throw error;
  }
}

async function calculateDefenseRanks(season: number) {
  console.log('Calculating defense ranks from real data...');
  
  try {
    // Get all unique team/prop type combinations from game logs
    const teamPropCombos = await db.execute(`
      SELECT 
        pgl.opponent_id,
        pgl.prop_type,
        COUNT(*) as games_played,
        AVG(pgl.actual_value) as avg_allowed
      FROM player_game_logs pgl
      WHERE pgl.season = '${season}' AND pgl.league = 'NBA'
      GROUP BY pgl.opponent_id, pgl.prop_type
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
        team_id: team.opponent_id,
        league: 'NBA',
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
    await ingestNBAData(2023);
    console.log('NBA data ingestion completed successfully!');
  } catch (error) {
    console.error('NBA data ingestion failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
