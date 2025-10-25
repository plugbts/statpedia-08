// Multi-League Multi-Season Worker with Backfill Support
// Handles both real-time ingestion and historical backfill operations

import {
  runMultiSeasonBackfill,
  runRecentSeasonsBackfill,
  runFullHistoricalBackfill,
  runLeagueSpecificBackfill,
  runSeasonSpecificBackfill,
  runProgressiveBackfill,
} from "./jobs/multiBackfill";
import { runIngestion, runSingleLeagueIngestion } from "./jobs/ingest";
import {
  runPerformanceIngestion,
  runSingleLeaguePerformanceIngestion,
  runHistoricalPerformanceIngestion,
} from "./jobs/performanceIngestion";
import { fetchAllLeaguesEvents } from "./lib/sportsGameOddsPerformanceFetcher";
import {
  LEAGUES,
  getActiveLeagues,
  getAllSeasons,
  getActiveLeagueSeasonPairs,
} from "./config/leagues";
import { withCORS, handleOptions } from "./cors";
import { normalizeDate, normalizeLeague, isDateMatch } from "./normalizers";
import { initializePropTypeSync, normalizePropType } from "./propTypeSync";
import { initializeSupportedProps, loadSupportedProps, SupportedProps } from "./supportedProps";
import { filterPropsByLeague, filterGameLogsByLeague } from "./ingestionFilter";
import {
  initializeCoverageReport,
  generateCoverageReport,
  getCoverageSummary,
} from "./coverageReport";
import { getFixedPlayerPropsWithAnalytics } from "./fixes";
import { cleanPlayerNames } from "./playerNames";
import { enrichTeams } from "./teams";
import { buildProps, ingestAndEnrich, persistProps, type EnrichedProp } from "./fetchProps";
import { getAuthService } from "./auth-service";
// import { getPlayerPropsFixed } from "./player-props-fixed"; // No longer needed - using direct view fetch

// Initialize prop type sync and supported props at worker startup
let propTypeSyncInitialized = false;
let supportedProps: SupportedProps = {};

// Supabase fully removed: provide a stub to prevent build errors if legacy paths are hit
const supabaseFetch = async (..._args: any[]): Promise<any> => {
  throw new Error("Supabase paths have been removed from the worker");
};

