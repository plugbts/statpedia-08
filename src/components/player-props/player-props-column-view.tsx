import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  SortDesc
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { convertEVToText, getEVBadgeClasses } from '@/utils/ev-text-converter';
import { SportsbookIconsList } from '@/components/ui/sportsbook-icons';
import { SportsbookOverlay } from '@/components/ui/sportsbook-overlay';
import { statpediaRatingService, StatpediaRating } from '@/services/statpedia-rating-service';

interface PlayerProp {
  id: string;
  playerId: number;
  playerName: string;
  teamAbbr: string;
  opponentAbbr: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  headshotUrl?: string;
  confidence?: number;
  expectedValue?: number;
  // NEW: Available sportsbooks for this prop
  availableSportsbooks?: string[];
  aiPrediction?: {
    recommended: 'over' | 'under';
    confidence: number;
    reasoning: string;
    factors: string[];
  };
  recentForm?: 'hot' | 'cold' | 'average';
  gameDate: string;
  gameTime: string;
  last5Games?: number[];
  seasonStats?: {
    average: number;
    gamesPlayed: number;
    hitRate: number;
  };
}

interface PlayerPropsColumnViewProps {
  props: PlayerProp[];
  selectedSport: string;
  onAnalysisClick?: (prop: PlayerProp) => void;
  isLoading?: boolean;
}

