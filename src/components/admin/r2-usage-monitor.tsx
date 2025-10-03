import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Cloud, RefreshCw, TrendingUp, TrendingDown, DollarSign, HardDrive, Activity, Wifi } from 'lucide-react';
import { r2UsageMonitor, R2UsageStats, R2PlanConfig } from '@/services/r2-usage-monitor';

export function R2UsageMonitor() {
  const [usageStats, setUsageStats] = useState<R2UsageStats | null>(null);
  const [planConfig, setPlanConfig] = useState<R2PlanConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [stats, config] = await Promise.all([
        r2UsageMonitor.getUsageStats(),
        r2UsageMonitor.getPlanConfig()
      ]);
      
      setUsageStats(stats);
      setPlanConfig(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch R2 usage data');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const success = await r2UsageMonitor.syncFromCloudflare();
      if (success) {
        await fetchData();
      } else {
        setError('Failed to sync from Cloudflare');
      }
    } catch (err) {
      setError('Failed to sync from Cloudflare');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatCost = (cost: number): string => {
    return `$${cost.toFixed(4)}`;
  };

  const getUsagePercentage = (current: number, limit: number): number => {
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Cloudflare R2 Usage</h2>
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
            <Cloud className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Cloudflare R2 Usage</h2>
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
            <Cloud className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Cloudflare R2 Usage</h2>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Cloudflare R2 Usage</h2>
          <Badge variant="outline">{planConfig.plan_name}</Badge>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSync} variant="outline" size="sm" disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync from Cloudflare
          </Button>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Current Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{current.storage_gb.toFixed(2)} GB</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {current.storage_gb > previous.storage_gb ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              {Math.abs(((current.storage_gb - previous.storage_gb) / previous.storage_gb) * 100).toFixed(1)}% from last month
            </div>
            <div className="mt-2">
              <Progress 
                value={getUsagePercentage(current.storage_gb, planConfig.storage_limit_gb)} 
                className="h-2"
              />
              <div className={`text-xs mt-1 ${getUsageColor(getUsagePercentage(current.storage_gb, planConfig.storage_limit_gb))}`}>
                {getUsagePercentage(current.storage_gb, planConfig.storage_limit_gb).toFixed(1)}% of {planConfig.storage_limit_gb} GB limit
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{current.operations_count.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {current.operations_count > previous.operations_count ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              {Math.abs(((current.operations_count - previous.operations_count) / previous.operations_count) * 100).toFixed(1)}% from last month
            </div>
            <div className="mt-2">
              <Progress 
                value={getUsagePercentage(current.operations_count, planConfig.operations_limit)} 
                className="h-2"
              />
              <div className={`text-xs mt-1 ${getUsageColor(getUsagePercentage(current.operations_count, planConfig.operations_limit))}`}>
                {getUsagePercentage(current.operations_count, planConfig.operations_limit).toFixed(1)}% of {planConfig.operations_limit.toLocaleString()} limit
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bandwidth</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{current.bandwidth_gb.toFixed(2)} GB</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {current.bandwidth_gb > previous.bandwidth_gb ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              {Math.abs(((current.bandwidth_gb - previous.bandwidth_gb) / previous.bandwidth_gb) * 100).toFixed(1)}% from last month
            </div>
            <div className="mt-2">
              <Progress 
                value={getUsagePercentage(current.bandwidth_gb, planConfig.bandwidth_limit_gb)} 
                className="h-2"
              />
              <div className={`text-xs mt-1 ${getUsageColor(getUsagePercentage(current.bandwidth_gb, planConfig.bandwidth_limit_gb))}`}>
                {getUsagePercentage(current.bandwidth_gb, planConfig.bandwidth_limit_gb).toFixed(1)}% of {planConfig.bandwidth_limit_gb} GB limit
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
            <div className="text-2xl font-bold">{formatCost(current.cost_usd)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {current.cost_usd > previous.cost_usd ? (
                <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
              )}
              {Math.abs(((current.cost_usd - previous.cost_usd) / previous.cost_usd) * 100).toFixed(1)}% from last month
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Projected: {formatCost(projected.cost_usd)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Configuration</CardTitle>
          <CardDescription>Current R2 plan limits and pricing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Storage</div>
              <div className="text-lg font-semibold">{planConfig.storage_limit_gb} GB</div>
              <div className="text-xs text-muted-foreground">{formatCost(planConfig.cost_per_gb_storage)}/GB/month</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Operations</div>
              <div className="text-lg font-semibold">{planConfig.operations_limit.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{formatCost(planConfig.cost_per_operation)}/operation</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Bandwidth</div>
              <div className="text-lg font-semibold">{planConfig.bandwidth_limit_gb} GB</div>
              <div className="text-xs text-muted-foreground">{formatCost(planConfig.cost_per_gb_bandwidth)}/GB</div>
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
              <span className="text-sm font-medium">Storage Usage</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{previous.storage_gb.toFixed(2)} GB</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-sm font-semibold">{current.storage_gb.toFixed(2)} GB</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Operations</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{previous.operations_count.toLocaleString()}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-sm font-semibold">{current.operations_count.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Bandwidth</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{previous.bandwidth_gb.toFixed(2)} GB</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-sm font-semibold">{current.bandwidth_gb.toFixed(2)} GB</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Cost</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{formatCost(previous.cost_usd)}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-sm font-semibold">{formatCost(current.cost_usd)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
