/**
 * Icura Early-Goal Engine
 *
 * Implements the blueprint:
 * - Poisson model from early xG (stable)
 * - ML correction layer (placeholder hook; plug in XGBoost/LightGBM offline later)
 * - Blend 0.6 Poisson + 0.4 ML
 *
 * Output: P(goal in first 5), P(goal in first 10), fair odds, edge, reasons.
 */

import { predictMlP10FromRow, predictMlP5FromRow, getEarlyGoalMlArtifact } from "./ml-artifact";
import { calibrateProbability } from "./calibration";

export interface EarlyGameFeatureRow {
  gameId: string;
  dateISO: string;

  // Team features (subset; the dataset table holds many more)
  home_team_xgf_first10_last20?: number | null;
  home_team_xga_first10_last20?: number | null;
  home_team_rush_chances_first10_last20?: number | null;
  home_team_high_danger_first10_last20?: number | null;
  home_team_shot_attempts_first10?: number | null;
  // First 5 features (critical for G1F5)
  home_team_xgf_first5_last20?: number | null;
  home_team_xga_first5_last20?: number | null;
  home_team_rush_chances_first5_last20?: number | null;
  home_team_high_danger_first5_last20?: number | null;
  home_team_time_to_first_shot?: number | null;
  home_team_time_to_first_hd?: number | null;
  home_team_time_to_first_rush?: number | null;

  away_team_xgf_first10_last20?: number | null;
  away_team_xga_first10_last20?: number | null;
  away_team_rush_chances_first10_last20?: number | null;
  away_team_high_danger_first10_last20?: number | null;
  away_team_shot_attempts_first10?: number | null;
  // First 5 features
  away_team_xgf_first5_last20?: number | null;
  away_team_xga_first5_last20?: number | null;
  away_team_rush_chances_first5_last20?: number | null;
  away_team_high_danger_first5_last20?: number | null;
  away_team_time_to_first_shot?: number | null;
  away_team_time_to_first_hd?: number | null;
  away_team_time_to_first_rush?: number | null;

  // Goalie
  home_goalie_gsax_first_period?: number | null;
  away_goalie_gsax_first_period?: number | null;
  home_goalie_save_pct_first5?: number | null;
  home_goalie_gsax_first5?: number | null;
  away_goalie_save_pct_first5?: number | null;
  away_goalie_gsax_first5?: number | null;

  // Context
  home_rest_days?: number | null;
  away_rest_days?: number | null;
  home_back_to_back?: boolean | null;
  away_back_to_back?: boolean | null;
  travel_distance?: number | null;
  injury_impact_home?: number | null;
  injury_impact_away?: number | null;
  ref_penalty_rate?: number | null;

  // Market
  closing_total?: number | null;
  closing_first_period_total?: number | null;
  closing_moneyline_home?: number | null;
  closing_moneyline_away?: number | null;

  // Extras (JSONB for penalty/faceoff features)
  extras?: Record<string, unknown> | null;
}

export interface EarlyGoalModelOutput {
  icuraVersion: string;
  gameId: string;
  dateISO: string;
  home_early_xG: number;
  away_early_xG: number;
  poisson_p10: number;
  ml_p10: number;
  p_g1f10: number;
  p_g1f5: number;
  fair_odds_g1f10: number;
  fair_odds_g1f5: number;
  edge_g1f10?: number | null;
  edge_g1f5?: number | null;
  reasons: string[];
  debug?: Record<string, unknown>;
}

function clamp01(x: number): number {
  return Math.max(0.0001, Math.min(0.9999, x));
}

function poissonGoalProb(lambda: number): number {
  const l = Math.max(0, lambda);
  return 1 - Math.exp(-l);
}

function safeNum(x: unknown, fallback = 0): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Step 1a — Estimate expected early xG (10 minutes)
 * We keep this as a transparent, tunable function. Later we’ll learn weights from data.
 */
