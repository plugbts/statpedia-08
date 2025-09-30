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
  Upload
} from 'lucide-react';
import { PlayerPropCard } from './player-prop-card';
import { usePlayerProps } from '@/hooks/use-sports-data';
import { useOddsAPI } from '@/hooks/use-odds-api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PlayerPropsTabProps {
  userSubscription: string;
  userRole?: string;
}

interface PlayerProp {
  id: string;
  sport: string;
  playerName: string;
  team: string;
  opponent: string;
  propType: string;
  line: number;
  hitRate: number;
  gamesTracked: number;
  odds: string;
  probability: number;
  opponentRank: number;
  streak: number;
  last5: number;
  last10: number;
  last20: number;
  h2h: number;
  year: number;
  sportsbooks: string[];
  isAltProp?: boolean;
}

interface SortCriteria {
  field: string;
  order: 'asc' | 'desc';
}

interface FilterSettings {
  sortCriteria: SortCriteria[];
  showAltProps: boolean;
  overUnder: 'all' | 'over' | 'under';
  minOdds: number;
  maxOdds: number;
  minHitRate: number;
  maxHitRate: number;
  sportsbooks: string[];
}

interface MyPick {
  id: string;
  prop: PlayerProp;
  addedAt: Date;
}

const SPORTSBOOKS = [
  { id: 'fanduel', name: 'FanDuel', icon: '/src/assets/logos/fanduel.svg', color: 'bg-green-500' },
  { id: 'caesars', name: 'Caesars', icon: '/src/assets/logos/caesars.svg', color: 'bg-purple-500' },
  { id: 'draftkings', name: 'DraftKings', icon: '/src/assets/logos/draftkings.svg', color: 'bg-blue-500' },
  { id: 'hardrock', name: 'Hard Rock Bet', icon: '/src/assets/logos/hardrock.svg', color: 'bg-orange-500' },
  { id: 'prizepicks', name: 'PrizePicks', icon: '/src/assets/logos/prizepicks.svg', color: 'bg-pink-500' },
  { id: 'sleeper', name: 'Sleeper', icon: '/src/assets/logos/sleeper.svg', color: 'bg-indigo-500' },
  { id: 'underdog', name: 'Underdog', icon: '/src/assets/logos/underdog.svg', color: 'bg-yellow-500' },
  { id: 'bet365', name: 'Bet365', icon: '/src/assets/logos/bet365.svg', color: 'bg-emerald-500' },
  { id: 'betmgm', name: 'BetMGM', icon: '/src/assets/logos/betmgm.svg', color: 'bg-red-500' },
  { id: 'espnbet', name: 'ESPN Bet', icon: '/src/assets/logos/espnbet.svg', color: 'bg-orange-600' },
];

const SORT_OPTIONS = [
  { value: 'line', label: 'Line' },
  { value: 'odds', label: 'Odds' },
  { value: 'probability', label: 'Probability' },
  { value: 'opponentRank', label: 'Opponent Rank' },
  { value: 'streak', label: 'Streak' },
  { value: 'last5', label: 'Last 5' },
  { value: 'last10', label: 'Last 10' },
  { value: 'last20', label: 'Last 20' },
  { value: 'h2h', label: 'H2H' },
  { value: 'year', label: 'Year' },
  { value: 'hitRate', label: 'Hit Rate' },
];

