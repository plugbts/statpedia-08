import { useState, useEffect, useCallback } from "react";
import { getApiBaseUrl } from "@/lib/api";

export interface EnrichedPlayerAnalytics {
  player_id: string;
  player_name: string;
  team: string;
  prop_type: string;
  sport: string;
  position?: string;

  // Hit rate analytics
  season_hit_rate_2025: number;
  season_games_2025: number;
  h2h_hit_rate: number;
  h2h_games: number;
  l5_hit_rate: number;
  l5_games: number;
  l10_hit_rate: number;
  l10_games: number;
  l20_hit_rate: number;
  l20_games: number;

  // Streak analytics
  current_streak: number;
  longest_streak: number;
  streak_direction: "over" | "under" | null;

  // Defensive rank analytics
  matchup_defensive_rank: number | null;
  matchup_rank_display: string | null;

  // Chart data (JSON for flexibility)
  chart_data?: any;

  // Metadata
  last_updated: string;
  created_at: string;
}

export interface EnrichedPlayerAnalyticsResponse {
  analytics: EnrichedPlayerAnalytics | null;
  recentGames: any[];
  summary: {
    totalGames: number;
    careerAvg: number;
    careerHitRate: number;
    avgL5: number;
    hitRateL5: number;
    currentStreak: number;
    currentStreakType: "over" | "under" | null;
  };
  error?: string;
}

export interface BulkEnrichedAnalyticsResponse {
  analytics: EnrichedPlayerAnalytics[];
  error?: string;
}

export function usePlayerAnalyticsEnriched(playerId?: string, propType?: string, season = "2025") {
  const [data, setData] = useState<EnrichedPlayerAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!playerId || !propType) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch from the API endpoint that queries the enriched database
      const response = await fetch(
        `${getApiBaseUrl()}/api/player-analytics-enriched?playerId=${playerId}&propType=${propType}&season=${season}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setData(result);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching enriched player analytics:", err);

      // Fallback: return empty data structure
      setData({
        analytics: null,
        recentGames: [],
        summary: {
          totalGames: 0,
          careerAvg: 0,
          careerHitRate: 0,
          avgL5: 0,
          hitRateL5: 0,
          currentStreak: 0,
          currentStreakType: null,
        },
      });
    } finally {
      setLoading(false);
    }
  }, [playerId, propType, season]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}

export function useBulkPlayerAnalyticsEnriched(
  playerIds: string[],
  propType: string,
  season = "2025",
) {
  const [data, setData] = useState<BulkEnrichedAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBulkAnalytics = useCallback(async () => {
    if (!playerIds.length || !propType) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch from the API endpoint that queries the enriched database
      const response = await fetch(`${getApiBaseUrl()}/api/player-analytics-bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerIds,
          propType,
          season,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setData(result);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching bulk enriched player analytics:", err);
      setData({ analytics: [] });
    } finally {
      setLoading(false);
    }
  }, [playerIds, propType, season]);

  useEffect(() => {
    fetchBulkAnalytics();
  }, [fetchBulkAnalytics]);

  return {
    data,
    loading,
    error,
    refetch: fetchBulkAnalytics,
  };
}

// Utility functions for formatting analytics data
export function formatHitRate(hitRate: number): string {
  return `${(hitRate * 100).toFixed(1)}%`;
}

export function formatAverage(average: number, decimals = 1): string {
  return average.toFixed(decimals);
}

export function getStreakDisplay(streak: number, streakType: "over" | "under" | null): string {
  if (streak === 0) return "No streak";
  const direction = streakType === "over" ? "O" : "U";
  return `${streak} ${direction}`;
}

export function getPerformanceGrade(hitRate: number): string {
  if (hitRate >= 0.7) return "A+";
  if (hitRate >= 0.6) return "A";
  if (hitRate >= 0.55) return "B+";
  if (hitRate >= 0.5) return "B";
  if (hitRate >= 0.45) return "C+";
  if (hitRate >= 0.4) return "C";
  return "D";
}

export function getTrendDirection(recentGames: any[]): "up" | "down" | "stable" {
  if (recentGames.length < 3) return "stable";

  const last3 = recentGames.slice(0, 3);
  const first3 = recentGames.slice(-3);

  const lastAvg = last3.reduce((sum, game) => sum + (game.actual_value || 0), 0) / last3.length;
  const firstAvg = first3.reduce((sum, game) => sum + (game.actual_value || 0), 0) / first3.length;

  const diff = lastAvg - firstAvg;
  const threshold = 0.1; // 10% threshold

  if (diff > threshold) return "up";
  if (diff < -threshold) return "down";
  return "stable";
}
