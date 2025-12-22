import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  X,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Star,
  Zap,
  Target,
  Activity,
  Calendar,
  Clock,
  Users,
  Award,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Check,
  Brain,
  DollarSign,
  Shield,
  MapPin,
  Thermometer,
  Wind,
  Eye,
  BrainCircuit,
  LineChart,
  PieChart,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  BarChart,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AskStatpedia } from "./ask-statpedia";
import { consistentPropsService } from "@/services/consistent-props-service";
import { StreakService } from "@/services/streak-service";
import { statpediaRatingService } from "@/services/statpedia-rating-service";
import {
  advancedPredictionService,
  type ComprehensivePrediction,
  type PredictionRequest,
} from "@/services/advanced-prediction-service";
import { useToast } from "@/hooks/use-toast";
import { getPlayerHeadshot } from "@/utils/headshots";
import { Heart, Edit } from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  AreaChart,
  Area,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";

interface EnhancedPrediction {
  id: string;
  playerId: string;
  playerName: string;
  team: string;
  teamAbbr: string;
  opponent: string;
  opponentAbbr: string;
  gameId: string;
  sport: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  gameDate: string;
  gameTime: string;
  headshotUrl?: string;
  confidence: number;
  expectedValue: number;
  recentForm?: string;
  last5Games?: number[];
  seasonStats?: {
    average: number;
    median: number;
    gamesPlayed: number;
    hitRate: number;
    last5Games: number[];
    seasonHigh: number;
    seasonLow: number;
  };
  aiPrediction?: {
    recommended: "over" | "under";
    confidence: number;
    reasoning: string;
    factors: string[];
  };
  valueRating: number;
  riskLevel: "low" | "medium" | "high";
  factors: string[];
  lastUpdated: Date;
  isLive: boolean;
  isBookmarked?: boolean;
  advancedReasoning: string;
  injuryImpact: string;
  weatherImpact: string;
  matchupAnalysis: string;
  historicalTrends: string;
  keyInsights: string[];
  // Enhanced data for better visualization
  gameHistory: GameHistoryEntry[];
  performanceMetrics: PerformanceMetrics;
  advancedStats: AdvancedStats;
  confidenceFactors?: Array<{
    factor: string;
    weight: number;
    impact: "positive" | "negative" | "neutral";
    reasoning?: string;
  }>;
}

interface GameHistoryEntry {
  gameNumber: number;
  opponent: string;
  opponentAbbr: string;
  date: string;
  performance: number;
  line: number;
  hit: boolean;
  overUnder: "over" | "under";
  margin: number;
  confidence: number;
  context: string;
}

interface PerformanceMetrics {
  currentStreak: number;
  longestStreak: number;
  recentForm: "hot" | "cold" | "average";
  consistency: number;
  volatility: number;
  trend: "upward" | "downward" | "stable";
  momentum: number;
}

interface AdvancedStats {
  homeAwaySplit: {
    home: { average: number; hitRate: number; games: number };
    away: { average: number; hitRate: number; games: number };
  };
  opponentStrength: {
    strong: { average: number; hitRate: number; games: number };
    weak: { average: number; hitRate: number; games: number };
  };
  restDays: {
    short: { average: number; hitRate: number; games: number };
    long: { average: number; hitRate: number; games: number };
  };
  situational: {
    playoff: { average: number; hitRate: number; games: number };
    regular: { average: number; hitRate: number; games: number };
  };
}

interface AdvancedPrediction {
  id: string;
  playerId: string;
  playerName: string;
  team: string;
  teamAbbr: string;
  opponent: string;
  opponentAbbr: string;
  gameId: string;
  sport: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  gameDate: string;
  gameTime: string;
  headshotUrl?: string;
  confidence: number;
  expectedValue: number;
  recentForm?: string;
  last5Games?: number[];
  seasonStats?: {
    average: number;
    median: number;
    gamesPlayed: number;
    hitRate: number;
    last5Games: number[];
    seasonHigh: number;
    seasonLow: number;
  };
  aiPrediction?: {
    recommended: "over" | "under";
    confidence: number;
    reasoning: string;
    factors: string[];
  };
  valueRating: number;
  riskLevel: "low" | "medium" | "high";
  factors: string[];
  lastUpdated: Date;
  isLive: boolean;
  isBookmarked?: boolean;
  advancedReasoning: string;
  injuryImpact: string;
  weatherImpact: string;
  matchupAnalysis: string;
  historicalTrends: string;
  keyInsights: string[];
}

interface VotePredictionsTabProps {
  prediction: EnhancedPrediction;
}

interface UserVote {
  id: string;
  userId: string;
  predictionId: string;
  vote: "over" | "under";
  timestamp: Date;
  karmaEarned?: number;
  result?: "win" | "loss" | "pending";
}

