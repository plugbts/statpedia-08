import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Direct API test component to bypass any caching issues
export const TestAPIDebug: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const testAPI = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      console.log('🧪 DIRECT API TEST STARTING...');
      
      const API_KEY = '883b10f6c52a48b38b3b5cafa94d2189';
      const BASE_URL = 'https://api.sportsdata.io/v3';
      const season = '2024';
      const week = '18';
      const endpoint = `${BASE_URL}/nfl/odds/json/PlayerPropsByWeek/${season}/${week}?key=${API_KEY}`;
      
      console.log('📡 Calling API directly:', endpoint);
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      console.log('📊 Direct API response:', data.length, 'items');
      
      // Test first 5 items
      const sampleData = data.slice(0, 5).map((item: any) => ({
        player: item.Name,
        description: item.Description,
        line: item.OverUnder,
        overOdds: item.OverPayout,
        underOdds: item.UnderPayout,
        team: item.Team,
        opponent: item.Opponent
      }));
      
      setTestResults(sampleData);
      
      // Check for problematic data
      const problematic = data.filter((item: any) => 
        item.OverUnder === 6.5 && item.Description.toLowerCase().includes('touchdown')
      );
      
      if (problematic.length > 0) {
        console.error('❌ PROBLEMATIC DATA FOUND:', problematic);
      } else {
        console.log('✅ No problematic data found');
      }
      
    } catch (error) {
      console.error('❌ Direct API test failed:', error);
      setTestResults([{ error: error.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Direct API Test Debug</CardTitle>
        <Button onClick={testAPI} disabled={isLoading}>
          {isLoading ? 'Testing...' : 'Test API Directly'}
        </Button>
      </CardHeader>
      <CardContent>
        {testResults.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Results:</h3>
            {testResults.map((result, index) => (
              <div key={index} className="p-4 border rounded-lg">
                {result.error ? (
                  <div className="text-red-500">Error: {result.error}</div>
                ) : (
                  <div>
                    <div className="font-semibold">{result.player}</div>
                    <div>{result.description}: {result.line}</div>
                    <div>Odds: {result.overOdds}/{result.underOdds}</div>
                    <div>{result.team} vs {result.opponent}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
