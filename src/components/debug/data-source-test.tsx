import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const DataSourceTest: React.FC = () => {
  const [rawData, setRawData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testDataSource = async () => {
    setLoading(true);
    try {
      // Test the direct API endpoint
      const response = await fetch('/api/nfl/player-props');
      const data = await response.json();
      setRawData(data);
      console.log('🔍 Raw API Response:', data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Analyze the data structure
  const analyzeData = (data: any) => {
    if (!data || !Array.isArray(data)) {
      return { error: 'Invalid data structure' };
    }

    // Group by player name
    const playerGroups = data.reduce((acc, prop) => {
      if (!acc[prop.playerName]) {
        acc[prop.playerName] = [];
      }
      acc[prop.playerName].push(prop);
      return acc;
    }, {} as Record<string, any[]>);

    // Find players with multiple prop types
    const playersWithMultipleProps = Object.entries(playerGroups)
      .filter(([_, props]) => {
        const propTypes = new Set(props.map(p => p.propType));
        return propTypes.size > 1;
      })
      .map(([playerName, props]) => ({
        playerName,
        propTypes: [...new Set(props.map(p => p.propType))],
        totalProps: props.length,
        props: props
      }));

    // Find alternative lines (same player, same prop type, different lines)
    const alternativeLines = Object.entries(playerGroups)
      .flatMap(([_, props]) => {
        const groupedByPropType = props.reduce((acc, prop) => {
          if (!acc[prop.propType]) {
            acc[prop.propType] = [];
          }
          acc[prop.propType].push(prop);
          return acc;
        }, {} as Record<string, any[]>);

        return Object.entries(groupedByPropType)
          .filter(([_, propGroup]) => propGroup.length > 1)
          .map(([propType, propGroup]) => ({
            playerName: props[0].playerName,
            propType,
            lines: propGroup.map(p => ({ line: p.line, overOdds: p.overOdds, underOdds: p.underOdds }))
          }));
      });

    return {
      totalProps: data.length,
      uniquePlayers: Object.keys(playerGroups).length,
      playersWithMultipleProps: playersWithMultipleProps.length,
      alternativeLines: alternativeLines.length,
      samplePlayer: playersWithMultipleProps[0],
      sampleAlternativeLines: alternativeLines[0]
    };
  };

  const analysis = rawData ? analyzeData(rawData) : null;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Source Test</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={testDataSource} disabled={loading}>
            {loading ? 'Loading...' : 'Test Data Source'}
          </Button>
          
          {analysis && (
            <div className="mt-4 space-y-2">
              <p><strong>Total Props:</strong> {analysis.totalProps}</p>
              <p><strong>Unique Players:</strong> {analysis.uniquePlayers}</p>
              <p><strong>Players with Multiple Prop Types:</strong> {analysis.playersWithMultipleProps}</p>
              <p><strong>Alternative Lines Found:</strong> {analysis.alternativeLines}</p>
              
              {analysis.samplePlayer && (
                <div className="mt-4 p-4 border rounded">
                  <h4 className="font-medium">Sample Player with Multiple Props:</h4>
                  <p><strong>Player:</strong> {analysis.samplePlayer.playerName}</p>
                  <p><strong>Prop Types:</strong> {analysis.samplePlayer.propTypes.join(', ')}</p>
                  <p><strong>Total Props:</strong> {analysis.samplePlayer.totalProps}</p>
                </div>
              )}
              
              {analysis.sampleAlternativeLines && (
                <div className="mt-4 p-4 border rounded">
                  <h4 className="font-medium">Sample Alternative Lines:</h4>
                  <p><strong>Player:</strong> {analysis.sampleAlternativeLines.playerName}</p>
                  <p><strong>Prop Type:</strong> {analysis.sampleAlternativeLines.propType}</p>
                  <div className="mt-2">
                    {analysis.sampleAlternativeLines.lines.map((line, index) => (
                      <div key={index} className="text-sm">
                        Line: {line.line}, Over: {line.overOdds}, Under: {line.underOdds}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
