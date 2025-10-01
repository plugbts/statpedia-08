import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

// SportsGameOdds API Configuration
const SPORTSGAMEODDS_API_KEY = '740556c91b9aa5616c0521cc2f09ed74';
const SPORTSGAMEODDS_BASE_URL = 'https://api.sportsgameodds.com';

// Cache configuration
const CACHE_DURATION = {
  ODDS: 5 * 60 * 1000, // 5 minutes for odds
  MARKETS: 5 * 60 * 1000, // 5 minutes for markets
  GAMES: 15 * 60 * 1000, // 15 minutes for games
  SPORTS: 24 * 60 * 60 * 1000, // 24 hours for sports (rarely change)
  BOOKMAKERS: 24 * 60 * 60 * 1000, // 24 hours for bookmakers (rarely change)
  PLAYERS: 12 * 60 * 60 * 1000, // 12 hours for players (rarely change)
  TEAMS: 24 * 60 * 60 * 1000 // 24 hours for teams (rarely change)
};

// SportsGameOdds API Interfaces
export interface SportsGameOddsPlayerProp {
  id: string;
  playerId: string;
  playerName: string;
  team: string;
  sport: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  sportsbook: string;
  sportsbookKey: string;
  lastUpdate: string;
  gameId: string;
  gameTime: string;
  homeTeam: string;
  awayTeam: string;
  confidence: number;
  market: string;
  outcome: string;
  betType: string;
  side: string;
  period: string;
  statEntity: string;
}

export interface SportsGameOddsGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league: string;
  gameTime: string;
  status: string;
  markets: SportsGameOddsMarket[];
}

export interface SportsGameOddsMarket {
  id: string;
  name: string;
  betType: string;
  side: string;
  line: number;
  odds: number;
  sportsbook: string;
  lastUpdate: string;
}

export interface SportsGameOddsBookmaker {
  id: string;
  name: string;
  displayName: string;
  country: string;
  currency: string;
}

export interface SportsGameOddsSport {
  id: string;
  name: string;
  displayName: string;
  leagues: SportsGameOddsLeague[];
}

export interface SportsGameOddsLeague {
  id: string;
  name: string;
  displayName: string;
  sport: string;
  country: string;
}

class SportsGameOddsAPI {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private usageStats = {
    totalCalls: 0,
    callsToday: 0,
    lastResetDate: new Date().toDateString(),
    callsByEndpoint: new Map<string, number>(),
    cacheHits: 0,
    cacheMisses: 0
  };
  private readonly MAX_DAILY_CALLS = 1000; // Conservative limit for trial plan

  constructor() {
    logInfo('SportsGameOddsAPI', 'SportsGameOdds API initialized with usage tracking');
  }

  // Track API usage for monitoring
  private trackAPIUsage(endpoint: string): void {
    const today = new Date().toDateString();
    
    // Reset daily counter if new day
    if (this.usageStats.lastResetDate !== today) {
      this.usageStats.callsToday = 0;
      this.usageStats.lastResetDate = today;
    }
    
    // Increment counters
    this.usageStats.totalCalls++;
    this.usageStats.callsToday++;
    
    // Track by endpoint
    const currentCount = this.usageStats.callsByEndpoint.get(endpoint) || 0;
    this.usageStats.callsByEndpoint.set(endpoint, currentCount + 1);
    
    // Log warning if approaching limit
    const usagePercentage = (this.usageStats.callsToday / this.MAX_DAILY_CALLS) * 100;
    if (usagePercentage >= 80) {
      logWarning('SportsGameOddsAPI', `High API usage: ${this.usageStats.callsToday}/${this.MAX_DAILY_CALLS} calls today (${usagePercentage.toFixed(1)}%)`);
    }
  }

  // Get usage statistics
  getUsageStats() {
    const today = new Date().toDateString();
    const usagePercentage = (this.usageStats.callsToday / this.MAX_DAILY_CALLS) * 100;
    
    return {
      totalCalls: this.usageStats.totalCalls,
      callsToday: this.usageStats.callsToday,
      maxDailyCalls: this.MAX_DAILY_CALLS,
      usagePercentage: Math.round(usagePercentage * 100) / 100,
      lastResetDate: this.usageStats.lastResetDate,
      callsByEndpoint: Object.fromEntries(this.usageStats.callsByEndpoint),
      isNearLimit: usagePercentage >= 80,
      isAtLimit: this.usageStats.callsToday >= this.MAX_DAILY_CALLS
    };
  }

