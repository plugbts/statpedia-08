import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import fetch from "node-fetch";
import { randomUUID } from "crypto";
import { games, players, teams, player_game_logs, leagues } from "../src/db/schema/index";

config({ path: ".env.local" });

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("No DB URL (NEON_DATABASE_URL or DATABASE_URL)");
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema: { games, players, teams, player_game_logs, leagues } });

async function fetchWithTimeout(url: string, init: any = {}, timeoutMs = 10000): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function resolveLeagueId(code: string): Promise<string> {
  const rows = await db.execute(sql`SELECT id FROM leagues WHERE code = ${code} LIMIT 1`);
  if (!rows || rows.length === 0) throw new Error(`League ${code} not found`);
  return rows[0].id as string;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

async function fetchMLBGames(dateStr: string): Promise<any[]> {
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${dateStr}`;
  const response = await fetchWithTimeout(url, {}, 12000);
  if (!response.ok) return [];
  const data: any = await response.json();
  const g = (data?.dates?.[0]?.games as any[]) || [];
  return g.map((it: any) => ({
    gameId: it.gamePk,
    homeTeam: it.teams.home.team.abbreviation,
    awayTeam: it.teams.away.team.abbreviation,
    gameDate: dateStr,
  }));
}

async function deriveMLBTeamsFromLive(
  gameId: string,
): Promise<{ home: string | null; away: string | null }> {
  const url = `https://statsapi.mlb.com/api/v1.1/game/${gameId}/feed/live`;
  const res = await fetchWithTimeout(url, {}, 15000);
  if (!res.ok) return { home: null, away: null };
  const data: any = await res.json();
  const home = data?.gameData?.teams?.home?.abbreviation || null;
  const away = data?.gameData?.teams?.away?.abbreviation || null;
  return { home, away };
}

function getSeasonFromDate(dateStr: string, league: "MLB"): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return m >= 3 ? `${y}` : `${y - 1}`;
}

async function resolveTeamIdViaMap(code: "MLB", apiAbbrev: string): Promise<string | null> {
  if (!apiAbbrev || apiAbbrev.trim() === "") return null;
  const rows = (await db.execute(
    sql`SELECT team_id FROM team_abbrev_map WHERE league = ${code} AND api_abbrev = ${apiAbbrev} LIMIT 1`,
  )) as Array<{ team_id: string }>;
  return rows[0]?.team_id ?? null;
}
async function resolveTeamIdDirect(leagueId: string, abbrev: string): Promise<string | null> {
  if (!abbrev || abbrev.trim() === "") return null;
  const rows = (await db.execute(
    sql`SELECT id FROM teams WHERE league_id = ${leagueId} AND abbreviation = ${abbrev} LIMIT 1`,
  )) as Array<{ id: string }>;
  return rows[0]?.id ?? null;
}
async function upsertTeamAbbrevMap(
  league: "MLB",
  apiAbbrev: string,
  teamId: string,
): Promise<void> {
  await db.execute(
    sql`INSERT INTO team_abbrev_map (league, api_abbrev, team_id) VALUES (${league}, ${apiAbbrev}, ${teamId}) ON CONFLICT (league, api_abbrev) DO NOTHING`,
  );
}

async function processMLBGame(leagueId: string, dateStr: string, game: any): Promise<boolean> {
  const existing = await db.execute(
    sql`SELECT id FROM games WHERE api_game_id = ${game.gameId.toString()} LIMIT 1`,
  );
  if (existing[0]) return false;

  const invalid = (v?: string) => !v || v.trim() === "";
  let homeAbbrev = (game.homeTeam ?? "").toString().trim();
  let awayAbbrev = (game.awayTeam ?? "").toString().trim();
  try {
    if (invalid(homeAbbrev) || invalid(awayAbbrev)) {
      const d = await deriveMLBTeamsFromLive(game.gameId.toString());
      if (invalid(homeAbbrev)) homeAbbrev = d.home ?? homeAbbrev;
      if (invalid(awayAbbrev)) awayAbbrev = d.away ?? awayAbbrev;
    }
  } catch {
    // ...empty block removed
  }
  if (invalid(homeAbbrev) || invalid(awayAbbrev)) {
    console.log(`    ⚠️ Missing abbreviations for MLB ${game.gameId}`);
    return false;
  }

  let homeTeamId = await resolveTeamIdViaMap("MLB", homeAbbrev);
  if (!homeTeamId) {
    const d = await resolveTeamIdDirect(leagueId, homeAbbrev);
    if (d) {
      homeTeamId = d;
      await upsertTeamAbbrevMap("MLB", homeAbbrev, d);
    }
  }
  let awayTeamId = await resolveTeamIdViaMap("MLB", awayAbbrev);
  if (!awayTeamId) {
    const d = await resolveTeamIdDirect(leagueId, awayAbbrev);
    if (d) {
      awayTeamId = d;
      await upsertTeamAbbrevMap("MLB", awayAbbrev, d);
    }
  }
  if (!homeTeamId || !awayTeamId) {
    console.log(`    ⚠️ Missing team mapping for MLB ${awayAbbrev} @ ${homeAbbrev}`);
    return false;
  }

  await db
    .insert(games)
    .values({
      id: randomUUID(),
      league_id: leagueId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      season: getSeasonFromDate(dateStr, "MLB"),
      season_type: "regular",
      game_date: dateStr,
      status: "completed",
      api_game_id: game.gameId.toString(),
    })
    .returning({ id: games.id });

  try {
    const { ingestMLBGameBoxscore } = await import("./mlb-nhl-player-logs-ingestion.js");
    await ingestMLBGameBoxscore(db, game.gameId.toString());
    console.log(`    ✅ Ingested MLB game ${game.gameId} (${awayAbbrev} @ ${homeAbbrev})`);
  } catch (e: any) {
    console.error(`    ❌ Ingestion failed for MLB game ${game.gameId}:`, e?.message || e);
  }
  return true;
}

async function main() {
  const days = Number(process.argv[2] || 365);
  const targetAbbrev = (process.argv[3] || "SEA").toUpperCase();
  const today = new Date();
  const start = addDays(today, -days);
  const leagueId = await resolveLeagueId("MLB");

  let found = 0,
    processed = 0;
  const iter = new Date(start);
  while (iter <= today) {
    const dateStr = iter.toISOString().slice(0, 10);
    let g: any[] = [];
    try {
      g = await fetchMLBGames(dateStr);
    } catch (e: any) {
      console.error(`Fetch MLB ${dateStr} failed:`, e?.message || e);
    }
    const seaGames = g.filter((x) => x.homeTeam === targetAbbrev || x.awayTeam === targetAbbrev);
    if (seaGames.length) console.log(`📅 ${dateStr}: ${seaGames.length} ${targetAbbrev} games`);
    found += seaGames.length;
    for (const game of seaGames) {
      const did = await processMLBGame(leagueId, dateStr, game);
      if (did) processed += 1;
    }
    iter.setDate(iter.getDate() + 1);
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log(`\n✅ Mariners backfill done. Processed: ${processed}, found: ${found}`);
  await client.end();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
