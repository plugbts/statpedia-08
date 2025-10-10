// Multi-League Multi-Season Worker with Backfill Support
// Handles both real-time ingestion and historical backfill operations

import { runMultiSeasonBackfill, runRecentSeasonsBackfill, runFullHistoricalBackfill, runLeagueSpecificBackfill, runSeasonSpecificBackfill, runProgressiveBackfill } from "./jobs/multiBackfill";
import { runIngestion, runSingleLeagueIngestion } from "./jobs/ingest";
import { runPerformanceIngestion, runSingleLeaguePerformanceIngestion, runHistoricalPerformanceIngestion } from "./jobs/performanceIngestion";
import { fetchAllLeaguesEvents } from "./lib/sportsGameOddsPerformanceFetcher";
import { supabaseFetch } from "./supabaseFetch";
import { LEAGUES, getActiveLeagues, getAllSeasons, getActiveLeagueSeasonPairs } from "./config/leagues";
import { withCORS, handleOptions } from "./cors";
import { normalizeDate, normalizeLeague, isDateMatch } from "./normalizers";
import { initializePropTypeSync, normalizePropType } from "./propTypeSync";
import { initializeSupportedProps, loadSupportedProps, SupportedProps } from "./supportedProps";
import { filterPropsByLeague, filterGameLogsByLeague } from "./ingestionFilter";
import { initializeCoverageReport, generateCoverageReport, getCoverageSummary } from "./coverageReport";
import { getFixedPlayerPropsWithAnalytics } from "./fixes";
import { cleanPlayerNames } from "./playerNames";
import { enrichTeams } from "./teams";
import { fetchPropsForDate, type EnrichedProp } from "./fetchProps";
// import { getPlayerPropsFixed } from "./player-props-fixed"; // No longer needed - using direct view fetch

// Initialize prop type sync and supported props at worker startup
let propTypeSyncInitialized = false;
let supportedProps: SupportedProps = {};

