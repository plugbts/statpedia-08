import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { games, players, teams, player_game_logs, leagues } from "../src/db/schema/index";
import { sql } from "drizzle-orm";
import { config } from "dotenv";
import fetch, { type Response as FetchResponse } from "node-fetch";
import { randomUUID } from "crypto";

// Load environment variables
config({ path: ".env.local" });

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("No DB URL (NEON_DATABASE_URL or DATABASE_URL)");
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema: { games, players, teams, player_game_logs, leagues } });

type LeagueCode = "NBA" | "WNBA" | "MLB" | "NHL";

async function resolveLeagueId(code: LeagueCode): Promise<string> {
  const rows = await db.execute(sql`SELECT id FROM leagues WHERE code = ${code} LIMIT 1`);
  if (!rows || rows.length === 0) throw new Error(`League ${code} not found`);
  return rows[0].id as string;
}

async function resolveTeamIdViaMap(code: LeagueCode, apiAbbrev: string): Promise<string | null> {
  const rows = (await db.execute(
    sql`SELECT team_id FROM team_abbrev_map WHERE league = ${code} AND api_abbrev = ${apiAbbrev} LIMIT 1`,
  )) as Array<{ team_id: string }>;
  return rows[0]?.team_id ?? null;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

async function getActiveSeasonWindow(code: LeagueCode): Promise<{ start: Date; end: Date | null }> {
  // Prefer a league season that currently includes today; else most recent by start_date
  const rows = (await db.execute(sql`
    SELECT start_date, end_date
    FROM leagues
    WHERE code = ${code}
      AND start_date IS NOT NULL
    ORDER BY (CASE WHEN start_date <= NOW() AND (end_date IS NULL OR end_date >= NOW()) THEN 0 ELSE 1 END), start_date DESC
    LIMIT 1
  `)) as Array<{ start_date: string; end_date: string | null }>;
  if (!rows[0]) throw new Error(`No season window for league ${code}`);
  return {
    start: new Date(rows[0].start_date),
    end: rows[0].end_date ? new Date(rows[0].end_date) : null,
  };
}

async function fetchWithTimeout(
  url: string,
  init: any = {},
  timeoutMs = 10000,
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

async function fetchNBAGames(dateStr: string): Promise<any[]> {
  // Use data.nba.net public endpoint with triCode abbreviations to avoid heavy stats.nba.com protections
  const yyyymmdd = dateStr.replace(/-/g, "");
  const url = `https://data.nba.net/prod/v2/${yyyymmdd}/scoreboard.json`;
  const response = await fetchWithTimeout(url, { headers: { Accept: "application/json" } }, 10000);
  if (!response.ok) return [];
  const data: any = await response.json();
  const games = (data?.games as any[]) || [];
  return games.map((g: any) => ({
    gameId: g.gameId,
    homeTeam: g.hTeam?.triCode,
    awayTeam: g.vTeam?.triCode,
    gameDate: dateStr,
  }));
}

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
    10000,
  );
  if (!response.ok) return [];
  const data: any = await response.json();
  const rows = (data?.resultSets?.[0]?.rowSet as any[]) || [];
  // WNBA dataset layout resembles NBA; map to team abbreviations if present.
  return rows.map((r: any[]) => ({
    gameId: r[2],
    homeTeam: r[6],
    awayTeam: r[4],
    gameDate: dateStr,
  }));
}

