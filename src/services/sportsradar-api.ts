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
          'X-API-Key': apiKey
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
          'X-API-Key': apiKey
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

  // Get current date in YYYY-MM-DD format
  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Get correct endpoints for each sport based on SportsRadar API documentation
  private getEndpointsForSport(sportKey: string, currentDate: string): string[] {
    const sport = sportKey.toLowerCase();
    const currentYear = new Date().getFullYear();
    
    switch (sport) {
      case 'nhl':
        return [
          `/${sport}/trial/v7/en/games/${currentYear}/REG/schedule.json`,
          `/${sport}/trial/v7/en/games/schedule.json`,
          `/${sport}/trial/v7/en/league/hierarchy.json`,
          `/${sport}/trial/v7/en/teams.json`
        ];
      
      case 'nba':
        return [
          `/${sport}/trial/v7/en/games/${currentYear}/REG/schedule.json`,
          `/${sport}/trial/v7/en/games/schedule.json`,
          `/${sport}/trial/v7/en/league/hierarchy.json`,
          `/${sport}/trial/v7/en/teams.json`
        ];
      
      case 'nfl':
        return [
          `/${sport}/official/trial/v7/en/games/current_season/schedule.json`,
          `/${sport}/official/trial/v7/en/games/schedule.json`,
          `/${sport}/official/trial/v7/en/league/hierarchy.json`,
          `/${sport}/official/trial/v7/en/teams.json`
        ];
      
      case 'mlb':
        return [
          `/${sport}/trial/v7/en/games/${currentYear}/REG/schedule.json`,
          `/${sport}/trial/v7/en/games/schedule.json`,
          `/${sport}/trial/v7/en/league/hierarchy.json`,
          `/${sport}/trial/v7/en/teams.json`
        ];
      
      default:
        return [
          `/${sport}/trial/v7/en/games/schedule.json`,
          `/${sport}/trial/v7/en/league/hierarchy.json`,
          `/${sport}/trial/v7/en/teams.json`
        ];
    }
  }

  // Get player props using SportsRadar Player Props API
  async getPlayerProps(sport: string): Promise<SportsRadarPlayerProp[]> {
    try {
      const sportKey = this.mapSportToKey(sport);
      
      logAPI('SportsRadarAPI', `Fetching player props for ${sportKey} using Player Props API`);
      
      // Go directly to the Player Props API - this is the only way to get actual player props
      const playerPropsData = await this.getPlayerPropsFromOddsAPI(sportKey);
      
      if (playerPropsData.length > 0) {
        logSuccess('SportsRadarAPI', `Found ${playerPropsData.length} props from Player Props API`);
        console.log('🎯 SportsRadar API returning props:', playerPropsData);
        return playerPropsData;
      } else {
        logWarning('SportsRadarAPI', `No player props found from Player Props API for ${sport}`);
        return [];
      }
    } catch (error) {
      logError('SportsRadarAPI', `Failed to get player props for ${sport}:`, error);
      return [];
    }
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
      const currentDate = this.getCurrentDate();
      
      const endpoint = `/oddscomparison/${sportKey}/regular/${currentDate}`;
      const data = await this.makeRequest<any[]>(endpoint, sportKey, CACHE_DURATION.SPORTS);
      
      const games: SportsRadarGame[] = data.map((item: any) => ({
        id: item.id,
        sport: sportKey,
        homeTeam: item.home_team,
        awayTeam: item.away_team,
        commenceTime: item.commence_time,
        status: item.status || 'scheduled',
        homeScore: item.home_score,
        awayScore: item.away_score
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
      const currentDate = this.getCurrentDate();
      
      const endpoint = `/oddscomparison/${sportKey}/regular/${currentDate}`;
      const data = await this.makeRequest<any[]>(endpoint, sportKey, CACHE_DURATION.ODDS);
      
      const comparisons: SportsRadarOddsComparison[] = data.map((item: any) => ({
        id: item.id,
        sport: sportKey,
        homeTeam: item.home_team,
        awayTeam: item.away_team,
        commenceTime: item.commence_time,
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
      const currentDate = this.getCurrentDate();
      
      const endpoint = `/oddscomparison/${sportKey}/future/${currentDate}`;
      const data = await this.makeRequest<any[]>(endpoint, sportKey, CACHE_DURATION.ODDS);
      
      const comparisons: SportsRadarOddsComparison[] = data.map((item: any) => ({
        id: item.id,
        sport: sportKey,
        homeTeam: item.home_team,
        awayTeam: item.away_team,
        commenceTime: item.commence_time,
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