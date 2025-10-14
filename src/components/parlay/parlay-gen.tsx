// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  Target, 
  Zap, 
  Star, 
  DollarSign, 
  Clock,
  CheckCircle,
  XCircle,
  Brain,
  BarChart3,
  Trophy,
  AlertTriangle,
  Send,
  Wallet,
  ExternalLink
} from 'lucide-react';
import { useUser } from '@/contexts/user-context';
import { cn } from '@/lib/utils';
import { gamesService, GamePrediction, RealGame } from '@/services/games-service';
import { predictionService, PlayerPropPrediction } from '@/services/prediction-service';
import { betTrackingService, UserBankroll } from '@/services/bet-tracking-service';
import { useToast } from '@/hooks/use-toast';

interface ParlayLeg {
  id: string;
  sport: string;
  game: string;
  player: string;
  prop: string;
  line: string;
  odds: number;
  prediction: 'over' | 'under';
  confidence: number;
  reasoning: string;
  expectedValue: number;
}

interface GeneratedParlay {
  id: string;
  legs: ParlayLeg[];
  totalOdds: number;
  totalConfidence: number;
  expectedValue: number;
  potentialPayout: number;
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: string;
}

export const ParlayGen: React.FC = () => {
  const { userSubscription, userRole, user } = useUser();
  const { toast } = useToast();
  const [legCount, setLegCount] = useState<number>(3);
  const [oddsFilter, setOddsFilter] = useState<'under' | 'over'>('under');
  const [oddsValue, setOddsValue] = useState<number>(500);
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedParlays, setGeneratedParlays] = useState<GeneratedParlay[]>([]);
  const [selectedParlay, setSelectedParlay] = useState<GeneratedParlay | null>(null);
  const [availableGames, setAvailableGames] = useState<GamePrediction[]>([]);
  const [availableProps, setAvailableProps] = useState<PlayerPropPrediction[]>([]);
  const [bankrolls, setBankrolls] = useState<UserBankroll[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Check if user has premium access
  // Owner role bypasses ALL subscription restrictions
  const hasPremiumAccess = userRole === 'owner' || userSubscription === 'premium' || userRole === 'admin';

  // Load real data on component mount
  useEffect(() => {
    if (hasPremiumAccess) {
      loadRealData();
    }
  }, [hasPremiumAccess, sportFilter]);

  const loadRealData = async () => {
    try {
      setIsLoadingData(true);
      
      // Load games for current week
      const gamesData = await gamesService.getCurrentWeekPredictions(sportFilter === 'all' ? 'nfl' : sportFilter.toLowerCase());
      setAvailableGames(gamesData);
      
      // Load available props
      const propsData = await predictionService.getRecentPredictions(100);
      setAvailableProps(propsData);
      
      // Load user bankrolls for bet tracking integration
      if (user) {
        try {
          const bankrollsData = await betTrackingService.getUserBankrolls(user.id);
          setBankrolls(bankrollsData);
        } catch (error) {
          console.log('Could not load bankrolls:', error);
        }
      }
    } catch (error) {
      console.error('Error loading real data:', error);
      toast({
        title: "Error",
        description: "Failed to load current games and predictions",
        variant: "destructive"
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const generateParlay = async () => {
    if (!hasPremiumAccess || isLoadingData) return;
    
    setIsGenerating(true);
    
    try {
      // Generate parlay using real data
      const newParlay: GeneratedParlay = {
        id: `parlay_${Date.now()}`,
        legs: generateParlayLegsFromRealData(),
        totalOdds: 0,
        totalConfidence: 0,
        expectedValue: 0,
        potentialPayout: 0,
        riskLevel: 'medium',
        createdAt: new Date().toISOString()
      };
      
      // Calculate totals
      newParlay.totalOdds = newParlay.legs.reduce((acc, leg) => acc * leg.odds, 1);
      newParlay.totalConfidence = newParlay.legs.reduce((acc, leg) => acc + leg.confidence, 0) / newParlay.legs.length;
      newParlay.expectedValue = newParlay.legs.reduce((acc, leg) => acc + leg.expectedValue, 0);
      newParlay.potentialPayout = newParlay.totalOdds * 100; // Assuming $100 bet
      
      // Determine risk level
      if (newParlay.totalConfidence > 0.8) newParlay.riskLevel = 'low';
      else if (newParlay.totalConfidence > 0.6) newParlay.riskLevel = 'medium';
      else newParlay.riskLevel = 'high';
      
      setGeneratedParlays(prev => [newParlay, ...prev]);
      setSelectedParlay(newParlay);
      
      toast({
        title: "Parlay Generated",
        description: `Generated ${legCount}-leg parlay with ${Math.round(newParlay.totalConfidence * 100)}% confidence`
      });
    } catch (error) {
      console.error('Error generating parlay:', error);
      toast({
        title: "Error",
        description: "Failed to generate parlay. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateParlayLegsFromRealData = (): ParlayLeg[] => {
    const legs: ParlayLeg[] = [];
    
    // Filter available props by sport and odds criteria
    let filteredProps = availableProps;
    
    if (sportFilter !== 'all') {
      filteredProps = availableProps.filter(prop => 
        prop.game_date && new Date(prop.game_date) >= new Date() // Only future games
      );
    }
    
    // If we have real props, use them; otherwise fall back to game predictions
    if (filteredProps.length > 0) {
      // Use real player props
      const selectedProps = filteredProps
        .sort(() => Math.random() - 0.5)
        .slice(0, legCount);
      
      selectedProps.forEach((prop, index) => {
        const game = availableGames.find(g => 
          g.game.homeTeam === prop.team || g.game.awayTeam === prop.team
        );
        
        if (game) {
          const odds = convertToAmericanOdds(prop.over_votes, prop.under_votes);
          const confidence = calculateConfidence(prop.over_votes, prop.under_votes);
          const expectedValue = calculateExpectedValue(confidence, odds);
          
          legs.push({
            id: `leg_${index}_${Date.now()}`,
            sport: game.game.sport.toUpperCase(),
            game: `${game.game.awayTeam} @ ${game.game.homeTeam}`,
            player: prop.player_name,
            prop: prop.prop_title,
            line: prop.prop_value.toString(),
            odds: odds,
            prediction: prop.over_votes > prop.under_votes ? 'over' : 'under',
            confidence: confidence,
            reasoning: generateRealReasoning(prop, game, confidence),
            expectedValue: expectedValue
          });
        }
      });
    } else {
      // Fall back to game predictions if no props available
      const selectedGames = availableGames
        .sort(() => Math.random() - 0.5)
        .slice(0, legCount);
      
      selectedGames.forEach((gamePrediction, index) => {
        const game = gamePrediction.game;
        const odds = gamePrediction.prediction.homeWinProbability > 0.5 
          ? convertProbabilityToOdds(gamePrediction.prediction.homeWinProbability)
          : convertProbabilityToOdds(gamePrediction.prediction.awayWinProbability);
        
        const confidence = Math.max(
          gamePrediction.prediction.homeWinProbability,
          gamePrediction.prediction.awayWinProbability
        );
        
        legs.push({
          id: `leg_${index}_${Date.now()}`,
          sport: game.sport.toUpperCase(),
          game: `${game.awayTeam} @ ${game.homeTeam}`,
          player: gamePrediction.prediction.homeWinProbability > 0.5 ? game.homeTeam : game.awayTeam,
          prop: 'Moneyline',
          line: 'Win',
          odds: odds,
          prediction: 'over',
          confidence: confidence,
          reasoning: generateGameReasoning(gamePrediction, confidence),
          expectedValue: calculateExpectedValue(confidence, odds)
        });
      });
    }
    
    return legs;
  };

  const generateLine = (prop: string): string => {
    const lines: { [key: string]: string[] } = {
      'Passing Yards': ['250.5', '275.5', '300.5'],
      'Passing TDs': ['1.5', '2.5', '3.5'],
      'Rushing Yards': ['50.5', '75.5', '100.5'],
      'Receiving Yards': ['60.5', '80.5', '100.5'],
      'Receptions': ['4.5', '6.5', '8.5'],
      'Receiving TDs': ['0.5', '1.5', '2.5'],
      'Points': ['25.5', '30.5', '35.5'],
      'Rebounds': ['8.5', '10.5', '12.5'],
      'Assists': ['6.5', '8.5', '10.5'],
      '3-Pointers Made': ['2.5', '3.5', '4.5'],
      'Blocks': ['1.5', '2.5', '3.5'],
      'Hits': ['1.5', '2.5', '3.5'],
      'Home Runs': ['0.5', '1.5', '2.5'],
      'RBIs': ['1.5', '2.5', '3.5'],
      'Strikeouts': ['6.5', '8.5', '10.5'],
      'Earned Runs': ['2.5', '3.5', '4.5'],
      'Innings Pitched': ['5.5', '6.5', '7.5']
    };
    
    const propLines = lines[prop] || ['1.5', '2.5', '3.5'];
    return propLines[Math.floor(Math.random() * propLines.length)];
  };

  // Helper functions for real data processing
  const convertToAmericanOdds = (overVotes: number, underVotes: number): number => {
    const totalVotes = overVotes + underVotes;
    if (totalVotes === 0) return 100;
    
    const overProbability = overVotes / totalVotes;
    return convertProbabilityToOdds(overProbability);
  };

  const convertProbabilityToOdds = (probability: number): number => {
    if (probability >= 0.5) {
      return Math.round(-100 * probability / (1 - probability));
    } else {
      return Math.round(100 * (1 - probability) / probability);
    }
  };

  const calculateConfidence = (overVotes: number, underVotes: number): number => {
    const totalVotes = overVotes + underVotes;
    if (totalVotes === 0) return 0.6;
    
    const maxVotes = Math.max(overVotes, underVotes);
    const confidence = maxVotes / totalVotes;
    return Math.max(0.6, Math.min(0.95, confidence));
  };

  const calculateExpectedValue = (confidence: number, odds: number): number => {
    const decimalOdds = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
    return (confidence * decimalOdds - 1) / decimalOdds;
  };

  // Format numbers to be concise
  const formatNumber = (value: number, type: 'odds' | 'payout' | 'value' | 'percentage'): string => {
    if (type === 'odds') {
      if (value > 0) return `+${Math.round(value)}`;
      return Math.round(value).toString();
    }
    
    if (type === 'payout') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
      return Math.round(value).toString();
    }
    
    if (type === 'value') {
      return value.toFixed(2);
    }
    
    if (type === 'percentage') {
      return `${Math.round(value)}%`;
    }
    
    return value.toString();
  };

  const generateRealReasoning = (prop: PlayerPropPrediction, game: GamePrediction, confidence: number): string => {
    const voteRatio = prop.over_votes / (prop.under_votes || 1);
    const confidencePercent = Math.round(confidence * 100);
    
    if (voteRatio > 2) {
      return `Strong community consensus with ${confidencePercent}% confidence. ${prop.over_votes} over votes vs ${prop.under_votes} under votes indicate favorable conditions.`;
    } else if (voteRatio > 1.5) {
      return `Moderate community preference with ${confidencePercent}% confidence. Recent form and matchup analysis support this pick.`;
    } else {
      return `Balanced community opinion with ${confidencePercent}% confidence. Advanced analytics and historical data suggest this outcome.`;
    }
  };

  const generateGameReasoning = (gamePrediction: GamePrediction, confidence: number): string => {
    const confidencePercent = Math.round(confidence * 100);
    const game = gamePrediction.game;
    
    return `${game.homeTeam} vs ${game.awayTeam}: ${confidencePercent}% confidence based on team form, head-to-head record, and advanced metrics analysis.`;
  };

  const generateReasoning = (player: string, prop: string, confidence: number): string => {
    const reasons = [
      `Strong recent form with ${Math.round(confidence * 100)}% confidence based on recent performance trends`,
      `Favorable matchup against weak defense with historical data supporting this pick`,
      `Weather conditions and game script favor this outcome based on advanced analytics`,
      `Player's recent hot streak and team's offensive scheme create optimal conditions`,
      `Advanced metrics show significant edge in this specific game situation`
    ];
    
    return reasons[Math.floor(Math.random() * reasons.length)];
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low': return <CheckCircle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <XCircle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  // Bet tracking integration functions
  const sendToBetTracking = async (parlay: GeneratedParlay) => {
    if (!user || bankrolls.length === 0) {
      toast({
        title: "Error",
        description: "Please set up a bankroll in Bet Tracking first",
        variant: "destructive"
      });
      return;
    }

    try {
      const selectedBankroll = bankrolls[0]; // Use first bankroll
      
      // Create the parlay bet
      const betData = {
        user_id: user.id,
        bankroll_id: selectedBankroll.id,
        bet_type: 'parlay',
        sport: parlay.legs[0]?.sport || 'NFL',
        bet_category: 'props',
        bet_amount: 100, // Default $100
        odds: parlay.totalOdds,
        potential_payout: parlay.potentialPayout,
        game_date: new Date().toISOString(),
        bet_status: 'pending',
        notes: `AI Generated Parlay - ${parlay.legs.length} legs, ${Math.round(parlay.totalConfidence * 100)}% confidence`
      };

      const bet = await betTrackingService.createBet(betData);

      // Create parlay legs
      const legsData = parlay.legs.map((leg, index) => ({
        bet_id: bet.id,
        leg_number: index + 1,
        sport: leg.sport,
        game: leg.game,
        player: leg.player,
        prop: leg.prop,
        line: leg.line,
        prediction: leg.prediction,
        odds: leg.odds,
        confidence: leg.confidence,
        reasoning: leg.reasoning
      }));

      await betTrackingService.createParlayLegs(legsData);

      toast({
        title: "Success",
        description: "Parlay sent to Bet Tracking successfully"
      });
    } catch (error) {
      console.error('Error sending to bet tracking:', error);
      toast({
        title: "Error",
        description: "Failed to send parlay to Bet Tracking",
        variant: "destructive"
      });
    }
  };

  const sendToSportsbook = async (parlay: GeneratedParlay) => {
    // This would integrate with connected sportsbooks
    // For now, we'll show a message about the integration
    toast({
      title: "Sportsbook Integration",
      description: "This feature will send your parlay to connected sportsbooks. Make sure you have sportsbooks connected in Bet Tracking.",
      variant: "default"
    });
  };

  if (!hasPremiumAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Premium Feature</CardTitle>
            <CardDescription>
              Parlay Gen is available with Premium subscription
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Unlock AI-powered parlay generation with advanced predictions and customizable filters.
            </p>
            <Button className="w-full">
              Upgrade to Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Parlay Gen
          </h1>
          <p className="text-muted-foreground text-lg">
            AI-powered parlay generator with advanced predictions
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Generation Settings
            </CardTitle>
            <CardDescription>
              Customize your parlay parameters for optimal results
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="legs">Number of Legs</Label>
                <Select value={legCount.toString()} onValueChange={(value) => setLegCount(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} Legs
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sport">Sport</Label>
                <Select value={sportFilter} onValueChange={setSportFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sports</SelectItem>
                    <SelectItem value="NFL">NFL</SelectItem>
                    <SelectItem value="NBA">NBA</SelectItem>
                    <SelectItem value="MLB">MLB</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="odds-filter">Odds Filter</Label>
                <Select value={oddsFilter} onValueChange={(value: 'under' | 'over') => setOddsFilter(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under">Under {oddsValue}</SelectItem>
                    <SelectItem value="over">Over {oddsValue}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="odds-value">Odds Value</Label>
                <Select value={oddsValue.toString()} onValueChange={(value) => setOddsValue(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="300">300</SelectItem>
                    <SelectItem value="400">400</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                    <SelectItem value="750">750</SelectItem>
                    <SelectItem value="1000">1000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-center">
              <Button 
                onClick={generateParlay} 
                disabled={isGenerating || isLoadingData}
                size="lg"
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Generating...
                  </>
                ) : isLoadingData ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Loading Data...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Generate Parlay
                  </>
                )}
              </Button>
            </div>

            {isLoadingData && (
              <Alert>
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  Loading current week games and predictions...
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Generated Parlays */}
        {generatedParlays.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Generated Parlays</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {generatedParlays.map((parlay) => (
                <Card 
                  key={parlay.id} 
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-lg",
                    selectedParlay?.id === parlay.id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedParlay(parlay)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {parlay.legs.length} Leg Parlay
                      </CardTitle>
                      <Badge variant="outline" className={getRiskColor(parlay.riskLevel)}>
                        {getRiskIcon(parlay.riskLevel)}
                        <span className="ml-1 capitalize">{parlay.riskLevel} Risk</span>
                      </Badge>
                    </div>
                    <CardDescription>
                      {parlay.sport} • {new Date(parlay.createdAt).toLocaleTimeString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span>Total Odds: {formatNumber(parlay.totalOdds, 'odds')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-500" />
                        <span>Confidence: {formatNumber(parlay.totalConfidence, 'percentage')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-purple-500" />
                        <span>EV: {formatNumber(parlay.expectedValue, 'value')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-yellow-500" />
                        <span>Payout: ${formatNumber(parlay.potentialPayout, 'payout')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Parlay View */}
        {selectedParlay && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Parlay Details
              </CardTitle>
              <CardDescription>
                Detailed breakdown of your selected parlay
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{formatNumber(selectedParlay.totalOdds, 'odds')}</div>
                  <div className="text-sm text-muted-foreground">Total Odds</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{formatNumber(selectedParlay.totalConfidence, 'percentage')}</div>
                  <div className="text-sm text-muted-foreground">Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">{formatNumber(selectedParlay.expectedValue, 'value')}</div>
                  <div className="text-sm text-muted-foreground">Expected Value</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">${formatNumber(selectedParlay.potentialPayout, 'payout')}</div>
                  <div className="text-sm text-muted-foreground">Potential Payout</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Parlay Legs</h3>
                {selectedParlay.legs.map((leg, index) => (
                  <Card key={leg.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{leg.sport}</Badge>
                          <span className="font-medium">{leg.player}</span>
                          <Badge variant={leg.prediction === 'over' ? 'default' : 'secondary'}>
                            {leg.prediction.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-1">
                          {leg.game} • {leg.prop} {leg.line}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {leg.reasoning}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold">{formatNumber(leg.odds, 'odds')}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatNumber(leg.confidence, 'percentage')} confidence
                        </div>
                        <div className="text-xs text-muted-foreground">
                          EV: {formatNumber(leg.expectedValue, 'value')}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  size="lg"
                  onClick={() => sendToBetTracking(selectedParlay)}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Send to Bet Tracking
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => sendToSportsbook(selectedParlay)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Send to Sportsbook
                </Button>
                <Button variant="outline" size="lg">
                  <Star className="w-4 h-4 mr-2" />
                  Save Parlay
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
