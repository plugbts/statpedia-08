import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyticsCalculator } from '@/services/analytics-calculator';
import { historicalDataService } from '@/services/historical-data-service';
import { supabase } from '@/integrations/supabase/client';

export function AnalyticsDebug() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testDatabaseConnection = async () => {
    setLoading(true);
    try {
      console.log("🔍 Testing database connection...");
      
      // Test 1: Check if PlayerGameLogs table exists and has data
      const { data: countData, error: countError } = await supabase
        .from('PlayerGameLogs')
        .select('*', { count: 'exact', head: true });
      
      console.log("📊 PlayerGameLogs count:", countData, countError);
      
      // Test 2: Get sample data
      const { data: sampleData, error: sampleError } = await supabase
        .from('PlayerGameLogs')
        .select('*')
        .limit(5);
      
      console.log("📋 Sample data:", sampleData, sampleError);
      
      // Test 3: Test RPC functions directly
      console.log("🔄 Testing RPC functions...");
      
      const { data: hitRateData, error: hitRateError } = await supabase
        .rpc('calculate_hit_rate', {
          p_player_id: 'mahomes-patrick',
          p_prop_type: 'Passing Yards',
          p_line: 275.0,
          p_direction: 'over',
          p_games_limit: 5
        });
      
      console.log("🎯 Hit rate result:", hitRateData, hitRateError);
      
      const { data: streakData, error: streakError } = await supabase
        .rpc('calculate_streak', {
          p_player_id: 'mahomes-patrick',
          p_prop_type: 'Passing Yards',
          p_line: 275.0,
          p_direction: 'over'
        });
      
      console.log("🔥 Streak result:", streakData, streakError);
      
      const { data: rankData, error: rankError } = await supabase
        .rpc('get_defensive_rank', {
          p_team: 'KC',
          p_opponent: 'JAX',
          p_prop_type: 'Passing Yards',
          p_position: 'QB',
          p_season: 2025
        });
      
      console.log("🛡️ Defensive rank result:", rankData, rankError);
      
      setResults({
        tableCount: countData,
        sampleData,
        hitRate: hitRateData,
        streak: streakData,
        rank: rankData,
        errors: {
          countError,
          sampleError,
          hitRateError,
          streakError,
          rankError
        }
      });
      
    } catch (error) {
      console.error("❌ Database test failed:", error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testAnalyticsCalculator = async () => {
    setLoading(true);
    try {
      console.log("🧮 Testing analytics calculator...");
      
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
      setResults({ analytics });
      
    } catch (error) {
      console.error("❌ Analytics calculator test failed:", error);
      setResults({ error: error.message, stack: error.stack });
    } finally {
      setLoading(false);
    }
  };

  const testHistoricalDataService = async () => {
    setLoading(true);
    try {
      console.log("📚 Testing historical data service...");
      
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
        hitRate,
        streak,
        rank
      });
      
    } catch (error) {
      console.error("❌ Historical data service test failed:", error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Analytics Debug Tool</h1>
      
      <div className="space-x-2">
        <Button onClick={testDatabaseConnection} disabled={loading}>
          {loading ? 'Testing...' : 'Test Database Connection'}
        </Button>
        <Button onClick={testAnalyticsCalculator} disabled={loading}>
          {loading ? 'Testing...' : 'Test Analytics Calculator'}
        </Button>
        <Button onClick={testHistoricalDataService} disabled={loading}>
          {loading ? 'Testing...' : 'Test Historical Data Service'}
        </Button>
      </div>
      
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
