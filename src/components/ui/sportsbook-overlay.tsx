import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { SportsbookIcon, SportsbookNames } from "./sportsbook-icons";
import { statpediaRatingService } from "@/services/statpedia-rating-service";

interface SportsbookOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  sportsbooks?: string[];
  // Rich prop payload (from our API / props tab)
  selectedProp?: any;
  // All props available for the same player (for in-overlay prop switching)
  playerProps?: any[];
}

export const SportsbookOverlay: React.FC<SportsbookOverlayProps> = ({
  isOpen,
  onClose,
  sportsbooks = [],
  selectedProp,
  playerProps = [],
}) => {
  const initialId = String(selectedProp?.id || "");
  const [activePropId, setActivePropId] = React.useState<string>(initialId);

  React.useEffect(() => {
    setActivePropId(String(selectedProp?.id || ""));
  }, [selectedProp?.id]);

  const propsForSelect = React.useMemo(() => {
    const list =
      Array.isArray(playerProps) && playerProps.length > 0
        ? playerProps
        : selectedProp
          ? [selectedProp]
          : [];
    // De-dupe by id while keeping stable order
    const seen = new Set<string>();
    const out: any[] = [];
    for (const p of list) {
      const id = String(p?.id || "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(p);
    }
    return out;
  }, [playerProps, selectedProp]);

  const activeProp = React.useMemo(() => {
    if (!activePropId) return selectedProp;
    return propsForSelect.find((p) => String(p?.id || "") === activePropId) || selectedProp;
  }, [activePropId, propsForSelect, selectedProp]);

  const offers = React.useMemo(() => {
    const p = activeProp || {};
    const list = (p.offers || p.allSportsbookOdds || []) as any[];
    if (!Array.isArray(list)) return [];
    // Normalize to { book, overOdds, underOdds, deeplink }
    return list
      .map((o: any) => ({
        book: String(o.book || o.sportsbook || o.key || o.name || "").toLowerCase(),
        overOdds: o.overOdds ?? o.over_odds ?? o.over_odds_american ?? null,
        underOdds: o.underOdds ?? o.under_odds ?? o.under_odds_american ?? null,
        deeplink: o.deeplink ?? o.url ?? null,
      }))
      .filter((o) => o.book);
  }, [activeProp]);

  const availableBooks = React.useMemo(() => {
    const fromOffers = Array.from(new Set(offers.map((o) => o.book))).filter(Boolean);
    const fromProp = Array.isArray(sportsbooks) ? sportsbooks : [];
    const merged = Array.from(new Set([...fromOffers, ...fromProp])).filter(Boolean);
    return merged;
  }, [offers, sportsbooks]);

  const rating = React.useMemo(() => {
    if (!activeProp) return null;
    try {
      // Use "over" context for consistency (most of our hit-rate logic is over-vs-line)
      return statpediaRatingService.calculateRating(activeProp, "over");
    } catch {
      return null;
    }
  }, [activeProp]);

  const modelConfidencePct = React.useMemo(() => {
    if (!rating) return null;
    const pct = Math.round((Number(rating.overall) / 95) * 100);
    return Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : null;
  }, [rating]);

  const hitRates = React.useMemo(() => {
    const p = activeProp || {};
    const l5 = typeof p.l5 === "number" ? p.l5 : null;
    const l10 = typeof p.l10 === "number" ? p.l10 : null;
    const l20 = typeof p.l20 === "number" ? p.l20 : null;
    return { l5, l10, l20 };
  }, [activeProp]);

  const consistencyPct = React.useMemo(() => {
    const p = activeProp || {};
    if (typeof p.consistency === "number" && Number.isFinite(p.consistency)) {
      return Math.max(0, Math.min(100, Math.round(p.consistency)));
    }
    // Fallback: measure stability across timeframes (lower spread => more consistent)
    const vals = [hitRates.l5, hitRates.l10, hitRates.l20].filter(
      (n) => typeof n === "number" && Number.isFinite(n),
    ) as number[];
    if (vals.length < 2) return null;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    const sd = Math.sqrt(variance);
    const score = Math.max(0, Math.min(100, Math.round(100 - sd))); // sd in percentage-points
    return score;
  }, [activeProp, hitRates]);

  const streakVal = React.useMemo(() => {
    const p = activeProp || {};
    const v = p.current_streak ?? p.currentStreak ?? p.streak_l5 ?? p.streakL5 ?? null;
    const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
    return Number.isFinite(n) ? n : null;
  }, [activeProp]);

  const matchupRank = React.useMemo(() => {
    const p = activeProp || {};
    const v = p.matchup_rank ?? p.matchupRank ?? null;
    const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [activeProp]);

  const evPercent = React.useMemo(() => {
    const p = activeProp || {};
    const v = p.ev_percent ?? p.evPercent ?? p.expectedValue ?? null;
    const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
    return Number.isFinite(n) ? n : null;
  }, [activeProp]);

  const getPctColor = (pct: number | null) => {
    if (pct === null) return "text-slate-300";
    if (pct > 70) return "text-green-400";
    if (pct >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-600 shadow-2xl">
        <DialogHeader className="relative pb-4">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-emerald-600/10 rounded-t-lg" />
          <div className="relative z-10 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-white">
              Available Sportsbooks
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-700/50"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          {activeProp && (
            <div className="relative z-10 text-sm text-slate-300 mt-2">
              <div className="font-medium">
                {String(activeProp?.playerName || activeProp?.player_name || "Unknown Player")}
              </div>
              <div className="text-slate-400">
                {String(activeProp?.propType || "")} {String(activeProp?.line ?? "")}
              </div>
              {propsForSelect.length > 1 && (
                <div className="mt-2">
                  <Select value={activePropId} onValueChange={setActivePropId}>
                    <SelectTrigger className="bg-slate-800/60 border-slate-700 text-slate-200 h-9">
                      <SelectValue placeholder="Select prop" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {propsForSelect.map((p) => {
                        const id = String(p?.id || "");
                        const label = `${String(p?.propType || "")} ${String(p?.line ?? "")}`;
                        return (
                          <SelectItem key={id} value={id} className="text-slate-100">
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm text-slate-400 mb-4">
            This prop is available on the following sportsbooks:
          </div>

          <div className="grid grid-cols-1 gap-2">
            {availableBooks.map((book) => {
              const displayName =
                (SportsbookNames as any)[book as keyof typeof SportsbookNames] ||
                book.charAt(0).toUpperCase() + book.slice(1);
              const o = offers.find((x) => x.book === book);
              const overOdds = o?.overOdds;
              const underOdds = o?.underOdds;

              return (
                <div
                  key={book}
                  className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-slate-700/50 transition-colors"
                >
                  <SportsbookIcon sportsbookKey={book} />
                  <div className="flex-1">
                    <div className="font-medium text-white text-sm">{displayName}</div>
                    <div className="text-xs text-slate-400">
                      Live odds available
                      {overOdds != null || underOdds != null
                        ? ` • O ${overOdds ?? "—"} / U ${underOdds ?? "—"}`
                        : ""}
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live" />
                </div>
              );
            })}
          </div>

          {availableBooks.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <div className="text-sm">No sportsbooks available for this prop</div>
            </div>
          )}

          {/* Keep appearance simple: add data as a small text block (no layout overhaul) */}
          {activeProp && (
            <div className="pt-4 border-t border-slate-700/50 space-y-2">
              <div className="text-sm text-slate-300 font-medium">Analysis</div>
              <div className="text-xs text-slate-400">
                Confidence:{" "}
                <span className="text-slate-200">
                  {modelConfidencePct !== null ? `${modelConfidencePct}%` : "—"}
                </span>
                {" • "}
                Consistency:{" "}
                <span className={getPctColor(consistencyPct)}>
                  {consistencyPct !== null ? `${consistencyPct}%` : "—"}
                </span>
                {" • "}
                Streak:{" "}
                <span className="text-slate-200">
                  {streakVal !== null ? (streakVal > 0 ? `+${streakVal}` : `${streakVal}`) : "—"}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                L5:{" "}
                <span className={getPctColor(hitRates.l5)}>
                  {hitRates.l5 !== null ? `${Math.round(hitRates.l5)}%` : "—"}
                </span>
                {" • "}
                L10:{" "}
                <span className={getPctColor(hitRates.l10)}>
                  {hitRates.l10 !== null ? `${Math.round(hitRates.l10)}%` : "—"}
                </span>
                {" • "}
                L20:{" "}
                <span className={getPctColor(hitRates.l20)}>
                  {hitRates.l20 !== null ? `${Math.round(hitRates.l20)}%` : "—"}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Matchup:{" "}
                <span className="text-slate-200">{matchupRank ? `#${matchupRank}` : "—"}</span>
                {" • "}
                Season avg:{" "}
                <span className="text-slate-200">
                  {activeProp?.season_avg !== null && activeProp?.season_avg !== undefined
                    ? Number(activeProp.season_avg).toFixed(1)
                    : "—"}
                </span>
                {" • "}
                EV%:{" "}
                <span className="text-slate-200">
                  {evPercent !== null ? `${evPercent.toFixed(1)}%` : "—"}
                </span>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-700/50">
            <div className="text-xs text-slate-500 text-center">
              Odds and availability may vary by location and time
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
