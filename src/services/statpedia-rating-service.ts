import { logAPI, logSuccess, logError, logWarning, logInfo } from "@/utils/console-logger";

export interface StatpediaRatingFactors {
  evPercent: number; // 0-100 points (30% weight) - Expected Value
  hitRateWeighted: number; // 0-100 points (20% weight) - Hit Rate History (L2G/L5/L10/L20)
  matchupGrade: number; // 0-100 points (15% weight) - Opponent rank normalized
  streakFactor: number; // 0-100 points (10% weight) - Momentum adjustment
  lineSensitivity: number; // 0-100 points (10% weight) - Current line vs historical average
  aiPrediction: number; // 0-100 points (15% weight) - AI Model confidence
}

export interface StatpediaRating {
  overall: number; // 40-95 (normalized to slate)
  grade: "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D+" | "D" | "D-" | "F";
  color: "green" | "yellow" | "red";
  confidence: "High" | "Medium" | "Low";
  factors: StatpediaRatingFactors;
  reasoning: string[];
  breakdown: {
    evPercent: number;
    hitRateWeighted: number;
    matchupGrade: number;
    streakFactor: number;
    lineSensitivity: number;
    aiPrediction: number;
  };
}

export class StatpediaRatingService {
  private slateProps: any[] = [];
  private slateNormalization: { min: number; max: number } | null = null;
  private slateStats: { [mode: string]: { min: number; max: number } } = {};

  /**
   * Safe numeric reader for our mixed prop payload shapes.
   * Supports both backend fields (snake_case) and frontend fields (camelCase).
   */
  private getNumber(prop: any, keys: string[], fallback: number | null = null): number | null {
    for (const k of keys) {
      const v = (prop as any)?.[k];
      const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
      if (Number.isFinite(n)) return n;
    }
    return fallback;
  }

  /**
   * Interpret a value as a probability in [0,1] when possible.
   * Accepts 0-1, or 0-100 as percent, or returns null if not usable.
   */
  private asProb01(value: number | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    if (!Number.isFinite(value)) return null;
    if (value >= 0 && value <= 1) return value;
    if (value >= 0 && value <= 100) return value / 100;
    return null;
  }

  /**
   * Interpret an "EV%" style number into a 0..100 factor score.
   * We treat EV as "percentage points above/below neutral", so EV=+5 => 55.
   */
  private evToScore01(evLike: number | null | undefined): number | null {
    if (evLike === null || evLike === undefined) return null;
    if (!Number.isFinite(evLike)) return null;
    // If it's already a probability-like number, do not treat it as EV
    if (evLike >= 0 && evLike <= 1) return evLike;
    // Most of our UI prints EV like "+3.2%" (i.e., -100..100 range)
    if (evLike >= -100 && evLike <= 100) return this.clamp(50 + evLike, 0, 100) / 100;
    return null;
  }

  /**
   * Set the slate of props for normalization
   */
  setSlateProps(props: any[]): void {
    this.slateProps = props;
    this.calculateSlateNormalization();
    this.calculateSlateStats();
  }

  /**
   * Calculate slate statistics for per-mode normalization
   */
  private calculateSlateStats(): void {
    if (this.slateProps.length === 0) {
      this.slateStats = { over: { min: 0, max: 100 }, under: { min: 0, max: 100 } };
      return;
    }

    // Calculate composite scores for over and under modes
    const overComposites = this.slateProps.map((prop) => {
      const factors = this.calculateFactors(prop, "over");
      return (
        factors.evPercent * 0.3 +
        factors.hitRateWeighted * 0.2 +
        factors.matchupGrade * 0.15 +
        factors.streakFactor * 0.1 +
        factors.lineSensitivity * 0.1 +
        factors.aiPrediction * 0.15
      );
    });
    const underComposites = this.slateProps.map((prop) => {
      const factors = this.calculateFactors(prop, "under");
      return (
        factors.evPercent * 0.3 +
        factors.hitRateWeighted * 0.2 +
        factors.matchupGrade * 0.15 +
        factors.streakFactor * 0.1 +
        factors.lineSensitivity * 0.1 +
        factors.aiPrediction * 0.15
      );
    });

    this.slateStats = {
      over: {
        min: Math.min(...overComposites),
        max: Math.max(...overComposites),
      },
      under: {
        min: Math.min(...underComposites),
        max: Math.max(...underComposites),
      },
    };

    logInfo(
      "StatpediaRating",
      `Slate stats - Over: ${this.slateStats.over.min.toFixed(2)}-${this.slateStats.over.max.toFixed(2)}, Under: ${this.slateStats.under.min.toFixed(2)}-${this.slateStats.under.max.toFixed(2)}`,
    );
  }

