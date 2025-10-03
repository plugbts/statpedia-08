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
      // For now, return mock data that simulates realistic API usage
      // In production, this would connect to actual API logs
      const mockData: APIUsageStats = {
        current_month: {
          total_requests: 15420,
          total_response_time_ms: 1250000,
          cache_hits: 12300,
          cache_misses: 3120,
          requests_by_endpoint: {
            'player-props': 8500,
            'events': 4200,
            'odds': 2720
          },
          requests_by_sport: {
            'nfl': 6200,
            'nba': 4800,
            'mlb': 3200,
            'nhl': 1220
          },
          estimated_cost_usd: 1.54,
          last_updated: new Date().toISOString()
        },
        previous_month: {
          total_requests: 12850,
          total_response_time_ms: 980000,
          cache_hits: 10200,
          cache_misses: 2650,
          requests_by_endpoint: {
            'player-props': 7200,
            'events': 3500,
            'odds': 2150
          },
          requests_by_sport: {
            'nfl': 5200,
            'nba': 3800,
            'mlb': 2500,
            'nhl': 1350
          },
          estimated_cost_usd: 1.29,
          last_updated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        daily_average: {
          total_requests: 514,
          total_response_time_ms: 41667,
          cache_hits: 410,
          cache_misses: 104,
          requests_by_endpoint: {
            'player-props': 283,
            'events': 140,
            'odds': 91
          },
          requests_by_sport: {
            'nfl': 207,
            'nba': 160,
            'mlb': 107,
            'nhl': 41
          },
          estimated_cost_usd: 0.051,
          last_updated: new Date().toISOString()
        },
        projected_monthly: {
          total_requests: 18500,
          total_response_time_ms: 1500000,
          cache_hits: 14800,
          cache_misses: 3700,
          requests_by_endpoint: {
            'player-props': 10200,
            'events': 5040,
            'odds': 3260
          },
          requests_by_sport: {
            'nfl': 7440,
            'nba': 5760,
            'mlb': 3840,
            'nhl': 1460
          },
          estimated_cost_usd: 1.85,
          last_updated: new Date().toISOString()
        }
      };

      this.setCachedData(cacheKey, mockData);
      return mockData;
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
      // Mock plan configuration
      const mockConfig: APIPlanConfig = {
        plan_name: 'Pro Plan',
        request_limit: 50000,
        cost_per_request: 0.0001,
        cache_hit_bonus: 0.5,
        response_time_limit_ms: 2000
      };

      this.setCachedData(cacheKey, mockConfig);
      return mockConfig;
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
      // Mock analytics data
      const mockAnalytics: APIAnalytics = {
        top_endpoints: [
          { endpoint: 'player-props', requests: 8500, avg_response_time: 85 },
          { endpoint: 'events', requests: 4200, avg_response_time: 120 },
          { endpoint: 'odds', requests: 2720, avg_response_time: 95 }
        ],
        top_sports: [
          { sport: 'NFL', requests: 6200, percentage: 40.2 },
          { sport: 'NBA', requests: 4800, percentage: 31.1 },
          { sport: 'MLB', requests: 3200, percentage: 20.8 },
          { sport: 'NHL', requests: 1220, percentage: 7.9 }
        ],
        top_users: [
          { user_id: 'user-1', email: 'admin@statpedia.com', requests: 8500, percentage: 55.1 },
          { user_id: 'user-2', email: 'user2@example.com', requests: 3200, percentage: 20.8 },
          { user_id: 'user-3', email: 'user3@example.com', requests: 2200, percentage: 14.3 },
          { user_id: 'user-4', email: 'user4@example.com', requests: 1520, percentage: 9.8 }
        ],
        response_time_distribution: [
          { range: '0-100ms', count: 8500, percentage: 55.1 },
          { range: '100-500ms', count: 4200, percentage: 27.2 },
          { range: '500-1000ms', count: 1800, percentage: 11.7 },
          { range: '1000-2000ms', count: 720, percentage: 4.7 },
          { range: '2000ms+', count: 200, percentage: 1.3 }
        ]
      };

      this.setCachedData(cacheKey, mockAnalytics);
      return mockAnalytics;
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
      // Generate mock historical data
      const history = [];
      const baseRequests = 500;
      const baseResponseTime = 40000;
      const baseCacheHits = 400;
      const baseCacheMisses = 100;

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const variation = 0.7 + Math.random() * 0.6; // 70-130% variation
        
        const requests = Math.floor(baseRequests * variation);
        const cacheHits = Math.floor(baseCacheHits * variation);
        const cacheMisses = Math.floor(baseCacheMisses * variation);
        const responseTime = Math.floor(baseResponseTime * variation);
        const cost = requests * 0.0001;

        history.push({
          date: date.toISOString().split('T')[0],
          requests,
          response_time_ms: responseTime,
          cache_hits: cacheHits,
          cache_misses: cacheMisses,
          cost_usd: Number(cost.toFixed(4))
        });
      }

      this.setCachedData(cacheKey, history);
      return history;
    } catch (error) {
      console.error('Error fetching API usage history:', error);
      throw new Error('Failed to fetch API usage history');
    }
  }

  async logUsage(endpoint: string, sport: string, responseTime: number, cacheHit: boolean): Promise<boolean> {
    try {
      // In production, this would log to the database
      // For now, just clear cache to force refresh
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
