import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { X, BarChart3, TrendingUp, ArrowUp, ArrowDown, Star, DollarSign, CalendarDays, History, LineChart, Activity, Target, Zap, RefreshCw } from 'lucide-react';
import { sportsDataIOAPI } from '@/services/sportsdataio-api';

interface PlayerAnalysisOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  playerProp: {
    id: string;
    playerId: number;
    playerName: string;
    team: string;
    opponent: string;
    propType: string;
    line: number;
    overOdds: number;
    underOdds: number;
    gameId: string;
    sport: string;
    gameDate: string;
    gameTime: string;
    confidence?: number;
    expectedValue?: number;
    recentForm?: string;
    last5Games?: number[];
    seasonStats?: {
      average: number;
      median: number;
      gamesPlayed: number;
      hitRate: number;
    };
    aiPrediction?: {
      recommended: 'over' | 'under';
      confidence: number;
      reasoning: string;
      factors: string[];
    };
  };
}

interface HistoricalData {
  last5: number[];
  last10: number[];
  last20: number[];
  h2h: number[];
  season: number[];
}

export const PlayerAnalysisOverlay: React.FC<PlayerAnalysisOverlayProps> = ({ 
  isOpen, 
  onClose, 
  playerProp 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPropType, setSelectedPropType] = useState(playerProp.propType);
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [graphData, setGraphData] = useState<number[]>([]);
  const [graphType, setGraphType] = useState<'last5' | 'last10' | 'last20' | 'h2h' | 'season'>('last5');

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(false);
      loadHistoricalData();
    } else {
      setIsAnimating(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (historicalData) {
      setGraphData(historicalData[graphType] || []);
    }
  }, [historicalData, graphType]);

  const loadHistoricalData = async () => {
    setIsLoadingData(true);
    try {
      // Simulate loading historical data - in real implementation, this would come from the API
      const mockData: HistoricalData = {
        last5: generateMockData(5, playerProp.line),
        last10: generateMockData(10, playerProp.line),
        last20: generateMockData(20, playerProp.line),
        h2h: generateMockData(8, playerProp.line),
        season: generateMockData(playerProp.seasonStats?.gamesPlayed || 15, playerProp.line),
      };
      setHistoricalData(mockData);
    } catch (error) {
      console.error('Failed to load historical data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const generateMockData = (count: number, baseLine: number): number[] => {
    return Array.from({ length: count }, (_, i) => {
      const variation = (Math.random() - 0.5) * baseLine * 0.4;
      return Math.max(0, baseLine + variation);
    });
  };

  if (!isOpen && isAnimating) return null;

  const {
    playerName,
    team,
    opponent,
    propType,
    line,
    overOdds,
    underOdds,
    confidence,
    expectedValue,
    recentForm,
    last5Games = [],
    seasonStats,
    aiPrediction
  } = playerProp;

  // Format numbers to be compact
  const formatNumber = (value: number, decimals: number = 1): string => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(decimals) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(decimals) + 'K';
    } else if (value >= 100) {
      return value.toFixed(0);
    } else if (value >= 10) {
      return value.toFixed(1);
    } else {
      return value.toFixed(decimals);
    }
  };

  const formatOdds = (odds: number): string => {
    if (odds > 0) {
      return `+${odds}`;
    }
    return odds.toString();
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-500';
    if (conf >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getEVColor = (ev: number) => {
    if (ev > 0.05) return 'text-green-500';
    if (ev > 0) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getFormColor = (form: string) => {
    switch (form.toLowerCase()) {
      case 'hot': return 'text-green-500 bg-green-500/10';
      case 'cold': return 'text-red-500 bg-red-500/10';
      default: return 'text-yellow-500 bg-yellow-500/10';
    }
  };

  const getHitRateColor = (rate: number) => {
    if (rate >= 0.7) return 'text-green-500';
    if (rate >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const calculatePayout = (odds: number) => {
    if (odds > 0) {
      return `$${(odds / 100 * 100).toFixed(2)}`; // For a $100 bet
    } else {
      return `$${(100 / Math.abs(odds) * 100).toFixed(2)}`; // For a $100 bet
    }
  };

  // Animated Graph Component
  const AnimatedGraph = ({ data, line }: { data: number[]; line: number }) => {
    const [animatedData, setAnimatedData] = useState<number[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
      if (data.length === 0) return;
      
      setIsAnimating(true);
      setAnimatedData([]);
      
      const animate = () => {
        data.forEach((value, index) => {
          setTimeout(() => {
            setAnimatedData(prev => [...prev, value]);
          }, index * 200);
        });
        
        setTimeout(() => setIsAnimating(false), data.length * 200);
      };
      
      animate();
    }, [data]);

    if (animatedData.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    const maxValue = Math.max(...data, line);
    const minValue = Math.min(...data, line);
    const range = maxValue - minValue;
    const padding = range * 0.1;

    return (
      <div className="h-48 relative">
        <svg className="w-full h-full" viewBox="0 0 400 200">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <line
              key={i}
              x1="0"
              y1={200 * ratio}
              x2="400"
              y2={200 * ratio}
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.1"
            />
          ))}
          
          {/* Data line */}
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={animatedData.map((value, index) => {
              const x = (index / (data.length - 1)) * 400;
              const y = 200 - ((value - minValue + padding) / (range + padding * 2)) * 200;
              return `${x},${y}`;
            }).join(' ')}
            className="text-blue-500"
          />
          
          {/* Data points */}
          {animatedData.map((value, index) => {
            const x = (index / (data.length - 1)) * 400;
            const y = 200 - ((value - minValue + padding) / (range + padding * 2)) * 200;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill="currentColor"
                className="text-blue-500"
              />
            );
          })}
          
          {/* Line reference */}
          <line
            x1="0"
            y1={200 - ((line - minValue + padding) / (range + padding * 2)) * 200}
            x2="400"
            y2={200 - ((line - minValue + padding) / (range + padding * 2)) * 200}
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="5,5"
            className="text-red-500"
          />
        </svg>
        
        {/* Legend */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground">
          <span>Performance</span>
          <span>Line: {formatNumber(line)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className={cn(
          "w-full max-w-6xl max-h-[90vh] bg-background rounded-2xl shadow-2xl border border-border/50 transform transition-all duration-300 ease-out",
          isAnimating ? "scale-95 opacity-0" : "scale-100 opacity-100"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 rounded-t-2xl">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{playerName}</h2>
                <p className="text-muted-foreground">{team} vs {opponent}</p>
                <div className="mt-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                  <p className="text-lg font-bold text-primary">
                    {selectedPropType} Over {formatNumber(line)}
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full px-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="odds">Odds</TabsTrigger>
              <TabsTrigger value="graph">Live Graph</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <ScrollArea className="p-6 h-[calc(90vh-160px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span>AI Prediction</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {aiPrediction?.recommended === 'over' ? (
                      <ArrowUp className="w-6 h-6 text-green-500" />
                    ) : (
                      <ArrowDown className="w-6 h-6 text-red-500" />
                    )}
                    <div>
                      <p className="text-lg font-semibold">
                        {aiPrediction?.recommended?.toUpperCase()} {selectedPropType} {formatNumber(line)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {aiPrediction?.reasoning}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={aiPrediction?.recommended === 'over' ? 'default' : 'destructive'}
                    className="text-lg px-3 py-1"
                  >
                    {Math.round((aiPrediction?.confidence || confidence) * 100)}%
                  </Badge>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Key Factors:</h4>
                  <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">
                    {aiPrediction?.factors?.map((factor, index) => (
                      <li key={index}>{factor}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <span>Performance Snapshot</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Recent Form</p>
                  <Badge className={cn("text-base px-3 py-1", getFormColor(recentForm))}>
                    {recentForm}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Season Hit Rate</p>
                  <p className={cn("text-lg font-bold", getHitRateColor(seasonStats?.hitRate || 0))}>
                    {formatPercentage(seasonStats?.hitRate || 0)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <Progress value={confidence * 100} className="h-2" indicatorColor={getConfidenceColor(confidence)} />
                  <p className={cn("text-sm font-medium", getConfidenceColor(confidence))}>
                    {formatPercentage(confidence)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Expected Value</p>
                  <Progress value={(expectedValue + 0.1) * 500} className="h-2" indicatorColor={getEVColor(expectedValue)} />
                  <p className={cn("text-sm font-medium", getEVColor(expectedValue))}>
                    {formatPercentage(expectedValue)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Season Averages</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Average ({selectedPropType})</p>
                  <p className="text-xl font-bold">{formatNumber(seasonStats?.average || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Median ({selectedPropType})</p>
                  <p className="text-xl font-bold">{formatNumber(seasonStats?.median || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Games Played</p>
                  <p className="text-xl font-bold">{seasonStats?.gamesPlayed || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hit Rate</p>
                  <p className={cn("text-xl font-bold", getHitRateColor(seasonStats?.hitRate || 0))}>
                    {formatPercentage(seasonStats?.hitRate || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Matchup Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Detailed analysis of {playerName}'s performance against {opponent} and similar opponents,
                  including historical data, defensive matchups, and recent trends.
                </p>
                {/* Placeholder for actual graph/chart */}
                <div className="mt-4 h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                  <LineChart className="w-12 h-12" />
                  <p className="ml-2">Performance Graph Coming Soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Last 5 Games ({selectedPropType})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-around items-center flex-wrap gap-4">
                  {last5Games.map((game: number, index: number) => (
                    <div key={index} className="text-center">
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold",
                        game > line ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" :
                        game < line ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400" :
                        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      )}>
                        {formatNumber(game)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Game {index + 1}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Odds Tab */}
          <TabsContent value="odds" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Betting Odds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Over {selectedPropType} {formatNumber(line)}</span>
                      <Badge variant="outline">Over</Badge>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {formatOdds(overOdds)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Payout: {calculatePayout(overOdds)}
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Under {selectedPropType} {formatNumber(line)}</span>
                      <Badge variant="outline">Under</Badge>
                    </div>
                    <p className="text-2xl font-bold text-red-600">
                      {formatOdds(underOdds)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Payout: {calculatePayout(underOdds)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Graph Tab */}
          <TabsContent value="graph" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  <span>Live Performance Graph</span>
                </CardTitle>
                <CardDescription>
                  Interactive graph showing {playerName}'s historical performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Graph Type Selector */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">Time Period:</label>
                  <Select value={graphType} onValueChange={(value: any) => setGraphType(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last5">Last 5</SelectItem>
                      <SelectItem value="last10">Last 10</SelectItem>
                      <SelectItem value="last20">Last 20</SelectItem>
                      <SelectItem value="h2h">H2H</SelectItem>
                      <SelectItem value="season">Season</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <label className="text-sm font-medium">Prop Type:</label>
                  <Select value={selectedPropType} onValueChange={setSelectedPropType}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Passing Yards">Passing Yards</SelectItem>
                      <SelectItem value="Rushing Yards">Rushing Yards</SelectItem>
                      <SelectItem value="Receiving Yards">Receiving Yards</SelectItem>
                      <SelectItem value="Passing TDs">Passing TDs</SelectItem>
                      <SelectItem value="Rushing TDs">Rushing TDs</SelectItem>
                      <SelectItem value="Receptions">Receptions</SelectItem>
                      <SelectItem value="Points">Points</SelectItem>
                      <SelectItem value="Rebounds">Rebounds</SelectItem>
                      <SelectItem value="Assists">Assists</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Animated Graph */}
                <div className="border rounded-lg p-4">
                  <AnimatedGraph data={graphData} line={line} />
                </div>

                {/* Graph Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Average</p>
                    <p className="text-lg font-bold">
                      {formatNumber(graphData.reduce((a, b) => a + b, 0) / graphData.length)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">High</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatNumber(Math.max(...graphData))}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Low</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatNumber(Math.min(...graphData))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>
        </ScrollArea>
      </div>
    </div>
  );
};