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
  AlertTriangle
} from 'lucide-react';
import { useUser } from '@/contexts/user-context';
import { cn } from '@/lib/utils';

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
  const { userSubscription, userRole } = useUser();
  const [legCount, setLegCount] = useState<number>(3);
  const [oddsFilter, setOddsFilter] = useState<'under' | 'over'>('under');
  const [oddsValue, setOddsValue] = useState<number>(500);
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedParlays, setGeneratedParlays] = useState<GeneratedParlay[]>([]);
  const [selectedParlay, setSelectedParlay] = useState<GeneratedParlay | null>(null);

  // Check if user has premium access
  const hasPremiumAccess = userSubscription === 'premium' || ['admin', 'owner'].includes(userRole);

  // Mock data for current day games and predictions
  const mockGames = [
    {
      sport: 'NFL',
      game: 'Chiefs vs Bills',
      players: [
        { name: 'Patrick Mahomes', props: ['Passing Yards', 'Passing TDs', 'Rushing Yards'] },
        { name: 'Josh Allen', props: ['Passing Yards', 'Passing TDs', 'Rushing Yards'] },
        { name: 'Travis Kelce', props: ['Receiving Yards', 'Receptions', 'Receiving TDs'] }
      ]
    },
    {
      sport: 'NBA',
      game: 'Lakers vs Warriors',
      players: [
        { name: 'LeBron James', props: ['Points', 'Rebounds', 'Assists'] },
        { name: 'Stephen Curry', props: ['Points', 'Assists', '3-Pointers Made'] },
        { name: 'Anthony Davis', props: ['Points', 'Rebounds', 'Blocks'] }
      ]
    },
    {
      sport: 'MLB',
      game: 'Yankees vs Red Sox',
      players: [
        { name: 'Aaron Judge', props: ['Hits', 'Home Runs', 'RBIs'] },
        { name: 'Rafael Devers', props: ['Hits', 'Home Runs', 'RBIs'] },
        { name: 'Gerrit Cole', props: ['Strikeouts', 'Earned Runs', 'Innings Pitched'] }
      ]
    }
  ];

  const generateParlay = async () => {
    if (!hasPremiumAccess) return;
    
    setIsGenerating(true);
    
    try {
      // Simulate AI prediction generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newParlay: GeneratedParlay = {
        id: `parlay_${Date.now()}`,
        legs: generateParlayLegs(),
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
    } catch (error) {
      console.error('Error generating parlay:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateParlayLegs = (): ParlayLeg[] => {
    const legs: ParlayLeg[] = [];
    const availableGames = sportFilter === 'all' ? mockGames : mockGames.filter(game => game.sport === sportFilter);
    
    for (let i = 0; i < legCount; i++) {
      const game = availableGames[Math.floor(Math.random() * availableGames.length)];
      const player = game.players[Math.floor(Math.random() * game.players.length)];
      const prop = player.props[Math.floor(Math.random() * player.props.length)];
      
      // Generate realistic odds based on filter
      let odds: number;
      if (oddsFilter === 'under') {
        odds = Math.random() * (oddsValue - 100) + 100; // 100 to oddsValue
      } else {
        odds = Math.random() * (2000 - oddsValue) + oddsValue; // oddsValue to 2000
      }
      
      const confidence = Math.random() * 0.4 + 0.6; // 0.6 to 1.0
      const expectedValue = (confidence * odds - 1) / odds; // EV calculation
      
      legs.push({
        id: `leg_${i}_${Date.now()}`,
        sport: game.sport,
        game: game.game,
        player: player.name,
        prop: prop,
        line: generateLine(prop),
        odds: Math.round(odds),
        prediction: Math.random() > 0.5 ? 'over' : 'under',
        confidence: Math.round(confidence * 100) / 100,
        reasoning: generateReasoning(player.name, prop, confidence),
        expectedValue: Math.round(expectedValue * 100) / 100
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
                disabled={isGenerating}
                size="lg"
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Generate Parlay
                  </>
                )}
              </Button>
            </div>
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
                        <span>Total Odds: {parlay.totalOdds.toFixed(2)}x</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-500" />
                        <span>Confidence: {Math.round(parlay.totalConfidence * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-purple-500" />
                        <span>EV: {parlay.expectedValue.toFixed(3)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-yellow-500" />
                        <span>Payout: ${parlay.potentialPayout.toFixed(0)}</span>
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
                  <div className="text-2xl font-bold text-primary">{selectedParlay.totalOdds.toFixed(2)}x</div>
                  <div className="text-sm text-muted-foreground">Total Odds</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{Math.round(selectedParlay.totalConfidence * 100)}%</div>
                  <div className="text-sm text-muted-foreground">Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">{selectedParlay.expectedValue.toFixed(3)}</div>
                  <div className="text-sm text-muted-foreground">Expected Value</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">${selectedParlay.potentialPayout.toFixed(0)}</div>
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
                        <div className="text-lg font-bold">{leg.odds}x</div>
                        <div className="text-sm text-muted-foreground">
                          {Math.round(leg.confidence * 100)}% confidence
                        </div>
                        <div className="text-xs text-muted-foreground">
                          EV: {leg.expectedValue.toFixed(3)}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" size="lg">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Place Bet
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
