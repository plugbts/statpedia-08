import { supabase } from "../integrations/supabase/client";
import { getPropMatchups, getGameMatchups, getPlayerPropsWithLogs } from "../lib/analytics";
import { LEAGUE_PROP_CAPS } from "../lib/leagues";

export interface ApiResponse<T> {
  ok: boolean;
  count: number;
  data: T;
  error?: string;
}

export interface PropsApiParams {
  league: string;
  date: string;
  propType?: string;
  limit?: number;
}

export interface GamesApiParams {
  league: string;
  date: string;
  propType?: string;
}

export class AnalyticsApiService {
  // Props endpoint - equivalent to /api/props
  static async getProps(params: PropsApiParams): Promise<ApiResponse<any[]>> {
    try {
      const { league, date, propType, limit } = params;
      const leagueCap = limit || LEAGUE_PROP_CAPS[league.toLowerCase()] || 100;
      
      const data = await getPropMatchups(league, date, propType, leagueCap);
      
      return {
        ok: true,
        count: data.length,
        data
      };
    } catch (error: any) {
      console.error("Props API error:", error);
      return {
        ok: false,
        count: 0,
        data: [],
        error: error.message
      };
    }
  }

  // Games endpoint - equivalent to /api/games
  static async getGames(params: GamesApiParams): Promise<ApiResponse<any[]>> {
    try {
      const { league, date, propType } = params;
      
      const data = await getGameMatchups(league, date, propType);
      
      return {
        ok: true,
        count: data.length,
        data
      };
    } catch (error: any) {
      console.error("Games API error:", error);
      return {
        ok: false,
        count: 0,
        data: [],
        error: error.message
      };
    }
  }

  // Player props with logs endpoint
  static async getPlayerPropsWithLogs(params: PropsApiParams): Promise<ApiResponse<any[]>> {
    try {
      const { league, date, limit } = params;
      const leagueCap = limit || LEAGUE_PROP_CAPS[league.toLowerCase()] || 100;
      
      const data = await getPlayerPropsWithLogs(league, date, leagueCap);
      
      return {
        ok: true,
        count: data.length,
        data
      };
    } catch (error: any) {
      console.error("Player props API error:", error);
      return {
        ok: false,
        count: 0,
        data: [],
        error: error.message
      };
    }
  }

  // Refresh analytics views endpoint
  static async refreshAnalytics(): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase.rpc('refresh_analytics_views');
      
      if (error) {
        throw error;
      }
      
      return {
        ok: true,
        count: 0,
        data: null
      };
    } catch (error: any) {
      console.error("Refresh analytics error:", error);
      return {
        ok: false,
        count: 0,
        data: null,
        error: error.message
      };
    }
  }

  // Get available leagues and their status
  static async getLeagueStatus(): Promise<ApiResponse<any>> {
    try {
      const leagues = Object.keys(LEAGUE_PROP_CAPS).map(league => ({
        id: league,
        displayName: league.toUpperCase(),
        propCap: LEAGUE_PROP_CAPS[league],
        isActive: true // You can implement season checking here
      }));

      return {
        ok: true,
        count: leagues.length,
        data: leagues
      };
    } catch (error: any) {
      console.error("League status error:", error);
      return {
        ok: false,
        count: 0,
        data: [],
        error: error.message
      };
    }
  }

  // Get analytics summary for a specific date
  static async getAnalyticsSummary(league: string, date: string): Promise<ApiResponse<any>> {
    try {
      const [props, games] = await Promise.all([
        getPropMatchups(league, date, undefined, 10), // Top 10 props
        getGameMatchups(league, date, undefined)
      ]);

      const summary = {
        date,
        league,
        topProps: props.slice(0, 5),
        gameCount: games.length,
        avgGameGrade: games.length > 0 
          ? games.reduce((sum, game) => sum + game.game_prop_grade, 0) / games.length 
          : 0,
        bestProp: props.length > 0 ? props[0] : null,
        bestGame: games.length > 0 ? games[0] : null
      };

      return {
        ok: true,
        count: 1,
        data: summary
      };
    } catch (error: any) {
      console.error("Analytics summary error:", error);
      return {
        ok: false,
        count: 0,
        data: null,
        error: error.message
      };
    }
  }
}

// Convenience functions for direct usage
export const analyticsApi = {
  getProps: AnalyticsApiService.getProps,
  getGames: AnalyticsApiService.getGames,
  getPlayerPropsWithLogs: AnalyticsApiService.getPlayerPropsWithLogs,
  refreshAnalytics: AnalyticsApiService.refreshAnalytics,
  getLeagueStatus: AnalyticsApiService.getLeagueStatus,
  getAnalyticsSummary: AnalyticsApiService.getAnalyticsSummary
};