export default {
  async fetch(req: Request, env: any) {
    try {
      // Initialize worker-local state (Supabase removed)
      if (!propTypeSyncInitialized) {
        try {
          supportedProps = {};
          propTypeSyncInitialized = true;
          console.log("✅ Worker initialized (Supabase removed)");
        } catch (error) {
          console.warn("⚠️ Worker init warning:", error);
        }
      }

      const url = new URL(req.url);
      const origin = req.headers.get("Origin") || "*";

      // Handle CORS preflight
      if (req.method === "OPTIONS") {
        return handleOptions(req, origin);
      }

      // Helper function to wrap responses with CORS
      const corsResponse = (
        body: any,
        status: number = 200,
        headers: Record<string, string> = {},
      ) => {
        const response = new Response(typeof body === "string" ? body : JSON.stringify(body), {
          status,
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
        });
        return withCORS(response, origin);
      };

      // Default response with available endpoints
      if (url.pathname === "/") {
        return corsResponse({
          message: "Multi-League Multi-Season Props Ingestion Worker",
          endpoints: {
            auth: [
              "/api/auth/signup",
              "/api/auth/login",
              "/api/auth/logout",
              "/api/auth/refresh",
              "/api/auth/me",
            ],
            ingestion: ["/ingest", "/ingest/{league}"],
            backfill: [
              "/backfill-all",
              "/backfill-recent",
              "/backfill-full",
              "/backfill-league/{league}",
              "/backfill-season/{season}",
            ],
            performance: [
              "/performance-ingest",
              "/performance-ingest/{league}",
              "/performance-historical",
            ],
            analytics: [
              "/refresh-analytics",
              "/incremental-analytics-refresh",
              "/analytics/streaks",
              "/analytics/defensive-rankings",
              "/analytics/matchup-rank",
              "/analytics/last-5",
              "/analytics/last-10",
              "/analytics/last-20",
              "/analytics/h2h",
            ],
            verification: ["/verify-backfill", "/verify-analytics"],
            status: ["/status", "/leagues", "/seasons"],
            debug: [
              "/debug-api",
              "/debug-comprehensive",
              "/debug-json",
              "/debug-extraction",
              "/debug-insert",
              "/debug-schema",
              "/debug-streaks",
              "/debug-streak-counts",
              "/debug-insertion",
              "/debug-env",
              "/debug-rls",
              "/debug-events",
              "/debug-data-check",
              "/debug-performance-diagnostic",
            ],
          },
          leagues: getActiveLeagues().map((l) => l.id),
          seasons: getAllSeasons(),
          features: [
            "Multi-league ingestion",
            "Multi-season backfill",
            "Analytics computation",
            "Fallback logic",
            "Progressive backfill",
            "Authentication system",
          ],
        });
      }

      // Handle authentication endpoints
      if (url.pathname.startsWith("/api/auth/")) {
        try {
          const authService = getAuthService(env);

          // Get client info
          const ip_address =
            req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
          const user_agent = req.headers.get("user-agent") || "unknown";
          const auditContext = { ip_address, user_agent };

          // Handle different auth endpoints
          if (url.pathname === "/api/auth/signup" && req.method === "POST") {
            const body = (await req.json()) as unknown;
            const { email, password, display_name, displayName } = (body ?? {}) as {
              email?: string;
              password?: string;
              display_name?: string;
              displayName?: string;
            };

            if (!email || !password) {
              return withCORS(
                corsResponse(
                  {
                    success: false,
                    error: "Email and password are required",
                  },
                  400,
                ),
                origin,
              );
            }

            const tokens = await authService.signup(
              {
                email,
                password,
                display_name: display_name || displayName,
              },
              auditContext,
            );

            return withCORS(
              corsResponse({
                success: true,
                data: {
                  token: tokens.token,
                  refreshToken: tokens.refreshToken,
                  expiresIn: 900, // 15 minutes in seconds
                },
              }),
              origin,
            );
          } else if (url.pathname === "/api/auth/login" && req.method === "POST") {
            const body = (await req.json()) as unknown;
            const { email, password } = (body ?? {}) as { email?: string; password?: string };

            if (!email || !password) {
              return withCORS(
                corsResponse(
                  {
                    success: false,
                    error: "Email and password are required",
                  },
                  400,
                ),
                origin,
              );
            }

            const tokens = await authService.login({ email, password }, auditContext);

            return withCORS(
              corsResponse({
                success: true,
                data: {
                  token: tokens.token,
                  refreshToken: tokens.refreshToken,
                  expiresIn: 900, // 15 minutes in seconds
                },
              }),
              origin,
            );
          } else if (url.pathname === "/api/auth/me" && req.method === "GET") {
            const authHeader = req.headers.get("authorization");

            if (!authHeader || !authHeader.startsWith("Bearer ")) {
              return withCORS(
                corsResponse(
                  {
                    success: false,
                    error: "Authorization header required",
                  },
                  401,
                ),
                origin,
              );
            }

            // Simple JWT verification for Cloudflare Workers
            const token = authHeader.substring(7);
            const parts = token.split(".");
            if (parts.length !== 3) {
              return withCORS(
                corsResponse(
                  {
                    success: false,
                    error: "Invalid token format",
                  },
                  401,
                ),
                origin,
              );
            }

            try {
              const payload = JSON.parse(atob(parts[1]));
              const userId = payload.sub;

              const user = await authService.getUserById(userId);
              if (!user) {
                return withCORS(
                  corsResponse(
                    {
                      success: false,
                      error: "User not found",
                    },
                    404,
                  ),
                  origin,
                );
              }

              return withCORS(
                corsResponse({
                  success: true,
                  data: user,
                }),
                origin,
              );
            } catch (error) {
              return withCORS(
                corsResponse(
                  {
                    success: false,
                    error: "Invalid token",
                  },
                  401,
                ),
                origin,
              );
            }
          } else if (url.pathname === "/api/auth/logout" && req.method === "POST") {
            // Simple logout - in production you'd want to invalidate the refresh token
            return withCORS(
              corsResponse({
                success: true,
                message: "Logged out successfully",
              }),
              origin,
            );
          } else {
            return withCORS(
              corsResponse(
                {
                  success: false,
                  error: "Method not allowed",
                },
                405,
              ),
              origin,
            );
          }
        } catch (error: any) {
          console.error("Auth endpoint error:", error);
          return withCORS(
            corsResponse(
              {
                success: false,
                error: error.message || "Internal server error",
              },
              500,
            ),
            origin,
          );
        }
      }

      // Handle analytics refresh
      if (url.pathname === "/refresh-analytics") {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");
          console.log("🔄 Refreshing analytics views...");

          const result = await supabaseFetch(env, "rpc/refresh_analytics_views", {
            method: "POST",
            body: JSON.stringify({}),
          });

          return new Response(
            JSON.stringify({
              success: true,
              message: "Analytics views refreshed successfully",
              timestamp: new Date().toISOString(),
            }),
            {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        }
      }

      // Handle incremental analytics refresh
      if (url.pathname === "/incremental-analytics-refresh") {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");
          const daysBack = parseInt(url.searchParams.get("days") || "2");

          console.log(`🔄 Running incremental analytics refresh for last ${daysBack} days...`);

          const result = await supabaseFetch(env, "rpc/incremental_analytics_refresh", {
            method: "POST",
            body: JSON.stringify({ days_back: daysBack }),
          });

          return new Response(
            JSON.stringify({
              success: true,
              message: `Incremental analytics refresh completed for last ${daysBack} days`,
              timestamp: new Date().toISOString(),
              daysBack: daysBack,
            }),
            {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        }
      }

      // Handle conflict key audit
      if (url.pathname === "/debug-conflict-audit") {
        return corsResponse(
          {
            success: false,
            message: "Endpoint disabled: NO SUPABASE",
          },
          501,
        );
      }

      // Handle TRUE streak analysis query
      if (url.pathname === "/analytics/streaks") {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");
          const { calculateStreaks } = await import("./lib/streakCalculator");
          const leagueParam = url.searchParams.get("league") || "all";
          const league = leagueParam.toLowerCase();
          const limit = parseInt(url.searchParams.get("limit") || "50");

          console.log(`📊 Computing TRUE streaks in Worker for ${league}...`);

          // --- Helpers ---
          const normalizeDate = (d: string) => d.split("T")[0];
          const inFilter = (values: string[]) =>
            values && values.length > 0 ? `in.(${values.map((v) => `"${v}"`).join(",")})` : null;

          // --- Fetch raw game logs ---
          let query = "player_game_logs";
          const params: string[] = [];
          if (league !== "all") {
            params.push(`league=eq.${league}`);
          }
          params.push(`order=date.desc`);

          if (params.length > 0) {
            query += `?${params.join("&")}`;
          }

          const gameLogs = (await supabaseFetch(env, query, { method: "GET" })) as any[];

          console.log(`📊 Fetched ${gameLogs?.length || 0} game logs`);
          if (gameLogs && gameLogs.length > 0) {
            console.log(`📊 Sample game log:`, JSON.stringify(gameLogs[0], null, 2));
          }

          if (!gameLogs || gameLogs.length === 0) {
            return new Response(
              JSON.stringify({
                success: true,
                data: [],
                league,
                limit,
                message: "No game data found",
                timestamp: new Date().toISOString(),
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              },
            );
          }

          // --- Fetch corresponding prop lines ---
          const playerIds = [...new Set(gameLogs.map((g) => g.player_id))];
          const propTypes = [...new Set(gameLogs.map((g) => g.prop_type))];
          const dates = [...new Set(gameLogs.map((g) => normalizeDate(g.date)))];

          // --- Build filters ---
          const filters: string[] = [];

          const playerFilter = inFilter(playerIds);
          if (playerFilter) filters.push(`player_id=${playerFilter}`);

          const propFilter = inFilter(propTypes);
          if (propFilter) filters.push(`prop_type=${propFilter}`);

          const dateFilter = inFilter(dates);
          if (dateFilter) filters.push(`date=${dateFilter}`);

          // Only add league filter if not "all"
          if (league !== "all") {
            filters.push(`league=eq.${league.toLowerCase()}`);
          }

          // --- Construct query ---
          const propsQuery = `proplines${filters.length ? "?" + filters.join("&") : ""}`;

          // --- Fetch ---
          const propLines = (await supabaseFetch(env, propsQuery, { method: "GET" })) as any[];

          console.log(`📊 Player Props fetched: ${propLines?.length || 0}`);
          if (propLines && propLines.length > 0) {
            console.log("📊 Sample prop line:", JSON.stringify(propLines[0], null, 2));
          }

          // --- Diagnostic helper ---
          function logMismatch(gameLog: any, propLines: any[]) {
            // Find "closest" candidates by player_id
            const candidates = propLines.filter((p: any) => p.player_id === gameLog.player_id);

            console.log("⚠️ Mismatch detected for player:", gameLog.player_id);
            console.log("  GameLog:", {
              player_id: gameLog.player_id,
              prop_type: gameLog.prop_type,
              date: gameLog.date,
              league: gameLog.league,
              value: gameLog.value,
            });

            if (candidates.length === 0) {
              console.log("  ❌ No propLines found for this player at all.");
              return;
            }

            console.log("  🔎 Closest propLine candidates:");
            candidates.slice(0, 3).forEach((p: any, idx: number) => {
              console.log(`   Candidate ${idx + 1}:`, {
                player_id: p.player_id,
                prop_type: p.prop_type,
                date: p.date,
                league: p.league,
                line: p.line,
              });
            });
          }

          // --- Join game logs with prop lines ---
          const gameResults = gameLogs
            .map((gameLog) => {
              const propLine = propLines?.find(
                (prop) =>
                  prop.player_id === gameLog.player_id &&
                  prop.prop_type === gameLog.prop_type &&
                  normalizeDate(prop.date) === normalizeDate(gameLog.date) &&
                  prop.league === gameLog.league,
              );

              if (!propLine) {
                logMismatch(gameLog, propLines || []);
                return null;
              }

              return {
                player_id: gameLog.player_id,
                player_name: gameLog.player_name,
                team: gameLog.team,
                prop_type: gameLog.prop_type,
                league: gameLog.league,
                date: normalizeDate(gameLog.date),
                hit_result: gameLog.value >= propLine.line ? 1 : 0,
              };
            })
            .filter((result): result is NonNullable<typeof result> => result !== null);

          console.log(`📊 Created ${gameResults.length} game results`);

          // --- Calculate streaks ---
          const streaks = calculateStreaks(gameResults);

          // --- Apply league filter ---
          const filteredStreaks =
            league !== "all" ? streaks.filter((s) => s.league === league) : streaks;

          // --- Apply limit ---
          const limitedStreaks = filteredStreaks.slice(0, limit);

          console.log(
            `📊 Computed ${limitedStreaks.length} streaks (${filteredStreaks.length} total)`,
          );

          return new Response(
            JSON.stringify({
              success: true,
              data: limitedStreaks,
              league,
              limit,
              total_found: filteredStreaks.length,
              message:
                limitedStreaks.length === 0 ? "No streaks found" : "Streaks computed successfully",
              timestamp: new Date().toISOString(),
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle debug streak analysis
      if (url.pathname === "/debug-streaks") {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");
          const league = url.searchParams.get("league") || "all";
          const limit = parseInt(url.searchParams.get("limit") || "20");

          console.log(`🔍 Fetching debug streak analysis for ${league}...`);

          let query = "debug_streak_summary";
          const params: string[] = [];
          if (league !== "all") {
            params.push(`league=eq.${league}`);
          }
          params.push(`order=current_streak.desc`);
          params.push(`limit=${limit}`);

          if (params.length > 0) {
            query += `?${params.join("&")}`;
          }

          const result = await supabaseFetch(env, query as any, {
            method: "GET",
          });

          return new Response(
            JSON.stringify({
              success: true,
              data: result,
              league: league,
              limit: limit,
              timestamp: new Date().toISOString(),
            }),
            {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        } catch (error) {
          console.error("❌ Debug streaks error:", error);
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        }
      }

      // Handle direct database query for debugging
      if (url.pathname === "/debug-query") {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");
          const table = url.searchParams.get("table") || "player_game_logs";
          const limit = parseInt(url.searchParams.get("limit") || "5");

          console.log(`🔍 Direct query to ${table} table...`);

          const result = await supabaseFetch(env, `${table}?limit=${limit}`, {
            method: "GET",
          });

          console.log(`📊 Query result:`, JSON.stringify(result, null, 2));

          return new Response(
            JSON.stringify({
              success: true,
              table: table,
              limit: limit,
              count: result?.length || 0,
              data: result,
              timestamp: new Date().toISOString(),
            }),
            {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        } catch (error) {
          console.error("❌ Direct query error:", error);
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        }
      }

      // Handle debug streak counts
      if (url.pathname === "/debug-streak-counts") {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");
          const league = url.searchParams.get("league") || "all";

          console.log(`🔍 Fetching debug streak counts for ${league}...`);

          let query = "debug_streak_counts";
          const params: string[] = [];
          if (league !== "all") {
            params.push(`league=eq.${league}`);
          }
          params.push(`order=current_streak.desc`);

          if (params.length > 0) {
            query += `?${params.join("&")}`;
          }

          const result = await supabaseFetch(env, query as any, {
            method: "GET",
          });

          return new Response(
            JSON.stringify({
              success: true,
              data: result,
              league: league,
              timestamp: new Date().toISOString(),
            }),
            {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        } catch (error) {
          console.error("❌ Debug streak counts error:", error);
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        }
      }

      // Handle matchup rankings analytics
      if (url.pathname === "/analytics/matchup-rank") {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");
          const league = url.searchParams.get("league") || "all";
          const limit = parseInt(url.searchParams.get("limit") || "50");

          console.log(`📊 Computing matchup rankings for ${league}...`);

          // Fetch game logs and prop lines
          let gameLogsQuery = "player_game_logs";
          if (league !== "all") {
            gameLogsQuery += `?league=eq.${league}`;
          }

          const gameLogs = (await supabaseFetch(env, gameLogsQuery, { method: "GET" })) as any[];

          if (!gameLogs || gameLogs.length === 0) {
            return new Response(
              JSON.stringify({
                success: true,
                data: [],
                league,
                limit,
                message: "No game data found",
                timestamp: new Date().toISOString(),
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              },
            );
          }

          // --- Helpers ---
          const normalizeDate = (d: string) => d.split("T")[0];
          const inFilter = (values: string[]) =>
            values && values.length > 0 ? `in.(${values.map((v) => `"${v}"`).join(",")})` : null;

          // --- Build filters ---
          const filters: string[] = [];

          const playerIds = [...new Set(gameLogs.map((g) => g.player_id))];
          const propTypes = [...new Set(gameLogs.map((g) => g.prop_type))];
          const dates = [...new Set(gameLogs.map((g) => normalizeDate(g.date)))];

          const playerFilter = inFilter(playerIds);
          if (playerFilter) filters.push(`player_id=${playerFilter}`);

          const propFilter = inFilter(propTypes);
          if (propFilter) filters.push(`prop_type=${propFilter}`);

          const dateFilter = inFilter(dates);
          if (dateFilter) filters.push(`date=${dateFilter}`);

          // Only add league filter if not "all"
          if (league !== "all") {
            filters.push(`league=eq.${league.toLowerCase()}`);
          }

          // --- Construct query ---
          const propsQuery = `proplines${filters.length ? "?" + filters.join("&") : ""}`;

          // --- Fetch ---
          const propLines = (await supabaseFetch(env, propsQuery, { method: "GET" })) as any[];

          console.log(`📊 Player Props fetched: ${propLines?.length || 0}`);
          if (propLines && propLines.length > 0) {
            console.log("📊 Sample prop line:", JSON.stringify(propLines[0], null, 2));
          }

          // Calculate matchup performance
          const matchupRankings = gameLogs
            .map((gameLog) => {
              const propLine = propLines?.find(
                (prop) =>
                  prop.player_id === gameLog.player_id &&
                  prop.prop_type === gameLog.prop_type &&
                  prop.date.split("T")[0] === gameLog.date.split("T")[0] &&
                  prop.league === gameLog.league,
              );

              if (!propLine) return null;

              const hit = gameLog.value >= propLine.line ? 1 : 0;
              const margin = Math.abs(gameLog.value - propLine.line);

              return {
                player_id: gameLog.player_id,
                player_name: gameLog.player_name,
                team: gameLog.team,
                prop_type: gameLog.prop_type,
                league: gameLog.league,
                date: gameLog.date.split("T")[0],
                line: propLine.line,
                actual: gameLog.value,
                hit,
                margin,
                opponent: gameLog.opponent || "Unknown",
              };
            })
            .filter(Boolean)
            .sort((a, b) => {
              if (!a || !b) return 0;
              return b.hit - a.hit || a.margin - b.margin;
            })
            .slice(0, limit);

          return new Response(
            JSON.stringify({
              success: true,
              data: matchupRankings,
              league,
              limit,
              total_found: matchupRankings.length,
              message: "Matchup rankings computed successfully",
              timestamp: new Date().toISOString(),
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle last 5 games analytics
      if (url.pathname === "/analytics/last-5") {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");
          const league = url.searchParams.get("league") || "all";
          const limit = parseInt(url.searchParams.get("limit") || "50");

          console.log(`📊 Computing last 5 games performance for ${league}...`);

          // Fetch recent game logs
          let query = "player_game_logs";
          const params: string[] = [];
          if (league !== "all") {
            params.push(`league=eq.${league}`);
          }
          params.push(`order=date.desc`);

          if (params.length > 0) {
            query += `?${params.join("&")}`;
          }

          const gameLogs = (await supabaseFetch(env, query, { method: "GET" })) as any[];

          if (!gameLogs || gameLogs.length === 0) {
            return new Response(
              JSON.stringify({
                success: true,
                data: [],
                league,
                limit,
                message: "No game data found",
                timestamp: new Date().toISOString(),
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              },
            );
          }

          // Group by player and get last 5 games
          const playerStats = new Map();

          gameLogs.forEach((log: any) => {
            const key = `${log.player_id}-${log.prop_type}`;
            if (!playerStats.has(key)) {
              playerStats.set(key, {
                player_id: log.player_id,
                player_name: log.player_name,
                team: log.team,
                prop_type: log.prop_type,
                league: log.league,
                games: [],
              });
            }

            const stats = playerStats.get(key);
            if (stats.games.length < 5) {
              stats.games.push({
                date: log.date.split("T")[0],
                value: log.value,
                opponent: log.opponent || "Unknown",
              });
            }
          });

          // Calculate performance metrics
          const last5Performance = Array.from(playerStats.values())
            .map((player) => {
              const games = player.games;
              const avgValue = games.reduce((sum, game) => sum + game.value, 0) / games.length;
              const totalGames = games.length;

              return {
                ...player,
                total_games: totalGames,
                avg_value: Math.round(avgValue * 100) / 100,
                latest_value: games[0]?.value || 0,
                latest_date: games[0]?.date || null,
                trend:
                  games.length >= 2
                    ? games[0].value > games[1].value
                      ? "up"
                      : games[0].value < games[1].value
                        ? "down"
                        : "stable"
                    : "insufficient_data",
              };
            })
            .filter((player) => player.total_games > 0)
            .sort((a, b) => b.avg_value - a.avg_value)
            .slice(0, limit);

          return new Response(
            JSON.stringify({
              success: true,
              data: last5Performance,
              league,
              limit,
              total_found: last5Performance.length,
              message: "Last 5 games performance computed successfully",
              timestamp: new Date().toISOString(),
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle last 10 games analytics
      if (url.pathname === "/analytics/last-10") {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");
          const league = url.searchParams.get("league") || "all";
          const limit = parseInt(url.searchParams.get("limit") || "50");

          console.log(`📊 Computing last 10 games performance for ${league}...`);

          // Fetch recent game logs
          let query = "player_game_logs";
          const params: string[] = [];
          if (league !== "all") {
            params.push(`league=eq.${league}`);
          }
          params.push(`order=date.desc`);

          if (params.length > 0) {
            query += `?${params.join("&")}`;
          }

          const gameLogs = (await supabaseFetch(env, query, { method: "GET" })) as any[];

          if (!gameLogs || gameLogs.length === 0) {
            return new Response(
              JSON.stringify({
                success: true,
                data: [],
                league,
                limit,
                message: "No game data found",
                timestamp: new Date().toISOString(),
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              },
            );
          }

          // Group by player and get last 10 games
          const playerStats = new Map();

          gameLogs.forEach((log: any) => {
            const key = `${log.player_id}-${log.prop_type}`;
            if (!playerStats.has(key)) {
              playerStats.set(key, {
                player_id: log.player_id,
                player_name: log.player_name,
                team: log.team,
                prop_type: log.prop_type,
                league: log.league,
                games: [],
              });
            }

            const stats = playerStats.get(key);
            if (stats.games.length < 10) {
              stats.games.push({
                date: log.date.split("T")[0],
                value: log.value,
                opponent: log.opponent || "Unknown",
              });
            }
          });

          // Calculate performance metrics
          const last10Performance = Array.from(playerStats.values())
            .map((player) => {
              const games = player.games;
              const avgValue = games.reduce((sum, game) => sum + game.value, 0) / games.length;
              const totalGames = games.length;
              const recent5 = games.slice(0, Math.min(5, games.length));
              const earlier5 = games.slice(5, Math.min(10, games.length));

              const recentAvg = recent5.reduce((sum, game) => sum + game.value, 0) / recent5.length;
              const earlierAvg =
                earlier5.length > 0
                  ? earlier5.reduce((sum, game) => sum + game.value, 0) / earlier5.length
                  : recentAvg;

              return {
                ...player,
                total_games: totalGames,
                avg_value: Math.round(avgValue * 100) / 100,
                recent_5_avg: Math.round(recentAvg * 100) / 100,
                earlier_5_avg: Math.round(earlierAvg * 100) / 100,
                improvement: Math.round((recentAvg - earlierAvg) * 100) / 100,
                latest_value: games[0]?.value || 0,
                latest_date: games[0]?.date || null,
              };
            })
            .filter((player) => player.total_games > 0)
            .sort((a, b) => b.avg_value - a.avg_value)
            .slice(0, limit);

          return new Response(
            JSON.stringify({
              success: true,
              data: last10Performance,
              league,
              limit,
              total_found: last10Performance.length,
              message: "Last 10 games performance computed successfully",
              timestamp: new Date().toISOString(),
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle last 20 games analytics
      if (url.pathname === "/analytics/last-20") {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");
          const league = url.searchParams.get("league") || "all";
          const limit = parseInt(url.searchParams.get("limit") || "50");

          console.log(`📊 Computing last 20 games performance for ${league}...`);

          // Fetch recent game logs
          let query = "player_game_logs";
          const params: string[] = [];
          if (league !== "all") {
            params.push(`league=eq.${league}`);
          }
          params.push(`order=date.desc`);

          if (params.length > 0) {
            query += `?${params.join("&")}`;
          }

          const gameLogs = (await supabaseFetch(env, query, { method: "GET" })) as any[];

          if (!gameLogs || gameLogs.length === 0) {
            return new Response(
              JSON.stringify({
                success: true,
                data: [],
                league,
                limit,
                message: "No game data found",
                timestamp: new Date().toISOString(),
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              },
            );
          }

          // Group by player and get last 20 games
          const playerStats = new Map();

          gameLogs.forEach((log: any) => {
            const key = `${log.player_id}-${log.prop_type}`;
            if (!playerStats.has(key)) {
              playerStats.set(key, {
                player_id: log.player_id,
                player_name: log.player_name,
                team: log.team,
                prop_type: log.prop_type,
                league: log.league,
                games: [],
              });
            }

            const stats = playerStats.get(key);
            if (stats.games.length < 20) {
              stats.games.push({
                date: log.date.split("T")[0],
                value: log.value,
                opponent: log.opponent || "Unknown",
              });
            }
          });

          // Calculate performance metrics
          const last20Performance = Array.from(playerStats.values())
            .map((player) => {
              const games = player.games;
              const avgValue = games.reduce((sum, game) => sum + game.value, 0) / games.length;
              const totalGames = games.length;

              // Calculate consistency (lower standard deviation = more consistent)
              const variance =
                games.reduce((sum, game) => sum + Math.pow(game.value - avgValue, 2), 0) /
                games.length;
              const standardDeviation = Math.sqrt(variance);

              // Calculate trends
              const recent10 = games.slice(0, Math.min(10, games.length));
              const earlier10 = games.slice(10, Math.min(20, games.length));

              const recentAvg =
                recent10.reduce((sum, game) => sum + game.value, 0) / recent10.length;
              const earlierAvg =
                earlier10.length > 0
                  ? earlier10.reduce((sum, game) => sum + game.value, 0) / earlier10.length
                  : recentAvg;

              return {
                ...player,
                total_games: totalGames,
                avg_value: Math.round(avgValue * 100) / 100,
                recent_10_avg: Math.round(recentAvg * 100) / 100,
                earlier_10_avg: Math.round(earlierAvg * 100) / 100,
                improvement: Math.round((recentAvg - earlierAvg) * 100) / 100,
                consistency: Math.round(standardDeviation * 100) / 100,
                latest_value: games[0]?.value || 0,
                latest_date: games[0]?.date || null,
              };
            })
            .filter((player) => player.total_games > 0)
            .sort((a, b) => b.avg_value - a.avg_value)
            .slice(0, limit);

          return new Response(
            JSON.stringify({
              success: true,
              data: last20Performance,
              league,
              limit,
              total_found: last20Performance.length,
              message: "Last 20 games performance computed successfully",
              timestamp: new Date().toISOString(),
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle head-to-head analytics
      if (url.pathname === "/analytics/h2h") {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");
          const league = url.searchParams.get("league") || "all";
          const limit = parseInt(url.searchParams.get("limit") || "50");

          console.log(`📊 Computing head-to-head analytics for ${league}...`);

          // Fetch game logs
          let query = "player_game_logs";
          const params: string[] = [];
          if (league !== "all") {
            params.push(`league=eq.${league}`);
          }
          params.push(`order=date.desc`);

          if (params.length > 0) {
            query += `?${params.join("&")}`;
          }

          const gameLogs = (await supabaseFetch(env, query, { method: "GET" })) as any[];

          if (!gameLogs || gameLogs.length === 0) {
            return new Response(
              JSON.stringify({
                success: true,
                data: [],
                league,
                limit,
                message: "No game data found",
                timestamp: new Date().toISOString(),
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              },
            );
          }

          // Group by player-opponent combinations
          const h2hStats = new Map();

          gameLogs.forEach((log: any) => {
            const opponent = log.opponent || "Unknown";
            const key = `${log.player_id}-${opponent}-${log.prop_type}`;

            if (!h2hStats.has(key)) {
              h2hStats.set(key, {
                player_id: log.player_id,
                player_name: log.player_name,
                team: log.team,
                opponent: opponent,
                prop_type: log.prop_type,
                league: log.league,
                games: [],
                total_games: 0,
                avg_value: 0,
              });
            }

            const stats = h2hStats.get(key);
            stats.games.push({
              date: log.date.split("T")[0],
              value: log.value,
            });
            stats.total_games = stats.games.length;
            stats.avg_value =
              stats.games.reduce((sum, game) => sum + game.value, 0) / stats.games.length;
          });

          // Convert to array and sort by total games and average value
          const h2hRankings = Array.from(h2hStats.values())
            .filter((stats) => stats.total_games >= 2) // Only include players with multiple games vs same opponent
            .sort((a, b) => b.total_games - a.total_games || b.avg_value - a.avg_value)
            .slice(0, limit);

          return new Response(
            JSON.stringify({
              success: true,
              data: h2hRankings,
              league,
              limit,
              total_found: h2hRankings.length,
              message: "Head-to-head analytics computed successfully",
              timestamp: new Date().toISOString(),
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle defensive rankings query
      if (url.pathname === "/analytics/defensive-rankings") {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");
          const league = url.searchParams.get("league") || "all";
          const propType = url.searchParams.get("prop_type") || "all";

          console.log(`📊 Fetching defensive rankings for ${league} - ${propType}...`);

          let query = "defensive_matchup_rankings";
          const filters: string[] = [];

          if (league !== "all") {
            filters.push(`league=eq.${league}`);
          }
          if (propType !== "all") {
            filters.push(`prop_type=eq.${propType}`);
          }

          if (filters.length > 0) {
            query += "?" + filters.join("&");
          }
          query += "&order=defensive_percentile.desc";

          const result = await supabaseFetch(env, query, {
            method: "GET",
          });

          return new Response(
            JSON.stringify({
              success: true,
              data: result,
              league: league,
              propType: propType,
              timestamp: new Date().toISOString(),
            }),
            {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        }
      }

      // Handle simple test endpoint for debugging
      if (url.pathname === "/api/test-nfl") {
        const { supabaseFetch } = await import("./supabaseFetch");
        // Test NFL data query
        const data = await supabaseFetch(env, `player_props_fixed?league=eq.nfl&limit=5`);

        return corsResponse({
          success: true,
          query: "player_props_fixed?league=eq.nfl&limit=5",
          dataCount: data?.length || 0,
          sampleData: data?.[0] || null,
          timestamp: new Date().toISOString(),
        });
      }

      // Handle simple test endpoint for debugging
      if (url.pathname === "/api/test-mlb") {
        const { supabaseFetch } = await import("./supabaseFetch");
        // Try different query formats
        const data1 = await supabaseFetch(
          env,
          `player_props_fixed?league=eq.mlb&prop_date=eq.2025-10-10&limit=200`,
        );
        const data2 = await supabaseFetch(env, `player_props_fixed?league=eq.mlb&limit=200`);

        const data = data1;

        return corsResponse({
          success: true,
          count1: data1?.length || 0,
          count2: data2?.length || 0,
          data1: data1?.slice(0, 3) || [],
          data2: data2?.slice(0, 3) || [],
        });
      }

      // Debug endpoint to inspect SportsGameOdds API response
      if (url.pathname === "/debug/sgo-api") {
        try {
          const league = url.searchParams.get("league")?.toLowerCase() || "nfl";
          const { fetchEventsWithProps } = await import("./lib/api");

          // Import the getPlayerPropOddIDs function
          const getPlayerPropOddIDs = (league: string): string => {
            const oddIDsMap: Record<string, string> = {
              nfl: "rushing_yards-PLAYER_ID-game-ou-over,passing_yards-PLAYER_ID-game-ou-over,receiving_yards-PLAYER_ID-game-ou-over,touchdowns-PLAYER_ID-game-ou-over",
              nba: "points-PLAYER_ID-game-ou-over,rebounds-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,steals-PLAYER_ID-game-ou-over,blocks-PLAYER_ID-game-ou-over",
              mlb: "hits-PLAYER_ID-game-ou-over,runs-PLAYER_ID-game-ou-over,rbis-PLAYER_ID-game-ou-over,strikeouts-PLAYER_ID-game-ou-over",
              nhl: "shots_on_goal-PLAYER_ID-game-ou-over,goals-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,points-PLAYER_ID-game-ou-over",
              epl: "goals-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,shots-PLAYER_ID-game-ou-over",
              ncaaf:
                "rushing_yards-PLAYER_ID-game-ou-over,passing_yards-PLAYER_ID-game-ou-over,receiving_yards-PLAYER_ID-game-ou-over",
              ncaab:
                "points-PLAYER_ID-game-ou-over,rebounds-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over",
            };
            return oddIDsMap[league.toLowerCase()] || oddIDsMap["nfl"];
          };

          console.log(`🔍 [DEBUG] Fetching SGO API response for ${league}...`);
          // Get player prop oddIDs for this league
          const playerPropOddIDs = getPlayerPropOddIDs(league);
          console.log(`🔍 [DEBUG] Using oddIDs: ${playerPropOddIDs}`);
          const events = await fetchEventsWithProps(env, league.toUpperCase(), {
            limit: 5,
            // oddIDs: playerPropOddIDs  // Temporarily remove filter to see all odds
          });

          return corsResponse({
            success: true,
            league,
            eventsFound: events.length,
            sampleEvents: events.slice(0, 2).map((event) => ({
              gameId: event.gameId ?? event.id ?? event.eventID ?? null,
              homeTeamId: event.homeTeamId ?? event.homeTeamID ?? null,
              awayTeamId: event.awayTeamId ?? event.awayTeamID ?? null,
              teamId: event.teamId ?? event.teamID ?? null,
              opponentTeamId: event.opponentTeamId ?? event.opponentTeamID ?? null,
              homeTeamName: event.homeTeamName ?? event.homeTeam?.name ?? null,
              awayTeamName: event.awayTeamName ?? event.awayTeam?.name ?? null,
              teamName: event.teamName ?? event.team?.name ?? null,
              opponentName: event.opponentName ?? event.opponent?.name ?? null,
              teams: event.teams ?? null,
              game: event.game
                ? {
                    homeTeamId: event.game.homeTeamId ?? event.game.homeTeamID ?? null,
                    awayTeamId: event.game.awayTeamId ?? event.game.awayTeamID ?? null,
                    teams: event.game.teams ?? null,
                  }
                : null,
              oddsCount: event.odds ? Object.keys(event.odds).length : 0,
              oddsSample: event.odds
                ? Object.keys(event.odds)
                    .slice(0, 10)
                    .map((oddId) => {
                      const odd = event.odds[oddId];
                      return {
                        oddId,
                        teamID: odd?.teamID ?? null,
                        playerTeamID: odd?.playerTeamID ?? null,
                        playerID: odd?.playerID ?? null,
                        statID: odd?.statID ?? null,
                      };
                    })
                : null,
              // Look specifically for player props
              playerPropsOdds: event.odds
                ? Object.entries(event.odds)
                    .filter(([oddId, odd]: [string, any]) => odd?.playerID || odd?.playerId)
                    .slice(0, 5)
                    .map(([oddId, odd]: [string, any]) => ({
                      oddId,
                      playerID: odd?.playerID ?? odd?.playerId ?? null,
                      statID: odd?.statID ?? odd?.statId ?? null,
                      teamID: odd?.teamID ?? odd?.teamId ?? null,
                    }))
                : [],
            })),
          });
        } catch (error) {
          return corsResponse(
            {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            },
            500,
          );
        }
      }

      // Debug endpoint to inspect teams table
      if (url.pathname === "/debug/teams") {
        try {
          const league = url.searchParams.get("league") || "nfl";
          console.log(`🔍 DEBUG: Checking teams table for ${league}...`);

          const { data, error } = await supabaseFetch(
            env,
            `teams?league=eq.${league.toLowerCase()}`,
          );

          if (error) {
            return corsResponse(
              {
                success: false,
                error: `Teams table error: ${error.message}`,
                timestamp: new Date().toISOString(),
              },
              500,
            );
          }

          return corsResponse({
            success: true,
            data: data || [],
            totalTeams: data?.length || 0,
            league: league,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("❌ Teams debug error:", error);
          return corsResponse(
            {
              success: false,
              error: `Teams debug error: ${error instanceof Error ? error.message : String(error)}`,
              timestamp: new Date().toISOString(),
            },
            500,
          );
        }
      }

      // Debug endpoint to test team resolution directly
      if (url.pathname === "/debug/team-resolution") {
        try {
          const league = url.searchParams.get("league") || "nfl";
          console.log(`🔍 DEBUG: Testing team resolution for ${league}...`);

          // Test the team resolution logic directly
          const { loadTeamRegistry } = await import("./fetchProps");
          const { getPlayerTeam } = await import("./lib/playerTeamMap");

          const registry = await loadTeamRegistry(env, league);
          const testPlayerId = "AARON_RODGERS_1_NFL";
          const playerTeam = getPlayerTeam(testPlayerId);

          return corsResponse({
            success: true,
            testPlayerId: testPlayerId,
            playerTeam: playerTeam,
            registryKeys: Object.keys(registry),
            registryCount: Object.keys(registry).length,
            league: league,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("❌ Team resolution debug error:", error);
          return corsResponse(
            {
              success: false,
              error: `Team resolution debug error: ${error instanceof Error ? error.message : String(error)}`,
              timestamp: new Date().toISOString(),
            },
            500,
          );
        }
      }

      // Simple test endpoint to verify player mapping works
      if (url.pathname === "/debug/player-mapping") {
        try {
          const { getPlayerTeam } = await import("./lib/playerTeamMap");

          const testPlayers = ["AARON_RODGERS_1_NFL", "PATRICK_MAHOMES_1_NFL", "JOSH_ALLEN_1_NFL"];

          const results = testPlayers.map((playerId) => ({
            playerId,
            team: getPlayerTeam(playerId),
          }));

          return corsResponse({
            success: true,
            playerMappings: results,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return corsResponse(
            {
              success: false,
              error: `Player mapping test error: ${error instanceof Error ? error.message : String(error)}`,
              timestamp: new Date().toISOString(),
            },
            500,
          );
        }
      }

      // Debug endpoint to test pure worker-centric approach
      if (url.pathname === "/debug/pure-worker") {
        try {
          const league = url.searchParams.get("league") || "nfl";
          const date = url.searchParams.get("date") || "2025-10-10";

          console.log(`🧪 Testing dual-mode approach for ${league} on ${date}...`);
          const props = await ingestAndEnrich(env, league, date);

          return corsResponse({
            success: true,
            league: league,
            date: date,
            propsCount: props.length,
            sampleProps: props.slice(0, 3),
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return corsResponse(
            {
              success: false,
              error: `Pure worker test error: ${error instanceof Error ? error.message : String(error)}`,
              timestamp: new Date().toISOString(),
            },
            500,
          );
        }
      }

      // Debug endpoint to test single real row insert
      if (url.pathname === "/debug/test-single-real-row") {
        try {
          // Get a real extracted row
          const { getEventsWithFallbacks } = await import("./lib/api.js");
          const { extractPlayerProps } = await import("./lib/extract.js");
          const { mapWithDiagnostics } = await import("./lib/diagnosticMapper.js");
          const { getActiveLeagues } = await import("./config/leagues.js");

          // Get first league config
          const activeLeagues = getActiveLeagues();
          const leagueConfig = activeLeagues[0];
          const { id: leagueID, oddIDs } = leagueConfig;
          const season = 2025; // Use current season

          // Fetch events and extract props
          const { events } = await getEventsWithFallbacks(env, leagueID, season, oddIDs);
          const extractedProps = await extractPlayerProps(events, env);
          const { mapped: mappedProps } = mapWithDiagnostics(extractedProps.slice(0, 1)); // Just first row

          if (mappedProps.length === 0) {
            return corsResponse({
              success: false,
              error: "No mapped props available for testing",
              timestamp: new Date().toISOString(),
            });
          }

          const realRow = mappedProps[0];

          // Test direct insert of single real row
          const insertResponse = await supabaseFetch(env, "proplines", {
            method: "POST",
            body: [realRow] as any,
            headers: {
              Prefer: "resolution=merge-duplicates",
              "Content-Type": "application/json",
            },
          });

          return corsResponse({
            success: true,
            realRow,
            insertResponse,
            message: "Single real row insert test completed",
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return corsResponse({
            success: false,
            error: `Single real row insert test failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Debug endpoint to test single row insert
      if (url.pathname === "/debug/test-single-row") {
        try {
          const testData = [
            {
              player_id: "SINGLE_TEST_1",
              player_name: "Single Test Player",
              team: "TEST",
              opponent: "OPP",
              league: "nfl",
              season: 2025,
              game_id: "single-test-game-1",
              date: "2025-10-11",
              prop_type: "single_test_prop",
              line: 100,
              over_odds: -110,
              under_odds: -110,
              odds: null,
              sportsbook: "SportsGameOdds",
              conflict_key: "SINGLE_TEST_1|2025-10-11|single_test_prop|SportsGameOdds|nfl|2025",
            },
          ];

          // Test direct supabaseFetch call
          const response = await supabaseFetch(env, "proplines", {
            method: "POST",
            body: testData as any,
            headers: {
              Prefer: "resolution=merge-duplicates",
              "Content-Type": "application/json",
            },
          });

          return corsResponse({
            success: true,
            singleRowResult: response,
            message: "Single row insert test completed",
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return corsResponse({
            success: false,
            error: `Single row insert test failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Debug endpoint to test schema diff
      if (url.pathname === "/debug/test-schema-diff") {
        try {
          // Get a real extracted row for comparison
          const { getEventsWithFallbacks } = await import("./lib/api.js");
          const { extractPlayerProps } = await import("./lib/extract.js");
          const { mapWithDiagnostics } = await import("./lib/diagnosticMapper.js");
          const { getActiveLeagues } = await import("./config/leagues.js");

          // Get first league config
          const activeLeagues = getActiveLeagues();
          const leagueConfig = activeLeagues[0];
          const { id: leagueID, oddIDs } = leagueConfig;
          const season = 2025; // Use current season

          // Fetch events and extract props
          const { events } = await getEventsWithFallbacks(env, leagueID, season, oddIDs);
          const extractedProps = await extractPlayerProps(events, env);
          const { mapped: mappedProps } = mapWithDiagnostics(extractedProps.slice(0, 1)); // Just first row

          // Test row structure (known good) - match real data structure
          const testRow = {
            player_id: "TEST_PERSIST_2",
            player_name: "Test Persist Player 2",
            team: "TEST",
            opponent: "OPP",
            league: "nfl",
            season: 2025,
            game_id: "test-persist-game-2",
            date: "2025-10-11",
            prop_type: "test_persist_prop_2",
            line: 100,
            over_odds: -110,
            under_odds: null, // Match real data - null is valid
            odds: null,
            sportsbook: "SportsGameOdds",
            conflict_key: "TEST_PERSIST_2|2025-10-11|test_persist_prop_2|SportsGameOdds|nfl|2025",
          };

          // Schema diff function
          function logRowDiff(testRow: any, realRow: any) {
            const testKeys = Object.keys(testRow);
            const realKeys = Object.keys(realRow);

            const missing = testKeys.filter((k) => !(k in realRow));
            const extra = realKeys.filter((k) => !(k in testRow));
            const typeMismatches: any[] = [];

            for (const key of testKeys) {
              if (key in realRow && typeof testRow[key] !== typeof realRow[key]) {
                typeMismatches.push({
                  key,
                  testType: typeof testRow[key],
                  testValue: testRow[key],
                  realType: typeof realRow[key],
                  realValue: realRow[key],
                });
              }
            }

            return { missing, extra, typeMismatches };
          }

          const realRow = mappedProps[0] || {};
          const diff = logRowDiff(testRow, realRow);

          return corsResponse({
            success: true,
            testRow,
            realRow,
            schemaDiff: diff,
            message: "Schema diff comparison completed",
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return corsResponse({
            success: false,
            error: `Schema diff test failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Debug endpoint to test diagnostic insert wrapper
      if (url.pathname === "/debug/test-diagnostic-insert") {
        try {
          // Get a few real extracted rows for testing
          const { getEventsWithFallbacks } = await import("./lib/api.js");
          const { extractPlayerProps } = await import("./lib/extract.js");
          const { mapWithDiagnostics } = await import("./lib/diagnosticMapper.js");
          const { getActiveLeagues } = await import("./config/leagues.js");

          // Get first league config
          const activeLeagues = getActiveLeagues();
          const leagueConfig = activeLeagues[0];
          const { id: leagueID, oddIDs } = leagueConfig;
          const season = 2025; // Use current season

          // Fetch events and extract props
          const { events } = await getEventsWithFallbacks(env, leagueID, season, oddIDs);
          const extractedProps = await extractPlayerProps(events, env);
          const { mapped: mappedProps } = mapWithDiagnostics(extractedProps.slice(0, 3)); // Just first 3 rows

          if (mappedProps.length === 0) {
            return corsResponse({
              success: false,
              error: "No mapped props available for testing",
              timestamp: new Date().toISOString(),
            });
          }

          // Import diagnostic insert function
          const { insertPropsWithDebugging } = await import("./lib/enhancedInsertProps.js");
          const diagnosticResult = await insertPropsWithDebugging(env, mappedProps);

          return corsResponse({
            success: true,
            testRows: mappedProps.length,
            diagnosticResult,
            message: "Diagnostic insert test completed",
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return corsResponse({
            success: false,
            error: `Diagnostic insert test failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Debug endpoint to test ingestion pipeline directly
      if (url.pathname === "/debug/test-ingestion-pipeline") {
        try {
          // Import and test the ingestion pipeline directly
          const { runIngestion } = await import("./jobs/ingest.js");
          const result = await runIngestion(env);

          return corsResponse({
            success: true,
            ingestionResult: result,
            message: "Ingestion pipeline test completed",
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return corsResponse({
            success: false,
            error: `Ingestion pipeline test failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Debug endpoint to check database data
      if (url.pathname === "/debug/check-db") {
        return corsResponse(
          {
            success: false,
            message: "Endpoint disabled: NO SUPABASE",
          },
          501,
        );
      }

      // Diagnostic endpoint to test data persistence
      if (url.pathname === "/debug/test-persistence") {
        try {
          console.log("🔍 DIAGNOSTIC: Testing data persistence...");

          // Import diagnostic functions
          const { diagnosticPersistProps, testManualInsert } = await import(
            "./diagnosticPersist.js"
          );

          // Test manual insert first and capture result
          const manualResult = await testManualInsert(env);

          // Test with real NFL data using the same flow as the ingestion job
          const { runSingleLeagueIngestion } = await import("./jobs/ingest.js");
          const ingestionResult = await runSingleLeagueIngestion(env, "NFL");

          console.log(`📊 Ingestion job result:`, ingestionResult);

          return corsResponse({
            success: true,
            message: "Persistence diagnostic completed",
            manualTestResult: manualResult,
            ingestionResult: ingestionResult,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("❌ Persistence diagnostic failed:", error);

          return corsResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            message: "Persistence diagnostic failed",
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Debug endpoint to test bulletproof persistence
      if (url.pathname === "/debug/test-persist") {
        try {
          const testData = [
            {
              player_id: "TEST_PERSIST_2",
              player_name: "Test Persist Player 2",
              team: "TEST",
              opponent: "OPP",
              league: "nfl",
              season: 2025, // Number, not string
              game_id: "test-persist-game-2",
              date: "2025-10-11",
              prop_type: "test_persist_prop_2",
              line: 100,
              over_odds: -110,
              under_odds: -110,
              odds: null,
              sportsbook: "SportsGameOdds", // Add required field
              conflict_key: "TEST_PERSIST_2|2025-10-11|test_persist_prop_2|SportsGameOdds|nfl|2025",
            },
          ];

          // Import the persistBatch function (we'll need to make it exportable)
          const { insertPropsWithDebugging } = await import("./lib/enhancedInsertProps.js");
          const result = await insertPropsWithDebugging(env, testData);

          return corsResponse({
            success: true,
            persistResult: result,
            message: "Bulletproof persistence test completed",
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return corsResponse({
            success: false,
            error: `Bulletproof persistence test failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Debug endpoint to check database constraints
      if (url.pathname === "/debug/check-constraints") {
        try {
          // Check proplines constraints
          const proplinesConstraints = await supabaseFetch(env, "rpc/check_table_constraints", {
            method: "POST",
            body: { table_name: "proplines" } as any,
          });

          // Check player_game_logs constraints
          const gameLogsConstraints = await supabaseFetch(env, "rpc/check_table_constraints", {
            method: "POST",
            body: { table_name: "player_game_logs" } as any,
          });

          return corsResponse({
            success: true,
            proplinesConstraints,
            gameLogsConstraints,
            message: "Constraints check completed",
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return corsResponse({
            success: false,
            error: `Constraints check failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Debug endpoint to check database schema
      if (url.pathname === "/debug/check-schema") {
        try {
          // Check proplines table structure
          const proplinesSchema = await supabaseFetch(env, "proplines?limit=0");

          return corsResponse({
            success: true,
            proplinesSchema: proplinesSchema,
            message: "Schema check completed",
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return corsResponse({
            success: false,
            error: `Schema check failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Debug endpoint to test database read access
      if (url.pathname === "/debug/test-read") {
        try {
          // Try to read from proplines using service key
          const readResponse = await supabaseFetch(env, "proplines?limit=5");

          return corsResponse({
            success: true,
            readResponse: readResponse,
            message: "Database read test completed",
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return corsResponse({
            success: false,
            error: `Database read test failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Debug endpoint to check for October 2025 data
      if (url.pathname === "/debug/check-october-data") {
        try {
          // Check for October 2025 data specifically
          const octoberData = await supabaseFetch(
            env,
            "proplines?date=gte.2025-10-01&date=lt.2025-11-01",
          );
          const boNixData = await supabaseFetch(env, "proplines?player_id=eq.BO_NIX");
          const allData = await supabaseFetch(env, "proplines?limit=100");

          return corsResponse({
            success: true,
            octoberData: octoberData,
            boNixData: boNixData,
            allDataCount: Array.isArray(allData) ? allData.length : 0,
            allDataDates: Array.isArray(allData)
              ? [...new Set(allData.map((r) => r.date))].sort()
              : [],
            message: "October data check completed",
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return corsResponse({
            success: false,
            error: `October data check failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Debug endpoint to test a simple insert
      if (url.pathname === "/debug/test-insert") {
        try {
          const testData = [
            {
              player_id: "TEST_PLAYER_1",
              player_name: "Test Player",
              team: "TEST",
              opponent: "OPP",
              league: "nfl",
              season: "2025",
              game_id: "test-game-1",
              date: "2025-10-10",
              prop_type: "test_prop",
              line: 100,
              over_odds: -110,
              under_odds: -110,
              odds: null,
              conflict_key: "TEST_PLAYER_1|2025-10-10|test_prop|SportsGameOdds|nfl|2025",
            },
          ];

          console.log("🧪 Testing insert with sample data...");

          // First, try to query the table to see if it exists
          console.log("🔍 Testing table query first...");
          const queryResponse = await supabaseFetch(env, "proplines?limit=1");
          console.log("Query response:", queryResponse);

          const response = await supabaseFetch(env, "proplines", {
            method: "POST",
            body: testData as any,
            headers: {
              Prefer: "resolution=merge-duplicates",
              "Content-Type": "application/json",
            },
          });

          return corsResponse({
            success: true,
            testData: testData[0],
            response: response,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return corsResponse(
            {
              success: false,
              error: `Test insert error: ${error instanceof Error ? error.message : String(error)}`,
              timestamp: new Date().toISOString(),
            },
            500,
          );
        }
      }

      // Debug endpoint to check what's actually in the database
      if (url.pathname === "/debug/database-check") {
        try {
          const league = url.searchParams.get("league") || "nfl";

          // Check proplines table
          const { data: proplinesData, error: proplinesError } = await supabaseFetch(
            env,
            `proplines?league=eq.${league.toLowerCase()}&limit=5`,
          );

          // Check player_game_logs table
          const { data: logsData, error: logsError } = await supabaseFetch(
            env,
            `player_game_logs?league=eq.${league.toLowerCase()}&limit=5`,
          );

          // Also check player_props_fixed view
          const { data: fixedData, error: fixedError } = await supabaseFetch(
            env,
            `player_props_fixed?league=eq.${league.toLowerCase()}&limit=5`,
          );

          return corsResponse({
            success: true,
            proplines: {
              count: proplinesData?.length || 0,
              error: proplinesError?.message || null,
              sample: proplinesData?.[0]
                ? {
                    id: proplinesData[0].id,
                    player_id: proplinesData[0].player_id,
                    date_normalized: proplinesData[0].date_normalized,
                    league: proplinesData[0].league,
                  }
                : null,
            },
            player_game_logs: {
              count: logsData?.length || 0,
              error: logsError?.message || null,
              sample: logsData?.[0]
                ? {
                    id: logsData[0].id,
                    player_id: logsData[0].player_id,
                    date: logsData[0].date,
                    league: logsData[0].league,
                  }
                : null,
            },
            player_props_fixed: {
              count: fixedData?.length || 0,
              error: fixedError?.message || null,
              sample: fixedData?.[0]
                ? {
                    prop_id: fixedData[0].prop_id,
                    player_id: fixedData[0].player_id,
                    prop_date: fixedData[0].prop_date,
                    league: fixedData[0].league,
                  }
                : null,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return corsResponse(
            {
              success: false,
              error: `Database check error: ${error instanceof Error ? error.message : String(error)}`,
              timestamp: new Date().toISOString(),
            },
            500,
          );
        }
      }

      // Handle player props API endpoint - NEW WORKER-CENTRIC PIPELINE
      if (url.pathname === "/api/player-props") {
        try {
          const sport = url.searchParams.get("sport")?.toLowerCase() || "nfl";
          const forceRefresh = url.searchParams.get("force_refresh") === "true";
          const date = url.searchParams.get("date"); // Don't default to today's date
          const dateFrom = url.searchParams.get("date_from");
          const dateTo = url.searchParams.get("date_to");
          const leagueParam = url.searchParams.get("league")?.toUpperCase();

          // Get max props per request based on sport (recommended caps)
          const getMaxPropsForSport = (sport: string): number => {
            switch (sport.toLowerCase()) {
              case "nfl":
                return 150;
              case "nba":
                return 100;
              case "mlb":
                return 200;
              case "nhl":
                return 70;
              default:
                return 150;
            }
          };
          const maxPropsPerRequest = getMaxPropsForSport(sport);
          const cacheTtlSeconds = parseInt(env.CACHE_TTL_SECONDS || "300");

          console.log(
            `📊 NEW PIPELINE: Fetching player props for ${sport} (date: ${date}, forceRefresh: ${forceRefresh}, maxProps: ${maxPropsPerRequest})...`,
          );

          // Generate cache key
          const cacheKey = `player-props-${sport}-${date || "all"}-${dateFrom || ""}-${dateTo || ""}`;

          // Check cache first (unless force refresh)
          if (!forceRefresh && env.PLAYER_PROPS_CACHE) {
            try {
              const cachedData = await env.PLAYER_PROPS_CACHE.get(cacheKey);
              if (cachedData) {
                const cached = JSON.parse(cachedData);
                console.log(`📊 Cache hit for ${cacheKey}`);
                return corsResponse({
                  success: true,
                  data: cached.data,
                  cached: true,
                  cacheKey: cacheKey,
                  responseTime: 0,
                  totalEvents: cached.totalEvents || 1,
                  totalProps: cached.totalProps || cached.data.length,
                  sport: sport,
                  date: date,
                  timestamp: cached.timestamp || new Date().toISOString(),
                });
              }
            } catch (cacheError) {
              console.warn("⚠️ Cache read error:", cacheError);
            }
          }

          // Map sport to league
          const leagueMap: Record<string, string> = {
            nfl: "NFL",
            nba: "NBA",
            mlb: "MLB",
            nhl: "NHL",
          };

          const league = leagueParam || leagueMap[sport] || "NFL";

          // Fast path: SGO-only fetch for MLB (and optionally others if Supabase is disabled)
          // Supabase removed: always use SGO-only path for all sports
          const shouldUseSgoOnly = true;
          if (shouldUseSgoOnly) {
            const started = Date.now();
            const apiKey = env.SGO_API_KEY || env.SPORTSGAMEODDS_API_KEY || env.SPORTSODDS_API_KEY;
            if (!apiKey) {
              return corsResponse({ success: false, error: "SGO_API_KEY is not configured" }, 500);
            }

            // Build SGO v2/events URL; cap limit per sport
            const limit = Math.min(
              maxPropsPerRequest,
              parseInt(env.MAX_PROPS_PER_REQUEST || "500"),
            );
            const sgoUrl = new URL("https://api.sportsgameodds.com/v2/events/");
            sgoUrl.searchParams.set("apiKey", apiKey);
            sgoUrl.searchParams.set("leagueID", league);
            sgoUrl.searchParams.set("oddsAvailable", "true");
            sgoUrl.searchParams.set("oddsType", "playerprops");
            sgoUrl.searchParams.set("limit", String(limit));

            let events: any[] = [];
            try {
              const resp = await fetch(sgoUrl.toString());
              if (!resp.ok) {
                const text = await resp.text().catch(() => "");
                throw new Error(`SGO error ${resp.status}: ${text || resp.statusText}`);
              }
              const json: any = await resp.json().catch(() => ({}));
              events = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
            } catch (e) {
              return corsResponse({ success: false, error: String(e) }, 500);
            }

            // Helper: title-case name from playerID like FIRST_LAST_1_MLB
            const formatName = (raw: string) => {
              const base = String(raw || "")
                .replace(/_\d+_[A-Z]+$/, "")
                .replace(/_/g, " ")
                .toLowerCase()
                .trim();
              return base.replace(/(?:^|[\s'\-])(\p{L})/gu, (m) => m.toUpperCase());
            };
            // MLB prop normalization
            const normalizeMlb = (s: string): string => {
              const k = s.toLowerCase();
              if (/home\s*run|\bhr\b|homer/.test(k)) return "Home Runs";
              if (/\brbi\b|rbis|runs\s*batted\s*in/.test(k)) return "RBIs";
              if (/total\s*bases|\btb\b/.test(k)) return "Total Bases";
              if (/walks|\bbb\b|bases\s*on\s*balls/.test(k)) return "Walks";
              if (/hits?/.test(k)) return "Hits";
              if (/runs?/.test(k)) return "Runs";
              return s;
            };
            const isValidAmerican = (n: any) =>
              Number.isFinite(Number(n)) && Number(n) !== 0 && Math.abs(Number(n)) <= 2000;

            // Filter events by date range if provided
            const inRange = (iso?: string) => {
              if (!iso) return !date && !dateFrom && !dateTo; // accept when no filter
              const d = new Date(iso);
              const ds = d.toISOString().split("T")[0];
              if (date) return ds === date;
              if (dateFrom && dateTo) return ds >= dateFrom && ds <= dateTo;
              return true;
            };

            type Out = {
              playerName: string;
              propType: string;
              line: number | null;
              bestOver?: { bookmaker: string; side: string; price: string; line: number | null };
              bestUnder?: { bookmaker: string; side: string; price: string; line: number | null };
              allBooks?: Array<{
                bookmaker: string;
                side: string;
                price: string;
                line: number | null;
                deeplink?: string;
              }>;
              gameDate: string;
              gameId?: string;
              teamAbbr: string;
              opponentAbbr: string;
            };

            const out: Out[] = [];
            const eventIdsIncluded = new Set<string>();

            for (const ev of events) {
              const gameId = ev.id || ev.gameId || ev.eventID || "unknown";
              const when = ev.gameTime || ev.startTime || ev.start || ev.date || null;
              const gameDate = when ? new Date(when).toISOString() : new Date().toISOString();
              if (!inRange(gameDate)) continue;
              eventIdsIncluded.add(String(gameId));

              const homeAbbr = (
                ev.homeTeamAbbr ||
                ev.homeTeam ||
                ev.home ||
                ev.home_abbr ||
                ev.homeAbbreviation ||
                ev.homeShort ||
                ev.home_code ||
                ""
              )
                .toString()
                .toUpperCase();
              const awayAbbr = (
                ev.awayTeamAbbr ||
                ev.awayTeam ||
                ev.away ||
                ev.away_abbr ||
                ev.awayAbbreviation ||
                ev.awayShort ||
                ev.away_code ||
                ""
              )
                .toString()
                .toUpperCase();
              const oddsObj = ev.odds || {};

              for (const [_, raw] of Object.entries(oddsObj)) {
                const odd: any = raw;
                if (!odd || !odd.playerID) continue;
                if (odd.cancelled) continue;
                const playerId = String(odd.playerID);
                const playerName = formatName(playerId);
                const statId = odd.statID || odd.market || "Unknown";
                const propType = sport === "mlb" ? normalizeMlb(String(statId)) : String(statId);
                const lineVal = Number(odd.bookOverUnder ?? odd.fairOverUnder ?? odd.line ?? NaN);
                const line = Number.isFinite(lineVal) ? lineVal : null;
                const side = (odd.sideID || odd.side || "").toString().toLowerCase();
                const price = Number(odd.bookOdds ?? odd.fairOdds ?? NaN);

                // Build per-book offers
                const offersMap = new Map<
                  string,
                  { over?: number; under?: number; deeplink?: string }
                >();
                const byBookmaker = odd.byBookmaker || {};
                const entries = Object.entries(byBookmaker) as Array<[string, any]>;
                if (entries.length > 0) {
                  for (const [bookRaw, info] of entries) {
                    if (!info || info.available === false || info.odds == null) continue;
                    const book = String(bookRaw).toLowerCase();
                    const american = Number(info.odds);
                    if (!isValidAmerican(american)) continue;
                    const existing = offersMap.get(book) || {};
                    if (side === "over") existing.over = american;
                    if (side === "under") existing.under = american;
                    if (info.deeplink && !existing.deeplink)
                      existing.deeplink = String(info.deeplink);
                    offersMap.set(book, existing);
                  }
                } else if (isValidAmerican(price)) {
                  const existing = offersMap.get("consensus") || {};
                  if (side === "over") existing.over = price;
                  if (side === "under") existing.under = price;
                  offersMap.set("consensus", existing);
                }

                const books = Array.from(offersMap.entries()).map(([book, v]) => ({
                  bookmaker: book,
                  side:
                    v.over != null && v.under == null
                      ? "over"
                      : v.under != null && v.over == null
                        ? "under"
                        : "both",
                  price: String(v.over ?? v.under ?? ""),
                  line,
                  deeplink: v.deeplink,
                }));
                // Compute best over/under
                const bestOverCandidate = Array.from(offersMap.entries())
                  .filter(([, v]) => isValidAmerican(v.over))
                  .map(([book, v]) => ({ book, odds: Number(v.over), line }))
                  .sort((a, b) => 1 + a.odds / 100 - (1 + b.odds / 100))
                  .pop();
                const bestUnderCandidate = Array.from(offersMap.entries())
                  .filter(([, v]) => isValidAmerican(v.under))
                  .map(([book, v]) => ({ book, odds: Number(v.under), line }))
                  .sort((a, b) => 1 + a.odds / 100 - (1 + b.odds / 100))
                  .pop();

                const bestOver = bestOverCandidate
                  ? {
                      bookmaker: bestOverCandidate.book,
                      side: "over",
                      price: String(bestOverCandidate.odds),
                      line,
                    }
                  : undefined;
                const bestUnder = bestUnderCandidate
                  ? {
                      bookmaker: bestUnderCandidate.book,
                      side: "under",
                      price: String(bestUnderCandidate.odds),
                      line,
                    }
                  : undefined;

                const teamAbbr = (odd.playerTeam || odd.team || "").toString().toUpperCase();
                const opp =
                  teamAbbr && (teamAbbr === homeAbbr || teamAbbr === awayAbbr)
                    ? teamAbbr === homeAbbr
                      ? awayAbbr
                      : homeAbbr
                    : "";

                out.push({
                  playerName,
                  propType,
                  line,
                  bestOver,
                  bestUnder,
                  allBooks: books,
                  gameDate,
                  gameId: String(gameId),
                  teamAbbr: teamAbbr || "",
                  opponentAbbr: opp || "",
                });
              }
            }

            const took = Date.now() - started;
            return corsResponse({
              success: true,
              data: out,
              cached: false,
              cacheKey,
              responseTime: took,
              totalEvents: eventIdsIncluded.size,
              totalProps: out.length,
              sport,
              date,
            });
          }

          // Use our new worker-centric pipeline
          let enrichedProps: EnrichedProp[] = [];

          try {
            if (date) {
              // Single date query using SGO-only pipeline (NO SUPABASE)
              console.log(`📊 Fetching and enriching props for ${league} on ${date} (SGO-only)...`);
              enrichedProps = await ingestAndEnrich(env, league, date);

              // Persist in background (don't block response)
              if (enrichedProps.length > 0) {
                persistProps(env, enrichedProps).catch((err) =>
                  console.error("Background persist failed:", err),
                );
              }
            } else if (dateFrom && dateTo) {
              // Date range query - get props for each date in range
              const startDate = new Date(dateFrom);
              const endDate = new Date(dateTo);
              const allProps: EnrichedProp[] = [];

              for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split("T")[0];
                try {
                  console.log(`📊 DUAL-MODE: Fetching props for ${league} on ${dateStr}...`);
                  const dayProps = await ingestAndEnrich(env, league, dateStr);

                  // Persist each day's props
                  if (dayProps.length > 0) {
                    persistProps(env, dayProps).catch((err) =>
                      console.error(`Background persist failed for ${dateStr}:`, err),
                    );
                  }
                  allProps.push(...dayProps);
                } catch (error) {
                  console.warn(`⚠️ Failed to fetch props for ${dateStr}:`, error);
                }
              }
              enrichedProps = allProps;
            } else {
              // No date filter - find the most recent date with data via SGO-only pipeline
              console.log(`📊 Finding most recent date with data for ${league} (SGO-only)...`);

              // Try to find a recent date with data by checking the last few days
              const today = new Date();
              let foundData = false;

              for (let i = 0; i < 7; i++) {
                const checkDate = new Date(today);
                checkDate.setDate(checkDate.getDate() - i);
                const dateStr = checkDate.toISOString().split("T")[0];

                try {
                  const testProps = await ingestAndEnrich(env, league, dateStr);
                  if (testProps.length > 0) {
                    console.log(
                      `📅 Found data for ${league} on ${dateStr} (${testProps.length} props)`,
                    );
                    enrichedProps = testProps;
                    foundData = true;

                    // Persist the found data
                    persistProps(env, testProps).catch((err) =>
                      console.error(`Background persist failed for ${dateStr}:`, err),
                    );
                    break;
                  }
                } catch (error) {
                  console.warn(`⚠️ Failed to check ${dateStr}:`, error);
                }
              }

              if (!foundData) {
                console.log(
                  `⚠️ NEW PIPELINE: No data found for league ${league} in last 7 days, trying most recent data`,
                );
                // Fallback: get most recent data regardless of date
                const { data: recentProps, error: recentError } = await supabaseFetch(
                  env,
                  `player_props_fixed?league=eq.${league}&limit=150&order=prop_date.desc`,
                );
                if (!recentError && recentProps && recentProps.length > 0) {
                  enrichedProps = recentProps.map((prop: any) => ({
                    player_id: prop.player_id,
                    clean_player_name: prop.player_name,
                    team_abbr: prop.team_abbr,
                    opponent_abbr: prop.opponent_abbr,
                    prop_type: prop.prop_type,
                    line: prop.line,
                    over_odds: prop.over_odds,
                    under_odds: prop.under_odds,
                    league: prop.league,
                    season: prop.season,
                    game_id: prop.game_id,
                    date_normalized: prop.prop_date,
                    ev_percent: prop.ev_percent,
                    team_logo: prop.team_logo,
                    opponent_logo: prop.opponent_logo,
                    last5_streak: prop.last5_streak,
                    last10_streak: prop.last10_streak,
                    last20_streak: prop.last20_streak,
                    h2h_streak: prop.h2h_streak,
                  }));
                  console.log(
                    `📊 FALLBACK: Retrieved ${enrichedProps.length} most recent props for ${league}`,
                  );
                } else {
                  enrichedProps = [];
                }
              }
            }

            console.log(`📊 NEW PIPELINE: Fetched ${enrichedProps.length} enriched props`);
            if (enrichedProps.length > 0) {
              console.log(`📊 NEW PIPELINE: Sample enriched prop:`, {
                player_id: enrichedProps[0].player_id,
                clean_player_name: enrichedProps[0].clean_player_name,
                team_abbr: enrichedProps[0].team_abbr,
                opponent_abbr: enrichedProps[0].opponent_abbr,
                prop_type: enrichedProps[0].prop_type,
                ev_percent: enrichedProps[0].ev_percent,
                last5_hits: enrichedProps[0].last5_hits,
              });
            }
          } catch (error) {
            console.error("❌ NEW PIPELINE: Failed to fetch enriched player props:", error);
            return corsResponse(
              {
                success: false,
                error: `Failed to fetch player props: ${error instanceof Error ? error.message : String(error)}`,
                sport: sport,
                date: date,
                timestamp: new Date().toISOString(),
              },
              500,
            );
          }

          if (!enrichedProps || enrichedProps.length === 0) {
            return corsResponse({
              success: true,
              data: [],
              cached: false,
              cacheKey: `player-props-${sport}-${date}`,
              responseTime: Date.now(),
              totalEvents: 0,
              totalProps: 0,
              sport: sport,
              date: date,
              timestamp: new Date().toISOString(),
            });
          }

          // Filter out defensive props for NFL and NBA
          const filteredProps = enrichedProps.filter((prop: EnrichedProp) => {
            const propType = prop.prop_type?.toLowerCase() || "";
            const currentSport = sport.toLowerCase();

            // Remove defensive props for NFL and NBA
            if (currentSport === "nfl" || currentSport === "nba") {
              const isDefensiveProp =
                propType.includes("defense") ||
                propType.includes("tackle") ||
                propType.includes("sack") ||
                propType.includes("interception") ||
                propType.includes("pass_defended") ||
                propType.includes("forced_fumble") ||
                propType.includes("fumble_recovery") ||
                propType.includes("defensive_td") ||
                propType.includes("safety") ||
                propType.includes("blocked_kick") ||
                propType.includes("defensive_special_teams") ||
                propType.includes("defensive_combined_tackles") ||
                propType.includes("defensive_solo_tackles") ||
                propType.includes("defensive_assisted_tackles") ||
                propType.includes("defensive_sacks") ||
                propType.includes("defensive_interceptions") ||
                propType.includes("defensive_pass_defended") ||
                propType.includes("defensive_forced_fumbles") ||
                propType.includes("defensive_fumble_recoveries") ||
                propType.includes("defensive_touchdowns") ||
                propType.includes("defensive_safeties") ||
                propType.includes("defensive_blocked_kicks");

              if (isDefensiveProp) {
                console.log(
                  `🚫 Filtered out defensive prop: ${prop.prop_type} for ${currentSport}`,
                );
                return false;
              }
            }

            return true;
          });

          console.log(
            `📊 NEW PIPELINE: Filtered to ${filteredProps.length} props (removed defensive props for NFL/NBA)`,
          );

          // Apply max props per request limit
          const limitedProps = filteredProps.slice(0, maxPropsPerRequest);
          console.log(`📊 Limited to ${limitedProps.length} props (max: ${maxPropsPerRequest})`);

          // Debug: Log sample enriched prop structure
          if (limitedProps.length > 0) {
            console.log(`📊 [API response sample] Enriched prop structure:`, {
              player_id: limitedProps[0].player_id,
              clean_player_name: limitedProps[0].clean_player_name,
              prop_type: limitedProps[0].prop_type,
              prop_type_display: limitedProps[0].prop_type_display,
              bet_type: limitedProps[0].bet_type,
              line: limitedProps[0].line,
              over_odds: limitedProps[0].over_odds,
              under_odds: limitedProps[0].under_odds,
              team_abbr: limitedProps[0].team_abbr,
              opponent_abbr: limitedProps[0].opponent_abbr,
            });
          }

          // Transform to expected format using our enriched props data
          const transformedProps = limitedProps.map((prop: EnrichedProp) => {
            return {
              id: prop.player_id, // Use player_id as ID
              playerId: prop.player_id,
              playerName: prop.clean_player_name,
              player_id: prop.player_id, // For headshots compatibility
              team: prop.team_abbr,
              opponent: prop.opponent_abbr,
              propType: prop.prop_type,
              prop_type: prop.prop_type, // NEW: Clean prop type
              prop_type_display: prop.prop_type_display, // NEW: Clean display name
              bet_type: prop.bet_type, // NEW: Separated bet type
              line: prop.line,
              overOdds: prop.over_odds,
              underOdds: prop.under_odds,
              over_odds: prop.over_odds, // NEW: Clean field name
              under_odds: prop.under_odds, // NEW: Clean field name
              sportsbooks: ["SportsGameOdds"], // Default sportsbook
              position: "N/A",
              gameDate: prop.date_normalized,
              sport: sport,
              teamAbbr: prop.team_abbr,
              opponentAbbr: prop.opponent_abbr,
              gameId: prop.game_id,
              available: true,
              lastUpdate: new Date().toISOString(),
              marketName: prop.prop_type,
              market: prop.prop_type,
              marketId: prop.prop_type,
              period: "full_game",
              statEntity: prop.clean_player_name,

              // NEW PIPELINE: Enhanced fields with calculated metrics
              evPercent: prop.ev_percent,
              last5_streak: prop.last5_hits,
              last10_streak: prop.last10_hits,
              last20_streak: prop.last20_hits,
              h2h_streak: prop.h2h_hits,

              // Team data with logos
              teamLogo: prop.team_logo,
              opponentLogo: prop.opponent_logo,
              team_name: prop.team_name,
              opponent_name: prop.opponent_name,

              // Enhanced fields
              bestOver: prop.over_odds
                ? {
                    bookmaker: "SportsGameOdds",
                    side: "over",
                    price: prop.over_odds.toString(),
                    line: prop.line,
                  }
                : undefined,
              bestUnder: prop.under_odds
                ? {
                    bookmaker: "SportsGameOdds",
                    side: "under",
                    price: prop.under_odds.toString(),
                    line: prop.line,
                  }
                : undefined,
              allBooks: prop.over_odds
                ? [
                    {
                      bookmaker: "SportsGameOdds",
                      side: "over",
                      price: prop.over_odds.toString(),
                      line: prop.line,
                      deeplink: "",
                    },
                  ]
                : [],

              // Debug fields
              clean_player_name: prop.clean_player_name,
              debug_team: prop.debug_team,
              debug_ev: prop.debug_ev,
            };
          });

          // Use the actual date that was found/used
          const actualDate = date || limitedProps[0]?.date_normalized;

          const response = {
            success: true,
            data: transformedProps,
            cached: false,
            cacheKey: cacheKey,
            responseTime: Date.now(),
            totalEvents: 1,
            totalProps: transformedProps.length,
            sport: sport,
            date: actualDate,
            timestamp: new Date().toISOString(),
          };

          // Cache the response (unless force refresh)
          if (!forceRefresh && env.PLAYER_PROPS_CACHE) {
            try {
              await env.PLAYER_PROPS_CACHE.put(cacheKey, JSON.stringify(response), {
                expirationTtl: cacheTtlSeconds,
              });
              console.log(`📊 Cached response for ${cacheKey} (TTL: ${cacheTtlSeconds}s)`);
            } catch (cacheError) {
              console.warn("⚠️ Cache write error:", cacheError);
            }
          }

          return corsResponse(response);
        } catch (error) {
          console.error("❌ Player props API error:", error);
          return corsResponse(
            {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              data: [],
              cached: false,
              cacheKey: "",
              responseTime: 0,
              totalEvents: 0,
              totalProps: 0,
            },
            500,
          );
        }
      }

      // Handle prop sync refresh endpoint
      if (url.pathname === "/refresh-prop-sync") {
        try {
          const { refreshPropTypeAliases } = await import("./propTypeSync");
          const success = await refreshPropTypeAliases();

          return new Response(
            JSON.stringify({
              success: success,
              message: success
                ? "Prop type aliases refreshed successfully"
                : "Failed to refresh prop type aliases",
              timestamp: new Date().toISOString(),
            }),
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      // Handle supported props refresh endpoint
      if (url.pathname === "/refresh-supported-props") {
        try {
          supportedProps = await loadSupportedProps();

          return new Response(
            JSON.stringify({
              success: true,
              message: "Supported props refreshed successfully",
              supportedLeagues: Object.keys(supportedProps),
              leagueCounts: Object.entries(supportedProps).map(([league, props]) => ({
                league,
                count: props.size,
              })),
              timestamp: new Date().toISOString(),
            }),
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      // Handle supported props debug endpoint
      if (url.pathname === "/debug-supported-props") {
        try {
          const { getSupportedPropsSummary } = await import("./ingestionFilter");
          const summary = getSupportedPropsSummary(supportedProps);

          return new Response(
            JSON.stringify({
              success: true,
              supportedProps: summary,
              totalLeagues: Object.keys(supportedProps).length,
              totalProps: Object.values(supportedProps).reduce((sum, props) => sum + props.size, 0),
              timestamp: new Date().toISOString(),
            }),
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      // Handle coverage report endpoint
      if (url.pathname === "/coverage-report") {
        try {
          const coverage = await generateCoverageReport();
          const summary = getCoverageSummary(coverage);

          return new Response(
            JSON.stringify({
              success: true,
              coverage: summary,
              timestamp: new Date().toISOString(),
            }),
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      // Handle prop sync debug endpoint
      if (url.pathname === "/debug-prop-sync") {
        try {
          const { getAliasCache } = await import("./propTypeSync");
          const aliasCache = getAliasCache();

          const testCases = [
            { input: "pts", expected: "points" },
            { input: "reb", expected: "rebounds" },
            { input: "sacks", expected: "defense_sacks" },
            { input: "td", expected: "fantasyscore" },
            { input: "Goals", expected: "goals" },
            { input: "batting_basesOnBalls", expected: "walks" },
          ];

          const results = testCases.map((test) => ({
            input: test.input,
            output: normalizePropType(test.input),
            expected: test.expected,
            correct: normalizePropType(test.input) === test.expected,
          }));

          return new Response(
            JSON.stringify({
              success: true,
              aliasCacheSize: Object.keys(aliasCache).length,
              sampleAliases: Object.entries(aliasCache).slice(0, 5),
              testResults: results,
              timestamp: new Date().toISOString(),
            }),
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      // Handle join diagnostics endpoint
      if (url.pathname === "/debug-join-diagnostics") {
        return corsResponse(
          {
            success: false,
            message: "Endpoint disabled: NO SUPABASE",
          },
          501,
        );
      }

      // Handle field-level mismatch diagnostics
      if (url.pathname === "/debug-field-mismatch") {
        return corsResponse(
          {
            success: false,
            message: "Endpoint disabled: NO SUPABASE",
          },
          501,
        );
      }

      // Handle backfill-all endpoint
      if (url.pathname === "/backfill-all") {
        const days = Number(url.searchParams.get("days") ?? "200");
        const leagues = url.searchParams.get("leagues")?.split(",");
        const seasons = url.searchParams
          .get("seasons")
          ?.split(",")
          .map((s) => parseInt(s));

        console.log(
          `🔄 Starting multi-season backfill: days=${days}, leagues=${leagues}, seasons=${seasons}`,
        );

        const startTime = Date.now();

        try {
          const result = await runMultiSeasonBackfill(env, {
            leagues,
            seasons,
            daysPerSeason: days,
          });

          const duration = Date.now() - startTime;

          return new Response(
            JSON.stringify({
              success: true,
              message: "Multi-season backfill completed successfully",
              duration: `${duration}ms`,
              totalProps: result.totalProps,
              totalGameLogs: result.totalGameLogs,
              totalErrors: result.totalErrors,
              leagueSeasonResults: result.leagueSeasonResults,
              summary: result.summary,
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          console.error("❌ Multi-season backfill failed:", error);

          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: `${Date.now() - startTime}ms`,
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle backfill-recent endpoint
      if (url.pathname === "/backfill-recent") {
        const days = Number(url.searchParams.get("days") ?? "90");

        console.log(`🔄 Starting recent seasons backfill: ${days} days`);

        const startTime = Date.now();

        try {
          const result = await runRecentSeasonsBackfill(env, days);

          const duration = Date.now() - startTime;

          return new Response(
            JSON.stringify({
              success: true,
              message: "Recent seasons backfill completed successfully",
              duration: `${duration}ms`,
              totalProps: result.totalProps,
              totalGameLogs: result.totalGameLogs,
              totalErrors: result.totalErrors,
              leagueSeasonResults: result.leagueSeasonResults,
              summary: result.summary,
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          console.error("❌ Recent seasons backfill failed:", error);

          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: `${Date.now() - startTime}ms`,
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle backfill-full endpoint
      if (url.pathname === "/backfill-full") {
        const days = Number(url.searchParams.get("days") ?? "365");

        console.log(`🔄 Starting full historical backfill: ${days} days`);

        const startTime = Date.now();

        try {
          const result = await runFullHistoricalBackfill(env, days);

          const duration = Date.now() - startTime;

          return new Response(
            JSON.stringify({
              success: true,
              message: "Full historical backfill completed successfully",
              duration: `${duration}ms`,
              totalProps: result.totalProps,
              totalGameLogs: result.totalGameLogs,
              totalErrors: result.totalErrors,
              leagueSeasonResults: result.leagueSeasonResults,
              summary: result.summary,
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          console.error("❌ Full historical backfill failed:", error);

          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: `${Date.now() - startTime}ms`,
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle backfill-league endpoint
      if (url.pathname.startsWith("/backfill-league/")) {
        const leagueId = url.pathname.split("/")[2];
        const days = Number(url.searchParams.get("days") ?? "200");
        const seasons = url.searchParams
          .get("seasons")
          ?.split(",")
          .map((s) => parseInt(s)) || [2024, 2025];

        console.log(
          `🔄 Starting league-specific backfill: ${leagueId}, ${days} days, seasons: ${seasons.join(", ")}`,
        );

        const startTime = Date.now();

        try {
          const result = await runLeagueSpecificBackfill(env, leagueId, seasons, days);

          const duration = Date.now() - startTime;

          return new Response(
            JSON.stringify({
              success: true,
              message: `League-specific backfill completed successfully for ${leagueId}`,
              duration: `${duration}ms`,
              totalProps: result.totalProps,
              totalGameLogs: result.totalGameLogs,
              totalErrors: result.totalErrors,
              leagueSeasonResults: result.leagueSeasonResults,
              summary: result.summary,
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          console.error(`❌ League-specific backfill failed for ${leagueId}:`, error);

          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: `${Date.now() - startTime}ms`,
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle backfill-season endpoint
      if (url.pathname.startsWith("/backfill-season/")) {
        const season = parseInt(url.pathname.split("/")[2]);
        const days = Number(url.searchParams.get("days") ?? "200");
        const leagues = url.searchParams.get("leagues")?.split(",");

        console.log(
          `🔄 Starting season-specific backfill: ${season}, ${days} days, leagues: ${leagues?.join(", ") || "all"}`,
        );

        const startTime = Date.now();

        try {
          const result = await runSeasonSpecificBackfill(env, season, leagues, days);

          const duration = Date.now() - startTime;

          return new Response(
            JSON.stringify({
              success: true,
              message: `Season-specific backfill completed successfully for ${season}`,
              duration: `${duration}ms`,
              totalProps: result.totalProps,
              totalGameLogs: result.totalGameLogs,
              totalErrors: result.totalErrors,
              leagueSeasonResults: result.leagueSeasonResults,
              summary: result.summary,
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          console.error(`❌ Season-specific backfill failed for ${season}:`, error);

          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: `${Date.now() - startTime}ms`,
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle backfill-progressive endpoint
      if (url.pathname === "/backfill-progressive") {
        const maxDays = Number(url.searchParams.get("maxDays") ?? "365");

        console.log(`🔄 Starting progressive backfill: max ${maxDays} days`);

        const startTime = Date.now();

        try {
          const result = await runProgressiveBackfill(env, maxDays);

          const duration = Date.now() - startTime;

          return new Response(
            JSON.stringify({
              success: true,
              message: "Progressive backfill completed successfully",
              duration: `${duration}ms`,
              totalProps: result.totalProps,
              totalGameLogs: result.totalGameLogs,
              totalErrors: result.totalErrors,
              leagueSeasonResults: result.leagueSeasonResults,
              summary: result.summary,
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          console.error("❌ Progressive backfill failed:", error);

          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: `${Date.now() - startTime}ms`,
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle ingest endpoint
      if (url.pathname === "/ingest") {
        console.log(`🔄 Starting current season ingestion...`);

        const startTime = Date.now();

        try {
          const result = await runIngestion(env);

          const duration = Date.now() - startTime;

          return corsResponse({
            success: true,
            message: "Current season ingestion completed successfully",
            duration: `${duration}ms`,
            ...result,
          });
        } catch (error) {
          console.error("❌ Ingestion failed:", error);

          return corsResponse(
            {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: `${Date.now() - startTime}ms`,
            },
            500,
          );
        }
      }

      // Handle single league ingest endpoint
      if (url.pathname.startsWith("/ingest/")) {
        const leagueId = url.pathname.split("/")[2];

        console.log(`🔄 Starting single league ingestion for ${leagueId}...`);

        const startTime = Date.now();

        try {
          const result = await runSingleLeagueIngestion(env, leagueId);

          const duration = Date.now() - startTime;

          return new Response(
            JSON.stringify({
              success: true,
              message: `Single league ingestion completed successfully for ${leagueId}`,
              duration: `${duration}ms`,
              ...result,
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          console.error(`❌ Single league ingestion failed for ${leagueId}:`, error);

          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: `${Date.now() - startTime}ms`,
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle schema check
      if (url.pathname === "/debug-schema") {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");

          console.log("🔍 Checking table schema...");

          // Query the table structure
          const response = (await supabaseFetch(env, "proplines?limit=1&select=*", {
            method: "GET",
          })) as { data?: any; error?: any };

          if (response.error) {
            console.error("❌ Schema check failed:", response.error);
            return new Response(
              JSON.stringify({
                success: false,
                error:
                  response.error instanceof Error ? response.error.message : String(response.error),
                details: response.error,
              }),
              {
                status: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
              },
            );
          } else {
            console.log("✅ Schema check successful:", response.data);
            return new Response(
              JSON.stringify({
                success: true,
                message: "Table schema retrieved",
                data: response.data,
                note: "This shows what columns exist in the table",
              }),
              {
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
              },
            );
          }
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        }
      }

      // Handle market analysis debug test
      if (url.pathname === "/debug-market-analysis") {
        try {
          const { fetchEventsWithProps } = await import("./lib/api");
          const { extractPlayerProps } = await import("./lib/extract");

          console.log("🔍 Analyzing market patterns...");

          const leagues = ["NFL", "MLB"];
          const analysis = {};

          for (const league of leagues) {
            const events = await fetchEventsWithProps(env, league, { limit: 2 });
            if (events.length > 0) {
              const extracted = await extractPlayerProps(events, env);
              console.log(`📊 ${league}: Extracted ${extracted.length} props`);

              // Analyze market patterns
              const marketCounts = {};
              const unmappedMarkets = new Set();

              for (const prop of extracted) {
                const market = prop.marketName;
                marketCounts[market] = (marketCounts[market] || 0) + 1;

                // Check if this market would be mapped
                const MARKET_MAP = {
                  "Passing Yards": "Passing Yards",
                  "Rushing Yards": "Rushing Yards",
                  "Receiving Yards": "Receiving Yards",
                  Completions: "Completions",
                  Receptions: "Receptions",
                  "3PT Made": "3PT Made",
                  Points: "Points",
                  Assists: "Assists",
                  Rebounds: "Rebounds",
                  "passing yards": "Passing Yards",
                  "pass yards": "Passing Yards",
                  "passing yds": "Passing Yards",
                  "pass yds": "Passing Yards",
                  "rushing yards": "Rushing Yards",
                  "rush yards": "Rushing Yards",
                  "rushing yds": "Rushing Yards",
                  "rush yds": "Rushing Yards",
                  "receiving yards": "Receiving Yards",
                  "rec yards": "Receiving Yards",
                  "receiving yds": "Receiving Yards",
                  "rec yds": "Receiving Yards",
                  receptions: "Receptions",
                  "passing touchdowns": "Passing Touchdowns",
                  "pass tds": "Passing Touchdowns",
                  "rushing touchdowns": "Rushing Touchdowns",
                  "rush tds": "Rushing Touchdowns",
                  "receiving touchdowns": "Receiving Touchdowns",
                  "rec tds": "Receiving Touchdowns",
                  points: "Points",
                  assists: "Assists",
                  rebounds: "Rebounds",
                  "threes made": "3PT Made",
                  "3pt made": "3PT Made",
                  steals: "Steals",
                  blocks: "Blocks",
                  hits: "Hits",
                  runs: "Runs",
                  rbis: "RBIs",
                  "total bases": "Total Bases",
                  strikeouts: "Strikeouts",
                  "shots on goal": "Shots on Goal",
                  goals: "Goals",
                  saves: "Saves",
                  "first touchdown": "First Touchdown",
                  "anytime touchdown": "Anytime Touchdown",
                  "to record first touchdown": "First Touchdown",
                  "to record anytime touchdown": "Anytime Touchdown",
                  "to score": "Anytime Touchdown",
                };

                let propType = MARKET_MAP[market];
                if (!propType) {
                  propType = MARKET_MAP[market?.toLowerCase()];
                }
                if (!propType) {
                  const marketWords = market?.toLowerCase().split(" ") || [];
                  for (const word of marketWords) {
                    if (MARKET_MAP[word]) {
                      propType = MARKET_MAP[word];
                      break;
                    }
                  }
                }

                if (!propType) {
                  unmappedMarkets.add(market);
                }
              }

              analysis[league] = {
                totalProps: extracted.length,
                marketCounts: Object.entries(marketCounts)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 20), // Top 20 markets
                unmappedMarkets: Array.from(unmappedMarkets).slice(0, 20), // Top 20 unmapped
                sampleProps: extracted.slice(0, 5), // Sample props for analysis
              };
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              analysis: analysis,
              recommendations: {
                nfl: "Focus on 'Over/Under' patterns and 'To Record' markets",
                mlb: "Focus on 'Hits', 'Runs', 'RBIs' patterns",
              },
            }),
            {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        }
      }

      // Handle isolated insert test
      if (url.pathname === "/debug-insert") {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");

          console.log("🔍 Testing isolated insert...");

          // Test single hardcoded row (complete schema) - using unique timestamp
          const timestamp = Date.now();
          const testProp = {
            player_id: `TEST_PLAYER_${timestamp}`,
            player_name: `Test Player ${timestamp}`,
            team: "TEST",
            opponent: "TEST2",
            season: 2025,
            date: "2025-10-08",
            prop_type: "Test Prop",
            sportsbook: "TestBook",
            line: 100.5,
            over_odds: -110,
            under_odds: -110,
            league: "nfl",
            game_id: `TEST-GAME-${timestamp}`,
            conflict_key: `TEST_CONFLICT_${timestamp}`,
          };

          console.log("🔍 Test prop:", JSON.stringify(testProp, null, 2));

          const response = await supabaseFetch(env, "proplines", {
            method: "POST",
            body: JSON.stringify([testProp]),
          });

          // Successful Supabase inserts return null/empty response
          if (response === null || response === undefined) {
            console.log("✅ Insert successful - Empty response indicates success");
            return new Response(
              JSON.stringify({
                success: true,
                message: "Test insert successful",
                data: "Record inserted successfully (empty response from Supabase)",
                testProp: testProp,
              }),
              {
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
              },
            );
          } else {
            // If we get a response, it might be an error or data
            console.log("✅ Insert successful with response:", response);
            return new Response(
              JSON.stringify({
                success: true,
                message: "Test insert successful",
                data: response,
                testProp: testProp,
              }),
              {
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
              },
            );
          }
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        }
      }

      // Handle extraction debug test
      if (url.pathname === "/debug-extraction") {
        try {
          const { fetchEventsWithProps } = await import("./lib/api");
          const { extractPlayerProps } = await import("./lib/extract");

          console.log("🔍 Testing extraction...");

          const events = await fetchEventsWithProps(env, "NFL", { limit: 1 });
          console.log(`📊 Fetched ${events.length} events`);

          if (events.length > 0) {
            const extracted = await extractPlayerProps(events, env);
            console.log(`📊 Extracted ${extracted.length} props`);

            return new Response(
              JSON.stringify({
                success: true,
                eventsCount: events.length,
                extractedPropsCount: extracted.length,
                firstEvent: events[0]
                  ? {
                      eventID: events[0].eventID,
                      leagueID: events[0].leagueID,
                      oddsKeys: Object.keys(events[0].odds || {}).length,
                      playersKeys: Object.keys(events[0].players || {}).length,
                    }
                  : null,
                firstExtractedProp:
                  extracted.length > 0
                    ? {
                        playerName: extracted[0].playerName,
                        marketName: extracted[0].marketName,
                        line: extracted[0].line,
                        odds: extracted[0].odds,
                        sportsbook: extracted[0].sportsbook,
                      }
                    : null,
              }),
              {
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
              },
            );
          } else {
            return new Response(
              JSON.stringify({
                success: false,
                error: "No events found",
              }),
              {
                status: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
              },
            );
          }
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        }
      }

      // Handle simple JSON parsing test
      if (url.pathname === "/debug-json") {
        try {
          const testUrl = `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL`;
          console.log(`🔍 Testing JSON parsing: ${testUrl}`);

          const fetchResponse = await fetch(testUrl);
          const responseText = await fetchResponse.text();
          console.log(`📊 Raw response length: ${responseText.length}`);
          console.log(`📊 Raw response first 100 chars: ${responseText.substring(0, 100)}`);

          const response = JSON.parse(responseText);

          // Handle the wrapper structure: { success: true, data: [...events] }
          const events = response.data || response;
          const eventsArray = Array.isArray(events) ? events : [];

          console.log(`📊 Response type: ${typeof response}`);
          console.log(`📊 Has data field: ${!!response.data}`);
          console.log(`📊 Events array length: ${eventsArray.length}`);

          return new Response(
            JSON.stringify({
              success: true,
              responseLength: responseText.length,
              responseStart: responseText.substring(0, 100),
              responseType: typeof response,
              hasDataField: !!response.data,
              eventsArrayLength: eventsArray.length,
              firstEvent: eventsArray.length > 0 ? typeof eventsArray[0] : null,
            }),
            {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        }
      }

      // Handle comprehensive debug endpoint
      if (url.pathname === "/debug-comprehensive") {
        try {
          console.log("🔍 Running comprehensive API debug...");

          const testResults: any[] = [];

          // Test different league IDs
          const leagues = ["NFL", "NBA", "MLB", "NHL"];
          for (const league of leagues) {
            const url = `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=${league}`;
            console.log(`🔍 Testing ${league}: ${url}`);

            try {
              const response = await fetch(url);
              const data = await response.json();
              testResults.push({
                league,
                status: response.status,
                eventsCount: Array.isArray(data) ? data.length : "not array",
                dataType: typeof data,
                isArray: Array.isArray(data),
                firstItem: Array.isArray(data) && data.length > 0 ? typeof data[0] : null,
                responseHeaders: {
                  contentType: response.headers.get("content-type") || "",
                  status: response.status.toString(),
                },
                rawResponse: data, // Show the actual response
              });
            } catch (error) {
              testResults.push({
                league,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }

          // Test with and without oddsAvailable filter
          const testUrls = [
            {
              name: "NFL without oddsAvailable",
              url: `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL`,
            },
            {
              name: "NFL with oddsAvailable=true",
              url: `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL&oddsAvailable=true`,
            },
            {
              name: "NFL with oddsAvailable=false",
              url: `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL&oddsAvailable=false`,
            },
          ];

          for (const test of testUrls) {
            console.log(`🔍 Testing ${test.name}: ${test.url}`);

            try {
              const response = await fetch(test.url);
              const data = await response.json();
              testResults.push({
                test: test.name,
                status: response.status,
                eventsCount: Array.isArray(data) ? data.length : "not array",
                dataType: typeof data,
                isArray: Array.isArray(data),
                firstItem: Array.isArray(data) && data.length > 0 ? typeof data[0] : null,
              });
            } catch (error) {
              testResults.push({
                test: test.name,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }

          // Test different endpoints
          const endpoints = ["/v2/events", "/v2/odds", "/v2/playerprops"];

          for (const endpoint of endpoints) {
            const url = `https://api.sportsgameodds.com${endpoint}?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL`;
            console.log(`🔍 Testing ${endpoint}: ${url}`);

            try {
              const response = await fetch(url);
              const data = await response.json();
              testResults.push({
                endpoint,
                status: response.status,
                eventsCount: Array.isArray(data) ? data.length : "not array",
                dataType: typeof data,
              });
            } catch (error) {
              testResults.push({
                endpoint,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              apiKeyLength: env.SPORTSGAMEODDS_API_KEY ? env.SPORTSGAMEODDS_API_KEY.length : 0,
              testResults,
            }),
            {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        }
      }

      // Handle debug API endpoint
      if (url.pathname === "/debug-api") {
        try {
          const { fetchEventsWithProps } = await import("./lib/api");

          console.log("🔍 Testing API directly...");

          // Test NFL API call
          console.log("🔍 API Key available:", !!env.SPORTSGAMEODDS_API_KEY);
          console.log(
            "🔍 API Key length:",
            env.SPORTSGAMEODDS_API_KEY ? env.SPORTSGAMEODDS_API_KEY.length : 0,
          );

          // Test 1: Basic API call without filters
          console.log("🔍 Test 1: Basic API call without filters");
          const basicUrl = `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL&oddsAvailable=true`;
          console.log("🔍 Basic URL:", basicUrl);

          try {
            const basicResponse = await fetch(basicUrl);
            const basicData = await basicResponse.json();
            console.log("📊 Basic API Response:", {
              status: basicResponse.status,
              eventsCount: Array.isArray(basicData) ? basicData.length : "not array",
              dataType: typeof basicData,
              firstEvent: Array.isArray(basicData) && basicData.length > 0 ? basicData[0] : null,
            });
          } catch (error) {
            console.error("❌ Basic API call failed:", error);
          }

          // Test 2: With season filter
          console.log("🔍 Test 2: With season filter");
          const seasonUrl = `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL&oddsAvailable=true&season=2024`;
          console.log("🔍 Season URL:", seasonUrl);

          try {
            const seasonResponse = await fetch(seasonUrl);
            const seasonData = await seasonResponse.json();
            console.log("📊 Season API Response:", {
              status: seasonResponse.status,
              eventsCount: Array.isArray(seasonData) ? seasonData.length : "not array",
            });
          } catch (error) {
            console.error("❌ Season API call failed:", error);
          }

          // Test 3: With date filter (current date in UTC)
          console.log("🔍 Test 3: With date filter");
          const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD in UTC
          const dateUrl = `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL&oddsAvailable=true&dateFrom=${today}&dateTo=${today}`;
          console.log("🔍 Date URL:", dateUrl);

          try {
            const dateResponse = await fetch(dateUrl);
            const dateData = await dateResponse.json();
            console.log("📊 Date API Response:", {
              status: dateResponse.status,
              eventsCount: Array.isArray(dateData) ? dateData.length : "not array",
              dateUsed: today,
            });
          } catch (error) {
            console.error("❌ Date API call failed:", error);
          }

          // Test 4: Using the existing fetchEventsWithProps function
          console.log("🔍 Test 4: Using fetchEventsWithProps");
          const events = await fetchEventsWithProps(env, "NFL", {
            limit: 5,
          });

          console.log(`📊 fetchEventsWithProps result: ${events.length} events`);

          if (events.length > 0) {
            const firstEvent = events[0];
            console.log("📊 First event structure:", {
              id: firstEvent.id,
              leagueID: firstEvent.leagueID,
              oddsKeys: Object.keys(firstEvent.odds || {}).length,
              playersKeys: Object.keys(firstEvent.players || {}).length,
              sampleOdd: Object.values(firstEvent.odds || {})[0],
            });
          }

          return new Response(
            JSON.stringify({
              success: true,
              eventsCount: events.length,
              firstEvent:
                events.length > 0
                  ? {
                      id: events[0].id,
                      leagueID: events[0].leagueID,
                      oddsCount: Object.keys(events[0].odds || {}).length,
                      playersCount: Object.keys(events[0].players || {}).length,
                    }
                  : null,
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          console.error("❌ Debug API failed:", error);

          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle status endpoints
      if (url.pathname === "/status") {
        return new Response(
          JSON.stringify({
            status: "healthy",
            timestamp: new Date().toISOString(),
            activeLeagues: getActiveLeagues().length,
            totalLeagues: LEAGUES.length,
            availableSeasons: getAllSeasons(),
            commit: (env as any)?.COMMIT_SHA || null,
            branch: (env as any)?.BUILD_BRANCH || null,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      }

      if (url.pathname === "/leagues") {
        return new Response(
          JSON.stringify({
            all: LEAGUES,
            active: getActiveLeagues(),
            total: LEAGUES.length,
            activeCount: getActiveLeagues().length,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      }

      if (url.pathname === "/seasons") {
        return new Response(
          JSON.stringify({
            all: getAllSeasons(),
            total: getAllSeasons().length,
            current: new Date().getFullYear(),
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      }

      // Bulk player analytics endpoint (mirrors Node API)
      if (url.pathname === "/api/player-analytics-bulk" && req.method === "POST") {
        try {
          const body = (await req.json()) as unknown;
          const { playerIds, propType, season } = (body ?? {}) as {
            playerIds?: string[];
            propType?: string;
            season?: string | number;
          };

          if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0 || !propType) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "playerIds array and propType are required",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
              },
            );
          }

          const seasonNum = typeof season === "string" ? parseInt(season, 10) : season;
          const idsCsv = playerIds.join(",");
          const baseSelect = "player_analytics";

          // Helper: normalize a prop type (lowercase alnum only)
          const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
          const requestedNorm = norm(propType);

          // Stage 1: exact match on prop_type (optional season)
          const stage1Params: string[] = [
            `player_id=in.(${idsCsv})`,
            `prop_type=eq.${encodeURIComponent(propType)}`,
            "select=*",
          ];
          if (seasonNum) stage1Params.push(`season=eq.${seasonNum}`);
          const stage1Path = `${baseSelect}?${stage1Params.join("&")}`;
          const { supabaseFetch } = await import("./supabaseFetch");
          const rows: any[] = (await supabaseFetch(env, stage1Path, { method: "GET" })) || [];

          // Build fast lookup of found IDs
          const foundIds = new Set<string>(rows.map((r: any) => r.player_id));
          let missing = playerIds.filter((id) => !foundIds.has(id));

          // Stage 2: fetch remaining players without prop_type filter (optional season), filter by normalized propType in-memory
          if (missing.length > 0) {
            const s2Params: string[] = [
              `player_id=in.(${missing.join(",")})`,
              "select=*",
              "order=season.desc",
            ];
            if (seasonNum) s2Params.push(`season=eq.${seasonNum}`);
            const stage2Path = `${baseSelect}?${s2Params.join("&")}`;
            const stage2Rows: any[] =
              (await supabaseFetch(env, stage2Path, { method: "GET" })) || [];
            const stage2Filtered = stage2Rows.filter(
              (r: any) => r?.prop_type && norm(String(r.prop_type)) === requestedNorm,
            );

            // Deduplicate by player_id, prefer most recent season row
            const bestByPlayer = new Map<string, any>();
            for (const r of stage2Filtered) {
              const key = r.player_id;
              const prev = bestByPlayer.get(key);
              if (!prev || (r.season ?? 0) > (prev.season ?? 0)) bestByPlayer.set(key, r);
            }

            rows.push(...Array.from(bestByPlayer.values()));
            for (const r of bestByPlayer.values()) foundIds.add(r.player_id);
            missing = playerIds.filter((id) => !foundIds.has(id));
          }

          // Stage 3: latest season for any prop_type
          if (missing.length > 0) {
            const s3Params: string[] = [
              `player_id=in.(${missing.join(",")})`,
              "select=*",
              "order=season.desc",
            ];
            const stage3Path = `${baseSelect}?${s3Params.join("&")}`;
            const stage3Rows: any[] =
              (await supabaseFetch(env, stage3Path, { method: "GET" })) || [];
            const bestAnyByPlayer = new Map<string, any>();
            for (const r of stage3Rows) {
              const key = r.player_id;
              const prev = bestAnyByPlayer.get(key);
              if (!prev || (r.season ?? 0) > (prev.season ?? 0)) bestAnyByPlayer.set(key, r);
            }
            rows.push(...Array.from(bestAnyByPlayer.values()));
          }

          return new Response(JSON.stringify({ analytics: rows }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch (error) {
          console.error("❌ /api/player-analytics-bulk failed:", error);
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle enhanced insertion debug endpoint
      if (url.pathname === "/debug-insertion") {
        try {
          const { insertPropsWithDebugging } = await import("./lib/enhancedInsertProps");

          console.log("🔍 Testing enhanced insertion with comprehensive debugging...");

          // Create test data that matches the exact schema
          const timestamp = Date.now();
          const testProps = [
            {
              player_id: `TEST_PLAYER_${timestamp}`,
              player_name: `Test Player ${timestamp}`,
              team: "TEST",
              opponent: "TEST2",
              prop_type: "Passing Yards",
              line: 275.5,
              over_odds: -110,
              under_odds: -110,
              sportsbook: "TestBook",
              league: "nfl",
              season: 2025,
              date: "2025-01-08",
              game_id: `TEST-GAME-${timestamp}`,
              conflict_key: `TEST_CONFLICT_${timestamp}`,
            },
          ];

          console.log("🔍 Test props:", JSON.stringify(testProps, null, 2));

          const result = await insertPropsWithDebugging(env, testProps);

          return new Response(
            JSON.stringify({
              success: true,
              message: "Enhanced insertion test completed",
              result: result,
              testData: testProps,
              timestamp: new Date().toISOString(),
            }),
            {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        }
      }

      // Handle environment variables debug endpoint
      if (url.pathname === "/debug-env") {
        try {
          console.log("🔍 Checking environment variables...");

          const envCheck = {
            SUPABASE_URL: env.SUPABASE_URL ? "✅ Set" : "❌ Missing",
            SUPABASE_SERVICE_KEY: env.SUPABASE_SERVICE_KEY ? "✅ Set" : "❌ Missing",
            SPORTSGAMEODDS_API_KEY: env.SPORTSGAMEODDS_API_KEY ? "✅ Set" : "❌ Missing",
            SUPABASE_URL_LENGTH: env.SUPABASE_URL ? env.SUPABASE_URL.length : 0,
            SUPABASE_SERVICE_KEY_LENGTH: env.SUPABASE_SERVICE_KEY
              ? env.SUPABASE_SERVICE_KEY.length
              : 0,
            SPORTSGAMEODDS_API_KEY_LENGTH: env.SPORTSGAMEODDS_API_KEY
              ? env.SPORTSGAMEODDS_API_KEY.length
              : 0,
            SUPABASE_URL_PREFIX: env.SUPABASE_URL
              ? env.SUPABASE_URL.substring(0, 20) + "..."
              : "N/A",
            SUPABASE_SERVICE_KEY_PREFIX: env.SUPABASE_SERVICE_KEY
              ? env.SUPABASE_SERVICE_KEY.substring(0, 20) + "..."
              : "N/A",
            // Check if service key has the right role
            SERVICE_KEY_ROLE: env.SUPABASE_SERVICE_KEY
              ? env.SUPABASE_SERVICE_KEY.includes("service_role")
                ? "✅ service_role"
                : "⚠️ May not be service role"
              : "❌ No key",
          };

          return new Response(
            JSON.stringify({
              success: true,
              message: "Environment variables check completed",
              envCheck: envCheck,
              timestamp: new Date().toISOString(),
            }),
            {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        }
      }

      // Handle RLS permissions debug endpoint
      if (url.pathname === "/debug-rls") {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");

          console.log("🔍 Testing RLS permissions...");

          // Test 1: Try to read from proplines
          let proplinesReadTest = "Not tested";
          try {
            const proplinesData = await supabaseFetch(env, "proplines?limit=1", {
              method: "GET",
            });
            proplinesReadTest = "✅ Success";
          } catch (error) {
            proplinesReadTest = `❌ Failed: ${error instanceof Error ? error.message : String(error)}`;
          }

          // Test 2: Try to read from player_game_logs
          let gameLogsReadTest = "Not tested";
          try {
            const gameLogsData = await supabaseFetch(env, "player_game_logs?limit=1", {
              method: "GET",
            });
            gameLogsReadTest = "✅ Success";
          } catch (error) {
            gameLogsReadTest = `❌ Failed: ${error instanceof Error ? error.message : String(error)}`;
          }

          // Test 3: Try a small insert test
          let insertTest = "Not tested";
          const timestamp = Date.now();
          const testProp = {
            player_id: `RLS_TEST_${timestamp}`,
            player_name: `RLS Test Player`,
            team: "TEST",
            opponent: "TEST2",
            prop_type: "RLS Test",
            line: 100.0,
            over_odds: -110,
            under_odds: -110,
            sportsbook: "RLSTest",
            league: "nfl",
            season: 2025,
            date: "2025-01-08",
            game_id: `RLS-TEST-${timestamp}`,
            conflict_key: `RLS_TEST_${timestamp}`,
          };

          try {
            const insertResult = await supabaseFetch(env, "proplines", {
              method: "POST",
              body: JSON.stringify([testProp]),
              headers: { Prefer: "resolution=merge-duplicates" },
            });
            insertTest = "✅ Success";

            // Clean up test data
            try {
              await supabaseFetch(env, `proplines?player_id=eq.RLS_TEST_${timestamp}`, {
                method: "DELETE",
              });
              console.log("🧹 Cleaned up test data");
            } catch (cleanupError) {
              console.log("⚠️ Failed to clean up test data:", cleanupError);
            }
          } catch (error) {
            insertTest = `❌ Failed: ${error instanceof Error ? error.message : String(error)}`;
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: "RLS permissions test completed",
              tests: {
                proplinesRead: proplinesReadTest,
                gameLogsRead: gameLogsReadTest,
                insertTest: insertTest,
              },
              testData: testProp,
              timestamp: new Date().toISOString(),
            }),
            {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            },
          );
        }
      }

      // Handle performance data ingestion endpoint
      if (url.pathname === "/performance-ingest") {
        console.log(`🔄 Starting performance data ingestion...`);

        const startTime = Date.now();
        const leagues = url.searchParams.get("leagues")?.split(",");
        const date = url.searchParams.get("date") || undefined;
        const days = parseInt(url.searchParams.get("days") || "1");

        try {
          const result = await runPerformanceIngestion(env, {
            leagues,
            date,
            days,
          });

          const duration = Date.now() - startTime;

          return new Response(
            JSON.stringify({
              message: "Performance data ingestion completed",
              duration: `${duration}ms`,
              ...result,
            }),
            {
              status: result.success ? 200 : 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          console.error("❌ Performance ingestion failed:", error);

          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: `${Date.now() - startTime}ms`,
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle single league performance ingestion
      if (url.pathname.startsWith("/performance-ingest/")) {
        const leagueId = url.pathname.split("/")[2];
        const date = url.searchParams.get("date") || undefined;
        const days = parseInt(url.searchParams.get("days") || "1");

        console.log(`🔄 Starting single league performance ingestion for ${leagueId}...`);

        const startTime = Date.now();

        try {
          const result = await runSingleLeaguePerformanceIngestion(env, leagueId, {
            date,
            days,
          });

          const duration = Date.now() - startTime;

          return new Response(
            JSON.stringify({
              message: `Single league performance ingestion completed for ${leagueId}`,
              duration: `${duration}ms`,
              ...result,
            }),
            {
              status: result.success ? 200 : 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          console.error(`❌ Single league performance ingestion failed for ${leagueId}:`, error);

          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: `${Date.now() - startTime}ms`,
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle historical performance ingestion
      if (url.pathname === "/performance-historical") {
        const startDate = url.searchParams.get("startDate");
        const endDate = url.searchParams.get("endDate");
        const leagues = url.searchParams.get("leagues")?.split(",");

        if (!startDate || !endDate) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "startDate and endDate parameters are required",
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }

        console.log(
          `🔄 Starting historical performance ingestion from ${startDate} to ${endDate}...`,
        );

        const startTime = Date.now();

        try {
          const result = await runHistoricalPerformanceIngestion(env, {
            leagues,
            startDate,
            endDate,
          });

          const duration = Date.now() - startTime;

          return new Response(
            JSON.stringify({
              message: "Historical performance ingestion completed",
              duration: `${duration}ms`,
              ...result,
            }),
            {
              status: result.success ? 200 : 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          console.error("❌ Historical performance ingestion failed:", error);

          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: `${Date.now() - startTime}ms`,
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle debug data check endpoint
      if (url.pathname === "/debug-data-check") {
        console.log(`🔍 Debug data check...`);

        try {
          // Check proplines
          const proplinesResponse = await supabaseFetch(env, "proplines?limit=5", {
            method: "GET",
          });

          // Check player_game_logs
          const gameLogsResponse = await supabaseFetch(env, "player_game_logs?limit=5", {
            method: "GET",
          });

          return new Response(
            JSON.stringify({
              success: true,
              message: "Data check completed",
              proplines: {
                count: proplinesResponse ? proplinesResponse.length : 0,
                sample:
                  proplinesResponse && proplinesResponse.length > 0 ? proplinesResponse[0] : null,
              },
              gameLogs: {
                count: gameLogsResponse ? gameLogsResponse.length : 0,
                sample:
                  gameLogsResponse && gameLogsResponse.length > 0 ? gameLogsResponse[0] : null,
              },
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle performance diagnostic endpoint
      if (url.pathname === "/debug-performance-diagnostic") {
        console.log(`🔍 Running performance diagnostic...`);

        try {
          const result = await runPerformanceDiagnostic(env);

          return new Response(
            JSON.stringify({
              success: true,
              message: "Performance diagnostic completed",
              result: result,
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Handle debug events endpoint
      if (url.pathname === "/debug-events") {
        const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

        console.log(`🔍 Debug events for date: ${date}`);

        try {
          const results = await fetchAllLeaguesEvents(date, env);

          const summary = {
            date: date,
            leagues: {} as Record<string, any>,
          };

          for (const [league, events] of Object.entries(results)) {
            summary.leagues[league] = {
              eventCount: events.length,
              hasEvents: events.length > 0,
              sampleEvent:
                events.length > 0
                  ? {
                      id: events[0].event_id || events[0].eventID || "unknown",
                      homeTeam:
                        events[0].home_team?.name ||
                        events[0].teams?.home?.names?.long ||
                        "unknown",
                      awayTeam:
                        events[0].away_team?.name ||
                        events[0].teams?.away?.names?.long ||
                        "unknown",
                      hasPlayerProps: !!(
                        events[0].player_props && events[0].player_props.length > 0
                      ),
                      hasMarkets: !!(events[0].markets && events[0].markets.length > 0),
                    }
                  : null,
            };
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: "Events debug completed",
              summary: summary,
              rawResults: results,
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      }

      // Default 404 response
      return new Response(
        JSON.stringify({
          error: "Endpoint not found",
          availableEndpoints: [
            "/backfill-all",
            "/backfill-recent",
            "/backfill-full",
            "/backfill-league/{league}",
            "/backfill-season/{season}",
            "/backfill-progressive",
            "/ingest",
            "/ingest/{league}",
            "/refresh-analytics",
            "/incremental-analytics-refresh",
            "/analytics/streaks",
            "/analytics/defensive-rankings",
            "/analytics/matchup-rank",
            "/analytics/last-5",
            "/analytics/last-10",
            "/analytics/last-20",
            "/analytics/h2h",
            "/debug-streaks",
            "/debug-streak-counts",
            "/status",
            "/leagues",
            "/seasons",
          ],
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    } catch (error) {
      console.error("❌ Worker fetch error:", error);

      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error) || "Internal Server Error",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }
  },

  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
    console.log(`🕐 Scheduled ingestion triggered at ${new Date().toISOString()}`);

    // Run current season ingestion on cron
    ctx.waitUntil(runIngestion(env));
  },
};

// Performance Diagnostic Function (NO SUPABASE)
async function runPerformanceDiagnostic(_env: any): Promise<any> {
  console.log("ℹ️ runPerformanceDiagnostic is disabled (NO SUPABASE)");
  return {
    disabled: true,
    reason: "Supabase removed. Persistence diagnostics are not available in the worker.",
  };
}
