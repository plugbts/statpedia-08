// cors.ts
export function withCORS(resp: Response, origin: string = "*"): Response {
  const headers = new Headers(resp.headers);
  
  // Define allowed origins
  const allowedOrigins = [
    "https://170e7fa8-3f2c-4d31-94b1-17786919492c.lovableproject.com",
    "https://statpedia.vercel.app",
    "https://statpedia.com",
    "http://localhost:3000",
    "http://localhost:5173"
  ];
  
  // Check if the origin is in our allowed list
  const requestOrigin = origin && origin !== "*" ? origin : null;
  let allowedOrigin = "*";
  
  if (requestOrigin) {
    // Check exact match first
    if (allowedOrigins.includes(requestOrigin)) {
      allowedOrigin = requestOrigin;
    }
    // Check if it's a Lovable subdomain
    else if (requestOrigin.endsWith('.lovableproject.com')) {
      allowedOrigin = requestOrigin;
    }
  }
  
  headers.set("Access-Control-Allow-Origin", allowedOrigin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  
  // Only set credentials to true if not using wildcard origin
  if (allowedOrigin !== "*") {
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  
  return new Response(resp.body, { ...resp, headers });
}

// Preflight handler
export function handleOptions(request: Request, origin: string = "*"): Response {
  // Define allowed origins
  const allowedOrigins = [
    "https://170e7fa8-3f2c-4d31-94b1-17786919492c.lovableproject.com",
    "https://statpedia.vercel.app",
    "https://statpedia.com",
    "http://localhost:3000",
    "http://localhost:5173"
  ];
  
  // Check if the origin is in our allowed list
  const requestOrigin = origin && origin !== "*" ? origin : null;
  let allowedOrigin = "*";
  
  if (requestOrigin) {
    // Check exact match first
    if (allowedOrigins.includes(requestOrigin)) {
      allowedOrigin = requestOrigin;
    }
    // Check if it's a Lovable subdomain
    else if (requestOrigin.endsWith('.lovableproject.com')) {
      allowedOrigin = requestOrigin;
    }
  }
  
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
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
