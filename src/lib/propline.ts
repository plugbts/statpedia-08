import { OddsResponseSchema, type OddsResponse, type PlayerProp } from "@/types/mlb";
import { TTL_ODDS_SECONDS, withCacheJson } from "@/lib/cache";

const MCP_TIMEOUT_MS = 12_000;

function log(level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>) {
  const line = `[mlb-api/propline] ${msg}`;
  if (level === "error") console.error(line, extra ?? "");
  else if (level === "warn") console.warn(line, extra ?? "");
  else console.info(line, extra ?? "");
}

export function getProplineMcpBaseUrl(): string {
  return (
    process.env.PROPLINE_MCP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_PROPLINE_MCP_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3001"
  );
}

/** SWR-friendly CDN + browser hints when Redis is not configured */
export function swrCacheHeaders(): HeadersInit {
  return {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    "CDN-Cache-Control": "public, s-maxage=300",
    Vary: "Accept",
  };
}

/** Longer CDN hint for stats-heavy payloads */
export function swrStatsCacheHeaders(): HeadersInit {
  return {
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
    "CDN-Cache-Control": "public, s-maxage=3600",
    Vary: "Accept",
  };
}

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
};

function extractMcpToolPayload(body: unknown): unknown {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const result = o.result;
  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    if (Array.isArray(r.content)) {
      for (const block of r.content as { type?: string; text?: string }[]) {
        if (block?.type === "text" && typeof block.text === "string") {
          try {
            return JSON.parse(block.text) as unknown;
          } catch {
            return block.text;
          }
        }
      }
    }
    return r;
  }
  if (Array.isArray(o.content)) {
    for (const block of o.content as { type?: string; text?: string }[]) {
      if (block?.type === "text" && typeof block.text === "string") {
        try {
          return JSON.parse(block.text) as unknown;
        } catch {
          return block.text;
        }
      }
    }
  }
  return o;
}

async function postJsonRpc(baseUrl: string, path: string, req: JsonRpcRequest): Promise<unknown> {
  const url = `${baseUrl}${path}`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), MCP_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
      signal: ac.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`MCP ${url} -> ${res.status}: ${text.slice(0, 200)}`);
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      const lines = text.split("\n").filter(Boolean);
      const lastJson = lines.reverse().find((l) => l.startsWith("{") || l.startsWith("["));
      if (lastJson) return JSON.parse(lastJson) as unknown;
      throw new Error("Non-JSON MCP response");
    }
  } finally {
    clearTimeout(t);
  }
}

export async function mcpToolsCall(
  baseUrl: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const rpc: JsonRpcRequest = {
    jsonrpc: "2.0",
    id: `mlb-${Date.now()}`,
    method: "tools/call",
    params: { name: toolName, arguments: args },
  };
  const paths = ["/mcp", "/message", "/rpc", "/"];
  let lastErr: Error | null = null;
  for (const p of paths) {
    try {
      await new Promise((r) => setTimeout(r, 80));
      const json = await postJsonRpc(baseUrl, p, rpc);
      return extractMcpToolPayload(json);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr ?? new Error("MCP tools/call failed");
}

function toolNamesFromEnv(envKey: string, defaults: string): string[] {
  const raw = process.env[envKey];
  return (raw ?? defaults)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeOddsPayload(raw: unknown): OddsResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  if (Array.isArray(o.props) && Array.isArray(o.books)) {
    const parsed = OddsResponseSchema.safeParse(o);
    return parsed.success ? parsed.data : null;
  }

  const props: PlayerProp[] = [];
  const rows = (o.props as unknown) ?? (o.markets as unknown) ?? (o.lines as unknown) ?? o.data;
  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const market = String(r.market ?? r.stat ?? r.prop ?? "hits");
      const line = Number(r.line ?? r.point ?? r.total ?? 0.5);
      const oddsRaw = (r.odds as Record<string, unknown>) ?? r;
      const odds = {
        dk:
          oddsRaw.dk != null
            ? Number(oddsRaw.dk)
            : oddsRaw.draftkings != null
              ? Number(oddsRaw.draftkings)
              : undefined,
        fd:
          oddsRaw.fd != null
            ? Number(oddsRaw.fd)
            : oddsRaw.fanduel != null
              ? Number(oddsRaw.fanduel)
              : undefined,
        pinny:
          oddsRaw.pinny != null
            ? Number(oddsRaw.pinny)
            : oddsRaw.pinnacle != null
              ? Number(oddsRaw.pinnacle)
              : undefined,
      };
      props.push({ market, line, odds });
    }
  }

  const books = Array.isArray(o.books)
    ? (o.books as string[])
    : ["dk", "fd", "pinny"].filter((k) =>
        props.some((p) => p.odds[k as keyof typeof p.odds] != null),
      );

  const candidate = { props, books: books.length ? books : ["dk", "fd"] };
  const parsed = OddsResponseSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export function fallbackOdds(playerId: string): OddsResponse {
  const isJudge = playerId === "592450";
  return {
    props: isJudge
      ? [
          { market: "hits", line: 0.5, odds: { dk: -110, fd: -115, pinny: -112 } },
          { market: "total_bases", line: 1.5, odds: { dk: -105, fd: -108, pinny: -107 } },
          { market: "home_runs", line: 0.5, odds: { dk: +340, fd: +350, pinny: +345 } },
        ]
      : [
          { market: "hits", line: 0.5, odds: { dk: -108, fd: -110 } },
          { market: "runs_scored", line: 0.5, odds: { fd: +120, dk: +115 } },
        ],
    books: ["dk", "fd", "pinny"],
  };
}

export async function fetchOddsViaMcp(playerId: string): Promise<OddsResponse> {
  const base = getProplineMcpBaseUrl();
  const tools = toolNamesFromEnv(
    "PROPLINE_MCP_TOOL_ODDS",
    "mlb_player_odds,get_player_odds,player_odds,odds_for_player",
  );
  let last: unknown = null;
  for (const tool of tools) {
    try {
      last = await mcpToolsCall(base, tool, { playerId, league: "MLB", sport: "mlb" });
      const norm = normalizeOddsPayload(last);
      if (norm && norm.props.length) return norm;
    } catch (e) {
      log("warn", `odds tool ${tool} failed`, { playerId, err: String(e) });
    }
  }
  const norm = normalizeOddsPayload(last);
  if (norm && norm.props.length) return norm;
  throw new Error("PropLine MCP returned no usable odds");
}

export async function getOddsForPlayer(playerId: string): Promise<OddsResponse> {
  const key = `mlb:odds:${playerId}`;
  return withCacheJson(key, TTL_ODDS_SECONDS, () => fetchOddsViaMcp(playerId));
}
