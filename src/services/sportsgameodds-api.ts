import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

// SportsGameOdds API Configuration
const SPORTSGAMEODDS_API_KEY = '740556c91b9aa5616c0521cc2f09ed74';
const SPORTSGAMEODDS_BASE_URL = 'https://api.sportsgameodds.com';

// Cache configuration
const CACHE_DURATION = {
  ODDS: 2 * 60 * 1000, // 2 minutes
  MARKETS: 5 * 60 * 1000, // 5 minutes
  SPORTS: 24 * 60 * 60 * 1000, // 24 hours
  BOOKMAKERS: 24 * 60 * 60 * 1000, // 24 hours
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

  constructor() {
    logInfo('SportsGameOddsAPI', 'SportsGameOdds API initialized');
  }

  // Make authenticated request to SportsGameOdds API
  private async makeRequest<T>(endpoint: string, cacheDuration: number = CACHE_DURATION.ODDS): Promise<T> {
    const cacheKey = endpoint;
    const now = Date.now();
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (now - cached.timestamp < cacheDuration) {
        logAPI('SportsGameOddsAPI', `Using cached data for ${endpoint}`);
        return cached.data;
      }
    }

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

      // Get events/games for the sport
      const eventsData = await this.makeRequest<any>(`/v2/events?leagueID=${leagueId}`, CACHE_DURATION.ODDS);
      logAPI('SportsGameOddsAPI', `Found ${eventsData.length} events for ${sport}`);
      
      if (eventsData.length === 0) {
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

      logSuccess('SportsGameOddsAPI', `Retrieved ${playerProps.length} player props from SportsGameOdds markets for ${sport}`);
      return playerProps;
      
    } catch (error) {
      logError('SportsGameOddsAPI', `Failed to get player props for ${sport}:`, error);
      return [];
    }
  }

  // Extract player props from a SportsGameOdds event
  private async extractPlayerPropsFromEvent(event: any, sport: string): Promise<SportsGameOddsPlayerProp[]> {
    const playerProps: SportsGameOddsPlayerProp[] = [];
    
    logAPI('SportsGameOddsAPI', `Extracting player props from event ${event.eventID}`);
    
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
    for (const [oddId, oddData] of Object.entries(event.odds)) {
      try {
        const odd = oddData as any;
        
        // Check if this is a player prop market
        if (this.isPlayerPropMarket(odd)) {
          const playerProp = this.convertOddToPlayerProp(odd, sport, homeTeam, awayTeam, gameId, gameTime);
          if (playerProp) {
            playerProps.push(playerProp);
          }
        }
      } catch (error) {
        logWarning('SportsGameOddsAPI', `Failed to process odd ${oddId}:`, error);
      }
    }

    // If no player props found in odds, check if there are player-specific endpoints
    if (playerProps.length === 0) {
      logAPI('SportsGameOddsAPI', `No player props found in odds for event ${event.eventID}, checking for player-specific data`);
      
      // Try to get player-specific data for this event
      try {
        const playerData = await this.getPlayerDataForEvent(event.eventID, sport);
        playerProps.push(...playerData);
      } catch (error) {
        logWarning('SportsGameOddsAPI', `Failed to get player data for event ${event.eventID}:`, error);
      }
    }

    logAPI('SportsGameOddsAPI', `Extracted ${playerProps.length} player props from event ${event.eventID}`);
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
      let players = [];
      
      if (data.players) {
        players = data.players;
      } else if (data.playerProps) {
        players = data.playerProps;
      } else if (data.markets) {
        // Extract players from markets
        players = data.markets.filter((market: any) => this.isPlayerPropMarket(market));
      }

      players.forEach((player: any, index: number) => {
        if (this.isPlayerPropMarket(player)) {
          const playerProp = this.convertPlayerToPlayerProp(player, sport, eventId);
          if (playerProp) {
            playerProps.push(playerProp);
          }
        }
      });
    } catch (error) {
      logError('SportsGameOddsAPI', 'Failed to process player data:', error);
    }

    return playerProps;
  }

  // Convert SportsGameOdds odd to player prop
  private convertOddToPlayerProp(odd: any, sport: string, homeTeam: string, awayTeam: string, gameId: string, gameTime: string): SportsGameOddsPlayerProp | null {
    try {
      // Extract player information from the odd
      const marketName = odd.marketName || '';
      const statEntity = odd.statEntityID || '';
      
      // Try to extract player name from market name
      const playerName = this.extractPlayerNameFromMarket(marketName, statEntity);
      
      if (!playerName) {
        return null; // Not a player prop
      }

      // Determine team based on statEntity
      const team = statEntity === 'home' ? homeTeam : statEntity === 'away' ? awayTeam : 'Unknown';
      const opponent = statEntity === 'home' ? awayTeam : statEntity === 'away' ? homeTeam : 'Unknown';

      // Extract prop type from market name
      const propType = this.extractPropTypeFromMarket(marketName);

      // Extract line and odds
      const line = odd.fairOverUnder || odd.fairSpread || odd.line || 0;
      const overOdds = odd.sideID === 'over' ? odd.fairOdds : -110;
      const underOdds = odd.sideID === 'under' ? odd.fairOdds : -110;

      return {
        id: `sgo-${gameId}-${odd.oddID}`,
        playerId: `player-${playerName.toLowerCase().replace(/\s+/g, '-')}`,
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
        betType: odd.betTypeID || 'over_under',
        side: odd.sideID || 'over',
        period: odd.periodID || 'full_game',
        statEntity: statEntity
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

  // Check if a market/odd is a player prop
  private isPlayerPropMarket(market: any): boolean {
    if (!market) return false;
    
    const marketName = market.marketName || market.name || '';
    const statEntity = market.statEntityID || market.statEntity || '';
    
    // Check if it's a player-specific market
    const playerIndicators = [
      'Passing Yards', 'Rushing Yards', 'Receiving Yards', 'Receptions',
      'Touchdowns', 'Points', 'Over/Under', 'Yards', 'Catches'
    ];
    
    const hasPlayerIndicator = playerIndicators.some(indicator => 
      marketName.toLowerCase().includes(indicator.toLowerCase())
    );
    
    // Check if it has player-specific stat entity
    const isPlayerEntity = statEntity === 'player' || statEntity.includes('player');
    
    // Check if market name contains player name patterns
    const hasPlayerName = /^[A-Za-z\s]+\s+(Passing|Rushing|Receiving|Points|Touchdowns|Yards|Receptions)/i.test(marketName);
    
    return hasPlayerIndicator || isPlayerEntity || hasPlayerName;
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
        // Check if this is a player prop market
        if (this.isPlayerPropMarket(market)) {
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
        }
      });
      
      logSuccess('SportsGameOddsAPI', `Processed ${playerProps.length} player props from ${endpoint}`);
      return playerProps;
      
    } catch (error) {
      logError('SportsGameOddsAPI', `Failed to process data from ${endpoint}:`, error);
      return [];
    }
  }

  // Check if a market is a player prop market
  private isPlayerPropMarket(market: any): boolean {
    const playerPropTypes = [
      'points', 'assists', 'rebounds', 'steals', 'blocks', 'turnovers',
      'passing_yards', 'rushing_yards', 'receiving_yards', 'touchdowns',
      'hits', 'home_runs', 'rbis', 'strikeouts', 'goals', 'saves'
    ];
    
    const marketName = (market.market || market.betType || market.propType || '').toLowerCase();
    const playerName = market.playerName || market.player?.name;
    
    return playerName && playerPropTypes.some(type => marketName.includes(type));
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
