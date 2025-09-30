import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SportIcon } from '@/components/ui/sport-icon';
import { PlayerHeadshot } from '@/components/ui/player-headshot';
import { SubscriptionOverlay } from '@/components/ui/subscription-overlay';
import { PredictionPoll } from '@/components/predictions/prediction-poll';
import { EVRating } from './ev-rating';
import { evCalculatorService, type EVCalculation } from '@/services/ev-calculator';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  MapPin, 
  AlertTriangle,
  Eye,
  EyeOff,
  BarChart3,
  Target
} from 'lucide-react';

interface PlayerPropCardProps {
  id: string;
  sport: 'baseball' | 'basketball' | 'college-basketball' | 'college-football' | 'football' | 'hockey' | 'mlb' | 'nba' | 'nfl' | 'nhl' | 'wnba';
  playerName: string;
  team: string;
  opponent: string;
  propType: string;
  line: number;
  hitRate: number;
  gamesTracked: number;
  avgActualValue: number;
  odds: string;
  recentForm: string;
  homeAway: 'home' | 'away';
  injuryStatus: string;
  weatherConditions: string;
  potentialAssists: number;
  potentialRebounds: number;
  potentialThrees: number;
  avgMinutes: number;
  freeThrowAttempts: number;
  defensiveRating: number;
  offensiveRating: number;
  usageRate: number;
  paceFactor: number;
  restDays: number;
  isSubscribed: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export const PlayerPropCard: React.FC<PlayerPropCardProps> = ({
  id,
  sport,
  playerName,
  team,
  opponent,
  propType,
  line,
  hitRate,
  gamesTracked,
  avgActualValue,
  odds,
  recentForm,
  homeAway,
  injuryStatus,
  weatherConditions,
  potentialAssists,
  potentialRebounds,
  potentialThrees,
  avgMinutes,
  freeThrowAttempts,
  defensiveRating,
  offensiveRating,
  usageRate,
  paceFactor,
  restDays,
  isSubscribed,
  isSelected,
  onToggleSelect
}) => {
  const navigate = useNavigate();

  // Calculate EV for this prop
  const evCalculation = evCalculatorService.calculateAIRating({
    id,
    playerName,
    propType,
    line,
    odds,
    sport,
    team,
    opponent,
    gameDate: new Date().toISOString(),
    hitRate,
    recentForm: parseFloat(recentForm.replace('%', '')) / 100,
    restDays,
    injuryStatus
  });

  const handleUpgrade = () => {
    navigate('/subscription');
  };

  const getHitRateColor = (rate: number) => {
    if (rate >= 80) return 'text-success';
    if (rate >= 65) return 'text-warning';
    return 'text-destructive';
  };

  const getHitRateBadge = (rate: number) => {
    if (rate >= 80) return 'bg-gradient-success';
    if (rate >= 65) return 'bg-gradient-accent';
    return 'bg-destructive';
  };

  const isHealthy = injuryStatus.toLowerCase() === 'healthy';
  const isOver = avgActualValue > line;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on the toggle button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    navigate('/prediction-detail', {
      state: {
        prediction: {
          sport,
          player: playerName,
          team,
          opponent,
          stat: propType,
          line,
          direction: isOver ? 'over' : 'under',
          confidence: hitRate,
          odds,
          keyFactors: [
            `Recent Form: ${recentForm}`,
            `${homeAway === 'home' ? 'Home' : 'Away'} Game`,
            `Weather: ${weatherConditions}`,
            `Health Status: ${injuryStatus}`,
            `Average Performance: ${avgActualValue}`,
            `Hit Rate: ${hitRate.toFixed(1)}% over ${gamesTracked} games`
          ],
          seasonAvg: avgActualValue,
          last10Avg: avgActualValue,
          vsOpponentAvg: avgActualValue
        }
      }
    });
  };

