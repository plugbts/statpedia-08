import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface APIConfig {
  sportsgameodds_api_key: string;
  cache_ttl_seconds: number;
  polling_interval_seconds: number;
  max_props_per_request: number;
  enabled_sports: string[];
}

class BackgroundPollerService {
  private config: APIConfig | null = null;
  private isPolling = false;
  private pollInterval: number | null = null;

  async loadConfig(): Promise<APIConfig> {
    const { data, error } = await supabase
      .from("api_config")
      .select("key, value")
      .in("key", [
        "sportsgameodds_api_key",
        "cache_ttl_seconds",
        "polling_interval_seconds",
        "max_props_per_request",
        "enabled_sports",
      ]);

    if (error) {
      console.error("Failed to load API config:", error);
      throw new Error("Configuration not available");
    }

    const configMap = data.reduce((acc: any, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});

    this.config = {
      sportsgameodds_api_key: configMap.sportsgameodds_api_key?.replace(/"/g, "") || "",
      cache_ttl_seconds: parseInt(configMap.cache_ttl_seconds) || 30,
      polling_interval_seconds: parseInt(configMap.polling_interval_seconds) || 30,
      max_props_per_request: parseInt(configMap.max_props_per_request) || 3,
      enabled_sports: Array.isArray(configMap.enabled_sports)
        ? configMap.enabled_sports
        : ["nfl", "nba", "mlb", "nhl"],
    };

    return this.config;
  }

  async fetchFromSportGameOdds(sport: string): Promise<any> {
    const config = await this.loadConfig();
    const baseUrl = "https://api.sportsgameodds.com";
    const url = `${baseUrl}/v2/events?leagueID=${sport.toUpperCase()}&marketOddsAvailable=true&limit=50`;

    console.log(
      `Background polling SportGameOdds API for ${sport}: ${url.replace(config.sportsgameodds_api_key, "REDACTED")}`,
    );

    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.sportsgameodds_api_key}`,
        "Content-Type": "application/json",
        "User-Agent": "Statpedia-BackgroundPoller/1.0",
      },
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SportGameOdds API Error for ${sport}: ${response.status} - ${errorText}`);
      throw new Error(`SportGameOdds API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Log rate limit headers
    const rateLimit = response.headers.get("x-ratelimit-limit");
    const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
    const rateLimitReset = response.headers.get("x-ratelimit-reset");

    console.log(
      `SportGameOdds Rate Limit for ${sport} - Limit: ${rateLimit}, Remaining: ${rateLimitRemaining}, Reset: ${rateLimitReset}`,
    );

    return {
      data,
      meta: {
        responseTime,
        rateLimit: {
          limit: rateLimit,
          remaining: rateLimitRemaining,
          reset: rateLimitReset,
        },
      },
    };
  }

  async processPlayerProps(rawData: any, sport: string, maxProps: number): Promise<any[]> {
    if (!rawData.data || !Array.isArray(rawData.data)) {
      return [];
    }

    const playerProps: any[] = [];

    for (const event of rawData.data) {
      if (!event.odds || !Array.isArray(event.odds)) continue;

      const gameId = event.eventID;
      const homeTeam = event.homeTeam?.name || "Unknown";
      const awayTeam = event.awayTeam?.name || "Unknown";
      const gameTime = event.status?.startsAt || new Date().toISOString();

      // Process odds for player props
      for (const odd of event.odds) {
        if (!odd.byBookmaker) continue;

        for (const [bookmakerId, bookmakerData] of Object.entries(odd.byBookmaker)) {
          if (!bookmakerData || typeof bookmakerData !== "object") continue;

          const bookmaker = bookmakerData as any;
          if (!bookmaker.over || !bookmaker.under) continue;

          // Extract player information from oddID
          const oddIdParts = odd.oddID?.split("-") || [];
          if (oddIdParts.length < 5) continue;

          const playerName = oddIdParts.slice(2, -2).join(" ");
          const propType = oddIdParts[oddIdParts.length - 2];
          const line = parseFloat(oddIdParts[oddIdParts.length - 1]);

          if (isNaN(line) || !playerName || !propType) continue;

          const prop = {
            id: `${gameId}-${playerName}-${propType}-${line}-${bookmakerId}`,
            playerId: playerName.replace(/\s+/g, "_").toLowerCase(),
            playerName,
            team: homeTeam,
            sport: sport.toLowerCase(),
            propType,
            line,
            overOdds: bookmaker.over.odds || 0,
            underOdds: bookmaker.under.odds || 0,
            sportsbook: bookmakerId,
            sportsbookKey: bookmakerId,
            lastUpdate: new Date().toISOString(),
            gameId,
            gameTime,
            homeTeam,
            awayTeam,
            confidence: 1.0,
            market: propType,
            outcome: "over_under",
            betType: "player_prop",
            side: "both",
            period: "full_game",
            statEntity: playerName,
            isExactAPIData: true,
            rawOverOdds: bookmaker.over,
            rawUnderOdds: bookmaker.under,
            availableSportsbooks: [bookmakerId],
          };

          playerProps.push(prop);

          if (playerProps.length >= maxProps) {
            break;
          }
        }

        if (playerProps.length >= maxProps) {
          break;
        }
      }

      if (playerProps.length >= maxProps) {
        break;
      }
    }

    return playerProps.slice(0, maxProps);
  }

  async updateCache(
    cacheKey: string,
    endpoint: string,
    sport: string,
    data: any,
    ttlSeconds: number,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await supabase.from("api_cache").upsert({
      cache_key: cacheKey,
      endpoint,
      sport,
      data,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async logPollingActivity(
    sport: string,
    success: boolean,
    responseTime: number,
    propsCount: number,
    error?: string,
  ): Promise<void> {
    await supabase.from("api_usage_logs").insert({
      user_id: null, // System/background polling
      endpoint: "background-polling",
      method: "GET",
      sport,
      response_status: success ? 200 : 500,
      response_time_ms: responseTime,
      cache_hit: false,
      api_key_used: "background-poller",
      user_agent: "Statpedia-BackgroundPoller/1.0",
      ip_address: null,
    });

    console.log(
      `Polling ${sport}: ${success ? "SUCCESS" : "FAILED"} - ${propsCount} props in ${responseTime}ms${error ? ` - ${error}` : ""}`,
    );
  }

  async pollSport(sport: string): Promise<void> {
    const startTime = Date.now();
    let success = false;
    let propsCount = 0;
    let error: string | undefined;

    try {
      const config = await this.loadConfig();

      // Fetch data from SportGameOdds API
      const apiResponse = await this.fetchFromSportGameOdds(sport);

      // Process player props
      const processedProps = await this.processPlayerProps(
        apiResponse,
        sport,
        config.max_props_per_request,
      );
      propsCount = processedProps.length;

      // Update cache
      const cacheKey = `player-props-${sport}`;
      await this.updateCache(
        cacheKey,
        "player-props",
        sport,
        processedProps,
        config.cache_ttl_seconds,
      );

      success = true;
      console.log(`Successfully polled ${sport}: ${propsCount} props cached`);
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
      console.error(`Failed to poll ${sport}:`, error);
    } finally {
      const responseTime = Date.now() - startTime;
      await this.logPollingActivity(sport, success, responseTime, propsCount, error);
    }
  }

  async pollAllSports(): Promise<void> {
    const config = await this.loadConfig();
    console.log(`Starting background polling for sports: ${config.enabled_sports.join(", ")}`);

    // Poll each sport sequentially to avoid overwhelming the API
    for (const sport of config.enabled_sports) {
      await this.pollSport(sport);

      // Small delay between sports to be respectful to the API
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("Completed polling cycle for all sports");
  }

  async startPolling(): Promise<void> {
    if (this.isPolling) {
      console.log("Polling already active");
      return;
    }

    const config = await this.loadConfig();
    this.isPolling = true;

    console.log(`Starting background polling every ${config.polling_interval_seconds} seconds`);

    // Initial poll
    await this.pollAllSports();

    // Set up interval
    this.pollInterval = setInterval(async () => {
      if (this.isPolling) {
        await this.pollAllSports();
      }
    }, config.polling_interval_seconds * 1000);
  }

  stopPolling(): void {
    console.log("Stopping background polling");
    this.isPolling = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  getStatus() {
    return {
      isPolling: this.isPolling,
      config: this.config,
      nextPoll: this.pollInterval
        ? new Date(Date.now() + (this.config?.polling_interval_seconds || 30) * 1000)
        : null,
    };
  }
}

// Global poller instance
const poller = new BackgroundPollerService();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "status";

    switch (action) {
      case "start":
        await poller.startPolling();
        return new Response(
          JSON.stringify({
            success: true,
            message: "Background polling started",
            status: poller.getStatus(),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );

      case "stop":
        poller.stopPolling();
        return new Response(
          JSON.stringify({
            success: true,
            message: "Background polling stopped",
            status: poller.getStatus(),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );

      case "poll-now":
        await poller.pollAllSports();
        return new Response(
          JSON.stringify({
            success: true,
            message: "Manual polling completed",
            status: poller.getStatus(),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );

      case "status":
      default:
        return new Response(
          JSON.stringify({
            success: true,
            status: poller.getStatus(),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
  } catch (error) {
    console.error("Error in background-poller function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
