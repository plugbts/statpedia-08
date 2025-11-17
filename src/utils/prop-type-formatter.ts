// Prop type formatting utility for consistent display across components
import { displayPropType } from "./prop-display-map";

export const formatPropType = (propType: string): string => {
  if (!propType) return "Unknown Prop";

  // Use the clean display mapping first (prevents concatenation bugs)
  const cleanDisplay = displayPropType(propType);
  if (cleanDisplay !== propType) {
    return cleanDisplay;
  }

  // Remove player name if it appears in prop type - MORE AGGRESSIVE CLEANING
  const cleanPropType = propType
    .replace(/^[A-Za-z\s]+(?:'s)?\s+/, "") // Remove player name prefix like "Josh Allen's" or "Josh Allen"
    .replace(/^[A-Za-z\s]+(?:\s+[A-Za-z]+)?\s+/, "") // Remove any two-word player names
    .replace(/^(Passing|Rushing|Receiving|Defense|Kicking|Field Goal|Extra Point)\s+/, "") // Remove redundant prefixes
    .replace(/^[A-Z][a-z]+\s+[A-Z][a-z]+\s+/, "") // Remove any remaining two-word names at start
    .replace(/^[A-Z][a-z]+\s+/, ""); // Remove any remaining single word names at start

  // Convert snake_case to Title Case
  const formatted = cleanPropType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  // Handle specific prop type mappings for cleaner display
  const propMappings: Record<string, string> = {
    "passing yards": "Passing Yards",
    "passing touchdowns": "Passing TDs",
    "passing attempts": "Pass Attempts",
    "passing completions": "Pass Completions",
    "passing interceptions": "Pass INTs",
    "rushing yards": "Rushing Yards",
    "rushing touchdowns": "Rushing TDs",
    "rushing attempts": "Rush Attempts",
    "receiving yards": "Receiving Yards",
    "receiving touchdowns": "Receiving TDs",
    receptions: "Receptions",
    "longest completion": "Longest Completion",
    "longest reception": "Longest Reception",
    "longest rush": "Longest Rush",
    "passing + rushing yards": "Pass + Rush Yards",
    "rushing + receiving yards": "Rush + Rec Yards",
    "passing + rushing + receiving yards": "Total Yards",
    "defense sacks": "Sacks",
    "defense interceptions": "Interceptions",
    "defense tackles": "Tackles",
    "defense combined tackles": "Combined Tackles",
    "field goals made": "Field Goals Made",
    "field goal attempts": "Field Goal Attempts",
    "extra points made": "Extra Points Made",
    "kicking total points": "Kicker Points",
  };

  // Apply mappings
  const lowerFormatted = formatted.toLowerCase();
  for (const [key, value] of Object.entries(propMappings)) {
    if (lowerFormatted.includes(key)) {
      return value;
    }
  }

  // Fallback formatting
  return formatted
    .replace(/Rec/g, "Receiving")
    .replace(/Rush/g, "Rushing")
    .replace(/Pass/g, "Passing")
    .replace(/Td/g, "Touchdown")
    .replace(/Yd/g, "Yard")
    .replace(/Yds/g, "Yards")
    .replace(/Int/g, "Interception")
    .replace(/Sack/g, "Sack")
    .replace(/Tackle/g, "Tackle")
    .replace(/Fumble/g, "Fumble")
    .replace(/Block/g, "Block")
    .replace(/Safety/g, "Safety")
    .replace(/Punt/g, "Punt")
    .replace(/Kick/g, "Kick")
    .replace(/Field Goal/g, "Field Goal")
    .replace(/Extra Point/g, "Extra Point")
    .replace(/Two Point/g, "Two Point")
    .replace(/First/g, "First")
    .replace(/Last/g, "Last")
    .replace(/Anytime/g, "Anytime")
    .replace(/Longest/g, "Longest")
    .replace(/Shortest/g, "Shortest")
    .replace(/Total/g, "Total")
    .replace(/Combined/g, "Combined")
    .replace(/Alt/g, "Alt")
    .replace(/Line/g, "Line")
    .replace(/Spread/g, "Spread")
    .replace(/Moneyline/g, "Moneyline")
    .replace(/Over/g, "Over")
    .replace(/Under/g, "Under");
};

// Helper function for ordinal suffixes
export const getOrdinalSuffix = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return "st";
  }
  if (j === 2 && k !== 12) {
    return "nd";
  }
  if (j === 3 && k !== 13) {
    return "rd";
  }
  return "th";
};

