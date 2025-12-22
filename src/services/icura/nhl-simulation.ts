/**
 * Icura NHL Simulation Engine (Phase 3 scaffold)
 *
 * Consumes TeamRatings + GoalieRatings and returns:
 * - expected tempo (shots), expected xG per team
 * - goal distributions / totals / ML approximations
 * - first 5/10 minute goal probabilities (timeline simulation)
 *
 * Placeholder implementation right now; data + calibration will be added next.
 */

import type { TeamRatings, GoalieRatings } from "./nhl-rating-engine";

export interface SimulationInput {
  season: string;
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  asOfDateISO: string;
  homeTeamRatings: TeamRatings;
  awayTeamRatings: TeamRatings;
  homeGoalieRatings?: GoalieRatings | null;
  awayGoalieRatings?: GoalieRatings | null;
}

export interface SimulationOutput {
  model: "IcuraSim";
  version: string;
  gameId: string;
  asOfDateISO: string;
  expected: {
    homeShots: number;
    awayShots: number;
    homeXG: number;
    awayXG: number;
    homeGoals: number;
    awayGoals: number;
  };
  distributions: {
    // Poisson is a starting point; we’ll swap to better distributions later.
    homeGoalsLambda: number;
    awayGoalsLambda: number;
  };
  firstNMinutes: {
    first5_goalYesProb: number;
    first10_goalYesProb: number;
  };
  debug?: Record<string, unknown>;
}

/**
 * Run the simulation.
 * TODO: Replace with calibrated mapping from indices → tempo/xG and timeline simulation.
 */
export async function simulateGame(_input: SimulationInput): Promise<SimulationOutput> {
  // Placeholder baselines (league-ish averages)
  const homeXG = 3.0;
  const awayXG = 2.8;
  const homeGoals = homeXG;
  const awayGoals = awayXG;

  // Simple Poisson “at least 1 goal” approximation for first N minutes using rate scaling.
  // Rate per minute ~ totalGoals / 60 (roughly; actual NHL is 60 minutes regulation)
  const totalGoals = homeGoals + awayGoals;
  const ratePerMinute = totalGoals / 60;
  const pGoalIn5 = 1 - Math.exp(-ratePerMinute * 5);
  const pGoalIn10 = 1 - Math.exp(-ratePerMinute * 10);

  return {
    model: "IcuraSim",
    version: "0.1.0-alpha",
    gameId: _input.gameId,
    asOfDateISO: _input.asOfDateISO,
    expected: {
      homeShots: 31,
      awayShots: 30,
      homeXG,
      awayXG,
      homeGoals,
      awayGoals,
    },
    distributions: {
      homeGoalsLambda: homeGoals,
      awayGoalsLambda: awayGoals,
    },
    firstNMinutes: {
      first5_goalYesProb: Math.max(0.05, Math.min(0.95, pGoalIn5)),
      first10_goalYesProb: Math.max(0.05, Math.min(0.98, pGoalIn10)),
    },
    debug: {
      note: "Phase 3 scaffold: will use ratings + event-derived tempo/xG; timeline sim will be improved.",
    },
  };
}
