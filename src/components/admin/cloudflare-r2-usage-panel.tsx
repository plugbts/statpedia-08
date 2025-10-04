/**
 * Cloudflare R2 Usage Monitoring Panel
 * 
 * Admin panel component for monitoring R2 storage usage, costs, and plan limits.
 * Provides real-time insights into storage consumption and cost tracking.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Cloud, 
  Database, 
  TrendingUp, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Calendar,
  HardDrive,
  Activity,
  Download,
  Upload,
  Trash2,
  Eye,
  List,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { 
  cloudflareR2UsageService, 
  type R2UsageVsPlan, 
  type R2UsageStats, 
  type R2PlanConfig,
  type R2CurrentUsage,
  type R2UsageSummary
} from '@/services/cloudflare-r2-usage-service';

export function CloudflareR2UsagePanel() {
  const [usageVsPlan, setUsageVsPlan] = useState<R2UsageVsPlan[]>([]);
  const [usageStats, setUsageStats] = useState<R2UsageStats[]>([]);
  const [planConfig, setPlanConfig] = useState<R2PlanConfig[]>([]);
  const [currentUsage, setCurrentUsage] = useState<R2CurrentUsage[]>([]);
  const [usageSummary, setUsageSummary] = useState<R2UsageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        usageVsPlanData,
        usageStatsData,
        planConfigData,
        currentUsageData,
        usageSummaryData
      ] = await Promise.all([
        cloudflareR2UsageService.getUsageVsPlan(),
        cloudflareR2UsageService.getUsageStats(),
        cloudflareR2UsageService.getPlanConfig(),
        cloudflareR2UsageService.getCurrentUsage(),
        cloudflareR2UsageService.getUsageSummary()
      ]);

      setUsageVsPlan(usageVsPlanData);
      setUsageStats(usageStatsData);
      setPlanConfig(planConfigData);
      setCurrentUsage(currentUsageData);
      setUsageSummary(usageSummaryData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch R2 usage data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch usage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  const handleSyncFromCloudflare = async () => {
    try {
      setLoading(true);
      await cloudflareR2UsageService.syncUsageFromCloudflare();
      await fetchData();
    } catch (err) {
      console.error('Failed to sync from Cloudflare:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync from Cloudflare');
    } finally {
      setLoading(false);
    }
  };

  const getOverallStatus = () => {
    if (usageVsPlan.length === 0) return { status: 'Unknown', color: 'text-gray-600', icon: '❓' };
    
    const maxUsage = Math.max(
      ...usageVsPlan.map(u => Math.max(
        u.storage_usage_percent,
        u.class_a_usage_percent,
        u.class_b_usage_percent,
        u.egress_usage_percent
      ))
    );

    return cloudflareR2UsageService.getUsageStatus(maxUsage);
  };

  const formatBytes = (bytes: number) => cloudflareR2UsageService.formatBytes(bytes);
  const formatCost = (cost: number) => cloudflareR2UsageService.formatCost(cost);
  const getUsagePercentageColor = (percentage: number) => 
    cloudflareR2UsageService.getUsagePercentageColor(percentage);

  if (loading && usageVsPlan.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Cloud className="h-6 w-6 text-blue-600" />
            Cloudflare R2 Usage Monitor
          </h2>
          <Button onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const overallStatus = getOverallStatus();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Cloud className="h-6 w-6 text-blue-600" />
            Cloudflare R2 Usage Monitor
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitor storage usage, costs, and plan limits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={overallStatus.color}>
            {overallStatus.icon} {overallStatus.status}
          </Badge>
          <Button onClick={handleSyncFromCloudflare} variant="outline" disabled={loading}>
            <Activity className="h-4 w-4 mr-2" />
            Sync from Cloudflare
          </Button>
          <Button onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Last Updated */}
      <div className="text-sm text-muted-foreground">
        Last updated: {lastUpdated.toLocaleString()}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage Details</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
          <TabsTrigger value="history">Usage History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Plan Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {usageVsPlan.map((usage) => (
              <Card key={usage.bucket_name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    {usage.bucket_name}
                  </CardTitle>
                  <CardDescription>{usage.plan_name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Storage Usage */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Storage</span>
                      <span className={getUsagePercentageColor(usage.storage_usage_percent)}>
                        {usage.storage_gb.toFixed(2)} GB / {usage.storage_limit_gb} GB
                      </span>
                    </div>
                    <Progress 
                      value={usage.storage_usage_percent} 
                      className="h-2"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {usage.storage_usage_percent.toFixed(1)}% used
                    </div>
                  </div>

                  {/* Class A Operations */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Class A Ops</span>
                      <span className={getUsagePercentageColor(usage.class_a_usage_percent)}>
                        {usage.class_a_operations.toLocaleString()} / {usage.class_a_limit.toLocaleString()}
                      </span>
                    </div>
                    <Progress 
                      value={usage.class_a_usage_percent} 
                      className="h-2"
                    />
                  </div>

                  {/* Class B Operations */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Class B Ops</span>
                      <span className={getUsagePercentageColor(usage.class_b_usage_percent)}>
                        {usage.class_b_operations.toLocaleString()} / {usage.class_b_limit.toLocaleString()}
                      </span>
                    </div>
                    <Progress 
                      value={usage.class_b_usage_percent} 
                      className="h-2"
                    />
                  </div>

                  {/* Egress */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Egress</span>
                      <span className={getUsagePercentageColor(usage.egress_usage_percent)}>
                        {usage.egress_gb.toFixed(2)} GB / {usage.egress_limit_gb} GB
                      </span>
                    </div>
                    <Progress 
                      value={usage.egress_usage_percent} 
                      className="h-2"
                    />
                  </div>

                  {/* Cost */}
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Cost</span>
                      <span className="text-sm font-bold text-green-600">
                        {formatCost(usage.estimated_cost_usd)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {usage.days_remaining} days remaining
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total Requests (30d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usageStats.reduce((sum, stat) => sum + stat.total_requests, 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  Across all buckets
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Total Data Transfer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatBytes(usageStats.reduce((sum, stat) => sum + stat.total_bytes_transferred, 0))}
                </div>
                <div className="text-xs text-muted-foreground">
                  Last 30 days
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCost(usageStats.reduce((sum, stat) => sum + stat.total_cost_usd, 0))}
                </div>
                <div className="text-xs text-muted-foreground">
                  Last 30 days
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Usage Details Tab */}
        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {usageStats.map((stat) => (
              <Card key={stat.bucket_name}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    {stat.bucket_name}
                  </CardTitle>
                  <CardDescription>Detailed usage statistics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Operation Breakdown */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Operation Breakdown</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-blue-600" />
                        <span>GET: {stat.get_requests.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-green-600" />
                        <span>PUT: {stat.put_requests.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4 text-red-600" />
                        <span>DELETE: {stat.delete_requests.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-gray-600" />
                        <span>HEAD: {stat.head_requests.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Data Transfer */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Data Transfer</h4>
                    <div className="text-sm space-y-1">
                      <div>Total: {formatBytes(stat.total_bytes_transferred)}</div>
                      <div>Average: {formatBytes(stat.avg_response_size)}</div>
                    </div>
                  </div>

                  {/* Cost */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Cost</h4>
                    <div className="text-lg font-bold text-green-600">
                      {formatCost(stat.total_cost_usd)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Cost Analysis Tab */}
        <TabsContent value="costs" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Plan Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Plan Configuration
                </CardTitle>
                <CardDescription>Current pricing and limits</CardDescription>
              </CardHeader>
              <CardContent>
                {planConfig.map((plan) => (
                  <div key={plan.id} className="space-y-3">
                    <div className="font-medium">{plan.plan_name}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Storage: {plan.base_storage_gb} GB</div>
                      <div>Class A: {plan.base_class_a_operations.toLocaleString()}</div>
                      <div>Class B: {plan.base_class_b_operations.toLocaleString()}</div>
                      <div>Egress: {plan.base_egress_gb} GB</div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="text-sm font-medium mb-2">Pricing</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Storage: ${plan.storage_price_per_gb}/GB</div>
                        <div>Class A: ${plan.class_a_price_per_million}/M</div>
                        <div>Class B: ${plan.class_b_price_per_million}/M</div>
                        <div>Egress: ${plan.egress_price_per_gb}/GB</div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Cost Projection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Cost Projection
                </CardTitle>
                <CardDescription>Estimated monthly costs</CardDescription>
              </CardHeader>
              <CardContent>
                {usageVsPlan.map((usage) => (
                  <div key={usage.bucket_name} className="space-y-3">
                    <div className="font-medium">{usage.bucket_name}</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Current Cost:</span>
                        <span className="font-medium">{formatCost(usage.estimated_cost_usd)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Days Remaining:</span>
                        <span>{usage.days_remaining}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Projected Monthly:</span>
                        <span className="font-bold text-green-600">
                          {formatCost((usage.estimated_cost_usd / (30 - usage.days_remaining)) * 30)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Usage History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Usage History
              </CardTitle>
              <CardDescription>Daily usage summary for the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {usageSummary.slice(0, 10).map((summary) => (
                  <div key={summary.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{summary.bucket_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(summary.usage_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <div className="font-medium">{summary.total_requests.toLocaleString()}</div>
                        <div className="text-muted-foreground">requests</div>
                      </div>
                      <div>
                        <div className="font-medium">{formatBytes(summary.total_bytes_transferred)}</div>
                        <div className="text-muted-foreground">transferred</div>
                      </div>
                      <div>
                        <div className="font-medium text-green-600">{formatCost(summary.total_cost_usd)}</div>
                        <div className="text-muted-foreground">cost</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