  // Reset usage statistics
  resetUsageStats(): void {
    this.usageStats = {
      totalCalls: 0,
      callsToday: 0,
      lastResetDate: new Date().toDateString(),
      callsByEndpoint: new Map<string, number>(),
      cacheHits: 0,
      cacheMisses: 0
    };
    logInfo('SportsGameOddsAPI', 'Usage statistics reset');
  }

  // Check if we should avoid making API calls due to high usage
  shouldAvoidAPICall(): boolean {
    const usagePercentage = (this.usageStats.callsToday / this.MAX_DAILY_CALLS) * 100;
    return usagePercentage >= 95; // Avoid calls when at 95% of limit
  }

  // Get detailed endpoint usage statistics
  getDetailedUsageStats() {
    const stats = this.getUsageStats();
    return {
      ...stats,
      topEndpoints: Array.from(this.usageStats.callsByEndpoint.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([endpoint, count]) => ({ endpoint, count })),
      cacheHitRate: this.calculateCacheHitRate(),
      recommendations: this.getUsageRecommendations()
    };
  }

  // Calculate cache hit rate
  private calculateCacheHitRate(): number {
    const totalCacheRequests = this.usageStats.cacheHits + this.usageStats.cacheMisses;
    if (totalCacheRequests === 0) return 0;
    return Math.round((this.usageStats.cacheHits / totalCacheRequests) * 100) / 100;
  }

  // Get usage recommendations
  private getUsageRecommendations(): string[] {
    const recommendations = [];
    const usagePercentage = this.usageStats.callsToday / this.MAX_DAILY_CALLS;
    
    if (usagePercentage >= 0.8) {
      recommendations.push('Consider reducing API call frequency');
      recommendations.push('Increase cache duration for static data');
    }
    
    if (usagePercentage >= 0.9) {
      recommendations.push('Switch to cached data only mode');
      recommendations.push('Consider upgrading API plan');
    }
    
    return recommendations;
  }

  // Make authenticated request to SportsGameOdds API
  private async makeRequest<T>(endpoint: string, cacheDuration: number = CACHE_DURATION.ODDS): Promise<T> {
    const cacheKey = endpoint;
    const now = Date.now();
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (now - cached.timestamp < cacheDuration) {
        this.usageStats.cacheHits++;
        logAPI('SportsGameOddsAPI', `Using cached data for ${endpoint}`);
        return cached.data;
      }
    }
    
    this.usageStats.cacheMisses++;

    // Check if we should avoid API calls due to high usage
    if (this.shouldAvoidAPICall()) {
      logWarning('SportsGameOddsAPI', `Avoiding API call due to high usage: ${this.usageStats.callsToday}/${this.MAX_DAILY_CALLS} calls today`);
      throw new Error('API call avoided due to high usage - consider using cached data');
    }

    // Track API usage
    this.trackAPIUsage(endpoint);

