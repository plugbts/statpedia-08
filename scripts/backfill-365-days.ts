import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { players, teams, games, player_game_logs, leagues } from "../src/db/schema/index";
import { eq, and, desc, sql } from "drizzle-orm";
import { config } from "dotenv";
import fetch from "node-fetch";
import { randomUUID } from "crypto";

// Load environment variables
config({ path: ".env.local" });

const connectionString = process.env.NEON_DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client, { schema: { games, players, teams, player_game_logs, leagues } });

/**
 * Comprehensive 365-day backfill for all leagues
 */
async function backfill365Days() {
  console.log("🚀 Starting 365-day backfill for all leagues...\n");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 365); // Go back 365 days

  const leagues = [
    { code: "NBA", name: "National Basketball Association" },
    { code: "WNBA", name: "Women's National Basketball Association" },
    { code: "MLB", name: "Major League Baseball" },
    { code: "NHL", name: "National Hockey League" },
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

      console.log(
        `✅ ${league.name} complete: ${leagueStats.gamesProcessed}/${leagueStats.gamesFound} games processed, ${leagueStats.playersCreated} players created`,
      );
    } catch (error: any) {
      console.error(`❌ ${league.name} failed:`, error.message);
    }
  }

  console.log(`\n🎉 Backfill complete!`);
  console.log(
    `📊 Total: ${totalProcessed} games processed, ${totalGames} games found, ${totalPlayers} players created`,
  );

  await client.end();
}

/**
 * Backfill a specific league for 365 days
 */
async function backfillLeague(
  league: string,
  startDate: Date,
): Promise<{
  gamesProcessed: number;
  gamesFound: number;
  playersCreated: number;
}> {
  let gamesProcessed = 0;
  let gamesFound = 0;
  let playersCreated = 0;

  // Get league ID
  const leagueRecord = await db.execute(
    sql`SELECT id, code, name FROM leagues WHERE code = ${league} LIMIT 1`,
  );

  if (!leagueRecord || leagueRecord.length === 0) {
    throw new Error(`League ${league} not found`);
  }

  const leagueId = leagueRecord[0].id;

  // Process each day for the last 365 days
  const currentDate = new Date();
  const dateIterator = new Date(startDate);

  while (dateIterator <= currentDate) {
    const dateStr = dateIterator.toISOString().split("T")[0];
    console.log(`📅 Processing ${league} games for ${dateStr}...`);

    try {
      const dayStats = await processDay(league, dateStr, leagueId);
      gamesProcessed += dayStats.gamesProcessed;
      gamesFound += dayStats.gamesFound;
      playersCreated += dayStats.playersCreated;

      if (dayStats.gamesFound > 0) {
        console.log(
          `  ✅ ${dayStats.gamesFound} games found, ${dayStats.gamesProcessed} processed`,
        );
      }
    } catch (error: any) {
      console.error(`  ❌ Error processing ${dateStr}:`, error.message);
    }

    // Move to next day
    dateIterator.setDate(dateIterator.getDate() + 1);

    // Rate limiting - wait 1 second between days
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return { gamesProcessed, gamesFound, playersCreated };
}

/**
 * Process games for a specific day and league
 */
async function processDay(
  league: string,
  dateStr: string,
  leagueId: string,
): Promise<{
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
      case "NBA":
        games = await fetchNBAGames(dateStr);
        break;
      case "WNBA":
        games = await fetchWNBAGames(dateStr);
        break;
      case "MLB":
        games = await fetchMLBGames(dateStr);
        break;
      case "NHL":
        games = await fetchNHLGames(dateStr);
        break;
      default:
        throw new Error(`Unknown league: ${league}`);
    }

    gamesFound = games.length;

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
 * Fetch NBA games for a specific date
 */
async function fetchNBAGames(dateStr: string): Promise<any[]> {
  const url = `https://stats.nba.com/stats/scoreboardv2?DayOffset=0&GameDate=${dateStr}&LeagueID=00`;

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      Referer: "https://www.nba.com/",
      Origin: "https://www.nba.com",
    },
  });

  if (!response.ok) return [];

  const data = await response.json();
  const games = data.resultSets[0]?.rowSet || [];

  return games.map((game: any[]) => ({
    gameId: game[2],
    homeTeam: game[6],
    awayTeam: game[4],
    gameDate: dateStr,
  }));
}

