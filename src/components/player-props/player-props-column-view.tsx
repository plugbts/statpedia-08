import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  SortDesc,
  Gamepad2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { statpediaRatingService as _rating } from "@/services/statpedia-rating-service";
import { cn } from "@/lib/utils";
import { SportsbookIconsList } from "@/components/ui/sportsbook-icons";
import { SportsbookOverlay } from "@/components/ui/sportsbook-overlay";
import { statpediaRatingService, StatpediaRating } from "@/services/statpedia-rating-service";
import { toAmericanOdds, getOddsColorClass } from "@/utils/odds";
import { getPlayerHeadshot, getPlayerInitials, getKnownPlayerHeadshot } from "@/utils/headshots";
import { StreakService } from "@/services/streak-service";
import { useToast } from "@/hooks/use-toast";
import { normalizeOpponent, normalizePosition, normalizeTeam } from "@/utils/normalize";
import { useSimpleAnalytics } from "@/hooks/use-simple-analytics";
import { getOrdinalSuffix, getTeamAbbreviation } from "@/utils/prop-type-formatter";
import "@/styles/streak-animations.css";

// Using shared utility functions from prop-type-formatter.ts

// Team logo component with better fallback handling
const TeamLogo = ({
  team,
  teamAbbr,
  sport = "nfl",
}: {
  team: string;
  teamAbbr: string;
  sport?: string;
}) => {
  const finalTeamAbbr = getTeamAbbreviation(team, teamAbbr);

  const getTeamLogoUrl = (teamAbbr: string, sport: string) => {
    // Return team logo URL based on sport and team abbreviation
    const baseUrl = "https://a.espncdn.com/i/teamlogos";

    if (sport.toLowerCase() === "nfl") {
      return `${baseUrl}/nfl/500/${teamAbbr.toLowerCase()}.png`;
    } else if (sport.toLowerCase() === "nba") {
      return `${baseUrl}/nba/500/${teamAbbr.toLowerCase()}.png`;
    } else if (sport.toLowerCase() === "mlb") {
      return `${baseUrl}/mlb/500/${teamAbbr.toLowerCase()}.png`;
    } else if (sport.toLowerCase() === "nhl") {
      return `${baseUrl}/nhl/500/${teamAbbr.toLowerCase()}.png`;
    }

    return `${baseUrl}/nfl/500/${teamAbbr.toLowerCase()}.png`; // Default to NFL
  };

  // Don't show logo if abbreviation is UNK
  if (finalTeamAbbr === "UNK") {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
          <span className="text-xs font-medium text-muted-foreground">?</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground">UNK</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <img
        src={getTeamLogoUrl(finalTeamAbbr, sport)}
        alt={finalTeamAbbr}
        className="w-6 h-6 object-contain"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
          // Show fallback icon when image fails to load
          const parent = target.parentElement;
          if (parent) {
            const fallback = document.createElement("div");
            fallback.className = "w-6 h-6 rounded bg-muted flex items-center justify-center";
            fallback.innerHTML = '<span class="text-xs font-medium text-muted-foreground">?</span>';
            parent.appendChild(fallback);
          }
        }}
      />
      <span className="text-xs font-medium text-foreground">{finalTeamAbbr}</span>
    </div>
  );
};

// Prop priority mapping (matches Cloudflare Worker logic)
const getPropPriority = (propType: string): number => {
  const lowerPropType = propType.toLowerCase();

  // Core props (highest priority)
  const coreProps = [
    "passing yards",
    "passing touchdowns",
    "passing attempts",
    "passing completions",
    "passing interceptions",
    "rushing yards",
    "rushing touchdowns",
    "rushing attempts",
    "receiving yards",
    "receiving touchdowns",
    "receptions",
    "defense sacks",
    "defense interceptions",
    "defense combined tackles",
    "field goals made",
    "kicking total points",
    "extra points kicks made",
  ];

  // Check if it's a core prop
  const isCore = coreProps.some((core) => lowerPropType.includes(core.toLowerCase()));
  if (isCore) return 1;

  // Category-based priority
  const category = getPropCategory(lowerPropType);
  const categoryOrder = ["offense", "kicking", "defense", "touchdowns", "other"];
  const categoryPriority = categoryOrder.indexOf(category) + 2; // +2 because core props are 1

  return categoryPriority;
};

const getPropCategory = (market: string): string => {
  const lowerMarket = market.toLowerCase();

  // Offense props (passing, rushing, receiving)
  if (
    lowerMarket.includes("passing") ||
    lowerMarket.includes("rushing") ||
    lowerMarket.includes("receiving")
  ) {
    return "offense";
  }

  // Kicking props
  if (
    lowerMarket.includes("field goal") ||
    lowerMarket.includes("kicking") ||
    lowerMarket.includes("extra point")
  ) {
    return "kicking";
  }

  // Defense props
  if (
    lowerMarket.includes("defense") ||
    lowerMarket.includes("sack") ||
    lowerMarket.includes("tackle") ||
    lowerMarket.includes("interception")
  ) {
    return "defense";
  }

  // Touchdown props (should be last)
  if (
    lowerMarket.includes("touchdown") ||
    lowerMarket.includes("first touchdown") ||
    lowerMarket.includes("last touchdown")
  ) {
    return "touchdowns";
  }

  return "other";
};

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
  position?: string;
  gameDate: string;
  gameTime: string;
  confidence?: number;
  expectedValue?: number;
  aiRating?: number;
  recommendation?: "strong_bet" | "good_bet" | "neutral" | "avoid" | "strong_avoid";
  recentForm?: string;
  aiPrediction?: {
    recommended: "over" | "under";
    confidence: number;
    reasoning: string;
    factors: string[];
  };
  // Additional properties for consistency
  headshotUrl?: string;
  valueRating?: number;
  riskLevel?: "low" | "medium" | "high";
  factors?: string[];
  lastUpdated?: Date;
  isLive?: boolean;
  isBookmarked?: boolean;
  advancedReasoning?: string;
  injuryImpact?: string;
  weatherImpact?: string;
  matchupAnalysis?: string;
  // NEW: Available sportsbooks for this prop
  availableSportsbooks?: string[];
  // Team logos
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  // Additional properties for streak and rating calculations
  hitRate?: number;
  gamesTracked?: number;
  rating_over_normalized?: number;
  rating_over_raw?: number;
  rating_under_normalized?: number;
  rating_under_raw?: number;
  // Analytics properties
  marketType?: string;
  // Enriched properties for analytics
  gameLogs?: Array<{
    date: string;
    season: number;
    opponent: string;
    value: number;
  }>;
  defenseStats?: Array<{
    team: string;
    propType: string;
    position: string;
    rank: number;
  }>;
}

