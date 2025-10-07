import { useMemo, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export function useSimpleAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<Map<string, AnalyticsResult>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const calculateAnalytics = useCallback(async (props: Prop[]) => {
    console.log(`[SIMPLE_ANALYTICS] calculateAnalytics called with ${props.length} props`);
    if (props.length === 0) return;

    setIsLoading(true);

    try {
      const results: Array<{ key: string; analytics: AnalyticsResult }> = [];

      for (const prop of props) {
        const key = `${prop.playerId}-${prop.propType}-${prop.line}-${prop.direction}`;
        console.log(`[SIMPLE_ANALYTICS] Processing ${key}`);

        // Check for precomputed analytics
        console.log(`[SIMPLE_ANALYTICS] Querying analytics for:`, {
          player_id: prop.playerId,
          prop_type: prop.propType,
          line: prop.line,
          direction: prop.direction
        });
        
        const { data: precomputed, error: precomputedError } = await supabase
          .from('analytics')
          .select('*')
          .eq('player_id', prop.playerId)
          .eq('prop_type', prop.propType)
          .eq('line', prop.line)
          .eq('direction', prop.direction)
          .single();
          
        console.log(`[SIMPLE_ANALYTICS] Query result:`, { data: precomputed, error: precomputedError });

        if (precomputedError) {
          console.log(`[SIMPLE_ANALYTICS] No precomputed analytics for ${key}`);
          
          // Fallback to real-time calculation
          const { data: hitRate, error: hitRateError } = await supabase
            .rpc('calculate_hit_rate', {
              p_player_id: prop.playerId,
              p_prop_type: prop.propType,
              p_line: prop.line,
              p_direction: prop.direction,
              p_games_limit: 5
            });

          if (hitRateError) {
            console.log(`[SIMPLE_ANALYTICS] Real-time calculation failed for ${key}:`, hitRateError.message);
            continue;
          }

          const result = hitRate[0];
          const analytics: AnalyticsResult = {
            matchupRank: { rank: 0, display: 'N/A' },
            h2h: { hits: 0, total: 0, pct: 0 },
            season: { hits: result.hits, total: result.total, pct: result.hit_rate * 100 },
            l5: { hits: result.hits, total: result.total, pct: result.hit_rate * 100 },
            l10: { hits: result.hits, total: result.total, pct: result.hit_rate * 100 },
            l20: { hits: result.hits, total: result.total, pct: result.hit_rate * 100 },
            streak: { current: 0, longest: 0, direction: 'mixed' },
            chartData: []
          };

          results.push({ key, analytics });
        } else {
          console.log(`[SIMPLE_ANALYTICS] Found precomputed analytics for ${key}`);
          const analytics: AnalyticsResult = {
            matchupRank: {
              rank: precomputed.matchup_rank_value || 0,
              display: precomputed.matchup_rank_display || 'N/A'
            },
            h2h: {
              hits: precomputed.h2h_hits || 0,
              total: precomputed.h2h_total || 0,
              pct: precomputed.h2h_pct || 0
            },
            season: {
              hits: precomputed.season_hits || 0,
              total: precomputed.season_total || 0,
              pct: precomputed.season_pct || 0
            },
            l5: {
              hits: precomputed.l5_hits || 0,
              total: precomputed.l5_total || 0,
              pct: precomputed.l5_pct || 0
            },
            l10: {
              hits: precomputed.l10_hits || 0,
              total: precomputed.l10_total || 0,
              pct: precomputed.l10_pct || 0
            },
            l20: {
              hits: precomputed.l20_hits || 0,
              total: precomputed.l20_total || 0,
              pct: precomputed.l20_pct || 0
            },
            streak: {
              current: precomputed.streak_current || 0,
              longest: precomputed.streak_current || 0,
              direction: precomputed.streak_type || 'mixed'
            },
            chartData: []
          };

          results.push({ key, analytics });
        }
      }

      // Update analytics data
      const newAnalyticsData = new Map(analyticsData);
      results.forEach(({ key, analytics }) => {
        newAnalyticsData.set(key, analytics);
      });
      setAnalyticsData(newAnalyticsData);

      console.log(`[SIMPLE_ANALYTICS] Completed processing ${results.length} props`);
    } catch (error) {
      console.error('[SIMPLE_ANALYTICS] Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [analyticsData]);

  const getAnalytics = useCallback((playerId: string, propType: string, line: number, direction: string) => {
    const key = `${playerId}-${propType}-${line}-${direction}`;
    const result = analyticsData.get(key) || null;
    console.log(`[SIMPLE_ANALYTICS] getAnalytics called for key: ${key}, result:`, result);
    return result;
  }, [analyticsData]);

  return {
    calculateAnalytics,
    getAnalytics,
    isLoading,
    progress: { completed: 0, total: 0 }
  };
}
