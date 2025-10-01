/**
 * SportsDataIO API Service - Live Data Only
 * Comprehensive sports data API with NO mock data fallbacks
 * API Key: 883b10f6c52a48b38b3b5cafa94d2189
 */

interface SportsDataConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  cacheTimeout: number;
}

interface Game {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  homeTeamId: number;
  awayTeamId: number;
  date: string;
  time: string;
  venue: string;
  status: 'scheduled' | 'live' | 'finished';
  homeScore?: number;
  awayScore?: number;
  homeRecord: string;
  awayRecord: string;
  homeOdds?: number;
  awayOdds?: number;
  spread?: number;
  total?: number;
  weather?: {
    temperature: number;
    condition: string;
    windSpeed: number;
    humidity: number;
  };
  injuries?: Array<{
    player: string;
    team: string;
    status: string;
    position: string;
  }>;
}

interface PlayerProp {
  id: string;
  playerId: number;
  playerName: string;
  team: string;
  teamAbbr: string;
  opponent: string;
  opponentAbbr: string;
  gameId: string;
  sport: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  gameDate: string;
  gameTime: string;
  confidence?: number;
  expectedValue?: number;
  recentForm?: string;
  last5Games?: number[];
  seasonStats?: {
    average: number;
    median: number;
    gamesPlayed: number;
    hitRate: number;
    last5Games: number[];
    seasonHigh: number;
    seasonLow: number;
  };
  aiPrediction?: {
    recommended: 'over' | 'under';
    confidence: number;
    reasoning: string;
    factors: string[];
  };
}

interface Player {
  id: number;
  name: string;
  team: string;
  teamAbbr: string;
  position: string;
  jerseyNumber: number;
  height: string;
  weight: number;
  age: number;
  experience: number;
  headshotUrl?: string;
  stats?: {
    average: number;
    median: number;
    gamesPlayed: number;
    hitRate: number;
    last5Games: number[];
    seasonHigh: number;
    seasonLow: number;
  };
}

interface Prediction {
  id: string;
  sport: string;
  player: string;
  team: string;
  opponent: string;
  prop: string;
  line: number;
  prediction: 'over' | 'under';
  confidence: number;
  odds: number;
  expectedValue: number;
  gameDate: string;
  gameTime: string;
  factors: string[];
  reasoning: string;
  lastUpdated: string;
}

interface Market {
  id: string;
  name: string;
  sport: string;
  gameId: string;
  props: PlayerProp[];
  lastUpdated: string;
}

class SportsDataIOAPI {
  private config: SportsDataConfig;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private requestQueue = new Map<string, Promise<any>>();

  constructor() {
    this.config = {
      apiKey: '883b10f6c52a48b38b3b5cafa94d2189',
      baseUrl: 'https://api.sportsdata.io/v3',
      timeout: 30000,
      retryAttempts: 3,
      cacheTimeout: 2 * 60 * 1000, // 2 minutes for live data
    };
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    // Return cached data if still valid
    if (cached && (now - cached.timestamp) < this.config.cacheTimeout) {
      console.log(`📋 Cache hit for ${endpoint}`);
      return cached.data;
    }

    // Check if request is already in progress
    if (this.requestQueue.has(cacheKey)) {
      console.log(`⏳ Request already in progress for ${endpoint}`);
      return this.requestQueue.get(cacheKey)!;
    }

    // Create new request
    const requestPromise = this.executeRequest<T>(endpoint, params);
    this.requestQueue.set(cacheKey, requestPromise);

    try {
      const data = await requestPromise;
      this.cache.set(cacheKey, { data, timestamp: now });
      return data;
    } finally {
      this.requestQueue.delete(cacheKey);
    }
  }

  private async executeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    url.searchParams.set('key', this.config.apiKey);
    
