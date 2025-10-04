// src/worker.ts

export interface Env {
  SPORTSODDS_API_KEY: string;
  CACHE_LOCKS?: KVNamespace; // create a KV namespace for lock keys in wrangler.toml
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

    // Route: /api/nfl/player-props?date=YYYY-MM-DD[&bookmakerID=...][&oddIDs=...][&debug=true]
    if (url.pathname === "/api/nfl/player-props") {
      return handleNFLPlayerProps(request, env, ctx);
    }

    // Temporary debug route
    if (url.pathname === "/debug") {
      return new Response(JSON.stringify({
        apiKey: env.SPORTSODDS_API_KEY ? "Present" : "Missing",
        apiKeyLength: env.SPORTSODDS_API_KEY?.length || 0
      }), {
        headers: { "content-type": "application/json" }
      });
    }

    // Test API call directly
    if (url.pathname === "/test-api") {
      const testUrl = "https://api.sportsgameodds.com/v2/events?oddsAvailable=true&leagueID=NFL&date=2025-01-31";
      const res = await fetch(testUrl, {
        headers: { 'x-api-key': env.SPORTSODDS_API_KEY }
      });
      const data = await res.json();
      return new Response(JSON.stringify({
        status: res.status,
        success: data.success,
        dataLength: data.data?.length || 0,
        sampleEvent: data.data?.[0] ? {
          eventID: data.data[0].eventID,
          leagueID: data.data[0].leagueID
        } : null
      }), {
        headers: { "content-type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

async function handleNFLPlayerProps(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const oddIDs = url.searchParams.get("oddIDs"); // pass through only if client provides
  const bookmakerID = url.searchParams.get("bookmakerID");
  const debug = url.searchParams.get("debug") === "true";

  if (!date) {
    return json({ error: "Missing required 'date' query param (YYYY-MM-DD)" }, 400);
  }

  const cacheKey = buildCacheKey(url, { path: "/api/nfl/player-props", date, oddIDs, bookmakerID });
  const cache = caches.default;

  // Try edge cache (skip for now to debug)
  // const cached = await cache.match(cacheKey);
  // if (cached) {
  //   // SWR: kick off a background refresh if the client requested freshness
  //   if (url.searchParams.get("revalidate") === "true") {
  //     ctx.waitUntil(refreshCache(cacheKey, url, env));
  //   }
  //   return cached;
  // }

  // Acquire a KV lock to avoid thundering herd on upstream
  const lockKey = `lock:${cacheKey}`;
  let gotLock = false;
  if (env.CACHE_LOCKS) {
    gotLock = await acquireLock(env.CACHE_LOCKS, lockKey, 15); // 15s lock
    if (!gotLock) {
      // Another request is refreshing; serve stale if available after a short wait, else fall back to fetching without lock
      const waitMs = 300; // small backoff
      await sleep(waitMs);
      const cachedAfterWait = await cache.match(cacheKey);
      if (cachedAfterWait) return cachedAfterWait;
      // Proceed to fetch without lock if cache still empty
    }
  }

  // Fetch upstream, normalize, cache, and release lock
  try {
    const upstreamUrl = buildUpstreamUrl("/v2/events", date, oddIDs, bookmakerID);
    console.log("Upstream URL:", upstreamUrl);
    console.log("API Key:", env.SPORTSODDS_API_KEY ? "Present" : "Missing");
    console.log("Date param:", date);
    console.log("OddIDs param:", oddIDs);
    console.log("BookmakerID param:", bookmakerID);
    const res = await fetch(upstreamUrl, {
      headers: { 'x-api-key': env.SPORTSODDS_API_KEY },
    });

    if (!res.ok) {
      if (env.CACHE_LOCKS) await releaseLock(env.CACHE_LOCKS, lockKey);
      return json({ error: "Upstream error", status: res.status }, 502);
    }

    const data = (await res.json()) as { data?: any[] };
    const rawEvents = data?.data || [];
    console.log("Raw events count:", rawEvents.length);
    console.log("Sample event structure:", rawEvents[0] ? Object.keys(rawEvents[0]) : "No events");

    // Filter to NFL events only
    const nflEvents = rawEvents.filter(ev => String(ev.leagueID).toUpperCase() === "NFL");
    console.log("NFL events after filter:", nflEvents.length);

    // Normalize
    const normalized = nflEvents.map(safeNormalizeEvent);
    console.log("Normalized events:", normalized.length);

    // TTL heuristics
    const totalPlayerProps = normalized.reduce((a, ev) => a + (ev.player_props?.length || 0), 0);
    const ttl = totalPlayerProps > 50 ? 1800 : 300; // 30m if robust, else 5m
    const swr = 1800; // allow stale-while-revalidate for 30m

    const body = {
      events: normalized,
      ...(debug
        ? {
            debug: {
              upstreamEvents: rawEvents.length,
              nflEvents: nflEvents.length,
              playerPropsTotal: totalPlayerProps,
              sampleEvent: rawEvents[0] ? {
                eventID: rawEvents[0].eventID,
                leagueID: rawEvents[0].leagueID,
                startsAt: rawEvents[0].status?.startsAt
              } : null
            },
          }
        : undefined),
    };

    const response = new Response(JSON.stringify(body), {
      headers: {
        "content-type": "application/json",
        // Downstream caching hints; edge cache controls are handled by Cache API
        "cache-control": `public, s-maxage=${ttl}, stale-while-revalidate=${swr}`,
      },
    });

    // Put in edge cache
    await cache.put(cacheKey, response.clone());

    if (env.CACHE_LOCKS) await releaseLock(env.CACHE_LOCKS, lockKey);
    return response;
  } catch (err) {
    if (env.CACHE_LOCKS) await releaseLock(env.CACHE_LOCKS, lockKey);
    return json({ error: "Worker error", message: String(err) }, 500);
  }
}

function buildUpstreamUrl(basePath: string, date: string, oddIDs?: string | null, bookmakerID?: string | null) {
  const BASE_URL = "https://api.sportsgameodds.com"; // replace if different
  const url = new URL(basePath, BASE_URL);

  url.searchParams.set("oddsAvailable", "true");
  url.searchParams.set("leagueID", "NFL");
  url.searchParams.set("date", date);

  // Only forward oddIDs if explicitly provided by client; Option A fetches all otherwise
  if (oddIDs) url.searchParams.set("oddIDs", oddIDs);
  if (bookmakerID) url.searchParams.set("bookmakerID", bookmakerID);

  return url.toString();
}

// Stable cache key per query; include path, date, oddIDs, bookmakerID
function buildCacheKey(url: URL, parts: { path: string; date: string; oddIDs?: string | null; bookmakerID?: string | null }) {
  const origin = "https://edge-cache"; // synthetic origin for cache namespace
  const key = new URL(origin);
  key.pathname = parts.path;
  key.searchParams.set("date", parts.date);
  key.searchParams.set("leagueID", "NFL");
  if (parts.oddIDs) key.searchParams.set("oddIDs", parts.oddIDs);
  if (parts.bookmakerID) key.searchParams.set("bookmakerID", parts.bookmakerID);
  // Prop tabs or other flags can be added to keep keys distinct
  return key.toString();
}

// SWR background refresh task
async function refreshCache(cacheKey: string, url: URL, env: Env) {
  const cache = caches.default;
  const date = url.searchParams.get("date");
  const oddIDs = url.searchParams.get("oddIDs");
  const bookmakerID = url.searchParams.get("bookmakerID");

  if (!date) return;

  const lockKey = `lock:${cacheKey}`;
  let gotLock = false;
  if (env.CACHE_LOCKS) {
    gotLock = await acquireLock(env.CACHE_LOCKS, lockKey, 15);
    if (!gotLock) return;
  }

  try {
    const upstreamUrl = buildUpstreamUrl("/v2/events", date, oddIDs, bookmakerID);
    const res = await fetch(upstreamUrl, { headers: { 'x-api-key': env.SPORTSODDS_API_KEY } });
    if (!res.ok) return;

    const data = (await res.json()) as { data?: SGEvent[] };
    const rawEvents = data?.data || [];
    const nflEvents = rawEvents.filter(ev => String(ev.leagueID).toUpperCase() === "NFL");
    const normalized = nflEvents.map(safeNormalizeEvent);

    const totalPlayerProps = normalized.reduce((a, ev) => a + (ev.player_props?.length || 0), 0);
    const ttl = totalPlayerProps > 50 ? 1800 : 300;
    const swr = 1800;

    const response = new Response(JSON.stringify({ events: normalized }), {
      headers: {
        "content-type": "application/json",
        "cache-control": `public, s-maxage=${ttl}, stale-while-revalidate=${swr}`,
      },
    });

    await cache.put(cacheKey, response);
  } finally {
    if (env.CACHE_LOCKS) await releaseLock(env.CACHE_LOCKS, lockKey);
  }
}

// KV-based lock to coalesce upstream fetches
async function acquireLock(kv: KVNamespace, key: string, ttlSeconds: number): Promise<boolean> {
  const existing = await kv.get(key);
  if (existing) return false;
  await kv.put(key, "1", { expirationTtl: ttlSeconds });
  return true;
}
async function releaseLock(kv: KVNamespace, key: string): Promise<void> {
  await kv.delete(key);
}

// JSON helper
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
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
  console.log("Normalizing event:", ev.eventID, "with", Object.keys(oddsDict).length, "odds");

  // Group by statEntityID + statID + periodID + betTypeID
  const groups: Record<string, MarketSide[]> = {};
  for (const oddID in oddsDict) {
    const m = oddsDict[oddID];
    const key = [m.statEntityID || "", m.statID || "", m.periodID || "", m.betTypeID || ""].join("|");
    (groups[key] ||= []).push(m);
  }
  console.log("Created", Object.keys(groups).length, "groups");

  const playerProps: any[] = [];
  const teamProps: any[] = [];

  for (const key in groups) {
    const markets = groups[key];
    const hasPlayer = markets.some(mm => !!mm.playerID);
    console.log("Group", key, "has player:", hasPlayer, "markets:", markets.length);

    if (hasPlayer) {
      const norm = normalizePlayerGroup(markets, players);
      if (norm) {
        playerProps.push(norm);
        console.log("Added player prop:", norm.player_name, norm.market_type);
      } else {
        console.log("Failed to normalize player group for", key);
      }
    } else {
      const norm = normalizeTeamGroup(markets);
      if (norm) teamProps.push(norm);
    }
  }
  console.log("Final counts - player props:", playerProps.length, "team props:", teamProps.length);

  return {
    eventID: ev.eventID,
    leagueID: ev.leagueID,
    start_time: ev.status.startsAt,
    home_team: ev.teams.home.names, // { long, short }
    away_team: ev.teams.away.names, // { long, short }
    team_props,
    player_props,
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

  const lineStr = firstDefined(over?.bookOverUnder, under?.bookOverUnder, over?.fairOverUnder, under?.fairOverUnder);
  const line = toNumberOrNull(lineStr);

  const books = collectBooks(over, under);

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

function normalizeTeamGroup(markets: MarketSide[]) {
  const over = markets.find(m => isOverSide(m.sideID));
  const under = markets.find(m => isUnderSide(m.sideID));
  const base = over || under;
  if (!base) return null;

  const marketType = formatStatID(base.statID);
  const lineStr = firstDefined(over?.bookOverUnder, under?.bookOverUnder, over?.fairOverUnder, under?.fairOverUnder);
  const line = toNumberOrNull(lineStr);

  const books = collectBooks(over, under);

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

    // Consensus fallback using market-level fields
    if (side.bookOdds || side.bookOverUnder || side.fairOdds || side.fairOverUnder) {
      books.push({
        bookmaker: "consensus",
        side: String(side.sideID).toLowerCase(),
        price: side.bookOdds ?? side.fairOdds ?? "",
        line: toNumberOrNull(side.bookOverUnder ?? side.fairOverUnder),
        deeplink: undefined,
      });
    }

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