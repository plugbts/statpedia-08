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
  rbis: "RBIs",
  total_bases: "Total Bases",
  hits_allowed: "Hits Allowed",
  earned_runs: "Earned Runs",
  outs_recorded: "Outs Recorded",
  anytime_td: "Anytime TD",
  first_td: "First TD",
  last_td: "Last TD"
};

/**
 * Clean display function to prevent concatenation typos
 * @param key - The prop type key (e.g., "passing_yards", "receptions")
 * @returns Clean display label (e.g., "Passing Yards", "Receptions")
 */
export function displayPropType(key: string): string {
  if (!key) return "Unknown";
  
  // Direct mapping lookup
  if (PROP_DISPLAY_MAP[key]) {
    return PROP_DISPLAY_MAP[key];
  }
  
  // Fallback: convert underscores to spaces and title case
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
