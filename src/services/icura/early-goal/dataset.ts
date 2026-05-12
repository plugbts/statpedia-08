/**
 * Icura Early-Game Dataset Builder
 *
 * Goal: one row per game with early tendencies (first 10 minutes) for both teams.
 * This builder uses the Unified Icura Game Packages (NHL API backbone + MoneyPuck xG layer).
 *
 * NOTE: Rolling "last 20" features require historical games. This module accepts
 * a list of prior packages so the caller can provide the window (from DB later).
 */

import type { IcuraEvent, IcuraUnifiedGamePackage } from "../unified/types";
import type { EarlyGameFeatureRow } from "./engine";
import { fetchLast20EarlyDatasetAverages } from "./db-history";
import { fetchMoneyPuckShotsForGameFromDb } from "../unified/providers/moneypuck-db";
import {
  extractGoalieEarlyTendencies,
  extractRefereePenaltyRates,
  extractTravelFatigueFeatures,
  extractShiftLevelFeatures,
} from "./feature-extractors";

function isGoal(e: IcuraEvent): boolean {
  return e.eventType === "goal" || e.isGoal === true;
}

function isShotLike(e: IcuraEvent): boolean {
  return e.eventType === "shot" || e.eventType === "goal";
}

function withinSeconds(e: IcuraEvent, maxSeconds: number): boolean {
  const t = typeof e.gameTimeSeconds === "number" ? e.gameTimeSeconds : undefined;
  if (t === undefined) return false;
  return t >= 0 && t <= maxSeconds;
}

