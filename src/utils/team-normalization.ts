/**
 * Team Name Normalization Utility
 * Handles mapping between different team name formats from various APIs
 */

interface TeamMapping {
  abbreviation: string;
  shortName: string;
  fullName: string;
  city: string;
  alternateNames: string[];
}

const NFL_TEAMS: Record<string, TeamMapping> = {
  'ARI': {
    abbreviation: 'ARI',
    shortName: 'Cardinals',
    fullName: 'Arizona Cardinals',
    city: 'Arizona',
    alternateNames: ['AZ', 'Cardinals', 'Arizona', 'AZ Cardinals']
  },
  'ATL': {
    abbreviation: 'ATL',
    shortName: 'Falcons',
    fullName: 'Atlanta Falcons',
    city: 'Atlanta',
    alternateNames: ['Falcons', 'Atlanta']
  },
  'BAL': {
    abbreviation: 'BAL',
    shortName: 'Ravens',
    fullName: 'Baltimore Ravens',
    city: 'Baltimore',
    alternateNames: ['Ravens', 'Baltimore']
  },
  'BUF': {
    abbreviation: 'BUF',
    shortName: 'Bills',
    fullName: 'Buffalo Bills',
    city: 'Buffalo',
    alternateNames: ['Bills', 'Buffalo']
  },
  'CAR': {
    abbreviation: 'CAR',
    shortName: 'Panthers',
    fullName: 'Carolina Panthers',
    city: 'Carolina',
    alternateNames: ['Panthers', 'Carolina']
  },
  'CHI': {
    abbreviation: 'CHI',
    shortName: 'Bears',
    fullName: 'Chicago Bears',
    city: 'Chicago',
    alternateNames: ['Bears', 'Chicago']
  },
  'CIN': {
    abbreviation: 'CIN',
    shortName: 'Bengals',
    fullName: 'Cincinnati Bengals',
    city: 'Cincinnati',
    alternateNames: ['Bengals', 'Cincinnati']
  },
  'CLE': {
    abbreviation: 'CLE',
    shortName: 'Browns',
    fullName: 'Cleveland Browns',
    city: 'Cleveland',
    alternateNames: ['Browns', 'Cleveland']
  },
  'DAL': {
    abbreviation: 'DAL',
    shortName: 'Cowboys',
    fullName: 'Dallas Cowboys',
    city: 'Dallas',
    alternateNames: ['Cowboys', 'Dallas']
  },
  'DEN': {
    abbreviation: 'DEN',
    shortName: 'Broncos',
    fullName: 'Denver Broncos',
    city: 'Denver',
    alternateNames: ['Broncos', 'Denver']
  },
  'DET': {
    abbreviation: 'DET',
    shortName: 'Lions',
    fullName: 'Detroit Lions',
    city: 'Detroit',
    alternateNames: ['Lions', 'Detroit']
  },
  'GB': {
    abbreviation: 'GB',
    shortName: 'Packers',
    fullName: 'Green Bay Packers',
    city: 'Green Bay',
    alternateNames: ['GBP', 'Packers', 'Green Bay', 'GB Packers']
  },
  'HOU': {
    abbreviation: 'HOU',
    shortName: 'Texans',
    fullName: 'Houston Texans',
    city: 'Houston',
    alternateNames: ['Texans', 'Houston']
  },
  'IND': {
    abbreviation: 'IND',
    shortName: 'Colts',
    fullName: 'Indianapolis Colts',
    city: 'Indianapolis',
    alternateNames: ['Colts', 'Indianapolis']
  },
  'JAX': {
    abbreviation: 'JAX',
    shortName: 'Jaguars',
    fullName: 'Jacksonville Jaguars',
    city: 'Jacksonville',
    alternateNames: ['JAC', 'Jaguars', 'Jacksonville']
  },
  'KC': {
    abbreviation: 'KC',
    shortName: 'Chiefs',
    fullName: 'Kansas City Chiefs',
    city: 'Kansas City',
    alternateNames: ['KCC', 'Chiefs', 'Kansas City', 'KC Chiefs']
  },
  'LV': {
    abbreviation: 'LV',
    shortName: 'Raiders',
    fullName: 'Las Vegas Raiders',
    city: 'Las Vegas',
    alternateNames: ['LVR', 'Raiders', 'Las Vegas', 'Oakland Raiders', 'OAK']
  },
  'LAC': {
    abbreviation: 'LAC',
    shortName: 'Chargers',
    fullName: 'Los Angeles Chargers',
    city: 'Los Angeles',
    alternateNames: ['Chargers', 'LA Chargers', 'San Diego Chargers', 'SD']
  },
  'LAR': {
    abbreviation: 'LAR',
    shortName: 'Rams',
    fullName: 'Los Angeles Rams',
    city: 'Los Angeles',
    alternateNames: ['LA', 'Rams', 'LA Rams', 'St. Louis Rams', 'STL']
  },
  'MIA': {
    abbreviation: 'MIA',
    shortName: 'Dolphins',
    fullName: 'Miami Dolphins',
    city: 'Miami',
    alternateNames: ['Dolphins', 'Miami']
  },
  'MIN': {
    abbreviation: 'MIN',
    shortName: 'Vikings',
    fullName: 'Minnesota Vikings',
    city: 'Minnesota',
    alternateNames: ['Vikings', 'Minnesota']
  },
  'NE': {
    abbreviation: 'NE',
    shortName: 'Patriots',
    fullName: 'New England Patriots',
    city: 'New England',
    alternateNames: ['NEP', 'Patriots', 'New England', 'NE Patriots']
  },
  'NO': {
    abbreviation: 'NO',
    shortName: 'Saints',
    fullName: 'New Orleans Saints',
    city: 'New Orleans',
    alternateNames: ['NOS', 'Saints', 'New Orleans', 'NO Saints']
  },
  'NYG': {
    abbreviation: 'NYG',
    shortName: 'Giants',
    fullName: 'New York Giants',
    city: 'New York',
    alternateNames: ['Giants', 'NY Giants']
  },
  'NYJ': {
    abbreviation: 'NYJ',
    shortName: 'Jets',
    fullName: 'New York Jets',
    city: 'New York',
    alternateNames: ['Jets', 'NY Jets']
  },
  'PHI': {
    abbreviation: 'PHI',
    shortName: 'Eagles',
    fullName: 'Philadelphia Eagles',
    city: 'Philadelphia',
    alternateNames: ['Eagles', 'Philadelphia']
  },
  'PIT': {
    abbreviation: 'PIT',
    shortName: 'Steelers',
    fullName: 'Pittsburgh Steelers',
    city: 'Pittsburgh',
    alternateNames: ['Steelers', 'Pittsburgh']
  },
  'SF': {
    abbreviation: 'SF',
    shortName: '49ers',
    fullName: 'San Francisco 49ers',
    city: 'San Francisco',
    alternateNames: ['SFO', '49ers', 'San Francisco', 'SF 49ers']
  },
  'SEA': {
    abbreviation: 'SEA',
    shortName: 'Seahawks',
    fullName: 'Seattle Seahawks',
    city: 'Seattle',
    alternateNames: ['Seahawks', 'Seattle']
  },
  'TB': {
    abbreviation: 'TB',
    shortName: 'Buccaneers',
    fullName: 'Tampa Bay Buccaneers',
    city: 'Tampa Bay',
    alternateNames: ['TBB', 'Bucs', 'Buccaneers', 'Tampa Bay', 'Tampa']
  },
  'TEN': {
    abbreviation: 'TEN',
    shortName: 'Titans',
    fullName: 'Tennessee Titans',
    city: 'Tennessee',
    alternateNames: ['Titans', 'Tennessee']
  },
  'WAS': {
    abbreviation: 'WAS',
    shortName: 'Commanders',
    fullName: 'Washington Commanders',
    city: 'Washington',
    alternateNames: ['WSH', 'Commanders', 'Washington', 'Washington Football Team', 'WFT', 'Redskins']
  }
};

