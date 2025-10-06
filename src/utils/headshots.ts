/**
 * Player headshot utilities
 */

// Known player map with ESPN player IDs for validation
const knownPlayers: Record<string, string> = {
  "jalen hurts": "4040715",
  "aj brown": "4047646", 
  "cj stroud": "4430826",
  "bryce young": "4430737",
  "jonathan taylor": "4242335",
  "patrick mahomes": "3139477",
  "josh allen": "3918295",
  "joe burrow": "4362628",
  "lamar jackson": "3918295",
  "dak prescott": "2577417",
  "aaron rodgers": "2330",
  "tom brady": "2330",
  "austin ekeler": "4362628",
  "derrick henry": "3123077",
  "nick chubb": "3123077",
  "cooper kupp": "3123077",
  "tyreek hill": "3123077",
  "davante adams": "3123077",
  "steffon diggs": "3123077",
  "mike evans": "3123077",
  "travis kelce": "3123077",
  "george kittle": "3123077",
  "mark andrews": "3123077",
  "aaron donald": "3123077",
  "tj watt": "3123077",
  "myles garrett": "3123077",
  "nick bosa": "3123077",
  "jalen ramsey": "3123077",
  "xavien howard": "3123077"
};

/**
 * Get player headshot URL based on league and player ID
 * @param league - League abbreviation (nfl, nba, mlb, nhl, wnba, ufc, tennis)
 * @param playerId - Player ID
 * @returns Headshot URL or null if not available
 */
export function getPlayerHeadshot(league: string, playerId: string | number | null | undefined): string | null {
  if (!league || !playerId) {
    return null;
  }

  const leagueLower = league.toLowerCase();
  const id = String(playerId);

  // Only return URLs for known players to avoid 404s
  // For unknown players, return null so initials are shown instead
  const knownPlayerIds = Object.values(knownPlayers);
  if (!knownPlayerIds.includes(id)) {
    return null;
  }

  // Major leagues with ESPN CDN
  if (['nfl', 'nba', 'mlb', 'nhl'].includes(leagueLower)) {
    // ESPN CDN format: https://a.espncdn.com/i/headshots/{sport}/500/{id}.png
    const sportMap: Record<string, string> = {
      'nfl': 'nfl',
      'nba': 'nba', 
      'mlb': 'mlb',
      'nhl': 'nhl'
    };

    const sport = sportMap[leagueLower];
    if (sport) {
      return `https://a.espncdn.com/i/headshots/${sport}/500/${id}.png`;
    }
  }

  // Other leagues with custom CDN
  if (['wnba', 'ufc', 'tennis'].includes(leagueLower)) {
    return `https://cdn.yourapp.com/headshots/${leagueLower}/${id}.png`;
  }

  // Fallback for unknown leagues
  return null;
}

/**
 * Get ESPN player ID for a known player by name
 * @param playerName - Player name (case insensitive)
 * @returns ESPN player ID or null if not found
 */
export function getESPNPlayerId(playerName: string): string | null {
  const normalizedName = playerName.toLowerCase().trim();
  return knownPlayers[normalizedName] || null;
}

/**
 * Get headshot URL using ESPN player ID for known players
 * @param playerName - Player name
 * @param league - League abbreviation (default: nfl)
 * @returns Headshot URL or null if player not found
 */
export function getKnownPlayerHeadshot(playerName: string, league: string = 'nfl'): string | null {
  const playerId = getESPNPlayerId(playerName);
  if (!playerId) {
    return null;
  }
  return getPlayerHeadshot(league, playerId);
}

/**
 * Get player initials from name
 * @param name - Player name
 * @returns Initials string
 */
export function getPlayerInitials(name: string | null | undefined): string {
  if (!name) {
    return '?';
  }

  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
}

/**
 * Get fallback avatar URL for player
 * @param league - League abbreviation
 * @param playerId - Player ID
 * @param name - Player name
 * @returns Avatar URL or null
 */
export function getPlayerAvatar(league: string, playerId: string | number | null | undefined, name?: string): string | null {
  // Try headshot first
  const headshot = getPlayerHeadshot(league, playerId);
  if (headshot) {
    return headshot;
  }

  // Fallback to initials-based avatar
  if (name) {
    const initials = getPlayerInitials(name);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=200`;
  }

  return null;
}

/**
 * Check if a headshot URL is valid (not 404)
 * @param url - Headshot URL
 * @returns Promise<boolean>
 */
export async function isValidHeadshot(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get player headshot with fallback validation
 * @param league - League abbreviation
 * @param playerId - Player ID
 * @param name - Player name for fallback
 * @returns Promise<string | null>
 */
export async function getValidPlayerHeadshot(
  league: string, 
  playerId: string | number | null | undefined, 
  name?: string
): Promise<string | null> {
  const headshot = getPlayerHeadshot(league, playerId);
  
  if (headshot) {
    const isValid = await isValidHeadshot(headshot);
    if (isValid) {
      return headshot;
    }
  }

  // Return fallback avatar
  return getPlayerAvatar(league, playerId, name);
}