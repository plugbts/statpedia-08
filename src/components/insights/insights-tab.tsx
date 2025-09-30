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
  Away,
  Flame,
  Trophy,
  Activity,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus,
  Calendar,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MoneylineProps } from '@/components/predictions/moneyline-props';
import { UnderdogAnalysis } from '@/components/predictions/underdog-analysis';
import { seasonService } from '@/services/season-service';

interface InsightsTabProps {
  selectedSport: string;
  userRole?: string;
  userSubscription?: string;
}

interface GameInsight {
  id: string;
  type: 'over_hit_favorite' | 'spread_performance' | 'moneyline_home' | 'total_trends';
  title: string;
  description: string;
  value: number;
  trend: 'up' | 'down' | 'neutral';
  change: number;
  team?: string;
  opponent?: string;
  gameDate?: string;
  confidence: number;
}

interface PlayerInsight {
  id: string;
  type: 'hot_streak' | 'cold_streak' | 'home_advantage' | 'vs_opponent' | 'recent_form';
  title: string;
  description: string;
  value: number;
  trend: 'up' | 'down' | 'neutral';
  change: number;
  player: string;
  team: string;
  position: string;
  confidence: number;
  lastGame?: string;
}

export const InsightsTab: React.FC<InsightsTabProps> = ({ 
  selectedSport, 
  userRole = 'user', 
  userSubscription = 'free' 
}) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<'all' | 'game' | 'player'>('all');

  const handleUpgrade = () => {
    navigate('/subscription');
  };
  const [gameInsights, setGameInsights] = useState<GameInsight[]>([]);
  const [playerInsights, setPlayerInsights] = useState<PlayerInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
        setShouldShowMoneyline(seasonService.shouldShowMoneylinePredictionsSync(selectedSport));
        setOffseasonMessage(seasonService.getOffseasonMessageSync(selectedSport));
      } finally {
        setSeasonLoading(false);
      }
    };

    loadSeasonData();
  }, [selectedSport]);

  // Generate mock insights data
  useEffect(() => {
    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      generateMockInsights();
      setIsLoading(false);
    }, 1000);
  }, [selectedSport]);

  const generateMockInsights = () => {
    // Game Insights
    const gameInsightsData: GameInsight[] = [
      {
        id: '1',
        type: 'over_hit_favorite',
        title: 'Over Hit Rate as Favorite',
        description: `${selectedSport.toUpperCase()} teams favored by 3+ points hit the over 73.2% of the time`,
        value: 73.2,
        trend: 'up',
        change: 5.4,
        team: 'Chiefs',
        opponent: 'Raiders',
        gameDate: '2024-01-15',
        confidence: 87
      },
      {
        id: '2',
        type: 'spread_performance',
        title: 'Cover Rate at Home',
        description: 'Home teams cover the spread 58.7% of the time in divisional games',
        value: 58.7,
        trend: 'up',
        change: 2.1,
        team: 'Lakers',
        opponent: 'Warriors',
        gameDate: '2024-01-14',
        confidence: 82
      },
      {
        id: '3',
        type: 'moneyline_home',
        title: 'Moneyline Win % at Home',
        description: 'Home field advantage shows 64.3% moneyline win rate',
        value: 64.3,
        trend: 'neutral',
        change: 0.2,
        team: 'Cowboys',
        opponent: 'Eagles',
        gameDate: '2024-01-13',
        confidence: 79
      },
      {
        id: '4',
        type: 'total_trends',
        title: 'Over/Under Trends',
        description: 'Games with totals 45+ hit the over 68.9% in recent weeks',
        value: 68.9,
        trend: 'up',
        change: 8.7,
        team: 'Bills',
        opponent: 'Dolphins',
        gameDate: '2024-01-12',
        confidence: 91
      }
    ];

    // Player Insights
    const playerInsightsData: PlayerInsight[] = [
      {
        id: '1',
        type: 'hot_streak',
        title: 'Hot Streak Alert',
        description: 'Player has exceeded prop line in 7 of last 8 games',
        value: 87.5,
        trend: 'up',
        change: 12.3,
        player: 'Josh Allen',
        team: 'BUF',
        position: 'QB',
        confidence: 94,
        lastGame: '2024-01-15'
      },
      {
        id: '2',
        type: 'home_advantage',
        title: 'Home Field Advantage',
        description: 'Player performs 23% better at home vs away',
        value: 23.0,
        trend: 'up',
        change: 4.2,
        player: 'LeBron James',
        team: 'LAL',
        position: 'SF',
        confidence: 88,
        lastGame: '2024-01-14'
      },
      {
        id: '3',
        type: 'vs_opponent',
        title: 'vs Opponent History',
        description: 'Player averages 15% above season average vs this opponent',
        value: 15.0,
        trend: 'up',
        change: 2.8,
        player: 'Travis Kelce',
        team: 'KC',
        position: 'TE',
        confidence: 85,
        lastGame: '2024-01-13'
      },
      {
        id: '4',
        type: 'recent_form',
        title: 'Recent Form',
        description: 'Player has been trending up with 3 straight over performances',
        value: 75.0,
        trend: 'up',
        change: 18.5,
        player: 'Tyreek Hill',
        team: 'MIA',
        position: 'WR',
        confidence: 92,
        lastGame: '2024-01-12'
      },
      {
        id: '5',
        type: 'cold_streak',
        title: 'Cold Streak Warning',
        description: 'Player has been under prop line in 5 of last 6 games',
        value: 16.7,
        trend: 'down',
        change: -22.1,
        player: 'Russell Wilson',
        team: 'DEN',
        position: 'QB',
        confidence: 78,
        lastGame: '2024-01-11'
      }
    ];

    setGameInsights(gameInsightsData);
    setPlayerInsights(playerInsightsData);
  };

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
    <div key={insight.id} className="relative">
      <Card className={cn(
        "p-6 hover:shadow-card-hover transition-all duration-300 hover-scale group bg-gradient-card border-border/50 hover:border-primary/30 cursor-pointer",
        !isSubscribed && "blur-sm"
      )}>
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getInsightIcon(insight.type)}
          <div>
            <h3 className="font-semibold text-foreground">{insight.title}</h3>
            <p className="text-sm text-muted-foreground">{insight.description}</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary">
          {insight.confidence}% confidence
        </Badge>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-foreground">{insight.value}%</span>
          <div className="flex items-center gap-1">
            {getTrendIcon(insight.trend)}
            <span className={cn("text-sm font-medium", getTrendColor(insight.trend))}>
              {insight.change > 0 ? '+' : ''}{insight.change}%
            </span>
          </div>
        </div>
        {insight.team && (
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{insight.team} vs {insight.opponent}</p>
            <p className="text-xs text-muted-foreground">{insight.gameDate}</p>
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
    <div key={insight.id} className="relative">
      <Card className={cn(
        "p-6 hover:shadow-card-hover transition-all duration-300 hover-scale group bg-gradient-card border-border/50 hover:border-primary/30 cursor-pointer",
        !isSubscribed && "blur-sm"
      )}>
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getInsightIcon(insight.type)}
          <div>
            <h3 className="font-semibold text-foreground">{insight.title}</h3>
            <p className="text-sm text-muted-foreground">{insight.description}</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary">
          {insight.confidence}% confidence
        </Badge>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-foreground">{insight.value}%</span>
          <div className="flex items-center gap-1">
            {getTrendIcon(insight.trend)}
            <span className={cn("text-sm font-medium", getTrendColor(insight.trend))}>
              {insight.change > 0 ? '+' : ''}{insight.change}%
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">{insight.player} ({insight.position})</p>
          <p className="text-xs text-muted-foreground">{insight.team} • {insight.lastGame}</p>
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">Insights Dashboard</h1>
        <p className="text-muted-foreground">
          Advanced analytics and trends for {selectedSport.toUpperCase()}
        </p>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {gameInsights.map(renderGameInsight)}
            {playerInsights.map(renderPlayerInsight)}
          </div>
        </TabsContent>

        {/* Game Insights */}
        <TabsContent value="game" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {gameInsights.map(renderGameInsight)}
          </div>
        </TabsContent>

        {/* Player Insights */}
        <TabsContent value="player" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {playerInsights.map(renderPlayerInsight)}
          </div>
        </TabsContent>

        {/* Moneyline Props */}
        <TabsContent value="moneyline" className="space-y-6">
          <div className="space-y-8">
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
      </Tabs>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-foreground">Total Insights</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {gameInsights.length + playerInsights.length}
          </p>
          <p className="text-sm text-muted-foreground">Active insights</p>
        </Card>

        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-foreground">Hot Streaks</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {playerInsights.filter(i => i.type === 'hot_streak').length}
          </p>
          <p className="text-sm text-muted-foreground">Players trending up</p>
        </Card>

        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-foreground">Avg Confidence</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {Math.round(
              [...gameInsights, ...playerInsights]
                .reduce((acc, insight) => acc + insight.confidence, 0) / 
              (gameInsights.length + playerInsights.length)
            )}%
          </p>
          <p className="text-sm text-muted-foreground">Overall accuracy</p>
        </Card>
      </div>
    </div>
  );
};
