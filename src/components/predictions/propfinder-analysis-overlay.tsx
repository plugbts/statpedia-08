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
    console.log('🚀 RENDERING TEST MODAL for:', prediction.playerName);
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
}
