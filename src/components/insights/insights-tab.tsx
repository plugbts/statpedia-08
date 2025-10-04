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


export const InsightsTab: React.FC<InsightsTabProps> = ({ 
  selectedSport, 
  userRole = 'user', 
  userSubscription = 'free' 
}) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<'all' | 'game' | 'player' | 'moneyline' | 'underdogs' | 'regular-moneyline'>('all');

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
        // Fallback to sync methods
        setShouldShowMoneyline(seasonService.shouldShowMoneylinePredictions(selectedSport));
        setOffseasonMessage(seasonService.getOffseasonMessage(selectedSport));
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
      } catch (error) {
        console.error('Error loading insights:', error);
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
      setError(error instanceof Error ? error.message : 'Failed to refresh insights');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions for rendering insights

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
            <span className="text-sm font-semibold text-foreground">Trend</span>
          </div>
          <p className="text-2xl font-bold text-purple-500 capitalize">{insight.trend}</p>
          <p className="text-sm text-muted-foreground">Performance direction</p>
        </div>
      </div>
      
      {/* Detailed Analysis Section */}
      <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
        <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Detailed Analysis
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Team Performance</p>
                <p className="text-sm text-muted-foreground">Consistent performance metrics over recent games</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Matchup Analysis</p>
                <p className="text-sm text-muted-foreground">Historical head-to-head data and recent form</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Situational Factors</p>
                <p className="text-sm text-muted-foreground">Home field advantage and rest days considered</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Weather Impact</p>
                <p className="text-sm text-muted-foreground">Current conditions and historical weather data</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
    
    {/* Subscription overlay for free users - outside the blurred card */}
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

  const renderPlayerInsight = (insight: PlayerInsight) => (
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
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
            <span className="text-sm font-semibold text-foreground">Trend</span>
          </div>
          <p className="text-2xl font-bold text-blue-500 capitalize">{insight.trend}</p>
          <p className="text-sm text-muted-foreground">Performance direction</p>
        </div>
      </div>
      
      {/* Detailed Analysis Section */}
      <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
        <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Detailed Analysis
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Recent Form</p>
                <p className="text-sm text-muted-foreground">Player performance trends over last 5 games</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Usage Rate</p>
                <p className="text-sm text-muted-foreground">Team's reliance on this player in key situations</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Matchup Advantage</p>
                <p className="text-sm text-muted-foreground">Historical performance against similar opponents</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Injury Status</p>
                <p className="text-sm text-muted-foreground">Current health and availability for the game</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
    
    {/* Subscription overlay for free users - outside the blurred card */}
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

  const renderMoneylineInsight = (insight: MoneylineInsight) => (
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
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-foreground">Win Rate</span>
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
            <span className="text-sm font-semibold text-foreground">Trend</span>
          </div>
          <p className="text-2xl font-bold text-purple-500 capitalize">{insight.trend}</p>
          <p className="text-sm text-muted-foreground">Performance direction</p>
        </div>
      </div>
      
      {/* Detailed Analysis Section */}
      <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
        <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Detailed Analysis
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Team Performance</p>
                <p className="text-sm text-muted-foreground">Recent form and key performance indicators</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Head-to-Head</p>
                <p className="text-sm text-muted-foreground">Historical matchup data and trends</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Situational Factors</p>
                <p className="text-sm text-muted-foreground">Home field advantage and rest days</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div>
                <p className="font-semibold text-foreground">Market Analysis</p>
                <p className="text-sm text-muted-foreground">Odds movement and betting patterns</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
    
    {/* Subscription overlay for free users - outside the blurred card */}
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
          
          <div className="grid grid-cols-1 gap-6">
            {gameInsights.map(renderGameInsight)}
            {playerInsights.map(renderPlayerInsight)}
            {moneylineInsights.map(renderMoneylineInsight)}
          </div>
        </TabsContent>

        {/* Game Insights */}
        <TabsContent value="game" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {gameInsights.map(renderGameInsight)}
          </div>
        </TabsContent>

        {/* Player Insights */}
        <TabsContent value="player" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {playerInsights.map(renderPlayerInsight)}
          </div>
        </TabsContent>

        {/* Moneyline Insights */}
        <TabsContent value="moneyline" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {moneylineInsights.map(renderMoneylineInsight)}
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
              AI-powered analysis of the best underdog moneyline opportunities with detailed reasoning and value analysis
            </p>
            
            {/* Underdog Cards - Bigger Column Layout */}
            <div className="grid grid-cols-1 gap-6">
              {moneylineInsights.filter(insight => insight.underdog_opportunity).map((insight) => (
                <div key={insight.insight_id} className="relative">
                  <Card className={cn(
                    "p-8 hover:shadow-card-hover transition-all duration-300 hover-scale group bg-gradient-card border-border/50 hover:border-primary/30 cursor-pointer",
                    !isSubscribed && "blur-sm"
                  )}>
                    
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                          <Target className="w-6 h-6 text-white" />
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
                        <Badge variant="outline" className="bg-green-500/10 text-green-500">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Underdog Opportunity
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-semibold text-foreground">Win Rate</span>
                        </div>
                        <p className="text-3xl font-bold text-green-500">{insight.value}%</p>
                        <p className="text-sm text-muted-foreground">
                          {insight.change_percent > 0 ? '+' : ''}{insight.change_percent}% vs last period
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-semibold text-foreground">Matchup</span>
                        </div>
                        <p className="text-lg font-bold text-foreground">{insight.team_name} vs {insight.opponent_name}</p>
                        <p className="text-sm text-muted-foreground">{insight.game_date}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-purple-500" />
                          <span className="text-sm font-semibold text-foreground">Value Rating</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-500">High</p>
                        <p className="text-sm text-muted-foreground">Based on AI analysis</p>
                      </div>
                    </div>
                    
                    {/* Detailed Analysis Section */}
                    <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
                      <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-primary" />
                        Detailed Analysis
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                            <div>
                              <p className="font-semibold text-foreground">Recent Form</p>
                              <p className="text-sm text-muted-foreground">Team has exceeded expectations in 3 of last 4 games</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                            <div>
                              <p className="font-semibold text-foreground">Head-to-Head</p>
                              <p className="text-sm text-muted-foreground">Historical matchup data favors the underdog</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
                            <div>
                              <p className="font-semibold text-foreground">Injury Impact</p>
                              <p className="text-sm text-muted-foreground">Key players healthy, no major concerns</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
                            <div>
                              <p className="font-semibold text-foreground">Market Value</p>
                              <p className="text-sm text-muted-foreground">Odds provide excellent value opportunity</p>
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
                    description="Subscribe to view detailed underdog analysis"
                    buttonText="Upgrade to Pro"
                    size="small"
                    onUpgrade={handleUpgrade}
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
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
                  {moneylineInsights.map(renderMoneylineInsight)}
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
              Comprehensive moneyline analysis with team performance metrics and matchup insights
            </p>
            
            {/* Regular Moneyline Cards - Bigger Column Layout */}
            <div className="grid grid-cols-1 gap-6">
              {moneylineInsights.filter(insight => !insight.underdog_opportunity).map((insight) => (
                <div key={insight.insight_id} className="relative">
                  <Card className={cn(
                    "p-8 hover:shadow-card-hover transition-all duration-300 hover-scale group bg-gradient-card border-border/50 hover:border-primary/30 cursor-pointer",
                    !isSubscribed && "blur-sm"
                  )}>
                    
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <BarChart3 className="w-6 h-6 text-white" />
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
                          Standard Analysis
                        </Badge>
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
                          <span className="text-sm font-semibold text-foreground">Trend</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-500 capitalize">{insight.trend}</p>
                        <p className="text-sm text-muted-foreground">Performance direction</p>
                      </div>
                    </div>
                    
                    {/* Detailed Analysis Section */}
                    <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
                      <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-primary" />
                        Detailed Analysis
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                            <div>
                              <p className="font-semibold text-foreground">Team Performance</p>
                              <p className="text-sm text-muted-foreground">Consistent performance metrics over recent games</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                            <div>
                              <p className="font-semibold text-foreground">Offensive Efficiency</p>
                              <p className="text-sm text-muted-foreground">Strong offensive metrics and scoring trends</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
                            <div>
                              <p className="font-semibold text-foreground">Defensive Strength</p>
                              <p className="text-sm text-muted-foreground">Solid defensive performance and key stops</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
                            <div>
                              <p className="font-semibold text-foreground">Situational Factors</p>
                              <p className="text-sm text-muted-foreground">Home field advantage and rest days considered</p>
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
                    description="Subscribe to view detailed moneyline analysis"
                    buttonText="Upgrade to Pro"
                    size="small"
                    onUpgrade={handleUpgrade}
                  />
                </div>
              ))}
            </div>
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
                .reduce((acc, insight) => acc + insight.confidence, 0) / 
              (gameInsights.length + playerInsights.length + moneylineInsights.length)
            )}%
          </p>
          <p className="text-sm text-muted-foreground">Overall accuracy</p>
        </Card>
      </div>
    </div>
  );
};
