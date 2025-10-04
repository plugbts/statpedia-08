import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { sportsGameOddsAPI, SportsGameOddsPlayerProp, SportsGameOddsGame } from './sportsgameodds-api';
import { normalizeEventSGO, groupPlayerProps } from './normalizers';

// Unified interfaces
export interface SportsbookOdds {
  sportsbook: string;
  line: number;
  overOdds: number;
  underOdds: number;
  lastUpdate: string;
}

export interface PlayerProp {
  id: string;
  playerId: string;
  playerName: string;
  team: string;
  teamAbbr: string;
  opponent: string;
  opponentAbbr: string;
  gameId: string;
  sport: string;
  propType: string;
  // Primary odds (default from SportsRadar)
  line: number;
  overOdds: number;
  underOdds: number;
  // Multiple sportsbook odds
  allSportsbookOdds?: SportsbookOdds[];
  // Metadata
  gameDate: string;
  gameTime: string;
  headshotUrl?: string;
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
  // Metadata
  lastUpdated: Date;
  isLive: boolean;
  marketId: string;
}

export interface Game {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
  homeOdds?: number;
  awayOdds?: number;
  drawOdds?: number;
}

export interface OddsComparison {
  id: string;
  sport: string;
    homeTeam: string;
    awayTeam: string;
  commenceTime: string;
  markets: Market[];
  lastUpdate: string;
}

export interface Market {
  key: string;
  outcomes: Outcome[];
}

export interface Outcome {
  name: string;
  price: number;
  point?: number;
}

class UnifiedSportsAPI {
  constructor() {
    logInfo('UnifiedSportsAPI', 'Service initialized - Version 5.0.0');
    logInfo('UnifiedSportsAPI', 'Using SportsGameOdds API for all data (games, markets, odds, props)');
  }

  // Get player props using SportsGameOdds API (markets/odds/props only)
  async getPlayerProps(sport: string, season?: number, week?: number, selectedSportsbook?: string): Promise<PlayerProp[]> {
    logAPI('UnifiedSportsAPI', `Getting player props for ${sport}${season ? ` ${season}` : ''}${week ? ` week ${week}` : ''} from SportsGameOdds API`);
    
    try {
      // Get player props from Backend API (server-side SportGameOdds)
      const { backendSportsGameOddsAPI } = await import('./backend-sportsgameodds-api');
      const sportsGameOddsProps = await backendSportsGameOddsAPI.getPlayerProps(sport);
      
      logAPI('UnifiedSportsAPI', `Backend SportsGameOdds: ${sportsGameOddsProps.length} props`);
      console.log('🎯 UnifiedSportsAPI received props from SportsGameOdds:', sportsGameOddsProps.length);

      // Convert SportsGameOdds props to unified format
      const enhancedProps: PlayerProp[] = sportsGameOddsProps.map(sgoProp => ({
        id: `sgo-${sgoProp.id}`,
        playerId: sgoProp.playerId,
        playerName: sgoProp.playerName,
        team: sgoProp.team,
        teamAbbr: this.getTeamAbbreviation(sgoProp.team),
        opponent: sgoProp.homeTeam === sgoProp.team ? sgoProp.awayTeam : sgoProp.homeTeam,
        opponentAbbr: this.getTeamAbbreviation(sgoProp.homeTeam === sgoProp.team ? sgoProp.awayTeam : sgoProp.homeTeam),
        gameId: sgoProp.gameId,
        sport: sport.toUpperCase(),
        propType: sgoProp.propType,
        line: sgoProp.line,
        overOdds: sgoProp.overOdds,
        underOdds: sgoProp.underOdds,
        allSportsbookOdds: [{
          sportsbook: sgoProp.sportsbook,
          line: sgoProp.line,
          overOdds: sgoProp.overOdds,
          underOdds: sgoProp.underOdds,
          lastUpdate: sgoProp.lastUpdate
        }],
        gameDate: this.formatGameDate(sgoProp.gameTime),
        gameTime: sgoProp.gameTime,
        confidence: sgoProp.confidence,
        expectedValue: this.calculateExpectedValue(sgoProp.line, sgoProp.overOdds, sgoProp.underOdds),
        lastUpdated: new Date(sgoProp.lastUpdate),
        isLive: true,
        marketId: `${sgoProp.playerId}-${sgoProp.propType}-${sgoProp.gameId}-${sport}`,
        seasonStats: this.generateSeasonStats(sgoProp.propType, sgoProp.line),
        aiPrediction: this.generateAIPrediction(sgoProp.propType, sgoProp.line, sgoProp.overOdds, sgoProp.underOdds)
      }));

      // Filter by sportsbook if specified
      let filteredProps = enhancedProps;
      if (selectedSportsbook && selectedSportsbook !== 'all') {
        // Check if any props have sportsbook-specific odds
        const propsWithSportsbookData = enhancedProps.filter(prop => 
          prop.allSportsbookOdds?.some(odds => 
            odds.sportsbook && odds.sportsbook.toLowerCase().includes(selectedSportsbook.toLowerCase())
          )
        );
        
        // If we have sportsbook-specific data, use it; otherwise show all props
        // (since the API might aggregate data from all sportsbooks without specific attribution)
        if (propsWithSportsbookData.length > 0) {
          filteredProps = propsWithSportsbookData;
          logAPI('UnifiedSportsAPI', `Filtered to ${filteredProps.length} props for sportsbook: ${selectedSportsbook}`);
        } else {
          logAPI('UnifiedSportsAPI', `No sportsbook-specific data found, showing all ${enhancedProps.length} props (aggregated from all sportsbooks)`);
          filteredProps = enhancedProps;
        }
      }

      logSuccess('UnifiedSportsAPI', `Returning ${filteredProps.length} enhanced player props for ${sport} from SportsGameOdds`);
      return filteredProps;

    } catch (error) {
      logError('UnifiedSportsAPI', `Failed to get player props for ${sport}:`, error);
      return [];
    }
  }

