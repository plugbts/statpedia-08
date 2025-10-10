import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MatchupBadge, MatchupBadgeCompact } from '../analytics/MatchupBadge';
import { PropsTable } from '../analytics/PropsTable';
import { analyticsApi } from '../../services/analytics-api-service';
import { PropMatchup } from '../../lib/analytics';
import { LEAGUE_DISPLAY_NAMES, getActiveLeagues } from '../../lib/leagues';

interface PlayerPropsTabProps {
  className?: string;
}

export function PlayerPropsTab({ className = "" }: PlayerPropsTabProps) {
  const [selectedLeague, setSelectedLeague] = useState("nfl");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPropType, setSelectedPropType] = useState<string>("");
  const [props, setProps] = useState<PropMatchup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'analytics' | 'cards' | 'table'>('analytics');
  const [showOnlyHighGrade, setShowOnlyHighGrade] = useState(false);
  const [compactMode, setCompactMode] = useState(true);

  const activeLeagues = getActiveLeagues();

  const fetchProps = async () => {
    if (!selectedLeague || !selectedDate) return;

    setLoading(true);
    setError(null);

    try {
      const result = await analyticsApi.getProps({
        league: selectedLeague,
        date: selectedDate,
        propType: selectedPropType || undefined
      });

      if (result.ok) {
        let filteredProps = result.data;
        
        if (showOnlyHighGrade) {
          filteredProps = filteredProps.filter(prop => prop.matchup_grade >= 70);
        }
        
        setProps(filteredProps);
      } else {
        setError(result.error || "Failed to fetch props");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProps();
  }, [selectedLeague, selectedDate, selectedPropType, showOnlyHighGrade]);

  const topProps = props.slice(0, 3);
  const excellentProps = props.filter(p => p.matchup_grade >= 80);
  const goodProps = props.filter(p => p.matchup_grade >= 60 && p.matchup_grade < 80);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Ultra-Compact Header */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900">
                Player Props
              </h2>
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                {LEAGUE_DISPLAY_NAMES[selectedLeague] || selectedLeague.toUpperCase()}
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-1.5 flex-1">
              <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                <SelectTrigger className="w-20 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeLeagues.map(league => (
                    <SelectItem key={league} value={league} className="text-xs">
                      {LEAGUE_DISPLAY_NAMES[league] || league.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-28 h-7 px-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <input
                type="text"
                value={selectedPropType}
                onChange={(e) => setSelectedPropType(e.target.value)}
                placeholder="Prop"
                className="w-24 h-7 px-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <Button 
                onClick={fetchProps}
                disabled={loading}
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
              >
                {loading ? "..." : "Go"}
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <Switch
                  checked={showOnlyHighGrade}
                  onCheckedChange={setShowOnlyHighGrade}
                  className="scale-75"
                />
                High
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <Switch
                  checked={compactMode}
                  onCheckedChange={setCompactMode}
                  className="scale-75"
                />
                Compact
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mini Stats */}
      {props.length > 0 && !compactMode && (
        <div className="grid grid-cols-4 gap-1.5">
          <div className="bg-white rounded p-2 border border-gray-200">
            <div className="text-sm font-bold text-gray-900">{props.length}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="bg-white rounded p-2 border border-gray-200">
            <div className="text-sm font-bold text-green-600">{excellentProps.length}</div>
            <div className="text-xs text-gray-600">Excellent</div>
          </div>
          <div className="bg-white rounded p-2 border border-gray-200">
            <div className="text-sm font-bold text-blue-600">{goodProps.length}</div>
            <div className="text-xs text-gray-600">Good</div>
          </div>
          <div className="bg-white rounded p-2 border border-gray-200">
            <div className="text-sm font-bold text-gray-900">
              {props.length > 0 ? (props.reduce((sum, p) => sum + p.matchup_grade, 0) / props.length).toFixed(1) : "0"}
            </div>
            <div className="text-xs text-gray-600">Avg</div>
          </div>
        </div>
      )}

      {/* View Mode Tabs - Ultra Compact */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
        <TabsList className="grid w-full grid-cols-3 h-7">
          <TabsTrigger value="analytics" className="text-xs py-1">Top</TabsTrigger>
          <TabsTrigger value="cards" className="text-xs py-1">Cards</TabsTrigger>
          <TabsTrigger value="table" className="text-xs py-1">Table</TabsTrigger>
        </TabsList>

        {/* Analytics View - Ultra Compact */}
        <TabsContent value="analytics" className="space-y-1">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-2">
              <div className="space-y-1">
                {topProps.map((prop, index) => (
                  <div key={prop.prop_id} className="flex items-center justify-between p-1.5 border rounded text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-medium text-gray-900">#{index + 1}</span>
                        <span className="text-gray-600 truncate">{prop.player_id}</span>
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {prop.prop_type}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        {prop.line} | R10: {prop.rolling_10?.toFixed(1) || 'N/A'} | Avg: {prop.season_avg?.toFixed(1) || 'N/A'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      <div className="text-right text-xs">
                        <div>O:{prop.offense_rank}</div>
                        <div>D:{prop.defense_rank}</div>
                      </div>
                      <MatchupBadgeCompact grade={prop.matchup_grade} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Card View - Ultra Compact */}
        <TabsContent value="cards" className="space-y-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {props.slice(0, 9).map((prop) => (
              <Card key={prop.prop_id} className="hover:shadow-sm transition-shadow border border-gray-200">
                <CardContent className="p-2">
                  <div className="flex items-start justify-between mb-1">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 text-xs truncate">{prop.player_id}</h3>
                      <p className="text-xs text-gray-600 capitalize truncate">{prop.prop_type}</p>
                    </div>
                    <MatchupBadgeCompact grade={prop.matchup_grade} className="ml-1" />
                  </div>
                  
                  <div className="space-y-0.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Line:</span>
                      <span className="font-medium">{prop.line}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">R10:</span>
                      <span>{prop.rolling_10?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg:</span>
                      <span>{prop.season_avg?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ranks:</span>
                      <span>{prop.offense_rank}/{prop.defense_rank}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Table View - Ultra Compact */}
        <TabsContent value="table">
          <div className="scrollbar-thin">
            <PropsTable 
              rows={props} 
              league={selectedLeague}
              compact={true}
              className="text-xs"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Error State - Ultra Compact */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-2">
            <div className="flex items-center gap-1 text-red-800 text-xs">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State - Ultra Compact */}
      {loading && (
        <Card className="border-0">
          <CardContent className="p-3 text-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-1 text-gray-600 text-xs">Loading...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State - Ultra Compact */}
      {!loading && !error && props.length === 0 && (
        <Card className="border-0">
          <CardContent className="p-4 text-center">
            <p className="text-gray-500 text-xs">
              No props found for {LEAGUE_DISPLAY_NAMES[selectedLeague]} on {selectedDate}.
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Try selecting a different date or league.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}