// Outlier-Style Insights Tab - Actionable Betting Insights
// Focuses on specific betting opportunities with clear performance data and odds
// Similar to app.outlier.bet's insights approach

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubscriptionOverlay } from "@/components/ui/subscription-overlay";
import { useAccess } from "@/hooks/use-access";
import { analyticsClient } from "@/lib/analytics-client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
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
  Shield,
  Cpu,
  Database,
  GitBranch,
  Sparkles,
  DollarSign,
  Percent,
  Clock,
  Filter,
  Search,
  Eye,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  outlierStyleInsightsService,
  type BettingInsight,
  type BettingTrend,
} from "@/services/outlier-style-insights-service";

interface OutlierStyleInsightsTabProps {
  selectedSport: string;
  userRole?: string;
  userSubscription?: string;
}

export const OutlierStyleInsightsTab: React.FC<OutlierStyleInsightsTabProps> = ({
  selectedSport,
  userRole = "user",
  userSubscription = "free",
}) => {
  const navigate = useNavigate();
  const access = useAccess();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<"all" | "hot" | "cold" | "h2h" | "trends">(
    "all",
  );
  const [searchTerm, setSearchTerm] = useState("");

  const handleUpgrade = () => {
    navigate("/subscription");
  };

  // State for betting insights data
  const [bettingInsights, setBettingInsights] = useState<BettingInsight[]>([]);
  const [bettingTrends, setBettingTrends] = useState<BettingTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const isSubscribed = access.can("analytics").allowed;

  useEffect(() => {
    if (!isSubscribed) {
      analyticsClient.trackEvent("access_denied", {
        area: "insights-outlier",
        feature: "analytics",
        reason: "Pro required",
        needed: "pro",
        role: access.role,
        subscription: access.subscription,
      });
      toast({ title: "Locked content", description: "Upgrade to Pro to unlock Insights." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubscribed]);

  // Load betting insights data
  useEffect(() => {
    const loadInsights = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log(
          `🎯 [OutlierStyleInsightsTab] Loading actionable betting insights for ${selectedSport}...`,
        );

        // Load insights and trends in parallel
        const [insights, trends] = await Promise.all([
          outlierStyleInsightsService.getBettingInsights(selectedSport, 20),
          outlierStyleInsightsService.getBettingTrends(selectedSport, 10),
        ]);

        setBettingInsights(insights);
        setBettingTrends(trends);
        setLastRefresh(new Date());

        console.log(
          `✅ [OutlierStyleInsightsTab] Successfully loaded ${insights.length} betting insights and ${trends.length} trends for ${selectedSport}`,
        );
      } catch (error) {
        console.error("Error loading betting insights:", error);
        setError(error instanceof Error ? error.message : "Failed to load betting insights");
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
      console.log(
        `🎯 [OutlierStyleInsightsTab] Refreshing betting insights for ${selectedSport}...`,
      );

      // Clear cache and reload
      outlierStyleInsightsService.clearCache();

      const [insights, trends] = await Promise.all([
        outlierStyleInsightsService.getBettingInsights(selectedSport, 20),
        outlierStyleInsightsService.getBettingTrends(selectedSport, 10),
      ]);

      setBettingInsights(insights);
      setBettingTrends(trends);
      setLastRefresh(new Date());

      console.log(
        `✅ [OutlierStyleInsightsTab] Successfully refreshed betting insights for ${selectedSport}`,
      );
    } catch (error) {
      console.error("Error refreshing betting insights:", error);
      setError(error instanceof Error ? error.message : "Failed to refresh betting insights");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter insights based on active filter and search term
  const filteredInsights = bettingInsights.filter((insight) => {
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "hot" &&
        insight.type === "player_streak" &&
        insight.recommendation === "strong_bet") ||
      (activeFilter === "cold" &&
        insight.type === "player_streak" &&
        insight.recommendation === "avoid") ||
      (activeFilter === "h2h" && insight.type === "matchup_advantage");

    const matchesSearch =
      !searchTerm ||
      insight.player_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insight.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insight.prop_type.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Helper functions for rendering insights
  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case "strong_bet":
        return <ThumbsUp className="w-4 h-4 text-green-600" />;
      case "bet":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "lean":
        return <Minus className="w-4 h-4 text-yellow-500" />;
      case "avoid":
        return <ThumbsDown className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case "strong_bet":
        return "bg-green-100 text-green-800 border-green-200";
      case "bet":
        return "bg-green-50 text-green-700 border-green-100";
      case "lean":
        return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "avoid":
        return "bg-red-50 text-red-700 border-red-100";
      default:
        return "bg-gray-50 text-gray-700 border-gray-100";
    }
  };

  const getInsightTypeIcon = (type: string) => {
    switch (type) {
      case "player_streak":
        return <Flame className="w-5 h-5 text-orange-500" />;
      case "matchup_advantage":
        return <Target className="w-5 h-5 text-blue-500" />;
      case "value_opportunity":
        return <DollarSign className="w-5 h-5 text-green-500" />;
      case "contrarian_play":
        return <TrendingDown className="w-5 h-5 text-purple-500" />;
      default:
        return <BarChart3 className="w-5 h-5 text-gray-500" />;
    }
  };

  const renderBettingInsight = (insight: BettingInsight) => (
    <div key={insight.insight_id} className="relative">
      <Card
        className={cn(
          "p-6 hover:shadow-card-hover transition-all duration-300 hover-scale group bg-gradient-card border-border/50 hover:border-primary/30 cursor-pointer",
          !isSubscribed && "blur-sm",
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              {getInsightTypeIcon(insight.type)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{insight.title}</h3>
              <p className="text-sm text-muted-foreground">{insight.description}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary">
              {insight.confidence}% confidence
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "flex items-center gap-1",
                getRecommendationColor(insight.recommendation),
              )}
            >
              {getRecommendationIcon(insight.recommendation)}
              {insight.recommendation.replace("_", " ")}
            </Badge>
          </div>
        </div>

        {/* Key Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-foreground">Hit Rate</span>
            </div>
            <p className="text-xl font-bold text-blue-500">
              {insight.performance_metrics.hit_rate}%
            </p>
            <p className="text-xs text-muted-foreground">
              {insight.performance_metrics.total_games} games
            </p>
          </div>

          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold text-foreground">Expected Value</span>
            </div>
            <p className="text-xl font-bold text-green-500">{insight.expected_value.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">EV</p>
          </div>

          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-foreground">Key Stat</span>
            </div>
            <p className="text-sm font-bold text-purple-500">{insight.key_stat}</p>
          </div>
        </div>

        {/* Betting Details */}
        <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Betting Details
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Player:</span>
                  <span className="text-sm font-medium text-foreground">{insight.player_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Prop:</span>
                  <span className="text-sm font-medium text-foreground">{insight.prop_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Line:</span>
                  <span className="text-sm font-medium text-foreground">{insight.line}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Odds:</span>
                  <span className="text-sm font-medium text-foreground">
                    {insight.current_odds.over}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Recent Performance
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">L5:</span>
                  <span className="text-sm font-medium text-foreground">
                    {insight.performance_metrics.last_5_hits}/5
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">L10:</span>
                  <span className="text-sm font-medium text-foreground">
                    {insight.performance_metrics.last_10_hits}/10
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">L20:</span>
                  <span className="text-sm font-medium text-foreground">
                    {insight.performance_metrics.last_20_hits}/20
                  </span>
                </div>
                {insight.performance_metrics.streak_length && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Streak:</span>
                    <span className="text-sm font-medium text-foreground">
                      {insight.performance_metrics.streak_length} games
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Subscription overlay for free users */}
      <SubscriptionOverlay
        isVisible={!isSubscribed}
        icon={<Target className="w-5 h-5 text-primary" />}
        title="Premium Betting Insights"
        description="Subscribe to view actionable betting opportunities"
        buttonText="Upgrade to Pro"
        size="small"
        onUpgrade={handleUpgrade}
      />
    </div>
  );

  const renderBettingTrend = (trend: BettingTrend) => (
    <Card
      key={trend.trend_id}
      className="p-6 bg-gradient-card border-border/50 hover:shadow-card-hover transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            {trend.trend_type === "hot" ? (
              <Flame className="w-5 h-5 text-orange-500" />
            ) : trend.trend_type === "cold" ? (
              <TrendingDown className="w-5 h-5 text-blue-500" />
            ) : trend.trend_type === "situational" ? (
              <Target className="w-5 h-5 text-green-500" />
            ) : (
              <BarChart3 className="w-5 h-5 text-purple-500" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{trend.title}</h3>
            <p className="text-sm text-muted-foreground">{trend.description}</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-purple-500/10 text-purple-500">
          {trend.confidence}% confidence
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="bg-muted/30 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-foreground mb-1">Performance Summary</h4>
          <p className="text-sm text-muted-foreground">{trend.performance_summary}</p>
        </div>

        <div className="bg-muted/30 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-foreground mb-1">Betting Implication</h4>
          <p className="text-sm text-muted-foreground">{trend.betting_implication}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {trend.players_or_teams.map((item, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {item}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading actionable betting insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Error Loading Betting Insights
          </h3>
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
      {/* Header with search and refresh */}
      <div className="text-center">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1"></div>
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-3">
              Actionable Betting Insights
              <Target className="w-8 h-8 text-blue-500" />
            </h1>
            <p className="text-muted-foreground">
              Find your next bet with data-driven insights for {selectedSport.toUpperCase()}
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

      {/* Search and Filter Bar */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search players, teams, or props..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs
        value={activeFilter}
        onValueChange={(value) =>
          setActiveFilter(value as "all" | "hot" | "cold" | "h2h" | "trends")
        }
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Insights</TabsTrigger>
          <TabsTrigger value="hot">Hot Streaks</TabsTrigger>
          <TabsTrigger value="cold">Cold Streaks</TabsTrigger>
          <TabsTrigger value="h2h">H2H Matchups</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* All Insights */}
        <TabsContent value="all" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">{filteredInsights.map(renderBettingInsight)}</div>
        </TabsContent>

        {/* Hot Streaks */}
        <TabsContent value="hot" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">{filteredInsights.map(renderBettingInsight)}</div>
        </TabsContent>

        {/* Cold Streaks */}
        <TabsContent value="cold" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">{filteredInsights.map(renderBettingInsight)}</div>
        </TabsContent>

        {/* H2H Matchups */}
        <TabsContent value="h2h" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">{filteredInsights.map(renderBettingInsight)}</div>
        </TabsContent>

        {/* Trends */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">{bettingTrends.map(renderBettingTrend)}</div>
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-foreground">Total Insights</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">{bettingInsights.length}</p>
          <p className="text-sm text-muted-foreground">Actionable opportunities</p>
        </Card>

        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <ThumbsUp className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-foreground">Strong Bets</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {bettingInsights.filter((i) => i.recommendation === "strong_bet").length}
          </p>
          <p className="text-sm text-muted-foreground">High-confidence plays</p>
        </Card>

        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-foreground">Hot Streaks</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {
              bettingInsights.filter(
                (i) => i.type === "player_streak" && i.recommendation === "strong_bet",
              ).length
            }
          </p>
          <p className="text-sm text-muted-foreground">Players trending up</p>
        </Card>

        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-foreground">Avg EV</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {bettingInsights.length > 0
              ? (
                  bettingInsights.reduce((sum, i) => sum + i.expected_value, 0) /
                  bettingInsights.length
                ).toFixed(1)
              : "0.0"}
            %
          </p>
          <p className="text-sm text-muted-foreground">Expected value</p>
        </Card>
      </div>
    </div>
  );
};
