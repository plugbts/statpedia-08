import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SportIcon } from "@/components/ui/sport-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// import { NotificationBell } from '@/components/notifications/notification-bell'; // Temporarily disabled
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  Target,
  TrendingUp,
  Calendar,
  Settings,
  Wifi,
  LogOut,
  MoreVertical,
  Zap,
  Brain,
  Play,
  Pause,
  CreditCard,
  MessageCircle,
  Wallet,
  Users,
  X,
  Crown,
  Star,
  Lock,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VerifiedCheckmark } from "@/components/ui/verified-checkmark";
import { useBackgroundMusic } from "@/hooks/use-background-music";
import DiagnosticsNavButton from "./diagnostics-nav-button";
import { MusicTipBubble } from "@/components/ui/music-tip-bubble";
import { useAuth } from "@/contexts/AuthContext";
import { useAccess } from "@/hooks/use-access";
import { analyticsClient } from "@/lib/analytics-client";
import { getUserDisplayName as getUserDisplayNameUtil, getUserHandle } from "@/utils/user-display";
import { userIdentificationService } from "@/services/user-identification-service";
import { UserDisplay } from "@/components/ui/user-display";
import DevBanner from "@/components/dev/dev-banner";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSportChange?: (sport: string) => void;
  selectedSport?: string;
  onLogout?: () => void;
  predictionsCount?: number;
}

