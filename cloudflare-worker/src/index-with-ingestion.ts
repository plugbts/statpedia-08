// Main Worker with Prop Ingestion - Migrated from Supabase Edge Function
// Combines existing player props API with new ingestion functionality

/// <reference types="@cloudflare/workers-types" />

import { withCORS, handleOptions } from "./cors";
import { isPlayerProp, extractPlayerInfo } from "./market-mapper";
import { DateTime } from "luxon";

export interface Env {
  SPORTSODDS_API_KEY: string;
  SGO_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  CACHE_LOCKS?: KVNamespace;
  PURGE_TOKEN?: string;
  METRICS?: KVNamespace;
  PLAYER_PROPS_CACHE?: KVNamespace;
  CACHE_TTL_SECONDS?: string;
  MAX_EVENTS_PER_REQUEST?: string;
  MAX_PROPS_PER_REQUEST?: string;
}

// Import prop ingestion functionality
import { runIngestion } from "./jobs/ingest";

// ... existing types and interfaces from original worker ...
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
      };
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
      };
    };
  };
  status?: {
    started?: boolean;
    ended?: boolean;
    cancelled?: boolean;
    startsAt?: string;
  };
  odds?: Record<string, MarketSide>;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request, request.headers.get("Origin") || "*");
    }

    // Route handling
    if (url.pathname === '/ingest' && request.method === 'POST') {
      return handleIngestion(request, env);
    }
    
    if (url.pathname === '/ingest' && request.method === 'GET') {
      return handleIngestionStatus(request, env);
    }

    // Existing player props API routes
    if (url.pathname.startsWith('/api/player-props')) {
      return handlePlayerPropsAPI(request, env);
    }

    // Analytics endpoints
    if (url.pathname === "/analytics/streaks") {
      return handleAnalyticsStreaks(request, env);
    }

    if (url.pathname === "/analytics/matchup-rank") {
      return handleAnalyticsMatchupRank(request, env);
    }

    // Default response
    return new Response(JSON.stringify({
      message: 'Statpedia Player Props Worker',
      version: '2.0.0',
      endpoints: {
        'POST /ingest': 'Start prop ingestion',
        'GET /ingest': 'Check ingestion status',
        'GET /api/player-props': 'Get player props data',
        'GET /analytics/streaks': 'Get player streaks analytics',
        'GET /analytics/matchup-rank': 'Get matchup rankings analytics'
      }
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

async function handleIngestion(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json();
    const { league, season = '2025', week } = body;
    
    console.log(`Starting prop ingestion for league: ${league || 'all'}, season: ${season}, week: ${week || 'all'}`);
    
    const startTime = Date.now();
    const results = await runIngestion(env);
    const duration = Date.now() - startTime;
    
    const response = new Response(JSON.stringify({
      success: true,
      message: 'Prop ingestion completed successfully',
      duration: `${duration}ms`,
      ...results
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json'
      }
    });
    
    return withCORS(response, request.headers.get("Origin") || "*");
    
  } catch (error) {
    console.error('Ingestion failed:', error);
    const response = new Response(JSON.stringify({
      success: false,
      message: 'Ingestion failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json'
      }
    });
    
    return withCORS(response, request.headers.get("Origin") || "*");
  }
}

async function handleIngestionStatus(request: Request, env: Env): Promise<Response> {
  const response = new Response(JSON.stringify({
    status: 'ready',
    message: 'Prop ingestion worker is ready',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json'
    }
  });
  
  return withCORS(response, request.headers.get("Origin") || "*");
}

async function handlePlayerPropsAPI(request: Request, env: Env): Promise<Response> {
  // This would contain the existing player props API logic
  // For now, return a placeholder response
  return new Response(JSON.stringify({
    message: 'Player props API endpoint',
    note: 'This endpoint will contain the existing player props functionality'
  }), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

async function handleAnalyticsStreaks(request: Request, env: Env): Promise<Response> {
  try {
    const { supabaseFetch } = await import("./supabaseFetch");
    const { calculateStreaks } = await import("./lib/streakCalculator");
    const url = new URL(request.url);
    const leagueParam = url.searchParams.get("league") || "all";
    const league = leagueParam.toLowerCase();
    const limit = parseInt(url.searchParams.get("limit") || "50");

    console.log(`📊 Computing TRUE streaks in Worker for ${league}...`);

    // --- Helpers ---
    const normalizeDate = (d: string) => d.split("T")[0];
    const inFilter = (values: string[]) =>
      values && values.length > 0
        ? `in.(${values.map(v => `"${v}"`).join(",")})`
        : null;

    // --- Fetch raw game logs ---
    let query = "player_game_logs";
    const params: string[] = [];
    if (league !== "all") {
      params.push(`league=eq.${league}`);
    }
    params.push(`order=date.desc`);

    if (params.length > 0) {
      query += `?${params.join("&")}`;
    }

    const gameLogs = await supabaseFetch(env, query, { method: "GET" }) as any[];

    console.log(`📊 Fetched ${gameLogs?.length || 0} game logs`);
    if (gameLogs && gameLogs.length > 0) {
      console.log(`📊 Sample game log:`, JSON.stringify(gameLogs[0], null, 2));
    }

    if (!gameLogs || gameLogs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: [],
          league,
          limit,
          message: "No game data found",
          timestamp: new Date().toISOString(),
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // --- Fetch corresponding prop lines ---
    const playerIds = [...new Set(gameLogs.map(g => g.player_id))];
    const propTypes = [...new Set(gameLogs.map(g => g.prop_type))];
    const dates = [...new Set(gameLogs.map(g => normalizeDate(g.date)))];

    // --- Build filters ---
    const filters: string[] = [];

    const playerFilter = inFilter(playerIds);
    if (playerFilter) filters.push(`player_id=${playerFilter}`);

    const propFilter = inFilter(propTypes);
    if (propFilter) filters.push(`prop_type=${propFilter}`);

    const dateFilter = inFilter(dates);
    if (dateFilter) filters.push(`date=${dateFilter}`);

    // Only add league filter if not "all"
    if (league !== "all") {
      filters.push(`league=eq.${league.toLowerCase()}`);
    }

    // --- Construct query ---
    const propsQuery = `proplines${filters.length ? "?" + filters.join("&") : ""}`;

    // --- Fetch ---
    const propLines = await supabaseFetch(env, propsQuery, { method: "GET" }) as any[];

    console.log(`📊 Player Props fetched: ${propLines?.length || 0}`);
    if (propLines && propLines.length > 0) {
      console.log("📊 Sample prop line:", JSON.stringify(propLines[0], null, 2));
    }

    // Calculate streaks using the existing logic
    const streaks = calculateStreaks(gameLogs, propLines);

    return new Response(
      JSON.stringify({
        success: true,
        data: streaks.slice(0, limit),
        league,
        limit,
        total: streaks.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("❌ Analytics streaks error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

async function handleAnalyticsMatchupRank(request: Request, env: Env): Promise<Response> {
  try {
    const { supabaseFetch } = await import("./supabaseFetch");
    const url = new URL(request.url);
    const league = url.searchParams.get("league") || "all";
    const limit = parseInt(url.searchParams.get("limit") || "50");

    console.log(`📊 Computing matchup rankings for ${league}...`);

    // --- Helpers ---
    const normalizeDate = (d: string) => d.split("T")[0];
    const inFilter = (values: string[]) =>
      values && values.length > 0
        ? `in.(${values.map(v => `"${v}"`).join(",")})`
        : null;

    // Fetch game logs and prop lines
    let gameLogsQuery = "player_game_logs";
    if (league !== "all") {
      gameLogsQuery += `?league=eq.${league}`;
    }

    const gameLogs = await supabaseFetch(env, gameLogsQuery, { method: "GET" }) as any[];
    
    if (!gameLogs || gameLogs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: [],
          league,
          limit,
          message: "No game data found",
          timestamp: new Date().toISOString(),
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // --- Build filters ---
    const filters: string[] = [];

    const playerIds = [...new Set(gameLogs.map(g => g.player_id))];
    const propTypes = [...new Set(gameLogs.map(g => g.prop_type))];
    const dates = [...new Set(gameLogs.map(g => normalizeDate(g.date)))];

    const playerFilter = inFilter(playerIds);
    if (playerFilter) filters.push(`player_id=${playerFilter}`);

    const propFilter = inFilter(propTypes);
    if (propFilter) filters.push(`prop_type=${propFilter}`);

    const dateFilter = inFilter(dates);
    if (dateFilter) filters.push(`date=${dateFilter}`);

    // Only add league filter if not "all"
    if (league !== "all") {
      filters.push(`league=eq.${league.toLowerCase()}`);
    }

    // --- Construct query ---
    const propsQuery = `proplines${filters.length ? "?" + filters.join("&") : ""}`;

    // --- Fetch ---
    const propLines = await supabaseFetch(env, propsQuery, { method: "GET" }) as any[];

    console.log(`📊 Player Props fetched: ${propLines?.length || 0}`);
    if (propLines && propLines.length > 0) {
      console.log("📊 Sample prop line:", JSON.stringify(propLines[0], null, 2));
    }

    // Calculate matchup performance (simplified version)
    const matchupRankings = gameLogs
      .map(gameLog => {
        const propLine = propLines?.find(
          prop =>
            prop.player_id === gameLog.player_id &&
            prop.prop_type === gameLog.prop_type &&
            normalizeDate(prop.date) === normalizeDate(gameLog.date) &&
            prop.league === gameLog.league
        );

        return {
          player_id: gameLog.player_id,
          player_name: gameLog.player_name,
          team: gameLog.team,
          opponent: gameLog.opponent,
          prop_type: gameLog.prop_type,
          league: gameLog.league,
          date: gameLog.date,
          actual_value: gameLog.actual_value,
          prop_line: propLine?.line || null,
          performance: propLine ? (gameLog.actual_value - propLine.line) : null,
          hit: propLine ? (gameLog.actual_value > propLine.line ? 1 : 0) : null,
        };
      })
      .filter(item => item.prop_line !== null)
      .sort((a, b) => (b.performance || 0) - (a.performance || 0))
      .slice(0, limit);

    return new Response(
      JSON.stringify({
        success: true,
        data: matchupRankings,
        league,
        limit,
        total: matchupRankings.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("❌ Analytics matchup rank error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
