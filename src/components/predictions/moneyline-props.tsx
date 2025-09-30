import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  Target, 
  BarChart3, 
  Brain, 
  Zap,
  Calendar as CalendarIcon,
  Users,
  Activity,
  AlertCircle,
  Play,
  RotateCcw,
  DollarSign,
  Shield,
  Clock,
  MapPin,
  RefreshCw,
  CheckCircle,
  XCircle,
  Star
} from 'lucide-react';
import { SimulationAnalysis } from './simulation-analysis';
import { gamesService, GamePrediction, RealGame } from '@/services/games-service';
import { cn } from '@/lib/utils';

interface MoneylineGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  date: string;
  homeOdds: number;
  awayOdds: number;
  drawOdds?: number;
  homeForm: number[];
  awayForm: number[];
  h2hData: {
    homeWins: number;
    awayWins: number;
    draws: number;
  };
  injuries: {
    home: string[];
    away: string[];
  };
  restDays: {
    home: number;
    away: number;
  };
  weather: string;
  venue: string;
  status: 'upcoming' | 'live' | 'finished';
  homeScore?: number;
  awayScore?: number;
}

interface MoneylinePropsProps {
  userSubscription: string;
  userRole?: string;
  selectedSport?: string;
}

export const MoneylineProps: React.FC<MoneylinePropsProps> = ({ 
  userSubscription, 
  userRole = 'user',
  selectedSport = 'nfl'
}) => {
  const [predictions, setPredictions] = useState<GamePrediction[]>([]);
  const [selectedGame, setSelectedGame] = useState<RealGame | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('games');
  const [localSelectedSport, setLocalSelectedSport] = useState(selectedSport);

  const isSubscribed = userRole === 'owner' || userSubscription !== 'free';

  useEffect(() => {
    loadPredictions();
  }, [selectedSport]);

  useEffect(() => {
    setLocalSelectedSport(selectedSport);
  }, [selectedSport]);

  const loadPredictions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const gamePredictions = await gamesService.getCurrentWeekPredictions(selectedSport);
      setPredictions(gamePredictions);
    } catch (err) {
      setError('Failed to load moneyline predictions');
      console.error('Error loading predictions:', err);
    } finally {
      setIsLoading(false);
    }
  };


  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : `${odds}`;
  };

  const getOddsColor = (odds: number) => {
    if (odds > 0) return 'text-green-500';
    if (odds < -150) return 'text-red-500';
    return 'text-yellow-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'text-red-500 bg-red-500/10';
      case 'upcoming': return 'text-blue-500 bg-blue-500/10';
      case 'finished': return 'text-gray-500 bg-gray-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getSportIcon = (sport: string) => {
    const icons = {
      NBA: '🏀',
      NFL: '🏈',
      MLB: '⚾',
      NHL: '🏒',
      SOCCER: '⚽'
    };
    return icons[sport as keyof typeof icons] || '🎯';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading moneyline games...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadGames}
            className="ml-2"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Moneyline Predictions</h1>
          <p className="text-muted-foreground">
            AI-powered final score predictions with thousands of simulations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Sport:</span>
            <Select value={selectedSport} onValueChange={setSelectedSport}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nba">NBA</SelectItem>
                <SelectItem value="nfl">NFL</SelectItem>
                <SelectItem value="mlb">MLB</SelectItem>
                <SelectItem value="nhl">NHL</SelectItem>
                <SelectItem value="soccer">Soccer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadPredictions}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <Badge variant="outline" className="gap-1">
              <Brain className="w-3 h-3" />
              AI Analysis
            </Badge>
            <Badge variant="outline" className="gap-1">
              <BarChart3 className="w-3 h-3" />
              10K Simulations
            </Badge>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="analysis" disabled={!selectedGame}>
            Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="games" className="space-y-4">
          {predictions.length === 0 && !isLoading ? (
            <Card className="p-8 text-center">
              <CardContent>
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Games Available</h3>
                <p className="text-muted-foreground mb-4">
                  No {selectedSport.toUpperCase()} games found for the current week.
                </p>
                <Button onClick={loadPredictions} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {predictions.map((prediction) => {
              const game = prediction.game;
              const pred = prediction.prediction;
              
              return (
                <Card 
                  key={game.id} 
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
                    selectedGame?.id === game.id && "ring-2 ring-primary",
                    !isSubscribed && "blur-sm"
                  )}
                  onClick={() => setSelectedGame(game)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getSportIcon(game.sport)}</span>
                        <Badge className={getStatusColor(game.status)}>
                          {game.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Week {game.week}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {new Date(game.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {game.time}
                        </div>
                      </div>
                    </div>
                    <CardTitle className="text-lg">
                      {game.homeTeam} vs {game.awayTeam}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      {game.venue} • {game.weather}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Prediction Score */}
                    <div className="text-center space-y-2 p-3 bg-muted/30 rounded-lg">
                      <div className="text-sm text-muted-foreground">AI Predicted Score</div>
                      <div className="text-2xl font-bold text-primary">
                        {pred.homeScore} - {pred.awayScore}
                      </div>
                      <div className="flex items-center justify-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{game.homeTeam}</span>
                          <span className="text-muted-foreground">({(pred.homeWinProbability * 100).toFixed(0)}%)</span>
                        </div>
                        <span className="text-muted-foreground">vs</span>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{game.awayTeam}</span>
                          <span className="text-muted-foreground">({(pred.awayWinProbability * 100).toFixed(0)}%)</span>
                        </div>
                      </div>
                    </div>

                    {/* Odds */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center space-y-1">
                        <div className="text-sm text-muted-foreground">{game.homeTeam}</div>
                        <div className={cn("text-lg font-bold", getOddsColor(game.homeOdds))}>
                          {formatOdds(game.homeOdds)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Record: {game.homeRecord}
                        </div>
                      </div>
                      <div className="text-center space-y-1">
                        <div className="text-sm text-muted-foreground">{game.awayTeam}</div>
                        <div className={cn("text-lg font-bold", getOddsColor(game.awayOdds))}>
                          {formatOdds(game.awayOdds)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Record: {game.awayRecord}
                        </div>
                      </div>
                    </div>

                    {/* AI Recommendation */}
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        {pred.recommendedBet !== 'none' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium">
                          {pred.recommendedBet !== 'none' 
                            ? `Recommended: ${pred.recommendedBet.toUpperCase()}`
                            : 'No Recommended Bet'
                          }
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        EV: {pred.expectedValue > 0 ? '+' : ''}{pred.expectedValue.toFixed(1)}% • 
                        Confidence: {(pred.confidence * 100).toFixed(0)}%
                      </div>
                    </div>

                    {/* Cross-Reference Analysis */}
                    {pred.crossReference && (
                      <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">AI Model Consensus</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star 
                                key={i} 
                                className={cn(
                                  "w-3 h-3",
                                  i < pred.crossReference!.valueRating 
                                    ? "text-yellow-400 fill-current" 
                                    : "text-muted-foreground"
                                )} 
                              />
                            ))}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pred.crossReference.consensus.toUpperCase()} • 
                          {pred.crossReference.agreement.toFixed(0)}% Agreement • 
                          {pred.crossReference.riskLevel.toUpperCase()} Risk
                        </div>
                        <div className="text-xs text-foreground">
                          {pred.crossReference.reasoning}
                        </div>
                      </div>
                    )}

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-2 text-xs text-center">
                      <div>
                        <div className="text-muted-foreground">H2H</div>
                        <div className="font-medium">
                          {game.h2hData.homeWins}-{game.h2hData.awayWins}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Rest</div>
                        <div className="font-medium">
                          {game.restDays.home}-{game.restDays.away}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Injuries</div>
                        <div className="font-medium">
                          {game.injuries.home.length}-{game.injuries.away.length}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button 
                      className="w-full" 
                      variant={selectedGame?.id === game.id ? "default" : "outline"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGame(game);
                        setActiveTab('analysis');
                      }}
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      View Detailed Analysis
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          {selectedGame ? (
            (() => {
              const prediction = predictions.find(p => p.game.id === selectedGame.id);
              if (!prediction) {
                return (
                  <Card>
                    <CardContent className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Prediction Not Found</h3>
                      <p className="text-muted-foreground">
                        Unable to find prediction data for the selected game
                      </p>
                    </CardContent>
                  </Card>
                );
              }
              
              return (
                <SimulationAnalysis
                  homeTeam={selectedGame.homeTeam}
                  awayTeam={selectedGame.awayTeam}
                  sport={selectedGame.sport.toLowerCase()}
                  homeForm={selectedGame.homeForm}
                  awayForm={selectedGame.awayForm}
                  h2hData={selectedGame.h2hData}
                  injuries={selectedGame.injuries}
                  restDays={selectedGame.restDays}
                  weather={selectedGame.weather}
                  venue={selectedGame.venue}
                  homeOdds={selectedGame.homeOdds}
                  awayOdds={selectedGame.awayOdds}
                  drawOdds={selectedGame.drawOdds}
                />
              );
            })()
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Game</h3>
                <p className="text-muted-foreground">
                  Choose a game from the list to view detailed AI analysis and predictions
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Subscription Overlay for Free Users */}
      {!isSubscribed && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle>Premium Feature</CardTitle>
              <CardDescription>
                Subscribe to Pro to access AI-powered moneyline predictions with thousands of simulations
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Brain className="w-4 h-4 text-primary" />
                  <span>10,000+ Monte Carlo simulations</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span>Historical backtesting analysis</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-primary" />
                  <span>Final score predictions</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span>Expected value calculations</span>
                </div>
              </div>
              <Button className="w-full">
                <DollarSign className="w-4 h-4 mr-2" />
                Subscribe to Pro
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
