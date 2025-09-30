import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthPage } from '@/components/auth/auth-page';
import { PlayerPropsTab } from '@/components/player-props/player-props-tab';
import { StrikeoutCenter } from '@/components/strikeout-center/strikeout-center';
import { InsightsTab } from '@/components/insights/insights-tab';
import { MatrixBackground } from '@/components/effects/matrix-background';
import { Navigation } from '@/components/layout/navigation';
import { StatsOverview } from '@/components/analytics/stats-overview';
import { PredictionCard } from '@/components/analytics/prediction-card';
import { PreviousDayWins } from '@/components/analytics/previous-day-wins';
import { TodaysPicksCarousel } from '@/components/analytics/todays-picks-carousel';
import { SyncTest } from '@/components/sync/sync-test';
import { FeatureTooltip } from '@/components/onboarding/feature-tooltip';
import { CommentsSection } from '@/components/ui/comments-section';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Zap, BarChart3, Settings, RefreshCw } from 'lucide-react';
import heroImage from '@/assets/hero-analytics.jpg';
import { supabase } from '@/integrations/supabase/client';
import { useSportsData } from '@/hooks/use-sports-data';
import type { User } from '@supabase/supabase-js';
import { useOddsAPI } from '@/hooks/use-odds-api';
import { useToast } from '@/hooks/use-toast';
import { predictionTracker } from '@/services/prediction-tracker';
import { SeasonalVideoBackground } from '@/components/ui/seasonal-video-background';
import { BetTrackingTab } from '@/components/bet-tracking/bet-tracking-tab';
import { SocialTab } from '@/components/social/social-tab';
import { MostLikely } from '@/components/mlb/most-likely';
import { HeaderBannerAd, InFeedAd, FooterBannerAd, MobileBannerAd } from '@/components/ads/ad-placements';

