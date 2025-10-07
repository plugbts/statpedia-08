import { supabase } from '@/integrations/supabase/client';
import { analyticsCalculator } from './analytics-calculator';
import { logInfo, logError, logSuccess } from '@/utils/console-logger';

interface CachedAnalytics {
  player_id: string;
  prop_type: string;
  line: number;
  direction: 'over' | 'under';
  matchup_rank_value: number | null;
  matchup_rank_display: string;
  season_hits: number;
  season_total: number;
  season_pct: number;
  h2h_hits: number;
  h2h_total: number;
  h2h_pct: number;
  l5_hits: number;
  l5_total: number;
  l5_pct: number;
  l10_hits: number;
  l10_total: number;
  l10_pct: number;
  l20_hits: number;
  l20_total: number;
  l20_pct: number;
  streak_current: number;
  streak_type: 'over_hit' | 'under_hit' | 'mixed';
  last_computed_at: string;
}

class AnalyticsCacheService {
  /**
   * Precompute analytics for all active player props and cache them
   */
  async precomputeAllAnalytics(): Promise<void> {
    try {
      logInfo('Starting analytics precomputation...');

      // Get all unique player/prop combinations from PlayerGameLogs
      const { data: gameLogs, error: gameLogsError } = await supabase
        .from('PlayerGameLogs')
        .select('player_id, prop_type')
        .order('date', { ascending: false });

      if (gameLogsError) {
        throw new Error(`Failed to fetch game logs: ${gameLogsError.message}`);
      }

      if (!gameLogs || gameLogs.length === 0) {
        logInfo('No game logs found for analytics precomputation');
        return;
      }

      // Get unique player/prop combinations
      const uniqueCombinations = new Set(
        gameLogs.map(log => `${log.player_id}-${log.prop_type}`)
      );

      logInfo(`Found ${uniqueCombinations.size} unique player/prop combinations`);

      // Process each combination
      let processed = 0;
      let errors = 0;

      for (const combination of uniqueCombinations) {
        try {
          const [playerId, propType] = combination.split('-');
          await this.precomputePlayerPropAnalytics(playerId, propType);
          processed++;
          
          if (processed % 10 === 0) {
            logInfo(`Processed ${processed}/${uniqueCombinations.size} combinations`);
          }
        } catch (error) {
          errors++;
          logError(`Error processing combination ${combination}:`, error);
        }
      }

      logSuccess(`Analytics precomputation completed: ${processed} processed, ${errors} errors`);
    } catch (error) {
      logError('Failed to precompute analytics:', error);
      throw error;
    }
  }

  /**
   * Precompute analytics for a specific player/prop combination
   */
  async precomputePlayerPropAnalytics(playerId: string, propType: string): Promise<void> {
    try {
      // Get all game logs for this player/prop
      const { data: gameLogs, error: gameLogsError } = await supabase
        .from('PlayerGameLogs')
        .select('*')
        .eq('player_id', playerId)
        .eq('prop_type', propType)
        .order('date', { ascending: false });

      if (gameLogsError) {
        throw new Error(`Failed to fetch game logs for ${playerId}/${propType}: ${gameLogsError.message}`);
      }

      if (!gameLogs || gameLogs.length === 0) {
        logInfo(`No game logs found for ${playerId}/${propType}`);
        return;
      }

      // Get current prop lines from the API or database
      const lines = await this.getCurrentPropLines(playerId, propType);
      
      if (!lines || lines.length === 0) {
        logInfo(`No current lines found for ${playerId}/${propType}`);
        return;
      }

      // Calculate analytics for each line/direction combination
      for (const line of lines) {
        for (const direction of ['over', 'under'] as const) {
          try {
            const analytics = await analyticsCalculator.calculateAnalytics(
              playerId,
              propType,
              line,
              direction as 'over' | 'under'
            );

            // Store in cache
            await this.storeCachedAnalytics({
              player_id: playerId,
              prop_type: propType,
              line: line,
              direction: direction as 'over' | 'under',
              matchup_rank_value: analytics.matchupRank.rank,
              matchup_rank_display: analytics.matchupRank.display,
              season_hits: analytics.season.hits,
              season_total: analytics.season.total,
              season_pct: analytics.season.pct,
              h2h_hits: analytics.h2h.hits,
              h2h_total: analytics.h2h.total,
              h2h_pct: analytics.h2h.pct,
              l5_hits: analytics.l5.hits,
              l5_total: analytics.l5.total,
              l5_pct: analytics.l5.pct,
              l10_hits: analytics.l10.hits,
              l10_total: analytics.l10.total,
              l10_pct: analytics.l10.pct,
              l20_hits: analytics.l20.hits,
              l20_total: analytics.l20.total,
              l20_pct: analytics.l20.pct,
              streak_current: analytics.streak.current,
              streak_type: analytics.streak.type,
              last_computed_at: new Date().toISOString()
            });
          } catch (error) {
            logError(`Error calculating analytics for ${playerId}/${propType}/${line}/${direction}:`, error);
          }
        }
      }
    } catch (error) {
      logError(`Failed to precompute analytics for ${playerId}/${propType}:`, error);
      throw error;
    }
  }

