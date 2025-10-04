// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

export interface APIUsageLog {
  id: string;
  user_id: string;
  endpoint: string;
  method: string;
  sport: string | null;
  response_status: number;
  response_time_ms: number;
  cache_hit: boolean;
  api_key_used: string | null;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface APIUsageSummary {
  user_id: string;
  current_month_start: string;
  total_requests: number;
  total_response_time_ms: number;
  cache_hits: number;
  cache_misses: number;
  requests_by_endpoint: Record<string, number>;
  requests_by_sport: Record<string, number>;
  estimated_cost_usd: number;
  updated_at: string;
}

export interface APIPlanConfig {
  id: string;
  plan_name: string;
  monthly_request_limit: number;
  cost_per_request_usd: number;
  cache_hit_discount_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface APIUsageStats {
  user_id: string;
  total_requests: number;
  total_response_time_ms: number;
  avg_response_time_ms: number;
  cache_hit_rate: number;
  requests_by_endpoint: Record<string, number>;
  requests_by_sport: Record<string, number>;
  total_cost_usd: number;
  error_rate: number;
}

export interface APIUsageVsPlan {
  user_id: string;
  plan_name: string;
  current_month_start: string;
  total_requests: number;
  request_limit: number;
  usage_percent: number;
  cache_hit_rate: number;
  estimated_cost_usd: number;
  projected_monthly_cost: number;
  days_remaining: number;
  recommendations: string[];
}

class APIUsageService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  }

