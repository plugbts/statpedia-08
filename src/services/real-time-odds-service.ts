import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

// Real-time odds synchronization service
export interface SportsbookOdds {
  sportsbook: string;
  line: number;
  overOdds: number;
  underOdds: number;
  lastUpdated: string;
  volume?: number;
  movement?: {
    line: number;
    overOdds: number;
    underOdds: number;
    timestamp: string;
  };
}

export interface OddsSnapshot {
  playerId: string;
  playerName: string;
  propType: string;
  gameId: string;
  sportsbooks: SportsbookOdds[];
  consensus: {
    line: number;
    overOdds: number;
    underOdds: number;
    confidence: number;
  };
  marketMetrics: {
    totalVolume: number;
    lineMovement: number;
    oddsMovement: number;
    volatility: number;
  };
  timestamp: string;
}

export interface VigCalculation {
  impliedProbability: number;
  vig: number;
  fairOdds: number;
  edge: number;
}

class RealTimeOddsService {
  private cache: Map<string, { data: OddsSnapshot; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 1000; // 30 seconds
  private readonly SYNC_INTERVAL = 60 * 1000; // 1 minute
  private syncTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Sportsbook API configurations
  private readonly SPORTSBOOK_APIS = {
    fanduel: {
      name: 'FanDuel',
      apiKey: process.env.FANDUEL_API_KEY,
      baseUrl: 'https://api.fanduel.com/v1',
      rateLimit: 100 // requests per minute
    },
    draftkings: {
      name: 'DraftKings',
      apiKey: process.env.DRAFTKINGS_API_KEY,
      baseUrl: 'https://api.draftkings.com/v1',
      rateLimit: 100
    },
    betmgm: {
      name: 'BetMGM',
      apiKey: process.env.BETMGM_API_KEY,
      baseUrl: 'https://api.betmgm.com/v1',
      rateLimit: 80
    },
    caesars: {
      name: 'Caesars',
      apiKey: process.env.CAESARS_API_KEY,
      baseUrl: 'https://api.caesars.com/v1',
      rateLimit: 80
    },
    pointsbet: {
      name: 'PointsBet',
      apiKey: process.env.POINTSBET_API_KEY,
      baseUrl: 'https://api.pointsbet.com/v1',
      rateLimit: 60
    }
  };

  // Start real-time synchronization
  startSync(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    logAPI('RealTimeOddsService', 'Starting real-time odds synchronization');
    
    // Initial sync
    this.performSync();
    
    // Set up interval
    this.syncTimer = setInterval(() => {
      this.performSync();
    }, this.SYNC_INTERVAL);
  }

  // Stop synchronization
  stopSync(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    logAPI('RealTimeOddsService', 'Stopped real-time odds synchronization');
  }

  // Perform synchronization across all sportsbooks
  private async performSync(): Promise<void> {
    try {
      logAPI('RealTimeOddsService', 'Performing odds synchronization');
      
      const sportsbooks = Object.keys(this.SPORTSBOOK_APIS);
      const syncPromises = sportsbooks.map(sportsbook => 
        this.syncSportsbookOdds(sportsbook as keyof typeof this.SPORTSBOOK_APIS)
      );
      
      await Promise.allSettled(syncPromises);
      
      logSuccess('RealTimeOddsService', 'Odds synchronization completed');
    } catch (error) {
      logError('RealTimeOddsService', 'Sync failed:', error);
    }
  }

  // Sync odds from a specific sportsbook
  private async syncSportsbookOdds(sportsbook: keyof typeof this.SPORTSBOOK_APIS): Promise<void> {
    try {
      const config = this.SPORTSBOOK_APIS[sportsbook];
      
      // In production, this would make real API calls
      // For now, we'll simulate realistic odds data
      const mockOdds = await this.generateMockSportsbookOdds(sportsbook);
      
      // Process and cache the odds
      await this.processSportsbookOdds(sportsbook, mockOdds);
      
    } catch (error) {
      logWarning('RealTimeOddsService', `Failed to sync ${sportsbook}:`, error);
    }
  }

  // Generate realistic mock odds data (replace with real API calls)
  private async generateMockSportsbookOdds(sportsbook: string): Promise<any[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
    
    // Generate realistic odds data
    const baseLines = {
      'Points': 20,
      'Rebounds': 8,
      'Assists': 5,
      'Steals': 1.5,
      'Blocks': 1.5,
      'Threes': 2.5,
      'Passing Yards': 250,
      'Rushing Yards': 80,
      'Receiving Yards': 60,
      'Touchdowns': 0.5
    };

    const props = [];
    for (let i = 0; i < 50; i++) {
      const propTypes = Object.keys(baseLines);
      const propType = propTypes[Math.floor(Math.random() * propTypes.length)];
      const baseLine = baseLines[propType as keyof typeof baseLines];
      
      // Add realistic variance
      const lineVariance = (Math.random() - 0.5) * 2; // ±1 variance
      const oddsVariance = Math.floor((Math.random() - 0.5) * 20); // ±10 variance
      
      props.push({
        playerId: `player_${i}`,
        playerName: `Player ${i}`,
        propType,
        line: baseLine + lineVariance,
        overOdds: -110 + oddsVariance,
        underOdds: -110 + oddsVariance,
        volume: Math.floor(Math.random() * 10000),
        timestamp: new Date().toISOString()
      });
    }
    
    return props;
  }

  // Process and cache sportsbook odds
  private async processSportsbookOdds(sportsbook: string, odds: any[]): Promise<void> {
    for (const odd of odds) {
      const cacheKey = `${odd.playerId}_${odd.propType}`;
      const existing = this.cache.get(cacheKey);
      
      const sportsbookOdds: SportsbookOdds = {
        sportsbook,
        line: odd.line,
        overOdds: odd.overOdds,
        underOdds: odd.underOdds,
        lastUpdated: odd.timestamp,
        volume: odd.volume,
        movement: existing ? {
          line: existing.data.sportsbooks.find(sb => sb.sportsbook === sportsbook)?.line || odd.line,
          overOdds: existing.data.sportsbooks.find(sb => sb.sportsbook === sportsbook)?.overOdds || odd.overOdds,
          underOdds: existing.data.sportsbooks.find(sb => sb.sportsbook === sportsbook)?.underOdds || odd.underOdds,
          timestamp: existing.timestamp.toString()
        } : undefined
      };

      if (existing) {
        // Update existing snapshot
        const updatedSnapshot = {
          ...existing.data,
          sportsbooks: existing.data.sportsbooks.map(sb => 
            sb.sportsbook === sportsbook ? sportsbookOdds : sb
          ),
          timestamp: new Date().toISOString()
        };
        
        this.cache.set(cacheKey, {
          data: updatedSnapshot,
          timestamp: Date.now()
        });
      } else {
        // Create new snapshot
        const newSnapshot: OddsSnapshot = {
          playerId: odd.playerId,
          playerName: odd.playerName,
          propType: odd.propType,
          gameId: `game_${odd.playerId}`,
          sportsbooks: [sportsbookOdds],
          consensus: {
            line: odd.line,
            overOdds: odd.overOdds,
            underOdds: odd.underOdds,
            confidence: 0.5
          },
          marketMetrics: {
            totalVolume: odd.volume || 0,
            lineMovement: 0,
            oddsMovement: 0,
            volatility: 0.1
          },
          timestamp: new Date().toISOString()
        };
        
        this.cache.set(cacheKey, {
          data: newSnapshot,
          timestamp: Date.now()
        });
      }
    }
  }

  // Get real-time odds for a specific player prop
  async getRealTimeOdds(playerId: string, propType: string): Promise<OddsSnapshot | null> {
    const cacheKey = `${playerId}_${propType}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }
    
    // If not cached or expired, fetch fresh data
    await this.performSync();
    return this.cache.get(cacheKey)?.data || null;
  }

  // Calculate consensus odds from multiple sportsbooks
  calculateConsensus(sportsbooks: SportsbookOdds[]): OddsSnapshot['consensus'] {
    if (sportsbooks.length === 0) {
      return { line: 0, overOdds: -110, underOdds: -110, confidence: 0 };
    }

    const avgLine = sportsbooks.reduce((sum, sb) => sum + sb.line, 0) / sportsbooks.length;
    const avgOverOdds = sportsbooks.reduce((sum, sb) => sum + sb.overOdds, 0) / sportsbooks.length;
    const avgUnderOdds = sportsbooks.reduce((sum, sb) => sum + sb.underOdds, 0) / sportsbooks.length;
    
    // Calculate confidence based on agreement
    const lineVariance = sportsbooks.reduce((sum, sb) => sum + Math.pow(sb.line - avgLine, 2), 0) / sportsbooks.length;
    const oddsVariance = sportsbooks.reduce((sum, sb) => sum + Math.pow(sb.overOdds - avgOverOdds, 2), 0) / sportsbooks.length;
    
    const confidence = Math.max(0, 1 - (lineVariance + oddsVariance) / 100);
    
    return {
      line: avgLine,
      overOdds: avgOverOdds,
      underOdds: avgUnderOdds,
      confidence
    };
  }

  // Calculate vig/juice for odds
  calculateVig(overOdds: number, underOdds: number): VigCalculation {
    const overImplied = this.oddsToImpliedProbability(overOdds);
    const underImplied = this.oddsToImpliedProbability(underOdds);
    
    const totalImplied = overImplied + underImplied;
    const vig = totalImplied - 1;
    
    const fairOverImplied = overImplied / totalImplied;
    const fairUnderImplied = underImplied / totalImplied;
    
    const fairOverOdds = this.impliedProbabilityToOdds(fairOverImplied);
    const fairUnderOdds = this.impliedProbabilityToOdds(fairUnderImplied);
    
    const edge = Math.max(fairOverOdds - overOdds, fairUnderOdds - underOdds);
    
    return {
      impliedProbability: totalImplied,
      vig: vig * 100, // Convert to percentage
      fairOdds: (fairOverOdds + fairUnderOdds) / 2,
      edge: edge * 100 // Convert to percentage
    };
  }

  // Convert American odds to implied probability
  private oddsToImpliedProbability(odds: number): number {
    if (odds > 0) {
      return 100 / (odds + 100);
    } else {
      return Math.abs(odds) / (Math.abs(odds) + 100);
    }
  }

  // Convert implied probability to American odds
  private impliedProbabilityToOdds(probability: number): number {
    if (probability >= 0.5) {
      return -(probability / (1 - probability)) * 100;
    } else {
      return ((1 - probability) / probability) * 100;
    }
  }

  // Get market metrics
  calculateMarketMetrics(sportsbooks: SportsbookOdds[]): OddsSnapshot['marketMetrics'] {
    const totalVolume = sportsbooks.reduce((sum, sb) => sum + (sb.volume || 0), 0);
    
    // Calculate movement metrics
    const movements = sportsbooks.filter(sb => sb.movement).map(sb => sb.movement!);
    const lineMovement = movements.length > 0 
      ? movements.reduce((sum, m) => sum + Math.abs(m.line - sportsbooks.find(sb => sb.sportsbook === sb.sportsbook)?.line || 0), 0) / movements.length
      : 0;
    
    const oddsMovement = movements.length > 0
      ? movements.reduce((sum, m) => sum + Math.abs(m.overOdds - sportsbooks.find(sb => sb.sportsbook === sb.sportsbook)?.overOdds || 0), 0) / movements.length
      : 0;
    
    // Calculate volatility based on odds spread
    const lineVariance = sportsbooks.reduce((sum, sb, _, arr) => {
      const avg = arr.reduce((s, s2) => s + s2.line, 0) / arr.length;
      return sum + Math.pow(sb.line - avg, 2);
    }, 0) / sportsbooks.length;
    
    const volatility = Math.sqrt(lineVariance) / 10; // Normalize
    
    return {
      totalVolume,
      lineMovement,
      oddsMovement,
      volatility: Math.min(volatility, 1) // Cap at 1
    };
  }

  // Get all cached odds snapshots
  getAllOddsSnapshots(): OddsSnapshot[] {
    const now = Date.now();
    return Array.from(this.cache.values())
      .filter(entry => (now - entry.timestamp) < this.CACHE_DURATION)
      .map(entry => entry.data);
  }

  // Get odds for multiple players
  async getBulkOdds(playerProps: Array<{ playerId: string; propType: string }>): Promise<Map<string, OddsSnapshot>> {
    const results = new Map<string, OddsSnapshot>();
    
    for (const prop of playerProps) {
      const odds = await this.getRealTimeOdds(prop.playerId, prop.propType);
      if (odds) {
        results.set(`${prop.playerId}_${prop.propType}`, odds);
      }
    }
    
    return results;
  }

  // Check if service is running
  isServiceRunning(): boolean {
    return this.isRunning;
  }

  // Get service statistics
  getServiceStats(): {
    isRunning: boolean;
    cacheSize: number;
    lastSync: string | null;
    sportsbooksConnected: string[];
  } {
    const lastSync = this.syncTimer ? new Date().toISOString() : null;
    const sportsbooksConnected = Object.keys(this.SPORTSBOOK_APIS);
    
    return {
      isRunning: this.isRunning,
      cacheSize: this.cache.size,
      lastSync,
      sportsbooksConnected
    };
  }
}

export const realTimeOddsService = new RealTimeOddsService();
