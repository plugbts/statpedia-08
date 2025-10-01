import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { sportsGameOddsAPI } from '@/services/sportsgameodds-api';

// Direct API test component to bypass any caching issues - OWNER ONLY
export const TestAPIDebug: React.FC = () => {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    // Check if user is owner (you can modify this logic as needed)
    const checkOwner = () => {
      // For now, we'll check if the user is in a specific list or has a specific property
      // You can modify this to check against your actual owner system
      const ownerEmails = ['jackie@statpedia.com', 'admin@statpedia.com']; // Add your owner emails
      const currentUser = localStorage.getItem('userEmail') || '';
      return ownerEmails.includes(currentUser) || currentUser.includes('jackie');
    };
    
    setIsOwner(checkOwner());
  }, []);
  
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const testAPI = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      console.log('🧪 SPORTSGAMEODDS API TEST STARTING...');
      
      // Test all sports with the new API
      const sports = ['NFL', 'MLB', 'NBA'];
      const results: any[] = [];
      
      for (const sport of sports) {
        try {
          console.log(`📡 Testing ${sport}...`);
          
          // Test player props
          const playerProps = await sportsGameOddsAPI.getPlayerProps(sport);
          console.log(`📊 ${sport} Player Props:`, playerProps.length, 'items');
          
          if (playerProps.length > 0) {
            const sample = playerProps[0];
            results.push({
              sport,
              type: 'Player Props',
              count: playerProps.length,
              sample: {
                player: sample.playerName,
                propType: sample.propType,
                line: sample.line,
                overOdds: sample.overOdds,
                underOdds: sample.underOdds,
                team: sample.teamAbbr
              }
            });
          }
          
          // Test teams
          const teams = await sportsGameOddsAPI.getTeams(sport);
          console.log(`🏈 ${sport} Teams:`, teams.length, 'teams');
          
          // Test games
          const games = await sportsGameOddsAPI.getGames(sport);
          console.log(`🎮 ${sport} Games:`, games.length, 'games');
          
        } catch (error) {
          console.error(`❌ ${sport} test failed:`, error);
          results.push({
            sport,
            type: 'Error',
            error: error.message
          });
        }
      }
      
      // Get usage stats
      const usage = sportsGameOddsAPI.getUsageStats();
      results.push({
        sport: 'API Usage',
        type: 'Statistics',
        totalCalls: usage.totalCalls,
        callsToday: usage.callsToday,
        callsThisHour: usage.callsThisHour,
        topEndpoints: Object.entries(usage.endpointUsage)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([endpoint, count]) => ({ endpoint, count }))
      });
      
      setTestResults(results);
      console.log('✅ SPORTSGAMEODDS API TEST COMPLETE:', results);
      
    } catch (error) {
      console.error('❌ SPORTSGAMEODDS API TEST FAILED:', error);
      setTestResults([{ error: error.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">This component is only available to owners.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SportsGameOdds API Test</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={testAPI} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Testing API...' : 'Test SportsGameOdds API'}
        </Button>
        
        {testResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="font-semibold">Test Results:</h4>
            {testResults.map((result, index) => (
              <div key={index} className="p-3 border rounded">
                <pre className="text-sm overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};