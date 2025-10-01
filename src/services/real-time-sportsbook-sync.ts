import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { sportsRadarAPI, SportsRadarPlayerProp } from './sportsradar-api';

// Real-time sportsbook synchronization service
export interface SportsbookOdds {
  sportsbook: string;
  sportsbookKey: string;
  line: number;
  overOdds: number;
  underOdds: number;
  lastUpdate: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface RealTimePlayerProp {
  id: string;
  playerName: string;
  propType: string;
  gameId: string;
  gameTime: string;
  homeTeam: string;
  awayTeam: string;
  sportsbookOdds: SportsbookOdds[];
  consensusLine: number;
  consensusOverOdds: number;
  consensusUnderOdds: number;
  lastSync: string;
  syncStatus: 'synced' | 'partial' | 'outdated';
}

export interface SyncStats {
  totalProps: number;
  syncedProps: number;
  partialProps: number;
  outdatedProps: number;
  lastSyncTime: string;
  sportsbooksActive: string[];
  averageSyncDelay: number;
}

class RealTimeSportsbookSync {
  private syncInterval: number | null = null;
  private isRunning = false;
  private cachedProps = new Map<string, RealTimePlayerProp>();
  private syncStats: SyncStats = {
    totalProps: 0,
    syncedProps: 0,
    partialProps: 0,
    outdatedProps: 0,
    lastSyncTime: '',
    sportsbooksActive: [],
    averageSyncDelay: 0
  };

  // Sportsbooks to sync with (in priority order)
  private readonly SPORTSBOOKS = [
    'fanduel',
    'draftkings', 
    'betmgm',
    'caesars',
    'pointsbet',
    'espnbet',
    'hardrock'
  ];

  // Player prop markets to sync
  private readonly PLAYER_PROP_MARKETS = {
    'americanfootball_nfl': [
      'player_pass_tds', 'player_pass_yds', 'player_pass_completions',
      'player_rush_yds', 'player_rush_attempts', 'player_receiving_yds',
      'player_receiving_receptions', 'player_pass_interceptions'
    ],
    'basketball_nba': [
      'player_points', 'player_rebounds', 'player_assists', 'player_steals',
      'player_blocks', 'player_threes', 'player_turnovers'
    ],
    'baseball_mlb': [
      'player_hits', 'player_home_runs', 'player_rbis', 'player_strikeouts',
      'player_runs', 'player_total_bases', 'player_walks'
    ],
    'icehockey_nhl': [
      'player_points', 'player_goals', 'player_assists', 'player_shots'
    ]
  };

  constructor() {
    logInfo('RealTimeSportsbookSync', 'Service initialized - Version 1.0.0');
    logInfo('RealTimeSportsbookSync', `Tracking ${this.SPORTSBOOKS.length} sportsbooks: ${this.SPORTSBOOKS.join(', ')}`);
  }

  // Start real-time synchronization
  async startSync(sport: string, intervalMs: number = 30000): Promise<void> {
    if (this.isRunning) {
      logWarning('RealTimeSportsbookSync', 'Sync already running');
      return;
    }

    this.isRunning = true;
    logInfo('RealTimeSportsbookSync', `Starting real-time sync for ${sport} every ${intervalMs}ms`);

    // Initial sync
    await this.performSync(sport);

    // Set up interval
    this.syncInterval = setInterval(async () => {
      try {
        await this.performSync(sport);
      } catch (error) {
        logError('RealTimeSportsbookSync', 'Sync interval error:', error);
      }
    }, intervalMs);
  }

  // Stop synchronization
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    logInfo('RealTimeSportsbookSync', 'Real-time sync stopped');
  }

