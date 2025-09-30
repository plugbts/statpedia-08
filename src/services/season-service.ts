// Season Service
// Uses ESPN API to determine if sports are in season, including regular season, playoffs, and postseason

import { espnAPIService, ESPNSeasonInfo } from './espn-api-service';

export interface SeasonInfo {
  sport: string;
  isInSeason: boolean;
  seasonType: 'regular' | 'playoffs' | 'postseason' | 'offseason';
  seasonName: string;
  startDate: Date;
  endDate: Date;
  nextSeasonStart?: Date;
}

class SeasonService {
  private fallbackData: { [key: string]: SeasonInfo } = {
    nfl: {
      sport: 'nfl',
      isInSeason: true,
      seasonType: 'regular',
      seasonName: '2024-25 NFL Season',
      startDate: new Date('2024-09-05'),
      endDate: new Date('2025-02-09'),
      nextSeasonStart: new Date('2025-09-04')
    },
    nba: {
      sport: 'nba',
      isInSeason: true,
      seasonType: 'regular',
      seasonName: '2024-25 NBA Season',
      startDate: new Date('2024-10-22'),
      endDate: new Date('2025-06-15'),
      nextSeasonStart: new Date('2025-10-21')
    },
    mlb: {
      sport: 'mlb',
      isInSeason: false,
      seasonType: 'offseason',
      seasonName: '2024 MLB Season',
      startDate: new Date('2024-03-28'),
      endDate: new Date('2024-10-27'),
      nextSeasonStart: new Date('2025-03-27')
    },
    nhl: {
      sport: 'nhl',
      isInSeason: true,
      seasonType: 'regular',
      seasonName: '2024-25 NHL Season',
      startDate: new Date('2024-10-10'),
      endDate: new Date('2025-06-15'),
      nextSeasonStart: new Date('2025-10-09')
    },
    college_football: {
      sport: 'college_football',
      isInSeason: false,
      seasonType: 'offseason',
      seasonName: '2024 College Football Season',
      startDate: new Date('2024-08-24'),
      endDate: new Date('2025-01-13'),
      nextSeasonStart: new Date('2025-08-23')
    },
    college_basketball: {
      sport: 'college_basketball',
      isInSeason: true,
      seasonType: 'regular',
      seasonName: '2024-25 College Basketball Season',
      startDate: new Date('2024-11-04'),
      endDate: new Date('2025-04-07'),
      nextSeasonStart: new Date('2025-11-03')
    },
    wnba: {
      sport: 'wnba',
      isInSeason: false,
      seasonType: 'offseason',
      seasonName: '2024 WNBA Season',
      startDate: new Date('2024-05-14'),
      endDate: new Date('2024-10-20'),
      nextSeasonStart: new Date('2025-05-13')
    }
  };

  private convertESPNToSeasonInfo(espnInfo: ESPNSeasonInfo): SeasonInfo {
    return {
      sport: espnInfo.sport,
      isInSeason: espnInfo.isInSeason,
      seasonType: espnInfo.seasonType,
      seasonName: espnInfo.seasonName,
      startDate: espnInfo.startDate,
      endDate: espnInfo.endDate,
      nextSeasonStart: espnInfo.nextSeasonStart
    };
  }

  public async isSportInSeason(sport: string): Promise<boolean> {
    try {
      return await espnAPIService.isSportInSeason(sport);
    } catch (error) {
      console.warn(`ESPN API failed for ${sport}, using fallback data:`, error);
      const fallback = this.fallbackData[sport.toLowerCase()];
      if (!fallback) return false;
      
      const now = new Date();
      return now >= fallback.startDate && now <= fallback.endDate;
    }
  }

  public async getSeasonInfo(sport: string): Promise<SeasonInfo | null> {
    try {
      const espnInfo = await espnAPIService.getSeasonInfo(sport);
      if (espnInfo) {
        return this.convertESPNToSeasonInfo(espnInfo);
      }
    } catch (error) {
      console.warn(`ESPN API failed for ${sport}, using fallback data:`, error);
    }

    // Fallback to hardcoded data
    return this.fallbackData[sport.toLowerCase()] || null;
  }

