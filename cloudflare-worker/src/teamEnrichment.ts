/**
 * Team Enrichment Functions for Cloudflare Worker
 * 
 * This module provides comprehensive team normalization and enrichment
 * to convert raw team names into standardized abbreviations.
 */

// NFL Teams
const NFL_TEAMS: Record<string, string> = {
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
  "Washington Commanders": "WAS"
};

// NFL Nicknames and Variations
const NFL_NICKNAMES: Record<string, string> = {
  "Cardinals": "ARI",
  "Falcons": "ATL",
  "Ravens": "BAL", 
  "Bills": "BUF",
  "Panthers": "CAR",
  "Bears": "CHI",
  "Bengals": "CIN",
  "Browns": "CLE",
  "Cowboys": "DAL",
  "Broncos": "DEN",
  "Lions": "DET",
  "Packers": "GB",
  "Texans": "HOU",
  "Colts": "IND",
  "Jaguars": "JAX",
  "Chiefs": "KC",
  "Raiders": "LV",
  "Chargers": "LAC",
  "Rams": "LAR",
  "Dolphins": "MIA",
  "Vikings": "MIN",
  "Patriots": "NE",
  "Saints": "NO",
  "Giants": "NYG",
  "Jets": "NYJ",
  "Eagles": "PHI",
  "Steelers": "PIT",
  "49ers": "SF",
  "Seahawks": "SEA",
  "Buccaneers": "TB",
  "Titans": "TEN",
  "Commanders": "WAS",
  // Additional variations
  "San Francisco": "SF",
  "New York": "NYG", // Default to Giants for ambiguous "New York"
  "Las Vegas": "LV",
  "Los Angeles": "LAR", // Default to Rams for ambiguous "Los Angeles"
  "Washington": "WAS",
  "Tampa Bay": "TB",
  "Green Bay": "GB",
  "New England": "NE",
  "New Orleans": "NO",
  "Kansas City": "KC"
};

// NBA Teams
const NBA_TEAMS: Record<string, string> = {
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
  "Washington Wizards": "WAS"
};

// NBA Nicknames
const NBA_NICKNAMES: Record<string, string> = {
  "Hawks": "ATL",
  "Celtics": "BOS",
  "Nets": "BKN",
  "Hornets": "CHA",
  "Bulls": "CHI",
  "Cavaliers": "CLE",
  "Mavericks": "DAL",
  "Nuggets": "DEN",
  "Pistons": "DET",
  "Warriors": "GSW",
  "Rockets": "HOU",
  "Pacers": "IND",
  "Clippers": "LAC",
  "Lakers": "LAL",
  "Grizzlies": "MEM",
  "Heat": "MIA",
  "Bucks": "MIL",
  "Timberwolves": "MIN",
  "Pelicans": "NOP",
  "Knicks": "NYK",
  "Thunder": "OKC",
  "Magic": "ORL",
  "76ers": "PHI",
  "Suns": "PHX",
  "TrailBlazers": "POR",
  "Kings": "SAC",
  "Spurs": "SAS",
  "Raptors": "TOR",
  "Jazz": "UTA",
  "Wizards": "WAS"
};

// MLB Teams
const MLB_TEAMS: Record<string, string> = {
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
  "Washington Nationals": "WSH"
};

// MLB Nicknames
const MLB_NICKNAMES: Record<string, string> = {
  "Diamondbacks": "ARI",
  "D-backs": "ARI",
  "Dbacks": "ARI",
  "Braves": "ATL",
  "Orioles": "BAL",
  "RedSox": "BOS",
  "Red Sox": "BOS",
  "Cubs": "CHC",
  "WhiteSox": "CWS",
  "White Sox": "CWS",
  "Reds": "CIN",
  "Guardians": "CLE",
  "Indians": "CLE", // historical name
  "Rockies": "COL",
  "Tigers": "DET",
  "Astros": "HOU",
  "Royals": "KC",
  "Angels": "LAA",
  "Dodgers": "LAD",
  "Marlins": "MIA",
  "Brewers": "MIL",
  "Twins": "MIN",
  "Mets": "NYM",
  "Yankees": "NYY",
  "Athletics": "OAK",
  "A's": "OAK",
  "As": "OAK",
  "Phillies": "PHI",
  "Pirates": "PIT",
  "Padres": "SD",
  "Giants": "SF",
  "Mariners": "SEA",
  "Cardinals": "STL",
  "Rays": "TB",
  "Rangers": "TEX",
  "BlueJays": "TOR",
  "Blue Jays": "TOR",
  "Nationals": "WSH",
  "Nats": "WSH"
};
  "Twins": "MIN",
  "Mets": "NYM",
  "Yankees": "NYY",
  "Athletics": "OAK",
  "Phillies": "PHI",
  "Pirates": "PIT",
  "Padres": "SD",
  "Giants": "SF",
  "Mariners": "SEA",
  "Cardinals": "STL",
  "Rays": "TB",
  "Rangers": "TEX",
  "BlueJays": "TOR",
  "Nationals": "WSH"
};

