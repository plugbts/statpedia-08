import React, { useState, useEffect } from 'react';
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
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerProp {
  id: string;
  playerId: number;
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
  confidence?: number;
  expectedValue?: number;
  recentForm?: string;
  last5Games?: number[];
  seasonStats?: {
    average: number;
    median: number;
    gamesPlayed: number;
    hitRate: number;
  };
  aiPrediction?: {
    recommended: 'over' | 'under';
    confidence: number;
    reasoning: string;
    factors: string[];
  };
}

interface AnalysisOverlayProps {
  prop: PlayerProp | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AnalysisOverlay3D({ prop, isOpen, onClose }: AnalysisOverlayProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAnimating, setIsAnimating] = useState(false);
  const [sparklePositions, setSparklePositions] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  
  // Interactive graph state
  const [selectedPropType, setSelectedPropType] = useState(prop?.propType || 'All');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('last5');
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [graphData, setGraphData] = useState<any[]>([]);
  const [currentDataIndex, setCurrentDataIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      
      // Generate sparkles
      const sparkles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2000
      }));
      setSparklePositions(sparkles);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Generate mock data for different prop types and time periods
  useEffect(() => {
    if (!prop) return;

    const generateData = () => {
      const baseValue = prop.line;
      const dataPoints = {
        last5: 5,
        last10: 10,
        last20: 20,
        h2h: 8,
        season: 15
      };

      const count = dataPoints[selectedTimePeriod as keyof typeof dataPoints] || 5;
      const data = [];

      for (let i = 0; i < count; i++) {
        const variation = (Math.random() - 0.5) * baseValue * 0.4;
        const value = Math.max(0, baseValue + variation);
        const date = new Date();
        date.setDate(date.getDate() - (count - i - 1));
        
        data.push({
          id: i,
          value: value,
          date: date,
          game: `Game ${i + 1}`,
          opponent: i % 2 === 0 ? 'Team A' : 'Team B',
          hit: value > prop.line,
          performance: value / prop.line
        });
      }

      setGraphData(data);
    };

    generateData();
  }, [prop, selectedPropType, selectedTimePeriod]);

  // Animation effect
  useEffect(() => {
    if (!isPlaying || graphData.length === 0) return;

    const interval = setInterval(() => {
      setCurrentDataIndex(prev => (prev + 1) % graphData.length);
    }, 1000 / animationSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, graphData.length, animationSpeed]);

  if (!prop) return null;

  const formatNumber = (value: number, decimals: number = 1): string => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(decimals) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(decimals) + 'K';
    }
    return value.toFixed(decimals);
  };

  const formatOdds = (odds: number): string => {
    if (odds > 0) return `+${odds}`;
    return odds.toString();
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getEVColor = (ev: number): string => {
    if (ev > 0.05) return 'text-green-400';
    if (ev > 0) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getFormColor = (form: string): string => {
    switch (form.toLowerCase()) {
      case 'hot': return 'text-green-400';
      case 'cold': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getRiskLevel = (confidence: number, ev: number): { level: string; color: string; description: string } => {
    if (confidence >= 0.8 && ev > 0.05) return { level: 'Low', color: 'text-green-400', description: 'High confidence, positive EV' };
    if (confidence >= 0.6 && ev > 0) return { level: 'Medium', color: 'text-yellow-400', description: 'Moderate confidence, slight positive EV' };
    if (confidence < 0.4 || ev < -0.05) return { level: 'High', color: 'text-red-400', description: 'Low confidence or negative EV' };
    return { level: 'Medium', color: 'text-yellow-400', description: 'Moderate risk level' };
  };

  const risk = getRiskLevel(prop.confidence || 0, prop.expectedValue || 0);

  return (
    <>
      <style jsx>{`
        @keyframes wave {
          0%, 100% { transform: translateY(0px) scaleY(1); }
          25% { transform: translateY(-2px) scaleY(1.2); }
          50% { transform: translateY(0px) scaleY(1); }
          75% { transform: translateY(2px) scaleY(0.8); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        .wave-animation {
          animation: wave 3s ease-in-out infinite;
        }
        .float-animation {
          animation: float 2s ease-in-out infinite;
        }
      `}</style>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 border border-slate-800/80 shadow-2xl">
        {/* Sparkle Animation Overlay */}
        {isAnimating && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {sparklePositions.map((sparkle) => (
              <div
                key={sparkle.id}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
                style={{
                  left: `${sparkle.x}%`,
                  top: `${sparkle.y}%`,
                  animationDelay: `${sparkle.delay}ms`,
                  animationDuration: '2s'
                }}
              />
            ))}
          </div>
        )}

        {/* Header */}
        <DialogHeader className="relative z-20 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-200 font-bold text-lg shadow-2xl border border-slate-600">
                {prop.playerName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-100">
                  {prop.playerName} - {prop.propType}
                </DialogTitle>
                <div className="flex items-center space-x-4 text-slate-300 mt-2">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span className="font-semibold">{prop.teamAbbr} vs {prop.opponentAbbr}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(prop.gameDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{prop.gameTime}</span>
                  </div>
                </div>
              </div>
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
              <TabsTrigger value="analysis" className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Analysis</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>History</span>
              </TabsTrigger>
              <TabsTrigger value="odds" className="flex items-center space-x-2">
                <Award className="h-4 w-4" />
                <span>Odds</span>
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

            <TabsContent value="overview" className="mt-6 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {/* Key Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Line Value */}
                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">{prop.line}</div>
                    <div className="text-gray-400 text-sm uppercase tracking-wide">Line</div>
                  </div>
                </div>

                {/* Confidence */}
                {prop.confidence && (
                  <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                    <div className="text-center">
                      <div className={cn("text-3xl font-bold mb-2", getConfidenceColor(prop.confidence))}>
                        {Math.round(prop.confidence * 100)}%
                      </div>
                      <div className="text-gray-400 text-sm uppercase tracking-wide">Confidence</div>
                      <Progress 
                        value={prop.confidence * 100} 
                        className="mt-3 h-2"
                      />
                    </div>
                  </div>
                )}

                {/* Expected Value */}
                {prop.expectedValue !== undefined && (
                  <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                    <div className="text-center">
                      <div className={cn("text-3xl font-bold mb-2", getEVColor(prop.expectedValue))}>
                        {prop.expectedValue > 0 ? '+' : ''}{formatNumber(prop.expectedValue * 100, 1)}%
                      </div>
                      <div className="text-gray-400 text-sm uppercase tracking-wide">Expected Value</div>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Prediction */}
              {prop.aiPrediction && (
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/20">
                  <div className="flex items-center space-x-3 mb-4">
                    <Sparkles className="h-6 w-6 text-blue-400" />
                    <h3 className="text-xl font-bold text-white">AI Prediction</h3>
                  </div>
                  
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={cn(
                      "flex items-center space-x-2 px-4 py-2 rounded-full text-lg font-bold",
                      prop.aiPrediction.recommended === 'over' 
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                    )}>
                      {prop.aiPrediction.recommended === 'over' ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : (
                        <TrendingDown className="h-5 w-5" />
                      )}
                      <span className="uppercase">
                        {prop.aiPrediction.recommended}
                      </span>
                    </div>
                    
                    <div className="text-white">
                      <span className="text-gray-400">Confidence: </span>
                      <span className={cn("font-bold", getConfidenceColor(prop.aiPrediction.confidence))}>
                        {Math.round(prop.aiPrediction.confidence * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Reasoning:</h4>
                      <p className="text-gray-300">{prop.aiPrediction.reasoning}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Key Factors:</h4>
                      <div className="flex flex-wrap gap-2">
                        {prop.aiPrediction.factors.map((factor, index) => (
                          <Badge key={index} variant="secondary" className="bg-slate-700/50 text-gray-300">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Assessment */}
              <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                <h3 className="text-xl font-bold text-white mb-4">Risk Assessment</h3>
                <div className="flex items-center space-x-4">
                  <div className={cn("text-2xl font-bold", risk.color)}>
                    {risk.level}
                  </div>
                  <div className="text-gray-300">
                    {risk.description}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="mt-6 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {/* Detailed Analysis */}
              <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                <h3 className="text-xl font-bold text-white mb-4">Detailed Analysis</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Recent Form</h4>
                      <div className={cn("flex items-center space-x-2", getFormColor(prop.recentForm || 'neutral'))}>
                        <Activity className="h-4 w-4" />
                        <span className="font-medium">{prop.recentForm || 'Neutral'}</span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Season Stats</h4>
                      {prop.seasonStats && (
                        <div className="space-y-1 text-sm text-gray-300">
                          <div>Average: {formatNumber(prop.seasonStats.average, 1)}</div>
                          <div>Hit Rate: {Math.round(prop.seasonStats.hitRate * 100)}%</div>
                          <div>Games: {prop.seasonStats.gamesPlayed}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-6 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {/* Interactive 3D Graph */}
              <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-100">Performance History</h3>
                  <div className="flex items-center space-x-4">
                    {/* Prop Type Selector */}
                    <Select value={selectedPropType} onValueChange={setSelectedPropType}>
                      <SelectTrigger className="w-40 bg-slate-800/60 border-slate-600/60 text-slate-200">
                        <SelectValue placeholder="Prop Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="All" className="text-slate-200">All Props</SelectItem>
                        <SelectItem value="Passing Yards" className="text-slate-200">Passing Yards</SelectItem>
                        <SelectItem value="Rushing Yards" className="text-slate-200">Rushing Yards</SelectItem>
                        <SelectItem value="Receiving Yards" className="text-slate-200">Receiving Yards</SelectItem>
                        <SelectItem value="Points" className="text-slate-200">Points</SelectItem>
                        <SelectItem value="Rebounds" className="text-slate-200">Rebounds</SelectItem>
                        <SelectItem value="Assists" className="text-slate-200">Assists</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Time Period Selector */}
                    <Select value={selectedTimePeriod} onValueChange={setSelectedTimePeriod}>
                      <SelectTrigger className="w-32 bg-slate-800/60 border-slate-600/60 text-slate-200">
                        <SelectValue placeholder="Period" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="last5" className="text-slate-200">Last 5</SelectItem>
                        <SelectItem value="last10" className="text-slate-200">Last 10</SelectItem>
                        <SelectItem value="last20" className="text-slate-200">Last 20</SelectItem>
                        <SelectItem value="h2h" className="text-slate-200">H2H</SelectItem>
                        <SelectItem value="season" className="text-slate-200">Season</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Animation Controls */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="bg-slate-800/60 border-slate-600/60 text-slate-200 hover:bg-slate-700/60"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentDataIndex(0)}
                        className="bg-slate-800/60 border-slate-600/60 text-slate-200 hover:bg-slate-700/60"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 3D Graph Container */}
                <div className="relative h-72 bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden">
                  {/* 3D Graph Bars */}
                  <div className="absolute inset-0 flex items-end justify-center space-x-2 p-6">
                    {graphData.map((dataPoint, index) => {
                      const height = (dataPoint.value / Math.max(...graphData.map(d => d.value))) * 100;
                      const isActive = index <= currentDataIndex;
                      const isCurrent = index === currentDataIndex;
                      
                      return (
                        <div
                          key={dataPoint.id}
                          className="relative flex flex-col items-center group"
                          style={{
                            transform: `perspective(1000px) rotateX(${isActive ? 0 : 45}deg) translateZ(${isActive ? 0 : -20}px)`,
                            transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                            opacity: isActive ? 1 : 0.3
                          }}
                        >
                          {/* 3D Bar */}
                          <div
                            className={cn(
                              "relative w-8 rounded-t-lg transition-all duration-1000 ease-out",
                              "bg-gradient-to-t from-slate-700 to-slate-500",
                              "shadow-lg hover:shadow-xl",
                              isCurrent && "ring-2 ring-blue-400/50 shadow-blue-400/20",
                              dataPoint.hit ? "from-green-600 to-green-400" : "from-red-600 to-red-400"
                            )}
                            style={{
                              height: `${height}%`,
                              minHeight: '20px',
                              transform: isCurrent ? 'scale(1.1) translateY(-5px)' : 'scale(1)',
                              boxShadow: isCurrent 
                                ? '0 0 20px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                                : 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                            }}
                          >
                            {/* Bar Value */}
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-slate-200 whitespace-nowrap">
                              {formatNumber(dataPoint.value, 1)}
                            </div>
                            
                            {/* Performance Indicator */}
                            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                dataPoint.hit ? "bg-green-400" : "bg-red-400",
                                isCurrent && "animate-pulse"
                              )} />
                            </div>
                          </div>

                          {/* Game Info */}
                          <div className="mt-2 text-center">
                            <div className="text-xs text-slate-400 font-medium">
                              {dataPoint.game}
                            </div>
                            <div className="text-xs text-slate-500">
                              {dataPoint.opponent}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Animated Reference Line */}
                  <div 
                    className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-400/70 to-transparent wave-animation"
                    style={{ 
                      bottom: `${100 - (prop.line / Math.max(...graphData.map(d => d.value))) * 100}%`
                    }}
                  >
                    <div className="absolute -left-8 -top-2 text-xs text-slate-400 font-medium float-animation">
                      Line: {formatNumber(prop.line, 1)}
                    </div>
                    {/* Animated dots along the line */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-slate-400/80 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
                      <div className="w-1 h-1 bg-slate-400/60 rounded-full animate-ping absolute left-1/4" style={{ animationDelay: '0.5s' }} />
                      <div className="w-1 h-1 bg-slate-400/60 rounded-full animate-ping absolute right-1/4" style={{ animationDelay: '1s' }} />
                    </div>
                  </div>

                  {/* 3D Grid Lines */}
                  <div className="absolute inset-0 pointer-events-none">
                    {[0, 25, 50, 75, 100].map((percent) => (
                      <div
                        key={percent}
                        className="absolute left-0 right-0 h-px bg-slate-700/30"
                        style={{ bottom: `${percent}%` }}
                      />
                    ))}
                  </div>

                  {/* Animated Particles */}
                  {isPlaying && (
                    <div className="absolute inset-0 pointer-events-none">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-1 h-1 bg-blue-400/60 rounded-full animate-ping"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${1 + Math.random() * 2}s`
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Stats Summary */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                    <div className="text-2xl font-bold text-green-400">
                      {graphData.filter(d => d.hit).length}
                    </div>
                    <div className="text-sm text-slate-400">Hits</div>
                  </div>
                  <div className="text-center p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                    <div className="text-2xl font-bold text-red-400">
                      {graphData.filter(d => !d.hit).length}
                    </div>
                    <div className="text-sm text-slate-400">Misses</div>
                  </div>
                  <div className="text-center p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                    <div className="text-2xl font-bold text-blue-400">
                      {formatPercentage(graphData.filter(d => d.hit).length / graphData.length)}
                    </div>
                    <div className="text-sm text-slate-400">Hit Rate</div>
                  </div>
                  <div className="text-center p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                    <div className="text-2xl font-bold text-purple-400">
                      {formatNumber(graphData.reduce((sum, d) => sum + d.value, 0) / graphData.length, 1)}
                    </div>
                    <div className="text-sm text-slate-400">Average</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="odds" className="mt-6 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {/* Odds Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                  <h3 className="text-xl font-bold text-white mb-4">Over Odds</h3>
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {formatOdds(prop.overOdds)}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {prop.overOdds > 0 ? 'Underdog' : 'Favorite'}
                  </div>
                </div>
                
                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                  <h3 className="text-xl font-bold text-white mb-4">Under Odds</h3>
                  <div className="text-3xl font-bold text-red-400 mb-2">
                    {formatOdds(prop.underOdds)}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {prop.underOdds > 0 ? 'Underdog' : 'Favorite'}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="predictions" className="mt-6 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
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
                      <Badge variant={prop.aiPrediction?.recommended === 'over' ? 'default' : 'destructive'} className="text-sm">
                        {prop.aiPrediction?.recommended?.toUpperCase() || 'N/A'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Confidence</span>
                      <span className="text-white font-semibold">
                        {formatPercentage(prop.aiPrediction?.confidence || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Expected Value</span>
                      <span className={cn(
                        "font-semibold",
                        (prop.expectedValue || 0) > 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {prop.expectedValue ? (prop.expectedValue > 0 ? '+' : '') + formatPercentage(prop.expectedValue) : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-gray-300 mb-2">Reasoning</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {prop.aiPrediction?.reasoning || 'No detailed reasoning available.'}
                      </p>
                    </div>
                    {prop.aiPrediction?.factors && prop.aiPrediction.factors.length > 0 && (
                      <div>
                        <h4 className="text-gray-300 mb-2">Key Factors</h4>
                        <div className="flex flex-wrap gap-2">
                          {prop.aiPrediction.factors.map((factor, i) => (
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

              {/* Live Predictions */}
              <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-blue-400" />
                  Live Predictions
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-slate-800/60 rounded-lg">
                      <div className="text-2xl font-bold text-green-400">85%</div>
                      <div className="text-sm text-gray-400">Over Votes</div>
                    </div>
                    <div className="text-center p-4 bg-slate-800/60 rounded-lg">
                      <div className="text-2xl font-bold text-red-400">15%</div>
                      <div className="text-sm text-gray-400">Under Votes</div>
                    </div>
                    <div className="text-center p-4 bg-slate-800/60 rounded-lg">
                      <div className="text-2xl font-bold text-blue-400">247</div>
                      <div className="text-sm text-gray-400">Total Votes</div>
                    </div>
                  </div>
                  <div className="text-center text-sm text-gray-400">
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="mt-6 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {/* Advanced Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-purple-400" />
                    Advanced Stats
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Standard Deviation</span>
                      <span className="text-white font-semibold">2.34</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Variance</span>
                      <span className="text-white font-semibold">5.48</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Skewness</span>
                      <span className="text-white font-semibold">-0.12</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Kurtosis</span>
                      <span className="text-white font-semibold">2.89</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Coefficient of Variation</span>
                      <span className="text-white font-semibold">0.23</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <Target className="h-5 w-5 mr-2 text-orange-400" />
                    Performance Metrics
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Hit Rate (Last 10)</span>
                      <span className="text-green-400 font-semibold">70%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Streak</span>
                      <span className="text-blue-400 font-semibold">3 Games</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Best Performance</span>
                      <span className="text-yellow-400 font-semibold">+45%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Worst Performance</span>
                      <span className="text-red-400 font-semibold">-28%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Consistency Score</span>
                      <span className="text-purple-400 font-semibold">8.2/10</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Market Analysis */}
              <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
                  Market Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-gray-300 font-semibold">Line Movement</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Opening Line</span>
                        <span className="text-white">4.5</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Current Line</span>
                        <span className="text-white">{formatNumber(prop.line, 1)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Movement</span>
                        <span className="text-green-400">+0.5</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-gray-300 font-semibold">Volume</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Bet Count</span>
                        <span className="text-white">1,247</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Volume ($)</span>
                        <span className="text-white">$45.2K</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Sharp %</span>
                        <span className="text-blue-400">23%</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-gray-300 font-semibold">Public Sentiment</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Over %</span>
                        <span className="text-green-400">68%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Under %</span>
                        <span className="text-red-400">32%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Sharp Action</span>
                        <span className="text-blue-400">Under</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weather & Conditions */}
              <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/60">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-cyan-400" />
                  Game Conditions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-gray-300 font-semibold">Weather</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Temperature</span>
                        <span className="text-white">72°F</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Wind</span>
                        <span className="text-white">8 mph NW</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Humidity</span>
                        <span className="text-white">45%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Precipitation</span>
                        <span className="text-white">0%</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-gray-300 font-semibold">Venue</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Stadium</span>
                        <span className="text-white">Arrowhead Stadium</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Surface</span>
                        <span className="text-white">Grass</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Capacity</span>
                        <span className="text-white">76,416</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Dome</span>
                        <span className="text-white">No</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
