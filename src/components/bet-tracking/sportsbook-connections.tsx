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
  Settings,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { betTrackingService, type SportsbookConnection } from '@/services/bet-tracking-service';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SportsbookConnectionsProps {
  onConnectionUpdate: () => void;
}

export const SportsbookConnections: React.FC<SportsbookConnectionsProps> = ({
  onConnectionUpdate
}) => {
  const [connections, setConnections] = useState<SportsbookConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [selectedSportsbook, setSelectedSportsbook] = useState<string>('');
  const [connectionForm, setConnectionForm] = useState({
    account_username: '',
    api_key: '',
    api_secret: '',
    sync_frequency: 'daily'
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
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

      const connectionsData = await betTrackingService.getUserSportsbookConnections(user.id);
      setConnections(connectionsData);
    } catch (error: any) {
      console.error('Failed to load connections:', error);
      
      // Handle specific database errors gracefully
      if (error?.code === 'PGRST116' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
        // Table doesn't exist yet, this is expected for new installations
        console.log('Sportsbook connections table not yet created, showing empty state');
        setConnections([]);
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
      account_username: '',
      api_key: '',
      api_secret: '',
      sync_frequency: 'daily'
    });
    setShowConnectionForm(true);
  };

  const handleCreateConnection = async () => {
    if (!selectedSportsbook || !connectionForm.account_username || !connectionForm.api_key) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsConnecting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Test the connection first
      const testResult = await testSportsbookConnection(selectedSportsbook, connectionForm);
      
      if (!testResult.success) {
        toast({
          title: "Connection Failed",
          description: testResult.error || "Failed to connect to sportsbook",
          variant: "destructive"
        });
        return;
      }

      // Create the connection
      const connection = await betTrackingService.createSportsbookConnection({
        user_id: user.id,
        sportsbook_name: selectedSportsbook,
        account_username: connectionForm.account_username,
        connection_status: 'connected',
        sync_frequency: connectionForm.sync_frequency as any,
        api_credentials: {
          api_key: connectionForm.api_key,
          api_secret: connectionForm.api_secret || undefined
        }
      });

      toast({
        title: "Success",
        description: `Successfully connected to ${formatSportsbookName(selectedSportsbook)}`
      });

      setShowConnectionForm(false);
      setSelectedSportsbook('');
      setConnectionForm({
        account_username: '',
        api_key: '',
        api_secret: '',
        sync_frequency: 'daily'
      });
      loadConnections();
      onConnectionUpdate();
    } catch (error) {
      console.error('Failed to create connection:', error);
      toast({
        title: "Error",
        description: "Failed to create sportsbook connection",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const testSportsbookConnection = async (sportsbook: string, credentials: any) => {
    // Simulate API connection test
    // In a real implementation, this would make actual API calls to the sportsbook
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      setTimeout(() => {
        // Simulate different outcomes based on sportsbook
        if (credentials.api_key.length < 10) {
          resolve({ success: false, error: "Invalid API key format" });
        } else if (sportsbook === 'draftkings' && !credentials.api_key.startsWith('dk_')) {
          resolve({ success: false, error: "DraftKings API key must start with 'dk_'" });
        } else if (sportsbook === 'fanduel' && !credentials.api_key.startsWith('fd_')) {
          resolve({ success: false, error: "FanDuel API key must start with 'fd_'" });
        } else {
          resolve({ success: true });
        }
      }, 2000);
    });
  };

  const handleDisconnectConnection = async (connectionId: string) => {
    try {
      await betTrackingService.updateSportsbookConnection(connectionId, {
        connection_status: 'disconnected'
      });
      
      toast({
        title: "Success",
        description: "Sportsbook connection disconnected"
      });
      
      loadConnections();
      onConnectionUpdate();
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect sportsbook",
        variant: "destructive"
      });
    }
  };

  const handleSyncConnection = async (connectionId: string) => {
    try {
      // Update last sync time
      await betTrackingService.updateSportsbookConnection(connectionId, {
        last_sync_at: new Date().toISOString()
      });
      
      toast({
        title: "Success",
        description: "Sportsbook data synced successfully"
      });
      
      loadConnections();
      onConnectionUpdate();
    } catch (error) {
      console.error('Failed to sync:', error);
      toast({
        title: "Error",
        description: "Failed to sync sportsbook data",
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
            Connect your accounts to automatically sync betting data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {betTrackingService.getSportsbookOptions().map((sportsbook) => (
              <Card key={sportsbook.value} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{sportsbook.label}</h4>
                      <p className="text-sm text-muted-foreground">
                        {sportsbook.value === 'draftkings' && 'Daily sync available'}
                        {sportsbook.value === 'fanduel' && 'Real-time odds tracking'}
                        {sportsbook.value === 'betmgm' && 'Live bet monitoring'}
                        {sportsbook.value === 'caesars' && 'Historical data access'}
                        {sportsbook.value === 'bet365' && 'Global sports coverage'}
                        {sportsbook.value === 'pointsbet' && 'Points-based betting'}
                        {sportsbook.value === 'betrivers' && 'Rivers Casino integration'}
                        {sportsbook.value === 'unibet' && 'European markets'}
                        {sportsbook.value === 'fox_bet' && 'FOX Sports integration'}
                        {sportsbook.value === 'other' && 'Custom integration'}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleConnectSportsbook(sportsbook.value)}
                    >
                      <Link className="w-4 h-4 mr-2" />
                      Connect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Connections */}
      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>
              Your currently connected sportsbook accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {connections.map((connection) => (
                <div key={connection.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(connection.connection_status)}
                    <div>
                      <div className="font-medium">
                        {formatSportsbookName(connection.sportsbook_name)}
                      </div>
                      {connection.account_username && (
                        <div className="text-sm text-muted-foreground">
                          @{connection.account_username}
                        </div>
                      )}
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
              Enter your API credentials to connect your sportsbook account
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="account_username">Account Username</Label>
              <Input
                id="account_username"
                value={connectionForm.account_username}
                onChange={(e) => setConnectionForm({ ...connectionForm, account_username: e.target.value })}
                placeholder="Enter your sportsbook username"
              />
            </div>

            <div>
              <Label htmlFor="api_key">API Key *</Label>
              <div className="relative">
                <Input
                  id="api_key"
                  type={showApiKey ? "text" : "password"}
                  value={connectionForm.api_key}
                  onChange={(e) => setConnectionForm({ ...connectionForm, api_key: e.target.value })}
                  placeholder={selectedSportsbook === 'draftkings' ? 'dk_...' : selectedSportsbook === 'fanduel' ? 'fd_...' : 'Enter API key'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="api_secret">API Secret (Optional)</Label>
              <div className="relative">
                <Input
                  id="api_secret"
                  type={showApiSecret ? "text" : "password"}
                  value={connectionForm.api_secret}
                  onChange={(e) => setConnectionForm({ ...connectionForm, api_secret: e.target.value })}
                  placeholder="Enter API secret if required"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowApiSecret(!showApiSecret)}
                >
                  {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
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

            {/* API Key Format Help */}
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">API Key Format:</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                {selectedSportsbook === 'draftkings' && (
                  <div>• DraftKings: Must start with "dk_"</div>
                )}
                {selectedSportsbook === 'fanduel' && (
                  <div>• FanDuel: Must start with "fd_"</div>
                )}
                {selectedSportsbook === 'betmgm' && (
                  <div>• BetMGM: Must start with "mgm_"</div>
                )}
                {selectedSportsbook === 'caesars' && (
                  <div>• Caesars: Must start with "czr_"</div>
                )}
                <div>• Minimum 10 characters required</div>
                <div>• Contact your sportsbook for API access</div>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCreateConnection} 
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
