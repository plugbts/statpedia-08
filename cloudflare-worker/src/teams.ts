// Team name normalization and abbreviation resolution using database-backed registry
// Handles team name variations, abbreviations, and logo mapping

import { buildTeamRegistry, resolveTeam, type TeamInfo } from "./teamRegistry";

export type RawRow = {
  league?: string | null;
  team?: string | null;          // raw text from player_game_logs
  opponent?: string | null;      // raw text from player_game_logs
  sportsbook?: string | null;
  game_id?: string | null;
  date?: string | null;
  prop_date?: string | null;
  // Additional fields that might come from player name cleaning
  player_id?: string | null;
  prop_type?: string | null;
  [key: string]: any; // Allow additional properties
};

// Database-backed team registry will be used instead of hardcoded mappings

// Database-backed team normalization using dynamic registry

export type CleanTeamRow = RawRow & {
  team_abbr: string;          // "GB" or "UNK"
  team_logo: string | null;   // logo URL or null
  team_name: string;          // canonical full name or original
  opponent_abbr: string;      // opponent abbreviation
  opponent_logo: string | null;
  opponent_name: string;
  debug_team: {
    league: string;
    raw_team: string | null;
    raw_opponent: string | null;
    team_resolved: boolean;
    opponent_resolved: boolean;
    team_strategy: "exact" | "alias" | "abbr" | "city" | "fallback";
    opp_strategy:  "exact" | "alias" | "abbr" | "city" | "fallback";
  };
};

export async function enrichTeams(rows: any[], league: string, env: any, logPrefix = "[worker:teams]"): Promise<CleanTeamRow[]> {
  const registry = await buildTeamRegistry(league, env);
  let teamResolved = 0, oppResolved = 0;

  console.log(`${logPrefix} input_rows=${rows.length} registry_keys=${Object.keys(registry).length}`);

  const out = rows.map((row, idx) => {
    const teamInfo = resolveTeam(registry, row.team);
    const oppInfo  = resolveTeam(registry, row.opponent);

    const team_abbr = teamInfo?.abbr ?? "UNK";
    const team_logo = teamInfo?.logo ?? null;
    const team_name = teamInfo?.name ?? (row.team ?? "Unknown Team");

    const opponent_abbr = oppInfo?.abbr ?? "UNK";
    const opponent_logo = oppInfo?.logo ?? null;
    const opponent_name = oppInfo?.name ?? (row.opponent ?? "Unknown Opponent");

    if (teamInfo) teamResolved++; else {
      console.warn(`${logPrefix} unresolved_team idx=${idx} raw="${row.team ?? ""}" date=${row.prop_date ?? row.date ?? "?"} game=${row.game_id ?? "?"}`);
    }
    if (oppInfo) oppResolved++; else {
      console.warn(`${logPrefix} unresolved_opponent idx=${idx} raw="${row.opponent ?? ""}" date=${row.prop_date ?? row.date ?? "?"} game=${row.game_id ?? "?"}`);
    }

    return {
      ...row,
      team_abbr,
      team_logo,
      team_name,
      opponent_abbr,
      opponent_logo,
      opponent_name,
      debug_team: {
        league: league.toLowerCase(),
        raw_team: row.team ?? null,
        raw_opponent: row.opponent ?? null,
        team_resolved: !!teamInfo,
        opponent_resolved: !!oppInfo,
        team_strategy: teamInfo ? "resolved" : "fallback",
        opp_strategy: oppInfo ? "resolved" : "fallback",
      },
    };
  });

  console.log(`${logPrefix} summary team_resolved=${teamResolved} opp_resolved=${oppResolved} unresolved=${rows.length - teamResolved}/${rows.length - oppResolved}`);
  return out;
}

// Export types for use in other modules
export type { RawRow, TeamInfo };
