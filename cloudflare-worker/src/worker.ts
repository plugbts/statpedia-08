// Multi-League Multi-Season Worker with Backfill Support
// Handles both real-time ingestion and historical backfill operations

import { runMultiSeasonBackfill, runRecentSeasonsBackfill, runFullHistoricalBackfill, runLeagueSpecificBackfill, runSeasonSpecificBackfill, runProgressiveBackfill } from "./jobs/multiBackfill";
import { runIngestion, runSingleLeagueIngestion } from "./jobs/ingest";
import { LEAGUES, getActiveLeagues, getAllSeasons, getActiveLeagueSeasonPairs } from "./config/leagues";

export default {
  async fetch(req: Request, env: any) {
    try {
      const url = new URL(req.url);
      
      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }

      // Default response with available endpoints
      if (url.pathname === '/') {
        return new Response(JSON.stringify({
          message: 'Multi-League Multi-Season Props Ingestion Worker',
          endpoints: {
            ingestion: ['/ingest', '/ingest/{league}'],
            backfill: ['/backfill-all', '/backfill-recent', '/backfill-full', '/backfill-league/{league}', '/backfill-season/{season}'],
            analytics: ['/refresh-analytics', '/incremental-analytics-refresh', '/analytics/streaks', '/analytics/defensive-rankings'],
            verification: ['/verify-backfill', '/verify-analytics'],
            status: ['/status', '/leagues', '/seasons'],
            debug: ['/debug-api', '/debug-comprehensive', '/debug-json', '/debug-extraction', '/debug-insert', '/debug-schema']
          },
          leagues: getActiveLeagues().map(l => l.id),
          seasons: getAllSeasons(),
          features: ['Multi-league ingestion', 'Multi-season backfill', 'Analytics computation', 'Fallback logic', 'Progressive backfill']
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      
      // Handle analytics refresh
      if (url.pathname === "/refresh-analytics") {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");
          console.log("🔄 Refreshing analytics views...");
          
          const result = await supabaseFetch(env, "rpc/refresh_analytics_views", {
            method: "POST",
            body: {},
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
            body: { days_back: daysBack },
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

      // Handle TRUE streak analysis query
      if (url.pathname === "/analytics/streaks") {
        try {
          const { supabaseFetch } = await import("./supabaseFetch");
          const league = url.searchParams.get("league") || "all";
          const limit = parseInt(url.searchParams.get("limit") || "50");
          
          console.log(`📊 Fetching TRUE streak analysis for ${league}...`);
          
          let query = "streak_analysis";
          if (league !== "all") {
            query += `?league=eq.${league}`;
          }
          query += `&order=current_streak.desc&limit=${limit}`;
          
          const result = await supabaseFetch(env, query, {
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
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
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
          
          return new Response(JSON.stringify({
            success: true,
            message: 'Current season ingestion completed successfully',
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
          console.error('❌ Ingestion failed:', error);
          
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
          const response = await supabaseFetch(env, "proplines", {
            method: "GET",
            query: "?limit=1&select=*"
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
            body: [testProp]
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
      
      // Default 404 response
      return new Response(JSON.stringify({
        error: 'Endpoint not found',
        availableEndpoints: ['/backfill-all', '/backfill-recent', '/backfill-full', '/backfill-league/{league}', '/backfill-season/{season}', '/backfill-progressive', '/ingest', '/ingest/{league}', '/refresh-analytics', '/incremental-analytics-refresh', '/analytics/streaks', '/analytics/defensive-rankings', '/status', '/leagues', '/seasons']
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