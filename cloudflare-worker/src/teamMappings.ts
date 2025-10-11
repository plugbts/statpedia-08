// Comprehensive team mapping dictionaries for all leagues
// Provides fallback team name resolution when database registry fails

// 🏈 NFL (32 Teams)
export const NFL_TEAMS: Record<string, string> = {
  "Arizona Cardinals": "ARI",
  "Atlanta Falcons": "ATL",
  "Baltimore Ravens": "BAL",
  "Buffalo Bills": "BUF",
  "Carolina Panthers": "CAR",
  "Chicago Bears": "CHI",
  "Cincinnati Bengals": "CIN",
  "Cleveland Browns": "CLE",
  "Dallas Cowboys": "DAL",
  "Denver Broncos": "DEN",
  "Detroit Lions": "DET",
  "Green Bay Packers": "GB",
  "Houston Texans": "HOU",
  "Indianapolis Colts": "IND",
  "Jacksonville Jaguars": "JAX",
  "Kansas City Chiefs": "KC",
  "Las Vegas Raiders": "LV",
  "Los Angeles Chargers": "LAC",
  "Los Angeles Rams": "LAR",
  "Miami Dolphins": "MIA",
  "Minnesota Vikings": "MIN",
  "New England Patriots": "NE",
  "New Orleans Saints": "NO",
  "New York Giants": "NYG",
  "New York Jets": "NYJ",
  "Philadelphia Eagles": "PHI",
  "Pittsburgh Steelers": "PIT",
  "San Francisco 49ers": "SF",
  "Seattle Seahawks": "SEA",
  "Tampa Bay Buccaneers": "TB",
  "Tennessee Titans": "TEN",
  "Washington Commanders": "WAS",
};

// 🏈 NFL Nicknames → Abbreviations
export const NFL_NICKNAMES: Record<string, string> = {
  Cardinals: "ARI",
  Falcons: "ATL",
  Ravens: "BAL",
  Bills: "BUF",
  Panthers: "CAR",
  Bears: "CHI",
  Bengals: "CIN",
  Browns: "CLE",
  Cowboys: "DAL",
  Broncos: "DEN",
  Lions: "DET",
  Packers: "GB",
  Texans: "HOU",
  Colts: "IND",
  Jaguars: "JAX",
  Chiefs: "KC",
  Raiders: "LV",
  Chargers: "LAC",
  Rams: "LAR",
  Dolphins: "MIA",
  Vikings: "MIN",
  Patriots: "NE",
  Saints: "NO",
  Giants: "NYG",
  Jets: "NYJ",
  Eagles: "PHI",
  Steelers: "PIT",
  "49ers": "SF",
  Seahawks: "SEA",
  Buccaneers: "TB",
  Titans: "TEN",
  Commanders: "WAS",
};

// 🏀 NBA (30 Teams)
export const NBA_TEAMS: Record<string, string> = {
  "Atlanta Hawks": "ATL",
  "Boston Celtics": "BOS",
  "Brooklyn Nets": "BKN",
  "Charlotte Hornets": "CHA",
  "Chicago Bulls": "CHI",
  "Cleveland Cavaliers": "CLE",
  "Dallas Mavericks": "DAL",
  "Denver Nuggets": "DEN",
  "Detroit Pistons": "DET",
  "Golden State Warriors": "GSW",
  "Houston Rockets": "HOU",
  "Indiana Pacers": "IND",
  "Los Angeles Clippers": "LAC",
  "Los Angeles Lakers": "LAL",
  "Memphis Grizzlies": "MEM",
  "Miami Heat": "MIA",
  "Milwaukee Bucks": "MIL",
  "Minnesota Timberwolves": "MIN",
  "New Orleans Pelicans": "NOP",
  "New York Knicks": "NYK",
  "Oklahoma City Thunder": "OKC",
  "Orlando Magic": "ORL",
  "Philadelphia 76ers": "PHI",
  "Phoenix Suns": "PHX",
  "Portland Trail Blazers": "POR",
  "Sacramento Kings": "SAC",
  "San Antonio Spurs": "SAS",
  "Toronto Raptors": "TOR",
  "Utah Jazz": "UTA",
  "Washington Wizards": "WAS",
};

