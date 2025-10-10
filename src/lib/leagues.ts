export const LEAGUE_PROP_CAPS: Record<string, number> = {
  nfl: 150,
  nba: 100,
  mlb: 95,
  nhl: 70,
};

export const DEFAULT_PROP_TYPES: Record<string, string[]> = {
  nfl: ["receiving yards", "rushing yards", "passing yards", "passing touchdowns", "receptions"],
  nba: ["points", "rebounds", "assists", "steals", "blocks"],
  mlb: ["hits", "total bases", "strikeouts", "runs", "rbis"],
  nhl: ["shots on goal", "assists", "goals", "points", "power play points"],
};

export const LEAGUE_DISPLAY_NAMES: Record<string, string> = {
  nfl: "NFL",
  nba: "NBA", 
  mlb: "MLB",
  nhl: "NHL",
};

export const LEAGUE_COLORS: Record<string, string> = {
  nfl: "#013369", // NFL blue
  nba: "#c8102e", // NBA red
  mlb: "#132448", // MLB navy
  nhl: "#003e7e", // NHL blue
};

export const SEASON_INFO: Record<string, { current: number; startMonth: number; endMonth: number }> = {
  nfl: { current: 2024, startMonth: 9, endMonth: 2 },
  nba: { current: 2024, startMonth: 10, endMonth: 6 },
  mlb: { current: 2024, startMonth: 3, endMonth: 11 },
  nhl: { current: 2024, startMonth: 10, endMonth: 6 },
};

export function getCurrentSeason(league: string): number {
  const info = SEASON_INFO[league.toLowerCase()];
  if (!info) return 2024;
  
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-based months
  
  // Handle season boundaries
  if (info.startMonth > info.endMonth) {
    // Season crosses year boundary (e.g., NFL, NBA, NHL)
    if (currentMonth >= info.startMonth || currentMonth <= info.endMonth) {
      return info.current;
    }
  } else {
    // Season within same year (e.g., MLB)
    if (currentMonth >= info.startMonth && currentMonth <= info.endMonth) {
      return info.current;
    }
  }
  
  return info.current;
}

export function isLeagueInSeason(league: string): boolean {
  const info = SEASON_INFO[league.toLowerCase()];
  if (!info) return false;
  
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  
  if (info.startMonth > info.endMonth) {
    // Season crosses year boundary
    return currentMonth >= info.startMonth || currentMonth <= info.endMonth;
  } else {
    // Season within same year
    return currentMonth >= info.startMonth && currentMonth <= info.endMonth;
  }
}

export function getActiveLeagues(): string[] {
  return Object.keys(LEAGUE_PROP_CAPS).filter(isLeagueInSeason);
}

export function normalizeLeagueName(league: string): string {
  return league.toLowerCase().trim();
}

export function validateLeague(league: string): boolean {
  return league.toLowerCase() in LEAGUE_PROP_CAPS;
}
