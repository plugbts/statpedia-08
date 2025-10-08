import { supabaseFetch } from "./supabaseFetch";
import { chunk } from "./helpers";
import { createPlayerPropsFromOdd } from "./createPlayerPropsFromOdd";

// Add missing functions from simple-ingestion.ts
async function fetchEvents(env: any, sportID: string, season: string, week?: string): Promise<any[]> {
  let allEvents: any[] = [];
  let nextCursor: string | null = null;
  let pageCount = 0;
  const maxPages = 2; // Conservative for testing

  // Primary query attempt
  try {
    allEvents = await fetchEventsWithParams(env, sportID, season, week);
    console.log(`Primary query successful: ${allEvents.length} events`);
    return allEvents;
  } catch (error) {
    console.error('Primary query failed:', error);
  }

  // Fallback 1: Try season 2024 if current season returns 0
  if (season === '2025' && allEvents.length === 0) {
    console.log('Trying fallback: season 2024');
    try {
      const fallbackEvents = await fetchEventsWithParams(env, sportID, '2024', week);
      if (fallbackEvents.length > 0) {
        console.log(`Fallback successful: found ${fallbackEvents.length} events for season 2024`);
        return fallbackEvents;
      }
    } catch (error) {
      console.error('Season 2024 fallback failed:', error);
    }
  }

  // Fallback 2: Try without week filter if week was specified
  if (week && allEvents.length === 0) {
    console.log('Trying fallback: without week filter');
    try {
      const fallbackEvents = await fetchEventsWithParams(env, sportID, season);
      if (fallbackEvents.length > 0) {
        console.log(`Fallback successful: found ${fallbackEvents.length} events without week filter`);
        return fallbackEvents;
      }
    } catch (error) {
      console.error('No week filter fallback failed:', error);
    }
  }

  // Fallback 3: Try with relaxed filters (remove oddsAvailable and markets filters)
  if (allEvents.length === 0) {
    console.log('Trying fallback: relaxed filters');
    try {
      const fallbackEvents = await fetchEventsWithParams(env, sportID, season, week, true);
      if (fallbackEvents.length > 0) {
        console.log(`Fallback successful: found ${fallbackEvents.length} events with relaxed filters`);
        return fallbackEvents;
      }
    } catch (error) {
      console.error('Relaxed filters fallback failed:', error);
    }
  }

  console.log(`All fallback attempts exhausted. Total events: ${allEvents.length}`);
  return allEvents;
}

