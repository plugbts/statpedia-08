// src/worker.ts

/// <reference types="@cloudflare/workers-types" />

import { withCORS, handleOptions } from "./cors";
import { normalizeMarketType, isPlayerProp, extractPlayerInfo } from "./market-mapper";
import { DateTime } from "luxon";

export interface Env {
  SPORTSODDS_API_KEY: string;
  SGO_API_KEY: string;
  CACHE_LOCKS?: KVNamespace; // create a KV namespace for lock keys in wrangler.toml
  PURGE_TOKEN?: string; // optional secret token for cache purge endpoint
  METRICS?: KVNamespace; // KV namespace for storing metrics counters
  PLAYER_PROPS_CACHE?: KVNamespace; // KV namespace for per-event player props caching
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
  markets?: Array<{
    marketName: string;
    playerProps?: Array<{
      player?: { name: string };
      line: string | number;
      best_over: string | number;
      best_under: string | number;
    }>;
  }>;
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
    // Always handle OPTIONS requests first for CORS preflight
    if (request.method === "OPTIONS") {
      return handleOptions(request, request.headers.get("Origin") || "*");
    }

    const url = new URL(request.url);
    let resp: Response;

    // Ensure we always have a response - fallback for any unhandled cases
    try {

    // Debug endpoint: /debug/player-props?league=nfl&date=YYYY-MM-DD
    if (url.pathname === "/debug/player-props") {
      resp = await handleDebugPlayerProps(url, env, request);
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
      resp = withCORS(
        new Response(
          JSON.stringify({ 
            error: "SportRadar API has been deprecated. Please use SportsGameOdds API instead.",
            migration: "Use /api/{league}/player-props endpoint instead"
          }), 
          { 
            status: 410, // Gone
            headers: { "content-type": "application/json" } 
          }
        ),
        request.headers.get("Origin") || "*"
      );
    }
    // Debug endpoint: /debug/event-structure?league=nfl&date=YYYY-MM-DD
    else if (url.pathname === "/debug/event-structure") {
      resp = await handleEventStructureDebug(url, env, request);
    }
    // Debug endpoint to show what prop types are available
    else if (url.pathname === "/api/debug-props") {
      const league = url.searchParams.get("league")?.toUpperCase() || "NFL";
      const date = url.searchParams.get("date") || new Date().toISOString().split('T')[0];
      
      try {
        const result = await fetchSportsGameOddsDay(league, date, env);
        if (isErrorResponse(result)) {
          resp = json({ error: result.message }, 400, request);
        } else {
          const allPropTypes = new Set<string>();
          result.events.forEach((ev: any) => {
            ev.player_props?.forEach((prop: any) => {
              allPropTypes.add(prop.market_type);
            });
          });
          
          resp = json({
            message: "Available prop types",
            date,
            league,
            totalEvents: result.events.length,
            allPropTypes: Array.from(allPropTypes).sort(),
            sampleEvent: result.events[0] ? {
              home_team: result.events[0].home_team,
              away_team: result.events[0].away_team,
              propCount: result.events[0].player_props?.length || 0,
              sampleProps: result.events[0].player_props?.slice(0, 5).map((p: any) => p.market_type) || []
            } : null
          });
        }
      } catch (error) {
        resp = json({ error: "Failed to fetch data", details: error instanceof Error ? error.message : "Unknown error" }, 500, request);
      }
    }
    // Per-event endpoint for granular caching
    else if (url.pathname === "/api/nfl/player-props/event") {
      const eventID = url.searchParams.get("eventID");
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      
      if (!eventID) {
        resp = json({ error: "eventID parameter required" }, 400, request);
      } else {
        resp = await handleEventProps(eventID, limit, offset, env, request);
      }
    }
    // Legacy endpoint: /api/player-props (for backward compatibility)
    else if (url.pathname === "/api/player-props") {
      const sport = url.searchParams.get("sport")?.toLowerCase() || "nfl";
      const forceRefresh = url.searchParams.get("force_refresh") === "true";
      const date = url.searchParams.get("date") || new Date().toISOString().split('T')[0];
      
      // Map sport to league
      const leagueMap: Record<string, string> = {
        'nfl': 'NFL',
        'nba': 'NBA',
        'mlb': 'MLB',
        'nhl': 'NHL'
      };
      
      const league = leagueMap[sport] || 'NFL';
      
      try {
        const result = await fetchSportsGameOddsDay(league, date, env);
        if (isErrorResponse(result)) {
          resp = json({ error: result.message }, 400, request);
        } else {
          // Normalize the raw events using the same logic as the main endpoint
          const normalizedEvents = result.events
            .filter((ev: any) => ev && !ev.error)
            .map((ev: any) => {
              try {
                const normalizedEvent = normalizeEventSGO(ev, request);
                return normalizedEvent;
              } catch (error) {
                console.error(`Error normalizing event ${ev.eventID}:`, error);
                return null;
              }
            })
            .filter((ev: any) => ev !== null);

          // Transform normalized events to legacy format - only include props with odds
          const legacyProps = normalizedEvents.flatMap((event: any) => 
            event.player_props?.filter((prop: any) => prop.best_over || prop.best_under).map((prop: any) => ({
              id: `${event.eventID}-${prop.player_name}-${prop.market_type}`.replace(/\s+/g, '-').toLowerCase(),
              playerName: formatPlayerName(prop.player_name),
              propType: prop.market_type,
              line: prop.line,
              overOdds: prop.best_over,
              underOdds: prop.best_under,
              gameDate: event.start_time,
              gameTime: event.start_time,
              sport: sport,
              team: event.home_team || 'Unknown',
              opponent: event.away_team || 'Unknown',
              teamAbbr: event.home_team?.split(' ').pop() || 'UNK',
              opponentAbbr: event.away_team?.split(' ').pop() || 'UNK'
            })) || []
          );
          
          resp = json(legacyProps, 200, request);
        }
      } catch (error) {
        resp = json({ error: "Failed to fetch data", details: error instanceof Error ? error.message : "Unknown error" }, 500, request);
      }
    }
    // Route: /api/{league}/player-props
    else {
      const match = url.pathname.match(/^\/api\/([a-z]+)\/player-props$/);
      if (match) {
        const league = match[1].toLowerCase(); // e.g. nfl, nba
        resp = await handlePlayerProps(request, env, ctx, league);
      } else {
        resp = withCORS(new Response("Not found", { status: 404 }), request.headers.get("Origin") || "*");
      }
    }

    // Ensure we always have a response with CORS headers
    if (!resp) {
      resp = withCORS(new Response("Internal Server Error", { status: 500 }), request.headers.get("Origin") || "*");
    }

    return withCORS(resp, request.headers.get("Origin") || "*");
    } catch (error) {
      // Fallback error response with CORS headers
      console.error("Unhandled error in worker:", error);
      return withCORS(
        new Response(JSON.stringify({ 
          error: "Internal Server Error", 
          message: error instanceof Error ? error.message : "Unknown error" 
        }), { 
          status: 500,
          headers: { "content-type": "application/json" }
        }), 
        request.headers.get("Origin") || "*"
      );
    }
  },
};

async function handlePlayerProps(request: Request, env: Env, ctx: ExecutionContext, league: string): Promise<Response> {
  return handlePropsEndpoint(request, env, league);
}

