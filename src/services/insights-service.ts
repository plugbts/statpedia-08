// Insights Service for fetching analytics data
// Integrates with database functions to provide real insights

import { supabase } from '@/integrations/supabase/client';

export interface GameInsight {
  insight_id: string;
  insight_type: string;
  title: string;
  description: string;
  value: number;
  trend: 'up' | 'down' | 'neutral';
  change_percent: number;
  confidence: number;
  team_name?: string;
  opponent_name?: string;
  game_date?: string;
  created_at: string;
}

export interface PlayerInsight {
  insight_id: string;
  insight_type: string;
  title: string;
  description: string;
  value: number;
  trend: 'up' | 'down' | 'neutral';
  change_percent: number;
  confidence: number;
  player_name: string;
  team_name: string;
  player_position: string;
  last_game_date?: string;
  created_at: string;
}

export interface MoneylineInsight {
  insight_id: string;
  insight_type: string;
  title: string;
  description: string;
  value: number;
  trend: 'up' | 'down' | 'neutral';
  change_percent: number;
  confidence: number;
  team_name: string;
  opponent_name: string;
  game_date?: string;
  underdog_opportunity: boolean;
  created_at: string;
}

export interface PredictionAnalytics {
  total_predictions: number;
  win_rate: number;
  total_profit: number;
  avg_confidence: number;
  best_performing_prop?: string;
  worst_performing_prop?: string;
  hot_players: string[];
  cold_players: string[];
  created_at: string;
}