/**
 * Fetch WNBA games for a specific date
 */
async function fetchWNBAGames(dateStr: string): Promise<any[]> {
  const url = `https://stats.wnba.com/stats/scoreboardv2?DayOffset=0&GameDate=${dateStr}&LeagueID=10`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      Accept: "application/json, text/plain, */*",
      Referer: "https://www.wnba.com/",
      Origin: "https://www.wnba.com",
    },
  });

  if (!response.ok) return [];

  const data = await response.json();
  const games = data.resultSets[0]?.rowSet || [];

  return games.map((game: any[]) => ({
    gameId: game[2],
    homeTeam: game[6],
    awayTeam: game[4],
    gameDate: dateStr,
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
    gameDate: dateStr,
  }));
}

/**
 * Fetch NHL games for a specific date
 */
async function fetchNHLGames(dateStr: string): Promise<any[]> {
  const url = `https://api-web.nhle.com/v1/schedule/${dateStr}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      Accept: "application/json, text/plain, */*",
      Referer: "https://www.nhl.com/",
      Origin: "https://www.nhl.com",
    },
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
          gameDate: dateStr,
        });
      }
    }
  }

  return games;
}

/**
 * Process a single game
 */
async function processGame(
  league: string,
  game: any,
  leagueId: string,
  dateStr: string,
): Promise<{
  gamesProcessed: number;
  playersCreated: number;
}> {
  let gamesProcessed = 0;
  const playersCreated = 0;

  // Check if game already exists
  const existingGameResult = await db.execute(
    sql`SELECT id FROM games WHERE api_game_id = ${game.gameId.toString()} LIMIT 1`,
  );
  const existingGame = existingGameResult[0];

  if (existingGame) {
    console.log(`    ⏭️  Game ${game.gameId} already exists, skipping`);
    return { gamesProcessed, playersCreated };
  }

  // Get team IDs
  const homeTeamResult = await db.execute(
    sql`SELECT id FROM teams WHERE league_id = ${leagueId} AND abbreviation = ${game.homeTeam} LIMIT 1`,
  );
  const awayTeamResult = await db.execute(
    sql`SELECT id FROM teams WHERE league_id = ${leagueId} AND abbreviation = ${game.awayTeam} LIMIT 1`,
  );

  const homeTeam = homeTeamResult[0];
  const awayTeam = awayTeamResult[0];

  if (!homeTeam || !awayTeam) {
    console.log(
      `    ⚠️  Teams not found for game ${game.gameId} (${game.awayTeam} @ ${game.homeTeam})`,
    );
    return { gamesProcessed, playersCreated };
  }

  // Create game record
  const [newGame] = await db
    .insert(games)
    .values({
      id: randomUUID(),
      league_id: leagueId,
      home_team_id: homeTeam.id,
      away_team_id: awayTeam.id,
      season: getSeasonFromDate(dateStr, league),
      season_type: "regular",
      game_date: dateStr,
      status: "completed",
      api_game_id: game.gameId.toString(),
    })
    .returning({ id: games.id });

  gamesProcessed = 1;

  // Import the appropriate ingestion function based on league
  try {
    if (league === "NBA" || league === "WNBA") {
      const { ingestGameBoxscore } = await import("./nba-wnba-player-logs-ingestion.js");
      await ingestGameBoxscore(db, game.gameId.toString(), league);
    } else if (league === "MLB" || league === "NHL") {
      const { ingestMLBGameBoxscore, ingestNHLGameBoxscore } = await import(
        "./mlb-nhl-player-logs-ingestion.js"
      );
      if (league === "MLB") {
        await ingestMLBGameBoxscore(db, game.gameId.toString());
      } else {
        await ingestNHLGameBoxscore(db, game.gameId.toString());
      }
    }
    console.log(`    ✅ Processed game ${game.gameId} (${game.awayTeam} @ ${game.homeTeam})`);
  } catch (error: any) {
    console.error(`    ❌ Failed to ingest game ${game.gameId}:`, error.message);
  }

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
    case "NBA":
    case "WNBA":
      // NBA/WNBA season starts in October
      return month >= 10 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    case "MLB":
      // MLB season starts in March
      return month >= 3 ? `${year}` : `${year - 1}`;
    case "NHL":
      // NHL season starts in October
      return month >= 10 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    default:
      return `${year}`;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  backfill365Days().catch(console.error);
}

export { backfill365Days };
