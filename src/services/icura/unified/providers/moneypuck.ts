import type { IcuraEvent, IcuraXgEventValue, IcuraXgModelMeta } from "../types";

/**
 * MoneyPuck integration notes:
 * - MoneyPuck is the best “predictive analytics” layer, but it’s not a clean public JSON API.
 * - We treat it as an xG model provider and (later) a team/goalie prior provider.
 * - This adapter is designed so we can plug in:
 *   - downloaded datasets (CSV/Parquet) via R2/FS
 *   - or a server-side fetcher if we formalize endpoints later
 */

export const MONEYPUCK_XG_MODEL: IcuraXgModelMeta = {
  name: "moneypuck",
  version: "dataset_or_db",
};

/**
 * Match MoneyPuck shot rows to NHL events and attach:
 * - xG values
 * - rush/high-danger/rebound flags (into event.attributes when persisting)
 *
 * This function expects MoneyPuck shot rows already available for the game.
 */
export type MoneyPuckShotRow = {
  period: number | null;
  period_time_seconds: number | null;
  game_time_seconds: number | null;
  team_abbr: string | null;
  shooter_name: string | null;
  x_coord: number | null;
  y_coord: number | null;
  xg: number | null;
  is_goal: boolean | null;
  is_rush: boolean | null;
  is_high_danger: boolean | null;
  is_rebound: boolean | null;
};

function normName(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function computeMoneyPuckXgForEvents(
  events: IcuraEvent[],
  mpShots: MoneyPuckShotRow[],
): {
  xgValues: IcuraXgEventValue[];
  matched: Array<{ eventId: string; shot: MoneyPuckShotRow }>;
  unmatchedEvents: string[];
} {
  const vals: IcuraXgEventValue[] = [];
  const matched: Array<{ eventId: string; shot: MoneyPuckShotRow }> = [];
  const unmatchedEvents: string[] = [];

  const mpByKey = mpShots.slice();

  for (const e of events) {
    if (e.eventType !== "shot" && e.eventType !== "goal") continue;
    if (typeof e.period !== "number" || typeof e.periodTimeSeconds !== "number") {
      unmatchedEvents.push(e.id);
      continue;
    }

    const team = e.teamAbbr ? e.teamAbbr.toUpperCase() : null;
    const shooter = e.shooterName ? normName(e.shooterName) : null;

    // Candidate shots: same period, within 2 seconds
    const candidates = mpByKey.filter((s) => {
      if (s.period !== e.period) return false;
      if (s.period_time_seconds === null) return false;
      if (Math.abs(s.period_time_seconds - e.periodTimeSeconds) > 2) return false;
      if (team && s.team_abbr && s.team_abbr.toUpperCase() !== team) return false;
      if (shooter && s.shooter_name && !normName(s.shooter_name).includes(shooter)) return false;
      return true;
    });

    const best = (() => {
      if (!candidates.length) return null;
      if (typeof e.xCoord === "number" && typeof e.yCoord === "number") {
        let bestC = candidates[0];
        let bestD = Number.POSITIVE_INFINITY;
        for (const c of candidates) {
          if (typeof c.x_coord !== "number" || typeof c.y_coord !== "number") continue;
          const d = dist2(e.xCoord, e.yCoord, c.x_coord, c.y_coord);
          if (d < bestD) {
            bestD = d;
            bestC = c;
          }
        }
        return bestC;
      }
      return candidates[0];
    })();

    if (!best || best.xg === null || !Number.isFinite(best.xg)) {
      unmatchedEvents.push(e.id);
      continue;
    }

    matched.push({ eventId: e.id, shot: best });
    vals.push({
      eventId: e.id,
      model: MONEYPUCK_XG_MODEL,
      xg: Number(best.xg),
      source: "moneypuck",
      raw: {
        is_rush: best.is_rush,
        is_high_danger: best.is_high_danger,
        is_rebound: best.is_rebound,
      },
    });
  }

  return { xgValues: vals, matched, unmatchedEvents };
}
