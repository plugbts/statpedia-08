import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyticsCalculator } from '@/services/analytics-calculator';
import { historicalDataService } from '@/services/historical-data-service';
import { supabase } from '@/integrations/supabase/client';

export function AnalyticsDebugTest() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAnalyticsCalculator = async () => {
    setLoading(true);
    try {
      console.log("🧮 Testing analytics calculator with real data...");
      
      const analytics = await analyticsCalculator.calculateAnalytics(
        'mahomes-patrick',
        'Patrick Mahomes',
        'KC',
        'JAX',
        'Passing Yards',
        275.0,
        'over',
        'nfl'
      );
      
      console.log("📈 Analytics result:", analytics);
      setResults({ type: 'analytics', data: analytics });
      
    } catch (error) {
      console.error("❌ Analytics calculator test failed:", error);
      setResults({ type: 'error', data: error.message, stack: error.stack });
    } finally {
      setLoading(false);
    }
  };

  const testHistoricalDataService = async () => {
    setLoading(true);
    try {
      console.log("📚 Testing historical data service methods...");
      
      const hitRate = await historicalDataService.getHitRate(
        'mahomes-patrick',
        'Passing Yards',
        275.0,
        'over',
        5
      );
      
      console.log("🎯 Hit rate from service:", hitRate);
      
      const streak = await historicalDataService.getStreak(
        'mahomes-patrick',
        'Passing Yards',
        275.0,
        'over'
      );
      
      console.log("🔥 Streak from service:", streak);
      
      const rank = await historicalDataService.getDefensiveRank(
        'KC',
        'JAX',
        'Passing Yards',
        'QB',
        2025
      );
      
      console.log("🛡️ Defensive rank from service:", rank);
      
      setResults({
        type: 'historical_service',
        data: { hitRate, streak, rank }
      });
      
    } catch (error) {
      console.error("❌ Historical data service test failed:", error);
      setResults({ type: 'error', data: error.message, stack: error.stack });
    } finally {
      setLoading(false);
    }
  };

  const testDatabaseDirect = async () => {
    setLoading(true);
    try {
      console.log("🗄️ Testing database directly...");
      
      // Test hit rate RPC
      const { data: hitRate, error: hitRateError } = await supabase
        .rpc('calculate_hit_rate', {
          p_player_id: 'mahomes-patrick',
          p_prop_type: 'Passing Yards',
          p_line: 275.0,
          p_direction: 'over',
          p_games_limit: 5
        });
      
      // Test streak RPC
      const { data: streak, error: streakError } = await supabase
        .rpc('calculate_streak', {
          p_player_id: 'mahomes-patrick',
          p_prop_type: 'Passing Yards',
          p_line: 275.0,
          p_direction: 'over'
        });
      
      // Test defensive rank RPC
      const { data: rank, error: rankError } = await supabase
        .rpc('get_defensive_rank', {
          p_team: 'KC',
          p_opponent: 'JAX',
          p_prop_type: 'Passing Yards',
          p_position: 'QB',
          p_season: 2025
        });
      
      console.log("📊 Database results:", { hitRate, streak, rank });
      console.log("❌ Database errors:", { hitRateError, streakError, rankError });
      
      setResults({
        type: 'database_direct',
        data: { hitRate, streak, rank },
        errors: { hitRateError, streakError, rankError }
      });
      
    } catch (error) {
      console.error("❌ Database test failed:", error);
      setResults({ type: 'error', data: error.message, stack: error.stack });
    } finally {
      setLoading(false);
    }
  };

  const testNormalization = () => {
    console.log("🔄 Testing normalization functions...");
    
    // Test normalization
    const testCases = [
      { input: 'Kansas City Chiefs', expected: 'KC' },
      { input: 'KC', expected: 'KC' },
      { input: 'Jacksonville Jaguars', expected: 'JAX' },
      { input: 'JAX', expected: 'JAX' },
      { input: 'Passing Yards', expected: 'Passing Yards' },
      { input: 'QB', expected: 'QB' }
    ];
    
    const results = testCases.map(test => {
      // We'll need to import the normalize functions
      const result = { input: test.input, expected: test.expected, actual: 'N/A' };
      console.log(`Testing: ${test.input} -> Expected: ${test.expected}`);
      return result;
    });
    
    setResults({ type: 'normalization', data: results });
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Analytics Debug Test</h1>
      
      <div className="grid grid-cols-2 gap-4">
        <Button onClick={testAnalyticsCalculator} disabled={loading}>
          {loading ? 'Testing...' : 'Test Analytics Calculator'}
        </Button>
        <Button onClick={testHistoricalDataService} disabled={loading}>
          {loading ? 'Testing...' : 'Test Historical Data Service'}
        </Button>
        <Button onClick={testDatabaseDirect} disabled={loading}>
          {loading ? 'Testing...' : 'Test Database Direct'}
        </Button>
        <Button onClick={testNormalization} disabled={loading}>
          {loading ? 'Testing...' : 'Test Normalization'}
        </Button>
      </div>
      
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results - {results.type}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