export function PlayerPropsColumnView({ 
  props, 
  selectedSport, 
  onAnalysisClick,
  isLoading = false 
}: PlayerPropsColumnViewProps) {
  const [sortBy, setSortBy] = useState('confidence');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState('all');
  const [showSportsbookOverlay, setShowSportsbookOverlay] = useState(false);
  const [selectedPropSportsbooks, setSelectedPropSportsbooks] = useState<{sportsbooks: string[], propInfo: any}>({sportsbooks: [], propInfo: null});

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

  const formatOdds = (odds: number): string => {
    return formatAmericanOdds(odds);
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Filter and sort props
  const filteredAndSortedProps = props
    .filter(prop => {
      if (filterBy === 'all') return true;
      if (filterBy === 'over') return prop.aiPrediction?.recommended === 'over';
      if (filterBy === 'under') return prop.aiPrediction?.recommended === 'under';
      if (filterBy === 'high-confidence') return (prop.confidence || 0) > 0.7;
      return true;
    })
    .sort((a, b) => {
      let aValue = 0;
      let bValue = 0;

      switch (sortBy) {
        case 'confidence':
          aValue = a.confidence || 0;
          bValue = b.confidence || 0;
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
    if (rating.overall >= 80) return <Star className="h-3 w-3" />;
    if (rating.overall >= 65) return <Target className="h-3 w-3" />;
    return <BarChart3 className="h-3 w-3" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-100">Player Props - {selectedSport.toUpperCase()}</h2>
          <div className="flex items-center space-x-4">
            <div className="h-10 w-32 bg-slate-800/60 rounded-lg animate-pulse" />
            <div className="h-10 w-24 bg-slate-800/60 rounded-lg animate-pulse" />
            <div className="h-10 w-20 bg-slate-800/60 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-800/60 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-100">
          Player Props - {selectedSport.toUpperCase()}
        </h2>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Dropdown */}
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger className="w-40 bg-slate-800/60 border-slate-600/60 text-slate-200">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="all" className="text-slate-200">All Props</SelectItem>
              <SelectItem value="over" className="text-slate-200">Over Picks</SelectItem>
              <SelectItem value="under" className="text-slate-200">Under Picks</SelectItem>
              <SelectItem value="high-confidence" className="text-slate-200">High Confidence</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 bg-slate-800/60 border-slate-600/60 text-slate-200">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="confidence" className="text-slate-200">Confidence</SelectItem>
              <SelectItem value="expectedValue" className="text-slate-200">Expected Value</SelectItem>
              <SelectItem value="line" className="text-slate-200">Line</SelectItem>
              <SelectItem value="overOdds" className="text-slate-200">Over Odds</SelectItem>
              <SelectItem value="playerName" className="text-slate-200">Player Name</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Order Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="bg-slate-800/60 border-slate-600/60 text-slate-200 hover:bg-slate-700/60"
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-900/60 rounded-lg border border-slate-700/60">
        <div className="col-span-2 text-sm font-semibold text-slate-300">Player</div>
        <div className="col-span-2 text-sm font-semibold text-slate-300">Prop</div>
        <div className="col-span-1 text-sm font-semibold text-slate-300 text-center">Line</div>
        <div className="col-span-1 text-sm font-semibold text-slate-300 text-center">Over</div>
        <div className="col-span-1 text-sm font-semibold text-slate-300 text-center">Under</div>
        <div className="col-span-2 text-sm font-semibold text-slate-300 text-center">Sportsbooks</div>
        <div className="col-span-1 text-sm font-semibold text-slate-300 text-center">EV</div>
        <div className="col-span-1 text-sm font-semibold text-slate-300 text-center">Rating</div>
        <div className="col-span-1 text-sm font-semibold text-slate-300 text-center">Action</div>
      </div>

      {/* Props List */}
      <div className="space-y-2">
        {filteredAndSortedProps.map((prop, index) => (
          <Card
            key={prop.id || `prop-${prop.playerId}-${prop.propType}-${index}`}
            className="bg-slate-900/60 border-slate-700/60 hover:bg-slate-800/60 transition-colors duration-200 cursor-pointer group"
            onClick={() => handlePropClick(prop)}
          >
            <CardContent className="p-4">
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Player Info */}
                <div className="col-span-2 flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-200 font-bold text-sm overflow-hidden">
                    {prop.headshotUrl ? (
                      <img 
                        src={prop.headshotUrl} 
                        alt={prop.playerName}
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => {
                          // Fallback to initials if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = prop.playerName.split(' ').map(n => n[0]).join('');
                          }
                        }}
                      />
                    ) : (
                      prop.playerName.split(' ').map(n => n[0]).join('')
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100 text-sm">
                      {prop.playerName}
                    </div>
                    <div className="text-xs text-slate-400">
                      {prop.teamAbbr} vs {prop.opponentAbbr}
                    </div>
                  </div>
                </div>

                {/* Prop Type */}
                <div className="col-span-2">
                  <div className="text-sm font-medium text-slate-200">
                    {prop.propType.length > 15 ? (
                      <span className="break-words leading-tight">
                        {prop.propType.split(' ').map((word, index) => (
                          <span key={index} className="inline-block mr-1">
                            {word}
                          </span>
                        ))}
                      </span>
                    ) : (
                      prop.propType
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(prop.gameDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {new Date(prop.gameTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </div>
                </div>

                {/* Line */}
                <div className="col-span-1 text-center">
                  <div className="text-lg font-bold text-slate-100">
                    {formatNumber(prop.line, 1)}
                  </div>
                </div>

                {/* Over Odds */}
                <div className="col-span-1 text-center">
                  <div className="text-sm font-semibold text-green-300">
                    {formatOdds(prop.overOdds)}
                  </div>
                </div>

                {/* Under Odds */}
                <div className="col-span-1 text-center">
                  <div className="text-sm font-semibold text-red-300">
                    {formatOdds(prop.underOdds)}
                  </div>
                </div>

                {/* Available Sportsbooks */}
                <div className="col-span-2 text-center">
                  {prop.availableSportsbooks && prop.availableSportsbooks.length > 0 ? (
                    <div className="flex flex-col items-center space-y-1">
                      <SportsbookIconsList 
                        sportsbooks={prop.availableSportsbooks} 
                        maxVisible={3}
                        className="justify-center"
                        onClick={() => {
                          setSelectedPropSportsbooks({
                            sportsbooks: prop.availableSportsbooks,
                            propInfo: {
                              playerName: prop.playerName,
                              propType: prop.propType,
                              line: prop.line
                            }
                          });
                          setShowSportsbookOverlay(true);
                        }}
                      />
                      <div className="text-xs text-slate-400">
                        {prop.availableSportsbooks.length} book{prop.availableSportsbooks.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">No data</span>
                  )}
                </div>

                {/* Expected Value */}
                <div className="col-span-1 text-center">
                  {prop.expectedValue ? (
                    <Badge className={`text-xs font-bold border ${getEVBadgeClasses(prop.expectedValue * 100).combined}`}>
                      {convertEVToText(prop.expectedValue * 100).text}
                    </Badge>
                  ) : (
                    <span className="text-sm text-slate-500">N/A</span>
                  )}
                </div>

                {/* Statpedia Rating */}
                <div className="col-span-1 text-center">
                  {React.useMemo(() => {
                    const rating = statpediaRatingService.calculateRating(prop);
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
                        <div className="text-xs text-slate-400 font-semibold">
                          {rating.grade}
                        </div>
                      </div>
                    );
                  }, [prop])}
                </div>

                {/* Action Button */}
                <div className="col-span-1 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 opacity-0 group-hover:opacity-100 transition-all duration-200"
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
          <div className="text-slate-400 text-lg mb-2">No props found</div>
          <div className="text-slate-500 text-sm">Try adjusting your filters or check back later</div>
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
