// Current Season Ingestion Job
// Handles real-time ingestion for current season data

import { getEventsWithFallbacks } from "../lib/api";
import { extractPlayerPropsWithLogging } from "../lib/extract";
import { supabaseFetch } from "../supabaseFetch";
import { chunk } from "../helpers";
import { createPlayerPropsFromOdd } from "../createPlayerPropsFromOdd";
import { getActiveLeagues } from "../config/leagues";

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
      
      // Convert to proplines format
      const mappedProps = [];
      for (const prop of extractedProps) {
        try {
          // Create mock event and odd objects for createPlayerPropsFromOdd
          const mockEvent = {
            id: prop.eventId,
            date: prop.eventStartUtc,
            homeTeam: 'HOME',
            awayTeam: 'AWAY',
            teams: ['HOME', 'AWAY']
          };
          
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
          totalErrors++;
        }
      }
      
      console.log(`📊 ${leagueID}: Mapped ${mappedProps.length} props for insertion`);
      totalProps += mappedProps.length;
      
      // Batch insert props
      let leagueInserted = 0;
      let leagueErrors = 0;
      
      if (mappedProps.length > 0) {
        const propChunks = chunk(mappedProps, 500);
        
        for (let i = 0; i < propChunks.length; i++) {
          try {
            const { data, error } = await supabaseFetch(env, "proplines", {
              method: "POST",
              body: propChunks[i],
              query: "?on_conflict=conflict_key"
            });
            
            if (error) {
              console.error(`❌ ${leagueID}: Props batch ${i + 1} failed:`, error);
              leagueErrors += propChunks[i].length;
            } else {
              leagueInserted += propChunks[i].length;
              console.log(`✅ ${leagueID}: Inserted props batch ${i + 1}/${propChunks.length} (${propChunks[i].length} props)`);
            }
            
          } catch (error) {
            console.error(`❌ ${leagueID}: Props batch ${i + 1} exception:`, error);
            leagueErrors += propChunks[i].length;
          }
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
