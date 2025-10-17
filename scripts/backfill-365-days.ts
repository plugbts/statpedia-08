import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { players, teams, games, player_game_logs, leagues } from "../src/db/schema/index";
import { eq, and, desc, sql } from "drizzle-orm";
import { config } from "dotenv";
import fetch, { type Response as FetchResponse } from "node-fetch";
import { randomUUID } from "crypto";

// Load environment variables
config({ path: ".env.local" });

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("No DB URL (NEON_DATABASE_URL or DATABASE_URL)");
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema: { games, players, teams, player_game_logs, leagues } });

// Concurrency controls
const MAX_CONCURRENCY = Number(process.env.BACKFILL_CONCURRENCY || 6);
const DAY_DELAY_MS = Number(process.env.BACKFILL_DAY_DELAY_MS || 300);
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 15000);

async function fetchWithTimeout(
  url: string,
  init: any = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<FetchResponse> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res as FetchResponse;
  } finally {
    clearTimeout(id);
  }
}

async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length) as any;
  let i = 0;
  const workers: Promise<void>[] = [];
  async function run() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try {
        results[idx] = await worker(items[idx], idx);
      } catch (e) {
        // @ts-ignore
        results[idx] = undefined;
      }
    }
  }
  for (let k = 0; k < Math.max(1, limit); k++) workers.push(run());
  await Promise.all(workers);
  return results;
}

/**
 * Comprehensive 365-day backfill for all leagues
 */
async function backfill365Days() {
  console.log("🚀 Starting 365-day backfill for all leagues...\n");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 365); // Go back 365 days

  // Allow overriding leagues via env (comma-separated), else process MLB/NHL first to ensure progress
  const envLeagues = (process.env.BACKFILL_LEAGUES || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const defaultOrder = ["MLB", "NHL", "WNBA", "NBA"] as const;
  const order = (envLeagues.length ? envLeagues : defaultOrder) as readonly string[];
  const known: Record<string, string> = {
    NBA: "National Basketball Association",
    WNBA: "Women's National Basketball Association",
    MLB: "Major League Baseball",
    NHL: "National Hockey League",
  };
  const leagues = order.filter((c) => known[c]).map((code) => ({ code, name: known[code] }));

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
  const MAX_CONSECUTIVE_FETCH_ERRORS = Number(process.env.MAX_DAY_FETCH_ERRORS || 10);
  let consecutiveFetchErrors = 0;

  // Get league ID
  const leagueRecord = await db.execute(
    sql`SELECT id, code, name FROM leagues WHERE code = ${league} LIMIT 1`,
  );

  if (!leagueRecord || leagueRecord.length === 0) {
    throw new Error(`League ${league} not found`);
  }

  const leagueId: string = leagueRecord[0].id as string;

  // Process each day for the last 365 days
  const currentDate = new Date();
  const dateIterator = new Date(currentDate); // iterate backward from today

  while (dateIterator >= startDate) {
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

      // reset on any successful fetch attempt (even zero games)
      consecutiveFetchErrors = 0;
    } catch (error: any) {
      console.error(`  ❌ Error processing ${dateStr}:`, error.message);
      consecutiveFetchErrors++;
      if (consecutiveFetchErrors >= MAX_CONSECUTIVE_FETCH_ERRORS) {
        console.warn(
          `  ⚠️  Too many consecutive fetch errors (${consecutiveFetchErrors}) for ${league}. Skipping remaining days for this league.`,
        );
        break;
      }
    }

    // Move to previous day (reverse order)
    dateIterator.setDate(dateIterator.getDate() - 1);

    // Small delay between days to avoid hammering public APIs
    if (DAY_DELAY_MS > 0) await new Promise((resolve) => setTimeout(resolve, DAY_DELAY_MS));
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

    // Process each game's ingestion in parallel with a safe concurrency limit
    if (games.length > 0) {
      await mapWithLimit(games, MAX_CONCURRENCY, async (game) => {
        try {
          const stats = await processGame(league, game, leagueId, dateStr);
          gamesProcessed += stats.gamesProcessed;
          playersCreated += stats.playersCreated;
        } catch (error: any) {
          console.error(`    ❌ Error processing game ${game.gameId}:`, error.message);
        }
      });
    }
  } catch (error: any) {
    console.error(`  ❌ Error fetching games for ${dateStr}:`, error.message);
    throw error; // propagate so caller can count consecutive errors
  }

  return { gamesProcessed, gamesFound, playersCreated };
}

