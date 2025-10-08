// Historical Backfill System for Analytics
// Populates historical props and game logs to enable meaningful analytics calculations

import { fetchEventsWithFallbacks } from "./api";
import { supabaseFetch } from "./supabaseFetch";
import { chunk } from "./helpers";
import { createPlayerPropsFromOdd } from "./createPlayerPropsFromOdd";
import { getCachedPlayerIdMap } from "./playersLoader";
import { getActiveLeagues, getLeagueById } from "./leagueConfig";

// Backfill configuration
interface BackfillConfig {
  leagueId: string;
  season: number;
  days: number;
  batchSize: number;
  maxEventsPerDay: number;
}

// Default backfill configuration
const DEFAULT_BACKFILL_CONFIG: Partial<BackfillConfig> = {
  batchSize: 500,
  maxEventsPerDay: 50
};

// Main backfill function for a single league
export async function runBackfill(env: any, config: BackfillConfig): Promise<{
  propsInserted: number;
  gameLogsInserted: number;
  errors: number;
  tier: number;
}> {
  const { leagueId, season, days, batchSize, maxEventsPerDay } = { ...DEFAULT_BACKFILL_CONFIG, ...config };
  
  console.log(`🔄 Starting backfill for ${leagueId} ${season} (last ${days} days)`);
  
  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - days);
  
  const dateFrom = start.toISOString().slice(0, 10);
  const dateTo = today.toISOString().slice(0, 10);
  
  console.log(`📅 Backfill date range: ${dateFrom} to ${dateTo}`);
  
  let totalProps = 0;
  let totalGameLogs = 0;
  let totalErrors = 0;
  let tier = 1;
  
  try {
    // Fetch events using fallback strategy
    const events = await fetchEventsWithFallbacks(env, leagueId as "NFL" | "NBA", season);
    console.log(`📊 ${leagueId}: Fetched ${events.length} events (tier ${tier})`);
    
    if (events.length === 0) {
      console.log(`⚠️ ${leagueId}: No events found for backfill`);
      return { propsInserted: 0, gameLogsInserted: 0, errors: 0, tier: 0 };
    }
    
    // Extract and process props from events
    const allProps = [];
    const allGameLogs = [];
    
    for (const event of events) {
      try {
        // Filter events by date range
        const eventDate = event.date ? event.date.split('T')[0] : null;
        if (eventDate && (eventDate < dateFrom || eventDate > dateTo)) {
          continue;
        }
        
        // Extract props from event
        const eventProps = await extractPlayerPropsFromEvent(event, leagueId, season.toString(), undefined, env);
        
        if (eventProps.length > 0) {
          allProps.push(...eventProps);
          
          // Create game log entries for each prop
          const gameLogs = eventProps.map(prop => ({
            player_id: prop.player_id,
            player_name: prop.player_name,
            team: prop.team,
            opponent: prop.opponent_id || 'UNK',
            season: season,
            date: prop.date,
            prop_type: prop.prop_type,
            value: prop.line || 0, // Use line as value for now
            sport: getSportFromLeague(leagueId),
            position: prop.position || 'UNK',
            game_id: prop.game_id,
            home_away: prop.home_away || 'HOME',
            weather_conditions: prop.weather_conditions,
            injury_status: 'Active'
          }));
          
          allGameLogs.push(...gameLogs);
        }
        
      } catch (error) {
        console.error(`❌ Error processing event ${event.id}:`, error);
        totalErrors++;
      }
    }
    
    console.log(`📊 ${leagueId}: Extracted ${allProps.length} props and ${allGameLogs.length} game logs`);
    
    // Batch insert props
    if (allProps.length > 0) {
      const propChunks = chunk(allProps, batchSize);
      for (let i = 0; i < propChunks.length; i++) {
        try {
          await supabaseFetch(env, "proplines", {
            method: "POST",
            body: propChunks[i],
            query: "?on_conflict=conflict_key"
          });
          totalProps += propChunks[i].length;
          console.log(`✅ ${leagueId}: Inserted props batch ${i + 1}/${propChunks.length} (${propChunks[i].length} props)`);
        } catch (error) {
          console.error(`❌ ${leagueId}: Props batch ${i + 1} failed:`, error);
          totalErrors += propChunks[i].length;
        }
      }
    }
    
    // Batch insert game logs
    if (allGameLogs.length > 0) {
      const gameLogChunks = chunk(allGameLogs, batchSize);
      for (let i = 0; i < gameLogChunks.length; i++) {
        try {
          await supabaseFetch(env, "player_game_logs", {
            method: "POST",
            body: gameLogChunks[i],
            query: "?on_conflict=unique_player_game_log"
          });
          totalGameLogs += gameLogChunks[i].length;
          console.log(`✅ ${leagueId}: Inserted game logs batch ${i + 1}/${gameLogChunks.length} (${gameLogChunks[i].length} logs)`);
        } catch (error) {
          console.error(`❌ ${leagueId}: Game logs batch ${i + 1} failed:`, error);
          totalErrors += gameLogChunks[i].length;
        }
      }
    }
    
    console.log(`✅ ${leagueId} backfill complete: ${totalProps} props, ${totalGameLogs} game logs, ${totalErrors} errors`);
    
    return {
      propsInserted: totalProps,
      gameLogsInserted: totalGameLogs,
      errors: totalErrors,
      tier
    };
    
  } catch (error) {
    console.error(`❌ ${leagueId} backfill failed:`, error);
    return { propsInserted: 0, gameLogsInserted: 0, errors: 1, tier: 0 };
  }
}

