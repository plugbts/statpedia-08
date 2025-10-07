/**
 * Player ID Normalizer
 * Maps player names to consistent player IDs for analytics
 */

interface PlayerMapping {
  [key: string]: string;
}

// Map of player names to normalized player IDs
const PLAYER_ID_MAPPING: PlayerMapping = {
  // Quarterbacks
  'Patrick Mahomes': 'mahomes-patrick',
  'Josh Allen': 'allen-josh',
  'Lamar Jackson': 'jackson-lamar',
  'Dak Prescott': 'prescott-dak',
  'Aaron Rodgers': 'rodgers-aaron',
  'Tom Brady': 'brady-tom',
  
  // Running Backs
  'Christian McCaffrey': 'mccaffrey-christian',
  'Derrick Henry': 'henry-derrick',
  'Saquon Barkley': 'barkley-saquon',
  'Nick Chubb': 'chubb-nick',
  'Alvin Kamara': 'kamara-alvin',
  
  // Wide Receivers
  'Tyreek Hill': 'hill-tyreek',
  'Davante Adams': 'adams-davante',
  'AJ Brown': 'brown-aj',
  'Stefon Diggs': 'diggs-stefon',
  'Cooper Kupp': 'kupp-cooper',
  'Mike Evans': 'evans-mike',
  
  // Tight Ends
  'Travis Kelce': 'kelce-travis',
  'George Kittle': 'kittle-george',
  'Mark Andrews': 'andrews-mark',
  'Darren Waller': 'waller-darren',
  
  // Kickers
  'Wil Lutz': 'lutz-wil',
  'Justin Tucker': 'tucker-justin',
  'Harrison Butker': 'butker-harrison',
  'Daniel Carlson': 'carlson-daniel'
};

/**
 * Normalize a player name to a consistent player ID
 */
export function normalizePlayerId(playerName: string): string {
  if (!playerName) return 'unknown-player';
  
  // Direct mapping
  if (PLAYER_ID_MAPPING[playerName]) {
    return PLAYER_ID_MAPPING[playerName];
  }
  
  // Fallback: convert to lowercase with hyphens
  return playerName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Get all known player IDs for testing
 */
export function getKnownPlayerIds(): string[] {
  return Object.values(PLAYER_ID_MAPPING);
}

/**
 * Check if a player ID is known (has historical data)
 */
export function isKnownPlayerId(playerId: string): boolean {
  return getKnownPlayerIds().includes(playerId);
}
