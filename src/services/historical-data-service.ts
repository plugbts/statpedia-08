import { supabase } from '@/integrations/supabase/client';
import { sportsGameOddsAPI } from './sportsgameodds-api';
import { normalizeOpponent, normalizeMarketType, normalizePosition } from '@/utils/normalize';
import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

export interface PlayerGameLog {
  id?: number;
  player_id: string;
  player_name: string;
  team: string;
  opponent: string;
  season: number;
  date: string;
  prop_type: string;
  value: number;
  sport: string;
  position?: string;
  game_id?: string;
  home_away?: string;
  weather_conditions?: string;
  injury_status?: string;
}

export interface PlayerAnalytics {
  id?: number;
  player_id: string;
  player_name: string;
  team: string;
  prop_type: string;
  sport: string;
  position?: string;
  season_hit_rate_2025: number;
  season_games_2025: number;
  h2h_hit_rate: number;
  h2h_games: number;
  l5_hit_rate: number;
  l5_games: number;
  l10_hit_rate: number;
  l10_games: number;
  l20_hit_rate: number;
  l20_games: number;
  current_streak: number;
  longest_streak: number;
  streak_direction: string;
  matchup_defensive_rank: number;
  matchup_rank_display: string;
  chart_data?: any;
  last_updated?: string;
}

export interface DefensiveRank {
  rank: number;
  display: string;
}

export class HistoricalDataService {
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private cache = new Map<string, { data: any; timestamp: number }>();

  /**
   * Ingest historical data from SportsGameOdds events endpoint
   * This method fetches historical events and processes them into game logs
   */
  async ingestHistoricalData(sport: string = 'nfl', seasons: number[] = [2024, 2025]): Promise<void> {
    try {
      logAPI('HistoricalDataService', `Starting historical data ingestion for ${sport.toUpperCase()}`);
      
      for (const season of seasons) {
        logAPI('HistoricalDataService', `Processing season ${season} for ${sport.toUpperCase()}`);
        
        // Fetch events for the season
        const events = await this.fetchHistoricalEvents(sport, season);
        
        if (events.length === 0) {
          logWarning('HistoricalDataService', `No events found for ${sport.toUpperCase()} season ${season}`);
          continue;
        }
        
        // Process events into game logs
        const gameLogs = await this.processEventsToGameLogs(events, sport, season);
        
        if (gameLogs.length === 0) {
          logWarning('HistoricalDataService', `No game logs generated for ${sport.toUpperCase()} season ${season}`);
          continue;
        }
        
        // Store game logs in database
        await this.storeGameLogs(gameLogs);
        
        logSuccess('HistoricalDataService', `Successfully processed ${gameLogs.length} game logs for ${sport.toUpperCase()} season ${season}`);
      }
      
      // Update analytics after ingesting data
      await this.updateAllAnalytics(sport);
      
      logSuccess('HistoricalDataService', `Historical data ingestion completed for ${sport.toUpperCase()}`);
    } catch (error) {
      logError('HistoricalDataService', 'Failed to ingest historical data:', error);
      throw error;
    }
  }

