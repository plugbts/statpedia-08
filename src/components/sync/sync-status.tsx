import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useSync } from '@/hooks/use-sync';

interface SyncStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function SyncStatus({ className, showDetails = false }: SyncStatusProps) {
  const sync = useSync({
    enableLoveableSync: true,
    enableSupabaseRealtime: true,
  });

  const getStatusIcon = (isConnected: boolean, error: string | null) => {
    if (error) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (isConnected) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <WifiOff className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusText = (isConnected: boolean, error: string | null) => {
    if (error) return 'Error';
    if (isConnected) return 'Connected';
    return 'Disconnected';
  };

  const getStatusColor = (isConnected: boolean, error: string | null) => {
    if (error) return 'destructive';
    if (isConnected) return 'default';
    return 'secondary';
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1">
          {getStatusIcon(sync.isLoveableConnected, sync.error)}
          <span className="text-sm">Loveable</span>
        </div>
        <div className="flex items-center gap-1">
          {getStatusIcon(sync.isSupabaseConnected, sync.error)}
          <span className="text-sm">Supabase</span>
        </div>
        {sync.isFullyConnected && (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <Wifi className="h-3 w-3 mr-1" />
            Synced
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Sync Status
        </CardTitle>
        <CardDescription>
          Real-time synchronization status for Loveable and Supabase
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Loveable Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(sync.isLoveableConnected, sync.error)}
            <span className="font-medium">Loveable</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(sync.isLoveableConnected, sync.error) as any}>
              {getStatusText(sync.isLoveableConnected, sync.error)}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => sync.loveableSync.connect()}
              disabled={sync.isLoveableConnected}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Supabase Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(sync.isSupabaseConnected, sync.error)}
            <span className="font-medium">Supabase</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(sync.isSupabaseConnected, sync.error) as any}>
              {getStatusText(sync.isSupabaseConnected, sync.error)}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => sync.supabaseRealtime.connect()}
              disabled={sync.isSupabaseConnected}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Overall Status */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="font-medium">Overall Status</span>
            <Badge 
              variant={sync.isFullyConnected ? "default" : "secondary"}
              className={sync.isFullyConnected ? "bg-green-100 text-green-800" : ""}
            >
              {sync.isFullyConnected ? "Fully Synced" : "Partial Sync"}
            </Badge>
          </div>
        </div>

        {/* Last Sync */}
        {sync.lastSync && (
          <div className="text-sm text-muted-foreground">
            Last sync: {new Date(sync.lastSync).toLocaleTimeString()}
          </div>
        )}

        {/* Error Display */}
        {sync.error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            {sync.error}
          </div>
        )}

        {/* Sync Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => {
              sync.syncCode({ timestamp: Date.now(), action: 'test' });
            }}
            disabled={!sync.isLoveableConnected}
          >
            Test Code Sync
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              sync.syncUI({ timestamp: Date.now(), action: 'test' });
            }}
            disabled={!sync.isLoveableConnected}
          >
            Test UI Sync
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default SyncStatus;