// 🏀 NBA Nicknames → Abbreviations
export const NBA_NICKNAMES: Record<string, string> = {
  Hawks: "ATL",
  Celtics: "BOS",
  Nets: "BKN",
  Hornets: "CHA",
  Bulls: "CHI",
  Cavaliers: "CLE",
  Mavericks: "DAL",
  Nuggets: "DEN",
  Pistons: "DET",
  Warriors: "GSW",
  Rockets: "HOU",
  Pacers: "IND",
  Clippers: "LAC",
  Lakers: "LAL",
  Grizzlies: "MEM",
  Heat: "MIA",
  Bucks: "MIL",
  Timberwolves: "MIN",
  Pelicans: "NOP",
  Knicks: "NYK",
  Thunder: "OKC",
  Magic: "ORL",
  "76ers": "PHI",
  Suns: "PHX",
  TrailBlazers: "POR",
  Kings: "SAC",
  Spurs: "SAS",
  Raptors: "TOR",
  Jazz: "UTA",
  Wizards: "WAS",
};

// ⚾ MLB (30 Teams)
export const MLB_TEAMS: Record<string, string> = {
  "Arizona Diamondbacks": "ARI",
  "Atlanta Braves": "ATL",
  "Baltimore Orioles": "BAL",
  "Boston Red Sox": "BOS",
  "Chicago Cubs": "CHC",
  "Chicago White Sox": "CWS",
  "Cincinnati Reds": "CIN",
  "Cleveland Guardians": "CLE",
  "Colorado Rockies": "COL",
  "Detroit Tigers": "DET",
  "Houston Astros": "HOU",
  "Kansas City Royals": "KC",
  "Los Angeles Angels": "LAA",
  "Los Angeles Dodgers": "LAD",
  "Miami Marlins": "MIA",
  "Milwaukee Brewers": "MIL",
  "Minnesota Twins": "MIN",
  "New York Mets": "NYM",
  "New York Yankees": "NYY",
  "Oakland Athletics": "OAK",
  "Philadelphia Phillies": "PHI",
  "Pittsburgh Pirates": "PIT",
  "San Diego Padres": "SD",
  "San Francisco Giants": "SF",
  "Seattle Mariners": "SEA",
  "St. Louis Cardinals": "STL",
  "Tampa Bay Rays": "TB",
  "Texas Rangers": "TEX",
  "Toronto Blue Jays": "TOR",
  "Washington Nationals": "WSH",
};

// ⚾ MLB Nicknames → Abbreviations
export const MLB_NICKNAMES: Record<string, string> = {
  Diamondbacks: "ARI",
  Braves: "ATL",
  Orioles: "BAL",
  RedSox: "BOS",
  Cubs: "CHC",
  WhiteSox: "CWS",
  Reds: "CIN",
  Guardians: "CLE",
  Rockies: "COL",
  Tigers: "DET",
  Astros: "HOU",
  Royals: "KC",
  Angels: "LAA",
  Dodgers: "LAD",
  Marlins: "MIA",
  Brewers: "MIL",
  Twins: "MIN",
  Mets: "NYM",
  Yankees: "NYY",
  Athletics: "OAK",
  Phillies: "PHI",
  Pirates: "PIT",
  Padres: "SD",
  Giants: "SF",
  Mariners: "SEA",
  Cardinals: "STL",
  Rays: "TB",
  Rangers: "TEX",
  BlueJays: "TOR",
  Nationals: "WSH",
};

// 🏒 NHL (32 Teams)
export const NHL_TEAMS: Record<string, string> = {
  "Anaheim Ducks": "ANA",
  "Arizona Coyotes": "ARI",
  "Boston Bruins": "BOS",
  "Buffalo Sabres": "BUF",
  "Calgary Flames": "CGY",
  "Carolina Hurricanes": "CAR",
  "Chicago Blackhawks": "CHI",
  "Colorado Avalanche": "COL",
  "Columbus Blue Jackets": "CBJ",
  "Dallas Stars": "DAL",
  "Detroit Red Wings": "DET",
  "Edmonton Oilers": "EDM",
  "Florida Panthers": "FLA",
  "Los Angeles Kings": "LAK",
  "Minnesota Wild": "MIN",
  "Montreal Canadiens": "MTL",
  "Nashville Predators": "NSH",
  "New Jersey Devils": "NJD",
  "New York Islanders": "NYI",
  "New York Rangers": "NYR",
  "Ottawa Senators": "OTT",
  "Philadelphia Flyers": "PHI",
  "Pittsburgh Penguins": "PIT",
  "San Jose Sharks": "SJS",
  "Seattle Kraken": "SEA",
  "St. Louis Blues": "STL",
  "Tampa Bay Lightning": "TBL",
  "Toronto Maple Leafs": "TOR",
  "Utah Mammoth": "UTA",   // new franchise
  "Vancouver Canucks": "VAN",
  "Vegas Golden Knights": "VGK",
  "Washington Capitals": "WSH",
  "Winnipeg Jets": "WPG",
};

