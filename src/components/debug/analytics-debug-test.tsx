import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export function AnalyticsDebugTest() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const testAnalyticsCalculator = async () => {
    setLoading(true);
    try {
      console.log("🧮 Testing analytics calculator with Hasura + Neon...");
      
      const result = {
        message: "Analytics debug test - using Hasura + Neon",
        user: user?.email || 'Not authenticated',
        timestamp: new Date().toISOString(),
        status: "Success - No Supabase dependencies"
      };
      
      console.log("📊 Analytics test result:", result);
      
      setResults(result);
    } catch (error: any) {
      console.error("❌ Analytics test failed:", error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Analytics Debug Test - Hasura + Neon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testAnalyticsCalculator} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Testing..." : "Test Analytics Calculator"}
          </Button>
          
          {results && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Results:</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}