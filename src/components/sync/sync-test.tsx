import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSync } from '@/hooks/use-sync';
import { useGitHubSync } from '@/hooks/use-github-sync';
import { SyncStatus } from './sync-status';
import { GitHubSyncStatus } from './github-sync-status';
import { Code, Palette, Database, Settings, GitBranch } from 'lucide-react';

export function SyncTest() {
  const sync = useSync({
    enableLoveableSync: true,
    enableSupabaseRealtime: true,
    onSyncSuccess: (event) => {
      console.log('Sync successful:', event);
      setLastSyncEvent(event);
    },
    onSyncError: (error) => {
      console.error('Sync error:', error);
      setLastError(error);
    },
  });

  const githubSync = useGitHubSync({
    onSyncStart: () => console.log('GitHub sync started'),
    onSyncComplete: (data) => {
      console.log('GitHub sync completed:', data);
      setLastSyncEvent({ ...data, source: 'github' });
    },
    onSyncError: (error) => {
      console.error('GitHub sync error:', error);
      setLastError({ ...error, source: 'github' });
    },
    onFileChange: (filePath, action) => {
      console.log(`GitHub file ${action}:`, filePath);
    },
  });

  const [lastSyncEvent, setLastSyncEvent] = useState<any>(null);
  const [lastError, setLastError] = useState<any>(null);
  const [testData, setTestData] = useState({
    code: 'console.log("Hello from Statpedia!");',
    ui: '{"component": "Button", "props": {"variant": "primary"}}',
    config: '{"theme": "dark", "language": "en"}',
  });

  const handleCodeSync = () => {
    sync.syncCode({
      type: 'test',
      content: testData.code,
      timestamp: Date.now(),
    });
  };

  const handleUISync = () => {
    sync.syncUI({
      type: 'test',
      component: JSON.parse(testData.ui),
      timestamp: Date.now(),
    });
  };

  const handleConfigSync = () => {
    sync.syncConfig({
      type: 'test',
      config: JSON.parse(testData.config),
      timestamp: Date.now(),
    });
  };

  const handleDataSync = () => {
    sync.syncData('profiles', 'create', {
      display_name: 'Test User',
      bio: 'Testing sync functionality',
      created_at: new Date().toISOString(),
    });
  };

  const handleGitHubSync = () => {
    githubSync.forceSync();
  };

  const handleGitHubPull = () => {
    githubSync.forcePull();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Sync Test Panel
          </CardTitle>
          <CardDescription>
            Test the real-time synchronization between Loveable and Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sync Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SyncStatus showDetails={true} />
            <GitHubSyncStatus showDetails={true} />
          </div>

          {/* Test Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Code Sync Test */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Code className="h-4 w-4" />
                  Code Sync Test
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="code-input">Code Content</Label>
                  <Textarea
                    id="code-input"
                    value={testData.code}
                    onChange={(e) => setTestData(prev => ({ ...prev, code: e.target.value }))}
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={handleCodeSync} 
                  disabled={!sync.isLoveableConnected}
                  className="w-full"
                >
                  Sync Code
                </Button>
              </CardContent>
            </Card>

            {/* UI Sync Test */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Palette className="h-4 w-4" />
                  UI Sync Test
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="ui-input">UI Component JSON</Label>
                  <Textarea
                    id="ui-input"
                    value={testData.ui}
                    onChange={(e) => setTestData(prev => ({ ...prev, ui: e.target.value }))}
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={handleUISync} 
                  disabled={!sync.isLoveableConnected}
                  className="w-full"
                >
                  Sync UI
                </Button>
              </CardContent>
            </Card>

            {/* Config Sync Test */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Settings className="h-4 w-4" />
                  Config Sync Test
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="config-input">Configuration JSON</Label>
                  <Textarea
                    id="config-input"
                    value={testData.config}
                    onChange={(e) => setTestData(prev => ({ ...prev, config: e.target.value }))}
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={handleConfigSync} 
                  disabled={!sync.isLoveableConnected}
                  className="w-full"
                >
                  Sync Config
                </Button>
              </CardContent>
            </Card>

            {/* Data Sync Test */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Database className="h-4 w-4" />
                  Data Sync Test
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Supabase Data Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Creates a test profile in the database
                  </p>
                </div>
                <Button 
                  onClick={handleDataSync} 
                  disabled={!sync.isSupabaseConnected}
                  className="w-full"
                >
                  Sync Data
                </Button>
              </CardContent>
            </Card>

            {/* GitHub Sync Test */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <GitBranch className="h-4 w-4" />
                  GitHub Sync Test
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>GitHub Repository Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Sync changes with your GitHub repository
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleGitHubSync} 
                    disabled={!githubSync.isConnected}
                    className="flex-1"
                  >
                    Push Changes
                  </Button>
                  <Button 
                    onClick={handleGitHubPull} 
                    disabled={!githubSync.isConnected}
                    variant="outline"
                    className="flex-1"
                  >
                    Pull Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Last Sync Event */}
          {lastSyncEvent && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Last Sync Event</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify(lastSyncEvent, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Last Error */}
          {lastError && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-red-600">Last Error</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-red-50 p-2 rounded overflow-auto text-red-700">
                  {JSON.stringify(lastError, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Connection Status Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Connection Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Loveable:</strong> {sync.isLoveableConnected ? '✅ Connected' : '❌ Disconnected'}
                </div>
                <div>
                  <strong>Supabase:</strong> {sync.isSupabaseConnected ? '✅ Connected' : '❌ Disconnected'}
                </div>
                <div>
                  <strong>GitHub:</strong> {githubSync.isConnected ? '✅ Connected' : '❌ Disconnected'}
                </div>
                <div>
                  <strong>GitHub Watching:</strong> {githubSync.isWatching ? '✅ Active' : '❌ Inactive'}
                </div>
                <div>
                  <strong>Overall:</strong> {sync.isFullyConnected && githubSync.isConnected ? '✅ Fully Synced' : '⚠️ Partial Sync'}
                </div>
                <div>
                  <strong>Last Sync:</strong> {sync.lastSync ? new Date(sync.lastSync).toLocaleTimeString() : 'Never'}
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}

export default SyncTest;
