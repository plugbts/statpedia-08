import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Database, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Users,
  BarChart3,
  Zap,
  Target,
  Eye,
  EyeOff
} from 'lucide-react';
import { hasuraPlayerPropsNormalizedService } from '@/services/hasura-player-props-normalized-service';
import { stableDataUpsertService } from '@/services/stable-data-upsert-service';
import { propIngestionOrchestrator } from '@/services/prop-ingestion-orchestrator';

interface IngestionHealth {
  status: 'healthy' | 'warning' | 'error';
  lastIngestion?: string;
  totalRecords?: number;
  successRate?: number;
  errorRate?: number;
  resolutionStats?: {
    playersResolved: number;
    teamsResolved: number;
    sportsbooksResolved: number;
    gamesResolved: number;
  };
  errors: string[];
}

interface TestResult {
  test_name: string;
  test_status: 'passed' | 'failed' | 'error';
  error_message?: string;
  execution_time_ms?: number;
  props_found?: number;
  props_missing?: number;
  created_at: string;
}

interface MonitoringDashboardProps {
  refreshInterval?: number;
  showDetails?: boolean;
  autoRefresh?: boolean;
}

export const IngestionMonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  refreshInterval = 30000, // 30 seconds
  showDetails = true,
  autoRefresh = true
}) => {
  const [health, setHealth] = useState<IngestionHealth | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch health status
  const fetchHealth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get ingestion health from orchestrator
      const healthResult = await propIngestionOrchestrator.runHealthCheck();
      
      // Get additional stats from normalized service
      const additionalStats = await hasuraPlayerPropsNormalizedService.getIngestionHealth();
      
      // Combine results
      const combinedHealth: IngestionHealth = {
        status: healthResult.isHealthy ? 'healthy' : 'error',
        lastIngestion: healthResult.lastIngestion,
        totalRecords: healthResult.totalRecords || additionalStats.totalRecords,
        successRate: additionalStats.successRate,
        errorRate: additionalStats.errorRate,
        resolutionStats: additionalStats.resolutionStats,
        errors: healthResult.errors
      };

      setHealth(combinedHealth);
      setLastRefresh(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch health status: ${errorMessage}`);
      console.error('MonitoringDashboard fetchHealth error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch test results
  const fetchTestResults = useCallback(async () => {
    try {
      const results = await hasuraPlayerPropsNormalizedService.runGoldenDatasetTests();
      setTestResults(results);
    } catch (err) {
      console.error('MonitoringDashboard fetchTestResults error:', err);
    }
  }, []);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    fetchHealth();
    fetchTestResults();
  }, [fetchHealth, fetchTestResults]);

  // Run tests manually
  const handleRunTests = useCallback(async () => {
    try {
      setIsLoading(true);
      await fetchTestResults();
    } catch (err) {
      console.error('Failed to run tests:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchTestResults]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchHealth();
        fetchTestResults();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchHealth, fetchTestResults]);

  // Initial load
  useEffect(() => {
    fetchHealth();
    fetchTestResults();
  }, [fetchHealth, fetchTestResults]);

  // Get status color and icon
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'healthy':
        return { color: 'text-green-600', icon: CheckCircle, bg: 'bg-green-50' };
      case 'warning':
        return { color: 'text-yellow-600', icon: AlertTriangle, bg: 'bg-yellow-50' };
      case 'error':
        return { color: 'text-red-600', icon: XCircle, bg: 'bg-red-50' };
      default:
        return { color: 'text-gray-600', icon: Activity, bg: 'bg-gray-50' };
    }
  };

  // Calculate test summary
  const testSummary = testResults.reduce((acc, result) => {
    acc.total++;
    if (result.test_status === 'passed') acc.passed++;
    else if (result.test_status === 'failed') acc.failed++;
    else acc.errors++;
    return acc;
  }, { total: 0, passed: 0, failed: 0, errors: 0 });

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <XCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6" />
            Ingestion Monitoring
          </h2>
          <p className="text-muted-foreground">
            Real-time monitoring of stable data architecture
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleRunTests}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <Target className="w-4 h-4 mr-2" />
            Run Tests
          </Button>
        </div>
      </div>

      {/* Health Status */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Overall Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              {React.createElement(getStatusDisplay(health.status).icon, {
                className: `w-4 h-4 ${getStatusDisplay(health.status).color}`
              })}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{health.status}</div>
              <p className="text-xs text-muted-foreground">
                {health.errors.length > 0 ? `${health.errors.length} issues` : 'All systems operational'}
              </p>
            </CardContent>
          </Card>

          {/* Total Records */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {health.totalRecords?.toLocaleString() || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Player props in database
              </p>
            </CardContent>
          </Card>

          {/* Success Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {health.successRate ? `${health.successRate.toFixed(1)}%` : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Last ingestion batch
              </p>
            </CardContent>
          </Card>

          {/* Last Update */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Update</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {health.lastIngestion ? 
                  new Date(health.lastIngestion).toLocaleTimeString() : 
                  'Never'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                {lastRefresh ? `Refreshed ${lastRefresh.toLocaleTimeString()}` : 'Not refreshed'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Resolution Stats */}
      {health?.resolutionStats && showDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Canonical Resolution Stats
            </CardTitle>
            <CardDescription>
              How well the canonical mapping tables are resolving data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {health.resolutionStats.playersResolved}
                </div>
                <p className="text-sm text-muted-foreground">Players Resolved</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {health.resolutionStats.teamsResolved}
                </div>
                <p className="text-sm text-muted-foreground">Teams Resolved</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {health.resolutionStats.sportsbooksResolved}
                </div>
                <p className="text-sm text-muted-foreground">Sportsbooks Resolved</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {health.resolutionStats.gamesResolved}
                </div>
                <p className="text-sm text-muted-foreground">Games Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Golden Dataset Tests
            </CardTitle>
            <CardDescription>
              Regression tests to ensure data integrity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Test Summary */}
              <div className="flex items-center gap-4">
                <Badge variant={testSummary.passed === testSummary.total ? 'default' : 'destructive'}>
                  {testSummary.passed}/{testSummary.total} Passed
                </Badge>
                {testSummary.failed > 0 && (
                  <Badge variant="destructive">
                    {testSummary.failed} Failed
                  </Badge>
                )}
                {testSummary.errors > 0 && (
                  <Badge variant="outline">
                    {testSummary.errors} Errors
                  </Badge>
                )}
              </div>

              {/* Individual Test Results */}
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {result.test_status === 'passed' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : result.test_status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      )}
                      <div>
                        <p className="font-medium">{result.test_name}</p>
                        {result.error_message && (
                          <p className="text-sm text-muted-foreground">
                            {result.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{result.execution_time_ms}ms</p>
                      <p>
                        {result.props_found || 0} found, {result.props_missing || 0} missing
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {health?.errors && health.errors.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <div className="font-medium text-red-800 mb-2">System Issues:</div>
            <ul className="list-disc list-inside space-y-1">
              {health.errors.map((error, index) => (
                <li key={index} className="text-red-700 text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Performance Metrics */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Performance Metrics
            </CardTitle>
            <CardDescription>
              System performance and health indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Error Rate</p>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={health?.errorRate || 0} 
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">
                    {health?.errorRate?.toFixed(1) || 0}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Data Freshness</p>
                <div className="text-sm text-muted-foreground">
                  {health?.lastIngestion ? 
                    `${Math.round((Date.now() - new Date(health.lastIngestion).getTime()) / (1000 * 60))} minutes ago` :
                    'Unknown'
                  }
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Test Coverage</p>
                <div className="text-sm text-muted-foreground">
                  {testSummary.total > 0 ? 
                    `${Math.round((testSummary.passed / testSummary.total) * 100)}% passing` :
                    'No tests run'
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};