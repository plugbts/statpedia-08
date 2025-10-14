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
 * Test backfill for a few days to verify the system works
 */
async function testBackfill() {
  console.log('🧪 Testing backfill system with recent dates...\n');
  
  // Test with last 7 days
  const testDates = [];
  for (let i = 1; i <= 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    testDates.push(date.toISOString().split('T')[0]);
  }
  
  const leagues = ['NBA', 'MLB', 'NHL'];
  let totalGames = 0;
  let totalProcessed = 0;
  
  for (const league of leagues) {
    console.log(`\n🏀 Testing ${league} backfill...`);
    
    // Get league ID
    const leagueRecord = await db.execute(sql`SELECT id, code, name FROM leagues WHERE code = ${league} LIMIT 1`);
    
    if (!leagueRecord || leagueRecord.length === 0) {
      console.log(`❌ League ${league} not found`);
      continue;
    }
    
    const leagueId = leagueRecord[0].id;
    
    let leagueGames = 0;
    let leagueProcessed = 0;
    
    for (const dateStr of testDates) {
      console.log(`📅 Checking ${league} games for ${dateStr}...`);
      
      try {
        let games: any[] = [];
        
        // Fetch games based on league
        switch (league) {
          case 'NBA':
            games = await fetchNBAGames(dateStr);
            break;
          case 'MLB':
            games = await fetchMLBGames(dateStr);
            break;
          case 'NHL':
            games = await fetchNHLGames(dateStr);
            break;
        }
        
        if (games.length > 0) {
          console.log(`  ✅ Found ${games.length} games`);
          leagueGames += games.length;
          
          // Process first 2 games as a test
          for (const game of games.slice(0, 2)) {
            try {
              const result = await testProcessGame(league, game, leagueId, dateStr);
              if (result.processed) {
                leagueProcessed++;
                console.log(`    ✅ Processed game ${game.gameId} (${game.awayTeam} @ ${game.homeTeam})`);
              }
            } catch (error: any) {
              console.log(`    ❌ Failed game ${game.gameId}: ${error.message}`);
            }
          }
        } else {
          console.log(`  ⏭️  No games found`);
        }
      } catch (error: any) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
    
    console.log(`📊 ${league}: ${leagueProcessed}/${leagueGames} games processed`);
    totalGames += leagueGames;
    totalProcessed += leagueProcessed;
  }
  
  console.log(`\n🎉 Test complete! ${totalProcessed}/${totalGames} games processed`);
  
  await client.end();
}

/**
 * Fetch NBA games for a specific date
 */
async function fetchNBAGames(dateStr: string): Promise<any[]> {
  const url = `https://stats.nba.com/stats/scoreboardv2?DayOffset=0&GameDate=${dateStr}&LeagueID=00`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://www.nba.com/',
      'Origin': 'https://www.nba.com'
    }
  });
  
  if (!response.ok) return [];
  
  const data = await response.json();
  const games = data.resultSets[0]?.rowSet || [];
  
  return games.map((game: any[]) => ({
    gameId: game[2],
    homeTeam: game[6],
    awayTeam: game[4],
    gameDate: dateStr
  }));
}

/**
 * Fetch MLB games for a specific date
 */
async function fetchMLBGames(dateStr: string): Promise<any[]> {
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${dateStr}`;
  
  const response = await fetch(url);
  if (!response.ok) return [];
  
  const data = await response.json();
  const games = data.dates[0]?.games || [];
  
  return games.map((game: any) => ({
    gameId: game.gamePk,
    homeTeam: game.teams.home.team.abbreviation,
    awayTeam: game.teams.away.team.abbreviation,
    gameDate: dateStr
  }));
}

/**
 * Fetch NHL games for a specific date
 */
async function fetchNHLGames(dateStr: string): Promise<any[]> {
  const url = `https://api-web.nhle.com/v1/schedule/${dateStr}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://www.nhl.com/',
      'Origin': 'https://www.nhl.com'
    }
  });
  
  if (!response.ok) return [];
  
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
}

/**
 * Test process a single game (just create the game record, don't ingest player data yet)
 */
async function testProcessGame(league: string, game: any, leagueId: string, dateStr: string): Promise<{
  processed: boolean;
}> {
  // Check if game already exists
  const existingGameResult = await db.execute(sql`SELECT id FROM games WHERE api_game_id = ${game.gameId.toString()} LIMIT 1`);
  const existingGame = existingGameResult[0];
  
  if (existingGame) {
    return { processed: false };
  }
  
  // Get team IDs
  const homeTeamResult = await db.execute(sql`SELECT id FROM teams WHERE league_id = ${leagueId} AND abbreviation = ${game.homeTeam} LIMIT 1`);
  const awayTeamResult = await db.execute(sql`SELECT id FROM teams WHERE league_id = ${leagueId} AND abbreviation = ${game.awayTeam} LIMIT 1`);
  
  const homeTeam = homeTeamResult[0];
  const awayTeam = awayTeamResult[0];
  
  if (!homeTeam || !awayTeam) {
    return { processed: false };
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
  
  return { processed: true };
}

/**
 * Get season from date
 */
function getSeasonFromDate(dateStr: string, league: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  switch (league) {
    case 'NBA':
      // NBA season starts in October
      return month >= 10 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
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
  testBackfill().catch(console.error);
}

export { testBackfill };
