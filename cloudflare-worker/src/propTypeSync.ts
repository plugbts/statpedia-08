// propTypeSync.ts
import { createClient } from "@supabase/supabase-js";

let supabase: any = null;
let aliasCache: Record<string, string> = {};

export async function initializePropTypeSync(supabaseUrl: string, supabaseKey: string) {
  supabase = createClient(supabaseUrl, supabaseKey);
  await loadPropTypeAliases();
}

export async function loadPropTypeAliases() {
  if (!supabase) {
    console.warn("⚠️ Supabase client not initialized for prop type sync");
    return;
  }

  try {
    const { data, error } = await supabase
      .from("prop_type_aliases")
      .select("alias, canonical");

    if (error) {
      console.error("❌ Failed to load prop_type_aliases:", error);
      return;
    }

    aliasCache = {};
    data?.forEach((row: any) => {
      aliasCache[row.alias.toLowerCase()] = row.canonical.toLowerCase();
    });

    // Add comprehensive fallback mappings for 100% coverage
    const fallbackMappings = {
      // NFL comprehensive mappings
      'sacks': 'defense_sacks',
      'td': 'fantasyscore',
      'touchdowns': 'fantasyscore',
      'pass_yards': 'passing_yards',
      'rush_yards': 'rushing_yards',
      'rec_yards': 'receiving_yards',
      'receptions': 'receptions',
      'turnovers': 'turnovers',
      'interceptions': 'passing_interceptions',
      'passing_interceptions': 'passing_interceptions',
      'rushing_attempts': 'carries',
      'carries': 'rushing_attempts',
      'points': 'points',
      'fantasy_score': 'fantasyscore',
      'fantasyscore': 'fantasy_score',
      
      // NBA comprehensive mappings
      'pts': 'points',
      'reb': 'rebounds',
      'ast': 'assists',
      'stl': 'steals',
      'blk': 'blocks',
      'fgm': 'field_goals_made',
      'fga': 'field_goals_attempted',
      '3pm': 'three_pointers_made',
      '3pa': 'three_pointers_attempted',
      
      // MLB comprehensive mappings
      'hr': 'home_runs',
      'rbi': 'runs_batted_in',
      'sb': 'stolen_bases',
      'hits': 'hits',
      'runs': 'runs',
      'walks': 'batting_basesonballs',
      'batting_basesonballs': 'walks',
      'batting_basesOnBalls': 'walks',
      'strikeouts': 'batting_strikeouts',
      'batting_strikeouts': 'strikeouts',
      
      // NHL comprehensive mappings
      'sog': 'shots_on_goal',
      'saves': 'goalie_saves',
      'goals': 'goals',
      'assists': 'assists',
      'nhl_points': 'points',
      'shots': 'shots_on_goal',
      'nhl_blocks': 'blocks',
      'nhl_hits': 'hits',
      'pims': 'penalty_minutes',
      'penalty_minutes': 'pims'
    };

    // Merge fallback mappings
    Object.entries(fallbackMappings).forEach(([alias, canonical]) => {
      if (!aliasCache[alias]) {
        aliasCache[alias] = canonical;
      }
    });

    console.log(`✅ Loaded ${data?.length || 0} prop type aliases from DB + ${Object.keys(fallbackMappings).length} fallback mappings`);
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
  "passing_yds": "passing_yards",
  "pass_yds": "passing_yards",
  "rushing yards": "rushing_yards",
  "rushing yard": "rushing_yards",
  "rush yards": "rushing_yards",
  "rushing_yds": "rushing_yards",
  "rush_yds": "rushing_yards",
  "receiving yards": "receiving_yards",
  "receiving yard": "receiving_yards",
  "rec yards": "receiving_yards",
  "receiving_yds": "receiving_yards",
  "rec_yds": "receiving_yards",
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
  "completions": "passing_completions",
  "completion": "passing_completions",
  "pass completions": "passing_completions",
  "pass completion": "passing_completions",
  "attempts": "passing_attempts",
  "attempt": "passing_attempts",
  "pass attempts": "passing_attempts",
  "pass attempt": "passing_attempts",
  "interceptions": "passing_interceptions",
  "interception": "passing_interceptions",
  "pass interceptions": "passing_interceptions",
  "pass interception": "passing_interceptions",
  "longest completion": "passing_longestcompletion",
  "longest reception": "receiving_longestreception",
  "longest rush": "rushing_longest",
  "receptions": "receiving_receptions",
  "reception": "receiving_receptions",
  "catches": "receiving_receptions",
  "catch": "receiving_receptions",
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
  "sacks": "defense_sacks",
  "sack": "defense_sacks",
  "turnovers": "turnovers",
  "turnover": "turnovers",
  "first touchdown": "firsttouchdown",
  "first td": "firsttouchdown",
  "last touchdown": "lasttouchdown",
  "last td": "lasttouchdown",
  "anytime touchdown": "anytime_touchdown",
  "anytime td": "anytime_touchdown",

  // ---------------- MLB ----------------
  "strikeouts": "strikeouts",
  "strikeout": "strikeouts",
  "so": "strikeouts",
  "hits": "hits",
  "hit": "hits",
  "home runs": "home_runs",
  "home run": "home_runs",
  "hr": "home_runs",
  "rbis": "runs_batted_in",
  "rbi": "runs_batted_in",
  "runs batted in": "runs_batted_in",
  "run batted in": "runs_batted_in",
  "runs": "runs",
  "run": "runs",
  "total bases": "total_bases",
  "total base": "total_bases",
  "walks": "walks",
  "walk": "walks",
  "stolen bases": "stolen_bases",
  "stolen base": "stolen_bases",
  "sb": "stolen_bases",
  "outs recorded": "outs_recorded",
  "out recorded": "outs_recorded",
  "earned runs": "earned_runs",
  "earned run": "earned_runs",
  "hits allowed": "hits_allowed",
  "hit allowed": "hits_allowed",
  "runs allowed": "runs_allowed",
  "run allowed": "runs_allowed",
  "singles": "singles",
  "single": "singles",
  "doubles": "doubles",
  "double": "doubles",
  "triples": "triples",
  "triple": "triples",

  // ---------------- NBA ----------------
  "points": "points",
  "point": "points",
  "pts": "points",
  "rebounds": "rebounds",
  "rebound": "rebounds",
  "reb": "rebounds",
  "assists": "assists",
  "assist": "assists",
  "ast": "assists",
  "steals": "steals",
  "steal": "steals",
  "stl": "steals",
  "blocks": "blocks",
  "block": "blocks",
  "blk": "blocks",
  "fgm": "field_goals_made",
  "field goals attempted": "field_goals_attempted",
  "field goal attempted": "field_goals_attempted",
  "fga": "field_goals_attempted",
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
  "ftm": "free_throws_made",
  "free throws attempted": "free_throws_attempted",
  "free throw attempted": "free_throws_attempted",
  "fta": "free_throws_attempted",

  // ---------------- NHL ----------------
  "shots on goal": "shots_on_goal",
  "shot on goal": "shots_on_goal",
  "sog": "shots_on_goal",
  "shots": "shots_on_goal",
  "shot": "shots_on_goal",
  "goalie saves": "goalie_saves",
  "goalie save": "goalie_saves",
  "saves": "goalie_saves",
  "save": "goalie_saves",
  "penalty minutes": "penalty_minutes",
  "penalty minute": "penalty_minutes",
  "pims": "penalty_minutes",
  "powerplay goals assists": "powerplay_goals+assists",
  "powerplay goals+assists": "powerplay_goals+assists",
  "goals assists": "goals+assists",
  "goals+assists": "goals+assists",
  "first to score": "firsttoscore",
  "last to score": "lasttoscore"
};

export function normalizePropType(propType: string): string {
  if (!propType) return "unknown";
  
  // Clean and normalize the input
  let key = propType.trim().toLowerCase();
  
  // Remove common prefixes
  key = key.replace(/^(player|total)\s+/i, '');
  
  // First check alias cache
  if (aliasCache[key]) return aliasCache[key];

  // Exact match in our comprehensive map
  if (PROP_TYPE_MAP[key]) return PROP_TYPE_MAP[key];

  // Fuzzy contains matching (catch variations) - order matters for specificity
  if (key.includes("passing yards") || key.includes("pass yards")) return "passing_yards";
  if (key.includes("rushing yards") || key.includes("rush yards")) return "rushing_yards";
  if (key.includes("receiving yards") || key.includes("rec yards")) return "receiving_yards";
  if (key.includes("longest completion")) return "passing_longestcompletion";
  if (key.includes("longest reception")) return "receiving_longestreception";
  if (key.includes("longest rush")) return "rushing_longest";
  if (key.includes("passing touchdown") || key.includes("pass td")) return "passing_touchdowns";
  if (key.includes("rushing touchdown") || key.includes("rush td")) return "rushing_touchdowns";
  if (key.includes("receiving touchdown") || key.includes("rec td")) return "receiving_touchdowns";
  if (key.includes("completion")) return "passing_completions";
  if (key.includes("attempt")) return "passing_attempts";
  if (key.includes("interception")) return "passing_interceptions";
  if (key.includes("reception") || key.includes("catch")) return "receiving_receptions";
  if (key.includes("sacks") || key.includes("sack")) return "defense_sacks";
  if (key.includes("tackles") || key.includes("tackle")) return "defense_combined_tackles";
  if (key.includes("field goals made") || key.includes("fgm")) return "field_goals_made";
  if (key.includes("extra points made") || key.includes("xp made")) return "extra_points_kicks_made";
  if (key.includes("strikeouts") || key.includes("strikeout") || key.includes("so")) return "strikeouts";
  if (key.includes("home runs") || key.includes("home run") || key.includes("hr")) return "home_runs";
  if (key.includes("runs batted in") || key.includes("rbi")) return "runs_batted_in";
  if (key.includes("total bases") || key.includes("total base")) return "total_bases";
  if (key.includes("stolen bases") || key.includes("stolen base") || key.includes("sb")) return "stolen_bases";
  if (key.includes("walks") || key.includes("walk")) return "walks";
  if (key.includes("singles") || key.includes("single")) return "singles";
  if (key.includes("doubles") || key.includes("double")) return "doubles";
  if (key.includes("triples") || key.includes("triple")) return "triples";
  if (key.includes("hits") || key.includes("hit")) return "hits";
  if (key.includes("runs") || key.includes("run")) return "runs";
  if (key.includes("points") || key.includes("point") || key.includes("pts")) return "points";
  if (key.includes("rebounds") || key.includes("rebound") || key.includes("reb")) return "rebounds";
  if (key.includes("assists") || key.includes("assist") || key.includes("ast")) return "assists";
  if (key.includes("steals") || key.includes("steal") || key.includes("stl")) return "steals";
  if (key.includes("blocks") || key.includes("block") || key.includes("blk")) return "blocks";
  if (key.includes("three pointers made") || key.includes("three pointer made") || key.includes("3pm")) return "three_pointers_made";
  if (key.includes("three pointers attempted") || key.includes("three pointer attempted") || key.includes("3pa")) return "three_pointers_attempted";
  if (key.includes("field goals attempted") || key.includes("field goal attempted") || key.includes("fga")) return "field_goals_attempted";
  if (key.includes("free throws made") || key.includes("free throw made") || key.includes("ftm")) return "free_throws_made";
  if (key.includes("free throws attempted") || key.includes("free throw attempted") || key.includes("fta")) return "free_throws_attempted";
  if (key.includes("goals") || key.includes("goal")) return "goals";
  if (key.includes("shots on goal") || key.includes("shot on goal") || key.includes("sog")) return "shots_on_goal";
  if (key.includes("goalie saves") || key.includes("goalie save") || key.includes("saves") || key.includes("save")) return "goalie_saves";
  if (key.includes("penalty minutes") || key.includes("penalty minute") || key.includes("pims")) return "penalty_minutes";
  if (key.includes("powerplay goals assists") || key.includes("powerplay goals+assists")) return "powerplay_goals+assists";
  if (key.includes("goals assists") || key.includes("goals+assists")) return "goals+assists";
  if (key.includes("first to score") || key.includes("firsttoscore")) return "firsttoscore";
  if (key.includes("last to score") || key.includes("lasttoscore")) return "lasttoscore";
  if (key.includes("turnovers") || key.includes("turnover")) return "turnovers";
  if (key.includes("first touchdown") || key.includes("first td")) return "firsttouchdown";
  if (key.includes("last touchdown") || key.includes("last td")) return "lasttouchdown";
  if (key.includes("anytime touchdown") || key.includes("anytime td")) return "anytime_touchdown";

  // Return original key if no match found (instead of defaulting to over/under)
  return key;
}

export function getAliasCache() {
  return aliasCache;
}

export async function refreshPropTypeAliases() {
  if (!supabase) {
    console.warn("⚠️ Supabase client not initialized for prop type sync");
    return false;
  }

  try {
    await loadPropTypeAliases();
    console.log("✅ Prop type aliases refreshed from database");
    return true;
  } catch (error) {
    console.error("❌ Error refreshing prop type aliases:", error);
    return false;
  }
}
