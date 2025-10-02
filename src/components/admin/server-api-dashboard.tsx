import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  BarChart3, 
  Clock, 
  Database, 
  Play, 
  Pause, 
  RefreshCw, 
  Users, 
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Server,
  Shield
} from 'lucide-react';
import { backendSportsGameOddsAPI } from '@/services/backend-sportsgameodds-api';
import { logAPI, logSuccess, logError, logWarning } from '@/utils/console-logger';

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

interface RealtimeStats {
  recentActivity: any[];
  activeCacheEntries: number;
  cacheEntries: any[];
  activeRateLimits: number;
  rateLimitDetails: any[];
}

interface SystemHealth {
  backgroundPollingActive: boolean;
  lastPollingTime: string;
  freshCacheEntries: number;
  totalConfigEntries: number;
  systemStatus: {
    polling: 'healthy' | 'inactive' | 'error';
    cache: 'healthy' | 'empty' | 'error';
    config: 'healthy' | 'incomplete' | 'error';
  };
}

export const ServerAPIDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<APIAnalytics | null>(null);
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [pollingStatus, setPollingStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Load all data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      logAPI('ServerAPIDashboard', 'Loading server-side API data');
      
      // Load analytics for last 24 hours
      const analyticsData = await backendSportsGameOddsAPI.getAPIAnalytics();
      setAnalytics(analyticsData);
      
      // Load realtime stats
      const realtimeData = await backendSportsGameOddsAPI.getRealtimeStats();
      setRealtimeStats(realtimeData);
      
      // Load system health
      const healthData = await backendSportsGameOddsAPI.getSystemHealth();
      setSystemHealth(healthData);
      
      // Load polling status
      const statusData = await backendSportsGameOddsAPI.getPollingStatus();
      setPollingStatus(statusData);
      
      logSuccess('ServerAPIDashboard', 'Successfully loaded all server-side data');
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load server data';
      setError(message);
      logError('ServerAPIDashboard', 'Failed to load server data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Control background polling
  const handlePollingControl = async (action: 'start' | 'stop' | 'poll-now') => {
    try {
      logAPI('ServerAPIDashboard', `${action} background polling`);
      
      let result;
      switch (action) {
        case 'start':
          result = await backendSportsGameOddsAPI.startBackgroundPolling();
          break;
        case 'stop':
          result = await backendSportsGameOddsAPI.stopBackgroundPolling();
          break;
        case 'poll-now':
          result = await backendSportsGameOddsAPI.triggerManualPoll();
          break;
      }
      
      if (result.success) {
        logSuccess('ServerAPIDashboard', `Successfully ${action} polling`);
        // Refresh polling status
        const statusData = await backendSportsGameOddsAPI.getPollingStatus();
        setPollingStatus(statusData);
      } else {
        throw new Error(result.error || `Failed to ${action} polling`);
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${action} polling`;
      setError(message);
      logError('ServerAPIDashboard', `Failed to ${action} polling:`, err);
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Healthy</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Inactive</Badge>;
      case 'empty':
        return <Badge variant="outline"><Database className="w-3 h-3 mr-1" />Empty</Badge>;
      case 'incomplete':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Incomplete</Badge>;
      default:
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Error</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Server-Side API Management</h2>
          <p className="text-muted-foreground">Monitor and control centralized SportGameOdds API usage</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="control">Control</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* System Health Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="w-5 h-5 mr-2" />
                System Health
              </CardTitle>
              <CardDescription>Overall system status and health metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {systemHealth ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Background Polling</div>
                    {getStatusBadge(systemHealth.systemStatus.polling)}
                    {systemHealth.lastPollingTime && (
                      <div className="text-xs text-muted-foreground">
                        Last: {new Date(systemHealth.lastPollingTime).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Cache System</div>
                    {getStatusBadge(systemHealth.systemStatus.cache)}
                    <div className="text-xs text-muted-foreground">
                      {systemHealth.freshCacheEntries} active entries
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Configuration</div>
                    {getStatusBadge(systemHealth.systemStatus.config)}
                    <div className="text-xs text-muted-foreground">
                      {systemHealth.totalConfigEntries} config entries
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">Loading system health...</div>
              )}
            </CardContent>
          </Card>

          {/* Key Metrics */}
          {analytics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <div className="text-2xl font-bold">{analytics.totalRequests}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Total Requests (24h)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-green-500" />
                    <div className="text-2xl font-bold">{analytics.uniqueUsers}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Unique Users</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <div className="text-2xl font-bold">{analytics.cacheHitRate.toFixed(1)}%</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Cache Hit Rate</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-purple-500" />
                    <div className="text-2xl font-bold">{analytics.avgResponseTime.toFixed(0)}ms</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Response Time</div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <>
              {/* Usage by Endpoint */}
              <Card>
                <CardHeader>
                  <CardTitle>Usage by Endpoint</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(analytics.requestsByEndpoint).map(([endpoint, count]) => (
                      <div key={endpoint} className="flex justify-between items-center">
                        <span className="font-mono text-sm">{endpoint}</span>
                        <Badge variant="outline">{count} requests</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Usage by Sport */}
              <Card>
                <CardHeader>
                  <CardTitle>Usage by Sport</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(analytics.requestsBySport).map(([sport, count]) => (
                      <div key={sport} className="flex justify-between items-center">
                        <span className="capitalize">{sport}</span>
                        <Badge variant="outline">{count} requests</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Users */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Users (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.topUsers.slice(0, 10).map((user, index) => (
                      <div key={user.userId} className="flex justify-between items-center">
                        <div>
                          <span className="text-sm">#{index + 1}</span>
                          <span className="ml-2">{user.email || `User ${user.userId.substring(0, 8)}`}</span>
                        </div>
                        <Badge variant="outline">{user.requestCount} requests</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Error Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <div className="text-2xl font-bold">{analytics.errorRate.toFixed(1)}%</div>
                    </div>
                    <div className="text-xs text-muted-foreground">Error Rate</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-orange-500" />
                      <div className="text-2xl font-bold">{analytics.rateLimitHits}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">Rate Limit Hits</div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="realtime" className="space-y-4">
          {realtimeStats && (
            <>
              {/* Cache Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Cache Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Active Cache Entries:</span>
                      <Badge>{realtimeStats.activeCacheEntries}</Badge>
                    </div>
                    <Separator />
                    <div className="space-y-1">
                      {realtimeStats.cacheEntries.slice(0, 5).map((entry, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="font-mono">{entry.cache_key}</span>
                          <span className="text-muted-foreground">
                            {entry.sport} • Expires: {new Date(entry.expires_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity (Last Hour)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {realtimeStats.recentActivity.slice(0, 20).map((log, index) => (
                      <div key={index} className="flex justify-between items-center text-sm border-b pb-1">
                        <div>
                          <span className="font-mono">{log.endpoint}</span>
                          {log.sport && <span className="ml-2 text-muted-foreground">({log.sport})</span>}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={log.response_status < 400 ? "default" : "destructive"}>
                            {log.response_status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Rate Limits */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Rate Limits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Active Rate Limit Windows:</span>
                      <Badge>{realtimeStats.activeRateLimits}</Badge>
                    </div>
                    {realtimeStats.rateLimitDetails.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-1">
                          {realtimeStats.rateLimitDetails.slice(0, 5).map((limit, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{limit.endpoint}</span>
                              <span className="text-muted-foreground">
                                {limit.requests_count}/{limit.max_requests}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="control" className="space-y-4">
          {/* Background Polling Control */}
          <Card>
            <CardHeader>
              <CardTitle>Background Polling Control</CardTitle>
              <CardDescription>Manage automated data polling from SportGameOdds API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pollingStatus && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Status:</span>
                    <Badge variant={pollingStatus.status?.isPolling ? "default" : "secondary"}>
                      {pollingStatus.status?.isPolling ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {pollingStatus.status?.config && (
                    <>
                      <div className="flex justify-between items-center">
                        <span>Interval:</span>
                        <span>{pollingStatus.status.config.polling_interval_seconds}s</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Enabled Sports:</span>
                        <span>{pollingStatus.status.config.enabled_sports?.join(', ')}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              <Separator />
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => handlePollingControl('start')}
                  disabled={loading || pollingStatus?.status?.isPolling}
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Polling
                </Button>
                <Button 
                  onClick={() => handlePollingControl('stop')}
                  disabled={loading || !pollingStatus?.status?.isPolling}
                  variant="outline"
                  size="sm"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Polling
                </Button>
                <Button 
                  onClick={() => handlePollingControl('poll-now')}
                  disabled={loading}
                  variant="secondary"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Poll Now
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>API Endpoint:</span>
                  <span className="font-mono">Supabase Edge Functions</span>
                </div>
                <div className="flex justify-between">
                  <span>Cache Backend:</span>
                  <span>PostgreSQL</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate Limiting:</span>
                  <span>Server-side</span>
                </div>
                <div className="flex justify-between">
                  <span>User Attribution:</span>
                  <span>JWT-based</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
