import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { propNormalizationService } from './prop-normalization-service';
import { supabase } from '@/integrations/supabase/client';

// SportsGameOdds API Configuration
const SPORTSGAMEODDS_API_KEY = 'd5dc1f00bc42133550bc1605dd8f457f';
const SPORTSGAMEODDS_BASE_URL = 'https://api.sportsgameodds.com';

// League configuration for individual processing
export const LEAGUE_CONFIG = {
  FOOTBALL: {
    sportID: 'FOOTBALL',
    leagues: ['NFL', 'NCAAF'],
    maxEventsPerRequest: 50,
    cacheDuration: 4 * 60 * 60 * 1000 // 4 hours
  },
  BASKETBALL: {
    sportID: 'BASKETBALL', 
    leagues: ['NBA', 'NCAAB'],
    maxEventsPerRequest: 50,
    cacheDuration: 4 * 60 * 60 * 1000 // 4 hours
  },
  BASEBALL: {
    sportID: 'BASEBALL',
    leagues: ['MLB'],
    maxEventsPerRequest: 50,
    cacheDuration: 4 * 60 * 60 * 1000 // 4 hours
  },
  HOCKEY: {
    sportID: 'HOCKEY',
    leagues: ['NHL'],
    maxEventsPerRequest: 50,
    cacheDuration: 4 * 60 * 60 * 1000 // 4 hours
  }
} as const;

// Player prop interface for ingestion
export interface IngestedPlayerProp {
  player_id: string;
  player_name: string;
  team: string;
  opponent: string;
  prop_type: string;
  line: number;
  over_odds: number;
  under_odds: number;
  sportsbook: string;
  sportsbook_key: string;
  game_id: string;
  game_time: string;
  home_team: string;
  away_team: string;
  league: string;
  season: string;
  week?: string;
  conflict_key: string;
  last_updated: string;
  is_available: boolean;
}

// API response interfaces
interface SportsGameOddsEvent {
  eventID: string;
  teams: {
    home: {
      teamID: string;
      names: {
        long: string;
        medium: string;
        short: string;
      };
      statEntityID: string;
    };
    away: {
      teamID: string;
      names: {
        long: string;
        medium: string;
        short: string;
      };
      statEntityID: string;
    };
  };
  status: {
    started: boolean;
    completed: boolean;
    startsAt: string;
    displayShort: string;
    displayLong: string;
  };
  odds: Record<string, any>;
}

interface SportsGameOddsResponse {
  success: boolean;
  data: SportsGameOddsEvent[];
  nextCursor?: string;
}

