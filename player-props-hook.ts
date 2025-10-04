// player-props-hook.ts
import { useState, useEffect } from 'react';

type PlayerProp = {
  player_name: string;
  market_type: string;
  line: number | null;
  best_over: { bookmaker: string; price: string; line: number | null } | null;
  best_under: { bookmaker: string; price: string; line: number | null } | null;
};

type Event = {
  eventID: string;
  home_team: string;
  away_team: string;
  player_props: PlayerProp[];
};

type UsePlayerPropsResult = {
  events: Event[];
  loading: boolean;
  error: string | null;
  marketSummary: Record<string, number>;
  refetch: () => void;
};

export function usePlayerProps(league: string, date?: string): UsePlayerPropsResult {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProps = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `/api/${league}/player-props${date ? `?date=${date}` : ''}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch props: ${res.status}`);
      }
      
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProps();
  }, [league, date]);

  // Calculate market summary across all events
  const marketSummary = events.reduce((summary, event) => {
    event.player_props.forEach(prop => {
      const market = prop.market_type || 'Unknown';
      summary[market] = (summary[market] || 0) + 1;
    });
    return summary;
  }, {} as Record<string, number>);

  return {
    events,
    loading,
    error,
    marketSummary,
    refetch: fetchProps,
  };
}

// Utility function to filter props by market type
export function filterPropsByMarket(props: PlayerProp[], marketType: string): PlayerProp[] {
  return props.filter(prop => prop.market_type === marketType);
}

// Utility function to get unique market types
export function getUniqueMarketTypes(props: PlayerProp[]): string[] {
  return [...new Set(props.map(prop => prop.market_type))];
}

// Utility function to format odds for display
export function formatOdds(odds: { price: string; bookmaker: string } | null): string {
  if (!odds) return '-';
  return `${odds.price} (${odds.bookmaker})`;
}
