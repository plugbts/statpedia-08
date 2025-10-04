// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, TrendingUp, Target, Clock, Trophy, BarChart3, Filter, RefreshCw } from 'lucide-react';
import { unifiedSportsAPI } from '@/services/unified-sports-api';
import { PlayerProp } from '@/types/sports';
import { logAPI, logState, logSuccess, logError, logWarning } from '@/utils/console-logger';

interface AnalyticsTabProps {
  userRole: string;
  userSubscription: any;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ userRole, userSubscription }) => {
  const [selectedSport, setSelectedSport] = useState<string>('nfl');
  const [selectedSportsbook, setSelectedSportsbook] = useState<string>('all');
  const [pastProps, setPastProps] = useState<PlayerProp[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const sports = [
    { value: 'nfl', label: 'NFL', icon: '🏈' },
    { value: 'mlb', label: 'MLB', icon: '⚾' },
    { value: 'nba', label: 'NBA', icon: '🏀' },
    { value: 'nhl', label: 'NHL', icon: '🏒' },
  ];

  const sportsbooks = [
    { value: 'all', label: 'All Sportsbooks' },
    { value: 'fanduel', label: 'FanDuel' },
    { value: 'draftkings', label: 'DraftKings' },
    { value: 'betmgm', label: 'BetMGM' },
    { value: 'caesars', label: 'Caesars' },
    { value: 'pointsbet', label: 'PointsBet' },
  ];

  const loadPastProps = async () => {
    if (!selectedSport) {
      logWarning('AnalyticsTab', 'No sport selected');
      return;
    }

    logState('AnalyticsTab', `Loading past props for ${selectedSport}`);
    setIsLoading(true);

    try {
      const sportsbookFilter = selectedSportsbook === 'all' ? undefined : selectedSportsbook;
      logAPI('AnalyticsTab', `Calling unifiedSportsAPI.getPastPlayerProps(${selectedSport})${sportsbookFilter ? ` with sportsbook: ${sportsbookFilter}` : ''}`);
      
      const props = await unifiedSportsAPI.getPastPlayerProps(selectedSport, undefined, undefined, sportsbookFilter);
      logAPI('AnalyticsTab', `Analytics API returned ${props?.length || 0} past props`);
      
      setPastProps(props || []);
      setLastUpdated(new Date());
      logSuccess('AnalyticsTab', `Loaded ${props?.length || 0} past player props for analytics`);
    } catch (error) {
      logError('AnalyticsTab', `Failed to load past props:`, error);
      setPastProps([]);
    } finally {
      setIsLoading(false);
      logState('AnalyticsTab', `Finished loading past props for ${selectedSport}`);
    }
  };

  useEffect(() => {
    if (selectedSport && selectedSportsbook !== '') {
      loadPastProps();
    }
  }, [selectedSport, selectedSportsbook]);

  const handleRefresh = () => {
    loadPastProps();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '';
    }
  };

  const getOutcomeColor = (prop: PlayerProp) => {
    // This would need actual game results to determine outcome
    // For now, return neutral color
    return 'bg-muted/50';
  };

  const getOutcomeText = (prop: PlayerProp) => {
    // This would need actual game results to determine outcome
    // For now, return placeholder text
    return 'Game Completed';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground">
              Historical performance analysis and past game insights
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {lastUpdated && (
              <>
                <Clock className="w-4 h-4" />
                <span>Updated {lastUpdated.toLocaleTimeString()}</span>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sport</label>
                <Select value={selectedSport} onValueChange={setSelectedSport}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sports.map((sport) => (
                      <SelectItem key={sport.value} value={sport.value}>
                        <span className="flex items-center gap-2">
                          <span>{sport.icon}</span>
                          {sport.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Sportsbook</label>
                <Select value={selectedSportsbook} onValueChange={setSelectedSportsbook}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sportsbooks.map((book) => (
                      <SelectItem key={book.value} value={book.value}>
                        {book.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Content */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            {/* Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Props</p>
                      <p className="text-2xl font-bold">{pastProps.length}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                      <p className="text-2xl font-bold">--%</p>
                    </div>
                    <Trophy className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Confidence</p>
                      <p className="text-2xl font-bold">--%</p>
                    </div>
                    <Target className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">ROI</p>
                      <p className="text-2xl font-bold">--%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Past Games */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Past Games
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading past games...</span>
                  </div>
                ) : pastProps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No past games found for {selectedSport.toUpperCase()}</p>
                    <p className="text-sm">Try selecting a different sport or sportsbook</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pastProps.slice(0, 10).map((prop) => (
                      <div
                        key={prop.id}
                        className={`p-4 rounded-lg border ${getOutcomeColor(prop)} transition-all hover:bg-muted/30`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {prop.playerName.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{prop.playerName}</p>
                              <p className="text-sm text-muted-foreground">
                                {prop.teamAbbr} vs {prop.opponentAbbr}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{prop.propType}</Badge>
                              <Badge variant="secondary">{prop.line}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(prop.gameDate)} at {formatTime(prop.gameTime)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getOutcomeText(prop)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Trending Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Trend analysis coming soon</p>
                  <p className="text-sm">Advanced analytics and pattern recognition</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Complete History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Historical data view coming soon</p>
                  <p className="text-sm">Complete game history and detailed analysis</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