  /**
   * Calculate rating using the new 6-factor system with real analytics data
   */
  calculateRating(
    prop: any,
    overUnderContext: "over" | "under" | "both" = "both",
  ): StatpediaRating {
    const factors = this.calculateFactors(prop, overUnderContext);

    // Apply the 6-factor weighted formula
    const statpediaRating =
      factors.evPercent * 0.3 +
      factors.hitRateWeighted * 0.2 +
      factors.matchupGrade * 0.15 +
      factors.streakFactor * 0.1 +
      factors.lineSensitivity * 0.1 +
      factors.aiPrediction * 0.15;

    // Clamp to 40-95 range
    const clampedRating = Math.max(40, Math.min(95, statpediaRating));

    return {
      overall: clampedRating,
      grade: this.getGrade(clampedRating),
      color: this.getColor(clampedRating),
      confidence: this.getConfidenceLevel(statpediaRating, factors),
      factors,
      reasoning: this.generateReasoning(factors, prop),
      breakdown: {
        evPercent: factors.evPercent,
        hitRateWeighted: factors.hitRateWeighted,
        matchupGrade: factors.matchupGrade,
        streakFactor: factors.streakFactor,
        lineSensitivity: factors.lineSensitivity,
        aiPrediction: factors.aiPrediction,
      },
    };
  }

  /**
   * Calculate all 6 factors for the new rating system
   */
  private calculateFactors(
    prop: any,
    overUnderContext: "over" | "under" | "both" = "both",
  ): StatpediaRatingFactors {
    return {
      evPercent: this.calculateEVPercent(prop, overUnderContext),
      hitRateWeighted: this.calculateHitRateWeighted(prop, overUnderContext),
      matchupGrade: this.calculateMatchupGrade(prop, overUnderContext),
      streakFactor: this.calculateStreakFactor(prop, overUnderContext),
      lineSensitivity: this.calculateLineSensitivity(prop, overUnderContext),
      aiPrediction: this.calculateAIPrediction(prop, overUnderContext),
    };
  }

  /**
   * Calculate comprehensive Statpedia Rating for a player prop
   * Updated 6-factor system with new weights
   */
  calculateStatpediaRating(
    prop: any,
    overUnderContext: "over" | "under" | "both" = "both",
  ): StatpediaRating {
    // Compute new 6-factor scores
    const factors: StatpediaRatingFactors = {
      evPercent: this.calculateEVPercent(prop, overUnderContext), // 30% weight - Expected Value
      hitRateWeighted: this.calculateHitRateWeighted(prop, overUnderContext), // 20% weight - Hit Rate History
      matchupGrade: this.calculateMatchupGrade(prop, overUnderContext), // 15% weight - Opponent rank
      streakFactor: this.calculateStreakFactor(prop, overUnderContext), // 10% weight - Momentum
      lineSensitivity: this.calculateLineSensitivity(prop, overUnderContext), // 10% weight - Line vs historical
      aiPrediction: this.calculateAIPrediction(prop, overUnderContext), // 15% weight - AI confidence
    };

    // New weight formula as specified:
    // EV% → 30%, Hit Rate → 20%, Matchup Grade → 15%,
    // Streak Factor → 10%, Line Sensitivity → 10%, AI Model → 15%
    const statpediaRating =
      factors.evPercent * 0.3 +
      factors.hitRateWeighted * 0.2 +
      factors.matchupGrade * 0.15 +
      factors.streakFactor * 0.1 +
      factors.lineSensitivity * 0.1 +
      factors.aiPrediction * 0.15;

    // Normalize all inputs to a 0–100 scale, then clamp final result to 0-95 (95 is max)
    const final = Math.round(this.clamp(statpediaRating, 0, 95));

    const rating: StatpediaRating = {
      overall: final,
      grade: this.getGrade(final),
      color: this.getColor(final),
      confidence: this.getConfidenceLevel(final, factors),
      factors,
      reasoning: this.generateReasoning(factors, prop),
      breakdown: {
        evPercent: Math.round(this.safeScore(factors.evPercent)),
        hitRateWeighted: Math.round(this.safeScore(factors.hitRateWeighted)),
        matchupGrade: Math.round(this.safeScore(factors.matchupGrade)),
        streakFactor: Math.round(this.safeScore(factors.streakFactor)),
        lineSensitivity: Math.round(this.safeScore(factors.lineSensitivity)),
        aiPrediction: Math.round(this.safeScore(factors.aiPrediction)),
      },
    };

    logAPI(
      "StatpediaRating",
      `Calculated rating for ${prop.playerName} ${prop.propType}: ${rating.overall}/95 (${rating.grade})`,
    );

    return rating;
  }

