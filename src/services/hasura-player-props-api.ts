/**
 * Hasura-based Player Props API Service with Prop Limits
 *
 * This service connects to our Hasura GraphQL API with Cloudflare Workers
 * to fetch player props data from our Neon database, respecting league prop limits.
 */

import { LEAGUE_PROP_CAPS } from "../lib/leagues";

interface PlayerProp {
  id?: string;
  playerId?: string;
  playerName: string;
  player_id?: string | number;
  team?: string;
  opponent?: string;
  propType: string;
  line: number | null;
  overOdds: number | null;
  underOdds: number | null;
  bestOddsOver?: string | null;
  bestOddsUnder?: string | null;
  booksOver?: string;
  booksUnder?: string;
  pickemSite?: string;
  overProjection?: number | null;
  underProjection?: number | null;
  sportsbooks?: string[];
  position?: string;
  gameDate: string;
  gameTime?: string;
  sport?: string;
  teamAbbr: string;
  opponentAbbr: string;
  source?: string; // 'sportsbook' or 'pickem'
  confidence?: number;
  expectedValue?: number;
  recentForm?: string;
  aiPrediction?: {
    recommended: "over" | "under";
    confidence: number;
    reasoning: string;
  };
  // Enhanced fields
  bestOver?: {
    bookmaker: string;
    side: string;
    price: string;
    line: number | null;
  };
  bestUnder?: {
    bookmaker: string;
    side: string;
    price: string;
    line: number | null;
  };
  allBooks?: Array<{
    bookmaker: string;
    side: string;
    price: string;
    line: number | null;
    deeplink?: string;
  }>;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  // Additional fields for compatibility
  availableSportsbooks?: string[];
  gameId?: string;
  allSportsbookOdds?: Array<{
    sportsbook: string;
    odds: number;
    lastUpdate: string;
  }>;
  available?: boolean;
  awayTeam?: string;
  homeTeam?: string;
  betType?: string;
  isExactAPIData?: boolean;
  lastUpdate?: string;
  marketName?: string;
  market?: string;
  marketId?: string;
  period?: string;
  statEntity?: string;
}

interface APIResponse {
  success: boolean;
  data: PlayerProp[];
  cached: boolean;
  cacheKey: string;
  responseTime: number;
  totalEvents: number;
  totalProps: number;
  error?: string;
}

class HasuraPlayerPropsAPI {
  private readonly graphqlEndpoint = "https://statpedia-proxy.statpedia.workers.dev/v1/graphql";