export const Navigation = ({
  activeTab,
  onTabChange,
  onSportChange,
  selectedSport = "nfl",
  onLogout,
  predictionsCount = 0,
}: NavigationProps) => {
  const { user: authUser, isAuthenticated, userSubscription: subscriptionTier } = useAuth();
  const access = useAccess();

  // Use role from AuthContext
  const userRole = authUser?.role || "user";

  // Helper functions for user display
  const getUserInitials = () => {
    const name = authUser?.display_name || authUser?.email || "User";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Use auth user for display
  const getUserDisplayName = () => {
    if (authUser && isAuthenticated) {
      const displayName = getUserDisplayNameUtil(authUser);
      // Remove any role prefixes like [OWNER], [ADMIN], etc.
      return displayName.replace(/^\[(OWNER|ADMIN|MOD|USER)\]\s*/, "");
    }
    return "User";
  };

  const getUserUsername = () => {
    if (authUser && isAuthenticated) {
      return getUserHandle(authUser);
    }
    return "@user";
  };
  const { isPlaying, needsUserInteraction, togglePlayPause } = useBackgroundMusic({
    enabled: true,
    volume: 0.08,
  });
  const [showMusicTip, setShowMusicTip] = useState(false);
  const [hasShownTip, setHasShownTip] = useState(false);
  const [showSubscriptionOverlay, setShowSubscriptionOverlay] = useState(false);
  const [lockedFeature, setLockedFeature] = useState<{ name: string; description: string } | null>(
    null,
  );

  // Premium features configuration
  const premiumFeatures = {
    "strikeout-center": {
      name: "Strikeout Center",
      description:
        "Advanced MLB strikeout analysis with AI-powered predictions and detailed pitcher performance metrics.",
    },
    "most-likely": {
      name: "Most Likely",
      description:
        "AI-driven probability analysis showing which players are most likely to hit or miss their targets.",
    },
    "parlay-gen": {
      name: "Parlay Gen",
      description:
        "AI-powered parlay generator with customizable leg counts and odds filtering for maximum profit potential.",
    },
  };

  // Check if user has access to premium features
  // Owner role bypasses ALL subscription restrictions
  const sub = subscriptionTier ?? "free";
  const hasProAccess = access.can("analytics").allowed; // aligns with pro-level features
  const hasPremiumAccess = access.can("parlay-gen").allowed;

  // Handle premium feature access
  const handlePremiumFeatureClick = (featureId: string) => {
    const decision = access.can(featureId as any);
    if (!decision.allowed) {
      analyticsClient.trackEvent("access_denied", {
        feature: featureId,
        reason: decision.reason,
        needed: decision.needed,
        role: userRole,
        subscription: sub,
      });
      setLockedFeature(premiumFeatures[featureId as keyof typeof premiumFeatures]);
      setShowSubscriptionOverlay(true);
      return;
    }
    onTabChange(featureId);
  };

  // Handle subscription overlay actions
  const handleSubscribe = () => {
    setShowSubscriptionOverlay(false);
    onTabChange("plans");
  };

  const handleCloseSubscriptionOverlay = () => {
    setShowSubscriptionOverlay(false);
    setLockedFeature(null);
    onTabChange("dashboard");
  };

  // Show music tip when music starts playing (only once per session)
  useEffect(() => {
    if (isPlaying && !hasShownTip) {
      setShowMusicTip(true);
      setHasShownTip(true);
    }
  }, [isPlaying, hasShownTip]);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" /> },
    {
      id: "predictions",
      label: "Predictions",
      icon: <Target className="w-4 h-4" />,
      badge: predictionsCount > 100 ? "100+" : predictionsCount.toString(),
    },
    {
      id: "player-props",
      label: "Player Props",
      icon: <TrendingUp className="w-4 h-4" />,
      badge: "NEW",
    },
    { id: "insights", label: "Insights", icon: <Brain className="w-4 h-4" />, badge: "HOT" },
    {
      id: "bet-tracking",
      label: "Bet Tracking",
      icon: <Wallet className="w-4 h-4" />,
      badge: "NEW",
    },
    // { id: 'social', label: 'Social', icon: <Users className="w-4 h-4" />, badge: 'NEW' }, // Temporarily disabled
    { id: "plans", label: "Plans", icon: <CreditCard className="w-4 h-4" /> },
  ];

  // Role-based access control for extra items
  const getExtraItems = () => {
    const items = [
      {
        id: "strikeout-center",
        label: "Strikeout Center",
        icon: <Zap className="w-4 h-4" />,
        badge: "MLB",
      },
      {
        id: "most-likely",
        label: "Most Likely",
        icon: <Target className="w-4 h-4" />,
        badge: "MLB",
      },
      {
        id: "parlay-gen",
        label: "Parlay Gen",
        icon: <TrendingUp className="w-4 h-4" />,
        badge: "PREMIUM",
      },
      { id: "analytics", label: "Analytics", icon: <TrendingUp className="w-4 h-4" /> },
      { id: "backtest", label: "Backtest", icon: <Calendar className="w-4 h-4" /> },
    ];

    // Admin panel only visible to mod, admin, and owner
    if (["mod", "admin", "owner"].includes(userRole)) {
      items.push({ id: "admin", label: "Admin Panel", icon: <Settings className="w-4 h-4" /> });
    }

    // Sync test only visible to owner
    if (userRole === "owner") {
      items.push({
        id: "sync-test",
        label: "Sync Test",
        icon: <Wifi className="w-4 h-4" />,
        badge: "DEV",
      });
    }

    return items;
  };

  const extraItems = getExtraItems();

  // Generate tooltip content based on user role
  const getLogoTooltipContent = () => {
    const baseFeatures = [
      "📊 Dashboard - View your analytics",
      "🎯 Predictions - See AI-powered picks",
      "📈 Player Props - Detailed analysis",
      "🧠 Insights - Advanced analytics",
    ];

    const extraFeatures = [];

    if (["mod", "admin", "owner"].includes(userRole)) {
      extraFeatures.push("⚙️ Admin Panel - Manage system");
    }

    if (userRole === "owner") {
      extraFeatures.push("🔧 Sync Test - Development tools");
    }

    const allFeatures = [...baseFeatures, ...extraFeatures];

    return (
      <div className="space-y-1">
        <div className="font-semibold text-sm">Click to access:</div>
        {allFeatures.map((feature, index) => (
          <div key={index} className="text-xs text-muted-foreground">
            {feature}
          </div>
        ))}
      </div>
    );
  };

  const sports = [
    { id: "nba", label: "NBA", sport: "nba" },
    { id: "nfl", label: "NFL", sport: "nfl" },
    { id: "college-basketball", label: "CBB", sport: "college-basketball" },
    { id: "college-football", label: "CFB", sport: "college-football" },
    { id: "nhl", label: "NHL", sport: "nhl" },
    { id: "wnba", label: "WNBA", sport: "wnba" },
    { id: "mlb", label: "MLB", sport: "mlb" },
  ];

  return (
    <nav className="bg-card/30 backdrop-blur-md border-b border-border/50 sticky top-0 z-50 glass-morphism shadow-3d">
      {/* Dev build banner */}
      <DevBanner />
      <div
        className={`${activeTab === "player-props" ? "w-full min-w-[1320px]" : "max-w-7xl mx-auto"} ${activeTab === "player-props" ? "px-0" : "px-4 sm:px-6 lg:px-8"}`}
      >
        <div
          className={`flex items-center justify-between h-14 gap-2 ${activeTab === "player-props" ? "px-4 sm:px-6 lg:px-8" : ""}`}
        >
          {/* Logo with Extras Dropdown */}
          <div className="flex items-center gap-1 animate-fade-in">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 hover-scale cursor-pointer group px-1">
                  <div className="w-6 h-6 bg-gradient-primary rounded-md flex items-center justify-center shadow-glow transition-all duration-300 group-hover:shadow-xl">
                    <BarChart3 className="w-3 h-3 text-white" />
                  </div>
                  <h1 className="text-lg font-display font-bold text-foreground hidden sm:block">
                    Statpedia
                  </h1>
                  <MoreVertical className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-56 bg-card/95 backdrop-blur-md border-border/50 z-[100]"
              >
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Extra Features
                </div>
                <DropdownMenuSeparator />
                {extraItems.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => handlePremiumFeatureClick(item.id)}
                    className="gap-2 cursor-pointer"
                  >
                    {item.icon}
                    {item.label}
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                    {/* Show lock icon for premium features if user doesn't have access */}
                    {((!hasProAccess &&
                      (item.id === "strikeout-center" || item.id === "most-likely")) ||
                      (item.id === "parlay-gen" && !hasPremiumAccess)) && (
                      <div className="ml-auto">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                      </div>
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
                    activeTab === item.id && "bg-gradient-primary shadow-glow",
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
          <div
            className="flex items-center gap-1 animate-fade-in"
            style={{ animationDelay: "300ms" }}
          >
            {/* Music Play/Pause Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlayPause}
              className="h-7 w-7 rounded-full p-0 hover:bg-primary/10 transition-colors"
              title={
                needsUserInteraction ? "Enable Music" : isPlaying ? "Pause Music" : "Play Music"
              }
            >
              {needsUserInteraction ? (
                <Play className="h-3.5 w-3.5 text-muted-foreground" />
              ) : isPlaying ? (
                <Pause className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Play className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>

            {/* Notification Bell - Temporarily disabled */}
            {/* <NotificationBell userId={userIdentity?.email || ''} /> */}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 hover-scale cursor-pointer p-1 rounded-md hover:bg-muted/50 transition-colors">
                  <Avatar className="h-7 w-7 border border-primary/20">
                    <AvatarFallback className="bg-gradient-primary text-white text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-medium text-foreground truncate max-w-20">
                        {getUserDisplayName()}
                      </p>
                      <VerifiedCheckmark role={userRole} size="sm" />
                    </div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-card/95 backdrop-blur-md border-border/50 z-[100]"
              >
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                  <div className="flex items-center gap-2 w-full">
                    <Avatar className="h-8 w-8 border border-primary/20">
                      <AvatarFallback className="bg-gradient-primary text-white text-sm">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{getUserDisplayName()}</p>
                        <VerifiedCheckmark role={userRole} size="sm" />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{getUserUsername()}</p>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onTabChange("settings")}
                  className="gap-2 cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onTabChange("support")}
                  className="gap-2 cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  Support
                </DropdownMenuItem>
                {onLogout && (
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="gap-2 cursor-pointer text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Diagnostics Button (dev/admin/owner only) */}
        {(["owner", "admin", "mod"].includes(userRole) ||
          process.env.NODE_ENV === "development") && <DiagnosticsNavButton />}
        {/* Sports Filter - Dropdown */}
        <div
          className="flex items-center justify-center gap-0.5 py-1.5 animate-slide-up"
          style={{ animationDelay: "150ms" }}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 transition-all duration-200 hover:bg-card-hover hover-scale px-3 text-xs whitespace-nowrap"
              >
                {sports.find((s) => s.sport === selectedSport)?.label || "Select Sport"}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              {sports.map((sport) => (
                <DropdownMenuItem
                  key={sport.id}
                  onClick={() => onSportChange?.(sport.sport)}
                  className={cn("cursor-pointer", selectedSport === sport.sport && "bg-secondary")}
                >
                  {sport.label}
                  {selectedSport === sport.sport && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Music Tip Bubble */}
      <MusicTipBubble
        isVisible={showMusicTip}
        onClose={() => setShowMusicTip(false)}
        duration={10000}
      />

      {/* 3D Security Gate Popup - Ultra Compact */}
      {showSubscriptionOverlay && lockedFeature && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 sm:pt-20 px-1 sm:px-2">
          {/* Dark gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-95"></div>

          {/* Popup container - Ultra compact */}
          <div className="relative z-[9999] w-full max-w-xs sm:max-w-sm transform perspective-1000">
            {/* 3D Effect Container */}
            <div className="relative transform rotate-y-1 shadow-xl">
              {/* Main Card with 3D effect - Ultra compact */}
              <Card className="w-full transform rotate-y-1 shadow-xl border border-primary/20 bg-gradient-to-br from-background via-muted/10 to-background">
                <CardHeader className="text-center pb-1 px-2 pt-2">
                  <div className="flex items-center justify-center mb-1">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 rounded-full blur-md"></div>
                      <div className="relative bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-1.5">
                        <Lock className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                  <CardTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                    Pro Locked
                  </CardTitle>
                  <p className="text-muted-foreground text-xs">Unlock with Statpedia Pro</p>
                </CardHeader>

                <CardContent className="space-y-2 px-2 pb-2">
                  {/* Feature Info - Ultra compact */}
                  <div className="text-center space-y-0.5">
                    <div className="flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3 text-orange-500" />
                      <h3 className="text-xs sm:text-sm font-semibold">{lockedFeature.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {lockedFeature.description}
                    </p>
                  </div>

                  {/* Pro Benefits - Ultra compact */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-center">Pro Benefits:</h4>
                    <div className="grid grid-cols-2 gap-0.5">
                      <div className="flex items-center gap-0.5 p-0.5 rounded bg-gradient-to-r from-green-500/5 to-emerald-500/5">
                        <Star className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
                        <span className="text-xs">Analytics</span>
                      </div>
                      <div className="flex items-center gap-0.5 p-0.5 rounded bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
                        <TrendingUp className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" />
                        <span className="text-xs">Predictions</span>
                      </div>
                      <div className="flex items-center gap-0.5 p-0.5 rounded bg-gradient-to-r from-purple-500/5 to-pink-500/5">
                        <Zap className="w-2.5 h-2.5 text-purple-500 flex-shrink-0" />
                        <span className="text-xs">Real-time</span>
                      </div>
                      <div className="flex items-center gap-0.5 p-0.5 rounded bg-gradient-to-r from-orange-500/5 to-red-500/5">
                        <Crown className="w-2.5 h-2.5 text-orange-500 flex-shrink-0" />
                        <span className="text-xs">Exclusive</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - Ultra compact */}
                  <div className="flex gap-1 pt-0.5">
                    <Button
                      onClick={handleSubscribe}
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold text-xs h-6"
                    >
                      <Crown className="w-2.5 h-2.5 mr-1" />
                      Subscribe
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCloseSubscriptionOverlay}
                      className="px-1 text-xs h-6"
                    >
                      <X className="w-2.5 h-2.5 mr-1" />
                      Close
                    </Button>
                  </div>

                  {/* Decorative elements - Minimal */}
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-40 animate-pulse"></div>
                  <div className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-30 animate-pulse delay-1000"></div>
                </CardContent>
              </Card>

              {/* Floating sparkles - Minimal */}
              <div className="absolute -top-2 -left-2 w-1 h-1 bg-yellow-400 rounded-full opacity-50 animate-bounce"></div>
              <div className="absolute -top-1 -right-3 w-1 h-1 bg-orange-400 rounded-full opacity-40 animate-bounce delay-500"></div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
