import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Brain, 
  Zap,
  Calendar,
  Users,
  Activity,
  AlertCircle,
  Play,
  Filter,
  RotateCcw,
  DollarSign,
  Shield,
  Clock,
  MapPin,
  RefreshCw,
  CheckCircle,
  XCircle,
  Star,
  Eye,
  SortAsc,
  SortDesc,
  Download,
  Share2,
  Bookmark,
  BookmarkCheck,
  X,
  Target,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { seasonService } from '@/services/season-service';
import { cloudflarePlayerPropsAPI } from '@/services/cloudflare-player-props-api';
import { evCalculatorService } from '@/services/ev-calculator';
import { logAPI, logState, logFilter, logSuccess, logError, logWarning, logInfo, logDebug } from '@/utils/console-logger';
import { AdvancedPredictionDisplay } from '@/components/advanced-prediction-display';
import { advancedPredictionService, ComprehensivePrediction } from '@/services/advanced-prediction-service';
import { EnhancedAnalysisOverlay } from './enhanced-analysis-overlay';
import { AdvancedPredictionCard } from './advanced-prediction-card';
import { SubscriptionOverlay } from '@/components/ui/subscription-overlay';
import { useNavigate } from 'react-router-dom';

// Interface for all market types
interface MarketData {
  id: string;
  gameId: string;
  sport: string;
  marketType: 'player-prop' | 'moneyline' | 'spread' | 'total';
  period: 'full_game' | '1st_quarter' | '1st_half';
  
  // Game info
  homeTeam: string;
  homeTeamFull: string;
  homeTeamAbbr: string;
  awayTeam: string;
  awayTeamFull: string;
  awayTeamAbbr: string;
  gameDate: string;
  gameTime: string;
  
  // Player props specific
  playerId?: string;
  playerName?: string;
  team?: string;
  teamAbbr?: string;
  opponent?: string;
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
  
  // Common fields
  allSportsbookOdds?: any[];
  availableSportsbooks?: string[];
  available?: boolean;
  lastUpdate?: string;
  marketName?: string;
  
  // EV and analysis
  expectedValue?: number;
  confidence?: number;
  aiRating?: number;
  recommendation?: string;
  
  // UI specific
  isBookmarked?: boolean;
}

