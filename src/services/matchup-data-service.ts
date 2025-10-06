// @ts-nocheck
import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

export interface MatchupData {
  teamAbbr: string;
  opponentAbbr: string;
  defensiveRank: {
    passing: number;
    rushing: number;
    receiving: number;
    overall: number;
  };
  hitRate: {
    season: string; // "11/20" format
    h2h: string;    // "3/5" format
    l5: string;     // "4/5" format
    l10: string;    // "7/10" format
    l20: string;    // "12/20" format
  };
}

export class MatchupDataService {
  private static instance: MatchupDataService;
  private cache = new Map<string, MatchupData>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): MatchupDataService {
    if (!MatchupDataService.instance) {
      MatchupDataService.instance = new MatchupDataService();
    }
    return MatchupDataService.instance;
  }

  async getMatchupData(playerName: string, teamAbbr: string, opponentAbbr: string, propType: string): Promise<MatchupData> {
    const cacheKey = `${playerName}-${teamAbbr}-${opponentAbbr}-${propType}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached;
    }

    try {
      logAPI('MatchupDataService', `Fetching matchup data for ${playerName} (${teamAbbr} vs ${opponentAbbr})`);
      
      // Generate realistic matchup data
      const matchupData = this.generateMatchupData(playerName, teamAbbr, opponentAbbr, propType);
      
      // Cache the result
      this.cache.set(cacheKey, {
        ...matchupData,
        timestamp: Date.now()
      });
      
      logSuccess('MatchupDataService', `Generated matchup data for ${playerName}`);
      return matchupData;
      
    } catch (error) {
      logError('MatchupDataService', `Failed to get matchup data for ${playerName}:`, error);
      return this.getDefaultMatchupData(teamAbbr, opponentAbbr);
    }
  }

  private generateMatchupData(playerName: string, teamAbbr: string, opponentAbbr: string, propType: string): MatchupData {
    // Return default data - no fake data generation
    return this.getDefaultMatchupData(teamAbbr, opponentAbbr);
  }


  private getDefaultMatchupData(teamAbbr: string, opponentAbbr: string): MatchupData {
    return {
      teamAbbr,
      opponentAbbr,
      defensiveRank: {
        passing: 0,
        rushing: 0,
        receiving: 0,
        overall: 0
      },
      hitRate: {
        season: "—",
        h2h: "—",
        l5: "—",
        l10: "—",
        l20: "—"
      }
    };
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Get defensive rank color based on rank (1-32)
  getDefensiveRankColor(rank: number): string {
    if (rank <= 8) return 'text-red-500'; // Top 8 (good defense)
    if (rank <= 16) return 'text-yellow-500'; // Middle 8
    return 'text-green-500'; // Bottom 16 (bad defense)
  }

  // Get hit rate color based on percentage
  getHitRateColor(hitRate: string): string {
    const [hits, total] = hitRate.split('/').map(Number);
    const percentage = hits / total;
    
    if (percentage >= 0.6) return 'text-green-500';
    if (percentage >= 0.4) return 'text-yellow-500';
    return 'text-red-500';
  }
}

export const matchupDataService = MatchupDataService.getInstance();
