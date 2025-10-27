import { NormalizedPlayerProp } from "./hasura-player-props-normalized-service";

// Interface defining the contract for league-agnostic player props operations
export interface ILeagueAgnosticPlayerPropsService {
  // League filtering
  getLeagues(): Promise<string[]>;
  getActiveLeagues(): Promise<string[]>;

  // Player props by league
  getPlayerPropsByLeague(
    league: string,
    options?: PlayerPropsOptions,
  ): Promise<NormalizedPlayerProp[]>;
  getUpcomingGamesByLeague(league: string, days?: number): Promise<Game[]>;

  // Multi-league queries
  getAllPlayerProps(options?: PlayerPropsOptions): Promise<NormalizedPlayerProp[]>;
  getPlayerPropsByLeagues(
    leagues: string[],
    options?: PlayerPropsOptions,
  ): Promise<NormalizedPlayerProp[]>;

  // League-specific stats
  getLeagueStats(league: string): Promise<LeagueStats>;
  getPlayerStatsByLeague(playerId: string, league: string): Promise<PlayerStats>;
}

export interface PlayerPropsOptions {
  limit?: number;
  offset?: number;
  market?: string;
  minEvPercent?: number;
  maxEvPercent?: number;
  teamId?: string;
  playerId?: string;
  gameId?: string;
  sportsbookId?: string;
  sortBy?: "ev_percent" | "line" | "odds" | "created_at";
  sortOrder?: "asc" | "desc";
}

export interface Game {
  id: string;
  league: string;
  game_date: string;
  home_team_id: string;
  away_team_id: string;
  home_team_name: string;
  away_team_name: string;
  home_team_abbrev: string;
  away_team_abbrev: string;
  home_team_logo: string;
  away_team_logo: string;
  season: string;
  week?: number;
}

export interface LeagueStats {
  league: string;
  total_props: number;
  total_games: number;
  total_players: number;
  total_teams: number;
  active_sportsbooks: number;
  avg_ev_percent: number;
  top_markets: Array<{ market: string; count: number }>;
}

export interface PlayerStats {
  player_id: string;
  league: string;
  player_name: string;
  team_name: string;
  total_props: number;
  avg_ev_percent: number;
  best_market: string;
  recent_form: string;
  rating: number;
}

// Implementation of the league-agnostic player props service
export class LeagueAgnosticPlayerPropsService implements ILeagueAgnosticPlayerPropsService {
  private hasuraEndpoint: string;
  private adminSecret: string;

  constructor() {
    this.hasuraEndpoint =
      process.env.HASURA_ENDPOINT ||
      "https://graphql-engine-latest-statpedia.onrender.com/v1/graphql";
    this.adminSecret = process.env.HASURA_ADMIN_SECRET || "";
  }