export const PlayerPropsTab: React.FC<PlayerPropsTabProps> = ({ userSubscription, userRole = 'user' }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('nba');
  const [propTypeFilter, setPropTypeFilter] = useState('all');
  const [selectedProps, setSelectedProps] = useState<string[]>([]);
  const [realProps, setRealProps] = useState<PlayerProp[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [myPicks, setMyPicks] = useState<MyPick[]>([]);
  const [showMyPicks, setShowMyPicks] = useState(false);
  const [selectedPlayerForAnalysis, setSelectedPlayerForAnalysis] = useState<any>(null);
  const [showAnalysisOverlay, setShowAnalysisOverlay] = useState(false);

  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    sortCriteria: [
      { field: 'probability', order: 'desc' },
      { field: 'hitRate', order: 'desc' },
      { field: 'line', order: 'asc' }
    ],
    showAltProps: true,
    overUnder: 'all',
    minOdds: -200,
    maxOdds: 500,
    minHitRate: 0,
    maxHitRate: 100,
    sportsbooks: [],
  });

  const isSubscribed = userRole === 'owner' || userSubscription !== 'free';
  const { fetchInSeasonSports, fetchOdds, loading, error, isSeasonActive } = useOddsAPI();
  const { toast } = useToast();

  // Use real player props data from sports API
  const {
    props: realPlayerProps,
    loading: propsLoading,
    error: propsError,
    refetch: refetchProps,
  } = usePlayerProps(sportFilter);

  // Generate mock data with all required fields
  const generateMockProps = (): PlayerProp[] => [
    {
      id: '1',
      sport: 'nba',
      playerName: 'LeBron James',
      team: 'LAL',
      opponent: 'GSW',
      propType: 'Points',
      line: 26.5,
      hitRate: 87.3,
      gamesTracked: 23,
      odds: '+110',
      probability: 78.5,
      opponentRank: 12,
      streak: 4,
      last5: 28.2,
      last10: 27.8,
      last20: 26.9,
      h2h: 29.1,
      year: 2024,
      sportsbooks: ['fanduel', 'draftkings', 'betmgm'],
      isAltProp: false,
    },
    {
      id: '2',
      sport: 'nba',
      playerName: 'Stephen Curry',
      team: 'GSW',
      opponent: 'LAL',
      propType: 'Assists',
      line: 8.5,
      hitRate: 72.1,
      gamesTracked: 25,
      odds: '-120',
      probability: 65.2,
      opponentRank: 8,
      streak: 2,
      last5: 9.1,
      last10: 8.7,
      last20: 8.2,
      h2h: 7.8,
      year: 2024,
      sportsbooks: ['fanduel', 'caesars', 'draftkings', 'bet365'],
      isAltProp: false,
    },
    {
      id: '3',
      sport: 'nba',
      playerName: 'Anthony Davis',
      team: 'LAL',
      opponent: 'GSW',
      propType: 'Rebounds',
      line: 12.5,
      hitRate: 68.9,
      gamesTracked: 22,
      odds: '+105',
      probability: 71.3,
      opponentRank: 12,
      streak: 1,
      last5: 13.2,
      last10: 12.8,
      last20: 12.1,
      h2h: 14.5,
      year: 2024,
      sportsbooks: ['fanduel', 'draftkings', 'hardrock', 'betmgm'],
      isAltProp: true,
    },
    {
      id: '4',
      sport: 'nba',
      playerName: 'Klay Thompson',
      team: 'GSW',
      opponent: 'LAL',
      propType: '3-Pointers Made',
      line: 3.5,
      hitRate: 81.2,
      gamesTracked: 24,
      odds: '+125',
      probability: 82.1,
      opponentRank: 8,
      streak: 3,
      last5: 4.1,
      last10: 3.8,
      last20: 3.6,
      h2h: 3.2,
      year: 2024,
      sportsbooks: ['fanduel', 'caesars', 'prizepicks', 'underdog'],
      isAltProp: false,
    },
    {
      id: '5',
      sport: 'nba',
      playerName: 'Russell Westbrook',
      team: 'LAC',
      opponent: 'PHX',
      propType: 'Points',
      line: 15.5,
      hitRate: 63.4,
      gamesTracked: 20,
      odds: '+140',
      probability: 58.7,
      opponentRank: 5,
      streak: -2,
      last5: 14.8,
      last10: 15.2,
      last20: 15.9,
      h2h: 16.3,
      year: 2024,
      sportsbooks: ['draftkings', 'bet365', 'espnbet'],
      isAltProp: true,
    },
  ];

  // Load my picks from localStorage
  useEffect(() => {
    const savedPicks = localStorage.getItem('statpedia_my_picks');
    if (savedPicks) {
      try {
        const parsed = JSON.parse(savedPicks);
        setMyPicks(parsed.map((pick: any) => ({
          ...pick,
          addedAt: new Date(pick.addedAt)
        })));
      } catch (error) {
        console.error('Failed to load my picks:', error);
      }
    }
  }, []);

  // Save my picks to localStorage
  useEffect(() => {
    localStorage.setItem('statpedia_my_picks', JSON.stringify(myPicks));
  }, [myPicks]);

  // Load filter settings from localStorage
  useEffect(() => {
    const savedFilters = localStorage.getItem('statpedia_prop_filters');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        
        // Migrate old format to new format
        if (parsed.sortBy && !parsed.sortCriteria) {
          parsed.sortCriteria = [
            { field: parsed.sortBy, order: parsed.sortOrder || 'desc' }
          ];
          delete parsed.sortBy;
          delete parsed.sortOrder;
        }
        
        // Ensure sortCriteria is an array
        if (!parsed.sortCriteria) {
          parsed.sortCriteria = [
            { field: 'probability', order: 'desc' },
            { field: 'hitRate', order: 'desc' },
            { field: 'line', order: 'asc' }
          ];
        }
        
        // Ensure sportsbooks is an array
        if (!parsed.sportsbooks) {
          parsed.sportsbooks = [];
        }
        
        setFilterSettings(parsed);
      } catch (error) {
        console.error('Failed to load filter settings:', error);
      }
    }
  }, []);

  // Save filter settings to localStorage
  useEffect(() => {
    localStorage.setItem('statpedia_prop_filters', JSON.stringify(filterSettings));
  }, [filterSettings]);

  // Use real data from API, fallback to mock data if needed
  const allPlayerProps = (realPlayerProps && realPlayerProps.length > 0) ? realPlayerProps : generateMockProps();

  // Filter and sort props based on current settings
  const filteredProps = (allPlayerProps || [])
    .filter((prop) => {
      // Search filter
      if (searchQuery && !prop.playerName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Prop type filter
      if (propTypeFilter !== 'all' && prop.propType !== propTypeFilter) {
        return false;
      }

      // Alt props filter
      if (!filterSettings.showAltProps && prop.isAltProp) {
        return false;
      }

      // Over/Under filter
      if (filterSettings.overUnder !== 'all') {
        const isOver = prop.line > 0;
        if (filterSettings.overUnder === 'over' && !isOver) return false;
        if (filterSettings.overUnder === 'under' && isOver) return false;
      }

      // Odds filter
      const numericOdds = parseInt(prop.odds.replace(/[+-]/, ''));
      if (numericOdds < filterSettings.minOdds || numericOdds > filterSettings.maxOdds) {
        return false;
      }

      // Hit rate filter
      if (prop.hitRate < filterSettings.minHitRate || prop.hitRate > filterSettings.maxHitRate) {
        return false;
      }

      // Sportsbook filter
      if ((filterSettings.sportsbooks || []).length > 0) {
        const hasMatchingSportsbook = (prop.sportsbooks || []).some(sb => 
          (filterSettings.sportsbooks || []).includes(sb)
        );
        if (!hasMatchingSportsbook) return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Multi-level sorting based on criteria array
      for (const criteria of (filterSettings.sortCriteria || [])) {
        const aValue = a[criteria.field as keyof PlayerProp] as number;
        const bValue = b[criteria.field as keyof PlayerProp] as number;
        
        let comparison = 0;
        if (criteria.order === 'asc') {
          comparison = aValue - bValue;
        } else {
          comparison = bValue - aValue;
        }
        
        // If values are different, return the comparison
        // If they're equal, continue to next criteria
        if (comparison !== 0) {
          return comparison;
        }
      }
      
      // If all criteria are equal, maintain original order
      return 0;
    });

  const handleToggleMyPick = (prop: PlayerProp) => {
    const existingPick = myPicks.find(pick => pick.prop.id === prop.id);
    
    if (existingPick) {
      setMyPicks(prev => prev.filter(pick => pick.prop.id !== prop.id));
      toast({
        title: "Removed from My Picks",
        description: `${prop.playerName} ${prop.propType} prop removed`,
      });
    } else {
      const newPick: MyPick = {
        id: `${prop.id}_${Date.now()}`,
        prop,
        addedAt: new Date(),
      };
      setMyPicks(prev => [...prev, newPick]);
      toast({
        title: "Added to My Picks",
        description: `${prop.playerName} ${prop.propType} prop added`,
      });
    }
  };

  const handleSportsbookClick = (sportsbookId: string, prop: PlayerProp) => {
    const sportsbook = SPORTSBOOKS.find(sb => sb.id === sportsbookId);
    if (sportsbook) {
      // In a real app, this would redirect to the sportsbook with the specific prop
      window.open(`https://${sportsbookId}.com/bet/${prop.id}`, '_blank');
      toast({
        title: "Redirecting to Sportsbook",
        description: `Opening ${sportsbook.name} for ${prop.playerName} ${prop.propType}`,
      });
    }
  };

  const handleSaveFilters = () => {
    localStorage.setItem('statpedia_prop_filters', JSON.stringify(filterSettings));
    toast({
      title: "Filters Saved",
      description: "Your filter settings have been saved",
    });
  };

  const handleLoadFilters = () => {
    const savedFilters = localStorage.getItem('statpedia_prop_filters');
    if (savedFilters) {
      try {
        setFilterSettings(JSON.parse(savedFilters));
        toast({
          title: "Filters Loaded",
          description: "Your saved filter settings have been loaded",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load saved filters",
          variant: "destructive",
        });
      }
    }
  };

  const getSportsbookIcon = (sportsbookId: string) => {
    const sportsbook = SPORTSBOOKS.find(sb => sb.id === sportsbookId);
    return sportsbook ? (
      <img src={sportsbook.icon} alt={sportsbook.name} className="w-4 h-4" />
    ) : (
      <span className="text-xs">🎯</span>
    );
  };

  const handlePlayerAnalysis = (prop: PlayerProp) => {
    // Create player data for analysis
    const playerData = {
      id: prop.id,
      name: prop.playerName,
      team: prop.team,
      position: prop.position || 'G', // Default position
      headshot: prop.headshot,
      stats: {
        points: Math.floor(Math.random() * 30) + 10,
        rebounds: Math.floor(Math.random() * 15) + 3,
        assists: Math.floor(Math.random() * 12) + 2,
        steals: Math.floor(Math.random() * 3) + 0.5,
        blocks: Math.floor(Math.random() * 3) + 0.2,
        turnovers: Math.floor(Math.random() * 5) + 1,
        minutes: Math.floor(Math.random() * 20) + 25,
        efficiency: Math.floor(Math.random() * 20) + 15
      },
      injuryStatus: Math.random() > 0.8 ? 'questionable' : 'healthy',
      injuryDetails: Math.random() > 0.8 ? 'Minor ankle sprain' : undefined,
      recentForm: Math.random() > 0.6 ? 'hot' : Math.random() > 0.3 ? 'cold' : 'average',
      matchupAdvantage: Math.random() > 0.6 ? 'strong' : Math.random() > 0.3 ? 'weak' : 'neutral'
    };
    
    setSelectedPlayerForAnalysis(playerData);
    setShowAnalysisOverlay(true);
  };

  const getPerformanceColor = (value: number, thresholds: { good: number; bad: number }) => {
    if (value >= thresholds.good) return 'text-green-500 bg-green-500/10';
    if (value <= thresholds.bad) return 'text-red-500 bg-red-500/10';
    return 'text-yellow-500 bg-yellow-500/10';
  };

  const handleUpgrade = () => {
    navigate('/subscription');
  };

  const getSportsbookColor = (sportsbookId: string) => {
    const sportsbook = SPORTSBOOKS.find(sb => sb.id === sportsbookId);
    return sportsbook ? sportsbook.color : 'bg-gray-500';
  };

  if (propsLoading || isLoadingData) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading player props...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with My Picks Toggle */}
        <div className="flex items-center justify-between">
          <div>
          <h1 className="text-3xl font-bold text-foreground">Player Props</h1>
            <p className="text-muted-foreground">
            Advanced player prop analysis and filtering
            </p>
          </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showMyPicks ? "default" : "outline"}
            onClick={() => setShowMyPicks(!showMyPicks)}
            className="gap-2"
          >
            {showMyPicks ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            My Picks ({(myPicks || []).length})
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
            <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
              placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
          </div>
            </div>
            
        <div className="flex gap-2">
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nba">NBA</SelectItem>
                <SelectItem value="nfl">NFL</SelectItem>
              <SelectItem value="mlb">MLB</SelectItem>
                <SelectItem value="nhl">NHL</SelectItem>
              </SelectContent>
            </Select>

          <Select value={propTypeFilter} onValueChange={setPropTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Props</SelectItem>
              <SelectItem value="Points">Points</SelectItem>
              <SelectItem value="Assists">Assists</SelectItem>
              <SelectItem value="Rebounds">Rebounds</SelectItem>
              <SelectItem value="3-Pointers Made">3-Pointers</SelectItem>
              </SelectContent>
            </Select>

          <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[70vw] xl:w-[60vw]">
              <DialogHeader className="sticky top-0 bg-background z-10 pb-2">
                <DialogTitle>Filter Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-120px)] pr-2">
                {/* Multi-Level Sort Settings */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Sort By (Up to 3 levels)</h3>
            <Button 
              variant="outline" 
                      size="sm"
              onClick={() => {
                        if ((filterSettings.sortCriteria || []).length < 3) {
                          setFilterSettings(prev => ({
                            ...prev,
                            sortCriteria: [...prev.sortCriteria, { field: 'probability', order: 'desc' }]
                          }));
                        }
                      }}
                      disabled={(filterSettings.sortCriteria || []).length >= 3}
                      className="text-xs px-2 py-1 h-7"
                    >
                      Add Level
            </Button>
          </div>
                  <div className="space-y-2">
                    {(filterSettings.sortCriteria || []).map((criteria, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="w-6 h-6 flex items-center justify-center text-xs">
                            {index + 1}
            </Badge>
                          <span className="text-xs font-medium">P{index + 1}</span>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <Select 
                            value={criteria.field} 
                            onValueChange={(value) => {
                              const newCriteria = [...filterSettings.sortCriteria];
                              newCriteria[index] = { ...criteria, field: value };
                              setFilterSettings(prev => ({ ...prev, sortCriteria: newCriteria }));
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(SORT_OPTIONS || []).map(option => (
                                <SelectItem key={option.value} value={option.value} className="text-xs">
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select 
                            value={criteria.order} 
                            onValueChange={(value: 'asc' | 'desc') => {
                              const newCriteria = [...filterSettings.sortCriteria];
                              newCriteria[index] = { ...criteria, order: value };
                              setFilterSettings(prev => ({ ...prev, sortCriteria: newCriteria }));
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="asc" className="text-xs">Asc</SelectItem>
                              <SelectItem value="desc" className="text-xs">Desc</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (index > 0) {
                                const newCriteria = [...filterSettings.sortCriteria];
                                [newCriteria[index - 1], newCriteria[index]] = [newCriteria[index], newCriteria[index - 1]];
                                setFilterSettings(prev => ({ ...prev, sortCriteria: newCriteria }));
                              }
                            }}
                            disabled={index === 0}
                            className="p-1 h-5 w-5"
                          >
                            <ArrowUp className="w-2.5 h-2.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (index < (filterSettings.sortCriteria || []).length - 1) {
                                const newCriteria = [...filterSettings.sortCriteria];
                                [newCriteria[index], newCriteria[index + 1]] = [newCriteria[index + 1], newCriteria[index]];
                                setFilterSettings(prev => ({ ...prev, sortCriteria: newCriteria }));
                              }
                            }}
                            disabled={index === (filterSettings.sortCriteria || []).length - 1}
                            className="p-1 h-5 w-5"
                          >
                            <ArrowDown className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newCriteria = filterSettings.sortCriteria.filter((_, i) => i !== index);
                            setFilterSettings(prev => ({ ...prev, sortCriteria: newCriteria }));
                          }}
                          className="text-destructive hover:text-destructive text-xs px-2 py-1 h-6"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                    {(filterSettings.sortCriteria || []).length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        No sort criteria set. Click "Add Sort Level" to add sorting.
                      </div>
                    )}
                  </div>
                </div>

                {/* Alt Props Toggle */}
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="altProps"
                    checked={filterSettings.showAltProps}
                    onCheckedChange={(checked) => setFilterSettings(prev => ({ ...prev, showAltProps: !!checked }))}
                  />
                  <label htmlFor="altProps" className="text-xs font-medium">
                    Show Alternative Props
                  </label>
                </div>

                {/* Over/Under Filter */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Over/Under</h3>
                  <Select 
                    value={filterSettings.overUnder} 
                    onValueChange={(value: 'all' | 'over' | 'under') => setFilterSettings(prev => ({ ...prev, overUnder: value }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All</SelectItem>
                      <SelectItem value="over" className="text-xs">Over Only</SelectItem>
                      <SelectItem value="under" className="text-xs">Under Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Odds Range */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Odds Range</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Min: {filterSettings.minOdds}</span>
                      <span>Max: {filterSettings.maxOdds}</span>
                    </div>
                    <Slider
                      value={[filterSettings.minOdds, filterSettings.maxOdds]}
                      onValueChange={([min, max]) => setFilterSettings(prev => ({ ...prev, minOdds: min, maxOdds: max }))}
                      min={-500}
                      max={1000}
                      step={10}
                      className="w-full"
                    />
                  </div>
        </div>

                {/* Hit Rate Range */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Hit Rate Range</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Min: {filterSettings.minHitRate}%</span>
                      <span>Max: {filterSettings.maxHitRate}%</span>
                    </div>
                    <Slider
                      value={[filterSettings.minHitRate, filterSettings.maxHitRate]}
                      onValueChange={([min, max]) => setFilterSettings(prev => ({ ...prev, minHitRate: min, maxHitRate: max }))}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
        </div>

                {/* Sportsbook Filter */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Sportsbooks</h3>
                  <div className="grid grid-cols-2 gap-1">
                    {(SPORTSBOOKS || []).map(sportsbook => (
                      <div key={sportsbook.id} className="flex items-center space-x-1">
                        <Checkbox
                          id={sportsbook.id}
                          checked={(filterSettings.sportsbooks || []).includes(sportsbook.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilterSettings(prev => ({
                                ...prev,
                                sportsbooks: [...(prev.sportsbooks || []), sportsbook.id]
                              }));
                            } else {
                              setFilterSettings(prev => ({
                                ...prev,
                                sportsbooks: (prev.sportsbooks || []).filter(id => id !== sportsbook.id)
                              }));
                            }
                          }}
                        />
                        <label htmlFor={sportsbook.id} className="text-xs font-medium flex items-center gap-1">
                          <span className={cn("w-3 h-3 rounded flex items-center justify-center", sportsbook.color)}>
                            <img src={sportsbook.icon} alt={sportsbook.name} className="w-3 h-3" />
                          </span>
                          {sportsbook.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Save/Load Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSaveFilters} className="gap-1 text-xs h-8">
                    <Save className="w-3 h-3" />
                    Save
                  </Button>
                  <Button onClick={handleLoadFilters} variant="outline" className="gap-1 text-xs h-8">
                    <Download className="w-3 h-3" />
                    Load
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Multi-Level Sort Bar */}
      <div className="flex items-center gap-1 p-2 bg-muted/30 rounded-lg">
        <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Sort:</span>
        <div className="flex gap-1 flex-wrap">
          {(filterSettings.sortCriteria || []).map((criteria, index) => {
            const option = SORT_OPTIONS.find(opt => opt.value === criteria.field);
            return (
              <div key={index} className="flex items-center gap-0.5">
                <Badge variant="outline" className="text-xs w-4 h-4 p-0 flex items-center justify-center">
                  {index + 1}
                </Badge>
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs gap-0.5 h-6 px-2"
                >
                  {option?.label || criteria.field}
                  {criteria.order === 'asc' ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                </Button>
              </div>
            );
          })}
          {(filterSettings.sortCriteria || []).length === 0 && (
            <span className="text-xs text-muted-foreground italic">No sorting applied</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilterDialog(true)}
          className="ml-auto gap-1 text-xs h-6 px-2"
        >
          <Settings className="w-3 h-3" />
          Config
        </Button>
      </div>

      {/* My Picks Bar */}
      {showMyPicks && (
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5" />
              My Picks ({(myPicks || []).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(myPicks || []).length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No picks added yet</p>
            ) : (
              <div className="space-y-3">
                {(myPicks || []).map(pick => (
                  <div key={pick.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{pick.prop.playerName} {pick.prop.propType}</p>
                        <p className="text-sm text-muted-foreground">
                          {pick.prop.team} vs {pick.prop.opponent} • Line: {pick.prop.line} • Odds: {pick.prop.odds}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {(pick.prop.sportsbooks || []).map(sportsbookId => (
                          <Button
                            key={sportsbookId}
                            size="sm"
                            variant="outline"
                            onClick={() => handleSportsbookClick(sportsbookId, pick.prop)}
                            className="gap-1"
                          >
                            <span className={cn("w-3 h-3 rounded text-white text-xs flex items-center justify-center", getSportsbookColor(sportsbookId))}>
                              {getSportsbookIcon(sportsbookId)}
                            </span>
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleMyPick(pick.prop)}
                        className="text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Props Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {(filteredProps || []).map((prop, index) => (
          <React.Fragment key={prop.id}>
            {/* Player Prop Card Ad - Show after every 4 cards */}
            {index > 0 && index % 4 === 0 && (
              <div className="col-span-full">
                <PlayerPropCardAd userSubscription={userSubscription} />
              </div>
            )}
            <div className="relative">
            <Card className={cn(
              "p-6 hover:shadow-card-hover transition-all duration-300 hover-scale group bg-gradient-card border-border/50 hover:border-primary/30 cursor-pointer",
              !isSubscribed && "blur-sm"
            )}>
            
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">{prop.playerName}</h3>
                <p className="text-sm text-muted-foreground">{prop.team} vs {prop.opponent}</p>
                <p className="text-lg font-bold text-primary">{prop.propType}: {prop.line}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handlePlayerAnalysis(prop)}
                  className="p-1"
                  title="Player Analysis"
                >
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleMyPick(prop)}
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Odds</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{prop.odds}</span>
                  <div className="flex gap-1">
                    {(prop.sportsbooks || []).map(sportsbookId => (
                      <Button
                        key={sportsbookId}
                        size="sm"
                        variant="outline"
                        onClick={() => handleSportsbookClick(sportsbookId, prop)}
                        className="p-1 h-6 w-6"
                      >
                        <span className={cn("w-3 h-3 rounded text-white text-xs flex items-center justify-center", getSportsbookColor(sportsbookId))}>
                          {getSportsbookIcon(sportsbookId)}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Hit Rate</span>
                <span className={cn(
                  "font-medium px-2 py-1 rounded-full text-xs",
                  getPerformanceColor(prop.hitRate, { good: 75, bad: 60 })
                )}>
                  {prop.hitRate}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Probability</span>
                <span className={cn(
                  "font-medium px-2 py-1 rounded-full text-xs",
                  getPerformanceColor(prop.probability, { good: 70, bad: 50 })
                )}>
                  {prop.probability}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Streak</span>
                <span className={cn("font-medium", prop.streak > 0 ? "text-green-500" : prop.streak < 0 ? "text-red-500" : "text-muted-foreground")}>
                  {prop.streak > 0 ? `+${prop.streak}` : prop.streak}
                </span>
              </div>

              {prop.isAltProp && (
                <Badge variant="secondary" className="w-fit">
                  Alt Prop
                </Badge>
              )}
            </div>
          </Card>
          
          {/* Subscription overlay for free users - outside the blurred card */}
          <SubscriptionOverlay
            isVisible={!isSubscribed}
            icon={<TrendingUp className="w-6 h-6 text-primary" />}
            title="Premium Content"
            description="Subscribe to view props"
            buttonText="Upgrade to Pro"
            onUpgrade={handleUpgrade}
          />
          </div>
          </React.Fragment>
        ))}
      </div>

      {(filteredProps || []).length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No props found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search query</p>
        </div>
      )}

      {/* Player Analysis Overlay */}
      {selectedPlayerForAnalysis && (
        <PlayerAnalysisOverlay
          isOpen={showAnalysisOverlay}
          onClose={() => {
            setShowAnalysisOverlay(false);
            setSelectedPlayerForAnalysis(null);
          }}
          player={selectedPlayerForAnalysis}
        />
      )}
    </div>
  );
};