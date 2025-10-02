import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { supabase } from '@/integrations/supabase/client';

// Backend API service that calls our Supabase functions instead of SportGameOdds directly
export class BackendSportsGameOddsAPI {
  private readonly baseUrl: string;

  constructor() {
    // Use Supabase function URL
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}/sportsgameodds-api`);
    
    // Add parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    logAPI('BackendSportsGameOddsAPI', `Making request to: ${url.pathname}${url.search}`);

    try {
      // Get auth token for user attribution
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      logAPI('BackendSportsGameOddsAPI', `Session status: ${session ? 'authenticated' : 'anonymous'}${sessionError ? ` (error: ${sessionError.message})` : ''}`);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      };

      // Add auth header if user is logged in
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        logAPI('BackendSportsGameOddsAPI', 'Using authenticated request with user token');
      } else {
        logWarning('BackendSportsGameOddsAPI', 'No valid session found, making anonymous request');
        // For anonymous requests, we still need to ensure we have the apikey
        if (!headers['apikey']) {
          throw new Error('No authentication available - missing both user session and API key');
        }
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const responseText = await response.text();
        let errorData: any = {};
        
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          // Response is not JSON
          logError('BackendSportsGameOddsAPI', `Non-JSON error response (${response.status}):`, responseText);
        }
        
        logError('BackendSportsGameOddsAPI', `HTTP ${response.status} error:`, {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorData,
          rawBody: responseText
        });
        
        if (response.status === 401) {
          throw new Error('Authentication failed - please log in and try again');
        }
        
        if (response.status === 429) {
          const resetTime = response.headers.get('X-RateLimit-Reset');
          logWarning('BackendSportsGameOddsAPI', `Rate limit exceeded. Reset at: ${resetTime}`);
          throw new Error(`Rate limit exceeded. Try again at ${resetTime ? new Date(resetTime).toLocaleTimeString() : 'later'}`);
        }
        
        if (response.status === 546) {
          logError('BackendSportsGameOddsAPI', 'HTTP 546 error detected - this is not a standard HTTP status code');
          throw new Error(`Custom error 546: ${errorData.error || errorData.message || 'Unknown error'}`);
        }
        
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      // Log cache status
      const cacheStatus = response.headers.get('X-Cache');
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      
      logInfo('BackendSportsGameOddsAPI', `Response: ${cacheStatus === 'HIT' ? 'Cache HIT' : 'Cache MISS'}, Rate limit remaining: ${rateLimitRemaining}`);

      return data;

    } catch (error) {
      logError('BackendSportsGameOddsAPI', `Request failed:`, error);
      throw error;
    }
  }

  async getPlayerProps(sport: string, forceRefresh: boolean = false): Promise<any[]> {
    try {
      logAPI('BackendSportsGameOddsAPI', `Fetching player props for ${sport}${forceRefresh ? ' (force refresh)' : ''}`);
      
      const params: any = {
        endpoint: 'player-props',
        sport: sport.toLowerCase()
      };
      
      if (forceRefresh) {
        params.force_refresh = 'true';
      }
      
      const response = await this.makeRequest('', params);

      const props = response.data || [];
      
      logSuccess('BackendSportsGameOddsAPI', `Retrieved ${props.length} player props for ${sport}`);
      
      if (response.cached) {
        logInfo('BackendSportsGameOddsAPI', `Data served from cache (key: ${response.cacheKey})`);
      }

      if (response.meta?.propsLimited) {
        logWarning('BackendSportsGameOddsAPI', `Props limited to ${response.meta.propsLimited} for testing`);
      }

      return props;

    } catch (error) {
      logError('BackendSportsGameOddsAPI', `Failed to get player props for ${sport}:`, error);
      throw error;
    }
  }

  async getEvents(sport: string): Promise<any[]> {
    try {
      logAPI('BackendSportsGameOddsAPI', `Fetching events for ${sport}`);
      
      const response = await this.makeRequest('', {
        endpoint: 'events',
        sport: sport.toLowerCase()
      });

      const events = response.data || [];
      
      logSuccess('BackendSportsGameOddsAPI', `Retrieved ${events.length} events for ${sport}`);
      
      return events;

    } catch (error) {
      logError('BackendSportsGameOddsAPI', `Failed to get events for ${sport}:`, error);
      throw error;
    }
  }

  // Background polling control methods
  async startBackgroundPolling(): Promise<any> {
    try {
      logAPI('BackendSportsGameOddsAPI', 'Starting background polling');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`${this.baseUrl}/background-poller?action=start`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      const data = await response.json();
      
      if (data.success) {
        logSuccess('BackendSportsGameOddsAPI', 'Background polling started');
      } else {
        logError('BackendSportsGameOddsAPI', 'Failed to start background polling:', data.error);
      }

      return data;

    } catch (error) {
      logError('BackendSportsGameOddsAPI', 'Failed to start background polling:', error);
      throw error;
    }
  }

  async stopBackgroundPolling(): Promise<any> {
    try {
      logAPI('BackendSportsGameOddsAPI', 'Stopping background polling');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`${this.baseUrl}/background-poller?action=stop`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      const data = await response.json();
      
      if (data.success) {
        logSuccess('BackendSportsGameOddsAPI', 'Background polling stopped');
      } else {
        logError('BackendSportsGameOddsAPI', 'Failed to stop background polling:', data.error);
      }

      return data;

    } catch (error) {
      logError('BackendSportsGameOddsAPI', 'Failed to stop background polling:', error);
      throw error;
    }
  }

  async getPollingStatus(): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`${this.baseUrl}/background-poller?action=status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      const data = await response.json();
      return data;

    } catch (error) {
      logError('BackendSportsGameOddsAPI', 'Failed to get polling status:', error);
      throw error;
    }
  }

  async triggerManualPoll(): Promise<any> {
    try {
      logAPI('BackendSportsGameOddsAPI', 'Triggering manual poll');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`${this.baseUrl}/background-poller?action=poll-now`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      const data = await response.json();
      
      if (data.success) {
        logSuccess('BackendSportsGameOddsAPI', 'Manual poll completed');
      } else {
        logError('BackendSportsGameOddsAPI', 'Manual poll failed:', data.error);
      }

      return data;

    } catch (error) {
      logError('BackendSportsGameOddsAPI', 'Failed to trigger manual poll:', error);
      throw error;
    }
  }

  // Analytics methods (admin only)
  async getAPIAnalytics(startDate?: string, endDate?: string): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const url = new URL(`${this.baseUrl}/api-analytics`);
      url.searchParams.append('action', 'analytics');
      
      if (startDate) url.searchParams.append('start_date', startDate);
      if (endDate) url.searchParams.append('end_date', endDate);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get analytics');
      }

      return data.data;

    } catch (error) {
      logError('BackendSportsGameOddsAPI', 'Failed to get API analytics:', error);
      throw error;
    }
  }

  async getRealtimeStats(): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.baseUrl}/api-analytics?action=realtime`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get realtime stats');
      }

      return data.data;

    } catch (error) {
      logError('BackendSportsGameOddsAPI', 'Failed to get realtime stats:', error);
      throw error;
    }
  }

  async getSystemHealth(): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.baseUrl}/api-analytics?action=health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get system health');
      }

      return data.data;

    } catch (error) {
      logError('BackendSportsGameOddsAPI', 'Failed to get system health:', error);
      throw error;
    }
  }

  async getRealtimeStats(): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.baseUrl}/api-analytics?action=realtime`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get realtime stats');
      }

      return data.data;

    } catch (error) {
      logError('BackendSportsGameOddsAPI', 'Failed to get realtime stats:', error);
      throw error;
    }
  }

  async getSystemHealth(): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.baseUrl}/api-analytics?action=health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get system health');
      }

      return data.data;

    } catch (error) {
      logError('BackendSportsGameOddsAPI', 'Failed to get system health:', error);
      throw error;
    }
  }

  // Legacy compatibility methods (for existing code)
  getUsageStats() {
    logWarning('BackendSportsGameOddsAPI', 'getUsageStats() is deprecated - use getAPIAnalytics() instead');
    return {
      totalCalls: 0,
      callsToday: 0,
      maxDailyCalls: 1000,
      usagePercentage: 0,
      lastResetDate: new Date().toDateString(),
      callsByEndpoint: {},
      isNearLimit: false,
      isAtLimit: false
    };
  }

  getDetailedUsageStats() {
    logWarning('BackendSportsGameOddsAPI', 'getDetailedUsageStats() is deprecated - use getAPIAnalytics() instead');
    return {
      cacheHitRate: 0,
      recommendations: ['Use new analytics API for detailed stats']
    };
  }

  getRateLimitStatus() {
    logWarning('BackendSportsGameOddsAPI', 'getRateLimitStatus() is deprecated - rate limiting is now server-side');
    return {
      status: 'NORMAL',
      message: 'Rate limiting handled server-side',
      canMakeCalls: true
    };
  }

  getAPIKeyInfo() {
    logWarning('BackendSportsGameOddsAPI', 'getAPIKeyInfo() is deprecated - API key is managed server-side');
    return {
      keyPrefix: 'server-side',
      keySuffix: 'managed',
      planType: 'Server Managed',
      currentLimit: 1000,
      keyStatus: 'Active',
      lastValidated: new Date().toISOString(),
      isConfigured: true,
      estimatedDailyLimit: 1000
    };
  }

  clearPlayerPropsCache() {
    logInfo('BackendSportsGameOddsAPI', 'Cache clearing is handled server-side');
  }

  resetUsageStats() {
    logWarning('BackendSportsGameOddsAPI', 'Usage stats reset is not available - stats are managed server-side');
  }
}

// Export singleton instance
export const backendSportsGameOddsAPI = new BackendSportsGameOddsAPI();
