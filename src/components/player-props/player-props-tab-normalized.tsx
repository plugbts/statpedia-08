import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PlayerPropCard3D } from './3d-player-prop-card';
import { PlayerPropsColumnView } from './player-props-column-view';
import { EnhancedPlayerPropCard } from './enhanced-player-prop-card';
import { EnhancedAnalysisOverlay } from '../predictions/enhanced-analysis-overlay';
import { PlayerPropCardAd } from '@/components/ads/ad-placements';
import { validateHeadshots } from '@/utils/validateHeadshots';
import { logAPI, logState, logFilter, logSuccess, logError, logWarning, logInfo, logDebug } from '@/utils/console-logger';
import { AdvancedPredictionDisplay } from '@/components/advanced-prediction-display';
import { advancedPredictionService, ComprehensivePrediction } from '@/services/advanced-prediction-service';
import { evCalculatorService } from '@/services/ev-calculator';
import { statpediaRatingService } from '@/services/statpedia-rating-service';
import { formatAmericanOdds } from '@/utils/odds-utils';
import { AnalyticsIntegration } from './analytics-integration';
import { hasuraPlayerPropsNormalizedService, NormalizedPlayerProp } from '@/services/hasura-player-props-normalized-service';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  TrendingUp, 
  Search, 
  Filter, 
  Eye, 
  EyeOff, 
  BarChart3,
  Calendar,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Target,
  Zap
} from 'lucide-react';

// League-aware priority helpers for consistent ordering
function getPriority(marketType: string): number {
  const m = (marketType || "").toLowerCase();

  // Always last
  if (m.includes("touchdown")) return 99;

  // Offense first
  if (m.includes("passing") || m.includes("rushing") || m.includes("receiving")) return 1;

  // Kicking next
  if (m.includes("field goal") || m.includes("kicking")) return 2;

  // Defense props are filtered out, but keep this for completeness
  if (m.includes("defense") || m.includes("tackle") || m.includes("sack") || m.includes("interception")) return 4;

  // Middle default
  return 50;
}

// Tie-breaker within offense: Passing -> Rushing -> Receiving
function offenseSubOrder(marketType: string): number {
  const m = (marketType || "").toLowerCase();
  if (m.includes("passing")) return 1;
  if (m.includes("rushing")) return 2;
  if (m.includes("receiving")) return 3;
  return 9;
}

// Helper function to get prop priority with normalized matching (matches backend)
const getPropPriorityNormalized = (propType: string): number => {
  if (!propType) return 99;
  
  const normalized = propType.toLowerCase().trim();
  
  // Broad touchdown detection (regardless of exact wording)
  if (normalized.includes('touchdown')) {
    return 3;
  }
  
  // Offensive props (passing, rushing, receiving)
  if (normalized.includes('passing') || normalized.includes('rushing') || normalized.includes('receiving')) {
    return 1;
  }
  
  // Kicking props
  if (normalized.includes('field goal') || normalized.includes('kicking') || normalized.includes('extra point')) {
    return 2;
  }
  
  // Defense props
  if (normalized.includes('defense') || normalized.includes('sack') || normalized.includes('tackle') || normalized.includes('interception')) {
    return 4;
  }
  
  // Default to low priority
  return 99;
};

// Helper function to get offensive sub-order for tie-breaking (matches backend)
const getOffensiveSubOrder = (propType: string): number => {
  if (!propType) return 3;
  
  const normalized = propType.toLowerCase();
  
  // Passing props first
  if (normalized.includes('passing')) return 1;
  
  // Rushing props second
  if (normalized.includes('rushing')) return 2;
  
  // Receiving props third
  if (normalized.includes('receiving')) return 3;
  
  // Other offensive props
  if (normalized.includes('points') || normalized.includes('goals') || normalized.includes('assists')) return 4;
  
  // Non-offensive props
  return 5;
};

