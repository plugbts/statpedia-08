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

export function normalizePropType(propType: string): string {
  if (!propType) return "";
  const key = propType.toLowerCase();
  return aliasCache[key] || key;
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
