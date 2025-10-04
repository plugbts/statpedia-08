// src/worker.ts

/// <reference types="@cloudflare/workers-types" />

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

type SGEvent = {
  eventID: string;
  leagueID: string;
  sportID: string;
  teams: {
    home: { names: { long: string; short: string } };
    away: { names: { long: string; short: string } };
  };
  status: {
    startsAt: string;
  };
  odds: Record<string, MarketSide>;
  players: Record<string, Player>;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Debug endpoint: /debug/player-props?league=nfl&date=YYYY-MM-DD
    if (url.pathname === "/debug/player-props") {
      return handleDebugPlayerProps(url, env);
    }

    // Metrics endpoint: /metrics
    if (url.pathname === "/metrics") {
      return handleMetrics(url, request, env);
    }

    // Purge cache endpoint: /api/cache/purge?league=nfl&date=YYYY-MM-DD
    if (url.pathname === "/api/cache/purge") {
      return handleCachePurge(url, request, env);
    }

    // Route: /api/{league}/player-props
    const match = url.pathname.match(/^\/api\/([a-z]+)\/player-props$/);
    if (match) {
      const league = match[1].toUpperCase(); // e.g. NFL, NBA
      return handlePlayerProps(request, env, ctx, league);
    }

    return new Response("Not found", { status: 404 });
  },
};

async function handlePlayerProps(request: Request, env: Env, ctx: ExecutionContext, league: string): Promise<Response> {
  const startTime = Date.now();
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const oddIDs = url.searchParams.get("oddIDs");
  const bookmakerID = url.searchParams.get("bookmakerID");
  const debug = url.searchParams.get("debug") === "true";

  if (!date) return json({ error: "Missing date" }, 400);

  const cacheKey = buildCacheKey(url, league, date, oddIDs, bookmakerID);
  // Try cache
  const cached = await caches.open('default').then(cache => cache.match(cacheKey));
  let cacheHit = false;
  let keptProps = 0;
  let droppedProps = 0;
  let upstreamStatus = 200;
  
  if (cached) {
    cacheHit = true;
    const durationMs = Date.now() - startTime;
    
    // Log metrics for cache hit
    console.log(JSON.stringify({
      type: 'cache_hit',
      league,
      date,
      cacheHit: true,
      keptProps: 0, // We don't know for cache hits
      droppedProps: 0,
      upstreamStatus: 200,
      durationMs
    }));
    
    // Update metrics
    await updateMetrics(env, { cacheHit: true, durationMs });
    
    return cached;
  }

  // Fetch upstream
  const upstreamUrl = buildUpstreamUrl("/v2/events", league, date, oddIDs, bookmakerID);
  const res = await fetch(upstreamUrl, { headers: { 'x-api-key': env.SPORTSODDS_API_KEY } });
  upstreamStatus = res.status;
  
  if (!res.ok) {
    const durationMs = Date.now() - startTime;
    console.log(JSON.stringify({
      type: 'upstream_error',
      league,
      date,
      cacheHit: false,
      keptProps: 0,
      droppedProps: 0,
      upstreamStatus,
      durationMs
    }));
    await updateMetrics(env, { cacheHit: false, upstreamStatus, durationMs });
    return json({ error: "Upstream error", status: res.status }, 502);
  }

  const data = await res.json() as any;
  const rawEvents = data?.data || [];
  
  console.log(`Raw API response: ${rawEvents.length} events`);
  console.log(`Sample event keys:`, rawEvents[0] ? Object.keys(rawEvents[0]) : 'No events');

  // Filter by league
  const events = rawEvents.filter((ev: any) => String(ev.leagueID).toUpperCase() === league);
  
  console.log(`Filtered ${events.length} events for league ${league}`);

  // Normalize
  const normalized = events.map((ev: any) => safeNormalizeEvent(ev as SGEvent));

  const totalPlayerProps = normalized.reduce((a, ev) => a + (ev.player_props?.length || 0), 0);
  const totalDroppedProps = normalized.reduce((a, ev) => a + (ev.debug_counts?.droppedPlayerProps || 0), 0);
  keptProps = totalPlayerProps;
  droppedProps = totalDroppedProps;
  const ttl = totalPlayerProps > 50 ? 1800 : 300;

  const body = {
    events: normalized,
    ...(debug ? { 
      debug: { 
        upstreamEvents: rawEvents.length, 
        playerPropsTotal: totalPlayerProps,
        sampleEvent: normalized[0] ? {
          eventID: normalized[0].eventID,
          player_props_count: normalized[0].player_props?.length || 0,
          team_props_count: normalized[0].team_props?.length || 0,
          sample_player_prop: normalized[0].player_props?.[0] || null
        } : null
      } 
    } : {}),
  };

  const response = new Response(JSON.stringify(body), {
        headers: {
      "content-type": "application/json",
      "cache-control": `public, s-maxage=${ttl}, stale-while-revalidate=1800`,
        },
      });

  await caches.open('default').then(cache => cache.put(cacheKey, response.clone()));
  
  // Log metrics for successful request
  const durationMs = Date.now() - startTime;
  console.log(JSON.stringify({
    type: 'request_success',
    league,
    date,
    cacheHit: false,
    keptProps,
    droppedProps,
    upstreamStatus,
    durationMs
  }));
  
  // Update metrics
  await updateMetrics(env, { 
    cacheHit: false, 
    keptProps, 
    droppedProps, 
    upstreamStatus, 
    durationMs 
  });
  
  return response;
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
  // Optional authentication check
  if (env.PURGE_TOKEN) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${env.PURGE_TOKEN}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

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
    { headers: { "content-type": "application/json" } }
  );
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

