import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SportIcon } from '@/components/ui/sport-icon';
import { BarChart3, Target, TrendingUp, Calendar, Settings, Wifi, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userEmail?: string;
  displayName?: string;
  onLogout?: () => void;
}

export const Navigation = ({ activeTab, onTabChange, userEmail, displayName, onLogout }: NavigationProps) => {
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
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow hover-scale">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-display font-bold text-foreground">Statpedia</h1>
          </div>

          {/* Main Navigation */}
          <div className="flex items-center gap-1">
            {navItems.map((item, index) => (
              <div
                key={item.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Button
                  variant={activeTab === item.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "gap-2 relative transition-all duration-300 font-heading hover-scale",
                    activeTab === item.id && "bg-gradient-primary shadow-glow"
                  )}
                >
                  {item.icon}
                  {item.label}
                  {item.badge && (
                    <Badge variant="secondary" className="ml-1 text-xs animate-scale-in">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              </div>
            ))}
          </div>

          {/* User Profile and Logout */}
          <div className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-2 hover-scale cursor-pointer">
              <Avatar className="h-8 w-8 border-2 border-primary/20">
                <AvatarFallback className="bg-gradient-primary text-white text-sm">
                  {displayName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-foreground">
                  {displayName || userEmail?.split('@')[0]}
                </p>
              </div>
            </div>
            {onLogout && (
              <Button
                onClick={onLogout}
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground hover-scale"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            )}
          </div>
        </div>

        {/* Sports Filter */}
        <div className="flex items-center justify-center gap-1 py-2 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-1">
            {sports.map((sport) => (
              <Button
                key={sport.id}
                variant="ghost"
                size="sm"
                onClick={() => onTabChange(sport.id)}
                className={cn(
                  "gap-2 transition-all duration-200 hover:bg-card-hover hover-scale",
                  activeTab === sport.id && "bg-secondary"
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