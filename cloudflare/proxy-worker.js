// Cloudflare Worker for StatPedia GraphQL Proxy
// Handles caching, rate limiting, and JWT validation for Hasura

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

// Handle GraphQL queries (GET requests) - cache these
async function handleGraphQLQuery(request, env, corsHeaders) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query');
  
  if (!query) {
    return new Response(JSON.stringify({ error: 'Query parameter required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Generate cache key
  const cacheKey = `graphql:${btoa(query)}`;
  
  // Try to get from cache first
  try {
    const cachedResponse = await env.CACHE.get(cacheKey);
    if (cachedResponse) {
      return new Response(cachedResponse, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Cache': 'HIT'
        }
      });
    }
  } catch (error) {
    console.log('Cache read error:', error);
  }

  // Forward to Hasura
  const hasuraUrl = 'https://graphql-engine-latest-statpedia.onrender.com/v1/graphql';
  const hasuraRequest = new Request(hasuraUrl, {
    method: 'GET',
    headers: {
      'Authorization': request.headers.get('Authorization') || '',
      'x-hasura-admin-secret': 'Tkinggaming!',
    },
    body: null
  });

  const response = await fetch(hasuraRequest);
  const responseText = await response.text();

  // Cache successful responses for 5 minutes
  if (response.ok && responseText.includes('"data"')) {
    try {
      await env.CACHE.put(cacheKey, responseText, { expirationTtl: 300 }); // 5 minutes
    } catch (error) {
      console.log('Cache write error:', error);
    }
  }

  return new Response(responseText, {
    status: response.status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Cache': 'MISS'
    }
  });
}

// Handle GraphQL mutations (POST requests) - don't cache these
async function handleGraphQLMutation(request, env, corsHeaders) {
  // Rate limiting
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimitKey = `rate_limit:${clientIP}`;
  
  try {
    const rateLimitCount = await env.CACHE.get(rateLimitKey) || '0';
    const count = parseInt(rateLimitCount);
    
    if (count > 100) { // 100 mutations per minute
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Increment rate limit counter
    await env.CACHE.put(rateLimitKey, (count + 1).toString(), { expirationTtl: 60 });
  } catch (error) {
    console.log('Rate limiting error:', error);
  }

  // Validate JWT if Authorization header is present
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const isValidToken = await validateJWT(authHeader.substring(7), env);
    if (!isValidToken) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Forward to Hasura
  const hasuraUrl = 'https://graphql-engine-latest-statpedia.onrender.com/v1/graphql';
  const hasuraRequest = new Request(hasuraUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': request.headers.get('Authorization') || '',
      'x-hasura-admin-secret': 'Tkinggaming!',
    },
    body: request.body
  });

  const response = await fetch(hasuraRequest);
  const responseText = await response.text();

  // Invalidate related cache entries for mutations
  if (response.ok) {
    await invalidateRelatedCache(request, env);
  }

  return new Response(responseText, {
    status: response.status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

// Validate JWT token
async function validateJWT(token, env) {
  try {
    // Simple JWT validation - in production, use a proper JWT library
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    // Check expiration
    if (payload.exp && payload.exp < now) return false;
    
    // Check Hasura claims
    const hasuraClaims = payload['https://hasura.io/jwt/claims'];
    if (!hasuraClaims || !hasuraClaims['x-hasura-user-id']) return false;
    
    return true;
  } catch (error) {
    return false;
  }
}

// Invalidate related cache entries
async function invalidateRelatedCache(request, env) {
  try {
    // Get the mutation from request body
    const body = await request.json();
    const query = body.query;
    
    // Simple cache invalidation based on mutation type
    if (query.includes('insert_leagues') || query.includes('update_leagues') || query.includes('delete_leagues')) {
      await env.CACHE.delete('graphql:leagues');
    }
    if (query.includes('insert_teams') || query.includes('update_teams') || query.includes('delete_teams')) {
      await env.CACHE.delete('graphql:teams');
    }
    if (query.includes('insert_players') || query.includes('update_players') || query.includes('delete_players')) {
      await env.CACHE.delete('graphql:players');
    }
    // Add more cache invalidation rules as needed
  } catch (error) {
    console.log('Cache invalidation error:', error);
  }
}
