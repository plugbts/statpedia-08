// Simplified Cloudflare Worker for StatPedia Authentication
// Handles login/signup and issues JWTs with Hasura claims
// No Supabase dependency - uses Hasura directly

// Configuration
const JWT_SECRET = 'your-jwt-secret-key';
const HASURA_GRAPHQL_ENDPOINT = 'https://graphql-engine-latest-statpedia.onrender.com';

// JWT helper functions
function base64UrlEncode(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str) {
  str += new Array(5 - (str.length % 4)).join('=');
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

async function generateJWT(payload, secret) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureData = await crypto.subtle.sign(
    'HMAC',
    signature,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );

  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signatureData)));
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

async function verifyJWT(token, secret) {
  try {
    const [header, payload, signature] = token.split('.');
    
    const signatureData = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      signatureData,
      base64UrlDecode(signature),
      new TextEncoder().encode(`${header}.${payload}`)
    );

    if (!isValid) return null;

    return JSON.parse(base64UrlDecode(payload));
  } catch (error) {
    return null;
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      switch (path) {
        case '/auth/signup':
          return await handleSignup(request, env);
        case '/auth/login':
          return await handleLogin(request, env);
        case '/auth/refresh':
          return await handleRefresh(request, env);
        case '/auth/logout':
          return await handleLogout(request, env);
        case '/auth/me':
          return await handleMe(request, env);
        case '/auth/hasura-token':
          return await handleHasuraToken(request, env);
        default:
          return new Response('Not Found', { status: 404, headers: corsHeaders });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// Simple user storage in KV (for demo purposes)
async function createUser(email, password, displayName, env) {
  const userId = crypto.randomUUID();
  const user = {
    id: userId,
    email,
    displayName,
    createdAt: new Date().toISOString(),
    // In production, hash the password properly
    passwordHash: btoa(password) // Simple base64 encoding for demo
  };

  // Store user in KV
  await env.CACHE.put(`user:${email}`, JSON.stringify(user));
  await env.CACHE.put(`user:${userId}`, JSON.stringify(user));
  
  return user;
}

async function findUser(email, env) {
  const userData = await env.CACHE.get(`user:${email}`);
  return userData ? JSON.parse(userData) : null;
}

async function validateUser(email, password, env) {
  const user = await findUser(email, env);
  if (!user) return null;
  
  // Simple password validation for demo
  const passwordHash = btoa(password);
  if (user.passwordHash !== passwordHash) return null;
  
  return user;
}

// Sign up handler
async function handleSignup(request, env) {
  const { email, password, displayName } = await request.json();

  // Check if user already exists
  const existingUser = await findUser(email, env);
  if (existingUser) {
    return new Response(JSON.stringify({ error: 'User already exists' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Create new user
  const user = await createUser(email, password, displayName, env);

  // Generate JWT with Hasura claims
  const jwtPayload = {
    sub: user.id,
    email: user.email,
    'https://hasura.io/jwt/claims': {
      'x-hasura-default-role': 'user',
      'x-hasura-allowed-roles': ['user'],
      'x-hasura-user-id': user.id,
      'x-hasura-email': user.email,
      'x-hasura-display-name': user.displayName
    },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  const token = await generateJWT(jwtPayload, JWT_SECRET);

  return new Response(JSON.stringify({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt
    },
    token,
    expiresIn: 24 * 60 * 60
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Login handler
async function handleLogin(request, env) {
  const { email, password } = await request.json();

  // Validate user credentials
  const user = await validateUser(email, password, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Generate JWT with Hasura claims
  const jwtPayload = {
    sub: user.id,
    email: user.email,
    'https://hasura.io/jwt/claims': {
      'x-hasura-default-role': 'user',
      'x-hasura-allowed-roles': ['user'],
      'x-hasura-user-id': user.id,
      'x-hasura-email': user.email,
      'x-hasura-display-name': user.displayName
    },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  const token = await generateJWT(jwtPayload, JWT_SECRET);

  return new Response(JSON.stringify({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt
    },
    token,
    expiresIn: 24 * 60 * 60
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Refresh token handler
async function handleRefresh(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'No token provided' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const token = authHeader.substring(7);
  const payload = await verifyJWT(token, JWT_SECRET);

  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Generate new JWT
  const newPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  };

  const newToken = await generateJWT(newPayload, JWT_SECRET);

  return new Response(JSON.stringify({
    token: newToken,
    expiresIn: 24 * 60 * 60
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Logout handler
async function handleLogout(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'No token provided' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // In a real app, you might want to blacklist the token
  // For now, just return success
  return new Response(JSON.stringify({ 
    message: 'Logged out successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Get current user handler
async function handleMe(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'No token provided' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const token = authHeader.substring(7);
  const payload = await verifyJWT(token, JWT_SECRET);

  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get user from storage
  const user = await findUser(payload.email, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt
    },
    hasuraClaims: payload['https://hasura.io/jwt/claims']
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Hasura token handler (for direct GraphQL requests)
async function handleHasuraToken(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'No token provided' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const token = authHeader.substring(7);
  const payload = await verifyJWT(token, JWT_SECRET);

  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Return Hasura-compatible token
  return new Response(JSON.stringify({
    token: token,
    hasuraClaims: payload['https://hasura.io/jwt/claims']
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
