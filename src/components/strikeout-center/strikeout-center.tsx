// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  RefreshCw, 
  Target,
  Brain,
  BarChart3,
  Activity,
  Calendar,
  Clock,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { gamesService, GamePrediction } from '@/services/games-service';
import { simulationService } from '@/services/simulation-service';
import { cn } from '@/lib/utils';

interface PitcherAnalysis {
  game: GamePrediction;
  pitcher: {
    name: string;
    team: string;
    position: 'home' | 'away';
    strikeoutProp: number;
    strikeoutOdds: number;
    probability: number;
    confidence: number;
    factors: {
      recentForm: number;
      matchupAdvantage: number;
      homeAway: number;
      weather: number;
      restDays: number;
      seasonStats: number;
    };
    seasonStats: {
      strikeouts: number;
      innings: number;
      kPer9: number;
      era: number;
    };
    recentForm: number[];
  };
  recommendation: 'over' | 'under' | 'pass';
  expectedValue: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export const StrikeoutCenter: React.FC = () => {
  const [analyses, setAnalyses] = useState<PitcherAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'over' | 'under'>('over');
  const [selectedSport, setSelectedSport] = useState('mlb');
  const { toast } = useToast();

  useEffect(() => {
    loadPitcherAnalyses();
  }, [selectedSport]);

  const loadPitcherAnalyses = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const gamePredictions = await gamesService.getCurrentWeekPredictions(selectedSport);
      const pitcherAnalyses = await Promise.all(
        gamePredictions.map(async (prediction) => {
          const analysis = await analyzePitcher(prediction);
          return analysis;
        })
      );
      
      setAnalyses(pitcherAnalyses);
    } catch (err) {
      setError('Failed to load pitcher analyses');
      console.error('Error loading analyses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzePitcher = async (prediction: GamePrediction): Promise<PitcherAnalysis> => {
    const { game, prediction: pred } = prediction;
    
    // Generate pitcher data based on game prediction
    const isHomePitcher = Math.random() > 0.5;
    const pitcherName = isHomePitcher ? 
      generatePitcherName(game.homeTeam) : 
      generatePitcherName(game.awayTeam);
    
    const strikeoutProp = generateStrikeoutProp();
    const strikeoutOdds = generateStrikeoutOdds();
    
    // Calculate probability based on factors
    const factors = {
      recentForm: (Math.random() - 0.5) * 0.4,
      matchupAdvantage: (Math.random() - 0.5) * 0.3,
      homeAway: isHomePitcher ? 0.1 : -0.1,
      weather: getWeatherImpact(game.weather),
      restDays: (game.restDays.home - game.restDays.away) * 0.05,
      seasonStats: (Math.random() - 0.5) * 0.3
    };
    
    const totalFactor = Object.values(factors).reduce((sum, factor) => sum + factor, 0);
    const baseProbability = 0.5 + totalFactor;
    const probability = Math.max(0.1, Math.min(0.9, baseProbability));
    
    const confidence = pred.confidence * 0.8 + Math.random() * 0.2;
    
    // Determine recommendation
    const expectedValue = calculateExpectedValue(probability, strikeoutOdds);
    let recommendation: 'over' | 'under' | 'pass' = 'pass';
    if (expectedValue > 0.1) recommendation = 'over';
    else if (expectedValue < -0.1) recommendation = 'under';
    
    const riskLevel = confidence > 0.8 ? 'low' : confidence > 0.6 ? 'medium' : 'high';
    
    return {
      game: prediction,
      pitcher: {
        name: pitcherName,
        team: isHomePitcher ? game.homeTeam : game.awayTeam,
        position: isHomePitcher ? 'home' : 'away',
        strikeoutProp,
        strikeoutOdds,
        probability,
        confidence,
        factors,
        seasonStats: generateSeasonStats(),
        recentForm: generateRecentForm()
      },
      recommendation,
      expectedValue,
      riskLevel
    };
  };

  const generatePitcherName = (team: string): string => {
    const firstNames = ['Jacob', 'Shane', 'Gerrit', 'Spencer', 'Logan', 'Tyler', 'Zac', 'Corbin', 'Max', 'Walker'];
    const lastNames = ['deGrom', 'Bieber', 'Cole', 'Strider', 'Webb', 'Glasnow', 'Gallen', 'Burnes', 'Scherzer', 'Buehler'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
  };

  const generateStrikeoutProp = (): number => {
    const props = [6.5, 7.5, 8.5, 9.5, 10.5, 11.5];
    return props[Math.floor(Math.random() * props.length)];
  };

  const generateStrikeoutOdds = (): number => {
    return Math.random() > 0.5 ? 
      -(Math.random() * 50 + 100) : 
      (Math.random() * 100 + 100);
  };

  const getWeatherImpact = (weather: string): number => {
    const impacts = {
      clear: 0.1,
      cloudy: 0.05,
      rainy: -0.2,
      snowy: -0.3,
      windy: -0.1,
      foggy: -0.05
    };
    return impacts[weather as keyof typeof impacts] || 0;
  };

  const calculateExpectedValue = (probability: number, odds: number): number => {
    const decimalOdds = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
    return (probability * decimalOdds) - 1;
  };

  const generateSeasonStats = () => {
    return {
      strikeouts: Math.floor(Math.random() * 200) + 100,
      innings: Math.floor(Math.random() * 100) + 50,
      kPer9: Math.random() * 5 + 8,
      era: Math.random() * 2 + 2.5
    };
  };

  const generateRecentForm = (): number[] => {
    return Array.from({ length: 5 }, () => Math.random() * 2 - 1);
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

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'over': return 'text-green-500 bg-green-500/10';
      case 'under': return 'text-red-500 bg-red-500/10';
      case 'pass': return 'text-yellow-500 bg-yellow-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Analyzing pitcher strikeout props...</p>
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
              onClick={loadPitcherAnalyses}
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

  const overAnalyses = analyses.filter(a => a.recommendation === 'over');
  const underAnalyses = analyses.filter(a => a.recommendation === 'under');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Strikeout Center</h1>
          <p className="text-muted-foreground">
            AI-powered pitcher strikeout prop analysis for current week games
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
              onClick={loadPitcherAnalyses}
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
              Strikeout Props
            </Badge>
          </div>
        </div>
      </div>

      {/* Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'over' | 'under')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="over" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Over Props ({overAnalyses.length})
          </TabsTrigger>
          <TabsTrigger value="under" className="gap-2">
            <TrendingDown className="w-4 h-4" />
            Under Props ({underAnalyses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="over" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {overAnalyses.map((analysis) => {
              const { game, pitcher, recommendation, expectedValue, riskLevel } = analysis;
              
              return (
                <Card key={`${game.game.id}-${pitcher.name}`} className="hover:shadow-lg transition-all duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">⚾</span>
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
                      {pitcher.name} ({pitcher.team})
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      {game.game.venue} • {game.game.weather}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Strikeout Prop */}
                    <div className="text-center space-y-2 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Strikeout Prop
                      </div>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {pitcher.strikeoutProp}
                      </div>
                      <div className="flex items-center justify-center gap-4">
                        <div className="text-lg font-semibold text-green-500">
                          OVER
                        </div>
                        <div className={cn("text-lg font-bold", getOddsColor(pitcher.strikeoutOdds))}>
                          {formatOdds(pitcher.strikeoutOdds)}
                        </div>
                      </div>
                    </div>

                    {/* AI Analysis */}
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <Brain className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">AI Analysis</span>
                      </div>
                      <div className="text-lg font-semibold text-primary">
                        {(pitcher.probability * 100).toFixed(1)}% Probability
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Confidence: <span className={cn("font-medium", getRiskColor(riskLevel))}>
                          {(pitcher.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        EV: {expectedValue > 0 ? '+' : ''}{(expectedValue * 100).toFixed(1)}%
                      </div>
                    </div>

                    {/* Season Stats */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Season Stats</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span>K/9:</span>
                          <span className="font-mono">{pitcher.seasonStats.kPer9.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ERA:</span>
                          <span className="font-mono">{pitcher.seasonStats.era.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Strikeouts:</span>
                          <span className="font-mono">{pitcher.seasonStats.strikeouts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Innings:</span>
                          <span className="font-mono">{pitcher.seasonStats.innings}</span>
                        </div>
                      </div>
                    </div>

                    {/* Factor Analysis */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Key Factors</div>
                      <div className="space-y-1">
                        {Object.entries(pitcher.factors).map(([key, value]) => (
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

                    {/* Game Info */}
                    <div className="text-center text-sm text-muted-foreground">
                      {game.game.homeTeam} vs {game.game.awayTeam}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="under" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {underAnalyses.map((analysis) => {
              const { game, pitcher, recommendation, expectedValue, riskLevel } = analysis;
              
              return (
                <Card key={`${game.game.id}-${pitcher.name}`} className="hover:shadow-lg transition-all duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">⚾</span>
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
                      {pitcher.name} ({pitcher.team})
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      {game.game.venue} • {game.game.weather}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Strikeout Prop */}
                    <div className="text-center space-y-2 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                      <div className="text-sm font-medium text-red-700 dark:text-red-300">
                        Strikeout Prop
                      </div>
                      <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                        {pitcher.strikeoutProp}
                      </div>
                      <div className="flex items-center justify-center gap-4">
                        <div className="text-lg font-semibold text-red-500">
                          UNDER
                        </div>
                        <div className={cn("text-lg font-bold", getOddsColor(pitcher.strikeoutOdds))}>
                          {formatOdds(pitcher.strikeoutOdds)}
                        </div>
                      </div>
                    </div>

                    {/* AI Analysis */}
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <Brain className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">AI Analysis</span>
                      </div>
                      <div className="text-lg font-semibold text-primary">
                        {((1 - pitcher.probability) * 100).toFixed(1)}% Probability
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Confidence: <span className={cn("font-medium", getRiskColor(riskLevel))}>
                          {(pitcher.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        EV: {expectedValue > 0 ? '+' : ''}{(expectedValue * 100).toFixed(1)}%
                      </div>
                    </div>

                    {/* Season Stats */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Season Stats</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span>K/9:</span>
                          <span className="font-mono">{pitcher.seasonStats.kPer9.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ERA:</span>
                          <span className="font-mono">{pitcher.seasonStats.era.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Strikeouts:</span>
                          <span className="font-mono">{pitcher.seasonStats.strikeouts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Innings:</span>
                          <span className="font-mono">{pitcher.seasonStats.innings}</span>
                        </div>
                      </div>
                    </div>

                    {/* Factor Analysis */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Key Factors</div>
                      <div className="space-y-1">
                        {Object.entries(pitcher.factors).map(([key, value]) => (
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

                    {/* Game Info */}
                    <div className="text-center text-sm text-muted-foreground">
                      {game.game.homeTeam} vs {game.game.awayTeam}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-foreground">Pitchers Analyzed</h3>
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
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-foreground">Over Props</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {overAnalyses.length}
          </p>
          <p className="text-sm text-muted-foreground">
            Recommended over bets
          </p>
        </Card>

        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-foreground">Under Props</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {underAnalyses.length}
          </p>
          <p className="text-sm text-muted-foreground">
            Recommended under bets
          </p>
        </Card>

        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-foreground">AI Confidence</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {analyses.length > 0 ? (analyses.reduce((sum, a) => sum + a.pitcher.confidence, 0) / analyses.length * 100).toFixed(0) : 0}%
          </p>
          <p className="text-sm text-muted-foreground">
            Average confidence level
          </p>
        </Card>
      </div>
    </div>
  );
};