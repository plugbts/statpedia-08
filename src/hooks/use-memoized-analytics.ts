import { useMemo, useCallback, useState, useEffect } from 'react';
import { analyticsPrecomputationService } from '@/services/analytics-precomputation';
import { useAnalyticsWorker } from '@/hooks/use-analytics-worker';
import { processAnalyticsWithProgress } from '@/utils/chunked-processing';

interface AnalyticsResult {
  matchupRank: { rank: number; display: string };
  h2h: { hits: number; total: number; pct: number };
  season: { hits: number; total: number; pct: number };
  l5: { hits: number; total: number; pct: number };
  l10: { hits: number; total: number; pct: number };
  l20: { hits: number; total: number; pct: number };
  streak: { current: number; longest: number; direction: string };
  chartData: Array<{ x: string; y: number }>;
}

interface Prop {
  playerId: string;
  playerName: string;
  propType: string;
  line: number;
  direction: 'over' | 'under';
  team: string;
  opponent: string;
  position: string;
  sport?: string;
}

export function useMemoizedAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<Map<string, AnalyticsResult>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  
  const { calculateAnalytics: workerCalculateAnalytics, isWorkerAvailable } = useAnalyticsWorker();

  // Memoized analytics calculation
  const calculateAnalytics = useCallback(async (props: Prop[]) => {
    if (props.length === 0) return;

    setIsLoading(true);
    setError(null);
    setProgress({ completed: 0, total: props.length });

    try {
      // Check for precomputed analytics first
      const precomputedResults = await Promise.all(
        props.map(async (prop) => {
          const precomputed = await analyticsPrecomputationService.getPrecomputedAnalytics(
            prop.playerId,
            prop.propType,
            prop.line,
            prop.direction
          );
          
          if (precomputed) {
            return {
              key: `${prop.playerId}-${prop.propType}-${prop.line}-${prop.direction}`,
              analytics: {
                matchupRank: {
                  rank: precomputed.matchup_rank_value || 0,
                  display: precomputed.matchup_rank_display || 'N/A'
                },
                h2h: {
                  hits: precomputed.h2h_hits,
                  total: precomputed.h2h_total,
                  pct: precomputed.h2h_pct
                },
                season: {
                  hits: precomputed.season_hits,
                  total: precomputed.season_total,
                  pct: precomputed.season_pct
                },
                l5: {
                  hits: precomputed.l5_hits,
                  total: precomputed.l5_total,
                  pct: precomputed.l5_pct
                },
                l10: {
                  hits: precomputed.l10_hits,
                  total: precomputed.l10_total,
                  pct: precomputed.l10_pct
                },
                l20: {
                  hits: precomputed.l20_hits,
                  total: precomputed.l20_total,
                  pct: precomputed.l20_pct
                },
                streak: {
                  current: precomputed.streak_current,
                  longest: precomputed.streak_longest,
                  direction: precomputed.streak_direction
                },
                chartData: precomputed.chart_data || []
              }
            };
          }
          return null;
        })
      );

      const precomputedAnalytics = precomputedResults.filter(result => result !== null);
      const newAnalyticsData = new Map(analyticsData);

      // Add precomputed results
      precomputedAnalytics.forEach(({ key, analytics }) => {
        newAnalyticsData.set(key, analytics);
      });

      setAnalyticsData(newAnalyticsData);
      setProgress({ completed: precomputedAnalytics.length, total: props.length });

      // Find props that need real-time calculation
      const propsNeedingCalculation = props.filter(prop => {
        const key = `${prop.playerId}-${prop.propType}-${prop.line}-${prop.direction}`;
        return !newAnalyticsData.has(key);
      });

      if (propsNeedingCalculation.length === 0) {
        setIsLoading(false);
        return;
      }

      console.log(`🔄 Calculating ${propsNeedingCalculation.length} props in real-time`);

      let results: Array<{ key: string; analytics: any }> = [];

      // Try Web Worker first
      if (isWorkerAvailable) {
        try {
          console.log('🚀 Using Web Worker for analytics calculation');
          results = await workerCalculateAnalytics(propsNeedingCalculation);
        } catch (workerError) {
          console.warn('⚠️ Web Worker failed, falling back to chunked processing:', workerError);
        }
      }

      // Fallback to chunked processing if worker failed or not available
      if (results.length === 0) {
        console.log('🔄 Using chunked processing for analytics calculation');
        results = await processAnalyticsWithProgress(
          propsNeedingCalculation,
          (completed, total, currentResults) => {
            setProgress({ completed: precomputedAnalytics.length + completed, total });
            
            // Update analytics data as we go
            const updatedAnalyticsData = new Map(analyticsData);
            currentResults.forEach(({ key, analytics }) => {
              if (analytics) {
                updatedAnalyticsData.set(key, analytics);
              }
            });
            setAnalyticsData(updatedAnalyticsData);
          },
          3 // Small chunk size for responsiveness
        );
      }

      // Update final analytics data
      const finalAnalyticsData = new Map(analyticsData);
      results.forEach(({ key, analytics }) => {
        if (analytics) {
          finalAnalyticsData.set(key, analytics);
        }
      });

      setAnalyticsData(finalAnalyticsData);
      setProgress({ completed: props.length, total: props.length });

    } catch (error) {
      console.error('❌ Failed to calculate analytics:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [analyticsData, isWorkerAvailable, workerCalculateAnalytics]);

  // Memoized analytics getter
  const getAnalytics = useCallback((playerId: string, propType: string, line: number, direction: string) => {
    const key = `${playerId}-${propType}-${line}-${direction}`;
    return analyticsData.get(key) || null;
  }, [analyticsData]);

  // Clear analytics cache
  const clearCache = useCallback(() => {
    setAnalyticsData(new Map());
  }, []);

  return {
    calculateAnalytics,
    getAnalytics,
    clearCache,
    isLoading,
    progress,
    error,
    analyticsCount: analyticsData.size
  };
}
