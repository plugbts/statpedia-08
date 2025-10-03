/**
 * Cloudflare R2 Usage Monitoring Service
 * 
 * This service tracks R2 storage usage, costs, and provides analytics
 * for monitoring Cloudflare R2 plan limits and usage patterns.
 */

import { supabase } from '@/integrations/supabase/client';

export interface R2UsageLog {
  id: string;
  bucket_name: string;
  operation_type: 'GET' | 'PUT' | 'DELETE' | 'HEAD' | 'LIST';
  bytes_transferred: number;
  request_count: number;
  cost_usd: number;
  region?: string;
  user_agent?: string;
  ip_address?: string;
  created_at: string;
}

export interface R2UsageSummary {
  id: string;
  bucket_name: string;
  usage_date: string;
  total_requests: number;
  total_bytes_transferred: number;
  total_cost_usd: number;
  get_requests: number;
  put_requests: number;
  delete_requests: number;
  head_requests: number;
  list_requests: number;
  created_at: string;
  updated_at: string;
}

export interface R2PlanConfig {
  id: string;
  plan_name: string;
  base_storage_gb: number;
  base_class_a_operations: number;
  base_class_b_operations: number;
  base_egress_gb: number;
  storage_price_per_gb: number;
  class_a_price_per_million: number;
  class_b_price_per_million: number;
  egress_price_per_gb: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface R2CurrentUsage {
  id: string;
  bucket_name: string;
  current_month_start: string;
  storage_bytes: number;
  class_a_operations: number;
  class_b_operations: number;
  egress_bytes: number;
  estimated_cost_usd: number;
  last_updated: string;
  created_at: string;
}

export interface R2UsageStats {
  bucket_name: string;
  total_requests: number;
  total_bytes_transferred: number;
  total_cost_usd: number;
  get_requests: number;
  put_requests: number;
  delete_requests: number;
  head_requests: number;
  list_requests: number;
  avg_response_size: number;
  requests_by_day: Record<string, number>;
}

export interface R2UsageVsPlan {
  bucket_name: string;
  plan_name: string;
  current_month_start: string;
  storage_gb: number;
  storage_limit_gb: number;
  storage_usage_percent: number;
  class_a_operations: number;  // INTEGER in database
  class_a_limit: number;       // INTEGER in database
  class_a_usage_percent: number;
  class_b_operations: number;  // INTEGER in database
  class_b_limit: number;       // INTEGER in database
  class_b_usage_percent: number;
  egress_gb: number;
  egress_limit_gb: number;
  egress_usage_percent: number;
  estimated_cost_usd: number;
  days_remaining: number;
}

class CloudflareR2UsageService {
  private readonly bucketName: string;

  constructor(bucketName: string = 'statpedia-player-props-cache') {
    this.bucketName = bucketName;
  }

