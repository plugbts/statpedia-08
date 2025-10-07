/**
 * Multi-League Normalization Utilities
 * Handles team names, market types, and positions across NFL, NBA, MLB, NHL
 */

export function normalizeOpponent(team: string, league: string = 'NFL'): string {
  if (!team) return "";
  if (team.length <= 3) return team.toUpperCase();

  const maps = {
    NFL: { 
      "Arizona Cardinals": "ARI", "Atlanta Falcons": "ATL", "Baltimore Ravens": "BAL", 
      "Buffalo Bills": "BUF", "Carolina Panthers": "CAR", "Chicago Bears": "CHI", 
      "Cincinnati Bengals": "CIN", "Cleveland Browns": "CLE", "Dallas Cowboys": "DAL", 
      "Denver Broncos": "DEN", "Detroit Lions": "DET", "Green Bay Packers": "GB", 
      "Houston Texans": "HOU", "Indianapolis Colts": "IND", "Jacksonville Jaguars": "JAX", 
      "Kansas City Chiefs": "KC", "Las Vegas Raiders": "LV", "Los Angeles Chargers": "LAC", 
      "Los Angeles Rams": "LAR", "Miami Dolphins": "MIA", "Minnesota Vikings": "MIN", 
      "New England Patriots": "NE", "New Orleans Saints": "NO", "New York Giants": "NYG", 
      "New York Jets": "NYJ", "Philadelphia Eagles": "PHI", "Pittsburgh Steelers": "PIT", 
      "San Francisco 49ers": "SF", "Seattle Seahawks": "SEA", "Tampa Bay Buccaneers": "TB", 
      "Tennessee Titans": "TEN", "Washington Commanders": "WAS" 
    },
    NBA: { 
      "Atlanta Hawks": "ATL", "Boston Celtics": "BOS", "Brooklyn Nets": "BKN", 
      "Charlotte Hornets": "CHA", "Chicago Bulls": "CHI", "Cleveland Cavaliers": "CLE", 
      "Dallas Mavericks": "DAL", "Denver Nuggets": "DEN", "Detroit Pistons": "DET", 
      "Golden State Warriors": "GSW", "Houston Rockets": "HOU", "Indiana Pacers": "IND", 
      "Los Angeles Clippers": "LAC", "Los Angeles Lakers": "LAL", "Memphis Grizzlies": "MEM", 
      "Miami Heat": "MIA", "Milwaukee Bucks": "MIL", "Minnesota Timberwolves": "MIN", 
      "New Orleans Pelicans": "NOP", "New York Knicks": "NYK", "Oklahoma City Thunder": "OKC", 
      "Orlando Magic": "ORL", "Philadelphia 76ers": "PHI", "Phoenix Suns": "PHX", 
      "Portland Trail Blazers": "POR", "Sacramento Kings": "SAC", "San Antonio Spurs": "SAS", 
      "Toronto Raptors": "TOR", "Utah Jazz": "UTA", "Washington Wizards": "WAS" 
    },
    MLB: { 
      "Arizona Diamondbacks": "ARI", "Atlanta Braves": "ATL", "Baltimore Orioles": "BAL", 
      "Boston Red Sox": "BOS", "Chicago Cubs": "CHC", "Chicago White Sox": "CWS", 
      "Cincinnati Reds": "CIN", "Cleveland Guardians": "CLE", "Colorado Rockies": "COL", 
      "Detroit Tigers": "DET", "Houston Astros": "HOU", "Kansas City Royals": "KC", 
      "Los Angeles Angels": "LAA", "Los Angeles Dodgers": "LAD", "Miami Marlins": "MIA", 
      "Milwaukee Brewers": "MIL", "Minnesota Twins": "MIN", "New York Mets": "NYM", 
      "New York Yankees": "NYY", "Oakland Athletics": "OAK", "Philadelphia Phillies": "PHI", 
      "Pittsburgh Pirates": "PIT", "San Diego Padres": "SD", "San Francisco Giants": "SF", 
      "Seattle Mariners": "SEA", "St. Louis Cardinals": "STL", "Tampa Bay Rays": "TB", 
      "Texas Rangers": "TEX", "Toronto Blue Jays": "TOR", "Washington Nationals": "WSH" 
    },
    NHL: { 
      "Anaheim Ducks": "ANA", "Arizona Coyotes": "ARI", "Boston Bruins": "BOS", 
      "Buffalo Sabres": "BUF", "Calgary Flames": "CGY", "Carolina Hurricanes": "CAR", 
      "Chicago Blackhawks": "CHI", "Colorado Avalanche": "COL", "Columbus Blue Jackets": "CBJ", 
      "Dallas Stars": "DAL", "Detroit Red Wings": "DET", "Edmonton Oilers": "EDM", 
      "Florida Panthers": "FLA", "Los Angeles Kings": "LAK", "Minnesota Wild": "MIN", 
      "Montreal Canadiens": "MTL", "Nashville Predators": "NSH", "New Jersey Devils": "NJD", 
      "New York Islanders": "NYI", "New York Rangers": "NYR", "Ottawa Senators": "OTT", 
      "Philadelphia Flyers": "PHI", "Pittsburgh Penguins": "PIT", "San Jose Sharks": "SJS", 
      "Seattle Kraken": "SEA", "St. Louis Blues": "STL", "Tampa Bay Lightning": "TBL", 
      "Toronto Maple Leafs": "TOR", "Vancouver Canucks": "VAN", "Vegas Golden Knights": "VGK", 
      "Washington Capitals": "WSH", "Winnipeg Jets": "WPG" 
    }
  };

  return maps[league.toUpperCase()]?.[team] || team.toUpperCase();
}

