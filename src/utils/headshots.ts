/**
 * League-aware player headshot utilities
 * Returns ESPN headshot URLs for supported leagues
 */

export function getPlayerHeadshot(league: string, playerId?: string | number): string | null {
  if (!playerId) return null;
  const id = String(playerId);
  
  switch (league.toLowerCase()) {
    case "nfl": 
      return `https://a.espncdn.com/i/headshots/nfl/players/full/${id}.png`;
    case "nba": 
      return `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`;
    case "mlb": 
      return `https://a.espncdn.com/i/headshots/mlb/players/full/${id}.png`;
    case "nhl": 
      return `https://a.espncdn.com/i/headshots/nhl/players/full/${id}.png`;
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
