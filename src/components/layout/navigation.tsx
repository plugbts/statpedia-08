import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SportIcon } from '@/components/ui/sport-icon';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { BarChart3, Target, TrendingUp, Calendar, Settings, Wifi, LogOut, MoreVertical, Zap, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VerifiedCheckmark } from '@/components/ui/verified-checkmark';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSportChange?: (sport: string) => void;
  selectedSport?: string;
  userEmail?: string;
  displayName?: string;
  userRole?: string;
  onLogout?: () => void;
}

export const Navigation = ({ activeTab, onTabChange, onSportChange, selectedSport = 'nfl', userEmail, displayName, userRole = 'user', onLogout }: NavigationProps) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'predictions', label: 'Predictions', icon: <Target className="w-4 h-4" />, badge: '12' },
    { id: 'player-props', label: 'Player Props', icon: <TrendingUp className="w-4 h-4" />, badge: 'NEW' },
    { id: 'insights', label: 'Insights', icon: <Brain className="w-4 h-4" />, badge: 'HOT' },
  ];

  // Role-based access control for extra items
  const getExtraItems = () => {
    const items = [
      { id: 'strikeout-center', label: 'Strikeout Center', icon: <Zap className="w-4 h-4" />, badge: 'MLB' },
      { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> },
      { id: 'backtest', label: 'Backtest', icon: <Calendar className="w-4 h-4" /> },
    ];
    
    // Admin panel only visible to mod, admin, and owner
    if (['mod', 'admin', 'owner'].includes(userRole)) {
      items.push({ id: 'admin', label: 'Admin Panel', icon: <Settings className="w-4 h-4" /> });
    }
    
    // Sync test only visible to owner
    if (userRole === 'owner') {
      items.push({ id: 'sync-test', label: 'Sync Test', icon: <Wifi className="w-4 h-4" />, badge: 'DEV' });
    }
    
    return items;
  };
  
  const extraItems = getExtraItems();

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
        <div className="flex items-center justify-between h-14 gap-2">
          {/* Logo with Extras Dropdown */}
          <div className="flex items-center gap-1 animate-fade-in">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 hover-scale cursor-pointer group px-1">
                  <div className="w-6 h-6 bg-gradient-primary rounded-md flex items-center justify-center shadow-glow transition-all duration-300 group-hover:shadow-xl">
                    <BarChart3 className="w-3 h-3 text-white" />
                  </div>
                  <h1 className="text-lg font-display font-bold text-foreground hidden sm:block">Statpedia</h1>
                  <MoreVertical className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-card/95 backdrop-blur-md border-border/50 z-[100]">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Extra Features
                </div>
                <DropdownMenuSeparator />
                {extraItems.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className="gap-2 cursor-pointer"
                  >
                    {item.icon}
                    {item.label}
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Main Navigation - Responsive */}
          <div className="flex items-center gap-0.5 flex-1 justify-center max-w-2xl">
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
                    "gap-1 relative transition-all duration-300 font-heading hover-scale px-2 text-xs",
                    activeTab === item.id && "bg-gradient-primary shadow-glow"
                  )}
                >
                  {item.icon}
                  <span className="hidden md:inline">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-1 text-xs animate-scale-in">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              </div>
            ))}
          </div>

          {/* User Profile and Logout - Compact */}
          <div className="flex items-center gap-1 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 hover-scale cursor-pointer p-1 rounded-md hover:bg-muted/50 transition-colors">
                  <Avatar className="h-7 w-7 border border-primary/20">
                    <AvatarFallback className="bg-gradient-primary text-white text-xs">
                      {displayName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-medium text-foreground truncate max-w-20">
                        {displayName || userEmail?.split('@')[0]}
                      </p>
                      <VerifiedCheckmark role={userRole} size="sm" />
                    </div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-md border-border/50 z-[100]">
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                  <div className="flex items-center gap-2 w-full">
                    <Avatar className="h-8 w-8 border border-primary/20">
                      <AvatarFallback className="bg-gradient-primary text-white text-sm">
                        {displayName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{displayName || userEmail?.split('@')[0]}</p>
                        <VerifiedCheckmark role={userRole} size="sm" />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                    </div>
                    {userRole !== 'user' && (
                      <Badge 
                        variant={userRole === 'owner' ? 'default' : 'secondary'} 
                        className={cn(
                          'text-xs flex-shrink-0',
                          userRole === 'owner' && 'bg-gradient-primary',
                          userRole === 'admin' && 'bg-red-500/20 text-red-600',
                          userRole === 'mod' && 'bg-blue-500/20 text-blue-600'
                        )}
                      >
                        {userRole.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuItem>
                {onLogout && (
                  <DropdownMenuItem onClick={onLogout} className="gap-2 cursor-pointer text-destructive">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Sports Filter - Compact */}
        <div className="flex items-center justify-center gap-0.5 py-1.5 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
            {sports.map((sport) => (
              <Button
                key={sport.id}
                variant="ghost"
                size="sm"
                onClick={() => onSportChange?.(sport.sport)}
                className={cn(
                  "gap-1 transition-all duration-200 hover:bg-card-hover hover-scale px-2 text-xs whitespace-nowrap",
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