/**
 * Fetch NBA games for a specific date
 */
async function fetchNBAGames(dateStr: string): Promise<any[]> {
  const yyyymmdd = dateStr.replace(/-/g, "");

  // 1) Try CDN liveData scoreboard by date
  try {
    const cdnUrl = `https://cdn.nba.com/static/json/liveData/scoreboard/scoreboard_${yyyymmdd}.json`;
    const r0 = await fetchWithTimeout(
      cdnUrl,
      { headers: { Accept: "application/json" } },
      FETCH_TIMEOUT_MS,
    );
    if (r0.ok) {
      const d0: any = await r0.json();
      const gamesArr: any[] = d0?.scoreboard?.games || d0?.games || [];
      const mapped = gamesArr
        .map((g: any) => ({
          gameId: g.gameId || g.gameID || g.gameCode,
          homeTeam: g.homeTeam?.teamTricode || g.hTeam?.triCode,
          awayTeam: g.awayTeam?.teamTricode || g.vTeam?.triCode,
        }))
        .filter((g: any) => g.gameId && g.homeTeam && g.awayTeam)
        .map((g: any) => ({ ...g, gameDate: dateStr }));
      if (mapped.length > 0) return mapped;
    }
  } catch {
    // ...empty block removed
  }

  // 2) Try legacy data.nba.com (valid cert)
  try {
    const dataUrl = `https://data.nba.com/data/10s/prod/v1/${yyyymmdd}/scoreboard.json`;
    const r1 = await fetchWithTimeout(
      dataUrl,
      { headers: { Accept: "application/json" } },
      FETCH_TIMEOUT_MS,
    );
    if (r1.ok) {
      const d1: any = await r1.json();
      const g1 = (d1?.games as any[]) || [];
      if (g1.length > 0) {
        return g1
          .map((g: any) => ({
            gameId: g.gameId,
            homeTeam: g.hTeam?.triCode,
            awayTeam: g.vTeam?.triCode,
            gameDate: dateStr,
          }))
          .filter((x: any) => x.gameId && x.homeTeam && x.awayTeam);
      }
    }
  } catch {
    // ...empty block removed
  }

  // 3) Fallback: stats.nba.com scoreboardv2 with required headers
  const statsUrl = `https://stats.nba.com/stats/scoreboardv2?DayOffset=0&GameDate=${dateStr}&LeagueID=00`;
  const r2 = await fetchWithTimeout(
    statsUrl,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        Referer: "https://www.nba.com/",
        Origin: "https://www.nba.com",
        "x-nba-stats-origin": "stats",
        "x-nba-stats-token": "true",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    },
    FETCH_TIMEOUT_MS,
  );
  if (!r2.ok) return [];
  const d2: any = await r2.json();
  const rs = d2?.resultSets?.[0];
  const rows: any[] = rs?.rowSet || [];
  const headers: string[] = rs?.headers || [];
  const idx = (name: string) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const iGameId = idx("GAME_ID");
  const iHome = idx("HOME_TEAM_ABBREVIATION");
  const iAway = idx("VISITOR_TEAM_ABBREVIATION");
  return rows.map((r: any[]) => ({
    gameId: r[iGameId],
    homeTeam: r[iHome],
    awayTeam: r[iAway],
    gameDate: dateStr,
  }));
}

/**
 * Fetch WNBA games for a specific date
 */
async function fetchWNBAGames(dateStr: string): Promise<any[]> {
  const url = `https://stats.wnba.com/stats/scoreboardv2?DayOffset=0&GameDate=${dateStr}&LeagueID=10`;

  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Accept: "application/json, text/plain, */*",
        Referer: "https://www.wnba.com/",
        Origin: "https://www.wnba.com",
      },
    },
    FETCH_TIMEOUT_MS,
  );

  if (!response.ok) return [];

  const data: any = await response.json();
  const rows = data.resultSets?.[0]?.rowSet || [];
  const headers: string[] = data.resultSets?.[0]?.headers || [];
  const idx = (name: string) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const iGameId = idx("GAME_ID");
  const iHome = idx("HOME_TEAM_ABBREVIATION");
  const iAway = idx("VISITOR_TEAM_ABBREVIATION");

  return rows.map((r: any[]) => ({
    gameId: r[iGameId],
    homeTeam: r[iHome],
    awayTeam: r[iAway],
    gameDate: dateStr,
  }));
}

