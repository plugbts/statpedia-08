// Market Mapper for SportsGameOdds API
// Handles normalization of market types from SGO schema

// Known friendly labels for common markets
const MARKET_ALIASES: Record<string, string> = {
  // Passing markets
  "Passing Yards": "Passing + Rush Yards",
  "passing_yards": "Passing + Rush Yards",
  "Passing Attempts": "Passing Attempts", 
  "passing_attempts": "Passing Attempts",
  "Passing Completions": "Passing Completions",
  "passing_completions": "Passing Completions",
  "Passing Touchdowns": "Passing TDs",
  "passing_touchdowns": "Passing TDs",
  "Passing Interceptions": "Passing INTs",
  "passing_interceptions": "Passing INTs",

  // Rushing markets
  "Rushing Yards": "Rushing + Rec Yards",
  "rushing_yards": "Rushing + Rec Yards", 
  "Rushing Attempts": "Rushing Attempts",
  "rushing_attempts": "Rushing Attempts",
  "Rushing Touchdowns": "Rushing TDs",
  "rushing_touchdowns": "Rushing TDs",

  // Receiving markets
  "Receiving Yards": "Receiving Yards",
  "receiving_yards": "Receiving Yards",
  "Receiving Receptions": "Receptions", 
  "receiving_receptions": "Receptions",
  "Receiving Touchdowns": "Receiving TDs",
  "receiving_touchdowns": "Receiving TDs",
  "Receiving Longest Reception": "Longest Reception",
  "receiving_longestReception": "Longest Reception",

  // Touchdown markets
  "Touchdowns": "Touchdowns",
  "touchdowns": "Touchdowns",
  "First Touchdown": "First Touchdown",
  "first_touchdown": "First Touchdown",
  "Last Touchdown": "Last Touchdown", 
  "last_touchdown": "Last Touchdown",
  "Anytime Touchdown": "Anytime Touchdown",
  "anytime_touchdown": "Anytime Touchdown",

  // Kicking markets
  "Field Goals Made": "Field Goals Made",
  "field_goals_made": "Field Goals Made",
  "Extra Points Made": "Extra Points Made",
  "extra_points_made": "Extra Points Made",
  "Kicking Total Points": "Kicking Total Points",
  "kicking_totalPoints": "Kicking Total Points",

  // Defensive markets
  "Tackles + Assists": "Tackles + Assists",
  "tackles_assists": "Tackles + Assists",
  "Tackles": "Tackles",
  "tackles": "Tackles",
  "Interceptions": "Interceptions",
  "interceptions": "Interceptions",
  "Sacks": "Sacks",
  "sacks": "Sacks",
  "Passes Defended": "Passes Defended",
  "passes_defended": "Passes Defended",
  "Forced Fumbles": "Forced Fumbles",
  "forced_fumbles": "Forced Fumbles",
  "Fumble Recoveries": "Fumble Recoveries",
  "fumble_recoveries": "Fumble Recoveries",

  // Fantasy/Scoring markets
  "Fantasy Score": "Fantasy Score",
  "fantasyScore": "Fantasy Score",
  "Turnovers": "Turnovers",
  "turnovers": "Turnovers",

  // Team markets
  "Team Total Points": "Team Total Points",
  "team_total_points": "Team Total Points",
  "Team Total Touchdowns": "Team Total Touchdowns",
  "team_total_touchdowns": "Team Total Touchdowns",
  "Team Total Field Goals": "Team Total Field Goals",
  "team_total_field_goals": "Team Total Field Goals",
  "Team Total Sacks": "Team Total Sacks",
  "team_total_sacks": "Team Total Sacks",
  "Team Total Interceptions": "Team Total Interceptions",
  "team_total_interceptions": "Team Total Interceptions",

  // NBA markets
  "Points": "Points",
  "points": "Points",
  "Rebounds": "Rebounds", 
  "rebounds": "Rebounds",
  "Assists": "Assists",
  "assists": "Assists",
  "3-Pointers Made": "3-Pointers Made",
  "threes_made": "3-Pointers Made",
  "Steals": "Steals",
  "steals": "Steals",
  "Blocks": "Blocks",
  "blocks": "Blocks",

  // MLB markets
  "Hits": "Hits",
  "hits": "Hits",
  "Home Runs": "Home Runs",
  "home_runs": "Home Runs", 
  "RBIs": "RBIs",
  "rbis": "RBIs",
  "Strikeouts": "Strikeouts",
  "strikeouts": "Strikeouts",
  "Total Bases": "Total Bases",
  "total_bases": "Total Bases",

  // NHL markets
  "Goals": "Goals",
  "goals": "Goals",
  "Shots on Goal": "Shots on Goal",
  "shots_on_goal": "Shots on Goal",
  "Saves": "Saves",
  "saves": "Saves",

  // NCAAF markets (same as NFL but with different naming)
  // Note: These are already defined above, so we don't need to redefine them
};

export function normalizeMarketType(rawMarket: any): string {
  // Handle different input types
  let raw: string;
  
  if (typeof rawMarket === 'string') {
    raw = rawMarket;
  } else if (rawMarket && typeof rawMarket === 'object') {
    // Prefer explicit name fields from SGO schema
    raw = rawMarket.marketName || 
          rawMarket.name || 
          rawMarket.type || 
          rawMarket.statID ||
          rawMarket.market_type ||
          "Unknown";
  } else {
    raw = "Unknown";
  }

  // Clean up the raw string
  raw = raw.trim();

  // If we know it, map to friendly label
  if (MARKET_ALIASES[raw]) {
    return MARKET_ALIASES[raw];
  }

  // Handle snake_case to Title Case conversion
  if (raw.includes('_')) {
    const titleCase = raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    if (MARKET_ALIASES[titleCase]) {
      return MARKET_ALIASES[titleCase];
    }
  }

  // Handle camelCase to Title Case conversion
  if (raw.match(/[a-z][A-Z]/)) {
    const titleCase = raw.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, c => c.toUpperCase());
    if (MARKET_ALIASES[titleCase]) {
      return MARKET_ALIASES[titleCase];
    }
  }

  // Otherwise, just return the cleaned raw string so new markets still show up
  return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Helper function to determine if a market is a player prop vs team prop
export function isPlayerProp(market: any): boolean {
  if (!market) return false;
  
  const marketName = normalizeMarketType(market).toLowerCase();
  
  // Team props typically start with "Team Total"
  if (marketName.startsWith('team total')) {
    return false;
  }
  
  // Check if it has a playerID or player reference
  if (market.playerID || market.player_id || market.statEntityID) {
    return true;
  }
  
  // Default to player prop for most markets
  return true;
}

// Helper function to extract player information from market
export function extractPlayerInfo(market: any, players: Record<string, any>): { name: string; teamID: string } {
  let playerName = "Unknown Player";
  let teamID = "UNK";
  
  // Try different player ID fields from SGO schema
  const playerID = market.playerID || market.player_id || market.statEntityID;
  
  if (playerID && players[playerID]) {
    const player = players[playerID];
    playerName = player.name || player.firstName + ' ' + player.lastName || playerID;
    teamID = player.teamID || player.team_id || "UNK";
  }
  
  // Fallback: try to extract from marketName
  if (playerName === "Unknown Player" && market.marketName) {
    // SGO sometimes includes player name in marketName like "Josh Allen Passing Yards"
    const nameMatch = market.marketName.match(/^([A-Za-z\s]+?)\s+(Passing|Rushing|Receiving|Touchdowns|Field Goals)/);
    if (nameMatch) {
      playerName = nameMatch[1].trim();
    }
  }
  
  return { name: playerName, teamID };
}