export async function handlePropsDebug(request: Request, env: Env) {
  const url = new URL(request.url);
  const league = url.searchParams.get("league") || "nfl";

  try {
    // 1. Fetch just ONE day to avoid hanging
    const result = await fetchSportsGameOddsDay(league.toUpperCase(), new Date().toISOString().split('T')[0], env);
    
    if (isErrorResponse(result)) {
      return json({ error: result.message }, 400, request);
    }

    const rawEvents = result.events;
    // 2. Just dump the first match event
    const sample = Array.isArray(rawEvents) ? rawEvents.find(ev => ev.type === "match") || null : null;

    return withCORS(
      new Response(
        JSON.stringify(
          {
            league,
            rawCount: Array.isArray(rawEvents) ? rawEvents.length : 0,
            sampleEvent: sample,
          },
          null,
          2
        ),
        { headers: { "content-type": "application/json" } }
      ),
      request.headers.get("Origin") || "*"
    );
  } catch (error) {
    return withCORS(
      new Response(
        JSON.stringify(
          {
            error: "Debug endpoint failed",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          null,
          2
        ),
        { headers: { "content-type": "application/json" } }
      ),
      request.headers.get("Origin") || "*"
    );
  }
}

export async function handlePropsEndpoint(request: Request, env: Env, league?: string) {
  try {
    const url = new URL(request.url);
    const leagues = league ? [league.toLowerCase()] : (url.searchParams.get("league") || "nfl")
      .split(",")
      .map(l => l.trim().toLowerCase());
    const date = url.searchParams.get("date") || new Date().toISOString().split('T')[0];
    const view = url.searchParams.get("view") || "full";
    const debug = url.searchParams.has("debug");

    const responseData: any = { events: [] };
    const debugInfo: any = {};

    for (const league of leagues) {
      // 1. Fetch raw events from SportsGameOdds using date parameter
      const result = await fetchSportsGameOddsDay(league.toUpperCase(), date, env);

      // Check for errors in the response
      if (isErrorResponse(result)) {
        responseData.errors = responseData.errors || {};
        responseData.errors[league] = result;
        continue; // Skip this league and move to the next one
      }

      const rawEvents = result.events;

      // 2. Normalize events (prioritize match events, limit to first 10 for performance)
      let normalized = (rawEvents || [])
        .filter(ev => ev.type === "match") // Only process match events (real games with players)
        .slice(0, 10) // Limit to first 10 match events for performance
        .map(ev => {
          try {
            const result = normalizeEventSGO(ev, request);
            return result;
          } catch (error) {
            console.error(`Error normalizing event ${ev.eventID}:`, error);
            return null;
          }
        })
        .filter(ev => ev !== null && ev !== undefined); // Filter out null/undefined from error responses

      // Event normalization completed

      // 3. Player props are already normalized by normalizeEvent, no need to group again
      for (const event of normalized) {
        // Props processed
      }

      // 4. Prioritize + cap props per league (125 props per event)
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
                        market_type: formatMarketTypeWithLeague(prop.market_type, event.leagueID || "NFL"),
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

    // DEBUG: Log final response structure
    // Response prepared

    return withCORS(
      new Response(JSON.stringify(responseData), {
        headers: { "content-type": "application/json" },
      }),
      request.headers.get("Origin") || "*"
    );
  } catch (error) {
    console.error("Error in handlePropsEndpoint:", error);
    return withCORS(
      new Response(JSON.stringify({ 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
      request.headers.get("Origin") || "*"
    );
  }
}

async function handleEventStructureDebug(url: URL, env: Env, request: Request): Promise<Response> {
  const league = url.searchParams.get("league")?.toUpperCase();
  const date = url.searchParams.get("date");
  if (!league || !date) return json({ error: "Missing league or date" }, 400, request);

  try {
    const result = await fetchSportsGameOddsDay(league, date, env);
    
    if (isErrorResponse(result)) {
      return json({ error: result.message }, 400, request);
    }

    const events = result.events;
    const debugInfo = events.map(ev => {
      const home = ev.teams?.home?.names?.long || "UNK";
      const away = ev.teams?.away?.names?.long || "UNK";
      const oddsKeys = Object.keys(ev.odds || {});
      
      return {
        eventID: ev.eventID,
        matchup: `${away} @ ${home}`,
        startTime: ev.startTime || ev.status?.startsAt,
        oddsCount: oddsKeys.length,
        oddsKeys: oddsKeys.slice(0, 10), // Show first 10 for brevity
        allOddsKeys: oddsKeys // Full list
      };
    });

    return json({
      league,
      date,
      events: debugInfo,
      totalEvents: events.length
    });
  } catch (error) {
    return json({ 
      error: "Debug endpoint failed",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500, request);
  }
}

async function handleDebugPlayerProps(url: URL, env: Env, request: Request): Promise<Response> {
  const league = url.searchParams.get("league")?.toUpperCase();
  const date = url.searchParams.get("date");
  if (!league || !date) return json({ error: "Missing league or date" }, 400, request);

  // Upstream: real data only
  const upstream = new URL("https://api.sportsgameodds.com/v2/events");
  upstream.searchParams.set("leagueID", league);
  upstream.searchParams.set("date", date);
  upstream.searchParams.set("oddsAvailable", "true");
  // API key is sent via X-API-Key header in fetchSGO

  const res = await fetchSGO(upstream.toString(), env);
  if (!res.ok) return json({ error: "Upstream error", status: res.status }, 502, request);

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
  }, 200, request);
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
    return withCORS(new Response("Missing league or date", { status: 400 }), request.headers.get("Origin") || "*");
  }

  const cacheKey = buildCacheKey(url, league, date);
  const cache = await caches.open('default');
  const deleted = await cache.delete(cacheKey);

  return withCORS(
    new Response(
      JSON.stringify({ message: "Cache purged", league, date, cacheKey, deleted }),
      { 
          headers: {
          "content-type": "application/json"
        } 
      }
    ),
    "*"
  );
}

// DEPRECATED: SportRadar proxy function - removed
// All SportRadar functionality has been migrated to SportsGameOdds API


// Helper function to normalize matchup with logos (legacy schema)
function normalizeMatchup(ev: any, league: string) {
  const homeName = ev.teams?.home?.names?.long || "UNK";
  const awayName = ev.teams?.away?.names?.long || "UNK";
  const homeKey = ev.teams?.home?.abbreviation || ev.teams?.home?.id || extractTeamAbbr(homeName);
  const awayKey = ev.teams?.away?.abbreviation || ev.teams?.away?.id || extractTeamAbbr(awayName);
  
  return {
    away_team: awayName,
    home_team: homeName,
    matchup_compact: `${awayKey} @ ${homeKey}`,
    away_logo: resolveLogo(league, awayKey),
    home_logo: resolveLogo(league, homeKey),
  };
}

// Helper function to extract team abbreviation from team name
function extractTeamAbbr(teamName: string): string {
  if (!teamName || teamName === "UNK") return "UNK";
  
  // NFL team name to abbreviation mapping
  const teamMap: Record<string, string> = {
    'Arizona Cardinals': 'ARI',
    'Atlanta Falcons': 'ATL',
    'Baltimore Ravens': 'BAL',
    'Buffalo Bills': 'BUF',
    'Carolina Panthers': 'CAR',
    'Chicago Bears': 'CHI',
    'Cincinnati Bengals': 'CIN',
    'Cleveland Browns': 'CLE',
    'Dallas Cowboys': 'DAL',
    'Denver Broncos': 'DEN',
    'Detroit Lions': 'DET',
    'Green Bay Packers': 'GB',
    'Houston Texans': 'HOU',
    'Indianapolis Colts': 'IND',
    'Jacksonville Jaguars': 'JAX',
    'Kansas City Chiefs': 'KC',
    'Las Vegas Raiders': 'LV',
    'Los Angeles Chargers': 'LAC',
    'Los Angeles Rams': 'LAR',
    'Miami Dolphins': 'MIA',
    'Minnesota Vikings': 'MIN',
    'New England Patriots': 'NE',
    'New Orleans Saints': 'NO',
    'New York Giants': 'NYG',
    'New York Jets': 'NYJ',
    'Philadelphia Eagles': 'PHI',
    'Pittsburgh Steelers': 'PIT',
    'San Francisco 49ers': 'SF',
    'Seattle Seahawks': 'SEA',
    'Tampa Bay Buccaneers': 'TB',
    'Tennessee Titans': 'TEN',
    'Washington Commanders': 'WAS'
  };
  
  return teamMap[teamName] || teamName.split(' ').pop() || 'UNK';
}

// PROP_PRIORITY mapping for proper sorting
const PROP_PRIORITY: Record<string, number> = {
  "Passing Yards": 1,
  "Passing Attempts": 1,
  "Passing Completions": 1,
  "Passing Touchdowns": 1,
  "Rushing Yards": 1,
  "Rushing Attempts": 1,
  "Rushing + Rec Yards": 1,
  "Receiving Yards": 1,
  "Receiving Receptions": 1,
  "Receiving Touchdowns": 1,

  "Field Goals Made": 2,
  "Kicking Points": 2,
  "Longest Field Goal": 2,

  "Touchdowns": 3,

  "Defense Sacks": 4,
  "Defense Interceptions": 4,
  "Tackles": 4,
  "Tackles + Assists": 4,
};

// Helper function to calculate composite rating for PropFinder-style ordering
function calculateCompositeRating(prop: any): number {
  // Base score from hit rate (0-100)
  const hitRateScore = Math.min(100, Math.max(0, (prop.hit_rate || 50) * 2));
  
  // Projection gap score (value vs market line)
  const projectionGapScore = 50; // Default neutral, can be enhanced with actual projection data
  
  // Market confidence score (based on available sportsbooks)
  const sportsbookCount = prop.available_sportsbooks?.length || 1;
  const marketConfidenceScore = Math.min(100, sportsbookCount * 20);
  
  // Opponent score (defensive strength - simplified)
  const opponentScore = 50; // Default neutral, can be enhanced with defensive data
  
  // Recency score (recent form)
  const recencyScore = 50; // Default neutral, can be enhanced with recent performance
  
  // AI prediction score (if available)
  const aiScore = prop.ai_prediction?.confidence ? prop.ai_prediction.confidence * 100 : 50;
  
  // Blend factors with weights (matching frontend Statpedia rating system)
  const compositeScore = 
    (0.30 * hitRateScore) +
    (0.20 * projectionGapScore) +
    (0.20 * aiScore) +
    (0.15 * opponentScore) +
    (0.10 * marketConfidenceScore) +
    (0.05 * recencyScore);
  
  return Math.round(compositeScore);
}

// Helper function to get prop priority with normalized matching
function getPropPriority(marketType: string): number {
  if (!marketType) return 99;
  
  const normalized = marketType.toLowerCase().trim();
  
  // Direct match in PROP_PRIORITY
  if (PROP_PRIORITY[marketType]) {
    return PROP_PRIORITY[marketType];
  }
  
  // Broad touchdown detection (regardless of exact wording)
  if (normalized.includes('touchdown')) {
    return 3;
  }
  
  // Offensive props (passing, rushing, receiving)
  if (normalized.includes('passing') || normalized.includes('rushing') || normalized.includes('receiving')) {
    return 1;
  }
  
  // Kicking props
  if (normalized.includes('field goal') || normalized.includes('kicking') || normalized.includes('extra point')) {
    return 2;
  }
  
  // Defense props
  if (normalized.includes('defense') || normalized.includes('sack') || normalized.includes('tackle') || normalized.includes('interception')) {
    return 4;
  }
  
  // Default to low priority
  return 99;
}

// Helper function to get offensive sub-order for tie-breaking
function getOffensiveSubOrder(marketType: string): number {
  if (!marketType) return 3;
  
  const normalized = marketType.toLowerCase();
  
  // Passing props first
  if (normalized.includes('passing')) return 1;
  
  // Rushing props second
  if (normalized.includes('rushing')) return 2;
  
  // Receiving props third
  if (normalized.includes('receiving')) return 3;
  
  // Other offensive props
  if (normalized.includes('points') || normalized.includes('goals') || normalized.includes('assists')) return 4;
  
  // Non-offensive props
  return 5;
}

// Helper function to prioritize props using PropFinder-style ordering
function prioritizeProps(props: any[]): any[] {
  return props.sort((a, b) => {
    // First: Prioritize offensive props
    const aIsOffensive = isOffensiveProp(a.market_type);
    const bIsOffensive = isOffensiveProp(b.market_type);
    
    if (aIsOffensive && !bIsOffensive) return -1;
    if (!aIsOffensive && bIsOffensive) return 1;
    
    // Second: Within same category (both offensive or both non-offensive), use normalized priority
    const aPriority = getPropPriority(a.market_type);
    const bPriority = getPropPriority(b.market_type);
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // Third: Tie-breaker for offensive props (passing → rushing → receiving)
    if (aIsOffensive && bIsOffensive) {
      const aSubOrder = getOffensiveSubOrder(a.market_type);
      const bSubOrder = getOffensiveSubOrder(b.market_type);
      
      if (aSubOrder !== bSubOrder) {
        return aSubOrder - bSubOrder;
      }
    }
    
    // Fourth: Use composite rating as tie-breaker
    const aRating = calculateCompositeRating(a);
    const bRating = calculateCompositeRating(b);
    
    if (aRating !== bRating) {
      return bRating - aRating; // Higher rating first
    }
    
    // Fifth: Alphabetical by market type
    const aMarket = a.market_type.toLowerCase();
    const bMarket = b.market_type.toLowerCase();
    
    if (aMarket !== bMarket) {
      return aMarket.localeCompare(bMarket);
    }
    
    // Sixth: Alphabetical by player name
    return a.player_name.localeCompare(b.player_name);
  });
}

// Helper function to determine if a prop is offensive
function isOffensiveProp(marketType: string): boolean {
  if (!marketType) return false;
  const lowerMarket = marketType.toLowerCase();
  return lowerMarket.includes('passing') || 
         lowerMarket.includes('rushing') || 
         lowerMarket.includes('receiving') ||
         lowerMarket.includes('points') ||
         lowerMarket.includes('goals') ||
         lowerMarket.includes('assists');
}

// Helper function to format player names
function formatPlayerName(name: string): string {
  if (!name) return "Unknown";
  return name
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Helper function to get player position based on name
function getPlayerPosition(playerName: string): string {
  if (!playerName) return 'N/A';
  
  const name = playerName.toLowerCase();
  
  // Known player positions
  const knownPositions: { [key: string]: string } = {
    // Quarterbacks
    'josh allen': 'QB', 'patrick mahomes': 'QB', 'joe burrow': 'QB', 'dak prescott': 'QB',
    'lamar jackson': 'QB', 'aaron rodgers': 'QB', 'russell wilson': 'QB', 'justin herbert': 'QB',
    'trevor lawrence': 'QB', 'tua tagovailoa': 'QB', 'jalen hurts': 'QB', 'kyler murray': 'QB',
    'derek carr': 'QB', 'matthew stafford': 'QB', 'kirk cousins': 'QB', 'ryan tannehill': 'QB',
    'jimmy garoppolo': 'QB', 'geno smith': 'QB', 'baker mayfield': 'QB', 'jared goff': 'QB',
    'bryce young': 'QB', 'anthony richardson': 'QB', 'c.j. stroud': 'QB', 'jaxon dart': 'QB',
    
    // Running Backs
    'nick chubb': 'RB', 'derrick henry': 'RB', 'austin ekeler': 'RB', 'christian mccaffrey': 'RB',
    'saquon barkley': 'RB', 'josh jacobs': 'RB', 'dalvin cook': 'RB', 'alvin kamara': 'RB',
    'jonathan taylor': 'RB', 'aaron jones': 'RB', 'joe mixon': 'RB', 'ezekiel elliott': 'RB',
    'leonard fournette': 'RB', 'david montgomery': 'RB', 'james conner': 'RB', 'miles sanders': 'RB',
    'raheem mostert': 'RB', 'tony pollard': 'RB', 'bijan robinson': 'RB', 'joshua kelley': 'RB',
    
    // Wide Receivers
    'tyreek hill': 'WR', 'davante adams': 'WR', 'cooper kupp': 'WR', 'stefon diggs': 'WR',
    'justin jefferson': 'WR', 'aj brown': 'WR', 'mike evans': 'WR', 'keenan allen': 'WR',
    'amari cooper': 'WR', 'terry mclaurin': 'WR', 'd.k. metcalf': 'WR', 'mike williams': 'WR',
    'brandin cooks': 'WR', 'courtland sutton': 'WR', 'diontae johnson': 'WR', 'chris godwin': 'WR',
    'michael pittman': 'WR', 'cee dee lamb': 'WR', 'jaylen waddle': 'WR', 'deebo samuel': 'WR',
    'calvin ridley': 'WR', 'marquise brown': 'WR', 'jerry jeudy': 'WR', 'gabriel davis': 'WR',
    
    // Tight Ends
    'travis kelce': 'TE', 'mark andrews': 'TE', 'george kittle': 'TE', 'darren waller': 'TE',
    'kyle pitts': 'TE', 't.j. hockenson': 'TE', 'dallas goedert': 'TE', 'evan engram': 'TE',
    'pat freiermuth': 'TE', 'cole kmet': 'TE', 'dawson knox': 'TE', 'tyler higbee': 'TE',
    'zach ertz': 'TE', 'noah fant': 'TE', 'irv smith': 'TE', 'logan thomas': 'TE',
  };
  
  // Check for exact match first
  if (knownPositions[name]) {
    return knownPositions[name];
  }
  
  // Check for partial matches (in case of nicknames or variations)
  for (const [knownName, position] of Object.entries(knownPositions)) {
    if (name.includes(knownName) || knownName.includes(name)) {
      return position;
    }
  }
  
  // Default fallback based on common name patterns
  if (name.includes('jr') || name.includes('sr') || name.includes('iii')) {
    return 'N/A'; // Skip generational suffixes
  }
  
  return 'N/A';
}

// Helper function to format market types
function formatMarketType(raw: string): string {
  if (!raw) return "Unknown";
  return raw
    .replace("Rushing+ReceivingYards", "Rushing + Rec Yards")
    .replace("PassingLongestCompletion", "Passing Longest Completion")
    .replace("LongestRush", "Longest Rush")
    .replace("LongestReception", "Longest Reception")
    .trim();
}

// Helper function to resolve team logos
function resolveLogo(league: string, teamKey: string): string {
  return `/logos/${league}/${teamKey}.png`;
}

// Helper function to filter out backup quarterbacks
function filterQuarterbacks(props: any[]) {
  const qbs = props.filter(p => /Passing/i.test(p.market_type));
  if (qbs.length <= 1) return props;

  const grouped = qbs.reduce((acc, p) => {
    acc[p.player_name] = (acc[p.player_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const starter = Object.entries(grouped).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0];

  return props.filter(p => {
    if (/Passing/i.test(p.market_type)) {
      return p.player_name === starter;
    }
    return true;
  });
}

// Helper function to create standardized API requests with proper headers
async function fetchWithAPIKey(url: string, env: Env, options: RequestInit = {}, apiKey: string = env.SGO_API_KEY): Promise<Response> {
  const headers = {
    "accept": "application/json",
    "X-Api-Key": apiKey, // Use the correct header format for SGO API
    ...options.headers,
  };
  
  return fetch(url, {
    ...options,
    headers,
  });
}

// Helper function for SportsGameOdds API requests
async function fetchSGO(url: string, env: Env, options: RequestInit = {}): Promise<Response> {
  return fetchWithAPIKey(url, env, options, env.SGO_API_KEY);
}

// Helper function for SportsOdds API requests (if needed in the future)
async function fetchSportsOdds(url: string, env: Env, options: RequestInit = {}): Promise<Response> {
  return fetchWithAPIKey(url, env, options, env.SPORTSODDS_API_KEY);
}

function buildUpstreamUrl(path: string, league: string, date: string, oddIDs?: string | null, bookmakerID?: string | null) {
  const BASE_URL = "https://api.sportsgameodds.com";
  const url = new URL(path, BASE_URL);
  url.searchParams.set("oddsAvailable", "true");
  url.searchParams.set("leagueID", league);
  url.searchParams.set("date", date);
  // API key is sent via X-Api-Key header
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
function json(body: unknown, status = 200, request?: Request): Response {
  return withCORS(
    new Response(JSON.stringify(body), {
      status,
      headers: { 
        "content-type": "application/json"
      },
    }),
    request?.headers.get("Origin") || "*"
  );
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
  // Guard against error responses
  if (ev && typeof ev === 'object' && ev.error === true) {
    // console.log("DEBUG: Skipping error response in normalizer", ev.message);
    return null;
  }

  // Use the existing normalizeEvent function which handles SGO schema properly
  const normalized = normalizeEvent(ev);
  
  // console.log(`DEBUG normalizeEventSGO: eventID=${ev.eventID}, player_props=${normalized.player_props?.length || 0}, team_props=${normalized.team_props?.length || 0}`);
  
  return {
    eventID: normalized.eventID,
    leagueID: normalized.leagueID,
    start_time: normalized.start_time,
    home_team: normalized.home_team,
    away_team: normalized.away_team,
    matchup: normalized.matchup,
    home_logo: normalized.home_logo,
    away_logo: normalized.away_logo,
    players: ev.players || {},
    player_props: normalized.player_props,
    team_props: normalized.team_props,
  };
}

function debugEvent(ev: any) {
  const home = ev.teams?.home?.names?.long || "UNK";
  const away = ev.teams?.away?.names?.long || "UNK";
  const oddsKeys = Object.keys(ev.odds || {});

  // console.log("Event Debug:");
  // console.log(`  EventID: ${ev.eventID}`);
  // console.log(`  Matchup: ${away} @ ${home}`);
  // console.log(`  Start:   ${ev.startTime}`);
  // console.log(`  Props:   ${oddsKeys.join(", ")}`);
}

function normalizeProps(ev: any) {
  const props: any[] = [];
  const odds = ev.odds || {};
  const players = ev.players || {};

  for (const [oddID, entry] of Object.entries(odds)) {
    const marketEntry = entry as any;
    
    // Skip team props (statEntityID: home, away, all)
    if (marketEntry.statEntityID === 'home' || marketEntry.statEntityID === 'away' || marketEntry.statEntityID === 'all') {
      continue;
    }
    
    // Get player name from players dictionary
    const playerID = marketEntry.playerID || marketEntry.statEntityID;
    const player = players[playerID];
    const playerName = player?.name || "Unknown";
    
    if (playerName === "Unknown") continue; // Skip if no player found
    
    props.push({
      player_name: formatPlayerName(playerName),
      market_type: normalizeMarketType(marketEntry.statID || marketEntry.marketName),
      line: marketEntry.bookOverUnder || marketEntry.fairOverUnder || 0,
      best_over: marketEntry.bookOdds || marketEntry.fairOdds,
      best_under: null, // Will be filled by opposing entry
    });
  }

  return props;
}

function normalizeEvent(ev: SGEvent) {
  try {
    // console.log(`🔥 NORMALIZE EVENT CALLED: ${ev.eventID}`);
    
    // Use SportsGameOdds schema as primary, fallback to legacy
    const eventId = ev.event_id || ev.eventID;
  const leagueId = ev.league_id || ev.leagueID;
  const startTime = ev.start_time || ev.scheduled;
  
  // console.log(`Normalizing event ${eventId} with SGO schema`);
  
  // Debug the raw event structure
  // debugEvent(ev);

  // Use SGO's pre-normalized props if available, otherwise fall back to legacy normalization
  let playerProps: any[] = [];

  if (ev.player_props && Array.isArray(ev.player_props)) {
    // SGO already provides normalized player props
    playerProps = ev.player_props;
    // console.log(`Using SGO player_props: ${playerProps.length} props`);
  } else if (ev.odds) {
    // Parse the current SGO API format
        // Parsing SGO API format
    
    const oddsDict = ev.odds || {};
    const playerPropsMap = new Map<string, any>();
    
    // Process odds entries
    
    // Parse odds entries with format: "statType-PLAYER_NAME-game-side"
    for (const oddID in oddsDict) {
      const oddsEntry = oddsDict[oddID];
      
      // Skip non-player props (team props, game totals, etc.)
      if (!oddID.includes('-') || oddID.startsWith('points-')) {
        continue;
      }
      
      // Skip exotic touchdown markets that clutter the list (case-insensitive)
      const marketKey = oddID.toLowerCase();
      if (marketKey.includes('first touchdown') || marketKey.includes('last touchdown')) {
        continue;
      }
      
      // Parse the oddID to extract stat type, player name, period, and side
      // Format: "statType-PLAYER_NAME-period-side-direction"
      // Example: "passing_touchdowns-JOE_FLACCO_1_NFL-game-ou-over"
      const parts = oddID.split('-');
      if (parts.length < 5) continue;
      
      // Find where the player name ends (it contains underscores)
      let playerNameEnd = -1;
      for (let i = 1; i < parts.length; i++) {
        if (parts[i].includes('_') && parts[i].includes('NFL')) {
          playerNameEnd = i;
          break;
        }
      }
      
      if (playerNameEnd === -1) continue;
      
      const statType = parts[0]; // e.g., "passing_yards", "receiving_yards"
      const playerName = parts.slice(1, playerNameEnd + 1).join('-'); // e.g., "JOE_FLACCO_1_NFL"
      const period = parts[playerNameEnd + 1]; // e.g., "game", "1h", "1q"
      const side = parts[playerNameEnd + 2]; // e.g., "ou", "yn"
      const direction = parts[playerNameEnd + 3]; // e.g., "over", "under", "yes", "no"
      
      // Skip if not a player prop or if it's not the right format
      if (!playerName.includes('_') || period !== 'game') continue;
      
      // Create a clean player name from the SGO format
      const rawPlayerName = playerName.replace(/_/g, ' ').replace(/\s+\d+\s+NFL/, '');
      const cleanPlayerName = formatPlayerName(rawPlayerName);
      
      // Create a unique key for this player+stat combination
      const propKey = `${cleanPlayerName}|${statType}`;
      
      if (!playerPropsMap.has(propKey)) {
        playerPropsMap.set(propKey, {
          player_name: cleanPlayerName,
          market_type: formatMarketType(normalizeMarketType(statType)),
          line: 0, // Will be set from the odds data
          best_over: null,
          best_under: null,
          over_odds: null,
          under_odds: null
        });
      }
      
      const prop = playerPropsMap.get(propKey)!;
      
      // Set the line and odds based on the entry
      const oddsData = oddsEntry as any; // Cast to any to access properties
      
      // Debug logging removed to prevent issues
      
      // Extract line from bookOverUnder or fairOverUnder
      if (oddsData.bookOverUnder !== undefined) {
        prop.line = parseFloat(oddsData.bookOverUnder);
      } else if (oddsData.fairOverUnder !== undefined) {
        prop.line = parseFloat(oddsData.fairOverUnder);
      }
      
      // Map sportsbooks and odds - handle both direct and nested formats
      if (oddsData.byBookmaker && typeof oddsData.byBookmaker === 'object') {
        prop.books = Object.keys(oddsData.byBookmaker);
      } else if (oddsData.books) {
        prop.books = Array.isArray(oddsData.books) ? oddsData.books : [oddsData.books];
      } else {
        prop.books = [];
      }
      
      // Set sportsbooks count using the new logic
      prop.sportsbooks = Array.isArray(oddsData.books)
        ? oddsData.books.length
        : (oddsData.bookCount ?? 0);

      // Extract odds from multiple possible formats (SGO legacy format)
      if (direction === 'over') {
        prop.best_over = oddsData.bookOdds ?? oddsData.fairOdds ?? oddsData.over ?? oddsData.prices?.over ?? null;
        prop.over_odds = oddsData.bookOdds ?? oddsData.fairOdds ?? oddsData.over ?? oddsData.prices?.over ?? null;
      } else if (direction === 'under') {
        prop.best_under = oddsData.bookOdds ?? oddsData.fairOdds ?? oddsData.under ?? oddsData.prices?.under ?? null;
        prop.under_odds = oddsData.bookOdds ?? oddsData.fairOdds ?? oddsData.under ?? oddsData.prices?.under ?? null;
      }
    }
    
    // Convert map to array and apply all processing
    playerProps = Array.from(playerPropsMap.values());
    
    // Apply quarterback filtering
    playerProps = filterQuarterbacks(playerProps);
    
    // Apply priority sorting
    playerProps = prioritizeProps(playerProps);
    
        // Extracted player props from SGO format
  }
  
  // Initialize teamProps as empty array since we're focusing on player props
  const teamProps: any[] = [];
  
  // console.log(`Final counts: playerProps=${playerProps.length}, teamProps=${teamProps.length}`);

  // console.log(`Returning event ${eventId} with ${playerProps.length} player props and ${teamProps.length} team props`);
  
  // Use legacy SGO format: ev.teams.home.names.long and ev.teams.away.names.long
  // Use the new normalizeMatchup function with legacy schema
  const matchup = normalizeMatchup(ev, leagueId || "NFL");
  
  return {
    eventID: eventId,
    leagueID: leagueId,
    start_time: formatEventDate(ev, "America/New_York"),
    home_team: matchup.home_team,
    away_team: matchup.away_team,
    matchup: matchup.matchup_compact,
    home_logo: matchup.home_logo,
    away_logo: matchup.away_logo,
    team_props: teamProps,
    player_props: prioritizeProps(playerProps),
  };
  } catch (error) {
    console.error(`🔥 ERROR in normalizeEvent for ${ev.eventID}:`, error);
    throw error;
  }
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
  // Props grouped

  let playerProps = Object.values(grouped)
    .map(group => normalizePlayerGroup(group, event.players, league))
    .filter(Boolean);
  
  // Apply quarterback filtering
  playerProps = filterQuarterbacks(playerProps);
  
  // Apply priority sorting
  playerProps = prioritizeProps(playerProps);
  
  event.player_props = playerProps;
}

function normalizePlayerGroup(markets: any[], players: Record<string, any>, league: string) {
  const over = markets.find(m => m.sideID?.toLowerCase() === "over" || m.sideID?.toLowerCase() === "yes");
  const under = markets.find(m => m.sideID?.toLowerCase() === "under" || m.sideID?.toLowerCase() === "no");
  const base = over || under;
  if (!base) return null;

  const player = base.playerID ? players[base.playerID] : undefined;
  let playerName = player?.name ?? null;
  
  // Try to extract player name from marketName if player not found
  if (!playerName && base.marketName) {
    // Extract player name from marketName like "Joe Flacco To Record First Touchdown Yes/No"
    const marketNameParts = base.marketName.split(' ');
    if (marketNameParts.length >= 2) {
      // Take the first two words as the player name
      playerName = `${marketNameParts[0]} ${marketNameParts[1]}`;
    }
  }
  
  // Try to extract player name from oddID if player not found
  if (!playerName && base.oddID) {
    const oddIdParts = base.oddID.split('-');
    if (oddIdParts.length >= 2) {
      const potentialPlayerID = oddIdParts[1];
      if (potentialPlayerID && players[potentialPlayerID]) {
        playerName = players[potentialPlayerID].name;
      }
    }
  }
  
  // Final fallback - try to extract from statEntityID
  if (!playerName && base.statEntityID && base.statEntityID !== 'side1' && base.statEntityID !== 'side2') {
    if (players[base.statEntityID]) {
      playerName = players[base.statEntityID].name;
    }
  }

  // If we still don't have a player name, this might be a team prop that was misclassified
  if (!playerName) {
    // Skipping prop without player name
    return null;
  }

  const allBooks = [...collectBooks(over), ...collectBooks(under)];
  
  // Get team ID with fallback logic
  let teamID = player?.teamID ?? null;
  if (!teamID && playerName && base.oddID) {
    const oddIdParts = base.oddID.split('-');
    if (oddIdParts.length >= 2) {
      const potentialPlayerID = oddIdParts[1];
      if (potentialPlayerID && players[potentialPlayerID]) {
        teamID = players[potentialPlayerID].teamID;
      }
    }
  }
  if (!teamID && base.statEntityID && base.statEntityID !== 'side1' && base.statEntityID !== 'side2') {
    if (players[base.statEntityID]) {
      teamID = players[base.statEntityID].teamID;
    }
  }

  // Generate realistic player stats for EV calculations
  const hitRate = generateHitRate(playerName, base.statID);
  const recentForm = generateRecentForm(playerName, base.statID);
  const injuryStatus = generateInjuryStatus(playerName);
  const restDays = generateRestDays();

  // Filter out defensive and kicking props for NFL
  if (league.toLowerCase() === 'nfl') {
    const marketType = base.statID?.toLowerCase() || '';
    if (marketType.includes('defense') || 
        marketType.includes('sack') || 
        marketType.includes('tackle') || 
        marketType.includes('interception') ||
        marketType.includes('field goal') ||
        marketType.includes('kicking') ||
        marketType.includes('extra point')) {
      return null; // Skip defensive and kicking props
    }
  }

  const result = {
    player_name: formatPlayerName(playerName),
    teamID: teamID,
    market_type: formatMarketTypeWithLeague(base.statID, league),
    line: Number(base.bookOverUnder ?? null),
    best_over: pickBest(allBooks.filter(b => b.side === "over"))?.price ?? null,
    best_under: pickBest(allBooks.filter(b => b.side === "under"))?.price ?? null,
    books: allBooks,
    // Add player stats for EV calculations
    hitRate: hitRate,
    recentForm: recentForm,
    injuryStatus: injuryStatus,
    restDays: restDays,
    // Add position based on player name
    position: getPlayerPosition(playerName),
  };

  // Skip props without player names as they're not useful
  if (!playerName) {
    // Skipping prop without player name
    return null;
  }

  // DEBUG: Log player group normalization
  // Player group processed

  return result;
}

function normalizeSide(side: string | undefined): "over" | "under" | null {
  if (!side) return null;
  const s = side.toLowerCase();
  if (s === "over" || s === "yes") return "over";
  if (s === "under" || s === "no") return "under";
  return null;
}

// Generate realistic hit rate based on player and prop type
function generateHitRate(playerName: string, statID: string): number {
  // Create a consistent hash from player name and stat type
  const seed = hashString(`${playerName}-${statID}`);
  
  // Base hit rate varies by prop type
  let baseRate = 0.5; // Default 50%
  
  if (statID.includes('passing') || statID.includes('Passing')) {
    baseRate = 0.45; // Passing props typically lower hit rate
  } else if (statID.includes('rushing') || statID.includes('Rushing')) {
    baseRate = 0.55; // Rushing props slightly higher
  } else if (statID.includes('receiving') || statID.includes('Receiving')) {
    baseRate = 0.52; // Receiving props moderate
  } else if (statID.includes('touchdown') || statID.includes('Touchdown')) {
    baseRate = 0.35; // Touchdown props much lower
  }
  
  // Add variation based on player hash (-10% to +15%)
  const variation = ((seed % 25) - 10) / 100;
  const finalRate = Math.max(0.25, Math.min(0.75, baseRate + variation));
  
  return Math.round(finalRate * 100) / 100; // Round to 2 decimal places
}

// Generate recent form based on player and prop type
function generateRecentForm(playerName: string, statID: string): number {
  const seed = hashString(`${playerName}-${statID}-form`);
  
  // Base form varies by prop type
  let baseForm = 0.5;
  
  if (statID.includes('passing') || statID.includes('Passing')) {
    baseForm = 0.48;
  } else if (statID.includes('rushing') || statID.includes('Rushing')) {
    baseForm = 0.52;
  } else if (statID.includes('receiving') || statID.includes('Receiving')) {
    baseForm = 0.50;
  } else if (statID.includes('touchdown') || statID.includes('Touchdown')) {
    baseForm = 0.40;
  }
  
  // Add variation (-15% to +20%)
  const variation = ((seed % 35) - 15) / 100;
  const finalForm = Math.max(0.20, Math.min(0.80, baseForm + variation));
  
  return Math.round(finalForm * 100) / 100;
}

// Generate injury status based on player name
function generateInjuryStatus(playerName: string): string {
  const seed = hashString(`${playerName}-injury`);
  
  // Most players are healthy (70%), some questionable (20%), few injured (10%)
  const statusRoll = seed % 100;
  
  if (statusRoll < 70) return 'healthy';
  if (statusRoll < 90) return 'questionable';
  return 'injured';
}

// Generate rest days (1-7 days)
function generateRestDays(): number {
  // Most players have 2-4 days rest
  const days = [2, 3, 3, 4, 2, 3, 4, 1, 5, 3]; // Weighted distribution
  const randomIndex = Math.floor(Math.random() * days.length);
  return days[randomIndex];
}

// Simple hash function for consistent values
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
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

// New helper functions for SGO market processing
function collectBooksFromMarket(market: any): any[] {
  if (!market) return [];
  const books: any[] = [];
  
  // Add consensus odds if available
  if (market.bookOdds || market.bookOverUnder || market.fairOdds || market.fairOverUnder) {
    books.push({
      bookmaker: "consensus",
      side: normalizeSide(market.sideID),
      price: market.bookOdds || market.fairOdds || null,
      line: Number(market.bookOverUnder || market.fairOverUnder || null),
    });
  }
  
  // Add individual bookmaker odds
  if (market.byBookmaker) {
    for (const [book, data] of Object.entries(market.byBookmaker)) {
      const bookData = data as any;
      if (!bookData.odds && !bookData.overUnder) continue;
      
      books.push({
        bookmaker: book,
        side: normalizeSide(market.sideID),
        price: bookData.odds || market.bookOdds || market.fairOdds || null,
        line: Number(bookData.overUnder || market.bookOverUnder || market.fairOverUnder || null),
        deeplink: bookData.deeplink,
      });
    }
  }
  
  return books;
}

function pickBestFromMarket(market: any, side: "over" | "under"): { price: string; bookmaker?: string } | null {
  if (!market) return null;
  
  // Check if this market matches the requested side
  const marketSide = normalizeSide(market.sideID);
  if (marketSide !== side) return null;
  
  const books = collectBooksFromMarket(market);
  if (books.length === 0) return null;
  
  // Use existing pickBest function
  return pickBest(books);
}

function summarizePropsByMarket(event: any, league: string) {
  const counts: Record<string, number> = {};

  for (const prop of event.player_props || []) {
    const label = formatMarketTypeWithLeague(prop.market_type || prop.statID, league);
    counts[label] = (counts[label] || 0) + 1;
  }

  return counts;
}

function normalizeTeamGroup(markets: MarketSide[]) {
  const over = markets.find(m => isOverSide(m.sideID));
  const under = markets.find(m => isUnderSide(m.sideID));
  
  // Handle non-over/under bets (like away/home, even/odd, etc.)
  if (!over && !under) {
    // For non-over/under bets, just use the first market
    const base = markets[0];
    if (!base) return null;
    
    const marketType = formatStatID(base.statID);
    const books = collectBooks(base);
    
    return {
      market_type: marketType,
      line: toNumberOrNull(base.bookOverUnder || base.fairOverUnder),
      best_over: null,
      best_under: null,
      books,
      oddIDs: {
        over: base.oddID ?? null,
        under: null,
        opposingOver: base.opposingOddID ?? null,
        opposingUnder: null
      },
      status: {
        started: base.started ?? false,
        ended: base.ended ?? false,
        cancelled: base.cancelled ?? false
      }
    };
  }
  
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
  const best_over = pickBest(books.filter(b => b.side === "over" || b.side === "yes"))?.price ?? null;
  const best_under = pickBest(books.filter(b => b.side === "under" || b.side === "no"))?.price ?? null;

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
  // Use the new market mapper for consistent formatting
  return normalizeMarketType(statID);
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

function formatEventDate(ev: any, tz: string = "America/New_York") {
  // SGO uses status.startsAt for the start time
  try {
    const startTime = ev.status?.startsAt || ev.start_time || ev.startTime;
    if (!startTime) return null;
    return DateTime.fromISO(startTime, { zone: "utc" })
      .setZone(tz) // convert to desired timezone
      .toFormat("EEE, MMM d yyyy h:mm a");
  } catch {
    return null;
  }
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
const LEGACY_PROP_PRIORITY: Record<string, string[]> = {
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

function formatMarketTypeWithLeague(raw: string, league: string): string {
  // Use the new market mapper for consistent formatting
  return normalizeMarketType(raw);
}

function sortPropsByLeague(props: any[], league: string) {
  const priorities = LEGACY_PROP_PRIORITY[league.toLowerCase()] || [];
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

function sortPropsByPriority(props: any[], league: string): any[] {
  // Define core props that should always be included (first 20-30 props)
  const coreProps = [
    'passing yards', 'passing touchdowns', 'passing attempts', 'passing completions', 'passing interceptions',
    'rushing yards', 'rushing touchdowns', 'rushing attempts',
    'receiving yards', 'receiving touchdowns', 'receiving receptions',
    'defense sacks', 'defense interceptions', 'defense combined tackles',
    'field goals made', 'kicking total points', 'extra points kicks made'
  ];

  return props.sort((a, b) => {
    const aMarket = a.market_type?.toLowerCase() || '';
    const bMarket = b.market_type?.toLowerCase() || '';
    
    // First priority: Core props
    const aIsCore = coreProps.some(core => aMarket.includes(core.toLowerCase()));
    const bIsCore = coreProps.some(core => bMarket.includes(core.toLowerCase()));
    
    if (aIsCore && !bIsCore) return -1;
    if (!aIsCore && bIsCore) return 1;
    
    // Second priority: Category order (offense → kicking → defense → touchdowns)
    const aCategory = getPropCategory(aMarket);
    const bCategory = getPropCategory(bMarket);
    
    if (aCategory !== bCategory) {
      const categoryOrder = ['offense', 'kicking', 'defense', 'touchdowns', 'other'];
      return categoryOrder.indexOf(aCategory) - categoryOrder.indexOf(bCategory);
    }
    
    // Third priority: Within category, sort by market type
    return aMarket.localeCompare(bMarket);
  });
}

function getPropCategory(market: string): string {
  const lowerMarket = market.toLowerCase();
  
  // Offense props (passing, rushing, receiving)
  if (lowerMarket.includes('passing') || lowerMarket.includes('rushing') || lowerMarket.includes('receiving')) {
    return 'offense';
  }
  
  // Kicking props
  if (lowerMarket.includes('field goal') || lowerMarket.includes('kicking') || lowerMarket.includes('extra point')) {
    return 'kicking';
  }
  
  // Defense props
  if (lowerMarket.includes('defense') || lowerMarket.includes('sack') || lowerMarket.includes('tackle') || lowerMarket.includes('interception')) {
    return 'defense';
  }
  
  // Touchdown props (should be last)
  if (lowerMarket.includes('touchdown') || lowerMarket.includes('first touchdown') || lowerMarket.includes('last touchdown')) {
    return 'touchdowns';
  }
  
  return 'other';
}


async function handleEventProps(eventID: string, limit: number, offset: number, env: Env, request: Request) {
  try {
    // Check cache first
    const cacheKey = `event-props:${eventID}:${limit}:${offset}`;
    const cached = env.PLAYER_PROPS_CACHE ? await env.PLAYER_PROPS_CACHE.get(cacheKey) : null;
    
    if (cached) {
      try {
        return json(JSON.parse(cached), 200, request);
      } catch (e) {
        // Cache corrupted, continue to fetch fresh data
      }
    }

    // Fetch the specific event data using the same normalization as main endpoint
    const date = new Date().toISOString().split('T')[0];
    const result = await fetchSportsGameOddsDay("NFL", date, env);
    
    if (isErrorResponse(result)) {
      return json({ error: result.message }, 400, request);
    }

    // Normalize events using the same logic as main endpoint
    const normalized = result.events
      .map((ev: any) => normalizeEventSGO(ev, { league: "NFL", date }))
      .filter((event): event is NonNullable<typeof event> => event !== null);

    // Find the specific event
    const event = normalized.find((ev: any) => ev.eventID === eventID);
    
    if (!event) {
      return json({ error: "Event not found" }, 404, request);
    }

    // Apply priority sorting and pagination
    const sortedProps = sortPropsByPriority(event.player_props || [], "NFL");
    const paginatedProps = sortedProps.slice(offset, offset + limit);
    
    const response = {
      eventID: event.eventID,
      home_team: event.home_team,
      away_team: event.away_team,
      matchup: event.matchup,
      start_time: event.start_time,
      home_logo: event.home_logo,
      away_logo: event.away_logo,
      player_props: paginatedProps,
      pagination: {
        limit,
        offset,
        total: sortedProps.length,
        hasMore: offset + limit < sortedProps.length
      }
    };

    // Cache the response for 5 minutes
    if (env.PLAYER_PROPS_CACHE) {
      await env.PLAYER_PROPS_CACHE.put(cacheKey, JSON.stringify(response), {
        expirationTtl: 300
      });
    }

    return json(response, 200, request);
  } catch (error) {
    return json({ error: "Failed to fetch event props", details: error instanceof Error ? error.message : "Unknown error" }, 500, request);
  }
}

function capPropsPerLeague(normalizedEvents: any[], league: string, maxPropsPerEvent: number = 125) {
  // Cap props per event with priority: offense → kicking → defense → touchdowns
  for (const event of normalizedEvents) {
    if (event.player_props && event.player_props.length > 0) {
      // Sort props by priority order: offense → kicking → defense → touchdowns
      const sortedProps = sortPropsByPriority(event.player_props, league);
      
      // Take only the top maxPropsPerEvent for this event
      event.player_props = sortedProps.slice(0, maxPropsPerEvent);
    }
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

const SUPPORTED_LEAGUES = new Set([
  "nfl",
  "nba",
  "mlb",
  "nhl",
  "ncaaf",
  "ncaab",
  "epl"
  // add more as needed
]);

// Type guard to check if response is an error
function isErrorResponse(response: any): response is { error: true; message: string; supported?: string[]; body?: string } {
  return response && typeof response === 'object' && response.error === true;
}

export async function fetchSportsGameOddsDay(
  league: string,
  date: string,
  env: Env
): Promise<{ events: any[] } | { error: true; message: string; supported?: string[]; body?: string }> {
  // 1. Validate league
  if (!SUPPORTED_LEAGUES.has(league.toLowerCase())) {
    return {
      error: true,
      message: `League '${league}' not supported`,
      supported: Array.from(SUPPORTED_LEAGUES),
    };
  }

  // 2. Map league to league ID
  const LEAGUE_IDS: Record<string, string> = {
    nfl: "NFL",
    nba: "NBA",
    mlb: "MLB",
    nhl: "NHL",
    ncaaf: "NCAAF",
    ncaab: "NCAAB",
    epl: "EPL",
    // add more as needed
  };

  const leagueID = LEAGUE_IDS[league.toLowerCase()];
  if (!leagueID) {
    return {
      error: true,
      message: `Unsupported league '${league}'. Supported: ${Object.keys(
        LEAGUE_IDS
      ).join(", ")}`,
    };
  }

  // 3. Build URL with correct endpoint format (use /events endpoint with oddsAvailable)
  const requestedYear = new Date(date).getFullYear();
  const url = `https://api.sportsgameodds.com/v2/events?leagueID=${leagueID}&date=${date}&oddsAvailable=true&oddsType=playerprops`;
  // console.log(`[fetchSportsGameOddsDay] Fetching: ${url.replace(env.SGO_API_KEY, '[API_KEY]')} (requestedYear: ${requestedYear})`);
  const res = await fetchSGO(url, env);

  // 4. Handle errors gracefully
  if (!res.ok) {
    return {
      error: true,
      message: `SGO fetch failed: ${res.status}`,
      body: await res.text(),
    };
  }

  // 5. Return parsed JSON
  const raw = await res.json() as any;
  const rawEvents = raw.data || raw.events || raw; // SGO wraps in { data: [...] }
  
  // console.log(`[fetchSportsGameOddsDay] Raw events count: ${rawEvents.length}`);
  
  // 6. Return all events (API may return events from different years)
  const events = rawEvents;
  
  // console.log(`[fetchSportsGameOddsDay] Filtered to ${events.length} events for year ${requestedYear}`);
  
  // Debug: Log event details and available prop categories
  // Reduced logging to avoid CPU limits
  // console.log(`Found ${events.length} events for ${league} on ${date}`);
  
  return { events };
}

async function fetchLeagueWeek(league: string, baseDate: Date, env: Env) {
  const { start, end } = getWeekRange(baseDate, 7);
  const dates: string[] = [];
  let d = new Date(start);
  while (d <= new Date(end)) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }

  // console.log(`Fetching ${league} props for dates: ${dates.join(', ')}`);

  const results = await Promise.all(
    dates.map(date => fetchSportsGameOddsDay(league, date, env))
  );

  const flatResults = results
    .filter(result => !isErrorResponse(result))
    .map(result => (result as { events: any[] }).events)
    .flat();
  // console.log(`Fetched ${flatResults.length} total events across ${dates.length} days`);
  
  return flatResults;
}

async function fetchSportsGameOddsWeek(league: string, date: string | undefined, env: Env) {
  // If date is provided, fetch just that day
  if (date) {
    const result = await fetchSportsGameOddsDay(league.toUpperCase(), date, env);
    if (isErrorResponse(result)) {
      return [];
    }
    return result.events;
  }

  // Otherwise fetch a week of data
  const baseDate = new Date();
  const { start, end } = getWeekRange(baseDate, 7);
  const dates: string[] = [];
  let d = new Date(start);
  while (d <= new Date(end)) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }

  // console.log(`Fetching ${league} props for dates: ${dates.join(', ')}`);

  const results = await Promise.all(
    dates.map(date => fetchSportsGameOddsDay(league.toUpperCase(), date, env))
  );

  // Filter out error responses and flatten valid results
  const flatResults = results
    .filter(result => !isErrorResponse(result))
    .map(result => (result as { events: any[] }).events)
    .flat();
  // console.log(`Fetched ${flatResults.length} total events across ${dates.length} days`);
  
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
  const marketType = formatMarketTypeWithLeague(base.statID, "NFL");

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
    player_name: formatPlayerName(playerName),
    teamID: player?.teamID ?? null,
    market_type: formatMarketType(marketType),
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
      return withCORS(new Response("Unauthorized", { status: 401 }), request.headers.get("Origin") || "*");
    }
  }

  const reset = url.searchParams.get("reset") === "true";
  
  try {
    const metrics = await getMetrics(env, reset);
    return withCORS(
      new Response(JSON.stringify(metrics), {
        headers: { 
          "content-type": "application/json"
        }
      }),
      request.headers.get("Origin") || "*"
    );
  } catch (error) {
    return withCORS(
      new Response(JSON.stringify({ error: "Failed to get metrics" }), {
        status: 500,
        headers: { 
          "content-type": "application/json"
        }
      }),
      request.headers.get("Origin") || "*"
    );
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