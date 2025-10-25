// Performance Data Ingestion Job
// Fetches real player performance data and integrates with betting lines

import { getPerformanceFetcher, PerformanceData } from "../lib/performanceDataFetcher";
import { getActiveLeagues } from "../config/leagues";
import { buildConflictKey } from "../lib/conflictKeyGenerator";
import { normalizePropType } from "../lib/propTypeNormalizer";

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
  } = {},
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
    errors: [],
  };

  try {
    const targetLeagues = options.leagues || getActiveLeagues().map((l) => l.id);
    const targetDate = options.date || new Date().toISOString().split("T")[0];
    const days = options.days || 1;

    console.log(`📊 Target leagues: ${targetLeagues.join(", ")}`);
    console.log(`📊 Target date: ${targetDate}`);
    console.log(`📊 Days to process: ${days}`);

    const allPerformanceData: PerformanceData[] = [];
    const totalMatches = 0; // Matching disabled (NO SUPABASE)

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
          const dateString = currentDate.toISOString().split("T")[0];

          console.log(`📊 Fetching ${league} performance data for ${dateString}...`);

          const dayPerformanceData = await fetcher.fetchPlayerStats(league, dateString, env);
          leaguePerformanceData.push(...dayPerformanceData);

          console.log(
            `📊 Fetched ${dayPerformanceData.length} performance records for ${dateString}`,
          );
        }

        console.log(`📊 Total ${league} performance records: ${leaguePerformanceData.length}`);

        if (leaguePerformanceData.length > 0) {
          // Persistence disabled in worker (NO SUPABASE)
          await insertPerformanceDataDirectly(env, leaguePerformanceData);

          // Matching disabled (relied on Supabase). Report basic stats only.
          result.totalPerformanceRecords += leaguePerformanceData.length;
          result.leagues.push({
            league,
            performanceRecords: leaguePerformanceData.length,
            matchedRecords: 0,
            matchRate: 0,
          });

          allPerformanceData.push(...leaguePerformanceData);

          console.log(`✅ ${league} processing complete (NO SUPABASE matching)`);
        } else {
          console.log(`⚠️ No performance data found for ${league}`);
          result.leagues.push({
            league,
            performanceRecords: 0,
            matchedRecords: 0,
            matchRate: 0,
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
    result.matchRate =
      result.totalPerformanceRecords > 0
        ? (totalMatches / result.totalPerformanceRecords) * 100
        : 0;

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
  } = {},
): Promise<PerformanceIngestionResult> {
  console.log(`🔄 Starting single league performance ingestion for ${league}...`);

  return runPerformanceIngestion(env, {
    leagues: [league],
    date: options.date,
    days: options.days,
  });
}

// Historical performance ingestion
export async function runHistoricalPerformanceIngestion(
  env: any,
  options: {
    leagues?: string[];
    startDate: string;
    endDate: string;
  },
): Promise<PerformanceIngestionResult> {
  console.log(
    `🔄 Starting historical performance ingestion from ${options.startDate} to ${options.endDate}...`,
  );

  const startDate = new Date(options.startDate);
  const endDate = new Date(options.endDate);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return runPerformanceIngestion(env, {
    leagues: options.leagues,
    date: options.endDate,
    days: days,
  });
}

// Helper function placeholder: log performance data count (NO SUPABASE)
async function insertPerformanceDataDirectly(
  env: any,
  performanceData: PerformanceData[],
): Promise<void> {
  if (performanceData.length === 0) {
    console.log("⚠️ No performance data to insert");
    return;
  }

  console.log(
    `📊 [NO-OP] Would upsert ${performanceData.length} performance records (NO SUPABASE)`,
  );

  // Convert performance data to player_game_logs format (for logging only)
  const gameLogRows = performanceData.map((perf) => {
    const normalizedPropType = normalizePropType(perf.prop_type);

    return {
      player_id: perf.player_id,
      player_name: perf.player_name,
      team: perf.team,
      opponent: perf.opponent,
      season: perf.season,
      date: perf.date.slice(0, 10), // Ensure date is properly formatted
      prop_type: normalizedPropType,
      value: perf.value,
      sport: perf.league.toUpperCase(),
      league: perf.league,
      game_id: perf.game_id,
      conflict_key:
        perf.conflict_key ||
        buildConflictKey({
          playerId: perf.player_id,
          gameId: perf.game_id,
          propType: normalizedPropType,
          sportsbook: "SportsGameOdds",
          league: perf.league,
          season: perf.season,
        }),
    };
  });

  // Convert performance data to proplines format (for logging only)
  const propLinesRows = performanceData.map((perf) => {
    const normalizedPropType = normalizePropType(perf.prop_type);

    return {
      player_id: perf.player_id,
      player_name: perf.player_name,
      season: perf.season,
      date: perf.date.slice(0, 10), // Ensure date is properly formatted
      prop_type: normalizedPropType,
      line: perf.value, // Use the actual performance value as the line
      sportsbook: "SportsGameOdds",
      over_odds: -110, // Default odds
      under_odds: 100, // Default odds
      league: perf.league.toLowerCase(),
      game_id: perf.game_id,
      conflict_key:
        perf.conflict_key ||
        buildConflictKey({
          playerId: perf.player_id,
          gameId: perf.game_id,
          propType: normalizedPropType,
          sportsbook: "SportsGameOdds",
          league: perf.league,
          season: perf.season,
        }),
    };
  });

  // Log sample for visibility
  console.log("📋 Sample game log row:", gameLogRows[0]);
  console.log("📋 Sample proplines row:", propLinesRows[0]);
}

// League-by-league health check function placeholder (NO SUPABASE)
async function logPerformanceHealthCheck(): Promise<void> {
  console.log("ℹ️ Skipping performance persistence health check (NO SUPABASE)");
}
