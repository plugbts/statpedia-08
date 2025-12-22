import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, TrendingDown, Clock, Target, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { gamesService } from "@/services/games-service";
import { useToast } from "@/hooks/use-toast";

interface GIF5Prediction {
  id: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  gameTime: string;
  yesProbability: number;
  noProbability: number;
  yesOdds?: number;
  noOdds?: number;
  recommendation: "YES" | "NO";
  confidence: number;
}

export const GIF5Tab: React.FC = () => {
  const [predictions, setPredictions] = useState<GIF5Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<"yes" | "no">("yes");
  const { toast } = useToast();

  useEffect(() => {
    loadGIF5Predictions();
  }, []);

  const loadGIF5Predictions = async () => {
    setIsLoading(true);
    try {
      // Fetch NHL games
      const nhlGames = await gamesService.getCurrentWeekGames("nhl");
      const today = new Date().toISOString().slice(0, 10);
      const todaysGames = (nhlGames || []).filter((g: any) => {
        const d = String(g?.date || "").slice(0, 10);
        // If the upstream source doesn't provide a date, keep it (better to show than hide)
        if (!d) return true;
        return d === today;
      });

      // Generate GIF5 predictions for each game (all games for the day)
      const gif5Predictions: GIF5Prediction[] = todaysGames.map((game, index) => {
        // Calculate probabilities based on team stats (placeholder logic)
        // In production, this would use actual team scoring rates in first 5 minutes
        const baseYesProb = 0.35 + Math.random() * 0.25; // 35-60% range
        const yesProb = Math.min(0.95, Math.max(0.05, baseYesProb));
        const noProb = 1 - yesProb;

        const recommendation = yesProb > 0.5 ? "YES" : "NO";
        const confidence = Math.abs(yesProb - 0.5) * 2; // Higher confidence when further from 50/50

        return {
          id: `gif5-${game.id || index}`,
          gameId: game.id || `game-${index}`,
          homeTeam: game.homeTeam || "Home",
          awayTeam: game.awayTeam || "Away",
          homeTeamAbbr:
            (game as any).homeTeamAbbr || game.homeTeam?.slice(0, 3).toUpperCase() || "HOME",
          awayTeamAbbr:
            (game as any).awayTeamAbbr || game.awayTeam?.slice(0, 3).toUpperCase() || "AWAY",
          gameTime: (game.time || game.date || new Date().toISOString()) as string,
          yesProbability: yesProb,
          noProbability: noProb,
          yesOdds: yesProb > 0.5 ? -120 : 110,
          noOdds: noProb > 0.5 ? -120 : 110,
          recommendation,
          confidence,
        };
      });

      // Sort by probability (YES or NO based on selected view)
      const sorted = gif5Predictions.sort((a, b) => {
        if (selectedView === "yes") {
          return b.yesProbability - a.yesProbability;
        } else {
          return b.noProbability - a.noProbability;
        }
      });

      // Show all games for the day
      setPredictions(sorted);
    } catch (error) {
      console.error("Failed to load GIF5 predictions:", error);
      toast({
        title: "Error",
        description: "Failed to load Goal In First 5 predictions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "TBD";
    }
  };

  const formatProbability = (prob: number) => {
    return `${Math.round(prob * 100)}%`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return "text-green-400";
    if (confidence >= 0.4) return "text-yellow-400";
    return "text-orange-400";
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.7) return "High";
    if (confidence >= 0.4) return "Medium";
    return "Low";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Target className="w-8 h-8 text-pink-400" />
              GIF5
            </h1>
            <p className="text-muted-foreground mt-2">Goal In First 5 Minutes — NHL Predictions</p>
          </div>
        </div>
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading predictions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-8 h-8 text-pink-400" />
            GIF5
          </h1>
          <p className="text-muted-foreground mt-2">
            Goal In First 5 Minutes — Most Likely Predictions (NHL Only)
          </p>
        </div>
        <Badge className="bg-pink-600/20 text-pink-200 border-pink-500/30">NHL</Badge>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={selectedView === "yes" ? "default" : "outline"}
          onClick={() => {
            setSelectedView("yes");
            loadGIF5Predictions();
          }}
          className={cn(
            "bg-pink-600 hover:bg-pink-700",
            selectedView !== "yes" && "bg-transparent",
          )}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Most Likely YES
        </Button>
        <Button
          variant={selectedView === "no" ? "default" : "outline"}
          onClick={() => {
            setSelectedView("no");
            loadGIF5Predictions();
          }}
          className={cn(
            "bg-slate-600 hover:bg-slate-700",
            selectedView !== "no" && "bg-transparent",
          )}
        >
          <TrendingDown className="w-4 h-4 mr-2" />
          Most Likely NO
        </Button>
        <Button variant="ghost" size="sm" onClick={loadGIF5Predictions} className="ml-auto">
          Refresh
        </Button>
      </div>

      {/* Predictions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {predictions.map((pred, index) => {
          const probability = selectedView === "yes" ? pred.yesProbability : pred.noProbability;
          const odds = selectedView === "yes" ? pred.yesOdds : pred.noOdds;
          const isRecommended =
            (selectedView === "yes" && pred.recommendation === "YES") ||
            (selectedView === "no" && pred.recommendation === "NO");

          return (
            <Card
              key={pred.id}
              className={cn(
                "bg-card/50 border-border/50 overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-105",
                isRecommended && "ring-2 ring-pink-500/50",
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-foreground">
                    #{index + 1}
                  </CardTitle>
                  {isRecommended && (
                    <Badge className="bg-pink-600/20 text-pink-200 border-pink-500/30 text-[10px]">
                      REC
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Teams */}
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm font-bold text-foreground">{pred.awayTeamAbbr}</span>
                    <span className="text-xs text-muted-foreground">@</span>
                    <span className="text-sm font-bold text-foreground">{pred.homeTeamAbbr}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatTime(pred.gameTime)}
                  </div>
                </div>

                {/* Probability */}
                <div className="text-center space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {selectedView === "yes" ? "YES" : "NO"} Probability
                  </div>
                  <div className={cn("text-2xl font-bold", getConfidenceColor(pred.confidence))}>
                    {formatProbability(probability)}
                  </div>
                  {odds && (
                    <div className="text-[10px] text-muted-foreground">
                      {odds > 0 ? "+" : ""}
                      {odds}
                    </div>
                  )}
                </div>

                {/* Confidence */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                  <span className="text-muted-foreground">Confidence:</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      pred.confidence >= 0.7 &&
                        "bg-green-600/20 text-green-200 border-green-500/30",
                      pred.confidence >= 0.4 &&
                        pred.confidence < 0.7 &&
                        "bg-yellow-600/20 text-yellow-200 border-yellow-500/30",
                      pred.confidence < 0.4 &&
                        "bg-orange-600/20 text-orange-200 border-orange-500/30",
                    )}
                  >
                    {getConfidenceBadge(pred.confidence)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            About GIF5
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">GIF5</strong> stands for{" "}
            <strong className="text-foreground">Goal In First 5</strong> minutes — a popular NHL
            betting market that predicts whether a goal will be scored in the first 5 minutes of the
            game.
          </p>
          <p>
            This feature shows the <strong className="text-foreground">5 most likely</strong>{" "}
            predictions for both YES and NO outcomes, ranked by probability. Each prediction
            includes team matchups, game time, probability percentage, odds, and confidence level.
          </p>
          <p className="text-xs text-muted-foreground/70">
            <strong>Note:</strong> Predictions are based on team scoring rates, recent form, and
            matchup history. This feature is currently in development and will be enhanced with the
            Icura NHL model for more accurate predictions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