export default {
  async fetch(req: Request, env: any) {
    try {
      // Initialize prop type sync and supported props on first request
      if (!propTypeSyncInitialized) {
        try {
          await initializePropTypeSync(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
          supportedProps = await initializeSupportedProps(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
          await initializeCoverageReport(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
          propTypeSyncInitialized = true;
          console.log("✅ Prop type sync, supported props, and coverage report initialized successfully");
        } catch (error) {
          console.warn("⚠️ Failed to initialize prop type sync, supported props, or coverage report:", error);
          console.warn("⚠️ Falling back to hardcoded normalizers");
        }
      }
      
      const url = new URL(req.url);
      const origin = req.headers.get("Origin") || "*";
      
      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        return handleOptions(req, origin);
      }

      // Helper function to wrap responses with CORS
      const corsResponse = (body: any, status: number = 200, headers: Record<string, string> = {}) => {
        const response = new Response(
          typeof body === 'string' ? body : JSON.stringify(body),
          {
            status,
            headers: {
              'Content-Type': 'application/json',
              ...headers
            }
          }
        );
        return withCORS(response, origin);
      };

      // Default response with available endpoints
      if (url.pathname === '/') {
        return corsResponse({
          message: 'Multi-League Multi-Season Props Ingestion Worker',
          endpoints: {
            ingestion: ['/ingest', '/ingest/{league}'],
            backfill: ['/backfill-all', '/backfill-recent', '/backfill-full', '/backfill-league/{league}', '/backfill-season/{season}'],
            performance: ['/performance-ingest', '/performance-ingest/{league}', '/performance-historical'],
            analytics: ['/refresh-analytics', '/incremental-analytics-refresh', '/analytics/streaks', '/analytics/defensive-rankings', '/analytics/matchup-rank', '/analytics/last-5', '/analytics/last-10', '/analytics/last-20', '/analytics/h2h'],
            verification: ['/verify-backfill', '/verify-analytics'],
            status: ['/status', '/leagues', '/seasons'],
            debug: ['/debug-api', '/debug-comprehensive', '/debug-json', '/debug-extraction', '/debug-insert', '/debug-schema', '/debug-streaks', '/debug-streak-counts', '/debug-insertion', '/debug-env', '/debug-rls', '/debug-events', '/debug-data-check', '/debug-performance-diagnostic']
          },
          leagues: getActiveLeagues().map(l => l.id),
          seasons: getAllSeasons(),
          features: ['Multi-league ingestion', 'Multi-season backfill', 'Analytics computation', 'Fallback logic', 'Progressive backfill']
        });
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
          
          return new Response(JSON.stringify({
            success: true,
            message: "Analytics views refreshed successfully",
            timestamp: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
          
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
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
          
          return new Response(JSON.stringify({
            success: true,
            message: `Incremental analytics refresh completed for last ${daysBack} days`,
            timestamp: new Date().toISOString(),
            daysBack: daysBack
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
          
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }

      // Handle conflict key audit
      if (url.pathname === "/debug-conflict-audit") {
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

          const { data, error } = await supabase
            .from("player_game_logs")
            .select("league, conflict_key, prop_type");

          if (error) {
            console.error("❌ Supabase error:", error);
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
              }
            );
          }

          // Aggregate counts
          const results: Record<string, { bad: number; good: number; total: number; badExamples: string[] }> = {};

          data.forEach((row: any) => {
            const league = row.league || "unknown";
            if (!results[league]) results[league] = { bad: 0, good: 0, total: 0, badExamples: [] };

            results[league].total++;
            if (row.conflict_key.includes("|gamelog|")) {
              results[league].bad++;
              // Collect examples of bad conflict keys with prop types
              if (results[league].badExamples.length < 3) {
                results[league].badExamples.push(`${row.prop_type} -> ${row.conflict_key}`);
              }
            } else {
              results[league].good++;
            }
          });

          console.log("📊 Conflict Key Audit Results:");
          Object.entries(results).forEach(([league, counts]) => {
            console.log(
              `${league.toUpperCase()}: total=${counts.total}, good=${counts.good}, bad=${counts.bad}`
            );
            if (counts.badExamples.length > 0) {
              console.log(`  Bad examples:`, counts.badExamples);
            }
          });

          return new Response(
            JSON.stringify({
              success: true,
              results,
              message: "Conflict key audit completed",
              timestamp: new Date().toISOString(),
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            }
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
            }
          );
        }
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
            values && values.length > 0
              ? `in.(${values.map(v => `"${v}"`).join(",")})`
              : null;

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

          const gameLogs = await supabaseFetch(env, query, { method: "GET" }) as any[];

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
              }
            );
          }

          // --- Fetch corresponding prop lines ---
          const playerIds = [...new Set(gameLogs.map(g => g.player_id))];
          const propTypes = [...new Set(gameLogs.map(g => g.prop_type))];
          const dates = [...new Set(gameLogs.map(g => normalizeDate(g.date)))];

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
          const propLines = await supabaseFetch(env, propsQuery, { method: "GET" }) as any[];

          console.log(`📊 Player Props fetched: ${propLines?.length || 0}`);
          if (propLines && propLines.length > 0) {
            console.log("📊 Sample prop line:", JSON.stringify(propLines[0], null, 2));
          }

          // --- Diagnostic helper ---
          function logMismatch(gameLog: any, propLines: any[]) {
            // Find "closest" candidates by player_id
            const candidates = propLines.filter(
              (p: any) => p.player_id === gameLog.player_id
            );

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
            .map(gameLog => {
              const propLine = propLines?.find(
                prop =>
                  prop.player_id === gameLog.player_id &&
                  prop.prop_type === gameLog.prop_type &&
                  normalizeDate(prop.date) === normalizeDate(gameLog.date) &&
                  prop.league === gameLog.league
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
            league !== "all" ? streaks.filter(s => s.league === league) : streaks;

          // --- Apply limit ---
          const limitedStreaks = filteredStreaks.slice(0, limit);

          console.log(
            `📊 Computed ${limitedStreaks.length} streaks (${filteredStreaks.length} total)`
          );

          return new Response(
            JSON.stringify({
              success: true,
              data: limitedStreaks,
              league,
              limit,
              total_found: filteredStreaks.length,
              message:
                limitedStreaks.length === 0
                  ? "No streaks found"
                  : "Streaks computed successfully",
              timestamp: new Date().toISOString(),
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            }
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
            }
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
            query += `?${params.join('&')}`;
          }
          
          const result = await supabaseFetch(env, query as any, {
            method: "GET",
          });
          
          return new Response(JSON.stringify({
            success: true,
            data: result,
            league: league,
            limit: limit,
            timestamp: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        } catch (error) {
          console.error("❌ Debug streaks error:", error);
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
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
          
          return new Response(JSON.stringify({
            success: true,
            table: table,
            limit: limit,
            count: result?.length || 0,
            data: result,
            timestamp: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        } catch (error) {
          console.error("❌ Direct query error:", error);
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
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
            query += `?${params.join('&')}`;
          }
          
          const result = await supabaseFetch(env, query as any, {
            method: "GET",
          });
          
          return new Response(JSON.stringify({
            success: true,
            data: result,
            league: league,
            timestamp: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        } catch (error) {
          console.error("❌ Debug streak counts error:", error);
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
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

          const gameLogs = await supabaseFetch(env, gameLogsQuery, { method: "GET" }) as any[];
          
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
              }
            );
          }

          // --- Helpers ---
          const normalizeDate = (d: string) => d.split("T")[0];
          const inFilter = (values: string[]) =>
            values && values.length > 0
              ? `in.(${values.map(v => `"${v}"`).join(",")})`
              : null;

          // --- Build filters ---
          const filters: string[] = [];

          const playerIds = [...new Set(gameLogs.map(g => g.player_id))];
          const propTypes = [...new Set(gameLogs.map(g => g.prop_type))];
          const dates = [...new Set(gameLogs.map(g => normalizeDate(g.date)))];

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
          const propLines = await supabaseFetch(env, propsQuery, { method: "GET" }) as any[];

          console.log(`📊 Player Props fetched: ${propLines?.length || 0}`);
          if (propLines && propLines.length > 0) {
            console.log("📊 Sample prop line:", JSON.stringify(propLines[0], null, 2));
          }

          // Calculate matchup performance
          const matchupRankings = gameLogs
            .map(gameLog => {
              const propLine = propLines?.find(
                prop =>
                  prop.player_id === gameLog.player_id &&
                  prop.prop_type === gameLog.prop_type &&
                  prop.date.split("T")[0] === gameLog.date.split("T")[0] &&
                  prop.league === gameLog.league
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
            }
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
            }
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

          const gameLogs = await supabaseFetch(env, query, { method: "GET" }) as any[];

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
              }
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
                games: []
              });
            }
            
            const stats = playerStats.get(key);
            if (stats.games.length < 5) {
              stats.games.push({
                date: log.date.split("T")[0],
                value: log.value,
                opponent: log.opponent || "Unknown"
              });
            }
          });

          // Calculate performance metrics
          const last5Performance = Array.from(playerStats.values())
            .map(player => {
              const games = player.games;
              const avgValue = games.reduce((sum, game) => sum + game.value, 0) / games.length;
              const totalGames = games.length;
              
              return {
                ...player,
                total_games: totalGames,
                avg_value: Math.round(avgValue * 100) / 100,
                latest_value: games[0]?.value || 0,
                latest_date: games[0]?.date || null,
                trend: games.length >= 2 ? 
                  (games[0].value > games[1].value ? "up" : games[0].value < games[1].value ? "down" : "stable") : "insufficient_data"
              };
            })
            .filter(player => player.total_games > 0)
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
            }
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
            }
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

          const gameLogs = await supabaseFetch(env, query, { method: "GET" }) as any[];

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
              }
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
                games: []
              });
            }
            
            const stats = playerStats.get(key);
            if (stats.games.length < 10) {
              stats.games.push({
                date: log.date.split("T")[0],
                value: log.value,
                opponent: log.opponent || "Unknown"
              });
            }
          });

          // Calculate performance metrics
          const last10Performance = Array.from(playerStats.values())
            .map(player => {
              const games = player.games;
              const avgValue = games.reduce((sum, game) => sum + game.value, 0) / games.length;
              const totalGames = games.length;
              const recent5 = games.slice(0, Math.min(5, games.length));
              const earlier5 = games.slice(5, Math.min(10, games.length));
              
              const recentAvg = recent5.reduce((sum, game) => sum + game.value, 0) / recent5.length;
              const earlierAvg = earlier5.length > 0 ? 
                earlier5.reduce((sum, game) => sum + game.value, 0) / earlier5.length : recentAvg;
              
              return {
                ...player,
                total_games: totalGames,
                avg_value: Math.round(avgValue * 100) / 100,
                recent_5_avg: Math.round(recentAvg * 100) / 100,
                earlier_5_avg: Math.round(earlierAvg * 100) / 100,
                improvement: Math.round((recentAvg - earlierAvg) * 100) / 100,
                latest_value: games[0]?.value || 0,
                latest_date: games[0]?.date || null
              };
            })
            .filter(player => player.total_games > 0)
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
            }
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
            }
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

          const gameLogs = await supabaseFetch(env, query, { method: "GET" }) as any[];

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
              }
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
                games: []
              });
            }
            
            const stats = playerStats.get(key);
            if (stats.games.length < 20) {
              stats.games.push({
                date: log.date.split("T")[0],
                value: log.value,
                opponent: log.opponent || "Unknown"
              });
            }
          });

          // Calculate performance metrics
          const last20Performance = Array.from(playerStats.values())
            .map(player => {
              const games = player.games;
              const avgValue = games.reduce((sum, game) => sum + game.value, 0) / games.length;
              const totalGames = games.length;
              
              // Calculate consistency (lower standard deviation = more consistent)
              const variance = games.reduce((sum, game) => sum + Math.pow(game.value - avgValue, 2), 0) / games.length;
              const standardDeviation = Math.sqrt(variance);
              
              // Calculate trends
              const recent10 = games.slice(0, Math.min(10, games.length));
              const earlier10 = games.slice(10, Math.min(20, games.length));
              
              const recentAvg = recent10.reduce((sum, game) => sum + game.value, 0) / recent10.length;
              const earlierAvg = earlier10.length > 0 ? 
                earlier10.reduce((sum, game) => sum + game.value, 0) / earlier10.length : recentAvg;
              
              return {
                ...player,
                total_games: totalGames,
                avg_value: Math.round(avgValue * 100) / 100,
                recent_10_avg: Math.round(recentAvg * 100) / 100,
                earlier_10_avg: Math.round(earlierAvg * 100) / 100,
                improvement: Math.round((recentAvg - earlierAvg) * 100) / 100,
                consistency: Math.round(standardDeviation * 100) / 100,
                latest_value: games[0]?.value || 0,
                latest_date: games[0]?.date || null
              };
            })
            .filter(player => player.total_games > 0)
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
            }
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
            }
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

          const gameLogs = await supabaseFetch(env, query, { method: "GET" }) as any[];

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
              }
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
                avg_value: 0
              });
            }
            
            const stats = h2hStats.get(key);
            stats.games.push({
              date: log.date.split("T")[0],
              value: log.value
            });
            stats.total_games = stats.games.length;
            stats.avg_value = stats.games.reduce((sum, game) => sum + game.value, 0) / stats.games.length;
          });

          // Convert to array and sort by total games and average value
          const h2hRankings = Array.from(h2hStats.values())
            .filter(stats => stats.total_games >= 2) // Only include players with multiple games vs same opponent
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
            }
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
            }
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
          
          return new Response(JSON.stringify({
            success: true,
            data: result,
            league: league,
            propType: propType,
            timestamp: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
          
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }

      // Handle simple test endpoint for debugging
      if (url.pathname === "/api/test-mlb") {
        const { supabaseFetch } = await import("./supabaseFetch");
        // Try different query formats
        const data1 = await supabaseFetch(env, `player_props_fixed?league=eq.mlb&prop_date=eq.2025-10-10&limit=200`);
        const data2 = await supabaseFetch(env, `player_props_fixed?league=eq.mlb&limit=200`);
        
        const data = data1;
        
        return corsResponse({
          success: true,
          count1: data1?.length || 0,
          count2: data2?.length || 0,
          data1: data1?.slice(0, 3) || [],
          data2: data2?.slice(0, 3) || []
        });
      }

      // Debug endpoint to inspect SportsGameOdds API response
      if (url.pathname === "/debug/sgo-api") {
        try {
          const league = url.searchParams.get("league")?.toLowerCase() || "nfl";
          const { fetchEventsWithProps } = await import("./lib/api");
          
          console.log(`🔍 [DEBUG] Fetching SGO API response for ${league}...`);
          const events = await fetchEventsWithProps(env, league.toUpperCase(), { limit: 5 });
          
          return corsResponse({
            success: true,
            league,
            eventsFound: events.length,
            sampleEvents: events.slice(0, 2).map(event => ({
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
              game: event.game ? {
                homeTeamId: event.game.homeTeamId ?? event.game.homeTeamID ?? null,
                awayTeamId: event.game.awayTeamId ?? event.game.awayTeamID ?? null,
                teams: event.game.teams ?? null
              } : null,
              oddsCount: event.odds ? Object.keys(event.odds).length : 0,
              oddsSample: event.odds ? Object.keys(event.odds).slice(0, 2).map(oddId => {
                const odd = event.odds[oddId];
                return {
                  oddId,
                  teamID: odd?.teamID ?? null,
                  playerTeamID: odd?.playerTeamID ?? null,
                  playerID: odd?.playerID ?? null,
                  statID: odd?.statID ?? null
                };
              }) : null
            }))
          });
        } catch (error) {
          return corsResponse({
            success: false,
            error: error.message
          }, 500);
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
          
          // Get max props per request based on sport (recommended caps)
          const getMaxPropsForSport = (sport: string): number => {
            switch (sport.toLowerCase()) {
              case 'nfl': return 150;
              case 'nba': return 100;
              case 'mlb': return 200;
              case 'nhl': return 70;
              default: return 150;
            }
          };
          const maxPropsPerRequest = getMaxPropsForSport(sport);
          const cacheTtlSeconds = parseInt(env.CACHE_TTL_SECONDS || "300");
          
          console.log(`📊 NEW PIPELINE: Fetching player props for ${sport} (date: ${date}, forceRefresh: ${forceRefresh}, maxProps: ${maxPropsPerRequest})...`);
          
          // Generate cache key
          const cacheKey = `player-props-${sport}-${date || 'all'}-${dateFrom || ''}-${dateTo || ''}`;
          
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
                  timestamp: cached.timestamp || new Date().toISOString()
                });
              }
            } catch (cacheError) {
              console.warn("⚠️ Cache read error:", cacheError);
            }
          }
          
          // Map sport to league
          const leagueMap: Record<string, string> = {
            'nfl': 'nfl',
            'nba': 'nba', 
            'mlb': 'mlb',
            'nhl': 'nhl'
          };
          
          const league = leagueMap[sport] || 'nfl';

          // Use our new worker-centric pipeline
          let enrichedProps: EnrichedProp[] = [];
          
          try {
            if (date) {
              // Single date query
              console.log(`📊 NEW PIPELINE: Fetching props for ${league} on ${date}...`);
              enrichedProps = await fetchPropsForDate(env, league, date);
            } else if (dateFrom && dateTo) {
              // Date range query - get props for each date in range
              const startDate = new Date(dateFrom);
              const endDate = new Date(dateTo);
              const allProps: EnrichedProp[] = [];
              
              for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                try {
                  console.log(`📊 NEW PIPELINE: Fetching props for ${league} on ${dateStr}...`);
                  const dayProps = await fetchPropsForDate(env, league, dateStr);
                  allProps.push(...dayProps);
                } catch (error) {
                  console.warn(`⚠️ Failed to fetch props for ${dateStr}:`, error);
                }
              }
              enrichedProps = allProps;
            } else {
              // No date filter - find the most recent date with data
              console.log(`📊 NEW PIPELINE: Finding most recent date with data for ${league}...`);
              
              // Try to find a recent date with data by checking the last few days
              const today = new Date();
              let foundData = false;
              
              for (let i = 0; i < 7; i++) {
                const checkDate = new Date(today);
                checkDate.setDate(checkDate.getDate() - i);
                const dateStr = checkDate.toISOString().split('T')[0];
                
                try {
                  const testProps = await fetchPropsForDate(env, league, dateStr);
                  if (testProps.length > 0) {
                    console.log(`📅 NEW PIPELINE: Found data for ${league} on ${dateStr} (${testProps.length} props)`);
                    enrichedProps = testProps;
                    foundData = true;
                    break;
                  }
                } catch (error) {
                  console.warn(`⚠️ Failed to check ${dateStr}:`, error);
                }
              }
              
              if (!foundData) {
                console.log(`⚠️ NEW PIPELINE: No data found for league ${league} in last 7 days`);
                enrichedProps = [];
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
                last5_hits: enrichedProps[0].last5_hits
              });
            }
          } catch (error) {
            console.error("❌ NEW PIPELINE: Failed to fetch enriched player props:", error);
            return corsResponse({
              success: false,
              error: `Failed to fetch player props: ${error instanceof Error ? error.message : String(error)}`,
              sport: sport,
              date: date,
              timestamp: new Date().toISOString()
            }, 500);
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
              timestamp: new Date().toISOString()
            });
          }

          // Filter out defensive props for NFL and NBA
          const filteredProps = enrichedProps.filter((prop: EnrichedProp) => {
            const propType = prop.prop_type?.toLowerCase() || '';
            const currentSport = sport.toLowerCase();
            
            // Remove defensive props for NFL and NBA
            if (currentSport === 'nfl' || currentSport === 'nba') {
              const isDefensiveProp = propType.includes('defense') || 
                                    propType.includes('tackle') || 
                                    propType.includes('sack') || 
                                    propType.includes('interception') ||
                                    propType.includes('pass_defended') ||
                                    propType.includes('forced_fumble') ||
                                    propType.includes('fumble_recovery') ||
                                    propType.includes('defensive_td') ||
                                    propType.includes('safety') ||
                                    propType.includes('blocked_kick') ||
                                    propType.includes('defensive_special_teams') ||
                                    propType.includes('defensive_combined_tackles') ||
                                    propType.includes('defensive_solo_tackles') ||
                                    propType.includes('defensive_assisted_tackles') ||
                                    propType.includes('defensive_sacks') ||
                                    propType.includes('defensive_interceptions') ||
                                    propType.includes('defensive_pass_defended') ||
                                    propType.includes('defensive_forced_fumbles') ||
                                    propType.includes('defensive_fumble_recoveries') ||
                                    propType.includes('defensive_touchdowns') ||
                                    propType.includes('defensive_safeties') ||
                                    propType.includes('defensive_blocked_kicks');
              
              if (isDefensiveProp) {
                console.log(`🚫 Filtered out defensive prop: ${prop.prop_type} for ${currentSport}`);
                return false;
              }
            }
            
            return true;
          });
          
          console.log(`📊 NEW PIPELINE: Filtered to ${filteredProps.length} props (removed defensive props for NFL/NBA)`);

          // Apply max props per request limit
          const limitedProps = filteredProps.slice(0, maxPropsPerRequest);
          console.log(`📊 Limited to ${limitedProps.length} props (max: ${maxPropsPerRequest})`);

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
              line: prop.line,
              overOdds: prop.over_odds,
              underOdds: prop.under_odds,
              sportsbooks: ['SportsGameOdds'], // Default sportsbook
              position: 'N/A',
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
              period: 'full_game',
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
              bestOver: prop.over_odds ? { 
                bookmaker: 'SportsGameOdds', 
                side: 'over', 
                price: prop.over_odds.toString(), 
                line: prop.line 
              } : undefined,
              bestUnder: prop.under_odds ? { 
                bookmaker: 'SportsGameOdds', 
                side: 'under', 
                price: prop.under_odds.toString(), 
                line: prop.line 
              } : undefined,
              allBooks: prop.over_odds ? [{ 
                bookmaker: 'SportsGameOdds', 
                side: 'over', 
                price: prop.over_odds.toString(), 
                line: prop.line, 
                deeplink: '' 
              }] : [],
              
              // Debug fields
              clean_player_name: prop.clean_player_name,
              debug_team: prop.debug_team,
              debug_ev: prop.debug_ev
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
            timestamp: new Date().toISOString()
          };

          // Cache the response (unless force refresh)
          if (!forceRefresh && env.PLAYER_PROPS_CACHE) {
            try {
              await env.PLAYER_PROPS_CACHE.put(cacheKey, JSON.stringify(response), {
                expirationTtl: cacheTtlSeconds
              });
              console.log(`📊 Cached response for ${cacheKey} (TTL: ${cacheTtlSeconds}s)`);
            } catch (cacheError) {
              console.warn("⚠️ Cache write error:", cacheError);
            }
          }

          return corsResponse(response);
          
        } catch (error) {
          console.error('❌ Player props API error:', error);
          return corsResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            data: [],
            cached: false,
            cacheKey: '',
            responseTime: 0,
            totalEvents: 0,
            totalProps: 0
          }, 500);
        }
      }

      // Handle prop sync refresh endpoint
      if (url.pathname === '/refresh-prop-sync') {
        try {
          const { refreshPropTypeAliases } = await import("./propTypeSync");
          const success = await refreshPropTypeAliases();
          
          return new Response(JSON.stringify({
            success: success,
            message: success ? "Prop type aliases refreshed successfully" : "Failed to refresh prop type aliases",
            timestamp: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Handle supported props refresh endpoint
      if (url.pathname === '/refresh-supported-props') {
        try {
          supportedProps = await loadSupportedProps();
          
          return new Response(JSON.stringify({
            success: true,
            message: "Supported props refreshed successfully",
            supportedLeagues: Object.keys(supportedProps),
            leagueCounts: Object.entries(supportedProps).map(([league, props]) => ({
              league,
              count: props.size
            })),
            timestamp: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Handle supported props debug endpoint
      if (url.pathname === '/debug-supported-props') {
        try {
          const { getSupportedPropsSummary } = await import("./ingestionFilter");
          const summary = getSupportedPropsSummary(supportedProps);
          
          return new Response(JSON.stringify({
            success: true,
            supportedProps: summary,
            totalLeagues: Object.keys(supportedProps).length,
            totalProps: Object.values(supportedProps).reduce((sum, props) => sum + props.size, 0),
            timestamp: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Handle coverage report endpoint
      if (url.pathname === '/coverage-report') {
        try {
          const coverage = await generateCoverageReport();
          const summary = getCoverageSummary(coverage);
          
          return new Response(JSON.stringify({
            success: true,
            coverage: summary,
            timestamp: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Handle prop sync debug endpoint
      if (url.pathname === '/debug-prop-sync') {
        try {
          const { getAliasCache } = await import("./propTypeSync");
          const aliasCache = getAliasCache();
          
          const testCases = [
            { input: 'pts', expected: 'points' },
            { input: 'reb', expected: 'rebounds' },
            { input: 'sacks', expected: 'defense_sacks' },
            { input: 'td', expected: 'fantasyscore' },
            { input: 'Goals', expected: 'goals' },
            { input: 'batting_basesOnBalls', expected: 'walks' }
          ];
          
          const results = testCases.map(test => ({
            input: test.input,
            output: normalizePropType(test.input),
            expected: test.expected,
            correct: normalizePropType(test.input) === test.expected
          }));
          
          return new Response(JSON.stringify({
            success: true,
            aliasCacheSize: Object.keys(aliasCache).length,
            sampleAliases: Object.entries(aliasCache).slice(0, 5),
            testResults: results,
            timestamp: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Handle join diagnostics endpoint
      if (url.pathname === '/debug-join-diagnostics') {
        try {
          const { createClient } = await import("@supabase/supabase-js");
          
          const supabase = createClient(
            env.SUPABASE_URL,
            env.SUPABASE_SERVICE_KEY
          );

          console.log('🔍 Running join diagnostics...');

          // 1. Game logs vs props coverage (remove limits to get real data)
          const { data: gameLogs, error: glErr } = await supabase
            .from("player_game_logs")
            .select("player_id, game_id, prop_type, league, season, date, conflict_key")
            .limit(1000);

          const { data: props, error: prErr } = await supabase
            .from("proplines")
            .select("player_id, game_id, prop_type, league, season, date, date_normalized, conflict_key")
            .limit(1000);

          if (glErr || prErr) {
            console.error("❌ Supabase error:", glErr || prErr);
            return corsResponse({
              success: false,
              error: glErr?.message || prErr?.message
            }, 500);
          }

          // Group by league
          const results: Record<
            string,
            { totalLogs: number; matchedProps: number; unmatchedLogs: number }
          > = {};

           // Use normalizers for consistent prop type matching

           gameLogs!.forEach((g) => {
             const league = normalizeLeague(g.league);
             if (!results[league]) {
               results[league] = { totalLogs: 0, matchedProps: 0, unmatchedLogs: 0 };
             }
             results[league].totalLogs++;

             // Normalize game log data
             const normalizedGameLog = {
               player_id: g.player_id,
               game_id: g.game_id,
               prop_type: normalizePropType(g.prop_type),
               date: normalizeDate(g.date),
               league: normalizeLeague(g.league),
               season: g.season
             };

             const match = props!.find((p) => {
               // Normalize prop line data
               const normalizedProp = {
                 player_id: p.player_id,
                 game_id: p.game_id,
                 prop_type: normalizePropType(p.prop_type),
                 date: normalizeDate(p.date_normalized || p.date),
                 league: normalizeLeague(p.league),
                 season: p.season
               };

               return (
                 normalizedGameLog.player_id === normalizedProp.player_id &&
                 normalizedGameLog.game_id === normalizedProp.game_id &&
                 normalizedGameLog.prop_type === normalizedProp.prop_type &&
                 normalizedGameLog.date === normalizedProp.date &&
                 normalizedGameLog.league === normalizedProp.league &&
                 normalizedGameLog.season === normalizedProp.season
               );
             });

            if (match) {
              results[league].matchedProps++;
            } else {
              results[league].unmatchedLogs++;
            }
          });

          console.log("📊 Join Diagnostic Results:");
          Object.entries(results).forEach(([league, counts]) => {
            console.log(
              `${league.toUpperCase()}: totalLogs=${counts.totalLogs}, matchedProps=${counts.matchedProps}, unmatchedLogs=${counts.unmatchedLogs}`
            );
          });

          // 2. Reverse coverage: props without matching logs
          const reverse: Record<
            string,
            { totalProps: number; matchedLogs: number; unmatchedProps: number }
          > = {};

           props!.forEach((p) => {
             const league = p.league.toLowerCase();
             if (!reverse[league]) {
               reverse[league] = { totalProps: 0, matchedLogs: 0, unmatchedProps: 0 };
             }
             reverse[league].totalProps++;

             const match = gameLogs!.find(
               (g) => {
                 // Use the same conflict_key matching logic as the main API
                 const gameLogParts = g.conflict_key.split('|');
                 const [player_id, game_id, prop_type, league, season] = gameLogParts;
                 
                 const propParts = p.conflict_key.split('|');
                 if (propParts.length !== 6) return false;
                 
                 const [p_player_id, p_game_id, p_prop_type, p_sportsbook, p_league, p_season] = propParts;
                 
                 // Use normalizers for consistent prop type matching
                 const normalizedGameLogPropType = normalizePropType(prop_type);
                 const normalizedPropPropType = normalizePropType(p_prop_type);
                 
                 return p_player_id === player_id &&
                        p_game_id === game_id &&
                        normalizedGameLogPropType === normalizedPropPropType &&
                        isDateMatch(g.date, p.date_normalized) &&
                        p_league === league &&
                        p_season === season;
               }
             );

            if (match) {
              reverse[league].matchedLogs++;
            } else {
              reverse[league].unmatchedProps++;
            }
          });

          console.log("📊 Reverse Diagnostic Results:");
          Object.entries(reverse).forEach(([league, counts]) => {
            console.log(
              `${league.toUpperCase()}: totalProps=${counts.totalProps}, matchedLogs=${counts.matchedLogs}, unmatchedProps=${counts.unmatchedProps}`
            );
          });

          return corsResponse({
            success: true,
            forwardJoin: results,
            reverseJoin: reverse,
            summary: {
              totalGameLogs: gameLogs?.length || 0,
              totalProps: props?.length || 0,
              totalMatched: Object.values(results).reduce((sum, r) => sum + r.matchedProps, 0),
              totalUnmatched: Object.values(results).reduce((sum, r) => sum + r.unmatchedLogs, 0)
            },
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          console.error('❌ Join diagnostics error:', error);
          return corsResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }, 500);
        }
      }

      // Handle field-level mismatch diagnostics
      if (url.pathname === '/debug-field-mismatch') {
        try {
          const { createClient } = await import("@supabase/supabase-js");
          
          const supabase = createClient(
            env.SUPABASE_URL,
            env.SUPABASE_SERVICE_KEY
          );

          console.log('🔍 Running field-level mismatch diagnostics...');

          const { data: gameLogs } = await supabase
            .from("player_game_logs")
            .select("player_id, prop_type, league, date, conflict_key");

          const { data: props } = await supabase
            .from("proplines")
            .select("player_id, prop_type, league, date_normalized, conflict_key");

           // Use normalizers for field-level diagnostics

           function explainMismatch(gameLog: any, prop: any) {
             const issues: string[] = [];

             // Use the same conflict_key matching logic as the main API
             const gameLogParts = gameLog.conflict_key.split('|');
             const [player_id, game_id, prop_type, league, season] = gameLogParts;
             
             const propParts = prop.conflict_key.split('|');
             if (propParts.length !== 6) {
               issues.push("prop conflict_key format mismatch (not 6 parts)");
               return issues.join(", ");
             }
             
             const [p_player_id, p_game_id, p_prop_type, p_sportsbook, p_league, p_season] = propParts;

             if (player_id !== p_player_id) issues.push("player_id mismatch");
             if (game_id !== p_game_id) issues.push("game_id mismatch");
             
             // Use normalizers for consistent prop type matching
             const normalizedGameLogPropType = normalizePropType(prop_type);
             const normalizedPropPropType = normalizePropType(p_prop_type);
             const propTypesMatch = normalizedGameLogPropType === normalizedPropPropType;
             
             if (!propTypesMatch) issues.push(`prop_type mismatch (${prop_type} vs ${p_prop_type})`);
             if (league !== p_league) issues.push(`league mismatch (${league} vs ${p_league})`);
             if (season !== p_season) issues.push(`season mismatch (${season} vs ${p_season})`);

             return issues.length ? issues.join(", ") : "all fields match";
           }

          console.log("📊 Field‑Level Mismatch Diagnostics");

          const mismatches: any[] = [];
          const noPropsForPlayer: any[] = [];

          gameLogs!.slice(0, 50).forEach((g) => {
            const candidates = props!.filter((p) => p.player_id === g.player_id);
            if (candidates.length === 0) {
              console.log(`❌ No props at all for player ${g.player_id}`);
              noPropsForPlayer.push({
                player_id: g.player_id,
                prop_type: g.prop_type,
                league: g.league,
                date: g.date
              });
            } else {
           const match = candidates.find(
             (p) => {
               // Use the same conflict_key matching logic as the main API
               const gameLogParts = g.conflict_key.split('|');
               const [player_id, game_id, prop_type, league, season] = gameLogParts;
               
               const propParts = p.conflict_key.split('|');
               if (propParts.length !== 6) return false;
               
               const [p_player_id, p_game_id, p_prop_type, p_sportsbook, p_league, p_season] = propParts;
               
               // Use normalizers for consistent prop type matching
               const normalizedGameLogPropType = normalizePropType(prop_type);
               const normalizedPropPropType = normalizePropType(p_prop_type);
               const propTypesMatch = normalizedGameLogPropType === normalizedPropPropType;
               
               return p_player_id === player_id &&
                      p_game_id === game_id &&
                      propTypesMatch &&
                      p_league === league &&
                      p_season === season;
             }
           );
              if (!match) {
                // Show first candidate and explain why it failed
                const reason = explainMismatch(g, candidates[0]);
                console.log(`⚠️ Mismatch for player ${g.player_id}: ${reason}`);
                mismatches.push({
                  gameLog: g,
                  candidate: candidates[0],
                  reason: reason,
                  allCandidates: candidates.slice(0, 3) // Show first 3 candidates
                });
              }
            }
          });

          return corsResponse({
            success: true,
            summary: {
              totalGameLogsChecked: Math.min(50, gameLogs?.length || 0),
              totalProps: props?.length || 0,
              mismatchesFound: mismatches.length,
              playersWithNoProps: noPropsForPlayer.length
            },
            mismatches: mismatches.slice(0, 10), // Limit to first 10 for response size
            playersWithNoProps: noPropsForPlayer.slice(0, 10),
            sampleGameLog: gameLogs?.[0],
            sampleProp: props?.[0],
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          console.error('❌ Field mismatch diagnostics error:', error);
          return corsResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }, 500);
        }
      }

      // Handle backfill-all endpoint
      if (url.pathname === '/backfill-all') {
        const days = Number(url.searchParams.get('days') ?? '200');
        const leagues = url.searchParams.get('leagues')?.split(',');
        const seasons = url.searchParams.get('seasons')?.split(',').map(s => parseInt(s));
        
        console.log(`🔄 Starting multi-season backfill: days=${days}, leagues=${leagues}, seasons=${seasons}`);
        
        const startTime = Date.now();
        
        try {
          const result = await runMultiSeasonBackfill(env, {
            leagues,
            seasons,
            daysPerSeason: days
          });
          
          const duration = Date.now() - startTime;
          
          return new Response(JSON.stringify({
            success: true,
            message: 'Multi-season backfill completed successfully',
            duration: `${duration}ms`,
            totalProps: result.totalProps,
            totalGameLogs: result.totalGameLogs,
            totalErrors: result.totalErrors,
            leagueSeasonResults: result.leagueSeasonResults,
            summary: result.summary
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
          
        } catch (error) {
          console.error('❌ Multi-season backfill failed:', error);
          
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
      
      // Handle backfill-recent endpoint
      if (url.pathname === '/backfill-recent') {
        const days = Number(url.searchParams.get('days') ?? '90');
        
        console.log(`🔄 Starting recent seasons backfill: ${days} days`);
        
        const startTime = Date.now();
        
        try {
          const result = await runRecentSeasonsBackfill(env, days);
          
          const duration = Date.now() - startTime;
          
          return new Response(JSON.stringify({
            success: true,
            message: 'Recent seasons backfill completed successfully',
            duration: `${duration}ms`,
            totalProps: result.totalProps,
            totalGameLogs: result.totalGameLogs,
            totalErrors: result.totalErrors,
            leagueSeasonResults: result.leagueSeasonResults,
            summary: result.summary
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
          
        } catch (error) {
          console.error('❌ Recent seasons backfill failed:', error);
          
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
      
      // Handle backfill-full endpoint
      if (url.pathname === '/backfill-full') {
        const days = Number(url.searchParams.get('days') ?? '365');
        
        console.log(`🔄 Starting full historical backfill: ${days} days`);
        
        const startTime = Date.now();
        
        try {
          const result = await runFullHistoricalBackfill(env, days);
          
          const duration = Date.now() - startTime;
          
          return new Response(JSON.stringify({
            success: true,
            message: 'Full historical backfill completed successfully',
            duration: `${duration}ms`,
            totalProps: result.totalProps,
            totalGameLogs: result.totalGameLogs,
            totalErrors: result.totalErrors,
            leagueSeasonResults: result.leagueSeasonResults,
            summary: result.summary
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
          
        } catch (error) {
          console.error('❌ Full historical backfill failed:', error);
          
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
      
      // Handle backfill-league endpoint
      if (url.pathname.startsWith('/backfill-league/')) {
        const leagueId = url.pathname.split('/')[2];
        const days = Number(url.searchParams.get('days') ?? '200');
        const seasons = url.searchParams.get('seasons')?.split(',').map(s => parseInt(s)) || [2024, 2025];
        
        console.log(`🔄 Starting league-specific backfill: ${leagueId}, ${days} days, seasons: ${seasons.join(', ')}`);
        
        const startTime = Date.now();
        
        try {
          const result = await runLeagueSpecificBackfill(env, leagueId, seasons, days);
          
          const duration = Date.now() - startTime;
          
          return new Response(JSON.stringify({
            success: true,
            message: `League-specific backfill completed successfully for ${leagueId}`,
            duration: `${duration}ms`,
            totalProps: result.totalProps,
            totalGameLogs: result.totalGameLogs,
            totalErrors: result.totalErrors,
            leagueSeasonResults: result.leagueSeasonResults,
            summary: result.summary
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
          
        } catch (error) {
          console.error(`❌ League-specific backfill failed for ${leagueId}:`, error);
          
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
      
      // Handle backfill-season endpoint
      if (url.pathname.startsWith('/backfill-season/')) {
        const season = parseInt(url.pathname.split('/')[2]);
        const days = Number(url.searchParams.get('days') ?? '200');
        const leagues = url.searchParams.get('leagues')?.split(',');
        
        console.log(`🔄 Starting season-specific backfill: ${season}, ${days} days, leagues: ${leagues?.join(', ') || 'all'}`);
        
        const startTime = Date.now();
        
        try {
          const result = await runSeasonSpecificBackfill(env, season, leagues, days);
          
          const duration = Date.now() - startTime;
          
          return new Response(JSON.stringify({
            success: true,
            message: `Season-specific backfill completed successfully for ${season}`,
            duration: `${duration}ms`,
            totalProps: result.totalProps,
            totalGameLogs: result.totalGameLogs,
            totalErrors: result.totalErrors,
            leagueSeasonResults: result.leagueSeasonResults,
            summary: result.summary
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
          
        } catch (error) {
          console.error(`❌ Season-specific backfill failed for ${season}:`, error);
          
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
      
      // Handle backfill-progressive endpoint
      if (url.pathname === '/backfill-progressive') {
        const maxDays = Number(url.searchParams.get('maxDays') ?? '365');
        
        console.log(`🔄 Starting progressive backfill: max ${maxDays} days`);
        
        const startTime = Date.now();
        
        try {
          const result = await runProgressiveBackfill(env, maxDays);
          
          const duration = Date.now() - startTime;
          
          return new Response(JSON.stringify({
            success: true,
            message: 'Progressive backfill completed successfully',
            duration: `${duration}ms`,
            totalProps: result.totalProps,
            totalGameLogs: result.totalGameLogs,
            totalErrors: result.totalErrors,
            leagueSeasonResults: result.leagueSeasonResults,
            summary: result.summary
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
          
              } catch (error) {
          console.error('❌ Progressive backfill failed:', error);
          
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
      
      // Handle ingest endpoint
      if (url.pathname === '/ingest') {
        console.log(`🔄 Starting current season ingestion...`);
        
        const startTime = Date.now();
        
        try {
          const result = await runIngestion(env);
          
          const duration = Date.now() - startTime;
          
          return corsResponse({
            success: true,
            message: 'Current season ingestion completed successfully',
            duration: `${duration}ms`,
            ...result
          });
          
        } catch (error) {
          console.error('❌ Ingestion failed:', error);
          
          return corsResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }, 500);
        }
      }
      
      // Handle single league ingest endpoint
      if (url.pathname.startsWith('/ingest/')) {
        const leagueId = url.pathname.split('/')[2];
        
        console.log(`🔄 Starting single league ingestion for ${leagueId}...`);
        
        const startTime = Date.now();
        
        try {
          const result = await runSingleLeagueIngestion(env, leagueId);
          
          const duration = Date.now() - startTime;
          
          return new Response(JSON.stringify({
            success: true,
            message: `Single league ingestion completed successfully for ${leagueId}`,
            duration: `${duration}ms`,
            ...result
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
          
        } catch (error) {
          console.error(`❌ Single league ingestion failed for ${leagueId}:`, error);
          
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
      
      // Handle schema check
      if (url.pathname === '/debug-schema') {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");
          
          console.log('🔍 Checking table schema...');
          
          // Query the table structure
          const response = await supabaseFetch(env, "proplines?limit=1&select=*", {
            method: "GET"
          }) as { data?: any; error?: any };
          
          if (response.error) {
            console.error("❌ Schema check failed:", response.error);
            return new Response(JSON.stringify({
              success: false,
              error: response.error instanceof Error ? response.error.message : String(response.error),
              details: response.error
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          } else {
            console.log("✅ Schema check successful:", response.data);
            return new Response(JSON.stringify({
              success: true,
              message: "Table schema retrieved",
              data: response.data,
              note: "This shows what columns exist in the table"
            }), {
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }
          
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
      
            // Handle market analysis debug test
            if (url.pathname === '/debug-market-analysis') {
              try {
                const { fetchEventsWithProps } = await import("./lib/api");
                const { extractPlayerProps } = await import("./lib/extract");
                
                console.log('🔍 Analyzing market patterns...');
                
                const leagues = ['NFL', 'MLB'];
                const analysis = {};
                
                for (const league of leagues) {
                  const events = await fetchEventsWithProps(env, league, { limit: 2 });
                  if (events.length > 0) {
                    const extracted = extractPlayerProps(events);
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
                        "Completions": "Completions",
                        "Receptions": "Receptions",
                        "3PT Made": "3PT Made",
                        "Points": "Points",
                        "Assists": "Assists",
                        "Rebounds": "Rebounds",
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
                        "receptions": "Receptions",
                        "passing touchdowns": "Passing Touchdowns",
                        "pass tds": "Passing Touchdowns",
                        "rushing touchdowns": "Rushing Touchdowns",
                        "rush tds": "Rushing Touchdowns",
                        "receiving touchdowns": "Receiving Touchdowns",
                        "rec tds": "Receiving Touchdowns",
                        "points": "Points",
                        "assists": "Assists",
                        "rebounds": "Rebounds",
                        "threes made": "3PT Made",
                        "3pt made": "3PT Made",
                        "steals": "Steals",
                        "blocks": "Blocks",
                        "hits": "Hits",
                        "runs": "Runs",
                        "rbis": "RBIs",
                        "total bases": "Total Bases",
                        "strikeouts": "Strikeouts",
                        "shots on goal": "Shots on Goal",
                        "goals": "Goals",
                        "saves": "Saves",
                        "first touchdown": "First Touchdown",
                        "anytime touchdown": "Anytime Touchdown",
                        "to record first touchdown": "First Touchdown",
                        "to record anytime touchdown": "Anytime Touchdown",
                        "to score": "Anytime Touchdown"
                      };
                      
                      let propType = MARKET_MAP[market];
                      if (!propType) {
                        propType = MARKET_MAP[market?.toLowerCase()];
                      }
                      if (!propType) {
                        const marketWords = market?.toLowerCase().split(' ') || [];
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
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .slice(0, 20), // Top 20 markets
                      unmappedMarkets: Array.from(unmappedMarkets).slice(0, 20), // Top 20 unmapped
                      sampleProps: extracted.slice(0, 5) // Sample props for analysis
                    };
                  }
                }
                
                return new Response(JSON.stringify({
                  success: true,
                  analysis: analysis,
                  recommendations: {
                    nfl: "Focus on 'Over/Under' patterns and 'To Record' markets",
                    mlb: "Focus on 'Hits', 'Runs', 'RBIs' patterns"
                  }
                }), {
                  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
                
              } catch (error) {
                return new Response(JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : String(error)
                }), {
                  status: 500,
                  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
              }
            }

            // Handle mapping debug test
            if (url.pathname === '/debug-mapping') {
              try {
                const { fetchEventsWithProps } = await import("./lib/api");
                const { extractPlayerProps } = await import("./lib/extract");
                const { createPlayerPropsFromOdd } = await import("./createPlayerPropsFromOdd");
                
                console.log('🔍 Testing mapping function...');
                
                const events = await fetchEventsWithProps(env, "NFL", { limit: 1 });
                if (events.length > 0) {
                  const extracted = extractPlayerProps(events);
                  if (extracted.length > 0) {
                    const prop = extracted[0];
                    console.log('🔍 Testing with prop:', prop);
                    
                    const mockOdd = {
                      player: {
                        name: prop.playerName,
                        team: 'PHI'
                      },
                      player_name: prop.playerName,
                      playerID: prop.playerId,
                      market_key: prop.marketName,
                      point: prop.line,
                      over_price: prop.overUnder === 'over' ? prop.odds : null,
                      under_price: prop.overUnder === 'under' ? prop.odds : null,
                      overOdds: prop.overUnder === 'over' || prop.overUnder === 'yes' ? prop.odds : null,
                      underOdds: prop.overUnder === 'under' || prop.overUnder === 'no' ? prop.odds : null,
                      bookmaker_name: prop.sportsbook,
                      id: prop.oddId
                    };
                    
                    const mockEvent = {
                      eventID: prop.eventId,
                      date: prop.eventStartUtc,
                      homeTeam: 'HOME',
                      awayTeam: 'AWAY',
                      teams: ['HOME', 'AWAY']
                    };
                    
                    console.log('🔍 Calling createPlayerPropsFromOdd...');
                    
                    // Test player ID generation separately
                    const { getCachedPlayerIdMap } = await import("./playersLoader");
                    const playerIdMap = await getCachedPlayerIdMap(env);
                    console.log('🔍 Player ID map loaded:', Object.keys(playerIdMap).length, 'players');
                    
                    const testPlayerId = playerIdMap[`Jalen Hurts-PHI`] || playerIdMap[`jalen hurts-PHI`] || 'NOT_FOUND';
                    console.log('🔍 Test player ID for Jalen Hurts-PHI:', testPlayerId);
                    
                    const mappedProps = await createPlayerPropsFromOdd(
                      mockOdd,
                      prop.oddId,
                      mockEvent,
                      'nfl',
                      '2024',
                      undefined,
                      env
                    );
                    
                    console.log('🔍 Mapping result:', mappedProps);
                    
                    return new Response(JSON.stringify({
                      success: true,
                      extractedProp: prop,
                      mockOdd: mockOdd,
                      mockEvent: mockEvent,
                      mappedProps: mappedProps,
                      mappedCount: mappedProps.length
                    }), {
                      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                    });
                  }
                }
                
                return new Response(JSON.stringify({
                  success: false,
                  error: "No props found for testing"
                }), {
                  status: 500,
                  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
                
              } catch (error) {
                return new Response(JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                  stack: error instanceof Error ? error.stack : undefined
                }), {
                  status: 500,
                  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
              }
            }

            // Handle isolated insert test
            if (url.pathname === '/debug-insert') {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");
          
          console.log('🔍 Testing isolated insert...');
          
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
            conflict_key: `TEST_CONFLICT_${timestamp}`
          };
          
          console.log("🔍 Test prop:", JSON.stringify(testProp, null, 2));
          
          const response = await supabaseFetch(env, "proplines", {
            method: "POST",
            body: JSON.stringify([testProp])
          });
          
          // Successful Supabase inserts return null/empty response
          if (response === null || response === undefined) {
            console.log("✅ Insert successful - Empty response indicates success");
            return new Response(JSON.stringify({
              success: true,
              message: "Test insert successful",
              data: "Record inserted successfully (empty response from Supabase)",
              testProp: testProp
            }), {
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          } else {
            // If we get a response, it might be an error or data
            console.log("✅ Insert successful with response:", response);
            return new Response(JSON.stringify({
              success: true,
              message: "Test insert successful",
              data: response,
              testProp: testProp
            }), {
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }
          
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
      
      // Handle extraction debug test
      if (url.pathname === '/debug-extraction') {
        try {
          const { fetchEventsWithProps } = await import("./lib/api");
          const { extractPlayerProps } = await import("./lib/extract");
          
          console.log('🔍 Testing extraction...');
          
          const events = await fetchEventsWithProps(env, "NFL", { limit: 1 });
          console.log(`📊 Fetched ${events.length} events`);
          
          if (events.length > 0) {
            const extracted = extractPlayerProps(events);
            console.log(`📊 Extracted ${extracted.length} props`);
            
            return new Response(JSON.stringify({
              success: true,
              eventsCount: events.length,
              extractedPropsCount: extracted.length,
              firstEvent: events[0] ? {
                eventID: events[0].eventID,
                leagueID: events[0].leagueID,
                oddsKeys: Object.keys(events[0].odds || {}).length,
                playersKeys: Object.keys(events[0].players || {}).length
              } : null,
              firstExtractedProp: extracted.length > 0 ? {
                playerName: extracted[0].playerName,
                marketName: extracted[0].marketName,
                line: extracted[0].line,
                odds: extracted[0].odds,
                sportsbook: extracted[0].sportsbook
              } : null
            }), {
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          } else {
            return new Response(JSON.stringify({
              success: false,
              error: "No events found"
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }
          
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
      
      // Handle simple JSON parsing test
      if (url.pathname === '/debug-json') {
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
          
          return new Response(JSON.stringify({
            success: true,
            responseLength: responseText.length,
            responseStart: responseText.substring(0, 100),
            responseType: typeof response,
            hasDataField: !!response.data,
            eventsArrayLength: eventsArray.length,
            firstEvent: eventsArray.length > 0 ? typeof eventsArray[0] : null
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
          
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
      
      // Handle comprehensive debug endpoint
      if (url.pathname === '/debug-comprehensive') {
        try {
          console.log('🔍 Running comprehensive API debug...');
          
          const testResults: any[] = [];
          
          // Test different league IDs
          const leagues = ['NFL', 'NBA', 'MLB', 'NHL'];
          for (const league of leagues) {
            const url = `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=${league}`;
            console.log(`🔍 Testing ${league}: ${url}`);
            
            try {
              const response = await fetch(url);
              const data = await response.json();
              testResults.push({
                league,
                status: response.status,
                eventsCount: Array.isArray(data) ? data.length : 'not array',
                dataType: typeof data,
                isArray: Array.isArray(data),
                firstItem: Array.isArray(data) && data.length > 0 ? typeof data[0] : null,
                responseHeaders: { contentType: response.headers.get('content-type') || '', status: response.status.toString() },
                rawResponse: data // Show the actual response
              });
            } catch (error) {
              testResults.push({
                league,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }
          
          // Test with and without oddsAvailable filter
          const testUrls = [
            { name: 'NFL without oddsAvailable', url: `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL` },
            { name: 'NFL with oddsAvailable=true', url: `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL&oddsAvailable=true` },
            { name: 'NFL with oddsAvailable=false', url: `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL&oddsAvailable=false` }
          ];
          
          for (const test of testUrls) {
            console.log(`🔍 Testing ${test.name}: ${test.url}`);
            
            try {
              const response = await fetch(test.url);
              const data = await response.json();
              testResults.push({
                test: test.name,
                status: response.status,
                eventsCount: Array.isArray(data) ? data.length : 'not array',
                dataType: typeof data,
                isArray: Array.isArray(data),
                firstItem: Array.isArray(data) && data.length > 0 ? typeof data[0] : null
              });
            } catch (error) {
              testResults.push({
                test: test.name,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }
          
          // Test different endpoints
          const endpoints = [
            '/v2/events',
            '/v2/odds', 
            '/v2/playerprops'
          ];
          
          for (const endpoint of endpoints) {
            const url = `https://api.sportsgameodds.com${endpoint}?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL`;
            console.log(`🔍 Testing ${endpoint}: ${url}`);
            
            try {
              const response = await fetch(url);
              const data = await response.json();
              testResults.push({
                endpoint,
                status: response.status,
                eventsCount: Array.isArray(data) ? data.length : 'not array',
                dataType: typeof data
              });
              } catch (error) {
              testResults.push({
                endpoint,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }
          
          return new Response(JSON.stringify({
            success: true,
            apiKeyLength: env.SPORTSGAMEODDS_API_KEY ? env.SPORTSGAMEODDS_API_KEY.length : 0,
            testResults
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
          
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
      
      // Handle debug API endpoint
      if (url.pathname === '/debug-api') {
        try {
          const { fetchEventsWithProps } = await import("./lib/api");
          
          console.log('🔍 Testing API directly...');
          
          // Test NFL API call
          console.log('🔍 API Key available:', !!env.SPORTSGAMEODDS_API_KEY);
          console.log('🔍 API Key length:', env.SPORTSGAMEODDS_API_KEY ? env.SPORTSGAMEODDS_API_KEY.length : 0);
          
          // Test 1: Basic API call without filters
          console.log('🔍 Test 1: Basic API call without filters');
          const basicUrl = `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL&oddsAvailable=true`;
          console.log('🔍 Basic URL:', basicUrl);
          
          try {
            const basicResponse = await fetch(basicUrl);
            const basicData = await basicResponse.json();
            console.log('📊 Basic API Response:', {
              status: basicResponse.status,
              eventsCount: Array.isArray(basicData) ? basicData.length : 'not array',
              dataType: typeof basicData,
              firstEvent: Array.isArray(basicData) && basicData.length > 0 ? basicData[0] : null
            });
          } catch (error) {
            console.error('❌ Basic API call failed:', error);
          }
          
          // Test 2: With season filter
          console.log('🔍 Test 2: With season filter');
          const seasonUrl = `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL&oddsAvailable=true&season=2024`;
          console.log('🔍 Season URL:', seasonUrl);
          
          try {
            const seasonResponse = await fetch(seasonUrl);
            const seasonData = await seasonResponse.json();
            console.log('📊 Season API Response:', {
              status: seasonResponse.status,
              eventsCount: Array.isArray(seasonData) ? seasonData.length : 'not array'
            });
          } catch (error) {
            console.error('❌ Season API call failed:', error);
          }
          
          // Test 3: With date filter (current date in UTC)
          console.log('🔍 Test 3: With date filter');
          const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD in UTC
          const dateUrl = `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL&oddsAvailable=true&dateFrom=${today}&dateTo=${today}`;
          console.log('🔍 Date URL:', dateUrl);
          
          try {
            const dateResponse = await fetch(dateUrl);
            const dateData = await dateResponse.json();
            console.log('📊 Date API Response:', {
              status: dateResponse.status,
              eventsCount: Array.isArray(dateData) ? dateData.length : 'not array',
              dateUsed: today
            });
          } catch (error) {
            console.error('❌ Date API call failed:', error);
          }
          
          // Test 4: Using the existing fetchEventsWithProps function
          console.log('🔍 Test 4: Using fetchEventsWithProps');
          const events = await fetchEventsWithProps(env, "NFL", {
            limit: 5
          });
          
          console.log(`📊 fetchEventsWithProps result: ${events.length} events`);
          
          if (events.length > 0) {
            const firstEvent = events[0];
            console.log('📊 First event structure:', {
              id: firstEvent.id,
              leagueID: firstEvent.leagueID,
              oddsKeys: Object.keys(firstEvent.odds || {}).length,
              playersKeys: Object.keys(firstEvent.players || {}).length,
              sampleOdd: Object.values(firstEvent.odds || {})[0]
            });
          }
          
          return new Response(JSON.stringify({
            success: true,
            eventsCount: events.length,
            firstEvent: events.length > 0 ? {
              id: events[0].id,
              leagueID: events[0].leagueID,
              oddsCount: Object.keys(events[0].odds || {}).length,
              playersCount: Object.keys(events[0].players || {}).length
            } : null
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
          
        } catch (error) {
          console.error('❌ Debug API failed:', error);
          
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      // Handle status endpoints
      if (url.pathname === '/status') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          activeLeagues: getActiveLeagues().length,
          totalLeagues: LEAGUES.length,
          availableSeasons: getAllSeasons()
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      
      if (url.pathname === '/leagues') {
        return new Response(JSON.stringify({
          all: LEAGUES,
          active: getActiveLeagues(),
          total: LEAGUES.length,
          activeCount: getActiveLeagues().length
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      
      if (url.pathname === '/seasons') {
        return new Response(JSON.stringify({
          all: getAllSeasons(),
          total: getAllSeasons().length,
          current: new Date().getFullYear()
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Handle enhanced insertion debug endpoint
      if (url.pathname === '/debug-insertion') {
        try {
          const { insertPropsWithDebugging } = await import("./lib/enhancedInsertProps");
          
          console.log('🔍 Testing enhanced insertion with comprehensive debugging...');
          
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
              conflict_key: `TEST_CONFLICT_${timestamp}`
            }
          ];
          
          console.log("🔍 Test props:", JSON.stringify(testProps, null, 2));
          
          const result = await insertPropsWithDebugging(env, testProps);
          
          return new Response(JSON.stringify({
            success: true,
            message: "Enhanced insertion test completed",
            result: result,
            testData: testProps,
            timestamp: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
          
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }

      // Handle environment variables debug endpoint
      if (url.pathname === '/debug-env') {
        try {
          console.log('🔍 Checking environment variables...');
          
          const envCheck = {
            SUPABASE_URL: env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
            SUPABASE_SERVICE_KEY: env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing',
            SPORTSGAMEODDS_API_KEY: env.SPORTSGAMEODDS_API_KEY ? '✅ Set' : '❌ Missing',
            SUPABASE_URL_LENGTH: env.SUPABASE_URL ? env.SUPABASE_URL.length : 0,
            SUPABASE_SERVICE_KEY_LENGTH: env.SUPABASE_SERVICE_KEY ? env.SUPABASE_SERVICE_KEY.length : 0,
            SPORTSGAMEODDS_API_KEY_LENGTH: env.SPORTSGAMEODDS_API_KEY ? env.SPORTSGAMEODDS_API_KEY.length : 0,
            SUPABASE_URL_PREFIX: env.SUPABASE_URL ? env.SUPABASE_URL.substring(0, 20) + '...' : 'N/A',
            SUPABASE_SERVICE_KEY_PREFIX: env.SUPABASE_SERVICE_KEY ? env.SUPABASE_SERVICE_KEY.substring(0, 20) + '...' : 'N/A',
            // Check if service key has the right role
            SERVICE_KEY_ROLE: env.SUPABASE_SERVICE_KEY ? 
              (env.SUPABASE_SERVICE_KEY.includes('service_role') ? '✅ service_role' : '⚠️ May not be service role') : 
              '❌ No key'
          };
          
          return new Response(JSON.stringify({
            success: true,
            message: "Environment variables check completed",
            envCheck: envCheck,
            timestamp: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
          
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }

      // Handle RLS permissions debug endpoint
      if (url.pathname === '/debug-rls') {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");
          
          console.log('🔍 Testing RLS permissions...');
          
          // Test 1: Try to read from proplines
          let proplinesReadTest = 'Not tested';
          try {
            const proplinesData = await supabaseFetch(env, "proplines?limit=1", {
              method: "GET",
            });
            proplinesReadTest = '✅ Success';
          } catch (error) {
            proplinesReadTest = `❌ Failed: ${error instanceof Error ? error.message : String(error)}`;
          }
          
          // Test 2: Try to read from player_game_logs
          let gameLogsReadTest = 'Not tested';
          try {
            const gameLogsData = await supabaseFetch(env, "player_game_logs?limit=1", {
              method: "GET",
            });
            gameLogsReadTest = '✅ Success';
          } catch (error) {
            gameLogsReadTest = `❌ Failed: ${error instanceof Error ? error.message : String(error)}`;
          }
          
          // Test 3: Try a small insert test
          let insertTest = 'Not tested';
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
            conflict_key: `RLS_TEST_${timestamp}`
          };
          
          try {
            const insertResult = await supabaseFetch(env, "proplines", {
              method: "POST",
              body: JSON.stringify([testProp]),
              headers: { Prefer: "resolution=merge-duplicates" },
            });
            insertTest = '✅ Success';
            
            // Clean up test data
            try {
              await supabaseFetch(env, `proplines?player_id=eq.RLS_TEST_${timestamp}`, {
                method: "DELETE",
              });
              console.log('🧹 Cleaned up test data');
            } catch (cleanupError) {
              console.log('⚠️ Failed to clean up test data:', cleanupError);
            }
          } catch (error) {
            insertTest = `❌ Failed: ${error instanceof Error ? error.message : String(error)}`;
          }
          
          return new Response(JSON.stringify({
            success: true,
            message: "RLS permissions test completed",
            tests: {
              proplinesRead: proplinesReadTest,
              gameLogsRead: gameLogsReadTest,
              insertTest: insertTest
            },
            testData: testProp,
            timestamp: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
          
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }

      // Handle performance data ingestion endpoint
      if (url.pathname === '/performance-ingest') {
        console.log(`🔄 Starting performance data ingestion...`);
        
        const startTime = Date.now();
        const leagues = url.searchParams.get('leagues')?.split(',');
        const date = url.searchParams.get('date') || undefined;
        const days = parseInt(url.searchParams.get('days') || '1');
        
        try {
          const result = await runPerformanceIngestion(env, {
            leagues,
            date,
            days
          });
          
          const duration = Date.now() - startTime;
          
          return new Response(JSON.stringify({
            message: 'Performance data ingestion completed',
            duration: `${duration}ms`,
            ...result
          }), {
            status: result.success ? 200 : 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
          
        } catch (error) {
          console.error('❌ Performance ingestion failed:', error);
          
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      // Handle single league performance ingestion
      if (url.pathname.startsWith('/performance-ingest/')) {
        const leagueId = url.pathname.split('/')[2];
        const date = url.searchParams.get('date') || undefined;
        const days = parseInt(url.searchParams.get('days') || '1');
        
        console.log(`🔄 Starting single league performance ingestion for ${leagueId}...`);
        
        const startTime = Date.now();
        
        try {
          const result = await runSingleLeaguePerformanceIngestion(env, leagueId, {
            date,
            days
          });
          
          const duration = Date.now() - startTime;
          
          return new Response(JSON.stringify({
            message: `Single league performance ingestion completed for ${leagueId}`,
            duration: `${duration}ms`,
            ...result
          }), {
            status: result.success ? 200 : 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
          
        } catch (error) {
          console.error(`❌ Single league performance ingestion failed for ${leagueId}:`, error);
          
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      // Handle historical performance ingestion
      if (url.pathname === '/performance-historical') {
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');
        const leagues = url.searchParams.get('leagues')?.split(',');
        
        if (!startDate || !endDate) {
          return new Response(JSON.stringify({
            success: false,
            error: 'startDate and endDate parameters are required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
        
        console.log(`🔄 Starting historical performance ingestion from ${startDate} to ${endDate}...`);
        
        const startTime = Date.now();
        
        try {
          const result = await runHistoricalPerformanceIngestion(env, {
            leagues,
            startDate,
            endDate
          });
          
          const duration = Date.now() - startTime;
          
          return new Response(JSON.stringify({
            message: 'Historical performance ingestion completed',
            duration: `${duration}ms`,
            ...result
          }), {
            status: result.success ? 200 : 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
          
        } catch (error) {
          console.error('❌ Historical performance ingestion failed:', error);
          
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

    // Handle debug data check endpoint
    if (url.pathname === '/debug-data-check') {
      console.log(`🔍 Debug data check...`);
      
      try {
        // Check proplines
        const proplinesResponse = await supabaseFetch(env, 'proplines?limit=5', {
          method: 'GET'
        });
        
        // Check player_game_logs
        const gameLogsResponse = await supabaseFetch(env, 'player_game_logs?limit=5', {
          method: 'GET'
        });
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Data check completed',
          proplines: {
            count: proplinesResponse ? proplinesResponse.length : 0,
            sample: proplinesResponse && proplinesResponse.length > 0 ? proplinesResponse[0] : null
          },
          gameLogs: {
            count: gameLogsResponse ? gameLogsResponse.length : 0,
            sample: gameLogsResponse && gameLogsResponse.length > 0 ? gameLogsResponse[0] : null
          }
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // Handle performance diagnostic endpoint
    if (url.pathname === '/debug-performance-diagnostic') {
      console.log(`🔍 Running performance diagnostic...`);
      
      try {
        const result = await runPerformanceDiagnostic(env);
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Performance diagnostic completed',
          result: result
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // Handle debug events endpoint
    if (url.pathname === '/debug-events') {
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        
        console.log(`🔍 Debug events for date: ${date}`);
        
        try {
          const results = await fetchAllLeaguesEvents(date, env);
          
          const summary = {
            date: date,
            leagues: {} as Record<string, any>
          };
          
          for (const [league, events] of Object.entries(results)) {
            summary.leagues[league] = {
              eventCount: events.length,
              hasEvents: events.length > 0,
              sampleEvent: events.length > 0 ? {
                id: events[0].event_id || events[0].eventID || 'unknown',
                homeTeam: events[0].home_team?.name || events[0].teams?.home?.names?.long || 'unknown',
                awayTeam: events[0].away_team?.name || events[0].teams?.away?.names?.long || 'unknown',
                hasPlayerProps: !!(events[0].player_props && events[0].player_props.length > 0),
                hasMarkets: !!(events[0].markets && events[0].markets.length > 0)
              } : null
            };
          }
          
          return new Response(JSON.stringify({
            success: true,
            message: 'Events debug completed',
            summary: summary,
            rawResults: results
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
          
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
      
      // Default 404 response
      return new Response(JSON.stringify({
        error: 'Endpoint not found',
        availableEndpoints: ['/backfill-all', '/backfill-recent', '/backfill-full', '/backfill-league/{league}', '/backfill-season/{season}', '/backfill-progressive', '/ingest', '/ingest/{league}', '/refresh-analytics', '/incremental-analytics-refresh', '/analytics/streaks', '/analytics/defensive-rankings', '/analytics/matchup-rank', '/analytics/last-5', '/analytics/last-10', '/analytics/last-20', '/analytics/h2h', '/debug-streaks', '/debug-streak-counts', '/status', '/leagues', '/seasons']
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
      
    } catch (error) {
      console.error('❌ Worker fetch error:', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error) || 'Internal Server Error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
  
  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
    console.log(`🕐 Scheduled ingestion triggered at ${new Date().toISOString()}`);
    
    // Run current season ingestion on cron
    ctx.waitUntil(runIngestion(env));
  },
};

// Performance Diagnostic Function
async function runPerformanceDiagnostic(env: any): Promise<any> {
  const { createClient } = await import('@supabase/supabase-js');
  
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_KEY
  );

  const testRow = {
    player_id: "TEST_PLAYER",
    player_name: "Diagnostic Player",
    date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    league: "NFL",
    season: 2025,
    game_id: "TEST_GAME",
    prop_type: "Test Prop",
    line: 1.5,
    sportsbook: "SportsGameOdds",
    over_odds: -110,
    under_odds: 100,
    conflict_key: `TEST_PLAYER|TEST_GAME|Test Prop|SportsGameOdds|NFL`
  };

  const result: any = {
    insertSuccess: false,
    selectSuccess: false,
    dataFound: false,
    insertError: null,
    selectError: null,
    retrievedData: null
  };

  try {
    // 1. Try insert/upsert
    const { error: insertError } = await supabase
      .from("proplines")
      .upsert([testRow]);

    if (insertError) {
      console.error("❌ Insert failed:", insertError.message);
      result.insertError = insertError.message;
      return result;
    }

    result.insertSuccess = true;
    console.log("✅ Insert successful");

    // 2. Immediately query back
    const { data, error: selectError } = await supabase
      .from("proplines")
      .select("*")
      .eq("player_id", "TEST_PLAYER")
      .order("created_at", { ascending: false })
      .limit(1);

    if (selectError) {
      console.error("❌ Select failed:", selectError.message);
      result.selectError = selectError.message;
      return result;
    }

    result.selectSuccess = true;

    if (data && data.length > 0) {
      console.log("✅ Persistence confirmed:", data[0]);
      result.dataFound = true;
      result.retrievedData = data[0];
    } else {
      console.warn("⚠️ Insert appeared to succeed, but no row found. Likely RLS or wrong key.");
      result.dataFound = false;
    }

    // 3. Try the same with player_game_logs
    const gameLogTestRow = {
      player_id: "TEST_PLAYER",
      player_name: "Diagnostic Player",
      team: "TEST",
      opponent: "TEST2",
      season: 2025,
      date: new Date().toISOString().slice(0, 10),
      prop_type: "Test Prop",
      value: 2.5,
      sport: "NFL",
      league: "nfl",
      game_id: "TEST_GAME"
    };

    const { error: gameLogInsertError } = await supabase
      .from("player_game_logs")
      .upsert([gameLogTestRow]);

    if (gameLogInsertError) {
      result.gameLogInsertError = gameLogInsertError.message;
    } else {
      result.gameLogInsertSuccess = true;
      
      const { data: gameLogData, error: gameLogSelectError } = await supabase
        .from("player_game_logs")
        .select("*")
        .eq("player_id", "TEST_PLAYER")
        .limit(1);

      if (gameLogSelectError) {
        result.gameLogSelectError = gameLogSelectError.message;
      } else {
        result.gameLogSelectSuccess = true;
        result.gameLogDataFound = gameLogData && gameLogData.length > 0;
        if (gameLogData && gameLogData.length > 0) {
          result.gameLogRetrievedData = gameLogData[0];
        }
      }
    }

  } catch (error) {
    console.error("❌ Diagnostic failed:", error);
    result.diagnosticError = error instanceof Error ? error.message : String(error);
  }

  return result;
}