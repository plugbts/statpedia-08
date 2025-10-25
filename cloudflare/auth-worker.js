// Cloudflare Worker for StatPedia Authentication (DEPRECATED)
// NO SUPABASE: This worker is deprecated and replaced by auth-worker-simplified.js

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const body = {
      success: false,
      message:
        "Auth worker deprecated: Supabase has been removed. Deploy auth-worker-simplified.js instead.",
      replacement: "/cloudflare/auth-worker-simplified.js",
    };

    return new Response(JSON.stringify(body), {
      status: 501,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  },
};
