import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Season dates including playoffs/postseason - only filter if completely off-season
const SEASON_STATUS = {
  'nba': { start: '2025-10-21', end: '2026-06-30' }, // Includes playoffs through June
  'basketball': { start: '2025-10-21', end: '2026-06-30' },
  'nfl': { start: '2025-09-04', end: '2026-02-15' }, // Includes Super Bowl
  'football': { start: '2025-09-04', end: '2026-02-15' },
  'nhl': { start: '2025-10-08', end: '2026-06-30' }, // Includes Stanley Cup Finals
  'hockey': { start: '2025-10-08', end: '2026-06-30' },
  'mlb': { start: '2026-03-26', end: '2026-11-15' }, // Includes World Series
  'baseball': { start: '2026-03-26', end: '2026-11-15' },
  'wnba': { start: '2026-05-15', end: '2026-10-20' }, // Includes WNBA Finals
  'college-basketball': { start: '2025-11-04', end: '2026-04-08' }, // Includes March Madness
  'college-football': { start: '2025-08-24', end: '2026-01-20' } // Includes CFP Championship
};

export const useOddsAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSeasonActive = (sport: string): boolean => {
    const seasonInfo = SEASON_STATUS[sport as keyof typeof SEASON_STATUS];
    if (!seasonInfo) return true; // Unknown sport, assume active
    
    // Check if current date is within season range (including playoffs)
    const now = new Date();
    const startDate = new Date(seasonInfo.start);
    const endDate = new Date(seasonInfo.end);
    
    return now >= startDate && now <= endDate;
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

      // Filter to only in-season sports (including playoffs)
      const activeSports = data.data.filter((sport: any) => {
        const sportKey = sport.key.replace('_', '-');
        const active = isSeasonActive(sportKey);
        
        if (!active) {
          const seasonInfo = SEASON_STATUS[sportKey as keyof typeof SEASON_STATUS];
          console.log(`Filtered out ${sportKey} - off-season until ${seasonInfo?.start}`);
        }
        
        return active;
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
