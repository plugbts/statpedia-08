import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PlayerHeadshot } from '@/components/ui/player-headshot';
import { TrendingUp, TrendingDown, Target, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface PitcherStrikeoutCardProps {
  pitcher: string;
  team: string;
  opponent: string;
  gameDate: string;
  strikeoutProp: number;
  overHitRate: number;
  underHitRate: number;
  avgStrikeouts: number;
  projection: number;
  keyFactors: Array<{
    factor: string;
    value: string;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
  mostLikelyStrikeout: {
    batter: string;
    battingOrder: number;
    strikeoutRate: number;
  };
  odds: {
    over: string;
    under: string;
  };
}

export const PitcherStrikeoutCard: React.FC<PitcherStrikeoutCardProps> = ({
  pitcher,
  team,
  opponent,
  gameDate,
  strikeoutProp,
  overHitRate,
  underHitRate,
  avgStrikeouts,
  projection,
  keyFactors,
  mostLikelyStrikeout,
  odds
}) => {
  const recommendation = projection > strikeoutProp ? 'over' : 'under';
  const recommendedHitRate = recommendation === 'over' ? overHitRate : underHitRate;

  const formatGameTime = () => {
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
      return 'TBD';
    }
  };

  return (
    <Card className="bg-gradient-card border border-border/50 hover:shadow-card-hover transition-all duration-300 group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <PlayerHeadshot
              playerName={pitcher}
              sport="mlb"
              playerId={pitcher.toLowerCase().replace(/\s+/g, '-')}
            />
            <div>
              <CardTitle className="text-lg">{pitcher}</CardTitle>
              <p className="text-sm text-muted-foreground">{team} vs {opponent}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Clock className="w-3 h-3" />
                {formatGameTime()}
              </div>
            </div>
          </div>
          
          <Badge className={recommendation === 'over' ? 'bg-gradient-success' : 'bg-gradient-accent'}>
            {recommendation === 'over' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {recommendation.toUpperCase()} {recommendedHitRate.toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Prop Line */}
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Strikeout Prop</span>
            <span className="text-2xl font-bold text-foreground">{strikeoutProp}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">Avg</div>
              <div className="font-semibold">{avgStrikeouts.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Projection</div>
              <div className="font-semibold text-primary">{projection.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Diff</div>
              <div className={`font-semibold ${projection > strikeoutProp ? 'text-success' : 'text-destructive'}`}>
                {projection > strikeoutProp ? '+' : ''}{(projection - strikeoutProp).toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Hit Rates */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Over {strikeoutProp}</span>
            <span className="font-semibold text-success">{overHitRate.toFixed(1)}%</span>
          </div>
          <Progress value={overHitRate} className="h-2 bg-muted" />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Under {strikeoutProp}</span>
            <span className="font-semibold text-destructive">{underHitRate.toFixed(1)}%</span>
          </div>
          <Progress value={underHitRate} className="h-2 bg-muted" />
        </div>

        {/* Odds */}
        <div className="flex items-center justify-between text-sm bg-muted/30 rounded-lg p-2">
          <div>
            <span className="text-muted-foreground">Over:</span>
            <span className="ml-2 font-semibold">{odds.over}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Under:</span>
            <span className="ml-2 font-semibold">{odds.under}</span>
          </div>
        </div>

        {/* Key Factors */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1">
            <Target className="w-3 h-3" />
            Key Factors
          </h4>
          <div className="space-y-1">
            {keyFactors.slice(0, 4).map((factor, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{factor.factor}</span>
                <span className={`font-medium ${
                  factor.impact === 'positive' ? 'text-success' : 
                  factor.impact === 'negative' ? 'text-destructive' : 
                  'text-muted-foreground'
                }`}>
                  {factor.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Likely Strikeout */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-primary mb-1">Most Likely K</h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{mostLikelyStrikeout.batter}</p>
              <p className="text-xs text-muted-foreground">Batting #{mostLikelyStrikeout.battingOrder}</p>
            </div>
            <Badge variant="outline" className="border-primary text-primary">
              {mostLikelyStrikeout.strikeoutRate}% K Rate
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
