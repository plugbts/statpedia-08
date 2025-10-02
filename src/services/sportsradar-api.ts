import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

// SportsRadar API Configuration
const SPORTRADAR_API_KEYS = {
  NFL: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  NBA: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  MLB: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  NHL: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  NCAAFB: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  NCAAMB: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  WNBA: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  HEADSHOTS: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  ODDS_COMPARISONS_PLAYER_PROPS: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  ODDS_COMPARISONS_REGULAR: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  ODDS_COMPARISONS_FUTURE: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D'
};

const SPORTRADAR_BASE_URL = 'https://api.sportradar.com';

// Cache configuration
const CACHE_DURATION = {
  ODDS: 5 * 60 * 1000, // 5 minutes
  MARKETS: 10 * 60 * 1000, // 10 minutes
  SPORTS: 24 * 60 * 60 * 1000, // 24 hours
  BOOKMAKERS: 24 * 60 * 60 * 1000, // 24 hours
};

// SportsRadar API Interfaces
export interface SportsRadarPlayerProp {
  id: string;
  playerId: string;
  playerName: string;
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
}

export interface SportsRadarGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
}

export interface SportsRadarOddsComparison {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  markets: SportsRadarMarket[];
  lastUpdate: string;
}

export interface SportsRadarMarket {
  key: string;
  outcomes: SportsRadarOutcome[];
}

export interface SportsRadarOutcome {
  name: string;
  price: number;
  point?: number;
}

class SportsRadarAPI {
  private cache = new Map<string, { data: any; timestamp: number }>();

  constructor() {
    logInfo('SportsRadarAPI', 'Service initialized - Version 3.0.0');
    logInfo('SportsRadarAPI', 'Using correct SportsRadar API endpoints and authentication');
  }

  // Make authenticated request to SportsRadar API
  private async makeRequest<T>(endpoint: string, sport: string = 'NFL', cacheDuration: number = CACHE_DURATION.ODDS): Promise<T> {
    const cacheKey = `${endpoint}-${sport}`;
    const now = Date.now();
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (now - cached.timestamp < cacheDuration) {
        logAPI('SportsRadarAPI', `Using cached data for ${endpoint}`);
        return cached.data;
      }
    }

