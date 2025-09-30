import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Season dates for filtering
const SEASON_STATUS = {
  'nba': { active: true, start: '2025-10-21', end: '2026-06-30' },
  'basketball': { active: true, start: '2025-10-21', end: '2026-06-30' },
  'nfl': { active: true, start: '2025-09-04', end: '2026-02-15' },
  'football': { active: true, start: '2025-09-04', end: '2026-02-15' },
  'nhl': { active: true, start: '2025-10-08', end: '2026-06-30' },
  'hockey': { active: true, start: '2025-10-08', end: '2026-06-30' },
  'mlb': { active: false, start: '2026-03-26', end: '2026-10-31' },
  'baseball': { active: false, start: '2026-03-26', end: '2026-10-31' },
  'wnba': { active: false, start: '2026-05-15', end: '2026-10-15' },
  'college-basketball': { active: true, start: '2025-11-04', end: '2026-04-08' },
  'college-football': { active: true, start: '2025-08-24', end: '2026-01-13' }
};

export const useOddsAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSeasonActive = (sport: string): boolean => {
    const seasonInfo = SEASON_STATUS[sport as keyof typeof SEASON_STATUS];
    if (!seasonInfo) return true; // Unknown sport, assume active
    return seasonInfo.active;
  };

  const fetchInSeasonSports = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('fetch-odds', {
        body: { endpoint: 'sports' }
      });

      if (functionError) throw functionError;
      if (!data.success) throw new Error(data.error);

      // Filter to only active sports based on our season dates
      const activeSports = data.data.filter((sport: any) => {
        const sportKey = sport.key.replace('_', '-');
        return isSeasonActive(sportKey);
      });

      return activeSports;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch sports';
      setError(message);
      console.error('Error fetching sports:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchOdds = async (sport: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('fetch-odds', {
        body: { endpoint: 'odds', sport }
      });

      if (functionError) throw functionError;
      if (!data.success) throw new Error(data.error);

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch odds';
      setError(message);
      console.error('Error fetching odds:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (sport: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('fetch-odds', {
        body: { endpoint: 'events', sport }
      });

      if (functionError) throw functionError;
      if (!data.success) throw new Error(data.error);

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch events';
      setError(message);
      console.error('Error fetching events:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerProps = async (sport: string, eventId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('fetch-odds', {
        body: { endpoint: 'player-props', sport, eventId }
      });

      if (functionError) throw functionError;
      if (!data.success) throw new Error(data.error);

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch player props';
      setError(message);
      console.error('Error fetching player props:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchInSeasonSports,
    fetchOdds,
    fetchEvents,
    fetchPlayerProps,
    isSeasonActive
  };
};