class SportsGameOddsIngestionService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private rateLimitedUntil: number = 0;
  private readonly BASE_BACKOFF_MS = 60000; // 1 minute
  private readonly MAX_BACKOFF_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Main ingestion method - processes all leagues individually
   */
  async ingestAllLeagues(season: string = '2025', week?: string): Promise<IngestedPlayerProp[]> {
    const allProps: IngestedPlayerProp[] = [];
    
    logInfo('SportsGameOddsIngestion', `Starting ingestion for season ${season}${week ? `, week ${week}` : ''}`);
    
    // Process each sport individually to avoid large payloads
    for (const [sportName, config] of Object.entries(LEAGUE_CONFIG)) {
      try {
        logAPI('SportsGameOddsIngestion', `Processing ${sportName} leagues: ${config.leagues.join(', ')}`);
        
        // Process each league within the sport
        for (const league of config.leagues) {
          try {
            const leagueProps = await this.ingestLeague(config.sportID, league, season, week);
            allProps.push(...leagueProps);
            
            logSuccess('SportsGameOddsIngestion', `Ingested ${leagueProps.length} props for ${league}`);
            
            // Rate limiting between leagues
            await this.enforceRateLimit();
          } catch (error) {
            logError('SportsGameOddsIngestion', `Failed to ingest ${league}:`, error);
          }
        }
      } catch (error) {
        logError('SportsGameOddsIngestion', `Failed to process ${sportName}:`, error);
      }
    }
    
    logSuccess('SportsGameOddsIngestion', `Total ingested: ${allProps.length} props`);
    return allProps;
  }

  /**
   * Ingest props for a specific league
   */
  async ingestLeague(sportID: string, league: string, season: string, week?: string): Promise<IngestedPlayerProp[]> {
    const cacheKey = `${sportID}-${league}-${season}-${week || 'all'}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      const config = Object.values(LEAGUE_CONFIG).find(c => c.sportID === sportID);
      if (Date.now() - cached.timestamp < (config?.cacheDuration || 4 * 60 * 60 * 1000)) {
        logAPI('SportsGameOddsIngestion', `Using cached data for ${league}`);
        return cached.data;
      }
    }

    logAPI('SportsGameOddsIngestion', `Fetching events for ${league} (${sportID})`);
    
    let allEvents: SportsGameOddsEvent[] = [];
    let nextCursor: string | null = null;
    let pageCount = 0;
    const maxPages = 10; // Safety limit

    do {
      try {
        const endpoint = this.buildEventsEndpoint(sportID, league, season, week, nextCursor);
        const response = await this.makeAPIRequest<SportsGameOddsResponse>(endpoint);
        
        if (response.success && response.data) {
          allEvents = allEvents.concat(response.data);
          nextCursor = response.nextCursor || null;
          pageCount++;
          
          logAPI('SportsGameOddsIngestion', `Fetched ${response.data.length} events for ${league} (page ${pageCount}, total: ${allEvents.length})`);
        } else {
          logWarning('SportsGameOddsIngestion', `Invalid response for ${league}:`, response);
          break;
        }
        
        // Rate limiting between pages
        await this.enforceRateLimit();
      } catch (error) {
        logError('SportsGameOddsIngestion', `Failed to fetch events for ${league}:`, error);
        break;
      }
    } while (nextCursor && pageCount < maxPages);

    if (allEvents.length === 0) {
      logWarning('SportsGameOddsIngestion', `No events found for ${league}`);
      return [];
    }

    // Extract player props from events
    const playerProps = await this.extractPlayerPropsFromEvents(allEvents, league, season, week);
    
    // Cache the results
    this.cache.set(cacheKey, { data: playerProps, timestamp: Date.now() });
    
    return playerProps;
  }

  /**
   * Extract player props from events
   */
  private async extractPlayerPropsFromEvents(
    events: SportsGameOddsEvent[], 
    league: string, 
    season: string, 
    week?: string
  ): Promise<IngestedPlayerProp[]> {
    const allProps: IngestedPlayerProp[] = [];
    
    for (const event of events) {
      try {
        const eventProps = await this.extractPlayerPropsFromEvent(event, league, season, week);
        allProps.push(...eventProps);
      } catch (error) {
        logWarning('SportsGameOddsIngestion', `Failed to extract props from event ${event.eventID}:`, error);
      }
    }
    
    return allProps;
  }

  /**
   * Extract player props from a single event
   */
  private async extractPlayerPropsFromEvent(
    event: SportsGameOddsEvent,
    league: string,
    season: string,
    week?: string
  ): Promise<IngestedPlayerProp[]> {
    const props: IngestedPlayerProp[] = [];
    
    const homeTeam = event.teams.home.names.short;
    const awayTeam = event.teams.away.names.short;
    const gameTime = event.status.startsAt;
    
    logAPI('SportsGameOddsIngestion', `Processing event ${event.eventID}: ${awayTeam} @ ${homeTeam}`);
    
    // Process each odd in the event
    for (const [oddId, oddData] of Object.entries(event.odds)) {
      try {
        // Check if this is a player prop
        if (this.isPlayerProp(oddData, oddId)) {
          const playerProps = await this.createPlayerPropsFromOdd(
            oddData, 
            oddId, 
            event, 
            league, 
            season, 
            week
          );
          props.push(...playerProps);
        }
      } catch (error) {
        logWarning('SportsGameOddsIngestion', `Failed to process odd ${oddId}:`, error);
      }
    }
    
    logAPI('SportsGameOddsIngestion', `Extracted ${props.length} props from event ${event.eventID}`);
    return props;
  }

  /**
   * Create player props from odd data
   */
  private async createPlayerPropsFromOdd(
    odd: any,
    oddId: string,
    event: SportsGameOddsEvent,
    league: string,
    season: string,
    week?: string
  ): Promise<IngestedPlayerProp[]> {
    const props: IngestedPlayerProp[] = [];
    
    // Only process 'over' side - we'll find the corresponding 'under' side
    if (odd.sideID !== 'over') {
      return props;
    }
    
    // Find the corresponding under odd
    const underOddId = oddId.replace('-over', '-under');
    const underOdd = event.odds[underOddId];
    
    if (!underOdd) {
      logWarning('SportsGameOddsIngestion', `No corresponding under odd found for ${oddId}`);
      return props;
    }

    // Process each bookmaker's odds
    if (odd.byBookmaker) {
      for (const [bookmakerId, bookmakerData] of Object.entries(odd.byBookmaker)) {
        try {
          const overData = bookmakerData as any;
          
          // Only process available odds
          if (!overData.available) {
            continue;
          }

          // Get corresponding under data
          const underData = underOdd.byBookmaker?.[bookmakerId];
          if (!underData || !underData.available) {
            continue;
          }

          // Create the player prop
          const prop = this.createIngestedPlayerProp(
            odd,
            overData,
            underData,
            bookmakerId,
            event,
            league,
            season,
            week
          );

          if (prop) {
            props.push(prop);
          }
        } catch (error) {
          logWarning('SportsGameOddsIngestion', `Failed to process bookmaker ${bookmakerId}:`, error);
        }
      }
    }
    
    return props;
  }

  /**
   * Create an ingested player prop object
   */
  private createIngestedPlayerProp(
    odd: any,
    overData: any,
    underData: any,
    bookmakerId: string,
    event: SportsGameOddsEvent,
    league: string,
    season: string,
    week?: string
  ): IngestedPlayerProp | null {
    try {
      // Extract player information
      const playerID = odd.playerID || odd.statEntityID;
      const playerName = propNormalizationService.extractPlayerName(playerID);
      const team = propNormalizationService.extractTeam(
        playerID, 
        event.teams.home.names.short, 
        event.teams.away.names.short
      );
      
      // Normalize prop type
      const propType = propNormalizationService.normalizePropType(odd.statID, 'statID');
      
      // Parse odds and line
      const overOdds = propNormalizationService.parseOdds(overData.odds);
      const underOdds = propNormalizationService.parseOdds(underData.odds);
      const line = overData.overUnder || overData.line || 0;
      
      // Validate required data
      if (!overOdds || !underOdds || !line) {
        logWarning('SportsGameOddsIngestion', `Missing required data for ${playerName} ${propType}`);
        return null;
      }

      // Create conflict key
      const conflictKey = propNormalizationService.createConflictKey(
        playerID,
        propType,
        line,
        bookmakerId,
        event.eventID
      );

      return {
        player_id: playerID,
        player_name: playerName,
        team: team,
        opponent: team === event.teams.home.names.short ? event.teams.away.names.short : event.teams.home.names.short,
        prop_type: propType,
        line: line,
        over_odds: overOdds,
        under_odds: underOdds,
        sportsbook: this.mapBookmakerIdToName(bookmakerId),
        sportsbook_key: bookmakerId,
        game_id: event.eventID,
        game_time: event.status.startsAt,
        home_team: event.teams.home.names.short,
        away_team: event.teams.away.names.short,
        league: league,
        season: season,
        week: week,
        conflict_key: conflictKey,
        last_updated: new Date().toISOString(),
        is_available: true
      };
    } catch (error) {
      logError('SportsGameOddsIngestion', `Failed to create player prop:`, error);
      return null;
    }
  }

  /**
   * Check if an odd is a player prop
   */
  private isPlayerProp(odd: any, oddId: string): boolean {
    if (!odd || !oddId) return false;
    
    // Player prop oddID format: {statID}-{playerID}-{periodID}-{betTypeID}-{sideID}
    const oddIdParts = oddId.split('-');
    if (oddIdParts.length < 5) return false;
    
    const [statID, statEntityID, periodID, betTypeID, sideID] = oddIdParts;
    
    // Check if statEntityID is a playerID (contains player name pattern)
    const isPlayerID = /^[A-Z_]+_[A-Z_]+_\d+_[A-Z]+$/.test(statEntityID);
    
    // Check if it's an over/under bet type
    const isOverUnder = betTypeID === 'ou' || betTypeID === 'over_under';
    
    // Check if it's a player-specific stat
    const playerStats = [
      'passing_yards', 'rushing_yards', 'receiving_yards', 'receptions',
      'passing_touchdowns', 'rushing_touchdowns', 'receiving_touchdowns',
      'passing_interceptions', 'passing_completions', 'passing_attempts',
      'rushing_attempts', 'points', 'assists', 'rebounds', 'steals', 'blocks',
      'hits', 'runs', 'rbis', 'home_runs', 'goals', 'saves'
    ];
    
    const isPlayerStat = playerStats.includes(statID.toLowerCase());
    
    return isPlayerID && isOverUnder && isPlayerStat;
  }

  /**
   * Build events endpoint URL
   */
  private buildEventsEndpoint(
    sportID: string, 
    league: string, 
    season: string, 
    week?: string, 
    cursor?: string
  ): string {
    let endpoint = `/v2/events?sportID=${sportID}&season=${season}&oddsAvailable=true&markets=playerProps`;
    
    if (week) {
      endpoint += `&week=${week}`;
    }
    
    if (cursor) {
      endpoint += `&cursor=${cursor}`;
    }
    
    return endpoint;
  }

  /**
   * Make API request with rate limiting
   */
  private async makeAPIRequest<T>(endpoint: string): Promise<T> {
    // Check if we're rate limited
    if (Date.now() < this.rateLimitedUntil) {
      const waitTime = Math.ceil((this.rateLimitedUntil - Date.now()) / 1000);
      throw new Error(`Rate limited for ${waitTime} more seconds`);
    }

    try {
      const url = `${SPORTSGAMEODDS_BASE_URL}${endpoint}`;
      
      logAPI('SportsGameOddsIngestion', `Making request to: ${endpoint}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Statpedia/1.0',
          'x-api-key': SPORTSGAMEODDS_API_KEY
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          this.handleRateLimit();
          throw new Error('Rate limit exceeded');
        }
        
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      this.resetRateLimit();
      
      return data;
    } catch (error) {
      logError('SportsGameOddsIngestion', `Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Handle rate limiting
   */
  private handleRateLimit(): void {
    const backoffTime = Math.min(this.BASE_BACKOFF_MS, this.MAX_BACKOFF_MS);
    this.rateLimitedUntil = Date.now() + backoffTime;
    logWarning('SportsGameOddsIngestion', `Rate limited! Backing off for ${Math.ceil(backoffTime / 1000)} seconds`);
  }

  /**
   * Reset rate limit
   */
  private resetRateLimit(): void {
    this.rateLimitedUntil = 0;
  }

  /**
   * Enforce rate limiting between requests
   */
  private async enforceRateLimit(): Promise<void> {
    if (Date.now() < this.rateLimitedUntil) {
      const waitTime = this.rateLimitedUntil - Date.now();
      logAPI('SportsGameOddsIngestion', `Waiting ${Math.ceil(waitTime / 1000)}s due to rate limit`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Map bookmaker ID to display name
   */
  private mapBookmakerIdToName(bookmakerId: string): string {
    const bookmakerMap: { [key: string]: string } = {
      'fanduel': 'FanDuel',
      'draftkings': 'Draft Kings',
      'betmgm': 'BetMGM',
      'caesars': 'Caesars',
      'pointsbet': 'PointsBet',
      'betrivers': 'BetRivers',
      'foxbet': 'FOX Bet',
      'bet365': 'bet365',
      'williamhill': 'William Hill',
      'pinnacle': 'Pinnacle',
      'bovada': 'Bovada',
      'betonline': 'BetOnline',
      'betway': 'Betway',
      'unibet': 'Unibet',
      'ladbrokes': 'Ladbrokes',
      'coral': 'Coral',
      'paddypower': 'Paddy Power',
      'skybet': 'Sky Bet',
      'boylesports': 'BoyleSports',
      'betfair': 'Betfair',
      'betvictor': 'Bet Victor',
      'betfred': 'Betfred',
      'prizepicks': 'PrizePicks',
      'fliff': 'Fliff',
      'prophetexchange': 'Prophet Exchange',
      'unknown': 'Unknown Sportsbook'
    };

    return bookmakerMap[bookmakerId.toLowerCase()] || bookmakerId;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logInfo('SportsGameOddsIngestion', 'Cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const sportsGameOddsIngestionService = new SportsGameOddsIngestionService();
