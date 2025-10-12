// Cloudflare Worker for StatPedia File Storage
// Handles file uploads/downloads to R2 bucket

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      switch (request.method) {
        case 'GET':
          return await handleGetFile(request, env, corsHeaders);
        case 'POST':
        case 'PUT':
          return await handleUploadFile(request, env, corsHeaders);
        case 'DELETE':
          return await handleDeleteFile(request, env, corsHeaders);
        default:
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

// Get file from R2
async function handleGetFile(request, env, corsHeaders) {
  const url = new URL(request.url);
  const key = url.pathname.substring(1); // Remove leading slash

  if (!key) {
    return new Response(JSON.stringify({ error: 'File key required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const object = await env.PLAYER_IMAGES.get(key);
    
    if (!object) {
      return new Response('File not found', { status: 404, headers: corsHeaders });
    }

    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    return new Response(object.body, { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to retrieve file' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Upload file to R2
async function handleUploadFile(request, env, corsHeaders) {
  // Verify authentication
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const key = url.pathname.substring(1); // Remove leading slash
  
  // Generate unique key if not provided
  const fileKey = key || `uploads/${Date.now()}-${Math.random().toString(36).substring(2)}`;

  try {
    // Get file data from request
    const fileData = await request.arrayBuffer();
    
    // Upload to R2
    await env.PLAYER_IMAGES.put(fileKey, fileData, {
      httpMetadata: {
        contentType: request.headers.get('Content-Type') || 'application/octet-stream',
      },
    });

    // Return file URL
    const fileUrl = `${url.origin}/${fileKey}`;
    
    return new Response(JSON.stringify({
      success: true,
      key: fileKey,
      url: fileUrl,
      size: fileData.byteLength
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to upload file' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Delete file from R2
async function handleDeleteFile(request, env, corsHeaders) {
  // Verify authentication
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const key = url.pathname.substring(1); // Remove leading slash

  if (!key) {
    return new Response(JSON.stringify({ error: 'File key required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    await env.PLAYER_IMAGES.delete(key);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'File deleted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete file' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
