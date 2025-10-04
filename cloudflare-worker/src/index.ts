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
    // Metrics endpoint: /metrics
    else if (url.pathname === "/metrics") {
      resp = await handleMetrics(url, request, env);
    }
    // Purge cache endpoint: /api/cache/purge?league=nfl&date=YYYY-MM-DD
    else if (url.pathname === "/api/cache/purge") {
      resp = await handleCachePurge(url, request, env);
    }
    // SportRadar proxy endpoint: /api/sportradar/*
    else if (url.pathname.startsWith("/api/sportradar/")) {
      resp = await handleSportRadarProxy(url, request, env);
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
      const url = new URL(request.url);
  const leagues = (url.searchParams.get("league") || "nfl")
    .split(",")
    .map(l => l.trim().toLowerCase());
  const date = url.searchParams.get("date") || new Date().toISOString().split('T')[0];
  const view = url.searchParams.get("view") || "full";
  const debug = url.searchParams.has("debug");

  const responseData: any = { events: [] };
  const debugInfo: any = {};

  for (const league of leagues) {
    // 1. Fetch raw events for the week from SportsGameOdds
    console.log(`Fetching events for league: ${league}, date: ${date}`);
    const rawEvents = await fetchLeagueWeek(league.toUpperCase(), new Date(date), env);
    console.log(`Fetched ${rawEvents.length} raw events for ${league}`);

    // 2. Normalize events (normalizeEventSGO already handles player props)
    let normalized = rawEvents
      .map(ev => normalizeEventSGO(ev, request))
      .filter(Boolean);

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
          player_props: (event.player_props || []).map(prop => {
            const over = pickBest((prop.books || []).filter(b => String(b.side).toLowerCase() === "over"));
            const under = pickBest((prop.books || []).filter(b => String(b.side).toLowerCase() === "under"));
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
          team_props: (event.team_props || []).map(prop => ({
            market_type: formatMarketType(prop.market_type, event.leagueID),
            line: prop.line,
            best_over: prop.best_over,
            best_under: prop.best_under,
          })),
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

async function handleSportRadarProxy(url: URL, request: Request, env: Env) {
  try {
    // Extract the SportRadar endpoint from the URL
    const sportradarPath = url.pathname.replace("/api/sportradar", "");
    const sportradarUrl = `https://api.sportradar.com${sportradarPath}${url.search}`;
    
    console.log(`Proxying SportRadar request to: ${sportradarUrl}`);
    
    // Forward the request to SportRadar
    const response = await fetch(sportradarUrl, {
      method: request.method,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Statpedia/1.0',
        'X-API-Key': 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D' // SportRadar API key
      }
    });

    if (!response.ok) {
      console.log(`SportRadar API error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: "SportRadar API error", status: response.status }),
        { status: response.status, headers: { "content-type": "application/json" } }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "content-type": "application/json" }
    });
  } catch (error) {
    console.log(`SportRadar proxy error:`, error);
    return new Response(
      JSON.stringify({ error: "Proxy error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

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
  // SGO uses legacy schema, so we need to normalize it
  const players = ev.players || {};
  const oddsDict = ev.odds || {};
  
  console.log(`Normalizing SGO event ${ev.eventID} with ${Object.keys(oddsDict).length} odds`);

  // Handle empty days gracefully
  if (!ev.teams?.home || !ev.teams?.away) {
    console.log("Skipping invalid event", ev.eventID, "missing teams");
    return null;
  }

  // Group by SGO identifiers to preserve all distinct prop types
  const groups: Record<string, any[]> = {};
  for (const oddID in oddsDict) {
    const m = oddsDict[oddID];

    // Build a composite key from SGO legacy fields (same as debug endpoint)
    const key = [
      m.statEntityID || "",     // which player/team this prop belongs to
      m.statID || "",           // unique market identifier
      m.periodID || "",         // full_game, 1H, 1Q, etc.
      m.betTypeID || "",        // over/under, yes/no
    ].join("|");

    (groups[key] ||= []).push(m);
  }
  
  console.log(`Created ${Object.keys(groups).length} groups`);

  const playerProps: any[] = [];
  const teamProps: any[] = [];

  for (const key in groups) {
    const markets = groups[key];
    // Use same logic as debug endpoint: check for playerID
    const hasPlayer = markets.some(mm => !!mm.playerID);
    
    console.log(`Group ${key}: hasPlayer=${hasPlayer}, markets=${markets.length}`);

    if (hasPlayer) {
      const norm = normalizePlayerGroup(markets, players, ev.leagueID || "NFL");
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
  
  console.log(`Final counts: playerProps=${playerProps.length}, teamProps=${teamProps.length}`);

  const homeTeam = normalizeTeam(ev.teams?.home);
  const awayTeam = normalizeTeam(ev.teams?.away);
  
  return {
    eventID: ev.eventID,
    leagueID: ev.leagueID,
    start_time: toUserTimeSGO(ev.info?.scheduled || ev.status?.startsAt, request.cf?.timezone || "America/New_York"),
    home_team: homeTeam,
    away_team: awayTeam,
    team_props: teamProps,
    player_props: playerProps,
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

function normalizePlayerGroup(markets: any[], players: Record<string, any>, league: string) {
  // Pick base market (over or under) to anchor the group
  const over = markets.find(m => isOverSide(m.sideID));
  const under = markets.find(m => isUnderSide(m.sideID));
  const base = over || under;
  if (!base) return null;

  // Player info
  const player = base.playerID ? players[base.playerID] : undefined;
  const playerName = player?.name || base.marketName;
  const marketType = formatMarketType(base.statID, league);

  // Line
  const lineStr = firstDefined(
    over?.bookOverUnder,
    under?.bookOverUnder,
    over?.fairOverUnder,
    under?.fairOverUnder
  );
  const line = toNumberOrNull(lineStr);

  // Collect books
  const books: any[] = [];
  for (const side of [over, under]) {
    if (!side) continue;

    // Consensus fallback
    if (side.bookOdds || side.bookOverUnder || side.fairOdds || side.fairOverUnder) {
      books.push({
        bookmaker: "consensus",
        side: side.sideID,
        price: side.bookOdds ?? side.fairOdds ?? null,
        line: toNumberOrNull(side.bookOverUnder ?? side.fairOverUnder),
      });
    }

    // Per-book odds
    for (const [book, data] of Object.entries(side.byBookmaker || {})) {
      const bookData = data as any;
      if (!bookData.odds && !bookData.overUnder) continue;
      books.push({
        bookmaker: book,
        side: side.sideID,
        price: bookData.odds ?? side.bookOdds ?? null,
        line: toNumberOrNull(bookData.overUnder ?? side.bookOverUnder),
        deeplink: bookData.deeplink,
      });
    }
  }

  // Best odds
  const best_over = pickBest(books.filter(b => isOverSide(b.side)));
  const best_under = pickBest(books.filter(b => isUnderSide(b.side)));

  return {
    player_name: playerName,
    teamID: player?.teamID ?? null,
    market_type: marketType,
    line,
    best_over,
    best_under,
    books,
  };
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
  const books = collectBooks(over, under);

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

function collectBooks(over?: MarketSide, under?: MarketSide) {
  const books: { bookmaker: string; side: string; price: string; line: number | null; deeplink?: string }[] = [];

  for (const side of [over, under]) {
    if (!side) continue;

    // Always push a "consensus" book using bookOdds/bookOverUnder as fallback
    // This ensures we always have at least one book entry, even if byBookmaker is empty
    books.push({
      bookmaker: "consensus",
      side: String(side.sideID).toLowerCase(),
      price: side.bookOdds ?? side.fairOdds ?? "",
      line: toNumberOrNull(side.bookOverUnder ?? side.fairOverUnder),
      deeplink: undefined,
    });

    // Then add per-book odds if available
    const byBook = side.byBookmaker || {};
    for (const [book, data] of Object.entries(byBook)) {
      books.push({
        bookmaker: book,
        side: String(side.sideID).toLowerCase(),
        price: data.odds ?? side.bookOdds ?? side.fairOdds ?? "",
        line: toNumberOrNull(firstDefined(side.bookOverUnder, side.fairOverUnder, data.overUnder)),
        deeplink: data.deeplink,
      });
    }
  }
            
  return books;
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
      team.abbreviation ??
      team.names?.short ??
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

// League-aware market type labels
const MARKET_LABELS: Record<string, Record<string, string>> = {
  nfl: {
    passing_yards: "Passing Yards",
    rushing_yards: "Rushing Yards",
    receiving_yards: "Receiving Yards",
    receptions: "Receptions",
    touchdowns: "Touchdowns",
    first_touchdown: "First Touchdown",
    last_touchdown: "Last Touchdown",
    anytime_touchdown: "Anytime Touchdown",
  },
  nba: {
    points: "Points",
    rebounds: "Rebounds",
    assists: "Assists",
    threes_made: "3-Pointers Made",
    steals: "Steals",
    blocks: "Blocks",
  },
  mlb: {
    hits: "Hits",
    home_runs: "Home Runs",
    rbis: "RBIs",
    strikeouts: "Strikeouts",
    total_bases: "Total Bases",
  },
  nhl: {
    goals: "Goals",
    assists: "Assists",
    points: "Points",
    shots_on_goal: "Shots on Goal",
    saves: "Saves",
  },
  ncaaf: {
    passing_yards: "Passing Yards",
    rushing_yards: "Rushing Yards",
    receiving_yards: "Receiving Yards",
    receptions: "Receptions",
    touchdowns: "Touchdowns",
  },
};

function formatMarketType(raw: string, league: string): string {
  if (!raw) return "Unknown";
  const leagueMap = MARKET_LABELS[league.toLowerCase()] || {};
  return leagueMap[raw] || raw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
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
  const marketType = base.statID;

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