export function estimateEarlyXG10(row: EarlyGameFeatureRow): {
  home: number;
  away: number;
  reasons: string[];
} {
  const reasons: string[] = [];

  const home_xgf = safeNum(row.home_team_xgf_first10_last20, 0.35);
  const home_xga = safeNum(row.home_team_xga_first10_last20, 0.35);
  const away_xgf = safeNum(row.away_team_xgf_first10_last20, 0.35);
  const away_xga = safeNum(row.away_team_xga_first10_last20, 0.35);

  // Base: blend team offense vs opponent defense (simple)
  let home = 0.55 * home_xgf + 0.45 * away_xga;
  let away = 0.55 * away_xgf + 0.45 * home_xga;

  // Rush + high danger (if available)
  const homeRush = safeNum(row.home_team_rush_chances_first10_last20, 0);
  const awayRush = safeNum(row.away_team_rush_chances_first10_last20, 0);
  const homeHD = safeNum(row.home_team_high_danger_first10_last20, 0);
  const awayHD = safeNum(row.away_team_high_danger_first10_last20, 0);

  home += 0.03 * homeRush + 0.02 * homeHD;
  away += 0.03 * awayRush + 0.02 * awayHD;

  if (homeRush + awayRush > 0) reasons.push("High rush-chance environment");
  if (homeHD + awayHD > 0) reasons.push("High danger chances early");

  // Tempo proxy from shot attempts (if available)
  const homeTempo = safeNum(row.home_team_shot_attempts_first10, 0);
  const awayTempo = safeNum(row.away_team_shot_attempts_first10, 0);
  const tempo = (homeTempo + awayTempo) / 2;
  if (tempo > 0) {
    const tempoAdj = Math.max(0.85, Math.min(1.2, 1 + (tempo - 12) / 60));
    home *= tempoAdj;
    away *= tempoAdj;
    if (tempoAdj > 1.05) reasons.push("High-tempo start");
  }

  // Goalie early weakness: GSAX first period (negative GSAX => worse)
  const homeGoalieGsax = safeNum(row.home_goalie_gsax_first_period, 0);
  const awayGoalieGsax = safeNum(row.away_goalie_gsax_first_period, 0);
  // If goalie tends to allow more than expected early, boost opponent xG
  home *= Math.max(0.9, Math.min(1.15, 1 + -awayGoalieGsax * 0.03));
  away *= Math.max(0.9, Math.min(1.15, 1 + -homeGoalieGsax * 0.03));
  if (homeGoalieGsax < -0.2 || awayGoalieGsax < -0.2) reasons.push("Weak goalie early");

  // Rest / B2B / travel (small adjustments)
  const homeB2B = !!row.home_back_to_back;
  const awayB2B = !!row.away_back_to_back;
  const travel = safeNum(row.travel_distance, 0);
  if (homeB2B) home *= 0.97;
  if (awayB2B) away *= 0.97;
  if (travel > 800) {
    home *= 0.98;
    away *= 0.98;
    reasons.push("Travel fatigue");
  }

  // Ref penalty rate (more chaos early)
  const refRate = safeNum(row.ref_penalty_rate, 0);
  if (refRate > 0) {
    const adj = Math.max(0.95, Math.min(1.12, 1 + (refRate - 0.35) * 0.2));
    home *= adj;
    away *= adj;
    if (adj > 1.03) reasons.push("High penalty environment");
  }

  return {
    home: Math.max(0.05, Math.min(1.8, home)),
    away: Math.max(0.05, Math.min(1.8, away)),
    reasons,
  };
}

/**
 * Step 1b — Estimate expected early xG (5 minutes) - SEPARATE MODEL
 * G1F5 is fundamentally different from G1F10 - needs its own xG estimation.
 */
