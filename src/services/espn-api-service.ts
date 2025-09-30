// ESPN API Service for real-time sports data
// Provides game schedules, odds, props, and predictions

export interface ESPNGame {
  id: string;
  date: string;
  time: string;
  homeTeam: {
    id: string;
    name: string;
    abbreviation: string;
    record: string;
    logo: string;
  };
  awayTeam: {
    id: string;
    name: string;
    abbreviation: string;
    record: string;
    logo: string;
  };
  sport: string;
  league: string;
  season: string;
  week?: number;
  status: 'scheduled' | 'live' | 'final';
  homeScore?: number;
  awayScore?: number;
  venue: string;
  weather?: string;
  odds?: {
    homeMoneyline: number;
    awayMoneyline: number;
    spread: number;
    total: number;
  };
}

export interface ESPNProp {
  id: string;
  gameId: string;
  playerId: string;
  playerName: string;
  team: string;
  opponent: string;
  propType: string;
  propTitle: string;
  line: number;
  overOdds: number;
  underOdds: number;
  overVotes: number;
  underVotes: number;
  confidence: number;
  lastUpdated: string;
}

export interface ESPNSeasonInfo {
  sport: string;
  season: string;
  week: number;
  isInSeason: boolean;
  seasonStart: string;
  seasonEnd: string;
  playoffsStart?: string;
  playoffsEnd?: string;
}

class ESPNAPIService {
  private baseUrl = 'https://site.api.espn.com/apis/site/v2/sports';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // Format numbers to be concise
  private formatNumber(value: number, type: 'odds' | 'payout' | 'value' | 'percentage'): string {
    if (type === 'odds') {
      if (value > 0) return `+${Math.round(value)}`;
      return Math.round(value).toString();
    }
    
    if (type === 'payout') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
      return Math.round(value).toString();
    }
    
    if (type === 'value') {
      return value.toFixed(2);
    }
    
    if (type === 'percentage') {
      return `${Math.round(value)}%`;
    }
    
