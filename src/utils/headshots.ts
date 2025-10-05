/**
 * Hybrid league-aware player headshot utilities
 * Returns ESPN CDN URLs for major leagues, custom CDN for others
 */

export function getPlayerHeadshot(league: string, playerId?: string | number): string | null {
  if (!playerId) return null;
  const id = String(playerId);
  const leagueLower = league.toLowerCase();
  
  // Major leagues - use ESPN CDN
  switch (leagueLower) {
    case "nfl": 
      return `https://a.espncdn.com/i/headshots/nfl/players/full/${id}.png`;
    case "nba": 
      return `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`;
    case "mlb": 
      return `https://a.espncdn.com/i/headshots/mlb/players/full/${id}.png`;
    case "nhl": 
      return `https://a.espncdn.com/i/headshots/nhl/players/full/${id}.png`;
    
    // Other leagues - use custom CDN bucket
    case "wnba":
    case "ufc":
    case "tennis":
    case "mma":
    case "boxing":
    case "soccer":
    case "premier league":
    case "la liga":
    case "serie a":
    case "bundesliga":
    case "ligue 1":
    case "champions league":
      return `https://cdn.statpedia.com/headshots/${leagueLower}/${id}.png`;
    
    default: 
      return null;
  }
}

/**
 * Get player initials as fallback when headshot is not available
 */
export function getPlayerInitials(playerName: string): string {
  if (!playerName) return '?';
  
  const words = playerName.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}
