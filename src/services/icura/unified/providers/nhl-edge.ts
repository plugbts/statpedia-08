import type { IcuraGame, IcuraPlayer } from "../types";

/**
 * NHL Edge Stats (tracking/physics) adapter (STANDBY).
 *
 * NHL Edge data availability varies by season and isn’t exposed as a stable public API.
 * We keep this adapter as the “icing on the cake”:
 * - speed / distance / skating bursts
 * - shot speed, release time (where available)
 * - player attributes and tracking-derived features
 *
 * We’ll connect this once you confirm your preferred acquisition method:
 * - official provider feed, partner API, or ingestion from exported datasets.
 */

export interface NhlEdgePlayerAttributes {
  playerName: string;
  teamAbbr?: string;
  // Examples (not exhaustive)
  topSkateSpeedMph?: number;
  avgSkateSpeedMph?: number;
  distanceSkatedMi?: number;
  shotSpeedMph?: number;
  oneTimers?: number;
  rushChances?: number;
  // Extensible container for new tracking metrics
  raw?: Record<string, unknown>;
}

export async function fetchNhlEdgePlayerAttributesForGame(
  _game: IcuraGame,
): Promise<NhlEdgePlayerAttributes[]> {
  // TODO: implement once acquisition path is chosen
  return [];
}

export async function fetchNhlEdgePlayerMaster(_dateISO: string): Promise<IcuraPlayer[]> {
  // TODO: implement once acquisition path is chosen
  return [];
}
