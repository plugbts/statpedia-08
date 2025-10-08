// Multi-Season Backfill Orchestrator
// Coordinates backfill across multiple leagues and seasons

import { runBatchBackfill } from "./backfill";
import { LEAGUES, getActiveLeagues, getAllSeasons, getActiveLeagueSeasonPairs } from "../config/leagues";

export interface MultiSeasonBackfillConfig {
  leagues?: string[]; // Specific leagues to backfill, or all active leagues if not specified
  seasons?: number[]; // Specific seasons to backfill, or all seasons if not specified
  daysPerSeason?: number; // Days to backfill per season
  maxConcurrent?: number; // Maximum concurrent backfills (not implemented yet)
}

export interface MultiSeasonBackfillResult {
  totalProps: number;
  totalGameLogs: number;
  totalErrors: number;
  duration: number;
  leagueSeasonResults: Record<string, any>;
  summary: {
    leaguesProcessed: number;
    seasonsProcessed: number;
    averagePropsPerLeague: number;
    averageGameLogsPerLeague: number;
    successRate: number;
  };
}

export async function runMultiSeasonBackfill(env: any, config: MultiSeasonBackfillConfig = {}): Promise<MultiSeasonBackfillResult> {
  const startTime = Date.now();
  
  console.log(`🚀 Starting multi-season backfill with config:`, config);
  
  // Determine which leagues to process
  const leaguesToProcess = config.leagues || getActiveLeagues().map(l => l.id);
  console.log(`📊 Processing leagues: ${leaguesToProcess.join(', ')}`);
  
  // Determine which seasons to process
  const seasonsToProcess = config.seasons || getAllSeasons();
  console.log(`📊 Processing seasons: ${seasonsToProcess.join(', ')}`);
  
  // Default days per season
  const daysPerSeason = config.daysPerSeason || 200;
  console.log(`📊 Days per season: ${daysPerSeason}`);
  
  // Create league/season combinations
  const combinations = [];
  for (const leagueId of leaguesToProcess) {
    for (const season of seasonsToProcess) {
      combinations.push({
        leagueID: leagueId,
        season: season,
        days: daysPerSeason
      });
    }
  }
  
  console.log(`📊 Total combinations: ${combinations.length}`);
  console.log(`📊 Estimated duration: ${Math.ceil(combinations.length * 2)} minutes`);
  
  // Run batch backfill
  const batchResult = await runBatchBackfill(env, combinations);
  
  const duration = Date.now() - startTime;
  
  // Calculate summary statistics
  const leaguesProcessed = new Set(combinations.map(c => c.leagueID)).size;
  const seasonsProcessed = new Set(combinations.map(c => c.season)).size;
  const averagePropsPerLeague = batchResult.totalProps / leaguesProcessed;
  const averageGameLogsPerLeague = batchResult.totalGameLogs / leaguesProcessed;
  const totalCombinations = combinations.length;
  const successfulCombinations = Object.values(batchResult.results).filter(r => r.errors === 0).length;
  const successRate = (successfulCombinations / totalCombinations) * 100;
  
  const result: MultiSeasonBackfillResult = {
    totalProps: batchResult.totalProps,
    totalGameLogs: batchResult.totalGameLogs,
    totalErrors: batchResult.totalErrors,
    duration,
    leagueSeasonResults: batchResult.results,
    summary: {
      leaguesProcessed,
      seasonsProcessed,
      averagePropsPerLeague: Math.round(averagePropsPerLeague),
      averageGameLogsPerLeague: Math.round(averageGameLogsPerLeague),
      successRate: Math.round(successRate * 100) / 100
    }
  };
  
  console.log(`\n🎉 Multi-season backfill complete!`);
  console.log(`⏱️ Duration: ${Math.round(duration / 1000)}s`);
  console.log(`📊 Results: ${result.totalProps} props, ${result.totalGameLogs} game logs, ${result.totalErrors} errors`);
  console.log(`📈 Success Rate: ${result.summary.successRate}%`);
  console.log(`🏆 Leagues: ${result.summary.leaguesProcessed}, Seasons: ${result.summary.seasonsProcessed}`);
  
  return result;
}