// Multi-league backfill function
export async function runMultiLeagueBackfill(env: any, days: number = 90): Promise<{
  totalProps: number;
  totalGameLogs: number;
  totalErrors: number;
  leagueResults: Record<string, any>;
}> {
  console.log(`🚀 Starting multi-league backfill (last ${days} days)...`);
  
  const leagues = getActiveLeagues();
  console.log(`📊 Found ${leagues.length} leagues for backfill: ${leagues.map(l => l.id).join(', ')}`);
  
  let totalProps = 0;
  let totalGameLogs = 0;
  let totalErrors = 0;
  const leagueResults: Record<string, any> = {};
  
  for (const league of leagues) {
    console.log(`\n🏈 Backfilling ${league.displayName} (${league.id})`);
    
    try {
      const result = await runBackfill(env, {
        leagueId: league.id,
        season: league.season,
        days,
        batchSize: 500,
        maxEventsPerDay: 50
      });
      
      totalProps += result.propsInserted;
      totalGameLogs += result.gameLogsInserted;
      totalErrors += result.errors;
      
      leagueResults[league.id] = result;
      
      console.log(`✅ ${league.id}: ${result.propsInserted} props, ${result.gameLogsInserted} game logs, ${result.errors} errors`);
      
    } catch (error) {
      console.error(`❌ ${league.id} backfill failed:`, error);
      leagueResults[league.id] = { error: error.message };
      totalErrors++;
    }
  }
  
  console.log(`\n🎉 Multi-league backfill complete:`);
  console.log(`📊 Total: ${totalProps} props, ${totalGameLogs} game logs, ${totalErrors} errors`);
  
  return {
    totalProps,
    totalGameLogs,
    totalErrors,
    leagueResults
  };
}

// Extract props from event (similar to existing logic)
async function extractPlayerPropsFromEvent(event: any, leagueId: string, season: string, week: string | undefined, env: any): Promise<any[]> {
  const props: any[] = [];
  
  if (!event.markets || !Array.isArray(event.markets)) {
    return props;
  }
  
  for (const market of event.markets) {
    if (!market.odds || !Array.isArray(market.odds)) {
      continue;
    }
    
    for (const odd of market.odds) {
      if (odd.playerID && odd.playerID !== 'PLAYER_ID') {
        try {
          const eventProps = await createPlayerPropsFromOdd(odd, odd.id, event, leagueId.toLowerCase(), season, week, env);
          props.push(...eventProps);
        } catch (error) {
          console.error(`Error creating props from odd ${odd.id}:`, error);
        }
      }
    }
  }
  
  return props;
}

// Helper function to get sport from league ID
function getSportFromLeague(leagueId: string): string {
  const league = getLeagueById(leagueId);
  if (!league) return 'unknown';
  
  switch (league.sport) {
    case 'FOOTBALL': return 'football';
    case 'BASKETBALL': return 'basketball';
    case 'BASEBALL': return 'baseball';
    case 'HOCKEY': return 'hockey';
    case 'SOCCER': return 'soccer';
    default: return 'unknown';
  }
}

// Backfill with date range
export async function runBackfillWithDateRange(env: any, config: {
  leagueId: string;
  season: number;
  dateFrom: string;
  dateTo: string;
}): Promise<any> {
  const { leagueId, season, dateFrom, dateTo } = config;
  
  console.log(`🔄 Backfilling ${leagueId} ${season} from ${dateFrom} to ${dateTo}`);
  
  try {
    // Calculate days between dates
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return await runBackfill(env, {
      leagueId,
      season,
      days,
      batchSize: 500,
      maxEventsPerDay: 50
    });
    
  } catch (error) {
    console.error(`❌ Date range backfill failed:`, error);
    return { propsInserted: 0, gameLogsInserted: 0, errors: 1, tier: 0 };
  }
}

// Verify backfill results
export async function verifyBackfillResults(env: any): Promise<{
  proplinesCount: number;
  gameLogsCount: number;
  analyticsCount: number;
  recentData: any[];
}> {
  console.log('🔍 Verifying backfill results...');
  
  try {
    // Check proplines count
    const proplinesResponse = await supabaseFetch(env, "proplines", {
      query: "?select=count"
    });
    
    // Check game logs count
    const gameLogsResponse = await supabaseFetch(env, "player_game_logs", {
      query: "?select=count"
    });
    
    // Check analytics view
    const analyticsResponse = await supabaseFetch(env, "player_prop_analytics", {
      query: "?select=count"
    });
    
    // Get recent data sample
    const recentDataResponse = await supabaseFetch(env, "player_prop_analytics", {
      query: "?order=date.desc&limit=5"
    });
    
    const results = {
      proplinesCount: Array.isArray(proplinesResponse) ? proplinesResponse.length : 0,
      gameLogsCount: Array.isArray(gameLogsResponse) ? gameLogsResponse.length : 0,
      analyticsCount: Array.isArray(analyticsResponse) ? analyticsResponse.length : 0,
      recentData: Array.isArray(recentDataResponse) ? recentDataResponse : []
    };
    
    console.log(`📊 Verification results:`);
    console.log(`   Proplines: ${results.proplinesCount}`);
    console.log(`   Game Logs: ${results.gameLogsCount}`);
    console.log(`   Analytics: ${results.analyticsCount}`);
    console.log(`   Recent Data: ${results.recentData.length} records`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return { proplinesCount: 0, gameLogsCount: 0, analyticsCount: 0, recentData: [] };
  }
}