async function fetchMLBGames(dateStr: string): Promise<any[]> {
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${dateStr}`;
  const response = await fetchWithTimeout(url, {}, 10000);
  if (!response.ok) return [];
  const data: any = await response.json();
  const games = (data?.dates?.[0]?.games as any[]) || [];
  return games.map((g: any) => ({
    gameId: g.gamePk,
    homeTeam: g.teams.home.team.abbreviation,
    awayTeam: g.teams.away.team.abbreviation,
    gameDate: dateStr,
  }));
}

async function fetchNHLGames(dateStr: string): Promise<any[]> {
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
    10000,
  );
  if (!response.ok) return [];
  const data: any = await response.json();
  const gameWeek = (data?.gameWeek as any[]) || [];
  const out: any[] = [];
  for (const day of gameWeek) {
    for (const g of day.games || []) {
      out.push({
        gameId: g.id,
        homeTeam: g.homeTeam.abbrev,
        awayTeam: g.awayTeam.abbrev,
        gameDate: dateStr,
      });
    }
  }
  return out;
}

function getSeasonFromDate(dateStr: string, league: LeagueCode): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  switch (league) {
    case "NBA":
    case "WNBA":
      return m >= 10 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
    case "NHL":
      return m >= 10 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
    case "MLB":
      return m >= 3 ? `${y}` : `${y - 1}`;
  }
}

async function processGame(
  league: LeagueCode,
  leagueId: string,
  dateStr: string,
  game: any,
): Promise<boolean> {
  // Skip if exists
  const existing = await db.execute(
    sql`SELECT id FROM games WHERE api_game_id = ${game.gameId.toString()} LIMIT 1`,
  );
  if (existing[0]) return false;

  // Resolve teams via mapping table
  const homeTeamId = await resolveTeamIdViaMap(league, game.homeTeam);
  const awayTeamId = await resolveTeamIdViaMap(league, game.awayTeam);
  if (!homeTeamId || !awayTeamId) {
    console.log(`    ⚠️  Missing team mapping for ${league} ${game.awayTeam} @ ${game.homeTeam}`);
    return false;
  }

  // Insert game
  const [g] = await db
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

  // Ingest player logs for this game
  try {
    if (league === "NBA" || league === "WNBA") {
      const { ingestGameBoxscore } = await import("./nba-wnba-player-logs-ingestion.js");
      await ingestGameBoxscore(db, game.gameId.toString(), league);
    } else if (league === "MLB") {
      const { ingestMLBGameBoxscore } = await import("./mlb-nhl-player-logs-ingestion.js");
      await ingestMLBGameBoxscore(db, game.gameId.toString());
    } else if (league === "NHL") {
      const { ingestNHLGameBoxscore } = await import("./mlb-nhl-player-logs-ingestion.js");
      await ingestNHLGameBoxscore(db, game.gameId.toString());
    }
    console.log(
      `    ✅ Ingested ${league} game ${game.gameId} (${game.awayTeam} @ ${game.homeTeam})`,
    );
  } catch (e: any) {
    console.error(`    ❌ Ingestion failed for game ${game.gameId}:`, e?.message || e);
  }

  return true;
}

async function backfillLastDays(opts: { leagues: LeagueCode[]; days: number; delayMs?: number }) {
  const { leagues: leagueList, days, delayMs = 500 } = opts;
  const today = new Date();

  let totalFound = 0;
  let totalProcessed = 0;

  for (const code of leagueList) {
    const leagueId = await resolveLeagueId(code);
    // Determine last active season window and bound the 60-day slice within it
    const window = await getActiveSeasonWindow(code);
    const seasonStart = window.start;
    const seasonEnd = window.end && window.end < today ? window.end : today;
    const rangeStart = addDays(today, -days) < seasonStart ? seasonStart : addDays(today, -days);
    console.log(
      `\n🏟️  ${code}: processing last ${days} days within season window ${seasonStart.toISOString().slice(0, 10)} to ${seasonEnd.toISOString().slice(0, 10)} (start=${rangeStart.toISOString().slice(0, 10)})`,
    );

    const iter = new Date(rangeStart);
    while (iter <= seasonEnd) {
      const dateStr = iter.toISOString().split("T")[0];
      let games: any[] = [];
      try {
        if (code === "NBA") games = await fetchNBAGames(dateStr);
        else if (code === "WNBA") games = await fetchWNBAGames(dateStr);
        else if (code === "MLB") games = await fetchMLBGames(dateStr);
        else if (code === "NHL") games = await fetchNHLGames(dateStr);
      } catch (e: any) {
        console.error(`  ❌ Fetch ${code} ${dateStr} failed:`, e?.message || e);
      }
      if (games.length) console.log(`  📅 ${dateStr}: ${games.length} ${code} games`);
      totalFound += games.length;
      for (const g of games) {
        const did = await processGame(code, leagueId, dateStr, g);
        if (did) totalProcessed += 1;
      }
      iter.setDate(iter.getDate() + 1);
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  console.log(`\n✅ Done. Games processed: ${totalProcessed}, games found: ${totalFound}`);
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  const leagueArg = (process.argv[2] || "ALL").toUpperCase();
  const daysArg = Number(process.argv[3] || 60);
  const map: Record<string, LeagueCode[]> = {
    ALL: ["NBA", "WNBA", "MLB", "NHL"],
    NBA: ["NBA"],
    WNBA: ["WNBA"],
    MLB: ["MLB"],
    NHL: ["NHL"],
  };
  const leaguesToRun = map[leagueArg] || map.ALL;
  backfillLastDays({ leagues: leaguesToRun, days: daysArg }).finally(() => client.end());
}

export { backfillLastDays };
