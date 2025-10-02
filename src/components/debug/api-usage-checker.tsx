import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { sportsGameOddsAPI } from '@/services/sportsgameodds-api';
import { logAPI, logSuccess, logError, logWarning } from '@/utils/console-logger';

interface APIUsageStats {
  totalCalls: number;
  callsToday: number;
  maxDailyCalls: number;
  usagePercentage: number;
  lastResetDate: string;
  callsByEndpoint: { [key: string]: number };
  isNearLimit: boolean;
  isAtLimit: boolean;
  cacheHitRate?: number;
  recommendations?: string[];
}

export const APIUsageChecker: React.FC = () => {
  const [usageStats, setUsageStats] = useState<APIUsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testingNFL, setTestingNFL] = useState(false);
  const [nflTestResult, setNflTestResult] = useState<string | null>(null);
  const [rateLimitStatus, setRateLimitStatus] = useState<any>(null);
  const [apiKeyInfo, setApiKeyInfo] = useState<any>(null);

  // Load usage stats
  const loadUsageStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      logAPI('APIUsageChecker', 'Loading SportGameOdds API usage statistics');
      
      // Get usage stats from the API service
      const stats = sportsGameOddsAPI.getUsageStats();
      const detailedStats = sportsGameOddsAPI.getDetailedUsageStats();
      const rateLimitInfo = sportsGameOddsAPI.getRateLimitStatus();
      const keyInfo = sportsGameOddsAPI.getAPIKeyInfo();
      
      setUsageStats({
        ...stats,
        ...detailedStats
      });
      
      setRateLimitStatus(rateLimitInfo);
      setApiKeyInfo(keyInfo);
      
      logSuccess('APIUsageChecker', 'Successfully loaded usage statistics');
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load usage stats';
      setError(message);
      logError('APIUsageChecker', 'Failed to load usage stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Test NFL API endpoint specifically
  const testNFLEndpoint = async () => {
    setTestingNFL(true);
    setNflTestResult(null);
    
    try {
      logAPI('APIUsageChecker', 'Testing NFL endpoint for rate limiting');
      
      // Try to fetch NFL player props
      const nflProps = await sportsGameOddsAPI.getPlayerProps('nfl');
      
      if (nflProps.length > 0) {
        setNflTestResult(`✅ Success: Retrieved ${nflProps.length} NFL player props`);
        logSuccess('APIUsageChecker', `NFL test successful: ${nflProps.length} props retrieved`);
      } else {
        setNflTestResult('⚠️ Warning: NFL endpoint returned no data (may be rate limited or no games available)');
        logWarning('APIUsageChecker', 'NFL test returned no data');
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'NFL test failed';
      
      if (message.includes('Rate limit')) {
        setNflTestResult(`🚫 Rate Limited: ${message}`);
        logWarning('APIUsageChecker', 'NFL endpoint is rate limited:', err);
      } else {
        setNflTestResult(`❌ Error: ${message}`);
        logError('APIUsageChecker', 'NFL test failed:', err);
      }
    } finally {
      setTestingNFL(false);
    }
  };

  // Reset usage stats
  const resetUsageStats = () => {
    sportsGameOddsAPI.resetUsageStats();
    loadUsageStats();
  };

  // Clear cache
  const clearCache = () => {
    sportsGameOddsAPI.clearPlayerPropsCache();
    loadUsageStats();
  };

  useEffect(() => {
    loadUsageStats();
  }, []);

  const getUsageStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'destructive';
    if (percentage >= 70) return 'secondary';
    return 'default';
  };

  const getUsageStatusText = (stats: APIUsageStats) => {
    if (stats.isAtLimit) return 'At Limit';
    if (stats.isNearLimit) return 'Near Limit';
    return 'Normal';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            SportGameOdds API Usage Monitor
            <div className="flex gap-2">
              <Button 
                onClick={loadUsageStats} 
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
              <Button 
                onClick={testNFLEndpoint} 
                disabled={testingNFL}
                variant="outline"
                size="sm"
              >
                {testingNFL ? 'Testing NFL...' : 'Test NFL'}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Monitor API usage, rate limits, and test specific endpoints
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {nflTestResult && (
            <Alert>
              <AlertDescription>{nflTestResult}</AlertDescription>
            </Alert>
          )}

          {usageStats && (
            <>
              {/* Rate Limit Status */}
              {rateLimitStatus && (
                <Alert variant={rateLimitStatus.status === 'RATE_LIMITED' ? 'destructive' : 'default'}>
                  <AlertDescription>
                    <strong>Rate Limit Status:</strong> {rateLimitStatus.message}
                    {rateLimitStatus.waitTime && (
                      <div className="mt-1">
                        Next API call available in: {Math.ceil(rateLimitStatus.waitTime / 1000)} seconds
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Usage Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{usageStats.callsToday}</div>
                  <div className="text-sm text-muted-foreground">Calls Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{usageStats.maxDailyCalls}</div>
                  <div className="text-sm text-muted-foreground">Daily Limit</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{usageStats.usagePercentage}%</div>
                  <div className="text-sm text-muted-foreground">Usage</div>
                </div>
                <div className="text-center">
                  <Badge variant={rateLimitStatus?.status === 'RATE_LIMITED' ? 'destructive' : getUsageStatusColor(usageStats.usagePercentage)}>
                    {rateLimitStatus?.status === 'RATE_LIMITED' ? 'Rate Limited' : getUsageStatusText(usageStats)}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* API Key & Subscription Information */}
              {apiKeyInfo && (
                <>
                  <div className="space-y-2">
                    <h4 className="font-semibold">API Key & Subscription</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">API Key:</span> {apiKeyInfo.keyPrefix}...{apiKeyInfo.keySuffix}
                      </div>
                      <div>
                        <span className="font-medium">Status:</span> 
                        <Badge variant={apiKeyInfo.isConfigured ? 'default' : 'destructive'} className="ml-2">
                          {apiKeyInfo.keyStatus}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">Plan Type:</span> {apiKeyInfo.planType}
                      </div>
                      <div>
                        <span className="font-medium">Daily Limit:</span> {apiKeyInfo.currentLimit} calls
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Last Validated:</span> {new Date(apiKeyInfo.lastValidated).toLocaleString()}
                      </div>
                    </div>
                    {apiKeyInfo.estimatedDailyLimit !== apiKeyInfo.currentLimit && (
                      <Alert>
                        <AlertDescription>
                          <strong>Note:</strong> The estimated daily limit ({apiKeyInfo.estimatedDailyLimit}) differs from the configured limit ({apiKeyInfo.currentLimit}). 
                          Please verify your subscription plan in the SportGameOdds dashboard.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {/* Cache Information */}
              <div className="space-y-2">
                <h4 className="font-semibold">Cache Status</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Cache Hit Rate:</span> {usageStats.cacheHitRate || 0}%
                  </div>
                  <div>
                    <span className="font-medium">Cache Status:</span> {sportsGameOddsAPI.getPlayerPropsCacheStatus()}
                  </div>
                  <div>
                    <span className="font-medium">Last Update:</span> {sportsGameOddsAPI.getLastCacheUpdate()}
                  </div>
                  <div>
                    <span className="font-medium">Cached Sports:</span> {sportsGameOddsAPI.getCachedSports().join(', ') || 'None'}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Endpoint Usage */}
              <div className="space-y-2">
                <h4 className="font-semibold">Endpoint Usage</h4>
                <div className="space-y-1">
                  {Object.entries(usageStats.callsByEndpoint).map(([endpoint, count]) => (
                    <div key={endpoint} className="flex justify-between text-sm">
                      <span className="font-mono text-xs">{endpoint}</span>
                      <span>{count} calls</span>
                    </div>
                  ))}
                  {Object.keys(usageStats.callsByEndpoint).length === 0 && (
                    <div className="text-sm text-muted-foreground">No API calls made yet</div>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              {usageStats.recommendations && usageStats.recommendations.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-semibold">Recommendations</h4>
                    <ul className="space-y-1">
                      {usageStats.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm">{rec}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={resetUsageStats} variant="outline" size="sm">
                  Reset Usage Stats
                </Button>
                <Button onClick={clearCache} variant="outline" size="sm">
                  Clear Cache
                </Button>
              </div>

              {/* API Key Info */}
              <div className="text-xs text-muted-foreground">
                <div>API Key: d5dc1f00bc42133550bc1605dd8f457f</div>
                <div>Last Reset: {usageStats.lastResetDate}</div>
                <div>Total Calls: {usageStats.totalCalls}</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