export function estimateEarlyXG5(row: EarlyGameFeatureRow): {
  home: number;
  away: number;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Use first-5 features if available, otherwise scale from first-10
  const home_xgf = safeNum(
    row.home_team_xgf_first5_last20,
    safeNum(row.home_team_xgf_first10_last20, 0.35) * 0.5,
  );
  const home_xga = safeNum(
    row.home_team_xga_first5_last20,
    safeNum(row.home_team_xga_first10_last20, 0.35) * 0.5,
  );
  const away_xgf = safeNum(
    row.away_team_xgf_first5_last20,
    safeNum(row.away_team_xgf_first10_last20, 0.35) * 0.5,
  );
  const away_xga = safeNum(
    row.away_team_xga_first5_last20,
    safeNum(row.away_team_xga_first10_last20, 0.35) * 0.5,
  );

  // Base: blend team offense vs opponent defense
  let home = 0.55 * home_xgf + 0.45 * away_xga;
  let away = 0.55 * away_xgf + 0.45 * home_xga;

  // Rush + high danger (first 5)
  const homeRush = safeNum(
    row.home_team_rush_chances_first5_last20,
    safeNum(row.home_team_rush_chances_first10_last20, 0) * 0.5,
  );
  const awayRush = safeNum(
    row.away_team_rush_chances_first5_last20,
    safeNum(row.away_team_rush_chances_first10_last20, 0) * 0.5,
  );
  const homeHD = safeNum(
    row.home_team_high_danger_first5_last20,
    safeNum(row.home_team_high_danger_first10_last20, 0) * 0.5,
  );
  const awayHD = safeNum(
    row.away_team_high_danger_first5_last20,
    safeNum(row.away_team_high_danger_first10_last20, 0) * 0.5,
  );

  home += 0.05 * homeRush + 0.03 * homeHD; // Higher weight for first 5
  away += 0.05 * awayRush + 0.03 * awayHD;

  if (homeRush + awayRush > 0) reasons.push("Rush chances early");
  if (homeHD + awayHD > 0) reasons.push("High danger early");

  // Time to first shot/HD/rush (critical for G1F5)
  const homeTimeToShot = safeNum(row.home_team_time_to_first_shot, null);
  const awayTimeToShot = safeNum(row.away_team_time_to_first_shot, null);
  const homeTimeToHD = safeNum(row.home_team_time_to_first_hd, null);
  const awayTimeToHD = safeNum(row.away_team_time_to_first_hd, null);

  // Faster first events = higher probability
  if (homeTimeToShot !== null && homeTimeToShot < 60) {
    home *= 1.15; // Very fast first shot
    reasons.push("Home team starts fast");
  }
  if (awayTimeToShot !== null && awayTimeToShot < 60) {
    away *= 1.15;
    reasons.push("Away team starts fast");
  }
  if (homeTimeToHD !== null && homeTimeToHD < 120) {
    home *= 1.1; // Early high-danger chance
  }
  if (awayTimeToHD !== null && awayTimeToHD < 120) {
    away *= 1.1;
  }

  // Goalie early weakness (first 5 specifically)
  const homeGoalieSavePct5 = safeNum(row.home_goalie_save_pct_first5, null);
  const awayGoalieSavePct5 = safeNum(row.away_goalie_save_pct_first5, null);
  const homeGoalieGsax5 = safeNum(row.home_goalie_gsax_first5, null);
  const awayGoalieGsax5 = safeNum(row.away_goalie_gsax_first5, null);

  // If goalie has poor early save % or negative GSAx, boost opponent
  if (homeGoalieSavePct5 !== null && homeGoalieSavePct5 < 0.85) {
    away *= 1.12; // Goalie starts cold
    reasons.push("Home goalie cold start");
  }
  if (awayGoalieSavePct5 !== null && awayGoalieSavePct5 < 0.85) {
    home *= 1.12;
    reasons.push("Away goalie cold start");
  }
  if (homeGoalieGsax5 !== null && homeGoalieGsax5 < -0.1) {
    away *= 1.08;
  }
  if (awayGoalieGsax5 !== null && awayGoalieGsax5 < -0.1) {
    home *= 1.08;
  }

  // Penalty volatility (critical for G1F5)
  // Penalties in first 5 minutes are highly predictive
  const extras = (row as any).extras || {};
  const homePenalties5 = safeNum(extras.home_penalties_first5, 0);
  const awayPenalties5 = safeNum(extras.away_penalties_first5, 0);
  const homePenaltyTime5 = safeNum(extras.home_penalty_time_first5, 0);
  const awayPenaltyTime5 = safeNum(extras.away_penalty_time_first5, 0);

  // Penalties create power plays = huge xG boost
  if (homePenalties5 > 0) {
    away *= 1 + homePenalties5 * 0.25 + homePenaltyTime5 * 0.01; // Power play boost
    reasons.push(`Home team penalty early (${homePenalties5})`);
  }
  if (awayPenalties5 > 0) {
    home *= 1 + awayPenalties5 * 0.25 + awayPenaltyTime5 * 0.01;
    reasons.push(`Away team penalty early (${awayPenalties5})`);
  }

  // Faceoff tempo (faster faceoffs = higher tempo = more scoring)
  const minFaceoffTime = safeNum(extras.min_time_since_faceoff_first5, null);
  const avgFaceoffTime = safeNum(extras.avg_time_since_faceoff_first5, null);
  if (minFaceoffTime !== null && minFaceoffTime < 30) {
    // Very fast faceoffs = high tempo
    home *= 1.08;
    away *= 1.08;
    reasons.push("Fast faceoff tempo");
  }
  if (avgFaceoffTime !== null && avgFaceoffTime < 45) {
    home *= 1.05;
    away *= 1.05;
  }

  // Rest / B2B (smaller impact for first 5)
  const homeB2B = !!row.home_back_to_back;
  const awayB2B = !!row.away_back_to_back;
  if (homeB2B) home *= 0.98;
  if (awayB2B) away *= 0.98;

  return {
    home: Math.max(0.02, Math.min(1.2, home)),
    away: Math.max(0.02, Math.min(1.2, away)),
    reasons,
  };
}

