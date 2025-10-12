import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { hasuraPlayerPropsAPI } from '@/services/hasura-player-props-api';

interface HasuraPropsTestProps {
  onBack?: () => void;
}

export const HasuraPropsTest: React.FC<HasuraPropsTestProps> = ({ onBack }) => {
  const [props, setProps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propTypes, setPropTypes] = useState<any[]>([]);

  const fetchProps = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🧪 Testing Hasura Player Props API...');
      
      // Test both prop types and player props
      const [propsData, typesData] = await Promise.all([
        hasuraPlayerPropsAPI.getPlayerProps('nba'),
        hasuraPlayerPropsAPI.getPropTypes('nba')
      ]);
      
      setProps(propsData);
      setPropTypes(typesData);
      
      console.log('✅ Props fetched:', propsData);
      console.log('✅ Prop types fetched:', typesData);
    } catch (err) {
      console.error('❌ Error fetching props:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testHealthCheck = async () => {
    try {
      const isHealthy = await hasuraPlayerPropsAPI.healthCheck();
      console.log('🏥 Health check result:', isHealthy);
      alert(`Health check: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    } catch (err) {
      console.error('❌ Health check failed:', err);
      alert('❌ Health check failed');
    }
  };

  useEffect(() => {
    fetchProps();
  }, []);

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              🧪 Hasura Player Props Test
            </CardTitle>
            {onBack && (
              <Button onClick={onBack} variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchProps} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh Props'}
            </Button>
            <Button onClick={testHealthCheck} variant="outline">
              Health Check
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
              ❌ Error: {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">📊 Available Prop Types ({propTypes.length})</h3>
              <div className="space-y-2">
                {propTypes.map((type) => (
                  <div key={type.id} className="p-2 border rounded">
                    <Badge variant="secondary">{type.name}</Badge>
                    <span className="ml-2 text-sm text-gray-600">
                      {type.category} • {type.sport}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">🎯 Player Props ({props.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {props.map((prop) => (
                  <div key={prop.id} className="p-2 border rounded">
                    <div className="font-medium">{prop.playerName}</div>
                    <div className="text-sm text-gray-600">
                      {prop.propType} {prop.line} ({prop.overOdds}/{prop.underOdds})
                    </div>
                    <div className="text-xs text-gray-500">
                      {prop.team} vs {prop.opponent}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {props.length === 0 && !loading && (
            <div className="text-center text-gray-500 mt-4">
              No props found. Make sure the database has sample data.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
