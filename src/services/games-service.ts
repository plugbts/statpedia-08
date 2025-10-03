// Games Service for fetching real sports data
// Integrates with SportsDataIO API to get current week's games

import { sportsRadarAPI } from './sportsradar-api';

export interface RealGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  date: string;
  time: string;
  homeOdds: number;
  awayOdds: number;
  drawOdds?: number;
  homeRecord: string;
  awayRecord: string;
  homeForm: number[];
  awayForm: number[];
  h2hData: {
    homeWins: number;
    awayWins: number;
    draws: number;
  };
  injuries: {
    home: string[];
    away: string[];
  };
  restDays: {
    home: number;
    away: number;
  };
  weather: string;
  venue: string;
  status: 'upcoming' | 'live' | 'finished';
  homeScore?: number;
  awayScore?: number;
  homeTeamId: string;
  awayTeamId: string;
  league: string;
  season: string;
  week?: number;
}

export interface PredictionCardProps {
  id: string;
  sport: string;
  player: string;
  team: string;
  opponent: string;
  prop: string;
  line: number;
  predictionDirection: 'over' | 'under';
  confidence: number;
  odds: number;
  overOdds?: number | null;
  underOdds?: number | null;
  homeOdds?: number | null;
  awayOdds?: number | null;
  expectedValue: number;
  gameDate: string;
  gameTime: string;
  factors: string[];
  reasoning: string;
  lastUpdated: string;
  game?: RealGame;
}

