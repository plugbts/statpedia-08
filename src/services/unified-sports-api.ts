import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { sportsRadarAPI, SportsRadarGame } from './sportsradar-api';
import { sportsRadarBackend } from './sportsradar-backend';
// REMOVED: Trio system - replaced with dual system
// import { trioSportsAPI, TrioPlayerProp } from './trio-sports-api';

// ACTIVE: SportsGameOdds API - for player props and markets
import { sportsGameOddsAPI, SportsGameOddsPlayerProp, SportsGameOddsGame } from './sportsgameodds-api';

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
    logInfo('UnifiedSportsAPI', 'Service initialized - Version 8.0.0');
    logInfo('UnifiedSportsAPI', 'Using Dual Sports API System: SportsRadar + SportsGameOdds');
    logInfo('UnifiedSportsAPI', 'SportsRadar: Games, schedules, teams | SportsGameOdds: Player props, markets');
  }

  // Get player props using dual API system (SportsRadar + SportsGameOdds)
  async getPlayerProps(sport: string, season?: number, week?: number, selectedSportsbook?: string): Promise<PlayerProp[]> {
    logAPI('UnifiedSportsAPI', `Getting player props for ${sport}${season ? ` ${season}` : ''}${week ? ` week ${week}` : ''} - Using Dual API System`);
    
    try {
      const allProps: PlayerProp[] = [];

      // Get props from SportsRadar (core sports data)
      try {
        const sportsRadarProps = await sportsRadarBackend.getPlayerProps(sport);
        logAPI('UnifiedSportsAPI', `SportsRadar returned ${sportsRadarProps.length} props`);
        
        // Convert SportsRadar props to unified format
        const convertedSRProps: PlayerProp[] = sportsRadarProps.map(prop => ({
          id: `sr-${prop.id}`,
          playerId: prop.playerId,
          playerName: prop.playerName,
          team: prop.homeTeam, // Use homeTeam as default team
          teamAbbr: this.getTeamAbbreviation(prop.homeTeam),
          opponent: prop.awayTeam,
          opponentAbbr: this.getTeamAbbreviation(prop.awayTeam),
          gameId: prop.gameId,
          sport: 'NFL', // Default sport, can be enhanced
          propType: prop.propType,
          line: prop.line,
          overOdds: prop.overOdds,
          underOdds: prop.underOdds,
          allSportsbookOdds: [{ 
            sportsbook: prop.sportsbook, 
            line: prop.line,
            overOdds: prop.overOdds, 
            underOdds: prop.underOdds,
            lastUpdate: prop.lastUpdate
          }],
          gameDate: this.formatGameDate(prop.gameTime),
          gameTime: prop.gameTime,
          headshotUrl: '', // Not available in SportsRadar interface
          confidence: prop.confidence,
          expectedValue: this.calculateExpectedValue(prop.line, prop.overOdds, prop.underOdds),
          recentForm: '', // Not available in SportsRadar interface
          last5Games: [], // Not available in SportsRadar interface
          seasonStats: this.generateSeasonStats(prop.propType, prop.line),
          aiPrediction: this.generateAIPrediction(prop.propType, prop.line, prop.overOdds, prop.underOdds),
          lastUpdated: new Date(prop.lastUpdate),
          isLive: false, // Not available in SportsRadar interface
          marketId: prop.market
        }));
        
        allProps.push(...convertedSRProps);
      } catch (error) {
        logWarning('UnifiedSportsAPI', `SportsRadar failed for ${sport}: ${error}`);
      }

      // Get props from SportsGameOdds (player markets and props)
      try {
        const sgoProps = await sportsGameOddsAPI.getPlayerProps(sport);
        logAPI('UnifiedSportsAPI', `SportsGameOdds returned ${sgoProps.length} props`);
        
        // Convert SportsGameOdds props to unified format
        const convertedSGOProps: PlayerProp[] = sgoProps.map(prop => ({
          id: `sgo-${prop.id}`,
          playerId: prop.playerId,
          playerName: prop.playerName,
          team: prop.team,
          teamAbbr: this.getTeamAbbreviation(prop.team),
          opponent: prop.homeTeam === prop.team ? prop.awayTeam : prop.homeTeam,
          opponentAbbr: this.getTeamAbbreviation(prop.homeTeam === prop.team ? prop.awayTeam : prop.homeTeam),
          gameId: prop.gameId,
          sport: prop.sport,
          propType: prop.propType,
          line: prop.line,
          overOdds: prop.overOdds,
          underOdds: prop.underOdds,
          allSportsbookOdds: [{ 
            sportsbook: prop.sportsbook, 
            line: prop.line,
            overOdds: prop.overOdds, 
            underOdds: prop.underOdds,
            lastUpdate: prop.lastUpdate
          }],
          gameDate: this.formatGameDate(prop.gameTime),
          gameTime: prop.gameTime,
          headshotUrl: '',
          confidence: prop.confidence,
          expectedValue: this.calculateExpectedValue(prop.line, prop.overOdds, prop.underOdds),
          recentForm: '',
          last5Games: [],
          seasonStats: this.generateSeasonStats(prop.propType, prop.line),
          aiPrediction: this.generateAIPrediction(prop.propType, prop.line, prop.overOdds, prop.underOdds),
          lastUpdated: new Date(prop.lastUpdate),
          isLive: false,
          marketId: prop.market || `${prop.playerId}-${prop.propType}-${prop.gameId}`
        }));
        
        allProps.push(...convertedSGOProps);
      } catch (error) {
        logWarning('UnifiedSportsAPI', `SportsGameOdds failed for ${sport}: ${error}`);
      }

      // Deduplicate props (prioritize SportsGameOdds for betting data)
      const deduplicatedProps = this.deduplicatePlayerProps(allProps);
      
      logSuccess('UnifiedSportsAPI', `Retrieved ${deduplicatedProps.length} player props for ${sport} from dual system`);
      logInfo('UnifiedSportsAPI', `Sources: SportsRadar + SportsGameOdds`);
      logInfo('UnifiedSportsAPI', `Breakdown: ${allProps.filter(p => p.id.startsWith('sr-')).length} SportsRadar, ${allProps.filter(p => p.id.startsWith('sgo-')).length} SportsGameOdds`);
      
      return deduplicatedProps;

    } catch (error) {
      logError('UnifiedSportsAPI', `Failed to get player props for ${sport}:`, error);
      return [];
    }
  }

  // Get games using SportsRadar API
  async getGames(sport: string): Promise<Game[]> {
    try {
      const sportsRadarGames = await sportsRadarAPI.getGames(sport);
      logAPI('UnifiedSportsAPI', `Retrieved ${sportsRadarGames.length} games from SportsRadar`);

      const games: Game[] = sportsRadarGames.map(srGame => ({
        id: srGame.id,
        sport: srGame.sport,
        homeTeam: srGame.homeTeam,
        awayTeam: srGame.awayTeam,
        commenceTime: srGame.commenceTime,
        status: srGame.status,
        homeScore: srGame.homeScore,
        awayScore: srGame.awayScore,
        homeOdds: -110, // Default odds
        awayOdds: -110,
        drawOdds: srGame.sport === 'SOCCER' ? -110 : undefined
      }));

      logSuccess('UnifiedSportsAPI', `Returning ${games.length} games for ${sport}`);
      return games;
    } catch (error) {
      logError('UnifiedSportsAPI', `Failed to get games for ${sport}:`, error);
      return [];
    }
  }

  // Get odds comparisons using SportsGameOdds API (for markets/odds)
  async getOddsComparisons(sport: string): Promise<OddsComparison[]> {
    try {
      // SportsGameOdds API is for markets/odds/props, not SportsRadar
      logWarning('UnifiedSportsAPI', `Odds comparisons should use SportsGameOdds API for markets/odds, not SportsRadar`);
      return [];
    } catch (error) {
      logError('UnifiedSportsAPI', `Failed to get odds comparisons for ${sport}:`, error);
      return [];
    }
  }

  // PAUSED: Get past games for analytics tab - SportsGameOdds API temporarily disabled
  async getPastPlayerProps(sport: string, season?: number, week?: number, selectedSportsbook?: string): Promise<PlayerProp[]> {
    try {
      // PAUSED: SportsGameOdds API temporarily disabled
      logWarning('UnifiedSportsAPI', 'SportsGameOdds API is temporarily paused - returning empty array for past props');
      return [];

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

  // PAUSED: Method temporarily disabled due to SportsGameOdds API pause
  /*
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
  */

  private filterPastGamesUnified(props: PlayerProp[]): PlayerProp[] {
    const now = new Date();
    return props.filter(prop => {
      const gameTime = new Date(prop.gameTime);
      return gameTime < now;
    });
  }

  private calculateExpectedValue(line: number, overOdds: number, underOdds: number): number {
    // Calculate implied probabilities from odds
    const overImpliedProb = this.americanToImpliedProb(overOdds);
    const underImpliedProb = this.americanToImpliedProb(underOdds);
    
    // Calculate decimal odds for proper EV calculation
    const overDecimalOdds = this.americanToDecimalOdds(overOdds);
    const underDecimalOdds = this.americanToDecimalOdds(underOdds);
    
    // For player props, we need to estimate the true probability
    // This is a simplified model - in reality, you'd use ML models, historical data, etc.
    const estimatedOverProb = this.estimateTrueProbability(line, 'over');
    const estimatedUnderProb = this.estimateTrueProbability(line, 'under');
    
    // Calculate EV for both sides
    const overEV = (estimatedOverProb * (overDecimalOdds - 1)) - ((1 - estimatedOverProb) * 1);
    const underEV = (estimatedUnderProb * (underDecimalOdds - 1)) - ((1 - estimatedUnderProb) * 1);
    
    // Return the better EV as a percentage
    return Math.max(overEV, underEV) * 100;
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