const Index = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [userSubscription, setUserSubscription] = useState('free');
  const [userRole, setUserRole] = useState('user'); // user, mod, admin, owner
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('nfl');
  const [realPredictions, setRealPredictions] = useState<any[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [showFeatureTooltip, setShowFeatureTooltip] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showTodaysPicks, setShowTodaysPicks] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [userAlerts, setUserAlerts] = useState<any[]>([]);
  const [newAlert, setNewAlert] = useState({
    prop: '',
    odds: '',
    condition: 'above' // 'above' or 'below'
  });
  const predictionsPerPage = 16;

  // Use real sports data instead of mock data
  const {
    games,
    players,
    playerProps,
    predictions,
    loading: sportsLoading,
    error: sportsError,
    refetch: refetchSportsData,
  } = useSportsData(selectedSport, {
    autoFetch: true,
    refreshInterval: 30000, // Refresh every 30 seconds
  });
  
  const { fetchInSeasonSports, fetchOdds, isSeasonActive } = useOddsAPI();
  const { toast } = useToast();

  // Check if user is first time visitor
  useEffect(() => {
    const hasSeenTooltip = localStorage.getItem('hasSeenFeatureTooltip');
    if (!hasSeenTooltip && user) {
      setShowFeatureTooltip(true);
    }
  }, [user]);

  const handleDismissTooltip = () => {
    localStorage.setItem('hasSeenFeatureTooltip', 'true');
    setShowFeatureTooltip(false);
  };

  const handleViewTodaysPicks = () => {
    console.log('View Today\'s Picks clicked!');
    setShowTodaysPicks(true);
    
    // Smooth scroll to the Today's Picks section
    setTimeout(() => {
      const todaysPicksElement = document.getElementById('todays-picks-section');
      if (todaysPicksElement) {
        todaysPicksElement.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
  };

  const handleCustomizeAlerts = () => {
    // Request notification permission if not already granted
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        } else {
          console.log('Notification permission denied');
        }
      });
    }
    setShowAlertModal(true);
  };

  const handleAddAlert = () => {
    if (newAlert.prop && newAlert.odds) {
      const alert = {
        id: Date.now().toString(),
        prop: newAlert.prop,
        odds: parseFloat(newAlert.odds),
        condition: newAlert.condition,
        sport: selectedSport,
        createdAt: new Date().toISOString()
      };
      setUserAlerts([...userAlerts, alert]);
      setNewAlert({ prop: '', odds: '', condition: 'above' });
    }
  };

  const handleRemoveAlert = (alertId: string) => {
    setUserAlerts(userAlerts.filter(alert => alert.id !== alertId));
  };

  const getTodaysTopPicks = () => {
    console.log('Getting today\'s top picks for sport:', selectedSport);
    console.log('All predictions:', allPredictions.length);
    console.log('Sample prediction:', allPredictions[0]);
    
    // Filter predictions by selected sport and get top 10 by confidence
    let filteredPredictions = allPredictions
      .filter(prediction => {
        // More flexible sport matching
        const predictionSport = prediction.sport?.toLowerCase();
        const selectedSportLower = selectedSport.toLowerCase();
        return predictionSport === selectedSportLower || 
               predictionSport?.includes(selectedSportLower) ||
               selectedSportLower.includes(predictionSport || '');
      })
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, 10);
    
    // If no sport-specific predictions found, show top predictions from all sports
    if (filteredPredictions.length === 0 && allPredictions.length > 0) {
      console.log('No sport-specific predictions found, showing top predictions from all sports');
      filteredPredictions = allPredictions
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
        .slice(0, 10);
    }
    
    console.log('Filtered predictions:', filteredPredictions.length);
    return filteredPredictions;
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'admin') {
      navigate('/admin');
    } else if (tab === 'settings') {
      navigate('/settings');
    } else if (tab === 'plans') {
      navigate('/subscription');
    } else if (tab === 'support') {
      navigate('/support');
    } else {
      setActiveTab(tab);
    }
  };

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport);
    // Close today's picks when sport changes
    setShowTodaysPicks(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserSubscription('free');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
              // Set user role
              const role = determineUserRole(session.user);
              setUserRole(role);
              
          // Fetch subscription in setTimeout to avoid blocking
          setTimeout(() => {
            fetchUserSubscription(session.user.id);
          }, 0);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Set user role
        const role = determineUserRole(session.user);
        setUserRole(role);
        
        setTimeout(() => {
          fetchUserSubscription(session.user.id);
        }, 0);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load real predictions when user is authenticated
  useEffect(() => {
    if (user && activeTab === 'dashboard') {
      loadRealPredictions();
      simulatePreviousDayResults(); // Add demo data for previous day wins
    }
  }, [user, activeTab]);

  const simulatePreviousDayResults = () => {
    // Clear all existing data to reset wins to 0
    predictionTracker.clearAllData();
    
    // Create some demo predictions for yesterday (but with 0 wins to reset)
    const demoPredictions = [
      {
        id: 'demo-1',
        sport: 'nfl',
        player: 'Josh Allen',
        team: 'BUF',
        opponent: 'MIA',
        prop: 'Passing Yards',
        line: 280.5,
        prediction: 'over' as const,
        odds: '-110',
        gameDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        status: 'pending' as const,
      },
      {
        id: 'demo-2',
        sport: 'nfl',
        player: 'Christian McCaffrey',
        team: 'SF',
        opponent: 'SEA',
        prop: 'Rushing Yards',
        line: 89.5,
        prediction: 'over' as const,
        odds: '-115',
        gameDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending' as const,
      },
    ];

    // Add predictions to tracker but don't simulate wins (keep at 0)
    demoPredictions.forEach(pred => {
      predictionTracker.addPrediction(pred);
    });

    // Don't simulate results - keep wins at 0 for reset
  };

  const loadRealPredictions = async () => {
    setIsLoadingPredictions(true);
    try {
      const sports = await fetchInSeasonSports();
      const allPredictions: any[] = [];
      
      // Fetch odds for each active sport - get ALL games in current week
      for (const sport of sports.slice(0, 8)) { // Get up to 8 sports for more variety
        const sportKey = sport.key;
        const odds = await fetchOdds(sportKey);
        
        // Transform ALL odds to predictions for the current week
        odds.forEach((game: any) => {
          const prediction = transformGameToPrediction(game, sportKey);
          if (prediction) {
            allPredictions.push(prediction);
          }
        });
      }
      
      // If we don't have enough predictions, generate more mock ones
      if (allPredictions.length < 20) {
        const additionalPredictions = [];
        const sports = ['nfl', 'nba', 'mlb', 'nhl'];
        const teams = ['LAL', 'GSW', 'BOS', 'MIA', 'BUF', 'KC', 'SF', 'DAL'];
        
        for (let i = 0; i < 20 - allPredictions.length; i++) {
          const sport = sports[Math.floor(Math.random() * sports.length)];
          const homeTeam = teams[Math.floor(Math.random() * teams.length)];
          const awayTeam = teams[Math.floor(Math.random() * teams.length)];
          
          if (homeTeam !== awayTeam) {
            const prediction = transformGameToPrediction({
              id: `mock-${i}`,
              home_team: homeTeam,
              away_team: awayTeam,
              commence_time: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
            }, sport);
            
            if (prediction) {
              additionalPredictions.push(prediction);
            }
          }
        }
        
        allPredictions.push(...additionalPredictions);
      }
      
      // Sort predictions by game date to show this week's games first
      allPredictions.sort((a, b) => {
        const dateA = new Date(a.gameDate || Date.now());
        const dateB = new Date(b.gameDate || Date.now());
        return dateA.getTime() - dateB.getTime();
      });
      
      setRealPredictions(allPredictions);
    } catch (error) {
      console.error('Error loading predictions:', error);
      toast({
        title: "Error",
        description: "Failed to load predictions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPredictions(false);
    }
  };

  const transformGameToPrediction = (game: any, sportKey: string) => {
    const homeTeam = game.home_team || 'Home Team';
    const awayTeam = game.away_team || 'Away Team';
    const gameDate = game.commence_time || new Date().toISOString();
    
    // Generate more realistic predictions based on sport
    const props = {
      nfl: ['Passing Yards', 'Rushing Yards', 'Receiving Yards', 'Touchdowns', 'Game Total'],
      nba: ['Points', 'Rebounds', 'Assists', '3-Pointers Made', 'Game Total'],
      mlb: ['Hits', 'Runs', 'Strikeouts', 'Home Runs', 'Game Total'],
      nhl: ['Goals', 'Assists', 'Shots on Goal', 'Saves', 'Game Total'],
    };
    
    const sportProps = props[sportKey as keyof typeof props] || ['Game Total'];
    const selectedProp = sportProps[Math.floor(Math.random() * sportProps.length)];
    
    // Generate simple line values (0.0, 1.0, 2.0, etc.)
    const lineValues = [0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0];
    const randomLine = lineValues[Math.floor(Math.random() * lineValues.length)];
    
    return {
      id: `${game.id}-${Date.now()}-${Math.random()}`,
      sport: sportKey,
      player: `${homeTeam} vs ${awayTeam}`,
      team: homeTeam,
      opponent: awayTeam,
      prop: selectedProp,
      line: randomLine,
      prediction: Math.random() > 0.5 ? 'over' : 'under',
      confidence: Math.floor(Math.random() * 30) + 70,
      odds: Math.random() > 0.5 ? '-110' : '+105',
      factors: [
        { name: 'Recent Form', value: 'Good', isPositive: true },
        { name: 'Head to Head', value: '2-1', isPositive: true },
        { name: 'Weather', value: 'Perfect', isPositive: true },
      ],
      status: 'pending',
      gameDate: gameDate,
    };
  };

  const fetchUserSubscription = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching subscription:', error);
        return;
      }

      setUserSubscription(data?.subscription || 'free');
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const determineUserRole = (user: User | null) => {
    if (!user) return 'user';
    
    // Check if user is the plug account (owner)
    if (user.email === 'plug@plugbts.com' || user.email === 'plugbts@gmail.com') {
      return 'owner';
    }
    
    // Check for admin role in user metadata
    if (user.user_metadata?.role === 'admin') {
      return 'admin';
    }
    
    // Check for mod role in user metadata
    if (user.user_metadata?.role === 'mod') {
      return 'mod';
    }
    
    return 'user';
  };

  const handleAuthSuccess = (userData: User, subscription: string) => {
    setUser(userData);
    setUserSubscription(subscription);
  };

  // Use real predictions data from sports API - prioritize realPredictions over hook data
  const allPredictions = realPredictions.length > 0 ? realPredictions : (predictions || []);
  
  // Pagination logic
  const totalPages = Math.ceil(allPredictions.length / predictionsPerPage);
  const startIndex = (currentPage - 1) * predictionsPerPage;
  const endIndex = startIndex + predictionsPerPage;
  const currentPredictions = allPredictions.slice(startIndex, endIndex);
  
  // Reset to page 1 when predictions change
  useEffect(() => {
    setCurrentPage(1);
  }, [allPredictions.length]);


  // Load alerts from localStorage on component mount
  useEffect(() => {
    const savedAlerts = localStorage.getItem('statpedia_user_alerts');
    if (savedAlerts) {
      try {
        setUserAlerts(JSON.parse(savedAlerts));
      } catch (error) {
        console.error('Failed to load alerts from localStorage:', error);
      }
    }
  }, []);

  // Save alerts to localStorage whenever userAlerts changes
  useEffect(() => {
    localStorage.setItem('statpedia_user_alerts', JSON.stringify(userAlerts));
  }, [userAlerts]);

  // Check for alert conditions when predictions change
  useEffect(() => {
    if (userAlerts.length === 0 || allPredictions.length === 0) return;

    allPredictions.forEach(prediction => {
      userAlerts.forEach(alert => {
        // Check if this prediction matches the alert criteria
        if (prediction.prop === alert.prop && prediction.sport === alert.sport) {
          const predictionLine = prediction.line;
          const alertThreshold = alert.odds;
          let shouldNotify = false;

          if (alert.condition === 'above' && predictionLine > alertThreshold) {
            shouldNotify = true;
          } else if (alert.condition === 'below' && predictionLine < alertThreshold) {
            shouldNotify = true;
          }

          if (shouldNotify) {
            // Check if we've already notified for this prediction
            const notificationKey = `alert_${alert.id}_${prediction.id}`;
            if (!localStorage.getItem(notificationKey)) {
              // Show browser notification
              if (Notification.permission === 'granted') {
                new Notification(`Alert: ${alert.prop} ${alert.condition} ${alert.odds}`, {
                  body: `${prediction.player} - ${prediction.team} vs ${prediction.opponent}`,
                  icon: '/favicon.ico'
                });
              }
              // Mark as notified
              localStorage.setItem(notificationKey, 'true');
            }
          }
        }
      });
    });
  }, [allPredictions, userAlerts]);

  // Note: Sport change handling is done in handleSportChange function

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  const mockWins = [
    {
      id: '1',
      sport: 'nba',
      player: 'Stephen Curry',
      team: 'GSW',
      opponent: 'LAL',
      prop: '3-Pointers Made',
      line: 4.5,
      prediction: 'over' as const,
      odds: '-110',
      result: '6 made',
      profit: 91.00
    },
    {
      id: '2',
      sport: 'nfl',
      player: 'Travis Kelce',
      team: 'KC',
      opponent: 'BUF',
      prop: 'Receiving Yards',
      line: 67.5,
      prediction: 'over' as const,
      odds: '+100',
      result: '89 yards',
      profit: 100.00
    },
    {
      id: '3',
      sport: 'hockey',
      player: 'Connor McDavid',
      team: 'EDM',
      opponent: 'CGY',
      prop: 'Points',
      line: 1.5,
      prediction: 'over' as const,
      odds: '-125',
      result: '2 points',
      profit: 80.00
    }
  ];

  const renderAltProps = () => (
    <div className="space-y-8">
      {/* Alt Props Header */}
      <div className="bg-gradient-card border border-border/50 rounded-xl p-8">
        <div className="text-center">
          <Badge variant="default" className="bg-gradient-success mb-4">
            <TrendingUp className="w-3 h-3 mr-1" />
            HIGH CONFIDENCE
          </Badge>
          <h2 className="text-3xl font-bold text-foreground mb-2">Alternative Props</h2>
          <p className="text-muted-foreground">
            Discover unique betting opportunities with our AI-powered alternative props
          </p>
        </div>
      </div>

      {/* High Confidence Picks */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">High Confidence Picks</h2>
          <Badge variant="default" className="bg-gradient-success">
            <TrendingUp className="w-3 h-3 mr-1" />
            {realPredictions.filter(p => p.confidence >= 80).length} AVAILABLE
          </Badge>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {realPredictions
                .filter(p => p.confidence >= 80)
                .slice(0, 6)
                .map((prediction, index) => (
            <PredictionCard
                    key={prediction.id || index}
              {...prediction}
                    isSubscribed={userRole === 'owner' || userSubscription !== 'free'}
            />
          ))}
        </div>
        {realPredictions.filter(p => p.confidence >= 80).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No high confidence predictions available at this time.</p>
            <Button 
              onClick={loadRealPredictions} 
              className="mt-4"
              disabled={isLoadingPredictions}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingPredictions ? 'animate-spin' : ''}`} />
              Refresh Predictions
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <SeasonalVideoBackground className="animate-fade-in">
        <div className="relative p-8 lg:p-12">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4 animate-slide-up">
              <Badge variant="default" className="bg-gradient-primary hover-scale">
                <Zap className="w-3 h-3 mr-1" />
                LIVE ANALYTICS
              </Badge>
              <Badge variant="secondary" className="hover-scale">
                <BarChart3 className="w-3 h-3 mr-1" />
                BACKTESTED
              </Badge>
            </div>
            <h1 className="text-4xl lg:text-6xl font-display font-bold text-foreground mb-4 animate-fade-in">
              Welcome to Statpedia
              <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent animate-scale-in display-name-gradient" style={{ animationDelay: '100ms' }}>
                {user.user_metadata?.display_name || user.email?.split('@')[0]}
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-6 animate-slide-up font-body" style={{ animationDelay: '150ms' }}>
              AI-powered predictions with 73.4% accuracy across 50,000+ backtested games.
              Experience the future of sports analytics.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Button 
                size="lg" 
                className="bg-gradient-primary hover:shadow-glow" 
                onClick={handleViewTodaysPicks}
              >
                <TrendingUp className="w-5 h-5 mr-2" />
                View Today's Picks
              </Button>
              <Button size="lg" variant="outline" className="hover-scale" onClick={handleCustomizeAlerts}>
                <Settings className="w-5 h-5 mr-2" />
                Customize Alerts
              </Button>
            </div>
          </div>
        </div>
      </SeasonalVideoBackground>

      {/* Stats Overview */}
      <StatsOverview
        totalPredictions={realPredictions.length * 100} // Simulated historical count
        winRate={0} // Reset to 0
        dailyWins={0} // Reset to 0
        weeklyWins={0} // Reset to 0
        averageOdds="-108"
        totalProfit={0} // Reset to 0
        todaysPredictions={realPredictions.length}
      />


      {/* Today's Top Picks Carousel */}
      {showTodaysPicks && (
        <div id="todays-picks-section" className="animate-fade-in">
          <TodaysPicksCarousel
            predictions={getTodaysTopPicks()}
            isSubscribed={userRole === 'owner' || userSubscription !== 'free'}
            onClose={() => setShowTodaysPicks(false)}
            sport={getTodaysTopPicks().length > 0 && allPredictions.filter(p => p.sport === selectedSport).length === 0 ? 'ALL SPORTS' : selectedSport}
          />
        </div>
      )}

      {/* Alert Customization Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border/50 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Customize Alerts</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Set up notifications for specific props and odds thresholds
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className={`w-2 h-2 rounded-full ${Notification.permission === 'granted' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-xs text-muted-foreground">
                    {Notification.permission === 'granted' ? 'Notifications enabled' : 'Notifications pending permission'}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAlertModal(false)}
              >
                ✕
              </Button>
            </div>

            {/* Add New Alert Form */}
            <div className="bg-muted/30 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Add New Alert</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Prop Type</label>
                  <select
                    value={newAlert.prop}
                    onChange={(e) => setNewAlert({ ...newAlert, prop: e.target.value })}
                    className="w-full p-2 border border-border/50 rounded-md bg-background text-foreground"
                  >
                    <option value="">Select Prop</option>
                    <option value="Points">Points</option>
                    <option value="Rebounds">Rebounds</option>
                    <option value="Assists">Assists</option>
                    <option value="Steals">Steals</option>
                    <option value="Blocks">Blocks</option>
                    <option value="3-Pointers">3-Pointers</option>
                    <option value="Turnovers">Turnovers</option>
                    <option value="Passing Yards">Passing Yards</option>
                    <option value="Rushing Yards">Rushing Yards</option>
                    <option value="Receiving Yards">Receiving Yards</option>
                    <option value="Touchdowns">Touchdowns</option>
                    <option value="Goals">Goals</option>
                    <option value="Saves">Saves</option>
                    <option value="Hits">Hits</option>
                    <option value="Strikeouts">Strikeouts</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Condition</label>
                  <select
                    value={newAlert.condition}
                    onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value })}
                    className="w-full p-2 border border-border/50 rounded-md bg-background text-foreground"
                  >
                    <option value="above">Above</option>
                    <option value="below">Below</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Odds Threshold</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newAlert.odds}
                    onChange={(e) => setNewAlert({ ...newAlert, odds: e.target.value })}
                    placeholder="e.g., 2.5"
                    className="w-full p-2 border border-border/50 rounded-md bg-background text-foreground"
                  />
                </div>
              </div>
              <Button 
                onClick={handleAddAlert}
                className="mt-4 bg-gradient-primary"
                disabled={!newAlert.prop || !newAlert.odds}
              >
                <Settings className="w-4 h-4 mr-2" />
                Add Alert
              </Button>
            </div>

            {/* Current Alerts */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Your Alerts ({userAlerts.length})</h3>
              {userAlerts.length > 0 ? (
                <div className="space-y-3">
                  {userAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <div>
                          <p className="font-medium text-foreground">{alert.prop}</p>
                          <p className="text-sm text-muted-foreground">
                            {alert.condition === 'above' ? 'Above' : 'Below'} {alert.odds} - {alert.sport.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveAlert(alert.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No alerts set up yet</p>
                  <p className="text-sm">Add your first alert above to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Today's Top Predictions */}
      <div className="space-y-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">This Week's Predictions</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Showing {startIndex + 1}-{Math.min(endIndex, allPredictions.length)} of {allPredictions.length} predictions
            </p>
          </div>
          <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-gradient-accent">
            <TrendingUp className="w-3 h-3 mr-1" />
              {allPredictions.length} TOTAL
          </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={loadRealPredictions}
              disabled={isLoadingPredictions}
            >
              {isLoadingPredictions ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </div>
        {isLoadingPredictions ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="text-muted-foreground">Loading live predictions...</span>
            </div>
          </div>
        ) : currentPredictions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No predictions available for {selectedSport.toUpperCase()}</p>
            <Button onClick={loadRealPredictions} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        ) : (
          <>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {currentPredictions.map((prediction, index) => (
            <PredictionCard
                  key={prediction.id || index}
              {...prediction}
                  isSubscribed={userRole === 'owner' || userSubscription !== 'free'}
            />
          ))}
        </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={currentPage === pageNum ? "bg-primary text-primary-foreground" : ""}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="text-muted-foreground">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

          {/* Previous Day Wins */}
          <PreviousDayWins />

          {/* Comments Section */}
          <CommentsSection className="mt-8" />

          {/* Feature Tooltip */}
          {showFeatureTooltip && (
            <FeatureTooltip onDismiss={handleDismissTooltip} />
          )}
    </div>
  );

  const renderSyncTest = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Sync Integration Test
        </h1>
        <p className="text-muted-foreground">
          Test the real-time synchronization between Loveable and Supabase
        </p>
      </div>
      <SyncTest />
    </div>
  );

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show auth page for non-authenticated users
  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Show dashboard for authenticated users
  return (
    <div className="min-h-screen bg-background relative">
      <MatrixBackground />
      <Navigation 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        onSportChange={handleSportChange}
        selectedSport={selectedSport}
        userEmail={user.email}
        displayName={user.user_metadata?.display_name}
        userRole={userRole}
        userSubscription={userSubscription}
        onLogout={handleLogout}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Header Banner Ad */}
        <HeaderBannerAd userSubscription={userSubscription} />
        
        {/* Mobile Banner Ad */}
        <MobileBannerAd userSubscription={userSubscription} />
        
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'player-props' && <PlayerPropsTab userSubscription={userSubscription} userRole={userRole} />}
        {activeTab === 'insights' && <InsightsTab selectedSport={selectedSport} userRole={userRole} userSubscription={userSubscription} />}
        {activeTab === 'bet-tracking' && <BetTrackingTab userRole={userRole} />}
        {activeTab === 'social' && <SocialTab userRole={userRole} userSubscription={userSubscription} onReturnToDashboard={() => {
          console.log('Navigating to dashboard from social tab');
          setActiveTab('dashboard');
        }} />}
        {activeTab === 'strikeout-center' && <StrikeoutCenter />}
        {activeTab === 'most-likely' && <MostLikely />}
        {activeTab === 'sync-test' && renderSyncTest()}
        {activeTab !== 'dashboard' && activeTab !== 'player-props' && activeTab !== 'insights' && activeTab !== 'bet-tracking' && activeTab !== 'social' && activeTab !== 'strikeout-center' && activeTab !== 'most-likely' && activeTab !== 'underdog-analysis' && activeTab !== 'sync-test' && (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Coming Soon
            </h2>
            <p className="text-muted-foreground">
              Advanced {activeTab} features are being developed. Stay tuned!
            </p>
          </div>
        )}
        
        {/* Footer Banner Ad */}
        <FooterBannerAd userSubscription={userSubscription} />
      </main>
    </div>
  );
};

export default Index;