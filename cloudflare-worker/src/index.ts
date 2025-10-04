// src/worker.ts

/// <reference types="@cloudflare/workers-types" />

export interface Env {
  SPORTSODDS_API_KEY: string;
  CACHE_LOCKS?: KVNamespace; // create a KV namespace for lock keys in wrangler.toml
  PURGE_TOKEN?: string; // optional secret token for cache purge endpoint
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
      const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const oddIDs = url.searchParams.get("oddIDs");
  const bookmakerID = url.searchParams.get("bookmakerID");
  const debug = url.searchParams.get("debug") === "true";

  if (!date) return json({ error: "Missing date" }, 400);

  const cacheKey = buildCacheKey(url, league, date, oddIDs, bookmakerID);
  // Try cache
  const cached = await caches.open('default').then(cache => cache.match(cacheKey));
  if (cached) return cached;

  // Fetch upstream
  const upstreamUrl = buildUpstreamUrl("/v2/events", league, date, oddIDs, bookmakerID);
  const res = await fetch(upstreamUrl, { headers: { 'x-api-key': env.SPORTSODDS_API_KEY } });
  if (!res.ok) return json({ error: "Upstream error", status: res.status }, 502);

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
  return response;
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