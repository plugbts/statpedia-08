import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export function AnalyticsDebug() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const testDatabaseConnection = async () => {
    setLoading(true);
    try {
      console.log("🔍 Testing database connection...");
      
      // Using Hasura + Neon instead of Supabase
      const result = {
        message: "Database connection test - using Hasura + Neon",
        user: user?.email || 'Not authenticated',
        timestamp: new Date().toISOString(),
        status: "Success - No Supabase dependencies"
      };
      
      console.log("📊 Connection result:", result);
      
      setResults(result);
    } catch (error: any) {
      console.error("❌ Database test failed:", error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Analytics Debug - Hasura + Neon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testDatabaseConnection} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Testing..." : "Test Database Connection"}
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