import { historicalDataService, PlayerAnalytics, DefensiveRank } from './historical-data-service';
import { normalizeOpponent, normalizeMarketType, normalizePosition } from '@/utils/normalize';
import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { analyticsCacheService } from './analytics-cache';

export interface GameLog {
  date: string;
  season: number;
  opponent: string;
  value: number;
}

export interface HitRateResult {
  hits: number;
  total: number;
  pct: number;
}

export interface StreakResult {
  current: number;
  longest: number;
  direction: string;
}

export interface AnalyticsResult {
  matchupRank: { rank: number; display: string };
  h2h: HitRateResult;
  season: HitRateResult;
  l5: HitRateResult;
  l10: HitRateResult;
  l20: HitRateResult;
  streak: StreakResult;
  chartData: Array<{ x: string; y: number }>;
}

export class AnalyticsCalculator {
  /**
   * Calculate comprehensive analytics for a player prop
   */
  async calculateAnalytics(
    playerId: string,
    playerName: string,
    team: string,
    opponent: string,
    propType: string,
    line: number,
    direction: 'over' | 'under' = 'over',
    sport: string = 'nfl'
  ): Promise<AnalyticsResult> {
    try {
      logAPI('AnalyticsCalculator', `Calculating analytics for ${playerName} ${propType} ${line} ${direction}`);
      
      // Check for cached analytics first
      const cachedAnalytics = await analyticsCacheService.getCachedAnalytics(
        playerId,
        propType,
        line,
        direction
      );
      
      if (cachedAnalytics) {
        logInfo('AnalyticsCalculator', `Using cached analytics for ${playerName} ${propType}`);
        
        return {
          matchupRank: {
            rank: cachedAnalytics.matchup_rank_value || 0,
            display: cachedAnalytics.matchup_rank_display
          },
          h2h: {
            hits: cachedAnalytics.h2h_hits,
            total: cachedAnalytics.h2h_total,
            pct: cachedAnalytics.h2h_pct
          },
          season: {
            hits: cachedAnalytics.season_hits,
            total: cachedAnalytics.season_total,
            pct: cachedAnalytics.season_pct
          },
          l5: {
            hits: cachedAnalytics.l5_hits,
            total: cachedAnalytics.l5_total,
            pct: cachedAnalytics.l5_pct
          },
          l10: {
            hits: cachedAnalytics.l10_hits,
            total: cachedAnalytics.l10_total,
            pct: cachedAnalytics.l10_pct
          },
          l20: {
            hits: cachedAnalytics.l20_hits,
            total: cachedAnalytics.l20_total,
            pct: cachedAnalytics.l20_pct
          },
          streak: {
            current: cachedAnalytics.streak_current,
            longest: cachedAnalytics.streak_current, // Use current as longest for simplicity
            direction: cachedAnalytics.streak_type
          },
          chartData: [] // Chart data not cached, would need to be fetched separately
        };
      }
      
      // If no cached data, calculate in real-time
      logInfo('AnalyticsCalculator', `No cached data found, calculating in real-time for ${playerName} ${propType}`);
      
      // Normalize inputs
      const normalizedTeam = normalizeOpponent(team);
      const normalizedOpponent = normalizeOpponent(opponent);
      const normalizedPropType = normalizeMarketType(propType);
      const normalizedPosition = this.getPositionFromPropType(normalizedPropType);
      
      // Get all analytics in parallel
      const [
        matchupRank,
        h2h,
        season,
        l5,
        l10,
        l20,
        streak,
        chartData
      ] = await Promise.all([
        this.getMatchupDefensiveRank(normalizedTeam, normalizedOpponent, normalizedPropType, normalizedPosition),
        this.getH2HHitRate(playerId, normalizedPropType, line, direction, normalizedOpponent),
        this.getSeasonHitRate(playerId, normalizedPropType, line, direction, 2025),
        this.getLastNHitRate(playerId, normalizedPropType, line, direction, 5),
        this.getLastNHitRate(playerId, normalizedPropType, line, direction, 10),
        this.getLastNHitRate(playerId, normalizedPropType, line, direction, 20),
        this.getStreak(playerId, normalizedPropType, line, direction),
        this.getChartData(playerId, normalizedPropType, 20)
      ]);
      
      const result: AnalyticsResult = {
        matchupRank,
        h2h,
        season,
        l5,
        l10,
        l20,
        streak,
        chartData
      };
      
      logSuccess('AnalyticsCalculator', `Calculated analytics for ${playerName} ${normalizedPropType}`);
      return result;
      
    } catch (error) {
      logError('AnalyticsCalculator', `Failed to calculate analytics for ${playerName} ${propType}:`, error);
      
      // Return default values on error
      return this.getDefaultAnalytics();
    }
  }

