/**
 * Icura Early-Goal Engine
 *
 * Implements the blueprint:
 * - Poisson model from early xG (stable)
 * - ML correction layer (placeholder hook; plug in XGBoost/LightGBM offline later)
 * - Blend 0.6 Poisson + 0.4 ML
 *
 * Output: P(goal in first 5), P(goal in first 10), fair odds, edge, reasons.
 *
 * NEW G1F10 FEATURES (v0.3.0):
 * - Referee-level penalty rates (first period, first 10 min, bias metrics)
 * - Shift-level matchup modeling (top-line xGF/xGA, rush/HD rates, top-pair suppression)
 * - Penalty volatility features (team draw/take rates, volatility index, ref-team interactions)
 * - Travel + fatigue interactions (B2B+travel, 3-in-4+travel, west-to-east, early start times)
 * - Goalie-specific early-game tendencies (first-shot save %, first 3 shots, rebound rate, rush/screened save %)
 *
 * These features are designed to push accuracy from 62.9% → 70% by capturing
 * the last layer of signal that most models miss.
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

  // NEW G1F10 FEATURES - Referee-level penalty rates
  ref_penalties_first_period_avg?: number | null;
  ref_penalties_first10_avg?: number | null;
  ref_minors_vs_majors_ratio?: number | null;
  ref_home_away_penalty_bias?: number | null; // -0.5 to 0.5

  // NEW G1F10 FEATURES - Shift-level matchup modeling
  home_top_line_xgf_first10_last20?: number | null;
  home_top_line_xga_first10_last20?: number | null;
  home_top_line_rush_rate_first10_last20?: number | null;
  home_top_line_hd_rate_first10_last20?: number | null;
  home_top_pair_xga_suppression_first10_last20?: number | null;
  away_top_line_xgf_first10_last20?: number | null;
  away_top_line_xga_first10_last20?: number | null;
  away_top_line_rush_rate_first10_last20?: number | null;
  away_top_line_hd_rate_first10_last20?: number | null;
  away_top_pair_xga_suppression_first10_last20?: number | null;

  // NEW G1F10 FEATURES - Penalty volatility
  home_draw_penalty_rate_first10?: number | null;
  home_take_penalty_rate_first10?: number | null;
  away_draw_penalty_rate_first10?: number | null;
  away_take_penalty_rate_first10?: number | null;
  penalty_volatility_index?: number | null;
  ref_team_interaction_home?: number | null;
  ref_team_interaction_away?: number | null;

  // NEW G1F10 FEATURES - Travel + fatigue interactions
  home_b2b_travel?: boolean | null;
  away_b2b_travel?: boolean | null;
  home_3in4_travel?: boolean | null;
  away_3in4_travel?: boolean | null;
  west_to_east_travel?: boolean | null;
  early_start_time?: boolean | null; // Game starts before 7pm local

  // NEW G1F10 FEATURES - Goalie-specific early-game tendencies
  home_goalie_first_shot_save_pct?: number | null;
  home_goalie_first_3_shots_save_pct?: number | null;
  home_goalie_rebound_rate_first10?: number | null;
  home_goalie_rush_save_pct_first10?: number | null;
  home_goalie_screened_save_pct_first10?: number | null;
  away_goalie_first_shot_save_pct?: number | null;
  away_goalie_first_3_shots_save_pct?: number | null;
  away_goalie_rebound_rate_first10?: number | null;
  away_goalie_rush_save_pct_first10?: number | null;
  away_goalie_screened_save_pct_first10?: number | null;

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

  // PREGAME PREDICTIONS: Use historical last20 features (what the model was trained on)
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

  // NEW: Referee-level penalty rates (first 10 minutes specifically)
  const refPenaltiesFirst10 = safeNum(
    row.ref_penalties_first10_avg,
    safeNum(row.ref_penalty_rate, 0),
  );
  const refPenaltiesFirstPeriod = safeNum(row.ref_penalties_first_period_avg, refPenaltiesFirst10);
  const refMinorsRatio = safeNum(row.ref_minors_vs_majors_ratio, 0.8); // Default: mostly minors
  const refHomeBias = safeNum(row.ref_home_away_penalty_bias, 0);

  // Referee penalty impact: first 10 minutes is critical
  if (refPenaltiesFirst10 > 0) {
    const refAdj = Math.max(0.95, Math.min(1.15, 1 + (refPenaltiesFirst10 - 0.3) * 0.25));
    home *= refAdj;
    away *= refAdj;
    if (refAdj > 1.05) reasons.push("High penalty ref (first 10)");
  }

  // Referee home/away bias affects early scoring
  if (Math.abs(refHomeBias) > 0.1) {
    home *= 1 + refHomeBias * 0.08; // Home team gets more PPs = more xG
    away *= 1 - refHomeBias * 0.08;
    if (refHomeBias > 0.1) reasons.push("Ref favors home early");
    if (refHomeBias < -0.1) reasons.push("Ref favors away early");
  }

  // NEW: Shift-level matchup modeling (top line vs top pair)
  const homeTopLineXGF = safeNum(row.home_top_line_xgf_first10_last20, home_xgf * 0.4); // Top line ~40% of team xG
  const homeTopLineXGA = safeNum(row.home_top_line_xga_first10_last20, home_xga * 0.4);
  const awayTopPairSuppression = safeNum(row.away_top_pair_xga_suppression_first10_last20, 0);
  const homeTopLineRush = safeNum(row.home_top_line_rush_rate_first10_last20, homeRush * 0.4);
  const homeTopLineHD = safeNum(row.home_top_line_hd_rate_first10_last20, homeHD * 0.4);

  const awayTopLineXGF = safeNum(row.away_top_line_xgf_first10_last20, away_xgf * 0.4);
  const awayTopLineXGA = safeNum(row.away_top_line_xga_first10_last20, away_xga * 0.4);
  const homeTopPairSuppression = safeNum(row.home_top_pair_xga_suppression_first10_last20, 0);
  const awayTopLineRush = safeNum(row.away_top_line_rush_rate_first10_last20, awayRush * 0.4);
  const awayTopLineHD = safeNum(row.away_top_line_hd_rate_first10_last20, awayHD * 0.4);

  // Top line matchup boost: if top line is strong vs weak top pair
  const homeMatchupBoost = Math.max(
    0.95,
    Math.min(1.12, 1 + (homeTopLineXGF - awayTopPairSuppression) * 0.15),
  );
  const awayMatchupBoost = Math.max(
    0.95,
    Math.min(1.12, 1 + (awayTopLineXGF - homeTopPairSuppression) * 0.15),
  );
  home *= homeMatchupBoost;
  away *= awayMatchupBoost;
  if (homeMatchupBoost > 1.05 || awayMatchupBoost > 1.05) reasons.push("Strong top-line matchup");

  // Top line rush/HD rates (first 10 is dominated by top lines)
  home += 0.04 * homeTopLineRush + 0.03 * homeTopLineHD;
  away += 0.04 * awayTopLineRush + 0.03 * awayTopLineHD;

  // NEW: Penalty volatility features
  const homeDrawPenalty = safeNum(row.home_draw_penalty_rate_first10, 0);
  const homeTakePenalty = safeNum(row.home_take_penalty_rate_first10, 0);
  const awayDrawPenalty = safeNum(row.away_draw_penalty_rate_first10, 0);
  const awayTakePenalty = safeNum(row.away_take_penalty_rate_first10, 0);
  const penaltyVolatility = safeNum(
    row.penalty_volatility_index,
    (homeDrawPenalty + homeTakePenalty + awayDrawPenalty + awayTakePenalty) / 4,
  );

  // Penalty volatility = more power plays = more early goals
  if (penaltyVolatility > 0.15) {
    const volAdj = Math.max(1.0, Math.min(1.12, 1 + (penaltyVolatility - 0.15) * 0.3));
    home *= volAdj;
    away *= volAdj;
    if (volAdj > 1.05) reasons.push("High penalty volatility");
  }

  // Ref-team interaction: ref's penalty rate × team's penalty tendency
  const refTeamHome = safeNum(row.ref_team_interaction_home, refPenaltiesFirst10 * homeTakePenalty);
  const refTeamAway = safeNum(row.ref_team_interaction_away, refPenaltiesFirst10 * awayTakePenalty);
  if (refTeamHome > 0.1) {
    away *= 1 + refTeamHome * 0.1; // Home takes penalties = away gets PPs
  }
  if (refTeamAway > 0.1) {
    home *= 1 + refTeamAway * 0.1; // Away takes penalties = home gets PPs
  }

  // NEW: Travel + fatigue interactions
  const homeB2BTravel = !!row.home_b2b_travel;
  const awayB2BTravel = !!row.away_b2b_travel;
  const home3in4Travel = !!row.home_3in4_travel;
  const away3in4Travel = !!row.away_3in4_travel;
  const westToEast = !!row.west_to_east_travel;
  const earlyStart = !!row.early_start_time;

  // B2B + travel is brutal
  if (homeB2BTravel) {
    home *= 0.92;
    reasons.push("Home B2B + travel");
  }
  if (awayB2BTravel) {
    away *= 0.92;
    reasons.push("Away B2B + travel");
  }

  // 3-in-4 + travel is even worse
  if (home3in4Travel) {
    home *= 0.9;
    reasons.push("Home 3-in-4 + travel");
  }
  if (away3in4Travel) {
    away *= 0.9;
    reasons.push("Away 3-in-4 + travel");
  }

  // West-to-east travel (time zone change)
  if (westToEast) {
    away *= 0.94;
    reasons.push("West-to-east travel");
  }

  // Early start times (before 7pm local) = less energy
  if (earlyStart) {
    home *= 0.97;
    away *= 0.97;
    reasons.push("Early start time");
  }

  // Regular B2B (without travel) - smaller impact
  if (homeB2B && !homeB2BTravel) home *= 0.97;
  if (awayB2B && !awayB2BTravel) away *= 0.97;

  // Regular travel (without B2B)
  if (travel > 800 && !homeB2BTravel && !awayB2BTravel) {
    home *= 0.98;
    away *= 0.98;
    if (travel > 1500) reasons.push("Long travel");
  }

  // NEW: Goalie-specific early-game tendencies
  const homeGoalieFirstShotSave = safeNum(row.home_goalie_first_shot_save_pct, null);
  const homeGoalieFirst3Save = safeNum(row.home_goalie_first_3_shots_save_pct, null);
  const homeGoalieReboundRate = safeNum(row.home_goalie_rebound_rate_first10, null);
  const homeGoalieRushSave = safeNum(row.home_goalie_rush_save_pct_first10, null);
  const homeGoalieScreenedSave = safeNum(row.home_goalie_screened_save_pct_first10, null);

  const awayGoalieFirstShotSave = safeNum(row.away_goalie_first_shot_save_pct, null);
  const awayGoalieFirst3Save = safeNum(row.away_goalie_first_3_shots_save_pct, null);
  const awayGoalieReboundRate = safeNum(row.away_goalie_rebound_rate_first10, null);
  const awayGoalieRushSave = safeNum(row.away_goalie_rush_save_pct_first10, null);
  const awayGoalieScreenedSave = safeNum(row.away_goalie_screened_save_pct_first10, null);

  // Goalie cold start: first shot save % is critical
  if (homeGoalieFirstShotSave !== null && homeGoalieFirstShotSave < 0.7) {
    away *= 1.15; // Goalie allows first shot often = opponent scores early
    reasons.push("Home goalie cold first shot");
  }
  if (awayGoalieFirstShotSave !== null && awayGoalieFirstShotSave < 0.7) {
    home *= 1.15;
    reasons.push("Away goalie cold first shot");
  }

  // First 3 shots save % (early game stability)
  if (homeGoalieFirst3Save !== null && homeGoalieFirst3Save < 0.75) {
    away *= 1.1;
  }
  if (awayGoalieFirst3Save !== null && awayGoalieFirst3Save < 0.75) {
    home *= 1.1;
  }

  // Rebound rate (high = more second chances = more goals)
  if (homeGoalieReboundRate !== null && homeGoalieReboundRate > 0.25) {
    away *= 1.08;
  }
  if (awayGoalieReboundRate !== null && awayGoalieReboundRate > 0.25) {
    home *= 1.08;
  }

  // Rush save % (rush chances are high-danger in first 10)
  if (homeGoalieRushSave !== null && homeGoalieRushSave < 0.8) {
    away *= 1.12;
    if (awayRush > 0.5) reasons.push("Home goalie weak on rushes");
  }
  if (awayGoalieRushSave !== null && awayGoalieRushSave < 0.8) {
    home *= 1.12;
    if (homeRush > 0.5) reasons.push("Away goalie weak on rushes");
  }

  // Screened shot save % (screens are common early)
  if (homeGoalieScreenedSave !== null && homeGoalieScreenedSave < 0.75) {
    away *= 1.08;
  }
  if (awayGoalieScreenedSave !== null && awayGoalieScreenedSave < 0.75) {
    home *= 1.08;
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

  // PREGAME PREDICTIONS: Use historical last20 features (what the model was trained on)
  // Do NOT use in-game features (current_game.*) for pregame predictions
  const home_xgf_5_hist = safeNum(row.home_team_xgf_first5_last20, 0);
  const home_xga_5_hist = safeNum(row.home_team_xga_first5_last20, 0);
  const away_xgf_5_hist = safeNum(row.away_team_xgf_first5_last20, 0);
  const away_xga_5_hist = safeNum(row.away_team_xga_first5_last20, 0);

  const home_xgf_10_hist = safeNum(row.home_team_xgf_first10_last20, 0);
  const home_xga_10_hist = safeNum(row.home_team_xga_first10_last20, 0);
  const away_xgf_10_hist = safeNum(row.away_team_xgf_first10_last20, 0);
  const away_xga_10_hist = safeNum(row.away_team_xga_first10_last20, 0);

  // Use historical first5 if available, otherwise scale from first10, otherwise league-average default
  const home_xgf =
    home_xgf_5_hist > 0 ? home_xgf_5_hist : home_xgf_10_hist > 0 ? home_xgf_10_hist * 0.5 : 0.2;
  const home_xga =
    home_xga_5_hist > 0 ? home_xga_5_hist : home_xga_10_hist > 0 ? home_xga_10_hist * 0.5 : 0.2;
  const away_xgf =
    away_xgf_5_hist > 0 ? away_xgf_5_hist : away_xgf_10_hist > 0 ? away_xgf_10_hist * 0.5 : 0.2;
  const away_xga =
    away_xga_5_hist > 0 ? away_xga_5_hist : away_xga_10_hist > 0 ? away_xga_10_hist * 0.5 : 0.2;

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
    // Include raw probabilities for debugging
    p_g1f10_raw: p_g1f10_raw,
    p_g1f5_raw: p_g1f5_raw,
    poisson_p5,
    ml_p5,
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
