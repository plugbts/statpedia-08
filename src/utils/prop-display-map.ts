// Comprehensive prop type display mapping
// This prevents concatenation bugs like "receivingeptions"

export const PROP_DISPLAY_MAP: Record<string, string> = {
  // NFL
  passing_yards: "Passing Yards",
  rushing_yards: "Rushing Yards",
  receiving_yards: "Receiving Yards",
  receptions: "Receptions",
  rush_rec_yards: "Rush + Rec Yards",
  pass_rush_yards: "Pass + Rush Yards",
  pass_rec_yards: "Pass + Rec Yards",
  passing_tds: "Passing TDs",
  rushing_tds: "Rushing TDs",
  receiving_tds: "Receiving TDs",
  completions: "Completions",
  pass_attempts: "Pass Attempts",
  interceptions: "Interceptions",
  longest_completion: "Longest Completion",
  longest_reception: "Longest Reception",
  longest_rush: "Longest Rush",
  strikeouts: "Strikeouts",
  hits: "Hits",
  home_runs: "Home Runs",
  rbis: "RBI",
  rbi: "RBI",
  total_bases: "Total Bases",
  hits_allowed: "Hits Allowed",
  earned_runs: "Earned Runs",
  outs_recorded: "Pitching Outs",
  stolen_bases: "Stolen Bases",
  // Common combo markets
  batting_hits_runs_rbi: "Hits + Runs + RBI",
  hits_runs_rbi: "Hits + Runs + RBI",
  anytime_td: "Anytime TD",
  first_td: "First TD",
  last_td: "Last TD"
};

// League-aware overrides for display labels
export const LEAGUE_PROP_DISPLAY_MAP: Record<string, Record<string, string>> = {
  nfl: {
    passing_yards: "Passing Yards",
    receptions: "Receptions",
    rush_rec_yards: "Rush + Rec Yards",
    pass_rush_yards: "Pass + Rush Yards",
    pass_rec_yards: "Pass + Rec Yards",
    longest_completion: "Longest Completion",
    longest_reception: "Longest Reception",
    longest_rush: "Longest Rush",
  },
  nba: {
    points: "Points",
    rebounds: "Rebounds",
    assists: "Assists",
  },
  mlb: {
    strikeouts: "Strikeouts",
    hits: "Hits",
    total_bases: "Total Bases",
    bases_on_balls: "Walks",
    base_on_balls: "Walks",
    walks: "Walks",
    home_runs: "Home Runs",
    rbis: "RBI",
    rbi: "RBI",
    hits_allowed: "Hits Allowed",
    outs_recorded: "Pitching Outs",
    stolen_bases: "Stolen Bases",
    batting_hits_runs_rbi: "Hits + Runs + RBI",
    hits_runs_rbi: "Hits + Runs + RBI",
  },
  nhl: {
    shots_on_goal: "Shots on Goal",
    goals_assists: "Goals + Assists",
  },
};

/**
 * Clean display function to prevent concatenation typos
 * @param key - The prop type key (e.g., "passing_yards", "receptions")
 * @returns Clean display label (e.g., "Passing Yards", "Receptions")
 */
export function displayPropType(key: string): string {
  if (!key) return "Unknown";
  // Normalize aggressively: collapse any non-alphanumeric to underscore
  const canonical = key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  // Synonym remapping to canonical keys
  const SYNONYMS: Record<string, string> = {
    // MLB walks
    basesonballs: "walks",
    baseonballs: "walks",
    base_on_balls: "walks",
    bases_on_balls: "walks",
    bb: "walks",
    // HR shorthand
    hr: "home_runs",
    // Hits + Runs + RBI variants
    hitsrunsrbi: "hits_runs_rbi",
    hits_plus_runs_plus_rbi: "hits_runs_rbi",
    hits_runs_plus_rbi: "hits_runs_rbi",
    hrr: "hits_runs_rbi",
  };

  const normalized = SYNONYMS[canonical] || canonical;

  // Direct mapping lookup (canonical)
  if (PROP_DISPLAY_MAP[normalized]) {
    return PROP_DISPLAY_MAP[normalized];
  }

  // Fallback: humanize original key
  return key
    .replace(/[_+\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * League-aware display function
 * @param league - League key (e.g., 'nfl', 'mlb', 'nba', 'nhl')
 * @param key - Canonical prop type key
 */
export function displayPropTypeForLeague(league: string | undefined, key: string): string {
  if (!key) return "Unknown";
  const lg = (league || '').toLowerCase();
  const canonical = key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  // Apply same synonym normalization
  const SYNONYMS: Record<string, string> = {
    basesonballs: "walks",
    baseonballs: "walks",
    base_on_balls: "walks",
    bases_on_balls: "walks",
    bb: "walks",
    hr: "home_runs",
    hitsrunsrbi: "hits_runs_rbi",
    hits_plus_runs_plus_rbi: "hits_runs_rbi",
    hits_runs_plus_rbi: "hits_runs_rbi",
    hrr: "hits_runs_rbi",
  };
  const normalized = SYNONYMS[canonical] || canonical;

  // Prefer league overrides (canonical)
  const leagueMap = LEAGUE_PROP_DISPLAY_MAP[lg];
  if (leagueMap && leagueMap[normalized]) return leagueMap[normalized];
  // Fallback to global map
  const global = displayPropType(normalized);
  return global;
}

/**
 * Check if a prop type is a combo prop (contains multiple stats)
 */
export function isComboProp(key: string): boolean {
  const comboProps = ['rush_rec_yards', 'pass_rush_yards', 'pass_rec_yards', 'powerplay_goals_assists', 'goals_assists'];
  return comboProps.includes(key);
}

/**
 * Get the base stat types from a combo prop
 */
export function getComboPropBaseStats(key: string): string[] {
  const comboMap: Record<string, string[]> = {
    rush_rec_yards: ['rushing_yards', 'receiving_yards'],
    pass_rush_yards: ['passing_yards', 'rushing_yards'],
    pass_rec_yards: ['passing_yards', 'receiving_yards'],
    powerplay_goals_assists: ['goals', 'assists'],
    goals_assists: ['goals', 'assists']
  };
  
  return comboMap[key] || [];
}