  /**
   * Log R2 usage for monitoring and cost tracking
   */
  async logUsage(
    operationType: 'GET' | 'PUT' | 'DELETE' | 'HEAD' | 'LIST',
    bytesTransferred: number = 0,
    requestCount: number = 1,
    costUsd: number = 0,
    region?: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('log_r2_usage', {
        p_bucket_name: this.bucketName,
        p_operation_type: operationType,
        p_bytes_transferred: bytesTransferred,
        p_request_count: requestCount,
        p_cost_usd: costUsd,
        p_region: region,
        p_user_agent: userAgent,
        p_ip_address: ipAddress
      });

      if (error) {
        console.error('Failed to log R2 usage:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('R2 usage logging error:', error);
      throw error;
    }
  }

  /**
   * Get R2 usage statistics for a specific time period
   */
  async getUsageStats(
    bucketName?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<R2UsageStats[]> {
    try {
      const { data, error } = await supabase.rpc('get_r2_usage_stats', {
        p_bucket_name: bucketName || null,
        p_start_date: startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: endDate?.toISOString() || new Date().toISOString()
      });

      if (error) {
        console.error('Failed to get R2 usage stats:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('R2 usage stats error:', error);
      throw error;
    }
  }

  /**
   * Get current month usage vs plan limits
   */
  async getUsageVsPlan(bucketName?: string): Promise<R2UsageVsPlan[]> {
    try {
      const { data, error } = await supabase.rpc('get_r2_usage_vs_plan', {
        p_bucket_name: bucketName || null
      });

      if (error) {
        console.error('Failed to get R2 usage vs plan:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('R2 usage vs plan error:', error);
      throw error;
    }
  }

  /**
   * Get R2 plan configuration
   */
  async getPlanConfig(): Promise<R2PlanConfig[]> {
    try {
      const { data, error } = await supabase
        .from('r2_plan_config')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to get R2 plan config:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('R2 plan config error:', error);
      throw error;
    }
  }

  /**
   * Get current usage for all buckets
   */
  async getCurrentUsage(): Promise<R2CurrentUsage[]> {
    try {
      const { data, error } = await supabase
        .from('r2_current_usage')
        .select('*')
        .order('last_updated', { ascending: false });

      if (error) {
        console.error('Failed to get R2 current usage:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('R2 current usage error:', error);
      throw error;
    }
  }

  /**
   * Get usage summary for a specific date range
   */
  async getUsageSummary(
    startDate?: Date,
    endDate?: Date
  ): Promise<R2UsageSummary[]> {
    try {
      let query = supabase
        .from('r2_usage_summary')
        .select('*')
        .order('usage_date', { ascending: false });

      if (startDate) {
        query = query.gte('usage_date', startDate.toISOString().split('T')[0]);
      }

      if (endDate) {
        query = query.lte('usage_date', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get R2 usage summary:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('R2 usage summary error:', error);
      throw error;
    }
  }

  /**
   * Calculate estimated cost for R2 operations
   */
  calculateCost(
    operationType: 'GET' | 'PUT' | 'DELETE' | 'HEAD' | 'LIST',
    bytesTransferred: number,
    requestCount: number,
    planConfig: R2PlanConfig
  ): number {
    let cost = 0;

    // Storage cost (for PUT operations)
    if (operationType === 'PUT') {
      const storageGB = bytesTransferred / (1024 * 1024 * 1024);
      cost += storageGB * planConfig.storage_price_per_gb;
    }

    // Class A operations (PUT, DELETE)
    if (operationType === 'PUT' || operationType === 'DELETE') {
      const operationsInMillions = requestCount / 1000000;
      cost += operationsInMillions * planConfig.class_a_price_per_million;
    }

    // Class B operations (GET, HEAD, LIST)
    if (operationType === 'GET' || operationType === 'HEAD' || operationType === 'LIST') {
      const operationsInMillions = requestCount / 1000000;
      cost += operationsInMillions * planConfig.class_b_price_per_million;
    }

    // Egress cost (for GET operations)
    if (operationType === 'GET') {
      const egressGB = bytesTransferred / (1024 * 1024 * 1024);
      cost += egressGB * planConfig.egress_price_per_gb;
    }

    return cost;
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format cost to currency
   */
  formatCost(cost: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(cost);
  }

  /**
   * Get usage percentage with color coding
   */
  getUsagePercentageColor(percentage: number): string {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-orange-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-green-600';
  }

  /**
   * Get usage status based on percentage
   */
  getUsageStatus(percentage: number): { status: string; color: string; icon: string } {
    if (percentage >= 90) {
      return { status: 'Critical', color: 'text-red-600', icon: '🔴' };
    }
    if (percentage >= 75) {
      return { status: 'High', color: 'text-orange-600', icon: '🟠' };
    }
    if (percentage >= 50) {
      return { status: 'Moderate', color: 'text-yellow-600', icon: '🟡' };
    }
    return { status: 'Low', color: 'text-green-600', icon: '🟢' };
  }

  /**
   * Estimate remaining days until limit reached
   */
  estimateDaysUntilLimit(
    currentUsage: number,
    limit: number,
    dailyAverageUsage: number
  ): number {
    if (dailyAverageUsage <= 0) return Infinity;
    
    const remainingUsage = limit - currentUsage;
    return Math.ceil(remainingUsage / dailyAverageUsage);
  }

  /**
   * Get Cloudflare R2 API usage from Cloudflare Workers
   * This would typically be called from a Cloudflare Worker
   * that has access to R2 analytics
   */
  async fetchCloudflareR2Analytics(): Promise<any> {
    try {
      // This would be implemented to call Cloudflare's Analytics API
      // For now, we'll return mock data structure
      console.log('Fetching Cloudflare R2 analytics...');
      
      // In a real implementation, this would call:
      // https://api.cloudflare.com/client/v4/accounts/{account_id}/analytics/dashboard
      
      return {
        requests: 0,
        bytes_transferred: 0,
        cost_usd: 0,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to fetch Cloudflare R2 analytics:', error);
      throw error;
    }
  }

  /**
   * Sync usage data from Cloudflare Analytics
   * This should be called periodically to keep data up to date
   */
  async syncUsageFromCloudflare(): Promise<void> {
    try {
      const analytics = await this.fetchCloudflareR2Analytics();
      
      // Log the synced data
      await this.logUsage(
        'GET', // Assuming most operations are GET requests
        analytics.bytes_transferred,
        analytics.requests,
        analytics.cost_usd
      );

      console.log('Successfully synced R2 usage from Cloudflare');
    } catch (error) {
      console.error('Failed to sync R2 usage from Cloudflare:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const cloudflareR2UsageService = new CloudflareR2UsageService();

// Export types for use in components
export type {
  R2UsageLog,
  R2UsageSummary,
  R2PlanConfig,
  R2CurrentUsage,
  R2UsageStats,
  R2UsageVsPlan
};
