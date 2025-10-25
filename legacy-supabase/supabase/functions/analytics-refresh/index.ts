import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    console.log("Starting analytics views refresh...");

    // Refresh all materialized views
    const refreshResult = await supabaseClient.rpc("refresh_analytics_views");

    if (refreshResult.error) {
      console.error("Error refreshing analytics views:", refreshResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: refreshResult.error.message,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Analytics views refreshed successfully");

    // Log the refresh event
    const logResult = await supabaseClient.from("analytics_refresh_logs").insert({
      refresh_type: "scheduled",
      status: "success",
      refreshed_at: new Date().toISOString(),
      views_refreshed: [
        "mv_player_baselines",
        "mv_team_prop_ranks",
        "mv_team_pace",
        "mv_prop_matchups",
        "mv_game_matchups",
      ],
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Analytics views refreshed successfully",
        timestamp: new Date().toISOString(),
        views_refreshed: [
          "mv_player_baselines",
          "mv_team_prop_ranks",
          "mv_team_pace",
          "mv_prop_matchups",
          "mv_game_matchups",
        ],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Analytics refresh function error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
