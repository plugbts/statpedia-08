import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Star,
  Zap,
  Target,
  Activity,
  Eye,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SeasonalCardBackground } from "@/components/ui/seasonal-card-background";
import { teamColorsService } from "@/services/team-colors-service";
import { SportsbookOverlay } from "@/components/ui/sportsbook-overlay";
import { statpediaRatingService, StatpediaRating } from "@/services/statpedia-rating-service";
import { toAmericanOdds, getOddsColorClass } from "@/utils/odds";
import { getPlayerHeadshot, getPlayerInitials, getKnownPlayerHeadshot } from "@/utils/headshots";
import { StreakService } from "@/services/streak-service";
import { formatPropType } from "@/utils/prop-type-formatter";
import { PlayerAnalyticsCompact } from "@/components/player-props/PlayerAnalyticsCard";
import logoFanduelMono from "@/assets/logos/mono/fanduel.svg";
import logoDraftkingsMono from "@/assets/logos/mono/draftkings.svg";
import logoBetmgmMono from "@/assets/logos/mono/betmgm.svg";
import logoCaesarsMono from "@/assets/logos/mono/caesars.svg";
import logoBet365Mono from "@/assets/logos/mono/bet365.svg";
import logoEspnbetMono from "@/assets/logos/mono/espnbet.svg";
import logoHardrockMono from "@/assets/logos/mono/hardrock.svg";
import logoSleeperMono from "@/assets/logos/mono/sleeper.svg";
import logoPrizepicksMono from "@/assets/logos/mono/prizepicks.svg";
import logoUnderdogMono from "@/assets/logos/mono/underdog.svg";
import logoPinnacleMono from "@/assets/logos/mono/pinnacle.svg";

const sportsbookMonoLogo: Record<string, string> = {
  fanduel: logoFanduelMono,
  draftkings: logoDraftkingsMono,
  betmgm: logoBetmgmMono,
  caesars: logoCaesarsMono,
  bet365: logoBet365Mono,
  espnbet: logoEspnbetMono,
  hardrock: logoHardrockMono,
  hardrockbet: logoHardrockMono,
  sleeper: logoSleeperMono,
  prizepicks: logoPrizepicksMono,
  underdog: logoUnderdogMono,
  pinnacle: logoPinnacleMono,
};

function normalizeBookKey(raw: string): string {
  const s = String(raw || "")
    .toLowerCase()
    .trim();
  const compact = s.replace(/[^a-z0-9]/g, "");
  const alias: Record<string, string> = {
    fanduel: "fanduel",
    fanduelsportsbook: "fanduel",
    draftkings: "draftkings",
    draftking: "draftkings",
    betmgm: "betmgm",
    mgm: "betmgm",
    caesars: "caesars",
    williamhill: "caesars",
    bet365: "bet365",
    espnbet: "espnbet",
    espn: "espnbet",
    hardrock: "hardrock",
    hardrockbet: "hardrock",
    sleeper: "sleeper",
    prizepicks: "prizepicks",
    underdog: "underdog",
    underdogfantasy: "underdog",
    pinnacle: "pinnacle",
    consensus: "consensus",
    best: "consensus",
    all: "consensus",
  };
  return alias[compact] || compact || "consensus";
}

interface SportsbookOdds {
  sportsbook: string;
  line: number;
  overOdds: number;
  underOdds: number;
  lastUpdate: string;
  isPickEm?: boolean;
}

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
  sportsbookSource?: string;
  position?: string;
  // Multiple sportsbook odds
  allSportsbookOdds?: SportsbookOdds[];
  // NEW: Available sportsbooks for this prop
  availableSportsbooks?: string[];
  gameDate: string;
  gameTime: string;
  headshotUrl?: string;
  confidence?: number;
  expectedValue?: number;
  recentForm?: string;
  last5Games?: number[];
  seasonStats?: {
    average: number;
    median: number;
    gamesPlayed: number;
    hitRate: number;
  };
  aiPrediction?: {
    recommended: "over" | "under";
    confidence: number;
    reasoning: string;
    factors: string[];
  };
  sportsbookSource?: string;
  lastOddsUpdate?: string;
  teamOddsContext?: {
    homeTeam: string;
    awayTeam: string;
    hasTeamOdds: boolean;
    sportsbooks: string[];
  };
  // Statpedia rating fields
  rating_over_raw?: number;
  rating_over_normalized?: number;
  rating_under_raw?: number;
  rating_under_normalized?: number;
}

