// Prop Type Normalizer (all leagues)
export const normalizePropType = (propType: string | undefined): string => {
  if (!propType) return "";
  
  const map: Record<string, string> = {
    // NFL
    sacks: "defense_sacks",
    td: "fantasyscore",
    touchdowns: "fantasyscore",
    pass_yards: "passing_yards",
    rush_yards: "rushing_yards",
    rec_yards: "receiving_yards",

    // NBA
    pts: "points",
    reb: "rebounds",
    ast: "assists",
    stl: "steals",
    blk: "blocks",

    // MLB
    hr: "home_runs",
    rbi: "runs_batted_in",
    sb: "stolen_bases",
    hits: "hits",

    // NHL
    sog: "shots_on_goal",
    saves: "goalie_saves",
    goals: "goals",
    assists: "assists",
  };

  const key = propType.toLowerCase();
  return map[key] || key;
};

// Date Normalizer with comprehensive handling
export const normalizeDate = (date: string | undefined): string => {
  if (!date) return "";
  
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  
  // Convert timestamp → YYYY-MM-DD
  try {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return "";
    return parsedDate.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

// Flexible date matcher for 100% coverage
export const isDateMatch = (date1: string | undefined, date2: string | undefined): boolean => {
  if (!date1 || !date2) return false;
  
  const normalized1 = normalizeDate(date1);
  const normalized2 = normalizeDate(date2);
  
  if (!normalized1 || !normalized2) return false;
  
  // Exact match
  if (normalized1 === normalized2) return true;
  
  // Allow date range matching (within 1 day)
  const date1Obj = new Date(normalized1);
  const date2Obj = new Date(normalized2);
  const diffDays = Math.abs(date1Obj.getTime() - date2Obj.getTime()) / (1000 * 60 * 60 * 24);
  
  return diffDays <= 1; // Allow 1 day tolerance
};

// League Normalizer
export const normalizeLeague = (league: string | undefined): string => {
  return league ? league.toLowerCase() : "";
};
