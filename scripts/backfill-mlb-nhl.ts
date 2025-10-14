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

/**
 * Focused backfill for MLB and NHL only
 */
async function backfillMLBNHL() {
  console.log('🚀 Starting MLB and NHL backfill...\n');
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 365); // Go back 365 days
  
  const leagues = [
    { code: 'MLB', name: 'Major League Baseball' },
    { code: 'NHL', name: 'National Hockey League' }
  ];
  
  let totalProcessed = 0;
  let totalGames = 0;
  let totalPlayers = 0;
  
  for (const league of leagues) {
    console.log(`\n🏀 Starting ${league.name} backfill...`);
    
    try {
      const leagueStats = await backfillLeague(league.code, startDate);
      totalProcessed += leagueStats.gamesProcessed;
      totalGames += leagueStats.gamesFound;
      totalPlayers += leagueStats.playersCreated;
      
      console.log(`✅ ${league.name} complete: ${leagueStats.gamesProcessed}/${leagueStats.gamesFound} games processed, ${leagueStats.playersCreated} players created`);
    } catch (error: any) {
      console.error(`❌ ${league.name} failed:`, error.message);
    }
  }
  
  console.log(`\n🎉 Backfill complete!`);
  console.log(`📊 Total: ${totalProcessed} games processed, ${totalGames} games found, ${totalPlayers} players created`);
  
  await client.end();
}

/**
 * Backfill a specific league for 365 days
 */
async function backfillLeague(league: string, startDate: Date): Promise<{
  gamesProcessed: number;
  gamesFound: number;
  playersCreated: number;
}> {
  let gamesProcessed = 0;
  let gamesFound = 0;
  let playersCreated = 0;
  
  // Get league ID
  const leagueRecord = await db.execute(sql`SELECT id, code, name FROM leagues WHERE code = ${league} LIMIT 1`);
  
  if (!leagueRecord || leagueRecord.length === 0) {
    throw new Error(`League ${league} not found`);
  }
  
  const leagueId = leagueRecord[0].id;
  
  // Process each day for the last 365 days
  const currentDate = new Date();
  const dateIterator = new Date(startDate);
  
  while (dateIterator <= currentDate) {
    const dateStr = dateIterator.toISOString().split('T')[0];
    console.log(`📅 Processing ${league} games for ${dateStr}...`);
    
    try {
      const dayStats = await processDay(league, dateStr, leagueId);
      gamesProcessed += dayStats.gamesProcessed;
      gamesFound += dayStats.gamesFound;
      playersCreated += dayStats.playersCreated;
      
      if (dayStats.gamesFound > 0) {
        console.log(`  ✅ ${dayStats.gamesFound} games found, ${dayStats.gamesProcessed} processed`);
      } else {
        console.log(`  ⏭️  No games found for ${dateStr}`);
      }
    } catch (error: any) {
      console.error(`  ❌ Error processing ${dateStr}:`, error.message);
    }
    
    // Move to next day
    dateIterator.setDate(dateIterator.getDate() + 1);
    
    // Rate limiting - wait 500ms between days
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return { gamesProcessed, gamesFound, playersCreated };
}

/**
 * Process games for a specific day and league
 */
async function processDay(league: string, dateStr: string, leagueId: string): Promise<{
  gamesProcessed: number;
  gamesFound: number;
  playersCreated: number;
}> {
  let gamesProcessed = 0;
  let gamesFound = 0;
  let playersCreated = 0;
  
  try {
    let games: any[] = [];
    
    // Fetch games based on league
    switch (league) {
      case 'MLB':
        games = await fetchMLBGames(dateStr);
        break;
      case 'NHL':
        games = await fetchNHLGames(dateStr);
        break;
      default:
        throw new Error(`Unknown league: ${league}`);
    }
    
    gamesFound = games.length;
    
    if (games.length > 0) {
      console.log(`  📊 Found ${games.length} ${league} games for ${dateStr}`);
    }
    
    // Process each game
    for (const game of games) {
      try {
        const gameStats = await processGame(league, game, leagueId, dateStr);
        gamesProcessed += gameStats.gamesProcessed;
        playersCreated += gameStats.playersCreated;
      } catch (error: any) {
        console.error(`    ❌ Error processing game ${game.gameId}:`, error.message);
      }
    }
    
  } catch (error: any) {
    console.error(`  ❌ Error fetching games for ${dateStr}:`, error.message);
  }
  
  return { gamesProcessed, gamesFound, playersCreated };
}

/**
 * Fetch MLB games for a specific date
 */
async function fetchMLBGames(dateStr: string): Promise<any[]> {
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${dateStr}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`    ⚠️  MLB API returned ${response.status} for ${dateStr}`);
      return [];
    }
    
    const data = await response.json();
    const games = data.dates[0]?.games || [];
    
    return games.map((game: any) => ({
      gameId: game.gamePk,
      homeTeam: game.teams.home.team.name,
      awayTeam: game.teams.away.team.name,
      gameDate: dateStr
    }));
  } catch (error: any) {
    console.error(`    ❌ MLB API error for ${dateStr}:`, error.message);
    return [];
  }
}

