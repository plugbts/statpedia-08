import { useCallback, useState } from "react";
import { getApiBaseUrl } from "@/lib/api";

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

export function useSimpleAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<Map<string, AnalyticsResult>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const calculateAnalytics = useCallback(
    async (props: Prop[]) => {
      console.log(`[SIMPLE_ANALYTICS] calculateAnalytics called with ${props.length} props`);
      if (props.length === 0) return;

      setIsLoading(true);

      try {
        const season = "2025";

        // Prepare request payloads grouped by propType to avoid mixing markets
        const requested = props
          .filter((p) => !!p.playerId)
          .map((p) => ({
            playerId: p.playerId as string,
            propType: p.propType,
            line: p.line,
            direction: p.direction,
          }));

        const byPropType = new Map<string, { playerIds: string[]; items: typeof requested }>();
        for (const r of requested) {
          if (!byPropType.has(r.propType)) byPropType.set(r.propType, { playerIds: [], items: [] });
          const entry = byPropType.get(r.propType)!;
          entry.items.push(r);
          if (r.playerId && !entry.playerIds.includes(r.playerId)) entry.playerIds.push(r.playerId);
        }

        const results: Array<{ key: string; analytics: AnalyticsResult }> = [];

        for (const [propType, group] of byPropType.entries()) {
          try {
            const resp = await fetch(`${getApiBaseUrl()}/api/player-analytics-bulk`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ playerIds: group.playerIds, propType, season }),
            });

            let bulk: any[] = [];
            if (resp.ok) {
              const json = await resp.json();
              bulk = Array.isArray(json.analytics) ? json.analytics : [];
            } else {
              console.warn(
                "[SIMPLE_ANALYTICS] Bulk analytics request failed with status",
                resp.status,
              );
            }

            const byPlayer = new Map<string, any>();
            for (const row of bulk) {
              if (row && row.player_id) byPlayer.set(row.player_id, row);
            }

            for (const r of group.items) {
              const key = `${r.playerId}-${r.propType}-${r.line}-${r.direction}`;
              const row = r.playerId ? byPlayer.get(r.playerId) : undefined;
              if (!row) {
                results.push({
                  key,
                  analytics: {
                    matchupRank: { rank: 0, display: "N/A" },
                    h2h: { hits: 0, total: 0, pct: 0 },
                    season: { hits: 0, total: 0, pct: 0 },
                    l5: { hits: 0, total: 0, pct: 0 },
                    l10: { hits: 0, total: 0, pct: 0 },
                    l20: { hits: 0, total: 0, pct: 0 },
                    streak: { current: 0, longest: 0, direction: "mixed" },
                    chartData: [],
                  },
                });
                continue;
              }

              const l5Pct = Number(row.l5 ?? 0);
              const l10Pct = Number(row.l10 ?? 0);
              const l20Pct = Number(row.l20 ?? 0);
              const currentStreak = Number(row.current_streak ?? 0);
              const matchupRank = Number(row.matchup_rank ?? 0) || 0;

              const analytics: AnalyticsResult = {
                matchupRank: { rank: matchupRank, display: matchupRank ? `#${matchupRank}` : "—" },
                h2h: { hits: 0, total: 0, pct: 0 },
                season: { hits: 0, total: 0, pct: 0 },
                l5: { hits: 0, total: 5, pct: l5Pct },
                l10: { hits: 0, total: 10, pct: l10Pct },
                l20: { hits: 0, total: 20, pct: l20Pct },
                streak: {
                  current: currentStreak,
                  longest: Math.abs(currentStreak),
                  direction: currentStreak >= 0 ? "over" : "under",
                },
                chartData: [],
              };
              results.push({ key, analytics });
            }
          } catch (e) {
            console.warn(
              "[SIMPLE_ANALYTICS] Bulk analytics request failed for propType",
              propType,
              e,
            );
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
        console.error("[SIMPLE_ANALYTICS] Error:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [analyticsData],
  );

  const getAnalytics = useCallback(
    (playerId: string, propType: string, line: number, direction: string) => {
      const key = `${playerId}-${propType}-${line}-${direction}`;
      const result = analyticsData.get(key) || null;
      console.log(`[SIMPLE_ANALYTICS] getAnalytics key: ${key}`, result);
      return result;
    },
    [analyticsData],
  );

  return {
    calculateAnalytics,
    getAnalytics,
    isLoading,
    progress: { completed: 0, total: 0 },
  };
}
