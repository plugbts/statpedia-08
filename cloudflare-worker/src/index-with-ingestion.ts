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
import { 
  fetchEvents, 
  extractPlayerPropsFromEvent,
  isPlayerProp as isPlayerPropIngestion,
  createPlayerPropsFromOdd,
  createIngestedPlayerProp,
  extractPlayerName,
  extractTeam,
  normalizePropType,
  parseOdds,
  mapBookmakerIdToName,
  upsertProps,
  logIngestionStats
} from "./prop-ingestion";

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

    // Default response
    return new Response(JSON.stringify({
      message: 'Statpedia Player Props Worker',
      version: '2.0.0',
      endpoints: {
        'POST /ingest': 'Start prop ingestion',
        'GET /ingest': 'Check ingestion status',
        'GET /api/player-props': 'Get player props data'
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
    const results = await runIngestion(env, league, season, week);
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
  return new Response(JSON.stringify({
    status: 'ready',
    message: 'Prop ingestion worker is ready',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
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
