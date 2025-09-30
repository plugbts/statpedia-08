import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Link, 
  Plus, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw
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

      {/* Coming Soon Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Coming Soon:</strong> Sportsbook API integrations are currently in development. 
          For now, you can manually track your bets using the bet entry form.
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
                    <Button size="sm" variant="outline" disabled>
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
    </div>
  );
};
