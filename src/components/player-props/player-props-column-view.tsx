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

// Utility function to calculate streak
const calculateStreak = (gameLogs: any[], line: number, direction: 'over' | 'under') => {
  if (!gameLogs || gameLogs.length === 0) return 0;
  
  let streak = 0;
  for (let i = 0; i < gameLogs.length; i++) {
    const hit = direction === 'over' ? gameLogs[i].value >= line : gameLogs[i].value <= line;
    if (hit) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

// Utility function to calculate hit rate
const calculateHitRate = (gameLogs: any[], line: number, direction: 'over' | 'under', sampleSize?: number, filterOpponent?: string) => {
  if (!gameLogs || gameLogs.length === 0) {
    return { hits: 0, total: 0, pct: 0 };
  }
  
  let filteredLogs = gameLogs;
  
  // Filter by opponent if specified
  if (filterOpponent) {
    filteredLogs = gameLogs.filter(log => log.opponent === filterOpponent);
  }
  
  // Apply sample size if specified
  if (sampleSize && sampleSize > 0) {
    filteredLogs = filteredLogs.slice(0, sampleSize);
  }
  
  if (filteredLogs.length === 0) {
    return { hits: 0, total: 0, pct: 0 };
  }
  
  const hits = filteredLogs.filter(log => {
    return direction === 'over' ? log.value >= line : log.value <= line;
  }).length;
  
  const total = filteredLogs.length;
  const pct = total > 0 ? (hits / total) * 100 : 0;
  
  return { hits, total, pct };
};

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
  // Analytics properties
  gameLogs?: any[];
  gameLogs2025?: any[];
  relevantRank?: string;
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
    console.log(`🔍 Toggle Alternative Lines: ${checked ? 'ON' : 'OFF'}`);
    
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
          p.propType === prop.propType &&
          p.gameId === prop.gameId // Add gameId to ensure we're looking at the same game
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
      
      // Enhanced debug logging
      console.log('🔍 Alternative Lines Toggle Debug:', {
        totalProps: totalProps.length,
        propsWithoutAlternatives: propsWithoutAlternatives.length,
        additionalProps,
        showAlternativeLines: checked,
        selectedGame
      });
      
      // Log specific examples of alternative lines found
      const groupedProps = props.reduce((acc, prop) => {
        const key = `${prop.playerName}-${prop.propType}-${prop.gameId}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(prop);
        return acc;
      }, {} as Record<string, any[]>);
      
      const alternativeLineGroups = Object.entries(groupedProps).filter(([_, propGroup]) => propGroup.length > 1);
      console.log(`🔍 Found ${alternativeLineGroups.length} alternative line groups:`, alternativeLineGroups.slice(0, 3).map(([key, propGroup]) => ({
        key,
        count: propGroup.length,
        lines: propGroup.map(p => p.line)
      })));
      
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
      console.log('🔍 Alternative Lines Hidden - showing only main lines');
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

  // Debug logging for props and alternative lines
  React.useEffect(() => {
    if (props && props.length > 0) {
      console.log(`🔍 Player Props Debug - Total props: ${props.length}`);
      
      // Group props by player and prop type to check for alternative lines
      const groupedProps = props.reduce((acc, prop) => {
        const key = `${prop.playerName}-${prop.propType}-${prop.gameId}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(prop);
        return acc;
      }, {} as Record<string, any[]>);
      
      // Log groups with multiple lines
      let alternativeLinesFound = 0;
      Object.entries(groupedProps).forEach(([key, propGroup]) => {
        if (propGroup.length > 1) {
          alternativeLinesFound++;
          console.log(`🔍 Alternative Lines Found - ${key}:`, propGroup.map(p => ({ line: p.line, overOdds: p.overOdds, underOdds: p.underOdds })));
        }
      });
      
      console.log(`🔍 Total alternative line groups found: ${alternativeLinesFound}`);
      
      // If no alternative lines found, let's check if we have different prop types for same player
      const playerGroups = props.reduce((acc, prop) => {
        const key = `${prop.playerName}-${prop.gameId}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(prop);
        return acc;
      }, {} as Record<string, any[]>);
      
      const playersWithMultipleProps = Object.entries(playerGroups).filter(([_, playerProps]) => {
        const propTypes = new Set(playerProps.map(p => p.propType));
        return propTypes.size > 1;
      });
      
      console.log(`🔍 Players with multiple prop types: ${playersWithMultipleProps.length}`);
      if (playersWithMultipleProps.length > 0) {
        console.log(`🔍 Sample player with multiple props:`, playersWithMultipleProps[0]);
      }
      
      // TEMPORARY: If no alternative lines found, create some for testing
      if (alternativeLinesFound === 0 && playersWithMultipleProps.length > 0) {
        console.log(`🔍 No alternative lines found - this suggests the API is not returning multiple lines for the same player/prop combination`);
        console.log(`🔍 The issue is likely in the Cloudflare Worker grouping logic that groups all lines for the same player/prop together`);
        console.log(`🔍 Sample player data:`, playersWithMultipleProps[0]);
        
        // Let's also check if we can find any props with similar lines
        const samplePlayerEntry = playersWithMultipleProps[0];
        if (samplePlayerEntry) {
          const [playerName, playerProps] = samplePlayerEntry;
          const propTypes = playerProps.map((p: any) => p.propType);
          console.log(`🔍 Sample player (${playerName}) prop types:`, propTypes);
          
          // Check if any prop types have similar lines
          propTypes.forEach((propType: string) => {
            const propsOfType = playerProps.filter((p: any) => p.propType === propType);
            if (propsOfType.length > 1) {
              console.log(`🔍 Found multiple props for ${propType}:`, propsOfType.map((p: any) => ({ line: p.line, overOdds: p.overOdds, underOdds: p.underOdds })));
            }
          });
        }
      }
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
    
    // Alternative lines filter - FIXED LOGIC
    if (!showAlternativeLines) {
      // Group by player + prop type combination
      const allPropsForPlayer = props.filter(p => 
        p.playerName === prop.playerName && 
        p.propType === prop.propType &&
        p.gameId === prop.gameId // Add gameId to ensure we're looking at the same game
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
          console.log(`🔍 Alternative Lines Filter - ${prop.playerName} ${prop.propType}:`, {
            allPropsForPlayer: allPropsForPlayer.length,
            lineCounts,
            mainLine: Number(mainLine),
            currentLine: prop.line,
          willShow: prop.line === Number(mainLine),
          showAlternativeLines
          });
        
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

      {/* Fixed + Scrollable Table Container */}
      <div className="flex">
        {/* Fixed Columns (Player through Rating) */}
        <div className="flex-none">
          {/* Fixed Header */}
          <div className="flex bg-gradient-card border-b border-border/50">
            <div className="w-48 px-4 py-3 text-xs font-semibold text-foreground flex items-center gap-1">
          <Users className="w-3 h-3" />
          Player
        </div>
            <div className="w-16 text-center px-2 py-3 text-xs font-semibold text-foreground">Team</div>
            <div className="w-24 text-center px-2 py-3 text-xs font-semibold text-foreground">Prop</div>
            <div className="w-16 text-center px-2 py-3 text-xs font-semibold text-foreground">Line</div>
            <div className="w-16 text-center px-2 py-3 text-xs font-semibold text-foreground">Odds</div>
            <div className="w-16 text-center px-2 py-3 text-xs font-semibold text-foreground">EV%</div>
            <div className="w-16 text-center px-2 py-3 text-xs font-semibold text-foreground">Streak</div>
            <div className="w-16 text-center px-2 py-3 text-xs font-semibold text-foreground">Rating</div>
      </div>

          {/* Fixed Data Rows */}
          <div className="space-y-2">
        {filteredAndSortedProps.map((prop, index) => {
          // Calculate analytics data - using mock data for now since gameLogs don't exist
          const gameLogs = prop.gameLogs || [];
          const gameLogs2025 = prop.gameLogs2025 || [];
          const streak = calculateStreak(gameLogs, prop.line, "over");
          const h2h = calculateHitRate(gameLogs, prop.line, "over", undefined, prop.opponentAbbr);
          const season = calculateHitRate(gameLogs2025, prop.line, "over");
          const l5 = calculateHitRate(gameLogs, prop.line, "over", 5);
          const l10 = calculateHitRate(gameLogs, prop.line, "over", 10);
          const l20 = calculateHitRate(gameLogs, prop.line, "over", 20);

          return (
          <Card
            key={prop.id || `prop-${prop.playerId}-${prop.propType}-${index}`}
              className="bg-gradient-card border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 cursor-pointer group hover:scale-[1.02] hover:bg-gradient-to-br hover:from-card/90 hover:to-card/70"
            onClick={() => handlePropClick(prop)}
          >
              <CardContent className="p-3">
                <div className="flex items-center">
                {/* Player Info */}
                  <div className="w-48 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center text-foreground font-bold text-sm overflow-hidden flex-shrink-0">
                    {(() => {
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
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-foreground text-sm group-hover:text-primary transition-colors duration-200 truncate">
                      {prop.playerName || 'Unknown Player'}
                    </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Add to My Picks functionality
                        console.log('Add to My Picks:', prop);
                      }}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                </div>

                {/* Team */}
                  <div className="w-16 text-center px-2">
         <div className="text-xs font-medium text-foreground">
           {prop.teamAbbr || '—'}
         </div>
       </div>

                {/* Prop Type */}
                  <div className="w-24 text-center px-2">
                    <div className="text-xs font-medium text-foreground group-hover:text-primary/90 transition-colors duration-200 truncate">
                      {formatPropType(prop.propType)}
                  </div>
                </div>

                {/* Line */}
                  <div className="w-16 text-center px-2">
                    <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors duration-200">
                    {formatNumber(prop.line, 1)}
                  </div>
                </div>

                  {/* Odds */}
                  <div className="w-16 text-center px-2">
                    <div className={`text-xs font-semibold transition-colors duration-200 ${
                      overUnderFilter === 'over' ? 'text-green-500 group-hover:text-green-400' : 
                      overUnderFilter === 'under' ? 'text-red-500 group-hover:text-red-400' : 
                      'text-foreground group-hover:text-primary/90'
                  }`}>
                    {overUnderFilter === 'over' ? toAmericanOdds(prop.best_over || prop.overOdds) :
                     overUnderFilter === 'under' ? toAmericanOdds(prop.best_under || prop.underOdds) :
                     toAmericanOdds(prop.best_over || prop.overOdds)}
                  </div>
                </div>

                  {/* EV% */}
                  <div className="w-16 text-center px-2">
                  {prop.expectedValue ? (
                      <span className="text-xs font-bold text-blue-500 group-hover:text-blue-400 transition-colors duration-200">
                      {prop.expectedValue > 0 ? '+' : ''}{prop.expectedValue.toFixed(1)}%
                    </span>
                  ) : (
                      <span className="text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors duration-200">N/A</span>
                  )}
                </div>

                  {/* Streak */}
                  <div className="w-16 text-center px-2">
                    <div className="text-xs font-bold text-muted-foreground group-hover:opacity-80 transition-colors duration-200">
                      {streak}W
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="w-16 text-center px-2">
                  {(() => {
                      const propFinderRating = overUnderFilter === 'over' 
                        ? (prop.rating_over_normalized || prop.rating_over_raw)
                        : (prop.rating_under_normalized || prop.rating_under_raw);
                      
                      const ratingValue = propFinderRating || statpediaRatingService.calculateRating(prop, overUnderFilter).overall;
                      // Scale so 95+ is considered full circle
                      const scaledPercentage = Math.min((ratingValue / 95) * 100, 100);
                      const displayPercentage = Math.min(Math.max(ratingValue, 0), 100);
                      
                      // Color based on rating
                      let circleColor = 'stroke-gray-400';
                      let textColor = 'text-gray-500';
                      let glowColor = '';
                      
                      if (displayPercentage >= 80) {
                        circleColor = 'stroke-green-500';
                        textColor = 'text-green-600';
                        glowColor = 'drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]';
                      } else if (displayPercentage >= 60) {
                        circleColor = 'stroke-yellow-500';
                        textColor = 'text-yellow-600';
                        glowColor = 'drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]';
                    } else {
                        circleColor = 'stroke-red-500';
                        textColor = 'text-red-600';
                        glowColor = 'drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]';
                    }
                    
                      return (
                        <div className="flex flex-col items-center group/rating">
                          <div className="relative w-8 h-8">
                            <svg className="w-8 h-8 transform -rotate-90 transition-all duration-300 group-hover/rating:scale-110" viewBox="0 0 36 36">
                              {/* Background circle - transparent */}
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeDasharray="100, 100"
                                className="text-gray-300/30"
                              />
                              
                              {/* Filled progress circle with AI prediction glow */}
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeDasharray={`${scaledPercentage}, 100`}
                                strokeLinecap="round"
                                className={`${circleColor} transition-all duration-500 ease-out`}
                                style={{
                                  filter: displayPercentage >= 80 ? 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.6))' :
                                          displayPercentage >= 60 ? 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.6))' :
                                          'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))',
                                  animation: 'pulse 3s ease-in-out infinite'
                                }}
                              />
                            </svg>
                            
                            {/* Number with AI prediction glow */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span 
                                className={`text-xs font-bold ${textColor} transition-all duration-300 group-hover/rating:scale-110`}
                                style={{
                                  textShadow: displayPercentage >= 80 ? '0 0 8px rgba(34, 197, 94, 0.8)' :
                                             displayPercentage >= 60 ? '0 0 8px rgba(234, 179, 8, 0.8)' :
                                             '0 0 8px rgba(239, 68, 68, 0.8)',
                                  animation: 'pulse 3s ease-in-out infinite'
                                }}
                              >
                                {Math.round(displayPercentage)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                  })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
          </div>
                </div>

        {/* Scrollable Analytics Columns */}
        <div className="flex-1 overflow-x-auto">
          {/* Analytics Header */}
          <div className="flex bg-gradient-card border-b border-border/50 sticky top-0 z-20">
            <div className="w-24 text-center px-2 py-3 text-xs font-semibold text-foreground">Matchup</div>
            <div className="w-24 text-center px-2 py-3 text-xs font-semibold text-foreground">H2H</div>
            <div className="w-24 text-center px-2 py-3 text-xs font-semibold text-foreground">2025</div>
            <div className="w-24 text-center px-2 py-3 text-xs font-semibold text-foreground">L5</div>
            <div className="w-24 text-center px-2 py-3 text-xs font-semibold text-foreground">L10</div>
            <div className="w-24 text-center px-2 py-3 text-xs font-semibold text-foreground">L20</div>
          </div>

          {/* Analytics Data Rows */}
          <div className="space-y-2">
            {filteredAndSortedProps.map((prop, index) => {
              // Calculate analytics data
              const gameLogs = prop.gameLogs || [];
              const gameLogs2025 = prop.gameLogs2025 || [];
              const h2h = calculateHitRate(gameLogs, prop.line, "over", undefined, prop.opponentAbbr);
              const season = calculateHitRate(gameLogs2025, prop.line, "over");
              const l5 = calculateHitRate(gameLogs, prop.line, "over", 5);
              const l10 = calculateHitRate(gameLogs, prop.line, "over", 10);
              const l20 = calculateHitRate(gameLogs, prop.line, "over", 20);

                      return (
                <div
                  key={prop.id || `analytics-${prop.playerId}-${prop.propType}-${index}`}
                  className="flex border-b border-border/20 hover:bg-gray-50/50 transition-colors duration-200"
                >
                  {/* Matchup */}
                  <div className="w-24 text-center px-2 py-3">
                    <div className="text-xs font-medium text-foreground">
                      {prop.opponentAbbr || '—'}
                          </div>
                    <div className="text-xs text-muted-foreground">
                      {prop.relevantRank || '—'}
                        </div>
                  </div>

                  {/* H2H */}
                  <div className="w-24 text-center px-2 py-3">
                    <div className="text-xs font-medium text-foreground">
                      {h2h.pct.toFixed(0)}%
                        </div>
                    <div className="text-xs text-muted-foreground">
                      {h2h.hits}/{h2h.total}
                      </div>
                </div>

                  {/* 2025 */}
                  <div className="w-24 text-center px-2 py-3">
                    <div className="text-xs font-medium text-foreground">
                      {season.pct.toFixed(0)}%
                </div>
                    <div className="text-xs text-muted-foreground">
                      {season.hits}/{season.total}
              </div>
                  </div>

                  {/* L5 */}
                  <div className="w-24 text-center px-2 py-3">
                    <div className="text-xs font-medium text-foreground">
                      {l5.pct.toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {l5.hits}/{l5.total}
                    </div>
                  </div>

                  {/* L10 */}
                  <div className="w-24 text-center px-2 py-3">
                    <div className="text-xs font-medium text-foreground">
                      {l10.pct.toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {l10.hits}/{l10.total}
                    </div>
                  </div>

                  {/* L20 */}
                  <div className="w-24 text-center px-2 py-3">
                    <div className="text-xs font-medium text-foreground">
                      {l20.pct.toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {l20.hits}/{l20.total}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