    return value.toString();
  }

  // Get cached data or fetch fresh
  private async getCachedData<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    
    try {
      const data = await fetchFn();
      this.cache.set(key, { data, timestamp: now });
      return data;
    } catch (error) {
      console.error(`Error fetching data for key ${key}:`, error);
      throw error;
    }
  }

  // Get current week games for a sport
  async getCurrentWeekGames(sport: string): Promise<ESPNGame[]> {
    const sportMap = {
      'nfl': 'football/nfl',
      'nba': 'basketball/nba',
      'mlb': 'baseball/mlb',
      'nhl': 'hockey/nhl',
      'ncaaf': 'football/college-football',
      'ncaab': 'basketball/mens-college-basketball'
    };

    const espnSport = sportMap[sport.toLowerCase() as keyof typeof sportMap];
    if (!espnSport) {
      throw new Error(`Unsupported sport: ${sport}`);
    }

    return this.getCachedData(`games_${sport}`, async () => {
      const response = await fetch(`${this.baseUrl}/${espnSport}/scoreboard`);
      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.parseGames(data.events || []);
    });
  }

  // Get season information
  async getSeasonInfo(sport: string): Promise<ESPNSeasonInfo> {
    const sportMap = {
      'nfl': 'football/nfl',
      'nba': 'basketball/nba',
      'mlb': 'baseball/mlb',
      'nhl': 'hockey/nhl'
    };

    const espnSport = sportMap[sport.toLowerCase() as keyof typeof sportMap];
    if (!espnSport) {
      throw new Error(`Unsupported sport: ${sport}`);
    }

    return this.getCachedData(`season_${sport}`, async () => {
      const response = await fetch(`${this.baseUrl}/${espnSport}/scoreboard`);
      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.parseSeasonInfo(data, sport);
    });
  }

  // Get props for a specific game
  async getGameProps(gameId: string): Promise<ESPNProp[]> {
    return this.getCachedData(`props_${gameId}`, async () => {
      // ESPN doesn't have a direct props API, so we'll simulate with realistic data
      // In a real implementation, this would connect to a props provider
      return this.generateMockProps(gameId);
    });
  }

  // Get all props for current week
  async getCurrentWeekProps(sport: string): Promise<ESPNProp[]> {
    const games = await this.getCurrentWeekGames(sport);
    const allProps: ESPNProp[] = [];
    
    for (const game of games) {
      const gameProps = await this.getGameProps(game.id);
      allProps.push(...gameProps);
    }
    
    return allProps;
  }

  // Parse games from ESPN API response
  private parseGames(events: any[]): ESPNGame[] {
    return events.map(event => {
      const competition = event.competitions[0];
      const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home');
      const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away');
      
      return {
        id: event.id,
        date: event.date,
        time: new Date(event.date).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }),
        homeTeam: {
          id: homeTeam.id,
          name: homeTeam.team.displayName,
          abbreviation: homeTeam.team.abbreviation,
          record: homeTeam.records?.[0]?.summary || '0-0',
          logo: homeTeam.team.logo
        },
        awayTeam: {
          id: awayTeam.id,
          name: awayTeam.team.displayName,
          abbreviation: awayTeam.team.abbreviation,
          record: awayTeam.records?.[0]?.summary || '0-0',
          logo: awayTeam.team.logo
        },
        sport: this.getSportFromEvent(event),
        league: this.getLeagueFromEvent(event),
        season: this.getSeasonFromEvent(event),
        week: this.getWeekFromEvent(event),
        status: this.getGameStatus(event),
        homeScore: homeTeam.score,
        awayScore: awayTeam.score,
        venue: competition.venue?.fullName || 'TBD',
        weather: competition.weather?.displayValue,
        odds: this.parseOdds(competition.odds)
      };
    });
  }

  // Parse season info from ESPN API response
  private parseSeasonInfo(data: any, sport: string): ESPNSeasonInfo {
    const season = data.season || {};
    const now = new Date();
    const seasonStart = new Date(season.startDate || now);
    const seasonEnd = new Date(season.endDate || now);
    
    return {
      sport: sport.toUpperCase(),
      season: season.year?.toString() || new Date().getFullYear().toString(),
      week: this.getCurrentWeek(data),
      isInSeason: now >= seasonStart && now <= seasonEnd,
      seasonStart: seasonStart.toISOString(),
      seasonEnd: seasonEnd.toISOString(),
      playoffsStart: season.playoffsStartDate ? new Date(season.playoffsStartDate).toISOString() : undefined,
      playoffsEnd: season.playoffsEndDate ? new Date(season.playoffsEndDate).toISOString() : undefined
    };
  }

  // Generate mock props (in real implementation, this would come from a props provider)
  private generateMockProps(gameId: string): ESPNProp[] {
    const propTypes = {
      'nfl': ['Passing Yards', 'Rushing Yards', 'Receiving Yards', 'Passing TDs', 'Rushing TDs', 'Receptions'],
      'nba': ['Points', 'Rebounds', 'Assists', 'Steals', 'Blocks', '3-Pointers Made'],
      'mlb': ['Hits', 'Home Runs', 'RBIs', 'Strikeouts', 'Earned Runs', 'Innings Pitched']
    };

    const sport = this.getSportFromGameId(gameId);
    const availableProps = propTypes[sport as keyof typeof propTypes] || propTypes.nfl;
    
    return availableProps.slice(0, 3).map((propType, index) => {
      const overOdds = Math.random() * 200 - 100; // -100 to +100
      const underOdds = -overOdds;
      const overVotes = Math.floor(Math.random() * 100) + 10;
      const underVotes = Math.floor(Math.random() * 100) + 10;
      
      return {
        id: `prop_${gameId}_${index}`,
        gameId,
        playerId: `player_${Math.floor(Math.random() * 1000)}`,
        playerName: this.generatePlayerName(sport),
        team: this.generateTeamName(sport),
        opponent: this.generateTeamName(sport),
        propType,
        propTitle: propType,
        line: this.generateLine(propType),
        overOdds: Math.round(overOdds),
        underOdds: Math.round(underOdds),
        overVotes,
        underVotes,
        confidence: Math.max(0.6, Math.min(0.95, Math.random())),
        lastUpdated: new Date().toISOString()
      };
    });
  }

  // Helper methods
  private getSportFromEvent(event: any): string {
    const league = event.league?.slug || '';
    if (league.includes('nfl')) return 'NFL';
    if (league.includes('nba')) return 'NBA';
    if (league.includes('mlb')) return 'MLB';
    if (league.includes('nhl')) return 'NHL';
    return 'NFL';
  }

  private getLeagueFromEvent(event: any): string {
    return event.league?.name || 'NFL';
  }

  private getSeasonFromEvent(event: any): string {
    return event.season?.year?.toString() || new Date().getFullYear().toString();
  }

  private getWeekFromEvent(event: any): number {
    return event.week?.number || 1;
  }

  private getCurrentWeek(data: any): number {
    return data.week?.number || 1;
  }

  private getGameStatus(event: any): 'scheduled' | 'live' | 'final' {
    const status = event.status?.type?.name;
    if (status === 'STATUS_FINAL') return 'final';
    if (status === 'STATUS_IN_PROGRESS') return 'live';
    return 'scheduled';
  }

  private parseOdds(odds: any[]): { homeMoneyline: number; awayMoneyline: number; spread: number; total: number } | undefined {
    if (!odds || odds.length === 0) return undefined;
    
    const odd = odds[0];
    return {
      homeMoneyline: odd.homeTeamOdds?.moneyLine || 0,
      awayMoneyline: odd.awayTeamOdds?.moneyLine || 0,
      spread: odd.spread || 0,
      total: odd.overUnder || 0
    };
  }

  private getSportFromGameId(gameId: string): string {
    // This would be determined by the game ID in a real implementation
    return 'NFL';
  }

  private generatePlayerName(sport: string): string {
    const names = {
      'NFL': ['Patrick Mahomes', 'Josh Allen', 'Travis Kelce', 'Davante Adams', 'Derrick Henry'],
      'NBA': ['LeBron James', 'Stephen Curry', 'Kevin Durant', 'Giannis Antetokounmpo', 'Luka Doncic'],
      'MLB': ['Aaron Judge', 'Mike Trout', 'Mookie Betts', 'Ronald Acuña Jr.', 'Vladimir Guerrero Jr.']
    };
    
    const sportNames = names[sport as keyof typeof names] || names.NFL;
    return sportNames[Math.floor(Math.random() * sportNames.length)];
  }

  private generateTeamName(sport: string): string {
    const teams = {
      'NFL': ['Chiefs', 'Bills', 'Packers', 'Cowboys', '49ers'],
      'NBA': ['Lakers', 'Warriors', 'Celtics', 'Heat', 'Nuggets'],
      'MLB': ['Yankees', 'Red Sox', 'Dodgers', 'Astros', 'Braves']
    };
    
    const sportTeams = teams[sport as keyof typeof teams] || teams.NFL;
    return sportTeams[Math.floor(Math.random() * sportTeams.length)];
  }

  private generateLine(propType: string): number {
    const lines: { [key: string]: number[] } = {
      'Passing Yards': [250.5, 275.5, 300.5],
      'Rushing Yards': [50.5, 75.5, 100.5],
      'Receiving Yards': [60.5, 80.5, 100.5],
      'Passing TDs': [1.5, 2.5, 3.5],
      'Rushing TDs': [0.5, 1.5, 2.5],
      'Receptions': [4.5, 6.5, 8.5],
      'Points': [25.5, 30.5, 35.5],
      'Rebounds': [8.5, 10.5, 12.5],
      'Assists': [6.5, 8.5, 10.5],
      'Steals': [1.5, 2.5, 3.5],
      'Blocks': [1.5, 2.5, 3.5],
      '3-Pointers Made': [2.5, 3.5, 4.5],
      'Hits': [1.5, 2.5, 3.5],
      'Home Runs': [0.5, 1.5, 2.5],
      'RBIs': [1.5, 2.5, 3.5],
      'Strikeouts': [6.5, 8.5, 10.5],
      'Earned Runs': [2.5, 3.5, 4.5],
      'Innings Pitched': [5.5, 6.5, 7.5]
    };
    
    const propLines = lines[propType] || [1.5, 2.5, 3.5];
    return propLines[Math.floor(Math.random() * propLines.length)];
  }

  // Format numbers for display
  formatOdds(odds: number): string {
    return this.formatNumber(odds, 'odds');
  }

  formatPayout(payout: number): string {
    return this.formatNumber(payout, 'payout');
  }

  formatValue(value: number): string {
    return this.formatNumber(value, 'value');
  }

  formatPercentage(percentage: number): string {
    return this.formatNumber(percentage * 100, 'percentage');
  }

  // Check if sport is in season
  async isSportInSeason(sport: string): Promise<boolean> {
    try {
      const seasonInfo = await this.getSeasonInfo(sport);
      return seasonInfo.isInSeason;
    } catch (error) {
      console.error(`Error checking if ${sport} is in season:`, error);
      return false;
    }
  }

  // Check if should show moneyline predictions
  async shouldShowMoneylinePredictions(sport: string): Promise<boolean> {
    try {
      const seasonInfo = await this.getSeasonInfo(sport);
      return seasonInfo.isInSeason;
    } catch (error) {
      console.error(`Error checking moneyline predictions for ${sport}:`, error);
      return false;
    }
  }

  // Get offseason message
  async getOffseasonMessage(sport: string): Promise<string> {
    try {
      const seasonInfo = await this.getSeasonInfo(sport);
      if (seasonInfo.isInSeason) {
        return `${sport.toUpperCase()} season is currently active`;
      } else {
        const nextSeason = new Date(seasonInfo.seasonStart);
        return `${sport.toUpperCase()} season will begin ${nextSeason.toLocaleDateString()}`;
      }
    } catch (error) {
      console.error(`Error getting offseason message for ${sport}:`, error);
      return `${sport.toUpperCase()} season information not available`;
    }
  }

  // Get current season sports
  async getCurrentSeasonSports(): Promise<string[]> {
    const sports = ['nfl', 'nba', 'mlb', 'nhl'];
    const inSeasonSports: string[] = [];
    
    for (const sport of sports) {
      try {
        const isInSeason = await this.isSportInSeason(sport);
        if (isInSeason) {
          inSeasonSports.push(sport);
        }
      } catch (error) {
        console.warn(`Error checking ${sport} season status:`, error);
      }
    }
    
    return inSeasonSports;
  }

  // Get offseason sports
  async getOffseasonSports(): Promise<string[]> {
    const sports = ['nfl', 'nba', 'mlb', 'nhl'];
    const offseasonSports: string[] = [];
    
    for (const sport of sports) {
      try {
        const isInSeason = await this.isSportInSeason(sport);
        if (!isInSeason) {
          offseasonSports.push(sport);
        }
      } catch (error) {
        console.warn(`Error checking ${sport} season status:`, error);
      }
    }
    
    return offseasonSports;
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache status
  getCacheStatus(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const espnAPIService = new ESPNAPIService();