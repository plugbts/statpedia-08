import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { sportsRadarAPI, SportsRadarPlayerProp } from './sportsradar-api';

export interface SyncResult {
  success: boolean;
  propsCount: number;
  lastSync: Date;
  errors: string[];
  sportsbooks: string[];
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date;
  propsCount: number;
  sportsbooks: string[];
  confidence: number;
}

class RealTimeSportsbookSync {
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastSyncResult: SyncResult | null = null;
  private readonly SYNC_INTERVAL = 60000; // 1 minute

  constructor() {
    logInfo('RealTimeSportsbookSync', 'Service initialized - Version 3.0.0');
    logInfo('RealTimeSportsbookSync', 'Using SportsRadar API for real-time sportsbook synchronization');
  }

  // Perform real-time sync with SportsRadar
  async performSync(sport: string): Promise<SyncResult> {
    logAPI('RealTimeSportsbookSync', `Starting real-time sync for ${sport}`);
    
    const startTime = Date.now();
    const errors: string[] = [];
    let propsCount = 0;
    const sportsbooks: string[] = [];

    try {
      // Get player props from SportsRadar
      const playerProps = await sportsRadarAPI.getPlayerProps(sport);
      propsCount = playerProps.length;
      
      logAPI('RealTimeSportsbookSync', `Retrieved ${propsCount} player props from SportsRadar`);
      
      // Extract unique sportsbooks from props
      const uniqueSportsbooks = [...new Set(playerProps.map(prop => prop.sportsbook))];
      sportsbooks.push(...uniqueSportsbooks);
      
      logSuccess('RealTimeSportsbookSync', `Sync completed for ${sport}: ${propsCount} props from ${sportsbooks.length} sportsbooks`);
      
      const result: SyncResult = {
        success: true,
        propsCount,
        lastSync: new Date(),
        errors,
        sportsbooks
      };
      
      this.lastSyncResult = result;
      return result;
      
    } catch (error) {
      const errorMessage = `Failed to sync ${sport}: ${error}`;
      logError('RealTimeSportsbookSync', errorMessage);
      errors.push(errorMessage);
      
      const result: SyncResult = {
        success: false,
        propsCount: 0,
        lastSync: new Date(),
        errors,
        sportsbooks: []
      };
      
      this.lastSyncResult = result;
      return result;
    }
  }

  // Start automatic sync for a sport
  startSync(sport: string): void {
    if (this.isRunning) {
      logWarning('RealTimeSportsbookSync', 'Sync is already running');
      return;
    }

    logInfo('RealTimeSportsbookSync', `Starting automatic sync for ${sport} every ${this.SYNC_INTERVAL}ms`);
    
    this.isRunning = true;
    
    // Perform initial sync
    this.performSync(sport);
    
    // Set up interval for ongoing sync
    this.syncInterval = setInterval(async () => {
      try {
        await this.performSync(sport);
      } catch (error) {
        logError('RealTimeSportsbookSync', 'Error during automatic sync:', error);
      }
    }, this.SYNC_INTERVAL);
  }

  // Stop automatic sync
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.isRunning = false;
    logInfo('RealTimeSportsbookSync', 'Automatic sync stopped');
  }

  // Get current sync status
  getSyncStatus(): SyncStatus {
    const now = new Date();
    const lastSync = this.lastSyncResult?.lastSync || new Date(0);
    const timeSinceLastSync = now.getTime() - lastSync.getTime();
    
    return {
      isOnline: this.lastSyncResult?.success || false,
      lastSync,
      propsCount: this.lastSyncResult?.propsCount || 0,
      sportsbooks: this.lastSyncResult?.sportsbooks || [],
      confidence: this.calculateConfidence(timeSinceLastSync)
    };
  }

  // Calculate confidence based on sync recency
  private calculateConfidence(timeSinceLastSync: number): number {
    const fiveMinutes = 5 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;
    
    if (timeSinceLastSync < fiveMinutes) {
      return 1.0; // High confidence
    } else if (timeSinceLastSync < oneHour) {
      return 0.7; // Medium confidence
    } else {
      return 0.3; // Low confidence
    }
  }

  // Get available sportsbooks
  getAvailableSportsbooks(): string[] {
    return [
      'FanDuel',
      'DraftKings', 
      'BetMGM',
      'Caesars',
      'PointsBet',
      'Bet365',
      'Unibet',
      'SportsRadar' // Aggregated data source
    ];
  }

  // Check if a sportsbook is available
  isSportsbookAvailable(sportsbook: string): boolean {
    const availableSportsbooks = this.getAvailableSportsbooks();
    return availableSportsbooks.some(sb => 
      sb.toLowerCase().includes(sportsbook.toLowerCase())
    );
  }

  // Get sync statistics
  getSyncStats(): {
    isRunning: boolean;
    lastSync: Date | null;
    totalProps: number;
    sportsbooks: string[];
    uptime: number;
  } {
    return {
      isRunning: this.isRunning,
      lastSync: this.lastSyncResult?.lastSync || null,
      totalProps: this.lastSyncResult?.propsCount || 0,
      sportsbooks: this.lastSyncResult?.sportsbooks || [],
      uptime: this.isRunning ? Date.now() - (this.lastSyncResult?.lastSync.getTime() || Date.now()) : 0
    };
  }
}

// Export singleton instance
export const realTimeSportsbookSync = new RealTimeSportsbookSync();