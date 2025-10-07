import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMemoizedAnalytics } from '@/hooks/use-memoized-analytics';

export function SimpleAnalyticsTest() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const { calculateAnalytics, getAnalytics, isLoading } = useMemoizedAnalytics();

  const testAnalytics = async () => {
    console.log('🧪 Starting simple analytics test...');
    
    // Test with known data that should have precomputed analytics
    const testProps = [
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
      }
    ];
    
    console.log('📊 Test props:', testProps);
    
    // Load analytics
    await calculateAnalytics(testProps);
    
    // Get analytics for each prop
    const results = testProps.map(prop => {
      const analytics = getAnalytics(prop.playerId, prop.propType, prop.line, prop.direction);
      console.log(`[SIMPLE_TEST] Analytics for ${prop.playerName}:`, analytics);
      
      return {
        prop: prop,
        analytics: analytics,
        display: analytics ? {
          matchupRank: analytics.matchupRank?.display || 'N/A',
          season: analytics.season?.total > 0 ? `${analytics.season.hits}/${analytics.season.total} (${analytics.season.pct}%)` : '0/0 (0%)',
          h2h: analytics.h2h?.total > 0 ? `${analytics.h2h.hits}/${analytics.h2h.total} (${analytics.h2h.pct}%)` : '0/0 (0%)',
          l5: analytics.l5?.total > 0 ? `${analytics.l5.hits}/${analytics.l5.total} (${analytics.l5.pct}%)` : '0/0 (0%)',
          streak: analytics.streak?.current || 0
        } : null
      };
    });
    
    console.log('📈 Test results:', results);
    setTestResults(results);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Simple Analytics Test</h1>
      
      <Button onClick={testAnalytics} disabled={isLoading}>
        {isLoading ? 'Testing...' : 'Test Analytics'}
      </Button>
      
      <div className="space-y-4">
        {testResults.map((result, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>
                {result.prop.playerName} - {result.prop.propType} {result.prop.line} {result.prop.direction}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.analytics ? (
                <div className="space-y-2">
                  <div><strong>Matchup Rank:</strong> {result.display.matchupRank}</div>
                  <div><strong>Season:</strong> {result.display.season}</div>
                  <div><strong>H2H:</strong> {result.display.h2h}</div>
                  <div><strong>L5:</strong> {result.display.l5}</div>
                  <div><strong>Streak:</strong> {result.display.streak}</div>
                </div>
              ) : (
                <div className="text-red-500">No analytics found - would show N/A and 0/0</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
