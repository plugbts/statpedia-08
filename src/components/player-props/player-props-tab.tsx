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
import { Switch } from '@/components/ui/switch';
import { SubscriptionOverlay } from '@/components/ui/subscription-overlay';
import { PlayerPropCard3D } from './3d-player-prop-card';
import { PlayerPropsColumnView } from './player-props-column-view';
import { EnhancedAnalysisOverlay } from '../predictions/enhanced-analysis-overlay';
import { PlayerPropCardAd } from '@/components/ads/ad-placements';
import { logAPI, logState, logFilter, logSuccess, logError, logWarning, logInfo, logDebug } from '@/utils/console-logger';
import { AdvancedPredictionDisplay } from '@/components/advanced-prediction-display';
import { advancedPredictionService, ComprehensivePrediction } from '@/services/advanced-prediction-service';
import { evCalculatorService } from '@/services/ev-calculator';

// Utility function for compact time formatting
const formatCompactTime = (gameTime: string, gameDate: string) => {
  try {
    // Handle both separate gameTime/gameDate and combined gameTime
    let dateToFormat: Date;
    
    if (gameTime && gameTime.includes('T')) {
      // gameTime is a full ISO string
      dateToFormat = new Date(gameTime);
    } else if (gameDate && gameTime) {
      // Separate date and time - combine them properly
      const combinedDateTime = gameDate.includes('T') ? gameDate : `${gameDate}T${gameTime}`;
      dateToFormat = new Date(combinedDateTime);
    } else if (gameDate) {
      // Only date available
      dateToFormat = new Date(gameDate);
    } else {
      return 'TBD';
    }
    
    // Check if date is valid
    if (isNaN(dateToFormat.getTime())) {
      return 'TBD';
    }
    
    // Format date as M/D (e.g., "12/25")
    const dateStr = `${dateToFormat.getMonth() + 1}/${dateToFormat.getDate()}`;
    
    // Format time as H:MM AM/PM (e.g., "2:30 PM")
    const timeStr = dateToFormat.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    return `${dateStr} ${timeStr}`;
  } catch (error) {
    return 'TBD';
  }
};

import { cloudflarePlayerPropsAPI } from '@/services/cloudflare-player-props-api';
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
  AlertTriangle,
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
// Removed sportsDataIOAPI imports - now using SportsRadar API exclusively
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PlayerPropsTabProps {
  userSubscription: string;
  userRole?: string;
  selectedSport: string;
}

// Interface that matches the actual API response
interface APIPlayerProp {
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
  availableSportsbooks?: string[];
  allSportsbookOdds?: any[];
  available?: boolean;
  awayTeam?: string;
  homeTeam?: string;
  betType?: string;
  isExactAPIData?: boolean;
  lastUpdate?: string;
  market?: string;
  marketName?: string;
  outcome?: string;
  period?: string;
  statEntity?: string;
  aiPrediction?: any;
  recentForm?: any;
}