async function deriveWNBATeamsFromBox(
  gameId: string,
): Promise<{ home: string | null; away: string | null; codes: string[] }> {
  const base = `https://stats.wnba.com/stats`;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    Accept: "application/json, text/plain, */*",
    Referer: "https://www.wnba.com/",
    Origin: "https://www.wnba.com",
    "x-nba-stats-origin": "stats",
    "x-nba-stats-token": "true",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  } as any;
  const endpoints = [
    `${base}/boxscoretraditionalv2?GameID=${gameId}&StartPeriod=0&EndPeriod=14&LeagueID=10`,
    `${base}/boxscoreadvancedv2?GameID=${gameId}&StartPeriod=0&EndPeriod=14&LeagueID=10`,
  ];
  for (const url of endpoints) {
    const res = await fetchWithTimeout(url, { headers }, FETCH_TIMEOUT_MS);
    if (!res.ok) continue;
    const data: any = await res.json();
    const rs = data?.resultSets || [];
    const playersSet = rs.find(
      (r: any) =>
        Array.isArray(r.headers) &&
        r.headers.some((h: string) => h.toLowerCase().includes("team_abbreviation")),
    );
    const hs: string[] = playersSet?.headers || [];
    const idxTeam = hs.findIndex((h: string) => h.toLowerCase() === "team_abbreviation");
    const vals = new Set<string>();
    for (const row of playersSet?.rowSet || []) {
      const v = row[idxTeam];
      if (v && typeof v === "string") vals.add(v.trim());
    }
    const arr = Array.from(vals);
    if (arr.length >= 2) return { home: arr[0] || null, away: arr[1] || null, codes: arr };
  }
  return { home: null, away: null, codes: [] };
}

/**
 * Fetch MLB games for a specific date
 */
async function fetchMLBGames(dateStr: string): Promise<any[]> {
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${dateStr}`;

  const response = await fetchWithTimeout(url, {}, FETCH_TIMEOUT_MS);
  if (!response.ok) return [];

  const data: any = await response.json();
  const games = data.dates[0]?.games || [];

  return games.map((game: any) => ({
    gameId: game.gamePk,
    homeTeam: game.teams.home.team.abbreviation,
    awayTeam: game.teams.away.team.abbreviation,
    gameDate: dateStr,
  }));
}

async function deriveMLBTeamsFromLive(
  gameId: string,
): Promise<{ home: string | null; away: string | null }> {
  const url = `https://statsapi.mlb.com/api/v1.1/game/${gameId}/feed/live`;
  const res = await fetchWithTimeout(url, {}, FETCH_TIMEOUT_MS);
  if (!res.ok) return { home: null, away: null };
  const data: any = await res.json();
  const home = data?.gameData?.teams?.home?.abbreviation || null;
  const away = data?.gameData?.teams?.away?.abbreviation || null;
  return { home, away };
}

/**
 * Fetch NHL games for a specific date
 */
