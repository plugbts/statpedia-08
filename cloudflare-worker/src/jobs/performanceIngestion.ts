// Performance Data Ingestion Job
// Fetches real player performance data and integrates with betting lines

import { getPerformanceFetcher, PerformanceData } from '../lib/performanceDataFetcher';
import { PerformanceDataMatcher } from '../lib/performanceDataMatcher';
import { getActiveLeagues } from '../config/leagues';
import { supabaseFetch } from '../supabaseFetch';
import { createClient } from '@supabase/supabase-js';
import { buildConflictKey } from '../lib/conflictKeyGenerator';

export interface PerformanceIngestionResult {
  success: boolean;
  totalPerformanceRecords: number;
  matchedRecords: number;
  unmatchedRecords: number;
  matchRate: number;
  hitRate: number;
  leagues: Array<{
    league: string;
    performanceRecords: number;
    matchedRecords: number;
    matchRate: number;
  }>;
  errors: string[];
}

export async function runPerformanceIngestion(
  env: any, 
  options: {
    leagues?: string[];
    date?: string;
    days?: number;
  } = {}
): Promise<PerformanceIngestionResult> {
  console.log(`🔄 Starting performance data ingestion...`);
  
  const startTime = Date.now();
  const result: PerformanceIngestionResult = {
    success: true,
    totalPerformanceRecords: 0,
    matchedRecords: 0,
    unmatchedRecords: 0,
    matchRate: 0,
    hitRate: 0,
    leagues: [],
    errors: []
  };

  try {
    const targetLeagues = options.leagues || getActiveLeagues().map(l => l.id);
    const targetDate = options.date || new Date().toISOString().split('T')[0];
    const days = options.days || 1;

    console.log(`📊 Target leagues: ${targetLeagues.join(', ')}`);
    console.log(`📊 Target date: ${targetDate}`);
    console.log(`📊 Days to process: ${days}`);

    const matcher = new PerformanceDataMatcher();
    let allPerformanceData: PerformanceData[] = [];
    let totalMatches = 0;

    // Process each league
    for (const league of targetLeagues) {
      console.log(`\n🏈 Processing ${league} performance data...`);
      
      try {
        const fetcher = getPerformanceFetcher(league);
        
        // Fetch performance data for the specified date range
        const leaguePerformanceData: PerformanceData[] = [];
        
        for (let i = 0; i < days; i++) {
          const currentDate = new Date(targetDate);
          currentDate.setDate(currentDate.getDate() - i);
          const dateString = currentDate.toISOString().split('T')[0];
          
          console.log(`📊 Fetching ${league} performance data for ${dateString}...`);
          
          const dayPerformanceData = await fetcher.fetchPlayerStats(league, dateString, env);
          leaguePerformanceData.push(...dayPerformanceData);
          
          console.log(`📊 Fetched ${dayPerformanceData.length} performance records for ${dateString}`);
        }

        console.log(`📊 Total ${league} performance records: ${leaguePerformanceData.length}`);
        
        if (leaguePerformanceData.length > 0) {
          // Insert all performance data directly into player_game_logs (for testing)
          await insertPerformanceDataDirectly(env, leaguePerformanceData);
          
          // Also try to match with existing prop lines
          const matchingResult = await matcher.matchPerformanceWithProps(env, leaguePerformanceData, targetDate);
          
          // Update result
          result.totalPerformanceRecords += leaguePerformanceData.length;
          result.leagues.push({
            league,
            performanceRecords: leaguePerformanceData.length,
            matchedRecords: matchingResult.matchedRecords.length,
            matchRate: matchingResult.matchRate
          });
          
          allPerformanceData.push(...leaguePerformanceData);
          
          console.log(`✅ ${league} processing complete: ${matchingResult.matchedRecords.length} matches found`);
        } else {
          console.log(`⚠️ No performance data found for ${league}`);
          result.leagues.push({
            league,
            performanceRecords: 0,
            matchedRecords: 0,
            matchRate: 0
          });
        }
        
      } catch (error) {
        const errorMsg = `${league} performance ingestion failed: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`❌ ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    // Calculate final statistics
    result.matchedRecords = totalMatches;
    result.unmatchedRecords = result.totalPerformanceRecords - totalMatches;
    result.matchRate = result.totalPerformanceRecords > 0 ? 
      (totalMatches / result.totalPerformanceRecords) * 100 : 0;

    const duration = Date.now() - startTime;
    
    console.log(`\n🎉 Performance ingestion complete:`);
    console.log(`⏱️ Duration: ${Math.round(duration / 1000)}s`);
    console.log(`📊 Total performance records: ${result.totalPerformanceRecords}`);
    console.log(`📊 Matched records: ${result.matchedRecords}`);
    console.log(`📊 Match rate: ${result.matchRate.toFixed(1)}%`);
    console.log(`📊 Leagues processed: ${result.leagues.length}`);

    return result;
    
  } catch (error) {
    const errorMsg = `Performance ingestion failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`❌ ${errorMsg}`);
    
    result.success = false;
    result.errors.push(errorMsg);
    
    return result;
  }
}

// Single league performance ingestion
export async function runSingleLeaguePerformanceIngestion(
  env: any, 
  league: string, 
  options: {
    date?: string;
    days?: number;
  } = {}
): Promise<PerformanceIngestionResult> {
  console.log(`🔄 Starting single league performance ingestion for ${league}...`);
  
  return runPerformanceIngestion(env, {
    leagues: [league],
    date: options.date,
    days: options.days
  });
}

// Historical performance ingestion
export async function runHistoricalPerformanceIngestion(
  env: any, 
  options: {
    leagues?: string[];
    startDate: string;
    endDate: string;
  }
): Promise<PerformanceIngestionResult> {
  console.log(`🔄 Starting historical performance ingestion from ${options.startDate} to ${options.endDate}...`);
  
  const startDate = new Date(options.startDate);
  const endDate = new Date(options.endDate);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  return runPerformanceIngestion(env, {
    leagues: options.leagues,
    date: options.endDate,
    days: days
  });
}

// Helper function to insert performance data directly into player_game_logs using upsert
async function insertPerformanceDataDirectly(env: any, performanceData: PerformanceData[]): Promise<void> {
  if (performanceData.length === 0) {
    console.log('⚠️ No performance data to insert');
    return;
  }

  console.log(`📊 Upserting ${performanceData.length} performance records into both tables...`);

  // Create Supabase client
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  // Convert performance data to player_game_logs format
  const gameLogRows = performanceData.map(perf => ({
    player_id: perf.player_id,
    player_name: perf.player_name,
    team: perf.team,
    opponent: perf.opponent,
    season: perf.season,
    date: perf.date.slice(0, 10), // Ensure date is properly formatted
    prop_type: perf.prop_type,
    value: perf.value,
    sport: perf.league.toUpperCase(),
    league: perf.league,
    game_id: perf.game_id,
    conflict_key: perf.conflict_key || buildConflictKey({
      playerId: perf.player_id,
      gameId: perf.game_id,
      propType: perf.prop_type,
      sportsbook: "SportsGameOdds",
      league: perf.league,
      season: perf.season
    })
  }));

  // Convert performance data to proplines format
  const propLinesRows = performanceData.map(perf => ({
    player_id: perf.player_id,
    player_name: perf.player_name,
    season: perf.season,
    date: perf.date.slice(0, 10), // Ensure date is properly formatted
    prop_type: perf.prop_type,
    line: perf.value, // Use the actual performance value as the line
    sportsbook: "SportsGameOdds",
    over_odds: -110, // Default odds
    under_odds: 100, // Default odds
    league: perf.league.toUpperCase(),
    game_id: perf.game_id,
    conflict_key: perf.conflict_key || buildConflictKey({
      playerId: perf.player_id,
      gameId: perf.game_id,
      propType: perf.prop_type,
      sportsbook: "SportsGameOdds",
      league: perf.league,
      season: perf.season
    })
  }));

  try {
    // Use upsert to handle unique constraints gracefully
    const { data, error } = await supabase
      .from("player_game_logs")
      .upsert(gameLogRows, { onConflict: "conflict_key" });

    if (error) {
      console.error(`❌ Upsert failed:`, error);
      throw new Error(`Database operation failed: ${error.message}`);
    }

    console.log(`✅ Upserted ${performanceData.length} performance records to player_game_logs`);

    // Also insert into proplines table
    const { data: proplinesData, error: proplinesError } = await supabase
      .from("proplines")
      .upsert(propLinesRows);

    if (proplinesError) {
      console.error(`❌ Proplines upsert failed:`, proplinesError);
      throw new Error(`Proplines database operation failed: ${proplinesError.message}`);
    }

    console.log(`✅ Upserted ${performanceData.length} performance records to proplines`);

    // Persistence check
    const { count, error: countError } = await supabase
      .from("player_game_logs")
      .select("id", { count: "exact", head: true });

    console.log(
      countError
        ? `❌ Persistence check failed: ${countError.message}`
        : `✅ Persistence check: ${count} rows currently in player_game_logs`
    );

    // League-by-league health check
    await logPerformanceHealthCheck(supabase);

  } catch (error) {
    console.error(`❌ Failed to insert performance data:`, error);
    throw new Error(`Performance data insertion failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// League-by-league health check function
async function logPerformanceHealthCheck(supabase: any): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("player_game_logs")
      .select("league", { count: "exact" });

    if (error) {
      console.error("❌ League health check failed:", error.message);
      return;
    }

    // Aggregate counts per league
    const leagueCounts: Record<string, number> = {};
    for (const row of data ?? []) {
      const league = row.league ?? "UNKNOWN";
      leagueCounts[league] = (leagueCounts[league] || 0) + 1;
    }

    console.log("📊 Performance Persistence Health Check");
    Object.entries(leagueCounts).forEach(([league, count]) => {
      console.log(`- ${league}: ${count} rows`);
    });

    // Also check proplines for comparison
    const { data: proplinesData, error: proplinesError } = await supabase
      .from("proplines")
      .select("league", { count: "exact" });

    if (!proplinesError && proplinesData) {
      const proplinesCounts: Record<string, number> = {};
      for (const row of proplinesData ?? []) {
        const league = row.league ?? "UNKNOWN";
        proplinesCounts[league] = (proplinesCounts[league] || 0) + 1;
      }

      console.log("📊 Proplines Persistence Health Check");
      Object.entries(proplinesCounts).forEach(([league, count]) => {
        console.log(`- ${league}: ${count} rows`);
      });
    }

  } catch (error) {
    console.error("❌ Health check failed:", error);
  }
}
