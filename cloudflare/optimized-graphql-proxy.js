// Optimized Cloudflare Worker for StatPedia GraphQL Proxy
// Implements selective caching for read-heavy queries, bypasses cache for mutations/live data

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-hasura-admin-secret',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only handle GraphQL requests
    if (path !== '/v1/graphql') {
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    }

    try {
      // Check if this is a GET request (query) or POST request (mutation)
      if (request.method === 'GET') {
        return await handleGraphQLQuery(request, env, corsHeaders);
      } else if (request.method === 'POST') {
        return await handleGraphQLMutation(request, env, corsHeaders);
      } else {
        return new Response('Method not allowed', { status: 405, headers: corsHeaders });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// Handle GraphQL queries (GET requests) - selective caching
async function handleGraphQLQuery(request, env, corsHeaders) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query');
  
  if (!query) {
    return new Response(JSON.stringify({ error: 'Query parameter required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Analyze query to determine caching strategy
  const cacheStrategy = analyzeQueryForCaching(query);
  
  // Skip cache for live/real-time queries
  if (!cacheStrategy.shouldCache) {
    return await forwardToHasura(request, corsHeaders, 'BYPASS');
  }

  // Generate cache key for cacheable queries
  const cacheKey = `graphql:${cacheStrategy.category}:${btoa(query)}`;
  
  // Try to get from cache first
  try {
    const cachedResponse = await env.GRAPHQL_CACHE.get(cacheKey);
    if (cachedResponse) {
      return new Response(cachedResponse, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Cache-Category': cacheStrategy.category,
          'X-Cache-TTL': cacheStrategy.ttl.toString()
        }
      });
    }
  } catch (error) {
    console.log('Cache read error:', error);
  }

  // Forward to Hasura
  const response = await forwardToHasura(request, corsHeaders, 'MISS');
  
  // Cache successful responses based on strategy
  if (response.ok && cacheStrategy.shouldCache) {
    try {
      const responseText = await response.text();
      
      // Only cache if response contains data and no errors
      if (responseText.includes('"data"') && !responseText.includes('"errors"')) {
        await env.GRAPHQL_CACHE.put(cacheKey, responseText, { 
          expirationTtl: cacheStrategy.ttl 
        });
      }
      
      return new Response(responseText, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
          'X-Cache-Category': cacheStrategy.category,
          'X-Cache-TTL': cacheStrategy.ttl.toString()
        }
      });
    } catch (error) {
      console.log('Cache write error:', error);
    }
  }

  return response;
}

// Handle GraphQL mutations (POST requests) - no caching, invalidate related cache
async function handleGraphQLMutation(request, env, corsHeaders) {
  // Rate limiting
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimitKey = `rate_limit:${clientIP}`;
  
  try {
    const rateLimitCount = await env.GRAPHQL_CACHE.get(rateLimitKey) || '0';
    const count = parseInt(rateLimitCount);
    
    if (count > 100) { // 100 mutations per minute
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Increment rate limit counter
    await env.GRAPHQL_CACHE.put(rateLimitKey, (count + 1).toString(), { expirationTtl: 60 });
  } catch (error) {
    console.log('Rate limiting error:', error);
  }

  // Forward to Hasura
  const response = await forwardToHasura(request, corsHeaders, 'MUTATION');
  
  // Invalidate related cache entries for mutations
  if (response.ok) {
    await invalidateRelatedCache(request, env);
  }

  return response;
}

// Analyze GraphQL query to determine caching strategy
function analyzeQueryForCaching(query) {
  const lowerQuery = query.toLowerCase();
  
  // NEVER cache these query types (always live/real-time)
  const liveQueryPatterns = [
    'player_props(where: {created_at: {_gte:',
    'player_props(where: {updated_at: {_gte:',
    'player_props(where: {game: {game_date: {_gte:',
    'player_props(where: {game: {status: {_eq: "live"}}',
    'player_props(where: {game: {status: {_eq: "in_progress"}}',
    'player_props(where: {odds: {_gte:',
    'player_props(order_by: {updated_at: desc})',
    'player_props(order_by: {created_at: desc})'
  ];
  
  // Check if query contains live data patterns
  const isLiveQuery = liveQueryPatterns.some(pattern => lowerQuery.includes(pattern));
  
  if (isLiveQuery) {
    return { shouldCache: false, category: 'live', ttl: 0 };
  }
  
  // Cache read-heavy, stable queries with different TTLs
  if (lowerQuery.includes('prop_types')) {
    return { shouldCache: true, category: 'prop-types', ttl: 3600 }; // 1 hour
  }
  
  if (lowerQuery.includes('leagues')) {
    return { shouldCache: true, category: 'leagues', ttl: 1800 }; // 30 minutes
  }
  
  if (lowerQuery.includes('teams')) {
    return { shouldCache: true, category: 'teams', ttl: 1800 }; // 30 minutes
  }
  
  if (lowerQuery.includes('players') && !lowerQuery.includes('player_props')) {
    return { shouldCache: true, category: 'players', ttl: 900 }; // 15 minutes
  }
  
  // Cache "tonight's games" and similar stable queries
  if (lowerQuery.includes('games') && (
    lowerQuery.includes('game_date: {_eq:') ||
    lowerQuery.includes('game_date: {_gte:') ||
    lowerQuery.includes('season:')
  )) {
    return { shouldCache: true, category: 'games', ttl: 300 }; // 5 minutes
  }
  
  // Cache player streaks and historical data
  if (lowerQuery.includes('analytics') || lowerQuery.includes('streak') || lowerQuery.includes('historical')) {
    return { shouldCache: true, category: 'analytics', ttl: 600 }; // 10 minutes
  }
  
  // Cache general player props queries (but not live ones)
  if (lowerQuery.includes('player_props')) {
    return { shouldCache: true, category: 'player-props', ttl: 60 }; // 1 minute
  }
  
  // Default: don't cache unknown queries
  return { shouldCache: false, category: 'unknown', ttl: 0 };
}

// Forward request to Hasura
async function forwardToHasura(request, corsHeaders, cacheStatus) {
  const hasuraUrl = 'https://graphql-engine-latest-statpedia.onrender.com/v1/graphql';
  
  const hasuraRequest = new Request(hasuraUrl, {
    method: request.method,
    headers: {
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
      'Authorization': request.headers.get('Authorization') || '',
      'x-hasura-admin-secret': 'Tkinggaming!',
    },
    body: request.body
  });

  const response = await fetch(hasuraRequest);
  const responseText = await response.text();

  return new Response(responseText, {
    status: response.status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Cache': cacheStatus
    }
  });
}

// Invalidate related cache entries based on mutation type
async function invalidateRelatedCache(request, env) {
  try {
    // Get the mutation from request body
    const body = await request.json();
    const query = body.query;
    const lowerQuery = query.toLowerCase();
    
    // Invalidate specific cache categories based on mutation type
    const invalidationRules = [
      { pattern: 'insert_prop_types', category: 'prop-types' },
      { pattern: 'update_prop_types', category: 'prop-types' },
      { pattern: 'delete_prop_types', category: 'prop-types' },
      { pattern: 'insert_leagues', category: 'leagues' },
      { pattern: 'update_leagues', category: 'leagues' },
      { pattern: 'delete_leagues', category: 'leagues' },
      { pattern: 'insert_teams', category: 'teams' },
      { pattern: 'update_teams', category: 'teams' },
      { pattern: 'delete_teams', category: 'teams' },
      { pattern: 'insert_players', category: 'players' },
      { pattern: 'update_players', category: 'players' },
      { pattern: 'delete_players', category: 'players' },
      { pattern: 'insert_player_props', category: 'player-props' },
      { pattern: 'update_player_props', category: 'player-props' },
      { pattern: 'delete_player_props', category: 'player-props' },
      { pattern: 'insert_games', category: 'games' },
      { pattern: 'update_games', category: 'games' },
      { pattern: 'delete_games', category: 'games' },
      { pattern: 'insert_analytics', category: 'analytics' },
      { pattern: 'update_analytics', category: 'analytics' },
      { pattern: 'delete_analytics', category: 'analytics' }
    ];
    
    // Invalidate matching categories
    for (const rule of invalidationRules) {
      if (lowerQuery.includes(rule.pattern)) {
        // Get all keys for this category and delete them
        const keys = await env.GRAPHQL_CACHE.list({ prefix: `graphql:${rule.category}:` });
        for (const key of keys.keys) {
          await env.GRAPHQL_CACHE.delete(key.name);
        }
        console.log(`Invalidated cache for category: ${rule.category}`);
      }
    }
  } catch (error) {
    console.log('Cache invalidation error:', error);
  }
}
