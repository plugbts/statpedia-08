import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import fetch from "node-fetch";
import { games, players, teams, player_game_logs } from "../src/db/schema/index";
import { randomUUID } from "crypto";
// R2 support removed for now; storing raw JSON in DB

config({ path: ".env.local" });

// Diagnostics controls
const DRY_RUN = process.env.DRY_RUN === "1";
const VERBOSE = process.env.VERBOSE === "1";

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL/NEON_DATABASE_URL missing");
const sqlc = postgres(conn, { prepare: false });
const db = drizzle(sqlc, { schema: { games, players, teams, player_game_logs } });

type League = "NBA" | "NFL" | "MLB" | "WNBA" | "NHL";

async function fetchWithTimeout(url: string, init: any = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// Helpers: resolve league id, ensure team exists for given abbreviation
async function getLeagueId(code: League): Promise<string | undefined> {
  const lrows = (await db.execute(
    sql`SELECT id FROM leagues WHERE code=${code} LIMIT 1`,
  )) as Array<{ id: string }>;
  return lrows[0]?.id as string | undefined;
}

async function getOrCreateTeam(league: League, abbrev: string): Promise<string | undefined> {
  if (!abbrev) return undefined;
  const rows = (await db.execute(sql`
    SELECT t.id FROM teams t
    JOIN leagues l ON l.id = t.league_id
    WHERE l.code=${league} AND t.abbreviation=${abbrev} LIMIT 1`)) as Array<{ id: string }>;
  if (rows[0]?.id) return rows[0].id as string;
  const leagueId = await getLeagueId(league);
  if (!leagueId) return undefined;
  // Create a minimal team record with abbreviation as name placeholder
  const created = await db
    .insert(teams)
    .values({ league_id: leagueId, name: abbrev, abbreviation: abbrev })
    .returning({ id: teams.id as any });
  return created[0]?.id as unknown as string | undefined;
}

// 1) Official schedule endpoints per league for a date
async function fetchSchedule(
  league: League,
  dateStr: string,
): Promise<Array<{ gameId: string; home: string; away: string }>> {
  if (league === "NBA") {
    try {
      const yyyymmdd = dateStr.replace(/-/g, "");
      const url = `https://cdn.nba.com/static/json/liveData/scoreboard/v2/scoreboard_${yyyymmdd}.json`;
      const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return [];
      const data: any = await res.json();
      const games = (data?.scoreboard?.games as any[]) || [];
      return games.map((g: any) => ({
        gameId: g.gameId,
        home: g.homeTeam?.teamTricode,
        away: g.awayTeam?.teamTricode,
      }));
    } catch {
      return [];
    }
  }
  if (league === "WNBA") {
    try {
      // WNBA endpoint requires full browser-like headers and date in MM/DD/YYYY
      const [y, m, d] = dateStr.split("-");
      const gameDate = `${m}/${d}/${y}`;
      const res = await fetchWithTimeout(
        `https://stats.wnba.com/stats/scoreboardv2?DayOffset=0&GameDate=${encodeURIComponent(gameDate)}&LeagueID=10`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            Referer: "https://www.wnba.com/",
            Origin: "https://www.wnba.com",
            "Accept-Language": "en-US,en;q=0.9",
          },
        },
      );
      if (!res.ok) return [];
      const data: any = await res.json();
      const rows = (data?.resultSets?.[0]?.rowSet as any[]) || [];
      return rows.map((r: any[]) => ({ gameId: String(r[2]), home: r[6], away: r[4] }));
    } catch {
      return [];
    }
  }
  if (league === "MLB") {
    try {
      const res = await fetchWithTimeout(
        `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${dateStr}`,
      );
      if (!res.ok) return [];
      const data: any = await res.json();
      const games = (data?.dates?.[0]?.games as any[]) || [];
      return games.map((g: any) => ({
        gameId: String(g.gamePk),
        home: g.teams.home.team.abbreviation,
        away: g.teams.away.team.abbreviation,
      }));
    } catch {
      return [];
    }
  }
  if (league === "NFL") {
    try {
      // ESPN expects dates in YYYYMMDD format, not YYYY-MM-DD
      const yyyymmdd = dateStr.replace(/-/g, "");
      const res = await fetchWithTimeout(
        `https://site.api.espn.com/apis/v2/sports/football/nfl/scoreboard?dates=${yyyymmdd}`,
      );
      if (res.ok) {
        const data: any = await res.json();
        const events = (data?.events as any[]) || [];
        const out: Array<{ gameId: string; home: string; away: string }> = [];
        for (const ev of events) {
          const comp = ev?.competitions?.[0];
          if (!comp) continue;
          const home = comp?.competitors?.find((c: any) => c.homeAway === "home");
          const away = comp?.competitors?.find((c: any) => c.homeAway === "away");
          if (home?.team?.abbreviation && away?.team?.abbreviation) {
            out.push({
              gameId: String(comp.id),
              home: home.team.abbreviation,
              away: away.team.abbreviation,
            });
          }
        }
        if (out.length) return out;
      }
      // Fallback: ESPN core v2 events (IDs only)
      const alt = await fetchWithTimeout(
        `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events?dates=${yyyymmdd}&limit=300`,
      );
      if (!alt.ok) return [];
      const j: any = await alt.json();
      const items: any[] = j?.items || [];
      return items
        .map((it: any) => String(it?.$ref || it?.href || ""))
        .filter((href) => href)
        .map((href) => ({
          gameId: href.split("/").filter(Boolean).pop() as string,
          home: "",
          away: "",
        }));
    } catch {
      return [];
    }
  }
  if (league === "NHL") {
    try {
      // NHL schedule: get gamePk; abbreviations may be missing, derive from boxscore later
      const res = await fetchWithTimeout(
        `https://statsapi.web.nhl.com/api/v1/schedule?date=${dateStr}`,
      );
      if (!res.ok) return [];
      const data: any = await res.json();
      const games = (data?.dates?.[0]?.games as any[]) || [];
      return games.map((g: any) => ({
        gameId: String(g.gamePk),
        home: g?.teams?.home?.team?.abbreviation,
        away: g?.teams?.away?.team?.abbreviation,
      }));
    } catch {
      return [];
    }
  }
  return [];
}