// NHL Teams
const NHL_TEAMS: Record<string, string> = {
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
  "Utah Mammoth": "UTA",
  "Vancouver Canucks": "VAN",
  "Vegas Golden Knights": "VGK",
  "Washington Capitals": "WSH",
  "Winnipeg Jets": "WPG"
};

// NHL Nicknames
const NHL_NICKNAMES: Record<string, string> = {
  "Ducks": "ANA",
  "Coyotes": "ARI",
  "Bruins": "BOS",
  "Sabres": "BUF",
  "Flames": "CGY",
  "Hurricanes": "CAR",
  "Blackhawks": "CHI",
  "Avalanche": "COL",
  "BlueJackets": "CBJ",
  "Stars": "DAL",
  "RedWings": "DET",
  "Oilers": "EDM",
  "Panthers": "FLA",
  "Kings": "LAK",
  "Wild": "MIN",
  "Canadiens": "MTL",
  "Predators": "NSH",
  "Devils": "NJD",
  "Islanders": "NYI",
  "Rangers": "NYR",
  "Senators": "OTT",
  "Flyers": "PHI",
  "Penguins": "PIT",
  "Sharks": "SJS",
  "Kraken": "SEA",
  "Blues": "STL",
  "Lightning": "TBL",
  "MapleLeafs": "TOR",
  "Utah": "UTA",
  "Canucks": "VAN",
  "GoldenKnights": "VGK",
  "Capitals": "WSH",
  "Jets": "WPG"
};

// Player-specific team mappings for edge cases
const PLAYER_TEAM_MAPPINGS: Record<string, string> = {
  // NFL Players
  "STEFON_DIGGS": "NE", // Stefon Diggs plays for New England Patriots
  "STEFON_DIGGS_1_NFL": "NE",
  "STEFON_DIGGS_NFL": "NE",
  
  // Add other player mappings as needed
  "AARON_RODGERS": "NYJ",
  "AARON_RODGERS_1_NFL": "NYJ",
  "AARON_RODGERS_NFL": "NYJ",
};

/**
 * Normalize team name to abbreviation
 */
function normalizeTeam(league: string, rawName?: string): string {
  if (!rawName) return "UNK";
  const name = rawName.trim();

  const maps: Record<string, Record<string, string>> = {
    nfl: { ...NFL_TEAMS, ...NFL_NICKNAMES },
    nba: { ...NBA_TEAMS, ...NBA_NICKNAMES },
    mlb: { ...MLB_TEAMS, ...MLB_NICKNAMES },
    nhl: { ...NHL_TEAMS, ...NHL_NICKNAMES }
  };

  const leagueMap = maps[league.toLowerCase()] || {};

  // 1. Exact match
  if (leagueMap[name]) return leagueMap[name];

  // 2. Case-insensitive match
  const ciMatch = Object.entries(leagueMap).find(
    ([k]) => k.toLowerCase() === name.toLowerCase()
  );
  if (ciMatch) return ciMatch[1];

  // 3. Already an abbreviation
  if (Object.values(leagueMap).includes(name.toUpperCase())) {
    return name.toUpperCase();
  }

  // 4. Nickname match (last word of team name)
  const nickname = name.split(" ").pop();
  if (nickname) {
    const nickMatch = Object.entries(leagueMap).find(([fullName]) =>
      fullName.toLowerCase().replace(/\s+/g, "").endsWith(nickname.toLowerCase())
    );
    if (nickMatch) return nickMatch[1];
  }

  // 5. City match (first word of team name)
  const city = name.split(" ")[0];
  if (city) {
    const cityMatch = Object.entries(leagueMap).find(([fullName]) =>
      fullName.toLowerCase().replace(/\s+/g, "").startsWith(city.toLowerCase())
    );
    if (cityMatch) return cityMatch[1];
  }

  return "UNK";
}

/**
 * Enrich teams for a player prop
 */
