import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Star, 
  Target, 
  DollarSign,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  Zap,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfessionalPredictionCardProps {
  prediction: {
    id: string;
    marketType: 'player-prop' | 'moneyline' | 'spread' | 'total';
    period: 'full_game' | '1st_quarter' | '1st_half';
    
    // Game info
    homeTeam: string;
    homeTeamAbbr: string;
    awayTeam: string;
    awayTeamAbbr: string;
    gameDate: string;
    gameTime: string;
    
    // Player props specific
    playerName?: string;
    teamAbbr?: string;
    opponentAbbr?: string;
    propType?: string;
    line?: number;
    overOdds?: number | null;
    underOdds?: number | null;
    
    // Game markets specific
    homeOdds?: number | null;
    awayOdds?: number | null;
    drawOdds?: number | null;
    spread?: number;
    total?: number;
    
    // Analysis
    expectedValue?: number;
    confidence?: number;
    aiRating?: number;
    recommendation?: string;
    
    // UI
    isBookmarked?: boolean;
    available?: boolean;
    lastUpdate?: string;
  };
  onBookmark?: (id: string) => void;
}

const getRiskLevel = (prediction: ProfessionalPredictionCardProps['prediction']): 'low' | 'medium' | 'high' => {
  const confidence = prediction.confidence || 0;
  const expectedValue = prediction.expectedValue || 0;
  
  if (confidence >= 0.75 && expectedValue >= 0.1) return 'low';
  if (confidence <= 0.55 || expectedValue <= 0) return 'high';
  return 'medium';
};

const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
  switch (risk) {
    case 'low': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'medium': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'high': return 'bg-red-500/10 text-red-600 border-red-500/20';
  }
};

const formatOdds = (odds: number | null): string => {
  if (odds === null || odds === undefined) return 'N/A';
  return odds > 0 ? `+${odds}` : `${odds}`;
};

const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

const getRecommendationIcon = (recommendation?: string) => {
  switch (recommendation) {
    case 'strong_bet': return <Zap className="w-4 h-4 text-emerald-500" />;
    case 'good_bet': return <TrendingUp className="w-4 h-4 text-blue-500" />;
    case 'avoid': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'strong_avoid': return <TrendingDown className="w-4 h-4 text-red-500" />;
    default: return <Target className="w-4 h-4 text-gray-500" />;
  }
};