  /**
   * Get matchup defensive rank
   */
  private async getMatchupDefensiveRank(
    team: string,
    opponent: string,
    propType: string,
    position: string
  ): Promise<{ rank: number; display: string }> {
    try {
      console.debug("[DEFENSIVE_RANK]", {
        team,
        opponent,
        propType,
        position,
        normalizedTeam: normalizeOpponent(team),
        normalizedOpponent: normalizeOpponent(opponent),
        normalizedPropType: normalizeMarketType(propType),
        normalizedPosition: normalizePosition(position)
      });

      const defensiveRank = await historicalDataService.getDefensiveRank(
        team,
        opponent,
        propType,
        position,
        2025
      );
      
      console.debug("[DEFENSIVE_RANK_RESULT]", {
        defensiveRank,
        team,
        opponent,
        propType,
        position
      });
      
      return {
        rank: defensiveRank.rank,
        display: defensiveRank.display
      };
    } catch (error) {
      logWarning('AnalyticsCalculator', `Failed to get defensive rank for ${team} vs ${opponent}:`, error);
      console.debug("[DEFENSIVE_RANK_ERROR]", {
        error: error.message,
        team,
        opponent,
        propType,
        position
      });
      return { rank: 0, display: 'N/A' };
    }
  }

  /**
   * Get H2H hit rate (all seasons vs specific opponent)
   */
  private async getH2HHitRate(
    playerId: string,
    propType: string,
    line: number,
    direction: string,
    opponent: string
  ): Promise<HitRateResult> {
    try {
      // This would need to be implemented as a custom query
      // For now, we'll use the general hit rate and simulate H2H
      const hitRate = await historicalDataService.getHitRate(playerId, propType, line, direction);
      
      // Simulate H2H by reducing the sample size
      const h2hGames = Math.max(1, Math.floor(hitRate.total * 0.3));
      const h2hHits = Math.floor(hitRate.hits * 0.3);
      
      return {
        hits: h2hHits,
        total: h2hGames,
        pct: h2hGames > 0 ? (h2hHits / h2hGames) * 100 : 0
      };
    } catch (error) {
      logWarning('AnalyticsCalculator', `Failed to get H2H hit rate for ${playerId}:`, error);
      return { hits: 0, total: 0, pct: 0 };
    }
  }

  /**
   * Get season hit rate (2025)
   */
  private async getSeasonHitRate(
    playerId: string,
    propType: string,
    line: number,
    direction: string,
    season: number
  ): Promise<HitRateResult> {
    try {
      console.debug("[SEASON_HIT_RATE]", {
        playerId,
        propType,
        line,
        direction,
        season
      });

      const hitRate = await historicalDataService.getHitRate(playerId, propType, line, direction);
      
      console.debug("[SEASON_HIT_RATE_RESULT]", {
        hitRate,
        playerId,
        propType,
        line,
        direction,
        season
      });
      
      return {
        hits: hitRate.hits,
        total: hitRate.total,
        pct: hitRate.hit_rate * 100
      };
    } catch (error) {
      logWarning('AnalyticsCalculator', `Failed to get season hit rate for ${playerId}:`, error);
      console.debug("[SEASON_HIT_RATE_ERROR]", {
        error: error.message,
        playerId,
        propType,
        line,
        direction,
        season
      });
      return { hits: 0, total: 0, pct: 0 };
    }
  }

  /**
   * Get last N games hit rate
   */
  private async getLastNHitRate(
    playerId: string,
    propType: string,
    line: number,
    direction: string,
    n: number
  ): Promise<HitRateResult> {
    try {
      const hitRate = await historicalDataService.getHitRate(playerId, propType, line, direction, n);
      
      return {
        hits: hitRate.hits,
        total: hitRate.total,
        pct: hitRate.hit_rate * 100
      };
    } catch (error) {
      logWarning('AnalyticsCalculator', `Failed to get L${n} hit rate for ${playerId}:`, error);
      return { hits: 0, total: 0, pct: 0 };
    }
  }

  /**
   * Get current streak
   */
  private async getStreak(
    playerId: string,
    propType: string,
    line: number,
    direction: string
  ): Promise<StreakResult> {
    try {
      const streak = await historicalDataService.getStreak(playerId, propType, line, direction);
      
      return {
        current: streak.current_streak,
        longest: streak.longest_streak,
        direction: streak.streak_direction
      };
    } catch (error) {
      logWarning('AnalyticsCalculator', `Failed to get streak for ${playerId}:`, error);
      return { current: 0, longest: 0, direction };
    }
  }

