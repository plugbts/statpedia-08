import { useState, useEffect, useCallback } from 'react';
import { sportsAPIService } from '@/services/sports-api';

interface UseSportsDataOptions {
  sport?: string;
  autoFetch?: boolean;
  refreshInterval?: number;
}

export function useLiveGames(sport: string, options: { autoFetch?: boolean; refreshInterval?: number } = {}) {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sportsAPIService.getLiveGames(sport);
      setGames(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch games');
    } finally {
      setLoading(false);
    }
  }, [sport]);

  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchGames();
    }
  }, [fetchGames, options.autoFetch]);

  useEffect(() => {
    if (options.refreshInterval && options.autoFetch !== false) {
      const interval = setInterval(fetchGames, options.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchGames, options.refreshInterval, options.autoFetch]);

  return {
    games,
    loading,
    error,
    refetch: fetchGames,
  };
}

export function usePlayers(sport: string, teamId?: string) {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sportsAPIService.getPlayers(sport, teamId);
      setPlayers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch players');
    } finally {
      setLoading(false);
    }
  }, [sport, teamId]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  return {
    players,
    loading,
    error,
    refetch: fetchPlayers,
  };
}

export function usePlayerProps(sport: string, market?: string) {
  const [props, setProps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sportsAPIService.getPlayerPropsForSport(sport);
      setProps(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch player props');
    } finally {
      setLoading(false);
    }
  }, [sport, market]);

  useEffect(() => {
    fetchProps();
  }, [fetchProps]);

  return {
    props,
    loading,
    error,
    refetch: fetchProps,
  };
}

export function usePredictions(sport: string, limit?: number) {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sportsAPIService.getPredictions(sport, limit);
      setPredictions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
    } finally {
      setLoading(false);
    }
  }, [sport, limit]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  return {
    predictions,
    loading,
    error,
    refetch: fetchPredictions,
  };
}

// Combined hook for all sports data
export function useSportsData(sport: string, options: UseSportsDataOptions = {}) {
  const games = useLiveGames(sport, {
    autoFetch: options.autoFetch,
    refreshInterval: options.refreshInterval,
  });

  const players = usePlayers(sport);
  const playerProps = usePlayerProps(sport);
  const predictions = usePredictions(sport, 10);

  const isLoading = games.loading || players.loading || playerProps.loading || predictions.loading;
  const hasError = games.error || players.error || playerProps.error || predictions.error;

  const refetchAll = useCallback(async () => {
    await Promise.all([
      games.refetch(),
      players.refetch(),
      playerProps.refetch(),
      predictions.refetch(),
    ]);
  }, [games.refetch, players.refetch, playerProps.refetch, predictions.refetch]);

  return {
    games: games.games,
    players: players.players,
    playerProps: playerProps.props,
    predictions: predictions.predictions,
    loading: isLoading,
    error: hasError,
    refetch: refetchAll,
  };
}

export default useSportsData;