const getRecommendationColor = (recommendation?: string) => {
  switch (recommendation) {
    case 'strong_bet': return 'text-emerald-600';
    case 'good_bet': return 'text-blue-600';
    case 'avoid': return 'text-amber-600';
    case 'strong_avoid': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

export const ProfessionalPredictionCard: React.FC<ProfessionalPredictionCardProps> = ({
  prediction,
  onBookmark
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const riskLevel = getRiskLevel(prediction);
  const confidence = (prediction.confidence || 0) * 100;
  const expectedValue = Math.abs((prediction.expectedValue || 0) * 100);
  
  const isPlayerProp = prediction.marketType === 'player-prop';
  
  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-500 ease-out",
        "bg-gradient-to-br from-white via-gray-50/50 to-white",
        "border border-gray-200/60 shadow-lg shadow-gray-200/20",
        "hover:shadow-2xl hover:shadow-gray-300/30 hover:-translate-y-1",
        "hover:border-gray-300/80",
        isHovered && "scale-[1.02]"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
      
      {/* Header with team/player info */}
      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {isPlayerProp ? (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {prediction.playerName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 tracking-tight">
                      {prediction.playerName}
                    </h3>
                    <p className="text-sm text-gray-600 font-medium">
                      {prediction.propType} {prediction.line}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                      {prediction.homeTeamAbbr}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 font-medium">{prediction.homeTeamAbbr}</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">VS</span>
                    <span className="text-xs text-gray-500 mt-1">
                      {prediction.period === 'full_game' ? 'Full Game' : 
                       prediction.period === '1st_quarter' ? '1Q' : '1H'}
                    </span>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-xs">
                      {prediction.awayTeamAbbr}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 font-medium">{prediction.awayTeamAbbr}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Market type and period badge */}
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                {isPlayerProp ? 'Player Prop' : prediction.marketType?.toUpperCase()}
              </Badge>
              {!isPlayerProp && prediction.period !== 'full_game' && (
                <Badge variant="outline" className="text-xs font-medium bg-purple-50 text-purple-700 border-purple-200">
                  {prediction.period === '1st_quarter' ? '1st Quarter' : '1st Half'}
                </Badge>
              )}
              {isPlayerProp && (
                <Badge variant="outline" className="text-xs font-medium bg-gray-50 text-gray-700 border-gray-200">
                  {prediction.teamAbbr} vs {prediction.opponentAbbr}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Bookmark button */}
          <Button
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-gray-100 transition-colors"
            onClick={() => onBookmark?.(prediction.id)}
          >
            {prediction.isBookmarked ? (
              <BookmarkCheck className="w-4 h-4 text-blue-600" />
            ) : (
              <Bookmark className="w-4 h-4 text-gray-400 hover:text-blue-600 transition-colors" />
            )}
          </Button>
        </div>
        
        {/* Odds and betting info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {isPlayerProp ? (
            <>
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-lg p-3 border border-emerald-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Over</span>
                </div>
                <p className="text-lg font-bold text-emerald-800">
                  {formatOdds(prediction.overOdds)}
                </p>
              </div>
              <div className="bg-gradient-to-r from-red-50 to-red-100/50 rounded-lg p-3 border border-red-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-3 h-3 text-red-600" />
                  <span className="text-xs font-medium text-red-700 uppercase tracking-wide">Under</span>
                </div>
                <p className="text-lg font-bold text-red-800">
                  {formatOdds(prediction.underOdds)}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-lg p-3 border border-blue-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-3 h-3 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                    {prediction.homeTeamAbbr}
                  </span>
                </div>
                <p className="text-lg font-bold text-blue-800">
                  {formatOdds(prediction.homeOdds)}
                </p>
              </div>
              <div className="bg-gradient-to-r from-red-50 to-red-100/50 rounded-lg p-3 border border-red-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-3 h-3 text-red-600" />
                  <span className="text-xs font-medium text-red-700 uppercase tracking-wide">
                    {prediction.awayTeamAbbr}
                  </span>
                </div>
                <p className="text-lg font-bold text-red-800">
                  {formatOdds(prediction.awayOdds)}
                </p>
              </div>
            </>
          )}
        </div>
        
        {/* AI Analysis Section */}
        <div className="space-y-3">
          {/* Confidence and EV Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">AI Confidence</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{confidence.toFixed(1)}%</span>
            </div>
            <Progress 
              value={confidence} 
              className="h-2 bg-gray-200"
              style={{
                background: `linear-gradient(to right, #3b82f6 ${confidence}%, #e5e7eb ${confidence}%)`
              }}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-gray-700">Expected Value</span>
              </div>
              <span className={cn(
                "text-sm font-bold",
                (prediction.expectedValue || 0) >= 0 ? "text-emerald-600" : "text-red-600"
              )}>
                {formatPercentage(prediction.expectedValue || 0)}
              </span>
            </div>
            <Progress 
              value={expectedValue} 
              className="h-2 bg-gray-200"
              style={{
                background: `linear-gradient(to right, ${(prediction.expectedValue || 0) >= 0 ? '#10b981' : '#ef4444'} ${expectedValue}%, #e5e7eb ${expectedValue}%)`
              }}
            />
          </div>
        </div>
        
        {/* Recommendation */}
        <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getRecommendationIcon(prediction.recommendation)}
              <span className="text-sm font-medium text-gray-700">AI Recommendation</span>
            </div>
            <Badge className={cn("text-xs font-medium", getRiskColor(riskLevel))}>
              <span className="capitalize">{prediction.recommendation?.replace('_', ' ') || 'Neutral'}</span>
            </Badge>
          </div>
        </div>
        
        {/* Expandable details */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-4 text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-xs font-medium">
            {isExpanded ? 'Show Less' : 'View Details'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 ml-2" />
          ) : (
            <ChevronDown className="w-4 h-4 ml-2" />
          )}
        </Button>
        
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200/50 space-y-3 animate-in slide-in-from-top-2 duration-300">
            {/* Additional odds info for spreads/totals */}
            {!isPlayerProp && (prediction.spread || prediction.total) && (
              <div className="grid grid-cols-2 gap-3">
                {prediction.spread && (
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-lg p-3 border border-purple-200/50">
                    <span className="text-xs font-medium text-purple-700 uppercase tracking-wide">Spread</span>
                    <p className="text-lg font-bold text-purple-800">
                      {prediction.spread > 0 ? '+' : ''}{prediction.spread}
                    </p>
                  </div>
                )}
                {prediction.total && (
                  <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 rounded-lg p-3 border border-indigo-200/50">
                    <span className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Total</span>
                    <p className="text-lg font-bold text-indigo-800">
                      {prediction.total}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Last updated */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>Updated: {new Date(prediction.lastUpdate || '').toLocaleTimeString()}</span>
            </div>
            
            {/* Live indicator */}
            {prediction.available && (
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-emerald-600">Live Market</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
