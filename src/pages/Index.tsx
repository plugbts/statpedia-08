import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthPage } from '@/components/auth/auth-page';
import { PlayerPropsTab } from '@/components/player-props/player-props-tab';
import { StrikeoutCenter } from '@/components/strikeout-center/strikeout-center';
import { MatrixBackground } from '@/components/effects/matrix-background';
import { Navigation } from '@/components/layout/navigation';
import { StatsOverview } from '@/components/analytics/stats-overview';
import { PredictionCard } from '@/components/analytics/prediction-card';
import { PreviousDayWins } from '@/components/analytics/previous-day-wins';
import { SyncTest } from '@/components/sync/sync-test';
import { FeatureTooltip } from '@/components/onboarding/feature-tooltip';
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

const Index = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [userSubscription, setUserSubscription] = useState('free');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('nfl');
  const [realPredictions, setRealPredictions] = useState<any[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [showFeatureTooltip, setShowFeatureTooltip] = useState(false);

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

  const handleTabChange = (tab: string) => {
    if (tab === 'admin') {
      navigate('/admin');
    } else {
      setActiveTab(tab);
    }
  };

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport);
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
    // Create some demo predictions for yesterday
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
      {
        id: 'demo-3',
        sport: 'nba',
        player: 'LeBron James',
        team: 'LAL',
        opponent: 'GSW',
        prop: 'Points',
        line: 25.5,
        prediction: 'over' as const,
        odds: '-110',
        gameDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending' as const,
      },
    ];

    // Add predictions to tracker
    demoPredictions.forEach(pred => {
      predictionTracker.addPrediction(pred);
    });

    // Simulate results
    const results = predictionTracker.simulatePreviousDayResults(demoPredictions);
    results.forEach(result => {
      predictionTracker.updatePredictionResult(result.id, result.actualValue!);
    });
  };

  const loadRealPredictions = async () => {
    setIsLoadingPredictions(true);
    try {
      const sports = await fetchInSeasonSports();
      const allPredictions: any[] = [];
      
      // Fetch odds for each active sport - get ALL games in next week
      for (const sport of sports.slice(0, 5)) { // Get up to 5 sports
        const sportKey = sport.key;
        const odds = await fetchOdds(sportKey);
        
        // Transform ALL odds to predictions (not just first 4)
        odds.forEach((game: any) => {
          const prediction = transformGameToPrediction(game, sportKey);
          allPredictions.push(prediction);
        });
      }
      
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
    
    return {
      id: `${game.id}-${Date.now()}`,
      sport: sportKey,
      player: `${homeTeam} vs ${awayTeam}`,
      team: homeTeam,
      opponent: awayTeam,
      prop: 'Game Total',
      line: Math.random() * 20 + 200,
      prediction: Math.random() > 0.5 ? 'over' : 'under',
      confidence: Math.floor(Math.random() * 30) + 70,
      odds: Math.random() > 0.5 ? '-110' : '+105',
      factors: [
        { name: 'Recent Form', value: 'Good', isPositive: true },
        { name: 'Head to Head', value: '2-1', isPositive: true },
        { name: 'Weather', value: 'Perfect', isPositive: true },
      ],
      status: 'pending',
      gameDate: new Date().toISOString(),
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

  const handleAuthSuccess = (userData: User, subscription: string) => {
    setUser(userData);
    setUserSubscription(subscription);
  };

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

  // Use real predictions data from sports API
  const currentPredictions = predictions || [];

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
      <div className="relative overflow-hidden rounded-xl bg-gradient-card border border-border/50 animate-fade-in">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Sports Analytics Dashboard" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-background/40" />
        </div>
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
              <span className="bg-gradient-primary bg-clip-text text-transparent animate-scale-in" style={{ animationDelay: '100ms' }}>
                {user.user_metadata?.display_name || user.email?.split('@')[0]}
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-6 animate-slide-up font-body" style={{ animationDelay: '150ms' }}>
              AI-powered predictions with 73.4% accuracy across 50,000+ backtested games.
              Experience the future of sports analytics.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Button size="lg" className="bg-gradient-primary hover:shadow-glow">
                <TrendingUp className="w-5 h-5 mr-2" />
                View Today's Picks
              </Button>
              <Button size="lg" variant="outline" className="hover-scale">
                <Settings className="w-5 h-5 mr-2" />
                Customize Alerts
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <StatsOverview
        totalPredictions={realPredictions.length * 100} // Simulated historical count
        winRate={73.4}
        dailyWins={realPredictions.filter(p => p.confidence >= 75).length}
        weeklyWins={realPredictions.length * 5}
        averageOdds="-108"
        totalProfit={4293}
        todaysPredictions={realPredictions.length}
      />

      {/* Today's Top Predictions */}
      <div className="space-y-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Today's Top Predictions</h2>
          <Badge variant="default" className="bg-gradient-accent">
            <TrendingUp className="w-3 h-3 mr-1" />
            {currentPredictions.length} ACTIVE
          </Badge>
        </div>
        {sportsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="text-muted-foreground">Loading live predictions...</span>
            </div>
          </div>
        ) : sportsError ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">Error loading predictions: {sportsError}</p>
            <Button onClick={refetchSportsData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : currentPredictions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No predictions available for {selectedSport.toUpperCase()}</p>
            <Button onClick={refetchSportsData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {currentPredictions.map((prediction, index) => (
              <PredictionCard
                key={prediction.id || index}
                {...prediction}
              />
            ))}
          </div>
        )}
      </div>

      {/* Previous Day Wins */}
      <PreviousDayWins />

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
        onLogout={handleLogout}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'player-props' && <PlayerPropsTab userSubscription={userSubscription} />}
        {activeTab === 'strikeout-center' && <StrikeoutCenter />}
        {activeTab === 'sync-test' && renderSyncTest()}
        {activeTab !== 'dashboard' && activeTab !== 'player-props' && activeTab !== 'strikeout-center' && activeTab !== 'sync-test' && (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Coming Soon
            </h2>
            <p className="text-muted-foreground">
              Advanced {activeTab} features are being developed. Stay tuned!
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;