// Enhanced Insights Tab - Integrates with SportsGameOdds API and our analytics data
// Provides real insights based on actual performance data and betting trends

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SubscriptionOverlay } from '@/components/ui/subscription-overlay';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3, 
  Users, 
  Home, 
  Flame,
  Trophy,
  Activity,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus,
  Calendar,
  X,
  RefreshCw,
  AlertCircle,
  Brain,
  Star,
  Award,
  TrendingDown as ColdTrend,
  TrendingUp as HotTrend,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  enhancedInsightsService, 
  type EnhancedGameInsight, 
  type EnhancedPlayerInsight, 
  type EnhancedMoneylineInsight, 
  type EnhancedPredictionAnalytics 
} from '@/services/enhanced-insights-service';

interface EnhancedInsightsTabProps {
  selectedSport: string;
  userRole?: string;
  userSubscription?: string;
}

export const EnhancedInsightsTab: React.FC<EnhancedInsightsTabProps> = ({ 
  selectedSport, 
  userRole = 'user', 
  userSubscription = 'free' 
}) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<'all' | 'game' | 'player' | 'moneyline' | 'underdogs' | 'regular-moneyline'>('all');

  const handleUpgrade = () => {
    navigate('/subscription');
  };
  
  // State for enhanced insights data
  const [gameInsights, setGameInsights] = useState<EnhancedGameInsight[]>([]);
  const [playerInsights, setPlayerInsights] = useState<EnhancedPlayerInsight[]>([]);
  const [moneylineInsights, setMoneylineInsights] = useState<EnhancedMoneylineInsight[]>([]);
  const [predictionAnalytics, setPredictionAnalytics] = useState<EnhancedPredictionAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  const isSubscribed = userRole === 'owner' || userSubscription !== 'free';

  // Load enhanced insights data
  useEffect(() => {
    const loadInsights = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log(`🔄 [EnhancedInsightsTab] Loading enhanced insights for ${selectedSport}...`);
        
        // Load all insights data in parallel
        const [gameData, playerData, moneylineData, analyticsData] = await Promise.all([
          enhancedInsightsService.getGameInsights(selectedSport, 7),
          enhancedInsightsService.getPlayerInsights(selectedSport, 7),
          enhancedInsightsService.getMoneylineInsights(selectedSport, 7),
          enhancedInsightsService.getPredictionAnalytics(selectedSport, 30)
        ]);
        
        setGameInsights(gameData);
        setPlayerInsights(playerData);
        setMoneylineInsights(moneylineData);
        setPredictionAnalytics(analyticsData);
        setLastRefresh(new Date());
        
        console.log(`✅ [EnhancedInsightsTab] Successfully loaded enhanced insights for ${selectedSport}`);
      } catch (error) {
        console.error('Error loading enhanced insights:', error);
        setError(error instanceof Error ? error.message : 'Failed to load enhanced insights');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInsights();
  }, [selectedSport]);

  // Refresh insights data
  const refreshInsights = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`🔄 [EnhancedInsightsTab] Refreshing enhanced insights for ${selectedSport}...`);
      
      // Clear cache and reload
      enhancedInsightsService.clearCache();
      
      const [gameData, playerData, moneylineData, analyticsData] = await Promise.all([
        enhancedInsightsService.getGameInsights(selectedSport, 7),
        enhancedInsightsService.getPlayerInsights(selectedSport, 7),
        enhancedInsightsService.getMoneylineInsights(selectedSport, 7),
        enhancedInsightsService.getPredictionAnalytics(selectedSport, 30)
      ]);
      
      setGameInsights(gameData);
      setPlayerInsights(playerData);
      setMoneylineInsights(moneylineData);
      setPredictionAnalytics(analyticsData);
      setLastRefresh(new Date());
      
      console.log(`✅ [EnhancedInsightsTab] Successfully refreshed enhanced insights for ${selectedSport}`);
    } catch (error) {
      console.error('Error refreshing enhanced insights:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh enhanced insights');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions for rendering insights
  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <ArrowDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRecommendationIcon = (recommendation?: string) => {
    switch (recommendation) {
      case 'strong_buy':
        return <Star className="w-4 h-4 text-green-600" />;
      case 'buy':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'hold':
        return <Minus className="w-4 h-4 text-yellow-500" />;
      case 'avoid':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'strong_avoid':
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRecommendationColor = (recommendation?: string) => {
    switch (recommendation) {
      case 'strong_buy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'buy':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'hold':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'avoid':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'strong_avoid':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'hot_team_streak':
        return <Flame className="w-5 h-5 text-red-500" />;
      case 'defensive_advantage':
        return <Shield className="w-5 h-5 text-blue-500" />;
      case 'matchup_performance':
        return <Target className="w-5 h-5 text-purple-500" />;
      case 'hot_streak':
        return <Flame className="w-5 h-5 text-red-500" />;
      case 'recent_form':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'consistency':
        return <BarChart3 className="w-5 h-5 text-blue-500" />;
      case 'h2h_advantage':
        return <Target className="w-5 h-5 text-orange-500" />;
      default:
        return <BarChart3 className="w-5 h-5 text-gray-500" />;
    }
  };

  const renderEnhancedGameInsight = (insight: EnhancedGameInsight) => (
    <div key={insight.insight_id} className="relative">
      <Card className={cn(
        "p-8 hover:shadow-card-hover transition-all duration-300 hover-scale group bg-gradient-card border-border/50 hover:border-primary/30 cursor-pointer",
        !isSubscribed && "blur-sm"
      )}>
      
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            {getInsightIcon(insight.insight_type)}
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">{insight.title}</h3>
            <p className="text-muted-foreground mt-1">{insight.description}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary">
            {insight.confidence}% confidence
          </Badge>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
            <Activity className="w-3 h-3 mr-1" />
            Game Analysis
          </Badge>
          {insight.recommendation && (
            <Badge variant="outline" className={cn("flex items-center gap-1", getRecommendationColor(insight.recommendation))}>
              {getRecommendationIcon(insight.recommendation)}
              {insight.recommendation.replace('_', ' ')}
            </Badge>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-foreground">Performance</span>
          </div>
          <p className="text-3xl font-bold text-blue-500">{insight.value}%</p>
          <p className="text-sm text-muted-foreground">
            {insight.change_percent > 0 ? '+' : ''}{insight.change_percent}% vs last period
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-green-500" />
            <span className="text-sm font-semibold text-foreground">Matchup</span>
          </div>
          <p className="text-lg font-bold text-foreground">{insight.team_name} vs {insight.opponent_name}</p>
          <p className="text-sm text-muted-foreground">{insight.game_date}</p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-foreground">Data Quality</span>
          </div>
          <p className="text-2xl font-bold text-purple-500">{insight.data_points}</p>
          <p className="text-sm text-muted-foreground">{insight.sample_size}</p>
        </div>
      </div>
      
      {/* Enhanced Analysis Section */}
      <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
        <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Real Data Analysis
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Analytics Integration</p>
                <p className="text-sm text-muted-foreground">Based on {insight.data_points} real performance data points</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Trend Analysis</p>
                <p className="text-sm text-muted-foreground">Historical performance patterns and momentum</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Confidence Score</p>
                <p className="text-sm text-muted-foreground">{insight.confidence}% confidence based on data quality</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Recommendation</p>
                <p className="text-sm text-muted-foreground">{insight.recommendation?.replace('_', ' ')} based on analytics</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
    
    {/* Subscription overlay for free users */}
    <SubscriptionOverlay
      isVisible={!isSubscribed}
      icon={<BarChart3 className="w-5 h-5 text-primary" />}
      title="Premium Content"
      description="Subscribe to view detailed game insights"
      buttonText="Upgrade to Pro"
      size="small"
      onUpgrade={handleUpgrade}
    />
    </div>
  );

  const renderEnhancedPlayerInsight = (insight: EnhancedPlayerInsight) => (
    <div key={insight.insight_id} className="relative">
      <Card className={cn(
        "p-8 hover:shadow-card-hover transition-all duration-300 hover-scale group bg-gradient-card border-border/50 hover:border-primary/30 cursor-pointer",
        !isSubscribed && "blur-sm"
      )}>
      
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            {getInsightIcon(insight.insight_type)}
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">{insight.title}</h3>
            <p className="text-muted-foreground mt-1">{insight.description}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary">
            {insight.confidence}% confidence
          </Badge>
          <Badge variant="outline" className="bg-purple-500/10 text-purple-500">
            <Users className="w-3 h-3 mr-1" />
            Player Analysis
          </Badge>
          {insight.recommendation && (
            <Badge variant="outline" className={cn("flex items-center gap-1", getRecommendationColor(insight.recommendation))}>
              {getRecommendationIcon(insight.recommendation)}
              {insight.recommendation.replace('_', ' ')}
            </Badge>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-foreground">Performance</span>
          </div>
          <p className="text-3xl font-bold text-purple-500">{insight.value}%</p>
          <p className="text-sm text-muted-foreground">
            {insight.change_percent > 0 ? '+' : ''}{insight.change_percent}% vs last period
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-green-500" />
            <span className="text-sm font-semibold text-foreground">Player</span>
          </div>
          <p className="text-lg font-bold text-foreground">{insight.player_name} ({insight.player_position})</p>
          <p className="text-sm text-muted-foreground">{insight.team_name}</p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-foreground">Prop Type</span>
          </div>
          <p className="text-lg font-bold text-blue-500">{insight.prop_type}</p>
          <p className="text-sm text-muted-foreground">{insight.data_points} games analyzed</p>
        </div>

        {insight.streak_length && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-500" />
              <span className="text-sm font-semibold text-foreground">Streak</span>
            </div>
            <p className="text-2xl font-bold text-red-500">{insight.streak_length}</p>
            <p className="text-sm text-muted-foreground">games</p>
          </div>
        )}
      </div>
      
      {/* Enhanced Analysis Section */}
      <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
        <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Real Performance Data
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Hit Rate</p>
                <p className="text-sm text-muted-foreground">{insight.hit_rate}% success rate over {insight.data_points} games</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Average Performance</p>
                <p className="text-sm text-muted-foreground">{insight.avg_performance} average value</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Trend Analysis</p>
                <p className="text-sm text-muted-foreground">Performance direction: {insight.trend}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Recommendation</p>
                <p className="text-sm text-muted-foreground">{insight.recommendation?.replace('_', ' ')} based on data</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
    
    {/* Subscription overlay for free users */}
    <SubscriptionOverlay
      isVisible={!isSubscribed}
      icon={<Users className="w-5 h-5 text-primary" />}
      title="Premium Content"
      description="Subscribe to view detailed player insights"
      buttonText="Upgrade to Pro"
      size="small"
      onUpgrade={handleUpgrade}
    />
    </div>
  );

  const renderEnhancedMoneylineInsight = (insight: EnhancedMoneylineInsight) => (
    <div key={insight.insight_id} className="relative">
      <Card className={cn(
        "p-8 hover:shadow-card-hover transition-all duration-300 hover-scale group bg-gradient-card border-border/50 hover:border-primary/30 cursor-pointer",
        !isSubscribed && "blur-sm"
      )}>
      
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            {getInsightIcon(insight.insight_type)}
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">{insight.title}</h3>
            <p className="text-muted-foreground mt-1">{insight.description}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary">
            {insight.confidence}% confidence
          </Badge>
          {insight.underdog_opportunity ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-500">
              <TrendingUp className="w-3 h-3 mr-1" />
              Underdog Opportunity
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-500">
              <Target className="w-3 h-3 mr-1" />
              Moneyline Analysis
            </Badge>
          )}
          {insight.recommendation && (
            <Badge variant="outline" className={cn("flex items-center gap-1", getRecommendationColor(insight.recommendation))}>
              {getRecommendationIcon(insight.recommendation)}
              {insight.recommendation.replace('_', ' ')}
            </Badge>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-foreground">Success Rate</span>
          </div>
          <p className="text-3xl font-bold text-orange-500">{insight.value}%</p>
          <p className="text-sm text-muted-foreground">
            {insight.change_percent > 0 ? '+' : ''}{insight.change_percent}% vs last period
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-green-500" />
            <span className="text-sm font-semibold text-foreground">Matchup</span>
          </div>
          <p className="text-lg font-bold text-foreground">{insight.team_name} vs {insight.opponent_name}</p>
          <p className="text-sm text-muted-foreground">{insight.game_date}</p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-foreground">H2H Record</span>
          </div>
          <p className="text-lg font-bold text-purple-500">{insight.head_to_head_record}</p>
          <p className="text-sm text-muted-foreground">Historical matchup</p>
        </div>
      </div>
      
      {/* Enhanced Analysis Section */}
      <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
        <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Head-to-Head Analysis
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Historical Performance</p>
                <p className="text-sm text-muted-foreground">{insight.head_to_head_record} record against this opponent</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Recent Form</p>
                <p className="text-sm text-muted-foreground">{insight.recent_form} trend in recent games</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Home Advantage</p>
                <p className="text-sm text-muted-foreground">{insight.home_advantage ? 'Yes' : 'No'} home field advantage</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Value Assessment</p>
                <p className="text-sm text-muted-foreground">{insight.underdog_opportunity ? 'High value opportunity' : 'Standard analysis'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
    
    {/* Subscription overlay for free users */}
    <SubscriptionOverlay
      isVisible={!isSubscribed}
      icon={<Target className="w-5 h-5 text-primary" />}
      title="Premium Content"
      description="Subscribe to view detailed moneyline insights"
      buttonText="Upgrade to Pro"
      size="small"
      onUpgrade={handleUpgrade}
    />
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading enhanced insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Enhanced Insights</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={refreshInsights} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with refresh button */}
      <div className="text-center">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1"></div>
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">Enhanced Insights Dashboard</h1>
            <p className="text-muted-foreground">
              Real analytics powered by SportsGameOdds API and performance data for {selectedSport.toUpperCase()}
            </p>
          </div>
          <div className="flex-1 flex justify-end">
            <Button onClick={refreshInsights} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </p>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as 'all' | 'game' | 'player' | 'moneyline' | 'underdogs' | 'regular-moneyline')}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All Insights</TabsTrigger>
          <TabsTrigger value="game">Game Insights</TabsTrigger>
          <TabsTrigger value="player">Player Insights</TabsTrigger>
          <TabsTrigger value="moneyline">Moneyline</TabsTrigger>
          <TabsTrigger value="underdogs">Top Underdogs</TabsTrigger>
          <TabsTrigger value="regular-moneyline">Regular Moneyline</TabsTrigger>
        </TabsList>

        {/* All Insights */}
        <TabsContent value="all" className="space-y-6">
          {/* Enhanced Analytics Summary */}
          {predictionAnalytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="p-4 bg-gradient-card border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-foreground">Total Predictions</h3>
                </div>
                <p className="text-2xl font-bold text-foreground">{predictionAnalytics.total_predictions.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Based on real data</p>
              </Card>
              
              <Card className="p-4 bg-gradient-card border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold text-foreground">Win Rate</h3>
                </div>
                <p className="text-2xl font-bold text-foreground">{predictionAnalytics.win_rate}%</p>
                <p className="text-sm text-muted-foreground">Analytics accuracy</p>
              </Card>
              
              <Card className="p-4 bg-gradient-card border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-semibold text-foreground">Estimated Profit</h3>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {predictionAnalytics.total_profit >= 0 ? '+' : ''}${predictionAnalytics.total_profit.toFixed(0)}
                </p>
                <p className="text-sm text-muted-foreground">Based on $100 bets</p>
              </Card>
              
              <Card className="p-4 bg-gradient-card border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold text-foreground">Data Quality</h3>
                </div>
                <p className="text-2xl font-bold text-foreground">{predictionAnalytics.data_quality_score}/100</p>
                <p className="text-sm text-muted-foreground">Analytics reliability</p>
              </Card>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-6">
            {gameInsights.map(renderEnhancedGameInsight)}
            {playerInsights.map(renderEnhancedPlayerInsight)}
            {moneylineInsights.map(renderEnhancedMoneylineInsight)}
          </div>
        </TabsContent>

        {/* Game Insights */}
        <TabsContent value="game" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {gameInsights.map(renderEnhancedGameInsight)}
          </div>
        </TabsContent>

        {/* Player Insights */}
        <TabsContent value="player" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {playerInsights.map(renderEnhancedPlayerInsight)}
          </div>
        </TabsContent>

        {/* Moneyline Insights */}
        <TabsContent value="moneyline" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {moneylineInsights.map(renderEnhancedMoneylineInsight)}
          </div>
        </TabsContent>

        {/* Top Underdogs Tab */}
        <TabsContent value="underdogs" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Top Underdog Opportunities</h2>
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="w-3 h-3" />
                High Value
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Real analytics-powered analysis of the best underdog moneyline opportunities with detailed reasoning and value analysis
            </p>
            
            <div className="grid grid-cols-1 gap-6">
              {moneylineInsights.filter(insight => insight.underdog_opportunity).map(renderEnhancedMoneylineInsight)}
            </div>
          </div>
        </TabsContent>

        {/* Regular Moneyline Tab */}
        <TabsContent value="regular-moneyline" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Regular Moneyline Insights</h2>
              <Badge variant="outline" className="gap-1">
                <Activity className="w-3 h-3" />
                Standard Analysis
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Comprehensive moneyline analysis with real team performance metrics and matchup insights
            </p>
            
            <div className="grid grid-cols-1 gap-6">
              {moneylineInsights.filter(insight => !insight.underdog_opportunity).map(renderEnhancedMoneylineInsight)}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enhanced Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-foreground">Total Insights</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {gameInsights.length + playerInsights.length + moneylineInsights.length}
          </p>
          <p className="text-sm text-muted-foreground">Real analytics insights</p>
        </Card>

        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-foreground">Hot Streaks</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {playerInsights.filter(i => i.insight_type === 'hot_streak').length}
          </p>
          <p className="text-sm text-muted-foreground">Players trending up</p>
        </Card>

        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-foreground">Underdog Opportunities</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {moneylineInsights.filter(i => i.underdog_opportunity).length}
          </p>
          <p className="text-sm text-muted-foreground">High-value bets</p>
        </Card>

        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-foreground">Avg Confidence</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {Math.round(
              [...gameInsights, ...playerInsights, ...moneylineInsights]
                .reduce((acc, insight) => acc + insight.confidence, 0) / 
              (gameInsights.length + playerInsights.length + moneylineInsights.length)
            )}%
          </p>
          <p className="text-sm text-muted-foreground">Analytics reliability</p>
        </Card>
      </div>
    </div>
  );
};
