// Comprehensive prop type display mapping
// This prevents concatenation bugs like "receivingeptions"

export const PROP_DISPLAY_MAP: Record<string, string> = {
  // NFL
  passing_yards: "Passing Yards",
  rushing_yards: "Rushing Yards", 
  receiving_yards: "Receiving Yards",
  receptions: "Receptions",
  passing_touchdowns: "Passing TDs",
  rushing_touchdowns: "Rushing TDs",
  receiving_touchdowns: "Receiving TDs",
  completions: "Completions",
  pass_attempts: "Pass Attempts",
  passing_interceptions: "Interceptions",
  passing_longestcompletion: "Longest Completion",
  receiving_longestreception: "Longest Reception",
  rushing_longest: "Longest Rush",
  field_goals_made: "Field Goals Made",
  extra_points_kicks_made: "Extra Points Made",
  defense_combined_tackles: "Tackles + Assists",
  defense_sacks: "Sacks",
  
  // Combo props
  rush_rec_yards: "Rush + Rec Yards",
  pass_rush_yards: "Pass + Rush Yards",
  pass_rec_yards: "Pass + Rec Yards",
  
  // Touchdown variants
  anytime_td: "Anytime TD",
  anytime_touchdown: "Anytime TD",
  first_td: "First TD",
  firsttouchdown: "First TD",
  last_td: "Last TD",
  lasttouchdown: "Last TD",
  
  // MLB
  strikeouts: "Strikeouts",
  hits: "Hits",
  home_runs: "Home Runs",
  rbis: "RBIs",
  runs: "Runs",
  total_bases: "Total Bases",
  walks: "Walks",
  stolen_bases: "Stolen Bases",
  outs_recorded: "Outs Recorded",
  earned_runs: "Earned Runs",
  hits_allowed: "Hits Allowed",
  runs_allowed: "Runs Allowed",
  
  // NBA
  points: "Points",
  rebounds: "Rebounds",
  assists: "Assists",
  steals: "Steals",
  blocks: "Blocks",
  turnovers: "Turnovers",
  three_pointers_made: "Three Pointers",
  three_pointers_attempted: "3PA",
  field_goals_attempted: "FGA",
  free_throws_made: "Free Throws Made",
  free_throws_attempted: "FTA",
  
  // NHL
  goals: "Goals",
  shots_on_goal: "Shots on Goal",
  goalie_saves: "Saves",
  penalty_minutes: "Penalty Minutes",
  powerplay_goals_assists: "PP Goals + Assists",
  goals_assists: "Goals + Assists",
  firsttoscore: "First to Score",
  lasttoscore: "Last to Score"
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
