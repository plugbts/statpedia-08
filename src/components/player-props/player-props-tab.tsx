import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Search, Filter, Eye, EyeOff, BarChart3 } from 'lucide-react';
import { PlayerPropCard } from './player-prop-card';

interface PlayerPropsTabProps {
  userSubscription: string;
}

export const PlayerPropsTab: React.FC<PlayerPropsTabProps> = ({ userSubscription }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('all');
  const [propTypeFilter, setPropTypeFilter] = useState('all');
  const [selectedProps, setSelectedProps] = useState<string[]>([]);

  const isSubscribed = userSubscription !== 'free';

  // Mock comprehensive player props data
  const allPlayerProps = [
    {
      id: '1',
      sport: 'nba' as const,
      playerName: 'LeBron James',
      team: 'LAL',
      opponent: 'GSW',
      propType: 'Points',
      line: 26.5,
      hitRate: 87.3,
      gamesTracked: 23,
      avgActualValue: 28.2,
      odds: '+110',
      recentForm: 'Excellent - 4 of last 5 over',
      homeAway: 'home' as const,
      injuryStatus: 'Healthy',
      weatherConditions: 'Indoor',
      // Advanced metrics
      potentialAssists: 8.4,
      potentialRebounds: 7.2,
      potentialThrees: 2.1,
      avgMinutes: 35.8,
      freeThrowAttempts: 5.2,
      defensiveRating: 108.3,
      offensiveRating: 118.7,
      usageRate: 31.2,
      paceFactor: 102.1,
      restDays: 1
    },
    {
      id: '2',
      sport: 'nfl' as const,
      playerName: 'Josh Allen',
      team: 'BUF',
      opponent: 'MIA',
      propType: 'Passing Yards',
      line: 267.5,
      hitRate: 73.9,
      gamesTracked: 18,
      avgActualValue: 289.4,
      odds: '-115',
      recentForm: 'Good - 3 of last 5 over',
      homeAway: 'away' as const,
      injuryStatus: 'Questionable - Shoulder',
      weatherConditions: 'Dome',
      // Advanced metrics specific to football
      potentialAssists: 0, // N/A for QB
      potentialRebounds: 0, // N/A for QB
      potentialThrees: 0, // N/A for QB
      avgMinutes: 0, // Use snaps instead
      freeThrowAttempts: 0, // N/A for QB
      defensiveRating: 0, // N/A for QB
      offensiveRating: 0, // N/A for QB
      usageRate: 0, // N/A for QB
      paceFactor: 65.2, // Plays per game
      restDays: 7
    },
    {
      id: '3',
      sport: 'nba' as const,
      playerName: 'Stephen Curry',
      team: 'GSW',
      opponent: 'LAL',
      propType: '3-Pointers Made',
      line: 4.5,
      hitRate: 92.1,
      gamesTracked: 19,
      avgActualValue: 5.2,
      odds: '-120',
      recentForm: 'Hot - 6 of last 7 over',
      homeAway: 'away' as const,
      injuryStatus: 'Healthy',
      weatherConditions: 'Indoor',
      potentialAssists: 6.8,
      potentialRebounds: 4.3,
      potentialThrees: 5.8,
      avgMinutes: 34.2,
      freeThrowAttempts: 3.1,
      defensiveRating: 112.8,
      offensiveRating: 125.4,
      usageRate: 33.7,
      paceFactor: 103.8,
      restDays: 2
    },
    {
      id: '4',
      sport: 'nba' as const,
      playerName: 'Giannis Antetokounmpo',
      team: 'MIL',
      opponent: 'PHI',
      propType: 'Rebounds',
      line: 10.5,
      hitRate: 45.2, // Intentionally low for free user limitation
      gamesTracked: 22,
      avgActualValue: 11.8,
      odds: '+105',
      recentForm: 'Average - 2 of last 5 over',
      homeAway: 'home' as const,
      injuryStatus: 'Healthy',
      weatherConditions: 'Indoor',
      potentialAssists: 5.9,
      potentialRebounds: 12.4,
      potentialThrees: 1.2,
      avgMinutes: 33.1,
      freeThrowAttempts: 6.8,
      defensiveRating: 105.7,
      offensiveRating: 120.2,
      usageRate: 36.8,
      paceFactor: 101.5,
      restDays: 0
    },
    {
      id: '5',
      sport: 'nfl' as const,
      playerName: 'Travis Kelce',
      team: 'KC',
      opponent: 'BUF',
      propType: 'Receiving Yards',
      line: 67.5,
      hitRate: 55.8, // Intentionally low for free user limitation
      gamesTracked: 16,
      avgActualValue: 78.3,
      odds: '+100',
      recentForm: 'Cold - 1 of last 5 over',
      homeAway: 'home' as const,
      injuryStatus: 'Healthy',
      weatherConditions: 'Clear',
      potentialAssists: 0,
      potentialRebounds: 0,
      potentialThrees: 0,
      avgMinutes: 0,
      freeThrowAttempts: 0,
      defensiveRating: 0,
      offensiveRating: 0,
      usageRate: 0,
      paceFactor: 68.9,
      restDays: 7
    }
  ];

  // Filter props based on subscription
  const getVisibleProps = () => {
    let filtered = allPlayerProps;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(prop => 
        prop.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop.propType.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sport filter
    if (sportFilter !== 'all') {
      filtered = filtered.filter(prop => prop.sport === sportFilter);
    }

    // Apply prop type filter
    if (propTypeFilter !== 'all') {
      filtered = filtered.filter(prop => prop.propType.toLowerCase().includes(propTypeFilter.toLowerCase()));
    }

    // For free users, limit visibility and accuracy
    if (!isSubscribed) {
      // Only show first 2 props
      filtered = filtered.slice(0, 2);
      
      // Cap hit rate at 65%
      filtered = filtered.map(prop => ({
        ...prop,
        hitRate: Math.min(prop.hitRate, 65)
      }));
    }

    return filtered;
  };

  const visibleProps = getVisibleProps();
  const totalProps = allPlayerProps.length;
  const hiddenCount = totalProps - (isSubscribed ? totalProps : 2);

  const togglePropSelection = (propId: string) => {
    setSelectedProps(prev => 
      prev.includes(propId) 
        ? prev.filter(id => id !== propId)
        : [...prev, propId]
    );
  };

  const getDeepAnalysis = () => {
    const selected = allPlayerProps.filter(prop => selectedProps.includes(prop.id));
    
    if (selected.length === 0) {
      return "Select player props to see detailed analysis";
    }

    return selected.map(prop => `
**${prop.playerName} - ${prop.propType} (${prop.line})**
- Current Form: ${prop.recentForm}
- Hit Rate: ${prop.hitRate}% over ${prop.gamesTracked} games
- Average Actual: ${prop.avgActualValue}
- Potential Assists: ${prop.potentialAssists}
- Potential Rebounds: ${prop.potentialRebounds}
- Minutes Per Game: ${prop.avgMinutes}
- Usage Rate: ${prop.usageRate}%
- Pace Factor: ${prop.paceFactor}
- Rest Days: ${prop.restDays}
- Injury Status: ${prop.injuryStatus}
    `).join('\n\n');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-card border border-border/50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="default" className="bg-gradient-primary">
                <BarChart3 className="w-3 h-3 mr-1" />
                PLAYER PROPS
              </Badge>
              {!isSubscribed && (
                <Badge variant="default" className="bg-gradient-accent">
                  <EyeOff className="w-3 h-3 mr-1" />
                  LIMITED ACCESS
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Player Props Analysis
            </h1>
            <p className="text-muted-foreground">
              {isSubscribed 
                ? `Comprehensive analysis of ${totalProps} player props with advanced metrics`
                : `Showing 2 of ${totalProps} props. Upgrade to see all with full analysis.`
              }
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-success">
              {isSubscribed ? totalProps : 2}
            </div>
            <div className="text-sm text-muted-foreground">
              Available Props
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players, teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                disabled={!isSubscribed}
              />
            </div>
            
            <Select value={sportFilter} onValueChange={setSportFilter} disabled={!isSubscribed}>
              <SelectTrigger>
                <SelectValue placeholder="All Sports" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                <SelectItem value="nba">NBA</SelectItem>
                <SelectItem value="nfl">NFL</SelectItem>
                <SelectItem value="nhl">NHL</SelectItem>
                <SelectItem value="mlb">MLB</SelectItem>
              </SelectContent>
            </Select>

            <Select value={propTypeFilter} onValueChange={setPropTypeFilter} disabled={!isSubscribed}>
              <SelectTrigger>
                <SelectValue placeholder="All Prop Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Props</SelectItem>
                <SelectItem value="points">Points</SelectItem>
                <SelectItem value="rebounds">Rebounds</SelectItem>
                <SelectItem value="assists">Assists</SelectItem>
                <SelectItem value="yards">Yards</SelectItem>
                <SelectItem value="three">3-Pointers</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('');
                setSportFilter('all');
                setPropTypeFilter('all');
              }}
              disabled={!isSubscribed}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Player Props Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            Available Player Props
          </h2>
          {selectedProps.length > 0 && (
            <Badge variant="default" className="bg-gradient-success">
              <Eye className="w-3 h-3 mr-1" />
              {selectedProps.length} SELECTED
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visibleProps.map((prop) => (
            <PlayerPropCard
              key={prop.id}
              {...prop}
              isSubscribed={isSubscribed}
              isSelected={selectedProps.includes(prop.id)}
              onToggleSelect={() => togglePropSelection(prop.id)}
            />
          ))}
        </div>

        {/* Upgrade prompt for free users */}
        {!isSubscribed && hiddenCount > 0 && (
          <Card className="bg-gradient-card border-warning border-2">
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <div className="blur-sm">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-40 bg-muted rounded-lg flex items-center justify-center">
                        <div className="text-muted-foreground">Player Prop {i + 3}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground">
                    {hiddenCount} More Props Available
                  </h3>
                  <p className="text-muted-foreground">
                    Upgrade to Pro or Premium to access all player props with full analysis
                  </p>
                  <Button className="bg-gradient-primary hover:shadow-glow">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Upgrade Now
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Deep Analysis Section */}
      {selectedProps.length > 0 && (
        <Card className={`bg-gradient-card border-border/50 ${!isSubscribed ? 'opacity-50' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Deep Analysis
              {!isSubscribed && (
                <Badge variant="outline" className="border-warning">
                  <EyeOff className="w-3 h-3 mr-1" />
                  Pro Feature
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Comprehensive breakdown of selected player props
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSubscribed ? (
              <div className="space-y-4">
                <pre className="whitespace-pre-wrap text-sm text-foreground bg-muted/50 p-4 rounded-lg">
                  {getDeepAnalysis()}
                </pre>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="blur-sm">
                  <div className="h-32 bg-muted/50 rounded-lg flex items-center justify-center">
                    <div className="text-muted-foreground">Deep Analysis Content</div>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Upgrade to unlock detailed analysis for selected props
                </p>
                <Button className="bg-gradient-primary hover:shadow-glow">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};