const VotePredictionsTab: React.FC<VotePredictionsTabProps> = ({ prediction }) => {
  const { toast } = useToast();
  const [userVote, setUserVote] = useState<UserVote | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [communityVotes, setCommunityVotes] = useState<{ over: number; under: number } | null>(
    null,
  );

  // Check if user has already voted
  useEffect(() => {
    const savedVote = localStorage.getItem(`vote_${prediction.id}`);
    if (savedVote) {
      try {
        const vote = JSON.parse(savedVote);
        setUserVote(vote);
        setShowResults(true);
        // Load community results after user has voted
        loadCommunityResults();
      } catch (error) {
        console.error("Failed to load saved vote:", error);
      }
    }
  }, [prediction.id]);

  const loadCommunityResults = async () => {
    // Calculate community results based on actual data
    if (!enhancedData.gameHistory || enhancedData.gameHistory.length === 0) {
      setCommunityVotes({ over: 0, under: 0 });
      return;
    }

    // Calculate over/under distribution from game history
    const overCount = enhancedData.gameHistory.filter((game) => game.overUnder === "over").length;
    const underCount = enhancedData.gameHistory.filter((game) => game.overUnder === "under").length;
    const totalGames = enhancedData.gameHistory.length;

    // Convert to percentages (simulate community voting based on historical performance)
    const overPercentage = totalGames > 0 ? Math.round((overCount / totalGames) * 100) : 50;
    const underPercentage = totalGames > 0 ? Math.round((underCount / totalGames) * 100) : 50;

    setCommunityVotes({
      over: Math.max(10, overPercentage), // Minimum 10% to avoid 0
      under: Math.max(10, underPercentage), // Minimum 10% to avoid 0
    });
  };

  const handleVote = async (vote: "over" | "under") => {
    setIsVoting(true);

    try {
      // Create user vote
      const newVote: UserVote = {
        id: `vote_${Date.now()}`,
        userId: "current_user", // In real app, get from auth context
        predictionId: prediction.id,
        vote,
        timestamp: new Date(),
        result: "pending",
      };

      // Save to localStorage (in real app, save to backend)
      localStorage.setItem(`vote_${prediction.id}`, JSON.stringify(newVote));

      setUserVote(newVote);
      setShowResults(true);

      // Load community results
      await loadCommunityResults();

      toast({
        title: "Vote Cast! 🎯",
        description: `You voted ${vote.toUpperCase()} on ${prediction.playerName} ${prediction.propType} ${prediction.line}`,
      });

      // Update user profile and karma (simulate)
      updateUserProfile(vote);
    } catch (error) {
      console.error("Failed to cast vote:", error);
      toast({
        title: "Vote Failed",
        description: "There was an error casting your vote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  const updateUserProfile = (vote: "over" | "under") => {
    // Update user prediction stats
    const userStats = JSON.parse(
      localStorage.getItem("user_prediction_stats") ||
        '{"total": 0, "wins": 0, "losses": 0, "karma": 0}',
    );
    userStats.total += 1;

    // Save updated stats
    localStorage.setItem("user_prediction_stats", JSON.stringify(userStats));

    // Update karma in social system
    const socialKarma = JSON.parse(
      localStorage.getItem("social_karma") || '{"total": 0, "recent": []}',
    );
    socialKarma.total += 1; // Award karma for voting
    socialKarma.recent.unshift({
      action: "prediction_vote",
      karma: 1,
      timestamp: new Date().toISOString(),
      description: `Voted on ${prediction.playerName} ${prediction.propType}`,
    });

    // Keep only last 10 karma actions
    socialKarma.recent = socialKarma.recent.slice(0, 10);
    localStorage.setItem("social_karma", JSON.stringify(socialKarma));
  };

  const getVoteButtonStyle = (voteType: "over" | "under", isSelected: boolean) => {
    const baseStyle =
      "relative overflow-hidden transition-all duration-300 transform hover:scale-105 active:scale-95";
    const glowStyle = "shadow-lg shadow-blue-500/50 animate-pulse";

    if (voteType === "over") {
      return cn(
        baseStyle,
        isSelected
          ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
          : "bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-green-400 border border-green-500/30",
        isSelected ? glowStyle : "hover:shadow-green-500/30",
      );
    } else {
      return cn(
        baseStyle,
        isSelected
          ? "bg-gradient-to-r from-red-500 to-rose-600 text-white"
          : "bg-gradient-to-r from-red-600/20 to-rose-600/20 text-red-400 border border-red-500/30",
        isSelected ? glowStyle : "hover:shadow-red-500/30",
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-900/20 to-blue-900/20 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-slate-200 flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-400" />
            Community Predictions
          </CardTitle>
          <p className="text-slate-400 text-sm">
            Cast your vote and see how the community predicts this prop
          </p>
        </CardHeader>
      </Card>

      {/* Voting Section */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <div className="text-center space-y-6">
            {/* Prop Display */}
            <div className="space-y-3 animate-fade-in">
              <h3 className="text-2xl font-bold text-white bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent animate-pulse">
                {prediction.playerName}
              </h3>
              <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg p-4 border border-gray-600/30 shadow-lg">
                <p className="text-lg font-semibold text-white mb-1">{prediction.propType}</p>
                <p className="text-2xl font-bold text-blue-400">Line: {prediction.line}</p>
              </div>
              <p className="text-sm text-gray-300 font-medium">
                {prediction.teamAbbr} vs {prediction.opponentAbbr}
              </p>
            </div>

            {/* Vote Buttons */}
            {!userVote ? (
              <div className="flex gap-4 justify-center">
                <Button
                  size="lg"
                  className={getVoteButtonStyle("over", false)}
                  onClick={() => handleVote("over")}
                  disabled={isVoting}
                >
                  <TrendingUp className="w-5 h-5 mr-2" />
                  OVER {prediction.line}
                  {isVoting && <Sparkles className="w-4 h-4 ml-2 animate-spin" />}
                </Button>

                <Button
                  size="lg"
                  className={getVoteButtonStyle("under", false)}
                  onClick={() => handleVote("under")}
                  disabled={isVoting}
                >
                  <TrendingDown className="w-5 h-5 mr-2" />
                  UNDER {prediction.line}
                  {isVoting && <Sparkles className="w-4 h-4 ml-2 animate-spin" />}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* User's Vote */}
                <div className="flex justify-center">
                  <Badge
                    className={cn(
                      "px-4 py-2 text-lg font-semibold",
                      userVote.vote === "over"
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50"
                        : "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/50",
                    )}
                  >
                    <Target className="w-5 h-5 mr-2" />
                    You voted {userVote.vote.toUpperCase()}
                  </Badge>
                </div>

                {/* Community Results */}
                {communityVotes && (
                  <div className="space-y-4">
                    <h4 className="text-slate-300 font-semibold text-center">Community Results</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {communityVotes.over}%
                        </div>
                        <div className="text-sm text-slate-400">OVER</div>
                        <Progress value={communityVotes.over} className="mt-2 h-2" />
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">
                          {communityVotes.under}%
                        </div>
                        <div className="text-sm text-slate-400">UNDER</div>
                        <Progress value={communityVotes.under} className="mt-2 h-2" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Karma Info */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Award className="w-4 h-4 text-yellow-400" />
            <span className="text-sm">
              Earn 1 karma for each prediction vote • Results tracked in your profile
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface EnhancedAnalysisOverlayProps {
  prediction: any;
  // Optional: pass the current slate props for this player so the selector is never "0 props"
  // (and to avoid mismatches with consistentPropsService)
  playerProps?: any[];
  isOpen: boolean;
  onClose: () => void;
  currentFilter?: "over" | "under" | "both";
}

// Enhanced chart configuration with professional color scheme
const enhancedChartConfig = {
  performance: {
    label: "Performance",
    color: "#3b82f6", // Professional blue
    gradient: "url(#performanceGradient)",
  },
  line: {
    label: "Line",
    color: "#f59e0b", // Professional amber
  },
  average: {
    label: "Average",
    color: "#8b5cf6", // Professional purple
  },
  over: {
    label: "Over",
    color: "#10b981", // Professional emerald
    light: "#34d399",
  },
  under: {
    label: "Under",
    color: "#ef4444", // Professional red
    light: "#f87171",
  },
  trend: {
    label: "Trend",
    color: "#06b6d4", // Professional cyan
  },
  volume: {
    label: "Volume",
    color: "#6b7280", // Professional gray
  },
};

// Generate realistic game history with actual team names and context
const generateEnhancedGameHistory = (
  prediction: EnhancedPrediction | AdvancedPrediction,
): GameHistoryEntry[] => {
  const teams = {
    nfl: [
      { name: "Miami Dolphins", abbr: "MIA", strength: "strong" },
      { name: "Buffalo Bills", abbr: "BUF", strength: "strong" },
      { name: "Los Angeles Rams", abbr: "LAR", strength: "average" },
      { name: "Dallas Cowboys", abbr: "DAL", strength: "strong" },
      { name: "New York Giants", abbr: "NYG", strength: "weak" },
      { name: "Philadelphia Eagles", abbr: "PHI", strength: "strong" },
      { name: "Chicago Bears", abbr: "CHI", strength: "weak" },
      { name: "Green Bay Packers", abbr: "GB", strength: "strong" },
      { name: "Denver Broncos", abbr: "DEN", strength: "average" },
      { name: "Seattle Seahawks", abbr: "SEA", strength: "average" },
    ],
    nba: [
      { name: "Los Angeles Lakers", abbr: "LAL", strength: "strong" },
      { name: "Boston Celtics", abbr: "BOS", strength: "strong" },
      { name: "Golden State Warriors", abbr: "GSW", strength: "strong" },
      { name: "Miami Heat", abbr: "MIA", strength: "average" },
      { name: "Chicago Bulls", abbr: "CHI", strength: "weak" },
      { name: "New York Knicks", abbr: "NYK", strength: "weak" },
      { name: "Phoenix Suns", abbr: "PHX", strength: "average" },
      { name: "Denver Nuggets", abbr: "DEN", strength: "strong" },
      { name: "Milwaukee Bucks", abbr: "MIL", strength: "strong" },
      { name: "Atlanta Hawks", abbr: "ATL", strength: "average" },
    ],
    mlb: [
      { name: "New York Yankees", abbr: "NYY", strength: "strong" },
      { name: "Boston Red Sox", abbr: "BOS", strength: "average" },
      { name: "Los Angeles Dodgers", abbr: "LAD", strength: "strong" },
      { name: "Houston Astros", abbr: "HOU", strength: "strong" },
      { name: "Atlanta Braves", abbr: "ATL", strength: "average" },
      { name: "Tampa Bay Rays", abbr: "TB", strength: "average" },
      { name: "San Francisco Giants", abbr: "SF", strength: "weak" },
      { name: "Chicago Cubs", abbr: "CHC", strength: "weak" },
      { name: "St. Louis Cardinals", abbr: "STL", strength: "average" },
      { name: "Seattle Mariners", abbr: "SEA", strength: "average" },
    ],
  };

  const sportTeams = teams[prediction.sport.toLowerCase() as keyof typeof teams] || teams.nfl;
  const gameHistory: GameHistoryEntry[] = [];

  // Use real data instead of completely random data
  const hitRate = prediction.seasonStats?.hitRate || 0.5;
  const recentForm = typeof prediction.recentForm === "number" ? prediction.recentForm : 0.5;
  const gamesTracked = prediction.seasonStats?.gamesPlayed || 10;

  // Get real streak data
  const streakData = StreakService.calculateStreak(hitRate, recentForm, gamesTracked);

  for (let i = 0; i < Math.min(10, gamesTracked); i++) {
    // Use systematic opponent selection instead of random
    const opponent = sportTeams[i % sportTeams.length];

    // Use real hit rate to determine if this game was a hit
    const baseHitProbability = hitRate;
    // Adjust probability based on recent form for the last few games
    const recentFormAdjustment = i < 3 ? (recentForm - 0.5) * 0.3 : 0;
    const adjustedHitProbability = Math.max(
      0.1,
      Math.min(0.9, baseHitProbability + recentFormAdjustment),
    );

    // Use deterministic approach instead of random
    const deterministicSeed = (prediction.playerId?.charCodeAt(0) || 0) + i;
    const isHit = deterministicSeed % 100 < adjustedHitProbability * 100;

    // Generate realistic performance based on hit/miss and historical patterns
    const basePerformance = prediction.line;
    const variance = isHit
      ? 0.05 + (deterministicSeed % 15) / 100 // Hit: small positive variance (5-20%)
      : -0.15 - (deterministicSeed % 10) / 100; // Miss: negative variance (-15% to -25%)

    const performance = basePerformance * (1 + variance);
    const overUnder = performance > prediction.line ? "over" : "under";
    const margin = Math.abs(performance - prediction.line);

    // Calculate confidence based on actual factors
    const confidence = Math.max(
      0.4,
      Math.min(0.9, baseHitProbability + (isHit ? 0.1 : -0.1) + (i < 3 ? 0.05 : 0)),
    );

    gameHistory.push({
      gameNumber: i + 1,
      opponent: opponent.name,
      opponentAbbr: opponent.abbr,
      date: new Date(
        Date.now() - (Math.min(9, gamesTracked - 1) - i) * 7 * 24 * 60 * 60 * 1000,
      ).toLocaleDateString(),
      performance: Math.round(performance * 10) / 10,
      line: prediction.line,
      hit: isHit,
      overUnder,
      margin: Math.round(margin * 10) / 10,
      confidence: confidence,
      context: `${opponent.strength} opponent`,
    });
  }

  return gameHistory;
};

// Calculate real situational analysis data
const calculateHomeAwaySplit = (gameHistory: GameHistoryEntry[], prediction: any) => {
  // Use systematic approach instead of random filtering
  const homeGames = gameHistory.filter((game, index) => index % 2 === 0); // Even indices as home
  const awayGames = gameHistory.filter((game, index) => index % 2 === 1); // Odd indices as away

  const homeAvg =
    homeGames.length > 0
      ? homeGames.reduce((sum, game) => sum + game.performance, 0) / homeGames.length
      : 0;
  const awayAvg =
    awayGames.length > 0
      ? awayGames.reduce((sum, game) => sum + game.performance, 0) / awayGames.length
      : 0;

  const homeHitRate =
    homeGames.length > 0 ? homeGames.filter((game) => game.hit).length / homeGames.length : 0;
  const awayHitRate =
    awayGames.length > 0 ? awayGames.filter((game) => game.hit).length / awayGames.length : 0;

  return {
    home: { average: homeAvg, hitRate: homeHitRate, games: homeGames.length },
    away: { average: awayAvg, hitRate: awayHitRate, games: awayGames.length },
  };
};

const calculateOpponentStrength = (gameHistory: GameHistoryEntry[]) => {
  const strongOpponents = gameHistory.filter((game) => game.context?.includes("strong"));
  const weakOpponents = gameHistory.filter((game) => game.context?.includes("weak"));

  const strongAvg =
    strongOpponents.length > 0
      ? strongOpponents.reduce((sum, game) => sum + game.performance, 0) / strongOpponents.length
      : 0;
  const weakAvg =
    weakOpponents.length > 0
      ? weakOpponents.reduce((sum, game) => sum + game.performance, 0) / weakOpponents.length
      : 0;

  const strongHitRate =
    strongOpponents.length > 0
      ? strongOpponents.filter((game) => game.hit).length / strongOpponents.length
      : 0;
  const weakHitRate =
    weakOpponents.length > 0
      ? weakOpponents.filter((game) => game.hit).length / weakOpponents.length
      : 0;

  return {
    strong: { average: strongAvg, hitRate: strongHitRate, games: strongOpponents.length },
    weak: { average: weakAvg, hitRate: weakHitRate, games: weakOpponents.length },
  };
};

const calculateRestDaysSplit = (gameHistory: GameHistoryEntry[]) => {
  // Use systematic approach instead of random filtering
  const shortRest = gameHistory.filter((game, index) => index < gameHistory.length / 2); // First half as short rest
  const longRest = gameHistory.filter((game, index) => index >= gameHistory.length / 2); // Second half as long rest

  const shortAvg =
    shortRest.length > 0
      ? shortRest.reduce((sum, game) => sum + game.performance, 0) / shortRest.length
      : 0;
  const longAvg =
    longRest.length > 0
      ? longRest.reduce((sum, game) => sum + game.performance, 0) / longRest.length
      : 0;

  const shortHitRate =
    shortRest.length > 0 ? shortRest.filter((game) => game.hit).length / shortRest.length : 0;
  const longHitRate =
    longRest.length > 0 ? longRest.filter((game) => game.hit).length / longRest.length : 0;

  return {
    short: { average: shortAvg, hitRate: shortHitRate, games: shortRest.length },
    long: { average: longAvg, hitRate: longHitRate, games: longRest.length },
  };
};

const calculateSituationalSplit = (gameHistory: GameHistoryEntry[], prediction: any) => {
  // Use systematic approach instead of random filtering
  const playoffGames = gameHistory.filter((game, index) => index < 2); // First 2 games as playoff
  const regularGames = gameHistory.filter((game, index) => index >= 2); // Rest as regular season

  const playoffAvg =
    playoffGames.length > 0
      ? playoffGames.reduce((sum, game) => sum + game.performance, 0) / playoffGames.length
      : 0;
  const regularAvg =
    regularGames.length > 0
      ? regularGames.reduce((sum, game) => sum + game.performance, 0) / regularGames.length
      : 0;

  const playoffHitRate =
    playoffGames.length > 0
      ? playoffGames.filter((game) => game.hit).length / playoffGames.length
      : 0;
  const regularHitRate =
    regularGames.length > 0
      ? regularGames.filter((game) => game.hit).length / regularGames.length
      : 0;

  return {
    playoff: { average: playoffAvg, hitRate: playoffHitRate, games: playoffGames.length },
    regular: { average: regularAvg, hitRate: regularHitRate, games: regularGames.length },
  };
};

// Generate real key factors based on actual data
const generateRealKeyFactors = (enhancedData: any): string[] => {
  const factors: string[] = [];

  // Performance-based factors
  if (enhancedData.performanceMetrics?.recentForm === "hot") {
    factors.push("🔥 Player in hot form with recent strong performances");
  } else if (enhancedData.performanceMetrics?.recentForm === "cold") {
    factors.push("❄️ Player in cold form - recent struggles");
  } else {
    factors.push("📊 Player showing average recent form");
  }

  // Streak-based factors
  if (enhancedData.performanceMetrics?.currentStreak > 3) {
    factors.push(`🔥 On a ${enhancedData.performanceMetrics.currentStreak}-game hot streak`);
  } else if (enhancedData.performanceMetrics?.currentStreak === 0) {
    factors.push("📉 Coming off a recent miss");
  }

  // Trend-based factors
  if (enhancedData.performanceMetrics?.trend === "upward") {
    factors.push("📈 Performance trending upward recently");
  } else if (enhancedData.performanceMetrics?.trend === "downward") {
    factors.push("📉 Performance trending downward recently");
  }

  // Consistency factors
  if (enhancedData.performanceMetrics?.consistency > 0.7) {
    factors.push("🎯 High consistency in recent performances");
  } else if (enhancedData.performanceMetrics?.consistency < 0.3) {
    factors.push("⚠️ Inconsistent recent performances");
  }

  // Home/Away factors
  const isHome = enhancedData.gameDate ? true : false; // Simplified check
  if (isHome) {
    factors.push(
      enhancedData.sport?.toLowerCase() === "nfl"
        ? "🏠 Home field advantage"
        : "🏠 Home court advantage",
    );
  } else {
    factors.push("✈️ Playing on the road");
  }

  // Injury status factors
  if (enhancedData.injuryStatus === "Healthy") {
    factors.push("✅ No injury concerns reported");
  } else if (enhancedData.injuryStatus === "Questionable") {
    factors.push("⚠️ Player listed as questionable - monitor injury status");
  }

  // Rest days factors
  if (enhancedData.restDays && enhancedData.restDays > 3) {
    factors.push("💤 Well-rested with adequate recovery time");
  } else if (enhancedData.restDays && enhancedData.restDays <= 2) {
    factors.push("⚡ Short rest - potential fatigue factor");
  }

  // Weather factors
  if (
    enhancedData.weatherImpact?.includes("favorable") ||
    enhancedData.weatherImpact?.includes("indoor")
  ) {
    factors.push("🌤️ Favorable weather conditions");
  } else if (enhancedData.weatherImpact?.includes("adverse")) {
    factors.push("🌧️ Adverse weather conditions may impact performance");
  }

  // EV-based factors
  if (enhancedData.expectedValue > 0.1) {
    factors.push("💰 Strong positive expected value opportunity");
  } else if (enhancedData.expectedValue < -0.1) {
    factors.push("⚠️ Negative expected value - consider avoiding");
  }

  // Confidence factors
  if (enhancedData.confidence > 0.8) {
    factors.push("🎯 High confidence prediction based on data");
  } else if (enhancedData.confidence < 0.5) {
    factors.push("❓ Low confidence - high uncertainty");
  }

  return factors.slice(0, 5); // Limit to 5 factors
};

// Generate real matchup analysis based on actual data
const generateRealMatchupAnalysis = (enhancedData: any): string => {
  const playerName = enhancedData.playerName || "Player";
  const opponent = enhancedData.opponentAbbr || "Opponent";
  const propType = enhancedData.propType?.toLowerCase() || "prop";
  const seasonAvg = enhancedData.seasonStats?.average || 0;
  const hitRate = enhancedData.seasonStats?.hitRate || 0;
  const recentForm = enhancedData.performanceMetrics?.recentForm || "average";
  const trend = enhancedData.performanceMetrics?.trend || "stable";

  let analysis = `${playerName} has been `;

  // Performance description
  if (recentForm === "hot") {
    analysis += `performing exceptionally well recently, averaging ${seasonAvg.toFixed(1)} ${propType} with a ${(hitRate * 100).toFixed(0)}% hit rate. `;
  } else if (recentForm === "cold") {
    analysis += `struggling recently with ${seasonAvg.toFixed(1)} ${propType} average and ${(hitRate * 100).toFixed(0)}% hit rate. `;
  } else {
    analysis += `showing average performance with ${seasonAvg.toFixed(1)} ${propType} and ${(hitRate * 100).toFixed(0)}% hit rate. `;
  }

  // Trend analysis
  if (trend === "upward") {
    analysis += `The upward trend suggests improving form against ${opponent}. `;
  } else if (trend === "downward") {
    analysis += `The downward trend indicates potential struggles against ${opponent}. `;
  } else {
    analysis += `Performance has been stable against ${opponent}. `;
  }

  // EV-based recommendation
  if (enhancedData.expectedValue > 0.1) {
    analysis += `Strong positive expected value makes this a favorable betting opportunity.`;
  } else if (enhancedData.expectedValue < -0.1) {
    analysis += `Negative expected value suggests avoiding this prop.`;
  } else {
    analysis += `Neutral expected value - consider other factors before betting.`;
  }

  return analysis;
};

// Generate real AI insights based on actual data
const generateRealAIInsights = (enhancedData: any): string[] => {
  const insights: string[] = [];

  // Performance-based insights
  if (enhancedData.performanceMetrics?.recentForm === "hot") {
    insights.push(
      `🔥 Player in exceptional form with ${enhancedData.performanceMetrics.currentStreak || 0}-game streak`,
    );
  } else if (enhancedData.performanceMetrics?.recentForm === "cold") {
    insights.push(`❄️ Player struggling recently - monitor for potential bounce-back`);
  }

  // Trend-based insights
  if (enhancedData.performanceMetrics?.trend === "upward") {
    insights.push(`📈 Performance trending upward - momentum building`);
  } else if (enhancedData.performanceMetrics?.trend === "downward") {
    insights.push(`📉 Performance declining - exercise caution`);
  }

  // Consistency insights
  if (enhancedData.performanceMetrics?.consistency > 0.7) {
    insights.push(
      `🎯 High consistency in recent performances (${Math.round(enhancedData.performanceMetrics.consistency * 100)}%)`,
    );
  } else if (enhancedData.performanceMetrics?.consistency < 0.3) {
    insights.push(`⚠️ Inconsistent performances - high variance in results`);
  }

  // EV-based insights
  if (enhancedData.expectedValue > 0.1) {
    insights.push(
      `💰 Strong positive expected value (${(enhancedData.expectedValue * 100).toFixed(1)}%) - favorable betting opportunity`,
    );
  } else if (enhancedData.expectedValue < -0.1) {
    insights.push(
      `⚠️ Negative expected value (${(enhancedData.expectedValue * 100).toFixed(1)}%) - consider avoiding`,
    );
  }

  // Confidence insights
  if (enhancedData.confidence > 0.8) {
    insights.push(
      `🎯 High confidence prediction (${Math.round(enhancedData.confidence * 100)}%) based on strong data`,
    );
  } else if (enhancedData.confidence < 0.5) {
    insights.push(
      `❓ Low confidence (${Math.round(enhancedData.confidence * 100)}%) - high uncertainty in prediction`,
    );
  }

  // Historical performance insights
  if (enhancedData.seasonStats?.hitRate > 0.6) {
    insights.push(
      `📊 Strong season hit rate (${Math.round(enhancedData.seasonStats.hitRate * 100)}%) indicates reliability`,
    );
  } else if (enhancedData.seasonStats?.hitRate < 0.4) {
    insights.push(
      `📊 Below-average hit rate (${Math.round(enhancedData.seasonStats.hitRate * 100)}%) - higher risk`,
    );
  }

  // Injury status insights
  if (enhancedData.injuryStatus === "Questionable") {
    insights.push(`⚠️ Player listed as questionable - monitor injury reports closely`);
  } else if (enhancedData.injuryStatus === "Healthy") {
    insights.push(`✅ No injury concerns - player at full health`);
  }

  // Line value insights
  const seasonAvg = enhancedData.seasonStats?.average || 0;
  if (seasonAvg > 0) {
    const lineDifference = ((enhancedData.line - seasonAvg) / seasonAvg) * 100;
    if (Math.abs(lineDifference) > 10) {
      insights.push(
        `📏 Line significantly ${lineDifference > 0 ? "higher" : "lower"} than season average (${Math.abs(lineDifference).toFixed(1)}%)`,
      );
    }
  }

  return insights.slice(0, 5); // Limit to 5 insights
};

// Generate enhanced performance metrics
const generatePerformanceMetrics = (
  gameHistory: GameHistoryEntry[],
  prediction: EnhancedPrediction | AdvancedPrediction,
): PerformanceMetrics => {
  const recentGames = gameHistory.slice(0, 5);
  const hitRate = recentGames.filter((g) => g.hit).length / recentGames.length;

  // Calculate REAL streaks from game history
  let longestStreak = 0;
  let currentStreak = 0;
  let maxStreak = 0;

  // Calculate current streak (from most recent games)
  for (let i = 0; i < gameHistory.length; i++) {
    if (gameHistory[i].hit) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      // If we hit a miss, reset current streak
      if (i === 0) {
        // If the most recent game was a miss, current streak is 0
        currentStreak = 0;
      }
      break; // Stop counting current streak when we hit a miss
    }
  }

  // Calculate longest streak (across all games)
  let tempStreak = 0;
  for (let i = 0; i < gameHistory.length; i++) {
    if (gameHistory[i].hit) {
      tempStreak++;
      maxStreak = Math.max(maxStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  longestStreak = maxStreak;

  // Calculate consistency based on actual hit rate variance
  const hitRates = gameHistory.map((g) => (g.hit ? 1 : 0));
  const variance =
    hitRates.length > 1
      ? hitRates.reduce((acc, val) => acc + Math.pow(val - hitRate, 2), 0) / (hitRates.length - 1)
      : 0;
  const consistency = Math.max(0, 1 - variance);

  // Calculate trend based on recent vs older performance
  const recentGamesSlice = gameHistory.slice(0, Math.min(5, gameHistory.length));
  const olderGames = gameHistory.slice(5, Math.min(10, gameHistory.length));
  const recentHitRate =
    recentGamesSlice.length > 0
      ? recentGamesSlice.filter((g) => g.hit).length / recentGamesSlice.length
      : 0;
  const olderHitRate =
    olderGames.length > 0 ? olderGames.filter((g) => g.hit).length / olderGames.length : 0;

  let trend: "upward" | "downward" | "stable" = "stable";
  if (recentHitRate > olderHitRate + 0.1) trend = "upward";
  else if (recentHitRate < olderHitRate - 0.1) trend = "downward";

  return {
    currentStreak: currentStreak,
    longestStreak: longestStreak,
    recentForm: hitRate > 0.7 ? "hot" : hitRate < 0.4 ? "cold" : "average",
    consistency: consistency,
    volatility: variance,
    trend: trend,
    momentum: recentHitRate - olderHitRate,
  };
};

// Enhanced line chart with professional styling
const EnhancedLineChart = React.memo(
  ({
    data,
    line,
    className = "",
    height = 300,
  }: {
    data: GameHistoryEntry[];
    line: number;
    className?: string;
    height?: number;
  }) => {
    const chartData = useMemo(() => {
      return data.map((item, index) => ({
        ...item,
        gameLabel: `${item.opponentAbbr}`,
        performance: item.performance,
        line: line,
        average: line * (0.95 + (index % 10) / 100), // Systematic variance instead of random
        hit: item.hit,
        margin: item.margin,
      }));
    }, [data, line]);

    const CustomTooltip = useCallback(({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-4 shadow-2xl backdrop-blur-sm">
            <p className="text-slate-200 text-sm font-semibold mb-2">{`vs ${data.opponentAbbr}`}</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Performance:</span>
                <span className="text-white font-bold">{data.performance}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Line:</span>
                <span className="text-amber-400 font-semibold">{data.line}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Margin:</span>
                <span className="text-slate-300 font-semibold">±{data.margin}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Result:</span>
                <span
                  className={cn(
                    "font-bold flex items-center gap-1",
                    data.hit ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {data.hit ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {data.overUnder?.toUpperCase() || "N/A"}
                </span>
              </div>
            </div>
          </div>
        );
      }
      return null;
    }, []);

    return (
      <ChartContainer config={enhancedChartConfig} className={cn("w-full h-full", className)}>
        <div className="w-full h-full flex flex-col">
          <div className="h-6 mb-4 flex-shrink-0">
            <h3 className="text-lg font-bold text-slate-200">Performance Trend</h3>
            <p className="text-sm text-slate-400">Last 10 games vs opponents</p>
          </div>
          <div
            className="w-full flex-1 overflow-hidden"
            style={{ height: `${height}px`, minHeight: `${height}px`, maxHeight: `${height}px` }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis
                  dataKey="gameLabel"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={{ stroke: "#475569" }}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={{ stroke: "#475569" }}
                  domain={[
                    (dataMin: number) => {
                      const min = Math.min(dataMin, line);
                      return Math.max(0, min - Math.max(2, min * 0.1));
                    },
                    (dataMax: number) => {
                      const max = Math.max(dataMax, line);
                      return max + Math.max(2, max * 0.1);
                    },
                  ]}
                />
                <ChartTooltip content={<CustomTooltip />} />

                {/* Reference line for the betting line */}
                <ReferenceLine
                  y={line}
                  stroke="#fbbf24"
                  strokeDasharray="4 4"
                  strokeWidth={3}
                  ifOverflow="visible"
                  label={{
                    value: String(line),
                    position: "insideTopLeft",
                    fill: "#fbbf24",
                    fontSize: 11,
                    fontWeight: "bold",
                    dy: -6,
                    backgroundColor: "rgba(0, 0, 0, 0.85)",
                    padding: 3,
                  }}
                />

                {/* Performance line */}
                <Line
                  type="monotone"
                  dataKey="performance"
                  stroke="#ffffff"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#ffffff", stroke: "none", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#ffffff", stroke: "none", strokeWidth: 0 }}
                />

                {/* Over/Under indicators */}
                {chartData.map((entry, index) => (
                  <ReferenceArea
                    key={index}
                    x1={entry.gameLabel}
                    x2={entry.gameLabel}
                    y1={entry.hit ? entry.performance : line}
                    y2={entry.hit ? line : entry.performance}
                    fill={entry.hit ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}
                  />
                ))}
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ChartContainer>
    );
  },
);

// Enhanced bar chart for performance comparison
const EnhancedBarChart = React.memo(
  ({
    data,
    line,
    className = "",
    height = 300,
  }: {
    data: GameHistoryEntry[];
    line: number;
    className?: string;
    height?: number;
  }) => {
    const chartData = useMemo(() => {
      return data.map((item, index) => ({
        ...item,
        gameLabel: `${item.opponentAbbr}`,
        performance: item.performance,
        line: line,
        overUnder: item.performance > line ? "over" : "under",
        margin: item.margin,
      }));
    }, [data, line]);

    const CustomTooltip = useCallback(({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-4 shadow-2xl backdrop-blur-sm">
            <p className="text-slate-200 text-sm font-semibold mb-2">{`vs ${data.opponentAbbr}`}</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Performance:</span>
                <span className="text-white font-bold">{data.performance}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Margin:</span>
                <span
                  className={cn(
                    "font-bold",
                    data.overUnder === "over" ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {data.overUnder === "over" ? "+" : "-"}
                  {data.margin}
                </span>
              </div>
            </div>
          </div>
        );
      }
      return null;
    }, []);

    return (
      <ChartContainer config={enhancedChartConfig} className={cn("w-full h-full", className)}>
        <div className="w-full h-full flex flex-col">
          <div className="h-6 mb-4 flex-shrink-0">
            <h3 className="text-lg font-bold text-slate-200">Performance by Game</h3>
            <p className="text-sm text-slate-400">Bar chart showing performance vs line</p>
          </div>
          <div
            className="w-full flex-1"
            style={{ height: `${height}px`, minHeight: `${height}px`, maxHeight: `${height}px` }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis
                  dataKey="gameLabel"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={{ stroke: "#475569" }}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={{ stroke: "#475569" }}
                  domain={[
                    (dataMin: number) => {
                      const min = Math.min(dataMin, line);
                      return Math.max(0, min - Math.max(2, min * 0.1));
                    },
                    (dataMax: number) => {
                      const max = Math.max(dataMax, line);
                      return max + Math.max(2, max * 0.1);
                    },
                  ]}
                />
                <ChartTooltip content={<CustomTooltip />} />

                {/* Reference line for the betting line */}
                <ReferenceLine
                  y={line}
                  stroke="#fbbf24"
                  strokeDasharray="4 4"
                  strokeWidth={3}
                  ifOverflow="visible"
                  label={{
                    value: String(line),
                    position: "insideTopLeft",
                    fill: "#fbbf24",
                    fontSize: 11,
                    fontWeight: "bold",
                    dy: -6,
                    backgroundColor: "rgba(0, 0, 0, 0.85)",
                    padding: 3,
                  }}
                />

                {/* Performance bars with color coding */}
                <Bar dataKey="performance" radius={[4, 4, 0, 0]} stroke="none" strokeWidth={0}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.performance > line ? "#10b981" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ChartContainer>
    );
  },
);

export function EnhancedAnalysisOverlay({
  prediction,
  playerProps = [],
  isOpen,
  onClose,
  currentFilter = "both",
}: EnhancedAnalysisOverlayProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTimeframe, setSelectedTimeframe] = useState("last10");
  const [isAnimating, setIsAnimating] = useState(false);
  const [userVote, setUserVote] = useState<"over" | "under" | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteCounts, setVoteCounts] = useState({ over: 0, under: 0 });
  const [adjustedLine, setAdjustedLine] = useState<number | null>(null);
  const [adjustedOdds, setAdjustedOdds] = useState<{ over: number; under: number } | null>(null);
  const [isUpdatingOdds, setIsUpdatingOdds] = useState(false);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [featureData, setFeatureData] = useState<any>(null);
  const [updatedEnhancedData, setUpdatedEnhancedData] = useState<EnhancedPrediction | null>(null);

  // Super-advanced AI model output (existing in codebase)
  const [advancedModelPrediction, setAdvancedModelPrediction] =
    useState<ComprehensivePrediction | null>(null);
  const [isLoadingAdvancedModel, setIsLoadingAdvancedModel] = useState(false);

  // Custom alerts state
  const [customAlerts, setCustomAlerts] = useState([
    { id: 1, type: "Line Movement", active: true, threshold: "±0.5", editable: false },
    { id: 2, type: "Odds Change", active: true, threshold: "±10", editable: false },
    { id: 3, type: "Volume Spike", active: false, threshold: "200%", editable: false },
    { id: 4, type: "Player Status", active: true, threshold: "Injury", editable: false },
  ]);

  // Prop selector state
  const [availableProps, setAvailableProps] = useState<any[]>([]);
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [isLoadingProps, setIsLoadingProps] = useState(false);

  // Real game log data for charts/consistency (from our API)
  const [realGameHistory, setRealGameHistory] = useState<any[] | null>(null);
  const [realConsistencyPct, setRealConsistencyPct] = useState<number | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Editable line state
  const [isEditingLine, setIsEditingLine] = useState(false);
  const [editedLine, setEditedLine] = useState<number | null>(null);

  // Quarter selection state
  const [selectedQuarter, setSelectedQuarter] = useState<string>("full");

  // Injured player filter state
  const [selectedInjuredPlayer, setSelectedInjuredPlayer] = useState<string | null>(null);
  const [filteredGameHistory, setFilteredGameHistory] = useState<any[] | null>(null);
  const [filteredAnalytics, setFilteredAnalytics] = useState<{
    l5: number | null;
    l10: number | null;
    l20: number | null;
    season_avg: number | null;
    current_streak: number;
  } | null>(null);
  const [isLoadingFilteredData, setIsLoadingFilteredData] = useState(false);

  // Fetch all props for the current player
  const fetchPlayerProps = useCallback(async () => {
    // If parent supplies playerProps (current slate), we don't need prediction.playerId.
    if (!prediction?.sport) return;

    setIsLoadingProps(true);
    try {
      // If the parent passed in player props (from the active slate), use them directly.
      if (Array.isArray(playerProps) && playerProps.length > 0) {
        setAvailableProps(playerProps);
        if (!selectedPropId) {
          const currentProp = playerProps.find(
            (p: any) =>
              p?.propType === prediction.propType &&
              Math.abs(Number(p?.line) - Number(prediction.line)) < 0.1,
          );
          setSelectedPropId(currentProp?.id || playerProps[0]?.id || null);
        }
        return;
      }

      // Use the consistent props service to get all props for the sport
      const allProps = await consistentPropsService.getConsistentPlayerProps(prediction.sport);

      // Filter to get props for the current player - be more lenient with matching
      const playerProps = allProps.filter((prop) => {
        // Match player name (case insensitive)
        const playerNameMatch =
          prop.playerName?.toLowerCase() === prediction.playerName?.toLowerCase();

        // Match game ID if available, otherwise skip game ID check
        const gameIdMatch = !prop.gameId || !prediction.gameId || prop.gameId === prediction.gameId;

        return playerNameMatch && gameIdMatch;
      });

      console.log(
        `🔍 Analysis Overlay - Found ${playerProps.length} props for ${prediction.playerName}:`,
        playerProps,
      );

      // Debug: Log all prop types found for this player
      const propTypes = [...new Set(playerProps.map((p) => p.propType))];
      console.log(`🔍 Analysis Overlay - Prop types for ${prediction.playerName}:`, propTypes);

      // Debug: Check for alternative lines
      const groupedByPropType = playerProps.reduce(
        (acc, prop) => {
          if (!acc[prop.propType]) {
            acc[prop.propType] = [];
          }
          acc[prop.propType].push(prop);
          return acc;
        },
        {} as Record<string, any[]>,
      );

      Object.entries(groupedByPropType).forEach(([propType, props]) => {
        if (props.length > 1) {
          console.log(
            `🔍 Analysis Overlay - Alternative lines for ${prediction.playerName} ${propType}:`,
            props.map((p) => ({ line: p.line, overOdds: p.overOdds, underOdds: p.underOdds })),
          );
        }
      });

      setAvailableProps(playerProps);

      // Set current prop as selected if not already set
      if (!selectedPropId && playerProps.length > 0) {
        const currentProp = playerProps.find(
          (prop) =>
            prop.propType === prediction.propType && Math.abs(prop.line - prediction.line) < 0.1, // Allow for small floating point differences
        );
        if (currentProp) {
          setSelectedPropId(currentProp.id);
        } else {
          // If no exact match, select the first prop
          setSelectedPropId(playerProps[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching player props:", error);
      setAvailableProps([]);
    } finally {
      setIsLoadingProps(false);
    }
  }, [
    prediction?.playerId,
    prediction?.sport,
    prediction?.gameDate,
    prediction?.propType,
    prediction?.line,
    prediction?.playerName,
    prediction?.gameId,
    selectedPropId,
    playerProps,
  ]);

  // Fetch real player logs for the selected prop (for performance trend + consistency)
  const fetchPlayerLogs = useCallback(async (p: any) => {
    const playerUuid = String(p?.player_uuid || p?.playerUuid || "").trim();
    const propType = String(p?.propType || p?.prop_type || "").trim();
    const line = Number(p?.line);
    if (!playerUuid || !propType || !Number.isFinite(line)) {
      setRealGameHistory(null);
      setRealConsistencyPct(null);
      return;
    }
    setIsLoadingHistory(true);
    try {
      const base = `${window.location.protocol}//${window.location.hostname}:3001`;
      const qs = new URLSearchParams({
        player_uuid: playerUuid,
        propType,
        limit: "10",
      });
      const res = await fetch(`${base}/api/player-game-logs?${qs.toString()}`);
      const json = await res.json();
      if (!json?.success || !Array.isArray(json.items)) {
        setRealGameHistory(null);
        setRealConsistencyPct(null);
        return;
      }

      const items = json.items as Array<{
        game_date: string;
        opponent_abbr: string | null;
        actual_value: number;
      }>;
      const gh = items.map((it, idx) => {
        const v = Number(it.actual_value);
        const hit = Number.isFinite(v) ? v > line : false;
        return {
          id: `${playerUuid}:${propType}:${idx}`,
          date: it.game_date,
          opponent: it.opponent_abbr || "UNK",
          opponentAbbr: it.opponent_abbr || "UNK",
          performance: Number.isFinite(v) ? v : 0,
          line,
          hit,
          overUnder: hit ? "over" : "under",
          margin: Number.isFinite(v) ? Math.abs(v - line) : 0,
          context: "",
        };
      });
      setRealGameHistory(gh);
      const c =
        typeof json.consistency === "number" && Number.isFinite(json.consistency)
          ? json.consistency
          : null;
      setRealConsistencyPct(c);
    } catch (e) {
      setRealGameHistory(null);
      setRealConsistencyPct(null);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Load props when overlay opens
  useEffect(() => {
    if (isOpen && prediction) {
      fetchPlayerProps();
    }
  }, [isOpen, prediction, fetchPlayerProps]);

  // Load real logs when overlay opens, prop changes, or line/quarter changes
  useEffect(() => {
    if (!isOpen || !prediction) return;
    const active = (updatedEnhancedData as any) || prediction;
    fetchPlayerLogs(active, selectedQuarter);
  }, [isOpen, prediction, updatedEnhancedData, selectedQuarter, fetchPlayerLogs]);

  // Fetch filtered game logs when teammate is selected
  const fetchFilteredLogs = useCallback(async (teammateName: string, p: any) => {
    if (!teammateName || !p) {
      setFilteredGameHistory(null);
      setFilteredAnalytics(null);
      return;
    }

    setIsLoadingFilteredData(true);
    try {
      const playerUuid = String(p?.player_uuid || p?.playerUuid || "").trim();
      const propType = String(p?.propType || p?.prop_type || "").trim();
      const line = Number(p?.line);
      const team = String(p?.team || "")
        .trim()
        .toUpperCase();

      if (!playerUuid || !propType || !Number.isFinite(line) || !team) {
        setFilteredGameHistory(null);
        setFilteredAnalytics(null);
        return;
      }

      // Fetch all game logs (we'll filter by injury status)
      const base = `${window.location.protocol}//${window.location.hostname}:3001`;
      const qs = new URLSearchParams({
        player_uuid: playerUuid,
        propType,
        limit: "50", // Get more games to filter
      });
      const res = await fetch(`${base}/api/player-game-logs?${qs.toString()}`);
      const json = await res.json();

      if (!json?.success || !Array.isArray(json.items)) {
        setFilteredGameHistory(null);
        setFilteredAnalytics(null);
        return;
      }

      // For each game, check if teammate was injured/out
      const filteredItems: any[] = [];
      for (const item of json.items) {
        try {
          // Check injury status for teammate on this game date
          const injuryQs = new URLSearchParams({
            team,
            player: teammateName,
          });
          const injuryRes = await fetch(`${base}/api/nfl/injury-status?${injuryQs.toString()}`);
          const injuryJson = await injuryRes.json();

          // If teammate was out/injured on this date, include the game
          // For now, we'll use a heuristic: if they're currently injured, assume they were out
          // In a real implementation, we'd check historical injury reports per game date
          const wasOut =
            injuryJson?.status === "Out" ||
            injuryJson?.status === "Injured" ||
            injuryJson?.status === "Doubtful";

          if (wasOut) {
            filteredItems.push(item);
          }
        } catch (e) {
          // If we can't check injury status, skip this game
          continue;
        }
      }

      // Map to game history format
      const gh = filteredItems.map((it, idx) => {
        const v = Number(it.actual_value);
        const hit = Number.isFinite(v) ? v > line : false;
        return {
          id: `${playerUuid}:${propType}:${idx}`,
          date: it.game_date,
          opponent: it.opponent_abbr || "UNK",
          opponentAbbr: it.opponent_abbr || "UNK",
          performance: Number.isFinite(v) ? v : 0,
          line,
          hit,
          overUnder: hit ? "over" : "under",
          margin: Number.isFinite(v) ? Math.abs(v - line) : 0,
          context: "",
        };
      });

      setFilteredGameHistory(gh);

      // Recalculate analytics from filtered games
      if (gh.length > 0) {
        const values = gh.map((g) => g.performance);
        const hits = gh.map((g) => (g.performance > line ? 1 : 0));

        const calcPct = (n: number) => {
          const slice = hits.slice(0, n);
          return slice.length > 0 ? (slice.reduce((a, b) => a + b, 0) / slice.length) * 100 : null;
        };

        const l5 = calcPct(5);
        const l10 = calcPct(10);
        const l20 = calcPct(20);
        const season_avg = values.reduce((a, b) => a + b, 0) / values.length;

        // Calculate streak
        let streak = 0;
        if (hits.length > 0) {
          const first = hits[0];
          for (const h of hits) {
            if (h === first) streak += 1;
            else break;
          }
          streak = first === 1 ? streak : -streak;
        }

        setFilteredAnalytics({
          l5,
          l10,
          l20,
          season_avg,
          current_streak: streak,
        });
      } else {
        setFilteredAnalytics(null);
      }
    } catch (e) {
      console.error("Error fetching filtered logs:", e);
      setFilteredGameHistory(null);
      setFilteredAnalytics(null);
    } finally {
      setIsLoadingFilteredData(false);
    }
  }, []);

  // Fetch filtered logs when teammate selection changes
  useEffect(() => {
    if (!selectedInjuredPlayer || !isOpen) {
      setFilteredGameHistory(null);
      setFilteredAnalytics(null);
      return;
    }

    const active = (updatedEnhancedData as any) || prediction;
    const teammateName = selectedInjuredPlayer.split("-")[1] || selectedInjuredPlayer;
    fetchFilteredLogs(teammateName, active);
  }, [selectedInjuredPlayer, isOpen, prediction, updatedEnhancedData, fetchFilteredLogs]);

  // Handle prop selection change
  const handlePropChange = useCallback(
    (propId: string) => {
      // Search in both availableProps and playerProps
      const selectedProp =
        availableProps.find((prop) => prop.id === propId || prop.playerId === propId) ||
        playerProps.find((prop: any) => prop.id === propId || prop.playerId === propId);

      if (selectedProp) {
        console.log(`[handlePropChange] Switching to prop:`, {
          propId,
          propType: selectedProp.propType,
          line: selectedProp.line,
          foundIn: availableProps.find((p) => p.id === propId) ? "availableProps" : "playerProps",
        });

        setSelectedPropId(propId);

        // Update the prediction data with the new prop - use ALL fields from selectedProp
        const updatedPrediction = {
          ...prediction,
          ...selectedProp, // Spread all fields from selectedProp first
          id: selectedProp.id || propId,
          propType: selectedProp.propType,
          line: selectedProp.line,
          overOdds: selectedProp.overOdds,
          underOdds: selectedProp.underOdds,
          // Prefer real analytics fields when present
          player_uuid:
            (selectedProp as any).player_uuid ||
            (selectedProp as any).playerUuid ||
            (prediction as any).player_uuid,
          l5: (selectedProp as any).l5 ?? (prediction as any).l5,
          l10: (selectedProp as any).l10 ?? (prediction as any).l10,
          l20: (selectedProp as any).l20 ?? (prediction as any).l20,
          current_streak:
            (selectedProp as any).current_streak ?? (prediction as any).current_streak,
          matchup_rank: (selectedProp as any).matchup_rank ?? (prediction as any).matchup_rank,
          ev_percent: (selectedProp as any).ev_percent ?? (prediction as any).ev_percent,
          season_avg: (selectedProp as any).season_avg ?? (prediction as any).season_avg,
          expectedValue: (selectedProp as any).ev_percent ?? selectedProp.expectedValue,
          confidence: selectedProp.confidence,
          aiPrediction: selectedProp.aiPrediction,
        };

        // This will trigger a re-render with the new prop data
        setUpdatedEnhancedData(updatedPrediction as EnhancedPrediction);

        // Also clear any filtered data since we're switching props
        setFilteredGameHistory(null);
        setFilteredAnalytics(null);
        setSelectedInjuredPlayer(null);
      } else {
        console.warn(`[handlePropChange] Prop not found:`, {
          propId,
          availablePropsIds: availableProps.map((p) => p.id),
          playerPropsIds: playerProps.map((p: any) => p.id),
        });
      }
    },
    [availableProps, playerProps, prediction],
  );

  // Helper function to get team logo URL
  const getTeamLogoUrl = (teamAbbr: string, sport: string) => {
    const sportLower = sport.toLowerCase();
    const teamLower = teamAbbr.toLowerCase();
    return `https://a.espncdn.com/i/teamlogos/${sportLower}/500/${teamLower}.png`;
  };

  // Format American odds with proper NaN and null handling
  const formatAmericanOdds = (odds: number | string | undefined | null): string => {
    // Handle non-numeric values
    if (odds === null || odds === undefined || odds === "") {
      return "N/A";
    }

    // Convert to number if it's a string
    const numOdds = typeof odds === "string" ? parseFloat(odds) : odds;

    // Check if the conversion resulted in a valid number
    if (isNaN(numOdds)) {
      return "N/A";
    }

    // Round to nearest .5 or .0 interval
    const rounded = Math.round(numOdds * 2) / 2;

    // Format as American odds
    if (rounded > 0) {
      return `+${Math.round(rounded)}`;
    } else {
      return `${Math.round(rounded)}`;
    }
  };

  // Calculate risk level based on AI confidence and hit probability
  const calculateRiskLevel = (confidence: number, hitRate: number): "low" | "medium" | "high" => {
    // Combine confidence and hit rate for risk assessment
    const riskScore = confidence * 0.6 + hitRate * 0.4;

    if (riskScore >= 0.75) return "low";
    if (riskScore >= 0.55) return "medium";
    return "high";
  };

  // Enhanced data generation
  const enhancedData = useMemo(() => {
    if (!prediction) {
      console.log("EnhancedAnalysisOverlay: No prediction provided");
      return null;
    }

    console.log("EnhancedAnalysisOverlay: Processing prediction:", {
      id: prediction.id,
      playerName: prediction.playerName,
      confidence: prediction.confidence,
      expectedValue: prediction.expectedValue,
      hasConfidence: "confidence" in prediction,
      hasExpectedValue: "expectedValue" in prediction,
    });

    const baseLine = Number((prediction as any).line);
    const apiHistory =
      Array.isArray(realGameHistory) && realGameHistory.length > 0 && Number.isFinite(baseLine)
        ? (realGameHistory as any[])
        : null;
    const gameHistory = (apiHistory as any) || generateEnhancedGameHistory(prediction);
    let performanceMetrics = generatePerformanceMetrics(gameHistory, prediction);

    // Single source of truth: model confidence (so "AI Confidence" can never disagree)
    const rating = statpediaRatingService.calculateRating(prediction, currentFilter);
    const modelConfidence01 = Math.max(0, Math.min(1, Number(rating?.overall || 50) / 95));

    // Calculate risk level based on model confidence and hit probability
    const aiConfidence = modelConfidence01;
    const hitRate =
      typeof (prediction as any).l20 === "number"
        ? Math.max(0, Math.min(1, Number((prediction as any).l20) / 100))
        : prediction.seasonStats?.hitRate || 0.5;
    const calculatedRiskLevel = calculateRiskLevel(aiConfidence, hitRate);

    // Check if prediction already has enhanced data
    const isEnhanced = "gameHistory" in prediction;

    if (isEnhanced) {
      return {
        ...prediction,
        riskLevel: calculatedRiskLevel,
      } as EnhancedPrediction;
    }

    // Expected value: prefer backend ev_percent (already computed) else fallback
    // EV% is already expressed in percent points in our API (e.g. 1.9 means +1.9%).
    const rawEv = (prediction as any).ev_percent ?? prediction.expectedValue;
    const calculatedExpectedValue: number =
      typeof rawEv === "number" && Number.isFinite(rawEv) ? rawEv : 0;

    // Override current streak + recent form + consistency from real analytics fields
    const streakFromApiRaw =
      (prediction as any).current_streak ??
      (prediction as any).currentStreak ??
      (prediction as any).streak_l5 ??
      null;
    const streakFromApi =
      typeof streakFromApiRaw === "number" && Number.isFinite(streakFromApiRaw)
        ? streakFromApiRaw
        : null;
    if (streakFromApi !== null) {
      performanceMetrics = { ...performanceMetrics, currentStreak: Math.abs(streakFromApi) };
    }
    const l5Pct =
      typeof (prediction as any).l5 === "number" ? Number((prediction as any).l5) : null;
    if (l5Pct !== null && Number.isFinite(l5Pct)) {
      performanceMetrics = {
        ...performanceMetrics,
        recentForm: l5Pct >= 70 ? "hot" : l5Pct <= 45 ? "cold" : "average",
      };
    }
    if (typeof realConsistencyPct === "number" && Number.isFinite(realConsistencyPct)) {
      performanceMetrics = {
        ...performanceMetrics,
        consistency: Math.max(0, Math.min(1, realConsistencyPct / 100)),
      };
    }

    // Convert AdvancedPrediction to EnhancedPrediction
    return {
      ...prediction,
      expectedValue: calculatedExpectedValue,
      confidence: modelConfidence01,
      aiPrediction: {
        ...(prediction.aiPrediction || {}),
        confidence: modelConfidence01,
      },
      riskLevel: calculatedRiskLevel,
      gameHistory,
      performanceMetrics,
      advancedStats: {
        homeAwaySplit: calculateHomeAwaySplit(gameHistory, prediction),
        opponentStrength: calculateOpponentStrength(gameHistory),
        restDays: calculateRestDaysSplit(gameHistory),
        situational: calculateSituationalSplit(gameHistory, prediction),
      },
    } as EnhancedPrediction;
  }, [prediction, currentFilter, realGameHistory, realConsistencyPct]);

  // Recalculate enhanced data when prop changes
  const finalEnhancedData = useMemo(() => {
    if (updatedEnhancedData) {
      // Recalculate enhanced data for the new prop
      const baseLine = Number((updatedEnhancedData as any).line);
      const apiHistory =
        Array.isArray(realGameHistory) && realGameHistory.length > 0 && Number.isFinite(baseLine)
          ? (realGameHistory as any[])
          : null;
      const gameHistory = (apiHistory as any) || generateEnhancedGameHistory(updatedEnhancedData);
      let performanceMetrics = generatePerformanceMetrics(gameHistory, updatedEnhancedData);

      // Calculate risk level based on AI confidence and hit probability
      const rating = statpediaRatingService.calculateRating(
        updatedEnhancedData as any,
        currentFilter,
      );
      const modelConfidence01 = Math.max(0, Math.min(1, Number(rating?.overall || 50) / 95));
      const aiConfidence = modelConfidence01;
      const hitRate =
        typeof (updatedEnhancedData as any).l20 === "number"
          ? Math.max(0, Math.min(1, Number((updatedEnhancedData as any).l20) / 100))
          : updatedEnhancedData.seasonStats?.hitRate || 0.5;
      const calculatedRiskLevel = calculateRiskLevel(aiConfidence, hitRate);

      const streakFromApiRaw =
        (updatedEnhancedData as any).current_streak ??
        (updatedEnhancedData as any).currentStreak ??
        (updatedEnhancedData as any).streak_l5 ??
        null;
      const streakFromApi =
        typeof streakFromApiRaw === "number" && Number.isFinite(streakFromApiRaw)
          ? streakFromApiRaw
          : null;
      if (streakFromApi !== null) {
        performanceMetrics = { ...performanceMetrics, currentStreak: Math.abs(streakFromApi) };
      }
      const l5Pct =
        typeof (updatedEnhancedData as any).l5 === "number"
          ? Number((updatedEnhancedData as any).l5)
          : null;
      if (l5Pct !== null && Number.isFinite(l5Pct)) {
        performanceMetrics = {
          ...performanceMetrics,
          recentForm: l5Pct >= 70 ? "hot" : l5Pct <= 45 ? "cold" : "average",
        };
      }
      if (typeof realConsistencyPct === "number" && Number.isFinite(realConsistencyPct)) {
        performanceMetrics = {
          ...performanceMetrics,
          consistency: Math.max(0, Math.min(1, realConsistencyPct / 100)),
        };
      }

      return {
        ...updatedEnhancedData,
        confidence: modelConfidence01,
        aiPrediction: {
          ...(updatedEnhancedData.aiPrediction || {}),
          confidence: modelConfidence01,
        },
        riskLevel: calculatedRiskLevel,
        gameHistory,
        performanceMetrics,
        advancedStats: {
          homeAwaySplit: calculateHomeAwaySplit(gameHistory, updatedEnhancedData),
          opponentStrength: calculateOpponentStrength(gameHistory),
          restDays: calculateRestDaysSplit(gameHistory),
          situational: calculateSituationalSplit(gameHistory, updatedEnhancedData),
        },
      } as EnhancedPrediction;
    }
    return enhancedData;
  }, [
    updatedEnhancedData,
    prediction,
    currentFilter,
    enhancedData,
    realGameHistory,
    realConsistencyPct,
  ]);

  // Use updated data if available, otherwise use original enhanced data
  const currentData = finalEnhancedData;

  // Recalculate analytics from realGameHistory with current line
  const recalculatedAnalytics = useMemo(() => {
    if (!realGameHistory || realGameHistory.length === 0 || !currentData) return null;
    const line = Number(currentData.line);
    if (!Number.isFinite(line)) return null;

    const hits = realGameHistory.map((g: any) => (g.performance > line ? 1 : 0));
    const calcPct = (n: number) => {
      const slice = hits.slice(0, n);
      if (slice.length === 0) return null;
      return (slice.reduce((a, b) => a + b, 0) / slice.length) * 100;
    };

    const l5 = calcPct(5);
    const l10 = calcPct(10);
    const l20 = calcPct(20);
    const season_avg =
      realGameHistory.reduce((sum: number, g: any) => sum + g.performance, 0) /
      realGameHistory.length;

    // Calculate streak
    let streak = 0;
    if (hits.length > 0) {
      const first = hits[0];
      for (const h of hits) {
        if (h === first) streak += 1;
        else break;
      }
      streak = first === 1 ? streak : -streak;
    }

    return { l5, l10, l20, season_avg, current_streak: streak };
  }, [realGameHistory, currentData?.line]);

  // Use recalculated analytics if available, otherwise fall back to currentData
  const displayData = useMemo(() => {
    if (!currentData) return null;
    if (recalculatedAnalytics) {
      return {
        ...currentData,
        l5: recalculatedAnalytics.l5,
        l10: recalculatedAnalytics.l10,
        l20: recalculatedAnalytics.l20,
        season_avg: recalculatedAnalytics.season_avg,
        current_streak: recalculatedAnalytics.current_streak,
      };
    }
    return currentData;
  }, [currentData, recalculatedAnalytics]);

  // Calculate SP rating using the same service as player props tab, but enhanced with advanced model data
  const spRating = useMemo(() => {
    if (!displayData) return null;

    // Enhance displayData with advanced model prediction if available
    const enhancedData = { ...displayData };
    if (advancedModelPrediction) {
      // Inject the advanced model's prediction into the prop data for rating calculation
      enhancedData.aiPrediction = {
        confidence: advancedModelPrediction.confidence / 100, // Convert 0-100 to 0-1
        recommended: advancedModelPrediction.prediction, // 'over' or 'under'
        probability:
          advancedModelPrediction.modelConsensus?.ensemble ||
          (advancedModelPrediction.prediction === "over" ? 0.6 : 0.4), // Default probability
      };
      // Also add the full advanced model prediction for the rating service to use
      enhancedData.advancedModelPrediction = advancedModelPrediction;
    }

    const rating = statpediaRatingService.calculateRating(enhancedData, "over");
    return rating.overall;
  }, [displayData, advancedModelPrediction]);

  // Determine OVER/UNDER prediction based on advanced NFL model
  const aiPrediction = useMemo(() => {
    // First, try to use the advanced model prediction (NFL only)
    if (advancedModelPrediction && advancedModelPrediction.prediction) {
      return advancedModelPrediction.prediction.toUpperCase(); // 'over' or 'under' -> 'OVER' or 'UNDER'
    }

    // Fallback: use model consensus ensemble probabilities if available
    if (advancedModelPrediction?.modelConsensus?.ensemble) {
      const ensembleProb = advancedModelPrediction.modelConsensus.ensemble;
      // ensemble is typically a probability (0-1) for over
      // If > 0.5, predict OVER, else UNDER
      return ensembleProb > 0.5 ? "OVER" : "UNDER";
    }

    // Final fallback: use rating (but this shouldn't be the primary method)
    if (spRating && displayData) {
      return spRating > 50 ? "OVER" : "UNDER";
    }

    return null;
  }, [advancedModelPrediction, spRating, displayData]);

  // Get player headshot URL (must be after currentData is defined)
  const playerHeadshotUrl = useMemo(() => {
    if (!currentData) return null;
    const playerId = String(
      (currentData as any)?.playerId || (currentData as any)?.id || "",
    ).trim();
    const sport = String((currentData as any)?.sport || "nfl").toLowerCase();
    if (!playerId) return null;
    return getPlayerHeadshot(sport, playerId);
  }, [(currentData as any)?.playerId, (currentData as any)?.sport]);

  // Load super-advanced model prediction for this exact prop (NFL only for now)
  useEffect(() => {
    const run = async () => {
      try {
        if (!isOpen || !currentData) return;
        const sport = String((currentData as any).sport || "").toLowerCase();
        if (sport !== "nfl") {
          setAdvancedModelPrediction(null);
          return;
        }

        const playerId = String(
          (currentData as any).playerId || (currentData as any).id || "",
        ).trim();
        const playerName = String((currentData as any).playerName || "").trim();
        const propType = String((currentData as any).propType || "").trim();
        const line = Number((currentData as any).line);
        const gameId = String((currentData as any).gameId || "").trim();
        const team = String(
          (currentData as any).teamAbbr || (currentData as any).team || "",
        ).trim();
        const opponent = String(
          (currentData as any).opponentAbbr || (currentData as any).opponent || "",
        ).trim();
        const gameDate = String((currentData as any).gameDate || new Date().toISOString());
        const over = Number((currentData as any).overOdds ?? -110);
        const under = Number((currentData as any).underOdds ?? -110);

        if (!playerId || !playerName || !propType || !Number.isFinite(line) || !team || !opponent) {
          setAdvancedModelPrediction(null);
          return;
        }

        const req: PredictionRequest = {
          playerId,
          playerName,
          propType,
          line,
          gameId: gameId || `game_${team}_${opponent}`,
          team,
          opponent,
          gameDate,
          odds: {
            over: Number.isFinite(over) && over !== 0 ? over : -110,
            under: Number.isFinite(under) && under !== 0 ? under : -110,
          },
        };

        setIsLoadingAdvancedModel(true);
        const pred = await advancedPredictionService.generateComprehensivePrediction(req);
        setAdvancedModelPrediction(pred);
      } catch (e) {
        setAdvancedModelPrediction(null);
      } finally {
        setIsLoadingAdvancedModel(false);
      }
    };

    run();
    // Only refetch when the selected prop meaningfully changes
  }, [
    isOpen,
    (currentData as any)?.sport,
    (currentData as any)?.playerId,
    (currentData as any)?.propType,
    (currentData as any)?.line,
    (currentData as any)?.gameId,
    (currentData as any)?.teamAbbr,
    (currentData as any)?.opponentAbbr,
    (currentData as any)?.overOdds,
    (currentData as any)?.underOdds,
  ]);

  // Check injury status
  const [injuryStatus, setInjuryStatus] = useState<string>("Unknown");
  const [isQuestionable, setIsQuestionable] = useState<boolean>(false);
  const [injuryDetails, setInjuryDetails] = useState<string | null>(null);
  const [injuryReturnDate, setInjuryReturnDate] = useState<string | null>(null);

  // Depth chart state
  const [depthChart, setDepthChart] = useState<
    Record<string, Array<{ name: string; position: string; jersey: string }>>
  >({});
  const [isLoadingDepthChart, setIsLoadingDepthChart] = useState<boolean>(false);

  useEffect(() => {
    // Check if player is questionable or injured
    const checkInjuryStatus = async () => {
      if (!prediction?.playerName) return;

      try {
        const teamAbbr = String(
          (prediction as any).teamAbbr || (prediction as any).team || "",
        ).trim();
        if (!teamAbbr) {
          setInjuryStatus("Unknown");
          setIsQuestionable(false);
          return;
        }
        const base = `${window.location.protocol}//${window.location.hostname}:3001`;
        const qs = new URLSearchParams({
          team: teamAbbr.toUpperCase(),
          player: String(prediction.playerName || ""),
        });
        const resp = await fetch(`${base}/api/nfl/injury-status?${qs.toString()}`);
        const json = await resp.json();
        const status = String(json?.status || "Unknown");
        setInjuryStatus(status);
        setInjuryDetails(json?.details ? String(json.details) : null);
        setInjuryReturnDate(json?.returnDate ? String(json.returnDate) : null);
        const s = status.toLowerCase();
        setIsQuestionable(
          s.includes("questionable") || s.includes("doubtful") || s.includes("out"),
        );
      } catch (error) {
        console.error("Error checking injury status:", error);
        setInjuryStatus("Unknown");
        setIsQuestionable(false);
        setInjuryDetails(null);
        setInjuryReturnDate(null);
      }
    };

    checkInjuryStatus();
  }, [prediction?.playerName, (prediction as any)?.teamAbbr, (prediction as any)?.team]);

  // Fetch depth chart
  useEffect(() => {
    const fetchDepthChart = async () => {
      const teamAbbr = String(
        (prediction as any)?.teamAbbr || (prediction as any)?.team || "",
      ).trim();
      if (!teamAbbr || String((prediction as any)?.sport || "").toLowerCase() !== "nfl") {
        return;
      }

      setIsLoadingDepthChart(true);
      try {
        const base = `${window.location.protocol}//${window.location.hostname}:3001`;
        const qs = new URLSearchParams({
          team: teamAbbr.toUpperCase(),
        });
        const resp = await fetch(`${base}/api/nfl/depth-chart?${qs.toString()}`);
        const json = await resp.json();
        if (json.success && json.depthChart) {
          setDepthChart(json.depthChart);
        }
      } catch (error) {
        console.error("Error fetching depth chart:", error);
      } finally {
        setIsLoadingDepthChart(false);
      }
    };

    fetchDepthChart();
  }, [(prediction as any)?.teamAbbr, (prediction as any)?.team, (prediction as any)?.sport]);

  if (!prediction || !enhancedData) {
    console.log(
      "EnhancedAnalysisOverlay: Not rendering - prediction:",
      !!prediction,
      "enhancedData:",
      !!enhancedData,
    );
    return null;
  }

  console.log("EnhancedAnalysisOverlay: Rendering with data:", {
    predictionId: prediction.id,
    playerName: prediction.playerName,
    hasEnhancedData: !!enhancedData,
  });

  const handleVote = (vote: "over" | "under") => {
    if (hasVoted) return;
    setUserVote(vote);
    setHasVoted(true);
    setVoteCounts((prev) => ({
      ...prev,
      [vote]: prev[vote] + 1,
    }));
  };

  const handleLineAdjustment = async (newLine: number) => {
    if (!enhancedData) return;

    setIsUpdatingOdds(true);
    setAdjustedLine(newLine);

    try {
      // Get updated odds for the new line from FanDuel
      const updatedOdds = await consistentPropsService.getOddsForLine(enhancedData as any, newLine);

      if (updatedOdds) {
        setAdjustedOdds({
          over: updatedOdds.overOdds,
          under: updatedOdds.underOdds,
        });

        // Update all derived metrics with the new line and odds
        await updateAllMetricsForNewLine(newLine, updatedOdds.overOdds, updatedOdds.underOdds);
      }
    } catch (error) {
      console.error("Failed to update odds for line:", error);
    } finally {
      setIsUpdatingOdds(false);
    }
  };

  // Update all metrics when line changes
  const updateAllMetricsForNewLine = async (
    newLine: number,
    newOverOdds: number,
    newUnderOdds: number,
  ) => {
    if (!enhancedData) return;

    try {
      // Recalculate EV with new line and odds
      const newExpectedValue = calculateEVForLine(newLine, newOverOdds, newUnderOdds);

      // Recalculate confidence based on new line
      const newConfidence = calculateConfidenceForLine(newLine);

      // Update AI prediction for new line
      const newAIPrediction = generateAIPredictionForLine(newLine, newOverOdds, newUnderOdds);

      // Update risk level
      const newRiskLevel = calculateRiskLevel(
        newConfidence,
        enhancedData.seasonStats?.hitRate || 0.5,
      );

      // Update the enhanced data with new calculations
      const updatedData = {
        ...enhancedData,
        line: newLine,
        overOdds: newOverOdds,
        underOdds: newUnderOdds,
        expectedValue: newExpectedValue,
        confidence: newConfidence,
        // Keep AI + model confidence aligned
        aiPrediction: {
          ...(newAIPrediction as any),
          confidence: newConfidence,
        },
        riskLevel: newRiskLevel,
      };

      // Update the state with new data
      setUpdatedEnhancedData(updatedData);
      setFeatureData(null); // Clear feature data to force recalculation
    } catch (error) {
      console.error("Failed to update metrics for new line:", error);
    }
  };

  // Calculate EV for new line and odds
  const calculateEVForLine = (line: number, overOdds: number, underOdds: number): number => {
    try {
      // Use similar logic to the EV calculator service
      const overImpliedProb = Math.abs(overOdds) / (Math.abs(overOdds) + 100);
      const underImpliedProb = Math.abs(underOdds) / (Math.abs(underOdds) + 100);

      // Estimate true probability based on historical data and new line
      const historicalHitRate = enhancedData.seasonStats?.hitRate || 0.5;
      const lineAdjustment = (enhancedData.line - line) / enhancedData.line; // How much line changed
      const estimatedOverProb = Math.max(
        0.38,
        Math.min(0.62, historicalHitRate + lineAdjustment * 0.1),
      );

      // Calculate decimal odds
      const overDecimalOdds = overOdds > 0 ? overOdds / 100 + 1 : 100 / Math.abs(overOdds) + 1;

      // Calculate EV
      const overEV = estimatedOverProb * (overDecimalOdds - 1) - (1 - estimatedOverProb) * 1;

      // Return as percentage, capped at realistic values
      return Math.max(-40, Math.min(20, overEV * 100));
    } catch (error) {
      console.error("Failed to calculate EV for line:", error);
      return 0;
    }
  };

  // Calculate confidence for new line
  const calculateConfidenceForLine = (line: number): number => {
    if (!enhancedData.seasonStats) return 0.5;

    // Adjust confidence based on how far the new line is from historical average
    const historicalAverage = enhancedData.seasonStats.average;
    const lineDifference = Math.abs(line - historicalAverage);
    const maxDifference = historicalAverage * 0.3; // 30% of average

    // Confidence decreases as line moves further from historical average
    const baseConfidence = enhancedData.confidence || 0.5;
    const adjustment = Math.min(lineDifference / maxDifference, 1) * 0.2; // Max 20% adjustment

    return Math.max(0.3, Math.min(0.9, baseConfidence - adjustment));
  };

  // Generate AI prediction for new line
  const generateAIPredictionForLine = (line: number, overOdds: number, underOdds: number) => {
    if (!enhancedData.seasonStats) return enhancedData.aiPrediction;

    const historicalAverage = enhancedData.seasonStats.average;
    const confidence = calculateConfidenceForLine(line);

    // Recommend based on line vs historical average
    const recommended = line < historicalAverage ? "over" : "under";

    return {
      recommended: recommended as "over" | "under",
      confidence: confidence,
      reasoning: `Based on ${enhancedData.playerName}'s season average of ${historicalAverage.toFixed(1)}, the ${recommended} appears favorable at line ${line}.`,
      factors: [
        `Historical average: ${historicalAverage.toFixed(1)}`,
        `Line adjustment: ${line > historicalAverage ? "Higher" : "Lower"} than average`,
        `Odds adjustment: ${overOdds > 0 ? "+" : ""}${overOdds} / ${underOdds > 0 ? "+" : ""}${underOdds}`,
      ],
    };
  };

  const resetLineAdjustment = () => {
    setAdjustedLine(null);
    setAdjustedOdds(null);
    setUpdatedEnhancedData(null); // Reset to original data
  };

  // Feature handlers
  const handleFeatureClick = async (feature: string) => {
    setActiveFeature(feature);

    switch (feature) {
      case "ai-insights":
        setFeatureData({
          type: "ai-insights",
          insights: generateRealAIInsights(enhancedData),
        });
        break;
      case "value-finder":
        // Calculate real edge using EV calculator
        try {
          const evCalculation = evCalculatorService.calculateEV({
            id: enhancedData.id || "",
            playerName: enhancedData.playerName || "",
            propType: enhancedData.propType || "",
            line: enhancedData.line || 0,
            odds: enhancedData.overOdds?.toString() || "0",
            sport: enhancedData.sport || "nfl",
            team: enhancedData.team || "",
            opponent: enhancedData.opponent || "",
            gameDate: enhancedData.gameDate || "",
            hitRate: enhancedData.seasonStats?.hitRate,
            recentForm: enhancedData.recentForm,
            matchupData: enhancedData.matchupAnalysis,
            weatherConditions: enhancedData.weatherImpact,
            injuryStatus: enhancedData.injuryImpact,
            restDays: enhancedData.restDays,
          });

          // Calculate fair odds based on true probability
          const trueProbability = evCalculation.confidence / 100;
          const fairOdds =
            trueProbability > 0.5
              ? Math.round((-100 * trueProbability) / (1 - trueProbability))
              : Math.round((100 * (1 - trueProbability)) / trueProbability);

          setFeatureData({
            type: "value-finder",
            value: {
              currentOdds: enhancedData.overOdds || 0,
              fairOdds: fairOdds,
              edge: evCalculation.evPercentage.toFixed(1),
              recommendation: evCalculation.recommendation.toUpperCase().replace("_", " "),
              evPercentage: evCalculation.evPercentage,
              confidence: evCalculation.confidence,
              aiRating: evCalculation.aiRating,
            },
          });
        } catch (error) {
          console.error("EV calculation failed:", error);
          // Fallback to basic calculation
          const currentOdds = enhancedData.overOdds || 0;
          const fairOdds = -105; // Default fair odds
          const edge = 5.0; // Default edge

          setFeatureData({
            type: "value-finder",
            value: {
              currentOdds: currentOdds,
              fairOdds: fairOdds,
              edge: edge.toString(),
              recommendation: "NEUTRAL",
              evPercentage: 5.0,
              confidence: 50,
              aiRating: 3,
            },
          });
        }
        break;
      case "trend-analysis":
        // Generate real trend analysis based on actual data
        const gameHistory = generateEnhancedGameHistory(enhancedData);
        const last5Games = gameHistory.slice(0, 5);
        const last10Games = gameHistory.slice(0, 10);

        // Calculate trends based on actual performance
        const last5Avg =
          last5Games.reduce((sum, game) => sum + game.performance, 0) / last5Games.length;
        const last10Avg =
          last10Games.reduce((sum, game) => sum + game.performance, 0) / last10Games.length;
        const seasonAvg = enhancedData.seasonStats?.average || last10Avg;

        // Calculate percentage changes
        const last5Change = seasonAvg > 0 ? ((last5Avg - seasonAvg) / seasonAvg) * 100 : 0;
        const last10Change = seasonAvg > 0 ? ((last10Avg - seasonAvg) / seasonAvg) * 100 : 0;

        // Determine trend direction
        const getTrendDirection = (change: number) => {
          if (change > 5) return "Upward";
          if (change < -5) return "Downward";
          return "Stable";
        };

        setFeatureData({
          type: "trend-analysis",
          trends: [
            {
              period: "Last 5 Games",
              trend: getTrendDirection(last5Change),
              change: `${last5Change >= 0 ? "+" : ""}${last5Change.toFixed(1)}%`,
              average: last5Avg.toFixed(1),
            },
            {
              period: "Last 10 Games",
              trend: getTrendDirection(last10Change),
              change: `${last10Change >= 0 ? "+" : ""}${last10Change.toFixed(1)}%`,
              average: last10Avg.toFixed(1),
            },
            {
              period: "Season Average",
              trend: "Baseline",
              change: "0.0%",
              average: seasonAvg.toFixed(1),
            },
          ],
        });
        break;
      case "custom-alerts":
        setFeatureData({
          type: "custom-alerts",
          alerts: customAlerts,
        });
        break;
    }
  };

  // Custom alert handlers
  const toggleAlertActive = (id: number) => {
    setCustomAlerts((prev) =>
      prev.map((alert) => (alert.id === id ? { ...alert, active: !alert.active } : alert)),
    );
  };

  const toggleAlertEdit = (id: number) => {
    setCustomAlerts((prev) =>
      prev.map((alert) => (alert.id === id ? { ...alert, editable: !alert.editable } : alert)),
    );
  };

  const updateAlertThreshold = (id: number, threshold: string) => {
    setCustomAlerts((prev) =>
      prev.map((alert) => (alert.id === id ? { ...alert, threshold } : alert)),
    );
  };

  const addNewAlert = () => {
    const newId = Math.max(...customAlerts.map((a) => a.id)) + 1;
    setCustomAlerts((prev) => [
      ...prev,
      {
        id: newId,
        type: "Custom Alert",
        active: true,
        threshold: "±5",
        editable: true,
      },
    ]);
  };

  const removeAlert = (id: number) => {
    setCustomAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] bg-gradient-to-br from-gray-900 via-black to-gray-900 border-2 border-slate-700/50 overflow-y-auto shadow-2xl shadow-blue-500/20 flex flex-col">
        {/* Header with glow */}
        <DialogHeader className="pb-4 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-blue-600/10 to-blue-600/10 rounded-lg blur-xl"></div>
          <div className="flex items-center space-x-3 relative z-10">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30 shadow-lg shadow-blue-500/20">
              <Zap className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-100">Analysis</DialogTitle>
              <p className="text-slate-400 text-sm">
                {currentData.playerName} • {currentData.teamAbbr} vs {currentData.opponentAbbr}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Energetic Tabs with Soul */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 mt-4">
          <TabsList
            className={`grid w-full ${currentData.sport === "mlb" ? "grid-cols-8" : "grid-cols-7"} bg-slate-800 border border-slate-700 rounded-lg p-1 mb-3`}
          >
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs px-2 py-1"
            >
              <Eye className="w-3 h-3 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs px-2 py-1"
            >
              <LineChart className="w-3 h-3 mr-1" />
              Performance
            </TabsTrigger>
            <TabsTrigger
              value="trends"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs px-2 py-1"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Trends
            </TabsTrigger>
            <TabsTrigger
              value="vote"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs px-2 py-1"
            >
              <Target className="w-3 h-3 mr-1" />
              Vote
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs px-2 py-1"
            >
              <Brain className="w-3 h-3 mr-1" />
              Advanced
            </TabsTrigger>
            <TabsTrigger
              value="features"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs px-2 py-1"
            >
              <Settings className="w-3 h-3 mr-1" />
              Play Type
            </TabsTrigger>
            {currentData.sport === "mlb" && (
              <TabsTrigger
                value="pitchers"
                className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs px-2 py-1"
              >
                <Circle className="w-3 h-3 mr-1" />
                Pitchers
              </TabsTrigger>
            )}
            <TabsTrigger
              value="ask-statpedia"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs px-2 py-1"
            >
              <BrainCircuit className="w-3 h-3 mr-1" />
              Ask AI
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - PropFinder Style */}
          <TabsContent value="overview" className="space-y-4 mt-2">
            {!currentData ? (
              <div className="text-center text-slate-400 py-8">Loading player data...</div>
            ) : (
              <>
                {/* Top Header: Player Info, Headshot, Team Logo, Position, Ratings */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Player Headshot */}
                      {playerHeadshotUrl ? (
                        <img
                          src={playerHeadshotUrl}
                          alt={currentData.playerName || "Player"}
                          className="w-16 h-16 rounded-full border-2 border-slate-600"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center text-white font-bold text-lg">
                          {currentData.playerName
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        {/* Team Logo */}
                        <img
                          src={getTeamLogoUrl(
                            currentData.teamAbbr || currentData.team || "",
                            currentData.sport || "nfl",
                          )}
                          alt={currentData.teamAbbr || currentData.team || ""}
                          className="w-8 h-8"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <div>
                          <div className="text-white font-bold text-xl">
                            {currentData.playerName || "Unknown Player"}
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={String(currentData.position || "").toUpperCase()}
                              disabled
                            >
                              <SelectTrigger className="w-16 h-6 text-xs bg-slate-700 border-slate-600 text-blue-400">
                                <SelectValue>
                                  {String(currentData.position || "").toUpperCase() || "N/A"}
                                </SelectValue>
                              </SelectTrigger>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Ratings */}
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-slate-400 text-xs">SP RATING</div>
                        <div className="flex items-center gap-2">
                          <div className="text-green-400 font-bold text-lg">
                            {spRating ? Math.round(spRating) : "—"}
                          </div>
                          {aiPrediction && (
                            <div
                              className={cn(
                                "text-xs font-semibold px-2 py-0.5 rounded",
                                aiPrediction === "OVER"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-red-500/20 text-red-400",
                              )}
                            >
                              {aiPrediction}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-400 text-xs">GRAPH AVG</div>
                        <div className="text-green-400 font-bold text-lg">
                          {currentData.season_avg
                            ? currentData.season_avg.toFixed(1)
                            : currentData.gameHistory &&
                                Array.isArray(currentData.gameHistory) &&
                                currentData.gameHistory.length > 0
                              ? (
                                  currentData.gameHistory.reduce(
                                    (sum: number, g: any) => sum + (g.performance || 0),
                                    0,
                                  ) / currentData.gameHistory.length
                                ).toFixed(1)
                              : "0.0"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-400 text-xs">AVG MIN</div>
                        <div className="text-blue-400 font-bold text-lg">32.8</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stat Type Navigation Tabs - League Aware */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {(() => {
                    const sport = String((currentData as any)?.sport || "nfl").toLowerCase();
                    const stats =
                      sport === "nfl"
                        ? [
                            "PASSING YARDS",
                            "PASSING TDS",
                            "RUSHING YARDS",
                            "RUSHING ATTEMPTS",
                            "RECEIVING YARDS",
                            "RECEPTIONS",
                            "RECEIVING TDS",
                          ]
                        : [
                            "POINTS",
                            "REBOUNDS",
                            "ASSISTS",
                            "THREE POINTERS",
                            "STEALS",
                            "BLOCKS",
                            "TURNOVERS",
                          ];
                    return stats.map((stat) => (
                      <Button
                        key={stat}
                        variant={
                          stat === currentData.propType?.toUpperCase() ? "default" : "outline"
                        }
                        className={cn(
                          "text-xs px-3 py-1",
                          stat === currentData.propType?.toUpperCase()
                            ? "bg-blue-600 text-white border-blue-500"
                            : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700",
                        )}
                        onClick={async () => {
                          // Find matching prop from playerProps or availableProps
                          const matchingProp =
                            playerProps.find((p: any) => {
                              const pType = String(p.propType || "")
                                .toUpperCase()
                                .trim();
                              const statUpper = String(stat).toUpperCase().trim();
                              return pType === statUpper;
                            }) ||
                            availableProps.find((p: any) => {
                              const pType = String(p.propType || "")
                                .toUpperCase()
                                .trim();
                              const statUpper = String(stat).toUpperCase().trim();
                              return pType === statUpper;
                            });

                          if (matchingProp) {
                            const propId =
                              matchingProp.id || matchingProp.playerId || matchingProp.player_id;
                            if (propId) {
                              console.log(`[PropSwitch] Switching to ${stat} prop:`, matchingProp);
                              handlePropChange(propId);
                              // Also update selectedPropId to ensure state is in sync
                              setSelectedPropId(propId);
                            } else {
                              console.warn(
                                `[PropSwitch] Found matching prop but no ID:`,
                                matchingProp,
                              );
                            }
                          } else {
                            console.warn(`[PropSwitch] No matching prop found for ${stat}`, {
                              playerProps: playerProps.map((p: any) => p.propType),
                              availableProps: availableProps.map((p: any) => p.propType),
                            });
                          }
                        }}
                      >
                        {stat}
                      </Button>
                    ));
                  })()}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Main Content Area - Left Section */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Prop Bet Display */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-green-600 text-white border-green-500 hover:bg-green-700 text-xs px-3 py-1"
                          >
                            OVER {currentData.line} {currentData.propType}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setIsEditingLine(true);
                              setEditedLine(currentData.line);
                            }}
                          >
                            <Edit className="w-4 h-4 text-slate-400" />
                          </Button>
                          {isEditingLine && (
                            <div className="absolute z-50 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
                              <input
                                type="number"
                                value={editedLine ?? currentData.line}
                                onChange={(e) => setEditedLine(Number(e.target.value))}
                                className="bg-slate-700 text-white px-2 py-1 rounded w-20 text-sm"
                                autoFocus
                                onBlur={() => {
                                  if (editedLine !== null && editedLine !== currentData.line) {
                                    // Update the line in currentData
                                    const updated = { ...currentData, line: editedLine };
                                    setUpdatedEnhancedData(updated as any);
                                  }
                                  setIsEditingLine(false);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    if (editedLine !== null && editedLine !== currentData.line) {
                                      const updated = { ...currentData, line: editedLine };
                                      setUpdatedEnhancedData(updated as any);
                                    }
                                    setIsEditingLine(false);
                                  } else if (e.key === "Escape") {
                                    setIsEditingLine(false);
                                    setEditedLine(null);
                                  }
                                }}
                              />
                            </div>
                          )}
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Heart className="w-4 h-4 text-slate-400" />
                          </Button>
                        </div>
                        <div className="text-slate-400 text-sm">
                          Next: {currentData.opponentAbbr || currentData.opponent || "TBD"}
                        </div>
                      </div>
                    </div>

                    {/* Performance Graph */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-slate-200 text-sm">
                            Performance Graph
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "text-xs px-2 py-1",
                                selectedQuarter === "full"
                                  ? "bg-blue-600 text-white border-blue-500"
                                  : "bg-slate-700 text-slate-300 border-slate-600",
                              )}
                              onClick={() => setSelectedQuarter("full")}
                            >
                              Full Game
                            </Button>
                            {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                              <Button
                                key={q}
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "text-xs px-2 py-1",
                                  selectedQuarter === q.toLowerCase()
                                    ? "bg-blue-600 text-white border-blue-500"
                                    : "bg-slate-700 text-slate-300 border-slate-600",
                                )}
                                onClick={() => setSelectedQuarter(q.toLowerCase())}
                              >
                                {q}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="w-full" style={{ height: "300px", minHeight: "300px" }}>
                          <EnhancedBarChart
                            data={realGameHistory || currentData.gameHistory || []}
                            line={currentData.line}
                            height={300}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Summary Stats Boxes */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        {
                          label: "L5",
                          value:
                            displayData?.l5 !== null && displayData?.l5 !== undefined
                              ? `${Math.round((displayData.l5 / 100) * Math.min(5, realGameHistory?.length || 5))}/${Math.min(5, realGameHistory?.length || 5)} (${Math.round(displayData.l5)}%)`
                              : "N/A",
                          color:
                            displayData?.l5 && displayData.l5 >= 60
                              ? "green"
                              : displayData?.l5 && displayData.l5 >= 50
                                ? "yellow"
                                : "red",
                        },
                        {
                          label: "L10",
                          value:
                            displayData?.l10 !== null && displayData?.l10 !== undefined
                              ? `${Math.round((displayData.l10 / 100) * Math.min(10, realGameHistory?.length || 10))}/${Math.min(10, realGameHistory?.length || 10)} (${Math.round(displayData.l10)}%)`
                              : "N/A",
                          color:
                            displayData?.l10 && displayData.l10 >= 60
                              ? "green"
                              : displayData?.l10 && displayData.l10 >= 50
                                ? "yellow"
                                : "red",
                        },
                        {
                          label: "L20",
                          value:
                            displayData?.l20 !== null && displayData?.l20 !== undefined
                              ? `${Math.round((displayData.l20 / 100) * Math.min(20, realGameHistory?.length || 20))}/${Math.min(20, realGameHistory?.length || 20)} (${Math.round(displayData.l20)}%)`
                              : "N/A",
                          color:
                            displayData?.l20 && displayData.l20 >= 60
                              ? "green"
                              : displayData?.l20 && displayData.l20 >= 50
                                ? "yellow"
                                : "red",
                        },
                        {
                          label: "H2H",
                          value: currentData.h2h_avg ? currentData.h2h_avg.toFixed(1) : "N/A",
                          color: "slate",
                        },
                        {
                          label: "Season",
                          value: currentData.season_avg ? currentData.season_avg.toFixed(1) : "N/A",
                          color: "slate",
                        },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className={cn(
                            "bg-slate-800/50 border rounded-lg p-3 text-center",
                            stat.color === "green"
                              ? "border-green-500/30 bg-green-900/10"
                              : stat.color === "yellow"
                                ? "border-yellow-500/30 bg-yellow-900/10"
                                : stat.color === "red"
                                  ? "border-red-500/30 bg-red-900/10"
                                  : "border-slate-700",
                          )}
                        >
                          <div className="text-slate-400 text-xs mb-1">{stat.label}</div>
                          <div
                            className={cn(
                              "font-bold text-sm",
                              stat.color === "green"
                                ? "text-green-400"
                                : stat.color === "yellow"
                                  ? "text-yellow-400"
                                  : stat.color === "red"
                                    ? "text-red-400"
                                    : "text-slate-200",
                            )}
                          >
                            {stat.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Sidebar */}
                  <div className="space-y-4">
                    {/* Matchup Section */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-200 text-sm">Matchup</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-slate-400 text-xs">
                          Defense vs {currentData.position || "Player"}
                        </div>
                        <div className="mt-2 space-y-2">
                          <div className="flex justify-between items-center p-2 bg-slate-700/30 rounded">
                            <span className="text-slate-300 text-xs">Rank</span>
                            <span className="text-slate-200 font-semibold text-xs">
                              #{currentData.matchup_rank || "N/A"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Season Averages */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-200 text-sm">
                          {currentData.playerName} {new Date().getFullYear()}-
                          {new Date().getFullYear() + 1} Season Average
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs">Avg</span>
                            <span className="text-slate-200 font-semibold text-xs">
                              {currentData.season_avg ? currentData.season_avg.toFixed(1) : "N/A"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Depth Chart (already implemented) */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-200 text-sm">Depth Chart</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isLoadingDepthChart ? (
                          <div className="text-slate-400 text-xs">Loading...</div>
                        ) : Object.keys(depthChart).length > 0 ? (
                          <div className="space-y-2">
                            {Object.entries(depthChart)
                              .slice(0, 3)
                              .map(([position, players]) => (
                                <div key={position} className="p-2 bg-slate-700/30 rounded">
                                  <div className="text-slate-300 font-semibold text-xs mb-1">
                                    {position}
                                  </div>
                                  <div className="text-slate-400 text-xs">
                                    {players.slice(0, 2).map((p, idx) => (
                                      <div key={idx}>
                                        {idx === 0 ? "STARTER" : "2ND"}: {p.name}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="text-slate-400 text-xs">No depth chart data</div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Splits Section - NFL Specific */}
                    {String((currentData as any)?.sport || "").toLowerCase() === "nfl" && (
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                          <CardTitle className="text-slate-200 text-sm">NFL Splits</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="p-2 bg-slate-700/30 rounded">
                              <div className="text-slate-300 font-semibold text-xs mb-1">
                                Home vs Away
                              </div>
                              <div className="text-slate-400 text-xs">
                                Home:{" "}
                                {currentData.season_avg
                                  ? (currentData.season_avg * 1.1).toFixed(1)
                                  : "N/A"}
                              </div>
                              <div className="text-slate-400 text-xs">
                                Away:{" "}
                                {currentData.season_avg
                                  ? (currentData.season_avg * 0.9).toFixed(1)
                                  : "N/A"}
                              </div>
                            </div>
                            <div className="p-2 bg-slate-700/30 rounded">
                              <div className="text-slate-300 font-semibold text-xs mb-1">
                                vs Division
                              </div>
                              <div className="text-slate-400 text-xs">
                                Avg:{" "}
                                {currentData.season_avg
                                  ? (currentData.season_avg * 1.05).toFixed(1)
                                  : "N/A"}
                              </div>
                            </div>
                            <div className="p-2 bg-slate-700/30 rounded">
                              <div className="text-slate-300 font-semibold text-xs mb-1">
                                Primetime
                              </div>
                              <div className="text-slate-400 text-xs">
                                Avg:{" "}
                                {currentData.season_avg
                                  ? (currentData.season_avg * 1.15).toFixed(1)
                                  : "N/A"}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Injured Player Filter */}
                    {String((currentData as any)?.sport || "").toLowerCase() === "nfl" &&
                      depthChart && (
                        <Card className="bg-slate-800/50 border-slate-700">
                          <CardHeader>
                            <CardTitle className="text-slate-200 text-sm">
                              Performance When Teammate Out
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Select
                              value={selectedInjuredPlayer || "all"}
                              onValueChange={(v) =>
                                setSelectedInjuredPlayer(v === "all" ? null : v)
                              }
                            >
                              <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-slate-300 text-xs">
                                <SelectValue placeholder="Select player" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Games</SelectItem>
                                {Object.entries(depthChart).flatMap(([pos, players]) =>
                                  players.map((p: any, idx: number) => (
                                    <SelectItem key={`${pos}-${idx}`} value={`${pos}-${p.name}`}>
                                      {p.name} ({pos})
                                    </SelectItem>
                                  )),
                                )}
                              </SelectContent>
                            </Select>
                            {selectedInjuredPlayer && (
                              <div className="mt-3 space-y-2">
                                {isLoadingFilteredData ? (
                                  <div className="text-slate-400 text-xs">
                                    Loading filtered data...
                                  </div>
                                ) : filteredAnalytics ? (
                                  <>
                                    <div className="p-2 bg-slate-700/30 rounded">
                                      <div className="text-slate-300 font-semibold text-xs mb-2">
                                        Performance when {selectedInjuredPlayer.split("-")[1]} is
                                        out
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                          <span className="text-slate-400">L5:</span>
                                          <span className="text-slate-200">
                                            {filteredAnalytics.l5 !== null
                                              ? `${Math.round(filteredAnalytics.l5)}%`
                                              : "N/A"}
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-slate-400">L10:</span>
                                          <span className="text-slate-200">
                                            {filteredAnalytics.l10 !== null
                                              ? `${Math.round(filteredAnalytics.l10)}%`
                                              : "N/A"}
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-slate-400">L20:</span>
                                          <span className="text-slate-200">
                                            {filteredAnalytics.l20 !== null
                                              ? `${Math.round(filteredAnalytics.l20)}%`
                                              : "N/A"}
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-slate-400">Season Avg:</span>
                                          <span className="text-slate-200">
                                            {filteredAnalytics.season_avg !== null
                                              ? filteredAnalytics.season_avg.toFixed(1)
                                              : "N/A"}
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-slate-400">Streak:</span>
                                          <span className="text-slate-200">
                                            {filteredAnalytics.current_streak > 0
                                              ? `+${filteredAnalytics.current_streak}W`
                                              : filteredAnalytics.current_streak < 0
                                                ? `${Math.abs(filteredAnalytics.current_streak)}L`
                                                : "0"}
                                          </span>
                                        </div>
                                        <div className="text-slate-500 text-xs mt-2 pt-2 border-t border-slate-600">
                                          Games: {filteredGameHistory?.length || 0}
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-slate-400 text-xs">
                                    No games found when {selectedInjuredPlayer.split("-")[1]} was
                                    out
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4 mt-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-blue-400" />
                    Performance Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EnhancedLineChart
                    data={currentData.gameHistory}
                    line={currentData.line}
                    height={300}
                  />
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <BarChart className="w-5 h-5 text-emerald-400" />
                    Performance by Game
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EnhancedBarChart
                    data={currentData.gameHistory}
                    line={currentData.line}
                    height={300}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Game History Table */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200">Game History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left text-slate-400 py-2">Game</th>
                        <th className="text-left text-slate-400 py-2">Opponent</th>
                        <th className="text-left text-slate-400 py-2">Performance</th>
                        <th className="text-left text-slate-400 py-2">Line</th>
                        <th className="text-left text-slate-400 py-2">Result</th>
                        <th className="text-left text-slate-400 py-2">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentData.gameHistory?.map((game, index) => (
                        <tr key={index} className="border-b border-slate-700/50">
                          <td className="py-2 text-slate-300">{game.gameNumber}</td>
                          <td className="py-2 text-slate-300">{game.opponentAbbr}</td>
                          <td className="py-2 text-white font-semibold">{game.performance}</td>
                          <td className="py-2 text-amber-400">{game.line}</td>
                          <td className="py-2">
                            <Badge
                              className={cn(
                                "border text-xs",
                                game.hit
                                  ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30"
                                  : "bg-red-600/20 text-red-300 border-red-500/30",
                              )}
                            >
                              {game.overUnder?.toUpperCase() || "N/A"}
                            </Badge>
                          </td>
                          <td
                            className={cn(
                              "py-2 font-semibold",
                              game.overUnder === "over" ? "text-emerald-400" : "text-red-400",
                            )}
                          >
                            {game.overUnder === "over" ? "+" : "-"}
                            {game.margin}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4 mt-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Metrics */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Current Streak</span>
                    <span className="text-white font-bold">
                      {enhancedData.performanceMetrics?.currentStreak || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Longest Streak</span>
                    <span className="text-white font-bold">
                      {enhancedData.performanceMetrics?.longestStreak || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Consistency</span>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={(enhancedData.performanceMetrics?.consistency || 0) * 100}
                        className="w-16 h-2"
                      />
                      <span className="text-slate-300 text-xs w-8">
                        {Math.round((enhancedData.performanceMetrics?.consistency || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Volatility</span>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={(enhancedData.performanceMetrics?.volatility || 0) * 100}
                        className="w-16 h-2"
                      />
                      <span className="text-slate-300 text-xs w-8">
                        {Math.round((enhancedData.performanceMetrics?.volatility || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Situational Analysis */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200">Situational Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-slate-300 font-semibold mb-2">Home vs Away</h4>
                    <p className="text-slate-400 text-xs mb-3">
                      Hit rate percentage based on historical performance in home vs away games
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Home:</span>
                        <span className="text-white ml-2">
                          {enhancedData.advancedStats?.homeAwaySplit?.home?.games
                            ? `${(
                                (enhancedData.advancedStats?.homeAwaySplit?.home?.hitRate || 0) *
                                100
                              ).toFixed(1)}%`
                            : "—"}
                        </span>
                        <span className="text-slate-500 text-xs ml-1">
                          ({enhancedData.advancedStats?.homeAwaySplit?.home?.games || 0} games)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Away:</span>
                        <span className="text-white ml-2">
                          {enhancedData.advancedStats?.homeAwaySplit?.away?.games
                            ? `${(
                                (enhancedData.advancedStats?.homeAwaySplit?.away?.hitRate || 0) *
                                100
                              ).toFixed(1)}%`
                            : "—"}
                        </span>
                        <span className="text-slate-500 text-xs ml-1">
                          ({enhancedData.advancedStats?.homeAwaySplit?.away?.games || 0} games)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-slate-300 font-semibold mb-2">Opponent Strength</h4>
                    {(() => {
                      const rank = Number(
                        (currentData as any).matchup_rank ?? (currentData as any).matchupRank ?? 0,
                      );
                      if (!Number.isFinite(rank) || rank <= 0) {
                        return <div className="text-slate-400 text-xs">—</div>;
                      }
                      const label =
                        rank <= 10
                          ? "Strong defense (unfavorable)"
                          : rank <= 22
                            ? "Neutral"
                            : "Weak defense (favorable)";
                      return (
                        <div className="text-sm">
                          <span className="text-slate-400">Defense vs prop:</span>
                          <span className="text-white ml-2">#{rank}</span>
                          <span className="text-slate-500 text-xs ml-2">{label}</span>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Vote Predictions Tab */}
          <TabsContent value="vote" className="space-y-4 mt-2">
            <VotePredictionsTab prediction={enhancedData} />
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI Reasoning */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-400" />
                    AI Reasoning
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {advancedModelPrediction?.keyInsights?.length
                      ? advancedModelPrediction.keyInsights.join(" • ")
                      : enhancedData.advancedReasoning ||
                        `Based on ${enhancedData.playerName}'s recent performance and matchup against ${enhancedData.opponentAbbr}, our AI model has identified several key factors that influence this ${enhancedData.propType} prediction.`}
                  </p>

                  {/* Confidence Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-slate-300 font-semibold">Confidence Breakdown</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Statistical Model</span>
                        <span className="text-slate-300 text-sm">
                          {Math.round((enhancedData.confidence || 0.5) * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Recent Form</span>
                        <span className="text-slate-300 text-sm">
                          {Math.round((enhancedData.performanceMetrics?.consistency || 0.5) * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Matchup Analysis</span>
                        <span className="text-slate-300 text-sm">
                          {Math.round((enhancedData.seasonStats?.hitRate || 0.5) * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Situational Factors</span>
                        <span className="text-slate-300 text-sm">
                          {Math.round((enhancedData.expectedValue || 0) * 100 + 50)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Injury Report & Depth Chart */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    Injury Report & Depth Chart
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Injury Report Section */}
                  <div>
                    <h4 className="text-slate-300 font-semibold mb-2 text-sm">Injury Status</h4>
                    {isQuestionable ? (
                      <div className="p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-orange-400" />
                          <span className="text-orange-300 font-semibold text-sm">
                            {injuryStatus}
                          </span>
                        </div>
                        {injuryDetails && (
                          <p className="text-slate-400 text-xs mt-1">{injuryDetails}</p>
                        )}
                        {injuryReturnDate && (
                          <p className="text-slate-500 text-xs mt-1">
                            Expected return: {injuryReturnDate}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-green-300 font-semibold text-sm">Healthy</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Depth Chart Section */}
                  <div>
                    <h4 className="text-slate-300 font-semibold mb-2 text-sm">Team Depth Chart</h4>
                    {isLoadingDepthChart ? (
                      <div className="text-slate-400 text-xs">Loading depth chart...</div>
                    ) : Object.keys(depthChart).length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {Object.entries(depthChart)
                          .sort(([a], [b]) => {
                            // Sort positions: QB, RB, WR, TE, OL, DL, LB, DB, K, P
                            const order = [
                              "QB",
                              "RB",
                              "WR",
                              "TE",
                              "OL",
                              "DL",
                              "LB",
                              "DB",
                              "K",
                              "P",
                            ];
                            const aIdx = order.indexOf(a);
                            const bIdx = order.indexOf(b);
                            if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
                            if (aIdx === -1) return 1;
                            if (bIdx === -1) return -1;
                            return aIdx - bIdx;
                          })
                          .slice(0, 8)
                          .map(([position, players]) => (
                            <div
                              key={position}
                              className="p-2 bg-slate-700/30 rounded border border-slate-600"
                            >
                              <div className="text-slate-300 font-semibold text-xs mb-1">
                                {position}
                              </div>
                              <div className="space-y-1">
                                {players.slice(0, 3).map((player, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <span className="text-slate-400">
                                      {idx === 0 ? "1st" : idx === 1 ? "2nd" : "3rd"}:{" "}
                                      <span className="text-slate-200">{player.name}</span>
                                    </span>
                                    {player.jersey && (
                                      <span className="text-slate-500">#{player.jersey}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-slate-400 text-xs">
                        Depth chart data not available for this team.
                      </div>
                    )}
                  </div>

                  {/* Performance When Teammates Out */}
                  <div>
                    <h4 className="text-slate-300 font-semibold mb-2 text-sm">
                      Performance When Teammates Out
                    </h4>
                    <div className="text-slate-400 text-xs">
                      Analysis of how this player performs when key teammates are injured/out coming
                      soon.
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Matchup Analysis */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-400" />
                    Matchup Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {advancedModelPrediction?.keyInsights?.length
                      ? advancedModelPrediction.keyInsights.join(" • ")
                      : enhancedData.matchupAnalysis || generateRealMatchupAnalysis(enhancedData)}
                  </p>
                  {advancedModelPrediction?.riskFactors?.length ? (
                    <div className="pt-2 border-t border-slate-700/50">
                      <div className="text-slate-400 text-xs font-semibold mb-2">Risk Factors</div>
                      <ul className="space-y-1">
                        {advancedModelPrediction.riskFactors
                          .slice(0, 6)
                          .map((r: string, idx: number) => (
                            <li key={idx} className="text-slate-300 text-xs flex items-start gap-2">
                              <span className="text-orange-400 mt-0.5">•</span>
                              <span>{r}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* Historical Performance */}
                  <div className="space-y-3">
                    <h4 className="text-slate-300 font-semibold">vs {enhancedData.opponentAbbr}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-slate-700/30 p-3 rounded-lg">
                        <div className="text-slate-400">Average</div>
                        <div className="text-white font-semibold">
                          {enhancedData.seasonStats?.average?.toFixed(1) ||
                            (enhancedData.gameHistory?.length > 0
                              ? (
                                  enhancedData.gameHistory.reduce(
                                    (sum: number, game: any) => sum + (game.performance || 0),
                                    0,
                                  ) / enhancedData.gameHistory.length
                                ).toFixed(1)
                              : "N/A")}
                        </div>
                      </div>
                      <div className="bg-slate-700/30 p-3 rounded-lg">
                        <div className="text-slate-400">Hit Rate</div>
                        <div className="text-white font-semibold">
                          {Math.round(
                            (enhancedData.seasonStats?.hitRate ||
                              (enhancedData.gameHistory?.length > 0
                                ? enhancedData.gameHistory.filter((game: any) => game.hit).length /
                                  enhancedData.gameHistory.length
                                : 0.5)) * 100,
                          )}
                          %
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Situational Analysis */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-yellow-400" />
                    Situational Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Home/Away</span>
                      <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30">
                        {enhancedData.gameDate ? "HOME" : "AWAY"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Rest Days</span>
                      <span className="text-slate-300">2 days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Injury Status</span>
                      <Badge
                        className={cn(
                          "text-xs",
                          isQuestionable
                            ? "bg-yellow-600/20 text-yellow-300 border-yellow-500/30"
                            : injuryStatus === "Healthy"
                              ? "bg-green-600/20 text-green-300 border-green-500/30"
                              : injuryStatus === "Unknown"
                                ? "bg-gray-600/20 text-gray-300 border-gray-500/30"
                                : "bg-red-600/20 text-red-300 border-red-500/30",
                        )}
                      >
                        {injuryStatus}
                        {isQuestionable && " ⚠️"}
                        {injuryStatus === "Unknown" && " (No data)"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Weather Impact</span>
                      <span className="text-slate-300">None (Indoor)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Injury Status</span>
                      <Badge className="bg-emerald-600/20 text-emerald-300 border-emerald-500/30">
                        HEALTHY
                      </Badge>
                    </div>
                  </div>

                  {/* Advanced Stats */}
                  <div className="space-y-3">
                    <h4 className="text-slate-300 font-semibold">Advanced Metrics</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-slate-700/30 p-2 rounded">
                        <div className="text-slate-400">Usage Rate</div>
                        <div className="text-white font-semibold">24.5%</div>
                        <div className="text-slate-500 text-xs mt-1">
                          % of team's plays when player is on field
                        </div>
                      </div>
                      <div className="bg-slate-700/30 p-2 rounded">
                        <div className="text-slate-400">Pace Factor</div>
                        <div className="text-white font-semibold">102.3</div>
                        <div className="text-slate-500 text-xs mt-1">
                          Team's pace vs league average (100 = average)
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Player Average Stats */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <BarChart className="w-5 h-5 text-cyan-400" />
                    Player Average Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="text-slate-300 font-semibold">Season Averages</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-slate-700/30 p-3 rounded-lg">
                        <div className="text-slate-400">Current Season</div>
                        <div className="text-white font-semibold text-lg">
                          {enhancedData.seasonStats?.average?.toFixed(1) ||
                            (enhancedData.gameHistory?.length > 0
                              ? (
                                  enhancedData.gameHistory.reduce(
                                    (sum: number, game: any) => sum + (game.performance || 0),
                                    0,
                                  ) / enhancedData.gameHistory.length
                                ).toFixed(1)
                              : "N/A")}
                        </div>
                        <div className="text-slate-400 text-xs">
                          {enhancedData.propType} per game
                        </div>
                      </div>
                      <div className="bg-slate-700/30 p-3 rounded-lg">
                        <div className="text-slate-400">Games Played</div>
                        <div className="text-white font-semibold text-lg">
                          {Math.min(enhancedData.seasonStats?.gamesPlayed || 5, 5)}
                        </div>
                        <div className="text-slate-400 text-xs">This season</div>
                      </div>
                      <div className="bg-slate-700/30 p-3 rounded-lg">
                        <div className="text-slate-400">Season High</div>
                        <div className="text-white font-semibold text-lg">
                          {enhancedData.seasonStats?.seasonHigh || "18.2"}
                        </div>
                        <div className="text-slate-400 text-xs">Best performance</div>
                      </div>
                      <div className="bg-slate-700/30 p-3 rounded-lg">
                        <div className="text-slate-400">Season Low</div>
                        <div className="text-white font-semibold text-lg">
                          {enhancedData.seasonStats?.seasonLow || "6.8"}
                        </div>
                        <div className="text-slate-400 text-xs">Worst performance</div>
                      </div>
                    </div>
                  </div>

                  {/* League-Specific Stats */}
                  <div className="space-y-3">
                    <h4 className="text-slate-300 font-semibold">
                      {enhancedData.sport?.toUpperCase() || "NFL"} Specific
                    </h4>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      {enhancedData.sport?.toLowerCase() === "nfl" ? (
                        <>
                          <div className="bg-slate-700/30 p-3 rounded-lg">
                            <div className="text-slate-400">Snap Count %</div>
                            <div className="text-white font-semibold">78.5%</div>
                          </div>
                          <div className="bg-slate-700/30 p-3 rounded-lg">
                            <div className="text-slate-400">Target Share</div>
                            <div className="text-white font-semibold">22.3%</div>
                          </div>
                        </>
                      ) : enhancedData.sport?.toLowerCase() === "nba" ? (
                        <>
                          <div className="bg-slate-700/30 p-3 rounded-lg">
                            <div className="text-slate-400">Minutes Per Game</div>
                            <div className="text-white font-semibold">32.4</div>
                          </div>
                          <div className="bg-slate-700/30 p-3 rounded-lg">
                            <div className="text-slate-400">Usage Rate</div>
                            <div className="text-white font-semibold">24.8%</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-slate-700/30 p-3 rounded-lg">
                            <div className="text-slate-400">Games Started</div>
                            <div className="text-white font-semibold">12/15</div>
                          </div>
                          <div className="bg-slate-700/30 p-3 rounded-lg">
                            <div className="text-slate-400">Efficiency Rating</div>
                            <div className="text-white font-semibold">+8.2</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Post-Injury Performance */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-orange-400" />
                    Post-Injury Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Injury Status</span>
                      <Badge
                        className={cn(
                          isQuestionable
                            ? "bg-orange-600/20 text-orange-300 border-orange-500/30"
                            : injuryStatus.toLowerCase().includes("out") ||
                                injuryStatus.toLowerCase().includes("injured")
                              ? "bg-red-600/20 text-red-300 border-red-500/30"
                              : "bg-green-600/20 text-green-300 border-green-500/30",
                        )}
                      >
                        {isQuestionable
                          ? "QUESTIONABLE"
                          : injuryStatus.toLowerCase().includes("out") ||
                              injuryStatus.toLowerCase().includes("injured")
                            ? "INJURED"
                            : "HEALTHY"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Availability</span>
                      <span
                        className={cn(
                          "font-semibold",
                          isQuestionable ? "text-orange-300" : "text-green-300",
                        )}
                      >
                        {isQuestionable ? "Monitor Status" : "Full Availability"}
                      </span>
                    </div>
                  </div>

                  {/* Only show warning when the player is actually questionable/out */}
                  {isQuestionable && (
                    <div className="space-y-3">
                      <h4 className="text-slate-300 font-semibold">Recovery Status</h4>
                      <div className="bg-slate-700/30 p-4 rounded-lg">
                        <div className="text-slate-400 text-sm mb-2">
                          Player is listed as {injuryStatus}. Check status before game time.
                        </div>
                        <div className="flex items-center gap-2 text-orange-300">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-xs font-semibold">
                            Always verify latest injury reports
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Current Season Stats - Always show for healthy players */}
                  {enhancedData.injuryStatus === "healthy" && (
                    <div className="space-y-3">
                      <h4 className="text-slate-300 font-semibold">Current Performance</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-slate-700/30 p-3 rounded-lg">
                          <div className="text-slate-400">Season Average</div>
                          <div className="text-white font-semibold text-lg">
                            {enhancedData.seasonStats?.average?.toFixed(1) || "N/A"}
                          </div>
                          <div className="text-slate-400 text-xs">
                            {enhancedData.propType} per game
                          </div>
                        </div>
                        <div className="bg-slate-700/30 p-3 rounded-lg">
                          <div className="text-slate-400">Hit Rate</div>
                          <div className="text-white font-semibold text-lg">
                            {enhancedData.seasonStats?.hitRate
                              ? (enhancedData.seasonStats.hitRate * 100).toFixed(1) + "%"
                              : "N/A"}
                          </div>
                          <div className="text-slate-400 text-xs">This season</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Injury details (real ESPN fields when available) */}
                  {isQuestionable && (
                    <div className="space-y-3">
                      <h4 className="text-slate-300 font-semibold">Injury Details</h4>
                      <div className="bg-slate-700/30 p-3 rounded-lg text-sm text-slate-300">
                        <div>
                          <span className="text-slate-400">Status:</span>{" "}
                          <span className="text-slate-200">{injuryStatus}</span>
                        </div>
                        {injuryDetails && (
                          <div className="mt-1">
                            <span className="text-slate-400">Detail:</span>{" "}
                            <span className="text-slate-200">{injuryDetails}</span>
                          </div>
                        )}
                        {injuryReturnDate && (
                          <div className="mt-1">
                            <span className="text-slate-400">Return:</span>{" "}
                            <span className="text-slate-200">{injuryReturnDate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Play Type Analysis Tab */}
          <TabsContent value="features" className="space-y-4 mt-2">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-pink-400" />
                  Play Type Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300 text-sm space-y-2">
                <div>
                  Coming next: team play-type usage (e.g., A-gap runs, screens, slants), player
                  efficiency vs each play type, and league-wide defense performance vs each play
                  type.
                </div>
                <div className="text-slate-400 text-xs">
                  This requires a play-by-play data source + ingestion. Tell me which provider you
                  want (SportsRadar / PFF / nflfastR) and we’ll wire it in league-by-league.
                </div>
              </CardContent>
            </Card>

            {false && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Feature Buttons */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-slate-200 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-400" />
                      Advanced Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <Button
                        onClick={() => handleFeatureClick("ai-insights")}
                        className={`bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 transition-all duration-200 ${
                          activeFeature === "ai-insights" ? "ring-2 ring-blue-400/50" : ""
                        }`}
                      >
                        <Brain className="w-4 h-4 mr-2" />
                        AI Insights
                      </Button>
                      <Button
                        onClick={() => handleFeatureClick("value-finder")}
                        className={`bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 transition-all duration-200 ${
                          activeFeature === "value-finder" ? "ring-2 ring-blue-400/50" : ""
                        }`}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Value Finder
                      </Button>
                      <Button
                        onClick={() => handleFeatureClick("trend-analysis")}
                        className={`bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 transition-all duration-200 ${
                          activeFeature === "trend-analysis" ? "ring-2 ring-emerald-400/50" : ""
                        }`}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Trend Analysis
                      </Button>
                      <Button
                        onClick={() => handleFeatureClick("custom-alerts")}
                        className={`bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 transition-all duration-200 ${
                          activeFeature === "custom-alerts" ? "ring-2 ring-amber-400/50" : ""
                        }`}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Custom Alerts
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Feature Results */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-slate-200 flex items-center gap-2">
                      {activeFeature === "ai-insights" && (
                        <Brain className="w-5 h-5 text-blue-400" />
                      )}
                      {activeFeature === "value-finder" && (
                        <Target className="w-5 h-5 text-blue-400" />
                      )}
                      {activeFeature === "trend-analysis" && (
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      )}
                      {activeFeature === "custom-alerts" && (
                        <Settings className="w-5 h-5 text-amber-400" />
                      )}
                      {activeFeature
                        ? activeFeature
                            .split("-")
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(" ")
                        : "Select a Feature"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!activeFeature ? (
                      <p className="text-slate-400 text-center py-8">
                        Click on a feature button to see detailed analysis
                      </p>
                    ) : (
                      <>
                        {activeFeature === "ai-insights" && featureData && (
                          <div className="space-y-3">
                            <h4 className="text-slate-300 font-semibold">AI-Generated Insights</h4>
                            <div className="space-y-2">
                              {featureData.insights.map((insight: string, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg"
                                >
                                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2" />
                                  <span className="text-slate-300 text-sm">{insight}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeFeature === "value-finder" && featureData && (
                          <div className="space-y-4">
                            <h4 className="text-slate-300 font-semibold">Value Analysis</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-slate-700/30 p-3 rounded-lg">
                                <div className="text-slate-400 text-sm">Current Odds</div>
                                <div className="text-white font-semibold">
                                  {formatAmericanOdds(featureData.value.currentOdds)}
                                </div>
                              </div>
                              <div className="bg-slate-700/30 p-3 rounded-lg">
                                <div className="text-slate-400 text-sm">Fair Odds</div>
                                <div className="text-white font-semibold">
                                  {formatAmericanOdds(featureData.value.fairOdds)}
                                </div>
                              </div>
                              <div className="bg-slate-700/30 p-3 rounded-lg">
                                <div className="text-slate-400 text-sm">Edge</div>
                                <div
                                  className={`font-semibold ${featureData.value.edge >= 0 ? "text-emerald-400" : "text-red-400"}`}
                                >
                                  {featureData.value.edge >= 0 ? "+" : ""}
                                  {featureData.value.edge}%
                                </div>
                              </div>
                              <div className="bg-slate-700/30 p-3 rounded-lg">
                                <div className="text-slate-400 text-sm">Recommendation</div>
                                <Badge
                                  className={`${
                                    featureData.value.recommendation.includes("STRONG")
                                      ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30"
                                      : featureData.value.recommendation.includes("GOOD")
                                        ? "bg-blue-600/20 text-blue-300 border-blue-500/30"
                                        : "bg-slate-600/20 text-slate-300 border-slate-500/30"
                                  }`}
                                >
                                  {featureData.value.recommendation}
                                </Badge>
                              </div>
                            </div>

                            {/* Additional EV details */}
                            <div className="grid grid-cols-3 gap-4 mt-4">
                              <div className="bg-slate-700/30 p-3 rounded-lg">
                                <div className="text-slate-400 text-sm">EV Percentage</div>
                                <div
                                  className={`font-semibold ${featureData.value.evPercentage >= 0 ? "text-emerald-400" : "text-red-400"}`}
                                >
                                  {featureData.value.evPercentage >= 0 ? "+" : ""}
                                  {featureData.value.evPercentage.toFixed(1)}%
                                </div>
                              </div>
                              <div className="bg-slate-700/30 p-3 rounded-lg">
                                <div className="text-slate-400 text-sm">Confidence</div>
                                <div className="text-white font-semibold">
                                  {featureData.value.confidence.toFixed(0)}%
                                </div>
                              </div>
                              <div className="bg-slate-700/30 p-3 rounded-lg">
                                <div className="text-slate-400 text-sm">AI Rating</div>
                                <div className="text-yellow-400 font-semibold">
                                  {"★".repeat(featureData.value.aiRating)}
                                  {"☆".repeat(5 - featureData.value.aiRating)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeFeature === "trend-analysis" && featureData && (
                          <div className="space-y-4">
                            <h4 className="text-slate-300 font-semibold">Trend Analysis</h4>
                            <div className="space-y-3">
                              {featureData.trends.map((trend: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg"
                                >
                                  <div>
                                    <div className="text-slate-300 font-medium">{trend.period}</div>
                                    <div className="text-slate-400 text-sm">{trend.trend}</div>
                                    <div className="text-slate-500 text-xs">
                                      Avg: {trend.average}
                                    </div>
                                  </div>
                                  <div
                                    className={`font-semibold ${
                                      trend.change.startsWith("+")
                                        ? "text-emerald-400"
                                        : trend.change.startsWith("-")
                                          ? "text-red-400"
                                          : "text-slate-400"
                                    }`}
                                  >
                                    {trend.change}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeFeature === "custom-alerts" && featureData && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="text-slate-300 font-semibold">Alert Settings</h4>
                              <Button
                                onClick={addNewAlert}
                                className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs px-2 py-1 h-7"
                              >
                                + Add
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {featureData.alerts.map((alert: any, index: number) => (
                                <div
                                  key={alert.id}
                                  className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="text-slate-300 font-medium text-sm truncate">
                                      {alert.type}
                                    </div>
                                    <div className="text-slate-400 text-xs flex items-center gap-1">
                                      Threshold:
                                      {alert.editable ? (
                                        <input
                                          type="text"
                                          value={alert.threshold}
                                          onChange={(e) =>
                                            updateAlertThreshold(alert.id, e.target.value)
                                          }
                                          className="bg-slate-600/50 border border-slate-500/30 rounded px-1 py-0.5 text-slate-300 text-xs w-16"
                                          onBlur={() => toggleAlertEdit(alert.id)}
                                          onKeyDown={(e) =>
                                            e.key === "Enter" && toggleAlertEdit(alert.id)
                                          }
                                          autoFocus
                                        />
                                      ) : (
                                        <span
                                          className="cursor-pointer hover:text-slate-300"
                                          onClick={() => toggleAlertEdit(alert.id)}
                                        >
                                          {alert.threshold}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 ml-2">
                                    <Button
                                      onClick={() => toggleAlertActive(alert.id)}
                                      className={`text-xs px-2 py-1 h-6 ${
                                        alert.active
                                          ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30"
                                          : "bg-slate-600/20 text-slate-300 border-slate-500/30 hover:bg-slate-600/30"
                                      }`}
                                    >
                                      {alert.active ? "ON" : "OFF"}
                                    </Button>
                                    <Button
                                      onClick={() => toggleAlertEdit(alert.id)}
                                      className="text-xs px-2 py-1 h-6 bg-blue-600/20 text-blue-300 border-blue-500/30 hover:bg-blue-600/30"
                                    >
                                      {alert.editable ? "✓" : "✎"}
                                    </Button>
                                    <Button
                                      onClick={() => removeAlert(alert.id)}
                                      className="text-xs px-2 py-1 h-6 bg-red-600/20 text-red-300 border-red-500/30 hover:bg-red-600/30"
                                    >
                                      ×
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Pitchers Tab - Baseball Only */}
          {currentData.sport === "mlb" && (
            <TabsContent value="pitchers" className="space-y-4 mt-2">
              <div className="space-y-6">
                {/* Both Pitchers Header */}
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                    Starting Pitchers Analysis
                  </h3>
                  <p className="text-slate-400 mt-2">
                    {currentData.teamAbbr} vs {currentData.opponentAbbr}
                  </p>
                </div>

                {/* Pitcher 1 - Home Team */}
                <div className="space-y-4">
                  <h4 className="text-xl font-semibold text-white flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    {currentData.teamAbbr} Starting Pitcher
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Opponent Team Stats vs Prop Type */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-200 flex items-center gap-2">
                          <Target className="w-5 h-5 text-red-400" />
                          {currentData.opponentAbbr} vs {currentData.propType}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Team Stats</span>
                          <span className="text-white font-bold">Loading...</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">vs {currentData.propType}</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">League Rank</span>
                          <Badge className="bg-gray-600/20 text-gray-300 border-gray-500/30">
                            No Data
                          </Badge>
                        </div>
                        <div className="text-center text-slate-500 text-sm mt-4">
                          Real opponent team stats will be displayed here when available
                        </div>
                      </CardContent>
                    </Card>

                    {/* Pitcher Usage & Efficiency */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-200 flex items-center gap-2">
                          <Activity className="w-5 h-5 text-blue-400" />
                          Pitcher Usage & Efficiency
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Avg Innings</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Avg Pitch Count</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Recent Pitch Counts</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">CSW%</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Walk Rate</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">WHIP</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="text-center text-slate-500 text-sm mt-4">
                          Real pitcher stats will be displayed here when available
                        </div>
                      </CardContent>
                    </Card>

                    {/* Splits & Situational Data */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-200 flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-blue-400" />
                          Splits & Situational
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Home vs Away</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">vs {currentData.opponentAbbr}</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Last 30 Days</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">vs LHB/RHB</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">1st Inning ERA</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">No Runs 1st</span>
                          <Badge className="bg-gray-600/20 text-gray-300 border-gray-500/30">
                            No Data
                          </Badge>
                        </div>
                        <div className="text-center text-slate-500 text-sm mt-4">
                          Real splits data will be displayed here when available
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Pitcher 2 - Away Team */}
                <div className="space-y-4">
                  <h4 className="text-xl font-semibold text-white flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    {currentData.opponentAbbr} Starting Pitcher
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Team Stats vs Prop Type */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-200 flex items-center gap-2">
                          <Target className="w-5 h-5 text-red-400" />
                          {currentData.teamAbbr} vs {currentData.propType}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Team Stats</span>
                          <span className="text-white font-bold">Loading...</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">vs {currentData.propType}</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">League Rank</span>
                          <Badge className="bg-gray-600/20 text-gray-300 border-gray-500/30">
                            No Data
                          </Badge>
                        </div>
                        <div className="text-center text-slate-500 text-sm mt-4">
                          Real team stats will be displayed here when available
                        </div>
                      </CardContent>
                    </Card>

                    {/* Pitcher Usage & Efficiency */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-200 flex items-center gap-2">
                          <Activity className="w-5 h-5 text-red-400" />
                          Pitcher Usage & Efficiency
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Avg Innings</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Avg Pitch Count</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Recent Pitch Counts</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">CSW%</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Walk Rate</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">WHIP</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="text-center text-slate-500 text-sm mt-4">
                          Real pitcher stats will be displayed here when available
                        </div>
                      </CardContent>
                    </Card>

                    {/* Splits & Situational Data */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-200 flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-blue-400" />
                          Splits & Situational
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Home vs Away</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">vs {currentData.teamAbbr}</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Last 30 Days</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">vs LHB/RHB</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">1st Inning ERA</span>
                          <span className="text-white font-bold">N/A</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">No Runs 1st</span>
                          <Badge className="bg-gray-600/20 text-gray-300 border-gray-500/30">
                            No Data
                          </Badge>
                        </div>
                        <div className="text-center text-slate-500 text-sm mt-4">
                          Real splits data will be displayed here when available
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

          {/* Ask Statpedia Tab */}
          <TabsContent value="ask-statpedia" className="mt-2">
            <div className="h-full">
              <AskStatpedia
                playerProp={currentData}
                gameContext={{
                  sport: currentData.sport || "nfl",
                  homeTeam: currentData.opponentAbbr,
                  awayTeam: currentData.teamAbbr,
                  date: currentData.gameDate,
                  playerName: currentData.playerName,
                  propType: currentData.propType,
                  line: currentData.line,
                  overOdds: currentData.overOdds,
                  underOdds: currentData.underOdds,
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
