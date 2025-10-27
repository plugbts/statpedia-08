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
  'singles': 'singles',
  'doubles': 'doubles',
  'triples': 'triples',
  'runs': 'runs',
  'rbi': 'rbi',
  'rbis': 'rbi',
  'runs_batted_in': 'rbi',
  'home_runs': 'home_runs',
  'strikeouts': 'strikeouts',
  'walks': 'walks',
  'stolen_bases': 'stolen_bases',
  'total_bases': 'total_bases',
  'innings_pitched': 'innings_pitched',
  'hits_allowed': 'hits_allowed',
  'earned_runs': 'earned_runs',
  'outs_recorded': 'outs_recorded',
  
  // MLB batting variations
  'batting_hits': 'hits',
  'batting_singles': 'singles',
  'batting_doubles': 'doubles',
  'batting_triples': 'triples',
  'batting_homeruns': 'home_runs',
  'batting_home_runs': 'home_runs',
  'batting_rbis': 'rbi',
  'batting_rbi': 'rbi',
  'batting_runs': 'runs',
  'batting_walks': 'walks',
  'batting_basesonballs': 'walks',
  'batting_stolenbases': 'stolen_bases',
  'batting_stolen_bases': 'stolen_bases',
  'batting_strikeouts': 'strikeouts',
  
  // MLB pitching variations
  'pitching_strikeouts': 'strikeouts',
  'pitcher_strikeouts': 'strikeouts',
  'pitching_outs': 'outs_recorded',
  'pitcher_outs': 'outs_recorded',
  'pitching_earnedruns': 'earned_runs',
  'pitching_hitsallowed': 'hits_allowed',
  'pitching_walks': 'walks',
  'pitcher_walks': 'walks',
  'pitching_innings': 'innings_pitched',
  
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
  // NFL patterns
  if (lowerKey.includes('tackle')) return 'tackles';
  if (lowerKey.includes('interception')) return 'interceptions';
  if (lowerKey.includes('rushing')) return 'rushing_yards';
  if (lowerKey.includes('passing')) return 'passing_yards';
  if (lowerKey.includes('receiving')) return 'receiving_yards';
  if (lowerKey.includes('touchdown')) return 'touchdowns';
  if (lowerKey.includes('sack')) return 'sacks';
  if (lowerKey.includes('fumble')) return 'fumbles';
  
  // MLB batting patterns
  if (lowerKey.includes('batting') && lowerKey.includes('single')) return 'singles';
  if (lowerKey.includes('batting') && lowerKey.includes('double')) return 'doubles';
  if (lowerKey.includes('batting') && lowerKey.includes('triple')) return 'triples';
  if (lowerKey.includes('batting') && lowerKey.includes('hit')) return 'hits';
  if (lowerKey.includes('batting') && (lowerKey.includes('homerun') || lowerKey.includes('home_run') || lowerKey.includes('home run'))) return 'home_runs';
  if (lowerKey.includes('batting') && lowerKey.includes('rbi')) return 'rbi';
  if (lowerKey.includes('batting') && lowerKey.includes('run') && !lowerKey.includes('rbi')) return 'runs';
  if (lowerKey.includes('batting') && (lowerKey.includes('walk') || lowerKey.includes('basesonballs') || lowerKey.includes('bases on balls'))) return 'walks';
  if (lowerKey.includes('batting') && (lowerKey.includes('stolenbase') || lowerKey.includes('stolen_base') || lowerKey.includes('stolen base'))) return 'stolen_bases';
  if (lowerKey.includes('batting') && lowerKey.includes('strikeout')) return 'strikeouts';
  if (lowerKey.includes('total') && lowerKey.includes('base')) return 'total_bases';
  
  // MLB pitching patterns
  if (lowerKey.includes('pitcher') || lowerKey.includes('pitching')) {
    if (lowerKey.includes('strikeout')) return 'strikeouts';
    if (lowerKey.includes('out') || lowerKey.includes('outs')) return 'outs_recorded';
    if (lowerKey.includes('earned') && lowerKey.includes('run')) return 'earned_runs';
    if (lowerKey.includes('hits') && lowerKey.includes('allow')) return 'hits_allowed';
    if (lowerKey.includes('walk')) return 'walks';
    if (lowerKey.includes('inning')) return 'innings_pitched';
  }
  
  // Generic MLB patterns (standalone, no prefix)
  if (lowerKey === 'singles' || lowerKey === 'single') return 'singles';
  if (lowerKey === 'doubles' || lowerKey === 'double') return 'doubles';
  if (lowerKey === 'triples' || lowerKey === 'triple') return 'triples';
  if (lowerKey === 'hits' || lowerKey === 'hit') return 'hits';
  if (lowerKey === 'home_runs' || lowerKey === 'homeruns' || lowerKey === 'home runs' || lowerKey === 'hr') return 'home_runs';
  if (lowerKey === 'rbis' || lowerKey === 'rbi') return 'rbi';
  if (lowerKey === 'runs' || lowerKey === 'run') return 'runs';
  if (lowerKey === 'walks' || lowerKey === 'walk' || lowerKey === 'bb') return 'walks';
  if (lowerKey === 'stolen_bases' || lowerKey === 'stolenbases' || lowerKey === 'stolen bases' || lowerKey === 'sb') return 'stolen_bases';
  
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