type ConsistentPlayerProp = PlayerProp;

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
  aiRating?: number;
  recommendation?: 'strong_bet' | 'good_bet' | 'neutral' | 'avoid' | 'strong_avoid';
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
  // Additional properties from API
  availableSportsbooks?: string[];
  allSportsbookOdds?: any[];
  available?: boolean;
  awayTeam?: string;
  homeTeam?: string;
  betType?: string;
  isExactAPIData?: boolean;
  lastUpdate?: string;
  market?: string;
  marketName?: string;
  outcome?: string;
  period?: string;
  statEntity?: string;
  keyInsights?: string[];
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
  
  // Check if user is subscribed - do this early to avoid hooks issues
  const isSubscribed = userSubscription === 'pro' || userSubscription === 'premium' || userRole === 'admin' || userRole === 'owner';
  
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
  const [selectedPropForAdvancedAnalysis, setSelectedPropForAdvancedAnalysis] = useState<PlayerProp | null>(null);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);
  const [advancedPrediction, setAdvancedPrediction] = useState<ComprehensivePrediction | null>(null);
  const [isGeneratingAdvancedPrediction, setIsGeneratingAdvancedPrediction] = useState(false);
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
  
  // Odds range filter state
  const [minOdds, setMinOdds] = useState(-175);
  const [maxOdds, setMaxOdds] = useState(500);
  const [useOddsFilter, setUseOddsFilter] = useState(true);

  // Filter presets
  const filterPresets = {
    'high-confidence': { minConfidence: 70, minEV: 5, showOnlyPositiveEV: true, name: 'High Confidence' },
    'value-plays': { minConfidence: 50, minEV: 10, showOnlyPositiveEV: true, name: 'Value Plays' },
    'conservative': { minConfidence: 80, minEV: 0, showOnlyPositiveEV: false, name: 'Conservative' },
    'aggressive': { minConfidence: 40, minEV: 15, showOnlyPositiveEV: true, name: 'Aggressive' },
    'all': { minConfidence: 0, minEV: 0, showOnlyPositiveEV: false, name: 'Show All' }
  };

  // Load saved filter preferences
  useEffect(() => {
    const savedFilters = localStorage.getItem(`player-props-filters-${sportFilter}`);
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        setMinConfidence(filters.minConfidence || 0);
        setMinEV(filters.minEV || 0);
        setShowOnlyPositiveEV(filters.showOnlyPositiveEV || false);
        setMinLine(filters.minLine || 0);
        setMaxLine(filters.maxLine || getMaxLineForSport(sportFilter));
        setPropTypeFilter(filters.propTypeFilter || 'all');
        setSortBy(filters.sortBy || 'confidence');
        setSortOrder(filters.sortOrder || 'desc');
        setSelectedSportsbook(filters.selectedSportsbook || 'all');
        setMinOdds(filters.minOdds || -175);
        setMaxOdds(filters.maxOdds || 500);
        setUseOddsFilter(filters.useOddsFilter !== undefined ? filters.useOddsFilter : true);
        logInfo('PlayerPropsTab', 'Loaded saved filter preferences');
      } catch (error) {
        logError('PlayerPropsTab', 'Failed to load saved filters:', error);
      }
    }
  }, [sportFilter]);

  // Save filter preferences
  const saveFilterPreferences = () => {
    const filters = {
      minConfidence,
      minEV,
      showOnlyPositiveEV,
      minLine,
      maxLine,
      propTypeFilter,
      sortBy,
      sortOrder,
      selectedSportsbook,
      minOdds,
      maxOdds,
      useOddsFilter
    };
    localStorage.setItem(`player-props-filters-${sportFilter}`, JSON.stringify(filters));
    logInfo('PlayerPropsTab', 'Saved filter preferences');
  };

  // Reset all filters to default
  const resetFilters = () => {
    setMinConfidence(0);
    setMinEV(0);
    setShowOnlyPositiveEV(false);
    setMinLine(0);
    setMaxLine(getMaxLineForSport(sportFilter));
    setPropTypeFilter('all');
    setSortBy('confidence');
    setSortOrder('desc');
    setSelectedSportsbook('all');
    setSearchQuery('');
    setMinOdds(-175);
    setMaxOdds(500);
    setUseOddsFilter(true);
    localStorage.removeItem(`player-props-filters-${sportFilter}`);
    toast({
      title: "Filters Reset",
      description: "All filters have been reset to default values.",
    });
    logInfo('PlayerPropsTab', 'Reset all filters to default');
  };

  // Apply filter preset
  const applyPreset = (presetKey: keyof typeof filterPresets) => {
    const preset = filterPresets[presetKey];
    setMinConfidence(preset.minConfidence);
    setMinEV(preset.minEV);
    setShowOnlyPositiveEV(preset.showOnlyPositiveEV);
    toast({
      title: "Filter Preset Applied",
      description: `Applied "${preset.name}" filter preset.`,
    });
    logInfo('PlayerPropsTab', `Applied filter preset: ${preset.name}`);
  };

  // Auto-save filters when they change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveFilterPreferences();
    }, 1000); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [minConfidence, minEV, showOnlyPositiveEV, minLine, maxLine, propTypeFilter, sortBy, sortOrder, selectedSportsbook, minOdds, maxOdds, useOddsFilter]);

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

  // Cleanup on unmount - backend handles updates automatically
  useEffect(() => {
    return () => {
      // Backend polling handles updates automatically, no cleanup needed
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
      // Create list of real sportsbooks using official SportsGameOdds API bookmaker IDs
      const sportsbooks = [
        { key: 'all', title: 'All Sportsbooks', lastUpdate: new Date().toISOString() },
        { key: 'fanduel', title: 'FanDuel', lastUpdate: new Date().toISOString() },
        { key: 'draftkings', title: 'Draft Kings', lastUpdate: new Date().toISOString() },
        { key: 'betmgm', title: 'BetMGM', lastUpdate: new Date().toISOString() },
        { key: 'caesars', title: 'Caesars', lastUpdate: new Date().toISOString() },
        { key: 'pointsbet', title: 'PointsBet', lastUpdate: new Date().toISOString() },
        { key: 'betrivers', title: 'BetRivers', lastUpdate: new Date().toISOString() },
        { key: 'foxbet', title: 'FOX Bet', lastUpdate: new Date().toISOString() },
        { key: 'bet365', title: 'bet365', lastUpdate: new Date().toISOString() },
        { key: 'williamhill', title: 'William Hill', lastUpdate: new Date().toISOString() },
        { key: 'pinnacle', title: 'Pinnacle', lastUpdate: new Date().toISOString() },
        { key: 'bovada', title: 'Bovada', lastUpdate: new Date().toISOString() },
        { key: 'betonline', title: 'BetOnline', lastUpdate: new Date().toISOString() },
        { key: 'betway', title: 'Betway', lastUpdate: new Date().toISOString() },
        { key: 'unibet', title: 'Unibet', lastUpdate: new Date().toISOString() },
        { key: 'ladbrokes', title: 'Ladbrokes', lastUpdate: new Date().toISOString() },
        { key: 'coral', title: 'Coral', lastUpdate: new Date().toISOString() },
        { key: 'paddypower', title: 'Paddy Power', lastUpdate: new Date().toISOString() },
        { key: 'skybet', title: 'Sky Bet', lastUpdate: new Date().toISOString() },
        { key: 'boylesports', title: 'BoyleSports', lastUpdate: new Date().toISOString() },
        { key: 'betfair', title: 'Betfair', lastUpdate: new Date().toISOString() },
        { key: 'betvictor', title: 'Bet Victor', lastUpdate: new Date().toISOString() },
        { key: 'betfred', title: 'Betfred', lastUpdate: new Date().toISOString() }
      ];
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
        // Use Cloudflare Workers API for unlimited scalability and no restrictions
        logAPI('PlayerPropsTab', `Calling Cloudflare Workers API for ${sport} player props`);
        const props = await cloudflarePlayerPropsAPI.getPlayerProps(sport, true); // Force refresh for debugging
        logAPI('PlayerPropsTab', `Cloudflare Workers API returned ${props?.length || 0} props`);
        
        // 🔍 COMPREHENSIVE FRONTEND DEBUG LOGGING
        if (props && props.length > 0) {
          console.log(`\n🎯 FRONTEND PLAYER PROPS ANALYSIS:`);
          console.log(`📊 Total Props Received: ${props.length}`);
          console.log(`📝 First 3 Props (Full Objects):`, props.slice(0, 3));
          
          // Analyze the first prop in detail
          const firstProp = (props as unknown as APIPlayerProp[])[0];
          console.log(`\n🔍 DETAILED FIRST PROP ANALYSIS:`);
          console.log(`📋 All Keys:`, Object.keys(firstProp));
          console.log(`🏠 Team Data:`, {
            team: firstProp.team,
            opponent: firstProp.opponent,
            teamAbbr: firstProp.teamAbbr,
            opponentAbbr: firstProp.opponentAbbr,
            gameId: firstProp.gameId,
            gameDate: firstProp.gameDate
          });
          console.log(`💰 Odds Data:`, {
            overOdds: firstProp.overOdds,
            underOdds: firstProp.underOdds,
            line: firstProp.line,
            availableSportsbooks: firstProp.availableSportsbooks,
            allSportsbookOddsCount: firstProp.allSportsbookOdds?.length || 0
          });
          console.log(`👤 Player Data:`, {
            playerName: firstProp.playerName,
            playerId: firstProp.playerId,
            propType: firstProp.propType,
            sport: firstProp.sport
          });
          
          // Check for UNK issues
          const unkProps = (props as unknown as APIPlayerProp[]).filter(prop => 
            prop.team === 'UNK' || 
            prop.opponent === 'UNK' || 
            prop.teamAbbr === 'UNK' || 
            prop.opponentAbbr === 'UNK'
          );
          console.log(`⚠️ UNK Issues Found: ${unkProps.length} props have UNK values`);
          if (unkProps.length > 0) {
            console.log(`🚨 UNK Props Sample:`, unkProps.slice(0, 3));
          }
          
          // Check for identical odds issues
          const identicalOddsProps = props.filter(prop => 
            prop.overOdds === prop.underOdds && prop.overOdds !== null
          );
          console.log(`⚠️ Identical Odds Issues: ${identicalOddsProps.length} props have identical over/under odds`);
          if (identicalOddsProps.length > 0) {
            console.log(`🚨 Identical Odds Sample:`, identicalOddsProps.slice(0, 3));
          }
          
          // Check for missing game data
          const missingGameData = (props as unknown as APIPlayerProp[]).filter(prop => 
            !prop.gameId || !prop.gameDate || prop.gameDate === 'Invalid Date'
          );
          console.log(`⚠️ Missing Game Data: ${missingGameData.length} props have missing game info`);
          
          logDebug('PlayerPropsTab', `Comprehensive analysis complete. Check console for full details.`);
        } else {
          logError('PlayerPropsTab', 'NO PROPS RETURNED FROM API');
        }
        
        if (props && Array.isArray(props) && props.length > 0) {
          logSuccess('PlayerPropsTab', `Setting ${props.length} server-side cached props for ${sport}`);
          logDebug('PlayerPropsTab', 'Backend props sample:', props.slice(0, 2));
          
          // Calculate EV for each prop
          const propsWithEV = await Promise.all((props as unknown as APIPlayerProp[]).map(async prop => {
            try {
              // Calculate EV for both over and under, use the better one
              const overEV = await evCalculatorService.calculateAIRating({
                id: prop.id,
                playerName: prop.playerName,
                propType: prop.propType,
                line: prop.line,
                odds: prop.overOdds?.toString() || '0',
                sport: prop.sport || 'nfl',
                team: prop.team || '',
                opponent: prop.opponent || '',
                gameDate: prop.gameDate || new Date().toISOString(),
                hitRate: 0.5, // Default 50% hit rate
                recentForm: 0.5, // Default 50% recent form
                injuryStatus: 'healthy',
                restDays: 3
              });
              
              const underEV = await evCalculatorService.calculateAIRating({
                id: prop.id,
                playerName: prop.playerName,
                propType: prop.propType,
                line: prop.line,
                odds: prop.underOdds?.toString() || '0',
                sport: prop.sport || 'nfl',
                team: prop.team || '',
                opponent: prop.opponent || '',
                gameDate: prop.gameDate || new Date().toISOString(),
                hitRate: 0.5,
                recentForm: 0.5,
                injuryStatus: 'healthy',
                restDays: 3
              });
              
              // Use the better EV (higher percentage)
              const bestEV = overEV.evPercentage > underEV.evPercentage ? overEV : underEV;
              
              return {
                ...prop,
                expectedValue: bestEV.evPercentage / 100, // Convert to decimal
                confidence: bestEV.confidence / 100, // Convert to decimal
                aiRating: bestEV.aiRating,
                recommendation: bestEV.recommendation
              };
            } catch (error) {
              console.warn('EV calculation failed for prop:', prop.playerName, error);
              return {
                ...prop,
                expectedValue: 0,
                confidence: 0.5,
                aiRating: 3,
                recommendation: 'neutral'
              };
            }
          }));
          
          setRealProps(propsWithEV as PlayerProp[]);
          
          // Log success to console (visible in dev console)
          logSuccess('PlayerPropsTab', `Player Props Loaded: Found ${props.length} server-side cached props for ${sport.toUpperCase()} with exact sportsbook odds`);
        } else {
          logWarning('PlayerPropsTab', 'Backend API returned no valid props', props);
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

  // Format numbers to be compact with .5 and .0 intervals for lines
  const formatNumber = (value: number, decimals: number = 1): string => {
    // For lines, round to nearest .5 or .0 interval
    if (value < 1000) { // Assuming lines are typically under 1000
      const rounded = Math.round(value * 2) / 2;
      return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
    }
    
    // For larger numbers, use compact formatting
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

  // Format American odds with .5 and .0 intervals only
  const formatAmericanOdds = (odds: number): string => {
    // Round to nearest .5 or .0 interval
    const rounded = Math.round(odds * 2) / 2;
    
    // Format as American odds
    if (rounded > 0) {
      return `+${Math.round(rounded)}`;
    } else {
      return `${Math.round(rounded)}`;
    }
  };

  // Format odds (legacy function - keeping for compatibility)
  const formatOdds = (odds: number): string => {
    return formatAmericanOdds(odds);
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
      
      // Odds range filter (default: -175 to +500)
      const overOdds = prop.overOdds || 0;
      const underOdds = prop.underOdds || 0;
      const matchesOddsRange = !useOddsFilter || 
        ((overOdds >= minOdds && overOdds <= maxOdds) || 
         (underOdds >= minOdds && underOdds <= maxOdds));
      
      const passes = matchesSearch && matchesPropType && matchesConfidence && matchesEV && matchesPositiveEV && matchesLine && matchesOddsRange;
      
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

  // Smart mixing algorithm to improve user experience
  const mixedProps = (() => {
    if (filteredProps.length <= 12) {
      // For small sets, just shuffle randomly
      return [...filteredProps].sort(() => Math.random() - 0.5);
    }

    // Group props by player and prop type for smart mixing
    const playerGroups = new Map<string, PlayerProp[]>();
    const propTypeGroups = new Map<string, PlayerProp[]>();
    
    filteredProps.forEach(prop => {
      // Group by player
      if (!playerGroups.has(prop.playerName)) {
        playerGroups.set(prop.playerName, []);
      }
      playerGroups.get(prop.playerName)!.push(prop);
      
      // Group by prop type
      if (!propTypeGroups.has(prop.propType)) {
        propTypeGroups.set(prop.propType, []);
      }
      propTypeGroups.get(prop.propType)!.push(prop);
    });

    const mixed: PlayerProp[] = [];
    const used = new Set<string>();
    
    // Strategy 1: Interleave by player (ensure no 3+ consecutive same players)
    const players = Array.from(playerGroups.keys());
    let playerIndex = 0;
    let samePlayerCount = 0;
    let lastPlayer = '';
    
    // Strategy 2: Interleave by prop type (ensure variety in prop types)
    const propTypes = Array.from(propTypeGroups.keys());
    let propTypeIndex = 0;
    
    // Strategy 3: Prioritize high-value props (high EV, confidence)
    const sortedByValue = [...filteredProps].sort((a, b) => {
      const aScore = (a.expectedValue || 0) * 100 + (a.confidence || 0) * 100;
      const bScore = (b.expectedValue || 0) * 100 + (b.confidence || 0) * 100;
      return bScore - aScore;
    });

    // Mix strategies: 60% value-based, 20% player variety, 20% prop type variety
    const valueProps = sortedByValue.slice(0, Math.ceil(filteredProps.length * 0.6));
    const varietyProps = sortedByValue.slice(Math.ceil(filteredProps.length * 0.6));
    
    // Add value props first, ensuring variety
    valueProps.forEach(prop => {
      if (!used.has(prop.id)) {
        mixed.push(prop);
        used.add(prop.id);
      }
    });
    
    // Add variety props with smart spacing
    varietyProps.forEach(prop => {
      if (!used.has(prop.id)) {
        // Find a good position to insert (avoid clustering)
        let insertIndex = mixed.length;
        
        // Try to avoid clustering same player or same prop type
        for (let i = mixed.length - 1; i >= Math.max(0, mixed.length - 5); i--) {
          if (mixed[i].playerName === prop.playerName || mixed[i].propType === prop.propType) {
            insertIndex = i + 1;
            break;
          }
        }
        
        mixed.splice(insertIndex, 0, prop);
        used.add(prop.id);
      }
    });
    
    // Final shuffle with constraints to ensure maximum variety
    const finalMixed = [...mixed];
    for (let i = 0; i < finalMixed.length - 2; i++) {
      // If we have 3+ consecutive same players or prop types, swap with a different one
      const current = finalMixed[i];
      const next1 = finalMixed[i + 1];
      const next2 = finalMixed[i + 2];
      
      if (current.playerName === next1.playerName && current.playerName === next2.playerName) {
        // Find a different player to swap with
        for (let j = i + 3; j < finalMixed.length; j++) {
          if (finalMixed[j].playerName !== current.playerName) {
            [finalMixed[i + 2], finalMixed[j]] = [finalMixed[j], finalMixed[i + 2]];
            break;
          }
        }
      }
      
      if (current.propType === next1.propType && current.propType === next2.propType) {
        // Find a different prop type to swap with
        for (let j = i + 3; j < finalMixed.length; j++) {
          if (finalMixed[j].propType !== current.propType) {
            [finalMixed[i + 2], finalMixed[j]] = [finalMixed[j], finalMixed[i + 2]];
            break;
          }
        }
      }
    }
    
    return finalMixed;
  })();

  logFilter('PlayerPropsTab', `Final filteredProps length: ${filteredProps.length}`);
  logFilter('PlayerPropsTab', `Mixed props length: ${mixedProps.length}`);
  
  // Debug mixing algorithm
  if (mixedProps.length > 0) {
    const playerCounts = new Map<string, number>();
    const propTypeCounts = new Map<string, number>();
    
    mixedProps.forEach(prop => {
      playerCounts.set(prop.playerName, (playerCounts.get(prop.playerName) || 0) + 1);
      propTypeCounts.set(prop.propType, (propTypeCounts.get(prop.propType) || 0) + 1);
    });
    
    logDebug('PlayerPropsTab', 'Mixing Algorithm Results:', {
      totalProps: mixedProps.length,
      uniquePlayers: playerCounts.size,
      uniquePropTypes: propTypeCounts.size,
      topPlayers: Array.from(playerCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3),
      topPropTypes: Array.from(propTypeCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3),
      first10Props: mixedProps.slice(0, 10).map(p => ({ player: p.playerName, propType: p.propType }))
    });
  }
  logFilter('PlayerPropsTab', `Filter settings: minConfidence=${minConfidence}, minEV=${minEV}, showOnlyPositiveEV=${showOnlyPositiveEV}, propTypeFilter=${propTypeFilter}, lineRange=${minLine}-${maxLine}`);
  logFilter('PlayerPropsTab', `Search query: "${searchQuery}"`);
  
  if (mixedProps.length === 0 && realProps.length > 0) {
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
  
  if (mixedProps.length > 0) {
    logSuccess('PlayerPropsTab', `Successfully mixed ${mixedProps.length} props`);
    const firstMixed = mixedProps[0];
    logDebug('PlayerPropsTab', 'First mixed prop:', {
      playerName: firstMixed.playerName,
      line: firstMixed.line,
      overOdds: firstMixed.overOdds,
      underOdds: firstMixed.underOdds
    });
  }

  // Handle enhanced analysis
  const handleEnhancedAnalysis = (prop: PlayerProp) => {
    setSelectedPropForEnhancedAnalysis(prop);
    setShowEnhancedAnalysis(true);
  };

  // Generate advanced prediction
  const generateAdvancedPrediction = async (prop: PlayerProp) => {
    try {
      setIsGeneratingAdvancedPrediction(true);
      setSelectedPropForAdvancedAnalysis(prop);
      
      const predictionRequest = {
        playerId: prop.playerId || prop.id,
        playerName: prop.playerName,
        propType: prop.propType,
        line: prop.line,
        gameId: prop.gameId || `game_${Date.now()}`,
        team: prop.team,
        opponent: prop.opponent || 'Unknown',
        gameDate: prop.gameDate || new Date().toISOString(),
        odds: {
          over: prop.overOdds || -110,
          under: prop.underOdds || -110,
        },
      };
      
      const comprehensivePrediction = await advancedPredictionService.generateComprehensivePrediction(predictionRequest);
      setAdvancedPrediction(comprehensivePrediction);
      setShowAdvancedAnalysis(true);
      
      toast({
        title: "Advanced Analysis Complete",
        description: `Generated comprehensive prediction for ${prop.playerName}`,
      });
    } catch (error) {
      console.error('Error generating advanced prediction:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to generate advanced prediction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAdvancedPrediction(false);
    }
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
  const propTypes = Array.from(new Set(mixedProps.map(prop => prop.propType))).sort();

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

        {/* Enhanced Filters */}
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="p-6">
            {/* Filter Presets */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-foreground">Quick Filters</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveFilterPreferences}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(filterPresets).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(key as keyof typeof filterPresets)}
                    className="hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
                  >
                    <Target className="w-4 h-4 mr-1" />
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Main Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Sport Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  Sport
                </label>
                <Select value={sportFilter} onValueChange={(value) => {
                  setSportFilter(value);
                  loadPlayerProps(value);
                }}>
                  <SelectTrigger className="w-full bg-background/50 border-primary/20 hover:border-primary/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nfl">🏈 NFL</SelectItem>
                    <SelectItem value="nba">🏀 NBA</SelectItem>
                    <SelectItem value="mlb">⚾ MLB</SelectItem>
                    <SelectItem value="nhl">🏒 NHL</SelectItem>
                    <SelectItem value="college-basketball">🏀 CBB</SelectItem>
                    <SelectItem value="college-football">🏈 CFB</SelectItem>
                    <SelectItem value="wnba">🏀 WNBA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sportsbook Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  Sportsbook
                </label>
                <Select value={selectedSportsbook} onValueChange={(value) => {
                  setSelectedSportsbook(value);
                }}>
                  <SelectTrigger className="w-full bg-background/50 border-primary/20 hover:border-primary/40">
                    <SelectValue placeholder="Select Sportsbook" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSportsbooks.map(sportsbook => (
                      <SelectItem key={sportsbook.key} value={sportsbook.key}>
                        {sportsbook.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prop Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <BarChart3 className="w-4 h-4" />
                  Prop Type
                </label>
                <Select value={propTypeFilter} onValueChange={setPropTypeFilter}>
                  <SelectTrigger className="w-full bg-background/50 border-primary/20 hover:border-primary/40">
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
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <ArrowUpDown className="w-4 h-4" />
                  Sort By
                </label>
                <div className="flex gap-1">
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="flex-1 bg-background/50 border-primary/20 hover:border-primary/40">
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
                    className="px-2 bg-background/50 border-primary/20 hover:border-primary/40"
                  >
                    {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Search and View Mode */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search players, teams, props..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background/50 border-primary/20 hover:border-primary/40 focus:border-primary/60"
                  />
                </div>
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">View:</label>
                <Select value={viewMode} onValueChange={(value: 'column' | 'cards') => setViewMode(value)}>
                  <SelectTrigger className="w-32 bg-background/50 border-primary/20 hover:border-primary/40">
                    <SelectValue placeholder="View" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="column">📊 Column</SelectItem>
                    <SelectItem value="cards">🎴 Cards</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced Filters Toggle */}
              <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-background/50 border-primary/20 hover:border-primary/40">
                    <Filter className="w-4 h-4 mr-2" />
                    Advanced Filters
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Advanced Filters
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* Confidence Filter */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Min Confidence</label>
                        <Badge variant="outline" className="text-primary border-primary/30">
                          {minConfidence}%
                        </Badge>
                      </div>
                      <Slider
                        value={[minConfidence]}
                        onValueChange={([value]) => setMinConfidence(value)}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    {/* Expected Value Filter */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Min Expected Value</label>
                        <Badge variant="outline" className="text-primary border-primary/30">
                          {minEV}%
                        </Badge>
                      </div>
                      <Slider
                        value={[minEV]}
                        onValueChange={([value]) => setMinEV(value)}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Odds Range Filter */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium">Odds Range</label>
                          <Switch
                            checked={useOddsFilter}
                            onCheckedChange={setUseOddsFilter}
                            className="data-[state=checked]:bg-primary"
                          />
                        </div>
                        {useOddsFilter && (
                          <Badge variant="outline" className="text-primary border-primary/30">
                            {minOdds} to {maxOdds}
                          </Badge>
                        )}
                      </div>
                      {useOddsFilter && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Min Odds</label>
                            <Slider
                              value={[minOdds]}
                              onValueChange={([value]) => setMinOdds(value)}
                              max={maxOdds - 25}
                              min={-500}
                              step={25}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Max Odds</label>
                            <Slider
                              value={[maxOdds]}
                              onValueChange={([value]) => setMaxOdds(value)}
                              max={1000}
                              min={minOdds + 25}
                              step={25}
                              className="w-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Line Range Filter */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Line Range</label>
                        <Badge variant="outline" className="text-primary border-primary/30">
                          {minLine} - {maxLine}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Min Line</label>
                          <Slider
                            value={[minLine]}
                            onValueChange={([value]) => setMinLine(value)}
                            max={Math.min(maxLine - 0.5, getMaxLineForSport(sportFilter) - 0.5)}
                            min={0}
                            step={0.5}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Max Line</label>
                          <Slider
                            value={[maxLine]}
                            onValueChange={([value]) => setMaxLine(value)}
                            max={getMaxLineForSport(sportFilter)}
                            min={minLine + 0.5}
                            step={0.5}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Positive EV Toggle */}
                    <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                      <Checkbox
                        id="positiveEV"
                        checked={showOnlyPositiveEV}
                        onCheckedChange={(checked) => setShowOnlyPositiveEV(checked as boolean)}
                        className="border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <label htmlFor="positiveEV" className="text-sm font-medium cursor-pointer">
                        Only show positive expected value props
                      </label>
                    </div>

                    {/* Filter Summary */}
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <h4 className="text-sm font-medium text-primary mb-2">Active Filters Summary</h4>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Confidence: ≥ {minConfidence}%</div>
                        <div>Expected Value: ≥ {minEV}%</div>
                        <div>Line Range: {minLine} - {maxLine}</div>
                        {useOddsFilter && <div>Odds Range: {minOdds} to {maxOdds}</div>}
                        <div>Positive EV Only: {showOnlyPositiveEV ? 'Yes' : 'No'}</div>
                        <div>Prop Type: {propTypeFilter === 'all' ? 'All Types' : propTypeFilter}</div>
                      </div>
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
        {!isLoadingData && mixedProps.length === 0 && (
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
        {!isLoadingData && mixedProps.length > 0 && (
          <>
            {viewMode === 'column' ? (
              <PlayerPropsColumnView
                props={mixedProps as any}
                selectedSport={sportFilter}
                onAnalysisClick={handleEnhancedAnalysis as any}
                isLoading={isLoadingData}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {mixedProps.map((prop, index) => (
                  <PlayerPropCard3D
                    key={prop.id || `prop-${prop.playerId}-${prop.propType}-${index}`}
                    prop={prop as any}
                    onAnalysisClick={handleEnhancedAnalysis}
                    onAdvancedAnalysisClick={generateAdvancedPrediction}
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

        {/* Advanced Analysis Modal */}
        {advancedPrediction && (
          <AdvancedPredictionDisplay
            prediction={advancedPrediction}
            onClose={() => {
              setShowAdvancedAnalysis(false);
              setAdvancedPrediction(null);
              setSelectedPropForAdvancedAnalysis(null);
            }}
          />
        )}
      </div>
    </div>
  );
};