// 🏒 NHL Nicknames → Abbreviations
export const NHL_NICKNAMES: Record<string, string> = {
  Ducks: "ANA",
  Coyotes: "ARI",
  Bruins: "BOS",
  Sabres: "BUF",
  Flames: "CGY",
  Hurricanes: "CAR",
  Blackhawks: "CHI",
  Avalanche: "COL",
  BlueJackets: "CBJ",
  Stars: "DAL",
  RedWings: "DET",
  Oilers: "EDM",
  Panthers: "FLA",
  Kings: "LAK",
  Wild: "MIN",
  Canadiens: "MTL",
  Predators: "NSH",
  Devils: "NJD",
  Islanders: "NYI",
  Rangers: "NYR",
  Senators: "OTT",
  Flyers: "PHI",
  Penguins: "PIT",
  Sharks: "SJS",
  Kraken: "SEA",
  Blues: "STL",
  Lightning: "TBL",
  MapleLeafs: "TOR",
  Utah: "UTA", // new franchise
  Canucks: "VAN",
  GoldenKnights: "VGK",
  Capitals: "WSH",
  Jets: "WPG",
};

/**
 * Unified team normalization function with comprehensive fallback logic
 * Handles abbreviations, nicknames, case differences, and city-only names
 */
export function normalizeTeam(league: string, rawName: string): string {
  if (!rawName) return "UNK";
  const name = rawName.trim().replace(/\s+/g, " ");

  const maps: Record<string, Record<string, string>> = {
    nfl: { ...NFL_TEAMS, ...NFL_NICKNAMES },
    nba: { ...NBA_TEAMS, ...NBA_NICKNAMES },
    mlb: { ...MLB_TEAMS, ...MLB_NICKNAMES },
    nhl: { ...NHL_TEAMS, ...NHL_NICKNAMES },
  };

  const leagueMap = maps[league.toLowerCase()] || {};

  // 1. Exact match
  if (leagueMap[name]) return leagueMap[name];

  // 2. Case-insensitive match
  const ciMatch = Object.entries(leagueMap).find(
    ([fullName]) => fullName.toLowerCase() === name.toLowerCase()
  );
  if (ciMatch) return ciMatch[1];

  // 3. Abbreviation already
  if (Object.values(leagueMap).includes(name.toUpperCase())) {
    return name.toUpperCase();
  }

  // 4. Nickname match (last word of team name)
  const nickname = name.split(" ").pop()?.toLowerCase();
  const nickMatch = Object.entries(leagueMap).find(([fullName]) =>
    fullName.toLowerCase().endsWith(nickname || "")
  );
  if (nickMatch) return nickMatch[1];

  // 5. City match (first word of team name)
  const city = name.split(" ")[0].toLowerCase();
  const cityMatch = Object.entries(leagueMap).find(([fullName]) =>
    fullName.toLowerCase().startsWith(city)
  );
  if (cityMatch) return cityMatch[1];

  // 6. Partial match (contains team name)
  const partialMatch = Object.entries(leagueMap).find(([fullName]) =>
    fullName.toLowerCase().includes(name.toLowerCase()) ||
    name.toLowerCase().includes(fullName.toLowerCase())
  );
  if (partialMatch) return partialMatch[1];

  return "UNK";
}

/**
 * Get all team mappings for a league
 */
export function getTeamMappings(league: string): Record<string, string> {
  const maps: Record<string, Record<string, string>> = {
    nfl: { ...NFL_TEAMS, ...NFL_NICKNAMES },
    nba: { ...NBA_TEAMS, ...NBA_NICKNAMES },
    mlb: { ...MLB_TEAMS, ...MLB_NICKNAMES },
    nhl: { ...NHL_TEAMS, ...NHL_NICKNAMES },
  };

  return maps[league.toLowerCase()] || {};
}
