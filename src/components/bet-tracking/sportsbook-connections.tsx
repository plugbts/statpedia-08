import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Link, 
  Plus, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Trash2
} from 'lucide-react';
import { sportsbookOAuthService, type OAuthConnection } from '@/services/sportsbook-oauth-service';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SportsbookConnectionsProps {
  onConnectionUpdate: () => void;
}

export const SportsbookConnections: React.FC<SportsbookConnectionsProps> = ({
  onConnectionUpdate
}) => {
  const [oauthConnections, setOauthConnections] = useState<OAuthConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [selectedSportsbook, setSelectedSportsbook] = useState<string>('');
  const [connectionForm, setConnectionForm] = useState({
    sync_frequency: 'daily'
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load OAuth connections only
      const oauthConnectionsData = await sportsbookOAuthService.getUserOAuthConnections(user.id);
      setOauthConnections(oauthConnectionsData);
    } catch (error: any) {
      console.error('Failed to load connections:', error);
      
      // Handle specific database errors gracefully
      if (error?.code === 'PGRST116' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
        // Table doesn't exist yet, this is expected for new installations
        console.log('OAuth connections table not yet created, showing empty state');
        setOauthConnections([]);
      } else {
        toast({
          title: "Error",
          description: "Failed to load sportsbook connections",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'disconnected': return <XCircle className="w-4 h-4 text-muted-foreground" />;
      default: return <AlertCircle className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected': return <Badge variant="default" className="bg-success">Connected</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      case 'disconnected': return <Badge variant="secondary">Disconnected</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  const formatSportsbookName = (name: string) => {
    return name.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handleConnectSportsbook = (sportsbookName: string) => {
    setSelectedSportsbook(sportsbookName);
    setConnectionForm({
      sync_frequency: 'daily'
    });
    setShowConnectionForm(true);
  };

  const handleCreateConnection = async () => {
    if (!selectedSportsbook) {
      toast({
        title: "Error",
        description: "Please select a sportsbook",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsConnecting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use OAuth flow (like Pikkit)
      const { url, state } = sportsbookOAuthService.generateAuthUrl(selectedSportsbook);
      
      // Create OAuth connection record
      await sportsbookOAuthService.createOAuthConnection(user.id, selectedSportsbook, state);
      
      // Redirect to OAuth URL
      window.location.href = url;
    } catch (error: any) {
      console.error('Failed to create connection:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create sportsbook connection",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };


  const handleDisconnectConnection = async (connectionId: string) => {
    try {
      await sportsbookOAuthService.disconnectOAuthConnection(connectionId);
      
      toast({
        title: "Success",
        description: "Sportsbook connection disconnected"
      });
      
      loadConnections();
      onConnectionUpdate();
    } catch (error: any) {
      console.error('Failed to disconnect:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect sportsbook",
        variant: "destructive"
      });
    }
  };

  const handleSyncConnection = async (connectionId: string) => {
    try {
      // Use OAuth sync (like Pikkit)
      const result = await sportsbookOAuthService.syncBetsFromSportsbook(connectionId);
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Synced ${result.bets_synced} bets from sportsbook`
        });
      } else {
        toast({
          title: "Sync Failed",
          description: result.error || "Failed to sync sportsbook data",
          variant: "destructive"
        });
      }
      
      loadConnections();
      onConnectionUpdate();
    } catch (error: any) {
      console.error('Failed to sync:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sync sportsbook data",
        variant: "destructive"
      });
    }
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
          <h3 className="text-lg font-semibold">Sportsbook Connections</h3>
          <p className="text-sm text-muted-foreground">
            Connect your sportsbook accounts to automatically sync bet data
          </p>
        </div>
        <Button onClick={loadConnections} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Connection Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Sportsbook Connections:</strong> Connect your sportsbook accounts to automatically sync bet data. 
          You can also manually track bets using the bet entry form.
        </AlertDescription>
      </Alert>

      {/* Available Sportsbooks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Available Sportsbooks
          </CardTitle>
          <CardDescription>
            Connect your accounts using OAuth (like Pikkit) to automatically sync betting data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sportsbookOAuthService.getSupportedSportsbooks().map((sportsbook) => (
              <Card key={sportsbook.value} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{sportsbook.label}</h4>
                      <p className="text-sm text-muted-foreground">
                        {sportsbook.oauth_available ? 'OAuth connection available' : 'Coming soon'}
                      </p>
                      {sportsbook.oauth_available && (
                        <Badge variant="default" className="mt-1 text-xs">
                          OAuth Ready
                        </Badge>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleConnectSportsbook(sportsbook.value)}
                      disabled={!sportsbook.oauth_available}
                    >
                      <Link className="w-4 h-4 mr-2" />
                      {sportsbook.oauth_available ? 'Connect' : 'Coming Soon'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current OAuth Connections */}
      {oauthConnections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>
              Your currently connected sportsbook accounts using OAuth
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {oauthConnections.map((connection) => (
                <div key={connection.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(connection.connection_status)}
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {formatSportsbookName(connection.sportsbook_name)}
                        <Badge variant="outline" className="text-xs">
                          OAuth
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Connected {new Date(connection.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(connection.connection_status)}
                    {connection.last_sync_at && (
                      <div className="text-xs text-muted-foreground">
                        Last sync: {new Date(connection.last_sync_at).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex gap-1 ml-2">
                      {connection.connection_status === 'connected' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSyncConnection(connection.id)}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDisconnectConnection(connection.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Tracking Info */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Bet Tracking</CardTitle>
          <CardDescription>
            While we work on API integrations, you can manually track your bets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-sm">Track individual bets with detailed information</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-sm">Calculate ROI and win percentages automatically</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-sm">Connect bets to Statpedia predictions for impact analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-sm">Monthly analytics and performance tracking</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Form Dialog */}
      <AlertDialog open={showConnectionForm} onOpenChange={setShowConnectionForm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Connect to {formatSportsbookName(selectedSportsbook)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Connect using OAuth (like Pikkit) for secure, automatic bet syncing
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold">O</span>
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">OAuth Connection</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    You'll be redirected to {formatSportsbookName(selectedSportsbook)} to securely authorize the connection. 
                    No passwords or API keys needed!
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="sync_frequency">Sync Frequency</Label>
              <Select
                value={connectionForm.sync_frequency}
                onValueChange={(value) => setConnectionForm({ ...connectionForm, sync_frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* OAuth Benefits */}
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">OAuth Benefits:</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Secure authentication without sharing passwords</div>
                <div>• Automatic bet data synchronization</div>
                <div>• Real-time updates from your sportsbook</div>
                <div>• No need to manage API keys</div>
                <div>• Works like Pikkit and other professional tools</div>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateConnection}
              disabled={isConnecting}
            >
              {isConnecting ? 'Redirecting...' : 'Connect with OAuth'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