/**
 * Create a reverse lookup map for faster searching
 */
const createReverseLookup = (): Map<string, string> => {
  const lookup = new Map<string, string>();
  
  Object.entries(NFL_TEAMS).forEach(([key, team]) => {
    // Add all variations to the lookup
    lookup.set(key.toLowerCase(), key);
    lookup.set(team.abbreviation.toLowerCase(), key);
    lookup.set(team.shortName.toLowerCase(), key);
    lookup.set(team.fullName.toLowerCase(), key);
    lookup.set(team.city.toLowerCase(), key);
    
    team.alternateNames.forEach(name => {
      lookup.set(name.toLowerCase(), key);
    });
  });
  
  return lookup;
};

const TEAM_LOOKUP = createReverseLookup();

/**
 * Normalize team name to a standard format
 */
export function normalizeTeamName(inputName: string | null | undefined, format: 'abbreviation' | 'shortName' | 'fullName' | 'city' = 'fullName'): string {
  if (!inputName || typeof inputName !== 'string') {
    return 'UNK';
  }
  
  // Clean the input
  const cleanInput = inputName.trim().toLowerCase();
  
  // Look up the team key
  const teamKey = TEAM_LOOKUP.get(cleanInput);
  
  if (!teamKey) {
    // If we can't find it, try partial matching
    for (const [key, team] of Object.entries(NFL_TEAMS)) {
      if (team.fullName.toLowerCase().includes(cleanInput) ||
          team.city.toLowerCase().includes(cleanInput) ||
          team.shortName.toLowerCase().includes(cleanInput) ||
          cleanInput.includes(team.shortName.toLowerCase()) ||
          cleanInput.includes(team.city.toLowerCase())) {
        return team[format];
      }
    }
    
    // If still no match, return the original (cleaned up)
    return inputName.trim();
  }
  
  const team = NFL_TEAMS[teamKey];
  return team[format];
}

