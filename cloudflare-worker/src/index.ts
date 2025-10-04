// src/worker.ts

/// <reference types="@cloudflare/workers-types" />

function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin") || "*";
  const reqHeaders = request.headers.get("Access-Control-Request-Headers") || "Content-Type, Authorization";

  return {
    "Access-Control-Allow-Origin": origin, // echo back the origin
    "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": reqHeaders,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

function handleOptions(request: Request) {
  return new Response(null, { headers: corsHeaders(request) });
}

function withCORS(resp: Response, request: Request) {
  const newHeaders = new Headers(resp.headers);
  for (const [k, v] of Object.entries(corsHeaders(request))) {
    newHeaders.set(k, v);
  }
  return new Response(resp.body, { status: resp.status, headers: newHeaders });
}

export interface Env {
  SPORTSODDS_API_KEY: string;
  CACHE_LOCKS?: KVNamespace; // create a KV namespace for lock keys in wrangler.toml
  PURGE_TOKEN?: string; // optional secret token for cache purge endpoint
  METRICS?: KVNamespace; // KV namespace for storing metrics counters
}

type Player = {
  playerID: string;
  teamID: string;
  firstName: string;
  lastName: string;
  name: string;
};

type BookData = {
  odds?: string;
  overUnder?: string;
  lastUpdatedAt?: string;
  available?: boolean;
  deeplink?: string;
};

type MarketSide = {
  oddID: string;
  opposingOddID?: string;
  marketName: string;
  statID: string;
  statEntityID: string;
  periodID: string;
  betTypeID: string;
  sideID: "over" | "under" | "yes" | "no";
  playerID?: string;
  started?: boolean;
  ended?: boolean;
  cancelled?: boolean;
  bookOddsAvailable?: boolean;
  fairOddsAvailable?: boolean;
  fairOdds?: string;
  bookOdds?: string;
  fairOverUnder?: string;
  bookOverUnder?: string;
  openFairOdds?: string;
  openBookOdds?: string;
  openFairOverUnder?: string;
  openBookOverUnder?: string;
  scoringSupported?: boolean;
  byBookmaker?: Record<string, BookData>;
};

// SportsGameOdds Event Schema
type SGEvent = {
  event_id: string;
  league_id: string;
  start_time: string;
  home_team: {
    id: string;
    name: string;
    abbreviation?: string;
  };
  away_team: {
    id: string;
    name: string;
    abbreviation?: string;
  };
  team_props?: any[];
  player_props?: any[];
  // Legacy fields for backward compatibility
  eventID?: string;
  leagueID?: string;
  scheduled?: string;
  teams?: {
    home: { 
      teamID?: string;
      id?: string;
      abbreviation?: string;
      names: { 
        long: string; 
        short: string;
        abbr?: string;
        full?: string;
      } 
    };
    away: { 
      teamID?: string;
      id?: string;
      abbreviation?: string;
      names: { 
        long: string; 
        short: string;
        abbr?: string;
        full?: string;
      } 
    };
  };
  status?: {
    startsAt: string;
  };
  odds?: Record<string, MarketSide>;
  players?: Record<string, Player>;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }

    const url = new URL(request.url);
    let resp: Response;

    // Debug endpoint: /debug/player-props?league=nfl&date=YYYY-MM-DD
    if (url.pathname === "/debug/player-props") {
      resp = await handleDebugPlayerProps(url, env);
    }
    // Raw debug endpoint: /api/debug-raw?league=nfl
    else if (url.pathname === "/api/debug-raw") {
      resp = await handlePropsDebug(request, env);
    }
    // Metrics endpoint: /metrics
    else if (url.pathname === "/metrics") {
      resp = await handleMetrics(url, request, env);
    }
    // Purge cache endpoint: /api/cache/purge?league=nfl&date=YYYY-MM-DD
    else if (url.pathname === "/api/cache/purge") {
      resp = await handleCachePurge(url, request, env);
    }
    // DEPRECATED: SportRadar proxy endpoint: /api/sportradar/*
    else if (url.pathname.startsWith("/api/sportradar/")) {
      resp = new Response(
        JSON.stringify({ 
          error: "SportRadar API has been deprecated. Please use SportsGameOdds API instead.",
          migration: "Use /api/{league}/player-props endpoint instead"
        }), 
        { 
          status: 410, // Gone
          headers: { "content-type": "application/json" } 
        }
      );
    }
    // Route: /api/{league}/player-props
    else {
    const match = url.pathname.match(/^\/api\/([a-z]+)\/player-props$/);
    if (match) {
      const league = match[1].toLowerCase(); // e.g. nfl, nba
        resp = await handlePlayerProps(request, env, ctx, league);
      } else {
        resp = new Response("Not found", { status: 404 });
      }
    }

    return withCORS(resp, request);
  },
};

async function handlePlayerProps(request: Request, env: Env, ctx: ExecutionContext, league: string): Promise<Response> {
  return handlePropsEndpoint(request, env);
}