// 2) Raw player stats per game (league-specific minimal examples)
async function fetchGameBoxscoreRaw(league: League, gameId: string): Promise<any> {
  if (league === "NBA") {
    const url = `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`;
    const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Boxscore fetch failed NBA:${gameId}`);
    return await res.json();
  }
  if (league === "WNBA") {
    const base = "https://stats.wnba.com/stats";
    const url = `${base}/boxscoretraditionalv2?GameID=${gameId}&StartPeriod=0&EndPeriod=0&StartRange=0&EndRange=0&RangeType=0`;
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/json",
        Referer: "https://www.wnba.com/",
        Origin: "https://www.wnba.com",
      },
    });
    if (!res.ok) throw new Error(`Boxscore fetch failed WNBA:${gameId}`);
    return await res.json();
  }
  if (league === "MLB") {
    const url = `https://statsapi.mlb.com/api/v1.1/game/${gameId}/feed/live`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Boxscore fetch failed MLB:${gameId}`);
    return await res.json();
  }
  if (league === "NFL") {
    // ESPN gamecast boxscore (limited stats); production would use official feeds with auth
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Boxscore fetch failed NFL:${gameId}`);
    return await res.json();
  }
  if (league === "NHL") {
    const url = `https://statsapi.web.nhl.com/api/v1/game/${gameId}/feed/live`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Boxscore fetch failed NHL:${gameId}`);
    return await res.json();
  }
  return null;
}