  /**
   * Fetch historical events from SportsGameOdds API
   */
  private async fetchHistoricalEvents(sport: string, season: number): Promise<any[]> {
    const cacheKey = `historical-events-${sport}-${season}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      logAPI('HistoricalDataService', `Using cached events for ${sport} season ${season}`);
      return cached.data;
    }
    
    try {
      // Use the existing SportsGameOdds API to fetch events
      // Note: This would need to be modified to support historical data fetching
      // For now, we'll simulate the structure based on the existing API
      const events = await this.simulateHistoricalEvents(sport, season);
      
      this.cache.set(cacheKey, { data: events, timestamp: Date.now() });
      return events;
    } catch (error) {
      logError('HistoricalDataService', `Failed to fetch historical events for ${sport} season ${season}:`, error);
      return [];
    }
  }

  /**
   * Simulate historical events for testing purposes
   * In production, this would be replaced with actual SportsGameOdds API calls
   */
  private async simulateHistoricalEvents(sport: string, season: number): Promise<any[]> {
    // This is a simulation - in production, you would call the actual SportsGameOdds API
    // with historical date ranges to get past events with box score data
    
    const events = [];
    const teams = ['KC', 'BUF', 'SF', 'DAL', 'PHI', 'LAR', 'BAL', 'MIA', 'NE', 'NYJ'];
    const players = [
      { name: 'Patrick Mahomes', position: 'QB', team: 'KC' },
      { name: 'Josh Allen', position: 'QB', team: 'BUF' },
      { name: 'Brock Purdy', position: 'QB', team: 'SF' },
      { name: 'Dak Prescott', position: 'QB', team: 'DAL' },
      { name: 'Jalen Hurts', position: 'QB', team: 'PHI' },
      { name: 'Matthew Stafford', position: 'QB', team: 'LAR' },
      { name: 'Lamar Jackson', position: 'QB', team: 'BAL' },
      { name: 'Tua Tagovailoa', position: 'QB', team: 'MIA' },
      { name: 'Mac Jones', position: 'QB', team: 'NE' },
      { name: 'Aaron Rodgers', position: 'QB', team: 'NYJ' }
    ];
    
    // Generate 20 simulated events for the season
    for (let i = 0; i < 20; i++) {
      const homeTeam = teams[Math.floor(Math.random() * teams.length)];
      const awayTeam = teams[Math.floor(Math.random() * teams.length)];
      
      if (homeTeam === awayTeam) continue;
      
      const event = {
        eventID: `event-${season}-${i + 1}`,
        leagueID: sport.toUpperCase(),
        status: {
          startsAt: new Date(season, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString()
        },
        teams: {
          home: { names: { short: homeTeam, long: `${homeTeam} Team` } },
          away: { names: { short: awayTeam, long: `${awayTeam} Team` } }
        },
        players: {},
        odds: {}
      };
      
      // Add player props for each player
      players.forEach(player => {
        const playerId = player.name.replace(/\s+/g, '_').toUpperCase();
        event.players[playerId] = {
          name: player.name,
          team: player.team,
          position: player.position
        };
        
        // Add passing yards prop
        const passingYardsOddId = `passing_yards-${playerId}-game-ou-over`;
        const passingYardsUnderOddId = `passing_yards-${playerId}-game-ou-under`;
        
        event.odds[passingYardsOddId] = {
          oddID: passingYardsOddId,
          marketName: `${player.name} Passing Yards Over/Under`,
          byBookmaker: {
            fanduel: {
              odds: Math.random() > 0.5 ? -110 : 110,
              overUnder: 250.5,
              available: true,
              lastUpdatedAt: new Date().toISOString()
            },
            draftkings: {
              odds: Math.random() > 0.5 ? -105 : 105,
              overUnder: 250.5,
              available: true,
              lastUpdatedAt: new Date().toISOString()
            }
          }
        };
        
        event.odds[passingYardsUnderOddId] = {
          oddID: passingYardsUnderOddId,
          marketName: `${player.name} Passing Yards Over/Under`,
          byBookmaker: {
            fanduel: {
              odds: Math.random() > 0.5 ? -110 : 110,
              overUnder: 250.5,
              available: true,
              lastUpdatedAt: new Date().toISOString()
            },
            draftkings: {
              odds: Math.random() > 0.5 ? -105 : 105,
              overUnder: 250.5,
              available: true,
              lastUpdatedAt: new Date().toISOString()
            }
          }
        };
      });
      
      events.push(event);
    }
    
    return events;
  }

  /**
   * Process events into game logs
   */
  private async processEventsToGameLogs(events: any[], sport: string, season: number): Promise<PlayerGameLog[]> {
    const gameLogs: PlayerGameLog[] = [];
    
    for (const event of events) {
      try {
        const homeTeam = normalizeOpponent(event.teams?.home?.names?.short || 'UNK');
        const awayTeam = normalizeOpponent(event.teams?.away?.names?.short || 'UNK');
        const gameDate = event.status?.startsAt || new Date().toISOString();
        const gameId = event.eventID;
        
        // Process each player's props
        for (const [playerId, playerData] of Object.entries(event.players || {})) {
          const player = playerData as any;
          const playerName = player.name || 'Unknown Player';
          const playerTeam = normalizeOpponent(player.team || 'UNK');
          const opponent = playerTeam === homeTeam ? awayTeam : homeTeam;
          const position = normalizePosition(player.position || '');
          const homeAway = playerTeam === homeTeam ? 'HOME' : 'AWAY';
          
          // Process each prop type
          for (const [oddId, oddData] of Object.entries(event.odds || {})) {
            const odd = oddData as any;
            
            if (!odd.byBookmaker || typeof odd.byBookmaker !== 'object') {
              continue;
            }
            
            // Parse oddID to extract prop type
            const oddIdParts = oddId.split('-');
            if (oddIdParts.length < 5) continue;
            
            const [statType, playerIdPart, period, betType, side] = oddIdParts;
            
            // Only process over/under bets
            if (betType !== 'ou' || !['over', 'under'].includes(side)) {
              continue;
            }
            
            // Skip if this isn't for the current player
            if (playerIdPart !== playerId) continue;
            
            const propType = normalizeMarketType(statType.replace(/_/g, ' '));
            
            // Get the line value from the first available bookmaker
            const firstBookmaker = Object.values(odd.byBookmaker)[0] as any;
            const line = firstBookmaker?.overUnder || 0;
            
            if (!propType || isNaN(line)) continue;
            
            // Generate realistic historical performance data
            const historicalValue = this.generateHistoricalValue(propType, line, playerName, season);
            
            const gameLog: PlayerGameLog = {
              player_id: playerId.toLowerCase(),
              player_name: playerName,
              team: playerTeam,
              opponent: opponent,
              season: season,
              date: gameDate.split('T')[0], // Extract date part
              prop_type: propType,
              value: historicalValue,
              sport: sport.toUpperCase(),
              position: position,
              game_id: gameId,
              home_away: homeAway,
              weather_conditions: this.generateWeatherConditions(),
              injury_status: this.generateInjuryStatus()
            };
            
            gameLogs.push(gameLog);
          }
        }
      } catch (error) {
        logWarning('HistoricalDataService', `Failed to process event ${event.eventID}:`, error);
      }
    }
    
    return gameLogs;
  }

  /**
   * Generate realistic historical performance values
   */
  private generateHistoricalValue(propType: string, line: number, playerName: string, season: number): number {
    // Base the performance on the line and add some realistic variance
    const baseValue = line;
    const variance = line * 0.3; // 30% variance
    const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
    
    let value = baseValue + (randomFactor * variance);
    
    // Ensure value is realistic for the prop type
    if (propType.toLowerCase().includes('yards')) {
      value = Math.max(0, Math.round(value));
    } else if (propType.toLowerCase().includes('completions') || propType.toLowerCase().includes('receptions')) {
      value = Math.max(0, Math.round(value));
    } else if (propType.toLowerCase().includes('touchdowns')) {
      value = Math.max(0, Math.round(value));
    } else {
      value = Math.round(value * 10) / 10; // Round to 1 decimal place
    }
    
    return value;
  }

  /**
   * Generate weather conditions
   */
  private generateWeatherConditions(): string {
    const conditions = ['Clear', 'Cloudy', 'Rain', 'Snow', 'Windy', 'Fog'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  /**
   * Generate injury status
   */
  private generateInjuryStatus(): string {
    const statuses = ['Healthy', 'Questionable', 'Probable', 'Doubtful'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  /**
   * Store game logs in the database
   */
  private async storeGameLogs(gameLogs: PlayerGameLog[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('player_game_logs')
        .upsert(gameLogs, { 
          onConflict: 'player_id,date,prop_type,game_id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        throw error;
      }
      
      logSuccess('HistoricalDataService', `Stored ${gameLogs.length} game logs in database`);
    } catch (error) {
      logError('HistoricalDataService', 'Failed to store game logs:', error);
      throw error;
    }
  }

  /**
   * Update analytics for all players
   */
  async updateAllAnalytics(sport: string = 'nfl'): Promise<void> {
    try {
      logAPI('HistoricalDataService', `Updating analytics for ${sport.toUpperCase()}`);
      
      // Get all unique player/prop combinations
      const { data: playerProps, error } = await supabase
        .from('player_game_logs')
        .select('player_id, prop_type, sport')
        .eq('sport', sport.toUpperCase())
        .not('player_id', 'is', null)
        .not('prop_type', 'is', null);
      
      if (error) {
        throw error;
      }
      
      if (!playerProps || playerProps.length === 0) {
        logWarning('HistoricalDataService', `No player props found for ${sport.toUpperCase()}`);
        return;
      }
      
      // Get unique combinations
      const uniqueCombinations = new Set(
        playerProps.map(p => `${p.player_id}-${p.prop_type}-${p.sport}`)
      );
      
      logAPI('HistoricalDataService', `Found ${uniqueCombinations.size} unique player/prop combinations`);
      
      // Update analytics for each combination
      for (const combination of uniqueCombinations) {
        const [playerId, propType, sport] = combination.split('-');
        
        try {
          await this.updatePlayerAnalytics(playerId, propType, 250.5, 'over'); // Default line
        } catch (error) {
          logWarning('HistoricalDataService', `Failed to update analytics for ${combination}:`, error);
        }
      }
      
      logSuccess('HistoricalDataService', `Updated analytics for ${uniqueCombinations.size} combinations`);
    } catch (error) {
      logError('HistoricalDataService', 'Failed to update analytics:', error);
      throw error;
    }
  }

  /**
   * Update analytics for a specific player
   */
  async updatePlayerAnalytics(playerId: string, propType: string, line: number, direction: string = 'over'): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_player_analytics', {
        p_player_id: playerId,
        p_prop_type: propType,
        p_line: line,
        p_direction: direction
      });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      logError('HistoricalDataService', `Failed to update analytics for ${playerId} ${propType}:`, error);
      throw error;
    }
  }

  /**
   * Get analytics for a player
   */
  async getPlayerAnalytics(playerId: string, propType: string, sport: string = 'nfl'): Promise<PlayerAnalytics | null> {
    try {
      const { data, error } = await supabase
        .from('player_analytics')
        .select('*')
        .eq('player_id', playerId)
        .eq('prop_type', propType)
        .eq('sport', sport.toUpperCase())
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No data found
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      logError('HistoricalDataService', `Failed to get analytics for ${playerId} ${propType}:`, error);
      return null;
    }
  }

  /**
   * Get chart data for a player
   */
  async getPlayerChartData(playerId: string, propType: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_player_chart_data', {
        p_player_id: playerId,
        p_prop_type: propType,
        p_limit: limit
      });
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      logError('HistoricalDataService', `Failed to get chart data for ${playerId} ${propType}:`, error);
      return [];
    }
  }

  /**
   * Get defensive rank for a matchup
   */
  async getDefensiveRank(team: string, opponent: string, propType: string, position: string, season: number = 2025): Promise<DefensiveRank> {
    try {
      console.debug("[HISTORICAL_DATA_SERVICE] getDefensiveRank", {
        team,
        opponent,
        propType,
        position,
        season
      });

      const { data, error } = await supabase.rpc('get_defensive_rank', {
        p_team: team,
        p_opponent: opponent,
        p_prop_type: propType,
        p_position: position,
        p_season: season
      });
      
      console.debug("[HISTORICAL_DATA_SERVICE] getDefensiveRank result", {
        data,
        error,
        team,
        opponent,
        propType,
        position,
        season
      });
      
      if (error) {
        throw error;
      }
      
      return data?.[0] || { rank: 0, display: 'N/A' };
    } catch (error) {
      logError('HistoricalDataService', `Failed to get defensive rank for ${team} vs ${opponent}:`, error);
      console.debug("[HISTORICAL_DATA_SERVICE] getDefensiveRank error", {
        error: error.message,
        team,
        opponent,
        propType,
        position,
        season
      });
      return { rank: 0, display: 'N/A' };
    }
  }

  /**
   * Get hit rate for a player
   */
  async getHitRate(playerId: string, propType: string, line: number, direction: string, gamesLimit?: number): Promise<{ hits: number; total: number; hit_rate: number }> {
    try {
      console.debug("[HISTORICAL_DATA_SERVICE] getHitRate", {
        playerId,
        propType,
        line,
        direction,
        gamesLimit
      });

      const { data, error } = await supabase.rpc('calculate_hit_rate', {
        p_player_id: playerId,
        p_prop_type: propType,
        p_line: line,
        p_direction: direction,
        p_games_limit: gamesLimit
      });
      
      console.debug("[HISTORICAL_DATA_SERVICE] getHitRate result", {
        data,
        error,
        playerId,
        propType,
        line,
        direction,
        gamesLimit
      });
      
      if (error) {
        throw error;
      }
      
      return data?.[0] || { hits: 0, total: 0, hit_rate: 0 };
    } catch (error) {
      logError('HistoricalDataService', `Failed to get hit rate for ${playerId} ${propType}:`, error);
      console.debug("[HISTORICAL_DATA_SERVICE] getHitRate error", {
        error: error.message,
        playerId,
        propType,
        line,
        direction,
        gamesLimit
      });
      return { hits: 0, total: 0, hit_rate: 0 };
    }
  }

  /**
   * Get streak for a player
   */
  async getStreak(playerId: string, propType: string, line: number, direction: string): Promise<{ current_streak: number; longest_streak: number; streak_direction: string }> {
    try {
      const { data, error } = await supabase.rpc('calculate_streak', {
        p_player_id: playerId,
        p_prop_type: propType,
        p_line: line,
        p_direction: direction
      });
      
      if (error) {
        throw error;
      }
      
      return data?.[0] || { current_streak: 0, longest_streak: 0, streak_direction: direction };
    } catch (error) {
      logError('HistoricalDataService', `Failed to get streak for ${playerId} ${propType}:`, error);
      return { current_streak: 0, longest_streak: 0, streak_direction: direction };
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logInfo('HistoricalDataService', 'Cache cleared');
  }
}

// Export singleton instance
export const historicalDataService = new HistoricalDataService();
