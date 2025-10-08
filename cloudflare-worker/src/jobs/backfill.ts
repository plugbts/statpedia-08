// Backfill Runner with Multi-Season Orchestration
// Handles historical data ingestion for analytics enablement

import { getEventsWithFallbacks, getEventsWithAggressiveFallbacks } from "../lib/api";
import { extractPlayerPropsWithLogging } from "../lib/extract";
import { supabaseFetch } from "../supabaseFetch";
import { chunk } from "../helpers";
import { createPlayerPropsFromOdd } from "../createPlayerPropsFromOdd";
import { getCachedPlayerIdMap } from "../playersLoader";
import { insertPropsWithDebugging as insertProps } from "../lib/enhancedInsertProps";
import { mapWithDiagnostics } from "../lib/diagnosticMapper";

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
    
    // Use diagnostic mapper to convert extracted props to proplines format
    console.log(`🔍 Mapping ${extractedProps.length} extracted props using diagnostic mapper...`);
    const { mapped: mappedProps, stats: mappingStats } = mapWithDiagnostics(extractedProps);
    
    console.log(`📊 ${leagueID} ${season}: Mapping results:`, mappingStats);
    
    // Update error count based on mapping failures
    errors += mappingStats.missingPlayerId + mappingStats.unmappedMarket + mappingStats.incompleteOdd;
    
    console.log(`📊 ${leagueID} ${season}: Mapped ${mappedProps.length} props for insertion`);
    
    // Insert props using the new insertProps function
    if (mappedProps.length > 0) {
      console.log(`📊 ${leagueID} ${season}: Inserting ${mappedProps.length} props using new insertProps function`);
      
      try {
        await insertProps(env, mappedProps);
        propsInserted += mappedProps.length;
        console.log(`✅ ${leagueID} ${season}: Successfully inserted ${mappedProps.length} props`);
      } catch (error) {
        console.error(`❌ ${leagueID} ${season}: Insert props failed:`, error);
        errors += mappedProps.length;
      }
    }
    
    // Game logs are now handled by the insertProps function
    gameLogsInserted = mappedProps.length; // The insertProps function handles both tables
    
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