// Helper function to determine if a prop is offensive
const isOffensiveProp = (propType: string): boolean => {
  if (!propType) return false;
  const lowerPropType = propType.toLowerCase();
  return lowerPropType.includes('passing') || 
         lowerPropType.includes('rushing') || 
         lowerPropType.includes('receiving') ||
         lowerPropType.includes('points') ||
         lowerPropType.includes('goals') ||
         lowerPropType.includes('assists');
};

// Prop priority mapping (matches Cloudflare Worker logic)
const getPropPriority = (propType: string): number => {
  const lowerPropType = propType.toLowerCase();
  
  // Core props (highest priority)
  const coreProps = [
    'passing yards', 'passing touchdowns', 'passing attempts', 'passing completions', 'passing interceptions',
    'rushing yards', 'rushing touchdowns', 'rushing attempts',
    'receiving yards', 'receiving touchdowns', 'receptions',
    'defense sacks', 'defense interceptions', 'defense combined tackles',
    'field goals made', 'kicking total points', 'extra points kicks made'
  ];
  
  // Check if it's a core prop
  const isCore = coreProps.some(core => lowerPropType.includes(core.toLowerCase()));
  if (isCore) return 1;
  
  // Category-based priority
  const category = getPropCategory(lowerPropType);
  const categoryOrder = ['offense', 'kicking', 'defense', 'touchdowns', 'other'];
  const categoryPriority = categoryOrder.indexOf(category) + 2; // +2 because core props are 1
  
  return categoryPriority;
};

const getPropCategory = (market: string): string => {
  const lowerMarket = market.toLowerCase();
  
  // Offense props (passing, rushing, receiving)
  if (lowerMarket.includes('passing') || lowerMarket.includes('rushing') || lowerMarket.includes('receiving')) {
    return 'offense';
  }
  
  // Kicking props
  if (lowerMarket.includes('field goal') || lowerMarket.includes('kicking') || lowerMarket.includes('extra point')) {
    return 'kicking';
  }
  
  // Defense props
  if (lowerMarket.includes('defense') || lowerMarket.includes('sack') || lowerMarket.includes('tackle') || lowerMarket.includes('interception')) {
    return 'defense';
  }
  
  // Touchdown props (should be last)
  if (lowerMarket.includes('touchdown')) {
    return 'touchdowns';
  }
  
  return 'other';
};

