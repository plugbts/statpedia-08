/**
 * Prop Type Normalizer
 * Maps raw API prop types to canonical prop types for consistent data matching
 */

/**
 * Canonical prop type mapping
 * Ensures both player_game_logs and proplines use the same prop type language
 */
const CANONICAL_PROP_TYPE_MAP: Record<string, string> = {
  // Defensive stats
  'defense_combinedTackles': 'tackles',
  'defense_interceptions': 'interceptions',
  'defense_sacks': 'sacks',
  'defense_passBreakups': 'pass_breakups',
  'defense_tacklesForLoss': 'tackles_for_loss',
  
  // Offensive stats
  'rushing_yards': 'rushing_yards',
  'rushing_touchdowns': 'rushing_touchdowns',
  'rushing_attempts': 'rushing_attempts',
  'passing_yards': 'passing_yards',
  'passing_touchdowns': 'passing_touchdowns',
  'passing_completions': 'passing_completions',
  'passing_attempts': 'passing_attempts',
  'passing_interceptions': 'passing_interceptions',
  'receiving_yards': 'receiving_yards',
  'receiving_touchdowns': 'receiving_touchdowns',
  'receiving_receptions': 'receiving_receptions',
  'receiving_targets': 'receiving_targets',
  
  // General stats
  'touchdowns': 'touchdowns',
  'points': 'points',
  'turnovers': 'turnovers',
  'fumbles': 'fumbles',
  'fumbles_lost': 'fumbles_lost',
  'fantasyscore': 'fantasy_score',
  
  // NBA stats
  'assists': 'assists',
  'rebounds': 'rebounds',
  'steals': 'steals',
  'blocks': 'blocks',
  'three_pointers': 'three_pointers',
  'field_goals': 'field_goals',
  'free_throws': 'free_throws',
  
  // MLB stats
  'hits': 'hits',
  'runs': 'runs',
  'rbi': 'rbi',
  'home_runs': 'home_runs',
  'strikeouts': 'strikeouts',
  'walks': 'walks',
  'innings_pitched': 'innings_pitched',
  
  // NHL stats
  'goals': 'goals',
  'saves': 'saves',
  'shots': 'shots',
  'plus_minus': 'plus_minus'
};

/**
 * Normalizes a raw prop type to its canonical form
 * @param rawPropType - The raw prop type from the API
 * @returns The canonical prop type for consistent matching
 */
export function normalizePropType(rawPropType: string): string {
  if (!rawPropType) return 'unknown';
  
  // First try exact match
  const exactMatch = CANONICAL_PROP_TYPE_MAP[rawPropType];
  if (exactMatch) {
    return exactMatch;
  }
  
  // Try case-insensitive match
  const lowerKey = rawPropType.toLowerCase();
  for (const [key, value] of Object.entries(CANONICAL_PROP_TYPE_MAP)) {
    if (key.toLowerCase() === lowerKey) {
      return value;
    }
  }
  
  // Try partial matching for common patterns
  if (lowerKey.includes('tackle')) return 'tackles';
  if (lowerKey.includes('interception')) return 'interceptions';
  if (lowerKey.includes('rushing')) return 'rushing_yards';
  if (lowerKey.includes('passing')) return 'passing_yards';
  if (lowerKey.includes('receiving')) return 'receiving_yards';
  if (lowerKey.includes('touchdown')) return 'touchdowns';
  if (lowerKey.includes('sack')) return 'sacks';
  if (lowerKey.includes('fumble')) return 'fumbles';
  
  // Default: return normalized version
  return rawPropType.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

/**
 * Gets all canonical prop types
 * @returns Array of all canonical prop types
 */
export function getAllCanonicalPropTypes(): string[] {
  return Array.from(new Set(Object.values(CANONICAL_PROP_TYPE_MAP)));
}

/**
 * Checks if a prop type is canonical
 * @param propType - The prop type to check
 * @returns True if the prop type is canonical
 */
export function isCanonicalPropType(propType: string): boolean {
  return getAllCanonicalPropTypes().includes(propType);
}

/**
 * Gets the mapping for debugging
 * @returns The complete canonical prop type mapping
 */
export function getPropTypeMapping(): Record<string, string> {
  return { ...CANONICAL_PROP_TYPE_MAP };
}
