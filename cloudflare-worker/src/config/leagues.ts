// Central League Configuration with Multi-Season Support
// Defines all leagues and seasons for comprehensive backfill operations

export interface LeagueConfig {
  id: string;
  displayName: string;
  sport: string;
  seasons: number[];
  isActive: boolean;
  oddIDs?: string; // Default odd IDs for this league
}

export const LEAGUES: LeagueConfig[] = [
  {
    id: "NFL",
    displayName: "National Football League",
    sport: "football",
    seasons: [2023, 2024, 2025],
    isActive: true,
    oddIDs: "passing_yards-PLAYER_ID-game-ou-over,rushing_yards-PLAYER_ID-game-ou-over,receiving_yards-PLAYER_ID-game-ou-over,receptions-PLAYER_ID-game-ou-over,passing_touchdowns-PLAYER_ID-game-ou-over,rushing_touchdowns-PLAYER_ID-game-ou-over,receiving_touchdowns-PLAYER_ID-game-ou-over"
  },
  {
    id: "NBA",
    displayName: "National Basketball Association",
    sport: "basketball",
    seasons: [2023, 2024, 2025],
    isActive: true,
    oddIDs: "points-PLAYER_ID-game-ou-over,rebounds-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,steals-PLAYER_ID-game-ou-over,blocks-PLAYER_ID-game-ou-over,threes_made-PLAYER_ID-game-ou-over,points_rebounds_assists-PLAYER_ID-game-ou-over"
  },
  {
    id: "MLB",
    displayName: "Major League Baseball",
    sport: "baseball",
    seasons: [2023, 2024, 2025],
    isActive: true,
    oddIDs: "hits-PLAYER_ID-game-ou-over,runs-PLAYER_ID-game-ou-over,rbis-PLAYER_ID-game-ou-over,total_bases-PLAYER_ID-game-ou-over,strikeouts-PLAYER_ID-game-ou-over,pitching_outs-PLAYER_ID-game-ou-over"
  },
  {
    id: "NHL",
    displayName: "National Hockey League",
    sport: "hockey",
    seasons: [2023, 2024, 2025],
    isActive: true,
    oddIDs: "shots_on_goal-PLAYER_ID-game-ou-over,points-PLAYER_ID-game-ou-over,goals-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,saves-PLAYER_ID-game-ou-over"
  },
  {
    id: "EPL",
    displayName: "English Premier League",
    sport: "soccer",
    seasons: [2023, 2024, 2025],
    isActive: false, // Set to false if not actively ingesting
    oddIDs: "shots-PLAYER_ID-game-ou-over,shots_on_target-PLAYER_ID-game-ou-over,goals-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,passes-PLAYER_ID-game-ou-over,tackles-PLAYER_ID-game-ou-over"
  },
  {
    id: "NCAAF",
    displayName: "NCAA Football",
    sport: "football",
    seasons: [2023, 2024, 2025],
    isActive: false,
    oddIDs: "passing_yards-PLAYER_ID-game-ou-over,rushing_yards-PLAYER_ID-game-ou-over,receiving_yards-PLAYER_ID-game-ou-over,receptions-PLAYER_ID-game-ou-over"
  },
  {
    id: "NCAAB",
    displayName: "NCAA Basketball",
    sport: "basketball",
    seasons: [2023, 2024, 2025],
    isActive: false,
    oddIDs: "points-PLAYER_ID-game-ou-over,rebounds-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,threes_made-PLAYER_ID-game-ou-over"
  }
];

// Helper functions
export function getActiveLeagues(): LeagueConfig[] {
  return LEAGUES.filter(league => league.isActive);
}

export function getLeaguesInSeason(season: number): LeagueConfig[] {
  return LEAGUES.filter(league => league.seasons.includes(season));
}

export function getLeagueById(id: string): LeagueConfig | undefined {
  return LEAGUES.find(league => league.id === id);
}

export function getAllSeasons(): number[] {
  const seasons = new Set<number>();
  LEAGUES.forEach(league => {
    league.seasons.forEach(season => seasons.add(season));
  });
  return Array.from(seasons).sort((a, b) => b - a); // Most recent first
}

export function getLeagueSeasonPairs(): Array<{ league: LeagueConfig; season: number }> {
  const pairs: Array<{ league: LeagueConfig; season: number }> = [];
  LEAGUES.forEach(league => {
    league.seasons.forEach(season => {
      pairs.push({ league, season });
    });
  });
  return pairs;
}

export function getActiveLeagueSeasonPairs(): Array<{ league: LeagueConfig; season: number }> {
  return getLeagueSeasonPairs().filter(({ league }) => league.isActive);
}