  /**
   * Get player props from Hasura GraphQL API with league-specific limits
   */
  async getPlayerProps(
    sport: string = "nba",
    forceRefresh: boolean = false,
    date?: string,
    view?: string,
  ): Promise<PlayerProp[]> {
    try {
      console.log(`📊 HASURA: Fetching player props for ${sport} from GraphQL API...`);

      const startTime = Date.now();

      // Get prop limit for the sport
      const sportKey = sport.toLowerCase();
      const propLimit = LEAGUE_PROP_CAPS[sportKey] || LEAGUE_PROP_CAPS.nfl; // Default to NFL limit

      console.log(`📊 HASURA: Using prop limit of ${propLimit} for ${sport}`);

      // First get upcoming game IDs for this sport
      const now = new Date().toISOString();
      const upcomingGamesQuery = `
        query GetUpcomingGames {
          games(
            where: { 
              game_date: { _gt: "${now}" }
            }
          ) {
            id
          }
        }
      `;

      const gamesResponse = await fetch(this.graphqlEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: upcomingGamesQuery }),
      });

      if (!gamesResponse.ok) {
        throw new Error(`HTTP error! status: ${gamesResponse.status}`);
      }

      const gamesResult = await gamesResponse.json();
      const upcomingGameIds = gamesResult.data?.games?.map((game: any) => game.id) || [];

      console.log(`📊 Found ${upcomingGameIds.length} upcoming games for ${sport}`);

      // If no upcoming games, return empty array
      if (upcomingGameIds.length === 0) {
        console.log(
          `⏰ No upcoming games found via GraphQL for ${sport}, but checking database directly...`,
        );

        // Fallback: Get props directly from database for upcoming games
        try {
          const directProps = await this.getPropsDirectlyFromDB(sport);
          if (directProps.length > 0) {
            console.log(`✅ Found ${directProps.length} props via direct database query`);
            return directProps;
          }
        } catch (error) {
          console.log("Direct DB query failed:", error);
        }

        return [];
      }

      // Build GraphQL query using upcoming game IDs
      const baseFilter = `source: { _eq: "sportsbook" }, game_id: { _in: [${upcomingGameIds.map((id) => `"${id}"`).join(", ")}] }`;
      const query = `
        query GetPlayerProps($limit: Int) {
          props(limit: $limit, order_by: {priority: desc, created_at: desc}, where: { ${baseFilter} }) {
            id
            prop_type
            line
            odds
            priority
            source
            best_odds_over
            best_odds_under
            books_over
            books_under
            game_id
            game {
              id
              game_date
              home_team {
                id
                name
                abbreviation
                logo_url
              }
              away_team {
                id
                name
                abbreviation
                logo_url
              }
            }
            player {
              id
              name
              position
              team {
                id
                name
                abbreviation
                logo_url
                league
              }
            }
            team {
              id
              name
              abbreviation
              logo_url
              league
            }
          }
        }
      `;

      const response = await fetch(this.graphqlEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables: {
            limit: propLimit,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        console.error("GraphQL errors:", result.errors);
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      const dbProps = result.data?.props || [];
      console.log(
        `📊 HASURA: Retrieved ${dbProps.length} props from GraphQL API (limit: ${propLimit})`,
      );

      // 🔍 DEBUG: Log first few props to see what we're getting
      if (dbProps.length > 0) {
        console.log(
          "🔍 DEBUG: First 3 props from API:",
          dbProps.slice(0, 3).map((p) => ({
            id: p.id,
            prop_type: p.prop_type,
            line: p.line,
            odds: p.odds,
          })),
        );
      }

      if (dbProps.length === 0) {
        console.log(`⚠️ HASURA: No props found for ${sport}`);
        return [];
      }

      // Transform GraphQL data to frontend format using real relationships
      const frontendProps: PlayerProp[] = dbProps.map((prop: any) => {
        const player = prop.player;
        const team = player?.team || prop.team;
        const league = team?.league;
        const game = prop.game;

        // Get team abbreviation
        const teamAbbr = team?.abbreviation || "UNK";

        // Determine opponent from game data
        let opponentAbbr = "UNK";
        let opponentName = "Unknown";
        let homeTeamLogo = "";
        let awayTeamLogo = "";

        if (game?.home_team && game?.away_team) {
          const homeAbbr = game.home_team.abbreviation;
          const awayAbbr = game.away_team.abbreviation;
          homeTeamLogo = game.home_team.logo_url || "";
          awayTeamLogo = game.away_team.logo_url || "";

          // Player's team is home -> opponent is away, and vice versa
          if (teamAbbr === homeAbbr) {
            opponentAbbr = awayAbbr;
            opponentName = game.away_team.name;
          } else if (teamAbbr === awayAbbr) {
            opponentAbbr = homeAbbr;
            opponentName = game.home_team.name;
          } else {
            // Fallback: if team doesn't match either, use away as opponent
            opponentAbbr = awayAbbr;
            opponentName = game.away_team.name;
          }
        }

        return {
          id: prop.id,
          playerId: player?.id,
          playerName: player?.name || "Unknown Player",
          team: teamAbbr,
          teamAbbr: teamAbbr,
          opponent: opponentAbbr,
          opponentAbbr: opponentAbbr,
          gameId: prop.game_id,
          sport: league?.code || sport.toUpperCase(),
          propType: prop.prop_type || "Unknown",
          line: prop.line ? parseFloat(prop.line) : null,
          source: prop.source || "sportsbook", // Default to sportsbook for getPlayerProps (props table)
          overOdds: prop.best_odds_over
            ? parseInt(prop.best_odds_over.replace(/[^\d-]/g, ""))
            : null,
          underOdds: prop.best_odds_under
            ? parseInt(prop.best_odds_under.replace(/[^\d-]/g, ""))
            : null,
          bestOddsOver: prop.best_odds_over,
          bestOddsUnder: prop.best_odds_under,
          booksOver: prop.books_over,
          booksUnder: prop.books_under,
          gameDate: game?.game_date || new Date().toISOString().split("T")[0],
          gameTime: game?.game_date || new Date().toISOString(),
          availableSportsbooks: ["StatPedia"],
          allSportsbookOdds: [
            {
              sportsbook: "StatPedia",
              odds: prop.odds ? parseInt(prop.odds.replace(/[^\d-]/g, "")) : 0,
              lastUpdate: new Date().toISOString(),
            },
          ],
          available: true,
          isExactAPIData: true,
          lastUpdate: new Date().toISOString(),
          market: prop.prop_type,
          marketName: prop.prop_type,
          confidence: 75,
          position: player?.position,
          homeTeamLogo: homeTeamLogo,
          awayTeamLogo: awayTeamLogo,
        };
      });

      // Debug logging to verify team data
      if (frontendProps.length > 0) {
        console.log(`✅ Sample prop after transformation:`, {
          playerName: frontendProps[0].playerName,
          team: frontendProps[0].team,
          opponent: frontendProps[0].opponent,
          gameId: frontendProps[0].gameId,
        });
      }

      // Filter by sport only - show all props for debugging
      const filteredProps = frontendProps.filter((prop) => {
        // Filter by sport if specified - convert both to uppercase for comparison
        if (sport && prop.sport.toUpperCase() !== sport.toUpperCase()) {
          return false;
        }

        return true;
      });

      // Debug info about prop relationships
      const propsWithPlayers = filteredProps.filter(
        (p) => p.playerName && p.playerName !== "Unknown Player",
      );
      const propsWithoutPlayers = filteredProps.filter(
        (p) => !p.playerName || p.playerName === "Unknown Player",
      );

      console.log(
        `📊 HASURA: Filtered to ${filteredProps.length} props for ${sport} (limit applied: ${propLimit})`,
      );
      console.log(
        `🔍 DEBUG: ${propsWithPlayers.length} props with players, ${propsWithoutPlayers.length} props without players`,
      );

      if (filteredProps.length > 0) {
        console.log(
          `🔍 DEBUG: Sample prop - Player: "${filteredProps[0].playerName}", Team: "${filteredProps[0].team}", Prop: "${filteredProps[0].propType}"`,
        );
      }

      // Custom sorting to prioritize Sportsbook > Pick'em, then Passing Yards and other key props
      const sortedProps = filteredProps.sort((a, b) => {
        // First: Source priority (sportsbook > pickem)
        const sourcePriority = (source: string) => {
          if (source === "sportsbook") return 1;
          if (source === "pickem") return 2;
          return 3; // Unknown source
        };

        const aSourcePriority = sourcePriority(a.source);
        const bSourcePriority = sourcePriority(b.source);

        if (aSourcePriority !== bSourcePriority) {
          return aSourcePriority - bSourcePriority;
        }

        // Second: Priority order for prop types
        const propPriority = (propType: string) => {
          const lower = propType.toLowerCase();
          if (lower.includes("passing yards")) return 1;
          if (lower.includes("rushing yards")) return 2;
          if (lower.includes("receiving yards")) return 3;
          if (lower.includes("receptions")) return 4;
          if (lower.includes("passing tds")) return 5;
          if (lower.includes("rushing tds")) return 6;
          if (lower.includes("receiving tds")) return 7;
          return 8; // Other props
        };

        const aPriority = propPriority(a.propType);
        const bPriority = propPriority(b.propType);

        // Third: Sort by prop priority
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        // Fourth: Sort by priority flag (true first)
        if (a.priority !== b.priority) {
          return a.priority ? -1 : 1;
        }

        // Finally: Sort by created_at (newest first)
        return new Date(b.lastUpdate || 0).getTime() - new Date(a.lastUpdate || 0).getTime();
      });

      const responseTime = Date.now() - startTime;
      console.log(
        `✅ HASURA: Successfully retrieved and sorted ${sortedProps.length} props (${responseTime}ms)`,
      );

      return sortedProps;
    } catch (error) {
      console.error("❌ HASURA: Failed to fetch player props:", error);
      throw error;
    }
  }

  /**
   * Get cached player props (faster response) - backward compatibility
   */
  async getCachedPlayerProps(sport: string = "nba"): Promise<PlayerProp[]> {
    return await this.getPlayerProps(sport, false);
  }

  /**
   * Force refresh player props (bypass cache) - backward compatibility
   */
  async refreshPlayerProps(sport: string = "nba"): Promise<PlayerProp[]> {
    return await this.getPlayerProps(sport, true);
  }

  /**
   * Get props directly from database as fallback
   */
  private async getPropsDirectlyFromDB(sport: string): Promise<PlayerProp[]> {
    console.log(`🔧 Fallback: Cannot access database directly from browser for ${sport}`);
    console.log(`📊 Returning empty array - use GraphQL API instead`);
    return [];
  }

  /**
   * Check if all games for a sport have ended and refresh cache if needed
   */
  async checkAndRefreshIfGamesEnded(
    sport: string = "nfl",
  ): Promise<{ refreshed: boolean; reason: string }> {
    try {
      const now = new Date().toISOString();

      // Check if there are any upcoming games for this sport
      const upcomingGamesQuery = `
        query CheckUpcomingGames {
          games(
            where: { 
              game_date: { _gt: "${now}" },
              league: { code: { _eq: "${sport.toUpperCase()}" } }
            }
            limit: 1
          ) {
            id
            game_date
          }
        }
      `;

      const response = await fetch(this.graphqlEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: upcomingGamesQuery }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const upcomingGames = result.data?.games || [];

      if (upcomingGames.length === 0) {
        // No upcoming games, trigger refresh
        console.log(`🔄 No upcoming games found for ${sport}, triggering cache refresh...`);
        await this.getPlayerProps(sport, true);
        return { refreshed: true, reason: "No upcoming games found" };
      }

      return { refreshed: false, reason: "Upcoming games still exist" };
    } catch (error) {
      console.error("Error checking game status:", error);
      return { refreshed: false, reason: `Error: ${error.message}` };
    }
  }

  /**
   * Get player props with pagination (respects league limits)
   */
  async getPlayerPropsPaginated(
    sport: string = "nba",
    page: number = 1,
    pageSize: number = 50,
    forceRefresh: boolean = false,
    date?: string,
    view?: string,
  ): Promise<{
    props: PlayerProp[];
    total: number;
    hasMore: boolean;
    page: number;
    pageSize: number;
  }> {
    // Get league-specific limit
    const sportKey = sport.toLowerCase();
    const leagueLimit = LEAGUE_PROP_CAPS[sportKey] || LEAGUE_PROP_CAPS.nfl;

    // Adjust page size to not exceed league limit
    const adjustedPageSize = Math.min(pageSize, leagueLimit);

    const allProps = await this.getPlayerProps(sport, forceRefresh, date, view);
    return this.paginateProps(allProps, page, adjustedPageSize);
  }

  /**
   * Paginate props array
   */
  private paginateProps(
    props: PlayerProp[],
    page: number,
    pageSize: number,
  ): { props: PlayerProp[]; total: number; hasMore: boolean; page: number; pageSize: number } {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedProps = props.slice(startIndex, endIndex);

    return {
      props: paginatedProps,
      total: props.length,
      hasMore: endIndex < props.length,
      page,
      pageSize,
    };
  }

  /**
   * Get multiple sports at once (respects individual league limits)
   */
  async getAllSportsPlayerProps(): Promise<Record<string, PlayerProp[]>> {
    const sports = ["nba", "nfl", "mlb", "nhl"];
    const results: Record<string, PlayerProp[]> = {};

    // Fetch all sports in parallel, each respecting its own limit
    const promises = sports.map(async (sport) => {
      try {
        const result = await this.getPlayerProps(sport);
        results[sport] = result;
      } catch (error) {
        console.warn(`Failed to fetch ${sport} props:`, error);
        results[sport] = [];
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Get prop types available
   */
  async getPropTypes(sport?: string): Promise<any[]> {
    try {
      // Build query with optional sport filtering
      const whereClause = sport ? `(where: { sport: { _eq: "${sport}" } })` : "";
      const query = `
        query GetPropTypes {
          prop_types${whereClause} {
            id
            name
            category
            sport
            unit
            is_over_under
          }
        }
      `;

      const response = await fetch(this.graphqlEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
        }),
      });

      const result = await response.json();
      return result.data?.prop_types || [];
    } catch (error) {
      console.error("Failed to fetch prop types:", error);
      return [];
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.graphqlEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET || "",
        },
        body: JSON.stringify({
          query: "{ props(limit: 1) { id } }",
        }),
      });

      if (!response.ok) return false;

      const result = await response.json();
      return !result.errors;
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  }

  /**
   * Get league prop limits for display
   */
  getLeaguePropLimits(): Record<string, number> {
    return { ...LEAGUE_PROP_CAPS };
  }

  /**
   * Get prop limit for specific league
   */
  getPropLimitForLeague(league: string): number {
    return LEAGUE_PROP_CAPS[league.toLowerCase()] || LEAGUE_PROP_CAPS.nfl;
  }
}

// Export singleton instance
export const hasuraPlayerPropsAPI = new HasuraPlayerPropsAPI();

// Export types for use in components
export type { PlayerProp, APIResponse };
