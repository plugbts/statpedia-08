// External Data Integration Service
// Integrates NFLfastR, PFF, DVOA, Next Gen Stats, and other advanced datasets

export interface NFLfastRData {
  gameId: string;
  season: number;
  week: number;
  homeTeam: string;
  awayTeam: string;
  epaPerPlay: {
    homeOffense: number;
    homeDefense: number;
    awayOffense: number;
    awayDefense: number;
  };
  successRate: {
    homeOffense: number;
    homeDefense: number;
    awayOffense: number;
    awayDefense: number;
  };
  winProbability: {
    homePreGame: number;
    awayPreGame: number;
  };
  pace: {
    homeTeam: number;
    awayTeam: number;
    leagueAverage: number;
  };
}

export interface PFFData {
  playerId: string;
  playerName: string;
  team: string;
  position: string;
  grades: {
    overall: number;
    passing: number;
    rushing: number;
    receiving: number;
    blocking: number;
    tackling: number;
    coverage: number;
  };
  advancedStats: {
    passBlockWinRate: number;
    passRushWinRate: number;
    routeSeparation: number;
    yardsAfterContact: number;
    missedTackleRate: number;
  };
  snapCounts: {
    total: number;
    offense: number;
    defense: number;
    specialTeams: number;
  };
}

export interface DVOAData {
  team: string;
  season: number;
  week: number;
  dvoa: {
    total: number;
    offense: number;
    defense: number;
    specialTeams: number;
  };
  weightedDvoa: {
    total: number;
    offense: number;
    defense: number;
    specialTeams: number;
  };
  variance: number;
  scheduleStrength: number;
}

export interface NextGenStatsData {
  playerId: string;
  playerName: string;
  team: string;
  position: string;
  metrics: {
    avgSpeed: number;
    maxSpeed: number;
    avgSeparation: number;
    avgCushion: number;
    avgTargetSeparation: number;
    avgYardsAfterCatch: number;
    avgYardsAfterContact: number;
    avgTimeToThrow: number;
    avgPasserRating: number;
    avgAirYards: number;
    avgYardsAfterCatch: number;
  };
  situationalStats: {
    redZone: any;
    thirdDown: any;
    twoMinute: any;
    garbageTime: any;
  };
}

export interface WeatherData {
  gameId: string;
  date: string;
  location: string;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  humidity: number;
  visibility: number;
  pressure: number;
  dewPoint: number;
  conditions: string;
}

export interface RefereeData {
  refereeId: string;
  name: string;
  crew: string;
  season: number;
  games: number;
  penalties: {
    total: number;
    perGame: number;
    homeTeam: number;
    awayTeam: number;
  };
  tendencies: {
    passInterference: number;
    holding: number;
    falseStart: number;
    roughingPasser: number;
    unsportsmanlike: number;
  };
  homeBias: number; // -0.5 to 0.5
}

