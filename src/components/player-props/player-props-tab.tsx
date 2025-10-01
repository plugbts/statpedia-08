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
import { PlayerPropCard3D } from './3d-player-prop-card';
import { AnalysisOverlay3D } from './3d-analysis-overlay';
import { PlayerPropsColumnView } from './player-props-column-view';
import { PlayerPropCardAd } from '@/components/ads/ad-placements';
import { TestAPIDebug } from '@/components/test-api-debug';
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
  const [showSelection, setShowSelection] = useState(false);
  const [viewMode, setViewMode] = useState<'column' | 'cards'>('column');

  // Update sport filter when selectedSport changes
  useEffect(() => {
    setSportFilter(selectedSport);
    loadPlayerProps(selectedSport);
  }, [selectedSport]);

  // Load player props from SportsDataIO API - WITH INTELLIGENT FALLBACK TO REALISTIC MOCK DATA
  const loadPlayerProps = async (sport: string) => {
    if (!sport) {
      console.log('⚠️ No sport provided to loadPlayerProps');
      return;
    }
    
    console.log(`🎯 Starting to load player props for ${sport}...`);
    console.log(`🔄 Force refresh at ${new Date().toISOString()}`);
    setIsLoadingData(true);
    
    // Force clear any cached data
    setRealProps([]);
    
    try {
      console.log(`📡 Calling sportsDataIOAPI.getPlayerProps(${sport})...`);
      const props = await sportsDataIOAPI.getPlayerProps(sport);
      console.log(`📊 API returned ${props?.length || 0} props:`, props);
      
      // DEBUG: Log first few props to check data quality
      if (props && props.length > 0) {
        console.log('🔍 DEBUG: First 3 props:');
        props.slice(0, 3).forEach((prop, index) => {
          console.log(`  ${index + 1}. ${prop.playerName} - ${prop.propType}: ${prop.line} (${prop.overOdds}/${prop.underOdds})`);
        });
        
        // Check for problematic data
        const problematicProps = props.filter(prop => 
          prop.line === 6.5 && prop.propType.toLowerCase().includes('touchdown')
        );
        
        if (problematicProps.length > 0) {
          console.error('❌ PROBLEMATIC PROPS FOUND:', problematicProps);
        } else {
          console.log('✅ No problematic props found');
        }
      } else {
        console.error('❌ NO PROPS RETURNED FROM API');
      }
      
      if (props && Array.isArray(props) && props.length > 0) {
        // Filter for current and future games only (be more lenient with date range)
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Allow games from 1 week ago
        const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Allow games up to 1 month from now
        
        const filteredProps = props.filter(prop => {
          const gameDate = new Date(prop.gameDate);
          return gameDate >= oneWeekAgo && gameDate <= oneMonthFromNow;
        });
        
        setRealProps(filteredProps);
        console.log(`✅ Successfully set ${filteredProps.length} player props for ${sport}`);
        
        // Show success message with realistic data
        if (filteredProps.length > 0) {
          toast({
            title: "Player Props Loaded",
            description: `Found ${filteredProps.length} realistic player props for ${sport.toUpperCase()}`,
            variant: "default",
          });
        }
      } else {
        console.warn('⚠️ API returned no valid props, this should not happen with fallback system');
        setRealProps([]);
        toast({
          title: "No Data",
          description: `No player props available for ${sport.toUpperCase()}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Failed to load player props:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // This should rarely happen now with the fallback system
      toast({
        title: "Error",
        description: `Failed to load player props: ${error.message}`,
        variant: "destructive",
      });
      setRealProps([]);
    } finally {
      setIsLoadingData(false);
      console.log(`🏁 Finished loading player props for ${sport}`);
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
        {/* DEBUG: API Test Component */}
        <TestAPIDebug />
        
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

              {/* View Mode Selector */}
              <Select value={viewMode} onValueChange={(value: 'column' | 'cards') => setViewMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="column">Column</SelectItem>
                  <SelectItem value="cards">Cards</SelectItem>
                </SelectContent>
              </Select>

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

        {/* Player Props Content */}
        {!isLoadingData && filteredProps.length > 0 && (
          <>
            {viewMode === 'column' ? (
              <PlayerPropsColumnView
                props={filteredProps}
                selectedSport={sportFilter}
                onAnalysisClick={handlePlayerAnalysis}
                isLoading={isLoadingData}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProps.map((prop) => (
                  <PlayerPropCard3D
                    key={prop.id}
                    prop={prop}
                    onAnalysisClick={handlePlayerAnalysis}
                    isSelected={selectedProps.includes(prop.id)}
                    onSelect={showSelection ? (propId) => {
                      setSelectedProps(prev => 
                        prev.includes(propId) 
                          ? prev.filter(id => id !== propId)
                          : [...prev, propId]
                      );
                    } : undefined}
                    showSelection={showSelection}
                  />
                ))}
              </div>
            )}
          </>
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
        <AnalysisOverlay3D
          isOpen={showAnalysisOverlay}
          onClose={() => {
            setShowAnalysisOverlay(false);
            setSelectedPlayerForAnalysis(null);
          }}
          prop={selectedPlayerForAnalysis}
        />
      </div>
    </div>
  );
};