// Performance Data Ingestion Job
// Fetches real player performance data and integrates with betting lines

import { getPerformanceFetcher, PerformanceData } from '../lib/performanceDataFetcher';
import { PerformanceDataMatcher } from '../lib/performanceDataMatcher';
import { getActiveLeagues } from '../config/leagues';

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
          // Match performance data with existing prop lines
          const matchingResult = await matcher.matchPerformanceWithProps(env, leaguePerformanceData, targetDate);
          
          // Insert matched records into player_game_logs
          if (matchingResult.matchedRecords.length > 0) {
            await matcher.insertMatchedRecords(env, matchingResult.matchedRecords);
            totalMatches += matchingResult.matchedRecords.length;
          }
          
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
