import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { consistentPropsService } from '@/services/consistent-props-service';

export const AlternativeLinesDebug: React.FC = () => {
  const [props, setProps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');

  const loadProps = async () => {
    setLoading(true);
    try {
      const allProps = await consistentPropsService.getConsistentPlayerProps('nfl');
      setProps(allProps);
      console.log('🔍 Debug - Loaded props:', allProps);
    } catch (error) {
      console.error('Error loading props:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group props by player to find those with multiple prop types
  const groupedByPlayer = props.reduce((acc, prop) => {
    if (!acc[prop.playerName]) {
      acc[prop.playerName] = [];
    }
    acc[prop.playerName].push(prop);
    return acc;
  }, {} as Record<string, any[]>);

  // Find players with multiple prop types
  const playersWithMultipleProps = Object.entries(groupedByPlayer)
    .filter(([_, playerProps]) => {
      const propTypes = new Set(playerProps.map(p => p.propType));
      return propTypes.size > 1;
    })
    .map(([playerName, playerProps]) => ({
      playerName,
      propTypes: [...new Set(playerProps.map(p => p.propType))],
      totalProps: playerProps.length,
      props: playerProps
    }));

  // Find alternative lines for selected player
  const selectedPlayerProps = selectedPlayer ? groupedByPlayer[selectedPlayer] || [] : [];
  const alternativeLines = selectedPlayerProps.reduce((acc, prop) => {
    const key = prop.propType;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(prop);
    return acc;
  }, {} as Record<string, any[]>);

  const alternativeLinesForPlayer = Object.entries(alternativeLines)
    .filter(([_, props]) => props.length > 1)
    .map(([propType, props]) => ({
      propType,
      lines: props.map(p => ({ line: p.line, overOdds: p.overOdds, underOdds: p.underOdds }))
    }));

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Alternative Lines Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={loadProps} disabled={loading}>
            {loading ? 'Loading...' : 'Load Props'}
          </Button>
          
          {props.length > 0 && (
            <div className="mt-4">
              <p>Total props loaded: {props.length}</p>
              <p>Players with multiple prop types: {playersWithMultipleProps.length}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {playersWithMultipleProps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Players with Multiple Prop Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {playersWithMultipleProps.slice(0, 10).map(({ playerName, propTypes, totalProps }) => (
                <div key={playerName} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-medium">{playerName}</span>
                    <span className="text-sm text-gray-500 ml-2">({totalProps} props)</span>
                  </div>
                  <div className="flex gap-1">
                    {propTypes.map(propType => (
                      <Badge key={propType} variant="outline">{propType}</Badge>
                    ))}
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => setSelectedPlayer(playerName)}
                    variant="outline"
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPlayer && (
        <Card>
          <CardHeader>
            <CardTitle>Alternative Lines for {selectedPlayer}</CardTitle>
          </CardHeader>
          <CardContent>
            {alternativeLinesForPlayer.length > 0 ? (
              <div className="space-y-4">
                {alternativeLinesForPlayer.map(({ propType, lines }) => (
                  <div key={propType} className="border rounded p-4">
                    <h4 className="font-medium mb-2">{propType}</h4>
                    <div className="space-y-1">
                      {lines.map((line, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span>Line: {line.line}</span>
                          <span>Over: {line.overOdds}</span>
                          <span>Under: {line.underOdds}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No alternative lines found for {selectedPlayer}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
