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
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeamLogo } from '@/components/ui/team-logo';
import { DetailedInsightsOverlay } from './detailed-insights-overlay';
import { MoneylineProps } from '@/components/predictions/moneyline-props';
import { UnderdogAnalysis } from '@/components/predictions/underdog-analysis';
import { seasonService } from '@/services/season-service';
import { insightsService, type GameInsight, type PlayerInsight, type MoneylineInsight, type PredictionAnalytics } from '@/services/insights-service';
import { predictionTracker } from '@/services/prediction-tracker';

interface InsightsTabProps {
  selectedSport: string;
  userRole?: string;
  userSubscription?: string;
}

// Using the GameInsight interface from insights-service.ts

// Using the PlayerInsight interface from insights-service.ts

export const InsightsTab: React.FC<InsightsTabProps> = ({ 
  selectedSport, 
  userRole = 'user', 
  userSubscription = 'free' 
}) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<'all' | 'game' | 'player' | 'moneyline'>('all');

  const handleUpgrade = () => {
    navigate('/subscription');
  };
  
  // State for insights data
  const [gameInsights, setGameInsights] = useState<GameInsight[]>([]);
  const [playerInsights, setPlayerInsights] = useState<PlayerInsight[]>([]);
  const [moneylineInsights, setMoneylineInsights] = useState<MoneylineInsight[]>([]);
  const [predictionAnalytics, setPredictionAnalytics] = useState<PredictionAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedInsight, setSelectedInsight] = useState<GameInsight | PlayerInsight | MoneylineInsight | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  
  // Season and moneyline state
  const [shouldShowMoneyline, setShouldShowMoneyline] = useState(true);
  const [offseasonMessage, setOffseasonMessage] = useState('');
  const [seasonLoading, setSeasonLoading] = useState(true);

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
        setShouldShowMoneyline(shouldShow);
        setOffseasonMessage(message);
      } catch (error) {
        console.error('Error loading season data:', error);
        // Fallback to default values
        setShouldShowMoneyline(true);
        setOffseasonMessage(null);
      } finally {
        setSeasonLoading(false);
      }
    };

    loadSeasonData();
  }, [selectedSport]);

  // Load real insights data using the insights service
  useEffect(() => {
    const loadInsights = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log(`🔄 [InsightsTab] Loading insights for ${selectedSport}...`);
        
        // Clear cache when sport changes to ensure fresh data
        insightsService.clearCache();
        
        // Close any open overlay when sport changes to prevent stale data
        setIsOverlayOpen(false);
        setSelectedInsight(null);
        
        // Load all insights data in parallel
        const [gameData, playerData, moneylineData, analyticsData] = await Promise.all([
          insightsService.getGameInsights(selectedSport, 7),
          insightsService.getPlayerInsights(selectedSport, 7),
          insightsService.getMoneylineInsights(selectedSport, 7),
          insightsService.getPredictionAnalytics(selectedSport, 30)
        ]);
        
        setGameInsights(gameData);
        setPlayerInsights(playerData);
        setMoneylineInsights(moneylineData);
        setPredictionAnalytics(analyticsData);
        setLastRefresh(new Date());
        
        console.log(`✅ [InsightsTab] Successfully loaded insights for ${selectedSport}`);
        console.log(`📊 [InsightsTab] Game Insights: ${gameData.length}`, gameData);
        console.log(`👤 [InsightsTab] Player Insights: ${playerData.length}`, playerData.slice(0, 2));
        console.log(`💰 [InsightsTab] Moneyline Insights: ${moneylineData.length}`, moneylineData.slice(0, 2));
      } catch (error) {
        console.error('Error loading insights:', error);
        console.log('🔄 [InsightsTab] Setting error state due to insights loading failure');
        setError(error instanceof Error ? error.message : 'Failed to load insights');
        // Keep existing data on error
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
      console.log(`🔄 [InsightsTab] Refreshing insights for ${selectedSport}...`);
      
      // Clear cache and reload
      insightsService.clearCache();
      
      const [gameData, playerData, moneylineData, analyticsData] = await Promise.all([
        insightsService.getGameInsights(selectedSport, 7),
        insightsService.getPlayerInsights(selectedSport, 7),
        insightsService.getMoneylineInsights(selectedSport, 7),
        insightsService.getPredictionAnalytics(selectedSport, 30)
      ]);
      
      setGameInsights(gameData);
      setPlayerInsights(playerData);
      setMoneylineInsights(moneylineData);
      setPredictionAnalytics(analyticsData);
      setLastRefresh(new Date());
      
      console.log(`✅ [InsightsTab] Successfully refreshed insights for ${selectedSport}`);
    } catch (error) {
      console.error('Error refreshing insights:', error);
      console.log('🔄 [InsightsTab] Setting error state due to insights refresh failure');
      setError(error instanceof Error ? error.message : 'Failed to refresh insights');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsightClick = (insight: GameInsight | PlayerInsight | MoneylineInsight) => {
    setSelectedInsight(insight);
    setIsOverlayOpen(true);
  };

  const handleCloseOverlay = () => {
    setIsOverlayOpen(false);
    setSelectedInsight(null);
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

  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'over_hit_favorite':
        return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'spread_performance':
        return <BarChart3 className="w-5 h-5 text-purple-500" />;
      case 'moneyline_home':
        return <Home className="w-5 h-5 text-green-500" />;
      case 'total_trends':
        return <Activity className="w-5 h-5 text-orange-500" />;
      case 'hot_streak':
        return <Flame className="w-5 h-5 text-red-500" />;
      case 'cold_streak':
        return <TrendingDown className="w-5 h-5 text-blue-500" />;
      case 'home_advantage':
        return <Home className="w-5 h-5 text-green-500" />;
      case 'vs_opponent':
        return <Target className="w-5 h-5 text-purple-500" />;
      case 'recent_form':
        return <Activity className="w-5 h-5 text-orange-500" />;
      default:
        return <BarChart3 className="w-5 h-5 text-gray-500" />;
    }
  };

  const renderGameInsight = (insight: GameInsight) => (
    <div key={insight.insight_id} className="relative">
      <Card 
        className={cn(
          "p-6 hover:shadow-card-hover transition-all duration-300 hover-scale group bg-gradient-card border-border/50 hover:border-primary/30 cursor-pointer",
          !isSubscribed && "blur-sm"
        )}
        onClick={() => handleInsightClick(insight)}
      >
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getInsightIcon(insight.insight_type)}
          <div>
            <h3 className="font-semibold text-foreground">{insight.title}</h3>
            <p className="text-sm text-muted-foreground">{insight.description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Confidence</div>
          <div className="text-sm font-bold text-primary">{insight.confidence}%</div>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-foreground">{insight.value}%</span>
          <div className="flex items-center gap-1">
            {getTrendIcon(insight.trend)}
            <span className={cn("text-sm font-medium", getTrendColor(insight.trend))}>
              {insight.change_percent > 0 ? '+' : ''}{insight.change_percent}%
            </span>
          </div>
        </div>
        {insight.team_name && insight.opponent_name && (
          <div className="flex items-center gap-3">
            {/* Only show team logos for game insights that involve actual team matchups */}
            {insight.insight_type !== 'league_trends' && insight.insight_type !== 'season_stats' && (
              <>
                <TeamLogo teamAbbr={insight.opponent_name} sport={selectedSport} size="sm" />
                <span className="text-sm font-medium text-muted-foreground">@</span>
                <TeamLogo teamAbbr={insight.team_name} sport={selectedSport} size="sm" />
              </>
            )}
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{insight.opponent_name} @ {insight.team_name}</p>
              <p className="text-xs text-muted-foreground">
                {insight.game_date ? new Date(insight.game_date).toLocaleDateString() : 'TBD'}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
    
    {/* Subscription overlay for free users - outside the blurred card */}
    <SubscriptionOverlay
      isVisible={!isSubscribed}
      icon={<BarChart3 className="w-5 h-5 text-primary" />}
      title="Premium Content"
      description="Subscribe to view insights"
      buttonText="Upgrade to Pro"
      size="small"
      onUpgrade={handleUpgrade}
    />
    </div>
  );

  const renderPlayerInsight = (insight: PlayerInsight) => (
    <div key={insight.insight_id} className="relative">
      <Card 
        className={cn(
          "p-6 hover:shadow-card-hover transition-all duration-300 hover-scale group bg-gradient-card border-border/50 hover:border-primary/30 cursor-pointer",
          !isSubscribed && "blur-sm"
        )}
        onClick={() => handleInsightClick(insight)}
      >
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getInsightIcon(insight.insight_type)}
          <div>
            <h3 className="font-semibold text-foreground">{insight.title}</h3>
            <p className="text-sm text-muted-foreground">{insight.description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Confidence</div>
          <div className="text-sm font-bold text-primary">{insight.confidence}%</div>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-foreground">{insight.value}%</span>
          <div className="flex items-center gap-1">
            {getTrendIcon(insight.trend)}
            <span className={cn("text-sm font-medium", getTrendColor(insight.trend))}>
              {insight.change_percent > 0 ? '+' : ''}{insight.change_percent}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Only show team logo for player insights that involve actual teams */}
          {insight.insight_type !== 'individual_performance' && insight.insight_type !== 'personal_stats' && (
            <TeamLogo teamAbbr={insight.team_name} sport={selectedSport} size="sm" />
          )}
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">
              <span className="animate-pulse-glow">{insight.player_name}</span> {insight.player_position}
            </p>
            <p className="text-xs text-muted-foreground">{insight.team_name} • {insight.last_game_date}</p>
          </div>
        </div>
      </div>
    </Card>
    
    {/* Subscription overlay for free users - outside the blurred card */}
    <SubscriptionOverlay
      isVisible={!isSubscribed}
      icon={<Users className="w-5 h-5 text-primary" />}
      title="Premium Content"
      description="Subscribe to view insights"
      buttonText="Upgrade to Pro"
      size="small"
      onUpgrade={handleUpgrade}
    />
    </div>
  );

  const renderMoneylineInsight = (insight: MoneylineInsight) => (
    <div key={insight.insight_id} className="relative">
      <Card 
        className={cn(
          "p-6 hover:shadow-card-hover transition-all duration-300 hover-scale group bg-gradient-card border-border/50 hover:border-primary/30 cursor-pointer",
          !isSubscribed && "blur-sm"
        )}
        onClick={() => handleInsightClick(insight)}
      >
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getInsightIcon(insight.insight_type)}
          <div>
            <h3 className="font-semibold text-foreground">{insight.title}</h3>
            <p className="text-sm text-muted-foreground">{insight.description}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Confidence</div>
            <div className="text-sm font-bold text-primary">{insight.confidence}%</div>
          </div>
          {insight.underdog_opportunity && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500">
              {insight.team_name} shows value as underdog
            </Badge>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-foreground">{insight.value}%</span>
          <div className="flex items-center gap-1">
            {getTrendIcon(insight.trend)}
            <span className={cn("text-sm font-medium", getTrendColor(insight.trend))}>
              {insight.change_percent > 0 ? '+' : ''}{insight.change_percent}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Only show team logos for moneyline insights that involve actual team matchups */}
          {insight.insight_type !== 'league_odds' && insight.insight_type !== 'market_trends' && (
            <>
              <TeamLogo teamAbbr={insight.opponent_name} sport={selectedSport} size="sm" />
              <span className="text-sm font-medium text-muted-foreground">@</span>
              <TeamLogo teamAbbr={insight.team_name} sport={selectedSport} size="sm" />
            </>
          )}
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{insight.opponent_name} @ {insight.team_name}</p>
            <p className="text-xs text-muted-foreground">
              {insight.game_date ? new Date(insight.game_date).toLocaleDateString() : 'TBD'}
            </p>
          </div>
        </div>
      </div>
    </Card>
    
    {/* Subscription overlay for free users - outside the blurred card */}
    <SubscriptionOverlay
      isVisible={!isSubscribed}
      icon={<Target className="w-5 h-5 text-primary" />}
      title="Premium Content"
      description="Subscribe to view insights"
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
          <p className="text-muted-foreground">Loading insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Insights</h3>
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Insights Dashboard</h1>
            <p className="text-muted-foreground">
              Advanced analytics and trends for {selectedSport.toUpperCase()}
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

      {/* Explanation Key */}
    <div className="bg-muted/20 border border-border/30 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <BarChart3 className="w-4 h-4" />
        Understanding Your Insights
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-green-500 font-medium">↑ +12%</span>
            <span className="text-muted-foreground">Trending up 12% this week</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-500 font-medium">↓ -8%</span>
            <span className="text-muted-foreground">Trending down 8% this week</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Flame className="w-3 h-3 text-red-500" />
            <span className="text-muted-foreground">Hot Streak: Player performing exceptionally well</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-3 h-3 text-blue-500" />
            <span className="text-muted-foreground">Game Analysis: Team vs team matchup insights</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-yellow-500 font-medium">85%</span>
            <span className="text-muted-foreground">Confidence: How reliable this insight is</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-500 font-medium">72%</span>
            <span className="text-muted-foreground">Value: Performance metric or probability</span>
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border/20">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Brain className="w-3 h-3" />
          <span>💡 <strong>Tip:</strong> Click any insight card for detailed analysis and historical data</span>
        </div>
      </div>
    </div>

      {/* Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as 'all' | 'game' | 'player' | 'moneyline')}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Insights</TabsTrigger>
          <TabsTrigger value="game">Game Insights</TabsTrigger>
          <TabsTrigger value="player">Player Insights</TabsTrigger>
          <TabsTrigger value="moneyline">Moneyline</TabsTrigger>
        </TabsList>

        {/* All Insights */}
        <TabsContent value="all" className="space-y-6">
          {/* Analytics Summary */}
          {predictionAnalytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="p-4 bg-gradient-card border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-foreground">Total Predictions</h3>
                </div>
                <p className="text-2xl font-bold text-foreground">{predictionAnalytics.total_predictions.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Last 30 days</p>
              </Card>
              
              <Card className="p-4 bg-gradient-card border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold text-foreground">Win Rate</h3>
                </div>
                <p className="text-2xl font-bold text-foreground">{predictionAnalytics.win_rate}%</p>
                <p className="text-sm text-muted-foreground">Overall accuracy</p>
              </Card>
              
              <Card className="p-4 bg-gradient-card border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-semibold text-foreground">Total Profit</h3>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {predictionAnalytics.total_profit >= 0 ? '+' : ''}${predictionAnalytics.total_profit.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Last 30 days</p>
              </Card>
              
              <Card className="p-4 bg-gradient-card border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold text-foreground">Avg Confidence</h3>
                </div>
                <p className="text-2xl font-bold text-foreground">{predictionAnalytics.avg_confidence}%</p>
                <p className="text-sm text-muted-foreground">Prediction quality</p>
              </Card>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {gameInsights.filter(insight => insight && insight.insight_id).map(renderGameInsight)}
            {playerInsights.filter(insight => insight && insight.insight_id).map(renderPlayerInsight)}
            {moneylineInsights.filter(insight => insight && insight.insight_id).map(renderMoneylineInsight)}
          </div>
          
          {/* No Data Available Message */}
          {gameInsights.length === 0 && playerInsights.length === 0 && moneylineInsights.length === 0 && (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-4">
                <BarChart3 className="w-12 h-12 text-muted-foreground/50" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Data Available</h3>
                  <p className="text-muted-foreground">
                    No insights data is currently available for {selectedSport.toUpperCase()}. 
                    This could be due to no games being scheduled or data not being available from our data provider.
                  </p>
                </div>
                <Button onClick={refreshInsights} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Game Insights */}
        <TabsContent value="game" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {gameInsights.filter(insight => insight && insight.insight_id).map(renderGameInsight)}
          </div>
          
          {/* No Game Data Available */}
          {gameInsights.length === 0 && (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-4">
                <BarChart3 className="w-12 h-12 text-muted-foreground/50" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Game Data Available</h3>
                  <p className="text-muted-foreground">
                    No game insights are currently available for {selectedSport.toUpperCase()}.
                  </p>
                </div>
                <Button onClick={refreshInsights} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Player Insights */}
        <TabsContent value="player" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {playerInsights.filter(insight => insight && insight.insight_id).map(renderPlayerInsight)}
          </div>
          
          {/* No Player Data Available */}
          {playerInsights.length === 0 && (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Users className="w-12 h-12 text-muted-foreground/50" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Player Data Available</h3>
                  <p className="text-muted-foreground">
                    No player insights are currently available for {selectedSport.toUpperCase()}.
                  </p>
                </div>
                <Button onClick={refreshInsights} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Moneyline Props */}
        <TabsContent value="moneyline" className="space-y-6">
          <div className="space-y-8">
            {/* Moneyline Insights */}
            {moneylineInsights.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Target className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Moneyline Insights</h2>
                  <Badge variant="outline" className="gap-1">
                    <Activity className="w-3 h-3" />
                    Real Data
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  AI-powered analysis of moneyline trends and underdog opportunities
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {moneylineInsights.filter(insight => insight && insight.insight_id).map(renderMoneylineInsight)}
                </div>
              </div>
            )}

            {/* Underdog Analysis Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Top Underdog Opportunities</h2>
                <Badge variant="outline" className="gap-1">
                  <TrendingUp className="w-3 h-3" />
                  AI Analysis
                </Badge>
              </div>
              <p className="text-muted-foreground">
                AI-powered analysis of the top 3 underdog moneyline opportunities with detailed reasoning
              </p>
              <UnderdogAnalysis selectedSport={selectedSport} />
            </div>

            {/* Moneyline Predictions Section */}
            {seasonLoading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-semibold">Moneyline Predictions</h2>
                </div>
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading season data...</p>
                  </div>
                </div>
              </div>
            ) : shouldShowMoneyline ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Moneyline Predictions</h2>
                  <Badge variant="outline" className="gap-1">
                    <Activity className="w-3 h-3" />
                    Simulations
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  AI-powered final score predictions with thousands of simulations and backtesting
                </p>
                <MoneylineProps userSubscription={userSubscription || 'free'} userRole={userRole} selectedSport={selectedSport} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-muted-foreground" />
                  <h2 className="text-2xl font-bold text-muted-foreground">Moneyline Predictions</h2>
                  <Badge variant="outline" className="gap-1">
                    <Activity className="w-3 h-3" />
                    Offseason
                  </Badge>
                </div>
                <div className="relative p-6 bg-muted/30 rounded-lg border border-muted">
                  {/* X Close Button */}
                  <button
                    onClick={() => setShouldShowMoneyline(true)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                    title="Close offseason message"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                  
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                      <Calendar className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-muted-foreground">Season Ended</h3>
                    <p className="text-muted-foreground">
                      {offseasonMessage}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Moneyline predictions will return when the season begins.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* No Moneyline Data Available */}
            {moneylineInsights.length === 0 && (
              <div className="text-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <Target className="w-12 h-12 text-muted-foreground/50" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Moneyline Data Available</h3>
                    <p className="text-muted-foreground">
                      No moneyline insights are currently available for {selectedSport.toUpperCase()}.
                    </p>
                  </div>
                  <Button onClick={refreshInsights} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-foreground">Total Insights</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {gameInsights.length + playerInsights.length + moneylineInsights.length}
          </p>
          <p className="text-sm text-muted-foreground">Active insights</p>
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
                .filter(insight => insight && insight.insight_id && typeof insight.confidence === 'number')
                .reduce((acc, insight) => acc + insight.confidence, 0) / 
              [...gameInsights, ...playerInsights, ...moneylineInsights]
                .filter(insight => insight && insight.insight_id && typeof insight.confidence === 'number').length || 1
            )}%
          </p>
          <p className="text-sm text-muted-foreground">Overall accuracy</p>
        </Card>
      </div>

      {/* Detailed Insights Overlay */}
      <DetailedInsightsOverlay
        isOpen={isOverlayOpen}
        onClose={handleCloseOverlay}
        insight={selectedInsight}
        sport={selectedSport}
      />
    </div>
  );
};