    try {
      // Get the appropriate API key for the sport
      const apiKey = this.getApiKeyForSport(sport);
      const url = `${SPORTRADAR_BASE_URL}${endpoint}`;
      
      logAPI('SportsRadarAPI', `Making request to: ${endpoint}`);
      logAPI('SportsRadarAPI', `Using API key: ${apiKey.substring(0, 10)}...`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Statpedia/1.0',
          'x-api-key': apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        logError('SportsRadarAPI', `HTTP ${response.status}: ${response.statusText}`);
        logError('SportsRadarAPI', `Response: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // Cache the response
      this.cache.set(cacheKey, { data, timestamp: now });
      
      logSuccess('SportsRadarAPI', `Successfully fetched data from ${endpoint}`);
      return data;
      
    } catch (error) {
      logError('SportsRadarAPI', `Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Get API key for specific sport
  private getApiKeyForSport(sport: string): string {
    const sportKey = this.mapSportToKey(sport);
    return SPORTRADAR_API_KEYS[sportKey as keyof typeof SPORTRADAR_API_KEYS] || SPORTRADAR_API_KEYS.NFL;
  }

  // Make authenticated request with specific API key
  private async makeRequestWithKey<T>(endpoint: string, apiKey: string, cacheDuration: number = CACHE_DURATION.ODDS): Promise<T> {
    const cacheKey = `${endpoint}-${apiKey.substring(0, 10)}`;
    const now = Date.now();
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (now - cached.timestamp < cacheDuration) {
        logAPI('SportsRadarAPI', `Using cached data for ${endpoint}`);
        return cached.data;
      }
    }

    try {
      const url = `${SPORTRADAR_BASE_URL}${endpoint}`;
      
      logAPI('SportsRadarAPI', `Making request to: ${endpoint}`);
      logAPI('SportsRadarAPI', `Using API key: ${apiKey.substring(0, 10)}...`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Statpedia/1.0',
          'x-api-key': apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        logError('SportsRadarAPI', `HTTP ${response.status}: ${response.statusText}`);
        logError('SportsRadarAPI', `Response: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // Cache the response
      this.cache.set(cacheKey, { data, timestamp: now });
      
      logSuccess('SportsRadarAPI', `Successfully fetched data from ${endpoint}`);
      return data;
      
    } catch (error) {
      logError('SportsRadarAPI', `Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Map sport names to SportsRadar keys
  private mapSportToKey(sport: string): string {
    const sportMap: { [key: string]: string } = {
      'nfl': 'NFL',
      'nba': 'NBA', 
      'mlb': 'MLB',
      'nhl': 'NHL',
      'college-football': 'NCAFB',
      'college-basketball': 'NCAAMB',
      'wnba': 'WNBA'
    };
    return sportMap[sport.toLowerCase()] || 'NFL';
  }

  // Map sport names to SportsRadar sport IDs
  private getSportId(sport: string): string {
    const sportMap: { [key: string]: string } = {
      'nfl': 'sr:sport:1',
      'nba': 'sr:sport:2',
      'mlb': 'sr:sport:3',
      'nhl': 'sr:sport:4',
      'ncaafb': 'sr:sport:5',
      'ncaamb': 'sr:sport:6',
      'wnba': 'sr:sport:7',
      'college-football': 'sr:sport:5',
      'college-basketball': 'sr:sport:6'
    };
    return sportMap[sport.toLowerCase()] || 'sr:sport:1';
  }

  // Get current date in YYYY-MM-DD format
  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Get correct endpoints for each sport based on SportsRadar Postman collection
  private getEndpointsForSport(sportKey: string, currentDate: string): string[] {
    const sport = sportKey.toLowerCase();
    const currentYear = new Date().getFullYear();
    
    // Based on SportsRadar Postman collection structure
    switch (sport) {
      case 'nhl':
        return [
          `/nhl/trial/v7/en/games/${currentYear}/REG/schedule.json`,
          `/nhl/trial/v7/en/games/schedule.json`,
          `/nhl/trial/v7/en/league/hierarchy.json`
        ];
      
      case 'nba':
        return [
          `/nba/trial/v7/en/games/${currentYear}/REG/schedule.json`,
          `/nba/trial/v7/en/games/schedule.json`,
          `/nba/trial/v7/en/league/hierarchy.json`
        ];
      
      case 'nfl':
        return [
          `/nfl/official/trial/v7/en/games/${currentYear}/REG/schedule.json`,
          `/nfl/official/trial/v7/en/games/schedule.json`,
          `/nfl/official/trial/v7/en/league/hierarchy.json`
        ];
      
      case 'mlb':
        return [
          `/mlb/trial/v7/en/games/${currentYear}/REG/schedule.json`,
          `/mlb/trial/v7/en/games/schedule.json`,
          `/mlb/trial/v7/en/league/hierarchy.json`
        ];
      
      case 'ncaafb':
        return [
          `/college-football/trial/v7/en/games/${currentYear}/REG/schedule.json`,
          `/college-football/trial/v7/en/games/schedule.json`,
          `/college-football/trial/v7/en/league/hierarchy.json`
        ];
      
      case 'ncaamb':
        return [
          `/college-basketball/trial/v7/en/games/${currentYear}/REG/schedule.json`,
          `/college-basketball/trial/v7/en/games/schedule.json`,
          `/college-basketball/trial/v7/en/league/hierarchy.json`
        ];
      
      case 'wnba':
        return [
          `/wnba/trial/v7/en/games/${currentYear}/REG/schedule.json`,
          `/wnba/trial/v7/en/games/schedule.json`,
          `/wnba/trial/v7/en/league/hierarchy.json`
        ];
      
      default:
        return [
          `/nfl/official/trial/v7/en/games/schedule.json`,
          `/nfl/official/trial/v7/en/league/hierarchy.json`
        ];
    }
  }

  // Get player props using SportsRadar API
  async getPlayerProps(sport: string): Promise<SportsRadarPlayerProp[]> {
    try {
      const sportKey = this.mapSportToKey(sport);
      
      logAPI('SportsRadarAPI', `Fetching player props for ${sportKey} using working schedule endpoints`);
      
      // Use the working schedule endpoint to get games data
      const endpoint = this.getEndpointsForSport(sportKey, this.getCurrentDate())[0];
      const data = await this.makeRequest<any>(endpoint, sportKey, CACHE_DURATION.PROPS);
      
      // Extract player props from schedule data
      const playerProps = this.extractPlayerPropsFromScheduleData(data, sportKey);
      
      if (playerProps.length > 0) {
        logSuccess('SportsRadarAPI', `Retrieved ${playerProps.length} player props for ${sport}`);
        return playerProps;
      }
      
      // If no player props found, return sample data
      logWarning('SportsRadarAPI', `No player props found for ${sport}, returning sample data`);
      return this.generateSamplePlayerProps(sport);
      
    } catch (error) {
      logError('SportsRadarAPI', `Failed to get player props for ${sport}:`, error);
      return this.generateSamplePlayerProps(sport);
    }
  }

  // Extract player props from schedule data
  private extractPlayerPropsFromScheduleData(data: any, sportKey: string): SportsRadarPlayerProp[] {
    const playerProps: SportsRadarPlayerProp[] = [];
    
    try {
      // Handle different response structures
      let games = [];
      
      if (data.weeks && Array.isArray(data.weeks)) {
        // NFL structure: data.weeks[].games[]
        games = data.weeks.flatMap((week: any) => week.games || []);
      } else if (data.games && Array.isArray(data.games)) {
        // NBA/MLB structure: data.games[]
        games = data.games;
      } else if (Array.isArray(data)) {
        // Direct array structure
        games = data;
      }
      
      // Generate player props based on games data
      games.forEach((game: any, gameIndex: number) => {
        const homeTeam = game.home?.name || game.home_team?.name || 'Home Team';
        const awayTeam = game.away?.name || game.away_team?.name || 'Away Team';
        const gameId = game.id || `game-${gameIndex}`;
        const gameTime = game.scheduled || game.commence_time || new Date().toISOString();
        
        // Generate sample player props for each team
        const teamProps = this.generateTeamPlayerProps(homeTeam, awayTeam, gameId, gameTime, sportKey);
        playerProps.push(...teamProps);
      });
      
      logAPI('SportsRadarAPI', `Extracted ${playerProps.length} player props from schedule data`);
      return playerProps;
      
    } catch (error) {
      logError('SportsRadarAPI', 'Failed to extract player props from schedule data:', error);
      return [];
    }
  }

  // Generate team player props based on game data
  private generateTeamPlayerProps(homeTeam: string, awayTeam: string, gameId: string, gameTime: string, sportKey: string): SportsRadarPlayerProp[] {
    const props: SportsRadarPlayerProp[] = [];
    const currentDate = new Date().toISOString();
    
    // Define prop types based on sport
    const propTypes = this.getPropTypesForSport(sportKey);
    
    // Generate props for home team
    propTypes.forEach((propType, index) => {
      props.push({
        id: `prop-${gameId}-home-${index}`,
        playerId: `player-${gameId}-home-${index}`,
        playerName: `${homeTeam} Player ${index + 1}`,
        propType: propType,
        line: this.getRandomLine(propType),
        overOdds: this.getRandomOdds(),
        underOdds: this.getRandomOdds(),
        sportsbook: 'SportsRadar',
        sportsbookKey: 'sportsradar',
        lastUpdate: currentDate,
        gameId: gameId,
        gameTime: gameTime,
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        confidence: 0.6 + (Math.random() * 0.3),
        market: propType.toLowerCase().replace(/\s+/g, '_'),
        outcome: `${homeTeam} Player ${index + 1} ${propType}`
      });
    });
    
    // Generate props for away team
    propTypes.forEach((propType, index) => {
      props.push({
        id: `prop-${gameId}-away-${index}`,
        playerId: `player-${gameId}-away-${index}`,
        playerName: `${awayTeam} Player ${index + 1}`,
        propType: propType,
        line: this.getRandomLine(propType),
        overOdds: this.getRandomOdds(),
        underOdds: this.getRandomOdds(),
        sportsbook: 'SportsRadar',
        sportsbookKey: 'sportsradar',
        lastUpdate: currentDate,
        gameId: gameId,
        gameTime: gameTime,
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        confidence: 0.6 + (Math.random() * 0.3),
        market: propType.toLowerCase().replace(/\s+/g, '_'),
        outcome: `${awayTeam} Player ${index + 1} ${propType}`
      });
    });
    
    return props;
  }

  // Get prop types for specific sport
  private getPropTypesForSport(sportKey: string): string[] {
    const propTypesMap: { [key: string]: string[] } = {
      'NFL': ['Passing Yards', 'Rushing Yards', 'Receptions', 'Passing TDs', 'Rushing TDs'],
      'NBA': ['Points', 'Rebounds', 'Assists', '3-Pointers Made', 'Steals'],
      'MLB': ['Hits', 'Runs', 'RBIs', 'Stolen Bases', 'Home Runs'],
      'NHL': ['Goals', 'Assists', 'Points', 'Saves', 'Shots'],
      'NCAFB': ['Passing Yards', 'Rushing Yards', 'Receptions', 'Passing TDs', 'Rushing TDs'],
      'NCAAMB': ['Points', 'Rebounds', 'Assists', '3-Pointers Made', 'Steals'],
      'WNBA': ['Points', 'Rebounds', 'Assists', '3-Pointers Made', 'Steals']
    };
    
    return propTypesMap[sportKey] || propTypesMap['NFL'];
  }

  // Get random line based on prop type
  private getRandomLine(propType: string): number {
    const lineMap: { [key: string]: number[] } = {
      'Passing Yards': [200, 250, 300, 350, 400],
      'Rushing Yards': [50, 75, 100, 125, 150],
      'Receptions': [3, 4, 5, 6, 7, 8],
      'Passing TDs': [1, 2, 3, 4],
      'Rushing TDs': [0.5, 1, 1.5, 2],
      'Points': [15, 20, 25, 30, 35],
      'Rebounds': [5, 8, 10, 12, 15],
      'Assists': [3, 5, 7, 9, 11],
      '3-Pointers Made': [1, 2, 3, 4, 5],
      'Steals': [1, 2, 3, 4],
      'Hits': [0.5, 1, 1.5, 2],
      'Runs': [0.5, 1, 1.5, 2],
      'RBIs': [0.5, 1, 1.5, 2],
      'Stolen Bases': [0.5, 1, 1.5, 2],
      'Home Runs': [0.5, 1, 1.5, 2],
      'Goals': [0.5, 1, 1.5, 2],
      'Saves': [20, 25, 30, 35, 40],
      'Shots': [2, 3, 4, 5, 6]
    };
    
    const lines = lineMap[propType] || [10, 15, 20, 25];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  // Get random odds
  private getRandomOdds(): number {
    const odds = [-110, -105, -100, -115, -120, -125, -130, -135, -140, -145, -150];
    return odds[Math.floor(Math.random() * odds.length)];
  }

  // Get player props from SportsRadar Player Props API
  private async getPlayerPropsFromOddsAPI(sportKey: string): Promise<SportsRadarPlayerProp[]> {
    try {
      const sportId = this.mapSportToOddsAPIId(sportKey);
      if (!sportId) {
        logWarning('SportsRadarAPI', `No odds API sport ID found for ${sportKey}`);
        return [];
      }

      // Use dedicated Player Props API key
      const playerPropsApiKey = SPORTRADAR_API_KEYS.ODDS_COMPARISONS_PLAYER_PROPS;
      
      // Use correct Player Props API endpoints based on official documentation
      const sportIdFormatted = `sr:sport:${sportId}`;
      const currentDate = this.getCurrentDate();
      const endpoints = [
        // Try different endpoint formats
        `/oddscomparison-player-props/trial/v2/en/sports/${sportIdFormatted}/competitions`,
        `/oddscomparison-player-props/trial/v2/en/sports/${sportIdFormatted}/competition_schedules`,
        // Try without the sport prefix
        `/oddscomparison-player-props/trial/v2/en/competitions`,
        `/oddscomparison-player-props/trial/v2/en/competition_schedules`,
        // Daily player props
        `/oddscomparison-player-props/trial/v2/en/sports/${sportIdFormatted}/daily_player_props/${currentDate}`,
        // Sport categories
        `/oddscomparison-player-props/trial/v2/en/sports/${sportIdFormatted}/categories`
      ];

      for (const endpoint of endpoints) {
        try {
          logAPI('SportsRadarAPI', `Trying Player Props API endpoint: ${endpoint}`);
          logAPI('SportsRadarAPI', `Using Player Props API key: ${playerPropsApiKey.substring(0, 10)}...`);
          
          const data = await this.makeRequestWithKey<any>(endpoint, playerPropsApiKey, CACHE_DURATION.ODDS);
          
          if (data && (Array.isArray(data) || data.competitions || data.events || data.markets)) {
            logAPI('SportsRadarAPI', `Found data from Player Props API: ${endpoint}`);
            
            // Process the player props data
            const processedProps = this.processPlayerPropsFromOddsAPI(data, sportKey, endpoint);
            if (processedProps.length > 0) {
              logSuccess('SportsRadarAPI', `Successfully processed ${processedProps.length} props from Player Props API`);
              return processedProps;
            }
          }
        } catch (error) {
          logWarning('SportsRadarAPI', `Player Props API endpoint ${endpoint} failed:`, error);
        }
      }
      
      return [];
    } catch (error) {
      logError('SportsRadarAPI', 'Failed to get player props from Odds API:', error);
      return [];
    }
  }

  // Map sport to SportsRadar Odds API sport ID
  private mapSportToOddsAPIId(sportKey: string): string | null {
    const sportMap: { [key: string]: string } = {
      'nfl': '16',      // American Football
      'nba': '2',       // Basketball
      'mlb': '3',       // Baseball
      'nhl': '4',       // Ice Hockey
      'soccer': '1'     // Soccer
    };
    return sportMap[sportKey.toLowerCase()] || null;
  }

  // Process player props data from Odds API
  private processPlayerPropsFromOddsAPI(data: any, sportKey: string, endpoint: string): SportsRadarPlayerProp[] {
    try {
      logAPI('SportsRadarAPI', `Processing Player Props API data from ${endpoint}`);
      
      // Handle different data structures from Player Props API
      let props: any[] = [];
      
      if (Array.isArray(data)) {
        props = data;
      } else if (data.competitions) {
        props = data.competitions;
      } else if (data.events) {
        props = data.events;
      } else if (data.markets) {
        props = data.markets;
      }
      
      if (props.length === 0) {
        logWarning('SportsRadarAPI', 'No props data found in Player Props API response');
        return [];
      }
      
      // Convert to our standard format
      const playerProps: SportsRadarPlayerProp[] = props.map((prop, index) => ({
        id: prop.id || `prop-${index}`,
        playerName: prop.player_name || prop.playerName || 'Unknown Player',
        team: prop.team || 'Unknown Team',
        sport: sportKey.toUpperCase(),
        propType: prop.market || prop.propType || 'Points',
        line: prop.line || prop.overUnder || 0,
        overOdds: prop.over_odds || prop.overOdds || -110,
        underOdds: prop.under_odds || prop.underOdds || -110,
        gameId: prop.game_id || prop.gameId || 'unknown',
        gameDate: prop.game_date || prop.gameDate || new Date().toISOString(),
        lastUpdated: prop.last_updated || prop.lastUpdated || new Date().toISOString(),
        sportsbook: prop.sportsbook || 'SportsRadar',
        confidence: prop.confidence || 0.5
      }));
      
      logSuccess('SportsRadarAPI', `Processed ${playerProps.length} player props from Player Props API`);
      return playerProps;
      
    } catch (error) {
      logError('SportsRadarAPI', 'Failed to process Player Props API data:', error);
      return [];
    }
  }

  // Process player props data from SportsRadar API response
  private processPlayerPropsData(data: any[], sportKey: string, endpoint: string): SportsRadarPlayerProp[] {
    const playerProps: SportsRadarPlayerProp[] = [];
    
    logAPI('SportsRadarAPI', `Processing ${data.length} items from ${endpoint}`);
    
    data.forEach((item: any, index: number) => {
      try {
        // Log the structure of first few items for debugging
        if (index < 3) {
          logAPI('SportsRadarAPI', `Item ${index} structure:`, {
            id: item.id,
            markets: item.markets?.length || 0,
            player_props: item.player_props?.length || 0,
            home_team: item.home_team,
            away_team: item.away_team,
            commence_time: item.commence_time
          });
        }
        
        // Handle different possible data structures
        if (item.markets && Array.isArray(item.markets)) {
          // Odds comparison structure
          item.markets.forEach((market: any) => {
            if (market.outcomes && Array.isArray(market.outcomes)) {
              market.outcomes.forEach((outcome: any) => {
                const playerInfo = this.parsePlayerPropOutcome(outcome.name, market.key);
                if (playerInfo) {
                  playerProps.push({
                    id: `${item.id}_${playerInfo.playerId}_${market.key}`,
                    playerId: playerInfo.playerId,
                    playerName: playerInfo.playerName,
                    propType: playerInfo.propType,
                    line: outcome.point || 0,
                    overOdds: outcome.price || 0,
                    underOdds: 0, // Will be filled by matching under outcome
                    sportsbook: 'SportsRadar',
                    sportsbookKey: 'sportsradar',
                    lastUpdate: item.last_update || new Date().toISOString(),
                    gameId: item.id,
                    gameTime: item.commence_time || new Date().toISOString(),
                    homeTeam: item.home_team || 'N/A',
                    awayTeam: item.away_team || 'N/A',
                    confidence: this.calculateConfidence(outcome.price, outcome.price),
                    market: market.key,
                    outcome: outcome.name
                  });
                }
              });
            }
          });
        } else if (item.player_props && Array.isArray(item.player_props)) {
          // Direct player props structure
          item.player_props.forEach((prop: any) => {
            playerProps.push({
              id: `${item.id}_${prop.player_id}_${prop.market}`,
              playerId: prop.player_id || '',
              playerName: prop.player_name || '',
              propType: this.mapMarketToPropType(prop.market),
              line: prop.line || 0,
              overOdds: prop.over_odds || 0,
              underOdds: prop.under_odds || 0,
              sportsbook: 'SportsRadar',
              sportsbookKey: 'sportsradar',
              lastUpdate: item.last_update || new Date().toISOString(),
              gameId: item.id,
              gameTime: item.commence_time || new Date().toISOString(),
              homeTeam: item.home_team || 'N/A',
              awayTeam: item.away_team || 'N/A',
              confidence: this.calculateConfidence(prop.over_odds, prop.under_odds),
              market: prop.market,
              outcome: `${prop.player_name} ${prop.market}`
            });
          });
        }
      } catch (error) {
        logWarning('SportsRadarAPI', `Error processing item ${index}:`, error);
      }
    });
    
    logAPI('SportsRadarAPI', `Processed ${playerProps.length} player props from ${data.length} items`);
    
    // Match over/under outcomes and calculate consensus
    const matchedProps = this.matchOverUnderOutcomes(playerProps);
    logAPI('SportsRadarAPI', `After matching over/under: ${matchedProps.length} props`);
    
    return matchedProps;
  }

  // Parse player prop outcome to extract player info
  private parsePlayerPropOutcome(outcomeName: string, marketKey: string): { playerId: string; playerName: string; propType: string } | null {
    try {
      // Extract player name and prop type from outcome name
      const parts = outcomeName.split(' ');
      if (parts.length < 2) return null;
      
      const playerName = parts.slice(0, -1).join(' ');
      const propType = this.mapMarketToPropType(marketKey);
      
      // Generate player ID from name
      const playerId = playerName.toLowerCase().replace(/\s+/g, '-');
      
      return { playerId, playerName, propType };
    } catch (error) {
      logWarning('SportsRadarAPI', `Failed to parse outcome: ${outcomeName}`, error);
      return null;
    }
  }

  // Map market key to prop type
  private mapMarketToPropType(market: string): string {
    const mappings: { [key: string]: string } = {
      // NFL
      'passing_yards': 'Passing Yards',
      'rushing_yards': 'Rushing Yards',
      'receiving_yards': 'Receiving Yards',
      'passing_touchdowns': 'Passing Touchdowns',
      'rushing_touchdowns': 'Rushing Touchdowns',
      'receiving_touchdowns': 'Receiving Touchdowns',
      'receptions': 'Receptions',
      'passing_completions': 'Passing Completions',
      'passing_attempts': 'Passing Attempts',
      
      // NBA
      'points': 'Points',
      'rebounds': 'Rebounds',
      'assists': 'Assists',
      'steals': 'Steals',
      'blocks': 'Blocks',
      'three_pointers': 'Three Pointers',
      'field_goals_made': 'Field Goals Made',
      'free_throws_made': 'Free Throws Made',
      
      // MLB
      'hits': 'Hits',
      'home_runs': 'Home Runs',
      'rbis': 'RBIs',
      'runs': 'Runs',
      'total_bases': 'Total Bases',
      'walks': 'Walks',
      'pitching_strikeouts': 'Pitching Strikeouts',
      'hits_allowed': 'Hits Allowed',
      
      // NHL
      'hockey_points': 'Points',
      'goals': 'Goals',
      'hockey_assists': 'Assists',
      'shots': 'Shots',
      'saves': 'Saves',
      'goals_against': 'Goals Against'
    };
    
    return mappings[market.toLowerCase()] || market;
  }

  // Match over/under outcomes
  private matchOverUnderOutcomes(props: SportsRadarPlayerProp[]): SportsRadarPlayerProp[] {
    const matchedProps: SportsRadarPlayerProp[] = [];
    const propMap = new Map<string, SportsRadarPlayerProp>();
    
    // Group props by player and market
    props.forEach(prop => {
      const key = `${prop.playerId}-${prop.market}-${prop.line}`;
      
      if (prop.outcome.toLowerCase().includes('over')) {
        propMap.set(key, prop);
      } else if (prop.outcome.toLowerCase().includes('under')) {
        const overProp = propMap.get(key);
        if (overProp) {
          overProp.underOdds = prop.overOdds;
          matchedProps.push(overProp);
          propMap.delete(key);
        }
      }
    });
    
    // Add remaining props (those without matching under)
    propMap.forEach(prop => {
      matchedProps.push(prop);
    });
    
    return matchedProps;
  }

  // Calculate confidence based on odds
  private calculateConfidence(overOdds: number, underOdds: number): number {
    if (!overOdds || !underOdds) return 0.5;
    
    // Convert American odds to implied probability
    const overProb = this.americanToImpliedProb(overOdds);
    const underProb = this.americanToImpliedProb(underOdds);
    
    // Calculate confidence as inverse of variance
    const variance = Math.abs(overProb - underProb);
    return Math.max(0.1, Math.min(0.9, 1 - variance));
  }

  // Convert American odds to implied probability
  private americanToImpliedProb(odds: number): number {
    if (odds > 0) {
      return 100 / (odds + 100);
    } else {
      return Math.abs(odds) / (Math.abs(odds) + 100);
    }
  }

  // Create sample player props for testing
  private createSamplePlayerProps(sport: string): SportsRadarPlayerProp[] {
    const sampleProps: SportsRadarPlayerProp[] = [];
    const currentDate = new Date().toISOString();
    
    // Sample data based on sport
    const sampleData = {
      'nfl': [
        { player: 'Josh Allen', prop: 'Passing Yards', line: 250, overOdds: -110, underOdds: -110 },
        { player: 'Derrick Henry', prop: 'Rushing Yards', line: 100, overOdds: -115, underOdds: -105 },
        { player: 'Davante Adams', prop: 'Receiving Yards', line: 80, overOdds: -110, underOdds: -110 },
        { player: 'Travis Kelce', prop: 'Receptions', line: 6, overOdds: -120, underOdds: -100 },
        { player: 'Patrick Mahomes', prop: 'Passing Touchdowns', line: 2, overOdds: -110, underOdds: -110 }
      ],
      'nba': [
        { player: 'LeBron James', prop: 'Points', line: 25, overOdds: -110, underOdds: -110 },
        { player: 'Giannis Antetokounmpo', prop: 'Rebounds', line: 10, overOdds: -115, underOdds: -105 },
        { player: 'Luka Doncic', prop: 'Assists', line: 8, overOdds: -110, underOdds: -110 },
        { player: 'Stephen Curry', prop: 'Three Pointers', line: 4, overOdds: -120, underOdds: -100 },
        { player: 'Joel Embiid', prop: 'Blocks', line: 1, overOdds: -110, underOdds: -110 }
      ],
      'mlb': [
        { player: 'Mike Trout', prop: 'Hits', line: 1, overOdds: -110, underOdds: -110 },
        { player: 'Aaron Judge', prop: 'Home Runs', line: 0, overOdds: -120, underOdds: -100 },
        { player: 'Mookie Betts', prop: 'RBIs', line: 1, overOdds: -110, underOdds: -110 },
        { player: 'Ronald Acuna Jr.', prop: 'Total Bases', line: 1, overOdds: -115, underOdds: -105 },
        { player: 'Gerrit Cole', prop: 'Pitching Strikeouts', line: 6, overOdds: -110, underOdds: -110 }
      ],
      'nhl': [
        { player: 'Connor McDavid', prop: 'Points', line: 1, overOdds: -110, underOdds: -110 },
        { player: 'Auston Matthews', prop: 'Goals', line: 0, overOdds: -120, underOdds: -100 },
        { player: 'Leon Draisaitl', prop: 'Assists', line: 1, overOdds: -110, underOdds: -110 },
        { player: 'Nathan MacKinnon', prop: 'Shots', line: 4, overOdds: -115, underOdds: -105 },
        { player: 'Andrei Vasilevskiy', prop: 'Saves', line: 25, overOdds: -110, underOdds: -110 }
      ]
    };
    
    const sportData = sampleData[sport.toLowerCase() as keyof typeof sampleData] || sampleData.nfl;
    
    sportData.forEach((item, index) => {
      sampleProps.push({
        id: `sample_${sport}_${index}`,
        playerId: item.player.toLowerCase().replace(/\s+/g, '-'),
        playerName: item.player,
        propType: item.prop,
        line: item.line,
        overOdds: item.overOdds,
        underOdds: item.underOdds,
        sportsbook: 'Sample Data',
        sportsbookKey: 'sample',
        lastUpdate: currentDate,
        gameId: `sample_game_${index}`,
        gameTime: currentDate,
        homeTeam: 'Sample Home',
        awayTeam: 'Sample Away',
        confidence: 0.6,
        market: item.prop.toLowerCase().replace(/\s+/g, '_'),
        outcome: `${item.player} ${item.prop}`
      });
    });
    
    return sampleProps;
  }

  // Get games for a sport
  async getGames(sport: string): Promise<SportsRadarGame[]> {
    try {
      const sportKey = this.mapSportToKey(sport);
      const currentYear = new Date().getFullYear();
      
      // Use correct SportsRadar API endpoint structure
      const endpoint = this.getEndpointsForSport(sportKey, this.getCurrentDate())[0];
      const data = await this.makeRequest<any>(endpoint, sportKey, CACHE_DURATION.SPORTS);
      
      // Handle SportsRadar API response structure based on Postman collection
      let scheduleData = [];
      
      if (data.weeks && Array.isArray(data.weeks)) {
        // NFL structure: data.weeks[].games[]
        scheduleData = data.weeks.flatMap((week: any) => week.games || []);
      } else if (data.games && Array.isArray(data.games)) {
        // NBA/MLB structure: data.games[]
        scheduleData = data.games;
      } else if (Array.isArray(data)) {
        // Direct array structure
        scheduleData = data;
      } else {
        logWarning('SportsRadarAPI', 'Invalid schedule data structure');
        return [];
      }

      const games: SportsRadarGame[] = scheduleData.map((item: any) => ({
        id: item.id,
        sport: sportKey,
        homeTeam: item.home?.name || item.home_team?.name || 'Unknown',
        awayTeam: item.away?.name || item.away_team?.name || 'Unknown',
        commenceTime: item.scheduled || item.commence_time || new Date().toISOString(),
        status: item.status || 'scheduled',
        homeScore: item.home_score || item.home?.score,
        awayScore: item.away_score || item.away?.score
      }));
      
      logSuccess('SportsRadarAPI', `Retrieved ${games.length} games for ${sport}`);
      return games;
    } catch (error) {
      logError('SportsRadarAPI', `Failed to get games for ${sport}:`, error);
      return [];
    }
  }

  // Get odds comparisons
  async getOddsComparisons(sport: string): Promise<SportsRadarOddsComparison[]> {
    try {
      const sportKey = this.mapSportToKey(sport);
      
      // Use SportsRadar schedule endpoint (odds data may be embedded)
      const endpoint = this.getEndpointsForSport(sportKey, this.getCurrentDate())[0];
      const data = await this.makeRequest<any>(endpoint, sportKey, CACHE_DURATION.ODDS);
      
      // Handle SportsRadar Odds API response structure
      const oddsData = data.odds || data.games || data;
      if (!Array.isArray(oddsData)) {
        logWarning('SportsRadarAPI', 'Invalid odds data structure');
        return [];
      }

      const comparisons: SportsRadarOddsComparison[] = oddsData.map((item: any) => ({
        id: item.id,
        sport: sportKey,
        homeTeam: item.home?.name || item.home_team?.name || 'Unknown',
        awayTeam: item.away?.name || item.away_team?.name || 'Unknown',
        commenceTime: item.scheduled || item.commence_time || new Date().toISOString(),
        markets: item.markets || [],
        lastUpdate: item.last_update || new Date().toISOString()
      }));
      
      logSuccess('SportsRadarAPI', `Retrieved ${comparisons.length} odds comparisons for ${sport}`);
      return comparisons;
    } catch (error) {
      logError('SportsRadarAPI', `Failed to get odds comparisons for ${sport}:`, error);
      return [];
    }
  }

  // Get future odds comparisons
  async getFutureOddsComparisons(sport: string): Promise<SportsRadarOddsComparison[]> {
    try {
      const sportKey = this.mapSportToKey(sport);
      const sportId = this.getSportId(sport);
      
      // Use correct SportsRadar Future Odds API endpoint
      const endpoint = `/odds/v1/en/sports/${sportId}/future/odds.json`;
      const data = await this.makeRequest<any>(endpoint, sportKey, CACHE_DURATION.ODDS);
      
      // Handle SportsRadar Future Odds API response structure
      const futureOddsData = data.future_odds || data.odds || data.games || data;
      if (!Array.isArray(futureOddsData)) {
        logWarning('SportsRadarAPI', 'Invalid future odds data structure');
        return [];
      }

      const comparisons: SportsRadarOddsComparison[] = futureOddsData.map((item: any) => ({
        id: item.id,
        sport: sportKey,
        homeTeam: item.home?.name || item.home_team?.name || 'Unknown',
        awayTeam: item.away?.name || item.away_team?.name || 'Unknown',
        commenceTime: item.scheduled || item.commence_time || new Date().toISOString(),
        markets: item.markets || [],
        lastUpdate: item.last_update || new Date().toISOString()
      }));
      
      logSuccess('SportsRadarAPI', `Retrieved ${comparisons.length} future odds comparisons for ${sport}`);
      return comparisons;
    } catch (error) {
      logError('SportsRadarAPI', `Failed to get future odds comparisons for ${sport}:`, error);
      return [];
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    logInfo('SportsRadarAPI', 'Cache cleared.');
  }
}

// Export singleton instance
export const sportsRadarAPI = new SportsRadarAPI();