/**
 * Fetch NHL games for a specific date
 */
async function fetchNHLGames(dateStr: string): Promise<any[]> {
  const url = `https://api-web.nhle.com/v1/schedule/${dateStr}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.nhl.com/',
        'Origin': 'https://www.nhl.com'
      }
    });
    
    if (!response.ok) {
      console.log(`    ⚠️  NHL API returned ${response.status} for ${dateStr}`);
      return [];
    }
    
    const data = await response.json();
    const gameWeek = data.gameWeek || [];
    const games: any[] = [];
    
    for (const day of gameWeek) {
      if (day.games) {
        for (const game of day.games) {
          games.push({
            gameId: game.id,
            homeTeam: game.homeTeam.abbrev,
            awayTeam: game.awayTeam.abbrev,
            gameDate: dateStr
          });
        }
      }
    }
    
    return games;
  } catch (error: any) {
    console.error(`    ❌ NHL API error for ${dateStr}:`, error.message);
    return [];
  }
}

/**
 * Process a single game
 */
async function processGame(league: string, game: any, leagueId: string, dateStr: string): Promise<{
  gamesProcessed: number;
  playersCreated: number;
}> {
  let gamesProcessed = 0;
  let playersCreated = 0;
  
  // Check if game already exists
  const existingGameResult = await db.execute(sql`SELECT id FROM games WHERE api_game_id = ${game.gameId.toString()} LIMIT 1`);
  const existingGame = existingGameResult[0];
  
  if (existingGame) {
    console.log(`    ⏭️  Game ${game.gameId} already exists, skipping`);
    return { gamesProcessed, playersCreated };
  }
  
  // Get team IDs - use team_abbrev_map for both MLB and NHL
  let homeTeamResult, awayTeamResult;
  
  // First try team_abbrev_map for both leagues
  homeTeamResult = await db.execute(sql.raw(`SELECT team_id as id FROM team_abbrev_map WHERE league = '${league}' AND api_abbrev = '${game.homeTeam}' LIMIT 1`));
  awayTeamResult = await db.execute(sql.raw(`SELECT team_id as id FROM team_abbrev_map WHERE league = '${league}' AND api_abbrev = '${game.awayTeam}' LIMIT 1`));
  
  // Fallback to direct name match for MLB if not found in mapping
  if (league === 'MLB' && (!homeTeamResult[0] || !awayTeamResult[0])) {
    if (!homeTeamResult[0]) {
      homeTeamResult = await db.execute(sql.raw(`SELECT id FROM teams WHERE league_id = '${leagueId}' AND name = '${game.homeTeam}' LIMIT 1`));
    }
    if (!awayTeamResult[0]) {
      awayTeamResult = await db.execute(sql.raw(`SELECT id FROM teams WHERE league_id = '${leagueId}' AND name = '${game.awayTeam}' LIMIT 1`));
    }
  }
  
  const homeTeam = homeTeamResult[0];
  const awayTeam = awayTeamResult[0];
  
  if (!homeTeam || !awayTeam) {
    console.log(`    ⚠️  Teams not found for game ${game.gameId} (${game.awayTeam} @ ${game.homeTeam})`);
    return { gamesProcessed, playersCreated };
  }
  
  // Create game record
  await db.insert(games).values({
    id: randomUUID(),
    league_id: leagueId,
    home_team_id: homeTeam.id,
    away_team_id: awayTeam.id,
    season: getSeasonFromDate(dateStr, league),
    season_type: 'regular',
    game_date: dateStr,
    status: 'completed',
    api_game_id: game.gameId.toString()
  });
  
  gamesProcessed = 1;
  
  console.log(`    ✅ Created game ${game.gameId} (${game.awayTeam} @ ${game.homeTeam})`);
  
  return { gamesProcessed, playersCreated };
}

/**
 * Get season from date
 */
function getSeasonFromDate(dateStr: string, league: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  switch (league) {
    case 'MLB':
      // MLB season starts in March
      return month >= 3 ? `${year}` : `${year - 1}`;
    case 'NHL':
      // NHL season starts in October
      return month >= 10 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    default:
      return `${year}`;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  backfillMLBNHL().catch(console.error);
}

export { backfillMLBNHL };
