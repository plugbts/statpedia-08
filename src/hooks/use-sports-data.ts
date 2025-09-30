import { useState, useEffect, useCallback } from 'react';
import { freeSportsAPIService } from '@/services/free-sports-api';
import { gamesService } from '@/services/games-service';
import { predictionService } from '@/services/prediction-service';

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
      
      // Get real games from free sports API
      const freeGames = await freeSportsAPIService.getCurrentWeekGames(sport);
      
      // Filter for relevant date range games only
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const filteredGames = freeGames.filter(game => {
        const gameDate = new Date(game.date);
        // Include games from one week ago to one month from now, only upcoming and live
        return gameDate >= oneWeekAgo && 
               gameDate <= oneMonthFromNow && 
               ['upcoming', 'live'].includes(game.status);
      });
      
      setGames(filteredGames);
    } catch (err) {
      console.error('Error fetching games:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch games');
      setGames([]);
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
      
      // Get players from current week games
      const games = await freeSportsAPIService.getCurrentWeekGames(sport);
      const allPlayers: any[] = [];
      
      // Extract players from games
      games.forEach(game => {
        // Add home team players
        if (game.homeTeam) {
          allPlayers.push({
            id: `${game.homeTeamAbbr}-home`,
            name: game.homeTeam,
            team: game.homeTeamAbbr,
            position: 'Player',
            sport: sport.toUpperCase(),
            logo: ''
          });
        }
        
        // Add away team players
        if (game.awayTeam) {
          allPlayers.push({
            id: `${game.awayTeamAbbr}-away`,
            name: game.awayTeam,
            team: game.awayTeamAbbr,
            position: 'Player',
            sport: sport.toUpperCase(),
            logo: ''
          });
        }
      });
      
      setPlayers(allPlayers);
    } catch (err) {
      console.error('Error fetching players:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch players');
      setPlayers([]);
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
      
      // Get real props from free sports API
      const freeProps = await freeSportsAPIService.getPlayerProps(sport);
      
      // Filter for relevant date range only
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const filteredProps = freeProps.filter(prop => {
        const gameDate = new Date(prop.gameDate);
        return gameDate >= oneWeekAgo && gameDate <= oneMonthFromNow;
      });
      
      setProps(filteredProps);
    } catch (err) {
      console.error('Error fetching player props:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch player props');
      setProps([]);
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
      
      // Get real predictions from games service
      const gamePredictions = await gamesService.getCurrentWeekPredictions(sport);
      
      // Filter for future games only
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const filteredPredictions = gamePredictions.filter(prediction => {
        const gameDate = new Date(prediction.game.date);
        return gameDate >= today && prediction.game.status !== 'final';
      });
      
      // Limit results if specified
      const limitedPredictions = limit ? filteredPredictions.slice(0, limit) : filteredPredictions;
      
      setPredictions(limitedPredictions);
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
      setPredictions([]);
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