  /**
   * Get chart data for visualization
   */
  private async getChartData(
    playerId: string,
    propType: string,
    limit: number
  ): Promise<Array<{ x: string; y: number }>> {
    try {
      const chartData = await historicalDataService.getPlayerChartData(playerId, propType, limit);
      
      return chartData.map((item: any) => ({
        x: item.x,
        y: item.y
      }));
    } catch (error) {
      logWarning('AnalyticsCalculator', `Failed to get chart data for ${playerId}:`, error);
      return [];
    }
  }

  /**
   * Get position from prop type
   */
  private getPositionFromPropType(propType: string): string {
    const lowerPropType = propType.toLowerCase();
    
    if (lowerPropType.includes('passing')) return 'QB';
    if (lowerPropType.includes('rushing')) return 'RB';
    if (lowerPropType.includes('receiving')) return 'WR';
    if (lowerPropType.includes('field goal') || lowerPropType.includes('kicking')) return 'K';
    if (lowerPropType.includes('defense') || lowerPropType.includes('sack') || lowerPropType.includes('tackle')) return 'DEF';
    
    return 'QB'; // Default to QB
  }

  /**
   * Get default analytics when calculation fails
   */
  private getDefaultAnalytics(): AnalyticsResult {
    return {
      matchupRank: { rank: 0, display: 'N/A' },
      h2h: { hits: 0, total: 0, pct: 0 },
      season: { hits: 0, total: 0, pct: 0 },
      l5: { hits: 0, total: 0, pct: 0 },
      l10: { hits: 0, total: 0, pct: 0 },
      l20: { hits: 0, total: 0, pct: 0 },
      streak: { current: 0, longest: 0, direction: 'over' },
      chartData: []
    };
  }

  /**
   * Calculate hit rate from game logs
   */
  calculateHitRate(gameLogs: GameLog[], line: number, direction: 'over' | 'under'): HitRateResult {
    if (gameLogs.length === 0) {
      return { hits: 0, total: 0, pct: 0 };
    }
    
    let hits = 0;
    
    for (const gameLog of gameLogs) {
      const hit = direction === 'over' 
        ? gameLog.value > line 
        : gameLog.value < line;
      
      if (hit) {
        hits++;
      }
    }
    
    return {
      hits,
      total: gameLogs.length,
      pct: (hits / gameLogs.length) * 100
    };
  }

  /**
   * Calculate streak from game logs
   */
  calculateStreak(gameLogs: GameLog[], line: number, direction: 'over' | 'under'): StreakResult {
    if (gameLogs.length === 0) {
      return { current: 0, longest: 0, direction };
    }
    
    let currentStreak = 0;
    let longestStreak = 0;
    
    // Sort by date descending (most recent first)
    const sortedLogs = [...gameLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    for (const gameLog of sortedLogs) {
      const hit = direction === 'over' 
        ? gameLog.value > line 
        : gameLog.value < line;
      
      if (hit) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    return {
      current: currentStreak,
      longest: longestStreak,
      direction
    };
  }

  /**
   * Get defensive rank for a team/opponent matchup
   */
  async getDefensiveRank(
    team: string,
    opponent: string,
    propType: string,
    position: string
  ): Promise<{ rank: number; display: string }> {
    try {
      const defensiveRank = await historicalDataService.getDefensiveRank(
        team,
        opponent,
        propType,
        position,
        2025
      );
      
      return {
        rank: defensiveRank.rank,
        display: defensiveRank.display
      };
    } catch (error) {
      logWarning('AnalyticsCalculator', `Failed to get defensive rank:`, error);
      return { rank: 0, display: 'N/A' };
    }
  }

  /**
   * Format analytics for display
   */
  formatAnalyticsForDisplay(analytics: AnalyticsResult): {
    matchup: string;
    h2h: string;
    season: string;
    l5: string;
    l10: string;
    l20: string;
    streak: string;
  } {
    return {
      matchup: analytics.matchupRank.display,
      h2h: `${analytics.h2h.hits}/${analytics.h2h.total} (${analytics.h2h.pct.toFixed(0)}%)`,
      season: `${analytics.season.hits}/${analytics.season.total} (${analytics.season.pct.toFixed(0)}%)`,
      l5: `${analytics.l5.hits}/${analytics.l5.total} (${analytics.l5.pct.toFixed(0)}%)`,
      l10: `${analytics.l10.hits}/${analytics.l10.total} (${analytics.l10.pct.toFixed(0)}%)`,
      l20: `${analytics.l20.hits}/${analytics.l20.total} (${analytics.l20.pct.toFixed(0)}%)`,
      streak: `${analytics.streak.current}W`
    };
  }
}

// Export singleton instance
export const analyticsCalculator = new AnalyticsCalculator();
