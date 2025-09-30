import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  GitBranch, 
  GitCommit, 
  GitPullRequest, 
  GitPush, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Settings,
  Download,
  Upload
} from 'lucide-react';
import { useGitHubSync } from '@/hooks/use-github-sync';

interface GitHubSyncStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function GitHubSyncStatus({ className, showDetails = false }: GitHubSyncStatusProps) {
  const githubSync = useGitHubSync({
    onSyncStart: () => console.log('GitHub sync started'),
    onSyncComplete: (data) => console.log('GitHub sync completed:', data),
    onSyncError: (error) => console.error('GitHub sync error:', error),
    onFileChange: (filePath, action) => console.log(`File ${action}:`, filePath),
  });

  const getStatusIcon = (isConnected: boolean, error: string | null) => {
    if (error) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (isConnected) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
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

  const formatCommitHash = (hash: string | null) => {
    if (!hash) return 'Unknown';
    return hash.substring(0, 7);
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1">
          {getStatusIcon(githubSync.isConnected, githubSync.error)}
          <span className="text-sm">GitHub</span>
        </div>
        {githubSync.lastCommitHash && (
          <Badge variant="outline" className="text-xs">
            <GitCommit className="h-3 w-3 mr-1" />
            {formatCommitHash(githubSync.lastCommitHash)}
          </Badge>
        )}
        {githubSync.isWatching && (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Syncing
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          GitHub Sync Status
        </CardTitle>
        <CardDescription>
          Real-time synchronization with your GitHub repository
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(githubSync.isConnected, githubSync.error)}
            <span className="font-medium">Connection</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(githubSync.isConnected, githubSync.error) as any}>
              {getStatusText(githubSync.isConnected, githubSync.error)}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={githubSync.isWatching ? githubSync.stopWatching : githubSync.startWatching}
            >
              {githubSync.isWatching ? 'Stop' : 'Start'}
            </Button>
          </div>
        </div>

        {/* Last Commit */}
        {githubSync.lastCommitHash && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCommit className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Last Commit</span>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {formatCommitHash(githubSync.lastCommitHash)}
            </Badge>
          </div>
        )}

        {/* Last Sync */}
        {githubSync.lastSync && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Last Sync</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {new Date(githubSync.lastSync).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Sync Settings */}
        <div className="pt-2 border-t space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="auto-commit" className="font-medium">Auto Commit</Label>
            </div>
            <Switch
              id="auto-commit"
              checked={githubSync.autoCommit}
              onCheckedChange={(checked) => 
                githubSync.updateConfig({ autoCommit: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitPush className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="auto-push" className="font-medium">Auto Push</Label>
            </div>
            <Switch
              id="auto-push"
              checked={githubSync.autoPush}
              onCheckedChange={(checked) => 
                githubSync.updateConfig({ autoPush: checked })
              }
            />
          </div>
        </div>

        {/* Error Display */}
        {githubSync.error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            {githubSync.error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={githubSync.forceSync}
            disabled={!githubSync.isConnected}
            className="flex-1"
          >
            <Upload className="h-3 w-3 mr-1" />
            Push Changes
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={githubSync.forcePull}
            disabled={!githubSync.isConnected}
            className="flex-1"
          >
            <Download className="h-3 w-3 mr-1" />
            Pull Changes
          </Button>
        </div>

        {/* Sync Status Summary */}
        <div className="pt-2 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Watching:</strong> {githubSync.isWatching ? '✅ Active' : '❌ Inactive'}
            </div>
            <div>
              <strong>Auto Commit:</strong> {githubSync.autoCommit ? '✅ Enabled' : '❌ Disabled'}
            </div>
            <div>
              <strong>Auto Push:</strong> {githubSync.autoPush ? '✅ Enabled' : '❌ Disabled'}
            </div>
            <div>
              <strong>Status:</strong> {githubSync.isConnected ? '✅ Connected' : '❌ Disconnected'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default GitHubSyncStatus;
