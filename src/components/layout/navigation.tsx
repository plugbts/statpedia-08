import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SportIcon } from '@/components/ui/sport-icon';
import { BarChart3, Target, TrendingUp, Calendar, Settings, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSportChange?: (sport: string) => void;
  selectedSport?: string;
}

export const Navigation = ({ activeTab, onTabChange, onSportChange, selectedSport = 'nba' }: NavigationProps) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'predictions', label: 'Predictions', icon: <Target className="w-4 h-4" />, badge: '12' },
    { id: 'player-props', label: 'Player Props', icon: <TrendingUp className="w-4 h-4" />, badge: 'NEW' },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'backtest', label: 'Backtest', icon: <Calendar className="w-4 h-4" /> },
    { id: 'sync-test', label: 'Sync Test', icon: <Wifi className="w-4 h-4" />, badge: 'DEV' },
  ];

  const sports = [
    { id: 'nba', label: 'NBA', sport: 'nba' },
    { id: 'nfl', label: 'NFL', sport: 'nfl' },
    { id: 'college-basketball', label: 'CBB', sport: 'college-basketball' },
    { id: 'college-football', label: 'CFB', sport: 'college-football' },
    { id: 'nhl', label: 'NHL', sport: 'nhl' },
    { id: 'wnba', label: 'WNBA', sport: 'wnba' },
    { id: 'mlb', label: 'MLB', sport: 'mlb' },
  ];

  return (
    <nav className="bg-card/30 backdrop-blur-md border-b border-border/50 sticky top-0 z-50 glass-morphism shadow-3d">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow animate-neon-pulse">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-display font-bold text-foreground animate-hologram">Statpedia</h1>
          </div>

          {/* Main Navigation */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                size="sm"
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "gap-2 relative transition-all duration-300 font-heading hover-3d",
                  activeTab === item.id && "bg-gradient-primary shadow-glow animate-neon-pulse"
                )}
              >
                {item.icon}
                {item.label}
                {item.badge && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Sports Filter */}
          <div className="flex items-center gap-1">
            {sports.map((sport) => (
              <Button
                key={sport.id}
                variant="ghost"
                size="sm"
                onClick={() => onSportChange?.(sport.sport)}
                className={cn(
                  "gap-2 transition-all duration-200 hover:bg-card-hover",
                  selectedSport === sport.sport && "bg-secondary"
                )}
              >
                <SportIcon sport={sport.sport as any} size="sm" />
                {sport.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};