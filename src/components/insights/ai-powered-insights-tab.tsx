// AI-Powered Insights Tab - Integrates Advanced AI Prediction Model with SportsGameOdds API
// Provides sophisticated insights based on advanced AI analysis and real performance data

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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  aiPoweredInsightsService,
  type AIPoweredGameInsight,
  type AIPoweredPlayerInsight,
  type AIPoweredMoneylineInsight,
  type AIPoweredPredictionAnalytics,
} from "@/services/ai-powered-insights-service";

interface AIPoweredInsightsTabProps {
  selectedSport: string;
  userRole?: string;
  userSubscription?: string;
}

export const AIPoweredInsightsTab: React.FC<AIPoweredInsightsTabProps> = ({
  selectedSport,
  userRole = "user",
  userSubscription = "free",
}) => {
  const navigate = useNavigate();
  const access = useAccess();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<
    "all" | "game" | "player" | "moneyline" | "underdogs" | "regular-moneyline"
  >("all");

  const handleUpgrade = () => {
    navigate("/subscription");
  };

  // State for AI-powered insights data
  const [gameInsights, setGameInsights] = useState<AIPoweredGameInsight[]>([]);
  const [playerInsights, setPlayerInsights] = useState<AIPoweredPlayerInsight[]>([]);
  const [moneylineInsights, setMoneylineInsights] = useState<AIPoweredMoneylineInsight[]>([]);
  const [predictionAnalytics, setPredictionAnalytics] =
    useState<AIPoweredPredictionAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const isSubscribed = access.can("analytics").allowed;

  useEffect(() => {
    if (!isSubscribed) {
      analyticsClient.trackEvent("access_denied", {
        area: "insights-ai",
        feature: "analytics",
        reason: "Pro required",
        needed: "pro",
        role: access.role,
        subscription: access.subscription,
      });
      toast({
        title: "Locked content",
        description: "Upgrade to Pro to unlock AI-Powered Insights.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubscribed]);

  // Load AI-powered insights data
  useEffect(() => {
    const loadInsights = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log(
          `🧠 [AIPoweredInsightsTab] Loading AI-powered insights for ${selectedSport}...`,
        );

        // Load all insights data in parallel
        const [gameData, playerData, moneylineData, analyticsData] = await Promise.all([
          aiPoweredInsightsService.getGameInsights(selectedSport, 7),
          aiPoweredInsightsService.getPlayerInsights(selectedSport, 7),
          aiPoweredInsightsService.getMoneylineInsights(selectedSport, 7),
          aiPoweredInsightsService.getPredictionAnalytics(selectedSport, 30),
        ]);

        setGameInsights(gameData);
        setPlayerInsights(playerData);
        setMoneylineInsights(moneylineData);
        setPredictionAnalytics(analyticsData);
        setLastRefresh(new Date());

        console.log(
          `✅ [AIPoweredInsightsTab] Successfully loaded AI-powered insights for ${selectedSport}`,
        );
      } catch (error) {
        console.error("Error loading AI-powered insights:", error);
        setError(error instanceof Error ? error.message : "Failed to load AI-powered insights");
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
        `🧠 [AIPoweredInsightsTab] Refreshing AI-powered insights for ${selectedSport}...`,
      );

      // Clear cache and reload
      aiPoweredInsightsService.clearCache();

      const [gameData, playerData, moneylineData, analyticsData] = await Promise.all([
        aiPoweredInsightsService.getGameInsights(selectedSport, 7),
        aiPoweredInsightsService.getPlayerInsights(selectedSport, 7),
        aiPoweredInsightsService.getMoneylineInsights(selectedSport, 7),
        aiPoweredInsightsService.getPredictionAnalytics(selectedSport, 30),
      ]);

      setGameInsights(gameData);
      setPlayerInsights(playerData);
      setMoneylineInsights(moneylineData);
      setPredictionAnalytics(analyticsData);
      setLastRefresh(new Date());

      console.log(
        `✅ [AIPoweredInsightsTab] Successfully refreshed AI-powered insights for ${selectedSport}`,
      );
    } catch (error) {
      console.error("Error refreshing AI-powered insights:", error);
      setError(error instanceof Error ? error.message : "Failed to refresh AI-powered insights");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions for rendering insights
  const getTrendIcon = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return <ArrowUp className="w-4 h-4 text-green-500" />;
      case "down":
        return <ArrowDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRecommendationIcon = (recommendation?: string) => {
    switch (recommendation) {
      case "strong_buy":
        return <Sparkles className="w-4 h-4 text-green-600" />;
      case "buy":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "hold":
        return <Minus className="w-4 h-4 text-yellow-500" />;
      case "avoid":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case "strong_avoid":
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRecommendationColor = (recommendation?: string) => {
    switch (recommendation) {
      case "strong_buy":
        return "bg-green-100 text-green-800 border-green-200";
      case "buy":
        return "bg-green-50 text-green-700 border-green-100";
      case "hold":
        return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "avoid":
        return "bg-red-50 text-red-700 border-red-100";
      case "strong_avoid":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-100";
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "ai_hot_team_streak":
        return <Cpu className="w-5 h-5 text-red-500" />;
      case "ai_defensive_advantage":
        return <Shield className="w-5 h-5 text-blue-500" />;
      case "ai_hot_streak":
        return <Flame className="w-5 h-5 text-red-500" />;
      case "ai_recent_form":
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case "ai_h2h_advantage":
        return <Target className="w-5 h-5 text-orange-500" />;
      default:
        return <Brain className="w-5 h-5 text-gray-500" />;
    }
  };

  const renderAIPoweredGameInsight = (insight: AIPoweredGameInsight) => (
    <div key={insight.insight_id} className="relative">
      <Card
        className={cn(
          "p-8 hover:shadow-card-hover transition-all duration-300 hover-scale group bg-gradient-card border-border/50 hover:border-primary/30 cursor-pointer",
          !isSubscribed && "blur-sm",
        )}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              {getInsightIcon(insight.insight_type)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                {insight.title}
                <Sparkles className="w-4 h-4 text-yellow-500" />
              </h3>
              <p className="text-muted-foreground mt-1">{insight.description}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary">
              {insight.confidence}% confidence
            </Badge>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-500">
              <Cpu className="w-3 h-3 mr-1" />
              AI Analysis
            </Badge>
            {insight.recommendation && (
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
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-foreground">AI Performance</span>
            </div>
            <p className="text-3xl font-bold text-blue-500">{insight.value}%</p>
            <p className="text-sm text-muted-foreground">
              {insight.change_percent > 0 ? "+" : ""}
              {insight.change_percent}% vs last period
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold text-foreground">Matchup</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {insight.team_name} vs {insight.opponent_name}
            </p>
            <p className="text-sm text-muted-foreground">{insight.game_date}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-foreground">Data Quality</span>
            </div>
            <p className="text-2xl font-bold text-purple-500">{insight.data_points}</p>
            <p className="text-sm text-muted-foreground">{insight.sample_size}</p>
          </div>
        </div>

        {/* AI Analysis Section */}
        <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
          <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Analysis Breakdown
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
                <div>
                  <p className="font-semibold text-foreground">Model Consensus</p>
                  <p className="text-sm text-muted-foreground">
                    {(insight.ai_analysis.model_consensus * 100).toFixed(1)}% AI agreement
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                <div>
                  <p className="font-semibold text-foreground">Expected Value</p>
                  <p className="text-sm text-muted-foreground">
                    {insight.ai_analysis.expected_value.toFixed(1)}% EV
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                <div>
                  <p className="font-semibold text-foreground">Risk Assessment</p>
                  <p className="text-sm text-muted-foreground">
                    {insight.ai_analysis.risk_score} risk factors
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
                <div>
                  <p className="font-semibold text-foreground">Key Factors</p>
                  <div className="text-sm text-muted-foreground">
                    {insight.ai_analysis.key_factors.map((factor, idx) => (
                      <span key={idx}>
                        {factor}
                        {idx < insight.ai_analysis.key_factors.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2"></div>
                <div>
                  <p className="font-semibold text-foreground">Data Sources</p>
                  <div className="text-sm text-muted-foreground">
                    {insight.ai_analysis.data_sources.map((source, idx) => (
                      <span key={idx}>
                        {source}
                        {idx < insight.ai_analysis.data_sources.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Subscription overlay for free users */}
      <SubscriptionOverlay
        isVisible={!isSubscribed}
        icon={<Brain className="w-5 h-5 text-primary" />}
        title="Premium AI Content"
        description="Subscribe to view advanced AI-powered insights"
        buttonText="Upgrade to Pro"
        size="small"
        onUpgrade={handleUpgrade}
      />
    </div>
  );

  const renderAIPoweredPlayerInsight = (insight: AIPoweredPlayerInsight) => (
    <div key={insight.insight_id} className="relative">
      <Card
        className={cn(
          "p-8 hover:shadow-card-hover transition-all duration-300 hover-scale group bg-gradient-card border-border/50 hover:border-primary/30 cursor-pointer",
          !isSubscribed && "blur-sm",
        )}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              {getInsightIcon(insight.insight_type)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                {insight.title}
                <Sparkles className="w-4 h-4 text-yellow-500" />
              </h3>
              <p className="text-muted-foreground mt-1">{insight.description}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary">
              {insight.confidence}% confidence
            </Badge>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-500">
              <Users className="w-3 h-3 mr-1" />
              AI Player Analysis
            </Badge>
            {insight.recommendation && (
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
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-foreground">AI Performance</span>
            </div>
            <p className="text-3xl font-bold text-purple-500">{insight.value}%</p>
            <p className="text-sm text-muted-foreground">
              {insight.change_percent > 0 ? "+" : ""}
              {insight.change_percent}% vs last period
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold text-foreground">Player</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {insight.player_name} ({insight.player_position})
            </p>
            <p className="text-sm text-muted-foreground">{insight.team_name}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-foreground">Prop Type</span>
            </div>
            <p className="text-lg font-bold text-blue-500">{insight.prop_type}</p>
            <p className="text-sm text-muted-foreground">AI analyzed</p>
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

        {/* AI Analysis Section */}
        <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
          <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Model Analysis
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
                <div>
                  <p className="font-semibold text-foreground">Advanced Model</p>
                  <p className="text-sm text-muted-foreground">
                    {(insight.ai_analysis.advanced_model_score * 100).toFixed(1)}% confidence
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                <div>
                  <p className="font-semibold text-foreground">ML Model</p>
                  <p className="text-sm text-muted-foreground">
                    {(insight.ai_analysis.ml_model_score * 100).toFixed(1)}% confidence
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                <div>
                  <p className="font-semibold text-foreground">Ensemble Score</p>
                  <p className="text-sm text-muted-foreground">
                    {(insight.ai_analysis.ensemble_score * 100).toFixed(1)}% consensus
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
                <div>
                  <p className="font-semibold text-foreground">Data Quality</p>
                  <p className="text-sm text-muted-foreground">
                    {insight.ai_analysis.data_quality}/100 quality score
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-2"></div>
                <div>
                  <p className="font-semibold text-foreground">Risk Factors</p>
                  <div className="text-sm text-muted-foreground">
                    {insight.ai_analysis.risk_factors.map((risk, idx) => (
                      <span key={idx}>
                        {risk}
                        {idx < insight.ai_analysis.risk_factors.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2"></div>
                <div>
                  <p className="font-semibold text-foreground">Key Insights</p>
                  <div className="text-sm text-muted-foreground">
                    {insight.ai_analysis.key_insights.map((text, idx) => (
                      <span key={idx}>
                        {text}
                        {idx < insight.ai_analysis.key_insights.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
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
        title="Premium AI Content"
        description="Subscribe to view advanced AI player insights"
        buttonText="Upgrade to Pro"
        size="small"
        onUpgrade={handleUpgrade}
      />
    </div>
  );

  const renderAIPoweredMoneylineInsight = (insight: AIPoweredMoneylineInsight) => (
    <div key={insight.insight_id} className="relative">
      <Card
        className={cn(
          "p-8 hover:shadow-card-hover transition-all duration-300 hover-scale group bg-gradient-card border-border/50 hover:border-primary/30 cursor-pointer",
          !isSubscribed && "blur-sm",
        )}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              {getInsightIcon(insight.insight_type)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                {insight.title}
                <Sparkles className="w-4 h-4 text-yellow-500" />
              </h3>
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
                AI Underdog Opportunity
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-500">
                <Target className="w-3 h-3 mr-1" />
                AI Moneyline Analysis
              </Badge>
            )}
            {insight.recommendation && (
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
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-semibold text-foreground">AI Success Rate</span>
            </div>
            <p className="text-3xl font-bold text-orange-500">{insight.value}%</p>
            <p className="text-sm text-muted-foreground">
              {insight.change_percent > 0 ? "+" : ""}
              {insight.change_percent}% vs last period
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold text-foreground">Matchup</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {insight.team_name} vs {insight.opponent_name}
            </p>
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

        {/* AI Analysis Section */}
        <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
          <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Situational Analysis
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
                <div>
                  <p className="font-semibold text-foreground">Situational Motivation</p>
                  <p className="text-sm text-muted-foreground">
                    {(insight.ai_analysis.situational_motivation * 100).toFixed(1)}% motivation
                    score
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                <div>
                  <p className="font-semibold text-foreground">Matchup Advantage</p>
                  <p className="text-sm text-muted-foreground">
                    {(insight.ai_analysis.matchup_advantage * 100).toFixed(1)}% advantage
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                <div>
                  <p className="font-semibold text-foreground">Weather Impact</p>
                  <p className="text-sm text-muted-foreground">
                    {(insight.ai_analysis.weather_impact * 100).toFixed(1)}% impact factor
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
                <div>
                  <p className="font-semibold text-foreground">Advanced Metrics</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>
                      EPA Differential:{" "}
                      {insight.ai_analysis.advanced_metrics.epa_differential.toFixed(2)}
                    </div>
                    <div>
                      Success Rate:{" "}
                      {(
                        insight.ai_analysis.advanced_metrics.success_rate_differential * 100
                      ).toFixed(1)}
                      %
                    </div>
                    <div>
                      Pace Advantage:{" "}
                      {(insight.ai_analysis.advanced_metrics.pace_advantage * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2"></div>
                <div>
                  <p className="font-semibold text-foreground">Psychological Factors</p>
                  <div className="text-sm text-muted-foreground">
                    {insight.ai_analysis.psychological_factors.map((factor, idx) => (
                      <span key={idx}>
                        {factor}
                        {idx < insight.ai_analysis.psychological_factors.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
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
        title="Premium AI Content"
        description="Subscribe to view advanced AI moneyline insights"
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
          <p className="text-muted-foreground">Loading AI-powered insights...</p>
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
            Error Loading AI-Powered Insights
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
      {/* Header with refresh button */}
      <div className="text-center">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1"></div>
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-3">
              AI-Powered Insights Dashboard
              <Sparkles className="w-8 h-8 text-yellow-500" />
            </h1>
            <p className="text-muted-foreground">
              Advanced AI analysis powered by machine learning models and SportsGameOdds API for{" "}
              {selectedSport.toUpperCase()}
            </p>
          </div>
          <div className="flex-1 flex justify-end">
            <Button onClick={refreshInsights} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh AI
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Last updated: {lastRefresh.toLocaleTimeString()} | AI Model v2.0.0
        </p>
      </div>

      {/* Filter Tabs */}
      <Tabs
        value={activeFilter}
        onValueChange={(value) =>
          setActiveFilter(
            value as "all" | "game" | "player" | "moneyline" | "underdogs" | "regular-moneyline",
          )
        }
      >
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All AI Insights</TabsTrigger>
          <TabsTrigger value="game">AI Game Analysis</TabsTrigger>
          <TabsTrigger value="player">AI Player Analysis</TabsTrigger>
          <TabsTrigger value="moneyline">AI Moneyline</TabsTrigger>
          <TabsTrigger value="underdogs">AI Underdogs</TabsTrigger>
          <TabsTrigger value="regular-moneyline">AI Regular</TabsTrigger>
        </TabsList>

        {/* All Insights */}
        <TabsContent value="all" className="space-y-6">
          {/* AI Analytics Summary */}
          {predictionAnalytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="p-4 bg-gradient-card border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-foreground">AI Predictions</h3>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {predictionAnalytics.total_predictions.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">AI-analyzed predictions</p>
              </Card>

              <Card className="p-4 bg-gradient-card border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold text-foreground">AI Win Rate</h3>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {predictionAnalytics.win_rate}%
                </p>
                <p className="text-sm text-muted-foreground">AI accuracy</p>
              </Card>

              <Card className="p-4 bg-gradient-card border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-semibold text-foreground">AI Profit</h3>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {predictionAnalytics.total_profit >= 0 ? "+" : ""}$
                  {predictionAnalytics.total_profit.toFixed(0)}
                </p>
                <p className="text-sm text-muted-foreground">AI-optimized returns</p>
              </Card>

              <Card className="p-4 bg-gradient-card border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <Brain className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold text-foreground">AI Quality</h3>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {predictionAnalytics.data_quality_score}/100
                </p>
                <p className="text-sm text-muted-foreground">AI reliability score</p>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            {gameInsights.map(renderAIPoweredGameInsight)}
            {playerInsights.map(renderAIPoweredPlayerInsight)}
            {moneylineInsights.map(renderAIPoweredMoneylineInsight)}
          </div>
        </TabsContent>

        {/* Game Insights */}
        <TabsContent value="game" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {gameInsights.map(renderAIPoweredGameInsight)}
          </div>
        </TabsContent>

        {/* Player Insights */}
        <TabsContent value="player" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {playerInsights.map(renderAIPoweredPlayerInsight)}
          </div>
        </TabsContent>

        {/* Moneyline Insights */}
        <TabsContent value="moneyline" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {moneylineInsights.map(renderAIPoweredMoneylineInsight)}
          </div>
        </TabsContent>

        {/* Top Underdogs Tab */}
        <TabsContent value="underdogs" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                AI-Powered Underdog Opportunities
              </h2>
              <Badge variant="outline" className="gap-1">
                <Sparkles className="w-3 h-3" />
                AI High Value
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Advanced AI analysis identifies the best underdog moneyline opportunities using
              machine learning models and comprehensive data analysis
            </p>

            <div className="grid grid-cols-1 gap-6">
              {moneylineInsights
                .filter((insight) => insight.underdog_opportunity)
                .map(renderAIPoweredMoneylineInsight)}
            </div>
          </div>
        </TabsContent>

        {/* Regular Moneyline Tab */}
        <TabsContent value="regular-moneyline" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">AI Regular Moneyline Analysis</h2>
              <Badge variant="outline" className="gap-1">
                <Brain className="w-3 h-3" />
                AI Standard Analysis
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Comprehensive AI-powered moneyline analysis with advanced team performance metrics and
              sophisticated matchup insights
            </p>

            <div className="grid grid-cols-1 gap-6">
              {moneylineInsights
                .filter((insight) => !insight.underdog_opportunity)
                .map(renderAIPoweredMoneylineInsight)}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* AI Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-foreground">AI Insights</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {gameInsights.length + playerInsights.length + moneylineInsights.length}
          </p>
          <p className="text-sm text-muted-foreground">AI-powered insights</p>
        </Card>

        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-foreground">AI Hot Streaks</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {playerInsights.filter((i) => i.insight_type === "ai_hot_streak").length}
          </p>
          <p className="text-sm text-muted-foreground">AI-identified trends</p>
        </Card>

        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-foreground">AI Opportunities</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {moneylineInsights.filter((i) => i.underdog_opportunity).length}
          </p>
          <p className="text-sm text-muted-foreground">AI value bets</p>
        </Card>

        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-foreground">AI Confidence</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {Math.round(
              [...gameInsights, ...playerInsights, ...moneylineInsights].reduce(
                (acc, insight) => acc + insight.confidence,
                0,
              ) /
                (gameInsights.length + playerInsights.length + moneylineInsights.length),
            )}
            %
          </p>
          <p className="text-sm text-muted-foreground">AI reliability</p>
        </Card>
      </div>
    </div>
  );
};
