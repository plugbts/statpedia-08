import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { supabase } from '@/integrations/supabase/client';

// Debug logging interfaces
export interface UnmappedMarket {
  marketName: string;
  statID: string;
  source: 'marketName' | 'statID';
  league: string;
  sport: string;
  firstSeen: string;
  lastSeen: string;
  count: number;
  sampleOddId?: string;
  samplePlayerId?: string;
}

export interface CoverageGap {
  league: string;
  sport: string;
  missingPropTypes: string[];
  expectedPropTypes: string[];
  coveragePercentage: number;
  lastAnalyzed: string;
}

export interface IngestionStats {
  totalProcessed: number;
  successful: number;
  failed: number;
  unmappedMarkets: number;
  unmappedStatIDs: number;
  leagues: { [key: string]: number };
  sportsbooks: { [key: string]: number };
  propTypes: { [key: string]: number };
  timestamp: string;
}

class PropDebugLoggingService {
  private unmappedMarkets: Map<string, UnmappedMarket> = new Map();
  private unmappedStatIDs: Map<string, UnmappedMarket> = new Map();
  private ingestionStats: IngestionStats[] = [];
  private readonly MAX_STATS_HISTORY = 100;

  /**
   * Log an unmapped market for debugging
   */
  logUnmappedMarket(
    marketName: string,
    statID: string,
    source: 'marketName' | 'statID',
    league: string,
    sport: string,
    sampleOddId?: string,
    samplePlayerId?: string
  ): void {
    const key = `${marketName}-${statID}-${source}-${league}`;
    const now = new Date().toISOString();
    
    const existing = source === 'marketName' 
      ? this.unmappedMarkets.get(key)
      : this.unmappedStatIDs.get(key);

    if (existing) {
      existing.lastSeen = now;
      existing.count++;
      existing.sampleOddId = sampleOddId || existing.sampleOddId;
      existing.samplePlayerId = samplePlayerId || existing.samplePlayerId;
    } else {
      const unmappedMarket: UnmappedMarket = {
        marketName,
        statID,
        source,
        league,
        sport,
        firstSeen: now,
        lastSeen: now,
        count: 1,
        sampleOddId,
        samplePlayerId
      };

      if (source === 'marketName') {
        this.unmappedMarkets.set(key, unmappedMarket);
      } else {
        this.unmappedStatIDs.set(key, unmappedMarket);
      }

      logWarning('PropDebugLogging', `New unmapped ${source}: "${marketName}" (${statID}) in ${league}`);
    }
  }

  /**
   * Log ingestion statistics
   */
  logIngestionStats(stats: IngestionStats): void {
    this.ingestionStats.push(stats);
    
    // Keep only recent stats
    if (this.ingestionStats.length > this.MAX_STATS_HISTORY) {
      this.ingestionStats = this.ingestionStats.slice(-this.MAX_STATS_HISTORY);
    }

    logInfo('PropDebugLogging', `Ingestion stats: ${stats.successful}/${stats.totalProcessed} successful, ${stats.unmappedMarkets} unmapped markets`);
  }

  /**
   * Analyze coverage gaps for a league
   */
  async analyzeCoverageGaps(league: string, sport: string): Promise<CoverageGap> {
    try {
      // Get expected prop types for the sport
      const expectedPropTypes = this.getExpectedPropTypes(sport);
      
      // Get actual prop types from database
      const { data: actualProps, error } = await supabase
        .from('proplines')
        .select('prop_type')
        .eq('league', league)
        .eq('is_available', true);

      if (error) {
        throw new Error(`Failed to get actual props: ${error.message}`);
      }

      const actualPropTypes = new Set(actualProps.map(p => p.prop_type));
      const missingPropTypes = expectedPropTypes.filter(expected => !actualPropTypes.has(expected));
      const coveragePercentage = (actualPropTypes.size / expectedPropTypes.length) * 100;

      const coverageGap: CoverageGap = {
        league,
        sport,
        missingPropTypes,
        expectedPropTypes,
        coveragePercentage: Math.round(coveragePercentage * 100) / 100,
        lastAnalyzed: new Date().toISOString()
      };

      logAPI('PropDebugLogging', `Coverage analysis for ${league}: ${coveragePercentage.toFixed(1)}% (${actualPropTypes.size}/${expectedPropTypes.length})`);
      
      if (missingPropTypes.length > 0) {
        logWarning('PropDebugLogging', `Missing prop types in ${league}: ${missingPropTypes.join(', ')}`);
      }

      return coverageGap;
    } catch (error) {
      logError('PropDebugLogging', `Failed to analyze coverage gaps for ${league}:`, error);
      throw error;
    }
  }

