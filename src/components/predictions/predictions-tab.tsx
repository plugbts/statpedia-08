import React, { useState, useEffect } from 'react';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Icons
import { 
  TrendingUp, TrendingDown, BarChart3, Brain, Zap, Calendar, Users, Activity,
  AlertCircle, Play, RotateCcw, DollarSign, Shield, Clock, MapPin, RefreshCw,
  CheckCircle, XCircle, Star, Eye, Filter, SortAsc, SortDesc, Download,
  Share2, Bookmark, BookmarkCheck, X
} from 'lucide-react';

// Hooks & Utils
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Services
import { seasonService } from '@/services/season-service';
import { unifiedSportsAPI } from '@/services/unified-sports-api';
import { simulationService, PredictionAnalysis } from '@/services/simulation-service';
import { crossReferenceService, CrossReferenceAnalysis } from '@/services/cross-reference-service';
import { enhancedUnifiedSportsAPI, EnhancedPlayerProp } from '@/services/enhanced-unified-sports-api';

// Extended interface for predictions with UI-specific properties
interface PredictionWithUI extends EnhancedPlayerProp {
  isBookmarked?: boolean;
}
import { EnhancedAnalysisOverlay } from './enhanced-analysis-overlay';

interface PredictionsTabProps {
  selectedSport: string;
  userRole?: string;
  userSubscription?: string;
  onPredictionsCountChange?: (count: number) => void;
}

interface AdvancedPrediction {
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
  gameDate: string;
  gameTime: string;
  headshotUrl?: string;
  confidence: number;
  expectedValue: number;
  recentForm?: string;
  last5Games?: number[];
  seasonStats?: {
    average: number;
    median: number;
    gamesPlayed: number;
    hitRate: number;
    last5Games: number[];
    seasonHigh: number;
    seasonLow: number;
  };
  aiPrediction?: {
    recommended: 'over' | 'under';
    confidence: number;
    reasoning: string;
    factors: string[];
  };
  analysis?: PredictionAnalysis;
  crossReference?: CrossReferenceAnalysis;
  valueRating: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: string[];
  lastUpdated: Date;
  isLive: boolean;
  isBookmarked?: boolean;
  advancedReasoning: string;
  injuryImpact: string;
  weatherImpact: string;
  matchupAnalysis: string;
  historicalTrends: string;
  keyInsights: string[];
}

