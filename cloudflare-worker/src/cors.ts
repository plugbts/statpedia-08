// cors.ts
export function withCORS(resp: Response, origin: string = "*"): Response {
  const headers = new Headers(resp.headers);
  
  // Define allowed origins - comprehensive list for all environments
  const allowedOrigins = [
    "https://170e7fa8-3f2c-4d31-94b1-17786919492c.lovableproject.com",
    "https://statpedia.vercel.app",
    "https://statpedia.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "https://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://127.0.0.1:5173"
  ];
  
  // Get the actual request origin
  const requestOrigin = origin && origin !== "*" ? origin : null;
  let allowedOrigin = "*";
  
  // Debug logging
  console.log("CORS Debug:", { requestOrigin, origin, allowedOrigins });
  
  if (requestOrigin) {
    // Check exact match first
    if (allowedOrigins.includes(requestOrigin)) {
      allowedOrigin = requestOrigin;
      console.log("CORS: Exact match found", requestOrigin);
    }
    // Check if it's a Lovable subdomain (handles both lovableproject.com and lovable.app)
    else if (requestOrigin.endsWith('.lovableproject.com') || requestOrigin.endsWith('.lovable.app')) {
      allowedOrigin = requestOrigin;
      console.log("CORS: Lovable subdomain match", requestOrigin);
    }
    // Check if it's a localhost variant
    else if (requestOrigin.startsWith('http://localhost:') || requestOrigin.startsWith('https://localhost:') ||
             requestOrigin.startsWith('http://127.0.0.1:') || requestOrigin.startsWith('https://127.0.0.1:')) {
      allowedOrigin = requestOrigin;
      console.log("CORS: Localhost match", requestOrigin);
    }
    // Check if it's a Vercel preview deployment
    else if (requestOrigin.includes('.vercel.app')) {
      allowedOrigin = requestOrigin;
      console.log("CORS: Vercel match", requestOrigin);
    } else {
      console.log("CORS: No match found, using wildcard", requestOrigin);
    }
  }
  
  // Always set CORS headers - this ensures they're never missing
  headers.set("Access-Control-Allow-Origin", allowedOrigin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-API-Key, Accept, Origin, User-Agent, DNT, Cache-Control, X-Mx-ReqToken, Keep-Alive, X-Requested-With, If-Modified-Since");
  headers.set("Access-Control-Max-Age", "86400"); // Cache preflight for 24 hours
  headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Type, Date, Server, Transfer-Encoding");
  
  // Only set credentials to true if not using wildcard origin
  if (allowedOrigin !== "*") {
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  
  console.log("CORS: Final headers set", { allowedOrigin, hasOrigin: headers.has("Access-Control-Allow-Origin") });
  
  return new Response(resp.body, { ...resp, headers });
}

// Preflight handler
export function handleOptions(request: Request, origin: string = "*"): Response {
  // Define allowed origins - comprehensive list for all environments
  const allowedOrigins = [
    "https://170e7fa8-3f2c-4d31-94b1-17786919492c.lovableproject.com",
    "https://statpedia.vercel.app",
    "https://statpedia.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "https://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://127.0.0.1:5173"
  ];
  
  // Get the actual request origin
  const requestOrigin = origin && origin !== "*" ? origin : null;
  let allowedOrigin = "*";
  
  if (requestOrigin) {
    // Check exact match first
    if (allowedOrigins.includes(requestOrigin)) {
      allowedOrigin = requestOrigin;
    }
    // Check if it's a Lovable subdomain (handles both lovableproject.com and lovable.app)
    else if (requestOrigin.endsWith('.lovableproject.com') || requestOrigin.endsWith('.lovable.app')) {
      allowedOrigin = requestOrigin;
    }
    // Check if it's a localhost variant
    else if (requestOrigin.startsWith('http://localhost:') || requestOrigin.startsWith('https://localhost:') ||
             requestOrigin.startsWith('http://127.0.0.1:') || requestOrigin.startsWith('https://127.0.0.1:')) {
      allowedOrigin = requestOrigin;
    }
    // Check if it's a Vercel preview deployment
    else if (requestOrigin.includes('.vercel.app')) {
      allowedOrigin = requestOrigin;
    }
  }
  
  // Always set CORS headers - this ensures they're never missing
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, X-API-Key, Accept, Origin, User-Agent, DNT, Cache-Control, X-Mx-ReqToken, Keep-Alive, X-Requested-With, If-Modified-Since",
    "Access-Control-Max-Age": "86400", // Cache preflight for 24 hours
    "Access-Control-Expose-Headers": "Content-Length, Content-Type, Date, Server, Transfer-Encoding",
  };
  
  // Only set credentials to true if not using wildcard origin
  if (allowedOrigin !== "*") {
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  
  return new Response(null, {
    status: 204,
    headers,
  });
}
