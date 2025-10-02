import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  BarChart3,
  RefreshCw,
  ExternalLink,
  Target,
  Server,
  Database
} from 'lucide-react';
import { apiUsageService, APIUsageStats, APIUsageVsPlan, APIPlanConfig } from '@/services/api-usage-service';

interface UsageAnalytics {
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
}

export const SportsGameOddsAPIUsagePanel: React.FC = () => {
  const [usageStats, setUsageStats] = useState<APIUsageStats[]>([]);
  const [usageVsPlan, setUsageVsPlan] = useState<APIUsageVsPlan[]>([]);
  const [planConfigs, setPlanConfigs] = useState<APIPlanConfig[]>([]);
  const [analytics, setAnalytics] = useState<UsageAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [stats, vsPlan, configs] = await Promise.all([
        apiUsageService.getUsageStats(),
        apiUsageService.getUsageVsPlan(),
        apiUsageService.getPlanConfigs()
      ]);

      setUsageStats(stats);
      setUsageVsPlan(vsPlan);
      setPlanConfigs(configs);
      
      // Create mock analytics data for now
      setAnalytics({
        totalRequests: stats.reduce((sum, stat) => sum + stat.total_requests, 0),
        uniqueUsers: stats.length,
        avgResponseTime: stats.reduce((sum, stat) => sum + stat.avg_response_time_ms, 0) / stats.length || 0,
        cacheHitRate: stats.reduce((sum, stat) => sum + stat.cache_hit_rate, 0) / stats.length || 0,
        errorRate: stats.reduce((sum, stat) => sum + stat.error_rate, 0) / stats.length || 0,
        totalCost: stats.reduce((sum, stat) => sum + stat.total_cost_usd, 0),
        requestsByEndpoint: stats.reduce((acc, stat) => ({ ...acc, ...stat.requests_by_endpoint }), {}),
        requestsBySport: stats.reduce((acc, stat) => ({ ...acc, ...stat.requests_by_sport }), {}),
        topUsers: stats.map(stat => ({ user_id: stat.user_id, request_count: stat.total_requests }))
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage data');
      console.error('Error loading API usage data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getUsageStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'destructive';
    if (percentage >= 70) return 'secondary';
    return 'default';
  };

  const getUsageStatusText = (percentage: number) => {
    if (percentage >= 90) return 'Critical';
    if (percentage >= 70) return 'High';
    if (percentage >= 50) return 'Moderate';
    return 'Low';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SportsGameOdds API Usage</h2>
          <p className="text-muted-foreground">Monitor API usage, costs, and plan optimization</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={() => window.open('https://sportsgameodds.com/pricing/', '_blank')} 
            variant="outline" 
            size="sm"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Pricing
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
          <TabsTrigger value="usage">Usage Details</TabsTrigger>
          <TabsTrigger value="plans">Plan Analysis</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          {analytics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <div className="text-2xl font-bold">{formatNumber(analytics.totalRequests)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Total Requests (30d)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-green-500" />
                    <div className="text-2xl font-bold">{analytics.uniqueUsers}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Active Users</div>
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
                    <DollarSign className="w-4 h-4 text-purple-500" />
                    <div className="text-2xl font-bold">{formatCurrency(analytics.totalCost)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Total Cost (30d)</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Current Usage vs Plan */}
          {usageVsPlan.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Current Plan Usage
                </CardTitle>
                <CardDescription>
                  {usageVsPlan[0].plan_name} - {usageVsPlan[0].days_remaining} days remaining this month
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Requests Used</span>
                    <span>{formatNumber(usageVsPlan[0].total_requests)} / {formatNumber(usageVsPlan[0].request_limit)}</span>
                  </div>
                  <Progress 
                    value={usageVsPlan[0].usage_percent} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{usageVsPlan[0].usage_percent.toFixed(1)}% used</span>
                    <Badge variant={getUsageStatusColor(usageVsPlan[0].usage_percent)}>
                      {getUsageStatusText(usageVsPlan[0].usage_percent)}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Cache Hit Rate:</span>
                    <div className="text-lg font-semibold">{usageVsPlan[0].cache_hit_rate.toFixed(1)}%</div>
                  </div>
                  <div>
                    <span className="font-medium">Estimated Cost:</span>
                    <div className="text-lg font-semibold">{formatCurrency(usageVsPlan[0].estimated_cost_usd)}</div>
                  </div>
                  <div>
                    <span className="font-medium">Projected Monthly:</span>
                    <div className="text-lg font-semibold">{formatCurrency(usageVsPlan[0].projected_monthly_cost)}</div>
                  </div>
                  <div>
                    <span className="font-medium">Days Remaining:</span>
                    <div className="text-lg font-semibold">{usageVsPlan[0].days_remaining}</div>
                  </div>
                </div>

                {usageVsPlan[0].recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Recommendations:</h4>
                    <ul className="space-y-1">
                      {usageVsPlan[0].recommendations.map((rec, index) => (
                        <li key={index} className="text-sm flex items-start">
                          <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          {/* Usage Statistics */}
          {usageStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usageStats.map((stat, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Total Requests:</span>
                          <div className="text-lg font-semibold">{formatNumber(stat.total_requests)}</div>
                        </div>
                        <div>
                          <span className="font-medium">Avg Response Time:</span>
                          <div className="text-lg font-semibold">{stat.avg_response_time_ms}ms</div>
                        </div>
                        <div>
                          <span className="font-medium">Cache Hit Rate:</span>
                          <div className="text-lg font-semibold">{stat.cache_hit_rate.toFixed(1)}%</div>
                        </div>
                        <div>
                          <span className="font-medium">Error Rate:</span>
                          <div className="text-lg font-semibold">{stat.error_rate.toFixed(1)}%</div>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Requests by Endpoint:</h4>
                          <div className="space-y-1">
                            {Object.entries(stat.requests_by_endpoint).map(([endpoint, count]) => (
                              <div key={endpoint} className="flex justify-between text-sm">
                                <span className="font-mono">{endpoint}</span>
                                <Badge variant="outline">{formatNumber(count)}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Requests by Sport:</h4>
                          <div className="space-y-1">
                            {Object.entries(stat.requests_by_sport).map(([sport, count]) => (
                              <div key={sport} className="flex justify-between text-sm">
                                <span className="capitalize">{sport}</span>
                                <Badge variant="outline">{formatNumber(count)}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          {/* Plan Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Available Plans</CardTitle>
              <CardDescription>
                Compare SportsGameOdds API plans and find the best fit for your usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {planConfigs.map((plan) => (
                  <div key={plan.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{plan.plan_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(plan.monthly_request_limit)} requests/month
                        </p>
                      </div>
                      <Badge variant={plan.plan_name === usageVsPlan[0]?.plan_name ? 'default' : 'outline'}>
                        {plan.plan_name === usageVsPlan[0]?.plan_name ? 'Current' : 'Available'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Cost per Request:</span>
                        <div className="text-lg font-semibold">{formatCurrency(plan.cost_per_request_usd)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Cache Discount:</span>
                        <div className="text-lg font-semibold">{plan.cache_hit_discount_percent}%</div>
                      </div>
                      <div>
                        <span className="font-medium">Max Monthly Cost:</span>
                        <div className="text-lg font-semibold">
                          {formatCurrency(plan.monthly_request_limit * plan.cost_per_request_usd)}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Effective Cost:</span>
                        <div className="text-lg font-semibold">
                          {formatCurrency(plan.cost_per_request_usd * (1 - plan.cache_hit_discount_percent / 100))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Analytics Dashboard */}
          {analytics && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Usage Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Top Endpoints</h4>
                      <div className="space-y-2">
                        {Object.entries(analytics.requestsByEndpoint)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 5)
                          .map(([endpoint, count]) => (
                            <div key={endpoint} className="flex justify-between items-center">
                              <span className="font-mono text-sm">{endpoint}</span>
                              <Badge variant="outline">{formatNumber(count)}</Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-3">Top Sports</h4>
                      <div className="space-y-2">
                        {Object.entries(analytics.requestsBySport)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 5)
                          .map(([sport, count]) => (
                            <div key={sport} className="flex justify-between items-center">
                              <span className="capitalize">{sport}</span>
                              <Badge variant="outline">{formatNumber(count)}</Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Users (30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.topUsers.slice(0, 10).map((user, index) => (
                      <div key={user.user_id} className="flex justify-between items-center">
                        <div>
                          <span className="text-sm">#{index + 1}</span>
                          <span className="ml-2">{user.email || `User ${user.user_id.substring(0, 8)}`}</span>
                        </div>
                        <Badge variant="outline">{formatNumber(user.request_count)} requests</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
