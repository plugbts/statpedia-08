// Multi-League Cloudflare Worker with Comprehensive Analytics
// Handles ingestion for all supported leagues with fallback logic

import { supabaseFetch } from "./supabaseFetch";
import { chunk } from "./helpers";
import { createPlayerPropsFromOdd } from "./createPlayerPropsFromOdd";
import { getActiveLeagues, getLeaguesInSeason, getNormalizedPropType } from "./leagueConfig";
import { fetchEventsWithFallbacks, processEventsWithProps } from "./api";
import { runMultiLeagueBackfill, runBackfillWithDateRange, verifyBackfillResults } from "./backfill";

// Multi-league ingestion function
async function ingestAllLeagues(env: any): Promise<{
  totalProps: number;
  inserted: number;
  updated: number;
  errors: number;
  leagueResults: Record<string, any>;
}> {
  console.log('🚀 Starting multi-league ingestion...');
  
  const leagues = getLeaguesInSeason();
  console.log(`📊 Found ${leagues.length} leagues currently in season: ${leagues.map(l => l.id).join(', ')}`);
  
  let totalProps = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  const leagueResults: Record<string, any> = {};
  
  for (const league of leagues) {
    console.log(`\n🏈 Processing ${league.displayName} (${league.id})`);
    
    try {
      // Fetch events using the resilient fallback strategy
      const events = await fetchEventsWithFallbacks(env, league.id as "NFL" | "NBA", league.season);
      console.log(`📊 ${league.id}: Fetched ${events.length} events`);
      
      if (events.length === 0) {
        console.log(`⚠️ ${league.id}: No events found, skipping`);
        leagueResults[league.id] = { events: 0, props: 0, inserted: 0, errors: 0 };
        continue;
      }
      
      // Process events and extract props
      const { processedProps } = await processEventsWithProps(events, league.id as "NFL" | "NBA");
      
      if (processedProps.length === 0) {
        console.log(`⚠️ ${league.id}: No props found in events`);
        leagueResults[league.id] = { events: events.length, props: 0, inserted: 0, errors: 0 };
        continue;
      }
      
      // Transform props to match our schema
      const transformedProps = processedProps.map(prop => ({
        player_id: prop.playerID,
        player_name: prop.playerName || 'Unknown',
        team: prop.team || 'UNK',
        league: league.id.toLowerCase(),
        prop_type: getNormalizedPropType(league.id, prop.marketName || prop.propType || 'Unknown'),
        date: prop.eventDate ? prop.eventDate.split('T')[0] : new Date().toISOString().split('T')[0],
        line: prop.line || 0,
        odds: prop.odds || -110,
        sportsbook: prop.sportsbook || 'unknown',
        game_id: prop.eventId,
        game_time: prop.eventDate,
        home_team: prop.homeTeam || 'UNK',
        away_team: prop.awayTeam || 'UNK',
        opponent_id: prop.opponentID,
        home_away: prop.homeAway,
        weather_conditions: prop.weatherConditions,
        is_available: true,
        last_updated: new Date().toISOString()
      }));
      
      // Batch insert props
      const result = await upsertProps(env, transformedProps);
      
      totalProps += processedProps.length;
      totalInserted += result.inserted;
      totalUpdated += result.updated;
      totalErrors += result.errors;
      
      leagueResults[league.id] = {
        events: events.length,
        props: processedProps.length,
        inserted: result.inserted,
        updated: result.updated,
        errors: result.errors
      };
      
      console.log(`✅ ${league.id}: ${processedProps.length} props processed (${result.inserted} inserted, ${result.errors} errors)`);
      
    } catch (error) {
      console.error(`❌ ${league.id}: League processing failed:`, error);
      leagueResults[league.id] = { error: error instanceof Error ? error.message : String(error) };
      totalErrors++;
    }
  }
  
  console.log(`\n🎉 Multi-league ingestion complete:`);
  console.log(`📊 Total: ${totalProps} props, ${totalInserted} inserted, ${totalUpdated} updated, ${totalErrors} errors`);
  
  return {
    totalProps,
    inserted: totalInserted,
    updated: totalUpdated,
    errors: totalErrors,
    leagueResults
  };
}

