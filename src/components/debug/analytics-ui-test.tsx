import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMemoizedAnalytics } from '@/hooks/use-memoized-analytics';

export function AnalyticsUITest() {
  const [testProps, setTestProps] = useState<any[]>([]);
  const { calculateAnalytics, getAnalytics, isLoading } = useMemoizedAnalytics();

  // Mock props data
  const mockProps = [
    {
      playerId: 'mahomes-patrick',
      playerName: 'Patrick Mahomes',
      propType: 'Passing Yards',
      line: 275,
      direction: 'over',
      team: 'KC',
      opponent: 'JAX',
      position: 'QB',
      sport: 'nfl'
    },
    {
      playerId: 'allen-josh',
      playerName: 'Josh Allen',
      propType: 'Passing Yards',
      line: 300,
      direction: 'over',
      team: 'BUF',
      opponent: 'MIA',
      position: 'QB',
      sport: 'nfl'
    }
  ];

  const loadTestAnalytics = async () => {
    console.log('🧪 Loading test analytics...');
    setTestProps(mockProps);
    await calculateAnalytics(mockProps);
  };

  const getAnalyticsForProp = (prop: any) => {
    const analytics = getAnalytics(prop.playerId, prop.propType, prop.line, prop.direction);
    console.log(`[UI_TEST] Analytics for ${prop.playerName}:`, analytics);
    return analytics;
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Analytics UI Test</h1>
      
      <Button onClick={loadTestAnalytics} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Load Test Analytics'}
      </Button>
      
      <div className="grid gap-4">
        {testProps.map((prop, index) => {
          const analytics = getAnalyticsForProp(prop);
          
          return (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{prop.playerName} - {prop.propType} {prop.line} {prop.direction}</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics ? (
                  <div className="space-y-2">
                    <div>Matchup Rank: {analytics.matchupRank?.display || 'N/A'}</div>
                    <div>Season: {analytics.season?.hits || 0}/{analytics.season?.total || 0} ({analytics.season?.pct || 0}%)</div>
                    <div>H2H: {analytics.h2h?.hits || 0}/{analytics.h2h?.total || 0} ({analytics.h2h?.pct || 0}%)</div>
                    <div>L5: {analytics.l5?.hits || 0}/{analytics.l5?.total || 0} ({analytics.l5?.pct || 0}%)</div>
                    <div>Streak: {analytics.streak?.current || 0} {analytics.streak?.direction || 'mixed'}</div>
                  </div>
                ) : (
                  <div className="text-red-500">No analytics found - would show N/A and 0/0</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
