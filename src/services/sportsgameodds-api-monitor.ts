import { supabase } from '@/integrations/supabase/client';

export interface APIUsageData {
  total_requests: number;
  total_response_time_ms: number;
  cache_hits: number;
  cache_misses: number;
  requests_by_endpoint: Record<string, number>;
  requests_by_sport: Record<string, number>;
  estimated_cost_usd: number;
  last_updated: string;
}

export interface APIUsageStats {
  current_month: APIUsageData;
  previous_month: APIUsageData;
  daily_average: APIUsageData;
  projected_monthly: APIUsageData;
}

export interface APIPlanConfig {
  plan_name: string;
  request_limit: number;
  cost_per_request: number;
  cache_hit_bonus: number;
  response_time_limit_ms: number;
}

export interface APIAnalytics {
  top_endpoints: Array<{ endpoint: string; requests: number; avg_response_time: number }>;
  top_sports: Array<{ sport: string; requests: number; percentage: number }>;
  top_users: Array<{ user_id: string; email: string; requests: number; percentage: number }>;
  response_time_distribution: Array<{ range: string; count: number; percentage: number }>;
}

class SportsGameOddsAPIMonitor {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getUsageStats(): Promise<APIUsageStats> {
    const cacheKey = 'sportsgameodds_api_usage_stats';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Fetch real API usage data from Supabase functions
      const { data, error } = await supabase.functions.invoke('get-sportsgameodds-api-usage-stats');
      
      if (error) {
        console.error('Error fetching API usage stats:', error);
        throw new Error(`Failed to fetch API usage statistics: ${error.message}`);
      }

      if (!data) {
        throw new Error('No API usage data available');
      }

      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching API usage stats:', error);
      throw new Error('Failed to fetch API usage statistics');
    }
  }

  async getPlanConfig(): Promise<APIPlanConfig> {
    const cacheKey = 'sportsgameodds_api_plan_config';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Fetch real API plan configuration from database
      const { data, error } = await supabase
        .from('api_plan_config')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching API plan config:', error);
        throw new Error(`Failed to fetch API plan configuration: ${error.message}`);
      }

      if (!data) {
        throw new Error('No API plan configuration available');
      }

      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching API plan config:', error);
      throw new Error('Failed to fetch API plan configuration');
    }
  }

  async getAnalytics(): Promise<APIAnalytics> {
    const cacheKey = 'sportsgameodds_api_analytics';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Fetch real API analytics from Supabase functions
      const { data, error } = await supabase.functions.invoke('get-sportsgameodds-api-analytics');
      
      if (error) {
        console.error('Error fetching API analytics:', error);
        throw new Error(`Failed to fetch API analytics: ${error.message}`);
      }

      if (!data) {
        throw new Error('No API analytics data available');
      }

      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching API analytics:', error);
      throw new Error('Failed to fetch API analytics');
    }
  }

  async getUsageHistory(days: number = 30): Promise<Array<{ date: string; requests: number; response_time_ms: number; cache_hits: number; cache_misses: number; cost_usd: number }>> {
    const cacheKey = `sportsgameodds_api_usage_history_${days}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Fetch real API usage history from database
      const { data, error } = await supabase
        .from('api_usage_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching API usage history:', error);
        throw new Error(`Failed to fetch API usage history: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching API usage history:', error);
      throw new Error('Failed to fetch API usage history');
    }
  }

  async logUsage(endpoint: string, sport: string, responseTime: number, cacheHit: boolean): Promise<boolean> {
    try {
      // Log real API usage to database via Supabase function
      const { data, error } = await supabase.functions.invoke('log-sportsgameodds-api-usage', {
        body: {
          endpoint,
          sport,
          response_time_ms: responseTime,
          cache_hit: cacheHit
        }
      });

      if (error) {
        console.error('Error logging API usage:', error);
        return false;
      }

      // Clear cache to force refresh with new data
      this.cache.clear();
      return true;
    } catch (error) {
      console.error('Error logging API usage:', error);
      return false;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const sportsGameOddsAPIMonitor = new SportsGameOddsAPIMonitor();