async function fetchEventsWithParams(env: any, sportID: string, season: string, week?: string, relaxed = false): Promise<any[]> {
  let allEvents: any[] = [];
  let nextCursor: string | null = null;
  let pageCount = 0;
  const maxPages = 2;

  do {
    try {
      // Build endpoint with optional relaxed filters
      let endpoint = `/v2/events?sportID=${sportID}&season=${season}&limit=10`;
      
      if (!relaxed) {
        endpoint += `&oddsAvailable=true&markets=playerProps`;
      }
      
      if (week) {
        endpoint += `&week=${week}`;
      }
      
      if (nextCursor) {
        endpoint += `&cursor=${nextCursor}`;
      }

      console.log(`Fetching events from: ${endpoint}${relaxed ? ' (relaxed filters)' : ''}`);
      
      const response = await fetch(`https://api.sportsgameodds.com${endpoint}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Statpedia/1.0',
          'x-api-key': env.SGO_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`API response: ${data.events?.length || 0} events, nextCursor: ${data.nextCursor || 'null'}`);
      
      if (data.events && data.events.length > 0) {
        allEvents.push(...data.events);
      }
      
      nextCursor = data.nextCursor;
      pageCount++;
      
      if (pageCount >= maxPages) {
        console.log(`Reached max pages (${maxPages}), stopping`);
        break;
      }
      
    } catch (error) {
      console.error('Error fetching events:', error);
      break;
    }
  } while (nextCursor);

  console.log(`Total events fetched: ${allEvents.length}`);
  return allEvents;
}

async function extractPlayerPropsFromEvent(event: any, league: string, season: string, week?: string, env?: any): Promise<any[]> {
  const props: any[] = [];
  
  let playerPropOdds = 0;
  let totalOdds = 0;

  if (!event.odds) {
    console.log(`Event ${event.eventID} has no odds`);
    return props;
  }

  const odds = Object.entries(event.odds);
  console.log(`Fetched odds: ${odds.length}`);

  for (const [oddId, odd] of odds) {
    totalOdds++;
    
    if (isPlayerProp(odd)) {
      playerPropOdds++;
      console.log(`Found player prop odd: ${oddId}`);
      
      try {
        const playerProps = await createPlayerPropsFromOdd(odd, oddId, event, league, season, week, env);
        if (playerProps && playerProps.length > 0) {
          props.push(...playerProps);
        }
      } catch (error) {
        console.error(`Error creating player props for odd ${oddId}:`, error);
      }
    }
  }

  console.log(`After market filter: ${playerPropOdds} player prop odds found`);
  console.log(`After mapping: ${props.length} props created`);
  console.log(`Event ${event.eventID}: ${playerPropOdds} player prop odds found, ${props.length} props created out of ${totalOdds} total odds`);
  return props;
}

function isPlayerProp(odd: any): boolean {
  if (!odd || !odd.prop || !odd.player) {
    return false;
  }

  // Check if it's a player prop by looking at the prop type
  const propType = odd.prop.name?.toLowerCase() || '';
  const playerPropTypes = [
    'passing yards', 'rushing yards', 'receiving yards',
    'passing touchdowns', 'rushing touchdowns', 'receiving touchdowns',
    'passing completions', 'passing attempts',
    'receptions', 'interceptions',
    'points', 'rebounds', 'assists', 'steals', 'blocks',
    'hits', 'runs', 'rbis', 'strikeouts', 'walks',
    'goals', 'assists', 'shots', 'saves',
    // Additional variations
    'pass yards', 'rush yards', 'rec yards',
    'pass tds', 'rush tds', 'rec tds',
    'completions', 'attempts',
    'anytime td', 'player rush tds'
  ];

  const isPlayerProp = playerPropTypes.some(type => propType.includes(type));
  
  if (!isPlayerProp) {
    console.warn("Unmapped market:", { propType, oddId: odd.id, player: odd.player?.name });
  }

  return isPlayerProp;
}

// Batching utility function
function chunk<T>(arr: T[], size: number): T[][] {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function upsertProps(env: any, props: any[]): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  try {
    if (props.length === 0) {
      console.log("No props to upsert");
      return { inserted: 0, updated: 0, errors: 0 };
    }

    // Validate props before upserting
    const validatedProps = props.filter(prop => {
      if (!prop.player_id || !prop.date || !prop.prop_type) {
        console.error("Invalid prop missing critical fields:", prop);
        return false;
      }
      return true;
    });

    if (validatedProps.length === 0) {
      console.log("No valid props to upsert");
      return { inserted: 0, updated: 0, errors: props.length };
    }

    // Chunk to avoid payload limits (≤ 500 rows per request)
    const batches = chunk(validatedProps, 500);
    console.log(`Processing ${batches.length} batches of props`);
    console.log(`After batching: ${batches.reduce((n, b) => n + b.length, 0)} total props in batches`);

    for (const batch of batches) {
      try {
        // Try to upsert with retry logic
        await supabaseFetch(env, "proplines", {
          method: "POST",
          body: batch,
        });
        inserted += batch.length;
        console.log(`✅ Successfully upserted batch of ${batch.length} proplines records`);
      } catch (error) {
        console.error(`❌ Error upserting batch, retrying:`, error);
        
        // Retry once on failure
        try {
          await supabaseFetch(env, "proplines", {
            method: "POST",
            body: batch,
          });
          inserted += batch.length;
          console.log(`✅ Successfully upserted batch of ${batch.length} proplines records on retry`);
        } catch (retryError) {
          console.error(`❌ Failed to upsert batch after retry:`, retryError);
          errors += batch.length;
        }
      }
    }

    // Summary logs for observability
    console.log(`📊 Inserted ${inserted} props, dropped ${props.length - inserted - errors}, errors: ${errors}`);

  } catch (error) {
    console.error('❌ Exception during proplines upsert:', {
      error: error,
      errorMessage: error.message,
      propsCount: props.length
    });
    errors += props.length;
  }

  return { inserted, updated, errors };
}

// Scheduled handler for cron jobs
async function scheduledHandler(env: any, event: ScheduledEvent) {
  console.log(`🕐 Scheduled ingestion triggered at ${new Date().toISOString()}`);
  
  try {
    // Run ingestion for all major leagues
    const leagues = ['NFL', 'NBA', 'MLB', 'NHL'];
    const season = new Date().getFullYear().toString();
    
    let totalInserted = 0;
    let totalErrors = 0;
    
    for (const league of leagues) {
      console.log(`🏈 Starting scheduled ingestion for ${league}`);
      
      try {
        // Map league to sportID
        const sportID = league === 'NFL' || league === 'NCAAF' ? 'FOOTBALL' :
                       league === 'NBA' || league === 'NCAAB' ? 'BASKETBALL' :
                       league === 'MLB' ? 'BASEBALL' :
                       league === 'NHL' ? 'HOCKEY' : 'FOOTBALL';
        
        // Fetch events
        const events = await fetchEvents(env, sportID, season);
        console.log(`Fetched ${events.length} events for ${league}`);
        
        if (events.length === 0) {
          console.log(`No events found for ${league}, skipping`);
          continue;
        }
        
        let leagueInserted = 0;
        let leagueErrors = 0;
        
        // Process events
        for (const event of events) {
          try {
            const props = await extractPlayerPropsFromEvent(event, league, season, undefined, env);
            if (props.length > 0) {
              const upsertResult = await upsertProps(env, props);
              leagueInserted += upsertResult.inserted;
              leagueErrors += upsertResult.errors;
            }
          } catch (error) {
            console.error(`Error processing event ${event.eventID}:`, error);
            leagueErrors++;
          }
        }
        
        totalInserted += leagueInserted;
        totalErrors += leagueErrors;
        
        console.log(`✅ ${league}: ${leagueInserted} inserted, ${leagueErrors} errors`);
        
      } catch (error) {
        console.error(`❌ Error processing ${league}:`, error);
        totalErrors++;
      }
    }
    
    console.log(`🎯 Scheduled ingestion complete: ${totalInserted} total inserted, ${totalErrors} total errors`);
    
  } catch (error) {
    console.error('❌ Scheduled ingestion failed:', error);
  }
}

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

      // Handle ingestion endpoint
      if (url.pathname === '/ingest') {
        const body = await req.json();
        const { league = 'NFL', season = '2025', week } = body;
        
        console.log(`Starting prop ingestion for league: ${league}, season: ${season}, week: ${week || 'all'}`);
        
        const startTime = Date.now();
        
        try {
          // Map league to sportID exactly as before
          const sportID = league === 'NFL' || league === 'NCAAF' ? 'FOOTBALL' :
                         league === 'NBA' || league === 'NCAAB' ? 'BASKETBALL' :
                         league === 'MLB' ? 'BASEBALL' :
                         league === 'NHL' ? 'HOCKEY' : 'FOOTBALL';
          
          console.log(`Processing ${league} (${sportID})`);
          
          // Fetch events using EXACT v2 API parameters
          const events = await fetchEvents(env, sportID, season, week);
          console.log(`Fetched ${events.length} events for ${league}`);
          
          // Fallback logic is now handled in fetchEvents function
          
          let totalProps = 0;
          let totalInserted = 0;
          let totalUpdated = 0;
          let totalErrors = 0;
          
          if (events.length > 0) {
            console.log(`Processing ${events.length} events`);
            
            for (const event of events) {
              try {
                console.log(`Processing event ${event.eventID} with ${Object.keys(event.odds || {}).length} odds`);
                const props = await extractPlayerPropsFromEvent(event, league, season, week, env);
                console.log(`Extracted ${props.length} props from event ${event.eventID}`);
                
                if (props.length > 0) {
                  console.log(`Found ${props.length} props in event ${event.eventID}`);
                  const upsertResult = await upsertProps(env, props);
                  totalInserted += upsertResult.inserted;
                  totalUpdated += upsertResult.updated;
                  totalErrors += upsertResult.errors;
                  totalProps += props.length;
                }
              } catch (error) {
                console.error(`Error processing event ${event.eventID}:`, error);
                totalErrors++;
              }
            }
          }
          
          const duration = Date.now() - startTime;
          
          return new Response(JSON.stringify({
            success: true,
            message: "Prop ingestion completed successfully",
            duration: `${duration}ms`,
            totalProps,
            inserted: totalInserted,
            updated: totalUpdated,
            errors: totalErrors,
            leagues: [league]
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
          
        } catch (error) {
          console.error('Ingestion failed:', error);
          return new Response(JSON.stringify({
            success: false,
            message: "Prop ingestion failed",
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

      // Default response
      return new Response('Statpedia Player Props Worker', { status: 200 });
    } catch (err) {
      console.error("Worker error:", err);
      return new Response("Internal error", { status: 500 });
    }
  },

  // Scheduled handler for cron jobs
  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
    ctx.waitUntil(scheduledHandler(env, event));
  },
};
