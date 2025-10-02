import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Star,
  Zap,
  Target,
  Activity,
  Eye,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SeasonalCardBackground } from '@/components/ui/seasonal-card-background';
import { teamColorsService } from '@/services/team-colors-service';
import { convertEVToText, getEVBadgeClasses } from '@/utils/ev-text-converter';
import { SportsbookIconsList } from '@/components/ui/sportsbook-icons';
import { SportsbookOverlay } from '@/components/ui/sportsbook-overlay';
import { statpediaRatingService, StatpediaRating } from '@/services/statpedia-rating-service';

interface SportsbookOdds {
  sportsbook: string;
  line: number;
  overOdds: number;
  underOdds: number;
  lastUpdate: string;
}

interface PlayerProp {
  id: string;
  playerId: string;
  playerName: string;
  team: string;
  teamAbbr: string;
  opponent: string;
  opponentAbbr: string;
  gameId: string;
  sport: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  // Multiple sportsbook odds
  allSportsbookOdds?: SportsbookOdds[];
  // NEW: Available sportsbooks for this prop
  availableSportsbooks?: string[];
  gameDate: string;
  gameTime: string;
  headshotUrl?: string;
  confidence?: number;
  expectedValue?: number;
  recentForm?: string;
  last5Games?: number[];
  seasonStats?: {
    average: number;
    median: number;
    gamesPlayed: number;
    hitRate: number;
  };
  aiPrediction?: {
    recommended: 'over' | 'under';
    confidence: number;
    reasoning: string;
    factors: string[];
  };
  sportsbookSource?: string;
  lastOddsUpdate?: string;
  teamOddsContext?: {
    homeTeam: string;
    awayTeam: string;
    hasTeamOdds: boolean;
    sportsbooks: string[];
  };
}

interface PlayerPropCardProps {
  prop: PlayerProp;
  onAnalysisClick: (prop: PlayerProp) => void;
  isSelected?: boolean;
  onSelect?: (propId: string) => void;
  showSelection?: boolean;
}

