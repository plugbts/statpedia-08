import { useState, useEffect, useCallback } from "react";
import { getApiBaseUrl } from "@/lib/api";

export interface PlayerAnalytics {
  totalGames: number;
  careerAvg: number;
  careerHitRate: number;
  avgL5: number;
  hitRateL5: number;
  currentStreak: number;
  currentStreakType: "over" | "under";
}

export interface RecentGame {
  game_date: string;
  actual_value: number;
  line: number;
  hit: boolean;
  home_team: string;
  away_team: string;
  home_away: "home" | "away";
}

export interface PlayerAnalyticsResponse {
  analytics: any;
  recentGames: RecentGame[];
  summary: PlayerAnalytics;
}

export interface BulkPlayerAnalytics {
  player_id: string;
  player_name: string;
  total_games: number;
  career_avg: number;
  career_hit_rate: number;
}

export interface BulkAnalyticsResponse {
  analytics: BulkPlayerAnalytics[];
}

export function usePlayerAnalytics(playerId?: string, propType?: string, season = "2025") {
  const [data, setData] = useState<PlayerAnalyticsResponse | null>(null);
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
      const params = new URLSearchParams({
        playerId,
        propType,
        season,
      });

      const response = await fetch(`${getApiBaseUrl()}/api/player-analytics?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching player analytics:", err);
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

export function useBulkPlayerAnalytics(playerIds: string[], propType: string, season = "2025") {
  const [data, setData] = useState<BulkAnalyticsResponse | null>(null);
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
      const response = await fetch(`${getApiBaseUrl()}/api/player-analytics`, {
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
        throw new Error(`Failed to fetch bulk analytics: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching bulk player analytics:", err);
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

export function getStreakDisplay(streak: number, streakType: "over" | "under"): string {
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

export function getTrendDirection(recentGames: RecentGame[]): "up" | "down" | "stable" {
  if (recentGames.length < 3) return "stable";

  const last3 = recentGames.slice(0, 3);
  const first3 = recentGames.slice(-3);

  const lastAvg = last3.reduce((sum, game) => sum + game.actual_value, 0) / last3.length;
  const firstAvg = first3.reduce((sum, game) => sum + game.actual_value, 0) / first3.length;

  const diff = lastAvg - firstAvg;
  const threshold = 0.1; // 10% threshold

  if (diff > threshold) return "up";
  if (diff < -threshold) return "down";
  return "stable";
}
