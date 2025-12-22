import type { IcuraEvent, IcuraGame, IcuraUnifiedGamePackage, StrengthState } from "../types";

const NHL_WEB_BASE = "https://api-web.nhle.com/v1";

function withHeaders(init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Statpedia-Icura/1.0)",
      Accept: "application/json, text/plain, */*",
      Referer: "https://www.nhl.com/",
      Origin: "https://www.nhl.com",
      ...(init?.headers || {}),
    },
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, withHeaders());
  if (!res.ok) throw new Error(`NHL web API ${res.status} for ${url}`);
  return (await res.json()) as T;
}

/**
 * NHL web schedule: `GET /v1/schedule/{YYYY-MM-DD}`
 * We support both shapes seen in repo scripts:
 * - scheduleData.gameWeek[0].games[]
 * - scheduleData.dates[0].games[] (legacy)
 */
export async function fetchNhlSchedule(dateISO: string): Promise<IcuraGame[]> {
  const url = `${NHL_WEB_BASE}/schedule/${dateISO}`;
  const data: any = await fetchJson<any>(url);

  const games: any[] = data?.gameWeek?.[0]?.games || data?.dates?.[0]?.games || data?.games || [];

  return (games || []).map((g: any) => {
    const homeAbbr = g?.homeTeam?.abbrev || g?.teams?.home?.team?.abbreviation || "";
    const awayAbbr = g?.awayTeam?.abbrev || g?.teams?.away?.team?.abbreviation || "";
    const gameId = String(g?.id || g?.gamePk || g?.gameId || "");
    const startTimeISO = String(g?.startTimeUTC || g?.gameDate || g?.startTime || "");

    return {
      league: "NHL",
      gameId,
      dateISO,
      startTimeISO: startTimeISO || undefined,
      homeTeamAbbr: String(homeAbbr || "").toUpperCase(),
      awayTeamAbbr: String(awayAbbr || "").toUpperCase(),
      status: g?.gameState || g?.status?.detailedState || g?.status || undefined,
      venue: g?.venue?.default || g?.venue?.name || undefined,
      externalIds: {
        nhl_game_id: gameId,
      },
    } satisfies IcuraGame;
  });
}

/**
 * NHL boxscore: `GET /v1/gamecenter/{gameId}/boxscore`
 * Used for goalie metrics + line combos (when available).
 */
export async function fetchNhlBoxscore(gameId: string): Promise<any> {
  return await fetchJson<any>(`${NHL_WEB_BASE}/gamecenter/${gameId}/boxscore`);
}

/**
 * NHL play-by-play: `GET /v1/gamecenter/{gameId}/play-by-play`
 * NOTE: Response shape varies over time; we normalize safely.
 */
export async function fetchNhlPlayByPlay(gameId: string): Promise<any> {
  return await fetchJson<any>(`${NHL_WEB_BASE}/gamecenter/${gameId}/play-by-play`);
}

function normalizeStrength(raw?: string): StrengthState | undefined {
  const s = String(raw || "").toLowerCase();
  if (!s) return undefined;
  if (s.includes("5v5")) return "5v5";
  if (s.includes("pp") || s.includes("power")) return "pp";
  if (s.includes("pk") || s.includes("short")) return "pk";
  if (s.includes("4v4")) return "4v4";
  if (s.includes("3v3")) return "3v3";
  return "other";
}

/**
 * Convert NHL play-by-play into canonical Icura events (shots/goals/penalties).
 * This is intentionally defensive: it handles unknown payloads without crashing.
 */
