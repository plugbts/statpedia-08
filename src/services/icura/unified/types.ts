export type LeagueCode = "NHL";

export type IcuraEventType = "shot" | "goal" | "penalty" | "faceoff" | "hit" | "block" | "other";

export type StrengthState = "5v5" | "pp" | "pk" | "4v4" | "3v3" | "other";

export interface IcuraTeam {
  league: LeagueCode;
  teamAbbr: string; // e.g. 'BOS'
  name?: string;
  externalIds?: Record<string, string>;
}

export interface IcuraPlayer {
  league: LeagueCode;
  playerId?: string; // internal UUID later
  fullName: string;
  teamAbbr?: string;
  position?: string;
  externalIds?: Record<string, string>;
}

export interface IcuraGoalie {
  league: LeagueCode;
  fullName: string;
  teamAbbr?: string;
  catches?: "L" | "R" | null;
  externalIds?: Record<string, string>;
}

export interface IcuraGame {
  league: LeagueCode;
  gameId: string; // NHL gamecenter id (string)
  dateISO: string; // YYYY-MM-DD
  startTimeISO?: string; // full ISO datetime if available
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  venue?: string;
  status?: string;
  externalIds?: Record<string, string>;
}

export interface IcuraEvent {
  id: string; // provider event id or computed hash
  league: LeagueCode;
  gameId: string;
  eventType: IcuraEventType;
  teamAbbr?: string;
  opponentTeamAbbr?: string;
  shooterName?: string;
  goalieName?: string;
  period?: number;
  periodTimeSeconds?: number;
  gameTimeSeconds?: number;
  strength?: StrengthState;
  shotType?: string;
  xCoord?: number;
  yCoord?: number;
  isGoal?: boolean;
  penaltyMinutes?: number;
  penaltyType?: string;
  description?: string;
  source: "nhl_api" | "moneypuck" | "nhl_edge" | "other";
  raw?: unknown;
}

export interface IcuraXgModelMeta {
  name: string; // e.g. 'moneypuck'
  version: string;
}

export interface IcuraXgEventValue {
  eventId: string;
  model: IcuraXgModelMeta;
  xg: number;
  source: "moneypuck" | "icura" | "other";
  raw?: unknown;
}

export interface IcuraGoalieGameMetrics {
  gameId: string;
  goalieName: string;
  teamAbbr?: string;
  opponentTeamAbbr?: string;
  shots?: number;
  saves?: number;
  goalsAgainst?: number;
  savePct?: number;
  xgAgainst?: number;
  gsax?: number;
  shotProfile?: Record<string, unknown>;
  source: "nhl_api" | "moneypuck" | "nhl_edge" | "other";
  raw?: unknown;
}

export interface IcuraLineCombo {
  gameId: string;
  teamAbbr: string;
  unitType: "F" | "D" | "PP" | "PK";
  unitSlot: string; // '1','2','PP1', etc.
  players: string[]; // player names for now; later switch to IDs
  toiSeconds?: number;
  xgFor?: number;
  xgAgainst?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  source: "nhl_api" | "moneypuck" | "nhl_edge" | "other";
  raw?: unknown;
}

export interface IcuraUnifiedGamePackage {
  game: IcuraGame;
  teams: IcuraTeam[];
  players?: IcuraPlayer[];
  goalies?: IcuraGoalie[];
  events: IcuraEvent[];
  xg: {
    model: IcuraXgModelMeta;
    eventValues: IcuraXgEventValue[];
  }[];
  goalieMetrics: IcuraGoalieGameMetrics[];
  lineCombos: IcuraLineCombo[];
  sourcesUsed: Array<"nhl_api" | "moneypuck" | "nhl_edge">;
  debug?: Record<string, unknown>;
}