  // Perform a full synchronization
  private async performSync(sport: string): Promise<void> {
    const startTime = Date.now();
    logAPI('RealTimeSportsbookSync', `🔄 Starting sync for ${sport} using SportsRadar`);

    try {
      const sportKey = this.mapSportToKey(sport);
      
      logAPI('RealTimeSportsbookSync', `Fetching player props from SportsRadar for ${sportKey}...`);
      
      // Get player props directly from SportsRadar
      const sportsRadarProps = await sportsRadarAPI.getPlayerProps(sport);
      
      logAPI('RealTimeSportsbookSync', `Received ${sportsRadarProps.length} player props from SportsRadar`);
      
      if (sportsRadarProps.length > 0) {
        logAPI('RealTimeSportsbookSync', `Sample SportsRadar data: ${JSON.stringify(sportsRadarProps[0], null, 2)}`);
      }

      // Convert SportsRadar props to our format
      const allProps: RealTimePlayerProp[] = sportsRadarProps.map(srProp => ({
        id: srProp.id,
        playerName: srProp.playerName,
        propType: srProp.propType,
        gameId: srProp.gameId,
        gameTime: srProp.gameTime,
        homeTeam: srProp.homeTeam,
        awayTeam: srProp.awayTeam,
        sportsbookOdds: [{
          sportsbook: srProp.sportsbook,
          sportsbookKey: srProp.sportsbookKey,
          line: srProp.line,
          overOdds: srProp.overOdds,
          underOdds: srProp.underOdds,
          lastUpdate: srProp.lastUpdate,
          confidence: srProp.confidence
        }],
        consensusLine: srProp.line,
        consensusOverOdds: srProp.overOdds,
        consensusUnderOdds: srProp.underOdds,
        lastSync: new Date().toISOString(),
        syncStatus: 'synced' as const
      }));

      // Update cache and stats
      this.updateCache(allProps);
      this.updateSyncStats(allProps, Date.now() - startTime);

      logSuccess('RealTimeSportsbookSync', `✅ Sync complete: ${allProps.length} props synced in ${Date.now() - startTime}ms`);
      
      if (allProps.length === 0) {
        logWarning('RealTimeSportsbookSync', `No props found for ${sport}. This could be due to: 1) No games scheduled, 2) API quota limits, 3) Market not available`);
      }
    } catch (error) {
      logError('RealTimeSportsbookSync', 'Sync failed:', error);
      throw error;
    }
  }

  // Note: Market processing methods removed as we now use SportsRadar directly

  // Map sport name to API key
  private mapSportToKey(sport: string): string {
    const sportMap: { [key: string]: string } = {
      'nfl': 'americanfootball_nfl',
      'nba': 'basketball_nba',
      'mlb': 'baseball_mlb',
      'nhl': 'icehockey_nhl'
    };
    return sportMap[sport.toLowerCase()] || sport.toLowerCase();
  }

  // Note: Market mapping removed as SportsRadar handles this

  // Update cache with new props
  private updateCache(props: RealTimePlayerProp[]): void {
    props.forEach(prop => {
      this.cachedProps.set(prop.id, prop);
    });

    // Clean up old props (older than 24 hours)
    const cutoffTime = new Date().getTime() - (24 * 60 * 60 * 1000);
    for (const [id, prop] of this.cachedProps.entries()) {
      const propTime = new Date(prop.gameTime).getTime();
      if (propTime < cutoffTime) {
        this.cachedProps.delete(id);
      }
    }
  }

  // Update sync statistics
  private updateSyncStats(props: RealTimePlayerProp[], syncTime: number): void {
    this.syncStats.totalProps = props.length;
    this.syncStats.syncedProps = props.filter(p => p.syncStatus === 'synced').length;
    this.syncStats.partialProps = props.filter(p => p.syncStatus === 'partial').length;
    this.syncStats.outdatedProps = props.filter(p => p.syncStatus === 'outdated').length;
    this.syncStats.lastSyncTime = new Date().toISOString();
    this.syncStats.averageSyncDelay = syncTime;

    // Update active sportsbooks
    const activeSportsbooks = new Set<string>();
    props.forEach(prop => {
      prop.sportsbookOdds.forEach(odds => {
        activeSportsbooks.add(odds.sportsbookKey);
      });
    });
    this.syncStats.sportsbooksActive = Array.from(activeSportsbooks);
  }

  // Get all cached props
  getCachedProps(): RealTimePlayerProp[] {
    return Array.from(this.cachedProps.values());
  }

  // Get props for a specific player
  getPlayerProps(playerName: string): RealTimePlayerProp[] {
    return Array.from(this.cachedProps.values())
      .filter(prop => prop.playerName.toLowerCase().includes(playerName.toLowerCase()));
  }

  // Get props for a specific game
  getGameProps(gameId: string): RealTimePlayerProp[] {
    return Array.from(this.cachedProps.values())
      .filter(prop => prop.gameId === gameId);
  }

  // Get sync statistics
  getSyncStats(): SyncStats {
    return { ...this.syncStats };
  }

  // Check if sync is running
  isSyncRunning(): boolean {
    return this.isRunning;
  }

  // Force a manual sync
  async forceSync(sport: string): Promise<void> {
    logInfo('RealTimeSportsbookSync', `🔄 Manual sync triggered for ${sport}`);
    await this.performSync(sport);
  }
}

export const realTimeSportsbookSync = new RealTimeSportsbookSync();
