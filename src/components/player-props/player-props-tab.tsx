import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { SubscriptionOverlay } from "@/components/ui/subscription-overlay";
import { PlayerPropCard3D } from "./3d-player-prop-card";
import { PlayerPropsColumnView } from "./player-props-column-view";
import { EnhancedAnalysisOverlay } from "../predictions/enhanced-analysis-overlay";
import { PlayerPropCardAd } from "@/components/ads/ad-placements";
import { validateHeadshots } from "@/utils/validateHeadshots";
import {
  logAPI,
  logState,
  logFilter,
  logSuccess,
  logError,
  logWarning,
  logInfo,
  logDebug,
} from "@/utils/console-logger";
import { AdvancedPredictionDisplay } from "@/components/advanced-prediction-display";
import {
  advancedPredictionService,
  ComprehensivePrediction,
} from "@/services/advanced-prediction-service";
import { evCalculatorService } from "@/services/ev-calculator";
import { statpediaRatingService } from "@/services/statpedia-rating-service";
import { formatAmericanOdds } from "@/utils/odds-utils";
import { AnalyticsIntegration } from "./analytics-integration";

// League-aware priority helpers for consistent ordering
function getPriority(marketType: string): number {
  const m = (marketType || "").toLowerCase();

  // Always last
  if (m.includes("touchdown")) return 99;

  // Offense first
  if (m.includes("passing") || m.includes("rushing") || m.includes("receiving")) return 1;

  // Kicking next
  if (m.includes("field goal") || m.includes("kicking")) return 2;

  // Defense props are filtered out, but keep this for completeness
  if (
    m.includes("defense") ||
    m.includes("tackle") ||
    m.includes("sack") ||
    m.includes("interception")
  )
    return 4;

  // Middle default
  return 50;
}

// Tie-breaker within offense: Passing -> Rushing -> Receiving
function offenseSubOrder(marketType: string): number {
  const m = (marketType || "").toLowerCase();
  if (m.includes("passing")) return 1;
  if (m.includes("rushing")) return 2;
  if (m.includes("receiving")) return 3;
  return 9;
}

// PropFinder-style dual rating system
// Use the new Statpedia rating system
const computeRating = (prop: any, mode: "over" | "under"): number => {
  const rating = statpediaRatingService.calculateRating(prop, mode);
  return rating.overall;
};

// Compute both over and under ratings for a prop
const computeDualRatings = (prop: any) => {
  return {
    rating_over_raw: computeRating(prop, "over"),
    rating_under_raw: computeRating(prop, "under"),
  };
};

// Normalize ratings across the slate (PropFinder-style)
const normalizeSlateRatings = (props: any[], mode: "over" | "under") => {
  const ratings = props.map((prop) =>
    mode === "over" ? prop.rating_over_raw : prop.rating_under_raw,
  );

  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);
  const range = maxRating - minRating;

  // Target range: 40-95 (never 100 to maintain credibility)
  const targetMin = 40;
  const targetMax = 95;
  const targetRange = targetMax - targetMin;

  return props.map((prop) => {
    const rawRating = mode === "over" ? prop.rating_over_raw : prop.rating_under_raw;

    // Normalize to 0-1, then scale to target range
    const normalized = range > 0 ? (rawRating - minRating) / range : 0.5;
    const scaledRating = targetMin + normalized * targetRange;

    return {
      ...prop,
      [`rating_${mode}_normalized`]: Math.round(scaledRating),
    };
  });
};

// Sort props by mode-specific rating
const sortPropsByMode = (props: any[], mode: "over" | "under") => {
  return [...props].sort((a, b) => {
    const ra = a[`rating_${mode}_normalized`] || 0;
    const rb = b[`rating_${mode}_normalized`] || 0;
    return rb - ra; // Highest first
  });
};

// Helper function to get prop priority with normalized matching (matches backend)
const getPropPriorityNormalized = (propType: string): number => {
  if (!propType) return 99;

  const normalized = propType.toLowerCase().trim();

  // Broad touchdown detection (regardless of exact wording)
  if (normalized.includes("touchdown")) {
    return 3;
  }

  // Offensive props (passing, rushing, receiving)
  if (
    normalized.includes("passing") ||
    normalized.includes("rushing") ||
    normalized.includes("receiving")
  ) {
    return 1;
  }

  // Kicking props
  if (
    normalized.includes("field goal") ||
    normalized.includes("kicking") ||
    normalized.includes("extra point")
  ) {
    return 2;
  }

  // Defense props
  if (
    normalized.includes("defense") ||
    normalized.includes("sack") ||
    normalized.includes("tackle") ||
    normalized.includes("interception")
  ) {
    return 4;
  }

  // Default to low priority
  return 99;
};

// Helper function to get offensive sub-order for tie-breaking (matches backend)
const getOffensiveSubOrder = (propType: string): number => {
  if (!propType) return 3;

  const normalized = propType.toLowerCase();

  // Passing props first
  if (normalized.includes("passing")) return 1;

  // Rushing props second
  if (normalized.includes("rushing")) return 2;

  // Receiving props third
  if (normalized.includes("receiving")) return 3;

  // Other offensive props
  if (
    normalized.includes("points") ||
    normalized.includes("goals") ||
    normalized.includes("assists")
  )
    return 4;

  // Non-offensive props
  return 5;
};