export function PlayerPropCard3D({ 
  prop, 
  onAnalysisClick, 
  isSelected = false, 
  onSelect,
  showSelection = false 
}: PlayerPropCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sparklePositions, setSparklePositions] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  const [showSportsbookOverlay, setShowSportsbookOverlay] = useState(false);

  // Calculate Statpedia Rating
  const statpediaRating: StatpediaRating = React.useMemo(() => {
    return statpediaRatingService.calculateRating(prop);
  }, [prop]);

  // Debug logging for received prop data
  React.useEffect(() => {
    // Import logger dynamically to avoid circular imports
    import('@/utils/console-logger').then(({ logger }) => {
      logger.debug('PlayerPropCard3D', `Received prop: ${prop.playerName} - ${prop.propType}`, {
        playerName: prop.playerName,
        propType: prop.propType,
        line: prop.line,
        overOdds: prop.overOdds,
        underOdds: prop.underOdds,
        lineType: typeof prop.line,
        overOddsType: typeof prop.overOdds,
        underOddsType: typeof prop.underOdds
      });
    });
  }, [prop]);

  // Generate sparkle positions for animation
  useEffect(() => {
    if (isHovered) {
      const sparkles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 1000
      }));
      setSparklePositions(sparkles);
    }
  }, [isHovered]);

  const formatNumber = (value: number | string | null, decimals: number = 1): string => {
    if (value === null || value === undefined) return 'N/A';
    
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numericValue)) return 'N/A';
    
    // For lines, round to nearest .5 or .0 interval
    if (numericValue < 1000) { // Assuming lines are typically under 1000
      const rounded = Math.round(numericValue * 2) / 2;
      return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
    }
    
    // For larger numbers, use compact formatting
    if (numericValue >= 1000000) {
      return (numericValue / 1000000).toFixed(decimals) + 'M';
    }
    if (numericValue >= 1000) {
      return (numericValue / 1000).toFixed(decimals) + 'K';
    }
    return numericValue.toFixed(decimals);
  };

  // Format American odds with .5 and .0 intervals only
  const formatAmericanOdds = (odds: number): string => {
    // Round to nearest .5 or .0 interval
    const rounded = Math.round(odds * 2) / 2;
    
    // Format as American odds
    if (rounded > 0) {
      return `+${Math.round(rounded)}`;
    } else {
      return `${Math.round(rounded)}`;
    }
  };

  const formatOdds = (odds: number | string | null): string => {
    if (odds === null || odds === undefined) return 'N/A';
    
    const numericOdds = typeof odds === 'string' ? parseInt(odds) : odds;
    if (isNaN(numericOdds)) return 'N/A';
    
    return formatAmericanOdds(numericOdds);
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getEVColor = (ev: number): string => {
    if (ev > 0.05) return 'text-green-400';
    if (ev > 0) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getFormColor = (form: string): string => {
    switch (form.toLowerCase()) {
      case 'hot': return 'text-green-400';
      case 'cold': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getFormIcon = (form: string) => {
    switch (form.toLowerCase()) {
      case 'hot': return <TrendingUp className="h-3 w-3" />;
      case 'cold': return <TrendingDown className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  const getRatingColor = (rating: StatpediaRating) => {
    switch (rating.color) {
      case 'green': return 'text-green-400 bg-green-500/20 border-green-500/40';
      case 'yellow': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40';
      case 'red': return 'text-red-400 bg-red-500/20 border-red-500/40';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/40';
    }
  };

  const getRatingIcon = (rating: StatpediaRating) => {
    if (rating.overall >= 80) return <Star className="h-3 w-3" />;
    if (rating.overall >= 65) return <Target className="h-3 w-3" />;
    return <BarChart3 className="h-3 w-3" />;
  };

  const handleCardClick = () => {
    if (showSelection && onSelect) {
      onSelect(prop.id);
    } else {
      onAnalysisClick(prop);
    }
  };

  return (
    <div className="relative group">
      {/* Sparkle Animation Overlay */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {sparklePositions.map((sparkle) => (
            <div
              key={sparkle.id}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-ping"
              style={{
                left: `${sparkle.x}%`,
                top: `${sparkle.y}%`,
                animationDelay: `${sparkle.delay}ms`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      )}

      <Card
        className={cn(
          "relative overflow-hidden cursor-pointer transition-all duration-500 ease-out",
          "bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950",
          "border border-slate-800/80 shadow-2xl",
          "hover:shadow-3xl hover:shadow-slate-500/20",
          "transform-gpu",
          isHovered && "scale-105 rotate-1",
          isSelected && "ring-2 ring-slate-400 ring-opacity-60",
          showSelection && "hover:ring-2 hover:ring-slate-300 hover:ring-opacity-40"
        )}
        style={{
          transform: isHovered 
            ? 'perspective(1000px) rotateX(5deg) rotateY(5deg) translateZ(20px)' 
            : 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)',
          transformStyle: 'preserve-3d'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
      >
        <SeasonalCardBackground intensity="subtle" className="h-full">
          {/* Animated Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-600/3 via-gray-600/2 to-slate-600/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-600/5 via-gray-600/4 to-slate-600/5 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />
          
          {/* Card Content */}
          <CardContent className="relative z-10 p-6">
          {/* Header with Player Info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full ${teamColorsService.getTeamGradient(prop.teamAbbr, prop.sport)} flex items-center justify-center text-white font-bold text-sm shadow-lg border-2 ${teamColorsService.getTeamBorder(prop.teamAbbr, prop.sport)} overflow-hidden`}>
                {prop.headshotUrl ? (
                  <img 
                    src={prop.headshotUrl} 
                    alt={prop.playerName}
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      // Fallback to team abbreviation if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = prop.teamAbbr.toUpperCase();
                      }
                    }}
                  />
                ) : (
                  prop.teamAbbr.toUpperCase()
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-lg leading-tight tracking-tight">
                  {prop.playerName}
                </h3>
                <div className="flex items-center space-x-2 text-sm text-slate-400">
                  <span className="font-semibold text-slate-200">{prop.teamAbbr}</span>
                  <span className="text-slate-500 font-medium">vs</span>
                  <span className="font-semibold text-slate-200">{prop.opponentAbbr}</span>
                </div>
              </div>
            </div>
            
            {/* Statpedia Rating */}
            <div className="flex flex-col items-end space-y-1">
              <Badge 
                className={cn(
                  "px-3 py-1 text-xs font-bold shadow-lg border",
                  getRatingColor(statpediaRating)
                )}
              >
                {getRatingIcon(statpediaRating)}
                <span className="ml-1">{statpediaRating.overall}/100</span>
              </Badge>
              <div className="text-xs font-semibold text-slate-300">
                Statpedia {statpediaRating.grade}
              </div>
            </div>
          </div>

          {/* Prop Details */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 mr-3">
                <span className="text-slate-400 text-sm font-semibold tracking-wide uppercase block leading-tight">
                  {prop.propType.length > 15 ? (
                    <span className="break-words">
                      {prop.propType.split(' ').map((word, index) => (
                        <span key={index} className="inline-block mr-1">
                          {word}
                        </span>
                      ))}
                    </span>
                  ) : (
                    prop.propType
                  )}
                </span>
              </div>
              <span className="text-slate-100 text-2xl font-bold tracking-tight flex-shrink-0">
                {formatNumber(prop.line)}
              </span>
            </div>
            
            {/* AI Prediction */}
            {prop.aiPrediction && (
              <div className="flex items-center space-x-2 mb-3">
                <div className={cn(
                  "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold",
                  prop.aiPrediction.recommended === 'over' 
                    ? "bg-green-600/20 text-green-300 border border-green-500/40"
                    : "bg-red-600/20 text-red-300 border border-red-500/40"
                )}>
                  {prop.aiPrediction.recommended === 'over' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span className="uppercase font-bold">
                    {prop.aiPrediction.recommended}
                  </span>
                </div>
                
                {/* Recent Form */}
                {prop.recentForm && (
                  <div className={cn(
                    "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold",
                    "bg-slate-800/60 text-slate-200 border border-slate-600/60"
                  )}>
                    {getFormIcon(prop.recentForm)}
                    <span className="uppercase">{prop.recentForm}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Odds and Stats */}
          <div className="space-y-3 mb-4">
            {/* Primary Odds Display */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Over</div>
                <div className="text-xl font-bold text-green-300 tracking-tight">
                  {formatOdds(prop.overOdds)}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Under</div>
                <div className="text-xl font-bold text-red-300 tracking-tight">
                  {formatOdds(prop.underOdds)}
                </div>
              </div>
            </div>

            {/* Available Sportsbooks Icons */}
            {prop.availableSportsbooks && prop.availableSportsbooks.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Available on {prop.availableSportsbooks.length} Sportsbook{prop.availableSportsbooks.length !== 1 ? 's' : ''}
                </div>
                <SportsbookIconsList 
                  sportsbooks={prop.availableSportsbooks} 
                  maxVisible={3}
                  onClick={() => setShowSportsbookOverlay(true)}
                  className="justify-start"
                />
              </div>
            )}

            {/* Multiple Sportsbook Odds */}
            {prop.allSportsbookOdds && prop.allSportsbookOdds.length > 1 && (
              <div className="space-y-2">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">All Sportsbooks</div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {prop.allSportsbookOdds.map((odds, index) => (
                    <div key={index} className="flex items-center justify-between text-xs bg-slate-800/30 rounded px-2 py-1">
                      <span className="text-slate-300 font-medium">{odds.sportsbook}</span>
                      <div className="flex items-center space-x-3">
                        <span className="text-green-300 font-semibold">{formatOdds(odds.overOdds)}</span>
                        <span className="text-slate-400">|</span>
                        <span className="text-red-300 font-semibold">{formatOdds(odds.underOdds)}</span>
                        {odds.line !== prop.line && (
                          <span className="text-slate-500">({odds.line})</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sportsbook Source */}
          {prop.sportsbookSource && (
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Data Source</span>
                <Badge variant="outline" className="text-xs">
                  {prop.sportsbookSource}
                </Badge>
              </div>
              {prop.lastOddsUpdate && (
                <div className="text-xs text-slate-400 mt-1">
                  Updated: {new Date(prop.lastOddsUpdate).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          {/* Team Odds Context */}
          {prop.teamOddsContext && prop.teamOddsContext.hasTeamOdds && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Team Odds Available</span>
                <Badge variant="secondary" className="text-xs">
                  {prop.teamOddsContext.sportsbooks.length} Sportsbooks
                </Badge>
              </div>
              <div className="text-xs text-slate-400">
                {prop.teamOddsContext.homeTeam} vs {prop.teamOddsContext.awayTeam}
              </div>
            </div>
          )}

          {/* Statpedia Rating Breakdown */}
          <div className="mb-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Rating Breakdown</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">AI Prediction:</span>
                <span className="text-slate-200 font-semibold">{Math.round(statpediaRating.factors.aiPredictionScore)}/25</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Odds Value:</span>
                <span className="text-slate-200 font-semibold">{Math.round(statpediaRating.factors.oddsValueScore)}/25</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Data Quality:</span>
                <span className="text-slate-200 font-semibold">{Math.round(statpediaRating.factors.confidenceScore)}/20</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Recent Form:</span>
                <span className="text-slate-200 font-semibold">{Math.round(statpediaRating.factors.recentFormScore)}/15</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Market Consensus:</span>
                <span className="text-slate-200 font-semibold">{Math.round(statpediaRating.factors.marketConsensusScore)}/15</span>
              </div>
            </div>
            
            {/* Rating Confidence */}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-700/50">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Confidence:</span>
              <Badge 
                className={cn(
                  "text-xs px-2 py-1 border",
                  statpediaRating.confidence === 'High' ? 'bg-green-500/20 text-green-400 border-green-500/40' :
                  statpediaRating.confidence === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' :
                  'bg-red-500/20 text-red-400 border-red-500/40'
                )}
              >
                {statpediaRating.confidence}
              </Badge>
            </div>
          </div>

          {/* Expected Value */}
          {prop.expectedValue !== undefined && (
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Expected Value</span>
                <Badge className={`text-xs font-bold border ${getEVBadgeClasses(prop.expectedValue * 100).combined}`}>
                  <Zap className="h-3 w-3 mr-1" />
                  {convertEVToText(prop.expectedValue * 100).text}
                </Badge>
              </div>
            </div>
          )}

          {/* Game Info */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-4 font-semibold">
            <span className="tracking-wide">{new Date(prop.gameDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <span className="tracking-wide">{new Date(prop.gameTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
          </div>

          {/* Action Button */}
          <Button
            className={cn(
              "w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700",
              "text-slate-100 font-semibold py-3 px-4 rounded-lg",
              "transition-all duration-300 ease-out",
              "hover:shadow-lg hover:shadow-slate-500/25",
              "transform hover:scale-105",
              "border border-slate-600/50",
              "tracking-wide"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onAnalysisClick(prop);
            }}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            View Analysis
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
          </CardContent>
        </SeasonalCardBackground>

        {/* 3D Border Effect */}
        <div className="absolute inset-0 rounded-lg border border-gradient-to-r from-slate-500/30 via-gray-500/30 to-slate-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </Card>
      
      {/* Sportsbook Overlay */}
      <SportsbookOverlay
        isOpen={showSportsbookOverlay}
        onClose={() => setShowSportsbookOverlay(false)}
        sportsbooks={prop.availableSportsbooks || []}
        propInfo={{
          playerName: prop.playerName,
          propType: prop.propType,
          line: prop.line
        }}
      />
    </div>
  );
}
