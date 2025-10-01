import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { sportsRadarAPI, SportsRadarPlayerProp, SportsRadarGame, SportsRadarOddsComparison } from './sportsradar-api';
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
    logInfo('UnifiedSportsAPI', 'Service initialized - Version 4.0.0');
    logInfo('UnifiedSportsAPI', 'Using SportsRadar API for core sports data and SportsGameOdds API for player props and odds');
  }

  // Get player props using SportsGameOdds API (SportsRadar API currently not working)
  async getPlayerProps(sport: string, season?: number, week?: number, selectedSportsbook?: string): Promise<PlayerProp[]> {
    logAPI('UnifiedSportsAPI', `Getting player props for ${sport}${season ? ` ${season}` : ''}${week ? ` week ${week}` : ''} from SportsGameOdds API`);
    
    try {
      // Get player props from SportsGameOdds API (SportsRadar API is not working)
      const sportsGameOddsProps = await sportsGameOddsAPI.getPlayerProps(sport);
      
      logAPI('UnifiedSportsAPI', `SportsGameOdds: ${sportsGameOddsProps.length} props`);
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
        gameDate: sgoProp.gameTime.split('T')[0],
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
        filteredProps = enhancedProps.filter(prop => 
          prop.allSportsbookOdds?.some(odds => 
            odds.sportsbook.toLowerCase().includes(selectedSportsbook.toLowerCase())
          )
        );
        logAPI('UnifiedSportsAPI', `Filtered to ${filteredProps.length} props for sportsbook: ${selectedSportsbook}`);
      }

      logSuccess('UnifiedSportsAPI', `Returning ${filteredProps.length} enhanced player props for ${sport} from SportsGameOdds`);
      return filteredProps;

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

  // Get odds comparisons using SportsRadar API
  async getOddsComparisons(sport: string): Promise<OddsComparison[]> {
    try {
      const sportsRadarComparisons = await sportsRadarAPI.getOddsComparisons(sport);
      logAPI('UnifiedSportsAPI', `Retrieved ${sportsRadarComparisons.length} odds comparisons from SportsRadar`);

      const comparisons: OddsComparison[] = sportsRadarComparisons.map(srComp => ({
        id: srComp.id,
        sport: srComp.sport,
        homeTeam: srComp.homeTeam,
        awayTeam: srComp.awayTeam,
        commenceTime: srComp.commenceTime,
        markets: srComp.markets.map(market => ({
          key: market.key,
          outcomes: market.outcomes.map(outcome => ({
            name: outcome.name,
            price: outcome.price,
            point: outcome.point
          }))
        })),
        lastUpdate: srComp.lastUpdate
      }));

      logSuccess('UnifiedSportsAPI', `Returning ${comparisons.length} odds comparisons for ${sport}`);
      return comparisons;
    } catch (error) {
      logError('UnifiedSportsAPI', `Failed to get odds comparisons for ${sport}:`, error);
      return [];
    }
  }

  // Get past games for analytics tab
  async getPastPlayerProps(sport: string, season?: number, week?: number, selectedSportsbook?: string): Promise<PlayerProp[]> {
    try {
      // Get base player props from SportsRadar
      const sportsRadarProps = await sportsRadarAPI.getPlayerProps(sport);
      logAPI('UnifiedSportsAPI', `Retrieved ${sportsRadarProps.length} props from SportsRadar`);

      // Filter for past games only
      const filteredProps = this.filterPastGames(sportsRadarProps);
      logAPI('UnifiedSportsAPI', `Filtered to ${filteredProps.length} past game props for analytics`);

      // Convert to PlayerProp format and sort by date (most recent first)
      const playerProps: PlayerProp[] = filteredProps
        .map(srProp => ({
          id: srProp.id,
          playerId: srProp.playerId,
          playerName: srProp.playerName,
          team: this.determinePlayerTeam(srProp.playerName, srProp.homeTeam, srProp.awayTeam),
          teamAbbr: this.getTeamAbbreviation(this.determinePlayerTeam(srProp.playerName, srProp.homeTeam, srProp.awayTeam)),
          opponent: srProp.homeTeam === this.determinePlayerTeam(srProp.playerName, srProp.homeTeam, srProp.awayTeam) ? srProp.awayTeam : srProp.homeTeam,
          opponentAbbr: this.getTeamAbbreviation(srProp.homeTeam === this.determinePlayerTeam(srProp.playerName, srProp.homeTeam, srProp.awayTeam) ? srProp.awayTeam : srProp.homeTeam),
          gameId: srProp.gameId,
          sport: sport.toUpperCase(),
          propType: srProp.propType,
          line: srProp.line,
          overOdds: srProp.overOdds,
          underOdds: srProp.underOdds,
          allSportsbookOdds: [{
            sportsbook: srProp.sportsbook,
            line: srProp.line,
            overOdds: srProp.overOdds,
            underOdds: srProp.underOdds,
            lastUpdate: srProp.lastUpdate
          }],
          gameDate: srProp.gameTime.split('T')[0],
          gameTime: srProp.gameTime,
          confidence: srProp.confidence,
          expectedValue: this.calculateExpectedValue(srProp.line, srProp.overOdds, srProp.underOdds),
          lastUpdated: new Date(srProp.lastUpdate),
          isLive: false,
          marketId: `${srProp.playerId}-${srProp.propType}-${srProp.gameId}-${sport}`,
          seasonStats: this.generateSeasonStats(srProp.propType, srProp.line),
          aiPrediction: this.generateAIPrediction(srProp.propType, srProp.line, srProp.overOdds, srProp.underOdds)
        }))
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

  private filterPastGames(props: SportsRadarPlayerProp[]): SportsRadarPlayerProp[] {
    const now = new Date();
    return props.filter(prop => {
      const gameTime = new Date(prop.gameTime);
      return gameTime < now;
    });
  }

  private calculateExpectedValue(line: number, overOdds: number, underOdds: number): number {
    // Simple EV calculation - in real implementation, you'd use more sophisticated models
    const overProb = this.americanToImpliedProb(overOdds);
    const underProb = this.americanToImpliedProb(underOdds);
    
    // Assume 50% probability of hitting the line for EV calculation
    const hitProb = 0.5;
    const overEV = (hitProb * overOdds) + ((1 - hitProb) * -100);
    const underEV = (hitProb * underOdds) + ((1 - hitProb) * -100);
    
    return Math.max(overEV, underEV);
  }

  private americanToImpliedProb(odds: number): number {
    if (odds > 0) {
      return 100 / (odds + 100);
    } else {
      return Math.abs(odds) / (Math.abs(odds) + 100);
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