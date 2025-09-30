// ESPN API Service
// Fetches real-time season data from ESPN API to determine if sports are in season

export interface ESPNSeasonInfo {
  sport: string;
  isInSeason: boolean;
  seasonType: 'regular' | 'playoffs' | 'postseason' | 'offseason';
  seasonName: string;
  startDate: Date;
  endDate: Date;
  nextSeasonStart?: Date;
  currentYear: number;
  leagueId: string;
}

export interface ESPNLeague {
  id: string;
  name: string;
  slug: string;
  season: {
    year: number;
    startDate: string;
    endDate: string;
    type: {
      id: string;
      name: string;
      abbreviation: string;
    };
  };
  calendar: {
    startDate: string;
    endDate: string;
    label: string;
  }[];
}

class ESPNAPIService {
  private baseUrl = 'https://site.api.espn.com/apis/site/v2/sports';
  private cache: Map<string, { data: ESPNSeasonInfo; timestamp: number }> = new Map();
  private cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours

  // ESPN sport mappings
  private sportMappings: { [key: string]: { leagueId: string; name: string } } = {
    'nfl': { leagueId: 'football/nfl', name: 'NFL' },
    'nba': { leagueId: 'basketball/nba', name: 'NBA' },
    'mlb': { leagueId: 'baseball/mlb', name: 'MLB' },
    'nhl': { leagueId: 'hockey/nhl', name: 'NHL' },
    'college_football': { leagueId: 'football/college-football', name: 'College Football' },
    'college_basketball': { leagueId: 'basketball/mens-college-basketball', name: 'College Basketball' },
    'wnba': { leagueId: 'basketball/wnba', name: 'WNBA' }
  };

  public async getSeasonInfo(sport: string): Promise<ESPNSeasonInfo | null> {
    const cacheKey = `season_${sport}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if it's still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const mapping = this.sportMappings[sport.toLowerCase()];
      if (!mapping) {
        console.warn(`No ESPN mapping found for sport: ${sport}`);
        return null;
      }

      const seasonInfo = await this.fetchSeasonFromESPN(mapping.leagueId, sport);
      
      if (seasonInfo) {
        // Cache the result
        this.cache.set(cacheKey, {
          data: seasonInfo,
          timestamp: Date.now()
        });
      }

      return seasonInfo;
    } catch (error) {
      console.error(`Error fetching season info for ${sport}:`, error);
      return null;
    }
  }

  private async fetchSeasonFromESPN(leagueId: string, sport: string): Promise<ESPNSeasonInfo | null> {
    try {
      const currentYear = new Date().getFullYear();
      
      // Try current year first, then previous year if current year fails
      const yearsToTry = [currentYear, currentYear - 1, currentYear + 1];
      
      for (const year of yearsToTry) {
        try {
          const url = `${this.baseUrl}/${leagueId}/scoreboard?dates=${year}`;
          const response = await fetch(url);
          
          if (!response.ok) {
            continue; // Try next year
          }

          const data = await response.json();
          
          if (data.leagues && data.leagues.length > 0) {
            const league = data.leagues[0];
            return this.parseESPNLeagueData(league, sport, year);
          }
        } catch (error) {
          console.warn(`Failed to fetch data for ${sport} year ${year}:`, error);
          continue;
        }
      }

      // If all years fail, return null
      return null;
    } catch (error) {
      console.error(`Error fetching ESPN data for ${leagueId}:`, error);
      return null;
    }
  }

  private parseESPNLeagueData(league: ESPNLeague, sport: string, year: number): ESPNSeasonInfo {
    const now = new Date();
    const startDate = new Date(league.season.startDate);
    const endDate = new Date(league.season.endDate);
    
    // Determine if sport is currently in season
    const isInSeason = now >= startDate && now <= endDate;
    
    // Determine season type based on current date and season structure
    let seasonType: 'regular' | 'playoffs' | 'postseason' | 'offseason' = 'offseason';
    
    if (isInSeason) {
      // Check if we're in playoffs/postseason (last 30 days of season)
      const playoffsStart = new Date(endDate);
      playoffsStart.setDate(playoffsStart.getDate() - 30);
      
      if (now >= playoffsStart) {
        seasonType = 'playoffs';
      } else {
        seasonType = 'regular';
      }
    }

    // Calculate next season start (approximate)
    const nextSeasonStart = new Date(startDate);
    nextSeasonStart.setFullYear(nextSeasonStart.getFullYear() + 1);

    return {
      sport: sport.toLowerCase(),
      isInSeason,
      seasonType,
      seasonName: `${year} ${this.sportMappings[sport.toLowerCase()]?.name || sport.toUpperCase()} Season`,
      startDate,
      endDate,
      nextSeasonStart,
      currentYear: year,
      leagueId: league.id
    };
  }

  public async getAllSeasonInfo(): Promise<{ [sport: string]: ESPNSeasonInfo }> {
    const results: { [sport: string]: ESPNSeasonInfo } = {};
    
    const sports = Object.keys(this.sportMappings);
    
    // Fetch all sports in parallel
    const promises = sports.map(async (sport) => {
      const seasonInfo = await this.getSeasonInfo(sport);
      if (seasonInfo) {
        results[sport] = seasonInfo;
      }
    });

    await Promise.all(promises);
    return results;
  }

  public async isSportInSeason(sport: string): Promise<boolean> {
    const seasonInfo = await this.getSeasonInfo(sport);
    return seasonInfo?.isInSeason || false;
  }

  public async shouldShowMoneylinePredictions(sport: string): Promise<boolean> {
    const seasonInfo = await this.getSeasonInfo(sport);
    if (!seasonInfo) return false;
    
    return seasonInfo.seasonType === 'regular' || 
           seasonInfo.seasonType === 'playoffs' || 
           seasonInfo.seasonType === 'postseason';
  }

  public async getOffseasonMessage(sport: string): Promise<string> {
    const seasonInfo = await this.getSeasonInfo(sport);
    if (!seasonInfo) return `${sport.toUpperCase()} season information not available`;

    const nextSeasonStart = seasonInfo.nextSeasonStart;
    if (!nextSeasonStart) return `${sport.toUpperCase()} is currently in offseason`;

    const now = new Date();
    const daysUntilNextSeason = Math.ceil((nextSeasonStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return `${sport.toUpperCase()} is currently in offseason. Next season starts in approximately ${daysUntilNextSeason} days.`;
  }

  public async getCurrentSeasonSports(): Promise<string[]> {
    const allSeasons = await this.getAllSeasonInfo();
    return Object.keys(allSeasons).filter(sport => allSeasons[sport].isInSeason);
  }

  public async getOffseasonSports(): Promise<string[]> {
    const allSeasons = await this.getAllSeasonInfo();
    return Object.keys(allSeasons).filter(sport => !allSeasons[sport].isInSeason);
  }

  // Clear cache (useful for testing or manual refresh)
  public clearCache(): void {
    this.cache.clear();
  }
}

export const espnApiService = new ESPNAPIService();
