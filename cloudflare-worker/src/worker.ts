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
            verification: ['/verify-backfill', '/verify-analytics'],
            status: ['/status', '/leagues', '/seasons']
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
            ...result
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
            error: error.message,
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
            ...result
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
            error: error.message,
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
            ...result
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
            error: error.message,
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
            ...result
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
            error: error.message,
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
            ...result
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
            error: error.message,
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
            ...result
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
            error: error.message,
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
            error: error.message,
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
            error: error.message,
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
      
      // Handle debug API endpoint
      if (url.pathname === '/debug-api') {
        try {
          const { fetchEventsWithProps } = await import("./lib/api");
          
          console.log('🔍 Testing API directly...');
          
          // Test NFL API call
          console.log('🔍 API Key available:', !!env.SPORTSGAMEODDS_API_KEY);
          console.log('🔍 API Key length:', env.SPORTSGAMEODDS_API_KEY ? env.SPORTSGAMEODDS_API_KEY.length : 0);
          
          const events = await fetchEventsWithProps(env, "NFL", {
            limit: 5
          });
          
          console.log(`📊 Fetched ${events.length} events`);
          
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
            error: error.message
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
        availableEndpoints: ['/backfill-all', '/backfill-recent', '/backfill-full', '/backfill-league/{league}', '/backfill-season/{season}', '/backfill-progressive', '/ingest', '/ingest/{league}', '/status', '/leagues', '/seasons']
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
        error: error.message || 'Internal Server Error'
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