  // Log API usage
  async logUsage(
    endpoint: string,
    method: string = 'GET',
    sport: string | null = null,
    responseStatus: number,
    responseTimeMs: number,
    cacheHit: boolean = false,
    apiKeyUsed: string | null = null,
    userAgent: string | null = null,
    ipAddress: string | null = null
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.rpc('log_sportsgameodds_api_usage', {
        p_user_id: user?.id || null,
        p_endpoint: endpoint,
        p_method: method,
        p_sport: sport,
        p_response_status: responseStatus,
        p_response_time_ms: responseTimeMs,
        p_cache_hit: cacheHit,
        p_api_key_used: apiKeyUsed,
        p_user_agent: userAgent,
        p_ip_address: ipAddress
      });

      if (error) {
        console.error('Failed to log API usage:', error);
      }
    } catch (error) {
      console.error('Error logging API usage:', error);
    }
  }

  // Get API usage statistics
  async getUsageStats(
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<APIUsageStats[]> {
    try {
      const { data, error } = await supabase.rpc('get_sportsgameodds_api_usage_stats', {
        p_user_id: userId || null,
        p_start_date: startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: endDate?.toISOString() || new Date().toISOString()
      });

      if (error) {
        console.error('Failed to fetch API usage stats:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching API usage stats:', error);
      throw error;
    }
  }

  // Get API usage vs plan
  async getUsageVsPlan(userId?: string): Promise<APIUsageVsPlan[]> {
    try {
      const { data, error } = await supabase.rpc('get_sportsgameodds_api_usage_vs_plan', {
        p_user_id: userId || null
      });

      if (error) {
        console.error('Failed to fetch API usage vs plan:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching API usage vs plan:', error);
      throw error;
    }
  }

  // Get plan configurations
  async getPlanConfigs(): Promise<APIPlanConfig[]> {
    try {
      const { data, error } = await supabase
        .from('api_plan_config')
        .select('*')
        .eq('is_active', true)
        .order('monthly_request_limit', { ascending: true });

      if (error) {
        console.error('Failed to fetch plan configs:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching plan configs:', error);
      throw error;
    }
  }

  // Get current usage for a user
  async getCurrentUsage(userId?: string): Promise<APIUsageSummary[]> {
    try {
      const { data, error } = await supabase
        .from('api_current_usage')
        .select('*')
        .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
        .eq('current_month_start', new Date().toISOString().substring(0, 7) + '-01')
        .single();

      if (error) {
        console.error('Failed to fetch current usage:', error);
        throw error;
      }

      return data ? [data] : [];
    } catch (error) {
      console.error('Error fetching current usage:', error);
      throw error;
    }
  }

  // Get usage logs with pagination
  async getUsageLogs(
    userId?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<APIUsageLog[]> {
    try {
      let query = supabase
        .from('api_usage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch usage logs:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching usage logs:', error);
      throw error;
    }
  }

  // Get usage analytics for admin dashboard
  async getUsageAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalRequests: number;
    uniqueUsers: number;
    avgResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
    totalCost: number;
    requestsByEndpoint: Record<string, number>;
    requestsBySport: Record<string, number>;
    topUsers: Array<{
      user_id: string;
      email?: string;
      request_count: number;
    }>;
  }> {
    try {
      const stats = await this.getUsageStats(
        undefined,
        startDate,
        endDate
      );

      if (stats.length === 0) {
        return {
          totalRequests: 0,
          uniqueUsers: 0,
          avgResponseTime: 0,
          cacheHitRate: 0,
          errorRate: 0,
          totalCost: 0,
          requestsByEndpoint: {},
          requestsBySport: {},
          topUsers: []
        };
      }

      const totalStats = stats.reduce((acc, stat) => ({
        totalRequests: acc.totalRequests + stat.total_requests,
        totalResponseTime: acc.totalResponseTime + stat.total_response_time_ms,
        totalCost: acc.totalCost + stat.total_cost_usd,
        totalErrors: acc.totalErrors + (stat.total_requests * stat.error_rate / 100),
        totalCacheHits: acc.totalCacheHits + (stat.total_requests * stat.cache_hit_rate / 100),
        requestsByEndpoint: { ...acc.requestsByEndpoint, ...stat.requests_by_endpoint },
        requestsBySport: { ...acc.requestsBySport, ...stat.requests_by_sport },
        users: [...acc.users, { user_id: stat.user_id, request_count: stat.total_requests }]
      }), {
        totalRequests: 0,
        totalResponseTime: 0,
        totalCost: 0,
        totalErrors: 0,
        totalCacheHits: 0,
        requestsByEndpoint: {} as Record<string, number>,
        requestsBySport: {} as Record<string, number>,
        users: [] as Array<{ user_id: string; request_count: number }>
      });

      // Get user emails for top users
      const topUsers = totalStats.users
        .sort((a, b) => b.request_count - a.request_count)
        .slice(0, 10);

      const userIds = topUsers.map(u => u.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);

      const topUsersWithEmails = topUsers.map(user => ({
        ...user,
        email: profiles?.find(p => p.user_id === user.user_id)?.email
      }));

      return {
        totalRequests: totalStats.totalRequests,
        uniqueUsers: stats.length,
        avgResponseTime: totalStats.totalRequests > 0 ? totalStats.totalResponseTime / totalStats.totalRequests : 0,
        cacheHitRate: totalStats.totalRequests > 0 ? (totalStats.totalCacheHits / totalStats.totalRequests) * 100 : 0,
        errorRate: totalStats.totalRequests > 0 ? (totalStats.totalErrors / totalStats.totalRequests) * 100 : 0,
        totalCost: totalStats.totalCost,
        requestsByEndpoint: totalStats.requestsByEndpoint,
        requestsBySport: totalStats.requestsBySport,
        topUsers: topUsersWithEmails
      };
    } catch (error) {
      console.error('Error fetching usage analytics:', error);
      throw error;
    }
  }

  // Get plan recommendations based on usage
  async getPlanRecommendations(userId?: string): Promise<{
    currentPlan: string;
    recommendedPlan: string;
    reason: string;
    costSavings?: number;
    additionalRequests?: number;
  }> {
    try {
      const usageVsPlan = await this.getUsageVsPlan(userId);
      const planConfigs = await this.getPlanConfigs();

      if (usageVsPlan.length === 0 || planConfigs.length === 0) {
        return {
          currentPlan: 'Unknown',
          recommendedPlan: 'Free Tier',
          reason: 'No usage data available'
        };
      }

      const currentUsage = usageVsPlan[0];
      const currentPlan = planConfigs.find(p => p.plan_name === currentUsage.plan_name);
      
      if (!currentPlan) {
        return {
          currentPlan: currentUsage.plan_name,
          recommendedPlan: 'Free Tier',
          reason: 'Current plan not found'
        };
      }

      // Calculate projected monthly usage
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const daysPassed = new Date().getDate();
      const projectedMonthlyRequests = Math.round(
        (currentUsage.total_requests / daysPassed) * daysInMonth
      );

      // Find appropriate plan
      let recommendedPlan = currentPlan;
      let reason = 'Current plan is appropriate';

      if (projectedMonthlyRequests > currentPlan.monthly_request_limit * 0.9) {
        // Need to upgrade
        const nextPlan = planConfigs.find(p => p.monthly_request_limit > currentPlan.monthly_request_limit);
        if (nextPlan) {
          recommendedPlan = nextPlan;
          reason = `Projected usage (${projectedMonthlyRequests.toLocaleString()} requests) exceeds current plan limit`;
          
          const currentCost = projectedMonthlyRequests * currentPlan.cost_per_request_usd;
          const recommendedCost = projectedMonthlyRequests * nextPlan.cost_per_request_usd;
          const costSavings = currentCost - recommendedCost;
          
          return {
            currentPlan: currentPlan.plan_name,
            recommendedPlan: nextPlan.plan_name,
            reason,
            costSavings: costSavings > 0 ? costSavings : undefined,
            additionalRequests: nextPlan.monthly_request_limit - currentPlan.monthly_request_limit
          };
        }
      } else if (projectedMonthlyRequests < currentPlan.monthly_request_limit * 0.3) {
        // Could downgrade
        const prevPlan = planConfigs
          .filter(p => p.monthly_request_limit < currentPlan.monthly_request_limit)
          .sort((a, b) => b.monthly_request_limit - a.monthly_request_limit)[0];
        
        if (prevPlan && projectedMonthlyRequests <= prevPlan.monthly_request_limit) {
          recommendedPlan = prevPlan;
          reason = `Usage is low (${projectedMonthlyRequests.toLocaleString()} requests) - could save money with smaller plan`;
          
          const currentCost = projectedMonthlyRequests * currentPlan.cost_per_request_usd;
          const recommendedCost = projectedMonthlyRequests * prevPlan.cost_per_request_usd;
          const costSavings = currentCost - recommendedCost;
          
          return {
            currentPlan: currentPlan.plan_name,
            recommendedPlan: prevPlan.plan_name,
            reason,
            costSavings: costSavings > 0 ? costSavings : undefined,
            additionalRequests: prevPlan.monthly_request_limit - currentPlan.monthly_request_limit
          };
        }
      }

      return {
        currentPlan: currentPlan.plan_name,
        recommendedPlan: currentPlan.plan_name,
        reason
      };
    } catch (error) {
      console.error('Error getting plan recommendations:', error);
      throw error;
    }
  }
}

export const apiUsageService = new APIUsageService();
