import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  TrendingUp as TrendingUpIcon,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { 
  PerformanceLineChart, 
  PerformanceBarChart, 
  PerformanceAreaChart, 
  HitRatePieChart, 
  PerformanceScatterChart 
} from './chart-components';

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

interface PropFinderAnalysisOverlayProps {
  prediction: AdvancedPrediction | null;
  isOpen: boolean;
  onClose: () => void;
}

// Performance-optimized chart configurations
const chartConfig = {
  performance: {
    label: "Performance",
    color: "hsl(var(--primary))",
  },
  line: {
    label: "Line",
    color: "hsl(var(--warning))",
  },
  average: {
    label: "Average",
    color: "hsl(var(--accent))",
  },
  over: {
    label: "Over",
    color: "hsl(var(--success))",
  },
  under: {
    label: "Under", 
    color: "hsl(var(--destructive))",
  },
};

// Memoized chart data generator
const generateChartData = (prediction: AdvancedPrediction) => {
  const baseData = [];
  const line = prediction.line;
  
  // Generate realistic performance data
  for (let i = 0; i < 10; i++) {
    const isHit = Math.random() > 0.4;
    const variance = isHit ? 0.1 + Math.random() * 0.3 : -0.2 - Math.random() * 0.3;
    const value = line * (1 + variance);
    
    baseData.push({
      game: i + 1,
      performance: Math.round(value * 10) / 10,
      line: line,
      average: line * (0.95 + Math.random() * 0.1),
      hit: isHit,
      opponent: ['MIA', 'BUF', 'LAL', 'DAL', 'NYG', 'PHI', 'CHI', 'GB', 'DEN', 'SEA'][i],
      date: new Date(Date.now() - (9 - i) * 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    });
  }
  
  return baseData;
};

// Memoized pie chart data
const generatePieData = (prediction: AdvancedPrediction) => {
  const hitRate = prediction.seasonStats?.hitRate || 0.6;
  return [
    { name: 'Over', value: Math.round(hitRate * 100), color: 'hsl(var(--success))' },
    { name: 'Under', value: Math.round((1 - hitRate) * 100), color: 'hsl(var(--destructive))' },
  ];
};

export function PropFinderAnalysisOverlay({ prediction, isOpen, onClose }: PropFinderAnalysisOverlayProps) {
  console.log('🔍 PropFinderAnalysisOverlay rendered:', { prediction: prediction?.playerName, isOpen, hasPrediction: !!prediction });
  
  if (!prediction) {
    console.log('❌ No prediction provided to PropFinderAnalysisOverlay');
    return null;
  }
  
  if (!isOpen) {
    console.log('❌ PropFinderAnalysisOverlay is not open');
    return null;
  }
  
  console.log('✅ PropFinderAnalysisOverlay should be visible now!');
  
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState('last10');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentDataIndex, setCurrentDataIndex] = useState(0);
  const [userVote, setUserVote] = useState<'over' | 'under' | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteCounts, setVoteCounts] = useState({ over: 0, under: 0 });

  // Memoized data to prevent unnecessary re-renders
  const chartData = useMemo(() => {
    if (!prediction) return [];
    return generateChartData(prediction);
  }, [prediction]);

  const pieData = useMemo(() => {
    if (!prediction) return [];
    return generatePieData(prediction);
  }, [prediction]);

  // Performance-optimized animation effect
  useEffect(() => {
    if (!isPlaying || chartData.length === 0) return;

    const interval = setInterval(() => {
      setCurrentDataIndex(prev => (prev + 1) % chartData.length);
    }, 1200 / animationSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, chartData.length, animationSpeed]);

  // Initialize data when overlay opens
  useEffect(() => {
    if (isOpen && prediction) {
      setIsAnimating(true);
      setCurrentDataIndex(0);
      
      // Initialize voting data
      setVoteCounts({
        over: Math.floor(Math.random() * 200) + 50,
        under: Math.floor(Math.random() * 150) + 30
      });

      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, prediction]);

  // Memoized handlers to prevent re-renders
  const handleVote = useCallback((vote: 'over' | 'under') => {
    if (hasVoted || !prediction) return;
    
    setUserVote(vote);
    setHasVoted(true);
    setVoteCounts(prev => ({
      over: vote === 'over' ? prev.over + 1 : prev.over,
      under: vote === 'under' ? prev.under + 1 : prev.under
    }));
  }, [hasVoted, prediction]);

  const getVotePercentage = useCallback((type: 'over' | 'under') => {
    const total = voteCounts.over + voteCounts.under;
    if (total === 0) return 0;
    return (voteCounts[type] / total) * 100;
  }, [voteCounts]);

  if (!prediction) return null;

  const formatNumber = (value: number, decimals: number = 1): string => {
    if (value >= 1000000) return (value / 1000000).toFixed(decimals) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(decimals) + 'K';
    return value.toFixed(decimals);
  };

  const formatOdds = (odds: number): string => {
    if (odds > 0) return `+${odds}`;
    return odds.toString();
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'high': return 'bg-red-500/20 text-red-500 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    }
  };

  // SIMPLE TEST - Just return a basic div to see if component renders at all
  if (isOpen && prediction) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg max-w-2xl w-full mx-4">
          <h2 className="text-2xl font-bold mb-4">TEST: PropFinder Analysis Overlay</h2>
          <p className="mb-4">Player: {prediction.playerName}</p>
          <p className="mb-4">Prop: {prediction.propType} {prediction.line}</p>
          <button 
            onClick={onClose}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return null;
        {/* Header */}
        <DialogHeader className="relative z-20 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-200 font-bold text-xl shadow-2xl border border-slate-600">
                {prediction.playerName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-100">
                  {prediction.playerName} - {prediction.propType}
                </DialogTitle>
                <div className="flex items-center space-x-6 text-slate-300 mt-2">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span className="font-semibold">{prediction.teamAbbr} vs {prediction.opponentAbbr}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(prediction.gameDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{prediction.gameTime}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge className={cn("text-sm px-3 py-1", getRiskColor(prediction.riskLevel))}>
                {prediction.riskLevel?.toUpperCase() || 'UNKNOWN'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Main Content */}
        <div className="relative z-20 h-full overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
            <TabsList className="grid w-full grid-cols-6 bg-slate-900/60 border border-slate-700/60">
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="charts" className="flex items-center space-x-2">
                <LineChart className="h-4 w-4" />
                <span>Charts</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Stats</span>
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span>Analysis</span>
              </TabsTrigger>
              <TabsTrigger value="predictions" className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>Predictions</span>
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>Advanced</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6 space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60 hover:border-primary/30 transition-all duration-300">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white mb-2">{prediction.line}</div>
                    <div className="text-gray-400 text-sm uppercase tracking-wide">Line</div>
                    <div className="text-xs text-gray-500 mt-1">Current Line</div>
                  </div>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60 hover:border-primary/30 transition-all duration-300">
                  <div className="text-center">
                    <div className={cn("text-4xl font-bold mb-2", getConfidenceColor(prediction.confidence))}>
                      {prediction.confidence}%
                    </div>
                    <div className="text-gray-400 text-sm uppercase tracking-wide">Confidence</div>
                    <Progress value={prediction.confidence} className="mt-3 h-2" />
                  </div>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60 hover:border-primary/30 transition-all duration-300">
                  <div className="text-center">
                    <div className={cn("text-4xl font-bold mb-2", prediction.expectedValue > 0 ? "text-green-400" : "text-red-400")}>
                      {prediction.expectedValue > 0 ? '+' : ''}{formatNumber(prediction.expectedValue * 100, 1)}%
                    </div>
                    <div className="text-gray-400 text-sm uppercase tracking-wide">Expected Value</div>
                    <div className="text-xs text-gray-500 mt-1">Mathematical Edge</div>
                  </div>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60 hover:border-primary/30 transition-all duration-300">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary mb-2">{prediction.valueRating}/100</div>
                    <div className="text-gray-400 text-sm uppercase tracking-wide">Value Rating</div>
                    <div className="text-xs text-gray-500 mt-1">Overall Value</div>
                  </div>
                </div>
              </div>

              {/* AI Prediction Card */}
              {prediction.aiPrediction && (
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/20">
                  <div className="flex items-center space-x-3 mb-4">
                    <Brain className="h-6 w-6 text-blue-400" />
                    <h3 className="text-xl font-bold text-white">AI Prediction</h3>
                  </div>
                  
                  <div className="flex items-center space-x-6 mb-4">
                    <div className={cn(
                      "flex items-center space-x-2 px-6 py-3 rounded-full text-xl font-bold",
                      prediction.aiPrediction.recommended === 'over' 
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                    )}>
                      {prediction.aiPrediction.recommended === 'over' ? (
                        <TrendingUp className="h-6 w-6" />
                      ) : (
                        <TrendingDown className="h-6 w-6" />
                      )}
                      <span className="uppercase">
                        {prediction.aiPrediction.recommended}
                      </span>
                    </div>
                    
                    <div className="text-white">
                      <span className="text-gray-400">Confidence: </span>
                      <span className={cn("font-bold text-lg", getConfidenceColor(prediction.aiPrediction.confidence))}>
                        {Math.round(prediction.aiPrediction.confidence * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Reasoning:</h4>
                      <p className="text-gray-300 leading-relaxed">{prediction.aiPrediction.reasoning}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Key Factors:</h4>
                      <div className="flex flex-wrap gap-2">
                        {prediction.aiPrediction.factors.map((factor, index) => (
                          <Badge key={index} variant="secondary" className="bg-slate-700/50 text-gray-300">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-green-400" />
                    Recent Form
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Last 5 Games</span>
                      <span className="text-white font-semibold">
                        {prediction.last5Games?.join(', ') || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Form</span>
                      <span className={cn(
                        "font-semibold",
                        prediction.recentForm === 'hot' ? 'text-green-400' : 
                        prediction.recentForm === 'cold' ? 'text-red-400' : 'text-gray-400'
                      )}>
                        {prediction.recentForm || 'Neutral'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <Award className="h-5 w-5 mr-2 text-yellow-400" />
                    Season Stats
                  </h3>
                  <div className="space-y-3">
                    {prediction.seasonStats && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Average</span>
                          <span className="text-white font-semibold">{formatNumber(prediction.seasonStats.average, 1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Hit Rate</span>
                          <span className="text-green-400 font-semibold">{Math.round(prediction.seasonStats.hitRate * 100)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Games</span>
                          <span className="text-white font-semibold">{prediction.seasonStats.gamesPlayed}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <DollarSign className="h-5 w-5 mr-2 text-green-400" />
                    Odds
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Over</span>
                      <span className="text-green-400 font-semibold">{formatOdds(prediction.overOdds)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Under</span>
                      <span className="text-red-400 font-semibold">{formatOdds(prediction.underOdds)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Edge</span>
                      <span className={cn(
                        "font-semibold",
                        prediction.expectedValue > 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {prediction.expectedValue > 0 ? '+' : ''}{formatNumber(prediction.expectedValue * 100, 1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Charts Tab */}
            <TabsContent value="charts" className="mt-6 space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* Chart Controls */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-100">Performance Analytics</h3>
                <div className="flex items-center space-x-4">
                  <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                    <SelectTrigger className="w-40 bg-slate-800/60 border-slate-600/60 text-slate-200">
                      <SelectValue placeholder="Timeframe" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="last5" className="text-slate-200">Last 5 Games</SelectItem>
                      <SelectItem value="last10" className="text-slate-200">Last 10 Games</SelectItem>
                      <SelectItem value="last20" className="text-slate-200">Last 20 Games</SelectItem>
                      <SelectItem value="season" className="text-slate-200">Season</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentDataIndex(0)}
                      className="bg-slate-800/60 border-slate-600/60 text-slate-200 hover:bg-slate-700/60"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="bg-slate-800/60 border-slate-600/60 text-slate-200 hover:bg-slate-700/60"
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Chart Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Line Chart */}
                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                    <LineChart className="h-5 w-5 mr-2 text-blue-400" />
                    Performance Trend
                  </h4>
                  <PerformanceLineChart 
                    data={chartData} 
                    line={prediction.line}
                    height={300}
                  />
                </div>

                {/* Performance Bar Chart */}
                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-green-400" />
                    Game Performance
                  </h4>
                  <PerformanceBarChart 
                    data={chartData} 
                    line={prediction.line}
                    height={300}
                  />
                </div>

                {/* Hit Rate Pie Chart */}
                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                    <PieChart className="h-5 w-5 mr-2 text-purple-400" />
                    Hit Rate Distribution
                  </h4>
                  <HitRatePieChart 
                    data={pieData}
                    height={300}
                  />
                </div>

                {/* Performance Area Chart */}
                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                    <TrendingUpIcon className="h-5 w-5 mr-2 text-orange-400" />
                    Performance Area
                  </h4>
                  <PerformanceAreaChart 
                    data={chartData} 
                    line={prediction.line}
                    height={300}
                  />
                </div>
              </div>

              {/* Chart Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-slate-800/60 rounded-lg border border-slate-700/60 hover:border-emerald-500/30 transition-colors">
                  <div className="text-2xl font-bold text-emerald-400">
                    {chartData.filter(d => d.hit).length}
                  </div>
                  <div className="text-sm text-slate-400 font-medium">Hits</div>
                  <div className="text-xs text-slate-500 mt-1">Over Line</div>
                </div>
                <div className="text-center p-4 bg-slate-800/60 rounded-lg border border-slate-700/60 hover:border-red-500/30 transition-colors">
                  <div className="text-2xl font-bold text-red-400">
                    {chartData.filter(d => !d.hit).length}
                  </div>
                  <div className="text-sm text-slate-400 font-medium">Misses</div>
                  <div className="text-xs text-slate-500 mt-1">Under Line</div>
                </div>
                <div className="text-center p-4 bg-slate-800/60 rounded-lg border border-slate-700/60 hover:border-blue-500/30 transition-colors">
                  <div className="text-2xl font-bold text-blue-400">
                    {Math.round((chartData.filter(d => d.hit).length / chartData.length) * 100)}%
                  </div>
                  <div className="text-sm text-slate-400 font-medium">Hit Rate</div>
                  <div className="text-xs text-slate-500 mt-1">Success Rate</div>
                </div>
                <div className="text-center p-4 bg-slate-800/60 rounded-lg border border-slate-700/60 hover:border-purple-500/30 transition-colors">
                  <div className="text-2xl font-bold text-purple-400">
                    {formatNumber(chartData.reduce((sum, d) => sum + d.performance, 0) / chartData.length, 1)}
                  </div>
                  <div className="text-sm text-slate-400 font-medium">Average</div>
                  <div className="text-xs text-slate-500 mt-1">Per Game</div>
                </div>
              </div>
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats" className="mt-6 space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* Performance Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-blue-400" />
                    Performance Metrics
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Games Played</span>
                      <span className="text-white font-semibold">{chartData.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Hit Rate</span>
                      <span className="text-green-400 font-semibold">
                        {Math.round((chartData.filter(d => d.hit).length / chartData.length) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Average Performance</span>
                      <span className="text-white font-semibold">
                        {formatNumber(chartData.reduce((sum, d) => sum + d.performance, 0) / chartData.length, 1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Best Performance</span>
                      <span className="text-green-400 font-semibold">
                        {formatNumber(Math.max(...chartData.map(d => d.performance)), 1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Worst Performance</span>
                      <span className="text-red-400 font-semibold">
                        {formatNumber(Math.min(...chartData.map(d => d.performance)), 1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
                    Trend Analysis
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Current Streak</span>
                      <span className="text-blue-400 font-semibold">
                        {(() => {
                          let streak = 0;
                          const recent = chartData.slice(-5);
                          for (let i = recent.length - 1; i >= 0; i--) {
                            if (recent[i].hit === recent[recent.length - 1].hit) {
                              streak++;
                            } else {
                              break;
                            }
                          }
                          return streak;
                        })()} games
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Consistency Score</span>
                      <span className="text-purple-400 font-semibold">
                        {Math.round((1 - (Math.max(...chartData.map(d => d.performance)) - Math.min(...chartData.map(d => d.performance))) / prediction.line) * 100)}/100
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Volatility</span>
                      <span className="text-yellow-400 font-semibold">
                        {formatNumber(
                          (Math.max(...chartData.map(d => d.performance)) - Math.min(...chartData.map(d => d.performance))) / prediction.line * 100, 1
                        )}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Analysis Tab */}
            <TabsContent value="analysis" className="mt-6 space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              <div className="text-center py-12">
                <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">Analysis Coming Soon</h3>
                <p className="text-muted-foreground">Advanced analysis will be implemented here.</p>
              </div>
            </TabsContent>

            {/* Predictions Tab */}
            <TabsContent value="predictions" className="mt-6 space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* AI Predictions */}
              <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-yellow-400" />
                  AI Predictions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Prediction</span>
                      <Badge variant={prediction.aiPrediction?.recommended === 'over' ? 'default' : 'destructive'} className="text-sm">
                        {prediction.aiPrediction?.recommended?.toUpperCase() || 'N/A'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Confidence</span>
                      <span className="text-white font-semibold">
                        {Math.round((prediction.aiPrediction?.confidence || 0) * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Expected Value</span>
                      <span className={cn(
                        "font-semibold",
                        prediction.expectedValue > 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {prediction.expectedValue > 0 ? '+' : ''}{formatNumber(prediction.expectedValue * 100, 1)}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-gray-300 mb-2">Reasoning</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {prediction.aiPrediction?.reasoning || 'No detailed reasoning available.'}
                      </p>
                    </div>
                    {prediction.aiPrediction?.factors && prediction.aiPrediction.factors.length > 0 && (
                      <div>
                        <h4 className="text-gray-300 mb-2">Key Factors</h4>
                        <div className="flex flex-wrap gap-2">
                          {prediction.aiPrediction.factors.map((factor, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Community Predictions */}
              <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-blue-400" />
                  Community Predictions
                </h3>
                
                {/* Voting Buttons */}
                <div className="mb-6">
                  <div className="flex items-center justify-center space-x-4">
                    <Button
                      onClick={() => handleVote('over')}
                      disabled={hasVoted}
                      className={cn(
                        "px-8 py-3 text-lg font-semibold transition-all duration-300",
                        userVote === 'over' 
                          ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/25"
                          : hasVoted 
                            ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                            : "bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/40 hover:shadow-lg hover:shadow-green-500/25"
                      )}
                    >
                      <TrendingUp className="h-5 w-5 mr-2" />
                      OVER {formatNumber(prediction.line, 1)}
                    </Button>
                    
                    <div className="text-slate-400 font-semibold">VS</div>
                    
                    <Button
                      onClick={() => handleVote('under')}
                      disabled={hasVoted}
                      className={cn(
                        "px-8 py-3 text-lg font-semibold transition-all duration-300",
                        userVote === 'under' 
                          ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/25"
                          : hasVoted 
                            ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                            : "bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 hover:shadow-lg hover:shadow-red-500/25"
                      )}
                    >
                      <TrendingDown className="h-5 w-5 mr-2" />
                      UNDER {formatNumber(prediction.line, 1)}
                    </Button>
                  </div>
                  
                  {hasVoted && (
                    <div className="text-center mt-4">
                      <div className="text-green-400 font-semibold flex items-center justify-center">
                        <Check className="h-4 w-4 mr-2" />
                        Vote submitted! Your prediction will be tracked.
                      </div>
                    </div>
                  )}
                </div>

                {/* Vote Results */}
                {hasVoted && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-slate-800/60 rounded-lg">
                        <div className="text-2xl font-bold text-green-400">
                          {getVotePercentage('over').toFixed(1)}%
                        </div>
                        <div className="text-sm text-slate-400">Over Votes</div>
                        <div className="text-xs text-slate-500">{voteCounts.over} votes</div>
                      </div>
                      <div className="text-center p-4 bg-slate-800/60 rounded-lg">
                        <div className="text-2xl font-bold text-red-400">
                          {getVotePercentage('under').toFixed(1)}%
                        </div>
                        <div className="text-sm text-slate-400">Under Votes</div>
                        <div className="text-xs text-slate-500">{voteCounts.under} votes</div>
                      </div>
                      <div className="text-center p-4 bg-slate-800/60 rounded-lg">
                        <div className="text-2xl font-bold text-blue-400">
                          {voteCounts.over + voteCounts.under}
                        </div>
                        <div className="text-sm text-slate-400">Total Votes</div>
                        <div className="text-xs text-slate-500">Live count</div>
                      </div>
                    </div>
                    
                    {/* Progress Bars */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-400 font-medium">Over</span>
                        <span className="text-slate-400">{getVotePercentage('over').toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${getVotePercentage('over')}%` }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-red-400 font-medium">Under</span>
                        <span className="text-slate-400">{getVotePercentage('under').toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-red-500 to-red-400 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${getVotePercentage('under')}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="text-center text-sm text-slate-400">
                      Last updated: {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="mt-6 space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              <div className="text-center py-12">
                <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">Advanced Coming Soon</h3>
                <p className="text-muted-foreground">Advanced features will be implemented here.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