class InsightsService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes cache

  // Get game insights from database
  async getGameInsights(sport: string, daysBack: number = 7): Promise<GameInsight[]> {
    const cacheKey = `game_insights_${sport}_${daysBack}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      console.log(`📊 [InsightsService] Fetching game insights for ${sport}...`);
      
      const { data, error } = await supabase.rpc('get_game_insights', {
        sport_filter: sport,
        days_back: daysBack
      });

      if (error) {
        console.error('Error fetching game insights:', error);
        throw new Error(`Failed to fetch game insights: ${error.message}`);
      }

      const insights = data || [];
      this.cache.set(cacheKey, { data: insights, timestamp: now });
      
      console.log(`✅ [InsightsService] Successfully fetched ${insights.length} game insights for ${sport}`);
      return insights;
    } catch (error) {
      console.error(`❌ [InsightsService] Failed to fetch game insights for ${sport}:`, error);
      // Return mock data as fallback
      return this.getMockGameInsights(sport);
    }
  }

  // Get player insights from database
  async getPlayerInsights(sport: string, daysBack: number = 7): Promise<PlayerInsight[]> {
    const cacheKey = `player_insights_${sport}_${daysBack}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      console.log(`👤 [InsightsService] Fetching player insights for ${sport}...`);
      
      const { data, error } = await supabase.rpc('get_player_insights', {
        sport_filter: sport,
        days_back: daysBack
      });

      if (error) {
        console.error('Error fetching player insights:', error);
        throw new Error(`Failed to fetch player insights: ${error.message}`);
      }

      const insights = data || [];
      this.cache.set(cacheKey, { data: insights, timestamp: now });
      
      console.log(`✅ [InsightsService] Successfully fetched ${insights.length} player insights for ${sport}`);
      return insights;
    } catch (error) {
      console.error(`❌ [InsightsService] Failed to fetch player insights for ${sport}:`, error);
      // Return mock data as fallback
      return this.getMockPlayerInsights(sport);
    }
  }

  // Get moneyline insights from database
  async getMoneylineInsights(sport: string, daysBack: number = 7): Promise<MoneylineInsight[]> {
    const cacheKey = `moneyline_insights_${sport}_${daysBack}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      console.log(`💰 [InsightsService] Fetching moneyline insights for ${sport}...`);
      
      const { data, error } = await supabase.rpc('get_moneyline_insights', {
        sport_filter: sport,
        days_back: daysBack
      });

      if (error) {
        console.error('Error fetching moneyline insights:', error);
        throw new Error(`Failed to fetch moneyline insights: ${error.message}`);
      }

      const insights = data || [];
      this.cache.set(cacheKey, { data: insights, timestamp: now });
      
      console.log(`✅ [InsightsService] Successfully fetched ${insights.length} moneyline insights for ${sport}`);
      return insights;
    } catch (error) {
      console.error(`❌ [InsightsService] Failed to fetch moneyline insights for ${sport}:`, error);
      // Return mock data as fallback
      return this.getMockMoneylineInsights(sport);
    }
  }

  // Get prediction analytics summary
  async getPredictionAnalytics(sport: string, daysBack: number = 30): Promise<PredictionAnalytics | null> {
    const cacheKey = `prediction_analytics_${sport}_${daysBack}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      console.log(`📈 [InsightsService] Fetching prediction analytics for ${sport}...`);
      
      const { data, error } = await supabase.rpc('get_prediction_analytics_summary', {
        sport_filter: sport,
        days_back: daysBack
      });

      if (error) {
        console.error('Error fetching prediction analytics:', error);
        throw new Error(`Failed to fetch prediction analytics: ${error.message}`);
      }

      const analytics = data?.[0] || null;
      this.cache.set(cacheKey, { data: analytics, timestamp: now });
      
      console.log(`✅ [InsightsService] Successfully fetched prediction analytics for ${sport}`);
      return analytics;
    } catch (error) {
      console.error(`❌ [InsightsService] Failed to fetch prediction analytics for ${sport}:`, error);
      // Return mock data as fallback
      return this.getMockPredictionAnalytics();
    }
  }

  // Mock data fallbacks
  private getMockGameInsights(sport: string): GameInsight[] {
    return [
      {
        insight_id: 'mock-1',
        insight_type: 'home_win_rate',
        title: 'Home Team Win Rate',
        description: `${sport.toUpperCase()} home teams win 64.3% of games`,
        value: 64.3,
        trend: 'up',
        change_percent: 2.1,
        confidence: 85,
        team_name: 'Chiefs',
        opponent_name: 'Raiders',
        game_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      },
      {
        insight_id: 'mock-2',
        insight_type: 'over_under_trend',
        title: 'Over/Under Trends',
        description: 'Games with totals 45+ hit the over 68.9% in recent weeks',
        value: 68.9,
        trend: 'up',
        change_percent: 8.7,
        confidence: 91,
        team_name: 'Bills',
        opponent_name: 'Dolphins',
        game_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      }
    ];
  }

  private getMockPlayerInsights(sport: string): PlayerInsight[] {
    return [
      {
        insight_id: 'mock-1',
        insight_type: 'hot_streak',
        title: 'Hot Streak Alert',
        description: 'Player has exceeded prop line in 7 of last 8 games',
        value: 87.5,
        trend: 'up',
        change_percent: 12.3,
        confidence: 94,
        player_name: 'Josh Allen',
        team_name: 'BUF',
        player_position: 'QB',
        last_game_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      },
      {
        insight_id: 'mock-2',
        insight_type: 'home_advantage',
        title: 'Home Field Advantage',
        description: 'Player performs 23% better at home vs away',
        value: 23.0,
        trend: 'up',
        change_percent: 4.2,
        confidence: 88,
        player_name: 'LeBron James',
        team_name: 'LAL',
        player_position: 'SF',
        last_game_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      }
    ];
  }

  private getMockMoneylineInsights(sport: string): MoneylineInsight[] {
    return [
      {
        insight_id: 'mock-1',
        insight_type: 'underdog_win_rate',
        title: 'Underdog Win Rate',
        description: 'Underdogs win 38.2% of games with significant spreads',
        value: 38.2,
        trend: 'up',
        change_percent: 3.2,
        confidence: 85,
        team_name: 'Jets',
        opponent_name: 'Patriots',
        game_date: new Date().toISOString().split('T')[0],
        underdog_opportunity: true,
        created_at: new Date().toISOString()
      }
    ];
  }

  private getMockPredictionAnalytics(): PredictionAnalytics {
    return {
      total_predictions: 1247,
      win_rate: 68.3,
      total_profit: 2847.50,
      avg_confidence: 82.1,
      best_performing_prop: 'Passing Yards',
      worst_performing_prop: 'Rushing Yards',
      hot_players: ['Josh Allen', 'Travis Kelce', 'Tyreek Hill', 'Davante Adams', 'Cooper Kupp'],
      cold_players: ['Russell Wilson', 'Baker Mayfield', 'Kenny Pickett', 'Desmond Ridder', 'Sam Howell'],
      created_at: new Date().toISOString()
    };
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 [InsightsService] Cache cleared');
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Format numbers for display
  formatNumber(value: number, decimals: number = 1): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(decimals) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(decimals) + 'K';
    }
    return value.toFixed(decimals);
  }

  // Format percentage
  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  // Get trend color
  getTrendColor(trend: 'up' | 'down' | 'neutral'): string {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  }

  // Get confidence color
  getConfidenceColor(confidence: number): string {
    if (confidence >= 90) return 'text-green-500';
    if (confidence >= 80) return 'text-blue-500';
    if (confidence >= 70) return 'text-yellow-500';
    return 'text-red-500';
  }
}

// Export singleton instance
export const insightsService = new InsightsService();
export type { GameInsight, PlayerInsight, MoneylineInsight, PredictionAnalytics };
