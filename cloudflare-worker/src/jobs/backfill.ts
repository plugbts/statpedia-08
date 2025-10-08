// Backfill Runner with Multi-Season Orchestration
// Handles historical data ingestion for analytics enablement

import { getEventsWithFallbacks, getEventsWithAggressiveFallbacks } from "../lib/api";
import { extractPlayerPropsWithLogging } from "../lib/extract";
import { supabaseFetch } from "../supabaseFetch";
import { chunk } from "../helpers";
import { createPlayerPropsFromOdd } from "../createPlayerPropsFromOdd";
import { getCachedPlayerIdMap } from "../playersLoader";

export interface BackfillResult {
  propsInserted: number;
  gameLogsInserted: number;
  errors: number;
  tier: number;
  eventsProcessed: number;
  extractionStats: any;
}

export async function runBackfill(env: any, leagueID: string, season: number, days: number): Promise<BackfillResult> {
  console.log(`🔄 Starting backfill for ${leagueID} season ${season} (${days} days)`);
  
  const startTime = Date.now();
  let propsInserted = 0;
  let gameLogsInserted = 0;
  let errors = 0;
  let tier = 0;
  let eventsProcessed = 0;
  let extractionStats: any = null;
  
  try {
    // Fetch events using fallback strategy
    const { events, tier: fetchedTier } = await getEventsWithAggressiveFallbacks(env, leagueID, season);
    tier = fetchedTier;
    eventsProcessed = events.length;
    
    console.log(`📊 ${leagueID} ${season}: Fetched ${events.length} events (tier ${tier})`);
    
    if (events.length === 0) {
      console.log(`⚠️ ${leagueID} ${season}: No events found for backfill`);
      return { propsInserted: 0, gameLogsInserted: 0, errors: 1, tier: 0, eventsProcessed: 0, extractionStats: null };
    }
    
    // Extract player props with detailed logging
    const { props: extractedProps, stats } = extractPlayerPropsWithLogging(events);
    extractionStats = stats;
    
    console.log(`📊 ${leagueID} ${season}: Extracted ${extractedProps.length} player props`);
    
    if (extractedProps.length === 0) {
      console.log(`⚠️ ${leagueID} ${season}: No player props extracted`);
      return { propsInserted: 0, gameLogsInserted: 0, errors: 0, tier, eventsProcessed, extractionStats };
    }
    
    // Load player ID map for mapping
    const playerIdMap = await getCachedPlayerIdMap(env);
    console.log(`📊 ${leagueID} ${season}: Loaded player map with ${Object.keys(playerIdMap).length} players`);
    
    // Convert extracted props to proplines format
    const mappedProps = [];
    for (const prop of extractedProps) {
      try {
        // Create a mock event object for createPlayerPropsFromOdd
        const mockEvent = {
          id: prop.eventId,
          date: prop.eventStartUtc,
          homeTeam: 'HOME', // Will be extracted from actual event data
          awayTeam: 'AWAY', // Will be extracted from actual event data
          teams: ['HOME', 'AWAY']
        };
        
        // Create a mock odd object for createPlayerPropsFromOdd
        const mockOdd = {
          player_name: prop.playerName,
          playerID: prop.playerId,
          market_key: prop.marketName,
          point: prop.line,
          over_price: prop.overUnder === 'over' ? prop.odds : null,
          under_price: prop.overUnder === 'under' ? prop.odds : null,
          bookmaker_name: prop.sportsbook,
          id: prop.oddId
        };
        
        const eventProps = await createPlayerPropsFromOdd(
          mockOdd, 
          prop.oddId, 
          mockEvent, 
          prop.league.toLowerCase(), 
          season.toString(), 
          undefined, 
          env
        );
        
        mappedProps.push(...eventProps);
        
      } catch (error) {
        console.error(`❌ Error mapping prop ${prop.oddId}:`, error);
        errors++;
      }
    }
    
    console.log(`📊 ${leagueID} ${season}: Mapped ${mappedProps.length} props for insertion`);
    
    // Batch insert props
    if (mappedProps.length > 0) {
      const propChunks = chunk(mappedProps, 500);
      console.log(`📊 ${leagueID} ${season}: Inserting ${propChunks.length} prop batches`);
      
      for (let i = 0; i < propChunks.length; i++) {
        try {
          // Debug: Log first row structure
          if (propChunks[i].length > 0) {
            console.log("🔍 Sample propline row:", JSON.stringify(propChunks[i][0], null, 2));
            console.log("🔍 Batch size:", propChunks[i].length);
          }
          
          const { data, error } = await supabaseFetch(env, "proplines", {
            method: "POST",
            body: propChunks[i],
            query: "?on_conflict=conflict_key"
          });
          
          if (error) {
            console.error(`❌ ${leagueID} ${season}: Props batch ${i + 1} failed:`, error);
            errors += propChunks[i].length;
          } else {
            propsInserted += propChunks[i].length;
            console.log(`✅ ${leagueID} ${season}: Inserted props batch ${i + 1}/${propChunks.length} (${propChunks[i].length} props)`);
          }
          
        } catch (error) {
          console.error(`❌ ${leagueID} ${season}: Props batch ${i + 1} exception:`, error);
          errors += propChunks[i].length;
        }
      }
    }
    
    // Create game log entries for analytics
    const gameLogRows = mappedProps.map(row => ({
      player_id: row.player_id,
      player_name: row.player_name,
      team: row.team,
      opponent: row.opponent || 'UNK',
      season: season,
      date: row.game_time ? row.game_time.split('T')[0] : new Date().toISOString().split('T')[0],
      prop_type: row.prop_type,
      value: row.line || 0, // Use line as value for now
      sport: getSportFromLeague(leagueID),
      position: row.position || 'UNK',
      game_id: row.game_id,
      home_away: row.home_away || 'HOME',
      weather_conditions: row.weather_conditions,
      injury_status: 'Active'
    }));
    
    // Batch insert game logs
    if (gameLogRows.length > 0) {
      const gameLogChunks = chunk(gameLogRows, 500);
      console.log(`📊 ${leagueID} ${season}: Inserting ${gameLogChunks.length} game log batches`);
      
      for (let i = 0; i < gameLogChunks.length; i++) {
        try {
          const { data, error } = await supabaseFetch(env, "player_game_logs", {
            method: "POST",
            body: gameLogChunks[i],
            query: "?on_conflict=unique_player_game_log"
          });
          
          if (error) {
            console.error(`❌ ${leagueID} ${season}: Game logs batch ${i + 1} failed:`, error);
            errors += gameLogChunks[i].length;
          } else {
            gameLogsInserted += gameLogChunks[i].length;
            console.log(`✅ ${leagueID} ${season}: Inserted game logs batch ${i + 1}/${gameLogChunks.length} (${gameLogChunks[i].length} logs)`);
          }
          
        } catch (error) {
          console.error(`❌ ${leagueID} ${season}: Game logs batch ${i + 1} exception:`, error);
          errors += gameLogChunks[i].length;
        }
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ ${leagueID} ${season} backfill complete: ${propsInserted} props, ${gameLogsInserted} game logs, ${errors} errors in ${duration}ms`);
    
    return {
      propsInserted,
      gameLogsInserted,
      errors,
      tier,
      eventsProcessed,
      extractionStats
    };
    
  } catch (error) {
    console.error(`❌ ${leagueID} ${season} backfill failed:`, error);
    return { propsInserted: 0, gameLogsInserted: 0, errors: 1, tier: 0, eventsProcessed: 0, extractionStats: null };
  }
}

// Helper function to get sport from league ID
function getSportFromLeague(leagueId: string): string {
  const leagueMap: Record<string, string> = {
    'NFL': 'football',
    'NCAAF': 'football',
    'NBA': 'basketball',
    'NCAAB': 'basketball',
    'MLB': 'baseball',
    'NHL': 'hockey',
    'EPL': 'soccer'
  };
  
  return leagueMap[leagueId] || 'unknown';
}

// Enhanced backfill with date range specification
export async function runBackfillWithDateRange(env: any, config: {
  leagueID: string;
  season: number;
  dateFrom: string;
  dateTo: string;
}): Promise<BackfillResult> {
  const { leagueID, season, dateFrom, dateTo } = config;
  
  console.log(`🔄 Backfilling ${leagueID} ${season} from ${dateFrom} to ${dateTo}`);
  
  try {
    // Calculate days between dates for logging
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // For date range backfill, we'll use the standard backfill but log the date range
    const result = await runBackfill(env, leagueID, season, days);
    
    console.log(`✅ Date range backfill complete for ${leagueID} ${season}: ${result.propsInserted} props, ${result.gameLogsInserted} game logs`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Date range backfill failed for ${leagueID} ${season}:`, error);
    return { propsInserted: 0, gameLogsInserted: 0, errors: 1, tier: 0, eventsProcessed: 0, extractionStats: null };
  }
}

// Batch backfill for multiple league/season combinations
export async function runBatchBackfill(env: any, combinations: Array<{
  leagueID: string;
  season: number;
  days: number;
}>): Promise<{
  totalProps: number;
  totalGameLogs: number;
  totalErrors: number;
  results: Record<string, BackfillResult>;
}> {
  console.log(`🚀 Starting batch backfill for ${combinations.length} league/season combinations`);
  
  let totalProps = 0;
  let totalGameLogs = 0;
  let totalErrors = 0;
  const results: Record<string, BackfillResult> = {};
  
  for (const combo of combinations) {
    const key = `${combo.leagueID}-${combo.season}`;
    console.log(`\n🏈 Backfilling ${key} (${combo.days} days)`);
    
    try {
      const result = await runBackfill(env, combo.leagueID, combo.season, combo.days);
      
      totalProps += result.propsInserted;
      totalGameLogs += result.gameLogsInserted;
      totalErrors += result.errors;
      
      results[key] = result;
      
      console.log(`✅ ${key}: ${result.propsInserted} props, ${result.gameLogsInserted} game logs, ${result.errors} errors`);
      
    } catch (error) {
      console.error(`❌ ${key} backfill failed:`, error);
      results[key] = { propsInserted: 0, gameLogsInserted: 0, errors: 1, tier: 0, eventsProcessed: 0, extractionStats: null };
      totalErrors++;
    }
  }
  
  console.log(`\n🎉 Batch backfill complete:`);
  console.log(`📊 Total: ${totalProps} props, ${totalGameLogs} game logs, ${totalErrors} errors`);
  
  return {
    totalProps,
    totalGameLogs,
    totalErrors,
    results
  };
}
