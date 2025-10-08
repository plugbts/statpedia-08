// Multi-league configuration for comprehensive prop ingestion
// Defines all supported leagues with their specific market configurations

export interface LeagueConfig {
  id: string;
  season: number;
  sport: string;
  oddIDs: string;
  displayName: string;
  active: boolean;
  seasonStart: string; // YYYY-MM-DD
  seasonEnd: string;   // YYYY-MM-DD
}

// Comprehensive league configuration
export const LEAGUES: LeagueConfig[] = [
  {
    id: "NFL",
    season: 2025,
    sport: "FOOTBALL",
    oddIDs: "rushing_yards-PLAYER_ID-game-ou-over,passing_yards-PLAYER_ID-game-ou-over,receiving_yards-PLAYER_ID-game-ou-over,touchdowns-PLAYER_ID-game-ou-over",
    displayName: "NFL",
    active: true,
    seasonStart: "2025-09-01",
    seasonEnd: "2026-02-01"
  },
  {
    id: "NBA",
    season: 2025,
    sport: "BASKETBALL", 
    oddIDs: "points-PLAYER_ID-game-ou-over,rebounds-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,steals-PLAYER_ID-game-ou-over,blocks-PLAYER_ID-game-ou-over",
    displayName: "NBA",
    active: true,
    seasonStart: "2025-10-01",
    seasonEnd: "2026-05-01"
  },
  {
    id: "MLB",
    season: 2025,
    sport: "BASEBALL",
    oddIDs: "hits-PLAYER_ID-game-ou-over,runs-PLAYER_ID-game-ou-over,rbis-PLAYER_ID-game-ou-over,strikeouts-PLAYER_ID-game-ou-over",
    displayName: "MLB",
    active: true,
    seasonStart: "2025-03-01",
    seasonEnd: "2025-11-01"
  },
  {
    id: "NHL",
    season: 2025,
    sport: "HOCKEY",
    oddIDs: "shots_on_goal-PLAYER_ID-game-ou-over,goals-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,points-PLAYER_ID-game-ou-over",
    displayName: "NHL",
    active: true,
    seasonStart: "2025-10-01",
    seasonEnd: "2026-05-01"
  },
  {
    id: "EPL",
    season: 2025,
    sport: "SOCCER",
    oddIDs: "goals-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,shots-PLAYER_ID-game-ou-over",
    displayName: "Premier League",
    active: true,
    seasonStart: "2025-08-01",
    seasonEnd: "2026-06-01"
  },
  {
    id: "NCAAF",
    season: 2025,
    sport: "FOOTBALL",
    oddIDs: "rushing_yards-PLAYER_ID-game-ou-over,passing_yards-PLAYER_ID-game-ou-over,receiving_yards-PLAYER_ID-game-ou-over",
    displayName: "College Football",
    active: true,
    seasonStart: "2025-08-01",
    seasonEnd: "2026-01-01"
  },
  {
    id: "NCAAB",
    season: 2025,
    sport: "BASKETBALL",
    oddIDs: "points-PLAYER_ID-game-ou-over,rebounds-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over",
    displayName: "College Basketball",
    active: true,
    seasonStart: "2025-11-01",
    seasonEnd: "2026-04-01"
  }
];

// Get active leagues only
export function getActiveLeagues(): LeagueConfig[] {
  return LEAGUES.filter(league => league.active);
}

// Get league by ID
export function getLeagueById(id: string): LeagueConfig | undefined {
  return LEAGUES.find(league => league.id === id);
}

// Get leagues by sport
export function getLeaguesBySport(sport: string): LeagueConfig[] {
  return LEAGUES.filter(league => league.sport === sport && league.active);
}

// Check if a league is currently in season
export function isLeagueInSeason(league: LeagueConfig): boolean {
  const now = new Date();
  const seasonStart = new Date(league.seasonStart);
  const seasonEnd = new Date(league.seasonEnd);
  
  return now >= seasonStart && now <= seasonEnd;
}

// Get leagues currently in season
export function getLeaguesInSeason(): LeagueConfig[] {
  return getActiveLeagues().filter(isLeagueInSeason);
}

// League-specific market mappings for prop type normalization
export const LEAGUE_MARKET_MAPPINGS: Record<string, Record<string, string>> = {
  NFL: {
    'rushing_yards': 'Rushing Yards',
    'passing_yards': 'Passing Yards', 
    'receiving_yards': 'Receiving Yards',
    'touchdowns': 'Touchdowns',
    'passing_touchdowns': 'Passing Touchdowns',
    'rushing_touchdowns': 'Rushing Touchdowns',
    'receiving_touchdowns': 'Receiving Touchdowns'
  },
  NBA: {
    'points': 'Points',
    'rebounds': 'Rebounds',
    'assists': 'Assists',
    'steals': 'Steals',
    'blocks': 'Blocks',
    'three_pointers': 'Three Pointers',
    'free_throws': 'Free Throws'
  },
  MLB: {
    'hits': 'Hits',
    'runs': 'Runs',
    'rbis': 'RBIs',
    'strikeouts': 'Strikeouts',
    'home_runs': 'Home Runs',
    'walks': 'Walks',
    'stolen_bases': 'Stolen Bases'
  },
  NHL: {
    'shots_on_goal': 'Shots on Goal',
    'goals': 'Goals',
    'assists': 'Assists',
    'points': 'Points',
    'power_play_points': 'Power Play Points',
    'penalty_minutes': 'Penalty Minutes'
  },
  EPL: {
    'goals': 'Goals',
    'assists': 'Assists',
    'shots': 'Shots',
    'shots_on_target': 'Shots on Target',
    'yellow_cards': 'Yellow Cards',
    'red_cards': 'Red Cards'
  },
  NCAAF: {
    'rushing_yards': 'Rushing Yards',
    'passing_yards': 'Passing Yards',
    'receiving_yards': 'Receiving Yards',
    'touchdowns': 'Touchdowns'
  },
  NCAAB: {
    'points': 'Points',
    'rebounds': 'Rebounds',
    'assists': 'Assists',
    'steals': 'Steals',
    'blocks': 'Blocks'
  }
};

// Get normalized prop type for a league
export function getNormalizedPropType(leagueId: string, rawPropType: string): string {
  const mappings = LEAGUE_MARKET_MAPPINGS[leagueId];
  if (!mappings) {
    console.warn(`No market mappings found for league: ${leagueId}`);
    return rawPropType;
  }
  
  const normalized = mappings[rawPropType.toLowerCase()];
  if (!normalized) {
    console.warn(`Unmapped prop type for ${leagueId}: ${rawPropType}`);
    return rawPropType;
  }
  
  return normalized;
}