  public async getSeasonType(sport: string): Promise<'regular' | 'playoffs' | 'postseason' | 'offseason'> {
    try {
      const seasonInfo = await this.getSeasonInfo(sport);
      if (!seasonInfo) return 'offseason';
      return seasonInfo.seasonType;
    } catch (error) {
      console.warn(`Error getting season type for ${sport}:`, error);
      return 'offseason';
    }
  }

  public async shouldShowMoneylinePredictions(sport: string): Promise<boolean> {
    try {
      return await espnAPIService.shouldShowMoneylinePredictions(sport);
    } catch (error) {
      console.warn(`ESPN API failed for ${sport}, using fallback logic:`, error);
      const seasonType = await this.getSeasonType(sport);
      return seasonType === 'regular' || seasonType === 'playoffs' || seasonType === 'postseason';
    }
  }

  public async getOffseasonMessage(sport: string): Promise<string> {
    try {
      return await espnAPIService.getOffseasonMessage(sport);
    } catch (error) {
      console.warn(`ESPN API failed for ${sport}, using fallback message:`, error);
      const seasonInfo = this.fallbackData[sport.toLowerCase()];
      if (!seasonInfo) return `${sport.toUpperCase()} season information not available`;

      const nextSeasonStart = seasonInfo.nextSeasonStart;
      if (!nextSeasonStart) return `${sport.toUpperCase()} is currently in offseason`;

      const now = new Date();
      const daysUntilNextSeason = Math.ceil((nextSeasonStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return `${sport.toUpperCase()} is currently in offseason. Next season starts in approximately ${daysUntilNextSeason} days.`;
    }
  }

  public async getCurrentSeasonSports(): Promise<string[]> {
    try {
      return await espnAPIService.getCurrentSeasonSports();
    } catch (error) {
      console.warn('ESPN API failed, using fallback data:', error);
      return Object.keys(this.fallbackData).filter(sport => {
        const fallback = this.fallbackData[sport];
        const now = new Date();
        return now >= fallback.startDate && now <= fallback.endDate;
      });
    }
  }

  public async getOffseasonSports(): Promise<string[]> {
    try {
      return await espnAPIService.getOffseasonSports();
    } catch (error) {
      console.warn('ESPN API failed, using fallback data:', error);
      return Object.keys(this.fallbackData).filter(sport => {
        const fallback = this.fallbackData[sport];
        const now = new Date();
        return !(now >= fallback.startDate && now <= fallback.endDate);
      });
    }
  }

  // Synchronous fallback methods for backward compatibility
  public isSportInSeasonSync(sport: string): boolean {
    const fallback = this.fallbackData[sport.toLowerCase()];
    if (!fallback) return false;
    
    const now = new Date();
    return now >= fallback.startDate && now <= fallback.endDate;
  }

  public getSeasonInfoSync(sport: string): SeasonInfo | null {
    return this.fallbackData[sport.toLowerCase()] || null;
  }

  public getSeasonTypeSync(sport: string): 'regular' | 'playoffs' | 'postseason' | 'offseason' {
    const seasonInfo = this.getSeasonInfoSync(sport);
    if (!seasonInfo) return 'offseason';
    return seasonInfo.seasonType;
  }

  public shouldShowMoneylinePredictionsSync(sport: string): boolean {
    const seasonType = this.getSeasonTypeSync(sport);
    return seasonType === 'regular' || seasonType === 'playoffs' || seasonType === 'postseason';
  }

  public getOffseasonMessageSync(sport: string): string {
    const seasonInfo = this.getSeasonInfoSync(sport);
    if (!seasonInfo) return `${sport.toUpperCase()} season information not available`;

    const nextSeasonStart = seasonInfo.nextSeasonStart;
    if (!nextSeasonStart) return `${sport.toUpperCase()} is currently in offseason`;

    const now = new Date();
    const daysUntilNextSeason = Math.ceil((nextSeasonStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return `${sport.toUpperCase()} is currently in offseason. Next season starts in approximately ${daysUntilNextSeason} days.`;
  }
}

export const seasonService = new SeasonService();