export function normalizeMarketType(market: string): string {
  if (!market) return "";
  const lower = market.toLowerCase();
  
  // NFL specific
  if (lower.includes("pass yard")) return "Passing Yards";
  if (lower.includes("rush yard")) return "Rushing Yards";
  if (lower.includes("rec yard")) return "Receiving Yards";
  if (lower.includes("passing yards")) return "Passing Yards";
  if (lower.includes("rushing yards")) return "Rushing Yards";
  if (lower.includes("receiving yards")) return "Receiving Yards";
  if (lower.includes("passing touchdowns")) return "Passing Touchdowns";
  if (lower.includes("rushing touchdowns")) return "Rushing Touchdowns";
  if (lower.includes("receiving touchdowns")) return "Receiving Touchdowns";
  if (lower.includes("passing completions")) return "Passing Completions";
  if (lower.includes("passing attempts")) return "Passing Attempts";
  if (lower.includes("receiving receptions")) return "Receiving Receptions";
  if (lower.includes("field goals made")) return "Field Goals Made";
  if (lower.includes("field goals attempted")) return "Field Goals Attempted";
  if (lower.includes("extra points made")) return "Extra Points Made";
  if (lower.includes("longest completion")) return "Longest Completion";
  if (lower.includes("longest rush")) return "Longest Rush";
  if (lower.includes("longest reception")) return "Longest Reception";
  
  // NBA specific
  if (lower.includes("points")) return "Points";
  if (lower.includes("rebounds")) return "Rebounds";
  if (lower.includes("assists")) return "Assists";
  if (lower.includes("steals")) return "Steals";
  if (lower.includes("blocks")) return "Blocks";
  if (lower.includes("three pointers")) return "Three Pointers";
  if (lower.includes("free throws")) return "Free Throws";
  
  // MLB specific
  if (lower.includes("hits")) return "Hits";
  if (lower.includes("runs")) return "Runs";
  if (lower.includes("rbis")) return "RBIs";
  if (lower.includes("home runs")) return "Home Runs";
  if (lower.includes("strikeouts")) return "Strikeouts";
  if (lower.includes("walks")) return "Walks";
  
  // NHL specific
  if (lower.includes("goals")) return "Goals";
  if (lower.includes("assists")) return "Assists";
  if (lower.includes("saves")) return "Saves";
  if (lower.includes("shots")) return "Shots";
  
  // Generic patterns
  if (lower.includes("comp")) return "Passing Completions";
  if (lower.includes("att")) return "Passing Attempts";
  if (lower.includes("td")) return "Touchdowns";
  
  return market;
}

export function normalizePosition(position: string, league: string = 'NFL'): string {
  if (!position) return "UNK";
  
  const positionMaps = {
    NFL: {
      'QB': 'QB', 'Quarterback': 'QB',
      'RB': 'RB', 'Running Back': 'RB', 'Halfback': 'RB', 'Fullback': 'RB',
      'WR': 'WR', 'Wide Receiver': 'WR',
      'TE': 'TE', 'Tight End': 'TE',
      'K': 'K', 'Kicker': 'K',
      'DEF': 'DEF', 'Defense': 'DEF', 'D/ST': 'DEF'
    },
    NBA: {
      'PG': 'PG', 'Point Guard': 'PG',
      'SG': 'SG', 'Shooting Guard': 'SG',
      'SF': 'SF', 'Small Forward': 'SF',
      'PF': 'PF', 'Power Forward': 'PF',
      'C': 'C', 'Center': 'C'
    },
    MLB: {
      'P': 'P', 'Pitcher': 'P',
      'C': 'C', 'Catcher': 'C',
      '1B': '1B', 'First Base': '1B',
      '2B': '2B', 'Second Base': '2B',
      '3B': '3B', 'Third Base': '3B',
      'SS': 'SS', 'Shortstop': 'SS',
      'LF': 'LF', 'Left Field': 'LF',
      'CF': 'CF', 'Center Field': 'CF',
      'RF': 'RF', 'Right Field': 'RF',
      'DH': 'DH', 'Designated Hitter': 'DH'
    },
    NHL: {
      'G': 'G', 'Goalie': 'G', 'Goaltender': 'G',
      'D': 'D', 'Defenseman': 'D', 'Defenceman': 'D',
      'C': 'C', 'Center': 'C',
      'LW': 'LW', 'Left Wing': 'LW',
      'RW': 'RW', 'Right Wing': 'RW'
    }
  };
  
  const map = positionMaps[league.toUpperCase()] || positionMaps['NFL'];
  return map[position] || position.toUpperCase();
}

export function normalizePlayerId(playerName: string): string {
  if (!playerName) return 'unknown-player';
  
  return playerName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function getLeagueFromSport(sport: string): string {
  const sportMap: { [key: string]: string } = {
    'nfl': 'NFL',
    'nba': 'NBA', 
    'mlb': 'MLB',
    'nhl': 'NHL'
  };
  
  return sportMap[sport?.toLowerCase()] || 'NFL';
}
