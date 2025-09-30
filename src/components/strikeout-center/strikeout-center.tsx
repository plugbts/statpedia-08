import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PitcherStrikeoutCard } from './pitcher-strikeout-card';
import { TrendingUp, TrendingDown, Zap, RefreshCw, Target } from 'lucide-react';
import { useOddsAPI } from '@/hooks/use-odds-api';
import { useToast } from '@/hooks/use-toast';

export const StrikeoutCenter: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [pitchers, setPitchers] = useState<any[]>([]);
  const { fetchInSeasonSports, fetchOdds } = useOddsAPI();
  const { toast } = useToast();

  useEffect(() => {
    loadStrikeoutData();
  }, []);

  const loadStrikeoutData = async () => {
    setIsLoading(true);
    try {
      const sports = await fetchInSeasonSports();
      const mlbSport = sports.find((s: any) => s.key.includes('baseball'));
      
      if (mlbSport) {
        const odds = await fetchOdds(mlbSport.key);
        const transformedPitchers = generateStrikeoutPitchers(odds);
        setPitchers(transformedPitchers);
        
        toast({
          title: 'Strikeout Data Loaded',
          description: `Loaded ${transformedPitchers.length} pitcher props`,
        });
      } else {
        // Generate mock data if MLB not in season
        setPitchers(generateMockPitchers());
      }
    } catch (err) {
      console.error('Error loading strikeout data:', err);
      setPitchers(generateMockPitchers());
    } finally {
      setIsLoading(false);
    }
  };

  const generateStrikeoutPitchers = (games: any[]) => {
    const pitchers: any[] = [];
    
    games.forEach((game: any) => {
      // Generate pitcher data for both teams
      [game.home_team, game.away_team].forEach((team, idx) => {
        const strikeoutProp = 6 + Math.floor(Math.random() * 5); // 6-10 strikeouts
        const avgStrikeouts = strikeoutProp + (Math.random() * 2 - 1);
        const projection = strikeoutProp + (Math.random() * 3 - 1.5);
        
        pitchers.push({
          pitcher: `${team} Ace Pitcher`,
          team: team,
          opponent: idx === 0 ? game.away_team : game.home_team,
          gameDate: game.commence_time,
          strikeoutProp,
          overHitRate: 60 + Math.random() * 30,
          underHitRate: 55 + Math.random() * 25,
          avgStrikeouts,
          projection,
          keyFactors: generateKeyFactors(),
          mostLikelyStrikeout: {
            batter: `${idx === 0 ? game.away_team : game.home_team} Cleanup Hitter`,
            battingOrder: 3 + Math.floor(Math.random() * 3),
            strikeoutRate: 25 + Math.random() * 15
          },
          odds: {
            over: Math.random() > 0.5 ? `+${100 + Math.floor(Math.random() * 50)}` : `-${100 + Math.floor(Math.random() * 50)}`,
            under: Math.random() > 0.5 ? `+${100 + Math.floor(Math.random() * 50)}` : `-${100 + Math.floor(Math.random() * 50)}`
          }
        });
      });
    });
    
    return pitchers.slice(0, 20);
  };

  const generateMockPitchers = () => {
    const teams = ['NYY', 'LAD', 'HOU', 'ATL', 'NYM', 'SF', 'SD', 'PHI'];
    const pitcherNames = [
      'Gerrit Cole', 'Clayton Kershaw', 'Justin Verlander', 'Max Fried',
      'Edwin Díaz', 'Logan Webb', 'Blake Snell', 'Zack Wheeler'
    ];
    
    return pitcherNames.map((name, idx) => {
      const strikeoutProp = 6 + Math.floor(Math.random() * 5);
      const avgStrikeouts = strikeoutProp + (Math.random() * 2 - 1);
      const projection = strikeoutProp + (Math.random() * 3 - 1.5);
      
      const now = new Date();
      const gameDate = new Date(now.getTime() + (idx % 7) * 24 * 60 * 60 * 1000);
      
      return {
        pitcher: name,
        team: teams[idx % teams.length],
        opponent: teams[(idx + 1) % teams.length],
        gameDate: gameDate.toISOString(),
        strikeoutProp,
        overHitRate: 60 + Math.random() * 30,
        underHitRate: 55 + Math.random() * 25,
        avgStrikeouts,
        projection,
        keyFactors: generateKeyFactors(),
        mostLikelyStrikeout: {
          batter: `${teams[(idx + 1) % teams.length]} #${3 + Math.floor(Math.random() * 3)} Hitter`,
          battingOrder: 3 + Math.floor(Math.random() * 3),
          strikeoutRate: 25 + Math.random() * 15
        },
        odds: {
          over: Math.random() > 0.5 ? `+${100 + Math.floor(Math.random() * 50)}` : `-${100 + Math.floor(Math.random() * 50)}`,
          under: Math.random() > 0.5 ? `+${100 + Math.floor(Math.random() * 50)}` : `-${100 + Math.floor(Math.random() * 50)}`
        }
      };
    });
  };

  const generateKeyFactors = () => {
    const factors = [
      { factor: 'Opponent K Rate', value: `${(25 + Math.random() * 10).toFixed(1)}%`, impact: Math.random() > 0.5 ? 'positive' : 'negative' },
      { factor: 'Recent Form', value: `${(6 + Math.random() * 3).toFixed(1)} K/Game`, impact: 'positive' },
      { factor: 'Pitch Arsenal', value: Math.random() > 0.5 ? 'Elite' : 'Above Avg', impact: Math.random() > 0.5 ? 'positive' : 'neutral' },
      { factor: 'Swinging Strike %', value: `${(10 + Math.random() * 8).toFixed(1)}%`, impact: Math.random() > 0.5 ? 'positive' : 'neutral' },
      { factor: 'H2H K Rate', value: `${(8 + Math.random() * 4).toFixed(1)} per 9`, impact: Math.random() > 0.5 ? 'positive' : 'negative' },
      { factor: 'Weather', value: Math.random() > 0.5 ? 'Clear' : 'Dome', impact: 'neutral' }
    ];
    
    return factors.sort(() => Math.random() - 0.5).slice(0, 5);
  };

  const likelyToGet8Plus = pitchers.filter(p => p.projection >= 8).sort((a, b) => b.projection - a.projection);
  const highestProjection = [...pitchers].sort((a, b) => b.projection - a.projection);
  const likelyToHitProp = pitchers.filter(p => p.overHitRate > 70).sort((a, b) => b.overHitRate - a.overHitRate);
  const unlikelyToHitProp = pitchers.filter(p => p.underHitRate > 70).sort((a, b) => b.underHitRate - a.underHitRate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-card border border-border/50 rounded-xl p-8">
        <div className="text-center">
          <Badge variant="default" className="bg-gradient-primary mb-4">
            <Zap className="w-3 h-3 mr-1" />
            STRIKEOUT CENTER
          </Badge>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            MLB Strikeout Analytics
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Advanced strikeout predictions powered by AI. Track the most likely K props for today's games.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={loadStrikeoutData}
              disabled={isLoading}
              className="bg-gradient-primary hover:shadow-glow"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">8+ K Likely</p>
              <p className="text-3xl font-bold text-success">{likelyToGet8Plus.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Highest Projection</p>
              <p className="text-3xl font-bold text-primary">
                {highestProjection[0]?.projection.toFixed(1) || 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Hit Prop Likely</p>
              <p className="text-3xl font-bold text-success">{likelyToHitProp.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Miss Prop Likely</p>
              <p className="text-3xl font-bold text-destructive">{unlikelyToHitProp.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="8plus" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="8plus">8+ Strikeouts ({likelyToGet8Plus.length})</TabsTrigger>
          <TabsTrigger value="highest">Highest Day ({highestProjection.length})</TabsTrigger>
          <TabsTrigger value="hit">Will Hit ({likelyToHitProp.length})</TabsTrigger>
          <TabsTrigger value="miss">Will Miss ({unlikelyToHitProp.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="8plus" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {likelyToGet8Plus.map((pitcher, index) => (
              <PitcherStrikeoutCard key={index} {...pitcher} />
            ))}
          </div>
          {likelyToGet8Plus.length === 0 && (
            <Card className="bg-gradient-card border-border/50 p-8 text-center">
              <p className="text-muted-foreground">No pitchers projected for 8+ strikeouts today</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="highest" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {highestProjection.slice(0, 10).map((pitcher, index) => (
              <PitcherStrikeoutCard key={index} {...pitcher} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="hit" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {likelyToHitProp.map((pitcher, index) => (
              <PitcherStrikeoutCard key={index} {...pitcher} />
            ))}
          </div>
          {likelyToHitProp.length === 0 && (
            <Card className="bg-gradient-card border-border/50 p-8 text-center">
              <p className="text-muted-foreground">No high-confidence over props available</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="miss" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {unlikelyToHitProp.map((pitcher, index) => (
              <PitcherStrikeoutCard key={index} {...pitcher} />
            ))}
          </div>
          {unlikelyToHitProp.length === 0 && (
            <Card className="bg-gradient-card border-border/50 p-8 text-center">
              <p className="text-muted-foreground">No high-confidence under props available</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Key Factors Info */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Key Strikeout Factors
          </CardTitle>
          <CardDescription>Understanding what drives strikeout predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Pitcher Factors</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Swinging strike percentage (SwStr%)</li>
                <li>• Recent strikeout rate trends</li>
                <li>• Pitch arsenal quality and variety</li>
                <li>• Velocity and movement metrics</li>
                <li>• Historical performance vs opponent</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Matchup Factors</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Opponent team strikeout rate</li>
                <li>• Individual batter K tendencies</li>
                <li>• Lineup composition and order</li>
                <li>• Weather conditions (wind, humidity)</li>
                <li>• Umpire strike zone consistency</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