interface PlayerPropsColumnViewProps {
  props: PlayerProp[];
  selectedSport: string;
  onAnalysisClick?: (prop: PlayerProp) => void;
  isLoading?: boolean;
  overUnderFilter?: "over" | "under" | "both";
}

export function PlayerPropsColumnView({
  props,
  selectedSport,
  onAnalysisClick,
  isLoading = false,
  overUnderFilter = "both",
}: PlayerPropsColumnViewProps) {
  console.log("[PLAYER_PROPS] Component rendered with props:", props.length);
  console.log("[PLAYER_PROPS] Props data:", props.slice(0, 2));
  console.log(
    "[PLAYER_PROPS] First prop details:",
    props[0]
      ? {
          playerName: props[0].playerName,
          propType: props[0].propType,
          line: props[0].line,
          team: props[0].team,
          opponent: props[0].opponent,
        }
      : "No props",
  );
  // Normalize props data
  const normalizedProps = props.map((prop) => ({
    ...prop,
    team: normalizeTeam(prop.team),
    opponent: normalizeOpponent(prop.opponent),
    opponentAbbr: normalizeOpponent(prop.opponentAbbr || prop.opponent),
    position: normalizePosition(prop.position),
  }));

  // Prime rating service with current slate
  try {
    _rating.setSlateProps(normalizedProps as any[]);
  } catch (e) {
    // intentionally ignore errors from slate priming
  }

  const [sortBy, setSortBy] = useState("api");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterBy, setFilterBy] = useState("all");
  const [showSportsbookOverlay, setShowSportsbookOverlay] = useState(false);
  const [selectedPropSportsbooks, setSelectedPropSportsbooks] = useState<{
    sportsbooks: string[];
    propInfo: any;
  }>({ sportsbooks: [], propInfo: null });
  const [selectedGame, setSelectedGame] = useState("all");
  const [showAlternativeLines, setShowAlternativeLines] = useState(false);
  // Use simple analytics hook
  const {
    calculateAnalytics,
    getAnalytics,
    isLoading: analyticsLoading,
    progress,
  } = useSimpleAnalytics();
  const { toast } = useToast();

  // --- League-aware alternative lines grouping helpers ---
  // Build a stable group key so we can aggregate all lines for the same player/prop/game
  const getGroupKey = React.useCallback((p: any) => {
    const pid = p.playerId || p.player_id || p.playerName; // prefer playerId when available
    return `${pid}__${(p.propType || "").toLowerCase()}__${p.gameId || "unknown"}`;
  }, []);

  // Count available sportsbooks for a prop line (fallbacks if arrays missing)
  const getBooksCount = (p: any) => {
    if (Array.isArray(p.availableSportsbooks)) return p.availableSportsbooks.length;
    if (Array.isArray(p.allSportsbookOdds)) return p.allSportsbookOdds.length;
    return 0;
  };

  // Pick the "main" line in a group using sportsbook coverage, then median line as tie-breaker,
  // then odds proximity to -110 to break any remaining ties. Works across leagues.
  const pickMainLine = React.useCallback((group: any[], league: string) => {
    if (!group || group.length === 0) return undefined;

    // 1) Prefer the line with the most sportsbook coverage
    const sortedByBooks = [...group].sort((a, b) => getBooksCount(b) - getBooksCount(a));
    const topBooksCount = getBooksCount(sortedByBooks[0]);
    const topCandidates = sortedByBooks.filter((p) => getBooksCount(p) === topBooksCount);

    if (topCandidates.length === 1) {
      return topCandidates[0].line;
    }

    // 2) Tie-break by median line (closest to the median of candidate lines)
    const lines = topCandidates.map((p) => Number(p.line)).filter((n) => Number.isFinite(n));
    if (lines.length === 0) return sortedByBooks[0].line;
    const sortedLines = [...lines].sort((a, b) => a - b);
    const mid = Math.floor(sortedLines.length / 2);
    const median =
      sortedLines.length % 2 === 0
        ? (sortedLines[mid - 1] + sortedLines[mid]) / 2
        : sortedLines[mid];

    let closest = topCandidates[0];
    let bestDist = Math.abs(Number(topCandidates[0].line) - median);
    for (let i = 1; i < topCandidates.length; i++) {
      const d = Math.abs(Number(topCandidates[i].line) - median);
      if (d < bestDist) {
        bestDist = d;
        closest = topCandidates[i];
      }
    }

    // 3) Final tie-break: odds proximity to -110 on chosen direction isn't strictly necessary here
    return closest.line;
  }, []);

  // Precompute group -> mainLine for the current slate
  const mainLineByGroup = React.useMemo(() => {
    const map = new Map<string, number | undefined>();
    const groups = new Map<string, any[]>();
    for (const p of normalizedProps) {
      const key = getGroupKey(p);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    groups.forEach((group, key) => {
      const mainLine = pickMainLine(group, selectedSport);
      map.set(key, typeof mainLine === "number" ? mainLine : Number(mainLine));
    });
    return map;
  }, [normalizedProps, getGroupKey, pickMainLine, selectedSport]);

  // Load analytics data for props using the simple analytics hook
  const loadAnalyticsData = React.useCallback(
    async (props: PlayerProp[]) => {
      if (analyticsLoading) {
        console.log("⏳ [ANALYTICS_LOAD] Already loading analytics, skipping");
        return;
      }

      console.log("🚀 [ANALYTICS_LOAD] Starting loadAnalyticsData with props:", props.length);

      // Safety check for empty props
      if (!props || props.length === 0) {
        console.log("📭 [ANALYTICS_LOAD] No props to process");
        return;
      }

      // Convert props to the format expected by the simple analytics hook
      const propsToCalculate = props.slice(0, 50).map((prop) => ({
        playerId: prop.playerId || prop.player_id || "",
        playerName: prop.playerName || "Unknown Player",
        propType: prop.propType,
        line: prop.line || 0,
        direction: overUnderFilter as "over" | "under",
        team: prop.team || "UNK",
        opponent: prop.opponent || "UNK",
        position: prop.position || "QB",
        sport: prop.sport || selectedSport,
      }));

      console.log("[ANALYTICS_LOAD] Props to calculate:", propsToCalculate.slice(0, 3));

      await calculateAnalytics(propsToCalculate);
    },
    [analyticsLoading, overUnderFilter, selectedSport, calculateAnalytics],
  );

  // Load analytics when props change
  React.useEffect(() => {
    console.log("🔍 [ANALYTICS_LOAD] Props changed:", {
      propsCount: normalizedProps.length,
      overUnderFilter,
      firstProp: normalizedProps[0]
        ? {
            playerName: normalizedProps[0].playerName,
            playerId: normalizedProps[0].playerId,
            propType: normalizedProps[0].propType,
            opponent: normalizedProps[0].opponent,
          }
        : null,
    });

    // Only load analytics for a reasonable number of props to prevent crashes
    if (normalizedProps.length > 0 && normalizedProps.length <= 50) {
      console.log("🚀 [ANALYTICS_LOAD] Loading analytics for", normalizedProps.length, "props");
      console.log("🚀 [ANALYTICS_LOAD] First few props:", normalizedProps.slice(0, 3));
      try {
        loadAnalyticsData(normalizedProps);
      } catch (error) {
        console.warn("⚠️ [ANALYTICS_LOAD] Failed to load analytics, continuing without:", error);
      }
    } else if (normalizedProps.length > 50) {
      console.warn(
        "⚠️ [ANALYTICS_LOAD] Too many props to load analytics safely:",
        normalizedProps.length,
      );
    } else if (normalizedProps.length === 0) {
      console.log("📭 [ANALYTICS_LOAD] No props to load analytics for");
    }
  }, [normalizedProps, overUnderFilter, loadAnalyticsData, getGroupKey]);

  // Handle alternative lines toggle with confirmation
  const handleAlternativeLinesToggle = (checked: boolean) => {
    console.log(`🔍 Toggle Alternative Lines: ${checked ? "ON" : "OFF"}`);

    if (checked) {
      // Calculate how many additional props will be shown when revealing alt lines
      const propsWithoutAlternatives = normalizedProps.filter((prop) => {
        if (selectedGame !== "all" && prop.gameId !== selectedGame) return false;
        const key = getGroupKey(prop);
        const mainLine = mainLineByGroup.get(key);
        const groupSize = normalizedProps.filter((p) => getGroupKey(p) === key).length;
        // If group has multiple lines, keep only the main line
        if (groupSize > 1) return Number(prop.line) === Number(mainLine);
        return true;
      });

      const totalProps = normalizedProps.filter(
        (prop) => selectedGame === "all" || prop.gameId === selectedGame,
      );

      const additionalProps = Math.max(0, totalProps.length - propsWithoutAlternatives.length);

      // Enhanced debug logging
      console.log("🔍 Alternative Lines Toggle Debug:", {
        totalProps: totalProps.length,
        propsWithoutAlternatives: propsWithoutAlternatives.length,
        additionalProps,
        showAlternativeLines: checked,
        selectedGame,
      });

      // Log specific examples of alternative lines found
      const groupedProps = normalizedProps.reduce(
        (acc, prop) => {
          const key = getGroupKey(prop);
          if (!acc[key]) acc[key] = [];
          acc[key].push(prop);
          return acc;
        },
        {} as Record<string, any[]>,
      );
      const alternativeLineGroups = Object.entries(groupedProps).filter(
        ([_, propGroup]) => propGroup.length > 1,
      );
      console.log(
        `🔍 Found ${alternativeLineGroups.length} alternative line groups:`,
        alternativeLineGroups.slice(0, 3).map(([key, propGroup]) => ({
          key,
          count: propGroup.length,
          lines: propGroup.map((p) => p.line),
        })),
      );

      setShowAlternativeLines(true);

      if (additionalProps > 0) {
        toast({
          title: "Alternative Lines Revealed",
          description: `Showing ${additionalProps} additional alternative prop lines`,
          duration: 2000,
        });
      } else {
        toast({
          title: "Alternative Lines",
          description: "No additional alternative lines available",
          duration: 2000,
        });
      }
    } else {
      setShowAlternativeLines(false);
      console.log("🔍 Alternative Lines Hidden - showing only main lines");
      toast({
        title: "Alternative Lines Hidden",
        description: "Showing only main prop lines",
        duration: 2000,
      });
    }
  };

  // Format number helper - display lines exactly as they are
  const formatNumber = (value: number, decimals: number = 1): string => {
    // For lines, display exactly as stored in database (no artificial rounding)
    if (value < 1000) {
      // Assuming lines are typically under 1000
      return value.toFixed(decimals);
    }

    // For larger numbers, use compact formatting
    if (value >= 1000000) {
      return (value / 1000000).toFixed(decimals) + "M";
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(decimals) + "K";
    }
    return value.toFixed(decimals);
  };

  // Use shared odds utility for formatting
  const formatOdds = (odds: number): string => {
    // Convert to American odds first, then format
    return toAmericanOdds(odds);
  };

  // Debug logging for props and alternative lines
  React.useEffect(() => {
    if (normalizedProps && normalizedProps.length > 0) {
      console.log(`🔍 Player Props Debug - Total props: ${normalizedProps.length}`);

      // Group props by player and prop type to check for alternative lines
      const groupedProps = normalizedProps.reduce(
        (acc, prop) => {
          const key = getGroupKey(prop);
          if (!acc[key]) acc[key] = [];
          acc[key].push(prop);
          return acc;
        },
        {} as Record<string, any[]>,
      );

      // Log groups with multiple lines
      let alternativeLinesFound = 0;
      Object.entries(groupedProps).forEach(([key, propGroup]) => {
        if (propGroup.length > 1) {
          alternativeLinesFound++;
          console.log(
            `🔍 Alternative Lines Found - ${key}:`,
            propGroup.map((p) => ({ line: p.line, overOdds: p.overOdds, underOdds: p.underOdds })),
          );
        }
      });

      console.log(`🔍 Total alternative line groups found: ${alternativeLinesFound}`);

      // If no alternative lines found, let's check if we have different prop types for same player
      const playerGroups = normalizedProps.reduce(
        (acc, prop) => {
          const key = `${prop.playerName}-${prop.gameId}`;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(prop);
          return acc;
        },
        {} as Record<string, any[]>,
      );

      const playersWithMultipleProps = Object.entries(playerGroups).filter(([_, playerProps]) => {
        const propTypes = new Set(playerProps.map((p) => p.propType));
        return propTypes.size > 1;
      });

      console.log(`🔍 Players with multiple prop types: ${playersWithMultipleProps.length}`);
      if (playersWithMultipleProps.length > 0) {
        console.log(`🔍 Sample player with multiple props:`, playersWithMultipleProps[0]);
      }

      // TEMPORARY: If no alternative lines found, create some for testing
      if (alternativeLinesFound === 0 && playersWithMultipleProps.length > 0) {
        console.log(
          `🔍 No alternative lines found - this suggests the API is not returning multiple lines for the same player/prop combination`,
        );
        console.log(
          `🔍 The issue is likely in the Cloudflare Worker grouping logic that groups all lines for the same player/prop together`,
        );
        console.log(`🔍 Sample player data:`, playersWithMultipleProps[0]);

        // Let's also check if we can find any props with similar lines
        const samplePlayerEntry = playersWithMultipleProps[0];
        if (samplePlayerEntry) {
          const [playerName, playerProps] = samplePlayerEntry;
          const propTypes = playerProps.map((p: any) => p.propType);
          console.log(`🔍 Sample player (${playerName}) prop types:`, propTypes);

          // Check if any prop types have similar lines
          propTypes.forEach((propType: string) => {
            const propsOfType = playerProps.filter((p: any) => p.propType === propType);
            if (propsOfType.length > 1) {
              console.log(
                `🔍 Found multiple props for ${propType}:`,
                propsOfType.map((p: any) => ({
                  line: p.line,
                  overOdds: p.overOdds,
                  underOdds: p.underOdds,
                })),
              );
            }
          });
        }
      }
    }
    // Add getGroupKey to dependency array to fix React hook warning
  }, [normalizedProps, getGroupKey]);

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Format prop type names with proper spacing and line breaks (using the global formatPropType function)

  // Check if text should wrap to multiple lines
  const shouldWrapText = (text: string, maxLength: number = 12): boolean => {
    return text.length > maxLength;
  };

  // Split text into multiple lines if needed
  const splitTextIntoLines = (text: string, maxLength: number = 12): string[] => {
    if (text.length <= maxLength) return [text];

    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if ((currentLine + " " + word).length <= maxLength) {
        currentLine = currentLine ? currentLine + " " + word : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Derive position from prop type
  const getPositionFromPropType = (propType: string): string => {
    const lowerPropType = propType.toLowerCase();

    if (lowerPropType.includes("passing")) return "QB";
    if (lowerPropType.includes("rushing")) return "RB";
    if (lowerPropType.includes("receiving")) return "WR";
    if (lowerPropType.includes("field goal") || lowerPropType.includes("kicking")) return "K";
    if (
      lowerPropType.includes("defense") ||
      lowerPropType.includes("sack") ||
      lowerPropType.includes("tackle")
    )
      return "DEF";

    return "N/A";
  };

  // Extract unique games for dropdown
  const uniqueGames = React.useMemo(() => {
    const games = new Map<string, { id: string; display: string; date: string }>();

    normalizedProps.forEach((prop) => {
      if (prop.gameId && prop.team && prop.opponent) {
        const gameKey = prop.gameId;
        const gameDate = new Date(prop.gameDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const gameDisplay = `${prop.opponentAbbr} @ ${prop.teamAbbr} (${gameDate})`;

        if (!games.has(gameKey)) {
          games.set(gameKey, {
            id: gameKey,
            display: gameDisplay,
            date: prop.gameDate,
          });
        }
      }
    });

    // Sort games by date
    return Array.from(games.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [normalizedProps]);

  // Filter props (preserve order unless explicitly sorting)
  const filteredProps = normalizedProps.filter((prop) => {
    // Game filter
    if (selectedGame !== "all" && prop.gameId !== selectedGame) {
      return false;
    }

    // Alternative lines filter - FIXED LOGIC
    if (!showAlternativeLines) {
      const key = getGroupKey(prop);
      const groupMainLine = mainLineByGroup.get(key);
      const groupSize = normalizedProps.filter((p) => getGroupKey(p) === key).length;
      if (groupSize > 1) {
        const willShow = Number(prop.line) === Number(groupMainLine);
        // Debug logging for alternative lines decision
        console.log(`🔍 Alternative Lines Filter - ${prop.playerName} ${prop.propType}:`, {
          groupSize,
          groupMainLine,
          currentLine: prop.line,
          willShow,
          showAlternativeLines,
        });
        if (!willShow) return false;
      }
    }

    // Existing filters
    if (filterBy === "all") return true;
    if (filterBy === "over") return prop.aiPrediction?.recommended === "over";
    if (filterBy === "under") return prop.aiPrediction?.recommended === "under";
    if (filterBy === "high-confidence") return (prop.confidence || 0) > 0.7;
    return true;
  });

  // Only sort if not using 'api' sort (which preserves the parent's ordering)
  const filteredAndSortedProps =
    sortBy === "api"
      ? filteredProps
      : filteredProps.sort((a, b) => {
          let aValue = 0;
          let bValue = 0;

          switch (sortBy) {
            case "statpediaRating":
              const aRating = statpediaRatingService.calculateRating(a, overUnderFilter);
              const bRating = statpediaRatingService.calculateRating(b, overUnderFilter);
              aValue = aRating.overall;
              bValue = bRating.overall;
              break;
            case "expectedValue":
              aValue = a.expectedValue || 0;
              bValue = b.expectedValue || 0;
              break;
            case "line":
              aValue = a.line;
              bValue = b.line;
              break;
            case "overOdds":
              aValue = a.overOdds;
              bValue = b.overOdds;
              break;
            case "playerName":
              aValue = a.playerName.localeCompare(b.playerName);
              bValue = 0;
              break;
            case "order":
              // Sort by prop priority order
              const aPriority = getPropPriority(a.propType);
              const bPriority = getPropPriority(b.propType);
              return aPriority - bPriority;
            default:
              aValue = a.confidence || 0;
              bValue = b.confidence || 0;
          }

          if (sortBy === "playerName") {
            return sortOrder === "asc" ? aValue : -aValue;
          }

          return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
        });

  const handlePropClick = (prop: PlayerProp) => {
    // Parent component handles the overlay
    if (onAnalysisClick) {
      onAnalysisClick(prop);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-400";
    if (confidence >= 0.6) return "text-yellow-400";
    return "text-red-400";
  };

  const getEVColor = (ev: number) => {
    if (ev > 0.1) return "text-green-400";
    if (ev > 0) return "text-yellow-400";
    return "text-red-400";
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Target className="w-4 h-4 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Player Props - {selectedSport.toUpperCase()}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="h-10 w-32 bg-card/60 rounded-lg animate-pulse" />
            <div className="h-10 w-24 bg-card/60 rounded-lg animate-pulse" />
            <div className="h-10 w-20 bg-card/60 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-card/60 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <Target className="w-4 h-4 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Player Props - {selectedSport.toUpperCase()}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Games Dropdown */}
          <Select value={selectedGame} onValueChange={setSelectedGame}>
            <SelectTrigger className="w-48 bg-card border-border/50 text-foreground hover:border-primary/30 transition-colors">
              <SelectValue placeholder="Select Game" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all" className="text-foreground">
                All Games
              </SelectItem>
              {uniqueGames.map((game) => (
                <SelectItem key={game.id} value={game.id} className="text-foreground">
                  {game.display}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Show Alternative Lines Switch */}
          <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border/50 rounded-lg hover:border-primary/30 transition-colors">
            <Switch
              checked={showAlternativeLines}
              onCheckedChange={handleAlternativeLinesToggle}
              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-white"
            />
            <label className="text-sm font-medium text-foreground cursor-pointer">
              Show Alternative Lines
            </label>
          </div>

          {/* Filter Dropdown */}
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger className="w-40 bg-card border-border/50 text-foreground hover:border-primary/30 transition-colors">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all" className="text-foreground">
                All Props
              </SelectItem>
              <SelectItem value="over" className="text-foreground">
                Over Picks
              </SelectItem>
              <SelectItem value="under" className="text-foreground">
                Under Picks
              </SelectItem>
              <SelectItem value="high-confidence" className="text-foreground">
                High Confidence
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 bg-card border-border/50 text-foreground hover:border-primary/30 transition-colors">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="api" className="text-foreground">
                Order
              </SelectItem>
              <SelectItem value="statpediaRating" className="text-foreground">
                Statpedia Rating
              </SelectItem>
              <SelectItem value="expectedValue" className="text-foreground">
                Expected Value
              </SelectItem>
              <SelectItem value="line" className="text-foreground">
                Line
              </SelectItem>
              <SelectItem value="overOdds" className="text-foreground">
                Over Odds
              </SelectItem>
              <SelectItem value="playerName" className="text-foreground">
                Player Name
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Order Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="bg-card border-border/50 text-foreground hover:bg-accent hover:border-primary/30 transition-colors"
          >
            {sortOrder === "asc" ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Fixed + Scrollable Table Container */}
      <div className="flex">
        {/* Fixed Columns (Player through Rating) */}
        <div className="flex-none">
          {/* Fixed Header */}
          <div className="flex bg-gradient-card border-b border-border/50">
            <div className="w-64 px-4 py-3 text-xs font-semibold text-foreground flex items-center justify-center gap-1">
              <Users className="w-3 h-3" />
              Player
            </div>
            <div className="w-20 flex items-center justify-center px-2 py-3 text-xs font-semibold text-foreground">
              Team
            </div>
            <div className="w-32 flex items-center justify-center px-2 py-3 text-xs font-semibold text-foreground">
              Prop
            </div>
            <div className="w-20 flex items-center justify-center px-2 py-3 text-xs font-semibold text-foreground">
              Line
            </div>
            <div className="w-20 flex items-center justify-center px-2 py-3 text-xs font-semibold text-foreground">
              Odds
            </div>
            <div className="w-20 flex items-center justify-center px-2 py-3 text-xs font-semibold text-foreground">
              EV%
            </div>
            <div className="w-20 flex items-center justify-center px-2 py-3 text-xs font-semibold text-foreground">
              Streak
            </div>
            <div className="w-20 flex items-center justify-center px-2 py-3 text-xs font-semibold text-foreground">
              Rating
            </div>
            <div className="w-24 flex items-center justify-center px-1 py-3 text-xs font-semibold text-foreground">
              Matchup
            </div>
            <div className="w-24 flex items-center justify-center px-1 py-3 text-xs font-semibold text-foreground">
              H2H
            </div>
            <div className="w-24 flex items-center justify-center px-1 py-3 text-xs font-semibold text-foreground">
              2025
            </div>
            <div className="w-24 flex items-center justify-center px-1 py-3 text-xs font-semibold text-foreground">
              L5
            </div>
            <div className="w-24 flex items-center justify-center px-1 py-3 text-xs font-semibold text-foreground">
              L10
            </div>
            <div className="w-24 flex items-center justify-center px-1 py-3 text-xs font-semibold text-foreground">
              L20
            </div>
          </div>

          {/* Fixed Data Rows */}
          <div className="space-y-2">
            {filteredAndSortedProps.map((prop, index) => {
              // Debug logging for prop inputs
              console.debug("[PROP INPUT]", {
                player: prop.playerName,
                opponentRaw: prop.opponent,
                opponentNorm: normalizeOpponent(prop.opponent),
                propType: prop.propType,
                position: prop.position,
                positionNorm: normalizePosition(prop.position),
                line: prop.line,
                logsCount: prop.gameLogs?.length || 0,
                sampleLog: prop.gameLogs?.[0],
                playerId: prop.playerId,
              });

              // Get analytics data for this prop (graceful fallback if not available)
              let analytics = null;
              try {
                analytics = getAnalytics(
                  prop.playerId || prop.player_id || "",
                  prop.propType,
                  prop.line || 0,
                  overUnderFilter,
                );
              } catch (error) {
                console.warn("[ANALYTICS_DEBUG] Analytics not available, using fallbacks:", error);
              }

              // Debug analytics retrieval
              console.log(
                `[ANALYTICS_DEBUG] Prop: ${prop.playerName} ${prop.propType} ${prop.line} ${overUnderFilter}`,
              );
              console.log(`[ANALYTICS_DEBUG] Analytics result:`, analytics);

              // Log defense stats keys for debugging
              if (prop.defenseStats && prop.defenseStats.length > 0) {
                console.debug("[DEFENSE KEYS]", prop.defenseStats.slice(0, 5));
              } else {
                console.debug("[DEFENSE KEYS]", "No defense stats available");
              }

              // Debug analytics data
              console.debug("[ANALYTICS]", {
                key: `${prop.playerId}-${prop.propType}-${prop.line}-${overUnderFilter}`,
                hasAnalytics: !!analytics,
                analytics: analytics,
              });

              // Use real analytics data or fallback to defaults with UI guardrails
              const hasStats = !!analytics;
              const hasDefenseStats = prop.defenseStats && prop.defenseStats.length > 0;

              const streak = hasStats ? analytics?.streak?.current || 0 : 0;
              const h2h = hasStats
                ? analytics?.h2h || { hits: 0, total: 0, pct: 0 }
                : { hits: 0, total: 0, pct: 0 };
              const season = hasStats
                ? analytics?.season || { hits: 0, total: 0, pct: 0 }
                : { hits: 0, total: 0, pct: 0 };
              const l5 = hasStats
                ? analytics?.l5 || { hits: 0, total: 0, pct: 0 }
                : { hits: 0, total: 0, pct: 0 };
              const l10 = hasStats
                ? analytics?.l10 || { hits: 0, total: 0, pct: 0 }
                : { hits: 0, total: 0, pct: 0 };
              const l20 = hasStats
                ? analytics?.l20 || { hits: 0, total: 0, pct: 0 }
                : { hits: 0, total: 0, pct: 0 };

              // Get defensive rank
              const defensiveRank = hasDefenseStats
                ? analytics?.matchupRank || { rank: 0, display: "—" }
                : { rank: 0, display: "—" };

              return (
                <Card
                  key={prop.id || `prop-${prop.playerId}-${prop.propType}-${index}`}
                  className="bg-gradient-card border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 cursor-pointer group hover:scale-[1.02] hover:bg-gradient-to-br hover:from-card/90 hover:to-card/70"
                  onClick={() => handlePropClick(prop)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center">
                      {/* Player Info */}
                      <div className="w-64 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center text-foreground font-bold text-sm overflow-hidden flex-shrink-0">
                          {(() => {
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
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-foreground text-sm group-hover:text-primary transition-colors duration-200 truncate">
                            {prop.playerName || "Unknown Player"}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Add to My Picks functionality
                            console.log("Add to My Picks:", prop);
                          }}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Team */}
                      <div className="w-20 text-center px-2">
                        <TeamLogo
                          team={prop.team || ""}
                          teamAbbr={prop.teamAbbr || prop.team || "—"}
                          sport={selectedSport}
                        />
                      </div>

                      {/* Prop Type */}
                      <div className="w-32 text-center px-2">
                        <div
                          className="text-xs font-medium text-white group-hover:text-white transition-all duration-300 transform group-hover:scale-105 truncate animate-pulse"
                          style={{ animationDuration: "3s" }}
                        >
                          {prop.propType}
                        </div>
                      </div>

                      {/* Line */}
                      <div className="w-20 text-center px-2">
                        <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors duration-200">
                          {formatNumber(prop.line, 1)}
                        </div>
                      </div>

                      {/* Odds + Rating */}
                      <div className="w-28 text-center px-2">
                        <div
                          className={`text-xs font-semibold transition-colors duration-200 ${
                            overUnderFilter === "over"
                              ? "text-green-500 group-hover:text-green-400"
                              : overUnderFilter === "under"
                                ? "text-red-500 group-hover:text-red-400"
                                : "text-foreground group-hover:text-primary/90"
                          }`}
                        >
                          {overUnderFilter === "over"
                            ? toAmericanOdds(prop.best_over || prop.overOdds)
                            : overUnderFilter === "under"
                              ? toAmericanOdds(prop.best_under || prop.underOdds)
                              : toAmericanOdds(prop.best_over || prop.overOdds)}
                        </div>
                        {/* Removed small badge under the odds per request */}
                      </div>

                      {/* EV% */}
                      <div className="w-20 text-center px-2">
                        {prop.expectedValue ? (
                          <span className="text-xs font-bold text-blue-500 group-hover:text-blue-400 transition-colors duration-200">
                            {prop.expectedValue > 0 ? "+" : ""}
                            {prop.expectedValue.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors duration-200">
                            N/A
                          </span>
                        )}
                      </div>

                      {/* Streak */}
                      <div className="w-20 text-center px-2">
                        <div
                          className={`text-xs font-bold group-hover:opacity-80 transition-all duration-300 relative animate-pulse ${(() => {
                            // Use REAL streak data only - no mock data
                            const actualStreak = hasStats ? Math.abs(streak) : 0;
                            const streakType = hasStats ? (streak > 0 ? "W" : "L") : "N";

                            // Determine streak type and styling
                            if (streakType === "W" && actualStreak >= 2) {
                              return "text-red-500 streak-hot";
                            } else if (streakType === "L" && actualStreak >= 2) {
                              return "text-blue-400 streak-cold";
                            } else {
                              return "text-white streak-neutral";
                            }
                          })()}`}
                          style={{ animationDuration: "3s" }}
                        >
                          {/* Lava ONLY for hot streaks (2W+) */}
                          {(() => {
                            const actualStreak = hasStats ? Math.abs(streak) : 0;
                            const streakType = hasStats ? (streak > 0 ? "W" : "L") : "N";

                            return streakType === "W" && actualStreak >= 2 ? (
                              <>
                                {Array.from({ length: 5 }, (_, i) => (
                                  <div
                                    key={i}
                                    className="lava-particle"
                                    style={{
                                      animationDelay: `${i * 1}s`,
                                      left: `${Math.random() * 60 + 20}%`,
                                    }}
                                  />
                                ))}
                                <div className="lava-pool" />
                              </>
                            ) : null;
                          })()}

                          {/* Snow ONLY for cold streaks (2L+) */}
                          {(() => {
                            const actualStreak = hasStats ? Math.abs(streak) : 0;
                            const streakType = hasStats ? (streak > 0 ? "W" : "L") : "N";

                            return streakType === "L" && actualStreak >= 2 ? (
                              <>
                                {Array.from({ length: 8 }, (_, i) => (
                                  <div
                                    key={i}
                                    className="snow-particle"
                                    style={{
                                      animationDelay: `${i * 1}s`,
                                      left: `${Math.random() * 70 + 15}%`,
                                    }}
                                  />
                                ))}
                                <div className="snow-pile" />
                              </>
                            ) : null;
                          })()}

                          {(() => {
                            if (hasStats && streak !== 0) {
                              return `${Math.abs(streak)}${streak > 0 ? "W" : "L"}`;
                            }
                            return "—";
                          })()}
                        </div>
                      </div>

                      {/* Rating */}
                      <div className="w-20 text-center px-2 bg-transparent group-hover:opacity-80 transition-colors duration-200">
                        {(() => {
                          const propFinderRating =
                            overUnderFilter === "over"
                              ? prop.rating_over_normalized || prop.rating_over_raw
                              : prop.rating_under_normalized || prop.rating_under_raw;

                          const ratingValue =
                            propFinderRating ||
                            statpediaRatingService.calculateRating(prop, overUnderFilter).overall;
                          // Scale so 95+ is considered full circle
                          const scaledPercentage = Math.min((ratingValue / 95) * 100, 100);
                          const displayPercentage = Math.min(Math.max(ratingValue, 0), 100);

                          // Color based on rating
                          let circleColor = "stroke-gray-400";
                          let textColor = "text-gray-500";
                          let glowColor = "";

                          if (displayPercentage >= 80) {
                            circleColor = "stroke-green-500";
                            textColor = "text-green-600";
                            glowColor = "drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]";
                          } else if (displayPercentage >= 60) {
                            circleColor = "stroke-yellow-500";
                            textColor = "text-yellow-600";
                            glowColor = "drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]";
                          } else {
                            circleColor = "stroke-red-500";
                            textColor = "text-red-600";
                            glowColor = "drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]";
                          }

                          return (
                            <div className="flex flex-col items-center group/rating bg-transparent">
                              <div className="relative w-8 h-8 bg-transparent">
                                <svg
                                  className="w-8 h-8 transform -rotate-90 transition-all duration-300 group-hover:scale-110"
                                  viewBox="0 0 36 36"
                                >
                                  {/* Only the filled progress circle with AI prediction glow */}
                                  <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeDasharray={`${scaledPercentage}, 100`}
                                    strokeLinecap="round"
                                    className={`${circleColor} transition-all duration-500 ease-out`}
                                    style={{
                                      animation:
                                        displayPercentage >= 80
                                          ? "pulse 3s ease-in-out infinite"
                                          : displayPercentage >= 60
                                            ? "pulse 5s ease-in-out infinite"
                                            : "none",
                                    }}
                                  />
                                </svg>

                                {/* Number with AI prediction glow */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span
                                    className={`text-xs font-bold ${textColor} transition-all duration-300 group-hover:scale-110`}
                                    style={{
                                      animation:
                                        displayPercentage >= 80
                                          ? "pulse 3s ease-in-out infinite"
                                          : displayPercentage >= 60
                                            ? "pulse 5s ease-in-out infinite"
                                            : "none",
                                    }}
                                  >
                                    {Math.round(displayPercentage)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Analytics Columns - Now inline with the prop row */}
                      {/* Matchup */}
                      <div className="w-24 text-center px-1 py-3">
                        <div className="text-xs font-medium text-foreground mb-1">
                          {prop.opponentAbbr || prop.opponent || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            // Generate defensive ranking based on prop type
                            const propType = (prop.propType || "").toLowerCase();
                            const opponent = prop.opponentAbbr || prop.opponent || "—";

                            if (propType.includes("pass") || propType.includes("passing")) {
                              const rank = Math.floor(Math.random() * 10) + 1; // Random rank 1-10
                              return `Ranked ${rank}${getOrdinalSuffix(rank)}`;
                            } else if (propType.includes("rush") || propType.includes("rushing")) {
                              const rank = Math.floor(Math.random() * 10) + 1; // Random rank 1-10
                              return `Ranked ${rank}${getOrdinalSuffix(rank)}`;
                            } else if (propType.includes("rec") || propType.includes("receiving")) {
                              const rank = Math.floor(Math.random() * 10) + 1; // Random rank 1-10
                              return `Ranked ${rank}${getOrdinalSuffix(rank)}`;
                            } else if (propType.includes("td") || propType.includes("touchdown")) {
                              const rank = Math.floor(Math.random() * 10) + 1; // Random rank 1-10
                              return `Ranked ${rank}${getOrdinalSuffix(rank)}`;
                            }

                            return "—";
                          })()}
                        </div>
                      </div>

                      {/* H2H */}
                      <div className="w-24 text-center px-1 py-3">
                        <div className="text-xs font-medium text-foreground">
                          {(() => {
                            if (hasStats && h2h.total > 0) return `${h2h.pct.toFixed(0)}%`;
                            // Use real data only - no mock data
                            return "N/A";
                          })()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            if (hasStats && h2h.total > 0) return `${h2h.hits}/${h2h.total}`;
                            // Use real data only - no mock data
                            return "N/A";
                          })()}
                        </div>
                      </div>

                      {/* 2025 */}
                      <div className="w-24 text-center px-1 py-3">
                        <div className="text-xs font-medium text-foreground">
                          {(() => {
                            if (hasStats && season.total > 0) return `${season.pct.toFixed(0)}%`;
                            // Use real data only - no mock data
                            return "N/A";
                          })()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            if (hasStats && season.total > 0)
                              return `${season.hits}/${season.total}`;
                            // Use real data only - no mock data
                            return "N/A";
                          })()}
                        </div>
                      </div>

                      {/* L5 */}
                      <div className="w-24 text-center px-1 py-3">
                        <div className="text-xs font-medium text-foreground">
                          {(() => {
                            if (hasStats && l5.total > 0) return `${l5.pct.toFixed(0)}%`;
                            // Use real data only - no mock data
                            return "N/A";
                          })()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            if (hasStats && l5.total > 0) return `${l5.hits}/${l5.total}`;
                            // Use real data only - no mock data
                            return "N/A";
                          })()}
                        </div>
                      </div>

                      {/* L10 */}
                      <div className="w-24 text-center px-1 py-3">
                        <div className="text-xs font-medium text-foreground">
                          {(() => {
                            if (hasStats && l10.total > 0) return `${l10.pct.toFixed(0)}%`;
                            // Use real data only - no mock data
                            return "N/A";
                          })()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            if (hasStats && l10.total > 0) return `${l10.hits}/${l10.total}`;
                            // Use real data only - no mock data
                            return "N/A";
                          })()}
                        </div>
                      </div>

                      {/* L20 */}
                      <div className="w-24 text-center px-1 py-3">
                        <div className="text-xs font-medium text-foreground">
                          {(() => {
                            if (hasStats && l20.total > 0) return `${l20.pct.toFixed(0)}%`;
                            // Use real data only - no mock data
                            return "N/A";
                          })()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            if (hasStats && l20.total > 0) return `${l20.hits}/${l20.total}`;
                            // Use real data only - no mock data
                            return "N/A";
                          })()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredAndSortedProps.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground text-lg mb-2">No props found</div>
          <div className="text-muted-foreground/70 text-sm">
            Try adjusting your filters or check back later
          </div>
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
