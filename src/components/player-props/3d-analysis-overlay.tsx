import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  ChevronLeft
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl">
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
        <DialogHeader className="relative z-20 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-2xl">
                {prop.playerName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  {prop.playerName} - {prop.propType}
                </DialogTitle>
                <div className="flex items-center space-x-4 text-gray-300 mt-2">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">{prop.teamAbbr} vs {prop.opponentAbbr}</span>
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
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-full"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </DialogHeader>

        {/* Main Content */}
        <div className="relative z-20">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700/50">
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
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Key Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Line Value */}
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">{prop.line}</div>
                    <div className="text-gray-400 text-sm uppercase tracking-wide">Line</div>
                  </div>
                </div>

                {/* Confidence */}
                {prop.confidence && (
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
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
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
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
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
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

            <TabsContent value="analysis" className="mt-6 space-y-6">
              {/* Detailed Analysis */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
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

            <TabsContent value="history" className="mt-6 space-y-6">
              {/* Last 5 Games */}
              {prop.last5Games && prop.last5Games.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                  <h3 className="text-xl font-bold text-white mb-4">Last 5 Games</h3>
                  <div className="grid grid-cols-5 gap-4">
                    {prop.last5Games.map((game, index) => (
                      <div key={index} className="text-center">
                        <div className="text-2xl font-bold text-white mb-1">
                          {formatNumber(game, 1)}
                        </div>
                        <div className="text-xs text-gray-400">Game {index + 1}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="odds" className="mt-6 space-y-6">
              {/* Odds Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                  <h3 className="text-xl font-bold text-white mb-4">Over Odds</h3>
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {formatOdds(prop.overOdds)}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {prop.overOdds > 0 ? 'Underdog' : 'Favorite'}
                  </div>
                </div>
                
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
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
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
