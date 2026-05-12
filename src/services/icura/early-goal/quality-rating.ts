/**
 * Quality-based rating system for early goal predictions
 *
 * Rates predictions based on:
 * - Goalie quality (GSAX, save %)
 * - Team start speed (time to first shot/HD/rush)
 * - Team offense/defense (xGF/xGA)
 * - Probability confidence
 * - Context factors (rest, travel, penalties)
 */

import { EarlyGameFeatureRow } from "./engine";

export interface QualityRating {
  rating: number; // 0-100
  label: "High" | "Good" | "Meh" | "Bad";
  analysis: {
    factors: QualityFactor[];
    summary: string;
    strengths: string[];
    weaknesses: string[];
  };
}

export interface QualityFactor {
  name: string;
  score: number; // 0-100
  impact: "high" | "medium" | "low";
  description: string;
  details: string[];
}

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const safeNum = (v: number | null | undefined, def: number) =>
  v !== null && v !== undefined && !isNaN(v) ? v : def;

/**
 * Compute quality-based rating from features
 */
export function computeQualityRating(
  row: EarlyGameFeatureRow,
  probability: number,
  isG1F5: boolean,
): QualityRating {
  const factors: QualityFactor[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // 1. Goalie Quality (30% weight)
  const goalieScore = computeGoalieQuality(row, isG1F5, strengths, weaknesses);
  factors.push({
    name: "Goalie Quality",
    score: goalieScore,
    impact: "high",
    description: getGoalieDescription(row, isG1F5),
    details: getGoalieDetails(row, isG1F5),
  });

  // 2. Team Start Speed (25% weight)
  const startSpeedScore = computeStartSpeed(row, isG1F5, strengths, weaknesses);
  factors.push({
    name: "Start Speed",
    score: startSpeedScore,
    impact: "high",
    description: getStartSpeedDescription(row, isG1F5),
    details: getStartSpeedDetails(row, isG1F5),
  });

  // 3. Offense vs Defense Matchup (25% weight)
  const matchupScore = computeMatchupQuality(row, isG1F5, strengths, weaknesses);
  factors.push({
    name: "Offense vs Defense",
    score: matchupScore,
    impact: "high",
    description: getMatchupDescription(row, isG1F5),
    details: getMatchupDetails(row, isG1F5),
  });

  // 4. Probability Confidence (10% weight)
  const confidenceScore = computeConfidenceScore(probability);
  factors.push({
    name: "Model Confidence",
    score: confidenceScore,
    impact: "medium",
    description: getConfidenceDescription(probability),
    details: [],
  });

  // 5. Context Factors (10% weight)
  const contextScore = computeContextScore(row, strengths, weaknesses);
  factors.push({
    name: "Context",
    score: contextScore,
    impact: "low",
    description: getContextDescription(row),
    details: getContextDetails(row),
  });

  // Weighted average
  const rating = Math.round(
    goalieScore * 0.3 +
      startSpeedScore * 0.25 +
      matchupScore * 0.25 +
      confidenceScore * 0.1 +
      contextScore * 0.1,
  );

  // Determine label
  let label: "High" | "Good" | "Meh" | "Bad";
  if (rating >= 75) label = "High";
  else if (rating >= 60) label = "Good";
  else if (rating >= 45) label = "Meh";
  else label = "Bad";

  // Generate summary
  const summary = generateSummary(rating, probability, strengths, weaknesses, isG1F5);

  return {
    rating: clamp(rating, 0, 100),
    label,
    analysis: {
      factors,
      summary,
      strengths: strengths.slice(0, 5), // Top 5
      weaknesses: weaknesses.slice(0, 5), // Top 5
    },
  };
}

function computeGoalieQuality(
  row: EarlyGameFeatureRow,
  isG1F5: boolean,
  strengths: string[],
  weaknesses: string[],
): number {
  const homeGsax = safeNum(
    isG1F5 ? row.home_goalie_gsax_first5 : row.home_goalie_gsax_first_period,
    0,
  );
  const awayGsax = safeNum(
    isG1F5 ? row.away_goalie_gsax_first5 : row.away_goalie_gsax_first_period,
    0,
  );

  const homeSavePct = safeNum(row.home_goalie_save_pct_first5, 0.9);
  const awaySavePct = safeNum(row.away_goalie_save_pct_first5, 0.9);

  const homeFirstShot = safeNum(row.home_goalie_first_shot_save_pct, 0.85);
  const awayFirstShot = safeNum(row.away_goalie_first_shot_save_pct, 0.85);

  // GSAX: positive = good, negative = bad
  // Average goalie quality (lower is better for early goals)
  const avgGsax = (homeGsax + awayGsax) / 2;
  const avgSavePct = (homeSavePct + awaySavePct) / 2;
  const avgFirstShot = (homeFirstShot + awayFirstShot) / 2;

  // Score: lower goalie quality = higher score (more likely early goal)
  let score = 50;

  // GSAX: negative GSAX (bad goalies) increases score
  if (avgGsax < -0.3) {
    score += 25;
    weaknesses.push("Both goalies have been struggling early (negative GSAX)");
  } else if (avgGsax < -0.1) {
    score += 15;
    weaknesses.push("Goalie performance has been below average early");
  } else if (avgGsax > 0.2) {
    score -= 20;
    strengths.push("Both goalies have been strong early (positive GSAX)");
  } else if (avgGsax > 0.1) {
    score -= 10;
    strengths.push("Goalie performance has been above average early");
  }

  // Save percentage
  if (avgSavePct < 0.85) {
    score += 15;
    weaknesses.push(`Low early save percentage (${(avgSavePct * 100).toFixed(1)}%)`);
  } else if (avgSavePct > 0.92) {
    score -= 15;
    strengths.push(`High early save percentage (${(avgSavePct * 100).toFixed(1)}%)`);
  }

  // First shot save %
  if (avgFirstShot < 0.8) {
    score += 10;
    weaknesses.push("Goalie first-shot save rate is low");
  } else if (avgFirstShot > 0.9) {
    score -= 10;
    strengths.push("Goalie first-shot save rate is high");
  }

  return clamp(score, 0, 100);
}

function computeStartSpeed(
  row: EarlyGameFeatureRow,
  isG1F5: boolean,
  strengths: string[],
  weaknesses: string[],
): number {
  const homeTimeToShot = safeNum(row.home_team_time_to_first_shot, 120);
  const awayTimeToShot = safeNum(row.away_team_time_to_first_shot, 120);
  const homeTimeToHD = safeNum(row.home_team_time_to_first_hd, 300);
  const awayTimeToHD = safeNum(row.away_team_time_to_first_hd, 300);
  const homeTimeToRush = safeNum(row.home_team_time_to_first_rush, 300);
  const awayTimeToRush = safeNum(row.away_team_time_to_first_rush, 300);

  const avgTimeToShot = (homeTimeToShot + awayTimeToShot) / 2;
  const avgTimeToHD = (homeTimeToHD + awayTimeToHD) / 2;
  const avgTimeToRush = (homeTimeToRush + awayTimeToRush) / 2;

  let score = 50;

  // Faster starts = higher score
  if (avgTimeToShot < 30) {
    score += 25;
    strengths.push("Both teams start very fast (first shot < 30s)");
  } else if (avgTimeToShot < 60) {
    score += 15;
    strengths.push("Both teams start quickly (first shot < 60s)");
  } else if (avgTimeToShot > 120) {
    score -= 20;
    weaknesses.push("Both teams start slowly (first shot > 2min)");
  } else if (avgTimeToShot > 90) {
    score -= 10;
    weaknesses.push("Teams tend to start slowly");
  }

  // High danger chances
  if (avgTimeToHD < 120) {
    score += 15;
    strengths.push("High-danger chances come early");
  } else if (avgTimeToHD > 300) {
    score -= 15;
    weaknesses.push("High-danger chances come late");
  }

  // Rush chances
  if (avgTimeToRush < 120) {
    score += 10;
    strengths.push("Rush chances come early");
  } else if (avgTimeToRush > 300) {
    score -= 10;
    weaknesses.push("Rush chances come late");
  }

  return clamp(score, 0, 100);
}

function computeMatchupQuality(
  row: EarlyGameFeatureRow,
  isG1F5: boolean,
  strengths: string[],
  weaknesses: string[],
): number {
  const homeXGF = safeNum(
    isG1F5 ? row.home_team_xgf_first5_last20 : row.home_team_xgf_first10_last20,
    0.35,
  );
  const homeXGA = safeNum(
    isG1F5 ? row.home_team_xga_first5_last20 : row.home_team_xga_first10_last20,
    0.35,
  );
  const awayXGF = safeNum(
    isG1F5 ? row.away_team_xgf_first5_last20 : row.away_team_xgf_first10_last20,
    0.35,
  );
  const awayXGA = safeNum(
    isG1F5 ? row.away_team_xga_first5_last20 : row.away_team_xga_first10_last20,
    0.35,
  );

  // High offense + weak defense = high score
  const homeNet = homeXGF - homeXGA;
  const awayNet = awayXGF - awayXGA;
  const totalNet = homeNet + awayNet;

  let score = 50;

  // Strong offense
  if (homeXGF > 0.45 || awayXGF > 0.45) {
    score += 15;
    if (homeXGF > 0.45) strengths.push("Home team has strong early offense");
    if (awayXGF > 0.45) strengths.push("Away team has strong early offense");
  }

  // Weak defense
  if (homeXGA > 0.45 || awayXGA > 0.45) {
    score += 15;
    if (homeXGA > 0.45) weaknesses.push("Home team has weak early defense");
    if (awayXGA > 0.45) weaknesses.push("Away team has weak early defense");
  }

  // Net rating
  if (totalNet > 0.2) {
    score += 10;
    strengths.push("Strong offensive matchup (high combined xGF)");
  } else if (totalNet < -0.2) {
    score -= 10;
    weaknesses.push("Defensive matchup (low combined xGF)");
  }

  // Rush/HD rates
  const homeRush = safeNum(
    isG1F5 ? row.home_team_rush_chances_first5_last20 : row.home_team_rush_chances_first10_last20,
    0,
  );
  const awayRush = safeNum(
    isG1F5 ? row.away_team_rush_chances_first5_last20 : row.away_team_rush_chances_first10_last20,
    0,
  );
  const homeHD = safeNum(
    isG1F5 ? row.home_team_high_danger_first5_last20 : row.home_team_high_danger_first10_last20,
    0,
  );
  const awayHD = safeNum(
    isG1F5 ? row.away_team_high_danger_first5_last20 : row.away_team_high_danger_first10_last20,
    0,
  );

  if (homeRush + awayRush > 0.5) {
    score += 10;
    strengths.push("High rush chance rate");
  }
  if (homeHD + awayHD > 0.4) {
    score += 10;
    strengths.push("High danger chance rate");
  }

  return clamp(score, 0, 100);
}

function computeConfidenceScore(probability: number): number {
  // Higher confidence (further from 0.5) = higher score
  const distanceFrom50 = Math.abs(probability - 0.5);
  return 50 + distanceFrom50 * 100;
}

function computeContextScore(
  row: EarlyGameFeatureRow,
  strengths: string[],
  weaknesses: string[],
): number {
  let score = 50;

  // Rest days
  const homeRest = safeNum(row.home_rest_days, 2);
  const awayRest = safeNum(row.away_rest_days, 2);

  if (homeRest < 1 || awayRest < 1) {
    score += 10;
    weaknesses.push("One or both teams on back-to-back (fatigue factor)");
  } else if (homeRest >= 3 && awayRest >= 3) {
    score -= 5;
    strengths.push("Both teams well-rested");
  }

  // Travel
  const travel = safeNum(row.travel_distance, 0);
  if (travel > 2000) {
    score += 8;
    weaknesses.push("Significant travel distance");
  }

  // Penalties
  const refPenaltyRate = safeNum(row.ref_penalties_first10_avg, 0.5);
  if (refPenaltyRate > 0.7) {
    score += 10;
    strengths.push("High penalty rate referee (more power plays)");
  } else if (refPenaltyRate < 0.3) {
    score -= 5;
    weaknesses.push("Low penalty rate referee");
  }

  return clamp(score, 0, 100);
}

// Description generators
function getGoalieDescription(row: EarlyGameFeatureRow, isG1F5: boolean): string {
  const homeGsax = safeNum(
    isG1F5 ? row.home_goalie_gsax_first5 : row.home_goalie_gsax_first_period,
    0,
  );
  const awayGsax = safeNum(
    isG1F5 ? row.away_goalie_gsax_first5 : row.away_goalie_gsax_first_period,
    0,
  );

  if (homeGsax < -0.2 && awayGsax < -0.2) return "Both goalies have struggled early";
  if (homeGsax < -0.2) return "Home goalie has struggled early";
  if (awayGsax < -0.2) return "Away goalie has struggled early";
  if (homeGsax > 0.2 && awayGsax > 0.2) return "Both goalies have been strong early";
  return "Goalie performance has been average";
}

function getStartSpeedDescription(row: EarlyGameFeatureRow, isG1F5: boolean): string {
  const homeTime = safeNum(row.home_team_time_to_first_shot, 120);
  const awayTime = safeNum(row.away_team_time_to_first_shot, 120);
  const avg = (homeTime + awayTime) / 2;

  if (avg < 40) return "Very fast starts from both teams";
  if (avg < 70) return "Quick starts from both teams";
  if (avg > 120) return "Slow starts from both teams";
  return "Average start speed";
}

function getMatchupDescription(row: EarlyGameFeatureRow, isG1F5: boolean): string {
  const homeXGF = safeNum(
    isG1F5 ? row.home_team_xgf_first5_last20 : row.home_team_xgf_first10_last20,
    0.35,
  );
  const homeXGA = safeNum(
    isG1F5 ? row.home_team_xga_first5_last20 : row.home_team_xga_first10_last20,
    0.35,
  );
  const awayXGF = safeNum(
    isG1F5 ? row.away_team_xgf_first5_last20 : row.away_team_xgf_first10_last20,
    0.35,
  );
  const awayXGA = safeNum(
    isG1F5 ? row.away_team_xga_first5_last20 : row.away_team_xga_first10_last20,
    0.35,
  );

  const strongOffense = homeXGF > 0.4 || awayXGF > 0.4;
  const weakDefense = homeXGA > 0.4 || awayXGA > 0.4;

  if (strongOffense && weakDefense) return "High-scoring matchup (strong offense vs weak defense)";
  if (strongOffense) return "Strong offensive teams";
  if (weakDefense) return "Weak defensive teams";
  return "Balanced matchup";
}

function getConfidenceDescription(probability: number): string {
  const conf = Math.abs(probability - 0.5) * 2;
  if (conf > 0.7) return "High model confidence";
  if (conf > 0.4) return "Moderate model confidence";
  return "Low model confidence";
}

function getContextDescription(row: EarlyGameFeatureRow): string {
  const parts: string[] = [];
  if (row.home_back_to_back || row.away_back_to_back) parts.push("B2B");
  if (safeNum(row.travel_distance, 0) > 2000) parts.push("Travel");
  if (safeNum(row.ref_penalties_first10_avg, 0) > 0.7) parts.push("High penalties");
  return parts.length > 0 ? parts.join(", ") : "Normal context";
}

function getGoalieDetails(row: EarlyGameFeatureRow, isG1F5: boolean): string[] {
  const details: string[] = [];
  const homeGsax = safeNum(
    isG1F5 ? row.home_goalie_gsax_first5 : row.home_goalie_gsax_first_period,
    0,
  );
  const awayGsax = safeNum(
    isG1F5 ? row.away_goalie_gsax_first5 : row.away_goalie_gsax_first_period,
    0,
  );
  const homeSave = safeNum(row.home_goalie_save_pct_first5, 0.9);
  const awaySave = safeNum(row.away_goalie_save_pct_first5, 0.9);

  details.push(
    `Home goalie GSAX: ${homeGsax.toFixed(2)} (${homeGsax < 0 ? "below" : "above"} average)`,
  );
  details.push(
    `Away goalie GSAX: ${awayGsax.toFixed(2)} (${awayGsax < 0 ? "below" : "above"} average)`,
  );
  details.push(`Home goalie save %: ${(homeSave * 100).toFixed(1)}%`);
  details.push(`Away goalie save %: ${(awaySave * 100).toFixed(1)}%`);

  return details;
}

function getStartSpeedDetails(row: EarlyGameFeatureRow, isG1F5: boolean): string[] {
  const details: string[] = [];
  const homeShot = safeNum(row.home_team_time_to_first_shot, 120);
  const awayShot = safeNum(row.away_team_time_to_first_shot, 120);
  const homeHD = safeNum(row.home_team_time_to_first_hd, 300);
  const awayHD = safeNum(row.away_team_time_to_first_hd, 300);

  details.push(`Home team first shot: ${homeShot.toFixed(0)}s`);
  details.push(`Away team first shot: ${awayShot.toFixed(0)}s`);
  details.push(`Home team first HD chance: ${homeHD > 200 ? homeHD.toFixed(0) + "s" : "Early"}`);
  details.push(`Away team first HD chance: ${awayHD > 200 ? awayHD.toFixed(0) + "s" : "Early"}`);

  return details;
}

function getMatchupDetails(row: EarlyGameFeatureRow, isG1F5: boolean): string[] {
  const details: string[] = [];
  const homeXGF = safeNum(
    isG1F5 ? row.home_team_xgf_first5_last20 : row.home_team_xgf_first10_last20,
    0.35,
  );
  const homeXGA = safeNum(
    isG1F5 ? row.home_team_xga_first5_last20 : row.home_team_xga_first10_last20,
    0.35,
  );
  const awayXGF = safeNum(
    isG1F5 ? row.away_team_xgf_first5_last20 : row.away_team_xgf_first10_last20,
    0.35,
  );
  const awayXGA = safeNum(
    isG1F5 ? row.away_team_xga_first5_last20 : row.away_team_xga_first10_last20,
    0.35,
  );

  details.push(`Home team xGF: ${homeXGF.toFixed(3)} (last 20 games)`);
  details.push(`Home team xGA: ${homeXGA.toFixed(3)} (last 20 games)`);
  details.push(`Away team xGF: ${awayXGF.toFixed(3)} (last 20 games)`);
  details.push(`Away team xGA: ${awayXGA.toFixed(3)} (last 20 games)`);

  return details;
}

function getContextDetails(row: EarlyGameFeatureRow): string[] {
  const details: string[] = [];
  details.push(`Home rest days: ${safeNum(row.home_rest_days, 2)}`);
  details.push(`Away rest days: ${safeNum(row.away_rest_days, 2)}`);
  details.push(`Travel distance: ${safeNum(row.travel_distance, 0).toFixed(0)} miles`);
  details.push(
    `Ref penalty rate: ${(safeNum(row.ref_penalties_first10_avg, 0.5) * 100).toFixed(0)}%`,
  );
  return details;
}

function generateSummary(
  rating: number,
  probability: number,
  strengths: string[],
  weaknesses: string[],
  isG1F5: boolean,
): string {
  const period = isG1F5 ? "first 5 minutes" : "first 10 minutes";
  const probPct = (probability * 100).toFixed(1);

  let summary = `The model predicts a ${probPct}% chance of a goal in the ${period}. `;

  if (rating >= 75) {
    summary += "This is a HIGH-QUALITY prediction with strong supporting factors. ";
  } else if (rating >= 60) {
    summary += "This is a GOOD prediction with solid supporting factors. ";
  } else if (rating >= 45) {
    summary += "This is a MODERATE prediction with mixed factors. ";
  } else {
    summary += "This is a WEAK prediction with limited supporting factors. ";
  }

  if (strengths.length > 0) {
    summary += `Key strengths: ${strengths.slice(0, 2).join(", ")}. `;
  }

  if (weaknesses.length > 0) {
    summary += `Key concerns: ${weaknesses.slice(0, 2).join(", ")}.`;
  }

  return summary;
}
