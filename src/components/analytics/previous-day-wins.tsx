import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SportIcon } from '@/components/ui/sport-icon';
import { TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  wins?: WinPrediction[];
  totalProfit?: number;
  winRate?: number;
}

export const PreviousDayWins = ({ wins = [], totalProfit = 0, winRate = 0 }: PreviousDayWinsProps) => {
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
              <h2 className="text-xl font-bold text-foreground">Yesterday's Wins</h2>
              <p className="text-sm text-muted-foreground">
                {wins.length} winning predictions • {winRate}% win rate
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-success font-mono">
              +${totalProfit.toFixed(2)}
            </p>
            <Badge variant="default" className="bg-gradient-success">
              <CheckCircle className="w-3 h-3 mr-1" />
              {wins.length} WINS
            </Badge>
          </div>
        </div>

        {/* Wins Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wins.map((win, index) => (
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
                      <p className="text-muted-foreground">{win.team} vs {win.opponent}</p>
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
                  <span className="text-muted-foreground">Result: {win.result}</span>
                  <span className="font-mono text-success font-medium">
                    +${(win.profit || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Summary */}
        {wins.length === 0 && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No winning predictions from yesterday</p>
            <p className="text-sm text-muted-foreground mt-1">Check back after today's games complete!</p>
          </div>
        )}
      </div>
    </Card>
  );
};