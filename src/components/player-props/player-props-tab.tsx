import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { SubscriptionOverlay } from '@/components/ui/subscription-overlay';
import { PlayerAnalysisOverlay } from './player-analysis-overlay';
import { PlayerPropCardAd } from '@/components/ads/ad-placements';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Search, 
  Filter, 
  Eye, 
  EyeOff, 
  BarChart3, 
  RefreshCw, 
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Settings,
  Save,
  Download,
  Upload,
  Activity,
  Target,
  Zap
} from 'lucide-react';
import { sportsDataIOAPI } from '@/services/sportsdataio-api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PlayerPropsTabProps {
  userSubscription: string;
  userRole?: string;
  selectedSport: string;
}

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

interface MyPick {
  id: string;
  prop: PlayerProp;
  prediction: 'over' | 'under';
  confidence: number;
  addedAt: string;
}

export const PlayerPropsTab: React.FC<PlayerPropsTabProps> = ({ 
  userSubscription, 
  userRole = 'user', 
  selectedSport 
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState(selectedSport || 'nfl');
  const [propTypeFilter, setPropTypeFilter] = useState('all');
  const [selectedProps, setSelectedProps] = useState<string[]>([]);
  const [realProps, setRealProps] = useState<PlayerProp[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [myPicks, setMyPicks] = useState<MyPick[]>([]);
  const [showMyPicks, setShowMyPicks] = useState(false);
  const [selectedPlayerForAnalysis, setSelectedPlayerForAnalysis] = useState<PlayerProp | null>(null);
  const [showAnalysisOverlay, setShowAnalysisOverlay] = useState(false);
  const [sortBy, setSortBy] = useState<'confidence' | 'ev' | 'line' | 'player'>('confidence');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minConfidence, setMinConfidence] = useState(0);
  const [minEV, setMinEV] = useState(0);
  const [showOnlyPositiveEV, setShowOnlyPositiveEV] = useState(false);

  // Update sport filter when selectedSport changes
  useEffect(() => {
    setSportFilter(selectedSport);
    loadPlayerProps(selectedSport);
  }, [selectedSport]);

  // Load player props from SportsDataIO API
  const loadPlayerProps = async (sport: string) => {
    if (!sport) return;
    
    setIsLoadingData(true);
    try {
      console.log(`🎯 Loading player props for ${sport} from SportsDataIO...`);
      const props = await sportsDataIOAPI.getPlayerProps(sport);
      setRealProps(props);
      console.log(`✅ Loaded ${props.length} player props for ${sport}`);
    } catch (error) {
      console.error('❌ Failed to load player props:', error);
      toast({
        title: "Error",
        description: "Failed to load player props. Please try again.",
        variant: "destructive",
      });
      setRealProps([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Format numbers to be compact
  const formatNumber = (value: number, decimals: number = 1): string => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(decimals) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(decimals) + 'K';
    } else if (value >= 100) {
      return value.toFixed(0);
    } else if (value >= 10) {
      return value.toFixed(1);
    } else {
      return value.toFixed(decimals);
    }
  };

  // Format odds
  const formatOdds = (odds: number): string => {
    if (odds > 0) {
      return `+${odds}`;
    }
    return odds.toString();
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Filter and sort props
  const filteredProps = realProps
    .filter(prop => {
      const matchesSearch = prop.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           prop.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           prop.propType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPropType = propTypeFilter === 'all' || prop.propType === propTypeFilter;
      const matchesConfidence = (prop.confidence || 0) >= minConfidence / 100;
      const matchesEV = (prop.expectedValue || 0) >= minEV / 100;
      const matchesPositiveEV = !showOnlyPositiveEV || (prop.expectedValue || 0) > 0;
      
      return matchesSearch && matchesPropType && matchesConfidence && matchesEV && matchesPositiveEV;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'confidence':
          aValue = a.confidence || 0;
          bValue = b.confidence || 0;
          break;
        case 'ev':
          aValue = a.expectedValue || 0;
          bValue = b.expectedValue || 0;
          break;
        case 'line':
          aValue = a.line;
          bValue = b.line;
          break;
        case 'player':
          aValue = a.playerName;
          bValue = b.playerName;
          break;
        default:
          return 0;
      }
      
      if (sortBy === 'player') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  // Handle player analysis
  const handlePlayerAnalysis = (prop: PlayerProp) => {
    setSelectedPlayerForAnalysis(prop);
    setShowAnalysisOverlay(true);
  };

  // Handle toggle my pick
  const handleToggleMyPick = (prop: PlayerProp) => {
    const existingPick = myPicks.find(pick => pick.prop.id === prop.id);
    
    if (existingPick) {
      setMyPicks(prev => prev.filter(pick => pick.prop.id !== prop.id));
      toast({
        title: "Removed from picks",
        description: `${prop.playerName} ${prop.propType} removed from your picks.`,
      });
    } else {
      const newPick: MyPick = {
        id: `${prop.id}_${Date.now()}`,
        prop,
        prediction: prop.aiPrediction?.recommended || 'over',
        confidence: prop.confidence || 0.5,
        addedAt: new Date().toISOString(),
      };
      setMyPicks(prev => [...prev, newPick]);
      toast({
        title: "Added to picks",
        description: `${prop.playerName} ${prop.propType} added to your picks.`,
      });
    }
  };

  // Get unique prop types for filter
  const propTypes = Array.from(new Set(realProps.map(prop => prop.propType))).sort();

  // Check if user is subscribed
  const isSubscribed = userSubscription === 'pro' || userSubscription === 'premium' || userRole === 'admin' || userRole === 'owner';

  if (!isSubscribed) {
    return (
      <div className="relative">
        <SubscriptionOverlay />
        <div className="min-h-screen bg-background p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-20">
              <h1 className="text-4xl font-bold text-foreground mb-4">Player Props</h1>
              <p className="text-xl text-muted-foreground mb-8">
                Access detailed player prop analysis and predictions
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Player Props</h1>
            <p className="text-muted-foreground">
              Real-time player prop analysis and predictions for {sportFilter.toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => loadPlayerProps(sportFilter)}
              disabled={isLoadingData}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoadingData && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowMyPicks(true)}
            >
              <BookmarkCheck className="w-4 h-4 mr-2" />
              My Picks ({myPicks.length})
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* Sport Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Sport:</label>
                <Select value={sportFilter} onValueChange={(value) => {
                  setSportFilter(value);
                  loadPlayerProps(value);
                }}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nfl">NFL</SelectItem>
                    <SelectItem value="nba">NBA</SelectItem>
                    <SelectItem value="mlb">MLB</SelectItem>
                    <SelectItem value="nhl">NHL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search players, teams, props..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
              </div>

              {/* Prop Type Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Prop Type:</label>
                <Select value={propTypeFilter} onValueChange={setPropTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {propTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Sort by:</label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confidence">Confidence</SelectItem>
                    <SelectItem value="ev">Expected Value</SelectItem>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="player">Player</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
              </div>

              {/* Advanced Filters */}
              <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Advanced Filters</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Min Confidence: {minConfidence}%</label>
                      <Slider
                        value={[minConfidence]}
                        onValueChange={([value]) => setMinConfidence(value)}
                        max={100}
                        step={5}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Min Expected Value: {minEV}%</label>
                      <Slider
                        value={[minEV]}
                        onValueChange={([value]) => setMinEV(value)}
                        max={50}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="positiveEV"
                        checked={showOnlyPositiveEV}
                        onCheckedChange={(checked) => setShowOnlyPositiveEV(checked as boolean)}
                      />
                      <label htmlFor="positiveEV" className="text-sm font-medium">
                        Only positive expected value
                      </label>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoadingData && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-muted-foreground">Loading player props...</span>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!isLoadingData && filteredProps.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Player Props Found</h3>
              <p className="text-muted-foreground mb-4">
                No player props available for {sportFilter.toUpperCase()} with current filters.
              </p>
              <Button onClick={() => loadPlayerProps(sportFilter)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Player Props Grid */}
        {!isLoadingData && filteredProps.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProps.map((prop) => (
              <Card 
                key={prop.id}
                className="p-6 hover:shadow-card-hover transition-all duration-300 hover-scale group bg-gradient-card border-border/50 hover:border-primary/30 cursor-pointer"
                onClick={() => handlePlayerAnalysis(prop)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-lg mb-1">
                      {prop.playerName}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {prop.team} vs {prop.opponent}
                    </p>
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                      <p className="text-lg font-bold text-primary">
                        {prop.propType} Over {formatNumber(prop.line)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {prop.propType === 'Passing Yards' && 'Total passing yards in the game'}
                        {prop.propType === 'Rushing Yards' && 'Total rushing yards in the game'}
                        {prop.propType === 'Receiving Yards' && 'Total receiving yards in the game'}
                        {prop.propType === 'Passing TDs' && 'Total passing touchdowns in the game'}
                        {prop.propType === 'Rushing TDs' && 'Total rushing touchdowns in the game'}
                        {prop.propType === 'Receptions' && 'Total receptions in the game'}
                        {prop.propType === 'Points' && 'Total points scored in the game'}
                        {prop.propType === 'Rebounds' && 'Total rebounds in the game'}
                        {prop.propType === 'Assists' && 'Total assists in the game'}
                        {prop.propType === '3-Pointers Made' && 'Total 3-pointers made in the game'}
                        {prop.propType === 'Steals' && 'Total steals in the game'}
                        {prop.propType === 'Blocks' && 'Total blocks in the game'}
                        {prop.propType === 'Hits' && 'Total hits in the game'}
                        {prop.propType === 'Runs' && 'Total runs scored in the game'}
                        {prop.propType === 'Strikeouts' && 'Total strikeouts in the game'}
                        {prop.propType === 'Home Runs' && 'Total home runs in the game'}
                        {prop.propType === 'RBIs' && 'Total RBIs in the game'}
                        {prop.propType === 'Total Bases' && 'Total bases in the game'}
                        {prop.propType === 'Goals' && 'Total goals scored in the game'}
                        {prop.propType === 'Shots on Goal' && 'Total shots on goal in the game'}
                        {prop.propType === 'Saves' && 'Total saves in the game'}
                        {prop.propType === 'PIM' && 'Total penalty minutes in the game'}
                        {!['Passing Yards', 'Rushing Yards', 'Receiving Yards', 'Passing TDs', 'Rushing TDs', 'Receptions', 'Points', 'Rebounds', 'Assists', '3-Pointers Made', 'Steals', 'Blocks', 'Hits', 'Runs', 'Strikeouts', 'Home Runs', 'RBIs', 'Total Bases', 'Goals', 'Shots on Goal', 'Saves', 'PIM'].includes(prop.propType) && 'Player performance in the game'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayerAnalysis(prop);
                      }}
                      className="p-1"
                      title="Player Analysis"
                    >
                      <BarChart3 className="w-4 h-4 text-blue-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleMyPick(prop);
                      }}
                      className="p-1"
                    >
                      {myPicks.some(pick => pick.prop.id === prop.id) ? (
                        <BookmarkCheck className="w-4 h-4 text-primary" />
                      ) : (
                        <Bookmark className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="text-lg font-bold text-primary">
                      {formatPercentage(prop.confidence || 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Expected Value</p>
                    <p className={cn(
                      "text-lg font-bold",
                      (prop.expectedValue || 0) > 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {formatPercentage(prop.expectedValue || 0)}
                    </p>
                  </div>
                </div>

                {/* Odds Row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <p className="text-xs text-muted-foreground">Over</p>
                    <p className="text-sm font-bold text-green-600">
                      {formatOdds(prop.overOdds)}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <p className="text-xs text-muted-foreground">Under</p>
                    <p className="text-sm font-bold text-red-600">
                      {formatOdds(prop.underOdds)}
                    </p>
                  </div>
                </div>

                {/* AI Prediction */}
                {prop.aiPrediction && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">AI Prediction</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {prop.aiPrediction.recommended === 'over' ? (
                        <ArrowUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">
                        {prop.aiPrediction.recommended.toUpperCase()} {formatNumber(prop.line)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {formatPercentage(prop.aiPrediction.confidence)}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Game Info */}
                <div className="mt-4 pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{prop.gameTime}</span>
                    <span>{prop.gameDate.split('T')[0]}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* My Picks Dialog */}
        <Dialog open={showMyPicks} onOpenChange={setShowMyPicks}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>My Picks ({myPicks.length})</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {myPicks.length === 0 ? (
                <div className="text-center py-8">
                  <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No picks added yet</p>
                </div>
              ) : (
                myPicks.map((pick) => (
                  <Card key={pick.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{pick.prop.playerName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {pick.prop.propType} {pick.prediction} {formatNumber(pick.prop.line)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pick.prop.team} vs {pick.prop.opponent}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {formatPercentage(pick.confidence)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleMyPick(pick.prop)}
                        >
                          <BookmarkCheck className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Player Analysis Overlay */}
        {selectedPlayerForAnalysis && (
          <PlayerAnalysisOverlay
            isOpen={showAnalysisOverlay}
            onClose={() => {
              setShowAnalysisOverlay(false);
              setSelectedPlayerForAnalysis(null);
            }}
            playerProp={selectedPlayerForAnalysis}
          />
        )}
      </div>
    </div>
  );
};