  /**
   * Get expected prop types for a sport
   */
  private getExpectedPropTypes(sport: string): string[] {
    const sportLower = sport.toLowerCase();
    
    if (sportLower.includes('football') || sportLower.includes('nfl') || sportLower.includes('ncaa')) {
      return [
        'Passing Yards', 'Passing Completions', 'Passing TDs', 'Rushing Yards',
        'Rushing Attempts', 'Rushing TDs', 'Receiving Yards', 'Receptions',
        'Receiving TDs', 'Interceptions'
      ];
    }
    
    if (sportLower.includes('basketball') || sportLower.includes('nba') || sportLower.includes('ncaab')) {
      return [
        'Points', 'Assists', 'Rebounds', '3PM', 'Steals', 'Blocks',
        'Turnovers', 'PRA', 'Double Double', 'Triple Double'
      ];
    }
    
    if (sportLower.includes('baseball') || sportLower.includes('mlb')) {
      return [
        'Hits', 'Runs', 'RBIs', 'Home Runs', 'Total Bases', 'Stolen Bases',
        'Pitcher Ks', 'Pitcher Outs', 'ER Allowed'
      ];
    }
    
    if (sportLower.includes('hockey') || sportLower.includes('nhl')) {
      return [
        'Goals', 'Assists', 'Points', 'Shots', 'PPP', 'Saves'
      ];
    }
    
    if (sportLower.includes('soccer')) {
      return [
        'Goals', 'Assists', 'Shots', 'Shots on Target', 'Passes', 'Tackles'
      ];
    }
    
    return [];
  }

  /**
   * Generate debug report
   */
  async generateDebugReport(): Promise<{
    unmappedMarkets: UnmappedMarket[];
    unmappedStatIDs: UnmappedMarket[];
    coverageGaps: CoverageGap[];
    recentStats: IngestionStats[];
    recommendations: string[];
  }> {
    logInfo('PropDebugLogging', 'Generating comprehensive debug report');

    const unmappedMarkets = Array.from(this.unmappedMarkets.values());
    const unmappedStatIDs = Array.from(this.unmappedStatIDs.values());
    
    // Analyze coverage gaps for all leagues
    const coverageGaps: CoverageGap[] = [];
    const leagues = ['NFL', 'NCAAF', 'NBA', 'NCAAB', 'MLB', 'NHL'];
    
    for (const league of leagues) {
      try {
        const sport = this.getSportFromLeague(league);
        const gap = await this.analyzeCoverageGaps(league, sport);
        coverageGaps.push(gap);
      } catch (error) {
        logWarning('PropDebugLogging', `Failed to analyze coverage for ${league}:`, error);
      }
    }

    // Get recent stats
    const recentStats = this.ingestionStats.slice(-10);

    // Generate recommendations
    const recommendations = this.generateRecommendations(unmappedMarkets, unmappedStatIDs, coverageGaps);

    const report = {
      unmappedMarkets: unmappedMarkets.sort((a, b) => b.count - a.count),
      unmappedStatIDs: unmappedStatIDs.sort((a, b) => b.count - a.count),
      coverageGaps: coverageGaps.sort((a, b) => a.coveragePercentage - b.coveragePercentage),
      recentStats,
      recommendations
    };

    logSuccess('PropDebugLogging', `Debug report generated: ${unmappedMarkets.length} unmapped markets, ${coverageGaps.length} coverage gaps analyzed`);
    
    return report;
  }

  /**
   * Generate recommendations based on debug data
   */
  private generateRecommendations(
    unmappedMarkets: UnmappedMarket[],
    unmappedStatIDs: UnmappedMarket[],
    coverageGaps: CoverageGap[]
  ): string[] {
    const recommendations: string[] = [];

    // Recommendations for unmapped markets
    if (unmappedMarkets.length > 0) {
      const topUnmapped = unmappedMarkets.slice(0, 5);
      recommendations.push(`🔍 Add normalization patterns for top unmapped markets: ${topUnmapped.map(m => `"${m.marketName}"`).join(', ')}`);
    }

    // Recommendations for unmapped stat IDs
    if (unmappedStatIDs.length > 0) {
      const topUnmappedStatIDs = unmappedStatIDs.slice(0, 5);
      recommendations.push(`📊 Add statID mappings for: ${topUnmappedStatIDs.map(s => s.statID).join(', ')}`);
    }

    // Recommendations for coverage gaps
    const lowCoverage = coverageGaps.filter(gap => gap.coveragePercentage < 70);
    if (lowCoverage.length > 0) {
      recommendations.push(`⚠️  Low coverage leagues: ${lowCoverage.map(gap => `${gap.league} (${gap.coveragePercentage}%)`).join(', ')}`);
    }

    // General recommendations
    if (unmappedMarkets.length > 10) {
      recommendations.push('📈 Consider implementing automated pattern learning for market name normalization');
    }

    if (coverageGaps.some(gap => gap.missingPropTypes.length > 5)) {
      recommendations.push('🎯 Focus on adding support for missing prop types in low-coverage leagues');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All systems functioning well - no major issues detected');
    }

    return recommendations;
  }