  /**
   * Calculate slate normalization parameters
   */
  private calculateSlateNormalization(): void {
    if (this.slateProps.length === 0) {
      this.slateNormalization = { min: 0, max: 100 };
      return;
    }

    // Calculate composite scores for all props in slate using new 6-factor system
    const compositeScores = this.slateProps.map((prop) => {
      const factors = this.calculateFactors(prop, "both");

      return (
        factors.evPercent * 0.3 +
        factors.hitRateWeighted * 0.2 +
        factors.matchupGrade * 0.15 +
        factors.streakFactor * 0.1 +
        factors.lineSensitivity * 0.1 +
        factors.aiPrediction * 0.15
      );
    });

    const min = Math.min(...compositeScores);
    const max = Math.max(...compositeScores);

    this.slateNormalization = { min, max };

    logInfo("StatpediaRating", `Slate normalization: min=${min.toFixed(2)}, max=${max.toFixed(2)}`);
  }

  /**
   * Normalize score to slate (40-95 range)
   */
  private normalizeToSlate(compositeScore: number): number {
    if (!this.slateNormalization) {
      return Math.max(40, Math.min(95, compositeScore));
    }

    const { min, max } = this.slateNormalization;

    if (max === min) {
      return 67; // Middle of range if all scores are identical
    }

    // Normalize to 0-1 range
    const normalized = (compositeScore - min) / (max - min);

    // Scale to 40-95 range
    return 40 + normalized * 55;
  }

  /**
   * Apply caps and boosts
   */
  private applyCapsAndBoosts(score: number, prop: any): number {
    let finalScore = score;

    // Cap volatility: if std dev is huge, reduce rating
    if (this.slateProps.length > 10) {
      const compositeScores = this.slateProps.map((p) => {
        const factors = this.calculateFactors(p, "both");
        return (
          factors.evPercent * 0.3 +
          factors.hitRateWeighted * 0.2 +
          factors.matchupGrade * 0.15 +
          factors.streakFactor * 0.1 +
          factors.lineSensitivity * 0.1 +
          factors.aiPrediction * 0.15
        );
      });

      const mean = compositeScores.reduce((a, b) => a + b, 0) / compositeScores.length;
      const variance =
        compositeScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / compositeScores.length;
      const stdDev = Math.sqrt(variance);

      // If volatility is high, reduce extreme scores
      if (stdDev > 20) {
        const distanceFromMean = Math.abs(score - 67.5); // 67.5 is middle of 40-95 range
        if (distanceFromMean > 20) {
          finalScore = 67.5 + (score - 67.5) * 0.8; // Reduce extreme scores by 20%
        }
      }
    }

    // Boost consensus: if 5+ books agree, bump rating
    const sportsbookCount = prop.availableSportsbooks?.length || 0;
    if (sportsbookCount >= 5) {
      finalScore += 2; // Small boost for consensus
    }

    return Math.max(40, Math.min(95, finalScore));
  }

  /**
   * EV% (Expected Value) - 0-100 points, 30% weight
   * Sportsbook odds vs. model probability
   */
  private calculateEVPercent(
    prop: any,
    overUnderContext: "over" | "under" | "both" = "both",
  ): number {
    // Prefer our real API/UI fields when present:
    // - backend: ev_percent
    // - frontend: expectedValue
    const evLike =
      this.getNumber(prop, ["evPercent", "ev_percent", "expectedValue", "expected_value"], null) ??
      null;
    const evScore01 = this.evToScore01(evLike);
    if (evScore01 !== null) return this.clamp(evScore01 * 100, 0, 100);

    // Fallback: derive from odds + probability if available
    const odds = this.parseOdds(prop.odds || prop.best_odds_over || prop.best_odds_under);
    const probabilityRaw =
      this.getNumber(prop, ["probability", "modelProbability", "model_probability"], 0.5) ?? 0.5;
    const probability = this.asProb01(probabilityRaw) ?? 0.5;

    if (!odds || !probability) return 50; // Neutral if no data

    // Calculate EV: (probability * payout) - (1 - probability)
    const payout = odds > 0 ? odds / 100 : 100 / Math.abs(odds);
    const ev = probability * payout - (1 - probability);

    // Convert EV to 0-100 scale (positive EV = higher score)
    const evPercent = this.clamp(50 + ev * 100, 0, 100);

    // Context-aware: boost if EV aligns with over/under context
    if (overUnderContext !== "both") {
      const shouldBoost =
        (ev > 0 && overUnderContext === "over") || (ev < 0 && overUnderContext === "under");
      return shouldBoost ? Math.min(100, evPercent + 10) : Math.max(0, evPercent - 5);
    }

    return evPercent;
  }