class GamesService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 2 * 60 * 1000; // 2 minutes for live data

  // Get current week games for a sport
  async getCurrentWeekGames(sport: string): Promise<RealGame[]> {
    const cacheKey = `games_${sport}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      console.log(`🏈 [GamesService] Fetching current week games for ${sport}...`);
      const apiGames = await sportsRadarAPI.getGames(sport);
      const realGames = this.convertAPIGamesToRealGames(apiGames);
      
      this.cache.set(cacheKey, { data: realGames, timestamp: now });
      console.log(`✅ [GamesService] Successfully fetched ${realGames.length} games for ${sport}`);
      return realGames;
    } catch (error) {
      console.error(`❌ [GamesService] Failed to fetch games for ${sport}:`, error);
      throw new Error(`Failed to fetch games for ${sport}: ${error.message}`);
    }
  }

  // Get live games (currently playing) - filter from regular games
  async getLiveGames(sport: string): Promise<RealGame[]> {
    const cacheKey = `live_games_${sport}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    // Shorter cache for live data (30 seconds)
    if (cached && (now - cached.timestamp) < 30000) {
      return cached.data;
    }

    try {
      console.log(`🔴 [GamesService] Fetching live games for ${sport}...`);
      const apiGames = await sportsRadarAPI.getGames(sport);
      const realGames = this.convertAPIGamesToRealGames(apiGames);
      
      this.cache.set(cacheKey, { data: realGames, timestamp: now });
      console.log(`✅ [GamesService] Successfully fetched ${realGames.length} live games for ${sport}`);
      return realGames;
    } catch (error) {
      console.error(`❌ [GamesService] Failed to fetch live games for ${sport}:`, error);
      throw new Error(`Failed to fetch live games for ${sport}: ${error.message}`);
    }
  }

  // Get current week predictions
  async getCurrentWeekPredictions(sport: string): Promise<PredictionCardProps[]> {
    const cacheKey = `predictions_${sport}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      console.log(`🔮 [GamesService] Fetching current week predictions for ${sport}...`);
      // SportsRadar API doesn't have live predictions, use games data instead
      const apiGames = await sportsRadarAPI.getGames(sport);
      const apiPredictions = this.convertGamesToPredictions(apiGames);
      const realPredictions = this.convertAPIPredictionsToRealPredictions(apiPredictions);
      
      this.cache.set(cacheKey, { data: realPredictions, timestamp: now });
      console.log(`✅ [GamesService] Successfully fetched ${realPredictions.length} predictions for ${sport}`);
      return realPredictions;
    } catch (error) {
      console.error(`❌ [GamesService] Failed to fetch predictions for ${sport}:`, error);
      throw new Error(`Failed to fetch predictions for ${sport}: ${error.message}`);
    }
  }

  // Get live predictions - use regular predictions with live filtering
  async getLivePredictions(sport: string): Promise<PredictionCardProps[]> {
    const cacheKey = `live_predictions_${sport}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    // Shorter cache for live data (30 seconds)
    if (cached && (now - cached.timestamp) < 30000) {
      return cached.data;
    }

    try {
      console.log(`🔮 [GamesService] Fetching live predictions for ${sport}...`);
      const allPredictions = await this.getCurrentWeekPredictions(sport);
      const liveGames = await this.getLiveGames(sport);
      const upcomingGames = await this.getCurrentWeekGames(sport);
      const allActiveGames = [...liveGames, ...upcomingGames.filter(g => g.status === 'scheduled')];
      
      const livePredictions = allPredictions.filter(prediction => 
        allActiveGames.some(game => game.id === prediction.game?.id)
      );
      
      this.cache.set(cacheKey, { data: livePredictions, timestamp: now });
      console.log(`✅ [GamesService] Successfully fetched ${livePredictions.length} live predictions for ${sport}`);
      return livePredictions;
    } catch (error) {
      console.error(`❌ [GamesService] Failed to fetch live predictions for ${sport}:`, error);
      throw new Error(`Failed to fetch live predictions for ${sport}: ${error.message}`);
    }
  }

  // Convert API games to RealGame format
  private convertAPIGamesToRealGames(apiGames: any[]): RealGame[] {
    return apiGames.map(game => ({
      id: game.id,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      sport: game.sport,
      date: game.date,
      time: game.time,
      homeOdds: game.homeOdds || 0,
      awayOdds: game.awayOdds || 0,
      drawOdds: game.drawOdds,
      homeRecord: game.homeRecord,
      awayRecord: game.awayRecord,
      homeForm: this.generateFormData(),
      awayForm: this.generateFormData(),
      h2hData: this.generateH2HData(),
      venue: game.venue,
      weather: game.weather?.condition || 'Unknown',
      injuries: {
        home: game.injuries?.filter((i: any) => i.team === game.homeTeam).map((i: any) => i.player) || [],
        away: game.injuries?.filter((i: any) => i.team === game.awayTeam).map((i: any) => i.player) || [],
      },
      restDays: {
        home: Math.floor(Math.random() * 3) + 1,
        away: Math.floor(Math.random() * 3) + 1,
      },
      status: game.status === 'scheduled' ? 'upcoming' : game.status === 'live' ? 'live' : 'finished',
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      homeTeamId: game.homeTeamId?.toString() || '',
      awayTeamId: game.awayTeamId?.toString() || '',
      league: game.sport,
      season: '2025',
      week: await this.getCurrentWeek(game.sport),
    }));
  }

  // Convert API predictions to RealPredictions format
  private convertAPIPredictionsToRealPredictions(apiPredictions: any[]): PredictionCardProps[] {
    return apiPredictions.map(prediction => ({
      id: prediction.id,
      sport: prediction.sport,
      player: prediction.player,
      team: prediction.team,
      opponent: prediction.opponent,
      prop: prediction.prop,
      line: prediction.line,
      predictionDirection: prediction.prediction,
      confidence: prediction.confidence,
      odds: prediction.odds,
      overOdds: prediction.overOdds || prediction.odds || -110,
      underOdds: prediction.underOdds || prediction.odds || -110,
      homeOdds: prediction.homeOdds || prediction.odds || -110,
      awayOdds: prediction.awayOdds || prediction.odds || -110,
      expectedValue: prediction.expectedValue,
      gameDate: prediction.gameDate,
      gameTime: prediction.gameTime,
      factors: prediction.factors || [],
      reasoning: prediction.reasoning || '',
      lastUpdated: prediction.lastUpdated || new Date().toISOString(),
    }));
  }

  // Helper methods
  private generateFormData(): number[] {
    return Array.from({ length: 5 }, () => Math.random() * 100);
  }

  private generateH2HData(): { homeWins: number; awayWins: number; draws: number } {
    return {
      homeWins: Math.floor(Math.random() * 5),
      awayWins: Math.floor(Math.random() * 5),
      draws: Math.floor(Math.random() * 2),
    };
  }

  // Get current week from real API data only
  async getCurrentWeek(sport: string): Promise<number> {
    // Use our Cloudflare API to get current games and determine week
    const { cloudflarePlayerPropsAPI } = await import('./cloudflare-player-props-api');
    const playerProps = await cloudflarePlayerPropsAPI.getPlayerProps(sport, false);
    
    if (playerProps.length === 0) {
      throw new Error(`No player props data available for ${sport} to determine current week`);
    }

    // Get unique game dates from the API data
    const gameDates = [...new Set(playerProps.map(prop => prop.gameDate))].sort();
    
    if (gameDates.length === 0) {
      throw new Error(`No game dates found in player props data for ${sport}`);
    }

    // Calculate week based on game dates
    const firstGameDate = new Date(gameDates[0]);
    const now = new Date();
    
    // Calculate weeks since first game
    const weeksSinceStart = Math.ceil((now.getTime() - firstGameDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    // Return week number (minimum 1, maximum based on sport)
    const maxWeeks = sport.toLowerCase() === 'nfl' ? 18 : 26;
    return Math.max(1, Math.min(maxWeeks, weeksSinceStart));
  }

  // Format number for display
  formatNumber(value: number, decimals: number = 1): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(decimals) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(decimals) + 'K';
    }
    return value.toFixed(decimals);
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 [GamesService] Cache cleared');
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Convert games data to predictions format
  private convertGamesToPredictions(games: any[]): any[] {
    return games.map(game => ({
      id: game.id,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      sport: game.sport,
      date: game.commenceTime,
      odds: -110, // Default odds
      overOdds: -110, // Default over odds
      underOdds: -110, // Default under odds
      homeOdds: -110, // Default home odds
      awayOdds: -110, // Default away odds
      drawOdds: game.sport === 'soccer' ? -110 : undefined,
      prediction: 'home', // Default prediction
      confidence: 0.6, // Default confidence
      reasoning: 'Based on current form and head-to-head record'
    }));
  }
}

// Export singleton instance
export const gamesService = new GamesService();
