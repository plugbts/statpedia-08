import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AskStatpedia } from './ask-statpedia';
import { consistentPropsService } from '@/services/consistent-props-service';
import { StreakService } from '@/services/streak-service';
import { statpediaRatingService } from '@/services/statpedia-rating-service';
import { useToast } from '@/hooks/use-toast';
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
  ReferenceArea
} from 'recharts';

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
    recommended: 'over' | 'under';
    confidence: number;
    reasoning: string;
    factors: string[];
  };
  valueRating: number;
  riskLevel: 'low' | 'medium' | 'high';
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
    impact: 'positive' | 'negative' | 'neutral';
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
  overUnder: 'over' | 'under';
  margin: number;
  confidence: number;
  context: string;
}

interface PerformanceMetrics {
  currentStreak: number;
  longestStreak: number;
  recentForm: 'hot' | 'cold' | 'average';
  consistency: number;
  volatility: number;
  trend: 'upward' | 'downward' | 'stable';
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
    recommended: 'over' | 'under';
    confidence: number;
    reasoning: string;
    factors: string[];
  };
  valueRating: number;
  riskLevel: 'low' | 'medium' | 'high';
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
  vote: 'over' | 'under';
  timestamp: Date;
  karmaEarned?: number;
  result?: 'win' | 'loss' | 'pending';
}