// Quick backfill for recent seasons only
export async function runRecentSeasonsBackfill(env: any, daysPerSeason: number = 90): Promise<MultiSeasonBackfillResult> {
  console.log(`🔄 Running recent seasons backfill (${daysPerSeason} days per season)`);
  
  return runMultiSeasonBackfill(env, {
    leagues: getActiveLeagues().map(l => l.id),
    seasons: [2024, 2025], // Recent seasons only
    daysPerSeason
  });
}

// Full historical backfill for all seasons
export async function runFullHistoricalBackfill(env: any, daysPerSeason: number = 365): Promise<MultiSeasonBackfillResult> {
  console.log(`🔄 Running full historical backfill (${daysPerSeason} days per season)`);
  
  return runMultiSeasonBackfill(env, {
    leagues: getActiveLeagues().map(l => l.id),
    seasons: getAllSeasons(),
    daysPerSeason
  });
}

// League-specific backfill
export async function runLeagueSpecificBackfill(env: any, leagueId: string, seasons: number[], daysPerSeason: number = 200): Promise<MultiSeasonBackfillResult> {
  console.log(`🔄 Running league-specific backfill for ${leagueId} (${seasons.join(', ')})`);
  
  return runMultiSeasonBackfill(env, {
    leagues: [leagueId],
    seasons,
    daysPerSeason
  });
}

// Season-specific backfill
export async function runSeasonSpecificBackfill(env: any, season: number, leagues?: string[], daysPerSeason: number = 200): Promise<MultiSeasonBackfillResult> {
  const leaguesToUse = leagues || getActiveLeagues().map(l => l.id);
  console.log(`🔄 Running season-specific backfill for ${season} (${leaguesToUse.join(', ')})`);
  
  return runMultiSeasonBackfill(env, {
    leagues: leaguesToUse,
    seasons: [season],
    daysPerSeason
  });
}

// Progressive backfill - start with recent data and work backwards
export async function runProgressiveBackfill(env: any, maxDays: number = 365): Promise<MultiSeasonBackfillResult> {
  console.log(`🔄 Running progressive backfill (max ${maxDays} days)`);
  
  const activeLeagues = getActiveLeagues();
  const currentYear = new Date().getFullYear();
  
  // Start with current season, then work backwards
  const seasons = [currentYear, currentYear - 1, currentYear - 2];
  
  const combinations = [];
  for (const league of activeLeagues) {
    for (const season of seasons) {
      // Reduce days for older seasons
      const days = Math.min(maxDays, Math.max(30, maxDays - ((currentYear - season) * 50)));
      combinations.push({
        leagueID: league.id,
        season: season,
        days: days
      });
    }
  }
  
  console.log(`📊 Progressive backfill: ${combinations.length} combinations`);
  
  const batchResult = await runBatchBackfill(env, combinations);
  
  const duration = Date.now();
  const leaguesProcessed = new Set(combinations.map(c => c.leagueID)).size;
  const seasonsProcessed = new Set(combinations.map(c => c.season)).size;
  const totalCombinations = combinations.length;
  const successfulCombinations = Object.values(batchResult.results).filter(r => r.errors === 0).length;
  const successRate = (successfulCombinations / totalCombinations) * 100;
  
  return {
    totalProps: batchResult.totalProps,
    totalGameLogs: batchResult.totalGameLogs,
    totalErrors: batchResult.totalErrors,
    duration,
    leagueSeasonResults: batchResult.results,
    summary: {
      leaguesProcessed,
      seasonsProcessed,
      averagePropsPerLeague: Math.round(batchResult.totalProps / leaguesProcessed),
      averageGameLogsPerLeague: Math.round(batchResult.totalGameLogs / leaguesProcessed),
      successRate: Math.round(successRate * 100) / 100
    }
  };
}
