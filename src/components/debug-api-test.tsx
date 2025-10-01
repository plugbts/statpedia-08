import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { sportsDataIOAPIFixed } from '@/services/sportsdataio-api-fixed';

export const DebugAPITest: React.FC = () => {
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testMLBAPI = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      console.log('🧪 [DebugAPITest] Starting MLB API test...');
      const props = await sportsDataIOAPIFixed.getPlayerProps('mlb');
      console.log('🧪 [DebugAPITest] MLB API test result:', props);
      
      setTestResult({
        success: true,
        count: props.length,
        sample: props.slice(0, 3),
        error: null
      });
    } catch (error) {
      console.error('🧪 [DebugAPITest] MLB API test failed:', error);
      setTestResult({
        success: false,
        count: 0,
        sample: null,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto border-purple-500">
      <CardHeader>
        <CardTitle className="text-purple-500">🧪 Debug: MLB API Test</CardTitle>
        <Button onClick={testMLBAPI} disabled={isLoading}>
          {isLoading ? 'Testing...' : 'Test MLB API'}
        </Button>
      </CardHeader>
      <CardContent>
        {testResult && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              <h3 className="font-semibold">
                {testResult.success ? '✅ Success' : '❌ Failed'}
              </h3>
              <div className="text-sm mt-2">
                <div>Count: {testResult.count}</div>
                {testResult.error && <div>Error: {testResult.error}</div>}
              </div>
            </div>
            
            {testResult.sample && testResult.sample.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Sample Data:</h4>
                {testResult.sample.map((prop: any, index: number) => (
                  <div key={index} className="p-3 border rounded text-sm">
                    <div className="font-medium">{prop.playerName} ({prop.team})</div>
                    <div>{prop.propType}: {prop.line}</div>
                    <div>Odds: {prop.overOdds}/{prop.underOdds}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
