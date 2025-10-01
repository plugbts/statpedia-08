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
import { consistentPropsService } from '@/services/consistent-props-service';
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
const generatePerformanceMetrics = (gameHistory: GameHistoryEntry[]): PerformanceMetrics => {
  const recentGames = gameHistory.slice(0, 5);
  const hitRate = recentGames.filter(g => g.hit).length / recentGames.length;
  
  return {
    currentStreak: Math.floor(Math.random() * 5) + 1,
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

  // Enhanced data generation
  const enhancedData = useMemo(() => {
    if (!prediction) return null;
    
    const gameHistory = generateEnhancedGameHistory(prediction);
    const performanceMetrics = generatePerformanceMetrics(gameHistory);
    
    // Check if prediction already has enhanced data
    const isEnhanced = 'gameHistory' in prediction;
    
    if (isEnhanced) {
      return prediction as EnhancedPrediction;
    }
    
    // Convert AdvancedPrediction to EnhancedPrediction
    return {
      ...prediction,
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

  if (!prediction || !enhancedData) {
    return null;
  }

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
      }
    } catch (error) {
      console.error('Failed to update odds for line:', error);
    } finally {
      setIsUpdatingOdds(false);
    }
  };

  const resetLineAdjustment = () => {
    setAdjustedLine(null);
    setAdjustedOdds(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 overflow-hidden">
        {/* Enhanced Header with Gradient */}
        <DialogHeader className="relative pb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-emerald-600/20 rounded-t-lg" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Advanced Analysis
                </DialogTitle>
                <p className="text-slate-400 text-sm">
                  {enhancedData.playerName} • {enhancedData.teamAbbr} vs {enhancedData.opponentAbbr}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-700/50"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Enhanced Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800/50 border border-slate-700 rounded-lg p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <Eye className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <LineChart className="w-4 h-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <Brain className="w-4 h-4 mr-2" />
              Advanced
            </TabsTrigger>
            <TabsTrigger value="features" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" />
              Features
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Key Metrics */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-400" />
                    Key Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Confidence</span>
                    <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30">
                      {Math.round(enhancedData.confidence * 100)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Expected Value</span>
                    <Badge className={cn(
                      "border",
                      enhancedData.expectedValue > 0 
                        ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30"
                        : "bg-red-600/20 text-red-300 border-red-500/30"
                    )}>
                      {enhancedData.expectedValue > 0 ? '+' : ''}{Math.round(enhancedData.expectedValue * 100)}%
                    </Badge>
                  </div>
                  
                  {/* Line Adjustment Interface */}
                  <div className="pt-4 border-t border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-slate-400 text-sm">Adjust Line</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLineAdjustment(enhancedData.line - 0.5)}
                          disabled={isUpdatingOdds}
                          className="text-slate-400 border-slate-600 hover:bg-slate-700"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-white font-bold min-w-[60px] text-center">
                          {adjustedLine !== null ? adjustedLine : enhancedData.line}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLineAdjustment(enhancedData.line + 0.5)}
                          disabled={isUpdatingOdds}
                          className="text-slate-400 border-slate-600 hover:bg-slate-700"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        {adjustedLine !== null && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={resetLineAdjustment}
                            className="text-slate-400 hover:text-white"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {adjustedOdds && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-800/50 rounded p-2">
                          <div className="text-slate-400">Over</div>
                          <div className="text-emerald-400 font-bold">{adjustedOdds.over}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded p-2">
                          <div className="text-slate-400">Under</div>
                          <div className="text-red-400 font-bold">{adjustedOdds.under}</div>
                        </div>
                      </div>
                    )}
                    
                    {isUpdatingOdds && (
                      <div className="text-center text-slate-400 text-xs mt-2">
                        <RotateCcw className="w-3 h-3 animate-spin inline mr-1" />
                        Updating odds...
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Risk Level</span>
                    <Badge className={cn(
                      "border",
                      enhancedData.riskLevel === 'low' ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30" :
                      enhancedData.riskLevel === 'medium' ? "bg-yellow-600/20 text-yellow-300 border-yellow-500/30" :
                      "bg-red-600/20 text-red-300 border-red-500/30"
                    )}>
                      {enhancedData.riskLevel?.toUpperCase() || 'UNKNOWN'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Summary */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Current Streak</span>
                    <span className="text-white font-semibold">{enhancedData.performanceMetrics?.currentStreak || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Recent Form</span>
                    <Badge className={cn(
                      "border",
                      enhancedData.performanceMetrics?.recentForm === 'hot' ? "bg-red-600/20 text-red-300 border-red-500/30" :
                      enhancedData.performanceMetrics?.recentForm === 'cold' ? "bg-blue-600/20 text-blue-300 border-blue-500/30" :
                      "bg-slate-600/20 text-slate-300 border-slate-500/30"
                    )}>
                      {enhancedData.performanceMetrics?.recentForm?.toUpperCase() || 'AVERAGE'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Consistency</span>
                    <Progress 
                      value={(enhancedData.performanceMetrics?.consistency || 0) * 100} 
                      className="w-20"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* AI Prediction */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  AI Prediction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center">
                  <Badge className={cn(
                    "text-lg px-4 py-2 border-2",
                    enhancedData.aiPrediction?.recommended === 'over' 
                      ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/50"
                      : "bg-red-600/20 text-red-300 border-red-500/50"
                  )}>
                    {enhancedData.aiPrediction?.recommended === 'over' ? (
                      <ArrowUp className="w-4 h-4 mr-2" />
                    ) : (
                      <ArrowDown className="w-4 h-4 mr-2" />
                    )}
                    {enhancedData.aiPrediction?.recommended?.toUpperCase() || 'OVER'}
                  </Badge>
                </div>
                <div className="text-center">
                  <p className="text-slate-400 text-sm">Confidence</p>
                  <p className="text-white font-bold">
                    {Math.round((enhancedData.aiPrediction?.confidence || 0) * 100)}%
                  </p>
                </div>
                
                {/* Confidence Factors */}
                {enhancedData.confidenceFactors && enhancedData.confidenceFactors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-slate-400 text-xs font-semibold">Confidence Factors:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {enhancedData.confidenceFactors.map((factor, index) => (
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
                  data={enhancedData.gameHistory} 
                  line={enhancedData.line} 
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
                    data={enhancedData.gameHistory} 
                    line={enhancedData.line} 
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
                    data={enhancedData.gameHistory} 
                    line={enhancedData.line} 
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
                      {enhancedData.gameHistory?.map((game, index) => (
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
                    <span className="text-slate-400">Consistency</span>
                    <Progress value={(enhancedData.performanceMetrics?.consistency || 0) * 100} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Volatility</span>
                    <Progress value={(enhancedData.performanceMetrics?.volatility || 0) * 100} />
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

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6 mt-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200">Advanced Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-slate-300 font-semibold mb-2">AI Reasoning</h4>
                  <p className="text-slate-400 text-sm">{enhancedData.advancedReasoning}</p>
                </div>
                <div>
                  <h4 className="text-slate-300 font-semibold mb-2">Key Factors</h4>
                  <div className="flex flex-wrap gap-2">
                    {enhancedData.factors?.map((factor, index) => (
                      <Badge key={index} variant="outline" className="text-slate-300 border-slate-600">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-slate-300 font-semibold mb-2">Matchup Analysis</h4>
                  <p className="text-slate-400 text-sm">{enhancedData.matchupAnalysis}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6 mt-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200">Advanced Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300">
                    <Brain className="w-4 h-4 mr-2" />
                    AI Insights
                  </Button>
                  <Button className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300">
                    <Target className="w-4 h-4 mr-2" />
                    Value Finder
                  </Button>
                  <Button className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Trend Analysis
                  </Button>
                  <Button className="bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300">
                    <Settings className="w-4 h-4 mr-2" />
                    Custom Alerts
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
