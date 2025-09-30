import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PlayerPrediction {
  id: string;
  name: string;
  team: string;
  position: string;
  probability: number;
  factors: {
    recentForm: number;
    matchupAdvantage: number;
    homeAway: number;
    weather: number;
    pitcherMatchup: number;
    restDays: number;
  };
  lastGameStats: {
    hits: number;
    atBats: number;
    avg: number;
  };
  seasonStats: {
    avg: number;
    obp: number;
    slg: number;
    ops: number;
  };
}

interface MostLikelyData {
  mostLikelyToHit: PlayerPrediction[];
  mostLikelyToNotHit: PlayerPrediction[];
  lastUpdated: string;
}

export const MostLikely: React.FC = () => {
  const [data, setData] = useState<MostLikelyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hit' | 'not-hit'>('hit');
  const { toast } = useToast();

  useEffect(() => {
    loadMostLikelyData();
  }, []);

  const loadMostLikelyData = async () => {
    try {
      setIsLoading(true);
      
      // Simulate API call - in real implementation, this would fetch from your backend
      const mockData: MostLikelyData = {
        mostLikelyToHit: [
          {
            id: '1',
            name: 'Mookie Betts',
            team: 'LAD',
            position: 'RF',
            probability: 0.78,
            factors: {
              recentForm: 0.85,
              matchupAdvantage: 0.72,
              homeAway: 0.80,
              weather: 0.90,
              pitcherMatchup: 0.75,
              restDays: 0.70
            },
            lastGameStats: {
              hits: 3,
              atBats: 4,
              avg: 0.750
            },
            seasonStats: {
              avg: 0.312,
              obp: 0.385,
              slg: 0.542,
              ops: 0.927
            }
          },
          {
            id: '2',
            name: 'Freddie Freeman',
            team: 'LAD',
            position: '1B',
            probability: 0.74,
            factors: {
              recentForm: 0.80,
              matchupAdvantage: 0.78,
              homeAway: 0.75,
              weather: 0.85,
              pitcherMatchup: 0.70,
              restDays: 0.85
            },
            lastGameStats: {
              hits: 2,
              atBats: 4,
              avg: 0.500
            },
            seasonStats: {
              avg: 0.298,
              obp: 0.372,
              slg: 0.485,
              ops: 0.857
            }
          },
          {
            id: '3',
            name: 'Ronald Acuña Jr.',
            team: 'ATL',
            position: 'RF',
            probability: 0.72,
            factors: {
              recentForm: 0.75,
              matchupAdvantage: 0.70,
              homeAway: 0.85,
              weather: 0.80,
              pitcherMatchup: 0.65,
              restDays: 0.75
            },
            lastGameStats: {
              hits: 2,
              atBats: 5,
              avg: 0.400
            },
            seasonStats: {
              avg: 0.285,
              obp: 0.365,
              slg: 0.512,
              ops: 0.877
            }
          }
        ],
        mostLikelyToNotHit: [
          {
            id: '4',
            name: 'Joey Gallo',
            team: 'MIN',
            position: 'LF',
            probability: 0.68,
            factors: {
              recentForm: 0.30,
              matchupAdvantage: 0.25,
              homeAway: 0.40,
              weather: 0.60,
              pitcherMatchup: 0.20,
              restDays: 0.50
            },
            lastGameStats: {
              hits: 0,
              atBats: 4,
              avg: 0.000
            },
            seasonStats: {
              avg: 0.185,
              obp: 0.285,
              slg: 0.385,
              ops: 0.670
            }
          },
          {
            id: '5',
            name: 'Miguel Cabrera',
            team: 'DET',
            position: '1B',
            probability: 0.65,
            factors: {
              recentForm: 0.35,
              matchupAdvantage: 0.40,
              homeAway: 0.45,
              weather: 0.70,
              pitcherMatchup: 0.30,
              restDays: 0.60
            },
            lastGameStats: {
              hits: 1,
              atBats: 4,
              avg: 0.250
            },
            seasonStats: {
              avg: 0.245,
              obp: 0.312,
              slg: 0.385,
              ops: 0.697
            }
          },
          {
            id: '6',
            name: 'Chris Davis',
            team: 'BAL',
            position: '1B',
            probability: 0.62,
            factors: {
              recentForm: 0.25,
              matchupAdvantage: 0.30,
              homeAway: 0.35,
              weather: 0.55,
              pitcherMatchup: 0.25,
              restDays: 0.45
            },
            lastGameStats: {
              hits: 0,
              atBats: 3,
              avg: 0.000
            },
            seasonStats: {
              avg: 0.195,
              obp: 0.275,
              slg: 0.345,
              ops: 0.620
            }
          }
        ],
        lastUpdated: new Date().toISOString()
      };

      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setData(mockData);
    } catch (error) {
      console.error('Failed to load most likely data:', error);
      toast({
        title: "Error",
        description: "Failed to load predictions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatProbability = (probability: number) => {
    return `${(probability * 100).toFixed(1)}%`;
  };

  const getProbabilityColor = (probability: number, isNotHit: boolean = false) => {
    if (isNotHit) {
      if (probability > 0.6) return 'text-red-500';
      if (probability > 0.5) return 'text-orange-500';
      return 'text-yellow-500';
    } else {
      if (probability > 0.7) return 'text-green-500';
      if (probability > 0.6) return 'text-blue-500';
      return 'text-purple-500';
    }
  };

  const getProbabilityBadgeVariant = (probability: number, isNotHit: boolean = false) => {
    if (isNotHit) {
      if (probability > 0.6) return 'destructive';
      if (probability > 0.5) return 'secondary';
      return 'outline';
    } else {
      if (probability > 0.7) return 'default';
      if (probability > 0.6) return 'secondary';
      return 'outline';
    }
  };

  const renderPlayerCard = (player: PlayerPrediction, isNotHit: boolean = false) => (
    <Card key={player.id} className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{player.name}</h3>
              <Badge variant="outline">{player.position}</Badge>
              <Badge variant="secondary">{player.team}</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Last Game: {player.lastGameStats.hits}/{player.lastGameStats.atBats} ({player.lastGameStats.avg.toFixed(3)})</span>
              <span>Season: {player.seasonStats.avg.toFixed(3)} AVG</span>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getProbabilityColor(player.probability, isNotHit)}`}>
              {formatProbability(player.probability)}
            </div>
            <Badge variant={getProbabilityBadgeVariant(player.probability, isNotHit)} className="text-xs">
              {isNotHit ? 'Likely to NOT Hit' : 'Likely to Hit'}
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Overall Probability</span>
              <span className="font-medium">{formatProbability(player.probability)}</span>
            </div>
            <Progress value={player.probability * 100} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Recent Form</span>
                <span className="font-medium">{formatProbability(player.factors.recentForm)}</span>
              </div>
              <div className="flex justify-between">
                <span>Matchup Advantage</span>
                <span className="font-medium">{formatProbability(player.factors.matchupAdvantage)}</span>
              </div>
              <div className="flex justify-between">
                <span>Home/Away</span>
                <span className="font-medium">{formatProbability(player.factors.homeAway)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Weather</span>
                <span className="font-medium">{formatProbability(player.factors.weather)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pitcher Matchup</span>
                <span className="font-medium">{formatProbability(player.factors.pitcherMatchup)}</span>
              </div>
              <div className="flex justify-between">
                <span>Rest Days</span>
                <span className="font-medium">{formatProbability(player.factors.restDays)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">No Data Available</h2>
        <p className="text-muted-foreground mb-4">Unable to load most likely predictions</p>
        <Button onClick={loadMostLikelyData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Most Likely</h1>
          <p className="text-muted-foreground">MLB predictions for today's games</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Calendar className="w-3 h-3" />
            {new Date().toLocaleDateString()}
          </Badge>
          <Button variant="outline" size="sm" onClick={loadMostLikelyData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'hit' | 'not-hit')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="hit" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Most Likely to Hit
          </TabsTrigger>
          <TabsTrigger value="not-hit" className="gap-2">
            <XCircle className="w-4 h-4" />
            Most Likely to NOT Hit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Most Likely to Hit Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.mostLikelyToHit.map(player => renderPlayerCard(player, false))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="not-hit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                Most Likely to NOT Hit Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.mostLikelyToNotHit.map(player => renderPlayerCard(player, true))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Prediction Factors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Recent Form</h4>
              <p className="text-muted-foreground">Player's performance in last 10 games</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Matchup Advantage</h4>
              <p className="text-muted-foreground">Historical performance vs opposing pitcher</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Home/Away</h4>
              <p className="text-muted-foreground">Performance at home vs away</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Weather</h4>
              <p className="text-muted-foreground">Impact of weather conditions</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Pitcher Matchup</h4>
              <p className="text-muted-foreground">Specific pitcher vs batter history</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Rest Days</h4>
              <p className="text-muted-foreground">Days since last game</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