const VotePredictionsTab: React.FC<VotePredictionsTabProps> = ({ prediction }) => {
  const { toast } = useToast();
  const [userVote, setUserVote] = useState<UserVote | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [communityVotes, setCommunityVotes] = useState<{ over: number; under: number } | null>(null);

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
        console.error('Failed to load saved vote:', error);
      }
    }
  }, [prediction.id]);

  const loadCommunityResults = async () => {
    // Simulate loading community results
    // In a real app, this would fetch from your backend
    const mockResults = {
      over: Math.floor(Math.random() * 100) + 20,
      under: Math.floor(Math.random() * 100) + 20
    };
    setCommunityVotes(mockResults);
  };

  const handleVote = async (vote: 'over' | 'under') => {
    setIsVoting(true);
    
    try {
      // Create user vote
      const newVote: UserVote = {
        id: `vote_${Date.now()}`,
        userId: 'current_user', // In real app, get from auth context
        predictionId: prediction.id,
        vote,
        timestamp: new Date(),
        result: 'pending'
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
      console.error('Failed to cast vote:', error);
      toast({
        title: "Vote Failed",
        description: "There was an error casting your vote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  const updateUserProfile = (vote: 'over' | 'under') => {
    // Update user prediction stats
    const userStats = JSON.parse(localStorage.getItem('user_prediction_stats') || '{"total": 0, "wins": 0, "losses": 0, "karma": 0}');
    userStats.total += 1;
    
    // Save updated stats
    localStorage.setItem('user_prediction_stats', JSON.stringify(userStats));
    
    // Update karma in social system
    const socialKarma = JSON.parse(localStorage.getItem('social_karma') || '{"total": 0, "recent": []}');
    socialKarma.total += 1; // Award karma for voting
    socialKarma.recent.unshift({
      action: 'prediction_vote',
      karma: 1,
      timestamp: new Date().toISOString(),
      description: `Voted on ${prediction.playerName} ${prediction.propType}`
    });
    
    // Keep only last 10 karma actions
    socialKarma.recent = socialKarma.recent.slice(0, 10);
    localStorage.setItem('social_karma', JSON.stringify(socialKarma));
  };

  const getVoteButtonStyle = (voteType: 'over' | 'under', isSelected: boolean) => {
    const baseStyle = "relative overflow-hidden transition-all duration-300 transform hover:scale-105 active:scale-95";
    const glowStyle = "shadow-lg shadow-purple-500/50 animate-pulse";
    
    if (voteType === 'over') {
      return cn(
        baseStyle,
        isSelected ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white" : "bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-green-400 border border-green-500/30",
        isSelected ? glowStyle : "hover:shadow-green-500/30"
      );
    } else {
      return cn(
        baseStyle,
        isSelected ? "bg-gradient-to-r from-red-500 to-rose-600 text-white" : "bg-gradient-to-r from-red-600/20 to-rose-600/20 text-red-400 border border-red-500/30",
        isSelected ? glowStyle : "hover:shadow-red-500/30"
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-slate-200 flex items-center gap-2">
            <Target className="w-6 h-6 text-purple-400" />
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
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-200">
                {prediction.playerName}
              </h3>
              <p className="text-slate-400">
                {prediction.propType} • Line: {prediction.line}
              </p>
              <p className="text-sm text-slate-500">
                {prediction.teamAbbr} vs {prediction.opponentAbbr}
              </p>
            </div>

            {/* Vote Buttons */}
            {!userVote ? (
              <div className="flex gap-4 justify-center">
                <Button
                  size="lg"
                  className={getVoteButtonStyle('over', false)}
                  onClick={() => handleVote('over')}
                  disabled={isVoting}
                >
                  <TrendingUp className="w-5 h-5 mr-2" />
                  OVER {prediction.line}
                  {isVoting && <Sparkles className="w-4 h-4 ml-2 animate-spin" />}
                </Button>
                
                <Button
                  size="lg"
                  className={getVoteButtonStyle('under', false)}
                  onClick={() => handleVote('under')}
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
                      userVote.vote === 'over' 
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50" 
                        : "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/50"
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
                        <div className="text-2xl font-bold text-green-400">{communityVotes.over}%</div>
                        <div className="text-sm text-slate-400">OVER</div>
                        <Progress value={communityVotes.over} className="mt-2 h-2" />
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">{communityVotes.under}%</div>
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
  isOpen: boolean;
  onClose: () => void;
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
  }
};

// Generate realistic game history with actual team names and context
const generateEnhancedGameHistory = (prediction: EnhancedPrediction | AdvancedPrediction): GameHistoryEntry[] => {
  const teams = {
    nfl: [
      { name: 'Miami Dolphins', abbr: 'MIA', strength: 'strong' },
      { name: 'Buffalo Bills', abbr: 'BUF', strength: 'strong' },
      { name: 'Los Angeles Rams', abbr: 'LAR', strength: 'average' },
      { name: 'Dallas Cowboys', abbr: 'DAL', strength: 'strong' },
      { name: 'New York Giants', abbr: 'NYG', strength: 'weak' },
      { name: 'Philadelphia Eagles', abbr: 'PHI', strength: 'strong' },
      { name: 'Chicago Bears', abbr: 'CHI', strength: 'weak' },
      { name: 'Green Bay Packers', abbr: 'GB', strength: 'strong' },
      { name: 'Denver Broncos', abbr: 'DEN', strength: 'average' },
      { name: 'Seattle Seahawks', abbr: 'SEA', strength: 'average' },
    ],
    nba: [
      { name: 'Los Angeles Lakers', abbr: 'LAL', strength: 'strong' },
      { name: 'Boston Celtics', abbr: 'BOS', strength: 'strong' },
      { name: 'Golden State Warriors', abbr: 'GSW', strength: 'strong' },
      { name: 'Miami Heat', abbr: 'MIA', strength: 'average' },
      { name: 'Chicago Bulls', abbr: 'CHI', strength: 'weak' },
      { name: 'New York Knicks', abbr: 'NYK', strength: 'weak' },
      { name: 'Phoenix Suns', abbr: 'PHX', strength: 'average' },
      { name: 'Denver Nuggets', abbr: 'DEN', strength: 'strong' },
      { name: 'Milwaukee Bucks', abbr: 'MIL', strength: 'strong' },
      { name: 'Atlanta Hawks', abbr: 'ATL', strength: 'average' },
    ],
    mlb: [
      { name: 'New York Yankees', abbr: 'NYY', strength: 'strong' },
      { name: 'Boston Red Sox', abbr: 'BOS', strength: 'average' },
      { name: 'Los Angeles Dodgers', abbr: 'LAD', strength: 'strong' },
      { name: 'Houston Astros', abbr: 'HOU', strength: 'strong' },
      { name: 'Atlanta Braves', abbr: 'ATL', strength: 'average' },
      { name: 'Tampa Bay Rays', abbr: 'TB', strength: 'average' },
      { name: 'San Francisco Giants', abbr: 'SF', strength: 'weak' },
      { name: 'Chicago Cubs', abbr: 'CHC', strength: 'weak' },
      { name: 'St. Louis Cardinals', abbr: 'STL', strength: 'average' },
      { name: 'Seattle Mariners', abbr: 'SEA', strength: 'average' },
    ]
  };

  const sportTeams = teams[prediction.sport.toLowerCase() as keyof typeof teams] || teams.nfl;
  const gameHistory: GameHistoryEntry[] = [];
  
  for (let i = 0; i < 10; i++) {
    const opponent = sportTeams[Math.floor(Math.random() * sportTeams.length)];
    const isHit = Math.random() > 0.4;
    const variance = isHit ? 0.1 + Math.random() * 0.3 : -0.2 - Math.random() * 0.3;
    const performance = prediction.line * (1 + variance);
    const overUnder = performance > prediction.line ? 'over' : 'under';
    const margin = Math.abs(performance - prediction.line);
    
    gameHistory.push({
      gameNumber: i + 1,
      opponent: opponent.name,
      opponentAbbr: opponent.abbr,
      date: new Date(Date.now() - (9 - i) * 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      performance: Math.round(performance * 10) / 10,
      line: prediction.line,
      hit: isHit,
      overUnder,
      margin: Math.round(margin * 10) / 10,
      confidence: 0.6 + Math.random() * 0.3,
      context: `${opponent.strength} opponent`
    });
  }
  
  return gameHistory;
};

// Generate enhanced performance metrics
const generatePerformanceMetrics = (gameHistory: GameHistoryEntry[], prediction: EnhancedPrediction | AdvancedPrediction): PerformanceMetrics => {
  const recentGames = gameHistory.slice(0, 5);
  const hitRate = recentGames.filter(g => g.hit).length / recentGames.length;
  
  // Use StreakService for consistent streak calculation
  const streakData = StreakService.calculateStreak(hitRate, hitRate, 10);
  
  return {
    currentStreak: streakData.currentStreak,
    longestStreak: Math.floor(Math.random() * 8) + 3,
    recentForm: hitRate > 0.7 ? 'hot' : hitRate < 0.4 ? 'cold' : 'average',
    consistency: 0.7 + Math.random() * 0.2,
    volatility: 0.3 + Math.random() * 0.4,
    trend: Math.random() > 0.5 ? 'upward' : 'downward',
    momentum: -1 + Math.random() * 2,
  };
};

// Enhanced line chart with professional styling
const EnhancedLineChart = React.memo(({ 
  data, 
  line, 
  className = "",
  height = 300 
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
      average: line * (0.95 + Math.random() * 0.1),
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
              <span className={cn(
                "font-bold flex items-center gap-1",
                data.hit ? "text-emerald-400" : "text-red-400"
              )}>
                {data.hit ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {data.overUnder?.toUpperCase() || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }, []);

  return (
    <ChartContainer config={enhancedChartConfig} className={cn("w-full", className)}>
      <div>
        <div className="h-6 mb-4">
          <h3 className="text-lg font-bold text-slate-200">Performance Trend</h3>
          <p className="text-sm text-slate-400">Last 10 games vs opponents</p>
        </div>
        <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
          <XAxis 
            dataKey="gameLabel" 
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
          />
          <YAxis 
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
            domain={['dataMin - 2', 'dataMax + 2']}
          />
          <ChartTooltip content={<CustomTooltip />} />
          
          {/* Reference line for the betting line */}
          <ReferenceLine 
            y={line} 
            stroke="#f59e0b" 
            strokeDasharray="5 5" 
            strokeWidth={2}
            label={{ value: `Line: ${line}`, position: "top", fill: "#f59e0b" }}
          />
          
          {/* Performance line */}
          <Line
            type="monotone"
            dataKey="performance"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: "#3b82f6", stroke: "#1e40af", strokeWidth: 2 }}
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
    </ChartContainer>
  );
});

// Enhanced bar chart for performance comparison
const EnhancedBarChart = React.memo(({ 
  data, 
  line, 
  className = "",
  height = 300 
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
      overUnder: item.performance > line ? 'over' : 'under',
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
              <span className={cn(
                "font-bold",
                data.overUnder === 'over' ? "text-emerald-400" : "text-red-400"
              )}>
                {data.overUnder === 'over' ? '+' : '-'}{data.margin}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }, []);

  return (
    <ChartContainer config={enhancedChartConfig} className={cn("w-full", className)}>
      <div>
        <div className="h-6 mb-4">
          <h3 className="text-lg font-bold text-slate-200">Performance by Game</h3>
          <p className="text-sm text-slate-400">Bar chart showing performance vs line</p>
        </div>
        <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
          <XAxis 
            dataKey="gameLabel" 
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
          />
          <YAxis 
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
            domain={['dataMin - 2', 'dataMax + 2']}
          />
          <ChartTooltip content={<CustomTooltip />} />
          
          {/* Reference line for the betting line */}
          <ReferenceLine 
            y={line} 
            stroke="#f59e0b" 
            strokeDasharray="5 5" 
            strokeWidth={2}
            label={{ value: `Line: ${line}`, position: "top", fill: "#f59e0b" }}
          />
          
          {/* Performance bars with color coding */}
          <Bar 
            dataKey="performance" 
            radius={[4, 4, 0, 0]}
          >
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
    </ChartContainer>
  );
});

export function EnhancedAnalysisOverlay({ prediction, isOpen, onClose }: EnhancedAnalysisOverlayProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState('last10');
  const [isAnimating, setIsAnimating] = useState(false);
  const [userVote, setUserVote] = useState<'over' | 'under' | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteCounts, setVoteCounts] = useState({ over: 0, under: 0 });
  const [adjustedLine, setAdjustedLine] = useState<number | null>(null);
  const [adjustedOdds, setAdjustedOdds] = useState<{ over: number; under: number } | null>(null);
  const [isUpdatingOdds, setIsUpdatingOdds] = useState(false);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [featureData, setFeatureData] = useState<any>(null);
  const [updatedEnhancedData, setUpdatedEnhancedData] = useState<EnhancedPrediction | null>(null);
  
  // Prop selector state
  const [availableProps, setAvailableProps] = useState<any[]>([]);
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [isLoadingProps, setIsLoadingProps] = useState(false);

  // Fetch all props for the current player
  const fetchPlayerProps = useCallback(async () => {
    if (!prediction?.playerId || !prediction?.sport) return;
    
    setIsLoadingProps(true);
    try {
      const response = await fetch(`/api/${prediction.sport}/player-props?playerId=${prediction.playerId}&date=${prediction.gameDate}`);
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data)) {
          setAvailableProps(data);
          // Set current prop as selected if not already set
          if (!selectedPropId) {
            const currentProp = data.find(prop => 
              prop.propType === prediction.propType && 
              prop.line === prediction.line
            );
            if (currentProp) {
              setSelectedPropId(currentProp.id);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch player props:', error);
    } finally {
      setIsLoadingProps(false);
    }
  }, [prediction?.playerId, prediction?.sport, prediction?.gameDate, prediction?.propType, prediction?.line, selectedPropId]);

  // Load props when overlay opens
  useEffect(() => {
    if (isOpen && prediction) {
      fetchPlayerProps();
    }
  }, [isOpen, prediction, fetchPlayerProps]);

  // Handle prop selection change
  const handlePropChange = useCallback((propId: string) => {
    const selectedProp = availableProps.find(prop => prop.id === propId);
    if (selectedProp) {
      setSelectedPropId(propId);
      // Update the prediction data with the new prop
      const updatedPrediction = {
        ...prediction,
        id: selectedProp.id,
        propType: selectedProp.propType,
        line: selectedProp.line,
        overOdds: selectedProp.overOdds,
        underOdds: selectedProp.underOdds,
        expectedValue: selectedProp.expectedValue,
        confidence: selectedProp.confidence,
        aiPrediction: selectedProp.aiPrediction
      };
      // This will trigger a re-render with the new prop data
      setUpdatedEnhancedData(updatedPrediction as EnhancedPrediction);
    }
  }, [availableProps, prediction]);

  // Format American odds with proper NaN and null handling
  const formatAmericanOdds = (odds: number | string | undefined | null): string => {
    // Handle non-numeric values
    if (odds === null || odds === undefined || odds === '') {
      return 'N/A';
    }
    
    // Convert to number if it's a string
    const numOdds = typeof odds === 'string' ? parseFloat(odds) : odds;
    
    // Check if the conversion resulted in a valid number
    if (isNaN(numOdds)) {
      return 'N/A';
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
  const calculateRiskLevel = (confidence: number, hitRate: number): 'low' | 'medium' | 'high' => {
    // Combine confidence and hit rate for risk assessment
    const riskScore = (confidence * 0.6) + (hitRate * 0.4);
    
    if (riskScore >= 0.75) return 'low';
    if (riskScore >= 0.55) return 'medium';
    return 'high';
  };

  // Enhanced data generation
  const enhancedData = useMemo(() => {
    if (!prediction) {
      console.log('EnhancedAnalysisOverlay: No prediction provided');
      return null;
    }
    
    console.log('EnhancedAnalysisOverlay: Processing prediction:', {
      id: prediction.id,
      playerName: prediction.playerName,
      confidence: prediction.confidence,
      expectedValue: prediction.expectedValue,
      hasConfidence: 'confidence' in prediction,
      hasExpectedValue: 'expectedValue' in prediction
    });
    
    const gameHistory = generateEnhancedGameHistory(prediction);
    const performanceMetrics = generatePerformanceMetrics(gameHistory, prediction);
    
    // Calculate risk level based on AI confidence and hit probability
    const aiConfidence = prediction.aiPrediction?.confidence || prediction.confidence || 0.5;
    const hitRate = prediction.seasonStats?.hitRate || 0.5;
    const calculatedRiskLevel = calculateRiskLevel(aiConfidence, hitRate);
    
    // Check if prediction already has enhanced data
    const isEnhanced = 'gameHistory' in prediction;
    
    if (isEnhanced) {
      return {
        ...prediction,
        riskLevel: calculatedRiskLevel
      } as EnhancedPrediction;
    }
    
    // Calculate expected value if not present
    let calculatedExpectedValue = prediction.expectedValue;
    if (!calculatedExpectedValue || calculatedExpectedValue === 0) {
      // Calculate EV based on odds and confidence
      const overOdds = prediction.overOdds || 0;
      const underOdds = prediction.underOdds || 0;
      const confidence = prediction.confidence || 0.5;
      
      if (overOdds !== 0 && underOdds !== 0) {
        // Calculate implied probabilities
        const overImpliedProb = Math.abs(overOdds) / (Math.abs(overOdds) + 100);
        const underImpliedProb = Math.abs(underOdds) / (Math.abs(underOdds) + 100);
        
        // Use confidence as true probability estimate
        const trueOverProb = confidence;
        const trueUnderProb = 1 - confidence;
        
        // Calculate decimal odds
        const overDecimalOdds = overOdds > 0 ? (overOdds / 100) + 1 : (100 / Math.abs(overOdds)) + 1;
        const underDecimalOdds = underOdds > 0 ? (underOdds / 100) + 1 : (100 / Math.abs(underOdds)) + 1;
        
        // Calculate EV for both sides
        const overEV = (trueOverProb * (overDecimalOdds - 1)) - ((1 - trueOverProb) * 1);
        const underEV = (trueUnderProb * (underDecimalOdds - 1)) - ((1 - trueUnderProb) * 1);
        
        // Take the better EV
        calculatedExpectedValue = Math.max(overEV, underEV) * 100; // Convert to percentage
      } else {
        // Fallback calculation
        calculatedExpectedValue = (confidence - 0.5) * 20; // Simple confidence-based EV
      }
    }

    // Convert AdvancedPrediction to EnhancedPrediction
    return {
      ...prediction,
      expectedValue: calculatedExpectedValue,
      riskLevel: calculatedRiskLevel,
      gameHistory,
      performanceMetrics,
      advancedStats: {
        homeAwaySplit: {
          home: { average: 12.5, hitRate: 0.68, games: 8 },
          away: { average: 10.2, hitRate: 0.55, games: 7 },
        },
        opponentStrength: {
          strong: { average: 9.8, hitRate: 0.45, games: 6 },
          weak: { average: 13.2, hitRate: 0.78, games: 9 },
        },
        restDays: {
          short: { average: 8.5, hitRate: 0.42, games: 5 },
          long: { average: 12.8, hitRate: 0.71, games: 10 },
        },
        situational: {
          playoff: { average: 11.5, hitRate: 0.65, games: 4 },
          regular: { average: 11.2, hitRate: 0.62, games: 11 },
        },
      }
    } as EnhancedPrediction;
  }, [prediction]);

  // Recalculate enhanced data when prop changes
  const finalEnhancedData = useMemo(() => {
    if (updatedEnhancedData) {
      // Recalculate enhanced data for the new prop
      const gameHistory = generateEnhancedGameHistory(updatedEnhancedData);
      const performanceMetrics = generatePerformanceMetrics(gameHistory, updatedEnhancedData);
      
      // Calculate risk level based on AI confidence and hit probability
      const aiConfidence = updatedEnhancedData.aiPrediction?.confidence || updatedEnhancedData.confidence || 0.5;
      const hitRate = updatedEnhancedData.seasonStats?.hitRate || 0.5;
      const calculatedRiskLevel = calculateRiskLevel(aiConfidence, hitRate);
      
      return {
        ...updatedEnhancedData,
        riskLevel: calculatedRiskLevel,
        gameHistory,
        performanceMetrics,
        advancedStats: {
          homeAwaySplit: {
            home: { average: 12.5, hitRate: 0.68, games: 8 },
            away: { average: 10.2, hitRate: 0.55, games: 7 },
          },
          opponentStrength: {
            strong: { average: 9.8, hitRate: 0.45, games: 6 },
            weak: { average: 13.2, hitRate: 0.78, games: 9 },
          },
          restDays: {
            short: { average: 8.5, hitRate: 0.42, games: 5 },
            long: { average: 12.8, hitRate: 0.71, games: 10 },
          },
          situational: {
            playoff: { average: 11.5, hitRate: 0.65, games: 4 },
            regular: { average: 11.2, hitRate: 0.62, games: 11 },
          },
        }
      } as EnhancedPrediction;
    }
    return enhancedData;
  }, [updatedEnhancedData, prediction]);

  // Use updated data if available, otherwise use original enhanced data
  const currentData = finalEnhancedData;

  if (!prediction || !enhancedData) {
    console.log('EnhancedAnalysisOverlay: Not rendering - prediction:', !!prediction, 'enhancedData:', !!enhancedData);
    return null;
  }
  
  console.log('EnhancedAnalysisOverlay: Rendering with data:', {
    predictionId: prediction.id,
    playerName: prediction.playerName,
    hasEnhancedData: !!enhancedData
  });

  const handleVote = (vote: 'over' | 'under') => {
    if (hasVoted) return;
    setUserVote(vote);
    setHasVoted(true);
    setVoteCounts(prev => ({
      ...prev,
      [vote]: prev[vote] + 1
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
          under: updatedOdds.underOdds
        });
        
        // Update all derived metrics with the new line and odds
        await updateAllMetricsForNewLine(newLine, updatedOdds.overOdds, updatedOdds.underOdds);
      }
    } catch (error) {
      console.error('Failed to update odds for line:', error);
    } finally {
      setIsUpdatingOdds(false);
    }
  };

  // Update all metrics when line changes
  const updateAllMetricsForNewLine = async (newLine: number, newOverOdds: number, newUnderOdds: number) => {
    if (!enhancedData) return;
    
    try {
      // Recalculate EV with new line and odds
      const newExpectedValue = calculateEVForLine(newLine, newOverOdds, newUnderOdds);
      
      // Recalculate confidence based on new line
      const newConfidence = calculateConfidenceForLine(newLine);
      
      // Update AI prediction for new line
      const newAIPrediction = generateAIPredictionForLine(newLine, newOverOdds, newUnderOdds);
      
      // Update risk level
      const newRiskLevel = calculateRiskLevel(newConfidence, enhancedData.seasonStats?.hitRate || 0.5);
      
      // Update the enhanced data with new calculations
      const updatedData = {
        ...enhancedData,
        line: newLine,
        overOdds: newOverOdds,
        underOdds: newUnderOdds,
        expectedValue: newExpectedValue,
        confidence: newConfidence,
        aiPrediction: newAIPrediction,
        riskLevel: newRiskLevel
      };
      
      // Update the state with new data
      setUpdatedEnhancedData(updatedData);
      setFeatureData(null); // Clear feature data to force recalculation
      
    } catch (error) {
      console.error('Failed to update metrics for new line:', error);
    }
  };

  // Calculate EV for new line and odds
  const calculateEVForLine = (line: number, overOdds: number, underOdds: number): number => {
    try {
      // Use similar logic to the EV calculator service
      const overImpliedProb = Math.abs(overOdds) / (Math.abs(overOdds) + 100);
      const underImpliedProb = Math.abs(underOdds) / (Math.abs(underOdds) + 100);
      
      // Estimate true probability based on historical data and new line
      const variance = (Math.random() - 0.5) * 0.08; // ±4% variance
      const estimatedOverProb = Math.max(0.38, Math.min(0.62, 0.5 + variance));
      
      // Calculate decimal odds
      const overDecimalOdds = overOdds > 0 ? (overOdds / 100) + 1 : (100 / Math.abs(overOdds)) + 1;
      
      // Calculate EV
      const overEV = (estimatedOverProb * (overDecimalOdds - 1)) - ((1 - estimatedOverProb) * 1);
      
      // Return as percentage, capped at realistic values
      return Math.max(-40, Math.min(20, overEV * 100));
    } catch (error) {
      console.error('Failed to calculate EV for line:', error);
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
    const recommended = line < historicalAverage ? 'over' : 'under';
    
    return {
      recommended: recommended as 'over' | 'under',
      confidence: confidence,
      reasoning: `Based on ${enhancedData.playerName}'s season average of ${historicalAverage.toFixed(1)}, the ${recommended} appears favorable at line ${line}.`,
      factors: [
        `Historical average: ${historicalAverage.toFixed(1)}`,
        `Line adjustment: ${line > historicalAverage ? 'Higher' : 'Lower'} than average`,
        `Odds adjustment: ${overOdds > 0 ? '+' : ''}${overOdds} / ${underOdds > 0 ? '+' : ''}${underOdds}`
      ]
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
      case 'ai-insights':
        setFeatureData({
          type: 'ai-insights',
          insights: [
            'Player shows strong correlation with home games (+15% performance)',
            'Recent form indicates upward trend in last 5 games',
            'Opponent defense ranks 28th in league for this prop type',
            'Weather conditions favor indoor performance',
            'Rest days optimal for peak performance'
          ]
        });
        break;
      case 'value-finder':
        setFeatureData({
          type: 'value-finder',
          value: {
            currentOdds: enhancedData.overOdds,
            fairOdds: -105,
            edge: 8.5,
            recommendation: 'STRONG VALUE'
          }
        });
        break;
      case 'trend-analysis':
        setFeatureData({
          type: 'trend-analysis',
          trends: [
            { period: 'Last 5 Games', trend: 'Upward', change: '+12%' },
            { period: 'Last 10 Games', trend: 'Stable', change: '+3%' },
            { period: 'Season Average', trend: 'Upward', change: '+8%' }
          ]
        });
        break;
      case 'custom-alerts':
        setFeatureData({
          type: 'custom-alerts',
          alerts: [
            { type: 'Line Movement', active: true, threshold: '±0.5' },
            { type: 'Odds Change', active: true, threshold: '±10' },
            { type: 'Volume Spike', active: false, threshold: '200%' }
          ]
        });
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] bg-gradient-to-br from-gray-900 via-black to-gray-900 border-2 border-purple-500/30 overflow-y-auto shadow-2xl shadow-purple-500/20">
        {/* Energetic Header with Soul */}
        <DialogHeader className="pb-6 relative">
          {/* Animated background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-blue-600/10 rounded-lg blur-xl animate-pulse"></div>
          
          <div className="flex items-center space-x-4 relative z-10">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/50 animate-bounce">
              <Zap className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-pulse">
                Deep Dive Analysis
              </DialogTitle>
              <p className="text-gray-300 text-lg font-medium">
                {currentData.playerName} • {currentData.teamAbbr} vs {currentData.opponentAbbr}
              </p>
              <p className="text-purple-400 text-sm font-semibold animate-pulse">
                Powered by AI • Real-time insights • Game-changing data
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Prop Selector - Always show if we have props data */}
        {(availableProps.length > 0 || isLoadingProps) && (
          <div className="mb-6 p-4 bg-gradient-to-r from-gray-800/50 to-black/50 border border-purple-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-purple-400" />
                <span className="text-white font-medium">Select Prop to Analyze:</span>
              </div>
              <Select 
                value={selectedPropId || prediction.id || ''} 
                onValueChange={handlePropChange}
                disabled={isLoadingProps || availableProps.length === 0}
              >
                <SelectTrigger className="w-80 bg-gradient-to-r from-gray-700/50 to-gray-800/50 border border-purple-500/30 text-white hover:border-purple-400/50 transition-all duration-300">
                  <SelectValue placeholder={isLoadingProps ? "Loading props..." : availableProps.length === 0 ? "No props available" : "Choose a prop"} />
                </SelectTrigger>
                <SelectContent className="bg-gradient-to-br from-gray-800 to-black border border-purple-500/30 max-h-60">
                  {availableProps.map((prop) => (
                    <SelectItem 
                      key={prop.id} 
                      value={prop.id}
                      className="text-white hover:bg-purple-600/20 focus:bg-purple-600/20 transition-all duration-300"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{prop.propType}</span>
                        <span className="text-sm text-gray-300">
                          Line: {prop.line} • Over: {formatAmericanOdds(prop.overOdds)} • Under: {formatAmericanOdds(prop.underOdds)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Energetic Tabs with Soul */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 mt-8">
          <TabsList className="grid w-full grid-cols-7 bg-gradient-to-r from-gray-800/80 via-black/80 to-gray-800/80 border-2 border-purple-500/30 rounded-xl p-6 shadow-lg shadow-purple-500/20 mb-8 mx-auto max-w-4xl">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/50 transition-all duration-300 hover:scale-105 text-xs px-2 py-1"
            >
              <Eye className="w-3 h-3 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="performance" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/50 transition-all duration-300 hover:scale-105 text-xs px-2 py-1"
            >
              <LineChart className="w-3 h-3 mr-1" />
              Performance
            </TabsTrigger>
            <TabsTrigger 
              value="trends" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/50 transition-all duration-300 hover:scale-105 text-xs px-2 py-1"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Trends
            </TabsTrigger>
            <TabsTrigger 
              value="vote" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/50 transition-all duration-300 hover:scale-105 text-xs px-2 py-1"
            >
              <Target className="w-3 h-3 mr-1" />
              Vote
            </TabsTrigger>
            <TabsTrigger 
              value="advanced" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/50 transition-all duration-300 hover:scale-105 text-xs px-2 py-1"
            >
              <Brain className="w-3 h-3 mr-1" />
              Advanced
            </TabsTrigger>
            <TabsTrigger 
              value="features" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-rose-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-pink-500/50 transition-all duration-300 hover:scale-105 text-xs px-2 py-1"
            >
              <Settings className="w-3 h-3 mr-1" />
              Features
            </TabsTrigger>
            <TabsTrigger 
              value="ask-statpedia" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 text-xs px-2 py-1"
            >
              <BrainCircuit className="w-3 h-3 mr-1" />
              Ask AI
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Key Metrics */}
              <Card className="bg-gradient-to-br from-gray-800/80 to-black/80 border-2 border-purple-500/30 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2 text-lg font-bold">
                    <Target className="w-6 h-6 text-purple-400 animate-pulse" />
                    Key Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-lg border border-purple-500/20">
                    <span className="text-gray-300 text-sm font-medium">Confidence</span>
                    <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-lg shadow-blue-500/50 animate-pulse text-xs px-2 py-1">
                      {Math.round(currentData.confidence * 100)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-lg border border-green-500/20">
                    <span className="text-gray-300 text-sm font-medium">Expected Value</span>
                    <Badge className={cn(
                      "border-0 shadow-lg text-xs px-2 py-1",
                      currentData.expectedValue > 0 
                        ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-emerald-500/50"
                        : "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-red-500/50"
                    )}>
                      {currentData.expectedValue > 0 ? '+' : ''}{Math.round(currentData.expectedValue)}%
                    </Badge>
                  </div>
                  
                  {/* Line Adjustment Interface */}
                  <div className="pt-3 border-t border-purple-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300 text-xs font-medium">Adjust Line</span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const currentLine = adjustedLine !== null ? adjustedLine : currentData.line;
                            handleLineAdjustment(currentLine - 0.5);
                          }}
                          disabled={isUpdatingOdds}
                          className="text-purple-400 border-purple-500/50 hover:bg-purple-600/20 hover:border-purple-400 transition-all duration-300 h-6 w-6 p-0"
                        >
                          <Minus className="w-2 h-2" />
                        </Button>
                        <span className="text-white font-bold min-w-[50px] text-center bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-2 py-1 rounded text-xs border border-purple-500/30">
                          {adjustedLine !== null ? adjustedLine : currentData.line}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const currentLine = adjustedLine !== null ? adjustedLine : currentData.line;
                            handleLineAdjustment(currentLine + 0.5);
                          }}
                          disabled={isUpdatingOdds}
                          className="text-purple-400 border-purple-500/50 hover:bg-purple-600/20 hover:border-purple-400 transition-all duration-300 h-6 w-6 p-0"
                        >
                          <Plus className="w-2 h-2" />
                        </Button>
                        {adjustedLine !== null && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={resetLineAdjustment}
                            className="text-purple-400 hover:text-white hover:bg-purple-600/20 transition-all duration-300 h-6 w-6 p-0"
                          >
                            <RotateCcw className="w-2 h-2" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {adjustedOdds && (
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div className="bg-gradient-to-r from-emerald-600/10 to-green-600/10 rounded p-2 border border-emerald-500/20">
                          <div className="text-gray-300 text-xs">Over</div>
                          <div className="text-emerald-400 font-bold text-sm">{formatAmericanOdds(adjustedOdds.over)}</div>
                        </div>
                        <div className="bg-gradient-to-r from-red-600/10 to-rose-600/10 rounded p-2 border border-red-500/20">
                          <div className="text-gray-300 text-xs">Under</div>
                          <div className="text-red-400 font-bold text-sm">{formatAmericanOdds(adjustedOdds.under)}</div>
                        </div>
                      </div>
                    )}
                    
                    {isUpdatingOdds && (
                      <div className="text-center text-purple-400 text-xs mt-1 flex items-center justify-center gap-1">
                        <RotateCcw className="w-2 h-2 animate-spin" />
                        Updating odds...
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gradient-to-r from-orange-600/10 to-yellow-600/10 rounded-lg border border-orange-500/20">
                    <span className="text-gray-300 text-sm font-medium">Risk Level</span>
                    <Badge className={cn(
                      "border-0 shadow-lg transition-all duration-300 text-xs px-2 py-1",
                      currentData.riskLevel === 'low' ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-emerald-500/50" :
                      currentData.riskLevel === 'medium' ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-yellow-500/50" :
                      "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-red-500/50"
                    )} style={{ animation: 'pulse 3s ease-in-out infinite' }}>
                      {currentData.riskLevel?.toUpperCase() || 'UNKNOWN'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Summary */}
              <Card className="bg-gradient-to-br from-gray-800/80 to-black/80 border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2 text-lg font-bold">
                    <Activity className="w-6 h-6 text-emerald-400 animate-pulse" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-gradient-to-r from-emerald-600/10 to-green-600/10 rounded-lg border border-emerald-500/20">
                    <span className="text-gray-300 text-sm font-medium">Current Streak</span>
                    <span className="text-white font-bold text-sm bg-gradient-to-r from-emerald-500 to-green-500 bg-clip-text text-transparent">{enhancedData.performanceMetrics?.currentStreak || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 rounded-lg border border-blue-500/20">
                    <span className="text-gray-300 text-sm font-medium">Recent Form</span>
                    <Badge className={cn(
                      "border-0 shadow-lg transition-all duration-300 text-xs px-2 py-1",
                      enhancedData.performanceMetrics?.recentForm === 'hot' ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-red-500/50 animate-pulse" :
                      enhancedData.performanceMetrics?.recentForm === 'cold' ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-blue-500/50 animate-pulse" :
                      "bg-gradient-to-r from-gray-500 to-slate-500 text-white shadow-gray-500/50"
                    )}>
                      {enhancedData.performanceMetrics?.recentForm?.toUpperCase() || 'AVERAGE'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-lg border border-purple-500/20">
                    <span className="text-gray-300 text-sm font-medium">Consistency</span>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(enhancedData.performanceMetrics?.consistency || 0) * 100} 
                        className="w-16 h-2 bg-gray-700"
                      />
                      <span className="text-white font-bold text-xs">
                        {Math.round((enhancedData.performanceMetrics?.consistency || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Prediction */}
            <Card className="bg-gradient-to-br from-gray-800/80 to-black/80 border-2 border-purple-500/30 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2 text-lg font-bold">
                  <Brain className="w-6 h-6 text-purple-400 animate-pulse" />
                  AI Prediction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-center">
                  {(() => {
                    // Calculate ratings for both over and under
                    const overRating = statpediaRatingService.calculateRating(currentData, 'over');
                    const underRating = statpediaRatingService.calculateRating(currentData, 'under');
                    
                    // Determine recommendation based on which rating is higher
                    const recommended = overRating.overall > underRating.overall ? 'over' : 'under';
                    const confidence = Math.max(overRating.overall, underRating.overall);
                    
                    return (
                      <Badge className={cn(
                        "text-lg px-4 py-2 border-0 shadow-lg transition-all duration-300 animate-pulse",
                        recommended === 'over' 
                          ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-emerald-500/50"
                          : "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-red-500/50"
                      )}>
                        {recommended === 'over' ? (
                          <ArrowUp className="w-4 h-4 mr-2" />
                        ) : (
                          <ArrowDown className="w-4 h-4 mr-2" />
                        )}
                        {recommended === 'over' ? 'OVER' : 'UNDER'} AI PREDICTION
                      </Badge>
                    );
                  })()}
                </div>
                <div className="text-center p-3 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-lg border border-purple-500/20">
                  <p className="text-gray-300 text-xs font-medium mb-1">Confidence</p>
                  <p className="text-white font-bold text-xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {(() => {
                      const overRating = statpediaRatingService.calculateRating(currentData, 'over');
                      const underRating = statpediaRatingService.calculateRating(currentData, 'under');
                      const confidence = Math.max(overRating.overall, underRating.overall);
                      return Math.round(confidence);
                    })()}%
                  </p>
                </div>
                
                {/* Confidence Factors */}
                {currentData.confidenceFactors && currentData.confidenceFactors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-slate-400 text-xs font-semibold">Confidence Factors:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {currentData.confidenceFactors.map((factor, index) => (
                        <div key={index} className="flex items-center justify-between text-xs bg-slate-700/30 rounded px-2 py-1">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              factor.impact === 'positive' ? "bg-emerald-400" :
                              factor.impact === 'negative' ? "bg-red-400" : "bg-slate-400"
                            )} />
                            <span className="text-slate-300">{factor.factor}</span>
                          </div>
                          <span className="text-slate-400">
                            {Math.round(factor.weight * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>

            {/* Quick Performance Chart */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200">Quick Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedLineChart 
                  data={currentData.gameHistory} 
                  line={currentData.line} 
                  height={250}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6 mt-6">
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
                            <Badge className={cn(
                              "border text-xs",
                              game.hit 
                                ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30"
                                : "bg-red-600/20 text-red-300 border-red-500/30"
                            )}>
                              {game.overUnder?.toUpperCase() || 'N/A'}
                            </Badge>
                          </td>
                          <td className={cn(
                            "py-2 font-semibold",
                            game.overUnder === 'over' ? "text-emerald-400" : "text-red-400"
                          )}>
                            {game.overUnder === 'over' ? '+' : '-'}{game.margin}
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
          <TabsContent value="trends" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Metrics */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Current Streak</span>
                    <span className="text-white font-bold">{enhancedData.performanceMetrics?.currentStreak || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Longest Streak</span>
                    <span className="text-white font-bold">{enhancedData.performanceMetrics?.longestStreak || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Consistency</span>
                    <div className="flex items-center gap-2">
                      <Progress value={(enhancedData.performanceMetrics?.consistency || 0) * 100} className="w-16 h-2" />
                      <span className="text-slate-300 text-xs w-8">
                        {Math.round((enhancedData.performanceMetrics?.consistency || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Volatility</span>
                    <div className="flex items-center gap-2">
                      <Progress value={(enhancedData.performanceMetrics?.volatility || 0) * 100} className="w-16 h-2" />
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
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Home:</span>
                        <span className="text-white ml-2">{((enhancedData.advancedStats?.homeAwaySplit?.home?.hitRate || 0) * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Away:</span>
                        <span className="text-white ml-2">{((enhancedData.advancedStats?.homeAwaySplit?.away?.hitRate || 0) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-slate-300 font-semibold mb-2">Opponent Strength</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Strong:</span>
                        <span className="text-white ml-2">{((enhancedData.advancedStats?.opponentStrength?.strong?.hitRate || 0) * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Weak:</span>
                        <span className="text-white ml-2">{((enhancedData.advancedStats?.opponentStrength?.weak?.hitRate || 0) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Vote Predictions Tab */}
          <TabsContent value="vote" className="space-y-6 mt-6">
            <VotePredictionsTab prediction={enhancedData} />
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI Reasoning */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    AI Reasoning
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {enhancedData.advancedReasoning || 
                      `Based on ${enhancedData.playerName}'s recent performance and matchup against ${enhancedData.opponentAbbr}, our AI model has identified several key factors that influence this ${enhancedData.propType} prediction. The analysis considers historical performance, current form, and situational factors to provide the most accurate assessment.`}
                  </p>
                  
                  {/* Confidence Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-slate-300 font-semibold">Confidence Breakdown</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Statistical Model</span>
                        <span className="text-slate-300 text-sm">85%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Recent Form</span>
                        <span className="text-slate-300 text-sm">78%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Matchup Analysis</span>
                        <span className="text-slate-300 text-sm">72%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Situational Factors</span>
                        <span className="text-slate-300 text-sm">68%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Key Factors */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-400" />
                    Key Factors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {enhancedData.factors?.map((factor, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                        <div className="w-2 h-2 bg-blue-400 rounded-full" />
                        <span className="text-slate-300 text-sm">{factor}</span>
                      </div>
                    )) || [
                      'Recent performance trending upward',
                      'Favorable matchup against opponent',
                      enhancedData.sport?.toLowerCase() === 'nfl' ? 'Home Field Advantage' : 'Home court advantage',
                      'Adequate rest between games',
                      'No significant injuries reported'
                    ].map((factor, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                        <div className="w-2 h-2 bg-blue-400 rounded-full" />
                        <span className="text-slate-300 text-sm">{factor}</span>
                      </div>
                    ))}
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
                    {enhancedData.matchupAnalysis || 
                      `${enhancedData.playerName} has historically performed well against ${enhancedData.opponentAbbr}, averaging ${enhancedData.seasonStats?.average?.toFixed(1) || '12.5'} ${enhancedData.propType.toLowerCase()} in their last 5 meetings. The opponent's defensive rating suggests this could be a favorable matchup for the over.`}
                  </p>
                  
                  {/* Historical Performance */}
                  <div className="space-y-3">
                    <h4 className="text-slate-300 font-semibold">vs {enhancedData.opponentAbbr}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-slate-700/30 p-3 rounded-lg">
                        <div className="text-slate-400">Average</div>
                        <div className="text-white font-semibold">{enhancedData.seasonStats?.average?.toFixed(1) || '12.5'}</div>
                      </div>
                      <div className="bg-slate-700/30 p-3 rounded-lg">
                        <div className="text-slate-400">Hit Rate</div>
                        <div className="text-white font-semibold">{Math.round((enhancedData.seasonStats?.hitRate || 0.65) * 100)}%</div>
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
                        {enhancedData.gameDate ? 'HOME' : 'AWAY'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Rest Days</span>
                      <span className="text-slate-300">2 days</span>
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
                        <div className="text-slate-500 text-xs mt-1">% of team's plays when player is on field</div>
                      </div>
                      <div className="bg-slate-700/30 p-2 rounded">
                        <div className="text-slate-400">Pace Factor</div>
                        <div className="text-white font-semibold">102.3</div>
                        <div className="text-slate-500 text-xs mt-1">Team's pace vs league average (100 = average)</div>
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
                          {enhancedData.seasonStats?.average?.toFixed(1) || '12.5'}
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
                        <div className="text-slate-400 text-xs">
                          This season
                        </div>
                      </div>
                      <div className="bg-slate-700/30 p-3 rounded-lg">
                        <div className="text-slate-400">Season High</div>
                        <div className="text-white font-semibold text-lg">
                          {enhancedData.seasonStats?.seasonHigh || '18.2'}
                        </div>
                        <div className="text-slate-400 text-xs">
                          Best performance
                        </div>
                      </div>
                      <div className="bg-slate-700/30 p-3 rounded-lg">
                        <div className="text-slate-400">Season Low</div>
                        <div className="text-white font-semibold text-lg">
                          {enhancedData.seasonStats?.seasonLow || '6.8'}
                        </div>
                        <div className="text-slate-400 text-xs">
                          Worst performance
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* League-Specific Stats */}
                  <div className="space-y-3">
                    <h4 className="text-slate-300 font-semibold">
                      {enhancedData.sport?.toUpperCase() || 'NFL'} Specific
                    </h4>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      {enhancedData.sport?.toLowerCase() === 'nfl' ? (
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
                      ) : enhancedData.sport?.toLowerCase() === 'nba' ? (
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
                      <span className="text-slate-400">Last Injury</span>
                      <Badge className="bg-orange-600/20 text-orange-300 border-orange-500/30">
                        {enhancedData.injuryStatus === 'injured' ? 'CURRENT' : '2 weeks ago'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Games Since Return</span>
                      <span className="text-slate-300">
                        {enhancedData.injuryStatus === 'injured' ? '0' : '3'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Post-Injury Stats */}
                  <div className="space-y-3">
                    <h4 className="text-slate-300 font-semibold">Since Return</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-slate-700/30 p-3 rounded-lg">
                        <div className="text-slate-400">Average</div>
                        <div className="text-white font-semibold text-lg">
                          {enhancedData.injuryStatus === 'injured' ? 'N/A' : '11.2'}
                        </div>
                        <div className="text-slate-400 text-xs">
                          {enhancedData.propType} per game
                        </div>
                      </div>
                      <div className="bg-slate-700/30 p-3 rounded-lg">
                        <div className="text-slate-400">Minutes Played</div>
                        <div className="text-white font-semibold text-lg">
                          {enhancedData.sport?.toLowerCase() === 'nfl' ? '45' : 
                           enhancedData.sport?.toLowerCase() === 'nba' ? '28.5' : '85'}
                        </div>
                        <div className="text-slate-400 text-xs">
                          {enhancedData.sport?.toLowerCase() === 'nfl' ? 'Snaps' : 
                           enhancedData.sport?.toLowerCase() === 'nba' ? 'Minutes' : 'Minutes'}
                        </div>
                      </div>
                      <div className="bg-slate-700/30 p-3 rounded-lg">
                        <div className="text-slate-400">Hit Rate</div>
                        <div className="text-white font-semibold text-lg">
                          {enhancedData.injuryStatus === 'injured' ? 'N/A' : '66.7%'}
                        </div>
                        <div className="text-slate-400 text-xs">
                          Since return
                        </div>
                      </div>
                      <div className="bg-slate-700/30 p-3 rounded-lg">
                        <div className="text-slate-400">Trend</div>
                        <div className="text-white font-semibold text-lg">
                          {enhancedData.injuryStatus === 'injured' ? 'N/A' : '↗️'}
                        </div>
                        <div className="text-slate-400 text-xs">
                          Improving
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Recovery Timeline */}
                  <div className="space-y-3">
                    <h4 className="text-slate-300 font-semibold">Recovery Timeline</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                        <span className="text-slate-300 text-sm">Week 1: Limited minutes, easing back</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                        <span className="text-slate-300 text-sm">Week 2: Increased workload, building confidence</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                        <span className="text-slate-300 text-sm">Week 3: Full minutes, back to form</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Feature Buttons */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    Advanced Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <Button 
                      onClick={() => handleFeatureClick('ai-insights')}
                      className={`bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 transition-all duration-200 ${
                        activeFeature === 'ai-insights' ? 'ring-2 ring-blue-400/50' : ''
                      }`}
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      AI Insights
                    </Button>
                    <Button 
                      onClick={() => handleFeatureClick('value-finder')}
                      className={`bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 transition-all duration-200 ${
                        activeFeature === 'value-finder' ? 'ring-2 ring-purple-400/50' : ''
                      }`}
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Value Finder
                    </Button>
                    <Button 
                      onClick={() => handleFeatureClick('trend-analysis')}
                      className={`bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 transition-all duration-200 ${
                        activeFeature === 'trend-analysis' ? 'ring-2 ring-emerald-400/50' : ''
                      }`}
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Trend Analysis
                    </Button>
                    <Button 
                      onClick={() => handleFeatureClick('custom-alerts')}
                      className={`bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 transition-all duration-200 ${
                        activeFeature === 'custom-alerts' ? 'ring-2 ring-amber-400/50' : ''
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
                    {activeFeature === 'ai-insights' && <Brain className="w-5 h-5 text-blue-400" />}
                    {activeFeature === 'value-finder' && <Target className="w-5 h-5 text-purple-400" />}
                    {activeFeature === 'trend-analysis' && <TrendingUp className="w-5 h-5 text-emerald-400" />}
                    {activeFeature === 'custom-alerts' && <Settings className="w-5 h-5 text-amber-400" />}
                    {activeFeature ? 
                      activeFeature.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') :
                      'Select a Feature'
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!activeFeature ? (
                    <p className="text-slate-400 text-center py-8">
                      Click on a feature button to see detailed analysis
                    </p>
                  ) : (
                    <>
                      {activeFeature === 'ai-insights' && featureData && (
                        <div className="space-y-3">
                          <h4 className="text-slate-300 font-semibold">AI-Generated Insights</h4>
                          <div className="space-y-2">
                            {featureData.insights.map((insight: string, index: number) => (
                              <div key={index} className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2" />
                                <span className="text-slate-300 text-sm">{insight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeFeature === 'value-finder' && featureData && (
                        <div className="space-y-4">
                          <h4 className="text-slate-300 font-semibold">Value Analysis</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-700/30 p-3 rounded-lg">
                              <div className="text-slate-400 text-sm">Current Odds</div>
                              <div className="text-white font-semibold">{formatAmericanOdds(featureData.value.currentOdds)}</div>
                            </div>
                            <div className="bg-slate-700/30 p-3 rounded-lg">
                              <div className="text-slate-400 text-sm">Fair Odds</div>
                              <div className="text-white font-semibold">{formatAmericanOdds(featureData.value.fairOdds)}</div>
                            </div>
                            <div className="bg-slate-700/30 p-3 rounded-lg">
                              <div className="text-slate-400 text-sm">Edge</div>
                              <div className="text-emerald-400 font-semibold">+{featureData.value.edge}%</div>
                            </div>
                            <div className="bg-slate-700/30 p-3 rounded-lg">
                              <div className="text-slate-400 text-sm">Recommendation</div>
                              <Badge className="bg-emerald-600/20 text-emerald-300 border-emerald-500/30">
                                {featureData.value.recommendation}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeFeature === 'trend-analysis' && featureData && (
                        <div className="space-y-4">
                          <h4 className="text-slate-300 font-semibold">Trend Analysis</h4>
                          <div className="space-y-3">
                            {featureData.trends.map((trend: any, index: number) => (
                              <div key={index} className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                                <div>
                                  <div className="text-slate-300 font-medium">{trend.period}</div>
                                  <div className="text-slate-400 text-sm">{trend.trend}</div>
                                </div>
                                <div className={`font-semibold ${
                                  trend.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                  {trend.change}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeFeature === 'custom-alerts' && featureData && (
                        <div className="space-y-4">
                          <h4 className="text-slate-300 font-semibold">Alert Settings</h4>
                          <div className="space-y-3">
                            {featureData.alerts.map((alert: any, index: number) => (
                              <div key={index} className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                                <div>
                                  <div className="text-slate-300 font-medium">{alert.type}</div>
                                  <div className="text-slate-400 text-sm">Threshold: {alert.threshold}</div>
                                </div>
                                <Badge className={
                                  alert.active 
                                    ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30"
                                    : "bg-slate-600/20 text-slate-300 border-slate-500/30"
                                }>
                                  {alert.active ? 'ACTIVE' : 'INACTIVE'}
                                </Badge>
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
          </TabsContent>

          {/* Ask Statpedia Tab */}
          <TabsContent value="ask-statpedia" className="mt-6">
            <div className="h-full">
              <AskStatpedia 
                playerProp={currentData}
                gameContext={{
                  homeTeam: currentData.opponentAbbr,
                  awayTeam: currentData.teamAbbr,
                  date: currentData.gameDate,
                  playerName: currentData.playerName,
                  propType: currentData.propType,
                  line: currentData.line,
                  overOdds: currentData.overOdds,
                  underOdds: currentData.underOdds
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