/**
 * Step 3 — ML correction layer
 * Placeholder that returns Poisson probability for now.
 * We’ll replace with model inference once we train (XGBoost/LightGBM offline).
 */
export function mlCorrectionP10(row: EarlyGameFeatureRow, poissonP10: number): number {
  // Implemented via offline-trained artifact loader (logistic regression JSON).
  // If artifact is missing, fall back to Poisson probability.
  // NOTE: kept sync signature for simplicity; wrapper uses async where needed.
  void row;
  return poissonP10;
}

/**
 * Async engine: uses ML artifact if present.
 */
export async function runEarlyGoalEngineAsync(
  row: EarlyGameFeatureRow,
): Promise<EarlyGoalModelOutput> {
  const icuraVersion = "icura-early-goal-0.2.0"; // Updated for separate G1F5 model

  // G1F10: Use 10-minute xG model
  const { home: home10, away: away10, reasons: xgReasons10 } = estimateEarlyXG10(row);
  const lambda10 = home10 + away10;
  const poisson_p10 = clamp01(poissonGoalProb(lambda10));

  // ML correction for G1F10
  const mlPred10 = await predictMlP10FromRow(row as any);
  const ml_p10 = clamp01(mlPred10 ?? poisson_p10);

  // Blended P(G1F10)
  const p_g1f10_raw = clamp01(0.6 * poisson_p10 + 0.4 * ml_p10);
  // Apply Platt Scaling calibration
  const artifact = await getEarlyGoalMlArtifact();
  const p_g1f10 = clamp01(calibrateProbability(p_g1f10_raw, "g1f10", artifact));

  // G1F5: Use SEPARATE 5-minute xG model (not scaled from G1F10)
  const { home: home5, away: away5, reasons: xgReasons5 } = estimateEarlyXG5(row);
  const lambda5 = home5 + away5;
  const poisson_p5 = clamp01(poissonGoalProb(lambda5));

  // ML correction for G1F5
  const mlPred5 = await predictMlP5FromRow(row as any);
  const ml_p5 = clamp01(mlPred5 ?? poisson_p5);

  // Blended P(G1F5) - Higher ML weight for G1F5 (more nonlinear)
  const p_g1f5_raw = clamp01(0.3 * poisson_p5 + 0.7 * ml_p5);
  // Apply Platt Scaling calibration
  const p_g1f5 = clamp01(calibrateProbability(p_g1f5_raw, "g1f5", artifact));

  const fair_odds_g1f10 = probToFairDecimalOdds(p_g1f10);
  const fair_odds_g1f5 = probToFairDecimalOdds(p_g1f5);

  const reasons = Array.from(new Set([...xgReasons10, ...xgReasons5])).slice(0, 6);

  return {
    icuraVersion,
    gameId: row.gameId,
    dateISO: row.dateISO,
    home_early_xG: home10,
    away_early_xG: away10,
    poisson_p10,
    ml_p10,
    p_g1f10,
    p_g1f5,
    fair_odds_g1f10,
    fair_odds_g1f5,
    edge_g1f10: null,
    edge_g1f5: null,
    reasons,
    debug: {
      lambda10,
      lambda5,
      mlArtifactUsed: mlPred10 !== null || mlPred5 !== null,
    },
  };
}

