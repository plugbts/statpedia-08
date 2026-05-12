import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, TrendingDown, Clock, Target, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { gamesService } from "@/services/games-service";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GIF5Prediction {
  id: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  gameTime: string;
  // G1F5 predictions
  g1f5YesProbability: number;
  g1f5NoProbability: number;
  g1f5Recommendation: "YES" | "NO";
  g1f5Confidence: number;
  g1f5MarketProb: number | null;
  g1f5Edge: number | null;
  g1f5EdgePct: number | null;
  g1f5Rating: number | null;
  g1f5RatingLabel: "High" | "Good" | "Meh" | "Bad";
  g1f5Analysis?: {
    factors: Array<{
      name: string;
      score: number;
      impact: "high" | "medium" | "low";
      description: string;
      details: string[];
    }>;
    summary: string;
    strengths: string[];
    weaknesses: string[];
  };
  // G1F10 predictions
  g1f10YesProbability: number;
  g1f10NoProbability: number;
  g1f10Recommendation: "YES" | "NO";
  g1f10Confidence: number;
  g1f10Rating: number | null;
  g1f10RatingLabel: "High" | "Good" | "Meh" | "Bad";
  g1f10Analysis?: {
    factors: Array<{
      name: string;
      score: number;
      impact: "high" | "medium" | "low";
      description: string;
      details: string[];
    }>;
    summary: string;
    strengths: string[];
    weaknesses: string[];
  };
  // Team records
  homeG1F5Record: string; // e.g., "12-8"
  homeG1F10Record: string;
  awayG1F5Record: string;
  awayG1F10Record: string;
}

