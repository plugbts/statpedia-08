// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  Brain,
  Zap,
  Activity,
  Clock,
  MapPin
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { gamesService, GamePrediction } from '@/services/games-service';
import { simulationService } from '@/services/simulation-service';
import { cn } from '@/lib/utils';

interface GameAnalysis {
  game: GamePrediction;
  mostLikelyToWin: {
    team: string;
    probability: number;
    factors: string[];
  };
  mostLikelyToLose: {
    team: string;
    probability: number;
    factors: string[];
  };
  confidence: number;
  keyFactors: {
    form: number;
    h2h: number;
    rest: number;
    injuries: number;
    venue: number;
    weather: number;
  };
}

export const MostLikely: React.FC = () => {
  const [analyses, setAnalyses] = useState<GameAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'win' | 'lose'>('win');
  const [selectedSport, setSelectedSport] = useState('mlb');
  const { toast } = useToast();

  useEffect(() => {
    loadAnalyses();
  }, [selectedSport]);

  const loadAnalyses = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const gamePredictions = await gamesService.getCurrentWeekPredictions(selectedSport);
      const gameAnalyses = await Promise.all(
        gamePredictions.map(async (prediction) => {
          const analysis = await analyzeGame(prediction);
          return analysis;
        })
      );
      
      setAnalyses(gameAnalyses);
    } catch (err) {
      setError('Failed to load current week analyses');
      console.error('Error loading analyses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeGame = async (prediction: GamePrediction): Promise<GameAnalysis> => {
    const { game, prediction: pred } = prediction;
    
    // Determine most likely to win and lose based on probabilities
    const homeWinProb = pred.homeWinProbability;
    const awayWinProb = pred.awayWinProbability;
    
    const mostLikelyToWin = homeWinProb > awayWinProb ? {
      team: game.homeTeam,
      probability: homeWinProb,
      factors: getWinningFactors(pred.factors, true)
    } : {
      team: game.awayTeam,
      probability: awayWinProb,
      factors: getWinningFactors(pred.factors, false)
    };

    const mostLikelyToLose = homeWinProb < awayWinProb ? {
      team: game.homeTeam,
      probability: 1 - homeWinProb,
      factors: getLosingFactors(pred.factors, true)
    } : {
      team: game.awayTeam,
      probability: 1 - awayWinProb,
      factors: getLosingFactors(pred.factors, false)
    };

    return {
      game: prediction,
      mostLikelyToWin,
      mostLikelyToLose,
      confidence: pred.confidence,
      keyFactors: pred.factors
    };
  };

  const getWinningFactors = (factors: any, isHome: boolean): string[] => {
    const factorList: string[] = [];
    
    if (factors.form > 0.1) factorList.push('Strong Recent Form');
    if (factors.h2h > 0.1) factorList.push('Head-to-Head Advantage');
    if (factors.rest > 0.1) factorList.push('Better Rest Days');
    if (factors.injuries < -0.1) factorList.push('Fewer Injuries');
    if (isHome && factors.venue > 0.1) factorList.push('Home Field Advantage');
    if (factors.weather > 0.1) factorList.push('Favorable Weather');
    
    return factorList.length > 0 ? factorList : ['Balanced Matchup'];
  };

  const getLosingFactors = (factors: any, isHome: boolean): string[] => {
    const factorList: string[] = [];
    
    if (factors.form < -0.1) factorList.push('Poor Recent Form');
    if (factors.h2h < -0.1) factorList.push('Head-to-Head Disadvantage');
    if (factors.rest < -0.1) factorList.push('Less Rest');
    if (factors.injuries > 0.1) factorList.push('More Injuries');
    if (isHome && factors.venue < -0.1) factorList.push('Away Game');
    if (factors.weather < -0.1) factorList.push('Unfavorable Weather');
    
    return factorList.length > 0 ? factorList : ['Tough Matchup'];
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'text-red-500 bg-red-500/10';
      case 'upcoming': return 'text-blue-500 bg-blue-500/10';
      case 'finished': return 'text-gray-500 bg-gray-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const formatProbability = (prob: number) => {
    return `${(prob * 100).toFixed(1)}%`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Analyzing current week games...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadAnalyses}
              className="ml-2"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const winAnalyses = analyses.filter(a => a.mostLikelyToWin.probability > 0.5);
  const loseAnalyses = analyses.filter(a => a.mostLikelyToLose.probability > 0.5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Most Likely Analysis</h1>
          <p className="text-muted-foreground">
            AI-powered analysis of current week games - who's most likely to win or lose
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
              onClick={loadAnalyses}
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
              Current Week
            </Badge>
          </div>
        </div>
      </div>

      {/* Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'win' | 'lose')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="win" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Most Likely to Win ({winAnalyses.length})
          </TabsTrigger>
          <TabsTrigger value="lose" className="gap-2">
            <TrendingDown className="w-4 h-4" />
            Most Likely to Lose ({loseAnalyses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="win" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {winAnalyses.map((analysis) => {
              const { game, mostLikelyToWin, confidence, keyFactors } = analysis;
              const pred = game.prediction;
              
              return (
                <Card key={game.game.id} className="hover:shadow-lg transition-all duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getSportIcon(game.game.sport)}</span>
                        <Badge className={getStatusColor(game.game.status)}>
                          {game.game.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Week {game.game.week}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(game.game.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {game.game.time}
                        </div>
                      </div>
                    </div>
                    <CardTitle className="text-lg">
                      {game.game.homeTeam} vs {game.game.awayTeam}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      {game.game.venue} • {game.game.weather}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Most Likely to Win */}
                    <div className="text-center space-y-2 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">
                          Most Likely to Win
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {mostLikelyToWin.team}
                      </div>
                      <div className="text-lg font-semibold text-green-500">
                        {formatProbability(mostLikelyToWin.probability)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Confidence: <span className={cn("font-medium", getConfidenceColor(confidence))}>
                          {formatProbability(confidence)}
                        </span>
                      </div>
                    </div>

                    {/* Predicted Score */}
                    <div className="text-center space-y-2 p-3 bg-muted/30 rounded-lg">
                      <div className="text-sm text-muted-foreground">AI Predicted Score</div>
                      <div className="text-xl font-bold text-primary">
                        {pred.homeScore} - {pred.awayScore}
                      </div>
                    </div>

                    {/* Key Factors */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Winning Factors:</div>
                      <div className="flex flex-wrap gap-1">
                        {mostLikelyToWin.factors.map((factor, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Factor Breakdown */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Factor Analysis:</div>
                      <div className="space-y-1">
                        {Object.entries(keyFactors).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={Math.abs(value) * 100} 
                                className="w-16 h-2"
                              />
                              <span className={cn(
                                "font-mono w-8 text-right",
                                value > 0 ? "text-green-500" : value < 0 ? "text-red-500" : "text-muted-foreground"
                              )}>
                                {value > 0 ? '+' : ''}{(value * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Team Records */}
                    <div className="grid grid-cols-2 gap-4 text-center text-sm">
                      <div>
                        <div className="text-muted-foreground">{game.game.homeTeam}</div>
                        <div className="font-medium">{game.game.homeRecord}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">{game.game.awayTeam}</div>
                        <div className="font-medium">{game.game.awayRecord}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="lose" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {loseAnalyses.map((analysis) => {
              const { game, mostLikelyToLose, confidence, keyFactors } = analysis;
              const pred = game.prediction;
              
              return (
                <Card key={game.game.id} className="hover:shadow-lg transition-all duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getSportIcon(game.game.sport)}</span>
                        <Badge className={getStatusColor(game.game.status)}>
                          {game.game.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Week {game.game.week}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(game.game.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {game.game.time}
                        </div>
                      </div>
                    </div>
                    <CardTitle className="text-lg">
                      {game.game.homeTeam} vs {game.game.awayTeam}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      {game.game.venue} • {game.game.weather}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Most Likely to Lose */}
                    <div className="text-center space-y-2 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                      <div className="flex items-center justify-center gap-2">
                        <XCircle className="w-5 h-5 text-red-500" />
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">
                          Most Likely to Lose
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {mostLikelyToLose.team}
                      </div>
                      <div className="text-lg font-semibold text-red-500">
                        {formatProbability(mostLikelyToLose.probability)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Confidence: <span className={cn("font-medium", getConfidenceColor(confidence))}>
                          {formatProbability(confidence)}
                        </span>
                      </div>
                    </div>

                    {/* Predicted Score */}
                    <div className="text-center space-y-2 p-3 bg-muted/30 rounded-lg">
                      <div className="text-sm text-muted-foreground">AI Predicted Score</div>
                      <div className="text-xl font-bold text-primary">
                        {pred.homeScore} - {pred.awayScore}
                      </div>
                    </div>

                    {/* Key Factors */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Losing Factors:</div>
                      <div className="flex flex-wrap gap-1">
                        {mostLikelyToLose.factors.map((factor, index) => (
                          <Badge key={index} variant="destructive" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Factor Breakdown */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Factor Analysis:</div>
                      <div className="space-y-1">
                        {Object.entries(keyFactors).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={Math.abs(value) * 100} 
                                className="w-16 h-2"
                              />
                              <span className={cn(
                                "font-mono w-8 text-right",
                                value > 0 ? "text-green-500" : value < 0 ? "text-red-500" : "text-muted-foreground"
                              )}>
                                {value > 0 ? '+' : ''}{(value * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Team Records */}
                    <div className="grid grid-cols-2 gap-4 text-center text-sm">
                      <div>
                        <div className="text-muted-foreground">{game.game.homeTeam}</div>
                        <div className="font-medium">{game.game.homeRecord}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">{game.game.awayTeam}</div>
                        <div className="font-medium">{game.game.awayRecord}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-foreground">Games Analyzed</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {analyses.length}
          </p>
          <p className="text-sm text-muted-foreground">
            Current week {selectedSport.toUpperCase()} games
          </p>
        </Card>

        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-foreground">High Confidence</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {analyses.filter(a => a.confidence > 0.8).length}
          </p>
          <p className="text-sm text-muted-foreground">
            Games with &gt;80% confidence
          </p>
        </Card>

        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-foreground">AI Analysis</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {analyses.length > 0 ? (analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length * 100).toFixed(0) : 0}%
          </p>
          <p className="text-sm text-muted-foreground">
            Average confidence level
          </p>
        </Card>
      </div>
    </div>
  );
};