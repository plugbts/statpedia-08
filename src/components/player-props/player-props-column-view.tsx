import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Star,
  Zap,
  Target,
  Activity,
  Calendar,
  Clock,
  Users,
  Award,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Filter,
  SortAsc,
  SortDesc,
  Gamepad2,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SportsbookIconsList } from '@/components/ui/sportsbook-icons';
import { SportsbookOverlay } from '@/components/ui/sportsbook-overlay';
import { statpediaRatingService, StatpediaRating } from '@/services/statpedia-rating-service';
import { toAmericanOdds, getOddsColorClass } from '@/utils/odds';
import { getPlayerHeadshot, getPlayerInitials, getKnownPlayerHeadshot } from '@/utils/headshots';
import { StreakService } from '@/services/streak-service';
import { useToast } from '@/hooks/use-toast';

// Prop priority mapping (matches Cloudflare Worker logic)
const getPropPriority = (propType: string): number => {
  const lowerPropType = propType.toLowerCase();
  
  // Core props (highest priority)
  const coreProps = [
    'passing yards', 'passing touchdowns', 'passing attempts', 'passing completions', 'passing interceptions',
    'rushing yards', 'rushing touchdowns', 'rushing attempts',
    'receiving yards', 'receiving touchdowns', 'receiving receptions',
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
  if (lowerMarket.includes('touchdown') || lowerMarket.includes('first touchdown') || lowerMarket.includes('last touchdown')) {
    return 'touchdowns';
  }
  
  return 'other';
};

interface PlayerProp {
  id: string;
  playerId: string;
  player_id?: string;
  playerName: string;
  player_name?: string;
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
  best_over?: string;
  best_under?: string;
  position?: string;
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
  // NEW: Available sportsbooks for this prop
  availableSportsbooks?: string[];
  // Team logos
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  // Additional properties for streak and rating calculations
  hitRate?: number;
  gamesTracked?: number;
  rating_over_normalized?: number;
  rating_over_raw?: number;
  rating_under_normalized?: number;
  rating_under_raw?: number;
}

interface PlayerPropsColumnViewProps {
  props: PlayerProp[];
  selectedSport: string;
  onAnalysisClick?: (prop: PlayerProp) => void;
  isLoading?: boolean;
  overUnderFilter?: 'over' | 'under' | 'both';
}

export function PlayerPropsColumnView({ 
  props, 
  selectedSport, 
  onAnalysisClick,
  isLoading = false,
  overUnderFilter = 'both'
}: PlayerPropsColumnViewProps) {
  const [sortBy, setSortBy] = useState('api');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState('all');
  const [showSportsbookOverlay, setShowSportsbookOverlay] = useState(false);
  const [selectedPropSportsbooks, setSelectedPropSportsbooks] = useState<{sportsbooks: string[], propInfo: any}>({sportsbooks: [], propInfo: null});
  const [selectedGame, setSelectedGame] = useState('all');
  const [showAlternativeLines, setShowAlternativeLines] = useState(false);
  const { toast } = useToast();

  // Handle alternative lines toggle with confirmation
  const handleAlternativeLinesToggle = (checked: boolean) => {
    if (checked) {
      // Calculate how many additional props will be shown
      const propsWithoutAlternatives = props.filter(prop => {
        // Game filter
        if (selectedGame !== 'all' && prop.gameId !== selectedGame) {
          return false;
        }
        
        // Alternative lines filter (show only main lines)
        const allPropsForPlayer = props.filter(p => 
          p.playerName === prop.playerName && 
          p.propType === prop.propType
        );

        if (allPropsForPlayer.length > 1) {
          // Find the most common line (main line) including current prop
          const lineCounts = allPropsForPlayer.reduce((acc, p) => {
            acc[p.line] = (acc[p.line] || 0) + 1;
            return acc;
          }, {} as Record<number, number>);

          const mainLine = Object.entries(lineCounts)
            .sort(([,a], [,b]) => b - a)[0]?.[0];

          // Only show the main line, hide alternatives
          if (prop.line !== Number(mainLine)) {
            return false;
          }
        }
        return true;
      });

      const totalProps = props.filter(prop => {
        // Game filter
        if (selectedGame !== 'all' && prop.gameId !== selectedGame) {
          return false;
        }
        return true;
      });

      const additionalProps = totalProps.length - propsWithoutAlternatives.length;
      
      // Debug logging
      console.log('🔍 Alternative Lines Debug:', {
        totalProps: totalProps.length,
        propsWithoutAlternatives: propsWithoutAlternatives.length,
        additionalProps,
        showAlternativeLines: checked
      });
      
      setShowAlternativeLines(true);
      
      if (additionalProps > 0) {
        toast({
          title: "Alternative Lines Revealed",
          description: `Showing ${additionalProps} additional alternative prop lines`,
          duration: 2000,
        });
      } else {
        toast({
          title: "Alternative Lines",
          description: "No additional alternative lines available",
          duration: 2000,
        });
      }
    } else {
      setShowAlternativeLines(false);
      toast({
        title: "Alternative Lines Hidden",
        description: "Showing only main prop lines",
        duration: 2000,
      });
    }
  };

  // Format number helper with .5 and .0 intervals for lines
  const formatNumber = (value: number, decimals: number = 1): string => {
    // For lines, round to nearest .5 or .0 interval
    if (value < 1000) { // Assuming lines are typically under 1000
      const rounded = Math.round(value * 2) / 2;
      return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
    }
    
    // For larger numbers, use compact formatting
    if (value >= 1000000) {
      return (value / 1000000).toFixed(decimals) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(decimals) + 'K';
    }
    return value.toFixed(decimals);
  };

  // Use shared odds utility for formatting
  const formatOdds = (odds: number): string => {
    // Convert to American odds first, then format
    return toAmericanOdds(odds);
  };

  // Debug logging for first 10 props
  React.useEffect(() => {
    if (props && props.length > 0 && Math.random() < 0.1) { // Log ~10% of props for debugging
      const firstProp = props[0];
      console.debug("[PROP]", firstProp.playerName, firstProp.position, firstProp.overOdds, firstProp.underOdds, firstProp.player_id);
    }
  }, [props]);

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Format prop type names with proper spacing and line breaks
  const formatPropType = (propType: string): string => {
    // Add spaces before capital letters and handle common patterns
    let formatted = propType
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space before capital letters
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // Add space between consecutive capitals
      .replace(/\b(First|Last|Passing|Rushing|Receiving|Defense|Kicking|Field|Extra|Total|Combined|Longest|Attempts|Completions|Interceptions|Sacks|Tackles|Touchdowns|Yards|Receptions|Points|Made|Kicks)\b/g, (match) => {
        // Capitalize common words
        return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
      });

    return formatted;
  };

  // Check if text should wrap to multiple lines
  const shouldWrapText = (text: string, maxLength: number = 12): boolean => {
    return text.length > maxLength;
  };

  // Split text into multiple lines if needed
  const splitTextIntoLines = (text: string, maxLength: number = 12): string[] => {
    if (text.length <= maxLength) return [text];
    
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + ' ' + word).length <= maxLength) {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Derive position from prop type
  const getPositionFromPropType = (propType: string): string => {
    const lowerPropType = propType.toLowerCase();
    
    if (lowerPropType.includes('passing')) return 'QB';
    if (lowerPropType.includes('rushing')) return 'RB';
    if (lowerPropType.includes('receiving')) return 'WR';
    if (lowerPropType.includes('field goal') || lowerPropType.includes('kicking')) return 'K';
    if (lowerPropType.includes('defense') || lowerPropType.includes('sack') || lowerPropType.includes('tackle')) return 'DEF';
    
    return 'N/A';
  };

  // Extract unique games for dropdown
  const uniqueGames = React.useMemo(() => {
    const games = new Map<string, { id: string; display: string; date: string }>();
    
    props.forEach(prop => {
      if (prop.gameId && prop.team && prop.opponent) {
        const gameKey = prop.gameId;
        const gameDate = new Date(prop.gameDate).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        const gameDisplay = `${prop.opponentAbbr} @ ${prop.teamAbbr} (${gameDate})`;
        
        if (!games.has(gameKey)) {
          games.set(gameKey, {
            id: gameKey,
            display: gameDisplay,
            date: prop.gameDate
          });
        }
      }
    });
    
    // Sort games by date
    return Array.from(games.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [props]);

  // Filter props (preserve order unless explicitly sorting)
  const filteredProps = props.filter(prop => {
    // Game filter
    if (selectedGame !== 'all' && prop.gameId !== selectedGame) {
      return false;
    }
    
    // Alternative lines filter
    if (!showAlternativeLines) {
      // Group by player + prop type combination
      const key = `${prop.playerName}-${prop.propType}`;
      const allPropsForPlayer = props.filter(p => 
        p.playerName === prop.playerName && 
        p.propType === prop.propType
      );
      
      if (allPropsForPlayer.length > 1) {
        // Find the most common line (main line) including current prop
        const lineCounts = allPropsForPlayer.reduce((acc, p) => {
          acc[p.line] = (acc[p.line] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);
        
        const mainLine = Object.entries(lineCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0];
        
        // Debug logging for alternative lines
        if (allPropsForPlayer.length > 1) {
          console.log(`🔍 Alternative Lines Filter - ${prop.playerName} ${prop.propType}:`, {
            allPropsForPlayer: allPropsForPlayer.length,
            lineCounts,
            mainLine: Number(mainLine),
            currentLine: prop.line,
            willShow: prop.line === Number(mainLine)
          });
        }
        
        // Only show the main line, hide alternatives
        if (prop.line !== Number(mainLine)) {
          return false;
        }
      }
    }
    
    // Existing filters
    if (filterBy === 'all') return true;
    if (filterBy === 'over') return prop.aiPrediction?.recommended === 'over';
    if (filterBy === 'under') return prop.aiPrediction?.recommended === 'under';
    if (filterBy === 'high-confidence') return (prop.confidence || 0) > 0.7;
    return true;
  });

  // Only sort if not using 'api' sort (which preserves the parent's ordering)
  const filteredAndSortedProps = sortBy === 'api' ? filteredProps : filteredProps.sort((a, b) => {
    let aValue = 0;
    let bValue = 0;

    switch (sortBy) {
      case 'statpediaRating':
        const aRating = statpediaRatingService.calculateRating(a, overUnderFilter);
        const bRating = statpediaRatingService.calculateRating(b, overUnderFilter);
        aValue = aRating.overall;
        bValue = bRating.overall;
        break;
      case 'expectedValue':
        aValue = a.expectedValue || 0;
        bValue = b.expectedValue || 0;
        break;
      case 'line':
        aValue = a.line;
        bValue = b.line;
        break;
      case 'overOdds':
        aValue = a.overOdds;
        bValue = b.overOdds;
        break;
      case 'playerName':
        aValue = a.playerName.localeCompare(b.playerName);
        bValue = 0;
        break;
      case 'order':
        // Sort by prop priority order
        const aPriority = getPropPriority(a.propType);
        const bPriority = getPropPriority(b.propType);
        return aPriority - bPriority;
      default:
        aValue = a.confidence || 0;
        bValue = b.confidence || 0;
    }

    if (sortBy === 'playerName') {
      return sortOrder === 'asc' ? aValue : -aValue;
    }

    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const handlePropClick = (prop: PlayerProp) => {
    // Parent component handles the overlay
    if (onAnalysisClick) {
      onAnalysisClick(prop);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getEVColor = (ev: number) => {
    if (ev > 0.1) return 'text-green-400';
    if (ev > 0) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRatingColor = (rating: StatpediaRating) => {
    switch (rating.color) {
      case 'green': return 'text-green-400 bg-green-500/20 border-green-500/40';
      case 'yellow': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40';
      case 'red': return 'text-red-400 bg-red-500/20 border-red-500/40';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/40';
    }
  };

  const getRatingIcon = (rating: StatpediaRating) => {
    if (rating.overall >= 79) return <Star className="h-3 w-3" />;
    if (rating.overall >= 61) return <Target className="h-3 w-3" />;
    return <BarChart3 className="h-3 w-3" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Target className="w-4 h-4 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Player Props - {selectedSport.toUpperCase()}</h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="h-10 w-32 bg-card/60 rounded-lg animate-pulse" />
            <div className="h-10 w-24 bg-card/60 rounded-lg animate-pulse" />
            <div className="h-10 w-20 bg-card/60 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-card/60 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <Target className="w-4 h-4 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Player Props - {selectedSport.toUpperCase()}
          </h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Games Dropdown */}
          <Select value={selectedGame} onValueChange={setSelectedGame}>
            <SelectTrigger className="w-48 bg-card border-border/50 text-foreground hover:border-primary/30 transition-colors">
              <SelectValue placeholder="Select Game" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all" className="text-foreground">All Games</SelectItem>
              {uniqueGames.map(game => (
                <SelectItem key={game.id} value={game.id} className="text-foreground">
                  {game.display}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Show Alternative Lines Switch */}
          <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border/50 rounded-lg hover:border-primary/30 transition-colors">
            <Switch
              checked={showAlternativeLines}
              onCheckedChange={handleAlternativeLinesToggle}
              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-white"
            />
            <label className="text-sm font-medium text-foreground cursor-pointer">
              Show Alternative Lines
            </label>
          </div>

          {/* Filter Dropdown */}
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger className="w-40 bg-card border-border/50 text-foreground hover:border-primary/30 transition-colors">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all" className="text-foreground">All Props</SelectItem>
              <SelectItem value="over" className="text-foreground">Over Picks</SelectItem>
              <SelectItem value="under" className="text-foreground">Under Picks</SelectItem>
              <SelectItem value="high-confidence" className="text-foreground">High Confidence</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 bg-card border-border/50 text-foreground hover:border-primary/30 transition-colors">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="api" className="text-foreground">Order</SelectItem>
              <SelectItem value="statpediaRating" className="text-foreground">Statpedia Rating</SelectItem>
              <SelectItem value="expectedValue" className="text-foreground">Expected Value</SelectItem>
              <SelectItem value="line" className="text-foreground">Line</SelectItem>
              <SelectItem value="overOdds" className="text-foreground">Over Odds</SelectItem>
              <SelectItem value="playerName" className="text-foreground">Player Name</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Order Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="bg-card border-border/50 text-foreground hover:bg-accent hover:border-primary/30 transition-colors"
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-1 px-2 py-2 bg-gradient-card border border-border/50 rounded-lg">
        <div className="col-span-3 text-xs font-semibold text-foreground flex items-center gap-1">
          <Users className="w-3 h-3" />
          Player
        </div>
        <div className="col-span-1 text-xs font-semibold text-foreground text-center flex items-center justify-center gap-1">
          <Target className="w-3 h-3" />
          Team
        </div>
        <div className="col-span-2 text-xs font-semibold text-foreground text-center flex items-center justify-center gap-1">
          <Target className="w-3 h-3" />
          Prop
        </div>
        <div className="col-span-1 text-xs font-semibold text-foreground text-center flex items-center justify-center gap-1">
          <BarChart3 className="w-3 h-3" />
          Line
        </div>
        <div className="col-span-1 text-xs font-semibold text-foreground text-center flex items-center justify-center gap-1">
          <TrendingUp className="w-3 h-3 text-green-500" />
          Odds
        </div>
        <div className="col-span-1 text-xs font-semibold text-foreground text-center flex items-center justify-center gap-1">
          <Zap className="w-3 h-3" />
          EV
        </div>
        <div className="col-span-1 text-xs font-semibold text-foreground text-center flex items-center justify-center gap-1">
          <Activity className="w-3 h-3" />
          Streak
        </div>
        <div className="col-span-1 text-xs font-semibold text-foreground text-center flex items-center justify-center gap-1">
          <Star className="w-3 h-3" />
          Rating
        </div>
        <div className="col-span-1 text-xs font-semibold text-foreground text-center flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" />
          Action
        </div>
      </div>

      {/* Props List */}
      <div className="space-y-3">
        {filteredAndSortedProps.map((prop, index) => (
          <Card
            key={prop.id || `prop-${prop.playerId}-${prop.propType}-${index}`}
            className="bg-gradient-card border-border/50 hover:border-primary/30 hover:shadow-card-hover transition-all duration-300 cursor-pointer group hover:scale-[1.01]"
            onClick={() => handlePropClick(prop)}
          >
            <CardContent className="p-2">
              <div className="grid grid-cols-12 gap-1 items-center">
                {/* Player Info */}
                <div className="col-span-3 flex items-center justify-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center text-foreground font-bold text-sm overflow-hidden flex-shrink-0">
                    {(() => {
                      // Try known player headshot first, then fallback to player_id
                      const knownHeadshotUrl = getKnownPlayerHeadshot(prop.playerName, prop.sport || 'nfl');
                      const fallbackHeadshotUrl = getPlayerHeadshot(prop.sport || 'nfl', prop.player_id);
                      const headshotUrl = knownHeadshotUrl || fallbackHeadshotUrl;
                      
                      if (headshotUrl) {
                        return (
                          <img 
                            src={headshotUrl} 
                            alt={prop.playerName}
                            className="w-full h-full object-cover rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = getPlayerInitials(prop.playerName);
                              }
                            }}
                          />
                        );
                      }
                      return getPlayerInitials(prop.playerName);
                    })()}
                  </div>
                  <div className="text-center min-w-0 flex-1">
                    <div className="font-semibold text-foreground text-sm">
                      {prop.playerName || 'Unknown Player'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                      {prop.awayTeamLogo && (
                        <img src={prop.awayTeamLogo} alt={prop.opponentAbbr} className="h-4 w-4" />
                      )}
                      <span>{prop.opponentAbbr}</span>
                      <span>@</span>
                      <span>{prop.teamAbbr}</span>
                      {prop.homeTeamLogo && (
                        <img src={prop.homeTeamLogo} alt={prop.teamAbbr} className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Team */}
       <div className="col-span-1 text-center">
         <div className="text-xs font-medium text-foreground">
           {prop.teamAbbr || '—'}
         </div>
       </div>

                {/* Prop Type */}
                <div className="col-span-2 text-center flex flex-col items-center justify-center">
                  <div className="text-sm font-medium leading-tight text-center">
                    {(() => {
                      const formattedPropType = formatPropType(prop.propType);
                      const lines = splitTextIntoLines(formattedPropType, 12);
                      
                      return lines.map((line, index) => (
                        <div 
                          key={index} 
                          className="block text-center bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent font-semibold animate-pulse blur-md hover:blur-sm transition-all duration-500"
                          style={{ 
                            animationDelay: `${index * 0.2}s`,
                            animationDuration: '2.5s',
                            filter: 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.4))'
                          }}
                        >
                          {line}
                        </div>
                      ));
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(prop.gameDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {new Date(prop.gameTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </div>
                </div>

                {/* Line */}
                <div className="col-span-1 text-center">
                  <div className="text-sm font-bold text-foreground">
                    {formatNumber(prop.line, 1)}
                  </div>
                </div>

                {/* Odds (context-aware) */}
                <div className="col-span-1 text-center">
                  <div className={`text-xs font-semibold ${
                    overUnderFilter === 'over' ? 'text-green-500' : 
                    overUnderFilter === 'under' ? 'text-red-500' : 
                    'text-foreground'
                  }`}>
                    {overUnderFilter === 'over' ? toAmericanOdds(prop.best_over || prop.overOdds) :
                     overUnderFilter === 'under' ? toAmericanOdds(prop.best_under || prop.underOdds) :
                     toAmericanOdds(prop.best_over || prop.overOdds)}
                  </div>
                </div>


                {/* Expected Value */}
                <div className="col-span-1 text-center">
                  {prop.expectedValue ? (
                    <span className="text-xs font-bold text-blue-500">
                      {Math.round(prop.expectedValue * 100)}%
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </div>

                {/* Hit Streak */}
                <div className="col-span-1 text-center">
                  {(() => {
                    // Calculate real streak based on available data
                    const hitRate = prop.hitRate || 0.5;
                    const recentForm = typeof prop.recentForm === 'number' ? prop.recentForm : 0.5;
                    const gamesTracked = prop.gamesTracked || 10;
                    
                    // Calculate current streak based on recent form and hit rate
                    let currentStreak = 0;
                    
                    // Use last5Games if available to calculate real streak
                    if (prop.last5Games && prop.last5Games.length > 0) {
                      // Count consecutive hits from most recent games (last5Games is ordered most recent first)
                      for (let i = 0; i < prop.last5Games.length; i++) {
                        if (prop.last5Games[i] === 1) { // 1 = hit, 0 = miss
                          currentStreak++;
                        } else {
                          break; // Stop counting when we hit a miss
                        }
                      }
                    } else if (prop.seasonStats?.last5Games && prop.seasonStats.last5Games.length > 0) {
                      // Use season stats last5Games
                      for (let i = 0; i < prop.seasonStats.last5Games.length; i++) {
                        if (prop.seasonStats.last5Games[i] === 1) {
                          currentStreak++;
                        } else {
                          break;
                        }
                      }
                    } else {
                      // Fallback: estimate streak based on hit rate and recent form
                      // If recent form is high and hit rate is good, assume some streak
                      if (recentForm > 0.7 && hitRate > 0.6) {
                        currentStreak = Math.min(3, Math.floor(hitRate * 5));
                      } else if (recentForm > 0.5 && hitRate > 0.5) {
                        currentStreak = Math.min(2, Math.floor(hitRate * 3));
                      } else {
                        currentStreak = 0;
                      }
                    }
                    
                    // Determine streak display based on current streak
                    let display;
                    if (currentStreak >= 5) {
                      display = { bgColor: "bg-gradient-to-r from-emerald-600 to-green-600 text-white", text: `${currentStreak}W` };
                    } else if (currentStreak >= 3) {
                      display = { bgColor: "bg-gradient-to-r from-blue-600 to-cyan-600 text-white", text: `${currentStreak}W` };
                    } else if (currentStreak >= 1) {
                      display = { bgColor: "bg-gradient-to-r from-yellow-600 to-orange-600 text-white", text: `${currentStreak}W` };
                    } else {
                      display = { bgColor: "bg-gradient-to-r from-gray-600 to-slate-600 text-white", text: "0W" };
                    }
                    
                    return (
                      <div className="flex flex-col items-center space-y-1">
                        <Badge className={cn("text-xs font-bold border px-2 py-1", display.bgColor)}>
                          <Activity className="h-3 w-3 text-white" />
                          <span className="ml-1 text-white">{display.text}</span>
                        </Badge>
                        <div className="text-xs font-semibold text-white">
                          Streak
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Statpedia Rating */}
                <div className="col-span-1 text-center">
                  {(() => {
                    // Use Statpedia rating
                    const propFinderRating = overUnderFilter === 'over' 
                      ? (prop.rating_over_normalized || prop.rating_over_raw)
                      : (prop.rating_under_normalized || prop.rating_under_raw);
                    
                    if (propFinderRating) {
                      return (
                        <div className="flex flex-col items-center space-y-1">
                          <Badge 
                            className={cn(
                              "text-xs font-bold border px-2 py-1",
                              propFinderRating >= 80 ? "bg-green-500/20 text-green-400 border-green-500/40" :
                              propFinderRating >= 60 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" :
                              "bg-red-500/20 text-red-400 border-red-500/40"
                            )}
                          >
                            <Star className="h-3 w-3" />
                            <span className="ml-1">{propFinderRating}</span>
                          </Badge>
                          <div className="text-xs font-semibold text-muted-foreground">
                            {propFinderRating >= 80 ? 'A' : propFinderRating >= 60 ? 'B' : 'C'}
                          </div>
                        </div>
                      );
                    }
                    
                    // Fallback to Statpedia rating
                    const rating = statpediaRatingService.calculateRating(prop, overUnderFilter);
                    return (
                      <div className="flex flex-col items-center space-y-1">
                        <Badge 
                          className={cn(
                            "text-xs font-bold border px-2 py-1",
                            getRatingColor(rating)
                          )}
                        >
                          {getRatingIcon(rating)}
                          <span className="ml-1">{rating.overall}</span>
                        </Badge>
                        <div className="text-xs text-muted-foreground font-semibold">
                          {rating.grade}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Action Button */}
                <div className="col-span-1 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition-all duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePropClick(prop);
                    }}
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredAndSortedProps.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground text-lg mb-2">No props found</div>
          <div className="text-muted-foreground/70 text-sm">Try adjusting your filters or check back later</div>
        </div>
      )}

      {/* Analysis Overlay - Removed: Parent component now handles the EnhancedAnalysisOverlay */}
      {/* Sportsbook Overlay */}
      <SportsbookOverlay
        isOpen={showSportsbookOverlay}
        onClose={() => setShowSportsbookOverlay(false)}
        sportsbooks={selectedPropSportsbooks.sportsbooks}
        propInfo={selectedPropSportsbooks.propInfo}
      />
    </div>
  );
}
