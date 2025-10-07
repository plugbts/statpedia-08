import React, { useState, useEffect } from 'react';
import { analyticsCalculator } from '@/services/analytics-calculator';
import { historicalDataService } from '@/services/historical-data-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TestResult {
  player: string;
  propType: string;
  line: number;
  direction: string;
  result: any;
  error?: string;
}

export function AnalyticsTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const testCases = [
    {
      playerId: 'mahomes-patrick',
      playerName: 'Patrick Mahomes',
      team: 'KC',
      opponent: 'JAX',
      propType: 'Passing Yards',
      line: 275,
      direction: 'over' as const,
      sport: 'nfl'
    },
    {
      playerId: 'allen-josh',
      playerName: 'Josh Allen',
      team: 'BUF',
      opponent: 'MIA',
      propType: 'Rushing Yards',
      line: 40,
      direction: 'over' as const,
      sport: 'nfl'
    },
    {
      playerId: 'mccaffrey-christian',
      playerName: 'Christian McCaffrey',
      team: 'SF',
      opponent: 'LAR',
      propType: 'Rushing Yards',
      line: 100,
      direction: 'over' as const,
      sport: 'nfl'
    }
  ];

  const runTests = async () => {
    setIsLoading(true);
    const results: TestResult[] = [];

    for (const testCase of testCases) {
      try {
        console.log(`Testing ${testCase.playerName} ${testCase.propType} ${testCase.line} ${testCase.direction}`);
        
        const result = await analyticsCalculator.calculateAnalytics(
          testCase.playerId,
          testCase.playerName,
          testCase.team,
          testCase.opponent,
          testCase.propType,
          testCase.line,
          testCase.direction,
          testCase.sport
        );

        results.push({
          player: testCase.playerName,
          propType: testCase.propType,
          line: testCase.line,
          direction: testCase.direction,
          result
        });
      } catch (error) {
        results.push({
          player: testCase.playerName,
          propType: testCase.propType,
          line: testCase.line,
          direction: testCase.direction,
          result: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const testDatabaseFunctions = async () => {
    setIsLoading(true);
    const results: TestResult[] = [];

    try {
      // Test hit rate function
      const hitRate = await historicalDataService.getHitRate('mahomes-patrick', 'Passing Yards', 275, 'over');
      results.push({
        player: 'Patrick Mahomes',
        propType: 'Passing Yards',
        line: 275,
        direction: 'over',
        result: { type: 'hit_rate', data: hitRate }
      });

      // Test streak function
      const streak = await historicalDataService.getStreak('mahomes-patrick', 'Passing Yards', 275, 'over');
      results.push({
        player: 'Patrick Mahomes',
        propType: 'Passing Yards',
        line: 275,
        direction: 'over',
        result: { type: 'streak', data: streak }
      });

      // Test defensive rank function
      const defensiveRank = await historicalDataService.getDefensiveRank('KC', 'JAX', 'Passing Yards', 'QB', 2025);
      results.push({
        player: 'Patrick Mahomes',
        propType: 'Passing Yards',
        line: 275,
        direction: 'over',
        result: { type: 'defensive_rank', data: defensiveRank }
      });

      // Test chart data function
      const chartData = await historicalDataService.getPlayerChartData('mahomes-patrick', 'Passing Yards', 5);
      results.push({
        player: 'Patrick Mahomes',
        propType: 'Passing Yards',
        line: 275,
        direction: 'over',
        result: { type: 'chart_data', data: chartData }
      });

    } catch (error) {
      results.push({
        player: 'Database Functions',
        propType: 'Test',
        line: 0,
        direction: 'over',
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Analytics Debug Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={runTests} disabled={isLoading}>
              {isLoading ? 'Testing...' : 'Test Analytics Calculator'}
            </Button>
            <Button onClick={testDatabaseFunctions} disabled={isLoading} variant="outline">
              {isLoading ? 'Testing...' : 'Test Database Functions'}
            </Button>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Test Results:</h3>
              {testResults.map((result, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-2">
                    <div className="font-semibold">
                      {result.player} - {result.propType} {result.line} {result.direction}
                    </div>
                    {result.error ? (
                      <div className="text-red-500">
                        Error: {result.error}
                      </div>
                    ) : (
                      <div className="text-sm">
                        <pre className="bg-gray-100 p-2 rounded overflow-auto">
                          {JSON.stringify(result.result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
