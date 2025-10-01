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
import { PlayerPropCard3D } from './3d-player-prop-card';
import { PlayerPropsColumnView } from './player-props-column-view';
import { EnhancedAnalysisOverlay } from '../predictions/enhanced-analysis-overlay';
import { PlayerPropCardAd } from '@/components/ads/ad-placements';
import { logAPI, logState, logFilter, logSuccess, logError, logWarning, logInfo, logDebug } from '@/utils/console-logger';
import { unifiedSportsAPI } from '@/services/unified-sports-api';
import { consistentPropsService, ConsistentPlayerProp } from '@/services/consistent-props-service';
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
import { sportsDataIOAPIFixed } from '@/services/sportsdataio-api-fixed';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PlayerPropsTabProps {
  userSubscription: string;
  userRole?: string;
  selectedSport: string;
}

interface PlayerProp {
  id: string;
  playerId: string;
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
    last5Games: number[];
    seasonHigh: number;
    seasonLow: number;
  };
  aiPrediction?: {
    recommended: 'over' | 'under';
    confidence: number;
    reasoning: string;
    factors: string[];
  };
  // Additional properties for consistency
  headshotUrl?: string;
  valueRating?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  factors?: string[];
  lastUpdated?: Date;
  isLive?: boolean;
  isBookmarked?: boolean;
  advancedReasoning?: string;
  injuryImpact?: string;
  weatherImpact?: string;
  matchupAnalysis?: string;
  historicalTrends?: string;
  keyInsights?: string[];
  allSportsbookOdds?: any[];
  confidenceFactors?: any[];
  marketId?: string;
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
  const [realProps, setRealProps] = useState<ConsistentPlayerProp[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [myPicks, setMyPicks] = useState<MyPick[]>([]);
  const [showMyPicks, setShowMyPicks] = useState(false);
  const [selectedPropForEnhancedAnalysis, setSelectedPropForEnhancedAnalysis] = useState<PlayerProp | null>(null);
  const [showEnhancedAnalysis, setShowEnhancedAnalysis] = useState(false);
  const [sortBy, setSortBy] = useState<'confidence' | 'ev' | 'line' | 'player'>('confidence');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minConfidence, setMinConfidence] = useState(0);
  const [minEV, setMinEV] = useState(0);
  const [showOnlyPositiveEV, setShowOnlyPositiveEV] = useState(false);
  const [minLine, setMinLine] = useState(0);
  const [maxLine, setMaxLine] = useState(100);
  const [showSelection, setShowSelection] = useState(false);
  const [viewMode, setViewMode] = useState<'column' | 'cards'>('column');
  const [selectedSportsbook, setSelectedSportsbook] = useState<string>('all');
  const [availableSportsbooks, setAvailableSportsbooks] = useState<{ key: string; title: string; lastUpdate: string }[]>([]);

  // Update sport filter when selectedSport changes
  useEffect(() => {
    logState('PlayerPropsTab', `useEffect triggered - selectedSport: ${selectedSport}`);
    setSportFilter(selectedSport);
    if (selectedSport) {
      logState('PlayerPropsTab', `Loading props for sport: ${selectedSport}`);
      loadPlayerProps(selectedSport);
      loadAvailableSportsbooks(selectedSport);
    } else {
      logWarning('PlayerPropsTab', 'No sport selected, skipping load');
    }
  }, [selectedSport]);

  // Reload props when sportsbook changes
  useEffect(() => {
    if (selectedSport && selectedSportsbook !== '') {
      logState('PlayerPropsTab', `Sportsbook changed to: ${selectedSportsbook}`);
      loadPlayerProps(selectedSport);
    }
  }, [selectedSportsbook]);

  // Cleanup odds updates on unmount
  useEffect(() => {
    return () => {
      consistentPropsService.stopOddsUpdates(sportFilter);
    };
  }, [sportFilter]);

  // Update max line when sport changes
  useEffect(() => {
    const newMaxLine = getMaxLineForSport(sportFilter);
    if (maxLine > newMaxLine) {
      setMaxLine(newMaxLine);
    }
    if (minLine > newMaxLine) {
      setMinLine(0);
    }
  }, [sportFilter, maxLine, minLine]);

  // Load available sportsbooks for the selected sport
  const loadAvailableSportsbooks = async (sport: string) => {
    try {
      const sportsbooks = await unifiedSportsAPI.getAvailableSportsbooks(sport.toLowerCase());
      setAvailableSportsbooks(sportsbooks);
      logSuccess('PlayerPropsTab', `Loaded ${sportsbooks.length} available sportsbooks for ${sport}`);
    } catch (error) {
      logError('PlayerPropsTab', `Failed to load sportsbooks for ${sport}:`, error);
    }
  };

    // Load player props from Fixed API Service - WORKING SOLUTION
    const loadPlayerProps = async (sport: string) => {
      if (!sport) {
        logWarning('PlayerPropsTab', 'No sport provided to loadPlayerProps');
        return;
      }
      
      logState('PlayerPropsTab', `Starting to load player props for ${sport}`);
      logState('PlayerPropsTab', `Force refresh at ${new Date().toISOString()}`);
      logDebug('PlayerPropsTab', `Current realProps length before load: ${realProps.length}`);
      setIsLoadingData(true);
      
      // Force clear any cached data
      setRealProps([]);
      
      try {
        const sportsbookFilter = selectedSportsbook === 'all' ? undefined : selectedSportsbook;
        logAPI('PlayerPropsTab', `Calling consistentPropsService.getConsistentPlayerProps(${sport})${sportsbookFilter ? ` with sportsbook: ${sportsbookFilter}` : ''}`);
        logDebug('PlayerPropsTab', `consistentPropsService: ${typeof consistentPropsService}`);
        const props = await consistentPropsService.getConsistentPlayerProps(sport, sportsbookFilter);
        logAPI('PlayerPropsTab', `Fixed API returned ${props?.length || 0} props`);
        
        // DEBUG: Log first few props to check data quality
        if (props && props.length > 0) {
          logDebug('PlayerPropsTab', 'First 3 props:', props.slice(0, 3));
          
          // Log specific line and odds data for debugging
          props.slice(0, 3).forEach((prop, index) => {
            logAPI('PlayerPropsTab', `Prop ${index + 1}: ${prop.playerName} - ${prop.propType}`);
            logAPI('PlayerPropsTab', `  Line: ${prop.line} (type: ${typeof prop.line})`);
            logAPI('PlayerPropsTab', `  Over Odds: ${prop.overOdds} (type: ${typeof prop.overOdds})`);
            logAPI('PlayerPropsTab', `  Under Odds: ${prop.underOdds} (type: ${typeof prop.underOdds})`);
          });
        } else {
          logError('PlayerPropsTab', 'NO PROPS RETURNED FROM API');
        }
        
        if (props && Array.isArray(props) && props.length > 0) {
          logSuccess('PlayerPropsTab', `Setting ${props.length} consistent player props for ${sport}`);
          logDebug('PlayerPropsTab', 'Consistent props sample:', props.slice(0, 2));
          setRealProps(props);
          
          // Start periodic odds updates for this sport
          consistentPropsService.startOddsUpdates(sport);
          
          // Show success message
          toast({
            title: "Player Props Loaded",
            description: `Found ${props.length} consistent player props for ${sport.toUpperCase()} with real-time FanDuel odds`,
            variant: "default",
          });
        } else {
          logWarning('PlayerPropsTab', 'API returned no valid props', props);
          setRealProps([]);
          toast({
            title: "No Data",
            description: `No player props available for ${sport.toUpperCase()}`,
            variant: "destructive",
          });
        }
      } catch (error) {
        logError('PlayerPropsTab', 'Failed to load player props:', error);
        logError('PlayerPropsTab', 'Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        
        toast({
          title: "Error",
          description: `Failed to load player props: ${error.message}`,
          variant: "destructive",
        });
        setRealProps([]);
      } finally {
        setIsLoadingData(false);
        logState('PlayerPropsTab', `Finished loading player props for ${sport}`);
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

  // Debug realProps state
  logDebug('PlayerPropsTab', `Current realProps length: ${realProps.length}`);
  if (realProps.length > 0) {
    logDebug('PlayerPropsTab', 'First realProp:', realProps[0]);
    logDebug('PlayerPropsTab', 'First 3 props:', realProps.slice(0, 3));
    
    // Debug specific data fields
    const firstProp = realProps[0];
    logDebug('PlayerPropsTab', 'First prop data check:', {
      playerName: firstProp.playerName,
      line: firstProp.line,
      overOdds: firstProp.overOdds,
      underOdds: firstProp.underOdds,
      confidence: firstProp.confidence,
      expectedValue: firstProp.expectedValue,
      propType: firstProp.propType
    });
  } else {
    logWarning('PlayerPropsTab', 'No realProps available');
  }

  // Simplified filtering - much less restrictive
  const filteredProps = realProps
    .filter(prop => {
      const matchesSearch = searchQuery === '' || 
                           prop.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           prop.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           prop.propType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPropType = propTypeFilter === 'all' || prop.propType === propTypeFilter;
      const matchesConfidence = (prop.confidence || 0.5) >= (minConfidence / 100);
      const matchesEV = (prop.expectedValue || 0) >= (minEV / 100);
      const matchesPositiveEV = !showOnlyPositiveEV || (prop.expectedValue || 0) >= 0;
      const matchesLine = prop.line >= minLine && prop.line <= maxLine;
      
      const passes = matchesSearch && matchesPropType && matchesConfidence && matchesEV && matchesPositiveEV && matchesLine;
      
      if (!passes && realProps.length < 10) {
        logFilter('PlayerPropsTab', `Prop ${prop.playerName} filtered out: search=${matchesSearch}, type=${matchesPropType}, confidence=${matchesConfidence}, ev=${matchesEV}, positiveEV=${matchesPositiveEV}, line=${matchesLine}`);
      }
      
      return passes;
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

  logFilter('PlayerPropsTab', `Final filteredProps length: ${filteredProps.length}`);
  logFilter('PlayerPropsTab', `Filter settings: minConfidence=${minConfidence}, minEV=${minEV}, showOnlyPositiveEV=${showOnlyPositiveEV}, propTypeFilter=${propTypeFilter}, lineRange=${minLine}-${maxLine}`);
  logFilter('PlayerPropsTab', `Search query: "${searchQuery}"`);
  
  if (filteredProps.length === 0 && realProps.length > 0) {
    logWarning('PlayerPropsTab', 'All props filtered out! Checking first few props:', realProps.slice(0, 3));
    
    // Debug why props are being filtered out
    const sampleProp = realProps[0];
    const matchesConfidence = (sampleProp.confidence || 0.5) >= (minConfidence / 100);
    const matchesEV = (sampleProp.expectedValue || 0) >= (minEV / 100);
    const matchesPropType = propTypeFilter === 'all' || sampleProp.propType === propTypeFilter;
    
    logWarning('PlayerPropsTab', 'Sample prop filter check:', {
      playerName: sampleProp.playerName,
      confidence: sampleProp.confidence,
      expectedValue: sampleProp.expectedValue,
      propType: sampleProp.propType,
      matchesConfidence,
      matchesEV,
      matchesPropType,
      minConfidence: minConfidence / 100,
      minEV: minEV / 100
    });
  }
  
  if (filteredProps.length > 0) {
    logSuccess('PlayerPropsTab', `Successfully filtered ${filteredProps.length} props`);
    const firstFiltered = filteredProps[0];
    logDebug('PlayerPropsTab', 'First filtered prop:', {
      playerName: firstFiltered.playerName,
      line: firstFiltered.line,
      overOdds: firstFiltered.overOdds,
      underOdds: firstFiltered.underOdds
    });
  }

  // Handle enhanced analysis
  const handleEnhancedAnalysis = (prop: PlayerProp) => {
    setSelectedPropForEnhancedAnalysis(prop);
    setShowEnhancedAnalysis(true);
  };

  // Get maximum line value based on sport
  const getMaxLineForSport = (sport: string): number => {
    switch (sport.toLowerCase()) {
      case 'nfl':
        return 500;
      case 'nba':
      case 'mlb':
      case 'nhl':
      default:
        return 100;
    }
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
        <SubscriptionOverlay isVisible={true} />
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
              onClick={() => {
                logState('PlayerPropsTab', `Manual refresh triggered for ${sportFilter}`);
                loadPlayerProps(sportFilter);
              }}
              disabled={isLoadingData}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoadingData && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                logState('PlayerPropsTab', 'Force clearing all data');
                setRealProps([]);
                setTimeout(() => {
                  logState('PlayerPropsTab', 'Force reloading after clear');
                  loadPlayerProps(sportFilter);
                }, 100);
              }}
              disabled={isLoadingData}
            >
              Force Clear
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

              {/* Sportsbook Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Sportsbook:</label>
                <Select value={selectedSportsbook} onValueChange={(value) => {
                  setSelectedSportsbook(value);
                }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Sportsbooks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sportsbooks</SelectItem>
                    {availableSportsbooks.map(sportsbook => (
                      <SelectItem key={sportsbook.key} value={sportsbook.key}>
                        {sportsbook.title}
                      </SelectItem>
                    ))}
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
                    <div>
                      <label className="text-sm font-medium">Line Range: {minLine} - {maxLine} (Max: {getMaxLineForSport(sportFilter)})</label>
                      <div className="space-y-2 mt-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Min Line</label>
                          <Slider
                            value={[minLine]}
                            onValueChange={([value]) => setMinLine(value)}
                            max={Math.min(maxLine - 0.5, getMaxLineForSport(sportFilter) - 0.5)}
                            min={0}
                            step={0.5}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Max Line</label>
                          <Slider
                            value={[maxLine]}
                            onValueChange={([value]) => setMaxLine(value)}
                            max={getMaxLineForSport(sportFilter)}
                            min={minLine + 0.5}
                            step={0.5}
                          />
                        </div>
                      </div>
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
                props={filteredProps as any}
                selectedSport={sportFilter}
                onAnalysisClick={handleEnhancedAnalysis as any}
                isLoading={isLoadingData}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProps.map((prop, index) => (
                  <PlayerPropCard3D
                    key={prop.id || `prop-${prop.playerId}-${prop.propType}-${index}`}
                    prop={prop as any}
                    onAnalysisClick={handleEnhancedAnalysis}
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

        {/* Enhanced Analysis Overlay */}
        <EnhancedAnalysisOverlay
          prediction={selectedPropForEnhancedAnalysis as any}
          isOpen={showEnhancedAnalysis}
          onClose={() => {
            setShowEnhancedAnalysis(false);
            setSelectedPropForEnhancedAnalysis(null);
          }}
        />
      </div>
    </div>
  );
};