// 3) Save raw and normalize records
async function saveRaw(league: League, gameId: string, payload: any, season?: string) {
  if (DRY_RUN) {
    if (VERBOSE) console.log(`[DRY_RUN] skip saving raw ${league} ${gameId}`);
    return;
  }
  await sqlc.unsafe(
    `INSERT INTO public.player_game_logs_raw (league, season, game_external_id, payload)
     VALUES ($1,$2,$3,$4::jsonb)
     ON CONFLICT (league, game_external_id, source) DO NOTHING`,
    [league, season || null, gameId, JSON.stringify(payload)],
  );
}

function seasonFromDate(dateStr: string, league: League) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  if (league === "MLB") return m >= 3 ? String(y) : String(y - 1);
  if (league === "NBA" || league === "WNBA") return m >= 10 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  if (league === "NFL") return String(y);
  return String(y);
}

async function normalizeAndInsert(
  league: League,
  gameId: string,
  dateStr: string,
  payloadFromCaller?: any,
) {
  // Very lightweight extractors; production logic would handle full mapping per league
  let payload: any | undefined = payloadFromCaller;
  if (!payload) {
    const rows = (await db.execute(
      sql`SELECT payload FROM public.player_game_logs_raw WHERE league=${league} AND game_external_id=${gameId} AND normalized=false LIMIT 1`,
    )) as Array<{ payload: any }>;
    if (!rows[0]) return 0;
    payload = rows[0].payload;
  }
  const norm: Array<{
    player_ext: string;
    team_abbrev: string;
    opponent_abbrev: string;
    prop_type: string;
    value: number;
    player_name?: string;
  }> = [];

  if (league === "NBA") {
    const playersHome = payload?.game?.homeTeam?.players || [];
    const playersAway = payload?.game?.awayTeam?.players || [];
    for (const p of [...playersHome, ...playersAway]) {
      const personId = p?.personId ?? p?.person?.id;
      const teamAbbr =
        p?.teamTricode ||
        payload?.game?.homeTeam?.teamTricode ||
        payload?.game?.awayTeam?.teamTricode;
      const name =
        p?.name ||
        [p?.firstName, p?.familyName].filter(Boolean).join(" ") ||
        p?.person?.displayName ||
        p?.person?.fullName ||
        undefined;
      const pts = Number(p?.statistics?.points ?? 0);
      if (personId && teamAbbr) {
        norm.push({
          player_ext: String(personId),
          team_abbrev: String(teamAbbr),
          opponent_abbrev: "",
          prop_type: "Points",
          value: pts,
          player_name: name,
        });
      }
    }
  } else if (league === "WNBA") {
    const rs = payload?.resultSets || [];
    const playersSet = rs.find((r: any) => (r.name || "").toLowerCase().includes("player"));
    const headers: string[] = playersSet?.headers || [];
    for (const row of playersSet?.rowSet || []) {
      const idx = (k: string) => headers.indexOf(k);
      norm.push({
        player_ext: String(row[idx("PLAYER_ID")]),
        team_abbrev: String(row[idx("TEAM_ABBREVIATION")]),
        opponent_abbrev: "",
        prop_type: "Points",
        value: Number(row[idx("PTS")] || 0),
        player_name: String(row[idx("PLAYER_NAME")] || ""),
      });
    }
  } else if (league === "MLB") {
    const homePlayers = Object.values(payload?.liveData?.boxscore?.teams?.home?.players || {});
    const awayPlayers = Object.values(payload?.liveData?.boxscore?.teams?.away?.players || {});
    const homeAbbr = payload?.gameData?.teams?.home?.abbreviation;
    const awayAbbr = payload?.gameData?.teams?.away?.abbreviation;
    for (const p of homePlayers as any[]) {
      const id = p?.person?.id;
      const name =
        p?.person?.fullName || p?.person?.boxscoreName || p?.person?.lastFirstName || undefined;
      const val = Number(p?.stats?.batting?.hits || 0);
      if (id && homeAbbr) {
        norm.push({
          player_ext: String(id),
          team_abbrev: String(homeAbbr),
          opponent_abbrev: String(awayAbbr || ""),
          prop_type: "Hits",
          value: val,
          player_name: name,
        });
      }
    }
    for (const p of awayPlayers as any[]) {
      const id = p?.person?.id;
      const name =
        p?.person?.fullName || p?.person?.boxscoreName || p?.person?.lastFirstName || undefined;
      const val = Number(p?.stats?.batting?.hits || 0);
      if (id && awayAbbr) {
        norm.push({
          player_ext: String(id),
          team_abbrev: String(awayAbbr),
          opponent_abbrev: String(homeAbbr || ""),
          prop_type: "Hits",
          value: val,
          player_name: name,
        });
      }
    }
  } else if (league === "NFL") {
    const teamsData = payload?.boxscore?.players || [];
    for (const team of teamsData) {
      const teamAbbr = team?.team?.abbrev;
      for (const g of team?.groups || []) {
        for (const a of g?.athletes || []) {
          norm.push({
            player_ext: String(a?.athlete?.id),
            team_abbrev: String(teamAbbr || ""),
            opponent_abbrev: "",
            prop_type: "Yards",
            value: Number(a?.stats?.[0]?.value || 0),
            player_name: a?.athlete?.displayName || a?.athlete?.shortName || undefined,
          });
        }
      }
    }
  } else if (league === "NHL") {
    const homePlayers = Object.values(payload?.liveData?.boxscore?.teams?.home?.players || {});
    const awayPlayers = Object.values(payload?.liveData?.boxscore?.teams?.away?.players || {});
    const homeAbbr =
      payload?.gameData?.teams?.home?.abbreviation || payload?.gameData?.teams?.home?.triCode;
    const awayAbbr =
      payload?.gameData?.teams?.away?.abbreviation || payload?.gameData?.teams?.away?.triCode;
    for (const p of homePlayers as any[]) {
      const id = p?.person?.id;
      const name = p?.person?.fullName || undefined;
      const val = Number(p?.stats?.skaterStats?.shots ?? 0);
      if (id && homeAbbr) {
        norm.push({
          player_ext: String(id),
          team_abbrev: String(homeAbbr),
          opponent_abbrev: String(awayAbbr || ""),
          prop_type: "Shots",
          value: val,
          player_name: name,
        });
      }
    }
    for (const p of awayPlayers as any[]) {
      const id = p?.person?.id;
      const name = p?.person?.fullName || undefined;
      const val = Number(p?.stats?.skaterStats?.shots ?? 0);
      if (id && awayAbbr) {
        norm.push({
          player_ext: String(id),
          team_abbrev: String(awayAbbr),
          opponent_abbrev: String(homeAbbr || ""),
          prop_type: "Shots",
          value: val,
          player_name: name,
        });
      }
    }
  }

  if (!norm.length) return 0;

  // Resolve game and teams along with team abbreviations
  const gRows = await db.execute(sql`
    SELECT g.id, g.home_team_id, g.away_team_id,
      (SELECT abbreviation FROM teams WHERE id=g.home_team_id) AS home_abbrev,
      (SELECT abbreviation FROM teams WHERE id=g.away_team_id) AS away_abbrev
    FROM games g WHERE g.api_game_id=${gameId} LIMIT 1`);
  if (!gRows[0]) return 0;
  const gameUuid = gRows[0].id as string;
  const homeTeamId = gRows[0].home_team_id as string;
  const awayTeamId = gRows[0].away_team_id as string;
  const homeAbbrev = (gRows[0] as any).home_abbrev as string | undefined;
  const awayAbbrev = (gRows[0] as any).away_abbrev as string | undefined;

  let inserted = 0;
  const logsToInsert: Array<{
    player_id: string;
    team_id: string;
    game_id: string;
    opponent_id: string;
    prop_type: string;
    line: string;
    actual_value: string;
    hit: boolean;
    game_date: string;
    season: string;
    home_away: "home" | "away";
  }> = [];
  for (const r of norm) {
    // map player external id -> players.id if exists; otherwise upsert
    const pRows = (await db.execute(
      sql`SELECT id FROM players WHERE external_id=${r.player_ext} LIMIT 1`,
    )) as Array<{ id: string }>;
    let playerId: string | undefined = pRows[0]?.id;

    // Map team via game's abbreviations first; fallback to mapping table if needed
    let teamId: string | undefined;
    if (homeAbbrev && r.team_abbrev === homeAbbrev) teamId = homeTeamId;
    else if (awayAbbrev && r.team_abbrev === awayAbbrev) teamId = awayTeamId;
    if (!teamId) {
      const tRows = (await db.execute(
        sql`SELECT team_id FROM team_abbrev_map WHERE league=${league} AND api_abbrev=${r.team_abbrev} LIMIT 1`,
      )) as Array<{ team_id: string }>;
      teamId = tRows[0]?.team_id;
    }
    if (!teamId) continue;

    // If player missing, upsert using payload-provided name and resolved team
    if (!playerId) {
      const name =
        r.player_name && String(r.player_name).trim().length > 0
          ? r.player_name!.trim()
          : `Player ${r.player_ext}`;
      try {
        const created = await db
          .insert(players)
          .values({ team_id: teamId, name, external_id: r.player_ext })
          .onConflictDoUpdate({
            target: players.external_id,
            set: { team_id: teamId, updated_at: sql`now()` },
          })
          .returning({ id: players.id as any });
        playerId = created[0]?.id as unknown as string | undefined;
      } catch (_) {
        // Retry select in case of concurrent insert
        const again = (await db.execute(
          sql`SELECT id FROM players WHERE external_id=${r.player_ext} LIMIT 1`,
        )) as Array<{ id: string }>;
        playerId = again[0]?.id;
      }
    }
    if (!playerId) continue;

    // Opponent from game teams
    const opponentId = teamId === homeTeamId ? awayTeamId : homeTeamId;
    const homeAway = teamId === homeTeamId ? "home" : "away";

    logsToInsert.push({
      player_id: playerId,
      team_id: teamId,
      game_id: gameUuid,
      opponent_id: opponentId,
      prop_type: r.prop_type,
      line: "0",
      actual_value: String(r.value ?? 0),
      hit: false,
      game_date: dateStr,
      season: seasonFromDate(dateStr, league),
      home_away: homeAway as "home" | "away",
    });
    inserted++;
  }
  if (logsToInsert.length) {
    if (DRY_RUN) {
      if (VERBOSE)
        console.log(
          `[DRY_RUN] would insert ${logsToInsert.length} player_game_logs for ${league}:${gameId}`,
        );
    } else {
      await db.insert(player_game_logs).values(logsToInsert as any);
    }
  }

  // mark raw as normalized
  if (!DRY_RUN) {
    await db.execute(
      sql`UPDATE public.player_game_logs_raw SET normalized=true WHERE league=${league} AND game_external_id=${gameId}`,
    );
  } else if (VERBOSE) {
    console.log(`[DRY_RUN] would mark raw normalized for ${league}:${gameId}`);
  }
  return inserted;
}