export function normalizeNhlPlayByPlayToEvents(gameId: string, pbp: any): IcuraEvent[] {
  const plays: any[] =
    pbp?.plays || pbp?.gameEvents || pbp?.liveData?.plays?.allPlays || pbp?.allPlays || [];

  return (plays || []).map((p: any, idx: number) => {
    const type = String(
      p?.typeDescKey || p?.result?.eventTypeId || p?.type || p?.eventType || "other",
    ).toLowerCase();

    const eventType: IcuraEvent["eventType"] =
      // Check for exact "goal" type (not "shot-on-goal" or "goal-saved")
      type === "goal" || p?.details?.isGoal === true
        ? "goal"
        : type.includes("shot")
          ? "shot"
          : type.includes("penalty")
            ? "penalty"
            : "other";

    const period = Number(p?.periodDescriptor?.number || p?.about?.period);
    const timeInPeriod = String(p?.timeInPeriod || p?.about?.periodTime || "");
    const periodTimeSeconds = (() => {
      const m = timeInPeriod.match(/^(\d+):(\d+)$/);
      if (!m) return undefined;
      return Number(m[1]) * 60 + Number(m[2]);
    })();

    const gameTimeSeconds =
      typeof period === "number" && typeof periodTimeSeconds === "number"
        ? (period - 1) * 20 * 60 + periodTimeSeconds
        : undefined;

    const teamAbbr =
      p?.details?.eventOwnerTeamAbbrev || p?.team?.triCode || p?.team?.abbreviation || undefined;

    const desc = p?.details?.description || p?.result?.description || p?.description || undefined;

    return {
      id: String(p?.eventId || p?.about?.eventIdx || `${gameId}:${idx}`),
      league: "NHL",
      gameId,
      eventType,
      teamAbbr: teamAbbr ? String(teamAbbr).toUpperCase() : undefined,
      period: Number.isFinite(period) ? period : undefined,
      periodTimeSeconds,
      gameTimeSeconds,
      strength: normalizeStrength(p?.details?.strength || p?.result?.strength?.code),
      shotType: p?.details?.shotType || p?.result?.secondaryType || undefined,
      xCoord: typeof p?.details?.xCoord === "number" ? p.details.xCoord : undefined,
      yCoord: typeof p?.details?.yCoord === "number" ? p.details.yCoord : undefined,
      isGoal: eventType === "goal" ? true : (p?.details?.isGoal ?? undefined),
      penaltyMinutes:
        typeof p?.details?.penaltyMinutes === "number" ? p.details.penaltyMinutes : undefined,
      penaltyType: p?.details?.penaltyType || undefined,
      description: desc,
      source: "nhl_api",
      raw: p,
    } satisfies IcuraEvent;
  });
}

/**
 * Build the NHL-API portion of a unified package for a game.
 * xG + Edge enrichment will be attached by higher-level orchestrators.
 */
export async function buildNhlApiGamePackage(
  game: IcuraGame,
): Promise<
  Pick<IcuraUnifiedGamePackage, "game" | "events" | "goalieMetrics" | "lineCombos" | "sourcesUsed">
> {
  const [box, pbp] = await Promise.all([
    fetchNhlBoxscore(game.gameId),
    fetchNhlPlayByPlay(game.gameId),
  ]);

  const events = normalizeNhlPlayByPlayToEvents(game.gameId, pbp);

  // Minimal goalie metrics extraction (defensive; schema differs by endpoint/version)
  const goalieMetrics = (() => {
    const out: any[] = [];

    const homeGoalies = box?.homeTeam?.goalies || box?.homeTeam?.goalieStats || [];
    const awayGoalies = box?.awayTeam?.goalies || box?.awayTeam?.goalieStats || [];

    const pushGoalie = (g: any, teamAbbr?: string, oppAbbr?: string) => {
      const name = g?.name?.default || g?.name || g?.person?.fullName || "Unknown";
      const shots = g?.shotsAgainst ?? g?.shots ?? g?.shotsAgainstTotal;
      const saves = g?.saves ?? undefined;
      const ga = g?.goalsAgainst ?? g?.goalsAgainstTotal;
      const svPct = g?.savePctg ?? g?.savePercentage ?? undefined;
      out.push({
        gameId: game.gameId,
        goalieName: name,
        teamAbbr,
        opponentTeamAbbr: oppAbbr,
        shots: typeof shots === "number" ? shots : undefined,
        saves: typeof saves === "number" ? saves : undefined,
        goalsAgainst: typeof ga === "number" ? ga : undefined,
        savePct: typeof svPct === "number" ? svPct : undefined,
        source: "nhl_api",
        raw: g,
      });
    };

    homeGoalies.forEach((g: any) => pushGoalie(g, game.homeTeamAbbr, game.awayTeamAbbr));
    awayGoalies.forEach((g: any) => pushGoalie(g, game.awayTeamAbbr, game.homeTeamAbbr));

    return out;
  })();

  // Line combos: NHL endpoint support varies; keep as empty if not found.
  const lineCombos: any[] = [];

  return {
    game,
    events,
    goalieMetrics,
    lineCombos,
    sourcesUsed: ["nhl_api"],
  };
}