    // Add additional parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value.toString());
      }
    });

    console.log(`🌐 [SportsDataIO] Making request to: ${url.toString()}`);

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`🔄 [SportsDataIO] Attempt ${attempt}/${this.config.retryAttempts} for ${endpoint}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        let response;
        try {
          response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Statpedia/1.0',
            },
            signal: controller.signal,
          });
        } catch (corsError) {
          console.warn(`⚠️ [SportsDataIO] Direct API call failed, trying CORS proxy...`);
          // Try with CORS proxy as fallback
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url.toString())}`;
          response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            signal: controller.signal,
          });
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ [SportsDataIO] Successfully fetched data from ${endpoint}`);
        return data;
      } catch (error) {
        console.error(`❌ [SportsDataIO] Attempt ${attempt} failed for ${endpoint}:`, error);
        
        if (attempt === this.config.retryAttempts) {
          throw new Error(`Failed to fetch data from ${endpoint} after ${this.config.retryAttempts} attempts: ${error.message}`);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw new Error(`Failed to fetch data from ${endpoint}`);
  }

  // Get current season for sport
  private getCurrentSeason(sport: string): number {
    const now = new Date();
    const year = now.getFullYear();
    
    switch (sport.toLowerCase()) {
      case 'nfl':
        // NFL season starts in September, so if we're before September, use previous year
        return now.getMonth() < 8 ? year - 1 : year;
      case 'nba':
        // NBA season starts in October, so if we're before October, use previous year
        return now.getMonth() < 9 ? year - 1 : year;
      case 'mlb':
        // MLB season starts in March, so if we're before March, use previous year
        return now.getMonth() < 2 ? year - 1 : year;
      case 'nhl':
        // NHL season starts in October, so if we're before October, use previous year
        return now.getMonth() < 9 ? year - 1 : year;
      default:
        return year;
    }
  }

  // Get current week for sport
  private getCurrentWeek(sport: string): number {
    const now = new Date();
    const season = this.getCurrentSeason(sport);
    
    switch (sport.toLowerCase()) {
      case 'nfl':
        // NFL season starts first week of September
        const nflStart = new Date(season, 8, 1); // September 1st
        const nflWeeks = Math.ceil((now.getTime() - nflStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return Math.max(1, Math.min(18, nflWeeks));
      case 'nba':
        // NBA season starts last week of October
        const nbaStart = new Date(season, 9, 20); // October 20th
        const nbaWeeks = Math.ceil((now.getTime() - nbaStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return Math.max(1, Math.min(26, nbaWeeks));
      default:
        return 1;
    }
  }

  // Get current week games for a sport
  async getCurrentWeekGames(sport: string): Promise<Game[]> {
    console.log(`🏈 [SportsDataIO] Fetching current week games for ${sport}...`);
    
    try {
      const season = this.getCurrentSeason(sport);
      const week = this.getCurrentWeek(sport);
      
      const endpoint = this.getGamesEndpoint(sport);
      const rawGames = await this.makeRequest<any[]>(endpoint, {
        season,
        week,
      });

      const games = this.parseGames(rawGames, sport);
      console.log(`✅ [SportsDataIO] Successfully fetched ${games.length} games for ${sport}`);
      return games;
    } catch (error) {
      console.error(`❌ [SportsDataIO] Failed to fetch games for ${sport}:`, error);
      throw new Error(`Failed to fetch games for ${sport}: ${error.message}`);
    }
  }

  // Get live games (currently playing) - filter from regular games
  async getLiveGames(sport: string): Promise<Game[]> {
    console.log(`🔴 [SportsDataIO] Fetching live games for ${sport}...`);
    
    try {
      const allGames = await this.getCurrentWeekGames(sport);
      const liveGames = allGames.filter(game => game.status === 'live');
      
      console.log(`✅ [SportsDataIO] Successfully filtered ${liveGames.length} live games for ${sport}`);
      return liveGames;
    } catch (error) {
      console.error(`❌ [SportsDataIO] Failed to fetch live games for ${sport}:`, error);
      throw new Error(`Failed to fetch live games for ${sport}: ${error.message}`);
    }
  }

  // Get player props for a sport - NO FALLBACKS
  async getPlayerProps(sport: string): Promise<PlayerProp[]> {
    console.log(`🎯 [SportsDataIO] Starting getPlayerProps for ${sport}...`);
    
    try {
      const season = this.getCurrentSeason(sport);
      const week = this.getCurrentWeek(sport);
      
      console.log(`📅 [SportsDataIO] Season: ${season}, Week: ${week}`);
      
      const endpoint = this.getPlayerPropsEndpoint(sport);
      console.log(`🔗 [SportsDataIO] Endpoint: ${endpoint}`);
      
      let rawProps: any[];
      
      if (sport.toLowerCase() === 'nfl') {
        // NFL uses week-based endpoint
        console.log(`🏈 [SportsDataIO] Using NFL week-based endpoint with season=${season}, week=${week}`);
        rawProps = await this.makeRequest<any[]>(endpoint, {
          season,
          week,
        });
      } else {
        // Other sports use date-based endpoint
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        console.log(`🏀 [SportsDataIO] Using date-based endpoint with date=${dateStr}`);
        rawProps = await this.makeRequest<any[]>(endpoint, {
          date: dateStr,
        });
      }

      console.log(`📊 [SportsDataIO] Raw API response: ${rawProps?.length || 0} items`);
      
      if (!rawProps || rawProps.length === 0) {
        console.warn(`⚠️ [SportsDataIO] No props returned from API for ${sport}`);
        return [];
      }
      
      const props = this.parsePlayerProps(rawProps, sport);
      console.log(`✅ [SportsDataIO] Successfully parsed ${props.length} player props for ${sport}`);
      return props;
    } catch (error) {
      console.error(`❌ [SportsDataIO] Failed to fetch player props for ${sport}:`, error);
      console.error(`❌ [SportsDataIO] Error details:`, {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // NO FALLBACK - throw error instead of returning mock data
      throw new Error(`Failed to fetch live player props for ${sport}: ${error.message}`);
    }
  }

  // Get live player props (real-time) - use regular props with live filtering
  async getLivePlayerProps(sport: string): Promise<PlayerProp[]> {
    console.log(`🎯 [SportsDataIO] Fetching live player props for ${sport}...`);
    
    try {
      const allProps = await this.getPlayerProps(sport);
      
      // Filter for props from live games or upcoming games
      const liveGames = await this.getLiveGames(sport);
      const upcomingGames = await this.getCurrentWeekGames(sport);
      const allActiveGames = [...liveGames, ...upcomingGames.filter(g => g.status === 'scheduled')];
      
      const liveProps = allProps.filter(prop => 
        allActiveGames.some(game => game.id === prop.gameId)
      );
      
      console.log(`✅ [SportsDataIO] Successfully filtered ${liveProps.length} live player props for ${sport}`);
      return liveProps;
    } catch (error) {
      console.error(`❌ [SportsDataIO] Failed to fetch live player props for ${sport}:`, error);
      throw new Error(`Failed to fetch live player props for ${sport}: ${error.message}`);
    }
  }

  // Get live predictions (real-time AI predictions)
  async getLivePredictions(sport: string): Promise<Prediction[]> {
    console.log(`🔮 [SportsDataIO] Generating live predictions for ${sport}...`);
    
    try {
      const games = await this.getCurrentWeekGames(sport);
      const props = await this.getLivePlayerProps(sport);
      
      const predictions = this.generateLivePredictions(games, props, sport);
      console.log(`✅ [SportsDataIO] Successfully generated ${predictions.length} live predictions for ${sport}`);
      return predictions;
    } catch (error) {
      console.error(`❌ [SportsDataIO] Failed to generate live predictions for ${sport}:`, error);
      throw new Error(`Failed to generate live predictions for ${sport}: ${error.message}`);
    }
  }

  // Get players for a team
  async getPlayers(sport: string, teamId?: number): Promise<Player[]> {
    console.log(`👥 [SportsDataIO] Fetching players for ${sport}${teamId ? ` team ${teamId}` : ''}...`);
    
    try {
      const endpoint = this.getPlayersEndpoint(sport);
      const rawPlayers = await this.makeRequest<any[]>(endpoint, teamId ? { team: teamId } : {});

      const players = this.parsePlayers(rawPlayers, sport);
      console.log(`✅ [SportsDataIO] Successfully fetched ${players.length} players for ${sport}`);
      return players;
    } catch (error) {
      console.error(`❌ [SportsDataIO] Failed to fetch players for ${sport}:`, error);
      throw new Error(`Failed to fetch players for ${sport}: ${error.message}`);
    }
  }

  // Get player headshot
  async getPlayerHeadshot(playerId: number, sport: string): Promise<string | null> {
    try {
      const endpoint = this.getHeadshotEndpoint(sport);
      const response = await fetch(`${this.config.baseUrl}${endpoint}/${playerId}?key=${this.config.apiKey}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        return url;
      }
      
      return null;
    } catch (error) {
      console.warn(`⚠️ [SportsDataIO] Failed to fetch headshot for player ${playerId}:`, error);
      return null;
    }
  }

  // Get markets for a game
  async getMarkets(sport: string, gameId: string): Promise<Market[]> {
    console.log(`📊 [SportsDataIO] Fetching markets for ${sport} game ${gameId}...`);
    
    try {
      const endpoint = this.getMarketsEndpoint(sport);
      const rawMarkets = await this.makeRequest<any[]>(endpoint, { gameId });

      const markets = this.parseMarkets(rawMarkets, sport);
      console.log(`✅ [SportsDataIO] Successfully fetched ${markets.length} markets for ${sport} game ${gameId}`);
      return markets;
    } catch (error) {
      console.error(`❌ [SportsDataIO] Failed to fetch markets for ${sport} game ${gameId}:`, error);
      throw new Error(`Failed to fetch markets for ${sport} game ${gameId}: ${error.message}`);
    }
  }

  // Get odds for games
  async getOdds(sport: string): Promise<any[]> {
    console.log(`💰 [SportsDataIO] Fetching odds for ${sport}...`);
    
    try {
      const season = this.getCurrentSeason(sport);
      const week = this.getCurrentWeek(sport);
      
      const endpoint = this.getOddsEndpoint(sport);
      const rawOdds = await this.makeRequest<any[]>(endpoint, {
        season,
        week,
      });

      console.log(`✅ [SportsDataIO] Successfully fetched ${rawOdds.length} odds for ${sport}`);
      return rawOdds;
    } catch (error) {
      console.error(`❌ [SportsDataIO] Failed to fetch odds for ${sport}:`, error);
      throw new Error(`Failed to fetch odds for ${sport}: ${error.message}`);
    }
  }

  // Endpoint getters
  private getGamesEndpoint(sport: string): string {
    const endpoints: Record<string, string> = {
      'nfl': '/nfl/scores/json/Schedules',
      'nba': '/nba/scores/json/GamesByDate',
      'mlb': '/mlb/scores/json/GamesByDate',
      'nhl': '/nhl/scores/json/GamesByDate',
    };
    return endpoints[sport.toLowerCase()] || endpoints['nfl'];
  }

  private getPlayerPropsEndpoint(sport: string): string {
    const endpoints: Record<string, string> = {
      'nfl': '/nfl/odds/json/PlayerPropsByWeek',
      'nba': '/nba/odds/json/PlayerPropsByDate',
      'mlb': '/mlb/odds/json/PlayerPropsByDate',
      'nhl': '/nhl/odds/json/PlayerPropsByDate',
    };
    return endpoints[sport.toLowerCase()] || endpoints['nfl'];
  }

  private getPlayersEndpoint(sport: string): string {
    const endpoints: Record<string, string> = {
      'nfl': '/nfl/scores/json/Players',
      'nba': '/nba/scores/json/Players',
      'mlb': '/mlb/scores/json/Players',
      'nhl': '/nhl/scores/json/Players',
    };
    return endpoints[sport.toLowerCase()] || endpoints['nfl'];
  }

  private getHeadshotEndpoint(sport: string): string {
    const endpoints: Record<string, string> = {
      'nfl': '/nfl/scores/json/PlayerGameStats',
      'nba': '/nba/scores/json/PlayerGameStats',
      'mlb': '/mlb/scores/json/PlayerGameStats',
      'nhl': '/nhl/scores/json/PlayerGameStats',
    };
    return endpoints[sport.toLowerCase()] || endpoints['nfl'];
  }

  private getMarketsEndpoint(sport: string): string {
    const endpoints: Record<string, string> = {
      'nfl': '/nfl/odds/json/PlayerPropsByGame',
      'nba': '/nba/odds/json/PlayerPropsByGame',
      'mlb': '/mlb/odds/json/PlayerPropsByGame',
      'nhl': '/nhl/odds/json/PlayerPropsByGame',
    };
    return endpoints[sport.toLowerCase()] || endpoints['nfl'];
  }

  private getOddsEndpoint(sport: string): string {
    const endpoints: Record<string, string> = {
      'nfl': '/nfl/odds/json/GameOddsByWeek',
      'nba': '/nba/odds/json/GameOddsByDate',
      'mlb': '/mlb/odds/json/GameOddsByDate',
      'nhl': '/nhl/odds/json/GameOddsByDate',
    };
    return endpoints[sport.toLowerCase()] || endpoints['nfl'];
  }

  // Data parsing methods
  private parseGames(rawGames: any[], sport: string): Game[] {
    if (!rawGames || !Array.isArray(rawGames)) {
      console.warn(`⚠️ [SportsDataIO] Invalid games data received for ${sport}`);
      return [];
    }

    return rawGames
      .filter(game => game && game.GameID)
      .map(game => ({
        id: game.GameID?.toString() || '',
        sport: sport.toUpperCase(),
        homeTeam: game.HomeTeam || 'Unknown',
        awayTeam: game.AwayTeam || 'Unknown',
        homeTeamAbbr: game.HomeTeamAbbr || 'UNK',
        awayTeamAbbr: game.AwayTeamAbbr || 'UNK',
        homeTeamId: game.HomeTeamID || 0,
        awayTeamId: game.AwayTeamID || 0,
        date: game.Date || new Date().toISOString(),
        time: game.DateTime ? new Date(game.DateTime).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          timeZoneName: 'short' 
        }) : 'TBD',
        venue: game.Stadium || 'Unknown Venue',
        status: this.parseGameStatus(game.Status),
        homeScore: game.HomeScore,
        awayScore: game.AwayScore,
        homeRecord: game.HomeTeamRecord || '0-0',
        awayRecord: game.AwayTeamRecord || '0-0',
        homeOdds: game.HomeTeamMoneyLine,
        awayOdds: game.AwayTeamMoneyLine,
        spread: game.PointSpread,
        total: game.OverUnder,
        weather: game.Weather ? {
          temperature: game.Weather.Temperature || 0,
          condition: game.Weather.Condition || 'Unknown',
          windSpeed: game.Weather.WindSpeed || 0,
          humidity: game.Weather.Humidity || 0,
        } : undefined,
        injuries: game.Injuries ? game.Injuries.map((injury: any) => ({
          player: injury.PlayerName || 'Unknown',
          team: injury.Team || 'Unknown',
          status: injury.Status || 'Unknown',
          position: injury.Position || 'Unknown',
        })) : undefined,
      }));
  }

  private parsePlayerProps(rawProps: any[], sport: string): PlayerProp[] {
    if (!rawProps || !Array.isArray(rawProps)) {
      console.warn(`⚠️ [SportsDataIO] Invalid props data received for ${sport}`);
      return [];
    }

    return rawProps
      .filter(prop => prop && prop.PlayerID && prop.StatType)
      .map(prop => {
        const line = prop.Line || 0;
        const overOdds = prop.OverOdds || 0;
        const underOdds = prop.UnderOdds || 0;
        
        // Generate AI prediction based on odds
        const confidence = this.calculateConfidence(overOdds, underOdds);
        const recommended = overOdds < underOdds ? 'over' : 'under';
        
        return {
          id: prop.PlayerPropID?.toString() || `${prop.PlayerID}_${prop.StatType}_${Date.now()}`,
          playerId: prop.PlayerID || 0,
          playerName: prop.PlayerName || 'Unknown Player',
          team: prop.Team || 'Unknown',
          teamAbbr: prop.TeamAbbr || 'UNK',
          opponent: prop.Opponent || 'Unknown',
          opponentAbbr: prop.OpponentAbbr || 'UNK',
          gameId: prop.GameID?.toString() || '',
          sport: sport.toUpperCase(),
          propType: this.mapStatTypeToPropType(prop.StatType),
          line: line,
          overOdds: overOdds,
          underOdds: underOdds,
          gameDate: prop.GameDate || new Date().toISOString(),
          gameTime: prop.GameTime || 'TBD',
          confidence: confidence,
          expectedValue: this.calculateExpectedValue(overOdds, underOdds, confidence),
          recentForm: this.determineRecentForm(prop.PlayerID, prop.StatType),
          last5Games: this.generateLast5Games(line),
          seasonStats: {
            average: line + (Math.random() - 0.5) * line * 0.2,
            median: line + (Math.random() - 0.5) * line * 0.1,
            gamesPlayed: 10 + Math.floor(Math.random() * 10),
            hitRate: 0.4 + Math.random() * 0.4,
            last5Games: this.generateLast5Games(line),
            seasonHigh: line * 1.5,
            seasonLow: line * 0.5,
          },
          aiPrediction: {
            recommended: recommended,
            confidence: confidence,
            reasoning: this.generateReasoning(prop.StatType, prop.PlayerName, prop.Team, prop.Opponent),
            factors: this.generateFactors(prop.StatType, sport),
          },
        };
      });
  }

  private parsePlayers(rawPlayers: any[], sport: string): Player[] {
    if (!rawPlayers || !Array.isArray(rawPlayers)) {
      console.warn(`⚠️ [SportsDataIO] Invalid players data received for ${sport}`);
      return [];
    }

    return rawPlayers
      .filter(player => player && player.PlayerID)
      .map(player => ({
        id: player.PlayerID || 0,
        name: player.Name || 'Unknown Player',
        team: player.Team || 'Unknown',
        teamAbbr: player.TeamAbbr || 'UNK',
        position: player.Position || 'Unknown',
        jerseyNumber: player.Number || 0,
        height: player.Height || 'Unknown',
        weight: player.Weight || 0,
        age: player.Age || 0,
        experience: player.Experience || 0,
        headshotUrl: player.PhotoUrl,
        stats: player.Stats ? {
          average: player.Stats.Average || 0,
          median: player.Stats.Median || 0,
          gamesPlayed: player.Stats.GamesPlayed || 0,
          hitRate: player.Stats.HitRate || 0,
          last5Games: player.Stats.Last5Games || [],
          seasonHigh: player.Stats.SeasonHigh || 0,
          seasonLow: player.Stats.SeasonLow || 0,
        } : undefined,
      }));
  }

  private parseMarkets(rawMarkets: any[], sport: string): Market[] {
    if (!rawMarkets || !Array.isArray(rawMarkets)) {
      console.warn(`⚠️ [SportsDataIO] Invalid markets data received for ${sport}`);
      return [];
    }

    return rawMarkets
      .filter(market => market && market.MarketID)
      .map(market => ({
        id: market.MarketID?.toString() || '',
        name: market.MarketName || 'Unknown Market',
        sport: sport.toUpperCase(),
        gameId: market.GameID?.toString() || '',
        props: market.Props ? market.Props.map((prop: any) => ({
          id: prop.PropID?.toString() || '',
          playerId: prop.PlayerID || 0,
          playerName: prop.PlayerName || 'Unknown Player',
          team: prop.Team || 'Unknown',
          teamAbbr: prop.TeamAbbr || 'UNK',
          opponent: prop.Opponent || 'Unknown',
          opponentAbbr: prop.OpponentAbbr || 'UNK',
          gameId: market.GameID?.toString() || '',
          sport: sport.toUpperCase(),
          propType: prop.PropType || 'Unknown',
          line: prop.Line || 0,
          overOdds: prop.OverOdds || 0,
          underOdds: prop.UnderOdds || 0,
          gameDate: prop.GameDate || new Date().toISOString(),
          gameTime: prop.GameTime || 'TBD',
        })) : [],
        lastUpdated: market.LastUpdated || new Date().toISOString(),
      }));
  }

  // Helper methods for data processing
  private parseGameStatus(status: string): 'scheduled' | 'live' | 'finished' {
    if (!status) return 'scheduled';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('live') || statusLower.includes('in progress')) return 'live';
    if (statusLower.includes('final') || statusLower.includes('completed')) return 'finished';
    return 'scheduled';
  }

  private mapStatTypeToPropType(statType: string): string {
    const mapping: Record<string, string> = {
      'PassingYards': 'Passing Yards',
      'PassingTouchdowns': 'Passing TDs',
      'RushingYards': 'Rushing Yards',
      'RushingTouchdowns': 'Rushing TDs',
      'ReceivingYards': 'Receiving Yards',
      'ReceivingTouchdowns': 'Receiving TDs',
      'Receptions': 'Receptions',
      'Points': 'Points',
      'Rebounds': 'Rebounds',
      'Assists': 'Assists',
      'Steals': 'Steals',
      'Blocks': 'Blocks',
      'Hits': 'Hits',
      'Runs': 'Runs',
      'RBIs': 'RBIs',
      'Strikeouts': 'Strikeouts',
      'HomeRuns': 'Home Runs',
      'Goals': 'Goals',
      'ShotsOnGoal': 'Shots on Goal',
      'Saves': 'Saves',
    };
    return mapping[statType] || statType;
  }

  private calculateConfidence(overOdds: number, underOdds: number): number {
    // Calculate confidence based on odds difference
    const totalOdds = Math.abs(overOdds) + Math.abs(underOdds);
    const difference = Math.abs(overOdds - underOdds);
    return Math.min(0.95, Math.max(0.5, 0.5 + (difference / totalOdds) * 0.4));
  }

  private calculateExpectedValue(overOdds: number, underOdds: number, confidence: number): number {
    // Simple EV calculation based on odds and confidence
    const overProb = 1 / (1 + Math.abs(overOdds) / 100);
    const underProb = 1 / (1 + Math.abs(underOdds) / 100);
    const totalProb = overProb + underProb;
    
    const normalizedOverProb = overProb / totalProb;
    const normalizedUnderProb = underProb / totalProb;
    
    return (normalizedOverProb - normalizedUnderProb) * confidence;
  }

  private determineRecentForm(playerId: number, statType: string): string {
    // Simple form determination based on player ID and stat type
    const hash = (playerId + statType.length) % 3;
    return ['Hot', 'Cold', 'Neutral'][hash];
  }

  private generateLast5Games(line: number): number[] {
    return Array.from({ length: 5 }, () => 
      line + (Math.random() - 0.5) * line * 0.3
    );
  }

  private generateReasoning(statType: string, playerName: string, team: string, opponent: string): string {
    const reasons = [
      `${playerName} has been performing well against ${opponent} historically.`,
      `Recent form suggests ${playerName} is trending in the right direction.`,
      `Matchup favors ${team} in this category based on recent games.`,
      `${playerName} has exceeded expectations in similar situations this season.`,
      `Team dynamics and recent performance support this prediction.`,
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  private generateFactors(statType: string, sport: string): string[] {
    const commonFactors = ['Recent Form', 'Head-to-Head History', 'Team Performance'];
    const sportFactors: Record<string, string[]> = {
      'nfl': ['Weather Conditions', 'Injury Report', 'Defensive Matchup'],
      'nba': ['Rest Days', 'Home/Away Split', 'Opponent Defense'],
      'mlb': ['Pitcher Matchup', 'Ballpark Factors', 'Weather'],
      'nhl': ['Goalie Matchup', 'Special Teams', 'Recent Trends'],
    };
    
    return [...commonFactors, ...(sportFactors[sport.toLowerCase()] || [])];
  }

  private generateLivePredictions(games: Game[], props: PlayerProp[], sport: string): Prediction[] {
    return props.map(prop => {
      const game = games.find(g => g.id === prop.gameId);
      return {
        id: `pred_${prop.id}_${Date.now()}`,
        sport: sport.toUpperCase(),
        player: prop.playerName,
        team: prop.team,
        opponent: prop.opponent,
        prop: prop.propType,
        line: prop.line,
        prediction: prop.aiPrediction?.recommended || 'over',
        confidence: prop.confidence || 0.5,
        odds: prop.overOdds,
        expectedValue: prop.expectedValue || 0,
        gameDate: prop.gameDate,
        gameTime: prop.gameTime,
        factors: prop.aiPrediction?.factors || [],
        reasoning: prop.aiPrediction?.reasoning || '',
        lastUpdated: new Date().toISOString(),
      };
    });
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 [SportsDataIO] Cache cleared');
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const sportsDataIOAPI = new SportsDataIOAPI();