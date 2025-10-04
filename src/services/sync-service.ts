import { loveableClient } from '@/integrations/loveable/client';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];

interface SyncEvent {
  id: string;
  type: 'code' | 'ui' | 'data' | 'config';
  table?: TableName;
  action: 'create' | 'update' | 'delete' | 'sync';
  data: any;
  timestamp: number;
  source: 'loveable' | 'supabase' | 'local';
  retryCount?: number;
}

interface SyncServiceConfig {
  enableLoveableSync: boolean;
  enableSupabaseRealtime: boolean;
  syncInterval: number; // in milliseconds
  maxRetries: number;
}

class SyncService {
  private config: SyncServiceConfig;
  private syncQueue: SyncEvent[] = [];
  private isProcessing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: Partial<SyncServiceConfig> = {}) {
    this.config = {
      enableLoveableSync: true,
      enableSupabaseRealtime: true,
      syncInterval: 5000, // 5 seconds
      maxRetries: 3,
      ...config,
    };

    this.initialize();
  }

  private async initialize() {
    if (this.config.enableLoveableSync) {
      await this.initializeLoveableSync();
    }

    if (this.config.enableSupabaseRealtime) {
      await this.initializeSupabaseRealtime();
    }

    this.startSyncProcessor();
  }

  private async initializeLoveableSync() {
    try {
      await loveableClient.connect();
      console.log('Loveable sync initialized');
    } catch (error) {
      console.error('Failed to initialize Loveable sync:', error);
    }
  }

  private async initializeSupabaseRealtime() {
    try {
      // Test Supabase connection
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) {
        console.warn('Supabase realtime not available:', error.message);
        // Disable Supabase realtime if it fails
        this.config.enableSupabaseRealtime = false;
        return;
      }
      console.log('Supabase realtime initialized');
    } catch (error) {
      console.warn('Failed to initialize Supabase realtime, disabling:', error);
      // Disable Supabase realtime if it fails
      this.config.enableSupabaseRealtime = false;
    }
  }

  private startSyncProcessor() {
    this.syncInterval = setInterval(() => {
      this.processSyncQueue();
    }, this.config.syncInterval);
  }

  private async processSyncQueue() {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.syncQueue.length > 0) {
      const event = this.syncQueue.shift();
      if (event) {
        await this.processSyncEvent(event);
      }
    }

    this.isProcessing = false;
  }

  private async processSyncEvent(event: SyncEvent) {
    try {
      switch (event.type) {
        case 'code':
          await this.processSyncCode(event);
          break;
        case 'ui':
          await this.processSyncUI(event);
          break;
        case 'data':
          await this.processSyncData(event);
          break;
        case 'config':
          await this.processSyncConfig(event);
          break;
      }

      this.emit('sync-success', event);
    } catch (error) {
      console.error('Sync event failed:', error);
      this.emit('sync-error', { event, error });
      
      // Retry logic
      const retryCount = event.retryCount || 0;
      if (retryCount < this.config.maxRetries) {
        event.retryCount = retryCount + 1;
        this.syncQueue.push(event);
      }
    }
  }

  private async processSyncCode(event: SyncEvent) {
    if (this.config.enableLoveableSync) {
      loveableClient.syncCode(event.data);
    }
  }

  private async processSyncUI(event: SyncEvent) {
    if (this.config.enableLoveableSync) {
      loveableClient.syncUI(event.data);
    }
  }

  private async processSyncData(event: SyncEvent) {
    if (event.table && this.config.enableSupabaseRealtime) {
      // Handle data synchronization with Supabase
      const { action, data } = event;
      
      switch (action) {
        case 'create':
          await supabase.from(event.table).insert(data);
          break;
        case 'update':
          await supabase.from(event.table).update(data).eq('id', data.id);
          break;
        case 'delete':
          await supabase.from(event.table).delete().eq('id', data.id);
          break;
      }
    }
  }

  private async processSyncConfig(event: SyncEvent) {
    if (this.config.enableLoveableSync) {
      loveableClient.syncConfig(event.data);
    }
  }

  // Public API methods
  public queueSyncEvent(event: Omit<SyncEvent, 'id' | 'timestamp'>) {
    const syncEvent: SyncEvent = {
      ...event,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.syncQueue.push(syncEvent);
    this.emit('sync-queued', syncEvent);
  }

  public syncCode(codeData: any, source: 'loveable' | 'supabase' | 'local' = 'local') {
    this.queueSyncEvent({
      type: 'code',
      action: 'sync',
      data: codeData,
      source,
    });
  }

  public syncUI(uiData: any, source: 'loveable' | 'supabase' | 'local' = 'local') {
    this.queueSyncEvent({
      type: 'ui',
      action: 'sync',
      data: uiData,
      source,
    });
  }

  public syncData(table: TableName, action: 'create' | 'update' | 'delete', data: any) {
    this.queueSyncEvent({
      type: 'data',
      table,
      action,
      data,
      source: 'local',
    });
  }

  public syncConfig(configData: any, source: 'loveable' | 'supabase' | 'local' = 'local') {
    this.queueSyncEvent({
      type: 'config',
      action: 'sync',
      data: configData,
      source,
    });
  }

  // Event system
  public on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  public destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    loveableClient.disconnect();
    this.syncQueue = [];
    this.eventListeners.clear();
  }
}

// Create and export the sync service instance
export const syncService = new SyncService({
  enableLoveableSync: false, // Disabled to prevent WebSocket connection errors
  enableSupabaseRealtime: true,
  syncInterval: 5000,
  maxRetries: 3,
});

export default syncService;