// Team abbreviation mapping for common team name variations
const teamAbbrEntries: Array<[string, string]> = [
  // NFL teams (Full names)
  ["Arizona Cardinals", "ARI"],
  ["Atlanta Falcons", "ATL"],
  ["Baltimore Ravens", "BAL"],
  ["Buffalo Bills", "BUF"],
  ["Carolina Panthers", "CAR"],
  ["Chicago Bears", "CHI"],
  ["Cincinnati Bengals", "CIN"],
  ["Cleveland Browns", "CLE"],
  ["Dallas Cowboys", "DAL"],
  ["Denver Broncos", "DEN"],
  ["Detroit Lions", "DET"],
  ["Green Bay Packers", "GB"],
  ["Houston Texans", "HOU"],
  ["Indianapolis Colts", "IND"],
  ["Jacksonville Jaguars", "JAX"],
  ["Kansas City Chiefs", "KC"],
  ["Las Vegas Raiders", "LV"],
  ["Los Angeles Chargers", "LAC"],
  ["Los Angeles Rams", "LAR"],
  ["Miami Dolphins", "MIA"],
  ["Minnesota Vikings", "MIN"],
  ["New England Patriots", "NE"],
  ["New Orleans Saints", "NO"],
  ["New York Giants", "NYG"],
  ["New York Jets", "NYJ"],
  ["Philadelphia Eagles", "PHI"],
  ["Pittsburgh Steelers", "PIT"],
  ["San Francisco 49ers", "SF"],
  ["Seattle Seahawks", "SEA"],
  ["Tampa Bay Buccaneers", "TB"],
  ["Tennessee Titans", "TEN"],
  ["Washington Commanders", "WAS"],
  // NFL nicknames
  ["Cardinals", "ARI"],
  ["Falcons", "ATL"],
  ["Ravens", "BAL"],
  ["Bills", "BUF"],
  ["Panthers", "CAR"],
  ["Bears", "CHI"],
  ["Bengals", "CIN"],
  ["Browns", "CLE"],
  ["Cowboys", "DAL"],
  ["Broncos", "DEN"],
  ["Lions", "DET"],
  ["Packers", "GB"],
  ["Texans", "HOU"],
  ["Colts", "IND"],
  ["Jaguars", "JAX"],
  ["Chiefs", "KC"],
  ["Raiders", "LV"],
  ["Chargers", "LAC"],
  ["Rams", "LAR"],
  ["Dolphins", "MIA"],
  ["Vikings", "MIN"],
  ["Patriots", "NE"],
  ["Saints", "NO"],
  ["Giants", "NYG"],
  ["Jets", "NYJ"],
  ["Eagles", "PHI"],
  ["Steelers", "PIT"],
  ["49ers", "SF"],
  ["Seahawks", "SEA"],
  ["Buccaneers", "TB"],
  ["Titans", "TEN"],
  ["Commanders", "WAS"],

  // NBA teams (Full names)
  ["Atlanta Hawks", "ATL"],
  ["Boston Celtics", "BOS"],
  ["Brooklyn Nets", "BKN"],
  ["Charlotte Hornets", "CHA"],
  ["Chicago Bulls", "CHI"],
  ["Cleveland Cavaliers", "CLE"],
  ["Dallas Mavericks", "DAL"],
  ["Denver Nuggets", "DEN"],
  ["Detroit Pistons", "DET"],
  ["Golden State Warriors", "GSW"],
  ["Houston Rockets", "HOU"],
  ["Indiana Pacers", "IND"],
  ["Los Angeles Clippers", "LAC"],
  ["Los Angeles Lakers", "LAL"],
  ["Memphis Grizzlies", "MEM"],
  ["Miami Heat", "MIA"],
  ["Milwaukee Bucks", "MIL"],
  ["Minnesota Timberwolves", "MIN"],
  ["New Orleans Pelicans", "NOP"],
  ["New York Knicks", "NYK"],
  ["Oklahoma City Thunder", "OKC"],
  ["Orlando Magic", "ORL"],
  ["Philadelphia 76ers", "PHI"],
  ["Phoenix Suns", "PHX"],
  ["Portland Trail Blazers", "POR"],
  ["Sacramento Kings", "SAC"],
  ["San Antonio Spurs", "SAS"],
  ["Toronto Raptors", "TOR"],
  ["Utah Jazz", "UTA"],
  ["Washington Wizards", "WAS"],
  // NBA nicknames
  ["Hawks", "ATL"],
  ["Celtics", "BOS"],
  ["Nets", "BKN"],
  ["Hornets", "CHA"],
  ["Bulls", "CHI"],
  ["Cavaliers", "CLE"],
  ["Mavericks", "DAL"],
  ["Nuggets", "DEN"],
  ["Pistons", "DET"],
  ["Warriors", "GSW"],
  ["Rockets", "HOU"],
  ["Pacers", "IND"],
  ["Clippers", "LAC"],
  ["Lakers", "LAL"],
  ["Grizzlies", "MEM"],
  ["Heat", "MIA"],
  ["Bucks", "MIL"],
  ["Timberwolves", "MIN"],
  ["Pelicans", "NOP"],
  ["Knicks", "NYK"],
  ["Thunder", "OKC"],
  ["Magic", "ORL"],
  ["76ers", "PHI"],
  ["Suns", "PHX"],
  ["Trail Blazers", "POR"],
  ["TrailBlazers", "POR"],
  ["Kings", "SAC"],
  ["Spurs", "SAS"],
  ["Raptors", "TOR"],
  ["Jazz", "UTA"],
  ["Wizards", "WAS"],

  // MLB teams (Full names)
  ["Arizona Diamondbacks", "ARI"],
  ["Atlanta Braves", "ATL"],
  ["Baltimore Orioles", "BAL"],
  ["Boston Red Sox", "BOS"],
  ["Chicago Cubs", "CHC"],
  ["Chicago White Sox", "CWS"],
  ["Cincinnati Reds", "CIN"],
  ["Cleveland Guardians", "CLE"],
  ["Colorado Rockies", "COL"],
  ["Detroit Tigers", "DET"],
  ["Houston Astros", "HOU"],
  ["Kansas City Royals", "KC"],
  ["Los Angeles Angels", "LAA"],
  ["Los Angeles Dodgers", "LAD"],
  ["Miami Marlins", "MIA"],
  ["Milwaukee Brewers", "MIL"],
  ["Minnesota Twins", "MIN"],
  ["New York Mets", "NYM"],
  ["New York Yankees", "NYY"],
  ["Oakland Athletics", "OAK"],
  ["Philadelphia Phillies", "PHI"],
  ["Pittsburgh Pirates", "PIT"],
  ["San Diego Padres", "SD"],
  ["San Francisco Giants", "SF"],
  ["Seattle Mariners", "SEA"],
  ["St. Louis Cardinals", "STL"],
  ["Tampa Bay Rays", "TB"],
  ["Texas Rangers", "TEX"],
  ["Toronto Blue Jays", "TOR"],
  ["Washington Nationals", "WSH"],
  // MLB nicknames
  ["Diamondbacks", "ARI"],
  ["D-backs", "ARI"],
  ["Braves", "ATL"],
  ["Orioles", "BAL"],
  ["Red Sox", "BOS"],
  ["RedSox", "BOS"],
  ["Cubs", "CHC"],
  ["White Sox", "CWS"],
  ["WhiteSox", "CWS"],
  ["Reds", "CIN"],
  ["Guardians", "CLE"],
  ["Rockies", "COL"],
  ["Tigers", "DET"],
  ["Astros", "HOU"],
  ["Royals", "KC"],
  ["Angels", "LAA"],
  ["Dodgers", "LAD"],
  ["Marlins", "MIA"],
  ["Brewers", "MIL"],
  ["Twins", "MIN"],
  ["Mets", "NYM"],
  ["Yankees", "NYY"],
  ["Athletics", "OAK"],
  ["A's", "OAK"],
  ["Phillies", "PHI"],
  ["Pirates", "PIT"],
  ["Padres", "SD"],
  ["Giants", "SF"],
  ["Mariners", "SEA"],
  ["Cardinals", "STL"],
  ["Rays", "TB"],
  ["Rangers", "TEX"],
  ["Blue Jays", "TOR"],
  ["BlueJays", "TOR"],
  ["Nationals", "WSH"],

  // NHL teams (Full names)
  ["Anaheim Ducks", "ANA"],
  ["Arizona Coyotes", "ARI"],
  ["Boston Bruins", "BOS"],
  ["Buffalo Sabres", "BUF"],
  ["Calgary Flames", "CGY"],
  ["Carolina Hurricanes", "CAR"],
  ["Chicago Blackhawks", "CHI"],
  ["Colorado Avalanche", "COL"],
  ["Columbus Blue Jackets", "CBJ"],
  ["Dallas Stars", "DAL"],
  ["Detroit Red Wings", "DET"],
  ["Edmonton Oilers", "EDM"],
  ["Florida Panthers", "FLA"],
  ["Los Angeles Kings", "LAK"],
  ["Minnesota Wild", "MIN"],
  ["Montreal Canadiens", "MTL"],
  ["Nashville Predators", "NSH"],
  ["New Jersey Devils", "NJD"],
  ["New York Islanders", "NYI"],
  ["New York Rangers", "NYR"],
  ["Ottawa Senators", "OTT"],
  ["Philadelphia Flyers", "PHI"],
  ["Pittsburgh Penguins", "PIT"],
  ["San Jose Sharks", "SJS"],
  ["Seattle Kraken", "SEA"],
  ["St. Louis Blues", "STL"],
  ["Tampa Bay Lightning", "TBL"],
  ["Toronto Maple Leafs", "TOR"],
  ["Utah Hockey Club", "UTA"],
  ["Vancouver Canucks", "VAN"],
  ["Vegas Golden Knights", "VGK"],
  ["Washington Capitals", "WSH"],
  ["Winnipeg Jets", "WPG"],
  // NHL nicknames
  ["Ducks", "ANA"],
  ["Coyotes", "ARI"],
  ["Bruins", "BOS"],
  ["Sabres", "BUF"],
  ["Flames", "CGY"],
  ["Hurricanes", "CAR"],
  ["Blackhawks", "CHI"],
  ["Avalanche", "COL"],
  ["Blue Jackets", "CBJ"],
  ["BlueJackets", "CBJ"],
  ["Stars", "DAL"],
  ["Red Wings", "DET"],
  ["RedWings", "DET"],
  ["Oilers", "EDM"],
  ["Panthers", "FLA"],
  ["Kings", "LAK"],
  ["Wild", "MIN"],
  ["Canadiens", "MTL"],
  ["Habs", "MTL"],
  ["Predators", "NSH"],
  ["Preds", "NSH"],
  ["Devils", "NJD"],
  ["Islanders", "NYI"],
  ["Rangers", "NYR"],
  ["Senators", "OTT"],
  ["Sens", "OTT"],
  ["Flyers", "PHI"],
  ["Penguins", "PIT"],
  ["Pens", "PIT"],
  ["Sharks", "SJS"],
  ["Kraken", "SEA"],
  ["Blues", "STL"],
  ["Lightning", "TBL"],
  ["Bolts", "TBL"],
  ["Maple Leafs", "TOR"],
  ["MapleLeafs", "TOR"],
  ["Leafs", "TOR"],
  ["Canucks", "VAN"],
  ["Golden Knights", "VGK"],
  ["GoldenKnights", "VGK"],
  ["Capitals", "WSH"],
  ["Caps", "WSH"],
  ["Jets", "WPG"],
];

