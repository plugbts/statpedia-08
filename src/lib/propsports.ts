import { mcpToolsCall } from "@/lib/propline";
import { TTL_STATS_SECONDS, withCacheJson } from "@/lib/cache";
import {
  MatchupsResponseSchema,
  SearchResponseSchema,
  StatsResponseSchema,
  type MatchupsResponse,
  type SearchResponse,
  type StatsResponse,
} from "@/types/mlb";

function log(level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>) {
  const line = `[mlb-api/propsports] ${msg}`;
  if (level === "error") console.error(line, extra ?? "");
  else if (level === "warn") console.warn(line, extra ?? "");
  else console.info(line, extra ?? "");
}

export function getPropsportsMcpBaseUrl(): string {
  return (
    process.env.PROPSPORTS_MCP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_PROPSPORTS_MCP_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3002"
  );
}

function toolNamesFromEnv(envKey: string, defaults: string): string[] {
  const raw = process.env[envKey];
  return (raw ?? defaults)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function fallbackStats(_playerId: string): StatsResponse {
  const mk = (d: string, hits: number, hr: number, avg: number, ev: number, barrel: number) => ({
    date: d,
    hits,
    hr,
    avg,
    ev,
    barrel_pct: barrel,
  });
  const l5 = [
    mk("2025-05-01", 2, 0, 0.31, 91.2, 14.2),
    mk("2025-05-03", 1, 1, 0.29, 96.4, 18.1),
    mk("2025-05-05", 0, 0, 0.28, 88.0, 9.5),
    mk("2025-05-07", 3, 0, 0.3, 94.1, 16.0),
    mk("2025-05-10", 2, 0, 0.305, 93.5, 12.3),
  ];
  const l20 = [...l5, ...l5, ...l5, ...l5].slice(0, 20).map((r, i) => ({
    ...r,
    date: `2025-04-${String(15 + i).padStart(2, "0")}`,
  }));
  return {
    l5,
    l20,
    statcast: { exit_velo: 95.2, barrel_pct: 12.3, hard_hit_pct: 48.7 },
  };
}

export function fallbackMatchups(_playerId: string): MatchupsResponse {
  return {
    vs_pitcher: [
      { pitcher_id: "571510", pitcher_name: "Sample Ace", pa: 24, avg: 0.292, ops: 0.881 },
      { pitcher_id: "607259", pitcher_name: "Sample Reliever", pa: 8, avg: 0.25, ops: 0.71 },
    ],
    career: { games: 812, avg: 0.284, ops: 0.915 },
  };
}

export function fallbackSearch(q: string): SearchResponse {
  const ql = q.toLowerCase();
  if (ql.includes("judge")) {
    return {
      players: [
        { id: "592450", name: "Aaron Judge", team: "NYY", position: "RF" },
        { id: "502671", name: "Ryan Judge", team: "FA", position: "P" },
      ],
    };
  }
  return {
    players: [{ id: "000000", name: `No live hits for "${q}"`, team: "—", position: "—" }],
  };
}

async function tryTools(
  base: string,
  tools: string[],
  args: Record<string, unknown>,
): Promise<unknown> {
  let last: unknown = null;
  for (const tool of tools) {
    try {
      last = await mcpToolsCall(base, tool, args);
      if (last != null) return last;
    } catch (e) {
      log("warn", `tool ${tool} failed`, { err: String(e) });
    }
  }
  return last;
}

export async function fetchStatsViaMcp(playerId: string): Promise<StatsResponse> {
  const base = getPropsportsMcpBaseUrl();
  const tools = toolNamesFromEnv(
    "PROPSPORTS_MCP_TOOL_STATS",
    "mlb_batter_stats,player_statcast_last_n,batter_statcast,stats_last_games",
  );
  const raw = await tryTools(base, tools, { playerId, league: "MLB", windows: [5, 20] });
  const parsed = StatsResponseSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const merged = {
      l5: o.l5 ?? o.last5 ?? [],
      l20: o.l20 ?? o.last20 ?? [],
      statcast: o.statcast ?? o.statCast ?? o.statcast_summary ?? fallbackStats(playerId).statcast,
    };
    const p2 = StatsResponseSchema.safeParse(merged);
    if (p2.success) return p2.data;
  }
  throw new Error("PropSports MCP returned no usable stats");
}

export async function getStatsForPlayer(playerId: string): Promise<StatsResponse> {
  const key = `mlb:stats:${playerId}`;
  return withCacheJson(key, TTL_STATS_SECONDS, () => fetchStatsViaMcp(playerId));
}

export async function fetchMatchupsViaMcp(playerId: string): Promise<MatchupsResponse> {
  const base = getPropsportsMcpBaseUrl();
  const tools = toolNamesFromEnv(
    "PROPSPORTS_MCP_TOOL_MATCHUPS",
    "mlb_matchups,player_vs_pitcher,h2h_batter_pitcher,career_split",
  );
  const raw = await tryTools(base, tools, { playerId, league: "MLB" });
  const parsed = MatchupsResponseSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const merged = {
      vs_pitcher: o.vs_pitcher ?? o.vsPitcher ?? o.matchups ?? [],
      career: o.career ?? o.career_stats ?? {},
    };
    const p2 = MatchupsResponseSchema.safeParse(merged);
    if (p2.success) return p2.data;
  }
  throw new Error("PropSports MCP returned no usable matchups");
}

export async function getMatchupsForPlayer(playerId: string): Promise<MatchupsResponse> {
  const key = `mlb:matchups:${playerId}`;
  return withCacheJson(key, TTL_STATS_SECONDS, () => fetchMatchupsViaMcp(playerId));
}

export async function fetchSearchViaMcp(q: string): Promise<SearchResponse> {
  const base = getPropsportsMcpBaseUrl();
  const tools = toolNamesFromEnv(
    "PROPSPORTS_MCP_TOOL_SEARCH",
    "mlb_player_search,search_players,player_lookup",
  );
  const raw = await tryTools(base, tools, { q, query: q, league: "MLB" });
  const parsed = SearchResponseSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const players = o.players ?? o.results ?? o.data;
    const p2 = SearchResponseSchema.safeParse({ players });
    if (p2.success) return p2.data;
  }
  throw new Error("PropSports MCP returned no search results");
}

export async function searchPlayersCached(q: string): Promise<SearchResponse> {
  const key = `mlb:search:${q.toLowerCase()}`;
  return withCacheJson(key, TTL_STATS_SECONDS, () => fetchSearchViaMcp(q));
}
