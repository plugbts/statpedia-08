import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Target, 
  Zap, 
  Shield, 
  Clock,
  Activity,
  Star,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerAnalysisOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  playerProp: any;
}

export const PlayerAnalysisOverlay: React.FC<PlayerAnalysisOverlayProps> = ({
  isOpen,
  onClose,
  playerProp
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen || !playerProp) return null;

  const {
    player,
    team,
    opponent,
    prop,
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
      case 'hot': return 'text-green-500';
      case 'cold': return 'text-red-500';
      case 'trending up': return 'text-green-400';
      case 'trending down': return 'text-red-400';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className={cn(
          "w-full max-w-4xl max-h-[90vh] bg-background rounded-2xl shadow-2xl border border-border/50 transform transition-all duration-300 ease-out",
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
                <h2 className="text-2xl font-bold text-foreground">{player}</h2>
                <p className="text-muted-foreground">{team} vs {opponent}</p>
                <div className="mt-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                  <p className="text-lg font-bold text-primary">
                    {prop} Over {line}
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Line</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{line}</p>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">Confidence</span>
                </div>
                <p className={cn("text-2xl font-bold", getConfidenceColor(confidence))}>
                  {Math.round(confidence * 100)}%
                </p>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Expected Value</span>
                </div>
                <p className={cn("text-2xl font-bold", getEVColor(expectedValue))}>
                  {expectedValue > 0 ? '+' : ''}{(expectedValue * 100).toFixed(1)}%
                </p>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Form</span>
                </div>
                <p className={cn("text-2xl font-bold", getFormColor(recentForm))}>
                  {recentForm}
                </p>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="odds">Odds</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
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
                            {aiPrediction?.recommended?.toUpperCase()} {prop} {line}
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
                      <h4 className="font-medium">Key Factors</h4>
                      <div className="flex flex-wrap gap-2">
                        {(aiPrediction?.factors || []).map((factor: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Season Stats */}
                {seasonStats && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Season Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground">{seasonStats.average}</p>
                          <p className="text-sm text-muted-foreground">Average</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground">{seasonStats.median}</p>
                          <p className="text-sm text-muted-foreground">Median</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground">{seasonStats.gamesPlayed}</p>
                          <p className="text-sm text-muted-foreground">Games</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground">
                            {Math.round(seasonStats.hitRate * 100)}%
                          </p>
                          <p className="text-sm text-muted-foreground">Hit Rate</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Analysis Tab */}
              <TabsContent value="analysis" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Confidence Level</span>
                        <span className={cn("text-sm font-bold", getConfidenceColor(confidence))}>
                          {Math.round(confidence * 100)}%
                        </span>
                      </div>
                      <Progress value={confidence * 100} className="h-2" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Expected Value</span>
                        <span className={cn("text-sm font-bold", getEVColor(expectedValue))}>
                          {expectedValue > 0 ? '+' : ''}{(expectedValue * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.abs(expectedValue) * 1000} 
                        className="h-2"
                      />
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Risk Assessment</h4>
                      <div className="flex items-center space-x-2">
                        {confidence >= 0.8 ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : confidence >= 0.6 ? (
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm">
                          {confidence >= 0.8 ? 'Low Risk' : confidence >= 0.6 ? 'Medium Risk' : 'High Risk'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Last 5 Games</span>
                        <Badge variant="outline">{recentForm}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-5 gap-2">
                        {last5Games.map((game: number, index: number) => (
                          <div key={index} className="text-center">
                            <div className={cn(
                              "w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold",
                              game > line ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" :
                              game < line ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400" :
                              "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                            )}>
                              {game}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Game {index + 1}</p>
                          </div>
                        ))}
                      </div>
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
                          <span className="text-sm font-medium">Over {prop} {line}</span>
                          <Badge variant="outline">Over</Badge>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {overOdds > 0 ? '+' : ''}{overOdds}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Payout: {overOdds > 0 ? overOdds : Math.abs(overOdds) / (Math.abs(overOdds) + 100) * 100}%
                        </p>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Under {prop} {line}</span>
                          <Badge variant="outline">Under</Badge>
                        </div>
                        <p className="text-2xl font-bold text-red-600">
                          {underOdds > 0 ? '+' : ''}{underOdds}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Payout: {underOdds > 0 ? underOdds : Math.abs(underOdds) / (Math.abs(underOdds) + 100) * 100}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};