async function fetchNHLGames(dateStr: string): Promise<any[]> {
  // Primary: api-web.nhle.com (structured by gameWeek)
  try {
    const url = `https://api-web.nhle.com/v1/schedule/${dateStr}`;
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          Accept: "application/json, text/plain, */*",
          Referer: "https://www.nhl.com/",
          Origin: "https://www.nhl.com",
        },
      },
      FETCH_TIMEOUT_MS,
    );

    if (response.ok) {
      const data: any = await response.json();
      const gameWeek = data.gameWeek || [];
      const list: any[] = [];
      for (const day of gameWeek) {
        for (const game of day?.games || []) {
          list.push({
            gameId: game.id,
            homeTeam: game.homeTeam?.abbrev,
            awayTeam: game.awayTeam?.abbrev,
            gameDate: dateStr,
          });
        }
      }
      if (list.length > 0) return list;
    }
  } catch (e) {
    // fall through to fallback
  }

  // Fallback: statsapi.web.nhl.com schedule (returns gamePk and team abbreviations)
  try {
    const url2 = `https://statsapi.web.nhl.com/api/v1/schedule?date=${dateStr}`;
    const response2 = await fetchWithTimeout(
      url2,
      { headers: { Accept: "application/json" } },
      FETCH_TIMEOUT_MS,
    );
    if (!response2.ok) return [];
    const data2: any = await response2.json();
    const games = (data2?.dates?.[0]?.games as any[]) || [];
    return games
      .map((g: any) => ({
        gameId: g.gamePk,
        homeTeam: g?.teams?.home?.team?.abbreviation || g?.teams?.home?.team?.triCode,
        awayTeam: g?.teams?.away?.team?.abbreviation || g?.teams?.away?.team?.triCode,
        gameDate: dateStr,
      }))
      .filter((g: any) => g.gameId && g.homeTeam && g.awayTeam);
  } catch (e) {
    return [];
  }
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

  // Normalize and resolve team abbreviations
  const invalid = (v?: string) => !v || v.trim() === "" || /final/i.test(v);
  let homeAbbrev: string | undefined = (game.homeTeam ?? "").toString().trim();
  let awayAbbrev: string | undefined = (game.awayTeam ?? "").toString().trim();

  try {
    if (league === "WNBA" && (invalid(homeAbbrev) || invalid(awayAbbrev))) {
      const d = await deriveWNBATeamsFromBox(game.gameId.toString());
      if (invalid(homeAbbrev)) homeAbbrev = d.home ?? d.codes?.[0] ?? undefined;
      if (invalid(awayAbbrev)) awayAbbrev = d.away ?? d.codes?.[1] ?? undefined;
    }
    if (league === "MLB" && (invalid(homeAbbrev) || invalid(awayAbbrev))) {
      const d = await deriveMLBTeamsFromLive(game.gameId.toString());
      if (invalid(homeAbbrev)) homeAbbrev = d.home ?? undefined;
      if (invalid(awayAbbrev)) awayAbbrev = d.away ?? undefined;
    }
  } catch {
    // ...empty block removed
  }

  if (invalid(homeAbbrev) || invalid(awayAbbrev)) {
    console.log(`    ⚠️  Missing team abbreviations for ${league} ${game.gameId}`);
    return { gamesProcessed, playersCreated };
  }

  // Prefer team_abbrev_map, then fallback to teams table; upsert mapping if needed
  async function resolveViaMap(code: string, apiAbbrev: string): Promise<string | null> {
    const rows = (await db.execute(
      sql`SELECT team_id FROM team_abbrev_map WHERE league = ${code} AND api_abbrev = ${apiAbbrev} LIMIT 1`,
    )) as Array<{ team_id: string }>;
    return rows[0]?.team_id ?? null;
  }
  async function resolveTeamDirect(lid: string, abbr: string): Promise<string | null> {
    const rows = (await db.execute(
      sql`SELECT id FROM teams WHERE league_id = ${lid} AND abbreviation = ${abbr} LIMIT 1`,
    )) as Array<{ id: string }>;
    return rows[0]?.id ?? null;
  }
  async function upsertMap(code: string, abbr: string, tid: string) {
    await db.execute(
      sql`INSERT INTO team_abbrev_map (league, api_abbrev, team_id) VALUES (${code}, ${abbr}, ${tid}) ON CONFLICT (league, api_abbrev) DO NOTHING`,
    );
  }

  let homeTeamId = await resolveViaMap(league, homeAbbrev!);
  if (!homeTeamId) {
    const d = await resolveTeamDirect(leagueId, homeAbbrev!);
    if (d) {
      homeTeamId = d;
      await upsertMap(league, homeAbbrev!, d);
    }
  }
  let awayTeamId = await resolveViaMap(league, awayAbbrev!);
  if (!awayTeamId) {
    const d = await resolveTeamDirect(leagueId, awayAbbrev!);
    if (d) {
      awayTeamId = d;
      await upsertMap(league, awayAbbrev!, d);
    }
  }

  if (!homeTeamId || !awayTeamId) {
    console.log(`    ⚠️  Missing team mapping for ${league} ${awayAbbrev} @ ${homeAbbrev}`);
    return { gamesProcessed, playersCreated };
  }

  // Create game record
  const [newGame] = await db
    .insert(games)
    .values({
      id: randomUUID(),
      league_id: leagueId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
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
      const { ingestGameBoxscore } = await import("./nba-wnba-player-logs-ingestion.ts");
      await ingestGameBoxscore(db, game.gameId.toString(), league);
    } else if (league === "MLB" || league === "NHL") {
      const { ingestMLBGameBoxscore, ingestNHLGameBoxscore } = await import(
        "./mlb-nhl-player-logs-ingestion.ts"
      );
      if (league === "MLB") {
        await ingestMLBGameBoxscore(db, game.gameId.toString());
      } else {
        await ingestNHLGameBoxscore(db, game.gameId.toString());
      }
    }
    console.log(`    ✅ Processed game ${game.gameId} (${awayAbbrev} @ ${homeAbbrev})`);
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
