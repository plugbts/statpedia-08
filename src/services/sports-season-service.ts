/**
 * Sports Season Service
 * 
 * Determines which sports are currently in season vs off-season
 * Provides season status, dates, and UI helpers for sports selection
 */

import { logInfo, logWarning } from '@/utils/console-logger';

// Sport season definitions (approximate dates)
const SPORT_SEASONS = {
  NFL: {
    name: 'NFL',
    displayName: 'NFL',
    icon: '🏈',
    regularSeason: {
      start: { month: 9, day: 1 },   // September 1
      end: { month: 1, day: 15 }     // January 15 (next year)
    },
    playoffs: {
      start: { month: 1, day: 16 },  // January 16
      end: { month: 2, day: 15 }     // February 15
    },
    offSeason: {
      start: { month: 2, day: 16 },  // February 16
      end: { month: 8, day: 31 }     // August 31
    }
  },
  NBA: {
    name: 'NBA',
    displayName: 'NBA',
    icon: '🏀',
    regularSeason: {
      start: { month: 10, day: 15 }, // October 15
      end: { month: 4, day: 15 }     // April 15 (next year)
    },
    playoffs: {
      start: { month: 4, day: 16 },  // April 16
      end: { month: 6, day: 30 }     // June 30
    },
    offSeason: {
      start: { month: 7, day: 1 },   // July 1
      end: { month: 10, day: 14 }    // October 14
    }
  },
  MLB: {
    name: 'MLB',
    displayName: 'MLB',
    icon: '⚾',
    regularSeason: {
      start: { month: 3, day: 20 },  // March 20
      end: { month: 10, day: 1 }     // October 1
    },
    playoffs: {
      start: { month: 10, day: 2 },  // October 2
      end: { month: 11, day: 15 }    // November 15
    },
    offSeason: {
      start: { month: 11, day: 16 }, // November 16
      end: { month: 3, day: 19 }     // March 19 (next year)
    }
  },
  NHL: {
    name: 'NHL',
    displayName: 'NHL',
    icon: '🏒',
    regularSeason: {
      start: { month: 10, day: 1 },  // October 1
      end: { month: 4, day: 15 }     // April 15 (next year)
    },
    playoffs: {
      start: { month: 4, day: 16 },  // April 16
      end: { month: 6, day: 30 }     // June 30
    },
    offSeason: {
      start: { month: 7, day: 1 },   // July 1
      end: { month: 9, day: 30 }     // September 30
    }
  },
  NCAAF: {
    name: 'NCAAF',
    displayName: 'College Football',
    icon: '🏈',
    regularSeason: {
      start: { month: 8, day: 25 },  // August 25
      end: { month: 12, day: 15 }    // December 15
    },
    playoffs: {
      start: { month: 12, day: 16 }, // December 16
      end: { month: 1, day: 15 }     // January 15 (next year)
    },
    offSeason: {
      start: { month: 1, day: 16 },  // January 16
      end: { month: 8, day: 24 }     // August 24
    }
  },
  NCAAB: {
    name: 'NCAAB',
    displayName: 'College Basketball',
    icon: '🏀',
    regularSeason: {
      start: { month: 11, day: 1 },  // November 1
      end: { month: 3, day: 15 }     // March 15 (next year)
    },
    playoffs: {
      start: { month: 3, day: 16 },  // March 16 (March Madness)
      end: { month: 4, day: 10 }     // April 10
    },
    offSeason: {
      start: { month: 4, day: 11 },  // April 11
      end: { month: 10, day: 31 }    // October 31
    }
  }
};

export type SportStatus = 'in-season' | 'playoffs' | 'off-season';

export interface SportSeasonInfo {
  sport: string;
  displayName: string;
  icon: string;
  status: SportStatus;
  isSelectable: boolean;
  statusMessage: string;
  nextSeasonStart?: string;
  daysUntilSeason?: number;
}

class SportsSeasonService {
  constructor() {
    logInfo('SportsSeasonService', 'Initialized sports season detection service');
  }

  // Get current date info
  private getCurrentDate(): { month: number; day: number; year: number } {
    const now = new Date();
    return {
      month: now.getMonth() + 1, // JavaScript months are 0-indexed
      day: now.getDate(),
      year: now.getFullYear()
    };
  }

  // Check if a date is within a season period
  private isDateInPeriod(
    currentDate: { month: number; day: number; year: number },
    period: { start: { month: number; day: number }; end: { month: number; day: number } }
  ): boolean {
    const { month: currentMonth, day: currentDay } = currentDate;
    const { start, end } = period;

    // Handle seasons that cross year boundaries (e.g., NFL: Sep - Jan)
    if (start.month > end.month) {
      // Season crosses year boundary
      return (
        (currentMonth > start.month || (currentMonth === start.month && currentDay >= start.day)) ||
        (currentMonth < end.month || (currentMonth === end.month && currentDay <= end.day))
      );
    } else {
      // Season within same year
      return (
        (currentMonth > start.month || (currentMonth === start.month && currentDay >= start.day)) &&
        (currentMonth < end.month || (currentMonth === end.month && currentDay <= end.day))
      );
    }
  }

