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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the job type from the request body or query params
    const url = new URL(req.url);
    const jobType = url.searchParams.get("job") || "all";

    let result: any = {};

    switch (jobType) {
      case "data-ingestion":
        result = await runDataIngestionJob(supabase);
        break;
      case "analytics-precomputation":
        result = await runAnalyticsPrecomputationJob(supabase);
        break;
      case "cache-cleanup":
        result = await runCacheCleanupJob(supabase);
        break;
      case "all":
      default:
        result = await runAllJobs(supabase);
        break;
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobType,
        result,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Scheduled job error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

/**
 * Run data ingestion job
 */
async function runDataIngestionJob(supabase: any) {
  try {
    console.log("Running data ingestion job...");

    // Ingest data for the last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Call the historical data service
    const { data, error } = await supabase.functions.invoke("historical-data-ingestion", {
      body: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
    });

    if (error) throw error;

    console.log("Data ingestion job completed");
    return { message: "Data ingestion completed", data };
  } catch (error) {
    console.error("Data ingestion job failed:", error);
    throw error;
  }
}

/**
 * Run analytics precomputation job
 */
async function runAnalyticsPrecomputationJob(supabase: any) {
  try {
    console.log("Running analytics precomputation job...");

    // Get all unique player/prop combinations
    const { data: gameLogs, error: gameLogsError } = await supabase
      .from("PlayerGameLogs")
      .select("player_id, prop_type")
      .order("date", { ascending: false });

    if (gameLogsError) throw gameLogsError;

    if (!gameLogs || gameLogs.length === 0) {
      return { message: "No game logs found for analytics precomputation" };
    }

    // Get unique combinations
    const uniqueCombinations = new Set(
      gameLogs.map((log: any) => `${log.player_id}-${log.prop_type}`),
    );

    console.log(`Found ${uniqueCombinations.size} unique player/prop combinations`);

    // Process each combination
    let processed = 0;
    let errors = 0;

    for (const combination of uniqueCombinations) {
      try {
        const [playerId, propType] = combination.split("-");
        await precomputePlayerPropAnalytics(supabase, playerId, propType);
        processed++;

        if (processed % 10 === 0) {
          console.log(`Processed ${processed}/${uniqueCombinations.size} combinations`);
        }
      } catch (error) {
        errors++;
        console.error(`Error processing combination ${combination}:`, error);
      }
    }

    console.log(`Analytics precomputation completed: ${processed} processed, ${errors} errors`);
    return {
      message: "Analytics precomputation completed",
      processed,
      errors,
      total: uniqueCombinations.size,
    };
  } catch (error) {
    console.error("Analytics precomputation job failed:", error);
    throw error;
  }
}

/**
 * Precompute analytics for a specific player/prop combination
 */
async function precomputePlayerPropAnalytics(supabase: any, playerId: string, propType: string) {
  // Get all game logs for this player/prop
  const { data: gameLogs, error: gameLogsError } = await supabase
    .from("PlayerGameLogs")
    .select("*")
    .eq("player_id", playerId)
    .eq("prop_type", propType)
    .order("date", { ascending: false });

  if (gameLogsError) throw gameLogsError;

  if (!gameLogs || gameLogs.length === 0) {
    return;
  }

  // Get common lines for this prop type
  const commonLines = getCommonLines(propType);

  // Calculate analytics for each line/direction combination
  for (const line of commonLines) {
    for (const direction of ["over", "under"]) {
      try {
        const analytics = await calculateAnalytics(gameLogs, line, direction as "over" | "under");

        // Store in cache
        await supabase.from("Analytics").upsert(
          {
            player_id: playerId,
            prop_type: propType,
            line: line,
            direction: direction,
            matchup_rank_value: analytics.matchupRank.rank,
            matchup_rank_display: analytics.matchupRank.display,
            season_hits: analytics.season.hits,
            season_total: analytics.season.total,
            season_pct: analytics.season.pct,
            h2h_hits: analytics.h2h.hits,
            h2h_total: analytics.h2h.total,
            h2h_pct: analytics.h2h.pct,
            l5_hits: analytics.l5.hits,
            l5_total: analytics.l5.total,
            l5_pct: analytics.l5.pct,
            l10_hits: analytics.l10.hits,
            l10_total: analytics.l10.total,
            l10_pct: analytics.l10.pct,
            l20_hits: analytics.l20.hits,
            l20_total: analytics.l20.total,
            l20_pct: analytics.l20.pct,
            streak_current: analytics.streak.current,
            streak_type: analytics.streak.type,
            last_computed_at: new Date().toISOString(),
          },
          {
            onConflict: "player_id,prop_type,line,direction",
          },
        );
      } catch (error) {
        console.error(
          `Error calculating analytics for ${playerId}/${propType}/${line}/${direction}:`,
          error,
        );
      }
    }
  }
}

/**
 * Calculate analytics for a set of game logs
 */
async function calculateAnalytics(gameLogs: any[], line: number, direction: "over" | "under") {
  // Filter by season (2025)
  const season2025 = gameLogs.filter((g) => g.season === 2025);

  // Calculate hit rates
  const season = calculateHitRate(season2025, line, direction);
  const h2h = calculateHitRate(gameLogs, line, direction); // All seasons for H2H
  const l5 = calculateHitRate(gameLogs.slice(0, 5), line, direction);
  const l10 = calculateHitRate(gameLogs.slice(0, 10), line, direction);
  const l20 = calculateHitRate(gameLogs.slice(0, 20), line, direction);

  // Calculate streak
  const streak = calculateStreak(gameLogs, line, direction);

  // Get defensive rank (placeholder for now)
  const matchupRank = { rank: 0, display: "N/A" };

  return {
    matchupRank,
    season,
    h2h,
    l5,
    l10,
    l20,
    streak,
  };
}

/**
 * Calculate hit rate for a set of games
 */
function calculateHitRate(games: any[], line: number, direction: "over" | "under") {
  if (games.length === 0) {
    return { hits: 0, total: 0, pct: 0 };
  }

  const hits = games.filter((game) => {
    if (direction === "over") {
      return game.value > line;
    } else {
      return game.value < line;
    }
  }).length;

  return {
    hits,
    total: games.length,
    pct: (hits / games.length) * 100,
  };
}

/**
 * Calculate streak for a set of games
 */
function calculateStreak(games: any[], line: number, direction: "over" | "under") {
  if (games.length === 0) {
    return { current: 0, type: "mixed" as const };
  }

  let current = 0;
  let type: "over_hit" | "under_hit" | "mixed" = "mixed";

  for (const game of games) {
    const hit = direction === "over" ? game.value > line : game.value < line;

    if (current === 0) {
      // First game
      if (hit) {
        current = 1;
        type = direction === "over" ? "over_hit" : "under_hit";
      }
    } else {
      // Subsequent games
      if (hit && type === (direction === "over" ? "over_hit" : "under_hit")) {
        current++;
      } else if (hit && type !== (direction === "over" ? "over_hit" : "under_hit")) {
        // Different type of hit, reset streak
        current = 1;
        type = direction === "over" ? "over_hit" : "under_hit";
      } else {
        // Miss, end streak
        break;
      }
    }
  }

  return { current, type };
}

/**
 * Get common lines for a prop type
 */
function getCommonLines(propType: string): number[] {
  const commonLines: { [key: string]: number[] } = {
    "Passing Yards": [200, 225, 250, 275, 300, 325, 350],
    "Rushing Yards": [50, 75, 100, 125, 150, 175, 200],
    "Receiving Yards": [50, 75, 100, 125, 150, 175, 200],
    "Passing Touchdowns": [1, 2, 3, 4, 5],
    "Rushing Touchdowns": [1, 2, 3, 4, 5],
    "Receiving Touchdowns": [1, 2, 3, 4, 5],
    "Passing Completions": [15, 20, 25, 30, 35, 40],
    "Rushing Attempts": [10, 15, 20, 25, 30, 35],
    Receptions: [3, 4, 5, 6, 7, 8, 9, 10],
  };

  return commonLines[propType] || [100];
}

/**
 * Run cache cleanup job
 */
async function runCacheCleanupJob(supabase: any) {
  try {
    console.log("Running cache cleanup job...");

    // Clear analytics cache older than 30 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const { error } = await supabase
      .from("Analytics")
      .delete()
      .lt("last_computed_at", cutoffDate.toISOString());

    if (error) throw error;

    console.log("Cache cleanup job completed");
    return { message: "Cache cleanup completed" };
  } catch (error) {
    console.error("Cache cleanup job failed:", error);
    throw error;
  }
}

/**
 * Run all jobs
 */
async function runAllJobs(supabase: any) {
  try {
    console.log("Running all scheduled jobs...");

    const results = {
      dataIngestion: await runDataIngestionJob(supabase),
      analyticsPrecomputation: await runAnalyticsPrecomputationJob(supabase),
      cacheCleanup: await runCacheCleanupJob(supabase),
    };

    console.log("All scheduled jobs completed");
    return results;
  } catch (error) {
    console.error("All jobs failed:", error);
    throw error;
  }
}