  /**
   * Hit Rate Weighted - 0-100 points, 20% weight
   * Weighted L2G/L5/L10/L20 history
   */
  private calculateHitRateWeighted(
    prop: any,
    overUnderContext: "over" | "under" | "both" = "both",
  ): number {
    // Prefer our real API fields: l5/l10/l20 (percent 0..100 or fraction 0..1)
    const l5v =
      this.getNumber(prop, ["l5"], null) ??
      (this.getNumber(prop, ["l5_hits"], null) !== null && this.getNumber(prop, ["l5_total"], null)
        ? (this.getNumber(prop, ["l5_hits"], 0)! /
            Math.max(1, this.getNumber(prop, ["l5_total"], 1)!)) *
          100
        : null);
    const l10v =
      this.getNumber(prop, ["l10"], null) ??
      (this.getNumber(prop, ["l10_hits"], null) !== null &&
      this.getNumber(prop, ["l10_total"], null)
        ? (this.getNumber(prop, ["l10_hits"], 0)! /
            Math.max(1, this.getNumber(prop, ["l10_total"], 1)!)) *
          100
        : null);
    const l20v =
      this.getNumber(prop, ["l20"], null) ??
      (this.getNumber(prop, ["l20_hits"], null) !== null &&
      this.getNumber(prop, ["l20_total"], null)
        ? (this.getNumber(prop, ["l20_hits"], 0)! /
            Math.max(1, this.getNumber(prop, ["l20_total"], 1)!)) *
          100
        : null);

    const l5 = this.asProb01(l5v) ?? 0.5;
    const l10 = this.asProb01(l10v) ?? l5 ?? 0.5;
    const l20 = this.asProb01(l20v) ?? l10 ?? 0.5;

    // L2G isn't in our payload; approximate using L5 to avoid neutralizing everything.
    const l2g =
      this.asProb01(this.getNumber(prop, ["recentHitRate", "recent_hit_rate"], null)) ?? l5 ?? 0.5;

    // Weight recent games more heavily: L2G (40%), L5 (30%), L10 (20%), L20 (10%)
    const weightedHitRate = l2g * 0.4 + l5 * 0.3 + l10 * 0.2 + l20 * 0.1;

    // Convert to 0-100 scale
    let score = weightedHitRate * 100;

    // Bonus for consistency across timeframes
    const variance = Math.abs(l2g - l20);
    if (variance < 0.1)
      score += 10; // Very consistent
    else if (variance > 0.3) score -= 10; // High variance

    return this.clamp(score, 0, 100);
  }

  /**
   * Matchup Grade - 0-100 points, 15% weight
   * Opponent rank normalized 0-100
   */
  private calculateMatchupGrade(
    prop: any,
    overUnderContext: "over" | "under" | "both" = "both",
  ): number {
    const rank =
      this.getNumber(prop, ["opponentRank", "opponent_rank", "matchupRank", "matchup_rank"], 16) ??
      16; // 1=best defense, 32=worst
    const base = this.scale(32 - rank, 0, 31, 20, 100); // worse defense -> higher score

    if (overUnderContext === "both") return this.clamp(base, 0, 100);

    // Under: strong defense should be helpful -> invert around midpoint
    const inverted = 100 - base;
    return this.clamp(overUnderContext === "under" ? inverted : base, 0, 100);
  }

