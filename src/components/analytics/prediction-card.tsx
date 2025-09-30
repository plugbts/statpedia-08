import React from 'react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SportIcon } from '@/components/ui/sport-icon';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PredictionCardProps {
  sport: string;
  player: string;
  team: string;
  opponent: string;
  prop: string;
  line: number;
  prediction: 'over' | 'under';
  confidence: number;
  odds: string;
  factors: Array<{
    name: string;
    value: string;
    rank?: number;
    isPositive: boolean;
  }>;
  status?: 'pending' | 'won' | 'lost';
  gameDate?: string; // ISO date string
}

export const PredictionCard = ({
  sport,
  player,
  team,
  opponent,
  prop,
  line,
  prediction,
  confidence,
  odds,
  factors,
  status = 'pending',
  gameDate
}: PredictionCardProps) => {
  const navigate = useNavigate();

  const formatGameDate = () => {
    if (!gameDate) return null;
    try {
      const date = parseISO(gameDate);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const gameDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      if (gameDay.getTime() === today.getTime()) {
        return `Today ${format(date, 'h:mm a')}`;
      } else if (gameDay.getTime() === tomorrow.getTime()) {
        return `Tomorrow ${format(date, 'h:mm a')}`;
      } else {
        return format(date, 'MMM d, h:mm a');
      }
    } catch (e) {
      return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'won': return 'success';
      case 'lost': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'won': return <TrendingUp className="w-4 h-4" />;
      case 'lost': return <TrendingDown className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const handleClick = () => {
    navigate('/prediction-detail', { 
      state: { 
        prediction: {
          sport,
          player,
          team,
          opponent,
          stat: prop,
          line,
          direction: prediction,
          confidence,
          odds,
          keyFactors: factors.map(f => `${f.name}: ${f.value}`),
          status
        }
      } 
    });
  };

  return (
    <Card 
      className="p-6 hover:shadow-card-hover transition-all duration-300 hover-scale group bg-gradient-card border-border/50 hover:border-primary/30 cursor-pointer"
      onClick={handleClick}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="group-hover:scale-110 transition-transform duration-300">
              <SportIcon sport={sport as any} size="lg" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {player}
              </h3>
              <p className="text-sm text-muted-foreground">
                {team} vs {opponent}
              </p>
              {gameDate && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  🕐 {formatGameDate()}
                </p>
              )}
            </div>
          </div>
          <Badge variant={getStatusColor() as any} className="gap-1 hover-scale">
            {getStatusIcon()}
            {status === 'pending' ? `${confidence}%` : status.toUpperCase()}
          </Badge>
        </div>

        {/* Prediction */}
        <div className="bg-muted/30 rounded-lg p-4 border border-border/30 group-hover:border-primary/30 transition-all duration-300 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{prop}</span>
            <span className="text-sm font-mono text-muted-foreground">{odds}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground group-hover:scale-110 transition-transform">{line}</span>
            <Badge 
              variant={prediction === 'over' ? 'default' : 'secondary'} 
              className={cn(
                'font-semibold hover-scale',
                prediction === 'over' ? 'bg-gradient-primary' : 'bg-secondary'
              )}
            >
              {prediction.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Key Factors */}
        <div className="space-y-2 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h4 className="text-sm font-medium text-foreground">Key Factors & H2H Stats</h4>
          <div className="grid grid-cols-1 gap-2">
            {factors.slice(0, 6).map((factor, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between text-xs animate-fade-in"
                style={{ animationDelay: `${150 + index * 30}ms` }}
              >
                <span className="text-muted-foreground">{factor.name}</span>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    'font-mono',
                    factor.isPositive ? 'text-success' : 'text-destructive'
                  )}>
                    {factor.value}
                  </span>
                  {factor.rank && (
                    <span className="text-muted-foreground">
                      (#{factor.rank})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence Bar */}
        <div className="space-y-1 animate-scale-in" style={{ animationDelay: '200ms' }}>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-mono text-foreground">{confidence}%</span>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
            <div 
              className={cn(
                'h-2 rounded-full transition-all duration-1000 ease-out',
                confidence >= 80 ? 'bg-gradient-success' : 
                confidence >= 60 ? 'bg-gradient-accent' : 'bg-secondary'
              )}
              style={{ 
                width: `${confidence}%`,
                animation: 'scale-in 0.8s ease-out 0.3s both'
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};