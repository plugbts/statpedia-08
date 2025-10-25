// propTypeSync.ts (NO SUPABASE)
// Supabase removed: maintain alias cache using static/fallback mappings only.
let supabase: any = null;
let aliasCache: Record<string, string> = {};

// Canonical display labels for clean UI
export const DISPLAY_MAP: Record<string, string> = {
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
  last_td: "Last TD",
};

// Clean display function to prevent concatenation typos
export function displayPropType(key: string): string {
  return DISPLAY_MAP[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export async function initializePropTypeSync(_supabaseUrl: string, _supabaseKey: string) {
  // Supabase removed; just load fallback mappings
  supabase = null;
  await loadPropTypeAliases();
}

export async function loadPropTypeAliases() {
  // Load comprehensive fallback mappings for 100% coverage
  try {
    aliasCache = {};

    // Add comprehensive fallback mappings for 100% coverage
    const fallbackMappings = {
      // NFL comprehensive mappings
      sacks: "defense_sacks",
      td: "fantasyscore",
      touchdowns: "fantasyscore",
      pass_yards: "passing_yards",
      rush_yards: "rushing_yards",
      rec_yards: "receiving_yards",
      receptions: "receptions",
      turnovers: "turnovers",
      interceptions: "passing_interceptions",
      passing_interceptions: "passing_interceptions",
      rushing_attempts: "carries",
      carries: "rushing_attempts",
      points: "points",
      fantasy_score: "fantasyscore",
      fantasyscore: "fantasy_score",

      // NBA comprehensive mappings
      pts: "points",
      reb: "rebounds",
      ast: "assists",
      stl: "steals",
      blk: "blocks",
      fgm: "field_goals_made",
      fga: "field_goals_attempted",
      "3pm": "three_pointers_made",
      "3pa": "three_pointers_attempted",

      // MLB comprehensive mappings
      hr: "home_runs",
      rbi: "runs_batted_in",
      sb: "stolen_bases",
      hits: "hits",
      runs: "runs",
      walks: "batting_basesonballs",
      batting_basesonballs: "walks",
      batting_basesOnBalls: "walks",
      strikeouts: "batting_strikeouts",
      batting_strikeouts: "strikeouts",

      // NHL comprehensive mappings
      sog: "shots_on_goal",
      saves: "goalie_saves",
      goals: "goals",
      assists: "assists",
      nhl_points: "points",
      shots: "shots_on_goal",
      nhl_blocks: "blocks",
      nhl_hits: "hits",
      pims: "penalty_minutes",
      penalty_minutes: "pims",
    };

    // Use fallback mappings exclusively (NO SUPABASE)
    Object.entries(fallbackMappings).forEach(([alias, canonical]) => {
      aliasCache[alias] = canonical as string;
    });

    console.log(
      `✅ Loaded ${Object.keys(fallbackMappings).length} fallback prop type alias mappings (NO SUPABASE)`,
    );
  } catch (error) {
    console.error("❌ Error loading prop type aliases:", error);
  }
}

// Comprehensive prop type mapping for all leagues
export const PROP_TYPE_MAP: Record<string, string> = {
  // ---------------- NFL ----------------
  "passing yards": "passing_yards",
  "passing yard": "passing_yards",
  "pass yards": "passing_yards",
  passing_yds: "passing_yards",
  pass_yds: "passing_yards",
  "rushing yards": "rushing_yards",
  "rushing yard": "rushing_yards",
  "rush yards": "rushing_yards",
  rushing_yds: "rushing_yards",
  rush_yds: "rushing_yards",
  "receiving yards": "receiving_yards",
  "receiving yard": "receiving_yards",
  "rec yards": "receiving_yards",
  receiving_yds: "receiving_yards",
  rec_yds: "receiving_yards",
  "passing touchdowns": "passing_touchdowns",
  "passing touchdown": "passing_touchdowns",
  "passing tds": "passing_touchdowns",
  "passing td": "passing_touchdowns",
  "pass touchdowns": "passing_touchdowns",
  "pass td": "passing_touchdowns",
  "rushing touchdowns": "rushing_touchdowns",
  "rushing touchdown": "rushing_touchdowns",
  "rushing tds": "rushing_touchdowns",
  "rushing td": "rushing_touchdowns",
  "rush touchdowns": "rushing_touchdowns",
  "rush td": "rushing_touchdowns",
  "receiving touchdowns": "receiving_touchdowns",
  "receiving touchdown": "receiving_touchdowns",
  "receiving tds": "receiving_touchdowns",
  "receiving td": "receiving_touchdowns",
  "rec touchdowns": "receiving_touchdowns",
  "rec td": "receiving_touchdowns",

  // Combo props
  "passing + rushing yards": "passing_rushing_yards",
  "pass + rush yards": "passing_rushing_yards",
  "passing rushing yards": "passing_rushing_yards",
  "rushing + receiving yards": "rushing_receiving_yards",
  "rush + rec yards": "rushing_receiving_yards",
  "rushing receiving yards": "rushing_receiving_yards",
  completions: "passing_completions",
  completion: "passing_completions",
  "pass completions": "passing_completions",
  "pass completion": "passing_completions",
  attempts: "passing_attempts",
  attempt: "passing_attempts",
  "pass attempts": "passing_attempts",
  "pass attempt": "passing_attempts",
  interceptions: "passing_interceptions",
  interception: "passing_interceptions",
  "pass interceptions": "passing_interceptions",
  "pass interception": "passing_interceptions",
  "longest completion": "passing_longestcompletion",
  "longest reception": "receiving_longestreception",
  "longest rush": "rushing_longest",
  receptions: "receiving_receptions",
  reception: "receiving_receptions",
  catches: "receiving_receptions",
  catch: "receiving_receptions",
  "field goals made": "field_goals_made",
  "field goal made": "field_goals_made",
  "fg made": "field_goals_made",
  "extra points made": "extra_points_kicks_made",
  "extra point made": "extra_points_kicks_made",
  "xp made": "extra_points_kicks_made",
  "tackles + assists": "defense_combined_tackles",
  "tackles assists": "defense_combined_tackles",
  "combined tackles": "defense_combined_tackles",
  "total tackles": "defense_combined_tackles",
  sacks: "defense_sacks",
  sack: "defense_sacks",
  turnovers: "turnovers",
  turnover: "turnovers",
  "first touchdown": "firsttouchdown",
  "first td": "firsttouchdown",
  "last touchdown": "lasttouchdown",
  "last td": "lasttouchdown",
  "anytime touchdown": "anytime_touchdown",
  "anytime td": "anytime_touchdown",

  // ---------------- MLB ----------------
  strikeouts: "strikeouts",
  strikeout: "strikeouts",
  so: "strikeouts",
  hits: "hits",
  hit: "hits",
  "home runs": "home_runs",
  "home run": "home_runs",
  hr: "home_runs",
  rbis: "runs_batted_in",
  rbi: "runs_batted_in",
  "runs batted in": "runs_batted_in",
  "run batted in": "runs_batted_in",
  runs: "runs",
  run: "runs",
  "total bases": "total_bases",
  "total base": "total_bases",
  walks: "walks",
  walk: "walks",
  "stolen bases": "stolen_bases",
  "stolen base": "stolen_bases",
  sb: "stolen_bases",
  "outs recorded": "outs_recorded",
  "out recorded": "outs_recorded",
  "earned runs": "earned_runs",
  "earned run": "earned_runs",
  "hits allowed": "hits_allowed",
  "hit allowed": "hits_allowed",
  "runs allowed": "runs_allowed",
  "run allowed": "runs_allowed",
  singles: "singles",
  single: "singles",
  doubles: "doubles",
  double: "doubles",
  triples: "triples",
  triple: "triples",

  // ---------------- NBA ----------------
  points: "points",
  point: "points",
  pts: "points",
  rebounds: "rebounds",
  rebound: "rebounds",
  reb: "rebounds",
  assists: "assists",
  assist: "assists",
  ast: "assists",
  steals: "steals",
  steal: "steals",
  stl: "steals",
  blocks: "blocks",
  block: "blocks",
  blk: "blocks",
  fgm: "field_goals_made",
  "field goals attempted": "field_goals_attempted",
  "field goal attempted": "field_goals_attempted",
  fga: "field_goals_attempted",
  "three pointers made": "three_pointers_made",
  "three pointer made": "three_pointers_made",
  "3pm": "three_pointers_made",
  "3pt made": "three_pointers_made",
  "three pointers attempted": "three_pointers_attempted",
  "three pointer attempted": "three_pointers_attempted",
  "3pa": "three_pointers_attempted",
  "3pt attempted": "three_pointers_attempted",
  "free throws made": "free_throws_made",
  "free throw made": "free_throws_made",
  ftm: "free_throws_made",
  "free throws attempted": "free_throws_attempted",
  "free throw attempted": "free_throws_attempted",
  fta: "free_throws_attempted",

  // ---------------- NHL ----------------
  "shots on goal": "shots_on_goal",
  "shot on goal": "shots_on_goal",
  sog: "shots_on_goal",
  shots: "shots_on_goal",
  shot: "shots_on_goal",
  "goalie saves": "goalie_saves",
  "goalie save": "goalie_saves",
  saves: "goalie_saves",
  save: "goalie_saves",
  "penalty minutes": "penalty_minutes",
  "penalty minute": "penalty_minutes",
  pims: "penalty_minutes",
  "powerplay goals assists": "powerplay_goals+assists",
  "powerplay goals+assists": "powerplay_goals+assists",
  "goals assists": "goals+assists",
  "goals+assists": "goals+assists",
  "first to score": "firsttoscore",
  "last to score": "lasttoscore",
};

export function normalizePropType(raw: string): string {
  if (!raw) return "unknown";
  const key = raw.trim().toLowerCase();

  // --- NFL - Expanded Coverage (order matters: most specific first) ---

  // Combo props FIRST (before individual stat patterns)
  if (
    (key.includes("rush") && key.includes("rec")) ||
    key.includes("rush+rec") ||
    key.includes("rush + rec")
  )
    return "rush_rec_yards";
  if (
    (key.includes("pass") && key.includes("rush")) ||
    key.includes("pass+rush") ||
    key.includes("pass + rush") ||
    (key.includes("qb") && key.includes("rush"))
  )
    return "pass_rush_yards";
  if (
    (key.includes("pass") && key.includes("rec")) ||
    key.includes("pass+rec") ||
    key.includes("pass + rec")
  )
    return "pass_rec_yards";

  // Touchdowns (before individual stat patterns)
  if (key.includes("anytime") && (key.includes("td") || key.includes("touchdown")))
    return "anytime_td";
  if (key.includes("first") && (key.includes("td") || key.includes("touchdown"))) return "first_td";
  if (key.includes("firsttouchdown") || key.includes("first touchdown")) return "first_td";
  if (key.includes("last") && (key.includes("td") || key.includes("touchdown"))) return "last_td";
  if (
    (key.includes("pass") || key.includes("qb")) &&
    (key.includes("td") || key.includes("touchdown"))
  )
    return "passing_tds";
  if (key.includes("rush") && (key.includes("td") || key.includes("touchdown")))
    return "rushing_tds";
  if (
    (key.includes("receiv") || key.includes("rec")) &&
    (key.includes("td") || key.includes("touchdown"))
  )
    return "receiving_tds";

  // Individual stat patterns (after combos and TDs)
  if ((key.includes("pass") || key.includes("qb")) && (key.includes("yard") || key.includes("yd")))
    return "passing_yards";
  if (key.includes("rush") && (key.includes("yard") || key.includes("yd"))) return "rushing_yards";
  if (
    (key.includes("receiv") || key.includes("rec")) &&
    (key.includes("yard") || key.includes("yd"))
  )
    return "receiving_yards";

  // Receptions (must be after receiving yards check)
  if (key.includes("receptions") || key.includes("catches")) return "receptions";
  if (key.includes("rec") && !key.includes("yard") && !key.includes("yd") && !key.includes("td"))
    return "receptions";

  // Other NFL stats - catch all variations
  if (key.includes("completions") || key.includes("completion")) return "completions";
  if (key.includes("attempts") || key.includes("attempt")) return "pass_attempts";
  if (key.includes("interceptions") || key.includes("interception") || key.includes("int"))
    return "interceptions";

  if (key.includes("longest") && key.includes("completion")) return "longest_completion";
  if (key.includes("longest") && key.includes("reception")) return "longest_reception";
  if (key.includes("longest") && key.includes("rush")) return "longest_rush";

  // --- MLB - Expanded Coverage ---
  if (key.includes("strikeout") || key.includes("strike out") || key === "ks" || key === "k")
    return "strikeouts";
  if (key.includes("total bases") || key.includes("total base")) return "total_bases";
  if (key.includes("home run") || key.includes("homer") || key.includes("hr")) return "home_runs";
  if (key.includes("rbis") || key.includes("rbi") || key.includes("runs batted in")) return "rbis";
  if (key.includes("hits allowed") || key.includes("hits allow")) return "hits_allowed";
  if (key.includes("earned runs") || key.includes("earned run") || key.includes("er"))
    return "earned_runs";
  if (key.includes("outs recorded") || key.includes("out recorded")) return "outs_recorded";
  if (key.includes("hits") && !key.includes("allowed")) return "hits";

  return "unknown"; // only fallback if truly exotic
}

export function getAliasCache() {
  return aliasCache;
}

export async function refreshPropTypeAliases() {
  try {
    await loadPropTypeAliases();
    console.log("✅ Prop type aliases refreshed (NO SUPABASE)");
    return true;
  } catch (error) {
    console.error("❌ Error refreshing prop type aliases:", error);
    return false;
  }
}