function buildCacheKey(url: URL, league: string, date: string, oddIDs?: string | null, bookmakerID?: string | null) {
  const key = new URL("https://edge-cache");
  key.pathname = `/api/${league}/player-props`;
  key.searchParams.set("date", date);
  if (oddIDs) key.searchParams.set("oddIDs", oddIDs);
  if (bookmakerID) key.searchParams.set("bookmakerID", bookmakerID);
  return key.toString();
}


// JSON helper
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
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
      start_time: ev?.status?.startsAt ?? null,
      home_team: ev?.teams?.home?.names ?? null,
      away_team: ev?.teams?.away?.names ?? null,
      team_props: [],
      player_props: [],
      _error: String(err),
    };
  }
}

function normalizeEvent(ev: SGEvent) {
  const players = ev.players || {};
  const oddsDict = ev.odds || {};
  
  console.log(`Normalizing event ${ev.eventID} with ${Object.keys(oddsDict).length} odds`);

  // Group by statEntityID + statID + periodID + betTypeID
  const groups: Record<string, MarketSide[]> = {};
  for (const oddID in oddsDict) {
    const m = oddsDict[oddID];
    const key = [m.statEntityID || "", m.statID || "", m.periodID || "", m.betTypeID || ""].join("|");
    (groups[key] ||= []).push(m);
  }
  
  console.log(`Created ${Object.keys(groups).length} groups`);

  const playerProps: any[] = [];
  const teamProps: any[] = [];

  for (const key in groups) {
    const markets = groups[key];
    const hasPlayer = markets.some(mm => !!mm.playerID);
    
    console.log(`Group ${key}: hasPlayer=${hasPlayer}, markets=${markets.length}`);

    if (hasPlayer) {
      const norm = normalizePlayerGroup(markets, players);
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

  console.log(`Returning event ${ev.eventID} with ${playerProps.length} player props and ${teamProps.length} team props`);
  
  return {
    eventID: ev.eventID,
    leagueID: ev.leagueID,
    start_time: ev.status.startsAt,
    home_team: ev.teams.home.names, // { long, short }
    away_team: ev.teams.away.names, // { long, short }
    team_props: teamProps,
    player_props: playerProps,
  };
}

function normalizePlayerGroup(markets: MarketSide[], players: Record<string, Player>) {
  const over = markets.find(m => isOverSide(m.sideID));
  const under = markets.find(m => isUnderSide(m.sideID));
  const base = over || under;
  if (!base) return null;

  const player = base.playerID ? players[base.playerID] : undefined;
  const playerName = player?.name || extractNameFromMarket(base.marketName);
  const marketType = formatStatID(base.statID);

  const lineStr = firstDefined(
    over?.bookOverUnder,
    under?.bookOverUnder,
    over?.fairOverUnder,
    under?.fairOverUnder
  );
  const line = toNumberOrNull(lineStr);

  const books: any[] = [];

  for (const side of [over, under]) {
    if (!side) continue;

    // Always include consensus fallback
    if (side.bookOdds || side.bookOverUnder || side.fairOdds || side.fairOverUnder) {
      books.push({
        bookmaker: "consensus",
        side: side.sideID,
        price: side.bookOdds ?? side.fairOdds ?? "",
        line: toNumberOrNull(side.bookOverUnder ?? side.fairOverUnder),
      });
    }

    // Add per-book odds if available
    for (const [book, data] of Object.entries(side.byBookmaker || {})) {
      if (!data.odds && !data.overUnder) continue;
      books.push({
        bookmaker: book,
        side: side.sideID,
        price: data.odds ?? side.bookOdds ?? "",
        line: toNumberOrNull(data.overUnder ?? side.bookOverUnder),
        deeplink: data.deeplink,
      });
    }
  }

  const best_over = pickBest(books.filter(b => b.side === "over" || b.side === "yes"));
  const best_under = pickBest(books.filter(b => b.side === "under" || b.side === "no"));

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

function pickBest(entries: { price: string }[]) {
  if (!entries.length) return null;
  const score = (oddsStr: string) => {
    const v = parseInt(oddsStr, 10);
    if (Number.isNaN(v)) return -Infinity;
    return v > 0 ? 1 + v / 100 : 1 + 100 / Math.abs(v);
  };
  return entries.reduce((best, cur) => (score(cur.price) > score(best.price) ? cur : best), entries[0]);
}

// === Debug Normalization Functions ===

function debugNormalizeEvent(ev: any) {
  try {
    return debugNormalizeEventInternal(ev);
  } catch (err) {
    return {
      eventID: ev?.eventID,
      leagueID: ev?.leagueID,
      start_time: ev?.status?.startsAt,
      home_team: ev?.teams?.home?.names,
      away_team: ev?.teams?.away?.names,
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
    start_time: ev.status?.startsAt,
    home_team: ev.teams?.home?.names,
    away_team: ev.teams?.away?.names,
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
      headers: { "content-type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to get metrics" }), {
      status: 500,
      headers: { "content-type": "application/json" }
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