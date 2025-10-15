import { useEffect, useCallback, useState } from 'react';
import { syncService } from '@/services/sync-service';
import { useLoveableSync } from './use-loveable-sync';
// Removed Supabase realtime - using Hasura + Neon only

// Removed Supabase types - using Hasura + Neon only

interface UseSyncOptions {
  // Loveable sync options
  enableLoveableSync?: boolean;
  onLoveableCodeSync?: (data: any) => void;
  onLoveableUISync?: (data: any) => void;
  onLoveableConfigSync?: (data: any) => void;
  
  // Removed Supabase realtime options - using Hasura + Neon only
  
  // General sync options
  onSyncSuccess?: (event: any) => void;
  onSyncError?: (error: any) => void;
}

interface SyncState {
  isLoveableConnected: boolean;
  lastSync: number | null;
  error: string | null;
  syncQueueLength: number;
}

export function useSync(options: UseSyncOptions = {}) {
  const {
    enableLoveableSync = true,
    onLoveableCodeSync,
    onLoveableUISync,
    onLoveableConfigSync,
    enableSupabaseRealtime = true,
    tables = [],
    onSyncSuccess,
    onSyncError,
  } = options;

  const [state, setState] = useState<SyncState>({
    isLoveableConnected: false,
    lastSync: null,
    error: null,
    syncQueueLength: 0,
  });

  // Loveable sync hook
  const loveableSync = useLoveableSync({
    onCodeSync: onLoveableCodeSync,
    onUISync: onLoveableUISync,
    onConfigSync: onLoveableConfigSync,
    onConnected: () => setState(prev => ({ ...prev, isLoveableConnected: true })),
    onDisconnected: () => setState(prev => ({ ...prev, isLoveableConnected: false })),
    onError: (error) => setState(prev => ({ ...prev, error: error?.toString() || 'Loveable error' })),
  });

  // Supabase realtime removed - using Hasura + Neon only

  // Sync service event handlers
  const handleSyncSuccess = useCallback((event: any) => {
    setState(prev => ({ 
      ...prev, 
      lastSync: Date.now(),
      error: null 
    }));
    onSyncSuccess?.(event);
  }, [onSyncSuccess]);

  const handleSyncError = useCallback((error: any) => {
    setState(prev => ({ 
      ...prev, 
      error: error?.error?.toString() || 'Sync error' 
    }));
    onSyncError?.(error);
  }, [onSyncError]);

  // Set up sync service event listeners
  useEffect(() => {
    syncService.on('sync-success', handleSyncSuccess);
    syncService.on('sync-error', handleSyncError);

    return () => {
      syncService.off('sync-success', handleSyncSuccess);
      syncService.off('sync-error', handleSyncError);
    };
  }, [handleSyncSuccess, handleSyncError]);

  // Supabase connection state removed - using Hasura + Neon only

  // Sync functions
  const syncCode = useCallback((codeData: any, source: 'loveable' | 'supabase' | 'local' = 'local') => {
    syncService.queueSyncEvent({
      type: 'code',
      action: 'sync',
      data: codeData,
      source,
    });
  }, []);

  const syncUI = useCallback((uiData: any, source: 'loveable' | 'supabase' | 'local' = 'local') => {
    syncService.queueSyncEvent({
      type: 'ui',
      action: 'sync',
      data: uiData,
      source,
    });
  }, []);

  const syncData = useCallback((table: TableName, action: 'create' | 'update' | 'delete', data: any) => {
    syncService.queueSyncEvent({
      type: 'data',
      table,
      action,
      data,
      source: 'local',
    });
  }, []);

  const syncConfig = useCallback((configData: any, source: 'loveable' | 'supabase' | 'local' = 'local') => {
    syncService.queueSyncEvent({
      type: 'config',
      action: 'sync',
      data: configData,
      source,
    });
  }, []);

  // Connection control
  const connectLoveable = useCallback(() => {
    return loveableSync.connect();
  }, [loveableSync]);

  const disconnectLoveable = useCallback(() => {
    loveableSync.disconnect();
  }, [loveableSync]);

  // Supabase connection functions removed - using Hasura + Neon only

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      syncService.destroy();
    };
  }, []);

  return {
    // State
    ...state,
    
    // Loveable sync
    loveableSync: {
      ...loveableSync,
      connect: connectLoveable,
      disconnect: disconnectLoveable,
    },
    
    // Supabase realtime removed - using Hasura + Neon only
    
    // Sync functions
    syncCode,
    syncUI,
    syncData,
    syncConfig,
    
    // Connection status (Loveable only)
    isFullyConnected: state.isLoveableConnected,
  };
}

// Supabase-specific hooks removed - using Hasura + Neon only

// Stub functions to prevent errors
export function useTableSync(table: string, options: any = {}) {
  console.log('useTableSync: Supabase removed, using Hasura + Neon only');
  return {
    isConnected: false,
    error: null,
    unsubscribe: () => {},
  };
}

export function useMultipleTableSync(tables: any[]) {
  console.log('useMultipleTableSync: Supabase removed, using Hasura + Neon only');
  return {
    isConnected: false,
    error: null,
    unsubscribe: () => {},
  };
}
