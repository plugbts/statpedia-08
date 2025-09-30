import { useEffect, useCallback, useState } from 'react';
import { githubSyncService } from '@/services/github-sync';

interface GitHubSyncState {
  isWatching: boolean;
  lastCommitHash: string | null;
  isConnected: boolean;
  error: string | null;
  lastSync: number | null;
  autoCommit: boolean;
  autoPush: boolean;
}

interface UseGitHubSyncOptions {
  onSyncStart?: () => void;
  onSyncComplete?: (data: any) => void;
  onSyncError?: (error: any) => void;
  onFileChange?: (filePath: string, action: string) => void;
  autoStart?: boolean;
}

export function useGitHubSync(options: UseGitHubSyncOptions = {}) {
  const {
    onSyncStart,
    onSyncComplete,
    onSyncError,
    onFileChange,
    autoStart = true,
  } = options;

  const [state, setState] = useState<GitHubSyncState>({
    isWatching: false,
    lastCommitHash: null,
    isConnected: false,
    error: null,
    lastSync: null,
    autoCommit: true,
    autoPush: true,
  });

  // Start watching
  const startWatching = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      onSyncStart?.();
      
      await githubSyncService.startWatching();
      
      setState(prev => ({
        ...prev,
        isWatching: true,
        isConnected: true,
        lastSync: Date.now(),
      }));
      
      onSyncComplete?.({ type: 'start', timestamp: Date.now() });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      onSyncError?.(error);
    }
  }, [onSyncStart, onSyncComplete, onSyncError]);

  // Stop watching
  const stopWatching = useCallback(async () => {
    try {
      await githubSyncService.stopWatching();
      
      setState(prev => ({
        ...prev,
        isWatching: false,
        isConnected: false,
      }));
      
      onSyncComplete?.({ type: 'stop', timestamp: Date.now() });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      onSyncError?.(error);
    }
  }, [onSyncComplete, onSyncError]);

  // Force sync to GitHub
  const forceSync = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      await githubSyncService.forceSync();
      
      setState(prev => ({
        ...prev,
        lastSync: Date.now(),
      }));
      
      onSyncComplete?.({ type: 'force-sync', timestamp: Date.now() });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      onSyncError?.(error);
    }
  }, [onSyncComplete, onSyncError]);

  // Force pull from GitHub
  const forcePull = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      await githubSyncService.forcePull();
      
      setState(prev => ({
        ...prev,
        lastSync: Date.now(),
      }));
      
      onSyncComplete?.({ type: 'force-pull', timestamp: Date.now() });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      onSyncError?.(error);
    }
  }, [onSyncComplete, onSyncError]);

  // Update configuration
  const updateConfig = useCallback((newConfig: any) => {
    githubSyncService.updateConfig(newConfig);
    setState(prev => ({
      ...prev,
      autoCommit: newConfig.autoCommit ?? prev.autoCommit,
      autoPush: newConfig.autoPush ?? prev.autoPush,
    }));
  }, []);

  // Get current status
  const getStatus = useCallback(() => {
    return githubSyncService.getStatus();
  }, []);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart) {
      startWatching();
    }

    return () => {
      stopWatching();
    };
  }, [autoStart, startWatching, stopWatching]);

  // Update status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const status = getStatus();
      setState(prev => ({
        ...prev,
        isWatching: status.isWatching,
        lastCommitHash: status.lastCommitHash,
      }));
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [getStatus]);

  return {
    ...state,
    startWatching,
    stopWatching,
    forceSync,
    forcePull,
    updateConfig,
    getStatus,
  };
}

// Hook for GitHub webhook integration
export function useGitHubWebhook(webhookSecret?: string) {
  const [webhookData, setWebhookData] = useState<any>(null);
  const [isWebhookActive, setIsWebhookActive] = useState(false);

  useEffect(() => {
    // Set up webhook listener
    const handleWebhook = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'github-webhook') {
          setWebhookData(data.payload);
          setIsWebhookActive(true);
          
          // Auto-pull changes when webhook is received
          githubSyncService.forcePull();
        }
      } catch (error) {
        console.error('Failed to process webhook data:', error);
      }
    };

    // Listen for webhook messages
    window.addEventListener('message', handleWebhook);

    return () => {
      window.removeEventListener('message', handleWebhook);
    };
  }, [webhookSecret]);

  return {
    webhookData,
    isWebhookActive,
  };
}

export default useGitHubSync;
