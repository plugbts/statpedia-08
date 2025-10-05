// cors.ts
export function withCORS(resp: Response, origin: string = "*"): Response {
  const headers = new Headers(resp.headers);
  
  // Always set the origin header - use the provided origin or fallback to *
  const allowedOrigin = origin || "*";
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
  if (request.method === "OPTIONS") {
    const allowedOrigin = origin || "*";
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
  return null;
}
