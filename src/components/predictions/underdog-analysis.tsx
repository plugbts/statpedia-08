import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  Target,
  Brain,
  BarChart3,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  Zap,
  Activity,
  Calendar,
  Clock,
  MapPin,
  Shield,
  Star,
  TrendingDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  underdogAnalysisService,
  UnderdogAnalysis,
  WeeklyUnderdogReport,
} from "@/services/underdog-analysis-service";
import { cn } from "@/lib/utils";

interface UnderdogAnalysisProps {
  selectedSport?: string;
}

export const UnderdogAnalysis: React.FC<UnderdogAnalysisProps> = ({ selectedSport = "nfl" }) => {
  const [underdogs, setUnderdogs] = useState<UnderdogAnalysis[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyUnderdogReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSelectedSport, setLocalSelectedSport] = useState(selectedSport);
  const [activeTab, setActiveTab] = useState("analysis");
  const { toast } = useToast();

  useEffect(() => {
    loadUnderdogAnalysis();
  }, [localSelectedSport]);

  useEffect(() => {
    setLocalSelectedSport(selectedSport);
  }, [selectedSport]);

  const loadUnderdogAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [underdogData, reportData] = await Promise.all([
        underdogAnalysisService.getTopUnderdogs(localSelectedSport, 3),
        underdogAnalysisService.getWeeklyUnderdogReport(localSelectedSport),
      ]);

      setUnderdogs(underdogData);
      setWeeklyReport(reportData);

      toast({
        title: "Underdog Analysis Updated",
        description: `Found ${underdogData.length} high-value underdog opportunities`,
      });
    } catch (err) {
      setError("Failed to load underdog analysis");
      console.error("Error loading analysis:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : `${odds}`;
  };

  const getOddsColor = (odds: number) => {
    if (odds > 0) return "text-green-500";
    if (odds < -150) return "text-red-500";
    return "text-yellow-500";
  };

  const getValueColor = (value: number) => {
    if (value >= 8) return "text-green-500";
    if (value >= 6) return "text-yellow-500";
    return "text-red-500";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-500";
    if (confidence >= 0.6) return "text-yellow-500";
    return "text-red-500";
  };

  const getStakeColor = (stake: string) => {
    switch (stake) {
      case "large":
        return "text-green-500 bg-green-500/10";
      case "medium":
        return "text-yellow-500 bg-yellow-500/10";
      case "small":
        return "text-blue-500 bg-blue-500/10";
      default:
        return "text-gray-500 bg-gray-500/10";
    }
  };

  const getSportIcon = (sport: string) => {
    const icons = {
      NBA: "🏀",
      NFL: "🏈",
      MLB: "⚾",
      NHL: "🏒",
      SOCCER: "⚽",
    };
    return icons[sport as keyof typeof icons] || "🎯";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "text-red-500 bg-red-500/10";
      case "upcoming":
        return "text-blue-500 bg-blue-500/10";
      case "finished":
        return "text-gray-500 bg-gray-500/10";
      default:
        return "text-gray-500 bg-gray-500/10";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Analyzing underdog opportunities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" onClick={loadUnderdogAnalysis} className="ml-2">
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Underdog Analysis</h1>
          <p className="text-muted-foreground">
            AI-powered analysis of top underdog moneyline opportunities
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Sport:</span>
            <Select value={localSelectedSport} onValueChange={setLocalSelectedSport}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nba">NBA</SelectItem>
                <SelectItem value="nfl">NFL</SelectItem>
                <SelectItem value="mlb">MLB</SelectItem>
                <SelectItem value="nhl">NHL</SelectItem>
                <SelectItem value="soccer">Soccer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadUnderdogAnalysis}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <Badge variant="outline" className="gap-1">
              <Brain className="w-3 h-3" />
              AI Analysis
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Target className="w-3 h-3" />
              Top 3 Underdogs
            </Badge>
          </div>
        </div>
      </div>

      {/* Weekly Report Summary */}
      {weeklyReport && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 bg-gradient-card border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-foreground">Week {weeklyReport.week}</h3>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {weeklyReport.summary.underdogOpportunities}
            </p>
            <p className="text-sm text-muted-foreground">High-value opportunities found</p>
          </Card>

          <Card className="p-6 bg-gradient-card border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold text-foreground">Avg Value</h3>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {weeklyReport.summary.averageValueRating.toFixed(1)}/10
            </p>
            <p className="text-sm text-muted-foreground">Average value rating</p>
          </Card>

          <Card className="p-6 bg-gradient-card border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold text-foreground">Best Value</h3>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {weeklyReport.summary.highestValueRating.toFixed(1)}/10
            </p>
            <p className="text-sm text-muted-foreground">Highest value rating</p>
          </Card>

          <Card className="p-6 bg-gradient-card border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold text-foreground">Market Efficiency</h3>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {weeklyReport.summary.marketEfficiency.toFixed(0)}%
            </p>
            <p className="text-sm text-muted-foreground">Market efficiency score</p>
          </Card>
        </div>
      )}

      {/* Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analysis">Top Underdogs</TabsTrigger>
          <TabsTrigger value="report">Weekly Report</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            {underdogs.map((underdog, index) => (
              <Card key={underdog.game.id} className="hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getSportIcon(underdog.game.sport)}</span>
                        <Badge className={getStatusColor(underdog.game.status)}>
                          {underdog.game.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Week {underdog.game.week}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(underdog.game.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {underdog.game.time}
                      </div>
                    </div>
                  </div>
                  <CardTitle className="text-xl">
                    {underdog.game.homeTeam} vs {underdog.game.awayTeam}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    {underdog.game.venue} • {underdog.game.weather}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Underdog Highlight */}
                  <div className="text-center space-y-3 p-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center justify-center gap-2">
                      <TrendingUp className="w-6 h-6 text-green-500" />
                      <span className="text-lg font-semibold text-green-700 dark:text-green-300">
                        TOP UNDERDOG PICK
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {underdog.underdog.team}
                    </div>
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-2xl font-bold text-primary">
                        {formatOdds(underdog.underdog.odds)}
                      </div>
                      <div className="text-lg text-muted-foreground">
                        vs {underdog.favorite.team} ({formatOdds(underdog.favorite.odds)})
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-6 text-sm">
                      <div>
                        <span className="text-muted-foreground">AI Probability: </span>
                        <span className="font-semibold text-primary">
                          {(underdog.underdog.aiPredictedProbability * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Market Probability: </span>
                        <span className="font-semibold">
                          {(underdog.underdog.impliedProbability * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Value Metrics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center space-y-2 p-4 bg-muted/30 rounded-lg">
                      <div className="text-sm text-muted-foreground">Value Rating</div>
                      <div
                        className={cn(
                          "text-2xl font-bold",
                          getValueColor(underdog.underdog.valueRating),
                        )}
                      >
                        {underdog.underdog.valueRating.toFixed(1)}/10
                      </div>
                    </div>
                    <div className="text-center space-y-2 p-4 bg-muted/30 rounded-lg">
                      <div className="text-sm text-muted-foreground">Confidence</div>
                      <div
                        className={cn(
                          "text-2xl font-bold",
                          getConfidenceColor(underdog.underdog.confidence),
                        )}
                      >
                        {(underdog.underdog.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="text-center space-y-2 p-4 bg-muted/30 rounded-lg">
                      <div className="text-sm text-muted-foreground">Expected Value</div>
                      <div
                        className={cn(
                          "text-2xl font-bold",
                          underdog.recommendation.expectedValue > 0
                            ? "text-green-500"
                            : "text-red-500",
                        )}
                      >
                        {underdog.recommendation.expectedValue > 0 ? "+" : ""}
                        {(underdog.recommendation.expectedValue * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Cross-Reference Analysis */}
                  {underdog.crossReference && (
                    <div className="space-y-3 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="w-5 h-5 text-blue-500" />
                          <span className="font-semibold">AI Model Consensus</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "w-4 h-4",
                                i < underdog.crossReference!.valueRating
                                  ? "text-yellow-400 fill-current"
                                  : "text-muted-foreground",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {underdog.crossReference.consensus.toUpperCase()} •
                        {underdog.crossReference.agreement.toFixed(0)}% Agreement •
                        {underdog.crossReference.riskLevel.toUpperCase()} Risk
                      </div>
                      <div className="text-sm text-foreground">
                        {underdog.crossReference.reasoning}
                      </div>
                    </div>
                  )}

                  {/* Key Factors */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Why This Underdog Wins</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {underdog.analysis.keyFactors.map((factor, index) => (
                        <div key={index} className="space-y-2 p-4 bg-muted/20 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{factor.name}</span>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={Math.abs(factor.impact) * 100}
                                className="w-16 h-2"
                              />
                              <span
                                className={cn(
                                  "font-mono text-sm",
                                  factor.impact > 0 ? "text-green-500" : "text-red-500",
                                )}
                              >
                                {factor.impact > 0 ? "+" : ""}
                                {(factor.impact * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{factor.description}</p>
                          <p className="text-xs text-muted-foreground italic">{factor.evidence}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Market Inefficiency */}
                  <div className="space-y-3 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-300">
                      Market Inefficiency
                    </h3>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      {underdog.analysis.marketInefficiency.reason}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {underdog.analysis.marketInefficiency.evidence}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Confidence:</span>
                      <Badge className="text-xs">
                        {(underdog.analysis.marketInefficiency.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="space-y-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <h3 className="text-lg font-semibold text-primary">Betting Recommendation</h3>
                    <div className="flex items-center gap-4">
                      <Badge
                        className={cn(
                          "text-sm",
                          getStakeColor(underdog.recommendation.suggestedStake),
                        )}
                      >
                        {underdog.recommendation.suggestedStake.toUpperCase()} STAKE
                      </Badge>
                      <Badge variant="outline" className="text-sm">
                        {underdog.recommendation.betType.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {underdog.recommendation.reasoning}
                    </p>
                  </div>

                  {/* Risk Factors */}
                  {underdog.analysis.riskFactors.length > 0 && (
                    <div className="space-y-3 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                      <h3 className="text-lg font-semibold text-red-700 dark:text-red-300">
                        Risk Factors
                      </h3>
                      <ul className="space-y-1">
                        {underdog.analysis.riskFactors.map((risk, index) => (
                          <li
                            key={index}
                            className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2"
                          >
                            <XCircle className="w-3 h-3" />
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Team Records */}
                  <div className="grid grid-cols-2 gap-4 text-center text-sm">
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <div className="text-muted-foreground">{underdog.game.homeTeam}</div>
                      <div className="font-medium">{underdog.game.homeRecord}</div>
                    </div>
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <div className="text-muted-foreground">{underdog.game.awayTeam}</div>
                      <div className="font-medium">{underdog.game.awayRecord}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          {weeklyReport && (
            <div className="space-y-6">
              {/* Trends Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      Sport Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {weeklyReport.trends.sportTrends.map((trend, index) => (
                        <li
                          key={index}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                          {trend}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="p-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-500" />
                      Market Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {weeklyReport.trends.marketTrends.map((trend, index) => (
                        <li
                          key={index}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <Activity className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                          {trend}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="p-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-500" />
                      Injury Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {weeklyReport.trends.injuryTrends.map((trend, index) => (
                        <li
                          key={index}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <AlertCircle className="w-3 h-3 text-purple-500 mt-0.5 flex-shrink-0" />
                          {trend}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Summary Stats */}
              <Card className="p-6">
                <CardHeader>
                  <CardTitle>Weekly Summary</CardTitle>
                  <CardDescription>
                    Week {weeklyReport.week} {weeklyReport.sport} Analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{weeklyReport.summary.totalGames}</div>
                      <div className="text-sm text-muted-foreground">Total Games</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        {weeklyReport.summary.underdogOpportunities}
                      </div>
                      <div className="text-sm text-muted-foreground">Opportunities</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">
                        {weeklyReport.summary.averageValueRating.toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Value</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-500">
                        {weeklyReport.summary.marketEfficiency.toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Market Efficiency</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
