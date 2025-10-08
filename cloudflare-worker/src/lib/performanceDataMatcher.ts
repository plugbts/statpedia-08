// Performance Data Matcher - Connects real performance with betting lines
import { PerformanceData } from './performanceDataFetcher';
import { supabaseFetch } from '../supabaseFetch';

export interface MatchedData {
  performance: PerformanceData;
  propLine: any;
  hitResult: number; // 1 for hit, 0 for miss
  result: string; // "OVER" or "UNDER"
  difference: number; // actual - line
}

export interface MatchingResult {
  matchedRecords: MatchedData[];
  unmatchedPerformance: PerformanceData[];
  unmatchedPropLines: any[];
  totalMatches: number;
  totalPerformance: number;
  totalPropLines: number;
  matchRate: number;
}

export class PerformanceDataMatcher {
  
  async matchPerformanceWithProps(
    env: any, 
    performanceData: PerformanceData[], 
    date?: string
  ): Promise<MatchingResult> {
    console.log(`🔍 Matching ${performanceData.length} performance records with prop lines...`);
    
    try {
      // Fetch prop lines for the same date(s)
      const propLines = await this.fetchPropLines(env, performanceData, date);
      console.log(`📊 Found ${propLines.length} prop lines to match against`);
      
      // Perform matching
      const result = this.performMatching(performanceData, propLines);
      
      console.log(`✅ Matching complete: ${result.totalMatches} matches found (${result.matchRate.toFixed(1)}% match rate)`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Performance matching failed:', error);
      return {
        matchedRecords: [],
        unmatchedPerformance: performanceData,
        unmatchedPropLines: [],
        totalMatches: 0,
        totalPerformance: performanceData.length,
        totalPropLines: 0,
        matchRate: 0
      };
    }
  }

  private async fetchPropLines(env: any, performanceData: PerformanceData[], date?: string): Promise<any[]> {
    // Get unique dates from performance data
    const dates = [...new Set(performanceData.map(p => p.date))];
    const leagues = [...new Set(performanceData.map(p => p.league))];
    
    console.log(`📊 Fetching prop lines for dates: ${dates.join(', ')} and leagues: ${leagues.join(', ')}`);
    
    // Build query to fetch prop lines
    let query = 'proplines?';
    const params: string[] = [];
    
    if (dates.length > 0) {
      params.push(`date=in.(${dates.join(',')})`);
    }
    
    if (leagues.length > 0) {
      params.push(`league=in.(${leagues.join(',')})`);
    }
    
    if (params.length > 0) {
      query += params.join('&');
    }
    
    query += '&limit=1000'; // Get up to 1000 prop lines
    
    const propLines = await supabaseFetch(env, query, { method: 'GET' });
    return propLines || [];
  }

  private performMatching(performanceData: PerformanceData[], propLines: any[]): MatchingResult {
    const matchedRecords: MatchedData[] = [];
    const unmatchedPerformance: PerformanceData[] = [];
    const unmatchedPropLines: any[] = [...propLines];
    
    console.log(`🔍 Starting matching process...`);
    
    for (const performance of performanceData) {
      let matched = false;
      
      // Try to find matching prop line
      const matchingPropIndex = unmatchedPropLines.findIndex(prop => 
        this.isMatch(performance, prop)
      );
      
      if (matchingPropIndex !== -1) {
        const propLine = unmatchedPropLines[matchingPropIndex];
        const matchedData = this.createMatchedRecord(performance, propLine);
        
        matchedRecords.push(matchedData);
        unmatchedPropLines.splice(matchingPropIndex, 1);
        matched = true;
        
        console.log(`✅ Matched: ${performance.player_name} - ${performance.prop_type} - ${performance.value} vs ${propLine.line} (${matchedData.result})`);
      }
      
      if (!matched) {
        unmatchedPerformance.push(performance);
        console.log(`❌ No match: ${performance.player_name} - ${performance.prop_type} - ${performance.value}`);
      }
    }
    
    const totalMatches = matchedRecords.length;
    const totalPerformance = performanceData.length;
    const totalPropLines = propLines.length;
    const matchRate = totalPerformance > 0 ? (totalMatches / totalPerformance) * 100 : 0;
    
    return {
      matchedRecords,
      unmatchedPerformance,
      unmatchedPropLines,
      totalMatches,
      totalPerformance,
      totalPropLines,
      matchRate
    };
  }

  private isMatch(performance: PerformanceData, propLine: any): boolean {
    // Match by player ID (most reliable)
    if (performance.player_id === propLine.player_id) {
      return true;
    }
    
    // Match by player name and team (fallback)
    if (performance.player_name === propLine.player_name && 
        performance.team === propLine.team) {
      return true;
    }
    
    // Match by normalized player name and team
    const perfName = this.normalizePlayerName(performance.player_name);
    const propName = this.normalizePlayerName(propLine.player_name);
    
    if (perfName === propName && performance.team === propLine.team) {
      return true;
    }
    
    return false;
  }

  private createMatchedRecord(performance: PerformanceData, propLine: any): MatchedData {
    const actualValue = performance.value;
    const lineValue = parseFloat(propLine.line);
    const difference = actualValue - lineValue;
    const hitResult = actualValue >= lineValue ? 1 : 0;
    const result = actualValue >= lineValue ? "OVER" : "UNDER";
    
    return {
      performance,
      propLine,
      hitResult,
      result,
      difference
    };
  }

  private normalizePlayerName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  // Insert matched records into player_game_logs table
  async insertMatchedRecords(env: any, matchedRecords: MatchedData[]): Promise<void> {
    if (matchedRecords.length === 0) {
      console.log('⚠️ No matched records to insert');
      return;
    }

    console.log(`📊 Inserting ${matchedRecords.length} matched performance records...`);

    // Convert matched records to player_game_logs format
    const gameLogRows = matchedRecords.map(match => ({
      player_id: match.performance.player_id,
      player_name: match.performance.player_name,
      team: match.performance.team,
      opponent: match.performance.opponent,
      season: match.performance.season,
      date: match.performance.date,
      prop_type: match.performance.prop_type,
      value: match.performance.value, // This is the actual performance value
      sport: match.performance.league.toUpperCase(),
      league: match.performance.league,
      game_id: match.performance.game_id
    }));

    // Insert in batches
    const batchSize = 250;
    for (let i = 0; i < gameLogRows.length; i += batchSize) {
      const batch = gameLogRows.slice(i, i + batchSize);
      
      try {
        console.log(`📊 Inserting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(gameLogRows.length/batchSize)} (${batch.length} records)...`);
        
        const response = await supabaseFetch(env, "player_game_logs", {
          method: "POST",
          body: batch,
          headers: { 
            Prefer: "resolution=merge-duplicates",
            "Content-Type": "application/json"
          },
        });
        
        if (response === null || response === undefined) {
          console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1} (${batch.length} records)`);
        } else {
          console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1} with response:`, response);
        }
        
      } catch (error) {
        console.error(`❌ Failed to insert batch ${Math.floor(i/batchSize) + 1}:`, error);
      }
    }

    console.log(`✅ Completed insertion of ${matchedRecords.length} matched performance records`);
  }

  // Get matching statistics
  getMatchingStats(result: MatchingResult): any {
    return {
      totalMatches: result.totalMatches,
      totalPerformance: result.totalPerformance,
      totalPropLines: result.totalPropLines,
      matchRate: result.matchRate,
      unmatchedPerformance: result.unmatchedPerformance.length,
      unmatchedPropLines: result.unmatchedPropLines.length,
      hitRate: result.matchedRecords.length > 0 ? 
        (result.matchedRecords.filter(r => r.hitResult === 1).length / result.matchedRecords.length) * 100 : 0
    };
  }
}