export async function handlePropsDebug(request: Request, env: Env) {
  const url = new URL(request.url);
  const league = url.searchParams.get("league") || "nfl";

  try {
    // 1. Fetch just ONE day to avoid hanging
    const rawEvents = await fetchUpstreamProps(league.toUpperCase(), "2025-10-04", env);

    // 2. Just dump the first event
    const sample = rawEvents[0] || null;

    return new Response(
      JSON.stringify(
        {
          league,
          rawCount: rawEvents.length,
          sampleEvent: sample,
        },
        null,
        2
      ),
      { headers: { "content-type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify(
        {
          error: "Debug endpoint failed",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        null,
        2
      ),
      { headers: { "content-type": "application/json" } }
    );
  }
}

export async function handlePropsEndpoint(request: Request, env: Env) {
  try {
    const url = new URL(request.url);
    const leagues = (url.searchParams.get("league") || "nfl")
      .split(",")
      .map(l => l.trim().toLowerCase());
    const view = url.searchParams.get("view") || "full";
    const debug = url.searchParams.has("debug");

    const responseData: any = { events: [] };
    const debugInfo: any = {};

    for (const league of leagues) {
      // 1. Fetch raw events from SportsGameOdds (single day for debugging)
      const rawEvents = await fetchUpstreamProps(league.toUpperCase(), "2025-10-05", env);

      // 2. Normalize events (limit to first 10 for performance)
      let normalized = rawEvents
        .slice(0, 10)
        .map(ev => normalizeEventSGO(ev, request))
        .filter(Boolean);

      // 3. Group and normalize player props
      for (const event of normalized) {
        if (event.player_props?.length) {
          groupPlayerProps(event, league);

          if (debug) {
            console.log("DEBUG prop summary", {
              eventID: event.eventID,
              home: event.home_team,
              away: event.away_team,
              counts: summarizePropsByMarket(event, league)
            });
          }
        }
      }

      // 4. Prioritize + cap props per league
      normalized = capPropsPerLeague(normalized, league, 125);

      // 5. Shape response
      if (view === "compact") {
        responseData.events.push(
          ...normalized.filter((event): event is NonNullable<typeof event> => event !== null).map(event => ({
            eventID: event.eventID,
            leagueID: event.leagueID,
            start_time: event.start_time,
            home_team: event.home_team,
            away_team: event.away_team,
                    player_props: (event.player_props || []).map((prop: any) => {
                      const over = pickBest((prop.books || []).filter((b: any) => String(b.side).toLowerCase() === "over"));
                      const under = pickBest((prop.books || []).filter((b: any) => String(b.side).toLowerCase() === "under"));
                      return {
                        player_name: prop.player_name,
                        market_type: formatMarketType(prop.market_type, event.leagueID),
                        line: prop.line,
                        best_over: over?.price ?? null,
                        best_under: under?.price ?? null,
                        best_over_book: over?.bookmaker ?? null,
                        best_under_book: under?.bookmaker ?? null,
                      };
                    }),
                    team_props: [],
          }))
        );
      } else {
        responseData.events.push(...normalized.filter((event): event is NonNullable<typeof event> => event !== null));
      }

      if (debug) {
        debugInfo[league] = {
          upstreamEvents: rawEvents.length,
          normalizedEvents: normalized.length,
          totalProps: normalized.filter((e): e is NonNullable<typeof e> => e !== null).reduce((a, e) => a + (e.player_props?.length || 0), 0),
          sampleEvent: normalized[0] || null,
        };
      }
    }

    if (debug) responseData.debug = debugInfo;

    return new Response(JSON.stringify(responseData), {
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("Error in handlePropsEndpoint:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

async function handleDebugPlayerProps(url: URL, env: Env): Promise<Response> {
  const league = url.searchParams.get("league")?.toUpperCase();
  const date = url.searchParams.get("date");
  if (!league || !date) return json({ error: "Missing league or date" }, 400);

  // Upstream: real data only
  const upstream = new URL("https://api.sportsgameodds.com/v2/events");
  upstream.searchParams.set("leagueID", league);
  upstream.searchParams.set("date", date);
  upstream.searchParams.set("oddsAvailable", "true");

  const res = await fetch(upstream.toString(), {
    headers: { 'x-api-key': env.SPORTSODDS_API_KEY },
  });
  if (!res.ok) return json({ error: "Upstream error", status: res.status }, 502);

  const data = await res.json() as any;
  const rawEvents = data?.data || [];
  
  // Strict, case-insensitive league filter
  const events = rawEvents.filter((ev: any) => String(ev.leagueID).toUpperCase() === league);
  
  const normalized = events.map(debugNormalizeEvent);

  const totalKept = normalized.reduce((a, ev) => a + (ev.debug_counts?.keptPlayerProps || 0), 0);
  const totalDropped = normalized.reduce((a, ev) => a + (ev.debug_counts?.droppedPlayerProps || 0), 0);

  return json({
    events: normalized,
      debug: { 
        upstreamEvents: rawEvents.length, 
      normalizedEvents: normalized.length,
      totalKeptPlayerProps: totalKept,
      totalDroppedPlayerProps: totalDropped,
    },
  });
}

async function handleCachePurge(url: URL, request: Request, env: Env): Promise<Response> {
  // Optional authentication check - disabled for now
  // if (env.PURGE_TOKEN) {
  //   const authHeader = request.headers.get("authorization");
  //   if (!authHeader || authHeader !== `Bearer ${env.PURGE_TOKEN}`) {
  //     return new Response("Unauthorized", { status: 401 });
  //   }
  // }

  const league = url.searchParams.get("league")?.toUpperCase();
  const date = url.searchParams.get("date");
  if (!league || !date) {
    return new Response("Missing league or date", { status: 400 });
  }

  const cacheKey = buildCacheKey(url, league, date);
  const cache = await caches.open('default');
  const deleted = await cache.delete(cacheKey);

  return new Response(
    JSON.stringify({ message: "Cache purged", league, date, cacheKey, deleted }),
    { 
        headers: {
        "content-type": "application/json"
      } 
    }
  );
}

// DEPRECATED: SportRadar proxy function - removed
// All SportRadar functionality has been migrated to SportsGameOdds API

function buildUpstreamUrl(path: string, league: string, date: string, oddIDs?: string | null, bookmakerID?: string | null) {
  const BASE_URL = "https://api.sportsgameodds.com";
  const url = new URL(path, BASE_URL);
  url.searchParams.set("oddsAvailable", "true");
  url.searchParams.set("leagueID", league);
  url.searchParams.set("date", date);
  // Only add oddIDs if explicitly provided by client
  if (oddIDs) url.searchParams.set("oddIDs", oddIDs);
  if (bookmakerID) url.searchParams.set("bookmakerID", bookmakerID);
  return url.toString();
}

function buildCacheKey(url: URL, league: string, date: string, oddIDs?: string | null, bookmakerID?: string | null, view?: string | null, debug?: boolean) {
  const key = new URL("https://edge-cache");
  key.pathname = `/api/${league}/player-props`;
  key.searchParams.set("date", date);
  if (oddIDs) key.searchParams.set("oddIDs", oddIDs);
  if (bookmakerID) key.searchParams.set("bookmakerID", bookmakerID);
  if (view) key.searchParams.set("view", view);
  if (debug) key.searchParams.set("debug", "true");
  return key.toString();
}


// JSON helper
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 
      "content-type": "application/json"
    },
  });
}

// ===== Normalization =====

function safeNormalizeEvent(ev: SGEvent) {
  try {
    return normalizeEvent(ev);
  } catch (err) {
    return {
      eventID: ev?.eventID ?? null,
      leagueID: ev?.leagueID ?? null,
      start_time: ev?.scheduled ?? null,
      home_team: {
        id: ev?.teams?.home?.teamID ?? ev?.teams?.home?.id ?? null,
        abbr: ev?.teams?.home?.abbreviation ?? ev?.teams?.home?.names?.abbr ?? null,
        name: ev?.teams?.home?.names?.full ?? null,
      },
      away_team: {
        id: ev?.teams?.away?.teamID ?? ev?.teams?.away?.id ?? null,
        abbr: ev?.teams?.away?.abbreviation ?? ev?.teams?.away?.names?.abbr ?? null,
        name: ev?.teams?.away?.names?.full ?? null,
      },
      team_props: [],
      player_props: [],
      _error: String(err),
    };
  }
}

function normalizeEventSGO(ev: any, request: any) {
  // DEBUG: Log odds flattening
  console.log("DEBUG odds flatten", {
    totalOdds: Object.keys(ev.odds || {}).length,
    firstOdd: Object.values(ev.odds || {})[0]
  });

  return {
    eventID: ev.eventID,
    leagueID: ev.leagueID,
    start_time: toUserTimeSGO(ev.status?.startsAt, request.cf?.timezone || "America/New_York"),
    home_team: ev.teams?.home?.names?.long || "UNK",
    away_team: ev.teams?.away?.names?.long || "UNK",
    players: ev.players || {},
    player_props: Object.values(ev.odds || {}), // flatten odds object
  };
}

function normalizeEvent(ev: SGEvent) {
  // Use SportsGameOdds schema as primary, fallback to legacy
  const eventId = ev.event_id || ev.eventID;
  const leagueId = ev.league_id || ev.leagueID;
  const startTime = ev.start_time || ev.scheduled;
  
  console.log(`Normalizing event ${eventId} with SGO schema`);

  // Use SGO's pre-normalized props if available, otherwise fall back to legacy normalization
  let playerProps: any[] = [];
  let teamProps: any[] = [];

  if (ev.player_props && Array.isArray(ev.player_props)) {
    // SGO already provides normalized player props
    playerProps = ev.player_props;
    console.log(`Using SGO player_props: ${playerProps.length} props`);
  } else if (ev.odds && ev.players) {
    // Fallback to legacy normalization for backward compatibility
    console.log(`Falling back to legacy normalization`);
  const players = ev.players || {};
  const oddsDict = ev.odds || {};
  
    // Group by SGO identifiers to preserve all distinct prop types
    const groups: Record<string, any[]> = {};
  for (const oddID in oddsDict) {
    const m = oddsDict[oddID];

      // Build a composite key from SGO fields
      const key = [
        (m as any).player_id || "",     // which player/team this prop belongs to
        (m as any).market_id || "",     // unique market identifier
        (m as any).market_type || "",   // e.g. passing_yards, rushing_yards, points
        (m as any).period || "",        // full_game, 1H, 1Q, etc.
        (m as any).bet_type || "",      // over/under, yes/no
      ].join("|");

    (groups[key] ||= []).push(m);
  }
  
  console.log(`Created ${Object.keys(groups).length} groups`);

  for (const key in groups) {
    const markets = groups[key];
    const hasPlayer = markets.some(mm => !!mm.playerID);
    
    console.log(`Group ${key}: hasPlayer=${hasPlayer}, markets=${markets.length}`);

    if (hasPlayer) {
        const norm = normalizePlayerGroup(markets, players, leagueId || "NFL");
      if (norm) {
        playerProps.push(norm);
        console.log(`Added player prop: ${norm.player_name} ${norm.market_type}`);
      } else {
        console.log(`Failed to normalize player group: ${key}`);
      }
    } else {
      const norm = normalizeTeamGroup(markets);
      if (norm) teamProps.push(norm);
      }
    }
  }

  if (ev.team_props && Array.isArray(ev.team_props)) {
    teamProps = ev.team_props;
  }
  
  console.log(`Final counts: playerProps=${playerProps.length}, teamProps=${teamProps.length}`);

  console.log(`Returning event ${eventId} with ${playerProps.length} player props and ${teamProps.length} team props`);
  
  return {
    eventID: eventId,
    leagueID: leagueId,
    start_time: toUserTime(startTime || "", "America/New_York"),
    home_team: normalizeTeamSGO(ev.home_team) || normalizeTeam(ev.teams?.home),
    away_team: normalizeTeamSGO(ev.away_team) || normalizeTeam(ev.teams?.away),
    team_props: teamProps,
    player_props: playerProps,
  };
}

function groupPlayerProps(event: any, league: string) {
  const grouped: Record<string, any[]> = {};

  for (const m of event.player_props) {
    const key = [
      m.playerID || "",
      m.statID || "",
      m.periodID || "",
      m.betTypeID || ""
    ].join("|");
    (grouped[key] ||= []).push(m);
  }

  // DEBUG: Log grouped props
  console.log("DEBUG grouped props", {
    groups: Object.keys(grouped).length,
    sample: Object.values(grouped)[0]
  });

  event.player_props = Object.values(grouped)
    .map(group => normalizePlayerGroup(group, event.players, league))
    .filter(Boolean);
}

function normalizePlayerGroup(markets: any[], players: Record<string, any>, league: string) {
  const over = markets.find(m => m.sideID?.toLowerCase() === "over" || m.sideID?.toLowerCase() === "yes");
  const under = markets.find(m => m.sideID?.toLowerCase() === "under" || m.sideID?.toLowerCase() === "no");
  const base = over || under;
  if (!base) return null;

  const player = base.playerID ? players[base.playerID] : undefined;
  const playerName = player?.name ?? null;

  const allBooks = [...collectBooks(over), ...collectBooks(under)];
  
  return {
    player_name: playerName,
    teamID: player?.teamID ?? null,
    market_type: formatMarketType(base.statID, league),
    line: Number(base.bookOverUnder ?? null),
    best_over: pickBest(allBooks.filter(b => b.side === "over")),
    best_under: pickBest(allBooks.filter(b => b.side === "under")),
    books: allBooks,
  };
}

function normalizeSide(side: string | undefined): "over" | "under" | null {
  if (!side) return null;
  const s = side.toLowerCase();
  if (s === "over" || s === "yes") return "over";
  if (s === "under" || s === "no") return "under";
  return null;
}

function collectBooks(side: any) {
  if (!side) return [];
  const books: any[] = [];
  if (side.bookOdds || side.bookOverUnder) {
    books.push({
      bookmaker: "consensus",
      side: normalizeSide(side.sideID),
      price: side.bookOdds ?? null,
      line: Number(side.bookOverUnder ?? null),
    });
  }
  for (const [book, data] of Object.entries(side.byBookmaker || {})) {
    const bookData = data as any;
    if (!bookData.odds && !bookData.overUnder) continue;
    books.push({
      bookmaker: book,
      side: normalizeSide(side.sideID),
      price: bookData.odds ?? side.bookOdds ?? null,
      line: Number(bookData.overUnder ?? side.bookOverUnder ?? null),
      deeplink: bookData.deeplink,
    });
  }
  return books;
}

function summarizePropsByMarket(event: any, league: string) {
  const counts: Record<string, number> = {};

  for (const prop of event.player_props || []) {
    const label = formatMarketType(prop.market_type || prop.statID, league);
    counts[label] = (counts[label] || 0) + 1;
  }

  return counts;
}

function normalizeTeamGroup(markets: MarketSide[]) {
  const over = markets.find(m => isOverSide(m.sideID));
  const under = markets.find(m => isUnderSide(m.sideID));
  
  // Never return null unless both sides are truly missing
  if (!over && !under) return null;
  
  // Use whichever side exists as base
  const base = over || under;
  if (!base) return null;

  const marketType = formatStatID(base.statID);
  
  // Resolve line: prefer bookOverUnder, fallback to fairOverUnder
  const lineStr = firstDefined(over?.bookOverUnder, under?.bookOverUnder, over?.fairOverUnder, under?.fairOverUnder);
  const line = toNumberOrNull(lineStr);

  // Always collect books with consensus fallback
  const books = [...collectBooks(over), ...collectBooks(under)];

  // Pick best odds per side (handle single-sided markets)
  const best_over = pickBest(books.filter(b => b.side === "over" || b.side === "yes"));
  const best_under = pickBest(books.filter(b => b.side === "under" || b.side === "no"));

  return {
    market_type: marketType,
    line,
    best_over,
    best_under,
    books,
    oddIDs: {
      over: over?.oddID ?? null,
      under: under?.oddID ?? null,
      opposingOver: over?.opposingOddID ?? null,
      opposingUnder: under?.opposingOddID ?? null,
    },
    status: {
      started: !!(over?.started || under?.started),
      ended: !!(over?.ended || under?.ended),
      cancelled: !!(over?.cancelled || under?.cancelled),
    },
  };
}


// Helpers

function isOverSide(side: any) {
  const s = String(side || "").toLowerCase();
  return s === "over" || s === "yes";
}
function isUnderSide(side: any) {
  const s = String(side || "").toLowerCase();
  return s === "under" || s === "no";
}

function formatStatID(statID: string) {
  return (statID || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function extractNameFromMarket(marketName: string) {
  return (marketName || "").replace(/\s+(Passing|Rushing|Receiving|Attempts|Completions|Yards|Touchdowns|Interceptions|Receptions).*$/i, "");
}

function firstDefined<T>(...vals: (T | undefined | null)[]) {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return undefined;
}
function toNumberOrNull(s?: string | null) {
  if (s === undefined || s === null) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function parseAmerican(odds: string | number | null | undefined): number | null {
  if (odds === null || odds === undefined) return null;
  const s = String(odds).trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function toUserTime(utcDate: string | Date, tz: string = "America/New_York") {
  try {
    const d = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
    if (isNaN(d.getTime())) return null; // invalid date guard

    return d.toLocaleString("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function toUserTimeSGO(utcDate: string | Date, tz: string = "America/New_York") {
  try {
    const d = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function normalizeTeam(team: any) {
  if (!team) return { id: null, abbr: "UNK", name: "Unknown" };

  return {
    id: team.teamID ?? team.id ?? null,
    abbr:
      team.names?.short ??
      team.abbreviation ??
      team.names?.abbr ??
      team.alias ??
      team.displayName ??
      "UNK",
    name:
      team.names?.long ??
      team.names?.full ??
      team.displayName ??
      (team.market && team.name ? `${team.market} ${team.name}` : null) ??
      team.alias ??
      "Unknown",
  };
}

function normalizeTeamSGO(team: any) {
  if (!team) return { id: null, abbr: "UNK", name: "TBD" };

  return {
    id: team.id ?? null,
    abbr: team.abbreviation ?? team.alias ?? team.short_name ?? "UNK",
    name: team.name ?? team.full_name ?? team.display_name ?? "TBD",
    logo: team.logo ?? null,
  };
}

// Priority order: lower index = higher priority
const PROP_PRIORITY: Record<string, string[]> = {
  nfl: [
    "passing_yards",
    "rushing_yards",
    "receiving_yards",
    "receptions",
    "touchdowns",
    "first_touchdown",
    "last_touchdown",
  ],
  nba: [
    "points",
    "rebounds",
    "assists",
    "threes_made",
    "steals",
    "blocks",
  ],
  mlb: [
    "hits",
    "home_runs",
    "rbis",
    "strikeouts",
    "total_bases",
  ],
  nhl: [
    "goals",
    "assists",
    "points",
    "shots_on_goal",
    "saves",
  ],
  ncaaf: [
    "passing_yards",
    "rushing_yards",
    "receiving_yards",
    "receptions",
    "touchdowns",
  ],
};

// Global config for label formatting
const VIEW_MODE: "compact" | "verbose" = "compact"; 
// Change to "verbose" for full labels like "1st Quarter"

// Period labels for different leagues
const PERIOD_LABELS: Record<string, Record<string, string>> = {
  nfl: {
    "1q": "1st Quarter",
    "2q": "2nd Quarter",
    "3q": "3rd Quarter",
    "4q": "4th Quarter",
    "1h": "1st Half",
    "2h": "2nd Half",
    ot: "Overtime",
  },
  nba: {
    "1q": "1st Quarter",
    "2q": "2nd Quarter",
    "3q": "3rd Quarter",
    "4q": "4th Quarter",
    "1h": "1st Half",
    "2h": "2nd Half",
    ot: "Overtime",
  },
  ncaaf: {
    "1q": "1st Quarter",
    "2q": "2nd Quarter",
    "3q": "3rd Quarter",
    "4q": "4th Quarter",
    "1h": "1st Half",
    "2h": "2nd Half",
    ot: "Overtime",
  },
  nhl: {
    "1p": "1st Period",
    "2p": "2nd Period",
    "3p": "3rd Period",
    ot: "Overtime",
  },
  mlb: {
    "1i": "1st Inning",
    "2i": "2nd Inning",
    "3i": "3rd Inning",
    "4i": "4th Inning",
    "5i": "5th Inning",
    "6i": "6th Inning",
    "7i": "7th Inning",
    "8i": "8th Inning",
    "9i": "9th Inning",
    ei: "Extra Innings",
  },
};

// League-aware market type labels
const MARKET_LABELS: Record<string, Record<string, string>> = {
  nfl: {
    // Offensive player props
    passing_yards: "Passing Yards",
    rushing_yards: "Rushing Yards",
    receiving_yards: "Receiving Yards",
    receptions: "Receptions",
    touchdowns: "Touchdowns",
    first_touchdown: "First Touchdown",
    last_touchdown: "Last Touchdown",
    firstTouchdown: "First Touchdown",
    lastTouchdown: "Last Touchdown",
    anytime_touchdown: "Anytime Touchdown",
    passing_touchdowns: "Passing Touchdowns",

    // Defensive player props
    defense_sacks: "Sacks",
    defense_interceptions: "Interceptions",
    defense_tackles: "Tackles",
    defense_tackles_assists: "Tackles + Assists",
    defense_passes_defended: "Passes Defended",
    defense_forced_fumbles: "Forced Fumbles",
    defense_fumble_recoveries: "Fumble Recoveries",

    // Team props
    team_total_points: "Team Total Points",
    team_total_touchdowns: "Team Total Touchdowns",
    team_total_field_goals: "Team Total Field Goals",
    team_total_sacks: "Team Total Sacks",
    team_total_interceptions: "Team Total Interceptions",
  },
  nba: {
    points: "Points",
    rebounds: "Rebounds",
    assists: "Assists",
    threes_made: "3-Pointers Made",
    steals: "Steals",
    blocks: "Blocks",

    // Team props
    team_total_points: "Team Total Points",
    team_total_rebounds: "Team Total Rebounds",
    team_total_assists: "Team Total Assists",
    team_total_threes: "Team Total 3-Pointers",
  },
  mlb: {
    hits: "Hits",
    home_runs: "Home Runs",
    rbis: "RBIs",
    strikeouts: "Strikeouts",
    total_bases: "Total Bases",

    // Team props
    team_total_runs: "Team Total Runs",
    team_total_hits: "Team Total Hits",
    team_total_home_runs: "Team Total Home Runs",
  },
  nhl: {
    goals: "Goals",
    assists: "Assists",
    points: "Points",
    shots_on_goal: "Shots on Goal",
    saves: "Saves",

    // Team props
    team_total_goals: "Team Total Goals",
    team_total_shots: "Team Total Shots",
    team_total_saves: "Team Total Saves",
  },
  ncaaf: {
    passing_yards: "Passing Yards",
    rushing_yards: "Rushing Yards",
    receiving_yards: "Receiving Yards",
    receptions: "Receptions",
    touchdowns: "Touchdowns",
    defense_sacks: "Sacks",
    defense_interceptions: "Interceptions",
    defense_tackles: "Tackles",

    // Team props
    team_total_points: "Team Total Points",
    team_total_touchdowns: "Team Total Touchdowns",
  },
};

function formatMarketType(raw: string, league: string): string {
  if (!raw) return "Unknown";

  const leagueMap = MARKET_LABELS[league.toLowerCase()] || {};
  if (leagueMap[raw]) return leagueMap[raw];

  // Team total fallback
  if (raw.startsWith("team_total_")) {
    const suffix = raw.replace("team_total_", "");
    return "Team Total " + suffix.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  // Touchdown/score fallback
  if (raw.includes("touchdown") || raw.includes("score")) {
    return raw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  // Period-based fallback
  const periodMatch = raw.match(/(.+)_([0-9]+[hqip]|[0-9]+h|ot|ei)$/i);
  if (periodMatch) {
    const base = periodMatch[1].replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const periodCode = periodMatch[2].toLowerCase();

    if (VIEW_MODE === "verbose") {
      const leaguePeriods = PERIOD_LABELS[league.toLowerCase()] || {};
      const label = leaguePeriods[periodCode];
      if (label) return `${base} ${label}`;
    }

    return `${base} ${periodCode.toUpperCase()}`;
  }

  // Default fallback
  return raw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function sortPropsByLeague(props: any[], league: string) {
  const priorities = PROP_PRIORITY[league.toLowerCase()] || [];
  return props.sort((a, b) => {
    const ai = priorities.indexOf(a.market_type);
    const bi = priorities.indexOf(b.market_type);

    // If both are in the priority list, sort by index
    if (ai !== -1 && bi !== -1) return ai - bi;
    // If only one is in the list, that one comes first
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    // Otherwise, leave them as-is
    return 0;
  });
}

function capPropsPerLeague(normalizedEvents: any[], league: string, maxProps: number = 125) {
  let total = 0;

  for (const event of normalizedEvents) {
    const remaining = maxProps - total;
    if (remaining <= 0) {
      event.player_props = [];
      continue;
    }

    // Sort props by league priority before slicing
    const sorted = sortPropsByLeague(event.player_props || [], league);
    event.player_props = sorted.slice(0, remaining);

    total += event.player_props.length;
  }

  return normalizedEvents;
}

function getWeekRange(baseDate: Date = new Date(), days: number = 7) {
  const start = new Date(baseDate);
  const end = new Date(baseDate);
  end.setDate(start.getDate() + (days - 1));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

async function fetchUpstreamProps(league: string, date: string, env: Env) {
  const upstreamUrl = buildUpstreamUrl("/v2/events", league, date);
  const res = await fetch(upstreamUrl, { headers: { 'x-api-key': env.SPORTSODDS_API_KEY } });
  
  if (!res.ok) {
    console.log(`Failed to fetch ${league} props for ${date}: ${res.status}`);
    return [];
  }
  
  const data = await res.json() as any;
  return data?.data || [];
}

async function fetchLeagueWeek(league: string, baseDate: Date, env: Env) {
  const { start, end } = getWeekRange(baseDate, 7);
  const dates: string[] = [];
  let d = new Date(start);
  while (d <= new Date(end)) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }

  console.log(`Fetching ${league} props for dates: ${dates.join(', ')}`);

  const results = await Promise.all(
    dates.map(date => fetchUpstreamProps(league, date, env))
  );

  const flatResults = results.flat();
  console.log(`Fetched ${flatResults.length} total events across ${dates.length} days`);
  
  return flatResults;
}

async function fetchSportsGameOddsWeek(league: string, env: Env) {
  const baseDate = new Date();
  const { start, end } = getWeekRange(baseDate, 7);
  const dates: string[] = [];
  let d = new Date(start);
  while (d <= new Date(end)) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }

  console.log(`Fetching ${league} props for dates: ${dates.join(', ')}`);

  const results = await Promise.all(
    dates.map(date => fetchUpstreamProps(league.toUpperCase(), date, env))
  );

  const flatResults = results.flat();
  console.log(`Fetched ${flatResults.length} total events across ${dates.length} days`);
  
  return flatResults;
}

/**
 * Pick the best American odds from a list of book offers.
 * - For positive odds: higher is better (+250 is better than +200).
 * - For negative odds: closer to zero is better (-110 is better than -150).
 */
function pickBest(books: { price: string | number | null; bookmaker?: string }[]): { price: string; bookmaker?: string } | null {
  const candidates = books.filter(b => parseAmerican(b.price) !== null);
  if (candidates.length === 0) return null;

  const best = candidates.sort((a, b) => {
    const A = parseAmerican(a.price)!;
    const B = parseAmerican(b.price)!;

    // Positive odds: maximize
    if (A >= 0 && B >= 0) return B - A;
    // Negative odds: closer to zero is better
    if (A < 0 && B < 0) return A - B;
    // Mixed: prefer the positive odds
    return A >= 0 ? -1 : 1;
  })[0];

  return {
    price: String(best.price),
    bookmaker: best.bookmaker
  };
}

// === Debug Normalization Functions ===

function debugNormalizeEvent(ev: any) {
  try {
    return debugNormalizeEventInternal(ev);
  } catch (err) {
    return {
      eventID: ev?.eventID,
      leagueID: ev?.leagueID,
      start_time: ev?.scheduled,
      home_team: {
        id: ev?.teams?.home?.teamID ?? ev?.teams?.home?.id ?? null,
        abbr: ev?.teams?.home?.abbreviation ?? ev?.teams?.home?.names?.short ?? ev?.teams?.home?.names?.abbr ?? null,
        name: ev?.teams?.home?.names?.long ?? ev?.teams?.home?.names?.full ?? null,
      },
      away_team: {
        id: ev?.teams?.away?.teamID ?? ev?.teams?.away?.id ?? null,
        abbr: ev?.teams?.away?.abbreviation ?? ev?.teams?.away?.names?.short ?? ev?.teams?.away?.names?.abbr ?? null,
        name: ev?.teams?.away?.names?.long ?? ev?.teams?.away?.names?.full ?? null,
      },
      team_props: [],
      player_props: [],
      debug_counts: { keptPlayerProps: 0, droppedPlayerProps: 0 },
      _error: String(err),
    };
  }
}

function debugNormalizeEventInternal(ev: any) {
  const players = ev.players || {};
  const oddsDict = ev.odds || {};

  const groups: Record<string, any[]> = {};
  for (const oddID in oddsDict) {
    const m = oddsDict[oddID];
    const key = [m.statEntityID || "", m.statID || "", m.periodID || "", m.betTypeID || ""].join("|");
    (groups[key] ||= []).push(m);
  }

  let keptPlayerProps = 0;
  let droppedPlayerProps = 0;

  const playerProps: any[] = [];
  const teamProps: any[] = [];

  for (const key in groups) {
    const markets = groups[key];
    const hasPlayer = markets.some(mm => !!mm.playerID);

    if (hasPlayer) {
      const norm = debugNormalizePlayerGroup(markets, players);
      if (norm) {
        playerProps.push(norm);
        keptPlayerProps++;
      } else {
        droppedPlayerProps++;
      }
    } else {
      const norm = debugNormalizeTeamGroup(markets);
      if (norm) teamProps.push(norm);
    }
  }

  return {
    eventID: ev.eventID,
    leagueID: ev.leagueID,
    start_time: ev.scheduled,
    home_team: {
      id: ev.teams?.home?.teamID ?? ev.teams?.home?.id ?? null,
      abbr: ev.teams?.home?.abbreviation ?? ev.teams?.home?.names?.short ?? ev.teams?.home?.names?.abbr ?? null,
      name: ev.teams?.home?.names?.long ?? ev.teams?.home?.names?.full ?? null,
    },
    away_team: {
      id: ev.teams?.away?.teamID ?? ev.teams?.away?.id ?? null,
      abbr: ev.teams?.away?.abbreviation ?? ev.teams?.away?.names?.short ?? ev.teams?.away?.names?.abbr ?? null,
      name: ev.teams?.away?.names?.long ?? ev.teams?.away?.names?.full ?? null,
    },
    team_props: teamProps,
    player_props: playerProps,
    debug_counts: { keptPlayerProps, droppedPlayerProps },
  };
}

function debugNormalizePlayerGroup(markets: any[], players: Record<string, any>) {
  const over = markets.find(m => isOverSide(m.sideID));
  const under = markets.find(m => isUnderSide(m.sideID));
  const base = over || under;
  if (!base) return null;

  const player = base.playerID ? players[base.playerID] : undefined;
  const playerName = player?.name || base.marketName;
  const marketType = formatMarketType(base.statID, "NFL");

  const lineStr =
    over?.bookOverUnder ?? under?.bookOverUnder ?? over?.fairOverUnder ?? under?.fairOverUnder ?? null;
  const line = lineStr && isFinite(parseFloat(lineStr)) ? parseFloat(lineStr) : null;

  const books: any[] = [];

  for (const side of [over, under]) {
    if (!side) continue;

    // Consensus fallback from market-level fields (real data only)
    if (side.bookOdds || side.bookOverUnder || side.fairOdds || side.fairOverUnder) {
      books.push({
        bookmaker: "consensus",
        side: String(side.sideID).toLowerCase(),
        price: side.bookOdds ?? side.fairOdds ?? "",
        line: toNumberOrNull(side.bookOverUnder ?? side.fairOverUnder),
      });
    }

    // Per-book odds if present
    for (const [book, data] of Object.entries(side.byBookmaker || {})) {
      const bookData = data as any;
      if (!bookData || (!bookData.odds && !bookData.overUnder)) continue;
      books.push({
        bookmaker: book,
        side: String(side.sideID).toLowerCase(),
        price: bookData.odds ?? side.bookOdds ?? "",
        line: toNumberOrNull(bookData.overUnder ?? side.bookOverUnder),
        deeplink: bookData.deeplink,
      });
    }
  }

  // If absolutely no odds entries, still return the prop with minimal info (real player + market + line)
  return {
    player_name: playerName,
    teamID: player?.teamID ?? null,
    market_type: marketType,
    line,
    books,
  };
}

function debugNormalizeTeamGroup(markets: any[]) {
  // Optional: include team props for completeness
  const over = markets.find(m => isOverSide(m.sideID));
  const under = markets.find(m => isUnderSide(m.sideID));
  const base = over || under;
  if (!base) return null;

  const marketType = base.statID;
  const lineStr =
    over?.bookOverUnder ?? under?.bookOverUnder ?? over?.fairOverUnder ?? under?.fairOverUnder ?? null;
  const line = lineStr && isFinite(parseFloat(lineStr)) ? parseFloat(lineStr) : null;

  const books: any[] = [];

  for (const side of [over, under]) {
    if (!side) continue;

    if (side.bookOdds || side.bookOverUnder || side.fairOdds || side.fairOverUnder) {
      books.push({
        bookmaker: "consensus",
        side: String(side.sideID).toLowerCase(),
        price: side.bookOdds ?? side.fairOdds ?? "",
        line: toNumberOrNull(side.bookOverUnder ?? side.fairOverUnder),
      });
    }
    for (const [book, data] of Object.entries(side.byBookmaker || {})) {
      const bookData = data as any;
      if (!bookData || (!bookData.odds && !bookData.overUnder)) continue;
      books.push({
        bookmaker: book,
        side: String(side.sideID).toLowerCase(),
        price: bookData.odds ?? side.bookOdds ?? "",
        line: toNumberOrNull(bookData.overUnder ?? side.bookOverUnder),
        deeplink: bookData.deeplink,
      });
    }
  }

  return {
    market_type: marketType,
    line,
    books,
  };
}

// === Metrics Functions ===

async function handleMetrics(url: URL, request: Request, env: Env): Promise<Response> {
  // Optional authentication check
  if (env.PURGE_TOKEN) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${env.PURGE_TOKEN}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const reset = url.searchParams.get("reset") === "true";
  
  try {
    const metrics = await getMetrics(env, reset);
    return new Response(JSON.stringify(metrics), {
      headers: { 
        "content-type": "application/json"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to get metrics" }), {
      status: 500,
      headers: { 
        "content-type": "application/json"
      }
    });
  }
}

async function getMetrics(env: Env, reset: boolean = false): Promise<any> {
  if (!env.METRICS) {
    // Fallback to in-memory metrics if KV not available
    return {
      totalKeptPlayerProps: 0,
      totalDroppedPlayerProps: 0,
      cacheHits: 0,
      cacheMisses: 0,
      upstreamStatusCounts: { "200": 0, "4xx": 0, "5xx": 0 },
      avgResponseTimeMs: 0,
      totalRequests: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  const keys = [
    'totalKeptPlayerProps',
    'totalDroppedPlayerProps', 
    'cacheHits',
    'cacheMisses',
    'upstreamStatus200',
    'upstreamStatus4xx',
    'upstreamStatus5xx',
    'totalResponseTime',
    'totalRequests'
  ];

  const values = await Promise.all(
    keys.map(key => env.METRICS!.get(key).then(v => parseInt(v || '0', 10)))
  );

  const [
    totalKeptPlayerProps,
    totalDroppedPlayerProps,
    cacheHits,
    cacheMisses,
    upstreamStatus200,
    upstreamStatus4xx,
    upstreamStatus5xx,
    totalResponseTime,
    totalRequests
  ] = values;

  const metrics = {
    totalKeptPlayerProps,
    totalDroppedPlayerProps,
    cacheHits,
    cacheMisses,
    upstreamStatusCounts: {
      "200": upstreamStatus200,
      "4xx": upstreamStatus4xx,
      "5xx": upstreamStatus5xx
    },
    avgResponseTimeMs: totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0,
    totalRequests,
    lastUpdated: new Date().toISOString()
  };

  if (reset) {
    // Reset all counters
    await Promise.all(keys.map(key => env.METRICS!.put(key, '0')));
  }

  return metrics;
}

async function updateMetrics(env: Env, data: {
  cacheHit: boolean;
  keptProps?: number;
  droppedProps?: number;
  upstreamStatus?: number;
  durationMs: number;
}): Promise<void> {
  if (!env.METRICS) return;

  const updates: Promise<void>[] = [];

  // Update cache counters
  if (data.cacheHit) {
    updates.push(env.METRICS.put('cacheHits', (await env.METRICS.get('cacheHits').then(v => parseInt(v || '0', 10)) + 1).toString()));
  } else {
    updates.push(env.METRICS.put('cacheMisses', (await env.METRICS.get('cacheMisses').then(v => parseInt(v || '0', 10)) + 1).toString()));
  }

  // Update prop counters
  if (data.keptProps !== undefined) {
    updates.push(env.METRICS.put('totalKeptPlayerProps', (await env.METRICS.get('totalKeptPlayerProps').then(v => parseInt(v || '0', 10)) + data.keptProps).toString()));
  }
  
  if (data.droppedProps !== undefined) {
    updates.push(env.METRICS.put('totalDroppedPlayerProps', (await env.METRICS.get('totalDroppedPlayerProps').then(v => parseInt(v || '0', 10)) + data.droppedProps).toString()));
  }

  // Update upstream status counters
  if (data.upstreamStatus !== undefined) {
    let statusKey = 'upstreamStatus5xx';
    if (data.upstreamStatus === 200) {
      statusKey = 'upstreamStatus200';
    } else if (data.upstreamStatus >= 400 && data.upstreamStatus < 500) {
      statusKey = 'upstreamStatus4xx';
    }
    
    updates.push(env.METRICS.put(statusKey, (await env.METRICS.get(statusKey).then(v => parseInt(v || '0', 10)) + 1).toString()));
  }

  // Update response time and request count
  updates.push(env.METRICS.put('totalResponseTime', (await env.METRICS.get('totalResponseTime').then(v => parseInt(v || '0', 10)) + data.durationMs).toString()));
  updates.push(env.METRICS.put('totalRequests', (await env.METRICS.get('totalRequests').then(v => parseInt(v || '0', 10)) + 1).toString()));

  await Promise.all(updates);
}