function teamKey(teamAbbr?: string): string | null {
  if (!teamAbbr) return null;
  return String(teamAbbr).toUpperCase();
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

/**
 * Derive targets from events: goal in first 5/10 minutes.
 */
export function deriveEarlyTargets(pkg: IcuraUnifiedGamePackage): {
  goal_in_first_5: boolean;
  goal_in_first_10: boolean;
} {
  const goals = pkg.events.filter(isGoal);
  const goal_in_first_5 = goals.some((g) => withinSeconds(g, 300));
  const goal_in_first_10 = goals.some((g) => withinSeconds(g, 600));
  return { goal_in_first_5, goal_in_first_10 };
}

/**
 * Aggregate MoneyPuck shots for a game into team-level early stats (first 5/10 minutes).
 * This is the PRIMARY source for shot-based features - shots are aggregated, not used as individual rows.
 */
export async function aggregateMoneyPuckShotsForGame(
  gameExternalId: string,
  homeTeamAbbr: string,
  awayTeamAbbr: string,
): Promise<
  Record<
    string,
    {
      shots_first5: number;
      shots_first10: number;
      xg_first5: number;
      xg_first10: number;
      high_danger_first5: number;
      high_danger_first10: number;
      rush_chances_first5: number;
      rush_chances_first10: number;
      avg_time_to_first_shot: number | null;
      avg_time_to_first_goal: number | null;
      goalie_faced_xg_first10: number | null; // For goalie on the opposing team
    }
  >
> {
  const shots = await fetchMoneyPuckShotsForGameFromDb(gameExternalId);

  const out: Record<string, any> = {
    [homeTeamAbbr]: {
      shots_first5: 0,
      shots_first10: 0,
      xg_first5: 0,
      xg_first10: 0,
      high_danger_first5: 0,
      high_danger_first10: 0,
      rush_chances_first5: 0,
      rush_chances_first10: 0,
      avg_time_to_first_shot: null,
      avg_time_to_first_goal: null,
      goalie_faced_xg_first10: 0, // xG faced by opponent's goalie
    },
    [awayTeamAbbr]: {
      shots_first5: 0,
      shots_first10: 0,
      xg_first5: 0,
      xg_first10: 0,
      high_danger_first5: 0,
      high_danger_first10: 0,
      rush_chances_first5: 0,
      rush_chances_first10: 0,
      avg_time_to_first_shot: null,
      avg_time_to_first_goal: null,
      goalie_faced_xg_first10: 0,
    },
  };

  // Aggregate shots by team and time window
  const shotsByTeam = new Map<string, typeof shots>();
  const goalsByTeam = new Map<string, typeof shots>();

  for (const shot of shots) {
    if (!shot.team_abbr) continue;
    const tk = teamKey(shot.team_abbr);
    if (!tk) continue;

    if (!shotsByTeam.has(tk)) {
      shotsByTeam.set(tk, []);
      goalsByTeam.set(tk, []);
    }

    const teamShots = shotsByTeam.get(tk)!;
    teamShots.push(shot);

    // Check if it's a goal (is_goal flag from MoneyPuck)
    if (shot.is_goal === true) {
      goalsByTeam.get(tk)!.push(shot);
    }
  }

  for (const [tk, teamShots] of shotsByTeam.entries()) {
    const stats = out[tk];
    if (!stats) continue;

    // Filter by time windows
    const shots5 = teamShots.filter(
      (s) => s.game_time_seconds !== null && s.game_time_seconds <= 300,
    );
    const shots10 = teamShots.filter(
      (s) => s.game_time_seconds !== null && s.game_time_seconds <= 600,
    );
    const goals10 =
      goalsByTeam
        .get(tk)
        ?.filter((g) => g.game_time_seconds !== null && g.game_time_seconds <= 600) || [];

    // Aggregate counts
    stats.shots_first5 = shots5.length;
    stats.shots_first10 = shots10.length;

    // Aggregate xG
    stats.xg_first5 = sum(shots5.map((s) => s.xg || 0));
    stats.xg_first10 = sum(shots10.map((s) => s.xg || 0));

    // Aggregate high-danger and rush
    stats.high_danger_first5 = shots5.filter((s) => s.is_high_danger === true).length;
    stats.high_danger_first10 = shots10.filter((s) => s.is_high_danger === true).length;
    stats.rush_chances_first5 = shots5.filter((s) => s.is_rush === true).length;
    stats.rush_chances_first10 = shots10.filter((s) => s.is_rush === true).length;

    // Time to first shot/goal
    const shotTimes = shots10
      .map((s) => s.game_time_seconds)
      .filter((t): t is number => t !== null && typeof t === "number")
      .sort((a, b) => a - b);
    stats.avg_time_to_first_shot = shotTimes.length > 0 ? shotTimes[0] : null;

    const goalTimes = goals10
      .map((g) => g.game_time_seconds)
      .filter((t): t is number => t !== null && typeof t === "number")
      .sort((a, b) => a - b);
    stats.avg_time_to_first_goal = goalTimes.length > 0 ? goalTimes[0] : null;
  }

  // Calculate goalie faced xG (xG generated by opponent)
  const homeOpponent = awayTeamAbbr;
  const awayOpponent = homeTeamAbbr;
  out[homeTeamAbbr].goalie_faced_xg_first10 = out[homeOpponent]?.xg_first10 || 0;
  out[awayTeamAbbr].goalie_faced_xg_first10 = out[awayOpponent]?.xg_first10 || 0;

  return out;
}

/**
 * Compute team-level early stats (first 10) from ONE game package.
 * Now uses MoneyPuck shots aggregation as the primary source.
 * For "last20" features, caller will aggregate over prior games.
 */
export async function computeTeamEarlyStatsFromGame(pkg: IcuraUnifiedGamePackage): Promise<
  Record<
    string,
    {
      shots_first5: number;
      shots_first10: number;
      shot_attempts_first10: number;
      xg_first5: number;
      xg_first10: number;
      avg_time_to_first_shot: number | null;
      avg_time_to_first_goal: number | null;
      high_danger_first5: number;
      high_danger_first10: number;
      rush_chances_first5: number;
      rush_chances_first10: number;
      goalie_faced_xg_first10: number;
    }
  >
> {
  // Primary: Use MoneyPuck shots aggregation
  const mpStats = await aggregateMoneyPuckShotsForGame(
    pkg.game.gameId,
    pkg.game.homeTeamAbbr,
    pkg.game.awayTeamAbbr,
  );

  // Fallback to events if MoneyPuck data not available
  const events10 = pkg.events.filter((e) => withinSeconds(e, 600));
  const byTeam = new Map<string, IcuraEvent[]>();
  for (const e of events10) {
    const tk = teamKey(e.teamAbbr);
    if (!tk) continue;
    if (!byTeam.has(tk)) byTeam.set(tk, []);
    byTeam.get(tk)!.push(e);
  }

  const out: Record<string, any> = {};
  for (const tk of [pkg.game.homeTeamAbbr, pkg.game.awayTeamAbbr]) {
    const mp = mpStats[tk];
    if (mp) {
      // Use MoneyPuck aggregated stats
      out[tk] = {
        ...mp,
        shot_attempts_first10: mp.shots_first10, // Shots = attempts for now
      };
    } else {
      // Fallback to event-based calculation
      const list = byTeam.get(tk) || [];
      const shots = list.filter(isShotLike);
      const goals = list.filter(isGoal);
      const timesToShot = shots
        .map((e) => (typeof e.gameTimeSeconds === "number" ? e.gameTimeSeconds : null))
        .filter((t): t is number => typeof t === "number")
        .sort((a, b) => a - b);

      out[tk] = {
        shots_first5: 0,
        shots_first10: shots.length,
        shot_attempts_first10: shots.length,
        xg_first5: 0,
        xg_first10: 0,
        avg_time_to_first_shot: timesToShot.length ? timesToShot[0] : null,
        avg_time_to_first_goal:
          goals.length && typeof goals[0].gameTimeSeconds === "number"
            ? goals[0].gameTimeSeconds
            : null,
        high_danger_first5: 0,
        high_danger_first10: 0,
        rush_chances_first5: 0,
        rush_chances_first10: 0,
        goalie_faced_xg_first10: 0,
      };
    }
  }

  return out;
}

/**
 * Build a single feature row for a game given its prior history packages (for last20).
 * Now uses aggregated MoneyPuck shots for all features.
 */
export async function buildEarlyGameFeatureRow(
  gamePkg: IcuraUnifiedGamePackage,
  priorPkgs: IcuraUnifiedGamePackage[],
): Promise<
  EarlyGameFeatureRow & { targets: { goal_in_first_5: boolean; goal_in_first_10: boolean } }
> {
  const targets = deriveEarlyTargets(gamePkg);

  const home = gamePkg.game.homeTeamAbbr;
  const away = gamePkg.game.awayTeamAbbr;

  // Get current game stats (aggregated from MoneyPuck shots)
  const gameStats = await computeTeamEarlyStatsFromGame(gamePkg);

  // Aggregate historical stats from prior games (last 20)
  const priorHome = priorPkgs
    .filter((p) => p.game.homeTeamAbbr === home || p.game.awayTeamAbbr === home)
    .slice(0, 20);
  const priorAway = priorPkgs
    .filter((p) => p.game.homeTeamAbbr === away || p.game.awayTeamAbbr === away)
    .slice(0, 20);

  const homeStatsPromises = priorHome.map((p) =>
    computeTeamEarlyStatsFromGame(p).then((s) => s[home]),
  );
  const awayStatsPromises = priorAway.map((p) =>
    computeTeamEarlyStatsFromGame(p).then((s) => s[away]),
  );

  const homeStats = (await Promise.all(homeStatsPromises)).filter(Boolean);
  const awayStats = (await Promise.all(awayStatsPromises)).filter(Boolean);

  // Aggregate last20 features from historical games
  const home_xgf = avg(homeStats.map((s) => s.xg_first10));
  const home_xga = avg(homeStats.map((s) => s.goalie_faced_xg_first10)); // xG faced = xGA
  const away_xgf = avg(awayStats.map((s) => s.xg_first10));
  const away_xga = avg(awayStats.map((s) => s.goalie_faced_xg_first10));

  return {
    gameId: gamePkg.game.gameId,
    dateISO: gamePkg.game.dateISO,

    home_team_xgf_first10_last20: home_xgf,
    home_team_xga_first10_last20: home_xga,
    home_team_rush_chances_first10_last20: avg(
      homeStats.map((s) => Number(s.rush_chances_first10 || 0)),
    ),
    home_team_high_danger_first10_last20: avg(
      homeStats.map((s) => Number(s.high_danger_first10 || 0)),
    ),
    home_team_shot_attempts_first10: gameStats[home]?.shot_attempts_first10 ?? null,

    away_team_xgf_first10_last20: away_xgf,
    away_team_xga_first10_last20: away_xga,
    away_team_rush_chances_first10_last20: avg(
      awayStats.map((s) => Number(s.rush_chances_first10 || 0)),
    ),
    away_team_high_danger_first10_last20: avg(
      awayStats.map((s) => Number(s.high_danger_first10 || 0)),
    ),
    away_team_shot_attempts_first10: gameStats[away]?.shot_attempts_first10 ?? null,

    targets,
  };
}

/**
 * DB-backed builder: uses `icura_nhl_early_game_dataset` as the historical window source.
 * Requires that the `games` table has the UUID ids for the matchup teams.
 */
export async function buildEarlyGameFeatureRowFromDbHistory(params: {
  gamePkg: IcuraUnifiedGamePackage;
  homeTeamId: string;
  awayTeamId: string;
}): Promise<
  EarlyGameFeatureRow & { targets: { goal_in_first_5: boolean; goal_in_first_10: boolean } }
> {
  const { gamePkg, homeTeamId, awayTeamId } = params;
  const targets = deriveEarlyTargets(gamePkg);

  // For PREGAME predictions, we use historical features, NOT in-game stats
  // In-game stats (current_game.*) should only be used for live in-play predictions
  const homeAbbr = gamePkg.game.homeTeamAbbr;
  const awayAbbr = gamePkg.game.awayTeamAbbr;

  // Get historical averages from DB (last 20 games)
  const [homeHist, awayHist] = await Promise.all([
    fetchLast20EarlyDatasetAverages({ teamId: homeTeamId, beforeDateISO: gamePkg.game.dateISO }),
    fetchLast20EarlyDatasetAverages({ teamId: awayTeamId, beforeDateISO: gamePkg.game.dateISO }),
  ]);

  // Extract penalty events for penalty volatility features
  const events10 = gamePkg.events.filter((e) => withinSeconds(e, 600));
  const penalties10 = events10.filter((e) => e.eventType === "penalty");
  const homePenalties10 = penalties10.filter((e) => teamKey(e.teamAbbr) === homeAbbr).length;
  const awayPenalties10 = penalties10.filter((e) => teamKey(e.teamAbbr) === awayAbbr).length;

  // Calculate penalty rates (draw = power play received, take = penalty taken)
  const homeDrawPenaltyRate = awayPenalties10 > 0 ? awayPenalties10 / 10 : null; // Away takes = home draws
  const homeTakePenaltyRate = homePenalties10 > 0 ? homePenalties10 / 10 : null;
  const awayDrawPenaltyRate = homePenalties10 > 0 ? homePenalties10 / 10 : null; // Home takes = away draws
  const awayTakePenaltyRate = awayPenalties10 > 0 ? awayPenalties10 / 10 : null;
  const penaltyVolatilityIndex =
    homeDrawPenaltyRate !== null &&
    homeTakePenaltyRate !== null &&
    awayDrawPenaltyRate !== null &&
    awayTakePenaltyRate !== null
      ? (homeDrawPenaltyRate + homeTakePenaltyRate + awayDrawPenaltyRate + awayTakePenaltyRate) / 4
      : null;

  // Extract goalie early tendencies (extract goalie names from MoneyPuck shots)
  const [homeGoalieTendencies, awayGoalieTendencies, refereeRates, travelFatigue, shiftFeatures] =
    await Promise.all([
      extractGoalieEarlyTendencies(gamePkg.game.gameId, null, homeAbbr, true),
      extractGoalieEarlyTendencies(gamePkg.game.gameId, null, awayAbbr, false),
      extractRefereePenaltyRates(gamePkg.game.gameId, null, gamePkg.game.season || "2024-2025"),
      extractTravelFatigueFeatures(
        homeTeamId,
        awayTeamId,
        gamePkg.game.dateISO,
        gamePkg.game.startTime,
      ),
      extractShiftLevelFeatures(gamePkg.game.gameId, homeAbbr, awayAbbr),
    ]);

  return {
    gameId: gamePkg.game.gameId,
    dateISO: gamePkg.game.dateISO,

    // PREGAME FEATURES (historical last20 stats) - These are what the model was trained on
    // First 10 minutes (historical)
    home_team_xgf_first10_last20: homeHist.team_xgf_first10_last20 ?? 0,
    home_team_xga_first10_last20: homeHist.team_xga_first10_last20 ?? 0,
    home_team_rush_chances_first10_last20: homeHist.team_rush_chances_first10_last20 ?? 0,
    home_team_high_danger_first10_last20: homeHist.team_high_danger_first10_last20 ?? 0,
    home_team_shot_attempts_first10: homeHist.team_shot_attempts_first10_last20 ?? 0,

    away_team_xgf_first10_last20: awayHist.team_xgf_first10_last20 ?? 0,
    away_team_xga_first10_last20: awayHist.team_xga_first10_last20 ?? 0,
    away_team_rush_chances_first10_last20: awayHist.team_rush_chances_first10_last20 ?? 0,
    away_team_high_danger_first10_last20: awayHist.team_high_danger_first10_last20 ?? 0,
    away_team_shot_attempts_first10: awayHist.team_shot_attempts_first10_last20 ?? 0,

    // First 5 minutes (historical, scaled from first 10)
    home_team_xgf_first5_last20: homeHist.team_xgf_first10_last20
      ? homeHist.team_xgf_first10_last20 * 0.5
      : 0,
    home_team_xga_first5_last20: homeHist.team_xga_first10_last20
      ? homeHist.team_xga_first10_last20 * 0.5
      : 0,
    home_team_rush_chances_first5_last20: homeHist.team_rush_chances_first10_last20
      ? homeHist.team_rush_chances_first10_last20 * 0.5
      : 0,
    home_team_high_danger_first5_last20: homeHist.team_high_danger_first10_last20
      ? homeHist.team_high_danger_first10_last20 * 0.5
      : 0,
    home_team_time_to_first_shot: null, // Not used in pregame model
    home_team_time_to_first_hd: null,
    home_team_time_to_first_rush: null,

    away_team_xgf_first5_last20: awayHist.team_xgf_first10_last20
      ? awayHist.team_xgf_first10_last20 * 0.5
      : 0,
    away_team_xga_first5_last20: awayHist.team_xga_first10_last20
      ? awayHist.team_xga_first10_last20 * 0.5
      : 0,
    away_team_rush_chances_first5_last20: awayHist.team_rush_chances_first10_last20
      ? awayHist.team_rush_chances_first10_last20 * 0.5
      : 0,
    away_team_high_danger_first5_last20: awayHist.team_high_danger_first10_last20
      ? awayHist.team_high_danger_first10_last20 * 0.5
      : 0,
    away_team_time_to_first_shot: null, // Not used in pregame model
    away_team_time_to_first_hd: null,
    away_team_time_to_first_rush: null,

    // Goalie features (existing)
    home_goalie_gsax_first_period: null, // Will be populated from goalie stats
    away_goalie_gsax_first_period: null,
    home_goalie_save_pct_first5: null,
    home_goalie_gsax_first5: null,
    away_goalie_save_pct_first5: null,
    away_goalie_gsax_first5: null,

    // Context features (existing)
    home_rest_days: null, // Will be calculated from schedule
    away_rest_days: null,
    home_back_to_back: null,
    away_back_to_back: null,
    travel_distance: null,
    injury_impact_home: null,
    injury_impact_away: null,
    ref_penalty_rate: null, // Will be populated from referee data

    // NEW G1F10 FEATURES - Referee-level penalty rates
    ref_penalties_first_period_avg: refereeRates.penalties_first_period_avg,
    ref_penalties_first10_avg: refereeRates.penalties_first10_avg,
    ref_minors_vs_majors_ratio: refereeRates.minors_vs_majors_ratio,
    ref_home_away_penalty_bias: refereeRates.home_away_penalty_bias,

    // NEW G1F10 FEATURES - Shift-level matchup modeling
    home_top_line_xgf_first10_last20: shiftFeatures.home_top_line_xgf,
    home_top_line_xga_first10_last20: shiftFeatures.home_top_line_xga,
    home_top_line_rush_rate_first10_last20: shiftFeatures.home_top_line_rush_rate,
    home_top_line_hd_rate_first10_last20: shiftFeatures.home_top_line_hd_rate,
    home_top_pair_xga_suppression_first10_last20: shiftFeatures.home_top_pair_xga_suppression,
    away_top_line_xgf_first10_last20: shiftFeatures.away_top_line_xgf,
    away_top_line_xga_first10_last20: shiftFeatures.away_top_line_xga,
    away_top_line_rush_rate_first10_last20: shiftFeatures.away_top_line_rush_rate,
    away_top_line_hd_rate_first10_last20: shiftFeatures.away_top_line_hd_rate,
    away_top_pair_xga_suppression_first10_last20: shiftFeatures.away_top_pair_xga_suppression,

    // NEW G1F10 FEATURES - Penalty volatility
    home_draw_penalty_rate_first10: homeDrawPenaltyRate,
    home_take_penalty_rate_first10: homeTakePenaltyRate,
    away_draw_penalty_rate_first10: awayDrawPenaltyRate,
    away_take_penalty_rate_first10: awayTakePenaltyRate,
    penalty_volatility_index: penaltyVolatilityIndex,
    ref_team_interaction_home:
      refereeRates.penalties_first10_avg !== null && homeTakePenaltyRate !== null
        ? refereeRates.penalties_first10_avg * homeTakePenaltyRate
        : null,
    ref_team_interaction_away:
      refereeRates.penalties_first10_avg !== null && awayTakePenaltyRate !== null
        ? refereeRates.penalties_first10_avg * awayTakePenaltyRate
        : null,

    // NEW G1F10 FEATURES - Travel + fatigue interactions
    home_b2b_travel: travelFatigue.home.b2b_travel,
    away_b2b_travel: travelFatigue.away.b2b_travel,
    home_3in4_travel: travelFatigue.home.three_in_four_travel,
    away_3in4_travel: travelFatigue.away.three_in_four_travel,
    west_to_east_travel: travelFatigue.away.west_to_east_travel,
    early_start_time: travelFatigue.home.early_start_time,

    // NEW G1F10 FEATURES - Goalie-specific early-game tendencies
    home_goalie_first_shot_save_pct: homeGoalieTendencies.first_shot_save_pct,
    home_goalie_first_3_shots_save_pct: homeGoalieTendencies.first_3_shots_save_pct,
    home_goalie_rebound_rate_first10: homeGoalieTendencies.rebound_rate_first10,
    home_goalie_rush_save_pct_first10: homeGoalieTendencies.rush_save_pct_first10,
    home_goalie_screened_save_pct_first10: homeGoalieTendencies.screened_save_pct_first10,
    away_goalie_first_shot_save_pct: awayGoalieTendencies.first_shot_save_pct,
    away_goalie_first_3_shots_save_pct: awayGoalieTendencies.first_3_shots_save_pct,
    away_goalie_rebound_rate_first10: awayGoalieTendencies.rebound_rate_first10,
    away_goalie_rush_save_pct_first10: awayGoalieTendencies.rush_save_pct_first10,
    away_goalie_screened_save_pct_first10: awayGoalieTendencies.screened_save_pct_first10,

    targets,
  };
}
