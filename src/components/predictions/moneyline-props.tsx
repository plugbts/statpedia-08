import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Target, 
  BarChart3, 
  Brain, 
  Zap,
  Calendar,
  Users,
  Activity,
  AlertCircle,
  Play,
  RotateCcw,
  DollarSign,
  Shield
} from 'lucide-react';
import { SimulationAnalysis } from './simulation-analysis';
import { cn } from '@/lib/utils';

interface MoneylineGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  date: string;
  homeOdds: number;
  awayOdds: number;
  drawOdds?: number;
  homeForm: number[];
  awayForm: number[];
  h2hData: {
    homeWins: number;
    awayWins: number;
    draws: number;
  };
  injuries: {
    home: string[];
    away: string[];
  };
  restDays: {
    home: number;
    away: number;
  };
  weather: string;
  venue: string;
  status: 'upcoming' | 'live' | 'finished';
  homeScore?: number;
  awayScore?: number;
}

interface MoneylinePropsProps {
  userSubscription: string;
  userRole?: string;
}

export const MoneylineProps: React.FC<MoneylinePropsProps> = ({ 
  userSubscription, 
  userRole = 'user' 
}) => {
  const [games, setGames] = useState<MoneylineGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<MoneylineGame | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('games');

  const isSubscribed = userRole === 'owner' || userSubscription !== 'free';

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would fetch from an API
      const mockGames = generateMockGames();
      setGames(mockGames);
    } catch (err) {
      setError('Failed to load moneyline games');
      console.error('Error loading games:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockGames = (): MoneylineGame[] => {
    const sports = ['nba', 'nfl', 'mlb', 'nhl', 'soccer'];
    const teams = {
      nba: ['LAL', 'GSW', 'BOS', 'MIA', 'PHX', 'MIL', 'DEN', 'PHI', 'DAL', 'MEM'],
      nfl: ['KC', 'BUF', 'TB', 'GB', 'DAL', 'SF', 'CIN', 'LAR', 'MIA', 'BAL'],
      mlb: ['NYY', 'LAD', 'HOU', 'ATL', 'TB', 'SD', 'TOR', 'CWS', 'STL', 'CLE'],
      nhl: ['COL', 'FLA', 'EDM', 'NYR', 'CAR', 'VGK', 'TOR', 'BOS', 'DAL', 'MIN'],
      soccer: ['MCI', 'ARS', 'LIV', 'CHE', 'TOT', 'MUN', 'NEW', 'AVL', 'BHA', 'WHU']
    };

    const games: MoneylineGame[] = [];
    const currentDate = new Date();

    for (let i = 0; i < 20; i++) {
      const sport = sports[Math.floor(Math.random() * sports.length)];
      const sportTeams = teams[sport as keyof typeof teams];
      const homeTeam = sportTeams[Math.floor(Math.random() * sportTeams.length)];
      let awayTeam = sportTeams[Math.floor(Math.random() * sportTeams.length)];
      
      while (awayTeam === homeTeam) {
        awayTeam = sportTeams[Math.floor(Math.random() * sportTeams.length)];
      }

      const gameDate = new Date(currentDate.getTime() + (i * 24 * 60 * 60 * 1000));
      const isHomeFavorite = Math.random() > 0.5;
      const homeOdds = isHomeFavorite ? 
        -(Math.random() * 150 + 100) : 
        (Math.random() * 200 + 100);
      const awayOdds = isHomeFavorite ? 
        (Math.random() * 200 + 100) : 
        -(Math.random() * 150 + 100);

      games.push({
        id: `${sport}_${i}`,
        homeTeam,
        awayTeam,
        sport: sport.toUpperCase(),
        date: gameDate.toISOString(),
        homeOdds: Math.round(homeOdds),
        awayOdds: Math.round(awayOdds),
        drawOdds: sport === 'soccer' ? Math.round(Math.random() * 100 + 200) : undefined,
        homeForm: Array.from({ length: 10 }, () => Math.random() * 2 - 1),
        awayForm: Array.from({ length: 10 }, () => Math.random() * 2 - 1),
        h2hData: {
          homeWins: Math.floor(Math.random() * 5),
          awayWins: Math.floor(Math.random() * 5),
          draws: sport === 'soccer' ? Math.floor(Math.random() * 3) : 0
        },
        injuries: {
          home: Array.from({ length: Math.floor(Math.random() * 3) }, () => 
            ['knee', 'ankle', 'shoulder', 'back'][Math.floor(Math.random() * 4)]
          ),
          away: Array.from({ length: Math.floor(Math.random() * 3) }, () => 
            ['knee', 'ankle', 'shoulder', 'back'][Math.floor(Math.random() * 4)]
          )
        },
        restDays: {
          home: Math.floor(Math.random() * 7) + 1,
          away: Math.floor(Math.random() * 7) + 1
        },
        weather: ['clear', 'cloudy', 'rainy', 'snowy', 'windy'][Math.floor(Math.random() * 5)],
        venue: `${homeTeam} Arena`,
        status: i < 2 ? 'live' : 'upcoming'
      });
    }

    return games;
  };

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : `${odds}`;
  };

  const getOddsColor = (odds: number) => {
    if (odds > 0) return 'text-green-500';
    if (odds < -150) return 'text-red-500';
    return 'text-yellow-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'text-red-500 bg-red-500/10';
      case 'upcoming': return 'text-blue-500 bg-blue-500/10';
      case 'finished': return 'text-gray-500 bg-gray-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getSportIcon = (sport: string) => {
    const icons = {
      NBA: '🏀',
      NFL: '🏈',
      MLB: '⚾',
      NHL: '🏒',
      SOCCER: '⚽'
    };
    return icons[sport as keyof typeof icons] || '🎯';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading moneyline games...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadGames}
            className="ml-2"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Moneyline Predictions</h1>
          <p className="text-muted-foreground">
            AI-powered final score predictions with thousands of simulations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Brain className="w-3 h-3" />
            AI Analysis
          </Badge>
          <Badge variant="outline" className="gap-1">
            <BarChart3 className="w-3 h-3" />
            10K Simulations
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="analysis" disabled={!selectedGame}>
            Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="games" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {games.map((game) => (
              <Card 
                key={game.id} 
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
                  selectedGame?.id === game.id && "ring-2 ring-primary",
                  !isSubscribed && "blur-sm"
                )}
                onClick={() => setSelectedGame(game)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getSportIcon(game.sport)}</span>
                      <Badge className={getStatusColor(game.status)}>
                        {game.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(game.date).toLocaleDateString()}
                    </div>
                  </div>
                  <CardTitle className="text-lg">
                    {game.homeTeam} vs {game.awayTeam}
                  </CardTitle>
                  <CardDescription>
                    {game.venue} • {game.weather}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Odds */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center space-y-1">
                      <div className="text-sm text-muted-foreground">{game.homeTeam}</div>
                      <div className={cn("text-lg font-bold", getOddsColor(game.homeOdds))}>
                        {formatOdds(game.homeOdds)}
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <div className="text-sm text-muted-foreground">{game.awayTeam}</div>
                      <div className={cn("text-lg font-bold", getOddsColor(game.awayOdds))}>
                        {formatOdds(game.awayOdds)}
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-2 text-xs text-center">
                    <div>
                      <div className="text-muted-foreground">H2H</div>
                      <div className="font-medium">
                        {game.h2hData.homeWins}-{game.h2hData.awayWins}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Rest</div>
                      <div className="font-medium">
                        {game.restDays.home}-{game.restDays.away}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Injuries</div>
                      <div className="font-medium">
                        {game.injuries.home.length}-{game.injuries.away.length}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button 
                    className="w-full" 
                    variant={selectedGame?.id === game.id ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGame(game);
                      setActiveTab('analysis');
                    }}
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Run AI Analysis
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          {selectedGame ? (
            <SimulationAnalysis
              homeTeam={selectedGame.homeTeam}
              awayTeam={selectedGame.awayTeam}
              sport={selectedGame.sport.toLowerCase()}
              homeForm={selectedGame.homeForm}
              awayForm={selectedGame.awayForm}
              h2hData={selectedGame.h2hData}
              injuries={selectedGame.injuries}
              restDays={selectedGame.restDays}
              weather={selectedGame.weather}
              venue={selectedGame.venue}
              homeOdds={selectedGame.homeOdds}
              awayOdds={selectedGame.awayOdds}
              drawOdds={selectedGame.drawOdds}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Game</h3>
                <p className="text-muted-foreground">
                  Choose a game from the list to run AI analysis and predictions
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Subscription Overlay for Free Users */}
      {!isSubscribed && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle>Premium Feature</CardTitle>
              <CardDescription>
                Subscribe to Pro to access AI-powered moneyline predictions with thousands of simulations
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Brain className="w-4 h-4 text-primary" />
                  <span>10,000+ Monte Carlo simulations</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span>Historical backtesting analysis</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-primary" />
                  <span>Final score predictions</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span>Expected value calculations</span>
                </div>
              </div>
              <Button className="w-full">
                <DollarSign className="w-4 h-4 mr-2" />
                Subscribe to Pro
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
