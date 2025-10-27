// Current Season Ingestion Job
// Handles real-time ingestion for current season data

import { getEventsWithFallbacks } from "../lib/api";
import { extractPlayerProps } from "../lib/extract";
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
  const totalUpdated = 0;
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
      
      // Extract player props with game details fetching
      const extractedProps = await extractPlayerProps(events, env);
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
          // Schema diff logger to compare test vs real data
          function logRowDiff(testRow: any, realRow: any) {
            const testKeys = Object.keys(testRow);
            const realKeys = Object.keys(realRow);

            console.log("🔍 [SCHEMA DIFF] Missing in real:", testKeys.filter(k => !(k in realRow)));
            console.log("🔍 [SCHEMA DIFF] Extra in real:", realKeys.filter(k => !(k in testRow)));

            for (const key of testKeys) {
              if (key in realRow && typeof testRow[key] !== typeof realRow[key]) {
                console.log(`🔍 [SCHEMA DIFF] Type mismatch on ${key}: test=${typeof testRow[key]} (${testRow[key]}) vs real=${typeof realRow[key]} (${realRow[key]})`);
              }
            }
          }

          // Test row structure (known good) - match real data structure
          const testRow = {
            player_id: "TEST_PERSIST_2",
            player_name: "Test Persist Player 2",
            team: "TEST",
            opponent: "OPP",
            league: "nfl",
            season: 2025,
            game_id: "test-persist-game-2",
            date: "2025-10-11",
            prop_type: "test_persist_prop_2",
            line: 100,
            over_odds: -110,
            under_odds: null, // Match real data - null is valid
            odds: null,
            sportsbook: "SportsGameOdds",
            conflict_key: "TEST_PERSIST_2|2025-10-11|test_persist_prop_2|SportsGameOdds|nfl|2025"
          };

          // Compare first real row with test row
          console.log(`🔍 [SCHEMA DIFF] Comparing test vs real row for ${leagueID}:`);
          logRowDiff(testRow, mappedProps[0]);

          // Add diagnostic log for first row
          console.log(`[ingest sample row] ${leagueID}:`, {
            keys: Object.keys(mappedProps[0]),
            sampleRow: mappedProps[0]
          });
          
          const insertResult = await insertProps(env, mappedProps);
          
          if (insertResult.success) {
            leagueInserted += insertResult.proplinesInserted + insertResult.gameLogsInserted;
            console.log(`✅ ${leagueID}: Successfully inserted ${insertResult.proplinesInserted} proplines + ${insertResult.gameLogsInserted} game logs`);
          } else {
            leagueErrors += insertResult.errors;
            console.error(`❌ ${leagueID}: Insert failed with ${insertResult.errors} errors:`, insertResult.errorDetails);
          }
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
