// Season Service
// Uses static season data to determine if sports are in season

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
  private fallbackData: { [sport: string]: SeasonInfo } = {
    'nfl': {
      sport: 'NFL',
      isInSeason: true,
      seasonType: 'regular',
      seasonName: '2024 NFL Season',
      startDate: new Date('2024-09-05'),
      endDate: new Date('2025-01-05'),
      nextSeasonStart: new Date('2025-09-04')
    },
    'nba': {
      sport: 'NBA',
      isInSeason: true,
      seasonType: 'regular',
      seasonName: '2024-25 NBA Season',
      startDate: new Date('2024-10-22'),
      endDate: new Date('2025-04-16'),
      nextSeasonStart: new Date('2025-10-21')
    },
    'mlb': {
      sport: 'MLB',
      isInSeason: false,
      seasonType: 'offseason',
      seasonName: '2024 MLB Season',
      startDate: new Date('2024-03-28'),
      endDate: new Date('2024-10-27'),
      nextSeasonStart: new Date('2025-03-27')
    },
    'nhl': {
      sport: 'NHL',
      isInSeason: true,
      seasonType: 'regular',
      seasonName: '2024-25 NHL Season',
      startDate: new Date('2024-10-10'),
      endDate: new Date('2025-04-18'),
      nextSeasonStart: new Date('2025-10-09')
    },
    'college-football': {
      sport: 'College Football',
      isInSeason: false,
      seasonType: 'offseason',
      seasonName: '2024 College Football Season',
      startDate: new Date('2024-08-24'),
      endDate: new Date('2025-01-13'),
      nextSeasonStart: new Date('2025-08-23')
    },
    'college-basketball': {
      sport: 'College Basketball',
      isInSeason: true,
      seasonType: 'regular',
      seasonName: '2024-25 College Basketball Season',
      startDate: new Date('2024-11-05'),
      endDate: new Date('2025-04-07'),
      nextSeasonStart: new Date('2025-11-04')
    }
  };

  public async isSportInSeason(sport: string): Promise<boolean> {
    const fallback = this.fallbackData[sport.toLowerCase()];
    if (!fallback) return false;
    
    const now = new Date();
    return now >= fallback.startDate && now <= fallback.endDate;
  }

  public async getSeasonInfo(sport: string): Promise<SeasonInfo | null> {
    const fallback = this.fallbackData[sport.toLowerCase()];
    if (!fallback) return null;
    
    // Update isInSeason based on current date
    const now = new Date();
    const isInSeason = now >= fallback.startDate && now <= fallback.endDate;
    
    return {
      ...fallback,
      isInSeason
    };
  }

  public async getSeasonType(sport: string): Promise<'regular' | 'playoffs' | 'postseason' | 'offseason'> {
    const seasonInfo = await this.getSeasonInfo(sport);
    return seasonInfo ? seasonInfo.seasonType : 'offseason';
  }

  public async shouldShowMoneylinePredictions(sport: string): Promise<boolean> {
    const seasonType = await this.getSeasonType(sport);
    return seasonType === 'regular' || seasonType === 'playoffs';
  }

  public async getOffseasonMessage(sport: string): Promise<string> {
    const seasonInfo = this.fallbackData[sport.toLowerCase()];
    if (!seasonInfo) return `${sport} season information not available.`;
    
    const now = new Date();
    if (now < seasonInfo.startDate) {
      return `${sport} season starts ${seasonInfo.startDate.toLocaleDateString()}. Check back then for predictions!`;
    } else if (now > seasonInfo.endDate) {
      return `${sport} season ended ${seasonInfo.endDate.toLocaleDateString()}. Next season starts ${seasonInfo.nextSeasonStart?.toLocaleDateString() || 'TBD'}.`;
    }
    
    return `${sport} season is currently active!`;
  }

  public async getCurrentSeasonSports(): Promise<string[]> {
    const now = new Date();
    return Object.keys(this.fallbackData).filter(sport => {
      const seasonInfo = this.fallbackData[sport];
      return now >= seasonInfo.startDate && now <= seasonInfo.endDate;
    });
  }

  public async getOffseasonSports(): Promise<string[]> {
    const now = new Date();
    return Object.keys(this.fallbackData).filter(sport => {
      const seasonInfo = this.fallbackData[sport];
      return now < seasonInfo.startDate || now > seasonInfo.endDate;
    });
  }

  // Get all available sports
  public getAllSports(): string[] {
    return Object.keys(this.fallbackData);
  }

  // Get season data for a specific sport
  public getSportSeasonData(sport: string): SeasonInfo | null {
    return this.fallbackData[sport.toLowerCase()] || null;
  }
}

// Export singleton instance
export const seasonService = new SeasonService();