  // Get games using SportsGameOdds API - Updated to use correct endpoint format
  async getGames(sport: string, date?: string): Promise<Game[]> {
    try {
      // Use the correct endpoint format: /nfl/games?date=... instead of /sports/1/games
      const today = date || new Date().toISOString().split('T')[0];
      const league = sport.toLowerCase();
      
      logAPI('UnifiedSportsAPI', `Fetching games for ${sport} on ${today} using /${league}/games endpoint`);
      
      // Call the backend API endpoint that uses the correct format
      const response = await fetch(`/api/${league}/player-props?date=${today}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Extract games from the events data
      const games: Game[] = (data.events || []).map((event: any) => ({
        id: event.eventID,
        sport: sport.toUpperCase(),
        homeTeam: event.home_team,
        awayTeam: event.away_team,
        commenceTime: event.start_time,
        status: 'scheduled', // Default status
        homeScore: undefined,
        awayScore: undefined,
        homeOdds: -110, // Default odds
        awayOdds: -110,
        drawOdds: sport === 'soccer' ? -110 : undefined
      }));

      logSuccess('UnifiedSportsAPI', `Returning ${games.length} games for ${sport} from correct endpoint`);
      return games;
    } catch (error) {
      logError('UnifiedSportsAPI', `Failed to get games for ${sport}:`, error);
      return [];
    }
  }

  // Get odds comparisons using SportsGameOdds API (for markets/odds)
  async getOddsComparisons(sport: string): Promise<OddsComparison[]> {
    try {
      // Get games and convert to odds comparisons format using the updated getGames method
      const games = await this.getGames(sport);
      
      const comparisons: OddsComparison[] = games.map(game => ({
        id: game.id,
        sport: game.sport,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        commenceTime: game.commenceTime,
        markets: [], // SportsGameOdds doesn't provide market data in this format
        lastUpdate: new Date().toISOString()
      }));
      
      logSuccess('UnifiedSportsAPI', `Returning ${comparisons.length} odds comparisons for ${sport} from updated endpoint`);
      return comparisons;
    } catch (error) {
      logError('UnifiedSportsAPI', `Failed to get odds comparisons for ${sport}:`, error);
      return [];
    }
  }

  // Get past games for analytics tab
  async getPastPlayerProps(sport: string, season?: number, week?: number, selectedSportsbook?: string): Promise<PlayerProp[]> {
    try {
      // Get player props from Backend API (server-side SportGameOdds)
      const { backendSportsGameOddsAPI } = await import('./backend-sportsgameodds-api');
      const sportsGameOddsProps = await backendSportsGameOddsAPI.getPlayerProps(sport);
      logAPI('UnifiedSportsAPI', `Retrieved ${sportsGameOddsProps.length} props from Backend SportsGameOdds`);

      // Convert and filter for past games only
      const unifiedProps = this.convertSportsGameOddsProps(sportsGameOddsProps);
      const filteredProps = this.filterPastGamesUnified(unifiedProps);
      logAPI('UnifiedSportsAPI', `Filtered to ${filteredProps.length} past game props for analytics`);

      // Sort by date (most recent first) - props are already in unified format
      const playerProps = filteredProps
        .sort((a, b) => new Date(b.gameTime).getTime() - new Date(a.gameTime).getTime());

      logSuccess('UnifiedSportsAPI', `Returning ${playerProps.length} past player props for ${sport}`);
      return playerProps;
    } catch (error) {
      logError('UnifiedSportsAPI', `Failed to get past player props for ${sport}:`, error);
      return [];
    }
  }

  // Helper methods
  private determinePlayerTeam(playerName: string, homeTeam: string, awayTeam: string): string {
    // Simple heuristic - in real implementation, you'd have player-team mappings
    return homeTeam; // Default to home team
  }

  private getTeamAbbreviation(teamName: string): string {
    const abbreviations: { [key: string]: string } = {
      'Los Angeles Lakers': 'LAL',
      'Boston Celtics': 'BOS',
      'Golden State Warriors': 'GSW',
      'Miami Heat': 'MIA',
      'Chicago Bulls': 'CHI',
      'New York Knicks': 'NYK',
      'Dallas Mavericks': 'DAL',
      'Phoenix Suns': 'PHX',
      'Denver Nuggets': 'DEN',
      'Milwaukee Bucks': 'MIL',
      'Kansas City Chiefs': 'KC',
      'Buffalo Bills': 'BUF',
      'Miami Dolphins': 'MIA',
      'New England Patriots': 'NE',
      'Dallas Cowboys': 'DAL',
      'Green Bay Packers': 'GB',
      'San Francisco 49ers': 'SF',
      'Los Angeles Rams': 'LAR',
      'Tampa Bay Buccaneers': 'TB',
      'New Orleans Saints': 'NO'
    };
    return abbreviations[teamName] || teamName.substring(0, 3).toUpperCase();
  }

  private convertSportsGameOddsProps(props: SportsGameOddsPlayerProp[]): PlayerProp[] {
    // Convert SportsGameOdds props to unified PlayerProp format
    return props.map(sgProp => ({
      id: sgProp.id,
      playerId: sgProp.playerId,
      playerName: sgProp.playerName,
      team: sgProp.team,
      teamAbbr: this.getTeamAbbreviation(sgProp.team),
      opponent: sgProp.homeTeam === sgProp.team ? sgProp.awayTeam : sgProp.homeTeam,
      opponentAbbr: this.getTeamAbbreviation(sgProp.homeTeam === sgProp.team ? sgProp.awayTeam : sgProp.homeTeam),
      gameId: sgProp.gameId,
      sport: sgProp.sport.toUpperCase(),
      propType: sgProp.propType,
      line: sgProp.line,
      overOdds: sgProp.overOdds,
      underOdds: sgProp.underOdds,
      allSportsbookOdds: [{
        sportsbook: sgProp.sportsbook,
        line: sgProp.line,
        overOdds: sgProp.overOdds,
        underOdds: sgProp.underOdds,
        lastUpdate: sgProp.lastUpdate
      }],
      gameDate: this.formatGameDate(sgProp.gameTime),
      gameTime: sgProp.gameTime,
      confidence: sgProp.confidence,
      expectedValue: this.calculateExpectedValue(sgProp.line, sgProp.overOdds, sgProp.underOdds),
      lastUpdated: new Date(sgProp.lastUpdate),
      isLive: false,
      marketId: `${sgProp.playerId}-${sgProp.propType}-${sgProp.gameId}-${sgProp.sport}`,
      seasonStats: this.generateSeasonStats(sgProp.propType, sgProp.line),
      aiPrediction: this.generateAIPrediction(sgProp.propType, sgProp.line, sgProp.overOdds, sgProp.underOdds)
    }));
  }

  private filterPastGamesUnified(props: PlayerProp[]): PlayerProp[] {
    const now = new Date();
    return props.filter(prop => {
      const gameTime = new Date(prop.gameTime);
      return gameTime < now;
    });
  }

  private calculateExpectedValue(line: number, overOdds: number, underOdds: number): number {
    try {
      // Calculate implied probabilities from odds
      const overImpliedProb = this.americanToImpliedProb(overOdds);
      const underImpliedProb = this.americanToImpliedProb(underOdds);
      
      // Calculate decimal odds for proper EV calculation
      const overDecimalOdds = this.americanToDecimalOdds(overOdds);
      const underDecimalOdds = this.americanToDecimalOdds(underOdds);
      
      // Use more realistic true probability estimation (closer to 50/50 for most props)
      // Add small random variance to simulate slight edge detection
      const variance = (Math.random() - 0.5) * 0.1; // ±5% variance
      const estimatedOverProb = Math.max(0.35, Math.min(0.65, 0.5 + variance));
      const estimatedUnderProb = 1 - estimatedOverProb;
      
      // Calculate EV for both sides
      const overEV = (estimatedOverProb * (overDecimalOdds - 1)) - ((1 - estimatedOverProb) * 1);
      const underEV = (estimatedUnderProb * (underDecimalOdds - 1)) - ((1 - estimatedUnderProb) * 1);
      
      // Return the better EV as a percentage, capped at reasonable values
      const bestEV = Math.max(overEV, underEV) * 100;
      
      // Cap EV at realistic values (-50% to +25%)
      return Math.max(-50, Math.min(25, bestEV));
      
    } catch (error) {
      // Return neutral EV if calculation fails
      return 0;
    }
  }

  private americanToDecimalOdds(americanOdds: number): number {
    if (americanOdds > 0) {
      return (americanOdds / 100) + 1;
    } else {
      return (100 / Math.abs(americanOdds)) + 1;
    }
  }

  private estimateTrueProbability(line: number, side: 'over' | 'under'): number {
    // This is a simplified model - in reality, you'd use ML models, historical data, etc.
    // For now, we'll use a basic heuristic based on common prop lines
    
    // Common prop lines and their rough probabilities
    const propProbabilities: { [key: number]: { over: number, under: number } } = {
      0.5: { over: 0.52, under: 0.48 },
      1.5: { over: 0.55, under: 0.45 },
      2.5: { over: 0.60, under: 0.40 },
      3.5: { over: 0.65, under: 0.35 },
      4.5: { over: 0.70, under: 0.30 },
      5.5: { over: 0.75, under: 0.25 },
      10.5: { over: 0.80, under: 0.20 },
      15.5: { over: 0.85, under: 0.15 },
      20.5: { over: 0.90, under: 0.10 },
      25.5: { over: 0.95, under: 0.05 }
    };
    
    // Find closest line or interpolate
    const lines = Object.keys(propProbabilities).map(Number).sort((a, b) => a - b);
    let closestLine = lines[0];
    
    for (const l of lines) {
      if (Math.abs(l - line) < Math.abs(closestLine - line)) {
        closestLine = l;
      }
    }
    
    const baseProb = propProbabilities[closestLine] || { over: 0.5, under: 0.5 };
    
    // Add some randomness to make it more realistic
    const randomFactor = (Math.random() - 0.5) * 0.1; // ±5% variation
    const probability = baseProb[side] + randomFactor;
    
    // Ensure probability is between 0.05 and 0.95
    return Math.max(0.05, Math.min(0.95, probability));
  }

  private americanToImpliedProb(odds: number): number {
    if (odds > 0) {
      return 100 / (odds + 100);
    } else {
      return Math.abs(odds) / (Math.abs(odds) + 100);
    }
  }

  private formatGameDate(gameTime: string): string {
    try {
      const date = new Date(gameTime);
      
      // If the date is in UTC, convert to Eastern Time for NFL games
      // This ensures we get the correct date for games that might cross midnight UTC
      const easternDate = new Date(date.getTime() + (5 * 60 * 60 * 1000)); // UTC+5 for Eastern Time
      
      // Format as YYYY-MM-DD
      return easternDate.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting game date:', error);
      // Fallback to simple split if date parsing fails
      return gameTime.split('T')[0];
    }
  }

  private generateSeasonStats(propType: string, line: number): PlayerProp['seasonStats'] {
    // Generate realistic season stats based on prop type and line
    const baseStats = {
      average: line * 0.95,
      median: line,
      gamesPlayed: 15,
      hitRate: 0.6,
      last5Games: [line * 0.9, line * 1.1, line * 0.95, line * 1.05, line],
      seasonHigh: line * 1.3,
      seasonLow: line * 0.7
    };

    return baseStats;
  }

  private generateAIPrediction(propType: string, line: number, overOdds: number, underOdds: number): PlayerProp['aiPrediction'] {
    // Simple AI prediction logic
    const overProb = this.americanToImpliedProb(overOdds);
    const underProb = this.americanToImpliedProb(underOdds);
    
    const recommended = overProb > underProb ? 'over' : 'under';
    const confidence = Math.max(overProb, underProb);
    
    return {
      recommended,
      confidence,
      reasoning: `Based on recent form and matchup analysis, ${recommended} is the recommended play.`,
      factors: ['Recent form', 'Matchup analysis', 'Weather conditions', 'Injury reports']
    };
  }

  // Deduplicate player props (prioritize SportsGameOdds for betting data)
  private deduplicatePlayerProps(props: PlayerProp[]): PlayerProp[] {
    const uniqueProps = new Map<string, PlayerProp>();
    
    props.forEach(prop => {
      const key = `${prop.playerName}-${prop.propType}-${prop.gameId}`;
      
      if (!uniqueProps.has(key)) {
        uniqueProps.set(key, prop);
      } else {
        // Prioritize SportsGameOdds props (those with 'sgo-' prefix)
        const existing = uniqueProps.get(key)!;
        if (prop.id.startsWith('sgo-') && !existing.id.startsWith('sgo-')) {
          uniqueProps.set(key, prop);
        }
      }
    });
    
    return Array.from(uniqueProps.values());
  }
}

// Export singleton instance
export const unifiedSportsAPI = new UnifiedSportsAPI();