import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SportIcon } from '@/components/ui/sport-icon';
import { TrendingUp, CheckCircle, Clock, BarChart3, DollarSign, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { predictionTracker, type PredictionResult, type WinStats } from '@/services/prediction-tracker';

interface WinPrediction {
  id: string;
  sport: string;
  player: string;
  team: string;
  opponent: string;
  prop: string;
  line: number;
  prediction: 'over' | 'under';
  odds: string;
  result: string;
  profit: number;
}

interface PreviousDayWinsProps {
  // Optional props for backward compatibility, but component will use real data
  wins?: WinPrediction[];
  totalProfit?: number;
  winRate?: number;
  showAllTimeStats?: boolean;
}

export const PreviousDayWins = ({ 
  wins = [], 
  totalProfit = 0, 
  winRate = 0, 
  showAllTimeStats = false 
}: PreviousDayWinsProps) => {
  const [previousDayWins, setPreviousDayWins] = useState<PredictionResult[]>([]);
  const [previousDayStats, setPreviousDayStats] = useState<WinStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreviousDayData();
  }, []);

  const loadPreviousDayData = async () => {
    setLoading(true);
    try {
      // Get real previous day wins
      const wins = predictionTracker.getPreviousDayWins();
      const stats = predictionTracker.getPreviousDayStats();
      
      setPreviousDayWins(wins);
      setPreviousDayStats(stats);
    } catch (error) {
      console.error('Error loading previous day data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Use real data if available, fallback to props
  const displayWins = previousDayWins.length > 0 ? previousDayWins : wins;
  const displayStats = previousDayStats || { 
    totalPredictions: 0, 
    wins: wins.length, 
    losses: 0, 
    pushes: 0, 
    winRate: winRate, 
    totalProfit: totalProfit, 
    averageOdds: 0,
    bestWin: null,
    worstLoss: null
  };
  return (
    <Card className="p-6 bg-gradient-success/5 border-success/20">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {loading ? 'Loading...' : 'Yesterday\'s Performance'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Calculating statistics...' : 
                  `${displayStats?.wins || 0} wins • ${displayStats?.losses || 0} losses • ${displayStats?.pushes || 0} pushes • ${(displayStats?.winRate || 0).toFixed(1)}% win rate`
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-success font-mono">
              {loading ? '...' : `+$${(displayStats?.totalProfit || 0).toFixed(2)}`}
            </p>
            <Badge variant="default" className="bg-gradient-success">
              <CheckCircle className="w-3 h-3 mr-1" />
              {displayStats?.wins || 0} WINS
            </Badge>
          </div>
        </div>

        {/* Detailed Stats */}
        {!loading && displayStats && displayStats.totalPredictions > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-gradient-card border-border/50">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-success" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Picks</p>
                  <p className="text-lg font-bold text-foreground">{displayStats?.totalPredictions || 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-card border-border/50">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <div>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                  <p className="text-lg font-bold text-success">{(displayStats?.winRate || 0).toFixed(1)}%</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-card border-border/50">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-success" />
                <div>
                  <p className="text-xs text-muted-foreground">Profit</p>
                  <p className="text-lg font-bold text-success">+${(displayStats?.totalProfit || 0).toFixed(2)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-card border-border/50">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Avg Odds</p>
                  <p className="text-lg font-bold text-foreground">
                    {(displayStats?.averageOdds || 0) > 0 ? '+' : ''}{(displayStats?.averageOdds || 0).toFixed(0)}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Wins Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayWins.map((win, index) => (
            <Card 
              key={win.id}
              className={cn(
                "p-4 bg-gradient-card hover:shadow-card-hover transition-all duration-300",
                "border-success/30 hover:border-success/50",
                "animate-scale-in"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SportIcon sport={win.sport as any} size="sm" />
                    <div className="text-xs">
                      <p className="font-medium text-foreground">{win.player}</p>
                      <p className="text-muted-foreground">{win.team} @ {win.opponent}</p>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-success text-success-foreground">
                    WON
                  </Badge>
                </div>

                {/* Prediction */}
                <div className="bg-muted/20 rounded p-2 border border-success/20">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{win.prop}</span>
                    <span className="font-mono text-muted-foreground">{win.odds}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{win.line}</span>
                    <Badge 
                      variant={win.prediction === 'over' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {win.prediction.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {/* Result */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Result: {'actualValue' in win ? `${win.actualValue?.toFixed(1)}` : win.result}
                  </span>
                  <span className="font-mono text-success font-medium">
                    +${(win.profit || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Summary */}
        {!loading && displayWins.length === 0 && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {(displayStats?.totalPredictions || 0) === 0 
                ? 'No predictions tracked from yesterday' 
                : 'No winning predictions from yesterday'
              }
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {(displayStats?.totalPredictions || 0) === 0 
                ? 'Start making predictions to track your performance!' 
                : 'Check back after today\'s games complete!'
              }
            </p>
          </div>
        )}

        {/* Previous Day Summary */}
        {!loading && displayStats && displayStats.totalPredictions > 0 && (
          <div className="mt-6 p-4 bg-gradient-card border border-border/50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Yesterday's Summary</h3>
              <Badge variant="outline" className="text-xs">
                {displayStats.totalPredictions} picks made
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Win Rate</p>
                <p className="text-lg font-bold text-success">{(displayStats.winRate || 0).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Profit</p>
                <p className="text-lg font-bold text-success">+${(displayStats.totalProfit || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Wins</p>
                <p className="text-lg font-bold text-foreground">{displayStats.wins || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Losses</p>
                <p className="text-lg font-bold text-foreground">{displayStats.losses || 0}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};