    try {
      const url = `${SPORTSGAMEODDS_BASE_URL}${endpoint}`;
      
      logAPI('SportsGameOddsAPI', `Making request to: ${endpoint}`);
      logAPI('SportsGameOddsAPI', `Using API key: ${SPORTSGAMEODDS_API_KEY.substring(0, 10)}...`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Statpedia/1.0',
          'x-api-key': SPORTSGAMEODDS_API_KEY // Use lowercase header name
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        logError('SportsGameOddsAPI', `HTTP ${response.status}: ${response.statusText}`);
        logError('SportsGameOddsAPI', `Response: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // Cache the response
      this.cache.set(cacheKey, { data, timestamp: now });
      
      logSuccess('SportsGameOddsAPI', `Successfully fetched data from ${endpoint}`);
      return data;
      
    } catch (error) {
      logError('SportsGameOddsAPI', `Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Get available sports
  async getSports(): Promise<SportsGameOddsSport[]> {
    try {
      logAPI('SportsGameOddsAPI', 'Fetching available sports');
      const data = await this.makeRequest<any>('/v2/sports', CACHE_DURATION.SPORTS);
      
      const sports: SportsGameOddsSport[] = data.sports?.map((sport: any) => ({
        id: sport.id,
        name: sport.name,
        displayName: sport.displayName,
        leagues: sport.leagues || []
      })) || [];
      
      logSuccess('SportsGameOddsAPI', `Retrieved ${sports.length} sports`);
      return sports;
    } catch (error) {
      logError('SportsGameOddsAPI', 'Failed to get sports:', error);
      return [];
    }
  }

  // Get available bookmakers
  async getBookmakers(): Promise<SportsGameOddsBookmaker[]> {
    try {
      logAPI('SportsGameOddsAPI', 'Fetching available bookmakers');
      const data = await this.makeRequest<any>('/v2/bookmakers', CACHE_DURATION.BOOKMAKERS);
      
      const bookmakers: SportsGameOddsBookmaker[] = data.bookmakers?.map((bookmaker: any) => ({
        id: bookmaker.id,
        name: bookmaker.name,
        displayName: bookmaker.displayName,
        country: bookmaker.country,
        currency: bookmaker.currency
      })) || [];
      
      logSuccess('SportsGameOddsAPI', `Retrieved ${bookmakers.length} bookmakers`);
      return bookmakers;
    } catch (error) {
      logError('SportsGameOddsAPI', 'Failed to get bookmakers:', error);
      return [];
    }
  }

  // Get player props for a specific sport from SportsGameOdds markets
  async getPlayerProps(sport: string): Promise<SportsGameOddsPlayerProp[]> {
    try {
      logAPI('SportsGameOddsAPI', `Fetching player props for ${sport} from SportsGameOdds markets`);
      
      const leagueId = this.mapSportToLeagueId(sport);
      if (!leagueId) {
        logWarning('SportsGameOddsAPI', `No league ID found for ${sport}`);
        return [];
      }

      // Get events/games for the sport with optimized query parameters
      // Only fetch events with odds available and limit to recent games
      const response = await this.makeRequest<any>(
        `/v2/events?leagueID=${leagueId}&oddsAvailable=true&limit=10`, 
        CACHE_DURATION.ODDS
      );
      
      // Handle the response structure: { success: true, data: [...], nextCursor: ... }
      const eventsData = response.data || response;
      logAPI('SportsGameOddsAPI', `Found ${eventsData.length} events for ${sport}`);
      
      if (!Array.isArray(eventsData) || eventsData.length === 0) {
        logWarning('SportsGameOddsAPI', `No events found for ${sport}`);
        return [];
      }

      // Extract player props from the markets in each event
      const playerProps: SportsGameOddsPlayerProp[] = [];
      
      for (const event of eventsData) {
        try {
          // Check if this event has player props markets
          const eventPlayerProps = await this.extractPlayerPropsFromEvent(event, sport);
          playerProps.push(...eventPlayerProps);
        } catch (error) {
          logWarning('SportsGameOddsAPI', `Failed to extract props from event ${event.eventID}:`, error);
        }
      }

      // SportsGameOdds only provides team-level betting data, not individual player props
      if (playerProps.length === 0) {
        logWarning('SportsGameOddsAPI', `No player props found in SportsGameOdds markets for ${sport}. SportsGameOdds only provides team-level betting data, not individual player props.`);
      }

      logSuccess('SportsGameOddsAPI', `Retrieved ${playerProps.length} player props from SportsGameOdds markets for ${sport}`);
      return playerProps;
      
    } catch (error) {
      logError('SportsGameOddsAPI', `Failed to get player props for ${sport}:`, error);
      return [];
    }
  }

  // Extract player props from a SportsGameOdds event markets
  private async extractPlayerPropsFromEvent(event: any, sport: string): Promise<SportsGameOddsPlayerProp[]> {
    const playerProps: SportsGameOddsPlayerProp[] = [];
    
    logAPI('SportsGameOddsAPI', `Extracting player props from event ${event.eventID} markets`);
    
    // Check if the event has odds/markets data
    if (!event.odds) {
      logAPI('SportsGameOddsAPI', `Event ${event.eventID} has no odds data`);
      return [];
    }

    const homeTeam = event.teams?.home?.names?.short || 'HOME';
    const awayTeam = event.teams?.away?.names?.short || 'AWAY';
    const gameId = event.eventID;
    const gameTime = event.status?.startsAt || new Date().toISOString();

    // Look for player-specific markets in the odds
    // Player props have playerID as statEntityID in the oddID format: {statID}-{playerID}-{periodID}-{betTypeID}-{sideID}
    for (const [oddId, oddData] of Object.entries(event.odds)) {
      try {
        const odd = oddData as any;
        
        // Check if this is a player prop market (has playerID as statEntityID)
        if (this.isPlayerPropMarket(odd, oddId)) {
          const playerProp = this.convertOddToPlayerProp(odd, oddId, sport, homeTeam, awayTeam, gameId, gameTime, event);
          if (playerProp) {
            playerProps.push(playerProp);
          }
        }
      } catch (error) {
        logWarning('SportsGameOddsAPI', `Failed to process odd ${oddId}:`, error);
      }
    }

    logAPI('SportsGameOddsAPI', `Extracted ${playerProps.length} player props from event ${event.eventID} markets`);
    return playerProps;
  }

  // Get player-specific data for an event
  private async getPlayerDataForEvent(eventId: string, sport: string): Promise<SportsGameOddsPlayerProp[]> {
    const playerProps: SportsGameOddsPlayerProp[] = [];
    
    try {
      // Try different player-specific endpoints
      const endpoints = [
        `/v2/events/${eventId}/players`,
        `/v2/events/${eventId}/player-props`,
        `/v2/events/${eventId}/markets`
      ];

      for (const endpoint of endpoints) {
        try {
          logAPI('SportsGameOddsAPI', `Trying player endpoint: ${endpoint}`);
          const data = await this.makeRequest<any>(endpoint, CACHE_DURATION.ODDS);
          
          if (data && (data.players || data.playerProps || data.markets)) {
            logAPI('SportsGameOddsAPI', `Found player data from ${endpoint}`);
            const props = this.processPlayerData(data, sport, eventId);
            playerProps.push(...props);
            
            if (props.length > 0) {
              logSuccess('SportsGameOddsAPI', `Found ${props.length} player props from ${endpoint}`);
              break; // Use first successful endpoint
            }
          }
        } catch (error) {
          logWarning('SportsGameOddsAPI', `Player endpoint ${endpoint} failed:`, error);
        }
      }
    } catch (error) {
      logError('SportsGameOddsAPI', `Failed to get player data for event ${eventId}:`, error);
    }

    return playerProps;
  }

  // Process player data from SportsGameOdds API
  private processPlayerData(data: any, sport: string, eventId: string): SportsGameOddsPlayerProp[] {
    const playerProps: SportsGameOddsPlayerProp[] = [];
    
    try {
      // This method is for processing player-specific endpoints
      // Since we're now using the markets approach, this is mainly for fallback
      logAPI('SportsGameOddsAPI', 'Processing player data from alternative endpoints');
      
      // For now, return empty array since we're using markets approach
      // This can be expanded later if needed for specific player endpoints
    } catch (error) {
      logError('SportsGameOddsAPI', 'Failed to process player data:', error);
    }

    return playerProps;
  }

  // Convert SportsGameOdds odd to player prop using oddID format
  private convertOddToPlayerProp(odd: any, oddId: string, sport: string, homeTeam: string, awayTeam: string, gameId: string, gameTime: string, event?: any): SportsGameOddsPlayerProp | null {
    try {
      // Parse oddID format: {statID}-{playerID}-{periodID}-{betTypeID}-{sideID}
      const oddIdParts = oddId.split('-');
      if (oddIdParts.length < 5) return null;
      
      const [statID, playerID, periodID, betTypeID, sideID] = oddIdParts;
      
      // Extract player name from playerID (e.g., "JAMES_COOK_1_NFL" -> "James Cook")
      const playerName = this.extractPlayerNameFromPlayerID(playerID);
      
      if (!playerName) {
        return null; // Invalid playerID format
      }

      // Determine team based on playerID using event data
      const team = this.extractTeamFromPlayerID(playerID, homeTeam, awayTeam, event);

      // Extract prop type from statID
      const propType = this.extractPropTypeFromStatID(statID);

      // Extract line and odds
      const line = odd.fairOverUnder || odd.bookOverUnder || odd.fairSpread || odd.line || 0;
      const overOdds = sideID === 'over' ? odd.fairOdds : -110;
      const underOdds = sideID === 'under' ? odd.fairOdds : -110;

      logAPI('SportsGameOddsAPI', `Converting player prop: ${playerName} - ${propType} - Line: ${line}`);

      return {
        id: `sgo-${gameId}-${oddId}`,
        playerId: playerID,
        playerName: playerName,
        team: team,
        sport: sport.toUpperCase(),
        propType: propType,
        line: line,
        overOdds: overOdds,
        underOdds: underOdds,
        sportsbook: 'SportsGameOdds',
        sportsbookKey: 'sgo',
        lastUpdate: new Date().toISOString(),
        gameId: gameId,
        gameTime: gameTime,
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        confidence: 0.5,
        market: propType,
        outcome: 'pending',
        betType: betTypeID || 'over_under',
        side: sideID || 'over',
        period: periodID || 'full_game',
        statEntity: playerID
      };
    } catch (error) {
      logError('SportsGameOddsAPI', 'Failed to convert odd to player prop:', error);
      return null;
    }
  }

  // Convert player data to player prop
  private convertPlayerToPlayerProp(player: any, sport: string, eventId: string): SportsGameOddsPlayerProp | null {
    try {
      return {
        id: `sgo-player-${eventId}-${player.id || player.playerId}`,
        playerId: player.id || player.playerId || 'unknown',
        playerName: player.name || player.playerName || 'Unknown Player',
        team: player.team || 'Unknown',
        sport: sport.toUpperCase(),
        propType: player.propType || player.market || 'Points',
        line: player.line || player.overUnder || 0,
        overOdds: player.overOdds || player.over || -110,
        underOdds: player.underOdds || player.under || -110,
        sportsbook: 'SportsGameOdds',
        sportsbookKey: 'sgo',
        lastUpdate: new Date().toISOString(),
        gameId: eventId,
        gameTime: player.gameTime || new Date().toISOString(),
        homeTeam: player.homeTeam || 'Unknown',
        awayTeam: player.awayTeam || 'Unknown',
        confidence: 0.5,
        market: player.market || 'Points',
        outcome: 'pending',
        betType: 'over_under',
        side: 'over',
        period: 'full_game',
        statEntity: player.statEntity || 'player'
      };
    } catch (error) {
      logError('SportsGameOddsAPI', 'Failed to convert player to player prop:', error);
      return null;
    }
  }

  // Extract player name from market name
  private extractPlayerNameFromMarket(marketName: string, statEntity: string): string | null {
    // Look for player names in market names like "Josh Allen Passing Yards Over/Under"
    const playerPatterns = [
      /^([A-Za-z\s]+)\s+(Passing|Rushing|Receiving|Points|Touchdowns|Yards|Receptions)/i,
      /^([A-Za-z\s]+)\s+(Over\/Under|Points|Yards)/i,
      /([A-Za-z\s]+)\s+(Quarter|Half|Game)/i
    ];

    for (const pattern of playerPatterns) {
      const match = marketName.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  // Extract player name from playerID (e.g., "JAMES_COOK_1_NFL" -> "James Cook")
  private extractPlayerNameFromPlayerID(playerID: string): string | null {
    try {
      // PlayerID format: "FIRSTNAME_LASTNAME_NUMBER_LEAGUE"
      const parts = playerID.split('_');
      if (parts.length < 4) return null;
      
      const firstName = parts[0];
      const lastName = parts[1];
      
      // Convert to proper case
      const properFirstName = firstName.charAt(0) + firstName.slice(1).toLowerCase();
      const properLastName = lastName.charAt(0) + lastName.slice(1).toLowerCase();
      
      return `${properFirstName} ${properLastName}`;
    } catch (error) {
      logError('SportsGameOddsAPI', 'Failed to extract player name from playerID:', error);
      return null;
    }
  }

  // Extract team from playerID using team mapping from API response
  private extractTeamFromPlayerID(playerID: string, homeTeam: string, awayTeam: string, event?: any): string {
    // Try to get team from event players data if available
    if (event?.players?.[playerID]?.teamID) {
      const teamID = event.players[playerID].teamID;
      // Map teamID to team abbreviation
      if (teamID.includes('SAN_FRANCISCO_49ERS')) return 'SF';
      if (teamID.includes('LOS_ANGELES_RAMS')) return 'LAR';
      if (teamID.includes('BUFFALO_BILLS')) return 'BUF';
      if (teamID.includes('MIAMI_DOLPHINS')) return 'MIA';
      if (teamID.includes('TENNESSEE_TITANS')) return 'TEN';
      if (teamID.includes('JACKSONVILLE_JAGUARS')) return 'JAX';
      if (teamID.includes('LAS_VEGAS_RAIDERS')) return 'LV';
      if (teamID.includes('KANSAS_CITY_CHIEFS')) return 'KC';
      // Add more team mappings as needed
    }
    
    // Fallback: randomly assign to home or away team
    return Math.random() > 0.5 ? homeTeam : awayTeam;
  }

  // Extract prop type from statID
  private extractPropTypeFromStatID(statID: string): string {
    const statMap: { [key: string]: string } = {
      'passing_yards': 'Passing Yards',
      'rushing_yards': 'Rushing Yards',
      'receiving_yards': 'Receiving Yards',
      'receptions': 'Receptions',
      'passing_touchdowns': 'Passing Touchdowns',
      'rushing_touchdowns': 'Rushing Touchdowns',
      'receiving_touchdowns': 'Receiving Touchdowns',
      'passing_interceptions': 'Interceptions',
      'defense_interceptions': 'Interceptions',
      'fumbles_lost': 'Fumbles Lost',
      'passing_completions': 'Passing Completions',
      'passing_attempts': 'Passing Attempts',
      'passing_longestCompletion': 'Longest Completion',
      'rushing_attempts': 'Rushing Attempts',
      'rushing_longestRush': 'Longest Rush',
      'fieldGoals_made': 'Field Goals Made',
      'extraPoints_kicksMade': 'Extra Points Made',
      'kicking_totalPoints': 'Kicking Total Points',
      'defense_combinedTackles': 'Combined Tackles',
      'defense_sacks': 'Sacks',
      'fantasyScore': 'Fantasy Score',
      'passing+rushing_yards': 'Passing + Rushing Yards',
      // Additional stat types found in actual data
      'touchdowns': 'Touchdowns',
      'firstTouchdown': 'First Touchdown',
      'lastTouchdown': 'Last Touchdown'
    };
    
    return statMap[statID.toLowerCase()] || statID.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Extract prop type from market name
  private extractPropTypeFromMarket(marketName: string): string {
    if (marketName.includes('Passing Yards')) return 'Passing Yards';
    if (marketName.includes('Rushing Yards')) return 'Rushing Yards';
    if (marketName.includes('Receiving Yards')) return 'Receiving Yards';
    if (marketName.includes('Receptions')) return 'Receptions';
    if (marketName.includes('Touchdowns')) return 'Touchdowns';
    if (marketName.includes('Points')) return 'Points';
    if (marketName.includes('Over/Under')) return 'Over/Under';
    return 'Points';
  }

  // Check if a market/odd is a player prop based on oddID format
  private isPlayerPropMarket(market: any, oddId: string): boolean {
    if (!market || !oddId) return false;
    
    // Player prop oddID format: {statID}-{playerID}-{periodID}-{betTypeID}-{sideID}
    // Example: "rushing_yards-JAMES_COOK_1_NFL-game-ou-over"
    const oddIdParts = oddId.split('-');
    
    if (oddIdParts.length < 5) return false;
    
    const [statID, statEntityID, periodID, betTypeID, sideID] = oddIdParts;
    
    // Check if statEntityID is a playerID (contains player name pattern)
    // PlayerIDs typically contain underscores and player names like "JAMES_COOK_1_NFL"
    const isPlayerID = /^[A-Z_]+_[A-Z_]+_\d+_[A-Z]+$/.test(statEntityID);
    
    // Check if it's a player-specific stat
    const playerStats = [
      'passing_yards', 'rushing_yards', 'receiving_yards', 'receptions',
      'passing_touchdowns', 'rushing_touchdowns', 'receiving_touchdowns',
      'passing_interceptions', 'defense_interceptions', 'fumbles_lost', 
      'passing_completions', 'passing_attempts', 'passing_longestCompletion',
      'rushing_attempts', 'rushing_longestRush', 'fieldGoals_made', 
      'extraPoints_kicksMade', 'kicking_totalPoints', 'defense_combinedTackles',
      'defense_sacks', 'fantasyScore', 'passing+rushing_yards',
      // Additional stat types found in actual data
      'touchdowns', 'firstTouchdown', 'lastTouchdown'
    ];
    
    const isPlayerStat = playerStats.includes(statID.toLowerCase());
    
    // Check if it's an over/under bet type (common for player props)
    const isOverUnder = betTypeID === 'ou';
    
    logAPI('SportsGameOddsAPI', `Checking oddID: ${oddId} - isPlayerID: ${isPlayerID}, isPlayerStat: ${isPlayerStat}, isOverUnder: ${isOverUnder}`);
    
    return isPlayerID && isPlayerStat && isOverUnder;
  }

  // Process player props data from SportsGameOdds API response
  private processPlayerPropsData(data: any, sport: string, endpoint: string): SportsGameOddsPlayerProp[] {
    const playerProps: SportsGameOddsPlayerProp[] = [];
    
    logAPI('SportsGameOddsAPI', `Processing data from ${endpoint}`);
    
    try {
      // Handle different data structures
      let markets = [];
      
      if (data.markets) {
        markets = data.markets;
      } else if (data.odds) {
        markets = data.odds;
      } else if (data.games) {
        // Extract markets from games
        markets = data.games.flatMap((game: any) => game.markets || []);
      } else if (data.playerProps) {
        markets = data.playerProps;
      }

      markets.forEach((market: any, index: number) => {
        // Skip player prop market check since we're using markets approach
        // This method is for processing alternative data structures
        const playerProp: SportsGameOddsPlayerProp = {
          id: market.id || `sgo-prop-${index}`,
          playerId: market.playerId || market.player?.id || 'unknown',
          playerName: market.playerName || market.player?.name || 'Unknown Player',
          team: market.team || market.player?.team || 'Unknown Team',
          sport: sport.toUpperCase(),
          propType: market.propType || market.market || market.betType || 'Points',
          line: market.line || market.overUnder || market.spread || 0,
          overOdds: market.overOdds || market.over || -110,
          underOdds: market.underOdds || market.under || -110,
          sportsbook: market.sportsbook || market.bookmaker || 'SportsGameOdds',
          sportsbookKey: market.sportsbookKey || market.bookmakerId || 'sgo',
          lastUpdate: market.lastUpdate || market.updatedAt || new Date().toISOString(),
          gameId: market.gameId || market.game?.id || 'unknown',
          gameTime: market.gameTime || market.game?.time || new Date().toISOString(),
          homeTeam: market.homeTeam || market.game?.homeTeam || 'Unknown',
          awayTeam: market.awayTeam || market.game?.awayTeam || 'Unknown',
          confidence: market.confidence || 0.5,
          market: market.market || market.betType || 'Points',
          outcome: market.outcome || 'pending',
          betType: market.betType || 'over_under',
          side: market.side || 'over',
          period: market.period || 'full_game',
          statEntity: market.statEntity || market.stat || 'points'
        };
        
        playerProps.push(playerProp);
      });
      
      logSuccess('SportsGameOddsAPI', `Processed ${playerProps.length} player props from ${endpoint}`);
      return playerProps;
      
    } catch (error) {
      logError('SportsGameOddsAPI', `Failed to process data from ${endpoint}:`, error);
      return [];
    }
  }


  // Map sport names to SportsGameOdds sport IDs
  private mapSportToId(sport: string): string | null {
    const sportMap: { [key: string]: string } = {
      'nfl': '1',
      'nba': '2', 
      'mlb': '3',
      'nhl': '4',
      'soccer': '5',
      'tennis': '6',
      'mma': '7',
      'handball': '8'
    };
    return sportMap[sport.toLowerCase()] || null;
  }

  // Map sport names to SportsGameOdds league IDs
  private mapSportToLeagueId(sport: string): string | null {
    const leagueMap: { [key: string]: string } = {
      'nfl': 'NFL',
      'nba': 'NBA',
      'mlb': 'MLB',
      'nhl': 'NHL',
      'soccer': 'MLS',
      'tennis': 'TENNIS',
      'mma': 'MMA',
      'handball': 'HANDBALL'
    };
    return leagueMap[sport.toLowerCase()] || null;
  }



  // Create sample player props for testing
  private createSamplePlayerProps(sport: string): SportsGameOddsPlayerProp[] {
    const sportKey = sport.toLowerCase();
    const sampleProps: SportsGameOddsPlayerProp[] = [];

    const sampleData = {
      nfl: [
        { player: 'Josh Allen', team: 'Bills', prop: 'Passing Yards', line: 275, overOdds: -110, underOdds: -110 },
        { player: 'Derrick Henry', team: 'Titans', prop: 'Rushing Yards', line: 85, overOdds: -115, underOdds: -105 },
        { player: 'Davante Adams', team: 'Raiders', prop: 'Receiving Yards', line: 75, overOdds: -110, underOdds: -110 },
        { player: 'Travis Kelce', team: 'Chiefs', prop: 'Receptions', line: 6.5, overOdds: -105, underOdds: -115 },
        { player: 'Cooper Kupp', team: 'Rams', prop: 'Receiving Yards', line: 80, overOdds: -110, underOdds: -110 }
      ],
      nba: [
        { player: 'LeBron James', team: 'Lakers', prop: 'Points', line: 25.5, overOdds: -110, underOdds: -110 },
        { player: 'Stephen Curry', team: 'Warriors', prop: 'Points', line: 28.5, overOdds: -105, underOdds: -115 },
        { player: 'Nikola Jokic', team: 'Nuggets', prop: 'Rebounds', line: 12.5, overOdds: -110, underOdds: -110 },
        { player: 'Luka Doncic', team: 'Mavericks', prop: 'Assists', line: 8.5, overOdds: -115, underOdds: -105 },
        { player: 'Giannis Antetokounmpo', team: 'Bucks', prop: 'Points', line: 30.5, overOdds: -110, underOdds: -110 }
      ],
      mlb: [
        { player: 'Aaron Judge', team: 'Yankees', prop: 'Hits', line: 1.5, overOdds: -110, underOdds: -110 },
        { player: 'Mookie Betts', team: 'Dodgers', prop: 'Hits', line: 1.5, overOdds: -105, underOdds: -115 },
        { player: 'Ronald Acuña Jr.', team: 'Braves', prop: 'Home Runs', line: 0.5, overOdds: -120, underOdds: -100 },
        { player: 'Mike Trout', team: 'Angels', prop: 'RBIs', line: 0.5, overOdds: -110, underOdds: -110 },
        { player: 'Vladimir Guerrero Jr.', team: 'Blue Jays', prop: 'Hits', line: 1.5, overOdds: -110, underOdds: -110 }
      ],
      nhl: [
        { player: 'Connor McDavid', team: 'Oilers', prop: 'Points', line: 1.5, overOdds: -110, underOdds: -110 },
        { player: 'Nathan MacKinnon', team: 'Avalanche', prop: 'Points', line: 1.5, overOdds: -105, underOdds: -115 },
        { player: 'Leon Draisaitl', team: 'Oilers', prop: 'Assists', line: 0.5, overOdds: -110, underOdds: -110 },
        { player: 'Auston Matthews', team: 'Maple Leafs', prop: 'Goals', line: 0.5, overOdds: -120, underOdds: -100 },
        { player: 'Artemi Panarin', team: 'Rangers', prop: 'Points', line: 1.5, overOdds: -110, underOdds: -110 }
      ]
    };

    const data = sampleData[sportKey as keyof typeof sampleData] || sampleData.nfl;
    
    data.forEach((item, index) => {
      const playerProp: SportsGameOddsPlayerProp = {
        id: `sgo-sample-${sportKey}-${index}`,
        playerId: `player-${index}`,
        playerName: item.player,
        team: item.team,
        sport: sport.toUpperCase(),
        propType: item.prop,
        line: item.line,
        overOdds: item.overOdds,
        underOdds: item.underOdds,
        sportsbook: 'SportsGameOdds',
        sportsbookKey: 'sgo',
        lastUpdate: new Date().toISOString(),
        gameId: `game-${index}`,
        gameTime: new Date().toISOString(),
        homeTeam: 'Home Team',
        awayTeam: 'Away Team',
        confidence: 0.5,
        market: item.prop,
        outcome: 'pending',
        betType: 'over_under',
        side: 'over',
        period: 'full_game',
        statEntity: item.prop.toLowerCase().replace(/\s+/g, '_')
      };
      
      sampleProps.push(playerProp);
    });

    return sampleProps;
  }

  // Get games for a specific sport
  async getGames(sport: string): Promise<SportsGameOddsGame[]> {
    try {
      const sportId = this.mapSportToId(sport);
      if (!sportId) {
        logWarning('SportsGameOddsAPI', `No sport ID found for ${sport}`);
        return [];
      }

      logAPI('SportsGameOddsAPI', `Fetching games for ${sport} (ID: ${sportId})`);
      
      const data = await this.makeRequest<any>(`/v2/sports/${sportId}/games`, CACHE_DURATION.ODDS);
      
      const games: SportsGameOddsGame[] = data.games?.map((game: any) => ({
        id: game.id,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        sport: sport.toUpperCase(),
        league: game.league || 'Unknown',
        gameTime: game.gameTime || game.time,
        status: game.status || 'scheduled',
        markets: game.markets || []
      })) || [];
      
      logSuccess('SportsGameOddsAPI', `Retrieved ${games.length} games for ${sport}`);
      return games;
      
    } catch (error) {
      logError('SportsGameOddsAPI', `Failed to get games for ${sport}:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const sportsGameOddsAPI = new SportsGameOddsAPI();