export const teamAbbrMap: Record<string, string> = Object.fromEntries(teamAbbrEntries);

// Get team abbreviation with fallback logic
export const getTeamAbbreviation = (team: string, teamAbbr: string): string => {
  // First check if teamAbbr is already a valid abbreviation
  if (
    teamAbbr &&
    teamAbbr !== "—" &&
    teamAbbr !== "UNK" &&
    teamAbbr !== "Unknown" &&
    teamAbbr.trim() !== ""
  ) {
    const upperAbbr = teamAbbr.toUpperCase().trim();
    // Verify it's a known abbreviation
    const knownAbbrs = Object.values(teamAbbrMap);
    if (knownAbbrs.includes(upperAbbr)) {
      return upperAbbr;
    }
    // If it's 2-3 characters, likely an abbreviation even if not in our map
    if (upperAbbr.length >= 2 && upperAbbr.length <= 4) {
      return upperAbbr;
    }
  }

  // Try to map from team name (case-insensitive)
  if (team && team !== "—" && team !== "UNK" && team !== "Unknown" && team.trim() !== "") {
    const trimmedTeam = team.trim();

    // Try exact match (case-sensitive)
    if (teamAbbrMap[trimmedTeam]) {
      return teamAbbrMap[trimmedTeam];
    }

    // Try case-insensitive match
    const lowerTeam = trimmedTeam.toLowerCase();
    for (const [fullName, abbr] of Object.entries(teamAbbrMap)) {
      if (fullName.toLowerCase() === lowerTeam) {
        return abbr;
      }
    }

    // Try partial match (e.g., "Green Bay" matches "Green Bay Packers")
    for (const [fullName, abbr] of Object.entries(teamAbbrMap)) {
      if (
        fullName.toLowerCase().includes(lowerTeam) ||
        lowerTeam.includes(fullName.toLowerCase())
      ) {
        return abbr;
      }
    }

    // Try nickname match (last word of team name)
    const words = trimmedTeam.split(" ");
    const nickname = words[words.length - 1];
    if (nickname && teamAbbrMap[nickname]) {
      return teamAbbrMap[nickname];
    }

    // Try city match (first word or first two words)
    if (words.length >= 2) {
      const city = words.slice(0, -1).join(" ");
      for (const [fullName, abbr] of Object.entries(teamAbbrMap)) {
        if (fullName.toLowerCase().startsWith(city.toLowerCase())) {
          return abbr;
        }
      }
    }

    // Last resort: Try to extract abbreviation from team name
    if (words.length >= 2) {
      // Take first letter of each word for multi-word team names
      return words
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase();
    } else if (words.length === 1 && words[0].length >= 3) {
      // For single word teams, take first 3 letters
      return words[0].substring(0, 3).toUpperCase();
    }
  }

  return "UNK";
};