  return (
    <div className={`relative ${!isSubscribed ? 'relative' : ''}`}>
      <Card
        onClick={handleCardClick}
        className={`bg-gradient-card border transition-all duration-300 hover:shadow-card-hover cursor-pointer ${
          isSelected ? 'ring-2 ring-primary border-primary/50' : 'border-border/50'
        } ${!isSubscribed ? 'blur-sm' : ''}`}
      >

      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <PlayerHeadshot 
              playerName={playerName}
              sport={sport}
              playerId={id}
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <SportIcon sport={sport} className="h-6 w-6" />
                <CardTitle className="text-lg">{playerName}</CardTitle>
              </div>
              <CardDescription className="mt-1">{team} vs {opponent}</CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={getHitRateBadge(hitRate)}>
              {hitRate.toFixed(1)}%
            </Badge>
            <Button
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={onToggleSelect}
              className={isSelected ? "bg-gradient-primary" : ""}
            >
              {isSelected ? <Eye className="h-4 w-4" /> : <Target className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Prop Type</span>
            <span className="font-medium">{propType}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Line</span>
            <span className="font-bold text-lg">{line}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Odds</span>
            <span className="font-medium">{odds}</span>
          </div>
          
          {/* EV% Display */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">EV%</span>
            <span 
              className={`font-bold text-sm ${evCalculatorService.getEVColor(evCalculation.evPercentage)}`}
            >
              {evCalculation.evPercentage > 0 ? '+' : ''}{evCalculation.evPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Performance Metrics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Hit Rate</span>
            <span className={`font-bold ${getHitRateColor(hitRate)}`}>
              {hitRate.toFixed(1)}% ({gamesTracked} games)
            </span>
          </div>
          
          <Progress value={hitRate} className="h-2" />
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Avg:</span>
              <span className="font-medium">{avgActualValue}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {isOver ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span className="text-muted-foreground">vs Line:</span>
              <span className={isOver ? 'text-success' : 'text-destructive'}>
                {isOver ? '+' : ''}{(avgActualValue - line).toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Advanced Metrics Grid */}
        {isSubscribed && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Advanced Metrics</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              {sport === 'nba' && (
                <>
                  <div className="bg-muted/50 rounded p-2">
                    <div className="text-muted-foreground">Potential Assists</div>
                    <div className="font-bold">{potentialAssists.toFixed(1)}</div>
                  </div>
                  
                  <div className="bg-muted/50 rounded p-2">
                    <div className="text-muted-foreground">Potential Rebounds</div>
                    <div className="font-bold">{potentialRebounds.toFixed(1)}</div>
                  </div>
                  
                  <div className="bg-muted/50 rounded p-2">
                    <div className="text-muted-foreground">Potential 3's</div>
                    <div className="font-bold">{potentialThrees.toFixed(1)}</div>
                  </div>
                  
                  <div className="bg-muted/50 rounded p-2">
                    <div className="text-muted-foreground">Avg Minutes</div>
                    <div className="font-bold">{avgMinutes.toFixed(1)}</div>
                  </div>
                  
                  <div className="bg-muted/50 rounded p-2">
                    <div className="text-muted-foreground">Usage Rate</div>
                    <div className="font-bold">{usageRate.toFixed(1)}%</div>
                  </div>
                  
                  <div className="bg-muted/50 rounded p-2">
                    <div className="text-muted-foreground">FT Attempts</div>
                    <div className="font-bold">{freeThrowAttempts.toFixed(1)}</div>
                  </div>
                </>
              )}
              
              <div className="bg-muted/50 rounded p-2">
                <div className="text-muted-foreground">Pace Factor</div>
                <div className="font-bold">{paceFactor.toFixed(1)}</div>
              </div>
              
              <div className="bg-muted/50 rounded p-2">
                <div className="text-muted-foreground">Rest Days</div>
                <div className="font-bold">{restDays}</div>
              </div>
            </div>
          </div>
        )}

        {/* Situational Factors */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Situation</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              <MapPin className="h-3 w-3 mr-1" />
              {homeAway === 'home' ? 'Home' : 'Away'}
            </Badge>
            
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {weatherConditions}
            </Badge>
            
            <Badge 
              variant="outline" 
              className={`text-xs ${
                isHealthy ? 'border-success text-success' : 'border-warning text-warning'
              }`}
            >
              {isHealthy ? (
                <Activity className="h-3 w-3 mr-1" />
              ) : (
                <AlertTriangle className="h-3 w-3 mr-1" />
              )}
              {injuryStatus}
            </Badge>
          </div>
        </div>

        {/* Recent Form */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="text-sm font-medium text-muted-foreground mb-1">Recent Form</div>
          <div className="text-sm">{recentForm}</div>
        </div>

        {/* AI EV Rating */}
        {isSubscribed && (
          <div className="mt-4">
            <EVRating evCalculation={evCalculation} compact={true} />
          </div>
        )}

        {/* Prediction Poll */}
        {isSubscribed && (
          <div className="mt-4">
            <PredictionPoll
              propId={id}
              propTitle={`${playerName} ${propType}`}
              propValue={line}
              propType={propType}
              playerName={playerName}
              team={team}
              opponent={opponent}
              gameDate={new Date().toISOString()} // This should come from props in real implementation
              gameStatus="scheduled"
            />
          </div>
        )}
      </CardContent>
    </Card>
    
    {/* Subscription overlay for free users - outside the blurred card */}
    <SubscriptionOverlay
      isVisible={!isSubscribed}
      icon={<EyeOff className="h-8 w-8 text-primary" />}
      title="Premium Content"
      description="Upgrade to view details"
      buttonText="Upgrade to Pro"
      onUpgrade={handleUpgrade}
    />
    </div>
  );
};