export const GIF5Tab: React.FC = () => {
  const [predictions, setPredictions] = useState<GIF5Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<"g1f5" | "g1f10">("g1f5");
  const [selectedOutcome, setSelectedOutcome] = useState<"yes" | "no">("yes");
  const [selectedPrediction, setSelectedPrediction] = useState<GIF5Prediction | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadGIF5Predictions();
  }, []);

  const loadGIF5Predictions = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);

      // Fetch predictions from API (with cache busting)
      const { apiFetch } = await import("@/lib/api");
      const response = await apiFetch(`/api/gif5-predictions?date=${today}&_t=${Date.now()}`);

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("API returned non-JSON:", text.substring(0, 200));
        throw new Error(`API returned ${contentType} instead of JSON. Status: ${response.status}`);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch predictions`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to load predictions");
      }

      const gif5Predictions: GIF5Prediction[] = result.data || [];

      const getSortKey = (p: GIF5Prediction) => {
        if (selectedView === "g1f5") {
          // Sort by rating if present, fallback to probability
          const rating = p.g1f5Rating ?? -1;
          const prob = selectedOutcome === "yes" ? p.g1f5YesProbability : p.g1f5NoProbability;
          return { rating, prob };
        } else {
          const rating = p.g1f10Rating ?? -1;
          const prob = selectedOutcome === "yes" ? p.g1f10YesProbability : p.g1f10NoProbability;
          return { rating, prob };
        }
      };

      const sorted = gif5Predictions.sort((a, b) => {
        const ka = getSortKey(a);
        const kb = getSortKey(b);
        if (kb.rating !== ka.rating) return kb.rating - ka.rating;
        return kb.prob - ka.prob;
      });

      setPredictions(sorted);
    } catch (error) {
      console.error("Failed to load GIF5 predictions:", error);
      toast({
        title: "Error",
        description: "Failed to load Goal In First 5/10 predictions",
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

  const getRatingColor = (rating: number | null | undefined) => {
    if (rating === null || rating === undefined)
      return "bg-slate-700/50 text-gray-300 border-slate-600/50";
    if (rating >= 80) return "bg-green-600/20 text-green-200 border-green-500/40";
    if (rating >= 65) return "bg-green-500/15 text-green-100 border-green-400/30";
    if (rating >= 50) return "bg-slate-600/30 text-gray-200 border-slate-500/40";
    return "bg-red-600/20 text-red-200 border-red-500/40";
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
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Target className="w-8 h-8 text-blue-400" />
              GIF5
            </h1>
            <p className="text-gray-400 mt-2">Goal In First 5 Minutes — NHL Predictions</p>
          </div>
        </div>
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading predictions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Target className="w-8 h-8 text-blue-400" />
            GIF5 / GIF10
          </h1>
          <p className="text-gray-400 mt-2">
            Goal In First 5 & 10 Minutes — AI-Powered Predictions (NHL Only)
          </p>
        </div>
        <Badge className="bg-slate-700/50 text-gray-300 border-slate-600/50">NHL</Badge>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant={selectedView === "g1f5" ? "default" : "outline"}
            onClick={() => {
              setSelectedView("g1f5");
              setPredictions((prev) => {
                const sorted = [...prev].sort((a, b) => {
                  const ra = a.g1f5Rating ?? -1;
                  const rb = b.g1f5Rating ?? -1;
                  if (rb !== ra) return rb - ra;
                  const pa = selectedOutcome === "yes" ? a.g1f5YesProbability : a.g1f5NoProbability;
                  const pb = selectedOutcome === "yes" ? b.g1f5YesProbability : b.g1f5NoProbability;
                  return pb - pa;
                });
                return sorted;
              });
            }}
            className={cn(
              "bg-slate-800/60 hover:bg-slate-700/60 text-white border border-slate-700/60",
              selectedView !== "g1f5" && "bg-transparent text-gray-400",
            )}
          >
            <Target className="w-4 h-4 mr-2" />
            G1F5
          </Button>
          <Button
            variant={selectedView === "g1f10" ? "default" : "outline"}
            onClick={() => {
              setSelectedView("g1f10");
              setPredictions((prev) => {
                const sorted = [...prev].sort((a, b) => {
                  const ra = a.g1f10Rating ?? -1;
                  const rb = b.g1f10Rating ?? -1;
                  if (rb !== ra) return rb - ra;
                  const pa =
                    selectedOutcome === "yes" ? a.g1f10YesProbability : a.g1f10NoProbability;
                  const pb =
                    selectedOutcome === "yes" ? b.g1f10YesProbability : b.g1f10NoProbability;
                  return pb - pa;
                });
                return sorted;
              });
            }}
            className={cn(
              "bg-slate-800/60 hover:bg-slate-700/60 text-white border border-slate-700/60",
              selectedView !== "g1f10" && "bg-transparent text-gray-400",
            )}
          >
            <Target className="w-4 h-4 mr-2" />
            G1F10
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={selectedOutcome === "yes" ? "default" : "outline"}
            onClick={() => {
              setSelectedOutcome("yes");
              // Re-sort when changing outcome
              setPredictions(
                [...predictions].sort((a, b) => {
                  if (selectedView === "g1f5") {
                    return b.g1f5YesProbability - a.g1f5YesProbability;
                  } else {
                    return b.g1f10YesProbability - a.g1f10YesProbability;
                  }
                }),
              );
            }}
            className={cn(
              "bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30",
              selectedOutcome !== "yes" && "bg-transparent text-gray-400 border-slate-700/60",
            )}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            YES
          </Button>
          <Button
            variant={selectedOutcome === "no" ? "default" : "outline"}
            onClick={() => {
              setSelectedOutcome("no");
              // Re-sort when changing outcome
              setPredictions(
                [...predictions].sort((a, b) => {
                  if (selectedView === "g1f5") {
                    return b.g1f5NoProbability - a.g1f5NoProbability;
                  } else {
                    return b.g1f10NoProbability - a.g1f10NoProbability;
                  }
                }),
              );
            }}
            className={cn(
              "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30",
              selectedOutcome !== "no" && "bg-transparent text-gray-400 border-slate-700/60",
            )}
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            NO
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadGIF5Predictions}
          className="ml-auto text-gray-400 hover:text-white hover:bg-slate-800/60"
        >
          Refresh
        </Button>
      </div>

      {/* Predictions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {predictions.map((pred, index) => {
          const isG1F5 = selectedView === "g1f5";
          const probability = isG1F5
            ? selectedOutcome === "yes"
              ? pred.g1f5YesProbability
              : pred.g1f5NoProbability
            : selectedOutcome === "yes"
              ? pred.g1f10YesProbability
              : pred.g1f10NoProbability;
          const recommendation = isG1F5 ? pred.g1f5Recommendation : pred.g1f10Recommendation;
          const confidence = isG1F5 ? pred.g1f5Confidence : pred.g1f10Confidence;
          const rating = isG1F5 ? pred.g1f5Rating : pred.g1f10Rating;
          const ratingLabel = isG1F5 ? pred.g1f5RatingLabel : pred.g1f10RatingLabel;
          const edgePct = isG1F5 ? pred.g1f5EdgePct : pred.g1f10EdgePct;
          const isRecommended =
            (selectedOutcome === "yes" && recommendation === "YES") ||
            (selectedOutcome === "no" && recommendation === "NO");

          return (
            <Card
              key={pred.id}
              onClick={() => setSelectedPrediction(pred)}
              className={cn(
                "bg-slate-900/60 rounded-xl border border-slate-700/60 overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer",
                isRecommended && "ring-2 ring-blue-500/50",
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-white">#{index + 1}</CardTitle>
                  <div className="flex items-center gap-1">
                    {isRecommended && (
                      <Badge className="bg-blue-500/20 text-blue-200 border-blue-500/30 text-[10px]">
                        REC
                      </Badge>
                    )}
                    {rating !== null && rating !== undefined ? (
                      <Badge className={cn("text-[10px] font-bold border", getRatingColor(rating))}>
                        {Math.round(rating)} {ratingLabel || "Meh"}
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-700/50 text-gray-300 border-slate-600/50 text-[10px]">
                        No Odds
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Teams */}
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm font-bold text-white">{pred.awayTeamAbbr}</span>
                    <span className="text-xs text-gray-400">@</span>
                    <span className="text-sm font-bold text-white">{pred.homeTeamAbbr}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400">
                    <Clock className="w-3 h-3" />
                    {formatTime(pred.gameTime)}
                  </div>
                </div>

                {/* Probability */}
                <div className="text-center space-y-1">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">
                    {selectedView.toUpperCase()} {selectedOutcome.toUpperCase()} Probability
                  </div>
                  <div
                    className={cn(
                      "text-2xl font-bold text-white mb-2",
                      getConfidenceColor(confidence),
                    )}
                  >
                    {formatProbability(probability)}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Fair Odds: {((1 / probability) * 100 - 100).toFixed(0) > 0 ? "+" : ""}
                    {((1 / probability) * 100 - 100).toFixed(0)}
                  </div>
                </div>

                {/* Team Records */}
                <div className="space-y-1 text-xs pt-2 border-t border-slate-700/60">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{pred.homeTeamAbbr}:</span>
                    <span className="text-gray-300">
                      {isG1F5 ? pred.homeG1F5Record : pred.homeG1F10Record}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{pred.awayTeamAbbr}:</span>
                    <span className="text-gray-300">
                      {isG1F5 ? pred.awayG1F5Record : pred.awayG1F10Record}
                    </span>
                  </div>
                </div>

                {/* Confidence */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-700/60">
                  <span className="text-gray-400">Confidence:</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] bg-slate-700/50 text-gray-300",
                      confidence >= 0.7 && "bg-green-500/20 text-green-200 border-green-500/30",
                      confidence >= 0.4 &&
                        confidence < 0.7 &&
                        "bg-yellow-500/20 text-yellow-200 border-yellow-500/30",
                      confidence < 0.4 && "bg-orange-500/20 text-orange-200 border-orange-500/30",
                    )}
                  >
                    {getConfidenceBadge(confidence)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="bg-slate-900/60 rounded-xl border border-slate-700/60">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-white">
            <Sparkles className="w-4 h-4 text-blue-400" />
            About GIF5
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-300 space-y-2">
          <p>
            <strong className="text-white">GIF5</strong> and{" "}
            <strong className="text-white">GIF10</strong> stand for{" "}
            <strong className="text-white">Goal In First 5</strong> and{" "}
            <strong className="text-white">Goal In First 10</strong> minutes — popular NHL betting
            markets that predict whether a goal will be scored in the first 5 or 10 minutes of the
            game.
          </p>
          <p>
            Predictions are powered by the{" "}
            <strong className="text-white">Icura NHL Early Goal Model</strong>, which uses: team
            scoring rates, recent form, matchup history, referee tendencies, travel fatigue, goalie
            performance, and advanced analytics.
          </p>
          <p>
            Each prediction includes: <strong className="text-white">AI probability</strong>,{" "}
            <strong className="text-white">team records</strong> (this season),
            <strong className="text-white">quality-based rating</strong>, and{" "}
            <strong className="text-white">fair odds</strong>.
          </p>
          <p className="text-xs text-gray-400">
            <strong className="text-gray-300">Rating System:</strong> 0–100 based on AI prediction
            quality factors: goalie performance, team start speed, offense/defense matchup, and
            model confidence (High/Good/Meh/Bad), color-coded.
            <br />
            <span className="text-xs text-gray-400">
              Click any prediction card to see detailed analysis explaining the rating.
            </span>
            <br />
            Team records show YES-NO format (e.g., "12-8" means 12 games with early goal, 8
            without).
          </p>
        </CardContent>
      </Card>

      {/* Detailed Analysis Dialog */}
      <Dialog
        open={!!selectedPrediction}
        onOpenChange={(open) => !open && setSelectedPrediction(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              {selectedPrediction && (
                <>
                  {selectedPrediction.awayTeamAbbr} @ {selectedPrediction.homeTeamAbbr} -{" "}
                  {selectedView.toUpperCase()} Analysis
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Detailed breakdown of the AI prediction quality rating
            </DialogDescription>
          </DialogHeader>

          {selectedPrediction &&
            (() => {
              const analysis =
                selectedView === "g1f5"
                  ? selectedPrediction.g1f5Analysis
                  : selectedPrediction.g1f10Analysis;
              const rating =
                selectedView === "g1f5"
                  ? selectedPrediction.g1f5Rating
                  : selectedPrediction.g1f10Rating;
              const ratingLabel =
                selectedView === "g1f5"
                  ? selectedPrediction.g1f5RatingLabel
                  : selectedPrediction.g1f10RatingLabel;

              if (!analysis) {
                return (
                  <div className="text-gray-400 text-center py-8">
                    Analysis not available for this prediction
                  </div>
                );
              }

              // Ensure analysis has required fields
              if (!analysis.factors || analysis.factors.length === 0) {
                return (
                  <div className="text-gray-400 text-center py-8">Analysis data incomplete</div>
                );
              }

              return (
                <div className="space-y-6 mt-4">
                  {/* Summary */}
                  <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700">
                    <h3 className="text-white font-semibold mb-2">Summary</h3>
                    <p className="text-gray-300 text-sm">{analysis.summary}</p>
                  </div>

                  {/* Rating Badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Overall Rating:</span>
                    <Badge className={cn("text-sm font-bold border", getRatingColor(rating))}>
                      {rating} {ratingLabel}
                    </Badge>
                  </div>

                  {/* Quality Factors */}
                  <div className="space-y-4">
                    <h3 className="text-white font-semibold">Quality Factors</h3>
                    {analysis.factors.map((factor, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-800/60 rounded-lg p-4 border border-slate-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">{factor.name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={cn(
                                "text-xs",
                                factor.score >= 70 &&
                                  "bg-green-600/20 text-green-200 border-green-500/30",
                                factor.score >= 50 &&
                                  factor.score < 70 &&
                                  "bg-yellow-600/20 text-yellow-200 border-yellow-500/30",
                                factor.score < 50 && "bg-red-600/20 text-red-200 border-red-500/30",
                              )}
                            >
                              {Math.round(factor.score)}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                factor.impact === "high" && "border-blue-500/50 text-blue-200",
                                factor.impact === "medium" &&
                                  "border-yellow-500/50 text-yellow-200",
                                factor.impact === "low" && "border-gray-500/50 text-gray-200",
                              )}
                            >
                              {factor.impact} impact
                            </Badge>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{factor.description}</p>
                        {factor.details.length > 0 && (
                          <ul className="text-gray-400 text-xs space-y-1 mt-2">
                            {factor.details.map((detail, i) => (
                              <li key={i}>• {detail}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-2 gap-4">
                    {analysis.strengths.length > 0 && (
                      <div className="bg-green-900/20 rounded-lg p-4 border border-green-500/30">
                        <h4 className="text-green-200 font-semibold mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Strengths
                        </h4>
                        <ul className="text-green-100 text-sm space-y-1">
                          {analysis.strengths.map((strength, i) => (
                            <li key={i}>• {strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.weaknesses.length > 0 && (
                      <div className="bg-red-900/20 rounded-lg p-4 border border-red-500/30">
                        <h4 className="text-red-200 font-semibold mb-2 flex items-center gap-2">
                          <TrendingDown className="w-4 h-4" />
                          Weaknesses
                        </h4>
                        <ul className="text-red-100 text-sm space-y-1">
                          {analysis.weaknesses.map((weakness, i) => (
                            <li key={i}>• {weakness}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
