import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { MatchupBadge, MatchupBadgeCompact } from '../analytics/MatchupBadge';
import { analyticsApi } from '../../services/analytics-api-service';
import { PropMatchup } from '../../lib/analytics';
import { getFixedPlayerPropsWithAnalytics } from '../../lib/player-props-fixes';

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
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showAnalytics) {
      fetchAnalyticsData();
    }
  }, [league, date, showAnalytics]);

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
              onClick={fetchAnalyticsData}
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
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {topProps.map((prop) => (
                <div
                  key={prop.prop_id}
                  className={`flex items-center justify-between p-2 rounded border ${
                    compactMode ? 'text-xs' : 'text-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-medium truncate">{prop.player_id}</span>
                    <Badge variant="secondary" className="text-xs">
                      {prop.prop_type}
                    </Badge>
                    {prop.teamAbbr && (
                      <Badge variant="outline" className="text-xs">
                        {prop.teamAbbr}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{prop.line}</span>
                    {prop.evPercent !== null && (
                      <span className={`text-xs font-medium ${prop.evPercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {prop.evPercent > 0 ? '+' : ''}{prop.evPercent}%
                      </span>
                    )}
                    {compactMode ? (
                      <MatchupBadgeCompact grade={prop.matchup_grade} />
                    ) : (
                      <MatchupBadge grade={prop.matchup_grade} />
                    )}
                  </div>
                </div>
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
