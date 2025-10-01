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

interface PlayerProp {
  id: string;
  playerId: number;
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
  gameDate: string;
  gameTime: string;
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

  const formatNumber = (value: number, decimals: number = 1): string => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(decimals) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(decimals) + 'K';
    }
    return value.toFixed(decimals);
  };

  const formatOdds = (odds: number): string => {
    if (odds > 0) return `+${odds}`;
    return odds.toString();
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
          "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
          "border border-slate-700/50 shadow-2xl",
          "hover:shadow-3xl hover:shadow-blue-500/20",
          "transform-gpu",
          isHovered && "scale-105 rotate-1",
          isSelected && "ring-2 ring-blue-500 ring-opacity-50",
          showSelection && "hover:ring-2 hover:ring-blue-400 hover:ring-opacity-30"
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
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />
        
        {/* Card Content */}
        <CardContent className="relative z-10 p-6">
          {/* Header with Player Info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                {prop.playerName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 className="font-bold text-white text-lg leading-tight">
                  {prop.playerName}
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-300">
                  <span className="font-medium">{prop.teamAbbr}</span>
                  <span className="text-gray-500">vs</span>
                  <span className="font-medium">{prop.opponentAbbr}</span>
                </div>
              </div>
            </div>
            
            {/* Confidence Badge */}
            {prop.confidence && (
              <Badge 
                className={cn(
                  "px-3 py-1 text-xs font-bold shadow-lg",
                  getConfidenceColor(prop.confidence),
                  "bg-slate-800/80 border border-slate-600"
                )}
              >
                <Star className="h-3 w-3 mr-1" />
                {Math.round(prop.confidence * 100)}%
              </Badge>
            )}
          </div>

          {/* Prop Details */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 text-sm font-medium">{prop.propType}</span>
              <span className="text-white text-xl font-bold">
                {prop.line}
              </span>
            </div>
            
            {/* AI Prediction */}
            {prop.aiPrediction && (
              <div className="flex items-center space-x-2 mb-3">
                <div className={cn(
                  "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium",
                  prop.aiPrediction.recommended === 'over' 
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
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
                    "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium",
                    "bg-slate-700/50 text-gray-300 border border-slate-600/50"
                  )}>
                    {getFormIcon(prop.recentForm)}
                    <span className="uppercase">{prop.recentForm}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Odds and Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Over</div>
              <div className="text-lg font-bold text-green-400">
                {formatOdds(prop.overOdds)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Under</div>
              <div className="text-lg font-bold text-red-400">
                {formatOdds(prop.underOdds)}
              </div>
            </div>
          </div>

          {/* Expected Value */}
          {prop.expectedValue !== undefined && (
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Expected Value</span>
                <div className={cn(
                  "flex items-center space-x-1 text-sm font-bold",
                  getEVColor(prop.expectedValue)
                )}>
                  <Zap className="h-3 w-3" />
                  <span>{prop.expectedValue > 0 ? '+' : ''}{formatNumber(prop.expectedValue * 100, 1)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Game Info */}
          <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
            <span>{new Date(prop.gameDate).toLocaleDateString()}</span>
            <span>{prop.gameTime}</span>
          </div>

          {/* Action Button */}
          <Button
            className={cn(
              "w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
              "text-white font-bold py-3 px-4 rounded-lg",
              "transition-all duration-300 ease-out",
              "hover:shadow-lg hover:shadow-blue-500/25",
              "transform hover:scale-105",
              "border border-blue-500/30"
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

        {/* 3D Border Effect */}
        <div className="absolute inset-0 rounded-lg border border-gradient-to-r from-blue-500/30 via-purple-500/30 to-cyan-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </Card>
    </div>
  );
}