// Helper function to format game time consistently
const formatCompactTime = (gameDate?: string, gameTime?: string): string => {
  try {
    let dateToFormat: Date;
    
    if (gameDate && gameTime && gameDate.includes('T')) {
      // Combined datetime string
      dateToFormat = new Date(gameDate);

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

// Convert normalized prop to legacy format for compatibility
const convertNormalizedToLegacy = (normalizedProp: NormalizedPlayerProp): any => {
  return {
    id: normalizedProp.prop_id,
    playerId: normalizedProp.player_id,
    playerName: normalizedProp.player_name,
    team: normalizedProp.team_name,
    teamAbbr: normalizedProp.team_abbrev,
    opponent: normalizedProp.opponent_name,
    opponentAbbr: normalizedProp.opponent_abbrev,
    gameId: normalizedProp.game_id,
    sport: normalizedProp.sport,
    propType: normalizedProp.market,
    line: normalizedProp.line,
    overOdds: normalizedProp.odds, // Using single odds value
    underOdds: normalizedProp.odds, // Using single odds value
    gameDate: normalizedProp.game_date,
    gameTime: normalizedProp.game_date,
    teamLogo: normalizedProp.team_logo,
    opponentLogo: normalizedProp.opponent_logo,
    evPercent: normalizedProp.ev_percent,
    streak: normalizedProp.streak,
    rating: normalizedProp.rating,
    matchupRank: normalizedProp.matchup_rank,
    l5: normalizedProp.l5,
    l10: normalizedProp.l10,
    l20: normalizedProp.l20,
    isActive: normalizedProp.is_active,
    createdAt: normalizedProp.created_at,
    updatedAt: normalizedProp.updated_at
  };
};

interface PlayerPropsTabProps {
  selectedSport: string;
  onSportChange: (sport: string) => void;
  isSubscribed: boolean;
  onSubscriptionRequired: () => void;
}

export const PlayerPropsTab: React.FC<PlayerPropsTabProps> = ({
  selectedSport,
  onSportChange,
  isSubscribed,
  onSubscriptionRequired
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // State management
  const [realProps, setRealProps] = useState<NormalizedPlayerProp[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPropType, setSelectedPropType] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'column'>('grid');
  const [showPredictions, setShowPredictions] = useState(false);
  const [selectedProp, setSelectedProp] = useState<NormalizedPlayerProp | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load player props using normalized service
  const loadPlayerProps = useCallback(async (sport: string) => {
    logState('PlayerPropsTab', `Starting to load normalized player props for ${sport}`);
    logState('PlayerPropsTab', `Force refresh at ${new Date().toISOString()}`);
    logDebug('PlayerPropsTab', `Current realProps length before load: ${realProps.length}`);
    
    setIsLoadingData(true);
    setRealProps([]); // Clear data
    setError(null);
    
    try {
      logAPI('PlayerPropsTab', `Calling normalized service for ${sport} player props`);
      const viewParam = searchParams.get('view');
      const dateParam = searchParams.get('date');
      
      // Build filter for normalized service
      const filter: any = {
        sport: sport,
        limit: 100
      };
      
      if (dateParam) {
        filter.date_from = dateParam;
        filter.date_to = dateParam;
      }
      
      if (viewParam) {
        filter.market = viewParam;
      }
      
      const result = await hasuraPlayerPropsNormalizedService.getPlayerProps(filter);
      
      logAPI('PlayerPropsTab', `Normalized service returned ${result?.length || 0} props`);
      console.log('🔍 [NORMALIZED_DEBUG] Normalized result:', result);
      
      // 🔍 COMPREHENSIVE FRONTEND DEBUG LOGGING
      if (result && result.length > 0) {
        console.log(`\n🎯 NORMALIZED PLAYER PROPS ANALYSIS:`);
        console.log(`📊 Props Received: ${result.length}`);
        console.log(`📝 First 10 Props (Priority Order):`);
        result.slice(0, 10).forEach((prop, index) => {
          console.log(`${index + 1}. ${prop.market} - ${prop.player_name}`);
        });
        
        // Analyze the first prop in detail
        const firstProp = result[0];
        console.log(`\n🔍 DETAILED FIRST NORMALIZED PROP ANALYSIS:`);
        console.log(`📋 All Keys:`, Object.keys(firstProp));
        console.log(`🏠 Team Data:`, {
          team_name: firstProp.team_name,
          opponent_name: firstProp.opponent_name,
          team_abbrev: firstProp.team_abbrev,
          opponent_abbrev: firstProp.opponent_abbrev,
          team_logo: firstProp.team_logo,
          opponent_logo: firstProp.opponent_logo
        });
        console.log(`👤 Player Data:`, {
          player_name: firstProp.player_name,
          position: firstProp.position,
          player_id: firstProp.player_id
        });
        console.log(`📊 Prop Data:`, {
          market: firstProp.market,
          line: firstProp.line,
          odds: firstProp.odds,
          ev_percent: firstProp.ev_percent
        });
        console.log(`🎮 Game Data:`, {
          game_date: firstProp.game_date,
          sport: firstProp.sport,
          season: firstProp.season,
          week: firstProp.week
        });
        console.log(`📈 Analytics Data:`, {
          streak: firstProp.streak,
          rating: firstProp.rating,
          matchup_rank: firstProp.matchup_rank,
          l5: firstProp.l5,
          l10: firstProp.l10,
          l20: firstProp.l20
        });
      }
      
      setRealProps(result);
      setLastRefreshTime(new Date());
      logSuccess('PlayerPropsTab', `Successfully loaded ${result.length} normalized player props`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      logError('PlayerPropsTab', `Failed to load normalized player props:`, err);
      setError(`Failed to load player props: ${errorMessage}`);
      setRealProps([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [searchParams, realProps.length]);

  // Load props when sport changes
  useEffect(() => {
    if (selectedSport) {
      loadPlayerProps(selectedSport);
    }
  }, [selectedSport, loadPlayerProps]);

  // Filter and sort props
  const filteredAndSortedProps = useMemo(() => {
    if (!realProps.length) return [];

    let filtered = realProps;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(prop => 
        prop.player_name.toLowerCase().includes(term) ||
        prop.team_name.toLowerCase().includes(term) ||
        prop.opponent_name.toLowerCase().includes(term) ||
        prop.market.toLowerCase().includes(term)
      );
    }

    // Prop type filter
    if (selectedPropType !== 'all') {
      filtered = filtered.filter(prop => 
        prop.market.toLowerCase().includes(selectedPropType.toLowerCase())
      );
    }

    // Sort by priority and other criteria
    return filtered.sort((a, b) => {
      // First by prop priority
      const priorityA = getPropPriority(a.market);
      const priorityB = getPropPriority(b.market);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Then by offensive sub-order
      if (isOffensiveProp(a.market) && isOffensiveProp(b.market)) {
        const subOrderA = getOffensiveSubOrder(a.market);
        const subOrderB = getOffensiveSubOrder(b.market);
        
        if (subOrderA !== subOrderB) {
          return subOrderA - subOrderB;
        }
      }

      // Then by player name
      return a.player_name.localeCompare(b.player_name);
    });
  }, [realProps, searchTerm, selectedPropType]);

  // Get unique prop types for filter
  const uniquePropTypes = useMemo(() => {
    const types = new Set(realProps.map(prop => prop.market));
    return Array.from(types).sort();
  }, [realProps]);

  // Handle prop selection for analysis
  const handlePropSelect = useCallback((prop: NormalizedPlayerProp) => {
    setSelectedProp(prop);
    setShowPredictions(true);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (selectedSport) {
      loadPlayerProps(selectedSport);
    }
  }, [selectedSport, loadPlayerProps]);

  // Render loading state
  if (isLoadingData && realProps.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Loading normalized player props...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Using stable data architecture with canonical mapping
          </p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <XCircle className="w-8 h-8 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-medium text-destructive">{error}</p>
          <button 
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (realProps.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Target className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">No player props found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Try adjusting your filters or check back later
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Player Props</h2>
          <p className="text-muted-foreground">
            {filteredAndSortedProps.length} props using stable data architecture
          </p>
          {lastRefreshTime && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {lastRefreshTime.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoadingData}
            className="p-2 rounded-md border hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search players, teams, or prop types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        
        <select
          value={selectedPropType}
          onChange={(e) => setSelectedPropType(e.target.value)}
          className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Prop Types</option>
          {uniquePropTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <button
          onClick={() => setViewMode(viewMode === 'grid' ? 'column' : 'grid')}
          className="px-4 py-2 border rounded-md hover:bg-muted"
        >
          {viewMode === 'grid' ? 'Column View' : 'Grid View'}
        </button>
      </div>

      {/* Props Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedProps.map((prop) => (
            <div key={prop.prop_id} onClick={() => handlePropSelect(prop)}>
              <EnhancedPlayerPropCard prop={prop} />
            </div>
          ))}
        </div>
      ) : (
        <PlayerPropsColumnView 
          props={filteredAndSortedProps.map(convertNormalizedToLegacy)}
          onPropSelect={(legacyProp) => {
            // Find the original normalized prop
            const normalizedProp = filteredAndSortedProps.find(p => p.prop_id === legacyProp.id);
            if (normalizedProp) {
              handlePropSelect(normalizedProp);
            }
          }}
        />
      )}

      {/* Analysis Overlay */}
      {showPredictions && selectedProp && (
        <EnhancedAnalysisOverlay
          prop={convertNormalizedToLegacy(selectedProp)}
          onClose={() => {
            setShowPredictions(false);
            setSelectedProp(null);
          }}
        />
      )}

      {/* Analytics Integration */}
      <AnalyticsIntegration 
        props={filteredAndSortedProps.map(convertNormalizedToLegacy)}
        sport={selectedSport}
      />
    </div>
  );
};
