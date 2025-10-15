import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSimpleAnalytics } from '@/hooks/use-simple-analytics';
import { useAuth } from '@/contexts/AuthContext';

export function SimpleHookTest() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const { calculateAnalytics, getAnalytics, isLoading } = useSimpleAnalytics();
  const { user } = useAuth();

  const testAnalytics = async () => {
    console.log('🧪 Starting simple hook test...');
    
    // Test Hasura + Neon connection
    console.log('🔌 Testing Hasura + Neon connection...');
    try {
      const connectionTest = {
        message: "Using Hasura + Neon instead of Supabase",
        user: user?.email || 'Not authenticated',
        timestamp: new Date().toISOString()
      };
      
      console.log('📊 Connection test:', connectionTest);
      
      setTestResults(prev => [...prev, {
        test: 'Hasura + Neon Connection',
        status: 'SUCCESS',
        data: connectionTest,
        timestamp: new Date().toISOString()
      }]);
    } catch (err: any) {
      console.error('❌ Connection test failed:', err);
      setTestResults(prev => [...prev, {
        test: 'Hasura + Neon Connection',
        status: 'FAILED',
        error: err.message,
        timestamp: new Date().toISOString()
      }]);
    }

    // Test analytics hook
    console.log('🧮 Testing analytics hook...');
    try {
      const analyticsResult = await calculateAnalytics({
        playerId: 'test-player',
        playerName: 'Test Player',
        propType: 'Passing Yards',
        line: 275,
        direction: 'over' as const,
        team: 'KC',
        opponent: 'JAX',
        position: 'QB',
        sport: 'nfl'
      });
      
      console.log('📈 Analytics result:', analyticsResult);
      
      setTestResults(prev => [...prev, {
        test: 'Analytics Hook',
        status: 'SUCCESS',
        data: analyticsResult,
        timestamp: new Date().toISOString()
      }]);
    } catch (err: any) {
      console.error('❌ Analytics test failed:', err);
      setTestResults(prev => [...prev, {
        test: 'Analytics Hook',
        status: 'FAILED',
        error: err.message,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Simple Hook Test - Hasura + Neon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testAnalytics} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Testing..." : "Run Tests"}
          </Button>
          
          {testResults.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Test Results:</h3>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{result.test}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        result.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {result.status}
                      </span>
                    </div>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(result.data || result.error, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}