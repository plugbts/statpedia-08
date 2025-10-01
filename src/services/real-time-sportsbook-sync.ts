import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { theOddsAPI, PlayerPropOdds } from './theoddsapi';

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
    logAPI('RealTimeSportsbookSync', `🔄 Starting sync for ${sport}`);

    try {
      const sportKey = this.mapSportToKey(sport);
      const markets = this.PLAYER_PROP_MARKETS[sportKey] || [];
      
      if (markets.length === 0) {
        logWarning('RealTimeSportsbookSync', `No player prop markets defined for ${sport}`);
        return;
      }

      const allProps: RealTimePlayerProp[] = [];

      // Fetch odds for each market
      for (const market of markets) {
        try {
          const marketOdds = await theOddsAPI.getMarketOdds(
            sportKey, 
            market, 
            ['us'], 
            this.SPORTSBOOKS
          );

          // Process market odds into player props
          const processedProps = this.processMarketOdds(marketOdds, market, sportKey);
          allProps.push(...processedProps);

          logAPI('RealTimeSportsbookSync', `Processed ${processedProps.length} props for ${market}`);
        } catch (error) {
          logError('RealTimeSportsbookSync', `Failed to sync ${market}:`, error);
        }
      }

      // Update cache and stats
      this.updateCache(allProps);
      this.updateSyncStats(allProps, Date.now() - startTime);

      logSuccess('RealTimeSportsbookSync', `✅ Sync complete: ${allProps.length} props synced in ${Date.now() - startTime}ms`);
    } catch (error) {
      logError('RealTimeSportsbookSync', 'Sync failed:', error);
      throw error;
    }
  }

  // Process market odds data into structured player props
  private processMarketOdds(marketOdds: any[], market: string, sport: string): RealTimePlayerProp[] {
    const propsMap = new Map<string, RealTimePlayerProp>();

    marketOdds.forEach(game => {
      if (!game.bookmakers) return;

      game.bookmakers.forEach((bookmaker: any) => {
        if (!bookmaker.markets) return;

        const marketData = bookmaker.markets.find((m: any) => m.key === market);
        if (!marketData || !marketData.outcomes) return;

        // Group outcomes by player
        const playerOutcomes = this.groupOutcomesByPlayer(marketData.outcomes);

        playerOutcomes.forEach(({ playerName, overOutcome, underOutcome }) => {
          const propId = `${playerName}_${market}_${game.id}`;
          
          if (!propsMap.has(propId)) {
            propsMap.set(propId, {
              id: propId,
              playerName,
              propType: this.mapMarketToPropType(market),
              gameId: game.id,
              gameTime: game.commence_time,
              homeTeam: game.home_team,
              awayTeam: game.away_team,
              sportsbookOdds: [],
              consensusLine: 0,
              consensusOverOdds: 0,
              consensusUnderOdds: 0,
              lastSync: new Date().toISOString(),
              syncStatus: 'outdated'
            });
          }

          const prop = propsMap.get(propId)!;
          
          // Add sportsbook odds
          prop.sportsbookOdds.push({
            sportsbook: bookmaker.title,
            sportsbookKey: bookmaker.key,
            line: overOutcome.point || underOutcome.point || 0,
            overOdds: overOutcome.price,
            underOdds: underOutcome.price,
            lastUpdate: bookmaker.last_update,
            confidence: this.calculateConfidence(overOutcome.price, underOutcome.price)
          });
        });
      });
    });

    // Calculate consensus odds for each prop
    const props = Array.from(propsMap.values());
    props.forEach(prop => {
      this.calculateConsensusOdds(prop);
      prop.syncStatus = this.determineSyncStatus(prop);
    });

    return props;
  }

  // Group outcomes by player name
  private groupOutcomesByPlayer(outcomes: any[]): Array<{ playerName: string; overOutcome: any; underOutcome: any }> {
    const playerMap = new Map<string, { overOutcome?: any; underOutcome?: any }>();

    outcomes.forEach(outcome => {
      const outcomeName = outcome.name || '';
      
      // Parse player name from outcome name
      // Format: "Player Name Over/Under X.X"
      const parts = outcomeName.split(' ');
      if (parts.length < 3) return;

      const overUnder = parts[parts.length - 2];
      const playerName = parts.slice(0, -2).join(' ');

      if (!playerMap.has(playerName)) {
        playerMap.set(playerName, {});
      }

      const player = playerMap.get(playerName)!;
      if (overUnder.toLowerCase() === 'over') {
        player.overOutcome = outcome;
      } else if (overUnder.toLowerCase() === 'under') {
        player.underOutcome = outcome;
      }
    });

    return Array.from(playerMap.entries())
      .filter(([_, outcomes]) => outcomes.overOutcome && outcomes.underOutcome)
      .map(([playerName, outcomes]) => ({
        playerName,
        overOutcome: outcomes.overOutcome!,
        underOutcome: outcomes.underOutcome!
      }));
  }

  // Calculate consensus odds from all sportsbooks
  private calculateConsensusOdds(prop: RealTimePlayerProp): void {
    if (prop.sportsbookOdds.length === 0) return;

    // Calculate weighted average line (weighted by confidence)
    const totalWeight = prop.sportsbookOdds.reduce((sum, odds) => sum + this.getConfidenceWeight(odds.confidence), 0);
    
    prop.consensusLine = prop.sportsbookOdds.reduce((sum, odds) => {
      return sum + (odds.line * this.getConfidenceWeight(odds.confidence));
    }, 0) / totalWeight;

    // Calculate average odds
    prop.consensusOverOdds = Math.round(
      prop.sportsbookOdds.reduce((sum, odds) => sum + odds.overOdds, 0) / prop.sportsbookOdds.length
    );
    
    prop.consensusUnderOdds = Math.round(
      prop.sportsbookOdds.reduce((sum, odds) => sum + odds.underOdds, 0) / prop.sportsbookOdds.length
    );
  }

  // Determine sync status based on data freshness and sportsbook coverage
  private determineSyncStatus(prop: RealTimePlayerProp): 'synced' | 'partial' | 'outdated' {
    const now = new Date();
    const lastUpdate = new Date(prop.lastSync);
    const timeDiff = now.getTime() - lastUpdate.getTime();

    // Check if data is fresh (less than 5 minutes old)
    if (timeDiff > 5 * 60 * 1000) return 'outdated';

    // Check sportsbook coverage
    const activeSportsbooks = prop.sportsbookOdds.length;
    const expectedSportsbooks = this.SPORTSBOOKS.length;

    if (activeSportsbooks >= expectedSportsbooks * 0.8) return 'synced';
    if (activeSportsbooks >= expectedSportsbooks * 0.5) return 'partial';
    return 'outdated';
  }

  // Calculate confidence based on odds
  private calculateConfidence(overOdds: number, underOdds: number): 'high' | 'medium' | 'low' {
    const oddsDiff = Math.abs(overOdds - underOdds);
    
    if (oddsDiff <= 10) return 'high';      // Very close odds = high confidence
    if (oddsDiff <= 20) return 'medium';    // Moderate difference
    return 'low';                           // Large difference = low confidence
  }

  // Get confidence weight for calculations
  private getConfidenceWeight(confidence: 'high' | 'medium' | 'low'): number {
    const weights = { high: 3, medium: 2, low: 1 };
    return weights[confidence];
  }

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

  // Map market key to readable prop type
  private mapMarketToPropType(market: string): string {
    const mappings: { [key: string]: string } = {
      'player_pass_tds': 'Passing TDs',
      'player_pass_yds': 'Passing Yards',
      'player_pass_completions': 'Pass Completions',
      'player_rush_yds': 'Rushing Yards',
      'player_rush_attempts': 'Rush Attempts',
      'player_receiving_yds': 'Receiving Yards',
      'player_receiving_receptions': 'Receptions',
      'player_pass_interceptions': 'Interceptions',
      'player_points': 'Points',
      'player_rebounds': 'Rebounds',
      'player_assists': 'Assists',
      'player_steals': 'Steals',
      'player_blocks': 'Blocks',
      'player_threes': '3-Pointers',
      'player_turnovers': 'Turnovers',
      'player_hits': 'Hits',
      'player_home_runs': 'Home Runs',
      'player_rbis': 'RBIs',
      'player_strikeouts': 'Strikeouts',
      'player_runs': 'Runs',
      'player_total_bases': 'Total Bases',
      'player_walks': 'Walks'
    };
    return mappings[market] || market;
  }

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