async function ingestRange(league: League, start: Date, end: Date) {
  let totalGames = 0,
    totalPlayers = 0;
  const iter = new Date(start);
  while (iter <= end) {
    const dateStr = iter.toISOString().slice(0, 10);
    const schedule = await fetchSchedule(league, dateStr);
    if (schedule.length) console.log(`[${league}] ${dateStr}: ${schedule.length} games`);
    for (const g of schedule) {
      // For MLB/NHL, schedule may not include team abbreviations; derive from boxscore payload after fetch.
      let homeCode = g?.home;
      let awayCode = g?.away;

      // fetch raw first so we can derive team codes if needed
      let raw: any | undefined;
      try {
        raw = await fetchGameBoxscoreRaw(league, g.gameId);
      } catch (e: any) {
        console.error(`[${league}] failed to fetch raw ${g.gameId}:`, e?.message || e);
        continue;
      }

      if ((!homeCode || !awayCode) && (league === "MLB" || league === "NHL")) {
        homeCode =
          raw?.gameData?.teams?.home?.abbreviation ||
          raw?.gameData?.teams?.home?.triCode ||
          homeCode;
        awayCode =
          raw?.gameData?.teams?.away?.abbreviation ||
          raw?.gameData?.teams?.away?.triCode ||
          awayCode;
        if (!homeCode || !awayCode) {
          console.warn(`[${league}] still missing team codes after raw fetch:`, {
            gameId: g.gameId,
            home: homeCode,
            away: awayCode,
          });
          continue;
        }
      }

      // For NFL as well, attempt to derive codes from raw summary if schedule didn't provide
      if ((!homeCode || !awayCode) && league === "NFL") {
        try {
          const comp =
            (raw as any)?.header?.competitions?.[0] || (raw as any)?.gameInfo?.competitions?.[0];
          if (comp) {
            const homeC = comp?.competitors?.find((c: any) => c.homeAway === "home");
            const awayC = comp?.competitors?.find((c: any) => c.homeAway === "away");
            homeCode = homeCode || homeC?.team?.abbreviation;
            awayCode = awayCode || awayC?.team?.abbreviation;
          }
        } catch (e) {
          // ignore parse errors; will skip if still missing codes
        }
      }

      // If still missing, require codes for non-MLB/NHL leagues
      if (!homeCode || !awayCode) {
        console.warn(`[${league}] skip game with missing team codes:`, {
          gameId: g.gameId,
          home: homeCode,
          away: awayCode,
        });
        continue;
      }

      // Ensure game exists
      const exists = (await db.execute(
        sql`SELECT id FROM games WHERE api_game_id=${g.gameId} LIMIT 1`,
      )) as Array<{ id: string }>;
      if (!exists[0]) {
        if (DRY_RUN) {
          if (VERBOSE)
            console.log(
              `[DRY_RUN] would create game ${g.gameId} ${awayCode} @ ${homeCode} on ${dateStr}`,
            );
          // In dry-run, skip actual creation and continue to next game
          continue;
        } else {
          // get or create teams directly by abbreviation, avoiding hard dependency on team_abbrev_map
          const leagueId = await getLeagueId(league);
          const homeTeamId = await getOrCreateTeam(league, String(homeCode));
          const awayTeamId = await getOrCreateTeam(league, String(awayCode));
          if (leagueId && homeTeamId && awayTeamId) {
            await db
              .insert(games)
              .values({
                league_id: leagueId,
                home_team_id: homeTeamId,
                away_team_id: awayTeamId,
                game_date: dateStr,
                season: seasonFromDate(dateStr, league),
                season_type: "regular",
                status: "completed",
                api_game_id: g.gameId,
              })
              .onConflictDoNothing();
          } else {
            console.warn(`[${league}] missing mapping for ${awayCode} @ ${homeCode} ${dateStr}`);
            continue;
          }
        }
      }

      // save raw, normalize
      try {
        await saveRaw(league, g.gameId, raw, seasonFromDate(dateStr, league));
        const inserted = await normalizeAndInsert(league, g.gameId, dateStr, raw);
        totalPlayers += inserted;
        totalGames++;
      } catch (e: any) {
        console.error(`[${league}] failed ${g.gameId}:`, e?.message || e);
      }
    }
    iter.setDate(iter.getDate() + 1);
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`[${league}] done. games: ${totalGames}, player logs: ${totalPlayers}`);
}

async function main() {
  const league = (process.argv[2] || "NBA").toUpperCase() as League;
  const days = Number(process.argv[3] || 60);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  await ingestRange(league, start, end);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().finally(() => sqlc.end());
}

export { ingestRange };