class ExternalDataService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    console.log('🌐 External Data Service initialized');
  }

  // NFLfastR Integration
  async getNFLfastRData(season: number, week?: number): Promise<NFLfastRData[]> {
    const cacheKey = `nflfastr_${season}_${week || 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      console.log(`📊 Fetching NFLfastR data for ${season}${week ? ` week ${week}` : ''}`);
      
      // In a real implementation, this would call NFLfastR API
      // For now, we'll generate realistic mock data
      const mockData = this.generateMockNFLfastRData(season, week);
      
      this.cache.set(cacheKey, { data: mockData, timestamp: Date.now() });
      return mockData;
    } catch (error) {
      console.error('Error fetching NFLfastR data:', error);
      return [];
    }
  }

  // PFF Integration
  async getPFFData(playerId?: string, team?: string): Promise<PFFData[]> {
    const cacheKey = `pff_${playerId || 'all'}_${team || 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      console.log(`📈 Fetching PFF data${playerId ? ` for player ${playerId}` : ''}${team ? ` for team ${team}` : ''}`);
      
      // In a real implementation, this would call PFF API
      const mockData = this.generateMockPFFData(playerId, team);
      
      this.cache.set(cacheKey, { data: mockData, timestamp: Date.now() });
      return mockData;
    } catch (error) {
      console.error('Error fetching PFF data:', error);
      return [];
    }
  }

  // DVOA Integration
  async getDVOAData(season: number, week?: number): Promise<DVOAData[]> {
    const cacheKey = `dvoa_${season}_${week || 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      console.log(`📊 Fetching DVOA data for ${season}${week ? ` week ${week}` : ''}`);
      
      // In a real implementation, this would call Football Outsiders API
      const mockData = this.generateMockDVOAData(season, week);
      
      this.cache.set(cacheKey, { data: mockData, timestamp: Date.now() });
      return mockData;
    } catch (error) {
      console.error('Error fetching DVOA data:', error);
      return [];
    }
  }

  // Next Gen Stats Integration
  async getNextGenStatsData(playerId?: string, team?: string): Promise<NextGenStatsData[]> {
    const cacheKey = `nextgen_${playerId || 'all'}_${team || 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      console.log(`⚡ Fetching Next Gen Stats data${playerId ? ` for player ${playerId}` : ''}${team ? ` for team ${team}` : ''}`);
      
      // In a real implementation, this would call NFL Next Gen Stats API
      const mockData = this.generateMockNextGenStatsData(playerId, team);
      
      this.cache.set(cacheKey, { data: mockData, timestamp: Date.now() });
      return mockData;
    } catch (error) {
      console.error('Error fetching Next Gen Stats data:', error);
      return [];
    }
  }

  // Weather Data Integration
  async getWeatherData(gameId: string, date: string, location: string): Promise<WeatherData | null> {
    const cacheKey = `weather_${gameId}_${date}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      console.log(`🌤️ Fetching weather data for ${location} on ${date}`);
      
      // In a real implementation, this would call OpenWeatherMap API
      const mockData = this.generateMockWeatherData(gameId, date, location);
      
      this.cache.set(cacheKey, { data: mockData, timestamp: Date.now() });
      return mockData;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return null;
    }
  }

  // Referee Data Integration
  async getRefereeData(season: number, week?: number): Promise<RefereeData[]> {
    const cacheKey = `referee_${season}_${week || 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      console.log(`👨‍⚖️ Fetching referee data for ${season}${week ? ` week ${week}` : ''}`);
      
      // In a real implementation, this would call RefStats.com API
      const mockData = this.generateMockRefereeData(season, week);
      
      this.cache.set(cacheKey, { data: mockData, timestamp: Date.now() });
      return mockData;
    } catch (error) {
      console.error('Error fetching referee data:', error);
      return [];
    }
  }

  // Mock data generators (replace with real API calls)
  private generateMockNFLfastRData(season: number, week?: number): NFLfastRData[] {
    const teams = ['BUF', 'MIA', 'NE', 'NYJ', 'KC', 'DEN', 'LV', 'LAC'];
    const data: NFLfastRData[] = [];
    
    for (let i = 0; i < 4; i++) {
      data.push({
        gameId: `game_${season}_${week || 1}_${i}`,
        season,
        week: week || 1,
        homeTeam: teams[i * 2],
        awayTeam: teams[i * 2 + 1],
        epaPerPlay: {
          homeOffense: 0.1 + Math.random() * 0.2,
          homeDefense: -0.1 + Math.random() * 0.2,
          awayOffense: 0.1 + Math.random() * 0.2,
          awayDefense: -0.1 + Math.random() * 0.2,
        },
        successRate: {
          homeOffense: 0.4 + Math.random() * 0.2,
          homeDefense: 0.4 + Math.random() * 0.2,
          awayOffense: 0.4 + Math.random() * 0.2,
          awayDefense: 0.4 + Math.random() * 0.2,
        },
        winProbability: {
          homePreGame: 0.3 + Math.random() * 0.4,
          awayPreGame: 0.3 + Math.random() * 0.4,
        },
        pace: {
          homeTeam: 25 + Math.random() * 10,
          awayTeam: 25 + Math.random() * 10,
          leagueAverage: 30,
        },
      });
    }
    
    return data;
  }

  private generateMockPFFData(playerId?: string, team?: string): PFFData[] {
    const players = [
      { id: '1', name: 'Josh Allen', team: 'BUF', position: 'QB' },
      { id: '2', name: 'Tyreek Hill', team: 'MIA', position: 'WR' },
      { id: '3', name: 'Travis Kelce', team: 'KC', position: 'TE' },
    ];
    
    return players.map(player => ({
      playerId: player.id,
      playerName: player.name,
      team: player.team,
      position: player.position,
      grades: {
        overall: 70 + Math.random() * 30,
        passing: 70 + Math.random() * 30,
        rushing: 70 + Math.random() * 30,
        receiving: 70 + Math.random() * 30,
        blocking: 70 + Math.random() * 30,
        tackling: 70 + Math.random() * 30,
        coverage: 70 + Math.random() * 30,
      },
      advancedStats: {
        passBlockWinRate: 0.8 + Math.random() * 0.2,
        passRushWinRate: 0.1 + Math.random() * 0.2,
        routeSeparation: 2.5 + Math.random() * 1,
        yardsAfterContact: 2 + Math.random() * 2,
        missedTackleRate: 0.05 + Math.random() * 0.1,
      },
      snapCounts: {
        total: 50 + Math.random() * 20,
        offense: 40 + Math.random() * 15,
        defense: 5 + Math.random() * 10,
        specialTeams: 5 + Math.random() * 5,
      },
    }));
  }

  private generateMockDVOAData(season: number, week?: number): DVOAData[] {
    const teams = ['BUF', 'MIA', 'NE', 'NYJ', 'KC', 'DEN', 'LV', 'LAC'];
    
    return teams.map(team => ({
      team,
      season,
      week: week || 1,
      dvoa: {
        total: -20 + Math.random() * 40,
        offense: -10 + Math.random() * 20,
        defense: -20 + Math.random() * 40,
        specialTeams: -5 + Math.random() * 10,
      },
      weightedDvoa: {
        total: -20 + Math.random() * 40,
        offense: -10 + Math.random() * 20,
        defense: -20 + Math.random() * 40,
        specialTeams: -5 + Math.random() * 10,
      },
      variance: 0.1 + Math.random() * 0.2,
      scheduleStrength: -10 + Math.random() * 20,
    }));
  }

  private generateMockNextGenStatsData(playerId?: string, team?: string): NextGenStatsData[] {
    const players = [
      { id: '1', name: 'Josh Allen', team: 'BUF', position: 'QB' },
      { id: '2', name: 'Tyreek Hill', team: 'MIA', position: 'WR' },
    ];
    
    return players.map(player => ({
      playerId: player.id,
      playerName: player.name,
      team: player.team,
      position: player.position,
      metrics: {
        avgSpeed: 15 + Math.random() * 5,
        maxSpeed: 20 + Math.random() * 5,
        avgSeparation: 2 + Math.random() * 2,
        avgCushion: 5 + Math.random() * 3,
        avgTargetSeparation: 1 + Math.random() * 2,
        avgYardsAfterCatch: 3 + Math.random() * 4,
        avgYardsAfterContact: 1 + Math.random() * 2,
        avgTimeToThrow: 2.5 + Math.random() * 1,
        avgPasserRating: 80 + Math.random() * 40,
        avgAirYards: 5 + Math.random() * 10,
      },
      situationalStats: {
        redZone: {},
        thirdDown: {},
        twoMinute: {},
        garbageTime: {},
      },
    }));
  }

  private generateMockWeatherData(gameId: string, date: string, location: string): WeatherData {
    return {
      gameId,
      date,
      location,
      temperature: 40 + Math.random() * 40,
      windSpeed: Math.random() * 20,
      windDirection: Math.random() * 360,
      precipitation: Math.random() * 0.5,
      humidity: 30 + Math.random() * 40,
      visibility: 8 + Math.random() * 2,
      pressure: 29 + Math.random() * 2,
      dewPoint: 20 + Math.random() * 30,
      conditions: Math.random() > 0.8 ? 'Rain' : 'Clear',
    };
  }

  private generateMockRefereeData(season: number, week?: number): RefereeData[] {
    const referees = ['Jerome Boger', 'Carl Cheffers', 'Tony Corrente', 'Shawn Hochuli'];
    
    return referees.map(ref => ({
      refereeId: ref.toLowerCase().replace(' ', '_'),
      name: ref,
      crew: `${ref} Crew`,
      season,
      games: 10 + Math.random() * 10,
      penalties: {
        total: 100 + Math.random() * 50,
        perGame: 10 + Math.random() * 5,
        homeTeam: 5 + Math.random() * 3,
        awayTeam: 5 + Math.random() * 3,
      },
      tendencies: {
        passInterference: 0.1 + Math.random() * 0.1,
        holding: 0.2 + Math.random() * 0.1,
        falseStart: 0.15 + Math.random() * 0.1,
        roughingPasser: 0.05 + Math.random() * 0.05,
        unsportsmanlike: 0.02 + Math.random() * 0.03,
      },
      homeBias: -0.2 + Math.random() * 0.4,
    }));
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 External Data Service cache cleared');
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const externalDataService = new ExternalDataService();