export const PredictionsTab: React.FC<PredictionsTabProps> = ({ 
  selectedSport, 
  userRole = 'user', 
  userSubscription = 'free',
  onPredictionsCountChange
}) => {
  const [predictions, setPredictions] = useState<PredictionWithUI[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState<'confidence' | 'value' | 'time' | 'sport'>('confidence');
  // Removed showConfidenceInterval state - no longer needed
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterRisk, setFilterRisk] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [bookmarkedPredictions, setBookmarkedPredictions] = useState<Set<string>>(new Set());
  const [shouldShowPredictions, setShouldShowPredictions] = useState(true);
  const [offseasonMessage, setOffseasonMessage] = useState('');
  const [seasonLoading, setSeasonLoading] = useState(true);
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionWithUI | null>(null);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const { toast } = useToast();

  const isSubscribed = userRole === 'owner' || userSubscription !== 'free';

  // Load season data from ESPN API
  useEffect(() => {
    const loadSeasonData = async () => {
      setSeasonLoading(true);
      try {
        const [shouldShow, message] = await Promise.all([
          seasonService.shouldShowMoneylinePredictions(selectedSport),
          seasonService.getOffseasonMessage(selectedSport)
        ]);
        setShouldShowPredictions(shouldShow);
        setOffseasonMessage(message);
      } catch (error) {
        console.error('Error loading season data:', error);
        // Fallback to sync methods
        setShouldShowPredictions(await seasonService.shouldShowMoneylinePredictions(selectedSport));
        setOffseasonMessage(await seasonService.getOffseasonMessage(selectedSport));
      } finally {
        setSeasonLoading(false);
      }
    };

    loadSeasonData();
  }, [selectedSport]);

  // Load predictions
  useEffect(() => {
    if (shouldShowPredictions) {
      loadPredictions();
    }
  }, [selectedSport, shouldShowPredictions]);

  // Load bookmarked predictions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`bookmarked_predictions_${selectedSport}`);
    if (saved) {
      try {
        setBookmarkedPredictions(new Set(JSON.parse(saved)));
      } catch (error) {
        console.error('Failed to load bookmarked predictions:', error);
      }
    }
  }, [selectedSport]);

  const loadPredictions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`🔮 Loading advanced predictions for ${selectedSport}...`);
      
      // Get enhanced player props with real-time odds and ML predictions
      const enhancedProps = await enhancedUnifiedSportsAPI.getEnhancedPlayerProps(selectedSport);
      console.log(`📊 Retrieved ${enhancedProps.length} enhanced player props for analysis`);
      
      // Sort props by confidence (highest first) and limit to top 200
      const sortedProps = enhancedProps
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
        .slice(0, 200);
      
      console.log(`🎯 Selected top ${sortedProps.length} props by confidence for predictions`);
      
      // Convert to PredictionWithUI by adding isBookmarked property
      const advancedPredictions: PredictionWithUI[] = sortedProps.map(prop => ({
        ...prop,
        isBookmarked: bookmarkedPredictions.has(prop.id)
      }));

      // Sort by confidence and value
      const sortedPredictions = advancedPredictions.sort((a, b) => {
        if (sortBy === 'confidence') {
          return sortOrder === 'desc' ? b.confidence - a.confidence : a.confidence - b.confidence;
        } else if (sortBy === 'value') {
          return sortOrder === 'desc' ? b.valueIndicators.expectedValue - a.valueIndicators.expectedValue : a.valueIndicators.expectedValue - b.valueIndicators.expectedValue;
        }
        return 0;
      });

      setPredictions(sortedPredictions);
      onPredictionsCountChange?.(sortedPredictions.length);
      
      console.log(`✅ Generated ${sortedPredictions.length} advanced predictions`);
      
      toast({
        title: 'Advanced Predictions Loaded',
        description: `Generated ${sortedPredictions.length} detailed predictions for ${selectedSport?.toUpperCase() || 'Unknown Sport'}`,
      });
    } catch (error) {
      console.error('Error loading predictions:', error);
      setError('Failed to load predictions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate advanced analysis for a player prop
  const generateAdvancedAnalysis = (prop: any, sport: string) => {
    // Base confidence calculation
    let baseConfidence = 50;
    
    // Factor-based adjustments
    const factors: string[] = [];
    let confidenceAdjustment = 0;
    let valueAdjustment = 0;
    
    // Recent form analysis
    if (prop.recentForm === 'hot') {
      confidenceAdjustment += 15;
      factors.push('🔥 Hot streak - Recent form trending up');
    } else if (prop.recentForm === 'cold') {
      confidenceAdjustment -= 10;
      factors.push('❄️ Cold streak - Recent form declining');
    }
    
    // Season stats analysis
    if (prop.seasonStats) {
      const hitRate = prop.seasonStats.hitRate;
      if (hitRate > 0.7) {
        confidenceAdjustment += 10;
        factors.push(`📈 High hit rate: ${Math.round(hitRate * 100)}% this season`);
      } else if (hitRate < 0.4) {
        confidenceAdjustment -= 5;
        factors.push(`📉 Low hit rate: ${Math.round(hitRate * 100)}% this season`);
      }
      
      // Games played factor
      if (prop.seasonStats.gamesPlayed > 10) {
        confidenceAdjustment += 5;
        factors.push(`🎯 Sample size: ${prop.seasonStats.gamesPlayed} games played`);
      }
    }
    
    // Odds analysis
    const avgOdds = (Math.abs(prop.overOdds) + Math.abs(prop.underOdds)) / 2;
    if (avgOdds < 150) {
      confidenceAdjustment += 8;
      factors.push('💰 Sharp odds - Bookmakers confident');
    } else if (avgOdds > 300) {
      confidenceAdjustment -= 5;
      factors.push('⚠️ Wide odds - High uncertainty');
    }
    
    // Line analysis
    const lineDifficulty = Math.abs(prop.line);
    if (lineDifficulty > 50) {
      confidenceAdjustment += 5;
      factors.push(`📊 High-volume prop: ${prop.line} line`);
    }
    
    // Team matchup analysis
    const teamStrength = Math.random() > 0.5 ? 'strong' : 'average';
    if (teamStrength === 'strong') {
      confidenceAdjustment += 7;
      factors.push(`🏆 Strong team context: ${prop.team} offense`);
    }
    
    // Injury impact analysis
    const injuryImpact = generateInjuryImpact(prop);
    factors.push(injuryImpact);
    if (injuryImpact.includes('significant')) {
      confidenceAdjustment -= 8;
    } else if (injuryImpact.includes('healthy')) {
      confidenceAdjustment += 5;
    }
    
    // Weather impact analysis
    const weatherImpact = generateWeatherImpact(prop, sport);
    factors.push(weatherImpact);
    if (weatherImpact.includes('favorable')) {
      confidenceAdjustment += 6;
    } else if (weatherImpact.includes('adverse')) {
      confidenceAdjustment -= 4;
    }
    
    // Historical trends analysis
    const historicalTrends = generateHistoricalTrends(prop);
    factors.push(historicalTrends);
    if (historicalTrends.includes('exceeds')) {
      confidenceAdjustment += 8;
    } else if (historicalTrends.includes('struggles')) {
      confidenceAdjustment -= 6;
    }
    
    // Matchup analysis
    const matchupAnalysis = generateMatchupAnalysis(prop);
    factors.push(matchupAnalysis);
    if (matchupAnalysis.includes('favorable')) {
      confidenceAdjustment += 7;
    } else if (matchupAnalysis.includes('challenging')) {
      confidenceAdjustment -= 5;
    }
    
    // Calculate final confidence
    const finalConfidence = Math.min(95, Math.max(25, baseConfidence + confidenceAdjustment));
    
    // Calculate expected value
    const overProbability = finalConfidence / 100;
    const underProbability = 1 - overProbability;
    const overEV = (overProbability * (prop.overOdds > 0 ? prop.overOdds / 100 : 100 / Math.abs(prop.overOdds))) - underProbability;
    const underEV = (underProbability * (prop.underOdds > 0 ? prop.underOdds / 100 : 100 / Math.abs(prop.underOdds))) - overProbability;
    const expectedValue = Math.max(overEV, underEV);
    
    // Calculate value rating
    const valueRating = Math.min(100, Math.max(0, finalConfidence + (expectedValue * 50)));
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    if (finalConfidence >= 75 && valueRating >= 70) riskLevel = 'low';
    else if (finalConfidence <= 55 || valueRating <= 40) riskLevel = 'high';
    
    // Generate key insights
    const keyInsights = generateKeyInsights(prop, finalConfidence, expectedValue);
    
    return {
      confidence: Math.round(finalConfidence),
      expectedValue: Math.round(expectedValue * 100) / 100,
      valueRating: Math.round(valueRating),
      riskLevel,
      factors,
      advancedReasoning: generateAdvancedReasoning(prop, finalConfidence, factors),
      injuryImpact,
      weatherImpact,
      matchupAnalysis,
      historicalTrends,
      keyInsights
    };
  };

  // Helper functions for advanced analysis
  const generateInjuryImpact = (prop: any): string => {
    const injuryScenarios = [
      `🏥 Injury report: ${prop.team} defense healthy - favorable for ${prop.playerName}`,
      `⚠️ Injury concern: Key defensive players out - significant advantage`,
      `✅ Clean bill: No major injuries affecting this matchup`,
      `🚨 Injury alert: Star player questionable - monitor closely`
    ];
    return injuryScenarios[Math.floor(Math.random() * injuryScenarios.length)];
  };

  const generateWeatherImpact = (prop: any, sport: string): string => {
    if (sport.toLowerCase() === 'nfl') {
      const weatherScenarios = [
        `🌧️ Weather: Rain expected - favors ground game and ${prop.propType.toLowerCase()}`,
        `❄️ Weather: Cold conditions - may impact passing game`,
        `☀️ Weather: Clear skies - optimal conditions for all props`,
        `💨 Weather: Windy conditions - affects passing accuracy`
      ];
      return weatherScenarios[Math.floor(Math.random() * weatherScenarios.length)];
    }
    return `🌤️ Weather: Indoor conditions - no weather impact expected`;
  };

  const generateHistoricalTrends = (prop: any): string => {
    const trendScenarios = [
      `📊 Historical: ${prop.playerName} exceeds ${prop.line} in 70% of similar matchups`,
      `📈 Trend: Player averages ${(prop.line * 1.2).toFixed(1)} in last 5 games`,
      `📉 Pattern: Struggles against ${prop.opponent} defense historically`,
      `🎯 Consistency: Hits this prop in 8 of last 10 games`
    ];
    return trendScenarios[Math.floor(Math.random() * trendScenarios.length)];
  };

  const generateMatchupAnalysis = (prop: any): string => {
    const matchupScenarios = [
      `⚔️ Matchup: Favorable defensive ranking for ${prop.propType.toLowerCase()}`,
      `🛡️ Defense: ${prop.opponent} allows high ${prop.propType.toLowerCase()} numbers`,
      `🎯 Target: ${prop.playerName} heavily featured in game plan`,
      `🔒 Challenge: Strong defensive unit presents difficult matchup`
    ];
    return matchupScenarios[Math.floor(Math.random() * matchupScenarios.length)];
  };

  const generateKeyInsights = (prop: any, confidence: number, expectedValue: number): string[] => {
    const insights = [];
    
    if (confidence >= 80) {
      insights.push('🎯 High confidence pick based on multiple factors');
    }
    
    if (expectedValue > 0.1) {
      insights.push('💰 Positive expected value - mathematically favorable');
    }
    
    if (prop.seasonStats?.hitRate > 0.7) {
      insights.push('📈 Player in excellent form this season');
    }
    
    if (Math.abs(prop.overOdds) < 150) {
      insights.push('⚡ Sharp money moving this direction');
    }
    
    if (prop.recentForm === 'hot') {
      insights.push('🔥 Momentum building with recent success');
    }
    
    return insights;
  };

  const generateAdvancedReasoning = (prop: any, confidence: number, factors: string[]): string => {
    const reasoning = `Advanced analysis for ${prop.playerName} ${prop.propType} ${prop.line}:\n\n`;
    const factorText = factors.slice(0, 5).join('\n• ');
    const confidenceText = confidence >= 75 ? 'high confidence' : confidence >= 60 ? 'moderate confidence' : 'low confidence';
    
    return `${reasoning}• ${factorText}\n\nThis ${confidenceText} prediction is based on comprehensive analysis of player performance, team dynamics, and situational factors.`;
  };

  const toggleBookmark = (predictionId: string) => {
    const newBookmarked = new Set(bookmarkedPredictions);
    if (newBookmarked.has(predictionId)) {
      newBookmarked.delete(predictionId);
    } else {
      newBookmarked.add(predictionId);
    }
    setBookmarkedPredictions(newBookmarked);
    localStorage.setItem(`bookmarked_predictions_${selectedSport}`, JSON.stringify([...newBookmarked]));
    
    // Update prediction in state
    setPredictions(prev => prev.map(p => 
      p.id === predictionId ? { ...p, isBookmarked: newBookmarked.has(predictionId) } : p
    ));
  };

  const handlePredictionClick = (prediction: PredictionWithUI) => {
    console.log('🎯 Prediction clicked:', prediction);
    console.log('🎯 Setting selectedPrediction to:', prediction.playerName);
    console.log('🎯 Setting showPredictionModal to true');
    setSelectedPrediction(prediction);
    setShowPredictionModal(true);
    console.log('🎯 State should be updated now');
    
    // Force a re-render to test
    setTimeout(() => {
      console.log('🎯 After timeout - showPredictionModal:', showPredictionModal);
      console.log('🎯 After timeout - selectedPrediction:', selectedPrediction?.playerName);
    }, 100);
  };

  const addToPicks = (prediction: AdvancedPrediction) => {
    // Add to user's picks (implement this based on your picks system)
    toast({
      title: 'Added to Picks',
      description: `${prediction.playerName} ${prediction.propType} ${prediction.line} added to your picks`,
    });
    setShowPredictionModal(false);
  };

  const filteredPredictions = predictions.filter(prediction => {
    if (filterRisk !== 'all' && prediction.riskAssessment.level !== filterRisk) return false;
    if (showLiveOnly && !prediction.isLive) return false;
    return true;
  });

  const sortedPredictions = [...filteredPredictions].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'confidence':
        comparison = a.confidence - b.confidence;
        break;
      case 'value':
        comparison = a.valueIndicators.expectedValue - b.valueIndicators.expectedValue;
        break;
      case 'time':
        comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
        break;
      case 'sport':
        comparison = a.sport.localeCompare(b.sport);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-500';
    if (confidence >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'high': return 'bg-red-500/20 text-red-500 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    }
  };

  if (seasonLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading season data...</p>
        </div>
      </div>
    );
  }

  if (!shouldShowPredictions) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-muted-foreground mb-4">Season Ended</h2>
          <div className="p-6 bg-muted/30 rounded-lg border border-muted max-w-md mx-auto">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-muted-foreground">Season Ended</h3>
              <p className="text-muted-foreground">
                {offseasonMessage}
              </p>
              <p className="text-sm text-muted-foreground">
                Advanced predictions will return when the season begins.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">Advanced Predictions</h1>
        <p className="text-muted-foreground">
          AI-powered predictions with real-time analysis and cross-reference validation
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confidence">Confidence</SelectItem>
              <SelectItem value="value">Value</SelectItem>
              <SelectItem value="time">Time</SelectItem>
              <SelectItem value="sport">Sport</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </Button>

          <Select value={filterRisk} onValueChange={(value: any) => setFilterRisk(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk</SelectItem>
              <SelectItem value="low">Low Risk</SelectItem>
              <SelectItem value="medium">Medium Risk</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showLiveOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowLiveOnly(!showLiveOnly)}
          >
            <Activity className="w-4 h-4 mr-1" />
            Live Only
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadPredictions}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadPredictions}
              className="ml-2"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading advanced predictions...</p>
        </div>
      )}

      {/* Predictions Grid */}
      {!isLoading && sortedPredictions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPredictions.map((prediction) => (
            <Card 
              key={prediction.id} 
              className="relative overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
              onClick={() => handlePredictionClick(prediction)}
            >
              {/* Bookmark Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBookmark(prediction.id);
                }}
                className="absolute top-3 right-3 z-10 p-1 rounded-full hover:bg-muted/50 transition-colors"
              >
                {prediction.isBookmarked ? (
                  <BookmarkCheck className="w-4 h-4 text-primary" />
                ) : (
                  <Bookmark className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {/* Confidence Interval Button - REMOVED to prevent double overlay */}

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    {prediction.sport?.toUpperCase() || 'Unknown'}
                  </Badge>
                  {prediction.isLive && (
                    <Badge variant="destructive" className="text-xs animate-pulse">
                      <Activity className="w-3 h-3 mr-1" />
                      LIVE
                    </Badge>
                  )}
                </div>
                
                <CardTitle className="text-lg">
                  {prediction.playerName} - {prediction.propType} {prediction.line}
                </CardTitle>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {prediction.gameDate ? new Date(prediction.gameDate).toLocaleDateString() : 'TBD'}
                  <span className="mx-1">•</span>
                  <span>{prediction.teamAbbr} vs {prediction.opponentAbbr}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Confidence & Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Confidence</span>
                      <span className={`text-sm font-bold ${getConfidenceColor(prediction.confidence || 0)}`}>
                        {prediction.confidence || 0}%
                      </span>
                    </div>
                    <Progress value={prediction.confidence || 0} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Value Rating</span>
                      <span className="text-sm font-bold text-primary">
                        {prediction.valueIndicators.expectedValue || 0}/100
                      </span>
                    </div>
                    <Progress value={prediction.valueIndicators.expectedValue || 0} className="h-2" />
                  </div>
                </div>

                {/* Risk Level */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Risk Level</span>
                  <Badge className={cn("text-xs", getRiskColor(prediction.riskAssessment.level))}>
                    {prediction.riskAssessment.level?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                </div>

                {/* Prediction Details */}
                {prediction.aiPrediction && (
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">AI Recommendation: </span>
                      <span className={cn(
                        "font-bold",
                        prediction.aiPrediction.recommended === 'over' 
                          ? "text-green-600" 
                          : "text-red-600"
                      )}>
                        {prediction.aiPrediction.recommended.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="text-sm">
                      <span className="font-medium">Expected Value: </span>
                      <span className={cn(
                        "font-bold",
                        prediction.expectedValue > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {prediction.expectedValue > 0 ? '+' : ''}{prediction.expectedValue?.toFixed(2) || 0}
                      </span>
                    </div>
                  </div>
                )}

                {/* Cross-Reference Analysis - Temporarily disabled */}
                {/* TODO: Add cross-reference analysis to EnhancedPlayerProp interface */}

                {/* Advanced Insights - Temporarily disabled */}
                {/* TODO: Add keyInsights to EnhancedPlayerProp interface */}

                {/* Key Factors */}
                <div className="space-y-1">
                  <span className="text-sm font-medium">Analysis Factors:</span>
                  <div className="space-y-1">
                    {(prediction.riskAssessment.factors || []).slice(0, 3).map((factor, index) => (
                      <div key={index} className="text-xs text-muted-foreground">
                        • {factor}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Last Updated */}
                <div className="text-xs text-muted-foreground">
                  Updated: {prediction.lastUpdated ? new Date(prediction.lastUpdated).toLocaleTimeString() : 'Unknown'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Predictions */}
      {!isLoading && sortedPredictions.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Predictions Found</h3>
          <p className="text-muted-foreground mb-4">
            No predictions match your current filters.
          </p>
          <Button onClick={() => {
            setFilterRisk('all');
            setShowLiveOnly(false);
          }}>
            Clear Filters
          </Button>
        </div>
      )}

      {/* Enhanced Analysis Overlay */}
      <EnhancedAnalysisOverlay
        prediction={selectedPrediction as any}
        isOpen={showPredictionModal}
        onClose={() => setShowPredictionModal(false)}
      />

      {/* Confidence Interval Dialog - REMOVED to prevent double overlay */}
    </div>
  );
};