export function enrichTeams(event: any, prop: any, playersById: Record<string, any> = {}): { team: string; opponent: string } {
  console.log(`🔍 [TEAM_ENRICHMENT] Starting enrichment for ${prop.playerId || prop.player_name}`);
  console.log(`🔍 [TEAM_ENRICHMENT] Event data:`, {
    league: event.league,
    homeTeam: event.homeTeam,
    awayTeam: event.awayTeam,
    homeTeamName: event.homeTeamName,
    awayTeamName: event.awayTeamName
  });

  // Try multiple sources for player's team
  const playerId = prop.playerId || prop.player_id;
  
  // First check player-specific mappings
  const playerSpecificTeam = PLAYER_TEAM_MAPPINGS[playerId];
  if (playerSpecificTeam) {
    console.log(`🔍 [TEAM_ENRICHMENT] Found player-specific team mapping: ${playerId} -> ${playerSpecificTeam}`);
    
    // Get opponent from event context
    const homeTeamName = event.homeTeam?.name || event.homeTeamName || event.homeTeam;
    const awayTeamName = event.awayTeam?.name || event.awayTeamName || event.awayTeam;
    
    let opponentAbbr = "UNK";
    if (homeTeamName && awayTeamName) {
      const homeAbbr = normalizeTeam(event.league, homeTeamName);
      const awayAbbr = normalizeTeam(event.league, awayTeamName);
      opponentAbbr = playerSpecificTeam === homeAbbr ? awayAbbr : homeAbbr;
    }
    
    console.log(`🔍 [TEAM_ENRICHMENT] Player-specific result: ${playerSpecificTeam} vs ${opponentAbbr}`);
    return { team: playerSpecificTeam, opponent: opponentAbbr };
  }
  
  const rawTeamName =
    playersById[playerId]?.teamName ||
    playersById[playerId]?.team_abbr ||
    prop.teamName ||
    prop.team ||
    prop.team_abbr ||
    event.homeTeam?.name ||
    event.homeTeamName ||
    null;

  console.log(`🔍 [TEAM_ENRICHMENT] Raw team name: ${rawTeamName}`);

  const teamAbbr = normalizeTeam(event.league, rawTeamName);
  console.log(`🔍 [TEAM_ENRICHMENT] Normalized team: ${teamAbbr}`);

  // Enhanced opponent resolution
  let opponentAbbr = "UNK";
  
  // Try multiple sources for home/away team names
  const homeTeamName = event.homeTeam?.name || event.homeTeamName || event.homeTeam;
  const awayTeamName = event.awayTeam?.name || event.awayTeamName || event.awayTeam;
  
  if (homeTeamName && awayTeamName) {
    const homeAbbr = normalizeTeam(event.league, homeTeamName);
    const awayAbbr = normalizeTeam(event.league, awayTeamName);
    console.log(`🔍 [TEAM_ENRICHMENT] Home: ${homeAbbr}, Away: ${awayAbbr}`);
    
    // Determine opponent based on player's team
    if (teamAbbr === homeAbbr) {
      opponentAbbr = awayAbbr;
    } else if (teamAbbr === awayAbbr) {
      opponentAbbr = homeAbbr;
    } else {
      // If player's team doesn't match either, try to infer from context
      console.log(`⚠️ [TEAM_ENRICHMENT] Player team ${teamAbbr} doesn't match home ${homeAbbr} or away ${awayAbbr}`);
      
      // Check if player's team is already an abbreviation that matches
      if (Object.values(NFL_TEAMS).includes(teamAbbr) || 
          Object.values(NBA_TEAMS).includes(teamAbbr) ||
          Object.values(MLB_TEAMS).includes(teamAbbr) ||
          Object.values(NHL_TEAMS).includes(teamAbbr)) {
        // Player has a valid team, pick the other team as opponent
        opponentAbbr = teamAbbr === homeAbbr ? awayAbbr : homeAbbr;
      } else {
        // Try to find team from player context
        const playerTeamFromContext = playersById[prop.playerId]?.team_abbr || 
                                     playersById[prop.playerId]?.team ||
                                     prop.team_abbr ||
                                     prop.team;
        
        if (playerTeamFromContext) {
          const contextTeamAbbr = normalizeTeam(event.league, playerTeamFromContext);
          if (contextTeamAbbr !== "UNK") {
            opponentAbbr = contextTeamAbbr === homeAbbr ? awayAbbr : homeAbbr;
          }
        }
      }
    }
  } else {
    console.log(`⚠️ [TEAM_ENRICHMENT] Missing home/away team data: home=${homeTeamName}, away=${awayTeamName}`);
  }

  console.log(`🔍 [TEAM_ENRICHMENT] Final result: ${teamAbbr} vs ${opponentAbbr}`);

  return { team: teamAbbr, opponent: opponentAbbr };
}

export { normalizeTeam };