  // Get sport status
  getSportStatus(sport: string): SportStatus {
    const sportKey = sport.toUpperCase();
    const seasonInfo = SPORT_SEASONS[sportKey as keyof typeof SPORT_SEASONS];
    
    if (!seasonInfo) {
      logWarning('SportsSeasonService', `Unknown sport: ${sport}`);
      return 'in-season'; // Default to in-season for unknown sports
    }

    const currentDate = this.getCurrentDate();

    // Check regular season
    if (this.isDateInPeriod(currentDate, seasonInfo.regularSeason)) {
      return 'in-season';
    }

    // Check playoffs
    if (this.isDateInPeriod(currentDate, seasonInfo.playoffs)) {
      return 'playoffs';
    }

    // Otherwise, it's off-season
    return 'off-season';
  }

  // Get days until next season starts
  private getDaysUntilSeason(sport: string): number {
    const sportKey = sport.toUpperCase();
    const seasonInfo = SPORT_SEASONS[sportKey as keyof typeof SPORT_SEASONS];
    
    if (!seasonInfo) return 0;

    const now = new Date();
    const currentYear = now.getFullYear();
    const { start } = seasonInfo.regularSeason;

    // Create next season start date
    let nextSeasonStart = new Date(currentYear, start.month - 1, start.day);
    
    // If the season start has already passed this year, use next year
    if (nextSeasonStart <= now) {
      nextSeasonStart = new Date(currentYear + 1, start.month - 1, start.day);
    }

    // Calculate days difference
    const timeDiff = nextSeasonStart.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  // Get comprehensive sport information
  getSportInfo(sport: string): SportSeasonInfo {
    const sportKey = sport.toUpperCase();
    const seasonInfo = SPORT_SEASONS[sportKey as keyof typeof SPORT_SEASONS];
    
    if (!seasonInfo) {
      return {
        sport,
        displayName: sport.toUpperCase(),
        icon: '🏆',
        status: 'in-season',
        isSelectable: true,
        statusMessage: 'Active'
      };
    }

    const status = this.getSportStatus(sport);
    const isSelectable = status !== 'off-season';
    
    let statusMessage = '';
    let nextSeasonStart = '';
    let daysUntilSeason = 0;

    switch (status) {
      case 'in-season':
        statusMessage = 'Regular Season';
        break;
      case 'playoffs':
        statusMessage = 'Playoffs';
        break;
      case 'off-season':
        daysUntilSeason = this.getDaysUntilSeason(sport);
        const nextStart = seasonInfo.regularSeason.start;
        nextSeasonStart = `${this.getMonthName(nextStart.month)} ${nextStart.day}`;
        statusMessage = `Off Season • Returns ${nextSeasonStart}`;
        break;
    }

    return {
      sport: seasonInfo.name,
      displayName: seasonInfo.displayName,
      icon: seasonInfo.icon,
      status,
      isSelectable,
      statusMessage,
      nextSeasonStart,
      daysUntilSeason
    };
  }

  // Get all sports with their season info, sorted by availability
  getAllSportsInfo(): SportSeasonInfo[] {
    const allSports = Object.keys(SPORT_SEASONS);
    const sportsInfo = allSports.map(sport => this.getSportInfo(sport));

    // Sort: in-season first, playoffs second, off-season last
    return sportsInfo.sort((a, b) => {
      const statusOrder = { 'in-season': 0, 'playoffs': 1, 'off-season': 2 };
      const aOrder = statusOrder[a.status];
      const bOrder = statusOrder[b.status];
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // Within same status, sort alphabetically
      return a.displayName.localeCompare(b.displayName);
    });
  }

  // Get only selectable (in-season/playoffs) sports
  getSelectableSports(): SportSeasonInfo[] {
    return this.getAllSportsInfo().filter(sport => sport.isSelectable);
  }

  // Get only off-season sports
  getOffSeasonSports(): SportSeasonInfo[] {
    return this.getAllSportsInfo().filter(sport => !sport.isSelectable);
  }

  // Helper to get month name
  private getMonthName(month: number): string {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[month - 1] || 'Unknown';
  }

  // Check if sport is currently selectable
  isSportSelectable(sport: string): boolean {
    const info = this.getSportInfo(sport);
    return info.isSelectable;
  }

  // Get status message for a sport
  getSportStatusMessage(sport: string): string {
    const info = this.getSportInfo(sport);
    return info.statusMessage;
  }

  // Get current season summary
  getSeasonSummary(): {
    inSeason: number;
    playoffs: number;
    offSeason: number;
    total: number;
  } {
    const allSports = this.getAllSportsInfo();
    
    return {
      inSeason: allSports.filter(s => s.status === 'in-season').length,
      playoffs: allSports.filter(s => s.status === 'playoffs').length,
      offSeason: allSports.filter(s => s.status === 'off-season').length,
      total: allSports.length
    };
  }
}

// Export singleton instance
export const sportsSeasonService = new SportsSeasonService();
export default sportsSeasonService;