  private async graphqlQuery(query: string, variables: any = {}) {
    const response = await fetch(this.hasuraEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": this.adminSecret,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  }

  async getLeagues(): Promise<string[]> {
    const query = `
      query GetLeagues {
        player_props_normalized(distinct_on: [league]) {
          league
        }
      }
    `;

    const data = await this.graphqlQuery(query);
    return data.player_props_normalized.map((item: any) => item.league);
  }

  async getActiveLeagues(): Promise<string[]> {
    const query = `
      query GetActiveLeagues {
        teams_canonical(distinct_on: [league], where: {is_active: {_eq: true}}) {
          league
        }
      }
    `;

    const data = await this.graphqlQuery(query);
    return data.teams_canonical.map((item: any) => item.league);
  }

  async getPlayerPropsByLeague(
    league: string,
    options: PlayerPropsOptions = {},
  ): Promise<NormalizedPlayerProp[]> {
    const {
      limit = 50,
      offset = 0,
      market,
      minEvPercent,
      maxEvPercent,
      teamId,
      playerId,
      gameId,
      sportsbookId,
      sortBy = "ev_percent",
      sortOrder = "desc",
    } = options;

    let whereClause = `league: {_eq: "${league}"}`;

    if (market) {
      whereClause += `, market: {_eq: "${market}"}`;
    }

    if (minEvPercent !== undefined) {
      whereClause += `, ev_percent: {_gte: ${minEvPercent}}`;
    }

    if (maxEvPercent !== undefined) {
      whereClause += `, ev_percent: {_lte: ${maxEvPercent}}`;
    }

    if (teamId) {
      whereClause += `, team_id: {_eq: "${teamId}"}`;
    }

    if (playerId) {
      whereClause += `, player_id: {_eq: "${playerId}"}`;
    }

    if (gameId) {
      whereClause += `, game_id: {_eq: "${gameId}"}`;
    }

    if (sportsbookId) {
      whereClause += `, sportsbook_id: {_eq: "${sportsbookId}"}`;
    }

    const query = `
      query GetPlayerPropsByLeague($limit: Int, $offset: Int) {
        player_props_normalized(
          where: {${whereClause}},
          order_by: {${sortBy}: ${sortOrder}},
          limit: $limit,
          offset: $offset
        ) {
          prop_id
          league
          game_id
          game_date
          market
          line
          odds
          ev_percent
          player_id
          player_name
          api_player_id
          position
          team_id
          team_name
          team_abbrev
          team_logo
          opponent_id
          opponent_name
          opponent_abbrev
          opponent_logo
          sportsbook_id
          sportsbook_name
          season
          week
          streak
          rating
          matchup_rank
          l5
          l10
          l20
          is_active
          created_at
          updated_at
        }
      }
    `;

    const data = await this.graphqlQuery(query, { limit, offset });
    return data.player_props_normalized;
  }

  async getUpcomingGamesByLeague(league: string, days: number = 7): Promise<Game[]> {
    const query = `
      query GetUpcomingGamesByLeague {
        games_canonical(
          where: {
            league: {_eq: "${league}"},
            game_date: {_gte: "now()", _lte: "now() + interval '${days} days'"},
            is_active: {_eq: true}
          },
          order_by: {game_date: asc}
        ) {
          id
          league
          game_date
          home_team_id
          away_team_id
          season
          week
          home_team: teams_canonical_by_home_team_id {
            name
            abbreviation
            logo_url
          }
          away_team: teams_canonical_by_away_team_id {
            name
            abbreviation
            logo_url
          }
        }
      }
    `;

    const data = await this.graphqlQuery(query);
    return data.games_canonical.map((game: any) => ({
      id: game.id,
      league: game.league,
      game_date: game.game_date,
      home_team_id: game.home_team_id,
      away_team_id: game.away_team_id,
      home_team_name: game.home_team.name,
      away_team_name: game.away_team.name,
      home_team_abbrev: game.home_team.abbreviation,
      away_team_abbrev: game.away_team.abbreviation,
      home_team_logo: game.home_team.logo_url,
      away_team_logo: game.away_team.logo_url,
      season: game.season,
      week: game.week,
    }));
  }

  async getAllPlayerProps(options: PlayerPropsOptions = {}): Promise<NormalizedPlayerProp[]> {
    const {
      limit = 100,
      offset = 0,
      market,
      minEvPercent,
      maxEvPercent,
      teamId,
      playerId,
      gameId,
      sportsbookId,
      sortBy = "ev_percent",
      sortOrder = "desc",
    } = options;

    let whereClause = "";

    if (market) {
      whereClause += `market: {_eq: "${market}"}, `;
    }

    if (minEvPercent !== undefined) {
      whereClause += `ev_percent: {_gte: ${minEvPercent}}, `;
    }

    if (maxEvPercent !== undefined) {
      whereClause += `ev_percent: {_lte: ${maxEvPercent}}, `;
    }

    if (teamId) {
      whereClause += `team_id: {_eq: "${teamId}"}, `;
    }

    if (playerId) {
      whereClause += `player_id: {_eq: "${playerId}"}, `;
    }

    if (gameId) {
      whereClause += `game_id: {_eq: "${gameId}"}, `;
    }

    if (sportsbookId) {
      whereClause += `sportsbook_id: {_eq: "${sportsbookId}"}, `;
    }

    const query = `
      query GetAllPlayerProps($limit: Int, $offset: Int) {
        player_props_normalized(
          where: {${whereClause}},
          order_by: {${sortBy}: ${sortOrder}},
          limit: $limit,
          offset: $offset
        ) {
          prop_id
          league
          game_id
          game_date
          market
          line
          odds
          ev_percent
          player_id
          player_name
          api_player_id
          position
          team_id
          team_name
          team_abbrev
          team_logo
          opponent_id
          opponent_name
          opponent_abbrev
          opponent_logo
          sportsbook_id
          sportsbook_name
          season
          week
          streak
          rating
          matchup_rank
          l5
          l10
          l20
          is_active
          created_at
          updated_at
        }
      }
    `;

    const data = await this.graphqlQuery(query, { limit, offset });
    return data.player_props_normalized;
  }

  async getPlayerPropsByLeagues(
    leagues: string[],
    options: PlayerPropsOptions = {},
  ): Promise<NormalizedPlayerProp[]> {
    const {
      limit = 100,
      offset = 0,
      market,
      minEvPercent,
      maxEvPercent,
      teamId,
      playerId,
      gameId,
      sportsbookId,
      sortBy = "ev_percent",
      sortOrder = "desc",
    } = options;

    let whereClause = `league: {_in: [${leagues.map((l) => `"${l}"`).join(", ")}]}`;

    if (market) {
      whereClause += `, market: {_eq: "${market}"}`;
    }

    if (minEvPercent !== undefined) {
      whereClause += `, ev_percent: {_gte: ${minEvPercent}}`;
    }

    if (maxEvPercent !== undefined) {
      whereClause += `, ev_percent: {_lte: ${maxEvPercent}}`;
    }

    if (teamId) {
      whereClause += `, team_id: {_eq: "${teamId}"}`;
    }

    if (playerId) {
      whereClause += `, player_id: {_eq: "${playerId}"}`;
    }

    if (gameId) {
      whereClause += `, game_id: {_eq: "${gameId}"}`;
    }

    if (sportsbookId) {
      whereClause += `, sportsbook_id: {_eq: "${sportsbookId}"}`;
    }

    const query = `
      query GetPlayerPropsByLeagues($limit: Int, $offset: Int) {
        player_props_normalized(
          where: {${whereClause}},
          order_by: {${sortBy}: ${sortOrder}},
          limit: $limit,
          offset: $offset
        ) {
          prop_id
          league
          game_id
          game_date
          market
          line
          odds
          ev_percent
          player_id
          player_name
          api_player_id
          position
          team_id
          team_name
          team_abbrev
          team_logo
          opponent_id
          opponent_name
          opponent_abbrev
          opponent_logo
          sportsbook_id
          sportsbook_name
          season
          week
          streak
          rating
          matchup_rank
          l5
          l10
          l20
          is_active
          created_at
          updated_at
        }
      }
    `;

    const data = await this.graphqlQuery(query, { limit, offset });
    return data.player_props_normalized;
  }

  async getLeagueStats(league: string): Promise<LeagueStats> {
    const query = `
      query GetLeagueStats {
        props_count: player_props_normalized_aggregate(where: {league: {_eq: "${league}"}}) {
          aggregate {
            count
          }
        }
        games_count: games_canonical_aggregate(where: {league: {_eq: "${league}"}}) {
          aggregate {
            count
          }
        }
        players_count: players_canonical_aggregate(where: {league: {_eq: "${league}"}}) {
          aggregate {
            count
          }
        }
        teams_count: teams_canonical_aggregate(where: {league: {_eq: "${league}"}}) {
          aggregate {
            count
          }
        }
        sportsbooks_count: sportsbooks_canonical_aggregate {
          aggregate {
            count
          }
        }
        avg_ev: player_props_normalized_aggregate(where: {league: {_eq: "${league}"}}) {
          aggregate {
            avg {
              ev_percent
            }
          }
        }
        top_markets: player_props_normalized(
          where: {league: {_eq: "${league}"}},
          distinct_on: [market]
        ) {
          market
        }
      }
    `;

    const data = await this.graphqlQuery(query);

    return {
      league,
      total_props: data.props_count.aggregate.count,
      total_games: data.games_count.aggregate.count,
      total_players: data.players_count.aggregate.count,
      total_teams: data.teams_count.aggregate.count,
      active_sportsbooks: data.sportsbooks_count.aggregate.count,
      avg_ev_percent: data.avg_ev.aggregate.avg.ev_percent || 0,
      top_markets: data.top_markets.map((item: any) => ({ market: item.market, count: 0 })), // TODO: Get actual counts
    };
  }

  async getPlayerStatsByLeague(playerId: string, league: string): Promise<PlayerStats> {
    const query = `
      query GetPlayerStatsByLeague {
        player_props_normalized(
          where: {
            player_id: {_eq: "${playerId}"},
            league: {_eq: "${league}"}
          }
        ) {
          player_name
          team_name
          market
          ev_percent
          streak
          rating
        }
      }
    `;

    const data = await this.graphqlQuery(query);
    const props = data.player_props_normalized;

    if (props.length === 0) {
      throw new Error(`No props found for player ${playerId} in league ${league}`);
    }

    const totalProps = props.length;
    const avgEvPercent =
      props.reduce((sum: number, prop: any) => sum + (prop.ev_percent || 0), 0) / totalProps;
    const markets = props.map((prop: any) => prop.market);
    const bestMarket = markets.reduce((a: string, b: string) =>
      markets.filter((v) => v === a).length >= markets.filter((v) => v === b).length ? a : b,
    );

    return {
      player_id: playerId,
      league,
      player_name: props[0].player_name,
      team_name: props[0].team_name,
      total_props: totalProps,
      avg_ev_percent: avgEvPercent,
      best_market: bestMarket,
      recent_form: props[0].streak || "0/0",
      rating: props[0].rating || 0,
    };
  }
}

// Export singleton instance
export const leagueAgnosticPlayerPropsService = new LeagueAgnosticPlayerPropsService();
