import React, { useState } from 'react';
import { Navigation } from '@/components/layout/navigation';
import { StatsOverview } from '@/components/analytics/stats-overview';
import { PredictionCard } from '@/components/analytics/prediction-card';
import { PreviousDayWins } from '@/components/analytics/previous-day-wins';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Zap, BarChart3 } from 'lucide-react';
import heroImage from '@/assets/hero-analytics.jpg';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Mock data - replace with real API calls
  const mockPredictions = [
    {
      sport: 'nba',
      player: 'LeBron James',
      team: 'LAL',
      opponent: 'GSW',
      prop: 'Points',
      line: 26.5,
      prediction: 'over' as const,
      confidence: 87,
      odds: '+110',
      factors: [
        { name: 'vs GSW Pace', value: '102.3', rank: 3, isPositive: true },
        { name: 'GSW Def Rating', value: '112.4', rank: 18, isPositive: true },
        { name: 'H2H vs GSW', value: '29.2 PPG', isPositive: true },
        { name: 'vs Draymond', value: '31.8 PPG', isPositive: true },
        { name: 'Last 5 vs GSW', value: '4-1 Over', isPositive: true },
        { name: 'Home Court', value: '+2.4 PPG', isPositive: true },
      ]
    },
    {
      sport: 'nfl',
      player: 'Josh Allen',
      team: 'BUF',
      opponent: 'MIA',
      prop: 'Passing Yards',
      line: 267.5,
      prediction: 'over' as const,
      confidence: 73,
      odds: '-115',
      factors: [
        { name: 'vs MIA Pass D', value: '245.8 YPG', rank: 24, isPositive: true },
        { name: 'H2H vs MIA', value: '289.4 YPG', isPositive: true },
        { name: 'vs X. Howard', value: '312.1 YPG', isPositive: true },
        { name: 'Weather', value: 'Dome', isPositive: true },
        { name: 'Last 3 vs MIA', value: '2-1 Over', isPositive: true },
        { name: 'Division Game', value: '+18.2 YPG', isPositive: true },
      ]
    },
    {
      sport: 'basketball',
      player: 'Caitlin Clark',
      team: 'IND',
      opponent: 'LAS',
      prop: 'Assists',
      line: 8.5,
      prediction: 'over' as const,
      confidence: 81,
      odds: '+105',
      factors: [
        { name: 'vs LAS Pace', value: '94.2', rank: 8, isPositive: true },
        { name: 'H2H vs LAS', value: '9.7 APG', isPositive: true },
        { name: 'vs A. Wilson', value: '10.2 APG', isPositive: true },
        { name: 'Season vs LAS', value: '2-0 Over', isPositive: true },
        { name: 'Home Court', value: '+1.2 APG', isPositive: true },
        { name: 'Rest Days', value: '2 days', isPositive: true },
      ]
    }
  ];

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

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-card border border-border/50">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Sports Analytics" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-background/40" />
        </div>
        <div className="relative p-8 lg:p-12">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="default" className="bg-gradient-primary">
                <Zap className="w-3 h-3 mr-1" />
                LIVE ANALYTICS
              </Badge>
              <Badge variant="secondary">
                <BarChart3 className="w-3 h-3 mr-1" />
                BACKTESTED
              </Badge>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-4 animate-fade-in">
              Advanced Sports
              <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Betting Analytics
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-6 animate-slide-up">
              AI-powered predictions with 73.4% accuracy across 50,000+ backtested games.
              Live odds, advanced metrics, and professional-grade analytics.
            </p>
            <div className="flex items-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Button size="lg" className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Today's Picks
              </Button>
              <Button variant="outline" size="lg">
                Backtest Results
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <StatsOverview
        totalPredictions={52847}
        winRate={73.4}
        dailyWins={9}
        weeklyWins={61}
        averageOdds="-108"
        totalProfit={4293}
        todaysPredictions={12}
      />

      {/* Previous Day Wins */}
      <PreviousDayWins
        wins={mockWins}
        totalProfit={271.00}
        winRate={75}
      />

      {/* Today's Top Predictions */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Today's Top Predictions</h2>
          <Badge variant="default" className="bg-gradient-accent">
            <TrendingUp className="w-3 h-3 mr-1" />
            12 ACTIVE
          </Badge>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {mockPredictions.map((prediction, index) => (
            <PredictionCard
              key={index}
              {...prediction}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab !== 'dashboard' && (
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
