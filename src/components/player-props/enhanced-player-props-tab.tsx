import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MatchupBadge, MatchupBadgeGradient } from '../analytics/MatchupBadge';
import { PropsTable } from '../analytics/PropsTable';
import { analyticsApi } from '../../services/analytics-api-service';
import { PropMatchup } from '../../lib/analytics';
import { LEAGUE_DISPLAY_NAMES, getActiveLeagues } from '../../lib/leagues';

interface EnhancedPlayerPropsTabProps {
  className?: string;
}

export function EnhancedPlayerPropsTab({ className = "" }: EnhancedPlayerPropsTabProps) {
  const [selectedLeague, setSelectedLeague] = useState("nfl");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPropType, setSelectedPropType] = useState<string>("");
  const [props, setProps] = useState<PropMatchup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'analytics'>('analytics');
  const [showOnlyHighGrade, setShowOnlyHighGrade] = useState(false);

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
        
        // Filter for high-grade props if enabled
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

  const topProps = props.slice(0, 5);
  const excellentProps = props.filter(p => p.matchup_grade >= 80);
  const goodProps = props.filter(p => p.matchup_grade >= 60 && p.matchup_grade < 80);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with League Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Enhanced Player Props</span>
            <Badge variant="secondary">
              {LEAGUE_DISPLAY_NAMES[selectedLeague] || selectedLeague.toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>
            AI-powered prop analysis with matchup grades and analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedLeague} onValueChange={setSelectedLeague}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select League" />
              </SelectTrigger>
              <SelectContent>
                {activeLeagues.map(league => (
                  <SelectItem key={league} value={league}>
                    {LEAGUE_DISPLAY_NAMES[league] || league.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="text"
              value={selectedPropType}
              onChange={(e) => setSelectedPropType(e.target.value)}
              placeholder="Prop type (optional)"
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
            />

            <Button 
              onClick={fetchProps}
              disabled={loading}
              variant="outline"
            >
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {props.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">{props.length}</div>
              <div className="text-sm text-gray-600">Total Props</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{excellentProps.length}</div>
              <div className="text-sm text-gray-600">Excellent (80+)</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{goodProps.length}</div>
              <div className="text-sm text-gray-600">Good (60-79)</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">
                {props.length > 0 ? (props.reduce((sum, p) => sum + p.matchup_grade, 0) / props.length).toFixed(1) : "0"}
              </div>
              <div className="text-sm text-gray-600">Avg Grade</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics">Analytics View</TabsTrigger>
          <TabsTrigger value="cards">Card View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        {/* Analytics View */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Matchups</CardTitle>
              <CardDescription>
                Best prop opportunities ranked by matchup grade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProps.map((prop, index) => (
                  <div key={prop.prop_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">#{index + 1}</span>
                        <span className="text-sm text-gray-600">{prop.player_id}</span>
                        <Badge variant="outline" className="text-xs">
                          {prop.prop_type}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        Line: {prop.line} | Rolling 10: {prop.rolling_10?.toFixed(1) || 'N/A'} | Season Avg: {prop.season_avg?.toFixed(1) || 'N/A'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <div>Off: {prop.offense_rank}</div>
                        <div>Def: {prop.defense_rank}</div>
                      </div>
                      <MatchupBadgeGradient grade={prop.matchup_grade} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Card View */}
        <TabsContent value="cards" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlyHighGrade}
                onChange={(e) => setShowOnlyHighGrade(e.target.checked)}
                className="rounded"
              />
              Show only high-grade props (70+)
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {props.slice(0, 12).map((prop) => (
              <Card key={prop.prop_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{prop.player_id}</h3>
                      <p className="text-sm text-gray-600 capitalize">{prop.prop_type}</p>
                    </div>
                    <MatchupBadge grade={prop.matchup_grade} size="sm" />
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Line:</span>
                      <span className="font-medium">{prop.line}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rolling 10:</span>
                      <span>{prop.rolling_10?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Season Avg:</span>
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

        {/* Table View */}
        <TabsContent value="table">
          <PropsTable 
            rows={props} 
            league={selectedLeague}
            compact={false}
          />
        </TabsContent>
      </Tabs>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analytics data...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && props.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">
              No props found for {LEAGUE_DISPLAY_NAMES[selectedLeague]} on {selectedDate}.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Try selecting a different date or league.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
