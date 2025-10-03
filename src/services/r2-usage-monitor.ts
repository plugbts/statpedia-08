import { supabase } from '@/integrations/supabase/client';

export interface R2UsageData {
  storage_gb: number;
  operations_count: number;
  bandwidth_gb: number;
  cost_usd: number;
  last_updated: string;
}

export interface R2UsageStats {
  current_month: R2UsageData;
  previous_month: R2UsageData;
  daily_average: R2UsageData;
  projected_monthly: R2UsageData;
}

export interface R2PlanConfig {
  plan_name: string;
  storage_limit_gb: number;
  operations_limit: number;
  bandwidth_limit_gb: number;
  cost_per_gb_storage: number;
  cost_per_operation: number;
  cost_per_gb_bandwidth: number;
}

class R2UsageMonitor {
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

  async getUsageStats(): Promise<R2UsageStats> {
    const cacheKey = 'r2_usage_stats';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // For now, return mock data that simulates realistic R2 usage
      // In production, this would connect to Cloudflare R2 API
      const mockData: R2UsageStats = {
        current_month: {
          storage_gb: 12.5,
          operations_count: 15420,
          bandwidth_gb: 8.3,
          cost_usd: 0.85,
          last_updated: new Date().toISOString()
        },
        previous_month: {
          storage_gb: 11.2,
          operations_count: 12850,
          bandwidth_gb: 6.8,
          cost_usd: 0.72,
          last_updated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        daily_average: {
          storage_gb: 12.5,
          operations_count: 514,
          bandwidth_gb: 0.28,
          cost_usd: 0.028,
          last_updated: new Date().toISOString()
        },
        projected_monthly: {
          storage_gb: 15.2,
          operations_count: 18500,
          bandwidth_gb: 10.1,
          cost_usd: 1.12,
          last_updated: new Date().toISOString()
        }
      };

      this.setCachedData(cacheKey, mockData);
      return mockData;
    } catch (error) {
      console.error('Error fetching R2 usage stats:', error);
      throw new Error('Failed to fetch R2 usage statistics');
    }
  }

  async getPlanConfig(): Promise<R2PlanConfig> {
    const cacheKey = 'r2_plan_config';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Mock plan configuration
      const mockConfig: R2PlanConfig = {
        plan_name: 'Free Tier',
        storage_limit_gb: 10,
        operations_limit: 10000,
        bandwidth_limit_gb: 10,
        cost_per_gb_storage: 0.015,
        cost_per_operation: 0.000004,
        cost_per_gb_bandwidth: 0.09
      };

      this.setCachedData(cacheKey, mockConfig);
      return mockConfig;
    } catch (error) {
      console.error('Error fetching R2 plan config:', error);
      throw new Error('Failed to fetch R2 plan configuration');
    }
  }

  async getUsageHistory(days: number = 30): Promise<Array<{ date: string; storage_gb: number; operations_count: number; bandwidth_gb: number; cost_usd: number }>> {
    const cacheKey = `r2_usage_history_${days}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Generate mock historical data
      const history = [];
      const baseStorage = 10;
      const baseOperations = 300;
      const baseBandwidth = 0.2;

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const variation = 0.1 + Math.random() * 0.3; // 10-40% variation
        
        history.push({
          date: date.toISOString().split('T')[0],
          storage_gb: Number((baseStorage * variation).toFixed(2)),
          operations_count: Math.floor(baseOperations * variation),
          bandwidth_gb: Number((baseBandwidth * variation).toFixed(3)),
          cost_usd: Number((baseStorage * variation * 0.015 + baseOperations * variation * 0.000004 + baseBandwidth * variation * 0.09).toFixed(4))
        });
      }

      this.setCachedData(cacheKey, history);
      return history;
    } catch (error) {
      console.error('Error fetching R2 usage history:', error);
      throw new Error('Failed to fetch R2 usage history');
    }
  }

  async syncFromCloudflare(): Promise<boolean> {
    try {
      // In production, this would sync with Cloudflare R2 API
      // For now, just clear cache to force refresh
      this.cache.clear();
      return true;
    } catch (error) {
      console.error('Error syncing from Cloudflare:', error);
      return false;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const r2UsageMonitor = new R2UsageMonitor();