// Upsert props with retry logic
async function upsertProps(env: any, props: any[]): Promise<{ inserted: number; updated: number; errors: number }> {
  if (props.length === 0) return { inserted: 0, updated: 0, errors: 0 };
  
  console.log(`📝 Upserting ${props.length} props to Supabase...`);
  
  // Chunk data to avoid payload limits
  const chunks = chunk(props, 500);
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  
  for (let i = 0; i < chunks.length; i++) {
    const chunkData = chunks[i];
    
    try {
      const result = await supabaseFetch(env, "proplines?on_conflict=conflict_key", {
        method: "POST",
        body: JSON.stringify(chunkData)
      });
      
      if (Array.isArray(result)) {
        totalInserted += result.length;
      } else if (result && result.inserted) {
        totalInserted += result.inserted;
        totalUpdated += result.updated || 0;
      }
      
      console.log(`✅ Chunk ${i + 1}/${chunks.length}: ${chunkData.length} props processed`);
      
    } catch (error) {
      console.error(`❌ Chunk ${i + 1}/${chunks.length} failed:`, error);
      totalErrors += chunkData.length;
      
      // Retry once on failure
      try {
        console.log(`🔄 Retrying chunk ${i + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const retryResult = await supabaseFetch(env, "proplines?on_conflict=conflict_key", {
          method: "POST",
          body: JSON.stringify(chunkData)
        });
        
        if (Array.isArray(retryResult)) {
          totalInserted += retryResult.length;
          totalErrors -= chunkData.length; // Remove from error count
        }
        
        console.log(`✅ Chunk ${i + 1} retry successful`);
      } catch (retryError) {
        console.error(`❌ Chunk ${i + 1} retry failed:`, retryError);
      }
    }
  }
  
  console.log(`📊 Upsert complete: ${totalInserted} inserted, ${totalUpdated} updated, ${totalErrors} errors`);
  return { inserted: totalInserted, updated: totalUpdated, errors: totalErrors };
}

// Query analytics for a specific player and prop type
async function getPlayerAnalytics(env: any, playerId: string, propType: string): Promise<any> {
  try {
    const analytics = await supabaseFetch(env, `player_prop_analytics?player_id=eq.${playerId}&prop_type=eq.${propType}&order=date.desc&limit=1`);
    
    return analytics && analytics.length > 0 ? analytics[0] : null;
  } catch (error) {
    console.error(`Error fetching analytics for ${playerId} ${propType}:`, error);
    return null;
  }
}

// Scheduled handler for cron jobs
async function scheduledHandler(env: any) {
  console.log('⏰ Scheduled multi-league ingestion triggered');
  
  try {
    const startTime = Date.now();
    const result = await ingestAllLeagues(env);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Scheduled ingestion completed in ${duration}ms:`, result);
    
    // Log summary for monitoring
    console.log(`📊 [SCHEDULED] ${result.totalProps} props, ${result.inserted} inserted, ${result.errors} errors`);
    
  } catch (error) {
    console.error('❌ Scheduled ingestion failed:', error);
  }
}

// Main export for Cloudflare Worker
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

      // Handle multi-league ingestion endpoint
      if (url.pathname === '/ingest') {
        const body = await req.json() as { league?: string; season?: string };
        const { league, season } = body;
        
        console.log(`Starting multi-league prop ingestion`);
        
        const startTime = Date.now();
        
        try {
          const result = await ingestAllLeagues(env);
          const duration = Date.now() - startTime;
          
          return new Response(JSON.stringify({
            success: true,
            message: 'Multi-league prop ingestion completed successfully',
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
          console.error('❌ Multi-league ingestion failed:', error);
          
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

      // Handle analytics query endpoint
      if (url.pathname === '/analytics') {
        const playerId = url.searchParams.get('player_id');
        const propType = url.searchParams.get('prop_type');
        
        if (!playerId || !propType) {
          return new Response(JSON.stringify({
            error: 'player_id and prop_type parameters are required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
        
        try {
          const analytics = await getPlayerAnalytics(env, playerId, propType);
          
          return new Response(JSON.stringify({
            success: true,
            analytics
          }), {
            status: 200,
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

      // Handle league status endpoint
      if (url.pathname === '/leagues') {
        try {
          const activeLeagues = getActiveLeagues();
          const inSeasonLeagues = getLeaguesInSeason();
          
          return new Response(JSON.stringify({
            success: true,
            active: activeLeagues,
            inSeason: inSeasonLeagues,
            total: activeLeagues.length,
            inSeasonCount: inSeasonLeagues.length
          }), {
            status: 200,
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

      // Handle backfill endpoint
      if (url.pathname === '/backfill') {
        const body = await req.json() as { leagueId?: string; season?: number; dateFrom?: string; dateTo?: string; days?: number };
        const { leagueId, season, dateFrom, dateTo, days } = body;
        
        console.log(`Starting backfill: league=${leagueId}, season=${season}, days=${days}`);
        
        const startTime = Date.now();
        
        try {
          let result;
          
          if (dateFrom && dateTo) {
            // Date range backfill
            result = await runBackfillWithDateRange(env, {
              leagueId: leagueId || 'all',
              season: season || 2025,
              dateFrom,
              dateTo
            });
          } else if (leagueId && leagueId !== 'all') {
            // Single league backfill
            result = await runBackfillWithDateRange(env, {
              leagueId: leagueId || 'all',
              season: season || 2025,
              dateFrom: dateFrom || new Date(Date.now() - (days || 90) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              dateTo: dateTo || new Date().toISOString().split('T')[0]
            });
          } else {
            // Multi-league backfill
            result = await runMultiLeagueBackfill(env, days || 90);
          }
          
          const duration = Date.now() - startTime;
          
          return new Response(JSON.stringify({
            success: true,
            message: 'Backfill completed successfully',
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
          console.error('❌ Backfill failed:', error);
          
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

      // Handle backfill verification endpoint
      if (url.pathname === '/verify-backfill') {
        try {
          const results = await verifyBackfillResults(env);
          
          return new Response(JSON.stringify({
            success: true,
            results
          }), {
            status: 200,
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

      // Default response
      return new Response(JSON.stringify({
        message: 'Multi-League Props Ingestion Worker with Backfill Support',
        endpoints: ['/ingest', '/analytics', '/leagues', '/backfill', '/verify-backfill'],
        leagues: getLeaguesInSeason().map(l => l.id),
        features: ['Multi-league ingestion', 'Historical backfill', 'Analytics computation', 'Fallback logic']
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      console.error('❌ Worker error:', error);
      
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
  },

  // Scheduled handler for cron jobs
  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
    await scheduledHandler(env);
  }
};