interface PlayerPropCardProps {
  prop: PlayerProp;
  onAnalysisClick: (prop: PlayerProp) => void;
  onAdvancedAnalysisClick?: (prop: PlayerProp) => void;
  isSelected?: boolean;
  onSelect?: (propId: string) => void;
  showSelection?: boolean;
  overUnderFilter?: "over" | "under" | "both";
}

export function PlayerPropCard3D({
  prop,
  onAnalysisClick,
  onAdvancedAnalysisClick,
  isSelected = false,
  onSelect,
  showSelection = false,
  overUnderFilter = "both",
}: PlayerPropCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sparklePositions, setSparklePositions] = useState<
    Array<{ id: number; x: number; y: number; delay: number }>
  >([]);
  const [showSportsbookOverlay, setShowSportsbookOverlay] = useState(false);

  // Calculate Statpedia Rating
  const statpediaRating: StatpediaRating = React.useMemo(() => {
    return statpediaRatingService.calculateRating(prop, overUnderFilter);
  }, [prop, overUnderFilter]);

  // Debug logging for received prop data
  React.useEffect(() => {
    // Import logger dynamically to avoid circular imports
    import("@/utils/console-logger").then(({ logger }) => {
      logger.debug("PlayerPropCard3D", `Received prop: ${prop.playerName} - ${prop.propType}`, {
        playerName: prop.playerName,
        propType: prop.propType,
        line: prop.line,
        overOdds: prop.overOdds,
        underOdds: prop.underOdds,
        lineType: typeof prop.line,
        overOddsType: typeof prop.overOdds,
        underOddsType: typeof prop.underOdds,
      });
    });
  }, [prop]);

  // Generate sparkle positions for animation
  useEffect(() => {
    if (isHovered) {
      const sparkles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 1000,
      }));
      setSparklePositions(sparkles);
    }
  }, [isHovered]);

  const formatNumber = (value: number | string | null, decimals: number = 1): string => {
    if (value === null || value === undefined) return "N/A";

    const numericValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numericValue)) return "N/A";

    // For lines, round to nearest .5 or .0 interval
    if (numericValue < 1000) {
      // Assuming lines are typically under 1000
      const rounded = Math.round(numericValue * 2) / 2;
      return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
    }

    // For larger numbers, use compact formatting
    if (numericValue >= 1000000) {
      return (numericValue / 1000000).toFixed(decimals) + "M";
    }
    if (numericValue >= 1000) {
      return (numericValue / 1000).toFixed(decimals) + "K";
    }
    return numericValue.toFixed(decimals);
  };

  // Use shared odds utility for formatting
  const formatOdds = (odds: number | string | null): string => {
    // Delegate to shared helper which returns '+###', '-###', 'Pick \'em', or '—'
    return toAmericanOdds(odds as any);
  };

  // Debug logging for first 10 props
  React.useEffect(() => {
    if (prop && Math.random() < 0.1) {
      // Log ~10% of props for debugging
      console.debug(
        "[PROP]",
        prop.playerName,
        prop.position,
        prop.overOdds,
        prop.underOdds,
        prop.player_id,
      );
    }
  }, [prop]);

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return "text-green-400";
    if (confidence >= 0.6) return "text-yellow-400";
    return "text-red-400";
  };

  const getEVColor = (ev: number): string => {
    if (ev > 0.05) return "text-green-400";
    if (ev > 0) return "text-yellow-400";
    return "text-red-400";
  };

  const getFormColor = (form: string): string => {
    switch (form.toLowerCase()) {
      case "hot":
        return "text-green-400";
      case "cold":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getFormIcon = (form: string) => {
    switch (form.toLowerCase()) {
      case "hot":
        return <TrendingUp className="h-3 w-3" />;
      case "cold":
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };

  const getRatingColor = (rating: StatpediaRating) => {
    switch (rating.color) {
      case "green":
        return "text-green-400 bg-green-500/20 border-green-500/40";
      case "yellow":
        return "text-yellow-400 bg-yellow-500/20 border-yellow-500/40";
      case "red":
        return "text-red-400 bg-red-500/20 border-red-500/40";
      default:
        return "text-gray-400 bg-gray-500/20 border-gray-500/40";
    }
  };

  const getRatingIcon = (rating: StatpediaRating) => {
    if (rating.overall >= 79) return <Star className="h-3 w-3" />;
    if (rating.overall >= 61) return <Target className="h-3 w-3" />;
    return <BarChart3 className="h-3 w-3" />;
  };

  const handleCardClick = () => {
    if (showSelection && onSelect) {
      onSelect(prop.id);
    } else {
      onAnalysisClick(prop);
    }
  };

  return (
    <div className="relative group">
      {/* Sparkle Animation Overlay */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {sparklePositions.map((sparkle) => (
            <div
              key={sparkle.id}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-ping"
              style={{
                left: `${sparkle.x}%`,
                top: `${sparkle.y}%`,
                animationDelay: `${sparkle.delay}ms`,
                animationDuration: "1s",
              }}
            />
          ))}
        </div>
      )}

      <Card
        className={cn(
          "relative overflow-hidden cursor-pointer transition-all duration-500 ease-out",
          "bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950",
          "border border-slate-800/80 shadow-2xl",
          "hover:shadow-3xl hover:shadow-slate-500/20",
          "transform-gpu w-full max-w-2xl", // Made wider
          isHovered && "scale-102", // Reduced scale for subtlety
          isSelected && "ring-2 ring-slate-400 ring-opacity-60",
          showSelection && "hover:ring-2 hover:ring-slate-300 hover:ring-opacity-40",
        )}
        style={{
          transform: isHovered
            ? "perspective(1000px) rotateX(2deg) rotateY(2deg) translateZ(10px)" // Reduced 3D effect
            : "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)",
          transformStyle: "preserve-3d",
          minHeight: "280px", // Fixed compact height
          maxHeight: "320px", // Maximum height constraint
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
      >
        <SeasonalCardBackground intensity="subtle" className="h-full">
          {/* Animated Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-600/3 via-gray-600/2 to-slate-600/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-600/5 via-gray-600/4 to-slate-600/5 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />

          {/* Card Content */}
          <CardContent className="relative z-10 p-2 h-full flex flex-col">
            {/* Compact Header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2 flex-1">
                <div
                  className={`w-7 h-7 rounded-full ${teamColorsService.getTeamGradient(prop.teamAbbr, prop.sport)} flex items-center justify-center text-white font-bold text-xs shadow-lg border-2 ${teamColorsService.getTeamBorder(prop.teamAbbr, prop.sport)} overflow-hidden flex-shrink-0`}
                >
                  {(() => {
                    // Try known player headshot first, then fallback to player_id
                    const knownHeadshotUrl = getKnownPlayerHeadshot(
                      prop.playerName,
                      prop.sport || "nfl",
                    );
                    const fallbackHeadshotUrl = getPlayerHeadshot(
                      prop.sport || "nfl",
                      prop.player_id,
                    );
                    const headshotUrl = knownHeadshotUrl || fallbackHeadshotUrl;

                    if (headshotUrl) {
                      return (
                        <img
                          src={headshotUrl}
                          alt={prop.playerName}
                          className="w-full h-full object-cover rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
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
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-100 text-sm leading-tight tracking-tight truncate">
                    {prop.playerName}
                  </h3>
                  <div className="flex items-center space-x-1 text-xs text-slate-400">
                    <span className="font-semibold text-slate-200">{prop.teamAbbr}</span>
                    <span className="text-slate-500">vs</span>
                    <span className="font-semibold text-slate-200">{prop.opponentAbbr}</span>
                  </div>
                </div>
              </div>

              {/* Compact Statpedia Rating */}
              <div className="flex items-center space-x-1 flex-shrink-0">
                <Badge
                  className={cn(
                    "px-1.5 py-0.5 text-xs font-bold border",
                    getRatingColor(statpediaRating),
                  )}
                >
                  {getRatingIcon(statpediaRating)}
                  <span className="ml-1">{statpediaRating.overall}</span>
                </Badge>
                <div className="text-xs font-semibold text-slate-300">{statpediaRating.grade}</div>
              </div>
            </div>

            {/* Main Content Area - Simplified Layout */}
            <div className="flex-1 flex flex-col space-y-1">
              {/* Prop Details - Centered */}
              <div className="text-center space-y-1">
                <div
                  className="text-white text-xs font-semibold tracking-wide uppercase leading-tight animate-pulse"
                  style={{ animationDuration: "3s" }}
                >
                  {(() => {
                    const formattedPropType = formatPropType(
                      prop.propType,
                      prop.sport?.toLowerCase(),
                    );
                    return formattedPropType.length > 15 ? (
                      <div className="space-y-0.5">
                        {formattedPropType.split(" ").map((word, index) => (
                          <div key={index}>{word}</div>
                        ))}
                      </div>
                    ) : (
                      formattedPropType
                    );
                  })()}
                </div>
                <div className="text-slate-100 text-lg font-bold tracking-tight">
                  {formatNumber(prop.line)}
                </div>
              </div>

              {/* AI Prediction & Form - Inline */}
              <div className="flex items-center justify-center space-x-1 flex-wrap gap-1">
                {prop.aiPrediction &&
                  (() => {
                    // Determine which side has higher Statpedia rating
                    const overRating = prop.rating_over_normalized || prop.rating_over_raw || 0;
                    const underRating = prop.rating_under_normalized || prop.rating_under_raw || 0;
                    const higherRatingSide = overRating > underRating ? "over" : "under";

                    return (
                      <div
                        className={cn(
                          "flex items-center space-x-1 px-2 py-1 rounded text-xs font-semibold",
                          higherRatingSide === "over"
                            ? "bg-green-600/20 text-green-300"
                            : "bg-red-600/20 text-red-300",
                        )}
                      >
                        {higherRatingSide === "over" ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span className="uppercase text-xs">
                          {higherRatingSide} ^ AI Prediction
                        </span>
                      </div>
                    );
                  })()}

                {prop.recentForm && (
                  <div className="flex items-center space-x-1 px-2 py-1 rounded text-xs font-semibold bg-slate-800/60 text-slate-200">
                    {getFormIcon(prop.recentForm)}
                    <span className="uppercase text-xs">{prop.recentForm}</span>
                  </div>
                )}
              </div>

              {/* Odds Display - Filtered */}
              <div
                className={cn(
                  "grid gap-2",
                  overUnderFilter === "both" ? "grid-cols-2" : "grid-cols-1",
                )}
              >
                {(overUnderFilter === "over" || overUnderFilter === "both") && (
                  <div className="text-center bg-slate-800/30 rounded p-2">
                    <div className="text-xs text-slate-500 uppercase font-semibold">Over</div>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-black/40">
                        {(() => {
                          const bookKey = String(prop.sportsbookSource || "all").toLowerCase();
                          const src = sportsbookMonoLogo[normalizeBookKey(bookKey)];
                          if (!src)
                            return <span className="text-[10px] font-extrabold text-white">★</span>;
                          return <img src={src} alt={bookKey} className="h-4 w-4 opacity-95" />;
                        })()}
                      </div>
                      <div className={`text-sm font-bold ${getOddsColorClass(prop.overOdds)}`}>
                        {toAmericanOdds(prop.overOdds)}
                      </div>
                    </div>
                  </div>
                )}
                {(overUnderFilter === "under" || overUnderFilter === "both") && (
                  <div className="text-center bg-slate-800/30 rounded p-2">
                    <div className="text-xs text-slate-500 uppercase font-semibold">Under</div>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-black/40">
                        {(() => {
                          const bookKey = String(prop.sportsbookSource || "all").toLowerCase();
                          const src = sportsbookMonoLogo[normalizeBookKey(bookKey)];
                          if (!src)
                            return <span className="text-[10px] font-extrabold text-white">★</span>;
                          return <img src={src} alt={bookKey} className="h-4 w-4 opacity-95" />;
                        })()}
                      </div>
                      <div className={`text-sm font-bold ${getOddsColorClass(prop.underOdds)}`}>
                        {toAmericanOdds(prop.underOdds)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Hit Streak - Compact */}
              <div className="text-center">
                {(() => {
                  // Calculate real streak based on available data
                  const hitRate = (prop as any).hitRate ?? 0.5;
                  const recentForm =
                    typeof (prop as any).recentForm === "number" ? (prop as any).recentForm : 0.5;
                  const gamesTracked = (prop as any).gamesTracked ?? 10;

                  // Calculate current streak based on recent form and hit rate
                  let currentStreak = 0;

                  // Use last5Games if available to calculate real streak
                  if ((prop as any).last5Games && (prop as any).last5Games.length > 0) {
                    // Count consecutive hits from most recent games (last5Games is ordered most recent first)
                    for (let i = 0; i < (prop as any).last5Games.length; i++) {
                      if ((prop as any).last5Games[i] === 1) {
                        // 1 = hit, 0 = miss
                        currentStreak++;
                      } else {
                        break; // Stop counting when we hit a miss
                      }
                    }
                  } else if (
                    (prop.seasonStats as any)?.last5Games &&
                    (prop.seasonStats as any).last5Games.length > 0
                  ) {
                    // Use season stats last5Games
                    for (let i = 0; i < (prop.seasonStats as any).last5Games.length; i++) {
                      if ((prop.seasonStats as any).last5Games[i] === 1) {
                        currentStreak++;
                      } else {
                        break;
                      }
                    }
                  } else {
                    // Fallback: estimate streak based on hit rate and recent form
                    // If recent form is high and hit rate is good, assume some streak
                    if (recentForm > 0.7 && hitRate > 0.6) {
                      currentStreak = Math.min(3, Math.floor(hitRate * 5));
                    } else if (recentForm > 0.5 && hitRate > 0.5) {
                      currentStreak = Math.min(2, Math.floor(hitRate * 3));
                    } else {
                      currentStreak = 0;
                    }
                  }

                  // Determine streak display based on current streak
                  let bgColor, text;
                  if (currentStreak >= 5) {
                    bgColor = "bg-gradient-to-r from-emerald-600 to-green-600 text-white";
                    text = `${currentStreak}W`;
                  } else if (currentStreak >= 3) {
                    bgColor = "bg-gradient-to-r from-blue-600 to-cyan-600 text-white";
                    text = `${currentStreak}W`;
                  } else if (currentStreak >= 1) {
                    bgColor = "bg-gradient-to-r from-yellow-600 to-orange-600 text-white";
                    text = `${currentStreak}W`;
                  } else {
                    bgColor = "bg-gradient-to-r from-gray-600 to-slate-600 text-white";
                    text = "0W";
                  }

                  return (
                    <div className="flex items-center justify-center space-x-1">
                      <div
                        className={cn(
                          "flex items-center space-x-1 px-1.5 py-0.5 rounded text-xs font-semibold",
                          bgColor,
                        )}
                      >
                        <Activity className="h-2.5 w-2.5" />
                        <span className="uppercase text-xs">{text}</span>
                      </div>
                      <div className="text-xs text-slate-400 font-semibold">Streak</div>
                    </div>
                  );
                })()}
              </div>

              {/* Player Analytics - Compact */}
              {prop.player_id && (
                <div className="px-1">
                  <PlayerAnalyticsCompact
                    playerId={prop.player_id}
                    propType={prop.propType}
                    season="2025"
                  />
                </div>
              )}

              {/* View Analysis Button - Moved Up */}
              <div className="mt-1">
                <Button
                  className={cn(
                    "w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500",
                    "text-white font-semibold py-1.5 px-3 rounded-lg text-xs",
                    "transition-all duration-300 ease-out",
                    "hover:shadow-lg hover:shadow-blue-500/25",
                    "border border-blue-500/50",
                    "group",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnalysisClick(prop);
                  }}
                >
                  <BarChart3 className="h-3 w-3 mr-1" />
                  View Analysis
                  <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </div>

              {/* Additional Info - Very Compact */}
              <div className="space-y-1">
                {/* Expected Value - Compact */}
                {prop.expectedValue !== undefined && (
                  <div className="flex items-center justify-center">
                    <div className="flex items-center space-x-1 px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs font-bold">
                      <Zap className="h-2.5 w-2.5" />
                      <span>
                        {prop.expectedValue > 0 ? "+" : ""}
                        {prop.expectedValue.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Game Info - Compact */}
                <div className="text-center">
                  <div className="text-xs text-slate-500 font-semibold">
                    {new Date(prop.gameDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    •{" "}
                    {new Date(prop.gameTime).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Analysis Button */}
            {onAdvancedAnalysisClick && (
              <Button
                className={cn(
                  "w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500",
                  "text-white font-semibold py-2 px-3 rounded-lg text-sm",
                  "transition-all duration-300 ease-out",
                  "hover:shadow-lg hover:shadow-blue-500/25",
                  "border border-blue-500/50",
                  "group",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onAdvancedAnalysisClick(prop);
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Advanced AI Analysis
                <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            )}
          </CardContent>
        </SeasonalCardBackground>

        {/* 3D Border Effect */}
        <div className="absolute inset-0 rounded-lg border border-gradient-to-r from-slate-500/30 via-gray-500/30 to-slate-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </Card>

      {/* Sportsbook Overlay */}
      <SportsbookOverlay
        isOpen={showSportsbookOverlay}
        onClose={() => setShowSportsbookOverlay(false)}
        sportsbooks={prop.availableSportsbooks || []}
        propInfo={{
          playerName: prop.playerName,
          propType: prop.propType,
          line: prop.line,
        }}
      />
    </div>
  );
}
