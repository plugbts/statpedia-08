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
  AlertTriangle,
  Brain,
  BarChart3,
  PieChart,
  TrendingUpIcon,
  TrendingDownIcon,
  CheckCircle,
  XCircle,
  Info,
  Flame,
  Award,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdvancedPredictionCardProps {
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

const getRiskLevel = (prediction: AdvancedPredictionCardProps['prediction']): 'low' | 'medium' | 'high' => {
  const confidence = prediction.confidence || 0;
  const expectedValue = prediction.expectedValue || 0;
  
  if (confidence >= 0.75 && expectedValue >= 0.1) return 'low';
  if (confidence <= 0.55 || expectedValue <= 0) return 'high';
  return 'medium';
};

const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
  switch (risk) {
    case 'low': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
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
    case 'strong_bet': return <Flame className="w-4 h-4 text-orange-400" />;
    case 'good_bet': return <TrendingUp className="w-4 h-4 text-blue-400" />;
    case 'avoid': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    case 'strong_avoid': return <TrendingDown className="w-4 h-4 text-red-400" />;
    default: return <Target className="w-4 h-4 text-gray-400" />;
  }
};

const generateDetailedAnalysis = (prediction: AdvancedPredictionCardProps['prediction']) => {
  const analysis = [];
  const confidence = prediction.confidence || 0;
  const expectedValue = prediction.expectedValue || 0;
  const isPlayerProp = prediction.marketType === 'player-prop';
  
  // Confidence-based analysis
  if (confidence >= 0.8) {
    analysis.push({
      icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
      title: "Exceptional Confidence",
      description: "AI analysis shows 80%+ confidence based on historical performance patterns and current form.",
      impact: "high"
    });
  } else if (confidence >= 0.7) {
    analysis.push({
      icon: <Star className="w-4 h-4 text-blue-400" />,
      title: "High Confidence",
      description: "Strong statistical indicators support this prediction with 70%+ confidence level.",
      impact: "medium"
    });
  } else if (confidence <= 0.5) {
    analysis.push({
      icon: <XCircle className="w-4 h-4 text-red-400" />,
      title: "Low Confidence",
      description: "Limited data or conflicting indicators suggest higher risk in this prediction.",
      impact: "low"
    });
  }
  
  // Expected value analysis
  if (expectedValue >= 0.15) {
    analysis.push({
      icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
      title: "Exceptional Value",
      description: `Expected value of ${formatPercentage(expectedValue)} indicates strong positive ROI potential.`,
      impact: "high"
    });
  } else if (expectedValue >= 0.05) {
    analysis.push({
      icon: <TrendingUp className="w-4 h-4 text-blue-400" />,
      title: "Positive Value",
      description: `Expected value of ${formatPercentage(expectedValue)} suggests favorable betting opportunity.`,
      impact: "medium"
    });
  } else if (expectedValue <= -0.05) {
    analysis.push({
      icon: <TrendingDown className="w-4 h-4 text-red-400" />,
      title: "Negative Value",
      description: `Expected value of ${formatPercentage(expectedValue)} indicates unfavorable odds.`,
      impact: "low"
    });
  }
  
  // Market-specific analysis
  if (isPlayerProp) {
    analysis.push({
      icon: <Users className="w-4 h-4 text-purple-400" />,
      title: "Player Performance Analysis",
      description: "Historical data shows consistent patterns in this player's performance against similar opponents.",
      impact: "medium"
    });
    
    if (prediction.propType?.includes('Touchdown')) {
      analysis.push({
        icon: <Target className="w-4 h-4 text-orange-400" />,
        title: "Red Zone Opportunity",
        description: "Team's red zone efficiency and player's target share in scoring situations analyzed.",
        impact: "high"
      });
    }
    
    if (prediction.propType?.includes('Yard')) {
      analysis.push({
        icon: <BarChart3 className="w-4 h-4 text-cyan-400" />,
        title: "Volume-Based Metric",
        description: "Usage rate, snap count, and offensive scheme alignment factored into prediction.",
        impact: "medium"
      });
    }
  } else {
    if (prediction.marketType === 'moneyline') {
      analysis.push({
        icon: <Award className="w-4 h-4 text-gold-400" />,
        title: "Head-to-Head Analysis",
        description: "Comprehensive matchup analysis including recent form, injuries, and coaching strategies.",
        impact: "high"
      });
    }
    
    if (prediction.marketType === 'spread') {
      analysis.push({
        icon: <PieChart className="w-4 h-4 text-indigo-400" />,
        title: "Point Differential Analysis",
        description: "Historical spread performance and situational factors analyzed for accuracy.",
        impact: "medium"
      });
    }
    
    if (prediction.marketType === 'total') {
      analysis.push({
        icon: <Flame className="w-4 h-4 text-orange-400" />,
        title: "Offensive Pace Analysis",
        description: "Scoring trends, weather conditions, and defensive matchups evaluated.",
        impact: "high"
      });
    }
  }
  
  // Period-specific analysis
  if (prediction.period !== 'full_game') {
    analysis.push({
      icon: <Clock className="w-4 h-4 text-yellow-400" />,
      title: "Period-Specific Analysis",
      description: `${prediction.period.replace('_', ' ')} performance patterns and situational factors considered.`,
      impact: "medium"
    });
  }
  
  return analysis;
};

