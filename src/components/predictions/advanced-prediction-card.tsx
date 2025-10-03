import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Lightbulb,
  Sparkles,
  Eye,
  ArrowRight,
  Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { aiPredictionFactors } from '@/services/ai-prediction-factors';

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
  onAdvancedAnalysisClick?: (prediction: any) => void;
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
    
    if (prediction.propType && prediction.propType.includes('Touchdown')) {
      analysis.push({
        icon: <Target className="w-4 h-4 text-orange-400" />,
        title: "Red Zone Opportunity",
        description: "Team's red zone efficiency and player's target share in scoring situations analyzed.",
        impact: "high"
      });
    }
    
    if (prediction.propType && prediction.propType.includes('Yard')) {
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
  if (prediction.period && prediction.period !== 'full_game') {
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
  onBookmark,
  onAdvancedAnalysisClick
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const riskLevel = getRiskLevel(prediction);
  const confidence = (prediction.confidence || 0) * 100;
  const expectedValue = Math.abs((prediction.expectedValue || 0) * 100);
  
  // Use AI prediction factors service for advanced analysis
  const aiFactors = aiPredictionFactors.getFactorsForMarket(
    prediction.marketType, 
    prediction.period
  );
  const weightedConfidence = aiPredictionFactors.calculateWeightedConfidence(aiFactors);
  const factorInsights = aiPredictionFactors.generateFactorInsights(aiFactors, prediction);
  
  const isPlayerProp = prediction.marketType === 'player-prop';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        duration: 0.6
      }}
      className="group relative"
    >
      <Card 
        className={cn(
          "relative overflow-hidden transition-all duration-500",
          "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
          "border border-slate-700/50 shadow-2xl shadow-slate-900/50",
          "hover:shadow-2xl hover:shadow-blue-500/25",
          "hover:border-blue-500/40"
        )}
      >
        {/* Animated gradient overlay */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent"
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        
        {/* Glowing border effect */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 opacity-0 rounded-lg blur-sm"
          whileHover={{ opacity: 0.8 }}
          transition={{ duration: 0.3 }}
        />
        
        <CardContent className="p-6 relative z-10">
          {/* Header with enhanced typography */}
          <motion.div 
            className="flex items-start justify-between mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex-1">
              {isPlayerProp ? (
                <motion.div 
                  className="flex items-center gap-4 mb-4"
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <motion.div 
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/40"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    {prediction.playerName?.charAt(0) || 'P'}
                  </motion.div>
                  <div>
                    <h3 className="font-black text-2xl text-white tracking-tight bg-gradient-to-r from-white to-slate-200 bg-clip-text">
                      {prediction.playerName}
                    </h3>
                    <p className="text-base text-slate-300 font-semibold mt-1">
                      {prediction.propType} <span className="text-blue-400 font-bold">{prediction.line}</span>
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  className="flex items-center gap-6 mb-4"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="text-center">
                    <motion.div 
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/40"
                      whileHover={{ scale: 1.1 }}
                    >
                      {prediction.homeTeamAbbr}
                    </motion.div>
                    <p className="text-sm text-slate-200 mt-2 font-bold">{prediction.homeTeamAbbr}</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <motion.span 
                      className="text-lg text-slate-300 font-black uppercase tracking-wider"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      VS
                    </motion.span>
                    <Badge className="mt-2 bg-purple-500/20 text-purple-300 border-purple-500/30">
                      {prediction.period === 'full_game' ? 'Full Game' : 
                       prediction.period === '1st_quarter' ? '1st Quarter' : '1st Half'}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <motion.div 
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-red-500/40"
                      whileHover={{ scale: 1.1 }}
                    >
                      {prediction.awayTeamAbbr}
                    </motion.div>
                    <p className="text-sm text-slate-200 mt-2 font-bold">{prediction.awayTeamAbbr}</p>
                  </div>
                </motion.div>
              )}
              
              {/* Enhanced market badges */}
              <motion.div 
                className="flex items-center gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Badge className="text-sm font-bold bg-blue-500/30 text-blue-200 border-blue-400/50 px-4 py-1">
                  <Cpu className="w-3 h-3 mr-1" />
                  {isPlayerProp ? 'PLAYER PROP' : prediction.marketType?.toUpperCase()}
                </Badge>
                {isPlayerProp && (
                  <Badge className="text-sm font-bold bg-slate-500/30 text-slate-200 border-slate-400/50 px-4 py-1">
                    <Users className="w-3 h-3 mr-1" />
                    {prediction.teamAbbr} vs {prediction.opponentAbbr}
                  </Badge>
                )}
              </motion.div>
            </div>
            
            {/* Enhanced bookmark button */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="p-3 hover:bg-slate-700/50 transition-all rounded-full"
                onClick={() => onBookmark?.(prediction.id)}
              >
                {prediction.isBookmarked ? (
                  <BookmarkCheck className="w-5 h-5 text-blue-400" />
                ) : (
                  <Bookmark className="w-5 h-5 text-slate-400 hover:text-blue-400 transition-colors" />
                )}
              </Button>
            </motion.div>
          </motion.div>
          
          {/* Enhanced odds display with animations */}
          <motion.div 
            className="grid grid-cols-2 gap-4 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {isPlayerProp ? (
              <>
                <motion.div 
                  className="bg-gradient-to-br from-emerald-900/60 to-emerald-800/40 rounded-xl p-5 border border-emerald-500/40 shadow-lg shadow-emerald-500/20"
                  whileHover={{ scale: 1.05, rotateY: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-black text-emerald-300 uppercase tracking-wider">OVER</span>
                  </div>
                  <p className="text-2xl font-black text-emerald-100">
                    {formatOdds(prediction.overOdds)}
                  </p>
                </motion.div>
                <motion.div 
                  className="bg-gradient-to-br from-red-900/60 to-red-800/40 rounded-xl p-5 border border-red-500/40 shadow-lg shadow-red-500/20"
                  whileHover={{ scale: 1.05, rotateY: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingDown className="w-5 h-5 text-red-400" />
                    <span className="text-sm font-black text-red-300 uppercase tracking-wider">UNDER</span>
                  </div>
                  <p className="text-2xl font-black text-red-100">
                    {formatOdds(prediction.underOdds)}
                  </p>
                </motion.div>
              </>
            ) : (
              <>
                <motion.div 
                  className="bg-gradient-to-br from-blue-900/60 to-blue-800/40 rounded-xl p-5 border border-blue-500/40 shadow-lg shadow-blue-500/20"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-black text-blue-300 uppercase tracking-wider">
                      {prediction.homeTeamAbbr}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-blue-100">
                    {formatOdds(prediction.homeOdds)}
                  </p>
                </motion.div>
                <motion.div 
                  className="bg-gradient-to-br from-red-900/60 to-red-800/40 rounded-xl p-5 border border-red-500/40 shadow-lg shadow-red-500/20"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="w-5 h-5 text-red-400" />
                    <span className="text-sm font-black text-red-300 uppercase tracking-wider">
                      {prediction.awayTeamAbbr}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-red-100">
                    {formatOdds(prediction.awayOdds)}
                  </p>
                </motion.div>
              </>
            )}
          </motion.div>
          
          {/* Enhanced AI Analysis Section */}
          <motion.div 
            className="space-y-5 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {/* Confidence Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <Shield className="w-5 h-5 text-blue-400" />
                  </motion.div>
                  <span className="text-base font-bold text-slate-200">AI CONFIDENCE</span>
                </div>
                <span className="text-lg font-black text-white bg-blue-500/20 px-3 py-1 rounded-full">
                  {confidence.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={confidence} 
                className="h-4 bg-slate-700 border border-slate-600"
              />
            </div>
            
            {/* Expected Value Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <span className="text-base font-bold text-slate-200">EXPECTED VALUE</span>
                </div>
                <span className={cn(
                  "text-lg font-black px-3 py-1 rounded-full",
                  (prediction.expectedValue || 0) >= 0 
                    ? "text-emerald-400 bg-emerald-500/20" 
                    : "text-red-400 bg-red-500/20"
                )}>
                  {formatPercentage(prediction.expectedValue || 0)}
                </span>
              </div>
              <Progress 
                value={expectedValue} 
                className="h-4 bg-slate-700 border border-slate-600"
              />
            </div>
          </motion.div>
          
          {/* Enhanced Recommendation */}
          <motion.div 
            className="mb-6 p-5 rounded-xl bg-gradient-to-r from-slate-800/60 to-slate-700/40 border border-slate-600/50 shadow-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getRecommendationIcon(prediction.recommendation)}
                <span className="text-base font-bold text-slate-200">AI RECOMMENDATION</span>
              </div>
              <Badge className={cn("text-sm font-black px-4 py-2", getRiskColor(riskLevel))}>
                <span className="capitalize">
                  {prediction.recommendation ? prediction.recommendation.replace('_', ' ') : 'NEUTRAL'}
                </span>
              </Badge>
            </div>
          </motion.div>
          
          {/* Enhanced expandable analysis */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <Button
              variant="ghost"
              size="lg"
              className="w-full text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all mb-4 p-4 rounded-xl border border-slate-600/50"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Brain className="w-5 h-5 mr-3" />
              <span className="text-base font-bold">
                {isExpanded ? 'HIDE ADVANCED ANALYSIS' : 'VIEW ADVANCED ANALYSIS'}
              </span>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="w-5 h-5 ml-3" />
              </motion.div>
            </Button>
            
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="space-y-5"
                >
                  <div className="border-t border-slate-700/50 pt-5">
                    <h4 className="text-lg font-black text-white mb-4 flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                      ADVANCED AI FACTORS
                    </h4>
                    
                    <div className="space-y-4">
                      {factorInsights.slice(0, 4).map((insight, index) => (
                        <motion.div 
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 rounded-lg bg-gradient-to-r from-slate-800/60 to-slate-700/40 border border-slate-600/50"
                        >
                          <div className="flex items-start gap-4">
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity, delay: index * 0.5 }}
                              className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1"
                            >
                              <Eye className="w-4 h-4 text-blue-400" />
                            </motion.div>
                            <div className="flex-1">
                              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                                {insight}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Additional market info */}
                  {!isPlayerProp && (prediction.spread || prediction.total) && (
                    <motion.div 
                      className="grid grid-cols-2 gap-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                    >
                      {prediction.spread && (
                        <div className="bg-gradient-to-br from-purple-900/60 to-purple-800/40 rounded-xl p-4 border border-purple-500/40">
                          <span className="text-sm font-black text-purple-300 uppercase tracking-wider">SPREAD</span>
                          <p className="text-xl font-black text-purple-100 mt-2">
                            {prediction.spread > 0 ? '+' : ''}{prediction.spread}
                          </p>
                        </div>
                      )}
                      {prediction.total && (
                        <div className="bg-gradient-to-br from-indigo-900/60 to-indigo-800/40 rounded-xl p-4 border border-indigo-500/40">
                          <span className="text-sm font-black text-indigo-300 uppercase tracking-wider">TOTAL</span>
                          <p className="text-xl font-black text-indigo-100 mt-2">
                            {prediction.total}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                  
                  {/* Footer info */}
                  <motion.div 
                    className="flex items-center justify-between text-sm text-slate-400 pt-4 border-t border-slate-700/50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Updated: {new Date(prediction.lastUpdate || '').toLocaleTimeString()}</span>
                    </div>
                    
                    {prediction.available && (
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span className="text-emerald-400 font-medium">LIVE</span>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          {/* Advanced AI Analysis Button */}
          {onAdvancedAnalysisClick && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                className={cn(
                  "w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500",
                  "text-white font-bold py-3 px-4 rounded-xl text-base",
                  "transition-all duration-300 ease-out",
                  "hover:shadow-lg hover:shadow-purple-500/25",
                  "border border-purple-500/50",
                  "group"
                )}
                onClick={() => onAdvancedAnalysisClick(prediction)}
              >
                <Sparkles className="h-5 w-5 mr-3" />
                Advanced AI Analysis
                <ArrowRight className="h-5 w-5 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
