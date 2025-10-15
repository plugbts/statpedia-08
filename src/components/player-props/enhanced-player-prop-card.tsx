import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Target, Activity } from 'lucide-react';
import { NormalizedPlayerProp } from '@/services/hasura-player-props-normalized-service';

interface EnhancedPlayerPropCardProps {
  // Use normalized prop data for stable, resolved information
  prop: NormalizedPlayerProp;
  // Legacy props for backward compatibility (will be deprecated)
  playerName?: string;
  teamAbbr?: string;
  opponentAbbr?: string;
  propType?: string;
  line?: number;
  overOdds?: number;
  underOdds?: number;
  evPercent?: number;
  last5_streak?: string;
  last10_streak?: string;
  last20_streak?: string;
  h2h_streak?: string;
  teamLogo?: string;
  opponentLogo?: string;
}

export function EnhancedPlayerPropCard({
  prop,
  // Legacy props for backward compatibility
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
  
  // Use normalized data if available, fallback to legacy props
  const normalizedData = prop ? {
    playerName: prop.player_name,
    teamAbbr: prop.team_abbrev,
    opponentAbbr: prop.opponent_abbrev,
    propType: prop.market,
    line: prop.line,
    overOdds: prop.odds, // Using single odds value for now
    underOdds: prop.odds, // Using single odds value for now
    evPercent: prop.ev_percent,
    last5_streak: prop.streak,
    last10_streak: prop.streak,
    last20_streak: prop.streak,
    h2h_streak: prop.streak,
    teamLogo: prop.team_logo,
    opponentLogo: prop.opponent_logo
  } : {
    playerName: playerName || 'Unknown Player',
    teamAbbr: teamAbbr || 'UNK',
    opponentAbbr: opponentAbbr || 'OPP',
    propType: propType || 'Unknown',
    line: line || 0,
    overOdds: overOdds || 0,
    underOdds: underOdds || 0,
    evPercent: evPercent,
    last5_streak: last5_streak,
    last10_streak: last10_streak,
    last20_streak: last20_streak,
    h2h_streak: h2h_streak,
    teamLogo: teamLogo,
    opponentLogo: opponentLogo
  };

  // Extract values for use in component
  const {
    playerName: displayPlayerName,
    teamAbbr: displayTeamAbbr,
    opponentAbbr: displayOpponentAbbr,
    propType: displayPropType,
    line: displayLine,
    overOdds: displayOverOdds,
    underOdds: displayUnderOdds,
    evPercent: displayEvPercent,
    last5_streak: displayLast5Streak,
    last10_streak: displayLast10Streak,
    last20_streak: displayLast20Streak,
    h2h_streak: displayH2hStreak,
    teamLogo: displayTeamLogo,
    opponentLogo: displayOpponentLogo
  } = normalizedData;
  
  const getEVColor = (ev?: number) => {
    if (!ev) return 'text-muted-foreground';
    if (ev > 10) return 'text-green-600';
    if (ev > 5) return 'text-green-500';
    if (ev > 0) return 'text-green-400';
    if (ev > -5) return 'text-yellow-500';
    if (ev > -10) return 'text-orange-500';
    return 'text-red-500';
  };

  const getEVIcon = (ev?: number) => {
    if (!ev) return <Target className="w-4 h-4" />;
    if (ev > 5) return <TrendingUp className="w-4 h-4" />;
    if (ev < -5) return <TrendingDown className="w-4 h-4" />;
    return <Target className="w-4 h-4" />;
  };

  const parseStreak = (streak?: string) => {
    if (!streak || streak === '0/0') return { hits: 0, total: 0, percentage: 0 };
    const [hits, total] = streak.split('/').map(Number);
    return { hits, total, percentage: total > 0 ? (hits / total) * 100 : 0 };
  };

  const last5 = parseStreak(displayLast5Streak);
  const last10 = parseStreak(displayLast10Streak);
  const last20 = parseStreak(displayLast20Streak);
  const h2h = parseStreak(displayH2hStreak);

  return (
    <Card className="bg-gradient-card border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              {displayTeamLogo && (
                <img 
                  src={displayTeamLogo} 
                  alt={displayTeamAbbr}
                  className="w-6 h-6 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <span className="text-xs font-medium">{displayTeamAbbr}</span>
            </div>
            <div>
              <CardTitle className="text-sm font-medium">{displayPlayerName}</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{displayTeamAbbr}</span>
                <span>vs</span>
                <span>{displayOpponentAbbr}</span>
              </div>
            </div>
          </div>
          
          {displayEvPercent !== undefined && (
            <div className={`flex items-center gap-1 ${getEVColor(displayEvPercent)}`}>
              {getEVIcon(displayEvPercent)}
              <span className="text-sm font-medium">
                {displayEvPercent > 0 ? '+' : ''}{displayEvPercent.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Prop Info */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            {displayPropType}
          </Badge>
          <div className="text-right">
            <div className="text-lg font-bold">{displayLine}</div>
            <div className="text-xs text-muted-foreground">
              O: {displayOverOdds} | U: {displayUnderOdds}
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
                <span className="font-medium">{displayLast5Streak || '0/5'}</span>
              </div>
              <Progress value={last5.percentage} className="h-1" />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Last 10</span>
                <span className="font-medium">{displayLast10Streak || '0/10'}</span>
              </div>
              <Progress value={last10.percentage} className="h-1" />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Last 20</span>
                <span className="font-medium">{displayLast20Streak || '0/20'}</span>
              </div>
              <Progress value={last20.percentage} className="h-1" />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>H2H vs {displayOpponentAbbr}</span>
                <span className="font-medium">{displayH2hStreak || '0/0'}</span>
              </div>
              <Progress value={h2h.percentage} className="h-1" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