export function americanToDecimalOdds(odds: number): number | null {
  const o = Number(odds);
  if (!Number.isFinite(o) || o === 0) return null;
  if (o > 0) return 1 + o / 100;
  return 1 + 100 / Math.abs(o);
}

export function computeEdgeFromAmericanYesOdds(
  pFair: number,
  yesOdds?: number | null,
): number | null {
  if (yesOdds === null || yesOdds === undefined) return null;
  const marketDec = americanToDecimalOdds(yesOdds);
  if (!marketDec) return null;
  const fairDec = probToFairDecimalOdds(pFair);
  return (marketDec - fairDec) / fairDec;
}

export function americanOddsToImpliedProb(odds?: number | null): number | null {
  if (odds === null || odds === undefined) return null;
  const o = Number(odds);
  if (!Number.isFinite(o) || o === 0) return null;
  if (o < 0) return Math.abs(o) / (Math.abs(o) + 100);
  return 100 / (o + 100);
}

export function probToFairDecimalOdds(p: number): number {
  const pp = clamp01(p);
  return 1 / pp;
}

export function computeEdgeFromMarketProb(
  pFair: number,
  marketImpliedProb?: number | null,
): number | null {
  if (marketImpliedProb === null || marketImpliedProb === undefined) return null;
  const fairOdds = probToFairDecimalOdds(pFair);
  const marketOdds = probToFairDecimalOdds(marketImpliedProb);
  return (marketOdds - fairOdds) / fairOdds;
}

/**
 * Main engine: compute p(G1F10) + p(G1F5) and edge if market implied probability is provided.
 */
export function runEarlyGoalEngine(row: EarlyGameFeatureRow): EarlyGoalModelOutput {
  const icuraVersion = "icura-early-goal-0.1.0";

  // Step 1: early xG (10)
  const { home, away, reasons: xgReasons } = estimateEarlyXG10(row);
  const lambda10 = home + away;

  // Step 2: Poisson
  const poisson_p10 = clamp01(poissonGoalProb(lambda10));

  // Step 3: ML correction
  const ml_p10 = clamp01(mlCorrectionP10(row, poisson_p10));

  // Step 4: blend
  const p_g1f10 = clamp01(0.6 * poisson_p10 + 0.4 * ml_p10);

  // Scale to first 5 with tempo adjustment proxy (use shot attempts if available)
  const tempoProxy =
    safeNum(row.home_team_shot_attempts_first10, 0) +
    safeNum(row.away_team_shot_attempts_first10, 0);
  const tempoAdj = Math.max(0.85, Math.min(1.2, 1 + (tempoProxy - 24) / 120));
  const lambda5 = lambda10 * 0.5 * tempoAdj;
  const p_g1f5 = clamp01(0.6 * poissonGoalProb(lambda5) + 0.4 * clamp01(ml_p10 * 0.5 * tempoAdj));

  // Market edge hooks (if you pass market odds later)
  const marketImpliedP10 = null; // set when we attach actual market odds for this market
  const marketImpliedP5 = null;

  const fair_odds_g1f10 = probToFairDecimalOdds(p_g1f10);
  const fair_odds_g1f5 = probToFairDecimalOdds(p_g1f5);

  const edge_g1f10 = computeEdgeFromMarketProb(p_g1f10, marketImpliedP10);
  const edge_g1f5 = computeEdgeFromMarketProb(p_g1f5, marketImpliedP5);

  const reasons = Array.from(new Set(xgReasons)).slice(0, 6);

  return {
    icuraVersion,
    gameId: row.gameId,
    dateISO: row.dateISO,
    home_early_xG: home,
    away_early_xG: away,
    poisson_p10,
    ml_p10,
    p_g1f10,
    p_g1f5,
    fair_odds_g1f10,
    fair_odds_g1f5,
    edge_g1f10,
    edge_g1f5,
    reasons,
    debug: {
      lambda10,
      tempoAdj,
      lambda5,
    },
  };
}
