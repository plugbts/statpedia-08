import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface APIAnalytics {
  totalRequests: number;
  uniqueUsers: number;
  cacheHitRate: number;
  avgResponseTime: number;
  requestsByEndpoint: Record<string, number>;
  requestsBySport: Record<string, number>;
  requestsByHour: Record<string, number>;
  topUsers: Array<{
    userId: string;
    email?: string;
    requestCount: number;
  }>;
  errorRate: number;
  rateLimitHits: number;
}

class APIAnalyticsService {
  async verifyAdminAccess(authHeader: string | null): Promise<boolean> {
    if (!authHeader?.startsWith('Bearer ')) {
      return false;
    }

    try {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return false;
      }

      // Check if user is admin or owner
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      return userRole?.role === 'admin' || userRole?.role === 'owner';
    } catch (e) {
      console.error('Admin verification failed:', e);
      return false;
    }
  }

  async getAnalytics(
    startDate: string = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    endDate: string = new Date().toISOString()
  ): Promise<APIAnalytics> {
    
    // Get basic stats directly from the table
    const { data: logs } = await supabase
      .from('api_usage_logs')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (!logs || logs.length === 0) {
      return {
        totalRequests: 0,
        uniqueUsers: 0,
        cacheHitRate: 0,
        avgResponseTime: 0,
        requestsByEndpoint: {},
        requestsBySport: {},
        requestsByHour: {},
        topUsers: [],
        errorRate: 0,
        rateLimitHits: 0
      };
    }

    // Calculate stats manually
    const totalRequests = logs.length;
    const uniqueUsers = new Set(logs.map(log => log.user_id).filter(Boolean)).size;
    const cacheHits = logs.filter(log => log.cache_hit).length;
    const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
    const avgResponseTime = logs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / totalRequests;
    const errorLogs = logs.filter(log => log.response_status >= 400);
    const errorRate = totalRequests > 0 ? (errorLogs.length / totalRequests) * 100 : 0;
    const rateLimitHits = logs.filter(log => log.response_status === 429).length;

    // Group by endpoint
    const requestsByEndpoint: Record<string, number> = {};
    logs.forEach(log => {
      if (log.endpoint) {
        requestsByEndpoint[log.endpoint] = (requestsByEndpoint[log.endpoint] || 0) + 1;
      }
    });

    // Group by sport
    const requestsBySport: Record<string, number> = {};
    logs.forEach(log => {
      if (log.sport) {
        requestsBySport[log.sport] = (requestsBySport[log.sport] || 0) + 1;
      }
    });

    // Group by hour
    const requestsByHour: Record<string, number> = {};
    logs.forEach(log => {
      const hour = new Date(log.created_at).getHours().toString().padStart(2, '0') + ':00';
      requestsByHour[hour] = (requestsByHour[hour] || 0) + 1;
    });

    const stats = {
      total_requests: totalRequests,
      unique_users: uniqueUsers,
      cache_hit_rate: Math.round(cacheHitRate * 100) / 100,
      avg_response_time: Math.round(avgResponseTime * 100) / 100,
      requests_by_endpoint: requestsByEndpoint,
      requests_by_sport: requestsBySport,
      requests_by_hour: requestsByHour
    };

    // Get top users
    const { data: topUsersData } = await supabase
      .from('api_usage_logs')
      .select(`
        user_id,
        profiles!inner(email)
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .not('user_id', 'is', null);

    // Process top users
    const userCounts = new Map<string, { userId: string; email?: string; count: number }>();
    
    if (topUsersData) {
      for (const log of topUsersData) {
        const userId = log.user_id;
        const email = (log.profiles as any)?.email;
        
        if (userId) {
          const existing = userCounts.get(userId);
          if (existing) {
            existing.count++;
          } else {
            userCounts.set(userId, { userId, email, count: 1 });
          }
        }
      }
    }

    const topUsers = Array.from(userCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(user => ({
        userId: user.userId,
        email: user.email,
        requestCount: user.count
      }));

    // Get error rate
    const { data: errorData } = await supabase
      .from('api_usage_logs')
      .select('response_status')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    let errorCount = 0;
    let totalRequests = 0;
    let rateLimitHits = 0;

    if (errorData) {
      totalRequests = errorData.length;
      for (const log of errorData) {
        if (log.response_status >= 400) {
          errorCount++;
        }
        if (log.response_status === 429) {
          rateLimitHits++;
        }
      }
    }

    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    return {
      totalRequests: stats.total_requests || totalRequests,
      uniqueUsers: stats.unique_users || 0,
      cacheHitRate: stats.cache_hit_rate || 0,
      avgResponseTime: stats.avg_response_time || 0,
      requestsByEndpoint: stats.requests_by_endpoint || {},
      requestsBySport: stats.requests_by_sport || {},
      requestsByHour: stats.requests_by_hour || {},
      topUsers,
      errorRate,
      rateLimitHits
    };
  }

  async getRealtimeStats(): Promise<any> {
    // Get stats for the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentLogs } = await supabase
      .from('api_usage_logs')
      .select('*')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
      .limit(100);

    // Get cache status
    const { data: cacheData } = await supabase
      .from('api_cache')
      .select('cache_key, expires_at, sport')
      .gt('expires_at', new Date().toISOString());

    // Get current rate limits
    const { data: rateLimits } = await supabase
      .from('api_rate_limits')
      .select('*')
      .gte('window_start', new Date(Date.now() - 60 * 1000).toISOString());

    return {
      recentActivity: recentLogs || [],
      activeCacheEntries: cacheData?.length || 0,
      cacheEntries: cacheData || [],
      activeRateLimits: rateLimits?.length || 0,
      rateLimitDetails: rateLimits || []
    };
  }

  async getSystemHealth(): Promise<any> {
    // Check if background polling is working
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: recentPolling } = await supabase
      .from('api_usage_logs')
      .select('*')
      .eq('endpoint', 'background-polling')
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    // Check cache freshness
    const { data: freshCache } = await supabase
      .from('api_cache')
      .select('cache_key, expires_at, updated_at')
      .gt('expires_at', new Date().toISOString());

    // Get API config
    const { data: config } = await supabase
      .from('api_config')
      .select('*');

    return {
      backgroundPollingActive: recentPolling && recentPolling.length > 0,
      lastPollingTime: recentPolling?.[0]?.created_at,
      freshCacheEntries: freshCache?.length || 0,
      totalConfigEntries: config?.length || 0,
      systemStatus: {
        polling: recentPolling && recentPolling.length > 0 ? 'healthy' : 'inactive',
        cache: (freshCache?.length || 0) > 0 ? 'healthy' : 'empty',
        config: (config?.length || 0) >= 6 ? 'healthy' : 'incomplete'
      }
    };
  }

  async cleanupOldData(): Promise<{ cleaned: number }> {
    // Clean up old logs (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: deletedLogs } = await supabase
      .from('api_usage_logs')
      .delete()
      .lt('created_at', thirtyDaysAgo)
      .select('id');

    // Clean up expired cache entries
    const { data: deletedCache } = await supabase
      .from('api_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    // Clean up old rate limit entries
    const { data: deletedRateLimits } = await supabase
      .from('api_rate_limits')
      .delete()
      .lt('window_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .select('id');

    const totalCleaned = (deletedLogs?.length || 0) + (deletedCache?.length || 0) + (deletedRateLimits?.length || 0);

    return { cleaned: totalCleaned };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const service = new APIAnalyticsService();
    
    // Verify admin access
    const authHeader = req.headers.get('authorization');
    const isAdmin = await service.verifyAdminAccess(authHeader);
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Admin access required' 
        }),
        { 
          status: 403,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'analytics';
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    switch (action) {
      case 'analytics':
        const analytics = await service.getAnalytics(
          startDate || undefined,
          endDate || undefined
        );
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: analytics,
            period: {
              start: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              end: endDate || new Date().toISOString()
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'realtime':
        try {
          const realtimeStats = await service.getRealtimeStats();
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              data: realtimeStats 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Realtime stats error:', error);
          return new Response(
            JSON.stringify({ 
              success: true, 
              data: {
                recentActivity: [],
                activeCacheEntries: 0,
                cacheEntries: [],
                activeRateLimits: 0,
                rateLimitDetails: []
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      case 'health':
        try {
          const healthData = await service.getSystemHealth();
        
          return new Response(
            JSON.stringify({ 
              success: true, 
              data: healthData 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Health status error:', error);
          return new Response(
            JSON.stringify({ 
              success: true, 
              data: {
                backgroundPollingActive: false,
                lastPollingTime: new Date().toISOString(),
                freshCacheEntries: 0,
                totalConfigEntries: 6,
                systemStatus: {
                  polling: 'inactive',
                  cache: 'empty',
                  config: 'healthy'
                }
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      case 'cleanup':
        const cleanupResult = await service.cleanupOldData();
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: cleanupResult 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid action' 
          }),
          { 
            status: 400,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
    }

  } catch (error) {
    console.error('Error in api-analytics function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
