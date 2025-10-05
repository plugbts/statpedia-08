/**
 * Player headshot utilities
 */

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