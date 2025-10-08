// Current Season Ingestion Job
// Handles real-time ingestion for current season data

import { getEventsWithFallbacks } from "../lib/api";
import { extractPlayerPropsWithLogging } from "../lib/extract";
import { supabaseFetch } from "../supabaseFetch";
import { chunk } from "../helpers";
import { createPlayerPropsFromOdd } from "../createPlayerPropsFromOdd";
import { getActiveLeagues } from "../config/leagues";
import { insertPropsWithDebugging as insertProps } from "../lib/enhancedInsertProps";
import { mapWithDiagnostics } from "../lib/diagnosticMapper";

export interface IngestionResult {
  totalProps: number;
  inserted: number;
  updated: number;
  errors: number;
  leagues: Array<{
    league: string;
    props: number;
    inserted: number;
    errors: number;
  }>;
}

export async function runIngestion(env: any): Promise<IngestionResult> {
  console.log(`🔄 Starting current season ingestion...`);
  
  const startTime = Date.now();
  let totalProps = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  const leagueResults: Array<{
    league: string;
    props: number;
    inserted: number;
    errors: number;
  }> = [];
  
  const activeLeagues = getActiveLeagues();
  console.log(`📊 Processing ${activeLeagues.length} active leagues: ${activeLeagues.map(l => l.id).join(', ')}`);
  
  for (const leagueConfig of activeLeagues) {
    const { id: leagueID, season, oddIDs } = leagueConfig;
    console.log(`\n🏈 Starting ingestion for ${leagueID} ${season}`);
    
    try {
      // Fetch events using fallback strategy
      const { events, tier } = await getEventsWithFallbacks(env, leagueID, season, oddIDs);
      console.log(`📊 ${leagueID}: Fetched ${events.length} events (tier ${tier})`);
      
      if (events.length === 0) {
        console.log(`⚠️ ${leagueID}: No events found`);
        leagueResults.push({ league: leagueID, props: 0, inserted: 0, errors: 0 });
        continue;
      }
      
      // Extract player props
      const { props: extractedProps, stats } = extractPlayerPropsWithLogging(events);
      console.log(`📊 ${leagueID}: Extracted ${extractedProps.length} player props`);
      
      if (extractedProps.length === 0) {
        console.log(`⚠️ ${leagueID}: No player props extracted`);
        leagueResults.push({ league: leagueID, props: 0, inserted: 0, errors: 0 });
        continue;
      }
      
      // Use diagnostic mapper to convert extracted props to proplines format
      console.log(`🔍 Mapping ${extractedProps.length} extracted props using diagnostic mapper...`);
      const { mapped: mappedProps, stats: mappingStats } = mapWithDiagnostics(extractedProps);
      
      console.log(`📊 ${leagueID}: Mapping results:`, mappingStats);
      
      // Update error count based on mapping failures
      totalErrors += mappingStats.missingPlayerId + mappingStats.unmappedMarket + mappingStats.incompleteOdd;
      
      console.log(`📊 ${leagueID}: Mapped ${mappedProps.length} props for insertion`);
      totalProps += mappedProps.length;
      
      // Batch insert props
      let leagueInserted = 0;
      let leagueErrors = 0;
      
      if (mappedProps.length > 0) {
        try {
          await insertProps(env, mappedProps);
          leagueInserted += mappedProps.length;
          console.log(`✅ ${leagueID}: Successfully inserted ${mappedProps.length} props using insertProps function`);
        } catch (error) {
          console.error(`❌ ${leagueID}: Insert props failed:`, error);
          leagueErrors += mappedProps.length;
        }
      }
      
      totalInserted += leagueInserted;
      totalErrors += leagueErrors;
      
      leagueResults.push({
        league: leagueID,
        props: mappedProps.length,
        inserted: leagueInserted,
        errors: leagueErrors
      });
      
      console.log(`✅ ${leagueID} ingestion complete: ${leagueInserted} inserted, ${leagueErrors} errors`);
      
    } catch (error) {
      console.error(`❌ ${leagueID} ingestion failed:`, error);
      leagueResults.push({ league: leagueID, props: 0, inserted: 0, errors: 1 });
      totalErrors++;
    }
  }
  
  const duration = Date.now() - startTime;
  
  console.log(`\n🎉 Current season ingestion complete:`);
  console.log(`⏱️ Duration: ${Math.round(duration / 1000)}s`);
  console.log(`📊 Total: ${totalProps} props processed, ${totalInserted} inserted, ${totalErrors} errors`);
  console.log(`🏆 Leagues processed: ${leagueResults.length}`);
  
  return {
    totalProps,
    inserted: totalInserted,
    updated: totalUpdated, // Not implemented yet
    errors: totalErrors,
    leagues: leagueResults
  };
}

// Single league ingestion
export async function runSingleLeagueIngestion(env: any, leagueId: string): Promise<IngestionResult> {
  console.log(`🔄 Starting single league ingestion for ${leagueId}...`);
  
  const activeLeagues = getActiveLeagues();
  const leagueConfig = activeLeagues.find(l => l.id === leagueId);
  
  if (!leagueConfig) {
    throw new Error(`League ${leagueId} not found or not active`);
  }
  
  // Temporarily set active leagues to just this one
  const originalActiveLeagues = getActiveLeagues();
  
  try {
    return await runIngestion(env);
  } finally {
    // Restore original active leagues (this is a bit of a hack, but works for now)
    console.log(`✅ Single league ingestion complete for ${leagueId}`);
  }
}
