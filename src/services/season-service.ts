// Season Service
// Determines if sports are in season, including regular season, playoffs, and postseason

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
  private seasonData: { [key: string]: SeasonInfo } = {
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

  public isSportInSeason(sport: string): boolean {
    const seasonInfo = this.seasonData[sport.toLowerCase()];
    if (!seasonInfo) return false;

    const now = new Date();
    return now >= seasonInfo.startDate && now <= seasonInfo.endDate;
  }

  public getSeasonInfo(sport: string): SeasonInfo | null {
    return this.seasonData[sport.toLowerCase()] || null;
  }

  public getSeasonType(sport: string): 'regular' | 'playoffs' | 'postseason' | 'offseason' {
    const seasonInfo = this.getSeasonInfo(sport);
    if (!seasonInfo) return 'offseason';

    const now = new Date();

    // Check if we're in playoffs/postseason period
    const playoffsStart = new Date(seasonInfo.endDate);
    playoffsStart.setDate(playoffsStart.getDate() - 30); // Assume last 30 days are playoffs

    if (now >= playoffsStart && now <= seasonInfo.endDate) {
      return 'playoffs';
    }

    // Check if we're in regular season
    if (now >= seasonInfo.startDate && now < playoffsStart) {
      return 'regular';
    }

    return 'offseason';
  }

  public shouldShowMoneylinePredictions(sport: string): boolean {
    const seasonType = this.getSeasonType(sport);
    // Show predictions for regular season, playoffs, and postseason, but not offseason
    return seasonType === 'regular' || seasonType === 'playoffs' || seasonType === 'postseason';
  }

  public getOffseasonMessage(sport: string): string {
    const seasonInfo = this.getSeasonInfo(sport);
    if (!seasonInfo) return `${sport.toUpperCase()} season information not available`;

    const nextSeasonStart = seasonInfo.nextSeasonStart;
    if (!nextSeasonStart) return `${sport.toUpperCase()} is currently in offseason`;

    const now = new Date();
    const daysUntilNextSeason = Math.ceil((nextSeasonStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return `${sport.toUpperCase()} is currently in offseason. Next season starts in ${daysUntilNextSeason} days.`;
  }

  public getCurrentSeasonSports(): string[] {
    return Object.keys(this.seasonData).filter(sport => this.isSportInSeason(sport));
  }

  public getOffseasonSports(): string[] {
    return Object.keys(this.seasonData).filter(sport => !this.isSportInSeason(sport));
  }
}

export const seasonService = new SeasonService();