// Helper function to determine if a prop is offensive
const isOffensiveProp = (propType: string): boolean => {
  if (!propType) return false;
  const lowerPropType = propType.toLowerCase();
  return (
    lowerPropType.includes("passing") ||
    lowerPropType.includes("rushing") ||
    lowerPropType.includes("receiving") ||
    lowerPropType.includes("points") ||
    lowerPropType.includes("goals") ||
    lowerPropType.includes("assists")
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

// Fallback team logo mapping (will be replaced by API data)
const logoByTeam: Record<string, string> = {
  // This will be populated dynamically from the API response
  // Keep some fallbacks for teams not in our database
};

// Utility function for compact time formatting
const formatCompactTime = (gameTime: string, gameDate: string) => {
  try {
    // Handle both separate gameTime/gameDate and combined gameTime
    let dateToFormat: Date;

    if (gameTime && gameTime.includes("T")) {
      // gameTime is a full ISO string
      dateToFormat = new Date(gameTime);
    } else if (gameDate && gameTime) {
      // Separate date and time - combine them properly
      const combinedDateTime = gameDate.includes("T") ? gameDate : `${gameDate}T${gameTime}`;
      dateToFormat = new Date(combinedDateTime);
    } else if (gameDate) {
      // Only date available
      dateToFormat = new Date(gameDate);
    } else {
      return "TBD";
    }

    // Check if date is valid
    if (isNaN(dateToFormat.getTime())) {
      return "TBD";
    }

    // Format date as M/D (e.g., "12/25")
    const dateStr = `${dateToFormat.getMonth() + 1}/${dateToFormat.getDate()}`;

    // Format time as H:MM AM/PM (e.g., "2:30 PM")
    const timeStr = dateToFormat.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${dateStr} ${timeStr}`;
  } catch (error) {
    return "TBD";
  }
};

// Data: use local API endpoints for normalized player props with best odds
import { apiFetch } from "@/lib/api";
import { useAuthHeaders } from "@/contexts/AuthContext";
import type { PlayerPropNormalized } from "@/hooks/use-player-props";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  TrendingUp,
  Search,
  Filter,
  Eye,
  EyeOff,
  BarChart3,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
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
  Upload,
  Activity,
  Zap,
} from "lucide-react";
// Removed sportsDataIOAPI imports - now using SportsRadar API exclusively
import { useToast } from "@/hooks/use-toast";
import { useAccess } from "@/hooks/use-access";
import { analyticsClient } from "@/lib/analytics-client";
import { cn } from "@/lib/utils";

interface PlayerPropsTabProps {
  selectedSport: string;
}

// Interface that matches the actual API response
interface APIPlayerProp {
  id: string;
  playerId: string;
  playerName: string;
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
  gameDate: string;
  gameTime: string;
  availableSportsbooks?: string[];
  allSportsbookOdds?: any[];
  available?: boolean;
  awayTeam?: string;
  homeTeam?: string;
  betType?: string;
  isExactAPIData?: boolean;
  lastUpdate?: string;
  market?: string;
  marketName?: string;
  outcome?: string;
  period?: string;
  statEntity?: string;
  aiPrediction?: any;
  recentForm?: any;
  position?: string;
  hitRate?: number;
  injuryStatus?: string;
  restDays?: number;
}

type ConsistentPlayerProp = PlayerProp;

interface PlayerProp {
  id: string;
  playerId: string;
  playerName: string;
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
  gameDate: string;
  gameTime: string;
  confidence?: number;
  expectedValue?: number;
  aiRating?: number;
  recommendation?: "strong_bet" | "good_bet" | "neutral" | "avoid" | "strong_avoid";
  recentForm?: string;
  last5Games?: number[];
  seasonStats?: {
    average: number;
    median: number;
    gamesPlayed: number;
    hitRate: number;
    last5Games: number[];
    seasonHigh: number;
    seasonLow: number;
  };
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
  historicalTrends?: string;
  // Additional properties from API
  availableSportsbooks?: string[];
  allSportsbookOdds?: any[];
  available?: boolean;
  awayTeam?: string;
  homeTeam?: string;
  betType?: string;
  isExactAPIData?: boolean;
  lastUpdate?: string;
  market?: string;
  marketName?: string;
  outcome?: string;
  period?: string;
  statEntity?: string;
  keyInsights?: string[];
  confidenceFactors?: any[];
  marketId?: string;
  // Team logos
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  // Position (derived from prop type or player data)
  position?: string;
}

interface MyPick {
  id: string;
  prop: PlayerProp;
  prediction: "over" | "under";
  confidence: number;
  addedAt: string;
}

export const PlayerPropsTab: React.FC<PlayerPropsTabProps> = ({ selectedSport }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const access = useAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const authHeaders = useAuthHeaders();

  // Check if user is subscribed - do this early to avoid hooks issues
  // Owner role bypasses ALL subscription restrictions
  const isSubscribed = access.can("analytics").allowed;

  // Debug logging to see what values we're getting
  console.log("PlayerPropsTab Debug:", {
    role: access.role,
    subscription: access.subscription,
    isSubscribed,
  });

  useEffect(() => {
    if (!isSubscribed) {
      analyticsClient.trackEvent("access_denied", {
        area: "player-props",
        feature: "analytics",
        reason: "Pro required",
        needed: "pro",
        role: access.role,
        subscription: access.subscription,
      });
      toast({
        title: "Locked content",
        description: "Upgrade to Pro to unlock Player Props.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubscribed]);

  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [sportFilter, setSportFilter] = useState(selectedSport || "nfl");
  const [propTypeFilter, setPropTypeFilter] = useState("all");
  const [selectedProps, setSelectedProps] = useState<string[]>([]);
  const [realProps, setRealProps] = useState<ConsistentPlayerProp[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [myPicks, setMyPicks] = useState<MyPick[]>([]);
  const [showMyPicks, setShowMyPicks] = useState(false);
  const [selectedPropForEnhancedAnalysis, setSelectedPropForEnhancedAnalysis] =
    useState<PlayerProp | null>(null);
  const [showEnhancedAnalysis, setShowEnhancedAnalysis] = useState(false);
  const [selectedPropForAdvancedAnalysis, setSelectedPropForAdvancedAnalysis] =
    useState<PlayerProp | null>(null);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);
  const [advancedPrediction, setAdvancedPrediction] = useState<ComprehensivePrediction | null>(
    null,
  );
  const [isGeneratingAdvancedPrediction, setIsGeneratingAdvancedPrediction] = useState(false);
  const [sortBy, setSortBy] = useState<
    "statpediaRating" | "ev" | "line" | "player" | "api" | "order" | "pickRate" | "evPercent"
  >("api");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [minConfidence, setMinConfidence] = useState(0);
  const [minEV, setMinEV] = useState(0);
  const [showOnlyPositiveEV, setShowOnlyPositiveEV] = useState(false);
  const [minLine, setMinLine] = useState(0);
  const [maxLine, setMaxLine] = useState(1000);
  const [showSelection, setShowSelection] = useState(false);
  const [viewMode, setViewMode] = useState<"column" | "cards">("column");
  const [overUnderFilter, setOverUnderFilter] = useState<"over" | "under" | "both">("over");

  // Handle view parameter from URL
  useEffect(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "compact") {
      setViewMode("column");
    } else if (viewParam === "cards") {
      setViewMode("cards");
    }
  }, [searchParams]);
  const [selectedSportsbook, setSelectedSportsbook] = useState<string>("all");
  const [availableSportsbooks, setAvailableSportsbooks] = useState<
    { key: string; title: string; lastUpdate: string }[]
  >([]);

  // Odds range filter state
  const [minOdds, setMinOdds] = useState(-175);
  const [maxOdds, setMaxOdds] = useState(500);
  const [useOddsFilter, setUseOddsFilter] = useState(false);

  // Memoize today's date to prevent constant re-renders in analytics
  const todayDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Prevent repeated auto-relax across a session
  const autoRelaxedRef = useRef(false);

  // Filter presets
  const filterPresets = {
    "high-confidence": {
      minConfidence: 70,
      minEV: 5,
      showOnlyPositiveEV: true,
      name: "High Confidence",
    },
    "value-plays": { minConfidence: 50, minEV: 10, showOnlyPositiveEV: true, name: "Value Plays" },
    conservative: { minConfidence: 80, minEV: 0, showOnlyPositiveEV: false, name: "Conservative" },
    aggressive: { minConfidence: 40, minEV: 15, showOnlyPositiveEV: true, name: "Aggressive" },
    all: { minConfidence: 0, minEV: 0, showOnlyPositiveEV: false, name: "Show All" },
  };

  // Load available sportsbooks for the selected sport
  const loadAvailableSportsbooks = useCallback(async (sport: string) => {
    try {
      // Create list of real sportsbooks using official SportsGameOdds API bookmaker IDs
      const sportsbooks = [
        { key: "all", title: "All Sportsbooks", lastUpdate: new Date().toISOString() },
        { key: "fanduel", title: "FanDuel", lastUpdate: new Date().toISOString() },
        { key: "draftkings", title: "Draft Kings", lastUpdate: new Date().toISOString() },
        { key: "betmgm", title: "BetMGM", lastUpdate: new Date().toISOString() },
        { key: "caesars", title: "Caesars", lastUpdate: new Date().toISOString() },
        { key: "pointsbet", title: "PointsBet", lastUpdate: new Date().toISOString() },
        { key: "betrivers", title: "BetRivers", lastUpdate: new Date().toISOString() },
        { key: "foxbet", title: "FOX Bet", lastUpdate: new Date().toISOString() },
        { key: "bet365", title: "bet365", lastUpdate: new Date().toISOString() },
        { key: "williamhill", title: "William Hill", lastUpdate: new Date().toISOString() },
        { key: "pinnacle", title: "Pinnacle", lastUpdate: new Date().toISOString() },
        { key: "bovada", title: "Bovada", lastUpdate: new Date().toISOString() },
        { key: "betonline", title: "BetOnline", lastUpdate: new Date().toISOString() },
        { key: "betway", title: "Betway", lastUpdate: new Date().toISOString() },
        { key: "unibet", title: "Unibet", lastUpdate: new Date().toISOString() },
        { key: "ladbrokes", title: "Ladbrokes", lastUpdate: new Date().toISOString() },
        { key: "coral", title: "Coral", lastUpdate: new Date().toISOString() },
        { key: "paddypower", title: "Paddy Power", lastUpdate: new Date().toISOString() },
        { key: "skybet", title: "Sky Bet", lastUpdate: new Date().toISOString() },
        { key: "boylesports", title: "BoyleSports", lastUpdate: new Date().toISOString() },
        { key: "betfair", title: "Betfair", lastUpdate: new Date().toISOString() },
        { key: "betvictor", title: "Bet Victor", lastUpdate: new Date().toISOString() },
        { key: "betfred", title: "Betfred", lastUpdate: new Date().toISOString() },
      ];
      setAvailableSportsbooks(sportsbooks);
      logSuccess(
        "PlayerPropsTab",
        `Loaded ${sportsbooks.length} available sportsbooks for ${sport}`,
      );
    } catch (error) {
      logError("PlayerPropsTab", `Failed to load sportsbooks for ${sport}:`, error);
    }
  }, []);

  // Load player props - via local API (/api/props) with normalized offers and best odds
  const isFetchingPropsRef = useRef(false);

  const loadPlayerProps = useCallback(
    async (sport: string) => {
      // Prevent overlapping refreshes that cause UI churn
      if (isFetchingPropsRef.current) {
        logDebug("PlayerPropsTab", `Skipping load – fetch already in progress for ${sport}`);
        return;
      }
      isFetchingPropsRef.current = true;
      if (!sport) {
        logWarning("PlayerPropsTab", "No sport provided to loadPlayerProps");
        isFetchingPropsRef.current = false;
        return;
      }

      logState("PlayerPropsTab", `Starting to load player props for ${sport}`);
      logState("PlayerPropsTab", `Force refresh at ${new Date().toISOString()}`);
      logDebug("PlayerPropsTab", `Current realProps length before load: ${realProps.length}`);

      setIsLoadingData(true);
      setRealProps([]); // Clear data

      try {
        logAPI("PlayerPropsTab", `GET /api/props?sport=${sport} (normalized)`);
        const resp = await apiFetch(`/api/props?sport=${encodeURIComponent(sport)}&limit=500`, {
          headers: authHeaders,
        });
        const payload = await resp.json();
        if (!resp.ok || !payload?.success) {
          throw new Error(payload?.error || `Failed to load props for ${sport}`);
        }
        const result: PlayerPropNormalized[] = payload.items || [];
        logAPI("PlayerPropsTab", `Local API returned ${result?.length || 0} props`);
        console.log("🔍 [API_DEBUG] API result:", result);

        // 🔍 COMPREHENSIVE FRONTEND DEBUG LOGGING
        if (result && result.length > 0) {
          console.log(`\n🎯 FRONTEND PLAYER PROPS ANALYSIS:`);
          console.log(`📊 Props Received: ${result.length}`);
          console.log(`📝 First 10 Props (Priority Order):`);
          result.slice(0, 10).forEach((prop: any, index) => {
            console.log(`${index + 1}. ${prop.propType} - ${prop.playerName}`);
          });

          // Analyze the first prop in detail
          const firstProp = (result as unknown as PlayerPropNormalized[])[0];
          console.log(`\n🔍 DETAILED FIRST PROP ANALYSIS:`);
          console.log(`📋 All Keys:`, Object.keys(firstProp));
          console.log(`🏠 Team Data:`, {
            team: firstProp.team,
            opponent: firstProp.opponent,
            teamAbbr: "UNK",
            opponentAbbr: "UNK",
            gameId: firstProp.gameId,
            gameDate: firstProp.startTime,
          });
          console.log(`💰 Odds Data:`, {
            overOdds: firstProp.best_over?.odds,
            underOdds: firstProp.best_under?.odds,
            line: firstProp.line,
            availableSportsbooks: (firstProp.offers || []).map((o) => o.book),
            allSportsbookOddsCount: firstProp.offers?.length || 0,
          });
          console.log(`👤 Player Data:`, {
            playerName: firstProp.playerName,
            playerId: firstProp.playerId,
            propType: firstProp.propType,
            sport: firstProp.sport,
          });

          logDebug(
            "PlayerPropsTab",
            `Comprehensive analysis complete. Check console for full details.`,
          );
        } else {
          logError("PlayerPropsTab", "NO PROPS RETURNED FROM API");
        }

        if (result && Array.isArray(result) && result.length > 0) {
          logSuccess("PlayerPropsTab", `Setting ${result.length} normalized props for ${sport}`);
          logDebug("PlayerPropsTab", "Normalized props sample:", result.slice(0, 2));

          // Transform API normalized props to the expected UI format
          const toAbbr = (val?: string) => {
            if (!val) return "UNK";
            const s = String(val).trim();
            if (!s) return "UNK";
            if (/^[A-Za-z]{2,4}$/.test(s)) return s.toUpperCase();
            const parts = s.split(/\s+/).filter(Boolean);
            if (parts.length >= 2) return parts.map((w) => w[0]).join("").slice(0, 3).toUpperCase();
            return s.substring(0, 3).toUpperCase();
          };

          const transformedProps = result.map((prop, index) => {
            const offers = prop.offers || [];
            const overOdds =
              prop.best_over?.odds ??
              offers.reduce((acc, o) => (o.overOdds != null ? o.overOdds : acc), 0);
            const underOdds =
              prop.best_under?.odds ??
              offers.reduce((acc, o) => (o.underOdds != null ? o.underOdds : acc), 0);
            const edgeOver =
              typeof prop.best_over?.edgePct === "number" ? prop.best_over!.edgePct! : 0;
            const edgeUnder =
              typeof prop.best_under?.edgePct === "number" ? prop.best_under!.edgePct! : 0;
            const bestEdgePct = Math.max(edgeOver, edgeUnder);
            return {
              id: prop.id,
              playerId: prop.playerId || "",
              player_id: prop.playerId || "",
              playerName: prop.playerName || "Unknown Player",
              player_name: prop.playerName || "Unknown Player",
              team: prop.team || "UNK",
              teamAbbr: toAbbr(prop.team),
              opponent: prop.opponent || "UNK",
              opponentAbbr: toAbbr(prop.opponent),
              gameId: prop.gameId,
              sport: prop.sport,
              propType: prop.propType,
              line: prop.line,
              overOdds: typeof overOdds === "number" ? overOdds : 0,
              underOdds: typeof underOdds === "number" ? underOdds : 0,
              gameDate: prop.startTime || new Date().toISOString(),
              gameTime: prop.startTime || new Date().toISOString(),
              // expose best book odds for UI rendering
              best_over: prop.best_over?.odds,
              best_under: prop.best_under?.odds,
              // basic EV proxy from best edge vs average price; convert % to 0-1
              expectedValue: Number.isFinite(bestEdgePct)
                ? Math.max(-1, Math.min(1, bestEdgePct / 100))
                : 0,
              confidence: Number.isFinite(bestEdgePct)
                ? Math.max(0, Math.min(1, (bestEdgePct + 20) / 120))
                : 0.5,
              // books display
              availableSportsbooks: offers.map((o) => o.book),
              allSportsbookOdds: offers.map((o) => ({
                sportsbook: o.book,
                overOdds: o.overOdds,
                underOdds: o.underOdds,
                deeplink: o.deeplink,
              })),
              originalIndex: index,
            } as any;
          });

          // Sort by original index to preserve API order
          const sortedPropsWithEV = transformedProps.sort(
            (a, b) => (a.originalIndex || 0) - (b.originalIndex || 0),
          );

          // Debug: Log the first 10 props to verify order
          console.log("🎯 PRIORITY ORDER DEBUG - First 10 props after EV calculation:");
          sortedPropsWithEV.slice(0, 10).forEach((prop: any, index) => {
            console.log(
              `${index + 1}. ${prop.propType} - ${prop.playerName} (originalIndex: ${prop.originalIndex})`,
            );
          });

          // Set all props at once (no pagination)
          console.log(
            "🔍 [PROPS_DEBUG] Setting realProps with:",
            sortedPropsWithEV.length,
            "props",
          );
          setRealProps(sortedPropsWithEV as PlayerProp[]);

          // Validate headshot player ID matches
          validateHeadshots(sortedPropsWithEV as any[]);

          // Log success to console (visible in dev console)
          logSuccess(
            "PlayerPropsTab",
            `Player Props Loaded: Found ${result.length} server-side cached props for ${sport.toUpperCase()} with exact sportsbook odds`,
          );
        } else {
          logWarning("PlayerPropsTab", "Backend API returned no valid props", result);
          setRealProps([]);
          toast({
            title: "No Data",
            description: `No player props available for ${sport.toUpperCase()}`,
            variant: "destructive",
          });
        }
      } catch (error) {
        logError("PlayerPropsTab", "Failed to load player props:", error);
        logError("PlayerPropsTab", "Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });

        toast({
          title: "Error",
          description: `Failed to load player props: ${error.message}`,
          variant: "destructive",
        });
        setRealProps([]);
      } finally {
        setIsLoadingData(false);
        logState("PlayerPropsTab", `Finished loading player props for ${sport}`);
        isFetchingPropsRef.current = false;
      }
    },
    [toast, authHeaders],
  );

  // Load saved filter preferences
  useEffect(() => {
    const savedFilters = localStorage.getItem(`player-props-filters-${sportFilter}`);
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        setMinConfidence(filters.minConfidence || 0);
        setMinEV(filters.minEV || 0);
        setShowOnlyPositiveEV(filters.showOnlyPositiveEV || false);
        setMinLine(filters.minLine || 0);
        setMaxLine(filters.maxLine || getMaxLineForSport(sportFilter));
        setPropTypeFilter(filters.propTypeFilter || "all");
        setSortBy(filters.sortBy || "api");
        setSortOrder(filters.sortOrder || "desc");
        setOverUnderFilter(filters.overUnderFilter || "over");
        setSelectedSportsbook(filters.selectedSportsbook || "all");
        setMinOdds(filters.minOdds || -175);
        setMaxOdds(filters.maxOdds || 500);
        setUseOddsFilter(filters.useOddsFilter !== undefined ? filters.useOddsFilter : true);
        logInfo("PlayerPropsTab", "Loaded saved filter preferences");
      } catch (error) {
        logError("PlayerPropsTab", "Failed to load saved filters:", error);
      }
    }
  }, [sportFilter]);

  // Save filter preferences
  const saveFilterPreferences = () => {
    const filters = {
      minConfidence,
      minEV,
      showOnlyPositiveEV,
      minLine,
      maxLine,
      propTypeFilter,
      sortBy,
      sortOrder,
      overUnderFilter,
      selectedSportsbook,
      minOdds,
      maxOdds,
      useOddsFilter,
    };
    localStorage.setItem(`player-props-filters-${sportFilter}`, JSON.stringify(filters));
    logInfo("PlayerPropsTab", "Saved filter preferences");
  };

  // Reset all filters to default
  const resetFilters = () => {
    setMinConfidence(0);
    setMinEV(0);
    setShowOnlyPositiveEV(false);
    setMinLine(0);
    setMaxLine(getMaxLineForSport(sportFilter));
    setPropTypeFilter("all");
    setSortBy("api");
    setSortOrder("desc");
    setOverUnderFilter("over");
    setSelectedSportsbook("all");
    setSearchQuery("");
    setMinOdds(-175);
    setMaxOdds(500);
    setUseOddsFilter(false);
    localStorage.removeItem(`player-props-filters-${sportFilter}`);
    toast({
      title: "Filters Reset",
      description: "All filters have been reset to default values.",
    });
    logInfo("PlayerPropsTab", "Reset all filters to default");
  };

  // Silent permissive reset (no toast) to avoid hidden props due to sticky local filters
  const silentPermissiveReset = (sport: string) => {
    setMinConfidence(0);
    setMinEV(0);
    setShowOnlyPositiveEV(false);
    setMinLine(0);
    setMaxLine(getMaxLineForSport(sport));
    setPropTypeFilter("all");
    setSortBy("api");
    setSortOrder("desc");
    setOverUnderFilter("over");
    setSelectedSportsbook("all");
    setSearchQuery("");
    setMinOdds(-175);
    setMaxOdds(500);
    setUseOddsFilter(false);
    localStorage.removeItem(`player-props-filters-${sport}`);
  };

  // Auto-reset restrictive filters on first load
  useEffect(() => {
    const hasResetFilters = localStorage.getItem(`player-props-auto-reset-${sportFilter}`);
    if (!hasResetFilters) {
      // Check if saved filters are too restrictive
      const savedFilters = localStorage.getItem(`player-props-filters-${sportFilter}`);
      if (savedFilters) {
        try {
          const filters = JSON.parse(savedFilters);
          const isRestrictive =
            filters.minConfidence > 70 ||
            filters.minEV > 10 ||
            filters.showOnlyPositiveEV === true ||
            filters.overUnderFilter === "over" ||
            filters.useOddsFilter === true;

          if (isRestrictive) {
            console.log("🔧 Auto-resetting restrictive filters for", sportFilter);
            resetFilters();
            localStorage.setItem(`player-props-auto-reset-${sportFilter}`, "true");
          }
        } catch (error) {
          // If filters are corrupted, reset them
          resetFilters();
          localStorage.setItem(`player-props-auto-reset-${sportFilter}`, "true");
        }
      }
    }
  }, [sportFilter]);

  // Apply filter preset
  const applyPreset = (presetKey: keyof typeof filterPresets) => {
    const preset = filterPresets[presetKey];
    setMinConfidence(preset.minConfidence);
    setMinEV(preset.minEV);
    setShowOnlyPositiveEV(preset.showOnlyPositiveEV);
    toast({
      title: "Filter Preset Applied",
      description: `Applied "${preset.name}" filter preset.`,
    });
    logInfo("PlayerPropsTab", `Applied filter preset: ${preset.name}`);
  };

  // Auto-save filters when they change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveFilterPreferences();
    }, 1000); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [
    minConfidence,
    minEV,
    showOnlyPositiveEV,
    minLine,
    maxLine,
    propTypeFilter,
    sortBy,
    sortOrder,
    selectedSportsbook,
    minOdds,
    maxOdds,
    useOddsFilter,
  ]);

  // Update sport filter when selectedSport changes (debounced one-shot)
  useEffect(() => {
    logState("PlayerPropsTab", `Sport changed: ${selectedSport}`);
    setSportFilter(selectedSport);
    if (!selectedSport) {
      logWarning("PlayerPropsTab", "No sport selected, skipping load");
      return;
    }
    autoRelaxedRef.current = false; // reset per league
    // Ensure permissive defaults when switching leagues so we see the full slate
    silentPermissiveReset(selectedSport);
    const t = setTimeout(() => {
      logState("PlayerPropsTab", `Initial load for sport: ${selectedSport}`);
      loadPlayerProps(selectedSport);
      loadAvailableSportsbooks(selectedSport);
    }, 50);
    return () => clearTimeout(t);
  }, [selectedSport]);

  // Optional: Do not auto-reload on sportsbook change to avoid constant refresh.
  // We filter/books at render from offers; reloading data is not necessary here.
  // If you want to force reload on explicit action, call loadPlayerProps manually.

  // Periodic auto-refresh (gentle): 10 minutes, only if not fetching
  useEffect(() => {
    if (!selectedSport) return;
    const interval = setInterval(
      () => {
        try {
          if (!isFetchingPropsRef.current) {
            logInfo("PlayerPropsTab", "Periodic refresh (10m)");
            loadPlayerProps(selectedSport);
          }
        } catch (error) {
          logError("PlayerPropsTab", "Error in periodic refresh:", error);
        }
      },
      10 * 60 * 1000,
    );
    return () => clearInterval(interval);
  }, [selectedSport, loadPlayerProps]);

  // Cleanup on unmount - backend handles updates automatically
  useEffect(() => {
    return () => {
      // Backend polling handles updates automatically, no cleanup needed
    };
  }, [sportFilter]);

  // Update max line when sport changes
  useEffect(() => {
    const newMaxLine = getMaxLineForSport(sportFilter);
    if (maxLine > newMaxLine) {
      setMaxLine(newMaxLine);
    }
    if (minLine > newMaxLine) {
      setMinLine(0);
    }
  }, [sportFilter, maxLine, minLine]);

  // Format numbers to be compact with .5 and .0 intervals for lines
  const formatNumber = (value: number, decimals: number = 1): string => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "N/A";
    // For lines, round to nearest .5 or .0 interval
    if (value < 1000) {
      // Assuming lines are typically under 1000
      const rounded = Math.round(value * 2) / 2;
      return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
    }

    // For larger numbers, use compact formatting
    if (value >= 1000000) {
      return (value / 1000000).toFixed(decimals) + "M";
    } else if (value >= 1000) {
      return (value / 1000).toFixed(decimals) + "K";
    } else if (value >= 100) {
      return value.toFixed(0);
    } else if (value >= 10) {
      return value.toFixed(1);
    } else {
      return value.toFixed(decimals);
    }
  };

  // Use shared odds utility for formatting
  const formatOdds = (odds: number): string => {
    if (
      odds === null ||
      odds === undefined ||
      !Number.isFinite(Number(odds)) ||
      Number(odds) === 0
    ) {
      return "N/A";
    }
    return formatAmericanOdds(odds);
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Debug realProps state
  logDebug("PlayerPropsTab", `Current realProps length: ${realProps.length}`);
  if (realProps.length > 0) {
    logDebug("PlayerPropsTab", "First realProp:", realProps[0]);
    logDebug("PlayerPropsTab", "First 3 props:", realProps.slice(0, 3));

    // Debug specific data fields
    const firstProp = realProps[0];
    logDebug("PlayerPropsTab", "First prop data check:", {
      playerName: firstProp.playerName,
      line: firstProp.line,
      overOdds: firstProp.overOdds,
      underOdds: firstProp.underOdds,
      confidence: firstProp.confidence,
      expectedValue: firstProp.expectedValue,
      propType: firstProp.propType,
    });
  } else {
    logWarning("PlayerPropsTab", "No realProps available");
  }

  // Only show sportsbook props - no Pick'em props
  const allProps = realProps;

  // Prime rating service with the current slate for normalization context
  try {
    statpediaRatingService.setSlateProps(allProps as any[]);
  } catch (e) {
    // non-fatal; proceed without slate priming
  }

  // PropFinder-style dual rating system
  const propsWithRatings = allProps.map((prop) => ({
    ...prop,
    ...computeDualRatings(prop),
  }));

  // Simplified filtering - much less restrictive
  const filteredProps = propsWithRatings.filter((prop) => {
    const matchesSearch =
      searchQuery === "" ||
      prop.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.propType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPropType =
      propTypeFilter === "all" ||
      prop.propType.replace(/_/g, " ").toLowerCase() === propTypeFilter.toLowerCase();
    const matchesConfidence = (prop.confidence || 0.5) >= minConfidence / 100;
    const matchesEV = (prop.expectedValue || 0) >= minEV / 100;
    const matchesPositiveEV = !showOnlyPositiveEV || (prop.expectedValue || 0) >= 0;
    const matchesLine = prop.line >= minLine && prop.line <= maxLine;

    // Odds range filter (default: -175 to +500)
    const overOdds = prop.overOdds || 0;
    const underOdds = prop.underOdds || 0;
    const matchesOddsRange =
      !useOddsFilter ||
      (overOdds >= minOdds && overOdds <= maxOdds) ||
      (underOdds >= minOdds && underOdds <= maxOdds);

    // Over/Under filter
    let matchesOverUnder = true; // Default to true
    if (overUnderFilter === "over") {
      matchesOverUnder = overOdds !== null && overOdds !== undefined && !isNaN(Number(overOdds));
    } else if (overUnderFilter === "under") {
      matchesOverUnder = underOdds !== null && underOdds !== undefined && !isNaN(Number(underOdds));
    }
    // If overUnderFilter === 'both', matchesOverUnder stays true (shows all props)

    const passes =
      matchesSearch &&
      matchesPropType &&
      matchesConfidence &&
      matchesEV &&
      matchesPositiveEV &&
      matchesLine &&
      matchesOddsRange &&
      matchesOverUnder;

    if (!passes && realProps.length < 10) {
      logFilter(
        "PlayerPropsTab",
        `Prop ${prop.playerName} filtered out: search=${matchesSearch}, type=${matchesPropType}, confidence=${matchesConfidence}, ev=${matchesEV}, positiveEV=${matchesPositiveEV}, line=${matchesLine}`,
      );
    }

    return passes;
  });

  // PropFinder-style sorting: normalize entire slate first, then sort
  let sortedProps = filteredProps;

  if (sortBy === "api") {
    // Normalize the entire slate for the current mode
    const mode = overUnderFilter === "over" ? "over" : "under";
    const normalizedProps = normalizeSlateRatings(filteredProps, mode);

    // Sort by normalized rating
    sortedProps = sortPropsByMode(normalizedProps, mode);
  } else {
    // Use traditional sorting for other modes
    sortedProps = filteredProps.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "statpediaRating":
          const aRating = statpediaRatingService.calculateRating(a, overUnderFilter);
          const bRating = statpediaRatingService.calculateRating(b, overUnderFilter);
          aValue = aRating.overall;
          bValue = bRating.overall;
          break;
        case "evPercent":
          // EV% represented by expectedValue in 0-1; compare as percentage
          aValue = (a.expectedValue || 0) * 100;
          bValue = (b.expectedValue || 0) * 100;
          break;
        case "pickRate":
          // If pickRate not present, fall back to confidence as a proxy
          aValue = (a as any).pickRate ?? a.confidence ?? 0;
          bValue = (b as any).pickRate ?? b.confidence ?? 0;
          break;
        case "ev":
          aValue = a.expectedValue || 0;
          bValue = b.expectedValue || 0;
          break;
        case "line":
          aValue = a.line;
          bValue = b.line;
          break;
        case "player":
          aValue = a.playerName;
          bValue = b.playerName;
          break;
        case "order":
          // Sort by prop priority order
          const aOrderPriority = getPropPriority(a.propType);
          const bOrderPriority = getPropPriority(b.propType);
          return aOrderPriority - bOrderPriority;
        default:
          aValue = a.confidence || 0;
          bValue = b.confidence || 0;
      }

      if (sortBy === "player") {
        return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      // For Statpedia Rating, always show highest first (descending)
      if (sortBy === "statpediaRating") {
        return bValue - aValue; // Higher ratings first
      }

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });
  }

  // Use sorted props (PropFinder-style for 'api' sort, traditional for others)
  const mixedProps = sortedProps;

  // Auto-relax filters if we end up with a very small visible slate relative to available props
  useEffect(() => {
    try {
      const visible = mixedProps.length;
      const total = realProps.length;
      const restrictive =
        minEV > 0 ||
        minConfidence > 0 ||
        useOddsFilter ||
        propTypeFilter !== "all" ||
        searchQuery.trim().length > 0;
      if (
        !autoRelaxedRef.current &&
        total > 0 &&
        visible > 0 &&
        visible < Math.min(20, total) &&
        restrictive
      ) {
        logWarning(
          "PlayerPropsTab",
          `Auto-relaxing filters (visible: ${visible}, total: ${total})`,
        );
        autoRelaxedRef.current = true;
        silentPermissiveReset(sportFilter);
      }
    } catch (e) {
      // intentionally ignore errors from auto-relax filter
      void e;
    }
  }, [
    mixedProps.length,
    realProps.length,
    minEV,
    minConfidence,
    useOddsFilter,
    propTypeFilter,
    searchQuery,
    sportFilter,
    silentPermissiveReset,
  ]);

  // Set slate props for normalization before computing ratings
  React.useEffect(() => {
    if (mixedProps && mixedProps.length > 0) {
      statpediaRatingService.setSlateProps(mixedProps);
    }
  }, [mixedProps]);

  // Final ordering with stable tie-breakers using useMemo
  const orderedProps = React.useMemo(() => {
    if (!mixedProps || mixedProps.length === 0) return [];

    // Copy to avoid mutating upstream
    const arr = [...mixedProps];

    // Ensure we only show props for the currently selected league; do not exclude categories
    const league = (sportFilter || "").toLowerCase();
    const leagueProps = arr.filter((p) => !p.sport || String(p.sport).toLowerCase() === league);

    // Sort by Statpedia rating first (highest to lowest), then by priority
    leagueProps.sort((a, b) => {
      // Check if props are pick 'em (odds around +100)
      const aIsPickEm =
        (a.overOdds && Number(a.overOdds) >= 95 && Number(a.overOdds) <= 105) ||
        (a.underOdds && Number(a.underOdds) >= 95 && Number(a.underOdds) <= 105);
      const bIsPickEm =
        (b.overOdds && Number(b.overOdds) >= 95 && Number(b.overOdds) <= 105) ||
        (b.underOdds && Number(b.underOdds) >= 95 && Number(b.underOdds) <= 105);

      // First: Sort by Statpedia rating (highest first)
      const aRating = statpediaRatingService.calculateRating(a, "both");
      const bRating = statpediaRatingService.calculateRating(b, "both");

      // If one is pick 'em and the other isn't, handle special case
      if (aIsPickEm && !bIsPickEm) {
        // Only show pick 'em props if they have B rating or higher (80+)
        if (aRating.overall >= 80) {
          return bRating.overall - aRating.overall; // Higher rating first
        } else {
          return 1; // Put pick 'em with low rating at the end
        }
      } else if (!aIsPickEm && bIsPickEm) {
        // Only show pick 'em props if they have B rating or higher (80+)
        if (bRating.overall >= 80) {
          return bRating.overall - aRating.overall; // Higher rating first
        } else {
          return -1; // Put pick 'em with low rating at the end
        }
      } else if (aIsPickEm && bIsPickEm) {
        // Both are pick 'em, sort by rating
        if (aRating.overall !== bRating.overall) {
          return bRating.overall - aRating.overall;
        }
      } else {
        // Neither is pick 'em, normal sorting
        if (aRating.overall !== bRating.overall) {
          return bRating.overall - aRating.overall; // Higher rating first
        }
      }

      // Second: Use priority for tie-breakers
      const pa = getPriority(a.propType);
      const pb = getPriority(b.propType);
      if (pa !== pb) return pa - pb;

      // Third: Tie-break within offense types
      const sa = offenseSubOrder(a.propType);
      const sb = offenseSubOrder(b.propType);
      if (sa !== sb) return sa - sb;

      // Final stable fallbacks
      const mt = String(a.propType || "").localeCompare(String(b.propType || ""));
      if (mt !== 0) return mt;

      return String(a.playerName || "").localeCompare(String(b.playerName || ""));
    });

    // Debug logging (remove after confirming)
    leagueProps.slice(0, 10).forEach((p) => {
      console.debug("[ORDERED]", p.propType, p.playerName, getPriority(p.propType));
    });

    return leagueProps;
  }, [mixedProps, sportFilter]);

  logFilter("PlayerPropsTab", `Final filteredProps length: ${filteredProps.length}`);
  logFilter("PlayerPropsTab", `Props length: ${mixedProps.length}`);

  // Debug props
  if (mixedProps.length > 0) {
    const playerCounts = new Map<string, number>();
    const propTypeCounts = new Map<string, number>();

    mixedProps.forEach((prop) => {
      playerCounts.set(prop.playerName, (playerCounts.get(prop.playerName) || 0) + 1);
      propTypeCounts.set(prop.propType, (propTypeCounts.get(prop.propType) || 0) + 1);
    });

    logDebug("PlayerPropsTab", "Props Results:", {
      totalProps: mixedProps.length,
      uniquePlayers: playerCounts.size,
      uniquePropTypes: propTypeCounts.size,
      topPlayers: Array.from(playerCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
      topPropTypes: Array.from(propTypeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
      first10Props: mixedProps
        .slice(0, 10)
        .map((p) => ({ player: p.playerName, propType: p.propType })),
    });
  }
  logFilter(
    "PlayerPropsTab",
    `Filter settings: minConfidence=${minConfidence}, minEV=${minEV}, showOnlyPositiveEV=${showOnlyPositiveEV}, propTypeFilter=${propTypeFilter}, lineRange=${minLine}-${maxLine}`,
  );
  logFilter("PlayerPropsTab", `Search query: "${searchQuery}"`);

  if (mixedProps.length === 0 && realProps.length > 0) {
    logWarning(
      "PlayerPropsTab",
      "All props filtered out! Checking first few props:",
      realProps.slice(0, 3),
    );

    // Debug why props are being filtered out
    const sampleProp = realProps[0];
    const matchesConfidence = (sampleProp.confidence || 0.5) >= minConfidence / 100;
    const matchesEV = (sampleProp.expectedValue || 0) >= minEV / 100;
    const matchesPropType = propTypeFilter === "all" || sampleProp.propType === propTypeFilter;

    logWarning("PlayerPropsTab", "Sample prop filter check:", {
      playerName: sampleProp.playerName,
      confidence: sampleProp.confidence,
      expectedValue: sampleProp.expectedValue,
      propType: sampleProp.propType,
      matchesConfidence,
      matchesEV,
      matchesPropType,
      minConfidence: minConfidence / 100,
      minEV: minEV / 100,
    });
  }

  if (mixedProps.length > 0) {
    logSuccess("PlayerPropsTab", `Successfully mixed ${mixedProps.length} props`);
    const firstMixed = mixedProps[0];
    logDebug("PlayerPropsTab", "First mixed prop:", {
      playerName: firstMixed.playerName,
      line: firstMixed.line,
      overOdds: firstMixed.overOdds,
      underOdds: firstMixed.underOdds,
    });
  }

  // Handle enhanced analysis
  const handleEnhancedAnalysis = (prop: PlayerProp) => {
    console.log("PlayerPropsTab: Opening enhanced analysis for prop:", {
      id: prop.id,
      playerName: prop.playerName,
      confidence: prop.confidence,
      expectedValue: prop.expectedValue,
      hasConfidence: "confidence" in prop,
      hasExpectedValue: "expectedValue" in prop,
    });
    setSelectedPropForEnhancedAnalysis(prop);
    setShowEnhancedAnalysis(true);
  };

  // Generate advanced prediction
  const generateAdvancedPrediction = async (prop: PlayerProp) => {
    try {
      setIsGeneratingAdvancedPrediction(true);
      setSelectedPropForAdvancedAnalysis(prop);

      const predictionRequest = {
        playerId: prop.playerId || prop.id,
        playerName: prop.playerName,
        propType: prop.propType,
        line: prop.line,
        gameId: prop.gameId || `game_${Date.now()}`,
        team: prop.team,
        opponent: prop.opponent || "Unknown",
        gameDate: prop.gameDate || new Date().toISOString(),
        odds: {
          over: prop.overOdds || -110,
          under: prop.underOdds || -110,
        },
      };

      const comprehensivePrediction =
        await advancedPredictionService.generateComprehensivePrediction(predictionRequest);
      setAdvancedPrediction(comprehensivePrediction);
      setShowAdvancedAnalysis(true);

      toast({
        title: "Advanced Analysis Complete",
        description: `Generated comprehensive prediction for ${prop.playerName}`,
      });
    } catch (error) {
      console.error("Error generating advanced prediction:", error);
      toast({
        title: "Analysis Error",
        description: "Failed to generate advanced prediction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAdvancedPrediction(false);
    }
  };

  // Get maximum line value based on sport
  const getMaxLineForSport = (sport: string): number => {
    switch (sport.toLowerCase()) {
      case "nfl":
        return 500;
      case "nba":
      case "mlb":
      case "nhl":
      default:
        return 100;
    }
  };

  // Handle toggle my pick
  const handleToggleMyPick = (prop: PlayerProp) => {
    const existingPick = myPicks.find((pick) => pick.prop.id === prop.id);

    if (existingPick) {
      setMyPicks((prev) => prev.filter((pick) => pick.prop.id !== prop.id));
      toast({
        title: "Removed from picks",
        description: `${prop.playerName} ${prop.propType} removed from your picks.`,
      });
    } else {
      const newPick: MyPick = {
        id: `${prop.id}_${Date.now()}`,
        prop,
        prediction: prop.aiPrediction?.recommended || "over",
        confidence: prop.confidence || 0.5,
        addedAt: new Date().toISOString(),
      };
      setMyPicks((prev) => [...prev, newPick]);
      toast({
        title: "Added to picks",
        description: `${prop.playerName} ${prop.propType} added to your picks.`,
      });
    }
  };

  // Get unique prop types for filter (exclude defense and kicking for NFL)
  const propTypes = Array.from(
    new Set(mixedProps.map((prop) => prop.propType.replace(/_/g, " "))),
  ).sort();

  if (!isSubscribed) {
    return (
      <div className="relative">
        <SubscriptionOverlay isVisible={true} />
        <div className="min-h-screen bg-background p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-20">
              <h1 className="text-4xl font-bold text-foreground mb-4">Player Props</h1>
              <p className="text-xl text-muted-foreground mb-8">
                Access detailed player prop analysis and predictions
              </p>
              <div className="relative max-w-5xl mx-auto">
                <div className="border rounded-lg bg-gradient-to-br from-background/60 to-background/40 p-8">
                  <SubscriptionOverlay
                    isVisible={true}
                    title="Premium Feature"
                    description="Upgrade to Pro to unlock player prop insights, EV, and AI ratings."
                    buttonText="See Plans"
                    size="default"
                    onUpgrade={() => navigate("/subscription")}
                  />
                  <div className="h-48" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Player Props</h1>
            <p className="text-muted-foreground">
              Real-time player prop analysis and predictions for {sportFilter.toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                logState("PlayerPropsTab", `Manual refresh triggered for ${sportFilter}`);
                loadPlayerProps(sportFilter);
              }}
              disabled={isLoadingData}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoadingData && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                logState("PlayerPropsTab", "Force clearing all data");
                setRealProps([]);
                setTimeout(() => {
                  logState("PlayerPropsTab", "Force reloading after clear");
                  loadPlayerProps(sportFilter);
                }, 100);
              }}
              disabled={isLoadingData}
            >
              Force Clear
            </Button>
            <Button variant="outline" onClick={() => setShowMyPicks(true)}>
              <BookmarkCheck className="w-4 h-4 mr-2" />
              My Picks ({myPicks.length})
            </Button>
          </div>
        </div>

        {/* Enhanced Filters */}
        <Card className="bg-gradient-card border-border/50 hover:border-primary/30 transition-all duration-300 mx-6">
          <CardContent className="p-6">
            {/* Filter Presets */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-foreground">Quick Filters</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveFilterPreferences}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(filterPresets).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(key as keyof typeof filterPresets)}
                    className="hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Main Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Sport Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  Sport
                </label>
                <Select
                  value={sportFilter}
                  onValueChange={(value) => {
                    setSportFilter(value);
                    loadPlayerProps(value);
                  }}
                >
                  <SelectTrigger className="w-full bg-card border-border/50 hover:border-primary/30 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nfl">NFL</SelectItem>
                    <SelectItem value="nba">NBA</SelectItem>
                    <SelectItem value="mlb">MLB</SelectItem>
                    <SelectItem value="nhl">NHL</SelectItem>
                    <SelectItem value="college-basketball">CBB</SelectItem>
                    <SelectItem value="college-football">CFB</SelectItem>
                    <SelectItem value="wnba">WNBA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sportsbook Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  Sportsbook
                </label>
                <Select
                  value={selectedSportsbook}
                  onValueChange={(value) => {
                    setSelectedSportsbook(value);
                  }}
                >
                  <SelectTrigger className="w-full bg-card border-border/50 hover:border-primary/30 transition-colors">
                    <SelectValue placeholder="Select Sportsbook" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSportsbooks.map((sportsbook) => (
                      <SelectItem key={sportsbook.key} value={sportsbook.key}>
                        {sportsbook.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prop Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <BarChart3 className="w-4 h-4" />
                  Prop Type
                </label>
                <Select value={propTypeFilter} onValueChange={setPropTypeFilter}>
                  <SelectTrigger className="w-full bg-card border-border/50 hover:border-primary/30 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {propTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Over/Under Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Over/Under
                </label>
                <Select
                  value={overUnderFilter}
                  onValueChange={(value: "over" | "under" | "both") => setOverUnderFilter(value)}
                >
                  <SelectTrigger className="w-full bg-card border-border/50 hover:border-primary/30 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="over">Over Only</SelectItem>
                    <SelectItem value="under">Under Only</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search and View Mode */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search players, teams, props..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-card border-border/50 hover:border-primary/30 focus:border-primary/60 transition-colors"
                  />
                </div>
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">View:</label>
                <Select
                  value={viewMode}
                  onValueChange={(value: "column" | "cards") => {
                    setViewMode(value);
                    // Update URL parameter
                    const newSearchParams = new URLSearchParams(searchParams);
                    if (value === "column") {
                      newSearchParams.set("view", "compact");
                    } else {
                      newSearchParams.set("view", "cards");
                    }
                    setSearchParams(newSearchParams);
                  }}
                >
                  <SelectTrigger className="w-32 bg-card border-border/50 hover:border-primary/30 transition-colors">
                    <SelectValue placeholder="View" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="column">Compact</SelectItem>
                    <SelectItem value="cards">Cards</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced Filters Toggle */}
              <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-card border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Advanced Filters
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Advanced Filters
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* Confidence Filter */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Min Confidence</label>
                        <Badge variant="outline" className="text-primary border-primary/30">
                          {minConfidence}%
                        </Badge>
                      </div>
                      <Slider
                        value={[minConfidence]}
                        onValueChange={([value]) => setMinConfidence(value)}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    {/* Expected Value Filter */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Min Expected Value</label>
                        <Badge variant="outline" className="text-primary border-primary/30">
                          {minEV}%
                        </Badge>
                      </div>
                      <Slider
                        value={[minEV]}
                        onValueChange={([value]) => setMinEV(value)}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Odds Range Filter */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium">Odds Range</label>
                          <Switch
                            checked={useOddsFilter}
                            onCheckedChange={setUseOddsFilter}
                            className="data-[state=checked]:bg-primary"
                          />
                        </div>
                        {useOddsFilter && (
                          <Badge variant="outline" className="text-primary border-primary/30">
                            {minOdds} to {maxOdds}
                          </Badge>
                        )}
                      </div>
                      {useOddsFilter && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Min Odds
                            </label>
                            <Slider
                              value={[minOdds]}
                              onValueChange={([value]) => setMinOdds(value)}
                              max={maxOdds - 25}
                              min={-500}
                              step={25}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Max Odds
                            </label>
                            <Slider
                              value={[maxOdds]}
                              onValueChange={([value]) => setMaxOdds(value)}
                              max={1000}
                              min={minOdds + 25}
                              step={25}
                              className="w-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Line Range Filter */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Line Range</label>
                        <Badge variant="outline" className="text-primary border-primary/30">
                          {minLine} - {maxLine}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            Min Line
                          </label>
                          <Slider
                            value={[minLine]}
                            onValueChange={([value]) => setMinLine(value)}
                            max={Math.min(maxLine - 0.5, getMaxLineForSport(sportFilter) - 0.5)}
                            min={0}
                            step={0.5}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            Max Line
                          </label>
                          <Slider
                            value={[maxLine]}
                            onValueChange={([value]) => setMaxLine(value)}
                            max={getMaxLineForSport(sportFilter)}
                            min={minLine + 0.5}
                            step={0.5}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Positive EV Toggle */}
                    <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                      <Checkbox
                        id="positiveEV"
                        checked={showOnlyPositiveEV}
                        onCheckedChange={(checked) => setShowOnlyPositiveEV(checked as boolean)}
                        className="border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <label htmlFor="positiveEV" className="text-sm font-medium cursor-pointer">
                        Only show positive expected value props
                      </label>
                    </div>

                    {/* Filter Summary */}
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <h4 className="text-sm font-medium text-primary mb-2">
                        Active Filters Summary
                      </h4>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Confidence: ≥ {minConfidence}%</div>
                        <div>Expected Value: ≥ {minEV}%</div>
                        <div>
                          Line Range: {minLine} - {maxLine}
                        </div>
                        {useOddsFilter && (
                          <div>
                            Odds Range: {minOdds} to {maxOdds}
                          </div>
                        )}
                        <div>Positive EV Only: {showOnlyPositiveEV ? "Yes" : "No"}</div>
                        <div>
                          Prop Type: {propTypeFilter === "all" ? "All Types" : propTypeFilter}
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoadingData && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-muted-foreground">Loading player props...</span>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!isLoadingData && mixedProps.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Player Props Found</h3>
              <p className="text-muted-foreground mb-4">
                No player props available for {sportFilter.toUpperCase()} with current filters.
              </p>
              <Button onClick={() => loadPlayerProps(sportFilter)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Player Props Content */}
        {(() => {
          console.log("[PLAYER_PROPS_TAB] Rendering check:", {
            isLoadingData,
            orderedPropsLength: orderedProps.length,
            viewMode,
          });
          return null;
        })()}

        {/* Analytics Integration */}
        <div className="px-6">
          <AnalyticsIntegration
            league={sportFilter.toLowerCase()}
            date={todayDate}
            onDataUpdate={(data) => {
              console.log("Analytics data updated:", data.length, "props");
            }}
          />
        </div>

        {!isLoadingData && orderedProps.length > 0 && (
          <>
            {viewMode === "column" ? (
              <PlayerPropsColumnView
                props={orderedProps as any}
                selectedSport={sportFilter}
                onAnalysisClick={handleEnhancedAnalysis as any}
                isLoading={isLoadingData}
                overUnderFilter={overUnderFilter}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {orderedProps.map((prop, index) => {
                  // Construct event title from team names and logos
                  const eventTitle =
                    prop.homeTeam && prop.awayTeam
                      ? `${prop.awayTeam} @ ${prop.homeTeam}`
                      : "NFL Game";

                  return (
                    <Card key={prop.id || `prop-${prop.playerId}-${prop.propType}-${index}`}>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          {prop.awayTeamLogo && (
                            <img src={prop.awayTeamLogo} alt={prop.awayTeam} className="h-6 w-6" />
                          )}
                          <span>@</span>
                          {prop.homeTeamLogo && (
                            <img src={prop.homeTeamLogo} alt={prop.homeTeam} className="h-6 w-6" />
                          )}
                        </div>
                        <CardTitle>{eventTitle}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {prop.gameTime ? new Date(prop.gameTime).toLocaleString() : "TBD"}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <PlayerPropCard3D
                          prop={prop as any}
                          onAnalysisClick={handleEnhancedAnalysis}
                          onAdvancedAnalysisClick={generateAdvancedPrediction}
                          isSelected={selectedProps.includes(prop.id)}
                          overUnderFilter={overUnderFilter}
                          onSelect={
                            showSelection
                              ? (propId) => {
                                  setSelectedProps((prev) =>
                                    prev.includes(propId)
                                      ? prev.filter((id) => id !== propId)
                                      : [...prev, propId],
                                  );
                                }
                              : undefined
                          }
                          showSelection={showSelection}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Props Count Info */}
        {!isLoadingData && realProps.length > 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Showing {realProps.length} {sportFilter.toUpperCase()} props
          </div>
        )}

        {/* My Picks Dialog */}
        <Dialog open={showMyPicks} onOpenChange={setShowMyPicks}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>My Picks ({myPicks.length})</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {myPicks.length === 0 ? (
                <div className="text-center py-8">
                  <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No picks added yet</p>
                </div>
              ) : (
                myPicks.map((pick) => (
                  <Card key={pick.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{pick.prop.playerName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {pick.prop.propType} {pick.prediction} {formatNumber(pick.prop.line)}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                          {pick.prop.awayTeamLogo && (
                            <img
                              src={pick.prop.awayTeamLogo}
                              alt={pick.prop.opponentAbbr}
                              className="h-3 w-3"
                            />
                          )}
                          <span>{pick.prop.opponentAbbr}</span>
                          <span>@</span>
                          <span>{pick.prop.teamAbbr}</span>
                          {pick.prop.homeTeamLogo && (
                            <img
                              src={pick.prop.homeTeamLogo}
                              alt={pick.prop.teamAbbr}
                              className="h-3 w-3"
                            />
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{formatPercentage(pick.confidence)}</Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleMyPick(pick.prop)}
                        >
                          <BookmarkCheck className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Enhanced Analysis Overlay */}
        <EnhancedAnalysisOverlay
          prediction={selectedPropForEnhancedAnalysis as any}
          isOpen={showEnhancedAnalysis}
          currentFilter={overUnderFilter}
          onClose={() => {
            setShowEnhancedAnalysis(false);
            setSelectedPropForEnhancedAnalysis(null);
          }}
        />

        {/* Advanced Analysis Modal */}
        {advancedPrediction && (
          <AdvancedPredictionDisplay
            prediction={advancedPrediction}
            onClose={() => {
              setShowAdvancedAnalysis(false);
              setAdvancedPrediction(null);
              setSelectedPropForAdvancedAnalysis(null);
            }}
          />
        )}
      </div>
    </div>
  );
};