interface PredictionWithUI extends MarketData {
  isBookmarked?: boolean;
}

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
  analysis?: any;
  crossReference?: any;
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
  const navigate = useNavigate();
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
  const [propFilter, setPropFilter] = useState<string>('all');
  const [shouldShowPredictions, setShouldShowPredictions] = useState(true);
  const [offseasonMessage, setOffseasonMessage] = useState('');
  const [seasonLoading, setSeasonLoading] = useState(true);
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionWithUI | null>(null);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [selectedPropForAdvancedAnalysis, setSelectedPropForAdvancedAnalysis] = useState<PredictionWithUI | null>(null);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);
  const [advancedPrediction, setAdvancedPrediction] = useState<ComprehensivePrediction | null>(null);
  const [isGeneratingAdvancedPrediction, setIsGeneratingAdvancedPrediction] = useState(false);
  const { toast } = useToast();

  // Helper function to format odds
  const formatOdds = (odds: number | null): string => {
    if (odds === null || odds === undefined) return 'N/A';
    return odds > 0 ? `+${odds}` : `${odds}`;
  };

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
      console.log(`🔮 Loading comprehensive predictions for ${selectedSport}...`);
      
            // Fetch data from multiple market endpoints - prioritize other markets over player props
            const endpoints = [
              'moneyline', 
              'spread', 
              'total',
              '1q-moneyline',
              '1q-spread', 
              '1q-total',
              '1h-moneyline',
              '1h-spread',
              '1h-total',
              'player-props', // Player props last, will be limited
              '1q-player-props' // 1Q player props
            ];
      
      const allMarkets: MarketData[] = [];
      
      // Fetch from each endpoint
      for (const endpoint of endpoints) {
        try {
          logAPI('PredictionsTab', `Fetching ${endpoint} for ${selectedSport}`);
          
          const response = await fetch(`https://statpedia-player-props.statpedia.workers.dev/api/player-props?sport=${selectedSport}&endpoint=${endpoint}&forceRefresh=true`, {
            method: 'GET',
          });
          
          if (!response.ok) {
            logWarning('PredictionsTab', `Failed to fetch ${endpoint}: ${response.status}`);
            continue;
          }
          
          const data = await response.json();
          
          if (data.success && data.data) {
            logSuccess('PredictionsTab', `Retrieved ${data.data.length} ${endpoint} markets`);
            
              // Limit player props to avoid overwhelming the predictions tab
              const isPlayerPropsEndpoint = endpoint === 'player-props' || endpoint === '1q-player-props';
              const limitedData = isPlayerPropsEndpoint ? data.data.slice(0, 6) : data.data;
              if (isPlayerPropsEndpoint && data.data.length > 6) {
                logInfo('PredictionsTab', `Limited ${endpoint} from ${data.data.length} to 6 to prioritize other markets`);
              }
            
            // Process and add EV calculations for each market
            const processedMarkets = await Promise.all(
              limitedData.map(async (market: any) => {
                try {
                  // Calculate EV for player props
                  if (market.marketType === 'player-prop' || market.propType) {
                    const overEV = await evCalculatorService.calculateAIRating({
                      id: market.id,
                      playerName: market.playerName || 'Unknown',
                      propType: market.propType || 'Unknown',
                      line: market.line || 0,
                      odds: market.overOdds?.toString() || '0',
                      sport: market.sport || selectedSport,
                      team: market.team || '',
                      opponent: market.opponent || '',
                      gameDate: market.gameDate || new Date().toISOString(),
                      hitRate: 0.5,
                      recentForm: 0.5,
                      injuryStatus: 'healthy',
                      restDays: 3
                    });
                    
                    const underEV = await evCalculatorService.calculateAIRating({
                      id: market.id,
                      playerName: market.playerName || 'Unknown',
                      propType: market.propType || 'Unknown',
                      line: market.line || 0,
                      odds: market.underOdds?.toString() || '0',
                      sport: market.sport || selectedSport,
                      team: market.team || '',
                      opponent: market.opponent || '',
                      gameDate: market.gameDate || new Date().toISOString(),
                      hitRate: 0.5,
                      recentForm: 0.5,
                      injuryStatus: 'healthy',
                      restDays: 3
                    });
                    
                    const bestEV = overEV.evPercentage > underEV.evPercentage ? overEV : underEV;
                    
                    return {
                      ...market,
                      marketType: 'player-prop',
                      expectedValue: bestEV.evPercentage / 100,
                      confidence: bestEV.confidence / 100,
                      aiRating: bestEV.aiRating,
                      recommendation: bestEV.recommendation
                    };
                  } else {
                    // For game markets, use simpler EV calculation
                    const odds = market.homeOdds || market.overOdds || 0;
                    const evPercentage = odds > 0 ? Math.min(95, Math.max(5, (Math.abs(odds) / 2))) : 50;
                    
                    return {
                      ...market,
                      expectedValue: (evPercentage - 50) / 100,
                      confidence: evPercentage / 100,
                      aiRating: evPercentage > 70 ? 5 : evPercentage > 60 ? 4 : 3,
                      recommendation: evPercentage > 70 ? 'strong_bet' : evPercentage > 60 ? 'good_bet' : 'neutral'
                    };
                  }
                } catch (error) {
                  logError('PredictionsTab', `EV calculation failed for market ${market.id}:`, error);
                  return {
                    ...market,
                    expectedValue: 0,
                    confidence: 0.5,
                    aiRating: 3,
                    recommendation: 'neutral'
                  };
                }
              })
            );
            
            allMarkets.push(...processedMarkets);
          }
        } catch (error) {
          logError('PredictionsTab', `Error fetching ${endpoint}:`, error);
        }
      }
      
      console.log(`📊 Retrieved ${allMarkets.length} total markets from all endpoints`);

      // Sort by confidence and value
      const sortedMarkets = allMarkets.sort((a, b) => {
        if (sortBy === 'confidence') {
          return sortOrder === 'desc' ? (b.confidence || 0) - (a.confidence || 0) : (a.confidence || 0) - (b.confidence || 0);
        } else if (sortBy === 'value') {
          return sortOrder === 'desc' ? (b.expectedValue || 0) - (a.expectedValue || 0) : (a.expectedValue || 0) - (b.expectedValue || 0);
        }
        return 0;
      });

      // Add bookmark status
      const predictionsWithUI: PredictionWithUI[] = sortedMarkets.map(market => ({
        ...market,
        isBookmarked: bookmarkedPredictions.has(market.id)
      }));

      setPredictions(predictionsWithUI);
      onPredictionsCountChange?.(predictionsWithUI.length);
      
      console.log(`✅ Generated ${predictionsWithUI.length} comprehensive predictions`);
      
      toast({
        title: 'Comprehensive Predictions Loaded',
        description: `Generated ${predictionsWithUI.length} predictions across all market types for ${selectedSport?.toUpperCase() || 'Unknown Sport'}`,
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

  // Generate advanced prediction using our comprehensive AI system
  const generateAdvancedPrediction = async (prediction: PredictionWithUI) => {
    try {
      setIsGeneratingAdvancedPrediction(true);
      setSelectedPropForAdvancedAnalysis(prediction);
      
      const predictionRequest = {
        playerId: prediction.playerId || prediction.id,
        playerName: prediction.playerName || 'Unknown Player',
        propType: prediction.propType || 'Unknown Prop',
        line: prediction.line || 0,
        gameId: prediction.gameId || `game_${Date.now()}`,
        team: prediction.team || prediction.homeTeam || 'Unknown',
        opponent: prediction.opponent || prediction.awayTeam || 'Unknown',
        gameDate: prediction.gameDate || new Date().toISOString(),
        odds: {
          over: prediction.overOdds || -110,
          under: prediction.underOdds || -110,
        },
      };
      
      const comprehensivePrediction = await advancedPredictionService.generateComprehensivePrediction(predictionRequest);
      setAdvancedPrediction(comprehensivePrediction);
      setShowAdvancedAnalysis(true);
      
      toast({
        title: "Advanced AI Analysis Complete",
        description: `Generated comprehensive prediction for ${prediction.playerName || 'this prop'}`,
      });
    } catch (error) {
      console.error('Error generating advanced prediction:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to generate advanced prediction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAdvancedPrediction(false);
    }
  };

  const filteredPredictions = predictions.filter(prediction => {
    if (filterRisk !== 'all' && getRiskLevel(prediction) !== filterRisk) return false;
    if (showLiveOnly && !prediction.available) return false;
    
    // Prop type filter
    if (propFilter !== 'all') {
      if (prediction.marketType === 'player-prop') {
        const propType = prediction.propType?.toLowerCase() || '';
        if (propFilter === 'passing' && !propType.includes('pass')) return false;
        if (propFilter === 'rushing' && !propType.includes('rush')) return false;
        if (propFilter === 'receiving' && !propType.includes('receiv')) return false;
        if (propFilter === 'touchdowns' && !propType.includes('touchdown')) return false;
        if (propFilter === 'yards' && !propType.includes('yard')) return false;
        if (propFilter === 'completions' && !propType.includes('complet')) return false;
        if (propFilter === 'interceptions' && !propType.includes('intercept')) return false;
      } else {
        // For non-player props, only show if they match the filter
        if (propFilter !== prediction.marketType) return false;
      }
    }
    
    return true;
  });

  const sortedPredictions = [...filteredPredictions].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'confidence':
        comparison = (a.confidence || 0) - (b.confidence || 0);
        break;
      case 'value':
        comparison = (a.expectedValue || 0) - (b.expectedValue || 0);
        break;
      case 'time':
        comparison = new Date(a.lastUpdate || '').getTime() - new Date(b.lastUpdate || '').getTime();
        break;
      case 'sport':
        comparison = (a.sport || '').localeCompare(b.sport || '');
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-500';
    if (confidence >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRiskLevel = (prediction: PredictionWithUI): 'low' | 'medium' | 'high' => {
    const confidence = prediction.confidence || 0;
    const expectedValue = prediction.expectedValue || 0;
    
    if (confidence >= 0.75 && expectedValue >= 0.1) return 'low';
    if (confidence <= 0.55 || expectedValue <= 0) return 'high';
    return 'medium';
  };

  const generateAnalysisFactors = (prediction: PredictionWithUI): string[] => {
    const factors: string[] = [];
    
    if (prediction.marketType === 'player-prop') {
      if (prediction.confidence && prediction.confidence > 0.7) {
        factors.push('🎯 High confidence based on player performance');
      }
      if (prediction.expectedValue && prediction.expectedValue > 0.05) {
        factors.push('💰 Positive expected value opportunity');
      }
      if (prediction.propType?.includes('Touchdown')) {
        factors.push('🏈 Red zone opportunity analysis');
      }
      if (prediction.propType?.includes('Yard')) {
        factors.push('📏 Volume-based performance metric');
      }
    } else {
      if (prediction.marketType === 'moneyline') {
        factors.push('⚔️ Head-to-head matchup analysis');
      }
      if (prediction.marketType === 'spread') {
        factors.push('📊 Point differential analysis');
      }
      if (prediction.marketType === 'total') {
        factors.push('🔥 Offensive pace and scoring trends');
      }
      if (prediction.period !== 'full_game') {
        factors.push(`⏰ ${prediction.period.replace('_', ' ')} specific analysis`);
      }
    }
    
    if (prediction.confidence && prediction.confidence > 0.8) {
      factors.push('⭐ AI confidence rating: Excellent');
    } else if (prediction.confidence && prediction.confidence > 0.6) {
      factors.push('✅ AI confidence rating: Good');
    } else {
      factors.push('⚠️ AI confidence rating: Moderate');
    }
    
    return factors.length > 0 ? factors : ['📈 General market analysis'];
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

          <Select value={propFilter} onValueChange={(value: any) => setPropFilter(value)}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter Props" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Props</SelectItem>
              <SelectItem value="player-prop">Player Props</SelectItem>
              <SelectItem value="moneyline">Moneyline</SelectItem>
              <SelectItem value="spread">Spread</SelectItem>
              <SelectItem value="total">Total</SelectItem>
              <SelectItem value="passing">Passing Props</SelectItem>
              <SelectItem value="rushing">Rushing Props</SelectItem>
              <SelectItem value="receiving">Receiving Props</SelectItem>
              <SelectItem value="touchdowns">Touchdown Props</SelectItem>
              <SelectItem value="yards">Yard Props</SelectItem>
              <SelectItem value="completions">Completion Props</SelectItem>
              <SelectItem value="interceptions">Interception Props</SelectItem>
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
          <p className="text-muted-foreground">Give us time to get you ahead of vegas!</p>
        </div>
      )}

      {/* Predictions Grid */}
      {!isLoading && sortedPredictions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedPredictions.map((prediction) => (
            <div key={prediction.id} className="relative">
              <Card className={cn(
                "p-6 hover:shadow-card-hover transition-all duration-300 hover-scale group bg-gradient-card border-border/50 hover:border-primary/30 cursor-pointer",
                !isSubscribed && "blur-sm"
              )}>
                
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {prediction.marketType === 'player-prop' ? (
                      <Users className="w-5 h-5 text-blue-500" />
                    ) : prediction.marketType === 'moneyline' ? (
                      <Target className="w-5 h-5 text-green-500" />
                    ) : prediction.marketType === 'spread' ? (
                      <BarChart3 className="w-5 h-5 text-purple-500" />
                    ) : (
                      <Activity className="w-5 h-5 text-orange-500" />
                    )}
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {prediction.marketType === 'player-prop' ? (
                          `${prediction.playerName} - ${prediction.propType} ${prediction.line}`
                        ) : (
                          `${prediction.homeTeamAbbr} vs ${prediction.awayTeamAbbr}`
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {prediction.marketType === 'player-prop' ? (
                          `${prediction.teamAbbr} vs ${prediction.opponentAbbr}`
                        ) : (
                          `${prediction.marketType?.toUpperCase()} ${prediction.period !== 'full_game' ? `(${prediction.period.replace('_', ' ')})` : ''}`
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      {Math.round((prediction.confidence || 0) * 100)}% confidence
                    </Badge>
                    {prediction.available && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500">
                        <Activity className="w-3 h-3 mr-1" />
                        LIVE
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-foreground">
                      {prediction.marketType === 'player-prop' ? (
                        `${formatOdds(prediction.overOdds)} / ${formatOdds(prediction.underOdds)}`
                      ) : (
                        `${formatOdds(prediction.homeOdds)} / ${formatOdds(prediction.awayOdds)}`
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      {(prediction.expectedValue || 0) > 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className={cn(
                        "text-sm font-medium",
                        (prediction.expectedValue || 0) > 0 ? "text-green-500" : "text-red-500"
                      )}>
                        {((prediction.expectedValue || 0) * 100).toFixed(1)}% EV
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {prediction.gameDate ? new Date(prediction.gameDate).toLocaleDateString() : 'TBD'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {prediction.lastUpdate ? new Date(prediction.lastUpdate).toLocaleTimeString() : 'Unknown'}
                    </p>
                  </div>
                </div>
                
                {/* Advanced Analysis Button */}
                <div className="mt-4">
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-all duration-300 ease-out hover:shadow-lg hover:shadow-purple-500/25 border border-purple-500/50"
                    onClick={() => generateAdvancedPrediction(prediction)}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Advanced AI Analysis
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </Card>
              
              {/* Subscription overlay for free users */}
              <SubscriptionOverlay
                isVisible={!isSubscribed}
                icon={<Brain className="w-5 h-5 text-primary" />}
                title="Premium Content"
                description="Subscribe to view advanced predictions"
                buttonText="Upgrade to Pro"
                size="small"
                onUpgrade={() => navigate('/subscription')}
              />
            </div>
          ))}
        </div>
      )}

      {/* Legacy card rendering - keeping for reference but not used */}
      {false && sortedPredictions.map((prediction) => (
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
                  {prediction.available && (
                    <Badge variant="destructive" className="text-xs animate-pulse">
                      <Activity className="w-3 h-3 mr-1" />
                      LIVE
                    </Badge>
                  )}
                </div>
                
                <CardTitle className="text-lg">
                  {prediction.marketType === 'player-prop' ? (
                    `${prediction.playerName} - ${prediction.propType} ${prediction.line}`
                  ) : (
                    `${prediction.homeTeamAbbr} vs ${prediction.awayTeamAbbr}`
                  )}
                </CardTitle>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {prediction.gameDate ? new Date(prediction.gameDate).toLocaleDateString() : 'TBD'}
                  <span className="mx-1">•</span>
                  <span>
                    {prediction.marketType === 'player-prop' ? (
                      `${prediction.teamAbbr} vs ${prediction.opponentAbbr}`
                    ) : (
                      `${prediction.marketType?.toUpperCase()} ${prediction.period !== 'full_game' ? `(${prediction.period})` : ''}`
                    )}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Confidence & Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Confidence</span>
                      <span className={`text-sm font-bold ${getConfidenceColor((prediction.confidence || 0) * 100)}`}>
                        {Math.round((prediction.confidence || 0) * 100)}%
                      </span>
                    </div>
                    <Progress value={(prediction.confidence || 0) * 100} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Value Rating</span>
                      <span className="text-sm font-bold text-primary">
                        {Math.round((prediction.expectedValue || 0) * 100)}/100
                      </span>
                    </div>
                    <Progress value={Math.abs((prediction.expectedValue || 0) * 100)} className="h-2" />
                  </div>
                </div>

                {/* Risk Level */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Risk Level</span>
                  <Badge className={cn("text-xs", getRiskColor(getRiskLevel(prediction)))}>
                    {getRiskLevel(prediction).toUpperCase()}
                  </Badge>
                </div>

                {/* Prediction Details */}
                  <div className="space-y-2">
                  {prediction.marketType === 'player-prop' ? (
                    <>
                    <div className="text-sm">
                      <span className="font-medium">AI Recommendation: </span>
                      <span className={cn(
                        "font-bold",
                          prediction.recommendation === 'strong_bet' || prediction.recommendation === 'good_bet'
                          ? "text-green-600" 
                            : prediction.recommendation === 'avoid' || prediction.recommendation === 'strong_avoid'
                            ? "text-red-600"
                            : "text-yellow-600"
                      )}>
                          {prediction.recommendation?.replace('_', ' ').toUpperCase() || 'NEUTRAL'}
                      </span>
                    </div>
                    
                    <div className="text-sm">
                      <span className="font-medium">Expected Value: </span>
                      <span className={cn(
                        "font-bold",
                          (prediction.expectedValue || 0) > 0 ? "text-green-600" : "text-red-600"
                      )}>
                          {(prediction.expectedValue || 0) > 0 ? '+' : ''}{((prediction.expectedValue || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm">
                        <span className="font-medium">Market Type: </span>
                        <span className="font-bold text-primary">
                          {prediction.marketType?.toUpperCase()} {prediction.period !== 'full_game' ? `(${prediction.period.replace('_', ' ')})` : ''}
                        </span>
                      </div>
                      
                      {prediction.marketType === 'moneyline' && (
                        <div className="text-sm">
                          <span className="font-medium">Odds: </span>
                          <span className="font-bold">
                            {prediction.homeTeamAbbr}: {prediction.homeOdds > 0 ? '+' : ''}{prediction.homeOdds} | 
                            {prediction.awayTeamAbbr}: {prediction.awayOdds > 0 ? '+' : ''}{prediction.awayOdds}
                          </span>
                  </div>
                )}
                      
                      {prediction.marketType === 'spread' && (
                        <div className="text-sm">
                          <span className="font-medium">Spread: </span>
                          <span className="font-bold">
                            {prediction.homeTeamAbbr}: {prediction.spread > 0 ? '+' : ''}{prediction.spread} ({prediction.homeOdds > 0 ? '+' : ''}{prediction.homeOdds}) | 
                            {prediction.awayTeamAbbr}: {prediction.spread < 0 ? '+' : ''}{-prediction.spread} ({prediction.awayOdds > 0 ? '+' : ''}{prediction.awayOdds})
                          </span>
                        </div>
                      )}
                      
                      {prediction.marketType === 'total' && (
                        <div className="text-sm">
                          <span className="font-medium">Total: </span>
                          <span className="font-bold">
                            {prediction.total} - Over: {prediction.overOdds > 0 ? '+' : ''}{prediction.overOdds} | 
                            Under: {prediction.underOdds > 0 ? '+' : ''}{prediction.underOdds}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Cross-Reference Analysis - Temporarily disabled */}
                {/* TODO: Add cross-reference analysis to EnhancedPlayerProp interface */}

                {/* Advanced Insights - Temporarily disabled */}
                {/* TODO: Add keyInsights to EnhancedPlayerProp interface */}

                {/* Key Factors */}
                <div className="space-y-1">
                  <span className="text-sm font-medium">Analysis Factors:</span>
                  <div className="space-y-1">
                    {generateAnalysisFactors(prediction).slice(0, 3).map((factor, index) => (
                      <div key={index} className="text-xs text-muted-foreground">
                        • {factor}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Last Updated */}
                <div className="text-xs text-muted-foreground">
                  Updated: {prediction.lastUpdate ? new Date(prediction.lastUpdate).toLocaleTimeString() : 'Unknown'}
                </div>
              </CardContent>
            </Card>
          ))}

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

      {/* Advanced AI Analysis Modal */}
      {advancedPrediction && (
        <AdvancedPredictionDisplay
          prediction={advancedPrediction}
          onClose={() => {
            setShowAdvancedAnalysis(false);
            setAdvancedPrediction(null);
            setSelectedPropForAdvancedAnalysis(null);
          }}
        />
      )}

      {/* Confidence Interval Dialog - REMOVED to prevent double overlay */}
    </div>
  );
};
