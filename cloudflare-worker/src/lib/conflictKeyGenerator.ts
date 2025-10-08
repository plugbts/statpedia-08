/**
 * Build a unique conflict key for a performance record.
 * Ensures uniqueness across player, game, prop, sportsbook, league, and season.
 */
export function buildConflictKey({
  playerId,
  gameId,
  propType,
  sportsbook,
  league,
  season,
}: {
  playerId: string;
  gameId: string;
  propType: string;
  sportsbook: string;
  league: string;
  season: number | string;
}): string {
  return [
    playerId,
    gameId,
    propType.trim().toLowerCase().replace(/\s+/g, "_"), // normalize
    sportsbook,
    league,
    season,
  ].join("|");
}
