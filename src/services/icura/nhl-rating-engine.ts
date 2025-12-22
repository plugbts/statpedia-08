/**
 * Icura NHL Rating Engine (Phase 2 scaffold)
 *
 * Produces persistent team/goalie indices used by the simulation engine:
 * - Offensive power index (5v5 + special teams)
 * - Defensive resistance index (5v5 + special teams)
 * - Goalie shot-stopping index (by shot profile)
 *
 * This file intentionally contains the API + data contracts first. We will
 * plug in real computations once Phase 1 ingestion fills events/xG tables.
 */

export type StrengthState = "5v5" | "pp" | "pk" | "4v4" | "other";

export interface TeamRatingInput {
  teamId: string;
  leagueCode: "NHL";
  season: string;
  asOfDateISO: string;
  windowGames?: number; // e.g. last 10/20/50
}

export interface GoalieRatingInput {
  goalieId: string;
  leagueCode: "NHL";
  season: string;
  asOfDateISO: string;
  windowGames?: number;
}

export interface TeamRatings {
  teamId: string;
  season: string;
  asOfDateISO: string;
  createdAtISO: string;
  components: {
    fiveVFive: {
      offensivePowerIndex: number; // higher is better
      defensiveResistanceIndex: number; // higher is better
      xgForPer60: number;
      xgAgainstPer60: number;
      shotAttemptsForPer60: number;
      shotAttemptsAgainstPer60: number;
    };
    specialTeams: {
      powerPlayOffenseIndex: number;
      penaltyKillDefenseIndex: number;
      xgForPer2minPP: number;
      xgAgainstPer2minPK: number;
    };
  };
  overall: {
    offensivePowerIndex: number;
    defensiveResistanceIndex: number;
  };
  debug?: Record<string, unknown>;
}

export interface GoalieRatings {
  goalieId: string;
  season: string;
  asOfDateISO: string;
  createdAtISO: string;
  overall: {
    shotStoppingIndex: number; // higher is better (think GSAX/60 style)
    savePct: number; // 0..1
    goalsSavedAboveExpected: number; // raw GSAX
    gsaxPer60: number;
  };
  byShotProfile: Array<{
    profile: string; // e.g. 'HD', 'MD', 'LD', 'slot', 'point', etc.
    shots: number;
    savePct: number;
    xgAgainst: number;
    gsax: number;
    index: number;
  }>;
  debug?: Record<string, unknown>;
}

/**
 * Compute a team rating snapshot.
 * TODO: Replace placeholder with real aggregation over `game_events` + `xg_event_values`.
 */
export async function computeTeamRatings(_input: TeamRatingInput): Promise<TeamRatings> {
  const now = new Date().toISOString();
  return {
    teamId: _input.teamId,
    season: _input.season,
    asOfDateISO: _input.asOfDateISO,
    createdAtISO: now,
    components: {
      fiveVFive: {
        offensivePowerIndex: 0,
        defensiveResistanceIndex: 0,
        xgForPer60: 0,
        xgAgainstPer60: 0,
        shotAttemptsForPer60: 0,
        shotAttemptsAgainstPer60: 0,
      },
      specialTeams: {
        powerPlayOffenseIndex: 0,
        penaltyKillDefenseIndex: 0,
        xgForPer2minPP: 0,
        xgAgainstPer2minPK: 0,
      },
    },
    overall: {
      offensivePowerIndex: 0,
      defensiveResistanceIndex: 0,
    },
    debug: {
      note: "Phase 2 scaffold: waiting for Phase 1 events + xG ingestion.",
    },
  };
}

/**
 * Compute a goalie rating snapshot.
 * TODO: Replace placeholder with real aggregation over `goalie_game_metrics` and/or events.
 */
export async function computeGoalieRatings(_input: GoalieRatingInput): Promise<GoalieRatings> {
  const now = new Date().toISOString();
  return {
    goalieId: _input.goalieId,
    season: _input.season,
    asOfDateISO: _input.asOfDateISO,
    createdAtISO: now,
    overall: {
      shotStoppingIndex: 0,
      savePct: 0,
      goalsSavedAboveExpected: 0,
      gsaxPer60: 0,
    },
    byShotProfile: [],
    debug: {
      note: "Phase 2 scaffold: waiting for Phase 1 events + xG ingestion.",
    },
  };
}