  /**
   * Get cached analytics for a player/prop combination
   */
  async getCachedAnalytics(
    playerId: string, 
    propType: string, 
    line: number, 
    direction: 'over' | 'under'
  ): Promise<CachedAnalytics | null> {
    try {
      const { data, error } = await supabase
        .from('Analytics')
        .select('*')
        .eq('player_id', playerId)
        .eq('prop_type', propType)
        .eq('line', line)
        .eq('direction', direction)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No cached data found
        }
        throw new Error(`Failed to fetch cached analytics: ${error.message}`);
      }

      return data as CachedAnalytics;
    } catch (error) {
      logError(`Failed to get cached analytics for ${playerId}/${propType}/${line}/${direction}:`, error);
      return null;
    }
  }

  /**
   * Store cached analytics in the database
   */
  private async storeCachedAnalytics(analytics: CachedAnalytics): Promise<void> {
    try {
      const { error } = await supabase
        .from('Analytics')
        .upsert(analytics, {
          onConflict: 'player_id,prop_type,line,direction'
        });

      if (error) {
        throw new Error(`Failed to store cached analytics: ${error.message}`);
      }
    } catch (error) {
      logError('Failed to store cached analytics:', error);
      throw error;
    }
  }

  /**
   * Get current prop lines for a player/prop combination
   * This would typically come from your current prop data source
   */
  private async getCurrentPropLines(playerId: string, propType: string): Promise<number[]> {
    try {
      // For now, return some common lines based on prop type
      // In a real implementation, you'd fetch this from your current props API
      const commonLines: { [key: string]: number[] } = {
        'Passing Yards': [200, 225, 250, 275, 300, 325, 350],
        'Rushing Yards': [50, 75, 100, 125, 150, 175, 200],
        'Receiving Yards': [50, 75, 100, 125, 150, 175, 200],
        'Passing Touchdowns': [1, 2, 3, 4, 5],
        'Rushing Touchdowns': [1, 2, 3, 4, 5],
        'Receiving Touchdowns': [1, 2, 3, 4, 5],
        'Passing Completions': [15, 20, 25, 30, 35, 40],
        'Rushing Attempts': [10, 15, 20, 25, 30, 35],
        'Receptions': [3, 4, 5, 6, 7, 8, 9, 10]
      };

      return commonLines[propType] || [100]; // Default fallback
    } catch (error) {
      logError(`Failed to get current prop lines for ${playerId}/${propType}:`, error);
      return [100]; // Default fallback
    }
  }

  /**
   * Clear old cached analytics (older than specified days)
   */
  async clearOldCache(daysOld: number = 7): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { error } = await supabase
        .from('Analytics')
        .delete()
        .lt('last_computed_at', cutoffDate.toISOString());

      if (error) {
        throw new Error(`Failed to clear old cache: ${error.message}`);
      }

      logSuccess(`Cleared analytics cache older than ${daysOld} days`);
    } catch (error) {
      logError('Failed to clear old cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    uniquePlayers: number;
    uniqueProps: number;
    lastUpdated: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('Analytics')
        .select('player_id, prop_type, last_computed_at');

      if (error) {
        throw new Error(`Failed to get cache stats: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return {
          totalEntries: 0,
          uniquePlayers: 0,
          uniqueProps: 0,
          lastUpdated: null
        };
      }

      const uniquePlayers = new Set(data.map(entry => entry.player_id)).size;
      const uniqueProps = new Set(data.map(entry => entry.prop_type)).size;
      const lastUpdated = data.reduce((latest, entry) => {
        return entry.last_computed_at > latest ? entry.last_computed_at : latest;
      }, data[0].last_computed_at);

      return {
        totalEntries: data.length,
        uniquePlayers,
        uniqueProps,
        lastUpdated
      };
    } catch (error) {
      logError('Failed to get cache stats:', error);
      throw error;
    }
  }
}

export const analyticsCacheService = new AnalyticsCacheService();
