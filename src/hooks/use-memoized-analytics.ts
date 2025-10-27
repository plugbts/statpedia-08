import { useMemo, useCallback, useState, useEffect } from "react";
import { analyticsPrecomputationService } from "@/services/analytics-precomputation";
// import { useAnalyticsWorker } from '@/hooks/use-analytics-worker';
import { processAnalyticsWithProgress } from "@/utils/chunked-processing";

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
  direction: "over" | "under";
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

  // Disable Web Worker completely due to localStorage issue
  const isWorkerAvailable = false;

  // Memoized analytics calculation
  const calculateAnalytics = useCallback(
    async (props: Prop[]) => {
      console.log(`[MEMOIZED_ANALYTICS] calculateAnalytics called with ${props.length} props`);
      if (props.length === 0) return;

      setIsLoading(true);
      setError(null);
      setProgress({ completed: 0, total: props.length });

      try {
        // Check for precomputed analytics first
        console.log(
          `[MEMOIZED_ANALYTICS] Checking precomputed analytics for ${props.length} props`,
        );
        const precomputedResults = await Promise.all(
          props.map(async (prop) => {
            const key = `${prop.playerId}-${prop.propType}-${prop.line}-${prop.direction}`;
            console.log(`[MEMOIZED_ANALYTICS] Checking precomputed for key: ${key}`);
            const precomputed = await analyticsPrecomputationService.getPrecomputedAnalytics(
              prop.playerId,
              prop.propType,
              prop.line,
              prop.direction,
            );
            console.log(`[MEMOIZED_ANALYTICS] Precomputed result for ${key}:`, precomputed);

            if (precomputed) {
              return {
                key: `${prop.playerId}-${prop.propType}-${prop.line}-${prop.direction}`,
                analytics: {
                  matchupRank: {
                    rank: precomputed.matchup_rank_value || 0,
                    display: precomputed.matchup_rank_display || "N/A",
                  },
                  h2h: {
                    hits: precomputed.h2h_hits || 0,
                    total: precomputed.h2h_total || 0,
                    pct: precomputed.h2h_pct || 0,
                  },
                  season: {
                    hits: precomputed.season_hits || 0,
                    total: precomputed.season_total || 0,
                    pct: precomputed.season_pct || 0,
                  },
                  l5: {
                    hits: precomputed.l5_hits || 0,
                    total: precomputed.l5_total || 0,
                    pct: precomputed.l5_pct || 0,
                  },
                  l10: {
                    hits: precomputed.l10_hits || 0,
                    total: precomputed.l10_total || 0,
                    pct: precomputed.l10_pct || 0,
                  },
                  l20: {
                    hits: precomputed.l20_hits || 0,
                    total: precomputed.l20_total || 0,
                    pct: precomputed.l20_pct || 0,
                  },
                  streak: {
                    current: precomputed.streak_current || 0,
                    longest: precomputed.streak_current || 0, // Use current as longest for simplicity
                    direction: precomputed.streak_type || "mixed",
                  },
                  chartData: [], // Chart data not available in analytics table
                },
              };
            }
            return null;
          }),
        );

        const precomputedAnalytics = precomputedResults.filter((result) => result !== null);
        const newAnalyticsData = new Map(analyticsData);

        // Add precomputed results
        precomputedAnalytics.forEach(({ key, analytics }) => {
          newAnalyticsData.set(key, analytics);
        });

        setAnalyticsData(newAnalyticsData);
        setProgress({ completed: precomputedAnalytics.length, total: props.length });

        // Find props that need real-time calculation
        const propsNeedingCalculation = props.filter((prop) => {
          const key = `${prop.playerId}-${prop.propType}-${prop.line}-${prop.direction}`;
          return !newAnalyticsData.has(key);
        });

        if (propsNeedingCalculation.length === 0) {
          setIsLoading(false);
          return;
        }

        console.log(`🔄 Calculating ${propsNeedingCalculation.length} props in real-time`);

        let results: Array<{ key: string; analytics: any }> = [];

        // Temporarily disable Web Worker due to localStorage issue
        // TODO: Re-enable Web Worker once localStorage issue is resolved
        const useWorker = false;
        if (useWorker && isWorkerAvailable) {
          try {
            console.log("🚀 Using Web Worker for analytics calculation");
            results = await workerCalculateAnalytics(propsNeedingCalculation);
          } catch (workerError) {
            console.warn("⚠️ Web Worker failed, falling back to chunked processing:", workerError);
          }
        }

        // Fallback to chunked processing if worker failed or not available
        if (results.length === 0) {
          console.log("🔄 Using chunked processing for analytics calculation");
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
            3, // Small chunk size for responsiveness
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
        console.error("❌ Failed to calculate analytics:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    [analyticsData, isWorkerAvailable, workerCalculateAnalytics],
  );

  // Memoized analytics getter
  const getAnalytics = useCallback(
    (playerId: string, propType: string, line: number, direction: string) => {
      const key = `${playerId}-${propType}-${line}-${direction}`;
      const result = analyticsData.get(key) || null;
      console.log(`[MEMOIZED_ANALYTICS] getAnalytics called for key: ${key}, result:`, result);
      console.log(`[MEMOIZED_ANALYTICS] Total analytics in cache: ${analyticsData.size}`);
      return result;
    },
    [analyticsData],
  );

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
    analyticsCount: analyticsData.size,
  };
}
