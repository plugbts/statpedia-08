import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Server, RefreshCw, TrendingUp, TrendingDown, DollarSign, Activity, Clock, Zap, Users, BarChart3 } from 'lucide-react';
import { sportsGameOddsAPIMonitor, APIUsageStats, APIPlanConfig, APIAnalytics } from '@/services/sportsgameodds-api-monitor';

export function SportsGameOddsAPIMonitor() {
  const [usageStats, setUsageStats] = useState<APIUsageStats | null>(null);
  const [planConfig, setPlanConfig] = useState<APIPlanConfig | null>(null);
  const [analytics, setAnalytics] = useState<APIAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [stats, config, analyticsData] = await Promise.all([
        sportsGameOddsAPIMonitor.getUsageStats(),
        sportsGameOddsAPIMonitor.getPlanConfig(),
        sportsGameOddsAPIMonitor.getAnalytics()
      ]);
      
      setUsageStats(stats);
      setPlanConfig(config);
      setAnalytics(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch API usage data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } catch (err) {
      setError('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCost = (cost: number): string => {
    return `$${cost.toFixed(4)}`;
  };

  const formatResponseTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getUsagePercentage = (current: number, limit: number): number => {
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getCacheHitRate = (hits: number, misses: number): number => {
    const total = hits + misses;
    return total > 0 ? (hits / total) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold">SportsGameOdds API Usage</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold">SportsGameOdds API Usage</h2>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!usageStats || !planConfig) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold">SportsGameOdds API Usage</h2>
          </div>
        </div>
        <Alert>
          <AlertDescription>No usage data available</AlertDescription>
        </Alert>
      </div>
    );
  }

  const current = usageStats.current_month;
  const projected = usageStats.projected_monthly;
  const previous = usageStats.previous_month;
  const cacheHitRate = getCacheHitRate(current.cache_hits, current.cache_misses);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-green-500" />
          <h2 className="text-lg font-semibold">SportsGameOdds API Usage</h2>
          <Badge variant="outline">{planConfig.plan_name}</Badge>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{current.total_requests.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {current.total_requests > previous.total_requests ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              {Math.abs(((current.total_requests - previous.total_requests) / previous.total_requests) * 100).toFixed(1)}% from last month
            </div>
            <div className="mt-2">
              <Progress 
                value={getUsagePercentage(current.total_requests, planConfig.request_limit)} 
                className="h-2"
              />
              <div className={`text-xs mt-1 ${getUsageColor(getUsagePercentage(current.total_requests, planConfig.request_limit))}`}>
                {getUsagePercentage(current.total_requests, planConfig.request_limit).toFixed(1)}% of {planConfig.request_limit.toLocaleString()} limit
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatResponseTime(current.total_response_time_ms / current.total_requests)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {current.total_response_time_ms / current.total_requests > previous.total_response_time_ms / previous.total_requests ? (
                <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
              )}
              {Math.abs(((current.total_response_time_ms / current.total_requests) - (previous.total_response_time_ms / previous.total_requests)) / (previous.total_response_time_ms / previous.total_requests) * 100).toFixed(1)}% from last month
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Limit: {formatResponseTime(planConfig.response_time_limit_ms)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cacheHitRate.toFixed(1)}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {current.cache_hits} hits / {current.cache_misses} misses
            </div>
            <div className="mt-2">
              <Progress value={cacheHitRate} className="h-2" />
              <div className="text-xs text-muted-foreground mt-1">
                {cacheHitRate >= 80 ? 'Excellent' : cacheHitRate >= 60 ? 'Good' : 'Needs Improvement'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(current.estimated_cost_usd)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {current.estimated_cost_usd > previous.estimated_cost_usd ? (
                <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
              )}
              {Math.abs(((current.estimated_cost_usd - previous.estimated_cost_usd) / previous.estimated_cost_usd) * 100).toFixed(1)}% from last month
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Projected: {formatCost(projected.estimated_cost_usd)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Top Endpoints
              </CardTitle>
              <CardDescription>Most requested API endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.top_endpoints.map((endpoint, index) => (
                  <div key={endpoint.endpoint} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="text-sm font-medium">{endpoint.endpoint}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{endpoint.requests.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{formatResponseTime(endpoint.avg_response_time)} avg</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Top Sports
              </CardTitle>
              <CardDescription>API usage by sport</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.top_sports.map((sport, index) => (
                  <div key={sport.sport} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="text-sm font-medium">{sport.sport}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{sport.requests.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{sport.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plan Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Configuration</CardTitle>
          <CardDescription>Current API plan limits and pricing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Request Limit</div>
              <div className="text-lg font-semibold">{planConfig.request_limit.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">requests/month</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Cost per Request</div>
              <div className="text-lg font-semibold">{formatCost(planConfig.cost_per_request)}</div>
              <div className="text-xs text-muted-foreground">per request</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Cache Hit Bonus</div>
              <div className="text-lg font-semibold">{(planConfig.cache_hit_bonus * 100).toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">discount on cache hits</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Response Time Limit</div>
              <div className="text-lg font-semibold">{formatResponseTime(planConfig.response_time_limit_ms)}</div>
              <div className="text-xs text-muted-foreground">maximum</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Summary</CardTitle>
          <CardDescription>Current month vs previous month comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Requests</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{previous.total_requests.toLocaleString()}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-sm font-semibold">{current.total_requests.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Cache Hit Rate</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{getCacheHitRate(previous.cache_hits, previous.cache_misses).toFixed(1)}%</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-sm font-semibold">{cacheHitRate.toFixed(1)}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Avg Response Time</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{formatResponseTime(previous.total_response_time_ms / previous.total_requests)}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-sm font-semibold">{formatResponseTime(current.total_response_time_ms / current.total_requests)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Cost</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{formatCost(previous.estimated_cost_usd)}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-sm font-semibold">{formatCost(current.estimated_cost_usd)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
