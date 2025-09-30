import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Zap, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  Activity,
  Brain,
  Database,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { simulationService, PredictionAnalysis, SimulationResult } from '@/services/simulation-service';
import { cn } from '@/lib/utils';

interface SimulationAnalysisProps {
  homeTeam: string;
  awayTeam: string;
  sport: string;
  homeForm: number[];
  awayForm: number[];
  h2hData: { homeWins: number; awayWins: number; draws: number };
  injuries: { home: string[]; away: string[] };
  restDays: { home: number; away: number };
  weather?: string;
  venue?: string;
  homeOdds: number;
  awayOdds: number;
  drawOdds?: number;
}

export const SimulationAnalysis: React.FC<SimulationAnalysisProps> = ({
  homeTeam,
  awayTeam,
  sport,
  homeForm,
  awayForm,
  h2hData,
  injuries,
  restDays,
  weather = 'clear',
  venue = 'neutral',
  homeOdds,
  awayOdds,
  drawOdds
}) => {
  const [analysis, setAnalysis] = useState<PredictionAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('prediction');

  useEffect(() => {
    runAnalysis();
  }, []);

  const runAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await simulationService.generatePredictionAnalysis(
        homeTeam,
        awayTeam,
        sport,
        homeForm,
        awayForm,
        h2hData,
        injuries,
        restDays,
        weather,
        venue,
        homeOdds,
        awayOdds,
        drawOdds
      );
      setAnalysis(result);
    } catch (err) {
      setError('Failed to run simulation analysis');
      console.error('Simulation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-500 bg-green-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'high': return 'text-red-500 bg-red-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : `${odds}`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 animate-pulse" />
            Running Simulation Analysis...
          </CardTitle>
          <CardDescription>
            Analyzing thousands of historical games and running Monte Carlo simulations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Processing 10,000 simulations...</span>
            </div>
            <Progress value={75} className="w-full" />
            <div className="text-xs text-muted-foreground">
              This may take a few moments while we analyze historical data
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={runAnalysis}
            className="ml-2"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-6">
      {/* Main Prediction Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              AI Prediction Analysis
            </div>
            <Badge className={cn("px-2 py-1", getRiskColor(analysis.riskLevel))}>
              {analysis.riskLevel.toUpperCase()} RISK
            </Badge>
          </CardTitle>
          <CardDescription>
            Based on {analysis.simulationResults.length.toLocaleString()} simulations and historical backtesting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Prediction */}
          <div className="text-center space-y-2">
            <div className="text-2xl font-bold text-foreground">
              {analysis.predictedHomeScore} - {analysis.predictedAwayScore}
            </div>
            <div className="text-sm text-muted-foreground">
              Predicted Final Score
            </div>
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="font-medium">{homeTeam}</span>
              <span className="text-muted-foreground">vs</span>
              <span className="font-medium">{awayTeam}</span>
            </div>
          </div>

          {/* Win Probabilities */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold text-primary">
                {formatPercentage(analysis.homeWinProbability)}
              </div>
              <div className="text-xs text-muted-foreground">Home Win</div>
              <div className="text-xs font-mono">{formatOdds(homeOdds)}</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold text-muted-foreground">
                {formatPercentage(analysis.drawProbability)}
              </div>
              <div className="text-xs text-muted-foreground">Draw</div>
              {drawOdds && <div className="text-xs font-mono">{formatOdds(drawOdds)}</div>}
            </div>
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold text-secondary">
                {formatPercentage(analysis.awayWinProbability)}
              </div>
              <div className="text-xs text-muted-foreground">Away Win</div>
              <div className="text-xs font-mono">{formatOdds(awayOdds)}</div>
            </div>
          </div>

          {/* Recommendation */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              {analysis.recommendedBet !== 'none' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-semibold">
                {analysis.recommendedBet !== 'none' 
                  ? `Recommended: ${analysis.recommendedBet.toUpperCase()}`
                  : 'No Recommended Bet'
                }
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Expected Value: {analysis.expectedValue > 0 ? '+' : ''}{analysis.expectedValue.toFixed(2)}%
            </div>
            <div className={cn("text-sm font-medium", getConfidenceColor(analysis.confidence))}>
              Confidence: {formatPercentage(analysis.confidence)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="prediction">Prediction</TabsTrigger>
          <TabsTrigger value="factors">Factors</TabsTrigger>
          <TabsTrigger value="simulation">Simulation</TabsTrigger>
          <TabsTrigger value="backtest">Backtest</TabsTrigger>
        </TabsList>

        <TabsContent value="prediction" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Prediction Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Home Team Advantage</div>
                  <div className="text-2xl font-bold text-primary">
                    {analysis.factors.venue > 0 ? '+' : ''}{(analysis.factors.venue * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Form Advantage</div>
                  <div className="text-2xl font-bold text-secondary">
                    {analysis.factors.form > 0 ? '+' : ''}{(analysis.factors.form * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Key Factors</div>
                <div className="space-y-1">
                  {Object.entries(analysis.factors).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className={cn(
                        "font-mono",
                        value > 0 ? "text-green-500" : value < 0 ? "text-red-500" : "text-muted-foreground"
                      )}>
                        {value > 0 ? '+' : ''}{(value * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="factors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Form Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Home Form (Last 10)</span>
                    <span className="font-mono">
                      {(homeForm.reduce((a, b) => a + b, 0) / homeForm.length).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Away Form (Last 10)</span>
                    <span className="font-mono">
                      {(awayForm.reduce((a, b) => a + b, 0) / awayForm.length).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Head-to-Head</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{homeTeam} Wins</span>
                    <span className="font-mono">{h2hData.homeWins}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{awayTeam} Wins</span>
                    <span className="font-mono">{h2hData.awayWins}</span>
                  </div>
                  {h2hData.draws > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Draws</span>
                      <span className="font-mono">{h2hData.draws}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Injuries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{homeTeam} Injuries</span>
                    <span className="font-mono">{injuries.home.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{awayTeam} Injuries</span>
                    <span className="font-mono">{injuries.away.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rest & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Home Rest Days</span>
                    <span className="font-mono">{restDays.home}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Away Rest Days</span>
                    <span className="font-mono">{restDays.away}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Weather</span>
                    <span className="capitalize">{weather}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="simulation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Simulation Results
              </CardTitle>
              <CardDescription>
                Sample of {analysis.simulationResults.length} Monte Carlo simulations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {analysis.simulationResults.filter(r => r.homeWin).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Home Wins</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-muted-foreground">
                      {analysis.simulationResults.filter(r => r.draw).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Draws</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-secondary">
                      {analysis.simulationResults.filter(r => !r.homeWin && !r.draw).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Away Wins</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Score Distribution</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <div className="font-medium">Home Scores</div>
                      <div className="space-y-1">
                        {Array.from({ length: 5 }, (_, i) => {
                          const score = Math.min(...analysis.simulationResults.map(r => r.homeScore)) + i * 2;
                          const count = analysis.simulationResults.filter(r => 
                            r.homeScore >= score && r.homeScore < score + 2
                          ).length;
                          return (
                            <div key={i} className="flex justify-between">
                              <span>{score}-{score + 1}</span>
                              <span className="text-muted-foreground">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">Away Scores</div>
                      <div className="space-y-1">
                        {Array.from({ length: 5 }, (_, i) => {
                          const score = Math.min(...analysis.simulationResults.map(r => r.awayScore)) + i * 2;
                          const count = analysis.simulationResults.filter(r => 
                            r.awayScore >= score && r.awayScore < score + 2
                          ).length;
                          return (
                            <div key={i} className="flex justify-between">
                              <span>{score}-{score + 1}</span>
                              <span className="text-muted-foreground">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backtest" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Historical Backtest Results
              </CardTitle>
              <CardDescription>
                Performance on {analysis.backtestData.totalGames.toLocaleString()} historical games
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold text-primary">
                    {formatPercentage(analysis.backtestData.accuracy)}
                  </div>
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold text-green-500">
                    ${analysis.backtestData.profitLoss.toFixed(0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Profit/Loss</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold text-blue-500">
                    {analysis.backtestData.roi.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">ROI</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold text-purple-500">
                    {formatPercentage(analysis.backtestData.avgConfidence)}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Confidence</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2">Best Performing Factors</div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.backtestData.bestFactors.map((factor, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Monthly Performance</div>
                  <div className="space-y-2">
                    {analysis.backtestData.monthlyBreakdown.slice(0, 6).map((month, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{month.month}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">{month.games} games</span>
                          <span className="font-mono">{formatPercentage(month.accuracy)}</span>
                          <span className={cn(
                            "font-mono",
                            month.profit > 0 ? "text-green-500" : "text-red-500"
                          )}>
                            ${month.profit.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
