import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Target, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play, 
  RefreshCw,
  Clock,
  BarChart3,
  Database,
  Zap,
  Activity
} from 'lucide-react';
import { hasuraPlayerPropsNormalizedService } from '@/services/hasura-player-props-normalized-service';

interface TestResult {
  test_name: string;
  test_status: 'passed' | 'failed' | 'error';
  error_message?: string;
  execution_time_ms?: number;
  props_found?: number;
  props_missing?: number;
  created_at: string;
  details?: {
    player_name?: string;
    team_abbrev?: string;
    opponent_abbrev?: string;
    market?: string;
    line?: number;
    odds?: number;
    team_logo?: string;
    opponent_logo?: string;
  };
}

interface GoldenDatasetTestRunnerProps {
  autoRun?: boolean;
  showDetails?: boolean;
  refreshInterval?: number;
}

export const GoldenDatasetTestRunner: React.FC<GoldenDatasetTestRunnerProps> = ({
  autoRun = false,
  showDetails = true,
  refreshInterval = 60000 // 1 minute
}) => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Run golden dataset tests
  const runTests = useCallback(async () => {
    try {
      setIsRunning(true);
      setError(null);
      setProgress(0);

      console.log('🧪 Starting golden dataset tests...');

      // Step 1: Test database connectivity
      setProgress(10);
      console.log('📡 Testing database connectivity...');
      const healthCheck = await hasuraPlayerPropsNormalizedService.getIngestionHealth();
      console.log('✅ Database connectivity confirmed');

      // Step 2: Run the actual golden dataset tests
      setProgress(30);
      console.log('🎯 Running golden dataset tests...');
      const results = await hasuraPlayerPropsNormalizedService.runGoldenDatasetTests();
      console.log('✅ Golden dataset tests completed');

      // Step 3: Analyze results
      setProgress(70);
      console.log('📊 Analyzing test results...');
      
      // Add additional validation for each test
      const enhancedResults = await Promise.all(results.map(async (result) => {
        const enhanced: TestResult = { ...result };
        
        if (result.test_status === 'passed') {
          // Additional validation for passed tests
          try {
            const props = await hasuraPlayerPropsNormalizedService.getPlayerProps({
              player_name: result.test_name.includes('joe_burrow') ? 'Joe Burrow' : 
                          result.test_name.includes('jamarr_chase') ? 'Ja\'Marr Chase' :
                          result.test_name.includes('aaron_rodgers') ? 'Aaron Rodgers' :
                          result.test_name.includes('josh_allen') ? 'Josh Allen' :
                          result.test_name.includes('travis_kelce') ? 'Travis Kelce' : '',
              limit: 1
            });

            if (props.length > 0) {
              const prop = props[0];
              enhanced.details = {
                player_name: prop.player_name,
                team_abbrev: prop.team_abbrev,
                opponent_abbrev: prop.opponent_abbrev,
                market: prop.market,
                line: prop.line,
                odds: prop.odds,
                team_logo: prop.team_logo,
                opponent_logo: prop.opponent_logo
              };
            }
          } catch (err) {
            console.warn(`Additional validation failed for ${result.test_name}:`, err);
          }
        }

        return enhanced;
      }));

      setTestResults(enhancedResults);
      setLastRun(new Date());
      setProgress(100);

      console.log('🎉 All tests completed successfully!');
      console.log(`📊 Results: ${enhancedResults.filter(r => r.test_status === 'passed').length}/${enhancedResults.length} passed`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Test execution failed: ${errorMessage}`);
      console.error('❌ Test execution failed:', err);
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Auto-run effect
  useEffect(() => {
    if (autoRun) {
      runTests();
    }
  }, [autoRun, runTests]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRun && refreshInterval > 0) {
      const interval = setInterval(() => {
        runTests();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRun, refreshInterval, runTests]);

  // Calculate test summary
  const testSummary = testResults.reduce((acc, result) => {
    acc.total++;
    if (result.test_status === 'passed') acc.passed++;
    else if (result.test_status === 'failed') acc.failed++;
    else acc.errors++;
    return acc;
  }, { total: 0, passed: 0, failed: 0, errors: 0 });

  // Get status color and icon
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'passed':
        return { color: 'text-green-600', icon: CheckCircle, bg: 'bg-green-50' };
      case 'failed':
        return { color: 'text-red-600', icon: XCircle, bg: 'bg-red-50' };
      case 'error':
        return { color: 'text-yellow-600', icon: AlertTriangle, bg: 'bg-yellow-50' };
      default:
        return { color: 'text-gray-600', icon: Target, bg: 'bg-gray-50' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" />
            Golden Dataset Tests
          </h2>
          <p className="text-muted-foreground">
            Regression tests to ensure data integrity and stability
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={runTests}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isRunning ? 'Running...' : 'Run Tests'}
          </Button>
        </div>
      </div>

      {/* Progress */}
      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Running Tests...</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Test Summary */}
      {testResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <Target className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{testSummary.total}</div>
              <p className="text-xs text-muted-foreground">
                Golden dataset tests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Passed</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{testSummary.passed}</div>
              <p className="text-xs text-muted-foreground">
                {testSummary.total > 0 ? Math.round((testSummary.passed / testSummary.total) * 100) : 0}% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="w-4 h-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{testSummary.failed}</div>
              <p className="text-xs text-muted-foreground">
                Tests that failed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Run</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lastRun ? lastRun.toLocaleTimeString() : 'Never'}
              </div>
              <p className="text-xs text-muted-foreground">
                {lastRun ? lastRun.toLocaleDateString() : 'No tests run yet'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Test Results
            </CardTitle>
            <CardDescription>
              Detailed results for each golden dataset test
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Overall Status */}
              <div className="flex items-center gap-4">
                <Badge 
                  variant={testSummary.passed === testSummary.total ? 'default' : 'destructive'}
                  className="flex items-center gap-1"
                >
                  {testSummary.passed === testSummary.total ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
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
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      result.test_status === 'passed' ? 'border-green-200 bg-green-50' :
                      result.test_status === 'failed' ? 'border-red-200 bg-red-50' :
                      'border-yellow-200 bg-yellow-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {React.createElement(getStatusDisplay(result.test_status).icon, {
                          className: `w-5 h-5 mt-0.5 ${getStatusDisplay(result.test_status).color}`
                        })}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold capitalize">
                              {result.test_name.replace(/_/g, ' ')}
                            </h4>
                            <Badge 
                              variant={result.test_status === 'passed' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {result.test_status}
                            </Badge>
                          </div>
                          
                          {result.error_message && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {result.error_message}
                            </p>
                          )}

                          {/* Test Details */}
                          {showDetails && result.details && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 p-3 bg-white rounded border">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Player</p>
                                <p className="text-sm font-semibold">{result.details.player_name}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Matchup</p>
                                <p className="text-sm font-semibold">
                                  {result.details.team_abbrev} vs {result.details.opponent_abbrev}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Market</p>
                                <p className="text-sm font-semibold">{result.details.market}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Line</p>
                                <p className="text-sm font-semibold">{result.details.line}</p>
                              </div>
                            </div>
                          )}

                          {/* Performance Metrics */}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>⏱️ {result.execution_time_ms || 0}ms</span>
                            <span>📊 {result.props_found || 0} found</span>
                            <span>❌ {result.props_missing || 0} missing</span>
                            <span>🕒 {new Date(result.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            About Golden Dataset Tests
          </CardTitle>
          <CardDescription>
            These tests ensure the stable data architecture is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-blue-600 mb-2">Test Cases</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Joe Burrow passing yards (CIN vs BAL)</li>
                  <li>• Ja'Marr Chase receiving yards (CIN vs BAL)</li>
                  <li>• Aaron Rodgers passing TDs (NYJ vs BUF)</li>
                  <li>• Josh Allen rushing yards (BUF vs NYJ)</li>
                  <li>• Travis Kelce receptions (KC vs DEN)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-green-600 mb-2">Validation</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Player names are resolved (not "Unknown Player")</li>
                  <li>• Team logos are available and accessible</li>
                  <li>• Odds are numeric and valid</li>
                  <li>• Data flows correctly through normalized view</li>
                  <li>• Canonical mapping tables are working</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};