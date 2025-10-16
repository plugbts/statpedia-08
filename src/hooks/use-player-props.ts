import { useEffect, useMemo, useState } from "react";
import { useAuthHeaders } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

export type Offer = {
  book: string;
  overOdds?: number | null;
  underOdds?: number | null;
  deeplink?: string;
  lastUpdated?: string;
};

export type PlayerPropNormalized = {
  id: string;
  sport: string;
  gameId: string;
  startTime?: string;
  playerId?: string;
  playerName?: string;
  team?: string;
  opponent?: string;
  propType: string;
  line: number;
  period?: string;
  offers: Offer[];
  best_over?: {
    book: string;
    odds: number;
    decimal: number;
    edgePct?: number;
    deeplink?: string;
  } | null;
  best_under?: {
    book: string;
    odds: number;
    decimal: number;
    edgePct?: number;
    deeplink?: string;
  } | null;
};

export function usePlayerProps(sport: string) {
  const authHeaders = useAuthHeaders();
  const [data, setData] = useState<PlayerPropNormalized[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await apiFetch(`/api/props?sport=${encodeURIComponent(sport)}&limit=300`, {
          headers: authHeaders,
        });
        const json = await resp.json();
        if (!resp.ok || !json?.success) throw new Error(json?.error || "Failed");
        if (mounted) setData(json.items || []);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load props");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    const id = setInterval(run, 30000); // 30s poll
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [sport, authHeaders]);

  const bestOver = useMemo(() => {
    return [...data].sort((a, b) => (b.best_over?.edgePct || 0) - (a.best_over?.edgePct || 0));
  }, [data]);

  const bestUnder = useMemo(() => {
    return [...data].sort((a, b) => (b.best_under?.edgePct || 0) - (a.best_under?.edgePct || 0));
  }, [data]);

  return { data, loading, error, bestOver, bestUnder };
}
