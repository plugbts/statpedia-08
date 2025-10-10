import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { MatchupBadge, MatchupBadgeCompact } from '../analytics/MatchupBadge';
import { analyticsApi } from '../../services/analytics-api-service';
import { PropMatchup } from '../../lib/analytics';
import { getFixedPlayerPropsWithAnalytics } from '../../lib/player-props-fixes';
import { EnhancedPlayerPropCard } from './enhanced-player-prop-card';

interface AnalyticsIntegrationProps {
  league: string;
  date: string;
  onDataUpdate?: (data: PropMatchup[]) => void;
}

export function AnalyticsIntegration({ league, date, onDataUpdate }: AnalyticsIntegrationProps) {
  const [analyticsData, setAnalyticsData] = useState<PropMatchup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [compactMode, setCompactMode] = useState(true);

  const fetchAnalyticsData = async () => {
    if (!league || !date) return;
    
    setLoading(true);
    try {
      // Use the fixed player props with analytics
      const fixedProps = await getFixedPlayerPropsWithAnalytics(league, date, 50);
      
      if (fixedProps && fixedProps.length > 0) {
        // Convert to the format expected by the component
        const analyticsData = fixedProps
          .filter(prop => prop.analytics) // Only show props with analytics
          .map(prop => ({
            ...prop.analytics,
            prop_id: prop.prop_id,
            player_id: prop.playerName, // Use the fixed player name
            prop_type: prop.prop_type,
            line: prop.line,
            // Add the fixed data
            teamAbbr: prop.teamAbbr,
            teamLogo: prop.teamLogo,
            evPercent: prop.evPercent,
            streak: prop.streak,
          }));
        
        setAnalyticsData(analyticsData as any);
        onDataUpdate?.(analyticsData as any);
      } else {
        // Fallback to original analytics API if no fixed props available
        const response = await analyticsApi.getProps({
          league,
          date,
          limit: 50
        });
        
        if (response.ok && response.data) {
          setAnalyticsData(response.data);
          onDataUpdate?.(response.data);
        }
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Simple debounce state
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Memoize the fetch function to prevent unnecessary re-renders
  const memoizedFetchAnalyticsData = useMemo(() => {
    return fetchAnalyticsData;
  }, [league, date]);

  // Simple debounced fetch function
  const debouncedFetch = useCallback(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    const timer = setTimeout(() => {
      memoizedFetchAnalyticsData();
    }, 300);
    
    setDebounceTimer(timer);
  }, [memoizedFetchAnalyticsData, debounceTimer]);

  useEffect(() => {
    if (showAnalytics) {
      debouncedFetch();
    }
  }, [league, date, showAnalytics, debouncedFetch]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  if (!showAnalytics) {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Analytics Integration</CardTitle>
            <Switch
              checked={showAnalytics}
              onCheckedChange={setShowAnalytics}
            />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Enable analytics-powered matchup grades and insights for player props.
          </p>
        </CardContent>
      </Card>
    );
  }

  const topProps = analyticsData.slice(0, 10);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Analytics Insights</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Compact</span>
            <Switch
              checked={compactMode}
              onCheckedChange={setCompactMode}
              size="sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={memoizedFetchAnalyticsData}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading analytics...</p>
          </div>
        ) : analyticsData.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Top {topProps.length} Matchups</span>
              <span>{analyticsData.length} total props</span>
            </div>
            <div className={`grid gap-3 ${compactMode ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {topProps.slice(0, compactMode ? 3 : 6).map((prop) => (
                <EnhancedPlayerPropCard
                  key={prop.prop_id}
                  playerName={prop.playerName || prop.player_id}
                  teamAbbr={prop.teamAbbr || 'UNK'}
                  opponentAbbr={prop.opponentAbbr || 'UNK'}
                  propType={prop.prop_type}
                  line={prop.line}
                  overOdds={prop.overOdds || 0}
                  underOdds={prop.underOdds || 0}
                  evPercent={prop.evPercent}
                  last5_streak={prop.last5_streak}
                  last10_streak={prop.last10_streak}
                  last20_streak={prop.last20_streak}
                  h2h_streak={prop.h2h_streak}
                  teamLogo={prop.teamLogo}
                  opponentLogo={prop.opponentLogo}
                />
              ))}
            </div>
            <div className="pt-2 border-t text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Avg Grade: {analyticsData.length > 0 ? 
                  (analyticsData.reduce((sum, p) => sum + p.matchup_grade, 0) / analyticsData.length).toFixed(1) 
                  : '0'}</span>
                <span>Best: {analyticsData.length > 0 ? analyticsData[0].matchup_grade.toFixed(1) : '0'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No analytics data available for this date.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
