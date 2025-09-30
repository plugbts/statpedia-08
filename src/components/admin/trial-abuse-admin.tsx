import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  Users, 
  Globe, 
  Monitor, 
  Ban,
  RefreshCw,
  Eye,
  Clock
} from 'lucide-react';
import { trialAbusePreventionService } from '@/services/trial-abuse-prevention';
import { useToast } from '@/hooks/use-toast';

export const TrialAbuseAdmin: React.FC = () => {
  const [abuseLogs, setAbuseLogs] = useState<any[]>([]);
  const [ipUsage, setIpUsage] = useState<any[]>([]);
  const [macUsage, setMacUsage] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [logsData, ipData, macData] = await Promise.all([
        trialAbusePreventionService.getAbuseLogs(100),
        trialAbusePreventionService.getIPTrialUsage(100),
        trialAbusePreventionService.getMACTrialUsage(100)
      ]);
      
      setAbuseLogs(logsData);
      setIpUsage(ipData);
      setMacUsage(macData);
    } catch (error) {
      console.error('Failed to load abuse prevention data:', error);
      toast({
        title: "Error",
        description: "Failed to load abuse prevention data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAbuseTypeIcon = (type: string) => {
    switch (type) {
      case 'email_limit': return <Users className="w-4 h-4" />;
      case 'ip_limit': return <Globe className="w-4 h-4" />;
      case 'mac_limit': return <Monitor className="w-4 h-4" />;
      case 'suspicious_pattern': return <AlertTriangle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getAbuseTypeBadge = (type: string) => {
    switch (type) {
      case 'email_limit': return <Badge variant="destructive">Email Limit</Badge>;
      case 'ip_limit': return <Badge variant="destructive">IP Limit</Badge>;
      case 'mac_limit': return <Badge variant="destructive">Device Limit</Badge>;
      case 'suspicious_pattern': return <Badge variant="destructive">Suspicious</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trial Abuse Prevention</h2>
          <p className="text-muted-foreground">
            Monitor and manage free trial abuse attempts
          </p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="abuse-logs">Abuse Logs</TabsTrigger>
          <TabsTrigger value="ip-usage">IP Usage</TabsTrigger>
          <TabsTrigger value="mac-usage">Device Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Abuse Attempts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{abuseLogs.length}</div>
                <p className="text-xs text-muted-foreground">
                  Blocked attempts
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Unique IP Addresses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ipUsage.length}</div>
                <p className="text-xs text-muted-foreground">
                  Tracked IPs
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Unique Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{macUsage.length}</div>
                <p className="text-xs text-muted-foreground">
                  Tracked devices
                </p>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Abuse Prevention Rules:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• One free trial per email address</li>
                <li>• Maximum 2 free trials per IP address</li>
                <li>• Maximum 2 free trials per device (MAC address)</li>
                <li>• Automatic blocking for repeated abuse attempts</li>
              </ul>
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="abuse-logs" className="space-y-4">
          <div className="space-y-4">
            {abuseLogs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Shield className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No abuse attempts recorded</p>
                </CardContent>
              </Card>
            ) : (
              abuseLogs.map((log) => (
                <Card key={log.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getAbuseTypeIcon(log.abuse_type)}
                        <CardTitle className="text-lg">{log.email}</CardTitle>
                        {getAbuseTypeBadge(log.abuse_type)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(log.created_at)}
                      </div>
                    </div>
                    <CardDescription>
                      {log.blocked_reason}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">IP Address:</span>
                        <p className="text-muted-foreground">{log.ip_address}</p>
                      </div>
                      <div>
                        <span className="font-medium">Device:</span>
                        <p className="text-muted-foreground">{log.mac_address}</p>
                      </div>
                      <div>
                        <span className="font-medium">Trial Count:</span>
                        <p className="text-muted-foreground">{log.trial_count}</p>
                      </div>
                      <div>
                        <span className="font-medium">User Agent:</span>
                        <p className="text-muted-foreground truncate">{log.user_agent}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="ip-usage" className="space-y-4">
          <div className="space-y-4">
            {ipUsage.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Globe className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No IP usage data</p>
                </CardContent>
              </Card>
            ) : (
              ipUsage.map((usage) => (
                <Card key={usage.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <CardTitle className="text-lg">{usage.ip_address}</CardTitle>
                        {usage.is_blocked ? (
                          <Badge variant="destructive">Blocked</Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(usage.last_trial_at)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Trial Count:</span>
                        <p className="text-muted-foreground">{usage.trial_count}</p>
                      </div>
                      <div>
                        <span className="font-medium">First Trial:</span>
                        <p className="text-muted-foreground">{formatDate(usage.first_trial_at)}</p>
                      </div>
                      <div>
                        <span className="font-medium">Last Trial:</span>
                        <p className="text-muted-foreground">{formatDate(usage.last_trial_at)}</p>
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>
                        <p className="text-muted-foreground">
                          {usage.is_blocked ? 'Blocked' : 'Active'}
                        </p>
                      </div>
                    </div>
                    {usage.blocked_reason && (
                      <div className="mt-3 p-2 bg-destructive/10 rounded text-sm">
                        <span className="font-medium">Block Reason:</span> {usage.blocked_reason}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="mac-usage" className="space-y-4">
          <div className="space-y-4">
            {macUsage.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Monitor className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No device usage data</p>
                </CardContent>
              </Card>
            ) : (
              macUsage.map((usage) => (
                <Card key={usage.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        <CardTitle className="text-lg font-mono text-sm">{usage.mac_address}</CardTitle>
                        {usage.is_blocked ? (
                          <Badge variant="destructive">Blocked</Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(usage.last_trial_at)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Trial Count:</span>
                        <p className="text-muted-foreground">{usage.trial_count}</p>
                      </div>
                      <div>
                        <span className="font-medium">First Trial:</span>
                        <p className="text-muted-foreground">{formatDate(usage.first_trial_at)}</p>
                      </div>
                      <div>
                        <span className="font-medium">Last Trial:</span>
                        <p className="text-muted-foreground">{formatDate(usage.last_trial_at)}</p>
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>
                        <p className="text-muted-foreground">
                          {usage.is_blocked ? 'Blocked' : 'Active'}
                        </p>
                      </div>
                    </div>
                    {usage.blocked_reason && (
                      <div className="mt-3 p-2 bg-destructive/10 rounded text-sm">
                        <span className="font-medium">Block Reason:</span> {usage.blocked_reason}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
