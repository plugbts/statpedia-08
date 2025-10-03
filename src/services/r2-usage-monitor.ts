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
      // Fetch real R2 usage data from Supabase functions
      const { data, error } = await supabase.functions.invoke('get-r2-usage-stats');
      
      if (error) {
        console.error('Error fetching R2 usage stats:', error);
        throw new Error(`Failed to fetch R2 usage statistics: ${error.message}`);
      }

      if (!data) {
        throw new Error('No R2 usage data available');
      }

      this.setCachedData(cacheKey, data);
      return data;
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
      // Fetch real R2 plan configuration from database
      const { data, error } = await supabase
        .from('r2_plan_config')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching R2 plan config:', error);
        throw new Error(`Failed to fetch R2 plan configuration: ${error.message}`);
      }

      if (!data) {
        throw new Error('No R2 plan configuration available');
      }

      this.setCachedData(cacheKey, data);
      return data;
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
      // Fetch real R2 usage history from database
      const { data, error } = await supabase
        .from('r2_usage_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching R2 usage history:', error);
        throw new Error(`Failed to fetch R2 usage history: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching R2 usage history:', error);
      throw new Error('Failed to fetch R2 usage history');
    }
  }

  async syncFromCloudflare(): Promise<boolean> {
    try {
      // Sync real data from Cloudflare R2 API via Supabase function
      const { data, error } = await supabase.functions.invoke('sync-r2-usage-from-cloudflare');
      
      if (error) {
        console.error('Error syncing from Cloudflare:', error);
        return false;
      }

      // Clear cache to force refresh with new data
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