export const AdvancedPredictionCard: React.FC<AdvancedPredictionCardProps> = ({
  prediction,
  onBookmark
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const riskLevel = getRiskLevel(prediction);
  const confidence = (prediction.confidence || 0) * 100;
  const expectedValue = Math.abs((prediction.expectedValue || 0) * 100);
  const detailedAnalysis = generateDetailedAnalysis(prediction);
  
  const isPlayerProp = prediction.marketType === 'player-prop';
  
  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-700 ease-out",
        "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
        "border border-slate-700/50 shadow-2xl shadow-slate-900/50",
        "hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2",
        "hover:border-slate-600/80 hover:bg-gradient-to-br hover:from-slate-800 hover:via-slate-700 hover:to-slate-800",
        isHovered && "scale-[1.02]"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-2000 ease-out" />
      
      {/* Glowing border effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg blur-sm" />
      
      <CardContent className="p-6 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              {isPlayerProp ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">
                    {prediction.playerName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-white tracking-tight">
                      {prediction.playerName}
                    </h3>
                    <p className="text-sm text-slate-300 font-medium">
                      {prediction.propType} {prediction.line}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      {prediction.homeTeamAbbr}
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-medium">{prediction.homeTeamAbbr}</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">VS</span>
                    <span className="text-xs text-slate-400 mt-1">
                      {prediction.period === 'full_game' ? 'Full Game' : 
                       prediction.period === '1st_quarter' ? '1Q' : '1H'}
                    </span>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      {prediction.awayTeamAbbr}
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-medium">{prediction.awayTeamAbbr}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Market badges */}
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="text-xs font-medium bg-blue-500/20 text-blue-300 border-blue-500/30">
                {isPlayerProp ? 'Player Prop' : prediction.marketType?.toUpperCase()}
              </Badge>
              {!isPlayerProp && prediction.period !== 'full_game' && (
                <Badge variant="outline" className="text-xs font-medium bg-purple-500/20 text-purple-300 border-purple-500/30">
                  {prediction.period === '1st_quarter' ? '1st Quarter' : '1st Half'}
                </Badge>
              )}
              {isPlayerProp && (
                <Badge variant="outline" className="text-xs font-medium bg-slate-500/20 text-slate-300 border-slate-500/30">
                  {prediction.teamAbbr} vs {prediction.opponentAbbr}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Bookmark button */}
          <Button
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-slate-700/50 transition-colors"
            onClick={() => onBookmark?.(prediction.id)}
          >
            {prediction.isBookmarked ? (
              <BookmarkCheck className="w-4 h-4 text-blue-400" />
            ) : (
              <Bookmark className="w-4 h-4 text-slate-400 hover:text-blue-400 transition-colors" />
            )}
          </Button>
        </div>
        
        {/* Odds display */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {isPlayerProp ? (
            <>
              <div className="bg-gradient-to-r from-emerald-900/50 to-emerald-800/30 rounded-lg p-4 border border-emerald-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">Over</span>
                </div>
                <p className="text-xl font-bold text-emerald-100">
                  {formatOdds(prediction.overOdds)}
                </p>
              </div>
              <div className="bg-gradient-to-r from-red-900/50 to-red-800/30 rounded-lg p-4 border border-red-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-bold text-red-300 uppercase tracking-wide">Under</span>
                </div>
                <p className="text-xl font-bold text-red-100">
                  {formatOdds(prediction.underOdds)}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/30 rounded-lg p-4 border border-blue-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-blue-300 uppercase tracking-wide">
                    {prediction.homeTeamAbbr}
                  </span>
                </div>
                <p className="text-xl font-bold text-blue-100">
                  {formatOdds(prediction.homeOdds)}
                </p>
              </div>
              <div className="bg-gradient-to-r from-red-900/50 to-red-800/30 rounded-lg p-4 border border-red-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-bold text-red-300 uppercase tracking-wide">
                    {prediction.awayTeamAbbr}
                  </span>
                </div>
                <p className="text-xl font-bold text-red-100">
                  {formatOdds(prediction.awayOdds)}
                </p>
              </div>
            </>
          )}
        </div>
        
        {/* AI Analysis Section */}
        <div className="space-y-4 mb-6">
          {/* Confidence and EV Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-slate-200">AI Confidence</span>
              </div>
              <span className="text-sm font-bold text-white">{confidence.toFixed(1)}%</span>
            </div>
            <Progress 
              value={confidence} 
              className="h-3 bg-slate-700"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-slate-200">Expected Value</span>
              </div>
              <span className={cn(
                "text-sm font-bold",
                (prediction.expectedValue || 0) >= 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {formatPercentage(prediction.expectedValue || 0)}
              </span>
            </div>
            <Progress 
              value={expectedValue} 
              className="h-3 bg-slate-700"
            />
          </div>
        </div>
        
        {/* Recommendation */}
        <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-slate-800/50 to-slate-700/30 border border-slate-600/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getRecommendationIcon(prediction.recommendation)}
              <span className="text-sm font-semibold text-slate-200">AI Recommendation</span>
            </div>
            <Badge className={cn("text-xs font-bold px-3 py-1", getRiskColor(riskLevel))}>
              <span className="capitalize">{prediction.recommendation?.replace('_', ' ') || 'Neutral'}</span>
            </Badge>
          </div>
        </div>
        
        {/* Expandable detailed analysis */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all mb-4"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Brain className="w-4 h-4 mr-2" />
          <span className="text-sm font-medium">
            {isExpanded ? 'Hide Detailed Analysis' : 'View Detailed Analysis'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 ml-2" />
          ) : (
            <ChevronDown className="w-4 h-4 ml-2" />
          )}
        </Button>
        
        {isExpanded && (
          <div className="space-y-4 animate-in slide-in-from-top-2 duration-500">
            <div className="border-t border-slate-700/50 pt-4">
              <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                Detailed Analysis Factors
              </h4>
              
              <div className="space-y-3">
                {detailedAnalysis.map((factor, index) => (
                  <div key={index} className={cn(
                    "p-3 rounded-lg border",
                    factor.impact === 'high' && "bg-emerald-500/10 border-emerald-500/30",
                    factor.impact === 'medium' && "bg-blue-500/10 border-blue-500/30",
                    factor.impact === 'low' && "bg-amber-500/10 border-amber-500/30"
                  )}>
                    <div className="flex items-start gap-3">
                      {factor.icon}
                      <div className="flex-1">
                        <h5 className="text-sm font-semibold text-white mb-1">
                          {factor.title}
                        </h5>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {factor.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Additional market info */}
            {!isPlayerProp && (prediction.spread || prediction.total) && (
              <div className="grid grid-cols-2 gap-3">
                {prediction.spread && (
                  <div className="bg-gradient-to-r from-purple-900/50 to-purple-800/30 rounded-lg p-3 border border-purple-500/30">
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">Spread</span>
                    <p className="text-lg font-bold text-purple-100">
                      {prediction.spread > 0 ? '+' : ''}{prediction.spread}
                    </p>
                  </div>
                )}
                {prediction.total && (
                  <div className="bg-gradient-to-r from-indigo-900/50 to-indigo-800/30 rounded-lg p-3 border border-indigo-500/30">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide">Total</span>
                    <p className="text-lg font-bold text-indigo-100">
                      {prediction.total}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Last updated */}
            <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-700/50">
              <Clock className="w-3 h-3" />
              <span>Updated: {new Date(prediction.lastUpdate || '').toLocaleTimeString()}</span>
            </div>
            
            {/* Live indicator */}
            {prediction.available && (
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-emerald-400">Live Market</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
