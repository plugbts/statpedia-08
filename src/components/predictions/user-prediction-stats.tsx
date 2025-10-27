import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Trophy,
  Eye,
  EyeOff,
  Settings,
  Star,
  Minus,
} from "lucide-react";
import {
  predictionService,
  type UserPredictionStats,
  type UserPrivacySettings,
} from "@/services/prediction-service";
import { KarmaExplanation } from "./karma-explanation";
import { useToast } from "@/hooks/use-toast";

interface UserPredictionStatsProps {
  userId?: string;
  isOwnProfile?: boolean;
}

export const UserPredictionStats: React.FC<UserPredictionStatsProps> = ({
  userId,
  isOwnProfile = false,
}) => {
  const [stats, setStats] = useState<UserPredictionStats | null>(null);
  const [privacySettings, setPrivacySettings] = useState<UserPrivacySettings | null>(null);
  const [karmaSummary, setKarmaSummary] = useState<{
    total_karma_gained: number;
    total_karma_lost: number;
    net_karma_change: number;
    correct_predictions_karma: number;
    incorrect_predictions_karma: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const [statsData, privacyData, karmaData] = await Promise.all([
        predictionService.getUserPredictionStats(userId),
        isOwnProfile ? predictionService.getUserPrivacySettings() : Promise.resolve(null),
        predictionService.getPredictionKarmaSummary(userId),
      ]);

      setStats(statsData);
      setPrivacySettings(privacyData);
      setKarmaSummary(karmaData);
    } catch (error) {
      console.error("Failed to load prediction stats:", error);
      toast({
        title: "Error",
        description: "Failed to load prediction statistics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrivacyToggle = async (setting: "hide_roi" | "hide_prediction_stats") => {
    if (!privacySettings) return;

    try {
      const newValue = !privacySettings[setting];
      const updatedSettings = await predictionService.updateUserPrivacySettings({
        [setting]: newValue,
      });

      setPrivacySettings(updatedSettings);

      toast({
        title: "Settings Updated",
        description: `Privacy setting updated successfully`,
      });
    } catch (error: any) {
      console.error("Failed to update privacy settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update privacy settings",
        variant: "destructive",
      });
    }
  };

  const getWinRateColor = (rate: number) => {
    if (rate >= 60) return "text-green-500";
    if (rate >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getWinRateBadge = (rate: number) => {
    if (rate >= 60) return "bg-green-500";
    if (rate >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getROIColor = (roi: number) => {
    if (roi > 0) return "text-green-500";
    if (roi < 0) return "text-red-500";
    return "text-muted-foreground";
  };

  const getROIBadge = (roi: number) => {
    if (roi > 0) return "bg-green-500";
    if (roi < 0) return "bg-red-500";
    return "bg-muted";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Prediction Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Prediction Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">No prediction data available</div>
        </CardContent>
      </Card>
    );
  }

  const shouldHideROI = privacySettings?.hide_roi && !isOwnProfile;
  const shouldHideStats = privacySettings?.hide_prediction_stats && !isOwnProfile;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Prediction Stats
          </CardTitle>
          {isOwnProfile && (
            <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="w-4 h-4 mr-2" />
              Privacy
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Privacy Settings */}
        {showSettings && isOwnProfile && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <h4 className="font-medium">Privacy Settings</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Hide ROI from others</span>
                </div>
                <Button
                  variant={privacySettings?.hide_roi ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePrivacyToggle("hide_roi")}
                >
                  {privacySettings?.hide_roi ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm">Hide prediction stats from others</span>
                </div>
                <Button
                  variant={privacySettings?.hide_prediction_stats ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePrivacyToggle("hide_prediction_stats")}
                >
                  {privacySettings?.hide_prediction_stats ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-blue-500">{stats.total_predictions}</div>
            <div className="text-sm text-muted-foreground">Total Predictions</div>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-green-500">{stats.correct_predictions}</div>
            <div className="text-sm text-muted-foreground">Correct</div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Win Rate</span>
            <div className="flex items-center gap-2">
              <Badge className={getWinRateBadge(stats.win_percentage)}>
                {stats.win_percentage.toFixed(1)}%
              </Badge>
              {shouldHideStats && (
                <Badge variant="outline" className="text-xs">
                  <EyeOff className="w-3 h-3 mr-1" />
                  Hidden
                </Badge>
              )}
            </div>
          </div>
          <Progress value={stats.win_percentage} className="h-2" />
        </div>

        {/* ROI */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">ROI</span>
            <div className="flex items-center gap-2">
              {shouldHideROI ? (
                <Badge variant="outline" className="text-xs">
                  <EyeOff className="w-3 h-3 mr-1" />
                  Hidden
                </Badge>
              ) : (
                <Badge className={getROIBadge(stats.roi_percentage)}>
                  {stats.roi_percentage > 0 ? "+" : ""}
                  {stats.roi_percentage.toFixed(1)}%
                </Badge>
              )}
            </div>
          </div>
          {!shouldHideROI && <Progress value={Math.abs(stats.roi_percentage)} className="h-2" />}
        </div>

        {/* Record Display */}
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Prediction Record</div>
          <div className="text-lg font-bold">
            {stats.correct_predictions}/{stats.total_predictions}
          </div>
          <div className="text-xs text-muted-foreground">
            {stats.total_predictions > 0
              ? `${stats.win_percentage.toFixed(1)}% win rate`
              : "No predictions yet"}
          </div>
        </div>

        {/* Karma Summary */}
        {karmaSummary && stats.total_predictions > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">Karma from Predictions</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 border rounded-lg">
                <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                  <Star className="w-4 h-4" />
                  <span className="text-sm font-medium">Gained</span>
                </div>
                <div className="text-lg font-bold text-green-600">
                  +{karmaSummary.total_karma_gained}
                </div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                  <Minus className="w-4 h-4" />
                  <span className="text-sm font-medium">Lost</span>
                </div>
                <div className="text-lg font-bold text-red-600">
                  -{karmaSummary.total_karma_lost}
                </div>
              </div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="text-sm text-muted-foreground">Net Karma Change</div>
              <div
                className={`text-lg font-bold ${
                  karmaSummary.net_karma_change > 0
                    ? "text-green-600"
                    : karmaSummary.net_karma_change < 0
                      ? "text-red-600"
                      : "text-muted-foreground"
                }`}
              >
                {karmaSummary.net_karma_change > 0 ? "+" : ""}
                {karmaSummary.net_karma_change}
              </div>
            </div>
          </div>
        )}

        {/* Performance Indicators */}
        {stats.total_predictions > 0 && (
          <div className="flex justify-center gap-2">
            {stats.win_percentage >= 60 && (
              <Badge variant="default" className="bg-green-500">
                <Trophy className="w-3 h-3 mr-1" />
                Hot Streak
              </Badge>
            )}
            {stats.win_percentage >= 55 && stats.win_percentage < 60 && (
              <Badge variant="default" className="bg-yellow-500">
                <TrendingUp className="w-3 h-3 mr-1" />
                Above Average
              </Badge>
            )}
            {stats.win_percentage < 45 && (
              <Badge variant="destructive">
                <TrendingDown className="w-3 h-3 mr-1" />
                Cold Streak
              </Badge>
            )}
          </div>
        )}

        {/* Karma Explanation */}
        {isOwnProfile && (
          <div className="mt-4">
            <KarmaExplanation />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
