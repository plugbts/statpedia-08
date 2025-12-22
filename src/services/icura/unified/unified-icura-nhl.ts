import type { IcuraUnifiedGamePackage } from "./types";
import { fetchNhlSchedule, buildNhlApiGamePackage } from "./providers/nhl-web-api";
import { computeMoneyPuckXgForEvents, MONEYPUCK_XG_MODEL } from "./providers/moneypuck";
import { fetchMoneyPuckShotsForGameFromDb } from "./providers/moneypuck-db";

/**
 * Unified Icura NHL day fetch:
 * - NHL API: schedule + boxscore + play-by-play (events)
 * - MoneyPuck: xG layer (currently heuristic; will be upgraded)
 * - NHL Edge: tracking (adapter exists; attach later)
 */
export async function fetchIcuraUnifiedNhlDay(dateISO: string): Promise<IcuraUnifiedGamePackage[]> {
  const games = await fetchNhlSchedule(dateISO);

  const packages = await Promise.all(
    games
      .filter((g) => g.gameId && g.homeTeamAbbr && g.awayTeamAbbr)
      .map(async (game) => {
        const base = await buildNhlApiGamePackage(game);

        // Real MoneyPuck xG: loaded from DB-ingested MoneyPuck shots and matched to NHL events.
        const mpShots = await fetchMoneyPuckShotsForGameFromDb(game.gameId);
        const mp = computeMoneyPuckXgForEvents(base.events, mpShots);
        const moneyPuckXg = mp.xgValues;
        const hasMp = moneyPuckXg.length > 0;

        const pkg: IcuraUnifiedGamePackage = {
          game,
          teams: [
            { league: "NHL", teamAbbr: game.homeTeamAbbr },
            { league: "NHL", teamAbbr: game.awayTeamAbbr },
          ],
          events: base.events,
          xg: [
            {
              model: MONEYPUCK_XG_MODEL,
              eventValues: moneyPuckXg,
            },
          ],
          goalieMetrics: base.goalieMetrics,
          lineCombos: base.lineCombos,
          sourcesUsed: hasMp ? ["nhl_api", "moneypuck"] : ["nhl_api"],
          debug: {
            note: "Unified Icura day package. NHL Edge tracking will be attached next.",
            eventsCount: base.events.length,
            xgCount: moneyPuckXg.length,
            moneyPuckMatched: (mp.matched || []).length,
            moneyPuckUnmatchedEvents: (mp.unmatchedEvents || []).length,
          },
        };

        return pkg;
      }),
  );

  return packages;
}
