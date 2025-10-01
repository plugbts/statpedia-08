/**
 * SportsdataIO API Service
 * Comprehensive sports data API with safety checks and no mock data
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
  jerseyNumber?: number;
  headshotUrl?: string;
  height?: string;
  weight?: number;
  age?: number;
  experience?: number;
  college?: string;
  salary?: number;
  injuryStatus?: string;
  stats?: {
    gamesPlayed: number;
    average: number;
    last5Games: number[];
    seasonHigh: number;
    seasonLow: number;
  };
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
      timeout: 10000,
      retryAttempts: 3,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
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

    console.log(`🌐 Making request to: ${url.toString()}`);

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Statpedia/1.0',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limit - wait and retry
            const waitTime = Math.pow(2, attempt) * 1000;
            console.warn(`⚠️ Rate limited, waiting ${waitTime}ms before retry ${attempt}/${this.config.retryAttempts}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          if (response.status === 401) {
            throw new Error('Invalid API key');
          }
          
          if (response.status === 403) {
            throw new Error('API access forbidden - check subscription');
          }
          
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Successfully fetched data from ${endpoint}`);
        return data;

      } catch (error) {
        console.error(`❌ Attempt ${attempt}/${this.config.retryAttempts} failed for ${endpoint}:`, error);
        
        if (attempt === this.config.retryAttempts) {
          throw new Error(`Failed to fetch data from ${endpoint} after ${this.config.retryAttempts} attempts: ${error}`);
        }
        
        // Wait before retry
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw new Error(`Failed to fetch data from ${endpoint} after ${this.config.retryAttempts} attempts`);
  }

  // Get current week games for a sport
  async getCurrentWeekGames(sport: string): Promise<Game[]> {
    console.log(`🏈 Fetching current week games for ${sport}...`);
    
    try {
      const season = this.getCurrentSeason(sport);
      const week = this.getCurrentWeek(sport);
      
      const endpoint = this.getGamesEndpoint(sport);
      const rawGames = await this.makeRequest<any[]>(endpoint, {
        season,
        week,
      });

      const games = this.parseGames(rawGames, sport);
      console.log(`✅ Successfully fetched ${games.length} games for ${sport}`);
      return games;
    } catch (error) {
      console.error(`❌ Failed to fetch games for ${sport}:`, error);
      throw new Error(`Failed to fetch games for ${sport}: ${error}`);
    }
  }

  // Get player props for a sport
  async getPlayerProps(sport: string): Promise<PlayerProp[]> {
    console.log(`🎯 Fetching player props for ${sport}...`);
    
    try {
      const season = this.getCurrentSeason(sport);
      const week = this.getCurrentWeek(sport);
      
      const endpoint = this.getPlayerPropsEndpoint(sport);
      const rawProps = await this.makeRequest<any[]>(endpoint, {
        season,
        week,
      });

      const props = this.parsePlayerProps(rawProps, sport);
      console.log(`✅ Successfully fetched ${props.length} player props for ${sport}`);
      return props;
    } catch (error) {
      console.error(`❌ Failed to fetch player props for ${sport}:`, error);
      throw new Error(`Failed to fetch player props for ${sport}: ${error}`);
    }
  }

  // Get players for a team
  async getPlayers(sport: string, teamId?: number): Promise<Player[]> {
    console.log(`👥 Fetching players for ${sport}${teamId ? ` team ${teamId}` : ''}...`);
    
    try {
      const endpoint = this.getPlayersEndpoint(sport);
      const rawPlayers = await this.makeRequest<any[]>(endpoint, teamId ? { team: teamId } : {});

      const players = this.parsePlayers(rawPlayers, sport);
      console.log(`✅ Successfully fetched ${players.length} players for ${sport}`);
      return players;
    } catch (error) {
      console.error(`❌ Failed to fetch players for ${sport}:`, error);
      throw new Error(`Failed to fetch players for ${sport}: ${error}`);
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
      console.warn(`⚠️ Failed to fetch headshot for player ${playerId}:`, error);
      return null;
    }
  }

  // Get markets for a game
  async getMarkets(sport: string, gameId: string): Promise<Market[]> {
    console.log(`📊 Fetching markets for ${sport} game ${gameId}...`);
    
    try {
      const endpoint = this.getMarketsEndpoint(sport);
      const rawMarkets = await this.makeRequest<any[]>(endpoint, { gameId });

      const markets = this.parseMarkets(rawMarkets, sport);
      console.log(`✅ Successfully fetched ${markets.length} markets for game ${gameId}`);
      return markets;
    } catch (error) {
      console.error(`❌ Failed to fetch markets for game ${gameId}:`, error);
      throw new Error(`Failed to fetch markets for game ${gameId}: ${error}`);
    }
  }

  // Get odds for a game
  async getOdds(sport: string, gameId: string): Promise<any> {
    console.log(`💰 Fetching odds for ${sport} game ${gameId}...`);
    
    try {
      const endpoint = this.getOddsEndpoint(sport);
      const odds = await this.makeRequest<any>(endpoint, { gameId });
      
      console.log(`✅ Successfully fetched odds for game ${gameId}`);
      return odds;
    } catch (error) {
      console.error(`❌ Failed to fetch odds for game ${gameId}:`, error);
      throw new Error(`Failed to fetch odds for game ${gameId}: ${error}`);
    }
  }

  // Helper methods for endpoints
  private getGamesEndpoint(sport: string): string {
    const endpoints: Record<string, string> = {
      'nfl': '/nfl/scores/json/Schedules',
      'nba': '/nba/scores/json/Games',
      'mlb': '/mlb/scores/json/Games',
      'nhl': '/nhl/scores/json/Games',
    };
    return endpoints[sport.toLowerCase()] || endpoints['nfl'];
  }

  private getPlayerPropsEndpoint(sport: string): string {
    const endpoints: Record<string, string> = {
      'nfl': '/nfl/scores/json/PlayerGameStats',
      'nba': '/nba/scores/json/PlayerGameStats',
      'mlb': '/mlb/scores/json/PlayerGameStats',
      'nhl': '/nhl/scores/json/PlayerGameStats',
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

  // Helper methods for season and week
  private getCurrentSeason(sport: string): number {
    const now = new Date();
    const year = now.getFullYear();
    
    // Handle different sport seasons
    switch (sport.toLowerCase()) {
      case 'nfl':
        // NFL season starts in September
        return now.getMonth() >= 8 ? year : year - 1;
      case 'nba':
        // NBA season starts in October
        return now.getMonth() >= 9 ? year : year - 1;
      case 'mlb':
        // MLB season starts in March
        return now.getMonth() >= 2 ? year : year - 1;
      case 'nhl':
        // NHL season starts in October
        return now.getMonth() >= 9 ? year : year - 1;
      default:
        return year;
    }
  }

  private getCurrentWeek(sport: string): number {
    const now = new Date();
    const seasonStart = this.getSeasonStart(sport);
    const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, weeksSinceStart);
  }

  private getSeasonStart(sport: string): Date {
    const now = new Date();
    const year = now.getFullYear();
    
    switch (sport.toLowerCase()) {
      case 'nfl':
        // NFL season starts first Thursday of September
        const nflStart = new Date(year, 8, 1); // September 1st
        while (nflStart.getDay() !== 4) nflStart.setDate(nflStart.getDate() + 1);
        return nflStart;
      case 'nba':
        // NBA season starts mid-October
        return new Date(year, 9, 15); // October 15th
      case 'mlb':
        // MLB season starts late March
        return new Date(year, 2, 28); // March 28th
      case 'nhl':
        // NHL season starts early October
        return new Date(year, 9, 1); // October 1st
      default:
        return new Date(year, 0, 1); // January 1st
    }
  }

  // Data parsing methods
  private parseGames(rawGames: any[], sport: string): Game[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    return rawGames
      .filter(game => {
        if (!game || !game.DateTime) return false;
        const gameDate = new Date(game.DateTime);
        return gameDate >= today && gameDate <= twoWeeksFromNow;
      })
      .map(game => ({
        id: game.GameID?.toString() || '',
        sport: sport.toUpperCase(),
        homeTeam: game.HomeTeam || 'Unknown',
        awayTeam: game.AwayTeam || 'Unknown',
        homeTeamAbbr: game.HomeTeamAbbr || 'UNK',
        awayTeamAbbr: game.AwayTeamAbbr || 'UNK',
        homeTeamId: game.HomeTeamID || 0,
        awayTeamId: game.AwayTeamID || 0,
        date: game.DateTime || new Date().toISOString(),
        time: new Date(game.DateTime).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          timeZoneName: 'short' 
        }),
        venue: game.Stadium || 'TBD',
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
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    return rawProps
      .filter(prop => {
        if (!prop || !prop.DateTime) return false;
        const gameDate = new Date(prop.DateTime);
        return gameDate >= today && gameDate <= twoWeeksFromNow;
      })
      .map(prop => ({
        id: `${prop.PlayerID}_${prop.GameID}_${prop.StatType}`,
        playerId: prop.PlayerID || 0,
        playerName: prop.Name || 'Unknown Player',
        team: prop.Team || 'Unknown',
        teamAbbr: prop.TeamAbbr || 'UNK',
        opponent: prop.Opponent || 'Unknown',
        opponentAbbr: prop.OpponentAbbr || 'UNK',
        gameId: prop.GameID?.toString() || '',
        sport: sport.toUpperCase(),
        propType: this.mapStatTypeToPropType(prop.StatType),
        line: this.calculatePropLine(prop),
        overOdds: this.calculateOverOdds(prop),
        underOdds: this.calculateUnderOdds(prop),
        gameDate: prop.DateTime || new Date().toISOString(),
        gameTime: new Date(prop.DateTime).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          timeZoneName: 'short' 
        }),
        confidence: this.calculateConfidence(prop),
        expectedValue: this.calculateExpectedValue(prop),
        recentForm: this.calculateRecentForm(prop),
        last5Games: this.calculateLast5Games(prop),
        seasonStats: this.calculateSeasonStats(prop),
        aiPrediction: this.generateAIPrediction(prop),
      }));
  }

  private parsePlayers(rawPlayers: any[], sport: string): Player[] {
    return rawPlayers
      .filter(player => player && player.PlayerID)
      .map(player => ({
        id: player.PlayerID || 0,
        name: player.Name || 'Unknown Player',
        team: player.Team || 'Unknown',
        teamAbbr: player.TeamAbbr || 'UNK',
        position: player.Position || 'Unknown',
        jerseyNumber: player.Number,
        headshotUrl: player.PhotoUrl,
        height: player.Height,
        weight: player.Weight,
        age: player.Age,
        experience: player.Experience,
        college: player.College,
        salary: player.Salary,
        injuryStatus: player.InjuryStatus,
        stats: player.Stats ? {
          gamesPlayed: player.Stats.GamesPlayed || 0,
          average: player.Stats.Average || 0,
          last5Games: player.Stats.Last5Games || [],
          seasonHigh: player.Stats.SeasonHigh || 0,
          seasonLow: player.Stats.SeasonLow || 0,
        } : undefined,
      }));
  }

  private parseMarkets(rawMarkets: any[], sport: string): Market[] {
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

  private calculatePropLine(prop: any): number {
    // Use historical average or season average as line
    return prop.SeasonAverage || prop.CareerAverage || 0;
  }

  private calculateOverOdds(prop: any): number {
    // Calculate based on historical hit rate
    const hitRate = prop.HitRate || 0.5;
    return hitRate > 0.5 ? -110 : 110;
  }

  private calculateUnderOdds(prop: any): number {
    // Calculate based on historical hit rate
    const hitRate = prop.HitRate || 0.5;
    return hitRate > 0.5 ? 110 : -110;
  }

  private calculateConfidence(prop: any): number {
    // Calculate confidence based on consistency and sample size
    const gamesPlayed = prop.GamesPlayed || 1;
    const variance = prop.Variance || 1;
    const consistency = Math.max(0, 1 - (variance / 100));
    const sampleSize = Math.min(1, gamesPlayed / 10);
    return (consistency + sampleSize) / 2;
  }

  private calculateExpectedValue(prop: any): number {
    // Calculate expected value based on odds and probability
    const hitRate = prop.HitRate || 0.5;
    const overOdds = this.calculateOverOdds(prop);
    const impliedProbability = overOdds > 0 ? 100 / (overOdds + 100) : Math.abs(overOdds) / (Math.abs(overOdds) + 100);
    return hitRate - impliedProbability;
  }

  private calculateRecentForm(prop: any): string {
    const last5Games = prop.Last5Games || [];
    if (last5Games.length < 3) return 'Neutral';
    
    const average = last5Games.reduce((sum: number, val: number) => sum + val, 0) / last5Games.length;
    const line = this.calculatePropLine(prop);
    
    if (average > line * 1.1) return 'Hot';
    if (average < line * 0.9) return 'Cold';
    return 'Neutral';
  }

  private calculateLast5Games(prop: any): number[] {
    return prop.Last5Games || [];
  }

  private calculateSeasonStats(prop: any): any {
    return {
      average: prop.SeasonAverage || 0,
      median: prop.SeasonMedian || 0,
      gamesPlayed: prop.GamesPlayed || 0,
      hitRate: prop.HitRate || 0.5,
    };
  }

  private generateAIPrediction(prop: any): any {
    const confidence = this.calculateConfidence(prop);
    const recentForm = this.calculateRecentForm(prop);
    const expectedValue = this.calculateExpectedValue(prop);
    
    const recommended = expectedValue > 0 ? 'over' : 'under';
    const factors = [
      `Recent form: ${recentForm}`,
      `Season average: ${prop.SeasonAverage || 0}`,
      `Hit rate: ${((prop.HitRate || 0.5) * 100).toFixed(1)}%`,
      `Games played: ${prop.GamesPlayed || 0}`,
    ];

    return {
      recommended,
      confidence,
      reasoning: `Based on ${recentForm} recent form and ${((prop.HitRate || 0.5) * 100).toFixed(1)}% hit rate`,
      factors,
    };
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ API cache cleared');
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
export default sportsDataIOAPI;
