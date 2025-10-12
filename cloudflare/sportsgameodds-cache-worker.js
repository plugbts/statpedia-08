// Cloudflare Worker for SportsGameOdds API Edge Caching
// Provides intelligent caching for player props with different TTLs based on data type

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only handle SportsGameOdds API requests
    if (!path.startsWith('/sportsgameodds/')) {
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    }

    try {
      return await handleSportsGameOddsRequest(request, env, corsHeaders);
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

async function handleSportsGameOddsRequest(request, env, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Extract API parameters
  const league = url.searchParams.get('leagueID') || url.searchParams.get('league');
  const season = url.searchParams.get('season');
  const limit = url.searchParams.get('limit') || '100';
  const cursor = url.searchParams.get('cursor');
  
  // Generate cache key based on parameters
  const cacheKey = `sportsgameodds:${league}:${season}:${limit}:${cursor || 'initial'}`;
  
  // Determine cache TTL based on data type and freshness
  const cacheTTL = getCacheTTL(league, season);
  
  // Try to get from cache first
  try {
    const cachedResponse = await env.PROPS_CACHE.get(cacheKey);
    if (cachedResponse) {
      const cachedData = JSON.parse(cachedResponse);
      
      // Check if data is still fresh (for live games)
      if (isDataFresh(cachedData, cacheTTL)) {
        return new Response(cachedResponse, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
            'X-Cache-TTL': cacheTTL.toString(),
            'X-Data-Freshness': 'fresh'
          }
        });
      }
    }
  } catch (error) {
    console.log('Cache read error:', error);
  }

  // Fetch from SportsGameOdds API
  const apiKey = env.SPORTSGAMEODDS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  const sportsgameoddsUrl = buildSportsGameOddsURL(league, season, limit, cursor, apiKey);
  
  const response = await fetch(sportsgameoddsUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'StatPedia-Edge-Cache/1.0',
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(JSON.stringify({ 
      error: 'SportsGameOdds API error', 
      status: response.status,
      details: errorText,
      url: sportsgameoddsUrl
    }), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const responseText = await response.text();
  const responseData = JSON.parse(responseText);

  // Cache successful responses
  if (response.ok && responseData.data) {
    try {
      // Add metadata for freshness checking
      const cacheData = {
        ...responseData,
        _cached_at: Date.now(),
        _cache_ttl: cacheTTL,
        _data_type: getDataType(league, responseData)
      };
      
      await env.PROPS_CACHE.put(cacheKey, JSON.stringify(cacheData), { 
        expirationTtl: cacheTTL 
      });
    } catch (error) {
      console.log('Cache write error:', error);
    }
  }

  return new Response(responseText, {
    status: response.status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Cache': 'MISS',
      'X-Cache-TTL': cacheTTL.toString(),
      'X-Data-Freshness': 'live'
    }
  });
}

// Determine cache TTL based on league and data type
function getCacheTTL(league, season) {
  const currentYear = new Date().getFullYear().toString();
  const isCurrentSeason = season === currentYear;
  
  // Different cache strategies by league and season
  if (!isCurrentSeason) {
    // Historical data - cache for 24 hours
    return 86400; // 24 hours
  }
  
  // MINIMUM TTL for raw SportsGameOdds API (Cloudflare KV requires min 60s)
  // All current season data gets 60-120 second cache to prevent rate limits
  switch (league?.toLowerCase()) {
    case 'nfl':
      return 60; // 60 seconds - most volatile during games (min allowed)
    case 'nba':
      return 90; // 90 seconds - moderate volatility
    case 'mlb':
      return 60; // 60 seconds - constant changes during games (min allowed)
    case 'nhl':
      return 60; // 60 seconds - frequent updates (min allowed)
    default:
      return 120; // 120 seconds - default for unknown leagues
  }
}

// Check if cached data is still fresh
function isDataFresh(cachedData, ttl) {
  if (!cachedData._cached_at) return false;
  
  const now = Date.now();
  const cacheAge = (now - cachedData._cached_at) / 1000; // seconds
  
  // Data is fresh if it's within the TTL
  return cacheAge < ttl;
}

// Build SportsGameOdds API URL
function buildSportsGameOddsURL(league, season, limit, cursor, apiKey) {
  const baseUrl = 'https://api.sportsgameodds.com/v2/events';
  const params = new URLSearchParams({
    apiKey: apiKey,
    oddsAvailable: 'true',
    leagueID: league,
    season: season,
    limit: limit
  });
  
  if (cursor) {
    params.append('cursor', cursor);
  }
  
  return `${baseUrl}?${params.toString()}`;
}

// Determine data type for cache metadata
function getDataType(league, data) {
  if (!data.data || !Array.isArray(data.data)) {
    return 'unknown';
  }
  
  const events = data.data;
  const hasLiveGames = events.some(event => {
    // Check if any games are currently live
    return event.status === 'live' || event.status === 'in_progress';
  });
  
  return hasLiveGames ? 'live' : 'prematch';
}
