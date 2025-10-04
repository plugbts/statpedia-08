import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { metricsAPI, type MetricsData } from '@/services/metrics-api';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Activity, 
  Database, 
  Server, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';


interface HistoricalData {
  timestamp: string;
  totalKeptPlayerProps: number;
  totalDroppedPlayerProps: number;
  cacheHitRatio: number;
  avgResponseTimeMs: number;
  totalRequests: number;
}

export const MonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [isCompact, setIsCompact] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add error boundary
  if (error) {
    return (
      <div className="p-8">
        <div className="text-red-500">Error loading monitoring dashboard: {error}</div>
        <button onClick={() => setError(null)}>Retry</button>
      </div>
    );
  }

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await metricsAPI.getMetrics();
      setMetrics(data);

      // Add to historical data
      const newDataPoint: HistoricalData = {
        timestamp: new Date().toLocaleTimeString(),
        totalKeptPlayerProps: data.totalKeptPlayerProps,
        totalDroppedPlayerProps: data.totalDroppedPlayerProps,
        cacheHitRatio: data.cacheHits + data.cacheMisses > 0 
          ? (data.cacheHits / (data.cacheHits + data.cacheMisses)) * 100 
          : 0,
        avgResponseTimeMs: data.avgResponseTimeMs,
        totalRequests: data.totalRequests
      };

      setHistoricalData(prev => {
        const updated = [...prev, newDataPoint];
        // Keep only last 20 data points
        return updated.slice(-20);
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      console.error('Error fetching metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetMetrics = async () => {
    try {
      await metricsAPI.resetMetrics();
      await fetchMetrics();
    } catch (err) {
      console.error('Error resetting metrics:', err);
    }
  };

  // Fetch metrics on component mount and every 30 seconds
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const cacheHitRatio = metrics && (metrics.cacheHits + metrics.cacheMisses) > 0 
    ? (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100 
    : 0;

  const upstreamStatusData = metrics ? [
    { name: '200', value: metrics.upstreamStatusCounts["200"], color: '#10b981' },
    { name: '4xx', value: metrics.upstreamStatusCounts["4xx"], color: '#f59e0b' },
    { name: '5xx', value: metrics.upstreamStatusCounts["5xx"], color: '#ef4444' }
  ] : [];

  const responseTimeData = historicalData.map((data, index) => ({
    time: data.timestamp,
    first: data.avgResponseTimeMs,
    cached: Math.max(0, data.avgResponseTimeMs - 200) // Simulate cached response time
  }));

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Monitoring Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchMetrics} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoring Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time metrics for player props API
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={isCompact}
              onCheckedChange={setIsCompact}
            />
            <span className="text-sm">Compact Mode</span>
          </div>
          <Button onClick={resetMetrics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Metrics
          </Button>
          <Button onClick={fetchMetrics} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Props</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalKeptPlayerProps || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.totalDroppedPlayerProps || 0} dropped
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Ratio</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cacheHitRatio.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.cacheHits || 0} hits, {metrics?.cacheMisses || 0} misses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.avgResponseTimeMs || 0}ms</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.totalRequests || 0} total requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upstream Health</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {metrics?.upstreamStatusCounts["5xx"] === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm">
                {metrics?.upstreamStatusCounts["5xx"] === 0 ? 'Healthy' : 'Issues'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.upstreamStatusCounts["5xx"] || 0} 5xx errors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="props" className="space-y-4">
        <TabsList>
          <TabsTrigger value="props">Props</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="upstream">Upstream</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
        </TabsList>

        {/* Props Panel */}
        <TabsContent value="props" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {!isCompact && (
              <Card>
                <CardHeader>
                  <CardTitle>Player Props Over Time</CardTitle>
                  <CardDescription>Total kept player props</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="totalKeptPlayerProps" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Kept Props"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Dropped Props Gauge</CardTitle>
                <CardDescription>Should stay at 0</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-64">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full border-8 border-gray-200 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-500">
                          {metrics?.totalDroppedPlayerProps || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Dropped</div>
                      </div>
                    </div>
                    <Badge 
                      variant={metrics?.totalDroppedPlayerProps === 0 ? "default" : "destructive"}
                      className="absolute -top-2 -right-2"
                    >
                      {metrics?.totalDroppedPlayerProps === 0 ? "Good" : "Alert"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cache Panel */}
        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cache Hit Ratio</CardTitle>
                <CardDescription>Percentage of requests served from cache</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-64">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full border-8 border-gray-200 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-500">
                          {cacheHitRatio.toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Hit Ratio</div>
                      </div>
                    </div>
                    <Badge 
                      variant={cacheHitRatio > 50 ? "default" : "secondary"}
                      className="absolute -top-2 -right-2"
                    >
                      {cacheHitRatio > 50 ? "Good" : "Low"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!isCompact && (
              <Card>
                <CardHeader>
                  <CardTitle>Response Times</CardTitle>
                  <CardDescription>First request vs cached response</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={responseTimeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="first" fill="#ef4444" name="First Request" />
                      <Bar dataKey="cached" fill="#10b981" name="Cached" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Upstream Panel */}
        <TabsContent value="upstream" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Upstream Status Codes</CardTitle>
                <CardDescription>Distribution of HTTP status codes</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={upstreamStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {upstreamStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {!isCompact && (
              <Card>
                <CardHeader>
                  <CardTitle>Upstream Latency</CardTitle>
                  <CardDescription>Average response time over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="avgResponseTimeMs" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        name="Avg Response Time (ms)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Traffic Panel */}
        <TabsContent value="traffic" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Request Endpoints</CardTitle>
                <CardDescription>Requests per endpoint</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium">/api/nfl/player-props</span>
                    <Badge variant="secondary">{metrics?.totalRequests || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium">/api/nba/player-props</span>
                    <Badge variant="secondary">0</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium">/api/mlb/player-props</span>
                    <Badge variant="secondary">0</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium">/debug/player-props</span>
                    <Badge variant="secondary">0</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!isCompact && (
              <Card>
                <CardHeader>
                  <CardTitle>Requests Per Second</CardTitle>
                  <CardDescription>Request rate over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="totalRequests" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        name="Total Requests"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Last Updated */}
      {metrics && (
        <div className="text-center text-sm text-muted-foreground">
          Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
};
