import { NormalizedPlayerProp } from "@/services/hasura-player-props-normalized-service";
import { GQLPlayerProp } from "@/components/PlayerPropsTable";

// Map NormalizedPlayerProp from GraphQL to the PlayerPropsTable row shape
export function mapToPlayerPropsTableRows(items: NormalizedPlayerProp[]): GQLPlayerProp[] {
  return (items || []).map((p) => ({
    prop_id: (p as any).prop_id || (p as any).id,
    player_id: (p as any).player_id,
    player_name: (p as any).player_name,
    team_abbrev: (p as any).team_abbrev || (p as any).team_abbr,
    opponent_abbrev: (p as any).opponent_abbrev || (p as any).opponent_abbr,
    prop_type: (p as any).prop_type || (p as any).market || "Unknown",
    line: Number((p as any).line ?? 0),
    odds: (p as any).odds ?? null,
    over_odds_american: (p as any).over_odds_american ?? null,
    under_odds_american: (p as any).under_odds_american ?? null,
    ev_percent: (p as any).ev_percent ?? null,
    matchup_rank: (p as any).matchup_rank ?? null,
    l5: (p as any).l5 ?? null,
    l10: (p as any).l10 ?? null,
    l20: (p as any).l20 ?? null,
  }));
}
