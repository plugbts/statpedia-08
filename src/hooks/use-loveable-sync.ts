import { useEffect, useCallback, useState } from 'react';
import { loveableClient } from '@/integrations/loveable/client';

interface LoveableSyncState {
  isConnected: boolean;
  lastSync: number | null;
  error: string | null;
}

interface UseLoveableSyncOptions {
  onCodeSync?: (data: any) => void;
  onUISync?: (data: any) => void;
  onConfigSync?: (data: any) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: any) => void;
}

export function useLoveableSync(options: UseLoveableSyncOptions = {}) {
  const [state, setState] = useState<LoveableSyncState>({
    isConnected: false,
    lastSync: null,
    error: null,
  });

  const {
    onCodeSync,
    onUISync,
    onConfigSync,
    onConnected,
    onDisconnected,
    onError,
  } = options;

  // Sync functions
  const syncCode = useCallback((codeData: any) => {
    loveableClient.syncCode(codeData);
    setState(prev => ({ ...prev, lastSync: Date.now() }));
  }, []);

  const syncUI = useCallback((uiData: any) => {
    loveableClient.syncUI(uiData);
    setState(prev => ({ ...prev, lastSync: Date.now() }));
  }, []);

  const syncConfig = useCallback((configData: any) => {
    loveableClient.syncConfig(configData);
    setState(prev => ({ ...prev, lastSync: Date.now() }));
  }, []);

  // Event handlers
  const handleConnected = useCallback(() => {
    setState(prev => ({ ...prev, isConnected: true, error: null }));
    onConnected?.();
  }, [onConnected]);

  const handleDisconnected = useCallback(() => {
    setState(prev => ({ ...prev, isConnected: false }));
    onDisconnected?.();
  }, [onDisconnected]);

  const handleError = useCallback((event: CustomEvent) => {
    const error = event.detail?.error || 'Unknown error';
    setState(prev => ({ ...prev, error: error.toString() }));
    onError?.(event.detail);
  }, [onError]);

  const handleCodeSync = useCallback((event: CustomEvent) => {
    onCodeSync?.(event.detail);
  }, [onCodeSync]);

  const handleUISync = useCallback((event: CustomEvent) => {
    onUISync?.(event.detail);
  }, [onUISync]);

  const handleConfigSync = useCallback((event: CustomEvent) => {
    onConfigSync?.(event.detail);
  }, [onConfigSync]);

  // Set up event listeners
  useEffect(() => {
    const events = [
      { name: 'loveable:connected', handler: handleConnected },
      { name: 'loveable:disconnected', handler: handleDisconnected },
      { name: 'loveable:error', handler: handleError },
      { name: 'loveable:code-sync', handler: handleCodeSync },
      { name: 'loveable:ui-sync', handler: handleUISync },
      { name: 'loveable:config-sync', handler: handleConfigSync },
    ];

    events.forEach(({ name, handler }) => {
      window.addEventListener(name, handler as EventListener);
    });

    return () => {
      events.forEach(({ name, handler }) => {
        window.removeEventListener(name, handler as EventListener);
      });
    };
  }, [handleConnected, handleDisconnected, handleError, handleCodeSync, handleUISync, handleConfigSync]);

  // Auto-connect on mount
  useEffect(() => {
    if (!state.isConnected) {
      loveableClient.connect().catch((error) => {
        setState(prev => ({ ...prev, error: error.toString() }));
      });
    }
  }, [state.isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      loveableClient.disconnect();
    };
  }, []);

  return {
    ...state,
    syncCode,
    syncUI,
    syncConfig,
    connect: () => loveableClient.connect(),
    disconnect: () => loveableClient.disconnect(),
  };
}