  /**
   * Get sport from league name
   */
  private getSportFromLeague(league: string): string {
    if (['NFL', 'NCAAF'].includes(league)) return 'Football';
    if (['NBA', 'NCAAB'].includes(league)) return 'Basketball';
    if (['MLB'].includes(league)) return 'Baseball';
    if (['NHL'].includes(league)) return 'Hockey';
    return 'Unknown';
  }

  /**
   * Save debug data to database (optional)
   */
  async saveDebugData(): Promise<void> {
    try {
      const report = await this.generateDebugReport();
      
      // Save unmapped markets
      for (const market of report.unmappedMarkets) {
        const { error } = await supabase
          .from('debug_unmapped_markets')
          .upsert({
            market_name: market.marketName,
            stat_id: market.statID,
            source: market.source,
            league: market.league,
            sport: market.sport,
            first_seen: market.firstSeen,
            last_seen: market.lastSeen,
            count: market.count,
            sample_odd_id: market.sampleOddId,
            sample_player_id: market.samplePlayerId
          }, {
            onConflict: 'market_name,stat_id,source,league'
          });

        if (error) {
          logWarning('PropDebugLogging', `Failed to save unmapped market: ${error.message}`);
        }
      }

      // Save coverage gaps
      for (const gap of report.coverageGaps) {
        const { error } = await supabase
          .from('debug_coverage_gaps')
          .upsert({
            league: gap.league,
            sport: gap.sport,
            missing_prop_types: gap.missingPropTypes,
            expected_prop_types: gap.expectedPropTypes,
            coverage_percentage: gap.coveragePercentage,
            last_analyzed: gap.lastAnalyzed
          }, {
            onConflict: 'league'
          });

        if (error) {
          logWarning('PropDebugLogging', `Failed to save coverage gap: ${error.message}`);
        }
      }

      logSuccess('PropDebugLogging', 'Debug data saved to database');
    } catch (error) {
      logError('PropDebugLogging', 'Failed to save debug data:', error);
    }
  }

  /**
   * Clear debug data
   */
  clearDebugData(): void {
    this.unmappedMarkets.clear();
    this.unmappedStatIDs.clear();
    this.ingestionStats = [];
    logInfo('PropDebugLogging', 'Debug data cleared');
  }

  /**
   * Get unmapped markets summary
   */
  getUnmappedMarketsSummary(): {
    totalUnmapped: number;
    byLeague: { [key: string]: number };
    bySource: { [key: string]: number };
    topMarkets: { name: string; count: number }[];
  } {
    const allUnmapped = [
      ...Array.from(this.unmappedMarkets.values()),
      ...Array.from(this.unmappedStatIDs.values())
    ];

    const byLeague: { [key: string]: number } = {};
    const bySource: { [key: string]: number } = {};
    const marketCounts: { [key: string]: number } = {};

    for (const market of allUnmapped) {
      byLeague[market.league] = (byLeague[market.league] || 0) + 1;
      bySource[market.source] = (bySource[market.source] || 0) + 1;
      marketCounts[market.marketName] = (marketCounts[market.marketName] || 0) + market.count;
    }

    const topMarkets = Object.entries(marketCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return {
      totalUnmapped: allUnmapped.length,
      byLeague,
      bySource,
      topMarkets
    };
  }

  /**
   * Export debug data as JSON
   */
  exportDebugData(): string {
    const data = {
      unmappedMarkets: Array.from(this.unmappedMarkets.values()),
      unmappedStatIDs: Array.from(this.unmappedStatIDs.values()),
      ingestionStats: this.ingestionStats,
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import debug data from JSON
   */
  importDebugData(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.unmappedMarkets) {
        for (const market of data.unmappedMarkets) {
          const key = `${market.marketName}-${market.statID}-${market.source}-${market.league}`;
          this.unmappedMarkets.set(key, market);
        }
      }

      if (data.unmappedStatIDs) {
        for (const statID of data.unmappedStatIDs) {
          const key = `${statID.marketName}-${statID.statID}-${statID.source}-${statID.league}`;
          this.unmappedStatIDs.set(key, statID);
        }
      }

      if (data.ingestionStats) {
        this.ingestionStats = data.ingestionStats;
      }

      logSuccess('PropDebugLogging', 'Debug data imported successfully');
    } catch (error) {
      logError('PropDebugLogging', 'Failed to import debug data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const propDebugLoggingService = new PropDebugLoggingService();