/**
 * Get team abbreviation specifically
 */
export function getTeamAbbreviation(teamName: string | null | undefined): string {
  return normalizeTeamName(teamName, 'abbreviation');
}

/**
 * Get full team name specifically
 */
export function getFullTeamName(teamName: string | null | undefined): string {
  return normalizeTeamName(teamName, 'fullName');
}

/**
 * Check if two team names refer to the same team
 */
export function isSameTeam(team1: string | null | undefined, team2: string | null | undefined): boolean {
  if (!team1 || !team2) return false;
  
  const normalized1 = normalizeTeamName(team1, 'abbreviation');
  const normalized2 = normalizeTeamName(team2, 'abbreviation');
  
  return normalized1 === normalized2 && normalized1 !== 'UNK';
}

/**
 * Get team info object
 */
export function getTeamInfo(teamName: string | null | undefined): TeamMapping | null {
  if (!teamName) return null;
  
  const cleanInput = teamName.trim().toLowerCase();
  const teamKey = TEAM_LOOKUP.get(cleanInput);
  
  return teamKey ? NFL_TEAMS[teamKey] : null;
}

/**
 * Validate if a team name is valid
 */
export function isValidTeam(teamName: string | null | undefined): boolean {
  if (!teamName) return false;
  return getTeamInfo(teamName) !== null;
}

/**
 * Get all possible variations of a team name
 */
export function getTeamVariations(teamName: string | null | undefined): string[] {
  const teamInfo = getTeamInfo(teamName);
  if (!teamInfo) return [];
  
  return [
    teamInfo.abbreviation,
    teamInfo.shortName,
    teamInfo.fullName,
    teamInfo.city,
    ...teamInfo.alternateNames
  ];
}

/**
 * Debug function to log team normalization
 */
export function debugTeamNormalization(inputName: string): void {
  console.log(`🔍 Team Normalization Debug for: "${inputName}"`);
  console.log(`📋 Abbreviation: ${normalizeTeamName(inputName, 'abbreviation')}`);
  console.log(`📋 Short Name: ${normalizeTeamName(inputName, 'shortName')}`);
  console.log(`📋 Full Name: ${normalizeTeamName(inputName, 'fullName')}`);
  console.log(`📋 City: ${normalizeTeamName(inputName, 'city')}`);
  console.log(`📋 Is Valid: ${isValidTeam(inputName)}`);
  console.log(`📋 All Variations:`, getTeamVariations(inputName));
}
