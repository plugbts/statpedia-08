import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Target, Activity } from 'lucide-react';

interface EnhancedPlayerPropCardProps {
  playerName: string;
  teamAbbr: string;
  opponentAbbr: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  evPercent?: number;
  last5_streak?: string;
  last10_streak?: string;
  last20_streak?: string;
  h2h_streak?: string;
  teamLogo?: string;
  opponentLogo?: string;
}

export function EnhancedPlayerPropCard({
  playerName,
  teamAbbr,
  opponentAbbr,
  propType,
  line,
  overOdds,
  underOdds,
  evPercent,
  last5_streak,
  last10_streak,
  last20_streak,
  h2h_streak,
  teamLogo,
  opponentLogo
}: EnhancedPlayerPropCardProps) {
  
  const getEVColor = (ev: number) => {
    if (ev > 10) return 'text-green-600';
    if (ev > 5) return 'text-green-500';
    if (ev > 0) return 'text-green-400';
    if (ev > -5) return 'text-yellow-500';
    if (ev > -10) return 'text-orange-500';
    return 'text-red-500';
  };

  const getEVIcon = (ev: number) => {
    if (ev > 5) return <TrendingUp className="w-4 h-4" />;
    if (ev < -5) return <TrendingDown className="w-4 h-4" />;
    return <Target className="w-4 h-4" />;
  };

  const parseStreak = (streak: string) => {
    if (!streak || streak === '0/0') return { hits: 0, total: 0, percentage: 0 };
    const [hits, total] = streak.split('/').map(Number);
    return { hits, total, percentage: total > 0 ? (hits / total) * 100 : 0 };
  };

  const last5 = parseStreak(last5_streak || '0/5');
  const last10 = parseStreak(last10_streak || '0/10');
  const last20 = parseStreak(last20_streak || '0/20');
  const h2h = parseStreak(h2h_streak || '0/0');

  return (
    <Card className="bg-gradient-card border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              {teamLogo && (
                <img 
                  src={teamLogo} 
                  alt={teamAbbr}
                  className="w-6 h-6 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <span className="text-xs font-medium">{teamAbbr}</span>
            </div>
            <div>
              <CardTitle className="text-sm font-medium">{playerName}</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{teamAbbr}</span>
                <span>vs</span>
                <span>{opponentAbbr}</span>
              </div>
            </div>
          </div>
          
          {evPercent !== undefined && (
            <div className={`flex items-center gap-1 ${getEVColor(evPercent)}`}>
              {getEVIcon(evPercent)}
              <span className="text-sm font-medium">
                {evPercent > 0 ? '+' : ''}{evPercent.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Prop Info */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            {propType}
          </Badge>
          <div className="text-right">
            <div className="text-lg font-bold">{line}</div>
            <div className="text-xs text-muted-foreground">
              O: {overOdds} | U: {underOdds}
            </div>
          </div>
        </div>

        {/* Streaks */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Recent Form</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Last 5</span>
                <span className="font-medium">{last5_streak}</span>
              </div>
              <Progress value={last5.percentage} className="h-1" />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Last 10</span>
                <span className="font-medium">{last10_streak}</span>
              </div>
              <Progress value={last10.percentage} className="h-1" />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Last 20</span>
                <span className="font-medium">{last20_streak}</span>
              </div>
              <Progress value={last20.percentage} className="h-1" />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>H2H vs {opponentAbbr}</span>
                <span className="font-medium">{h2h_streak}</span>
              </div>
              <Progress value={h2h.percentage} className="h-1" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