  /**
   * Streak Factor - 0-100 points, 10% weight
   * Momentum adjustment
   */
  private calculateStreakFactor(
    prop: any,
    overUnderContext: "over" | "under" | "both" = "both",
  ): number {
    let score = 50; // Neutral base

    // Factor in recent form
    if (prop.recentForm) {
      switch (prop.recentForm.toLowerCase()) {
        case "hot":
        case "excellent":
          score += 30;
          break;
        case "good":
        case "strong":
          score += 20;
          break;
        case "average":
        case "neutral":
          score += 0;
          break;
        case "cold":
        case "poor":
          score -= 20;
          break;
      }
    }

    // Streak bonus/penalty
    const streak =
      this.getNumber(prop, ["currentStreak", "current_streak", "streak_l5", "streakL5"], 0) ?? 0;
    if (streak >= 3)
      score += 15; // Hot streak
    else if (streak <= -3) score -= 15; // Cold streak

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Line Sensitivity - 0-100 points, 10% weight
   * Current line vs player's historical average
   */
  private calculateLineSensitivity(
    prop: any,
    overUnderContext: "over" | "under" | "both" = "both",
  ): number {
    const currentLine = this.getNumber(prop, ["line"], 0) ?? 0;
    const historicalAvg =
      this.getNumber(
        prop,
        ["historicalAverage", "historical_avg", "seasonAverage", "season_avg"],
        null,
      ) ?? currentLine;

    if (!currentLine || !historicalAvg) return 50;

    const difference = currentLine - historicalAvg;
    const percentDiff = (difference / historicalAvg) * 100;

    // Favor lines that are lower than historical (easier to hit over)
    let score = 50;
    if (percentDiff < -10)
      score += 20; // Line significantly lower
    else if (percentDiff < -5)
      score += 10; // Line moderately lower
    else if (percentDiff > 10)
      score -= 20; // Line significantly higher
    else if (percentDiff > 5) score -= 10; // Line moderately higher

    return Math.max(0, Math.min(100, score));
  }

  /**
   * AI Model Prediction - 0-100 points, 15% weight
   * AI model's confidence (0-100 scale)
   */
  private calculateAIPrediction(
    prop: any,
    overUnderContext: "over" | "under" | "both" = "both",
  ): number {
    if (!prop.aiPrediction) return 50; // Neutral if no AI prediction

    const baseConfidence = prop.aiPrediction.confidence || 0.5;
    let score = baseConfidence * 100; // 0-100 base points

    // Context-aware scoring based on over/under filter
    if (overUnderContext !== "both") {
      const aiRecommendation = prop.aiPrediction.recommended;

      // If AI recommendation matches the filter context, boost the score
      if (aiRecommendation === overUnderContext) {
        score += 20; // Bonus for alignment
      } else {
        score -= 30; // Penalty for misalignment
      }
    }

    // Bonus points for strong AI confidence
    if (baseConfidence >= 0.9) score += 20;
    else if (baseConfidence >= 0.8) score += 15;
    else if (baseConfidence >= 0.7) score += 10;
    else if (baseConfidence >= 0.6) score += 5;

    // Penalty for very low confidence
    if (baseConfidence < 0.4) score -= 20;
    else if (baseConfidence < 0.5) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Helper method to parse odds from various formats
   */
  private parseOdds(odds: any): number {
    if (typeof odds === "number") return odds;
    if (typeof odds === "string") {
      const num = parseFloat(odds);
      if (!isNaN(num)) return num;
    }
    return 0;
  }

  /**
   * Convert American odds to implied probability
   */
  private americanOddsToImpliedProbability(odds: number): number {
    if (odds > 0) {
      return 100 / (odds + 100);
    } else {
      return Math.abs(odds) / (Math.abs(odds) + 100);
    }
  }

  /**
   * Helper functions for the new rating system
   */
  private clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
  }

  private safeScore(n: number): number {
    // Ensure factor scores remain in 0..100
    if (!Number.isFinite(n)) return 50;
    return this.clamp(n, 0, 100);
  }

  /**
   * Normalize to slate per mode (Over/Under), mapping min..max raw composite to 40..95.
   */
  private normalizeToSlateMode(
    rawComposite: number,
    mode: "over" | "under" | "both",
    band: { min: number; max: number } = { min: 40, max: 95 },
  ): number {
    // Acquire slate distribution for the current mode from a precomputed context
    const stats = this.slateStats?.[mode === "both" ? "over" : mode] || {
      min: rawComposite,
      max: rawComposite,
    };
    const min = Number.isFinite(stats.min) ? stats.min : rawComposite;
    const max = Number.isFinite(stats.max) ? stats.max : rawComposite;

    if (max <= min) return band.min + (band.max - band.min) * 0.5; // flat slate fallback -> midpoint

    // Linear map rawComposite into [band.min, band.max]
    const scaled = band.min + ((rawComposite - min) / (max - min)) * (band.max - band.min);
    return this.clamp(scaled, band.min, band.max);
  }

  /**
   * Bounded adjustments: small, capped, and independent of slate min/max so we keep the spread intact.
   */
  private applyBoundedAdjustments(score: number, prop: any): number {
    const vol = Number(prop.stdDev ?? prop.volatility ?? 0);
    const books = Number(
      prop.sportsbooks ?? prop.bookCount ?? prop.availableSportsbooks?.length ?? 0,
    );
    const consensus = Number(prop.consensusSpread ?? 0.05); // stdev across lines/prices

    // Volatility penalty: up to -7 points
    const volPenalty = this.clamp(this.scale(vol, 10, 60, 0, 7), 0, 7);

    // Consensus boost: up to +5 points (more books + tighter market)
    const booksBoost = this.scale(books, 1, 8, 0, 3); // 0..3
    const tightnessBoost = this.scale(1 / Math.max(consensus, 0.01), 10, 200, 0, 2); // 0..2
    const consensusBoost = this.clamp(booksBoost + tightnessBoost, 0, 5);

    return score - volPenalty + consensusBoost;
  }

  /**
   * Generic scaler (maps x from [inMin,inMax] to [outMin,outMax])
   */
  private scale(x: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    if (!Number.isFinite(x) || inMax === inMin) return (outMin + outMax) / 2;
    const t = (x - inMin) / (inMax - inMin);
    return outMin + this.clamp(t, 0, 1) * (outMax - outMin);
  }

  /**
   * Get letter grade based on overall score (40-95 range)
   * Updated thresholds: 95-90=A, 89-80=B, 79-70=C, 69-60=D, 59&lower=F
   */
  private getGrade(score: number): StatpediaRating["grade"] {
    if (score >= 95) return "A";
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }

  /**
   * Get color coding based on score (0-95 range)
   * 80-95 is green, 70-79 is yellow, 69 and below is RED
   */
  private getColor(score: number): StatpediaRating["color"] {
    if (score >= 80) return "green";
    if (score >= 70) return "yellow";
    return "red";
  }

  /**
   * Get confidence level (40-95 range)
   */
  private getConfidenceLevel(
    score: number,
    factors: StatpediaRatingFactors,
  ): StatpediaRating["confidence"] {
    const highFactors = Object.values(factors).filter((f) => f >= 70);

    if (score >= 75 && highFactors.length >= 3) return "High";
    if (score >= 60 && highFactors.length >= 2) return "Medium";
    return "Low";
  }

  /**
   * Generate reasoning for the rating
   */
  private generateReasoning(factors: StatpediaRatingFactors, prop: any): string[] {
    const reasoning: string[] = [];

    // EV% reasoning
    if (factors.evPercent >= 80) {
      reasoning.push(`Excellent expected value (${Math.round(factors.evPercent)}%)`);
    } else if (factors.evPercent <= 30) {
      reasoning.push(`Poor expected value - proceed with caution`);
    }

    // Hit Rate Weighted reasoning
    if (factors.hitRateWeighted >= 80) {
      reasoning.push(`Strong weighted hit rate across recent games`);
    } else if (factors.hitRateWeighted <= 30) {
      reasoning.push(`Low weighted hit rate - inconsistent performance`);
    }

    // Matchup Grade reasoning
    if (factors.matchupGrade >= 80) {
      reasoning.push(`Favorable matchup vs. ${prop.opponentAbbr || "opponent"}`);
    } else if (factors.matchupGrade <= 30) {
      reasoning.push(`Tough matchup vs. ${prop.opponentAbbr || "opponent"}`);
    }

    // Streak Factor reasoning
    if (factors.streakFactor >= 80) {
      reasoning.push(`Player in excellent recent form`);
    } else if (factors.streakFactor <= 30) {
      reasoning.push(`Player struggling recently`);
    }

    // Line Sensitivity reasoning
    if (factors.lineSensitivity >= 80) {
      reasoning.push(`Favorable line vs. historical average`);
    } else if (factors.lineSensitivity <= 30) {
      reasoning.push(`Challenging line vs. historical average`);
    }

    // AI Prediction reasoning
    if (factors.aiPrediction >= 80) {
      reasoning.push(
        `Strong AI confidence (${Math.round((prop.aiPrediction?.confidence || 0.5) * 100)}%)`,
      );
    } else if (factors.aiPrediction <= 30) {
      reasoning.push(`Low AI confidence - proceed with caution`);
    }

    // Default reasoning if none specific
    if (reasoning.length === 0) {
      reasoning.push(`Balanced analysis across all factors`);
    }

    return reasoning;
  }
}

// Export singleton instance
export const statpediaRatingService = new StatpediaRatingService();
