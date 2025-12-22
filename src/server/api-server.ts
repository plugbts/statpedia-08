#!/usr/bin/env tsx

/**
 * Local API Server for Development
 *
 * This server serves the auth API routes locally for development
 * since this is a Vite app, not Next.js
 */

import express from "express";
import cors from "cors";
import { config } from "dotenv";

// Load environment variables: first default .env, then override with .env.local if present
config();
config({ path: ".env.local" });

// Import auth service
import { authService } from "../lib/auth/auth-service";
import { canAccessFeature } from "../lib/auth/access";

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://localhost:8081",
      "http://localhost:8082",
      "http://localhost:8083",
      "http://localhost:8084",
      "http://localhost:8085",
      "http://localhost:8086",
      "http://localhost:8087",
      "http://localhost:8088",
      "http://localhost:8089",
      // Vite dev server (default)
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    credentials: true,
  }),
);
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Lightweight diagnostics: preview normalized props from SGO
app.get("/api/diagnostics/props", async (req, res) => {
  try {
    const sport = String(req.query.sport || "nfl").toLowerCase();
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 10)));
    const rows = await fetchNormalizedPlayerProps(sport, limit);
    res.json({
      sport,
      count: rows.length,
      sample: rows.slice(0, Math.min(10, rows.length)),
      ts: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "diagnostics failed" });
  }
});

// --- Minimal SGO normalization helpers (inline to avoid new files) ---
type NormalizedOffer = {
  book: string;
  overOdds?: number | null;
  underOdds?: number | null;
  deeplink?: string;
  lastUpdated?: string;
};

type NormalizedProp = {
  id: string;
  sport: string;
  gameId: string;
  startTime?: string;
  playerId?: string;
  playerName?: string;
  // Internal resolved UUID for analytics/log lookups
  player_uuid?: string;
  position?: string | null;
  team?: string;
  opponent?: string;
  // Raw SGO stat identifier (useful for debugging propType mismatches)
  statId?: string;
  propType: string;
  line: number;
  period?: string;
  offers: NormalizedOffer[];
  best_over?: {
    book: string;
    odds: number;
    decimal: number;
    edgePct?: number;
    deeplink?: string;
  } | null;
  best_under?: {
    book: string;
    odds: number;
    decimal: number;
    edgePct?: number;
    deeplink?: string;
  } | null;
  // Analytics fields (optional; enriched from DB when available)
  l5?: number | null;
  l10?: number | null;
  l20?: number | null;
  // Optional window metadata to avoid misleading "4/20" when only 4 games exist
  l5_hits?: number | null;
  l5_total?: number | null;
  l10_hits?: number | null;
  l10_total?: number | null;
  l20_hits?: number | null;
  l20_total?: number | null;
  h2h_avg?: number | null;
  season_avg?: number | null;
  matchup_rank?: number | null;
  ev_percent?: number | null;
  current_streak?: number | null;
  streak_l5?: number | null;
  rating?: number | null;
};

function normalizeNflPosition(raw: any): string | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  const up = s.toUpperCase();
  // Already abbreviated
  if (["QB", "RB", "WR", "TE", "K", "DST", "DEF", "FB"].includes(up))
    return up === "DEF" ? "DST" : up;
  const map: Record<string, string> = {
    QUARTERBACK: "QB",
    RUNNINGBACK: "RB",
    "RUNNING BACK": "RB",
    WIDERECEIVER: "WR",
    "WIDE RECEIVER": "WR",
    TIGHTEND: "TE",
    "TIGHT END": "TE",
    KICKER: "K",
    DEFENSE: "DST",
    "D/ST": "DST",
    DST: "DST",
    FULLBACK: "FB",
  };
  return map[up.replace(/\./g, "").replace(/\s+/g, " ").trim()] || null;
}

// Title-case a player's name robustly (handles spaces, hyphens, and apostrophes)
function formatName(raw: string): string {
  if (!raw) return raw;
  const base = String(raw).replace(/_/g, " ").trim().toLowerCase();
  let titled = base.replace(/(?:^|[\s'\-])(\p{L})/gu, (m) => m.toUpperCase());
  // Uppercase common suffixes and roman numerals
  titled = titled.replace(/\b(jr|sr)\b/gi, (m) => m.toUpperCase());
  titled = titled.replace(/\b(ii|iii|iv|v)\b/gi, (m) => m.toUpperCase());
  return titled;
}

function toDecimal(american: number | null | undefined): number | null {
  if (american === null || american === undefined) return null;
  const o = Number(american);
  if (!Number.isFinite(o) || o === 0) return null;
  return o > 0 ? 1 + o / 100 : 1 + 100 / Math.abs(o);
}

function isValidAmericanOdds(odds: unknown): odds is number {
  const n = Number(odds);
  if (!Number.isFinite(n)) return false;
  if (n === 0) return false;
  // Guard against wild lines
  return Math.abs(n) <= 2000;
}

function computeBest(offers: NormalizedOffer[], side: "over" | "under") {
  let best: { book: string; odds: number; decimal: number; deeplink?: string } | null = null;
  for (const offer of offers) {
    const odds = side === "over" ? offer.overOdds : offer.underOdds;
    if (!isValidAmericanOdds(odds)) continue;
    const dec = toDecimal(odds);
    if (dec && odds !== null && odds !== undefined) {
      if (!best || dec > best.decimal) {
        best = { book: offer.book, odds, decimal: dec, deeplink: offer.deeplink };
      }
    }
  }
  if (!best) return null;
  const decimals: number[] = offers
    .map((o) => {
      const raw = side === "over" ? o.overOdds : o.underOdds;
      if (!isValidAmericanOdds(raw)) return null;
      return toDecimal(raw ?? null);
    })
    .filter((d): d is number => !!d);
  if (decimals.length >= 2) {
    const avg = decimals.reduce((a, b) => a + b, 0) / decimals.length;
    const edgePct = ((best.decimal - avg) / avg) * 100;
    return { ...best, edgePct };
  }
  return best;
}

// Simple in-memory cache
const sgoCache = new Map<string, { data: NormalizedProp[]; ts: number }>();
const SGO_TTL_MS = 30 * 1000;

function buildUrl(base: string, params: Record<string, string | number | boolean | undefined>) {
  const u = new URL(base);
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .forEach(([k, v]) => u.searchParams.set(k, String(v)));
  return u.toString();
}

function mapSportToLeagueId(sport: string): string | undefined {
  const s = sport.toLowerCase();
  const map: Record<string, string> = {
    nfl: "NFL",
    nba: "NBA",
    mlb: "MLB",
    nhl: "NHL",
    wnba: "WNBA",
    cbb: "CBB",
  };
  return map[s];
}

function parsePlayerNameFromId(playerId: string): string {
  // Common SGO format: FIRST_LAST_1_NFL -> "FIRST LAST"
  const raw = playerId.replace(/_\d+_[A-Z]+$/, "").replace(/_/g, " ");
  return formatName(raw);
}

function normalizeStatId(statId?: string | null): string {
  if (!statId) return "Unknown";
  // Normalize to snake for matching
  const k = String(statId)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const map: Record<string, string> = {
    passing_yards: "Passing Yards",
    passing_attempts: "Passing Attempts",
    passing_completions: "Passing Completions",
    passing_interceptions: "Passing Interceptions",
    rushing_yards: "Rushing Yards",
    receiving_yards: "Receiving Yards",
    receiving_receptions: "Receptions",
    receiving_targets: "Receiving Targets",
    receiving_longestreception: "Longest Reception",
    rushing_longestrush: "Longest Rush",
    passing_longestcompletion: "Longest Completion",
    rushing_attempts: "Rushing Attempts",
    passing_touchdowns: "Passing TDs",
    rushing_touchdowns: "Rushing TDs",
    receiving_touchdowns: "Receiving TDs",
    points: "Points",
    assists: "Assists",
    rebounds: "Rebounds",
    shots_on_goal: "Shots on Goal",
    saves: "Saves",
    batting_totalbases: "Total Bases",
    // Correct MLB walks synonyms
    bases_on_balls: "Walks",
    base_on_balls: "Walks",
    basesonballs: "Walks",
    batting_basesonballs: "Walks",
    walks: "Walks",
    batting_homeruns: "Home Runs",
    batting_hits: "Hits",
    batting_doubles: "Doubles",
    batting_singles: "Singles",
    batting_triples: "Triples",
    batting_rbi: "RBIs",
    batting_hits_runs_rbi: "Hits + Runs + RBIs",
    pitching_strikeouts: "Pitcher Strikeouts",
    pitching_outs: "Innings Pitched",
    pitching_hits: "Hits Allowed",
    shots_ongoal: "Shots on Goal",
    goals_assists: "Goals + Assists",
    powerplay_goals_assists: "Power Play Goals + Assists",
    minutesplayed: "Minutes Played",
    defense_combinedtackles: "Tackles",
    defense_solo_tackles: "Solo Tackles",
    defense_assisted_tackles: "Assisted Tackles",
  };
  return map[k] || k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchNormalizedPlayerProps(sport: string, limit = 200): Promise<NormalizedProp[]> {
  const key = `${sport}:${limit}`;
  const now = Date.now();
  const hit = sgoCache.get(key);
  if (hit && now - hit.ts < SGO_TTL_MS) return hit.data;

  const apiKey = process.env.SPORTSGAMEODDS_API_KEY;
  // Only use fake props when explicitly enabled; do not auto-fallback just because we're in dev
  const useDevFallback = process.env.DEV_FAKE_PROPS === "1";
  if (!apiKey) {
    console.warn("[SGO] SPORTSGAMEODDS_API_KEY not set");
    if (useDevFallback) {
      const fake = generateFakeProps(sport, limit);
      sgoCache.set(key, { data: fake, ts: now });
      return fake;
    }
    return [];
  }

  // Build v2/events request
  const leagueID = mapSportToLeagueId(sport) || sport.toUpperCase();
  let events: any[] = [];
  try {
    // Respect SGO API constraint: limit must be <= 100
    const MAX_SGO_LIMIT = Number(process.env.SGO_MAX_LIMIT || 100);
    const effectiveLimit = Math.min(Math.max(1, limit), MAX_SGO_LIMIT);
    const url = buildUrl("https://api.sportsgameodds.com/v2/events/", {
      apiKey,
      leagueID,
      oddsAvailable: true,
      oddsType: "playerprops",
      limit: effectiveLimit,
    });
    const resp = await fetch(url); // Only use query param, no extra headers
    if (!resp.ok) {
      const text = await (resp as any).text?.().catch(() => "");
      if (resp.status === 403 && /inactive api key/i.test(text)) {
        console.error(
          "[SGO] API key appears inactive. Please verify your subscription/status in the SGO dashboard.",
        );
      }
      throw new Error(`SportsGameOdds API error ${resp.status}: ${text || resp.statusText}`);
    }
    const json: any = await (resp as any).json?.();
    events = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
  } catch (err) {
    console.warn("[SGO] v2/events fetch failed:", (err as Error)?.message || err);
    if (useDevFallback) {
      const fake = generateFakeProps(sport, limit);
      sgoCache.set(key, { data: fake, ts: now });
      return fake;
    }
    // No implicit fake props in dev; surface empty array so callers can handle gracefully
    return [];
  }

  // Normalize events -> props with per-sportsbook offers (from byBookmaker)
  type AccumVal = {
    base: Omit<NormalizedProp, "offers" | "best_over" | "best_under">;
    offersMap: Map<string, NormalizedOffer>; // book -> offer accumulating over/under
  };
  const grouped = new Map<string, AccumVal>();

  for (const ev of events) {
    const gameId = ev.id || ev.gameId || ev.eventID || "unknown";
    const gameTime = ev.gameTime || ev.startTime || ev.start || ev.date || undefined;
    // Try to infer home/away team abbreviations to derive opponent
    // Prefer structured team fields returned by SGO (v2/events) when present
    const homeTeamId = ev?.teams?.home?.teamID;
    const awayTeamId = ev?.teams?.away?.teamID;
    const homeAbbr =
      ev?.teams?.home?.names?.short ||
      ev.homeTeamAbbr ||
      ev.homeTeam ||
      ev.home ||
      ev.home_abbr ||
      ev.homeAbbreviation ||
      ev.homeShort ||
      ev.home_code ||
      undefined;
    const awayAbbr =
      ev?.teams?.away?.names?.short ||
      ev.awayTeamAbbr ||
      ev.awayTeam ||
      ev.away ||
      ev.away_abbr ||
      ev.awayAbbreviation ||
      ev.awayShort ||
      ev.away_code ||
      undefined;
    const oddsObj = ev.odds || {};
    for (const [oddId, raw] of Object.entries(oddsObj)) {
      const odd: any = raw;
      if (!odd || !odd.playerID) continue; // only player props
      if (odd.cancelled) continue;

      const playerId = odd.playerID as string;
      const playerName = parsePlayerNameFromId(playerId);
      const statId = odd.statID || odd.market || "unknown";
      const propType = normalizeStatId(statId);
      const lineNum = Number(odd.bookOverUnder ?? odd.fairOverUnder ?? odd.line ?? NaN);
      if (!Number.isFinite(lineNum)) continue;
      const side = (odd.sideID || odd.side || "").toString().toLowerCase();
      const price = Number(odd.bookOdds ?? odd.fairOdds ?? NaN);
      const period = odd.period || odd.segment || "full_game";

      const key2 = `${playerId}:${gameId}:${propType}:${lineNum}:${period}`;
      // SGO v2/events provides the player's team via event.players[playerID].teamID (not on the odd)
      const playerTeamId = ev?.players?.[playerId]?.teamID;
      const playerPosRaw =
        ev?.players?.[playerId]?.position ||
        ev?.players?.[playerId]?.pos ||
        ev?.players?.[playerId]?.positionName ||
        ev?.players?.[playerId]?.positionAbbr ||
        ev?.players?.[playerId]?.position_abbr;
      const playerPos =
        sport === "nfl"
          ? normalizeNflPosition(playerPosRaw)
          : String(playerPosRaw || "").trim() || null;
      const home = (homeAbbr || "").toString().toUpperCase();
      const away = (awayAbbr || "").toString().toUpperCase();

      // Prefer team/opponent derived from teamID matching (most reliable)
      let derivedTeam: string | undefined;
      let derivedOpp: string | undefined;
      if (playerTeamId && homeTeamId && awayTeamId) {
        if (playerTeamId === homeTeamId) {
          derivedTeam = home;
          derivedOpp = away;
        } else if (playerTeamId === awayTeamId) {
          derivedTeam = away;
          derivedOpp = home;
        }
      }

      // Fallback: use any team field present on the odd (less reliable) and try to infer opponent
      const playerTeamRaw = (odd.playerTeam || odd.team || "").toString();
      const pt = (playerTeamRaw || derivedTeam || "").toString().toUpperCase();
      const inferredOpp =
        derivedOpp ||
        (pt && (pt === home || pt === away) ? (pt === home ? away : home) : undefined);
      let acc = grouped.get(key2);
      if (!acc) {
        acc = {
          base: {
            id: key2,
            sport,
            gameId,
            startTime: gameTime,
            playerId,
            playerName,
            position: playerPos,
            // Prefer derived abbreviations so the frontend can render logos reliably
            team: derivedTeam || playerTeamRaw || undefined,
            opponent: inferredOpp,
            statId: String(statId),
            propType,
            line: lineNum,
            period,
          },
          offersMap: new Map<string, NormalizedOffer>(),
        };
        grouped.set(key2, acc);
      }

      // Build per-book offers from byBookmaker
      const byBookmaker = (odd as any).byBookmaker || {};
      const entries = Object.entries(byBookmaker) as Array<[string, any]>;
      if (entries.length > 0) {
        for (const [bookRaw, info] of entries) {
          if (!info || info.available === false || info.odds == null) continue;
          const book = String(bookRaw).toLowerCase();
          const american = Number(info.odds);
          if (!isValidAmericanOdds(american)) continue;
          const existing = acc.offersMap.get(book) || {
            book,
            overOdds: undefined,
            underOdds: undefined,
            deeplink: undefined,
          };
          if (side === "over") existing.overOdds = american;
          if (side === "under") existing.underOdds = american;
          if (info.deeplink && !existing.deeplink) existing.deeplink = String(info.deeplink);
          acc.offersMap.set(book, existing);
        }
      } else {
        // Fallback to a single consensus offer if no byBookmaker breakdown
        const consensus = acc.offersMap.get("consensus") || {
          book: "consensus",
          overOdds: undefined,
          underOdds: undefined,
        };
        if (side === "over" && isValidAmericanOdds(price)) consensus.overOdds = price;
        if (side === "under" && isValidAmericanOdds(price)) consensus.underOdds = price;
        acc.offersMap.set("consensus", consensus);
      }
    }
  }

  const normalized: NormalizedProp[] = [];
  for (const g of grouped.values()) {
    const offers: NormalizedOffer[] = Array.from(g.offersMap.values());
    const bestOver = computeBest(offers, "over");
    const bestUnder = computeBest(offers, "under");
    normalized.push({ ...g.base, offers, best_over: bestOver, best_under: bestUnder });
  }

  // For NFL/NBA, filter to relevant markets (reduce clutter)
  function isRelevantNflMarket(propType: string, statId?: string): boolean {
    const p = String(propType || "")
      .toLowerCase()
      .trim();
    const sid = String(statId || "")
      .toLowerCase()
      .trim();

    // Hide defensive props, fantasy score, novelty/longest markets, and combined markets for now
    if (p.startsWith("defense ") || sid.startsWith("defense_")) return false;
    if (p.includes("fantasy") || sid.includes("fantasy")) return false;
    if (p.startsWith("longest ") || sid.includes("longest")) return false;
    if (p.includes("+") || sid.includes("+")) return false;

    // Core offensive markets we support end-to-end
    const allow = new Set([
      "passing yards",
      "passing attempts",
      "passing completions",
      "passing tds",
      "passing interceptions",
      "rushing yards",
      "rushing attempts",
      "rushing tds",
      "receiving yards",
      "receptions",
      "receiving tds",
    ]);
    return allow.has(p);
  }

  // Back-compat helper (other sports)
  function isOffensiveProp(s: string, prop: string): boolean {
    const sl = s.toLowerCase();
    const p = prop.toLowerCase();
    if (sl === "nfl") {
      return isRelevantNflMarket(prop, undefined);
    }
    if (sl === "nba") {
      const allow = ["points", "assists", "rebounds"];
      return allow.includes(p);
    }
    return true; // other sports unchanged
  }

  const filtered = normalized.filter((np) => {
    if (String(sport || "").toLowerCase() === "nfl")
      return isRelevantNflMarket(np.propType, np.statId);
    return isOffensiveProp(sport, np.propType);
  });

  sgoCache.set(key, { data: filtered, ts: now });
  return filtered;
}

function normalizeHumanNameForMatch(name: string): string {
  return (
    String(name || "")
      .normalize("NFD")
      // Remove diacritics (e.g., Ş -> S)
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      // Remove apostrophes WITHOUT adding space (e.g., "Cor'Dale" -> "cordale", "O'Brien" -> "obrien")
      .replace(/'/g, "")
      // Remove hyphens WITHOUT adding space (e.g., "Kool-Aid" -> "koolaid", "Smith-Jones" -> "smithjones")
      // This handles compound names where SGO sends them without hyphens
      .replace(/-/g, "")
      // Normalize initials: "j.j." -> "jj", "tj" -> "tj", "j j" -> "jj"
      .replace(/\b([a-z])\s*\.\s*([a-z])\b/g, "$1$2") // "j.j." -> "jj"
      .replace(/\b([a-z])\s+([a-z])\b/g, (m, a, b) => {
        // If both are single letters, treat as initials (no space)
        if (m.length === 3 && m[1] === " ") return a + b;
        return m;
      })
      // Remove all non-alphanumeric except spaces
      .replace(/[^a-z0-9\s]/g, " ")
      // Collapse multiple spaces
      .replace(/\s+/g, " ")
      .trim()
  );
}

function toNumberOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(String(v));
  return Number.isFinite(n) ? n : null;
}

/**
 * Enrich normalized props with analytics from public.player_analytics.
 * We select the latest season per (player_id, prop_type) and attach:
 * l5/l10/l20/h2h_avg/season_avg/current_streak/matchup_rank/ev_percent
 */
async function enrichPropsWithAnalytics(
  sport: string,
  props: NormalizedProp[],
): Promise<NormalizedProp[]> {
  if (!Array.isArray(props) || props.length === 0) return props;

  const candidatesRaw = [
    process.env.SUPABASE_DATABASE_URL,
    process.env.NEON_DATABASE_URL,
    process.env.DATABASE_URL,
  ].filter(Boolean) as string[];
  const candidates = Array.from(new Set(candidatesRaw));
  if (candidates.length === 0) return props;

  const postgres = (await import("postgres")).default;
  // Cache: defense rank per (sport, season, prop_type). Keeps API fast and stable.
  // Key: `${sport}|${season}|${propTypeLower}`
  const defenseRankCache: Map<
    string,
    { ts: number; byTeamId: Map<string, { rank: number; games: number; allowedPerGame: number }> }
  > = (globalThis as any).__STATPEDIA_DEF_RANK_CACHE__ || new Map();
  (globalThis as any).__STATPEDIA_DEF_RANK_CACHE__ = defenseRankCache;

  const cacheTtlMs = 30 * 60 * 1000; // 30 minutes

  const nflSeasonForDate = (d: Date): string => {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1; // 1-12
    // NFL season belongs to prior year for Jan/Feb (playoffs).
    return String(m <= 2 ? y - 1 : y);
  };

  for (const connectionString of candidates) {
    const client = postgres(connectionString, { prepare: false });
    try {
      // Build the set of prop types we want analytics for (from the SGO slate)
      const propTypes = Array.from(
        new Set(props.map((p) => String(p.propType || "").trim()).filter(Boolean)),
      );
      if (propTypes.length === 0) return props;
      const propTypesLower = propTypes.map((p) => p.toLowerCase());

      /**
       * Key fix:
       * A lot of `players` rows are missing `team_id` (or are not linked cleanly into leagues),
       * so filtering players by `leagues.code` drops a huge portion of valid analytics.
       *
       * Even more important: many players have multiple UUIDs. Some UUIDs have analytics rows but
       * ZERO game logs (or vice versa). For *frontend hit rates*, we need the UUID that actually
       * has `player_game_logs`.
       *
       * So: build the player-name map from `player_game_logs` for the current propTypes.
       */
      // Build player map from ALL core propTypes, not just the ones being checked
      // This ensures we can match players even if they don't have logs for a specific propType yet
      const corePropTypesLower = [
        "passing yards",
        "rushing yards",
        "rushing attempts",
        "passing tds",
        "rushing tds",
        "receiving yards",
        "receptions",
        "receiving tds",
        "passing attempts",
        "passing completions",
      ];
      const playersRows = (await client.unsafe(
        `
        SELECT DISTINCT
          pgl.player_id,
          p.name AS player_name,
          COALESCE(t.abbreviation, '') AS team_abbr
        FROM public.player_game_logs pgl
        JOIN public.players p ON p.id = pgl.player_id
        LEFT JOIN public.teams t ON t.id = p.team_id
        WHERE LOWER(TRIM(pgl.prop_type)) = ANY($1::text[])
      `,
        [corePropTypesLower],
      )) as Array<{ player_id: string; player_name: string; team_abbr: string }>;

      const byName = new Map<string, Array<{ player_id: string; team_abbr: string }>>();
      const byInitialLastTeam = new Map<string, Array<{ player_id: string; team_abbr: string }>>();
      const byLastTeam = new Map<string, Array<{ player_id: string; team_abbr: string }>>();

      function initialLastKey(name: string): string {
        const norm = normalizeHumanNameForMatch(name);
        if (!norm) return "";
        const parts = norm.split(" ").filter(Boolean);
        if (parts.length < 2) return "";
        const first = parts[0];
        const last = parts[parts.length - 1];
        const initial = first?.[0];
        if (!initial || !last) return "";
        return `${initial} ${last}`; // e.g. "c ward", "j mccarthy"
      }

      function lastName(name: string): string {
        const norm = normalizeHumanNameForMatch(name);
        if (!norm) return "";
        const parts = norm.split(" ").filter(Boolean);
        if (parts.length < 2) return "";
        return parts[parts.length - 1] || "";
      }

      for (const r of playersRows) {
        const key = normalizeHumanNameForMatch(r.player_name);
        if (!key) continue;
        const arr = byName.get(key) || [];
        arr.push({
          player_id: String(r.player_id),
          team_abbr: String(r.team_abbr || "").toUpperCase(),
        });
        byName.set(key, arr);

        const il = initialLastKey(r.player_name);
        if (il) {
          const team = String(r.team_abbr || "").toUpperCase();
          const k2 = `${il}|${team}`;
          const arr2 = byInitialLastTeam.get(k2) || [];
          arr2.push({ player_id: String(r.player_id), team_abbr: team });
          byInitialLastTeam.set(k2, arr2);
        }

        // Extra fallback: last-name + team match (handles common nickname differences like Andrew/Drew).
        const ln = lastName(r.player_name);
        if (ln) {
          const team = String(r.team_abbr || "").toUpperCase();
          const k3 = `${ln}|${team}`;
          const arr3 = byLastTeam.get(k3) || [];
          arr3.push({ player_id: String(r.player_id), team_abbr: team });
          byLastTeam.set(k3, arr3);
        }
      }

      // Resolve each prop -> player_id uuid (prefer matching team abbrev)
      const resolvedPlayerIdByIdx = new Map<number, string>();
      const logCountCache = new Map<string, Map<string, number>>();
      async function getLogCountsForCandidates(
        candidateIds: string[],
        propTypeLower: string,
      ): Promise<Map<string, number>> {
        const ids = Array.from(new Set(candidateIds)).sort();
        const cacheKey = `${propTypeLower}:${ids.join(",")}`;
        const cached = logCountCache.get(cacheKey);
        if (cached) return cached;
        const rows = (await client.unsafe(
          `
          SELECT pgl.player_id, COUNT(*)::int AS c
          FROM public.player_game_logs pgl
          WHERE pgl.player_id = ANY($1::uuid[])
            AND LOWER(TRIM(pgl.prop_type)) = $2
          GROUP BY pgl.player_id
        `,
          [ids, propTypeLower],
        )) as Array<{ player_id: string; c: number }>;
        const m = new Map<string, number>();
        for (const r of rows) m.set(String(r.player_id), Number(r.c) || 0);
        logCountCache.set(cacheKey, m);
        return m;
      }
      for (let i = 0; i < props.length; i++) {
        const p = props[i];
        const key = normalizeHumanNameForMatch(p.playerName || "");
        let nameCandidates = byName.get(key);

        // Fallback: match by first-initial + last-name + team (handles Cam vs Cameron, etc.)
        if ((!nameCandidates || nameCandidates.length === 0) && p.playerName) {
          const il = initialLastKey(p.playerName);
          const team = String(p.team || "").toUpperCase();
          if (il && team) {
            nameCandidates = byInitialLastTeam.get(`${il}|${team}`);
          }
        }

        // Fallback: last-name + team (e.g. Andrew vs Drew, Robert vs Bob, etc.)
        if ((!nameCandidates || nameCandidates.length === 0) && p.playerName) {
          const ln = lastName(p.playerName);
          const team = String(p.team || "").toUpperCase();
          if (ln && team) {
            nameCandidates = byLastTeam.get(`${ln}|${team}`);
          }
        }
        if (!nameCandidates || nameCandidates.length === 0) continue;
        if (nameCandidates.length === 1) {
          resolvedPlayerIdByIdx.set(i, nameCandidates[0].player_id);
          continue;
        }
        const teamAbbr = String(p.team || "").toUpperCase();
        const propTypeLowerKey = String(p.propType || "")
          .trim()
          .toLowerCase();
        const teamMatches = teamAbbr ? nameCandidates.filter((c) => c.team_abbr === teamAbbr) : [];
        const pool = teamMatches.length > 0 ? teamMatches : nameCandidates;
        if (pool.length === 1) {
          resolvedPlayerIdByIdx.set(i, pool[0].player_id);
          continue;
        }
        // Disambiguate by which candidate actually has game logs for this prop_type.
        const counts = await getLogCountsForCandidates(
          pool.map((c) => c.player_id),
          propTypeLowerKey,
        );
        let best = pool[0];
        let bestCount = counts.get(best.player_id) || 0;
        for (const c of pool) {
          const ct = counts.get(c.player_id) || 0;
          if (ct > bestCount) {
            best = c;
            bestCount = ct;
          }
        }
        resolvedPlayerIdByIdx.set(i, best.player_id);
      }

      const playerIds = Array.from(new Set(Array.from(resolvedPlayerIdByIdx.values())));
      if (playerIds.length === 0 || propTypes.length === 0) return props;

      const analyticsRows = (await client.unsafe(
        `
      SELECT DISTINCT ON (pa.player_id, pa.prop_type)
        pa.player_id,
        pa.prop_type,
        pa.season,
        pa.l5,
        pa.l10,
        pa.l20,
        pa.current_streak,
        pa.h2h_avg,
        pa.season_avg,
        pa.matchup_rank,
        pa.ev_percent,
        pa.last_updated
      FROM public.player_analytics pa
      WHERE pa.player_id = ANY($1::uuid[])
        AND LOWER(TRIM(pa.prop_type)) = ANY($2::text[])
        AND (pa.sport IS NULL OR LOWER(pa.sport) = LOWER($3))
      ORDER BY
        pa.player_id,
        pa.prop_type,
        NULLIF(regexp_replace(pa.season, '\\\\D', '', 'g'), '')::int DESC NULLS LAST,
        pa.last_updated DESC NULLS LAST
    `,
        [playerIds, propTypesLower, sport],
      )) as Array<any>;

      const analyticsByKey = new Map<string, any>();
      for (const r of analyticsRows) {
        analyticsByKey.set(`${r.player_id}:${String(r.prop_type).trim().toLowerCase()}`, r);
      }

      // Pull player positions from DB to enforce role-based prop hiding (e.g., TE shouldn't show passing markets).
      const posRows = (await client.unsafe(
        `
        SELECT p.id AS player_id, UPPER(COALESCE(p.position, '')) AS position
        FROM public.players p
        WHERE p.id = ANY($1::uuid[])
      `,
        [playerIds],
      )) as Array<{ player_id: string; position: string }>;
      const posByPlayerId = new Map<string, string>();
      for (const r of posRows)
        posByPlayerId.set(String(r.player_id), String(r.position || "").trim());

      // NFL team abbreviation aliasing (SGO sometimes uses older/alternate abbreviations).
      const nflAbbrAlias = (abbr: string): string => {
        const a = String(abbr || "")
          .trim()
          .toUpperCase();
        const map: Record<string, string> = {
          WAS: "WSH",
          WFT: "WSH",
          JAC: "JAX",
          OAK: "LV",
          SD: "LAC",
          STL: "LAR",
          LA: "LAR",
        };
        return map[a] || a;
      };

      // Infer player role from logs (QB vs non-QB) so we can hide irrelevant markets.
      // Only applied when we have enough evidence (so rookies still show).
      const roleCountRows = (await client.unsafe(
        `
        SELECT pgl.player_id,
               LOWER(TRIM(pgl.prop_type)) AS prop_type,
               COUNT(*) FILTER (WHERE COALESCE(pgl.actual_value, 0)::numeric > 0)::int AS c_pos,
               COUNT(*)::int AS c_total
        FROM public.player_game_logs pgl
        WHERE pgl.player_id = ANY($1::uuid[])
          AND LOWER(TRIM(pgl.prop_type)) IN ('passing yards','passing attempts','rushing attempts','receptions')
        GROUP BY pgl.player_id, LOWER(TRIM(pgl.prop_type))
      `,
        [playerIds],
      )) as Array<{ player_id: string; prop_type: string; c_pos: number; c_total: number }>;
      const posCountsByPlayer = new Map<string, Map<string, number>>();
      for (const r of roleCountRows) {
        const pid = String(r.player_id);
        const m = posCountsByPlayer.get(pid) || new Map<string, number>();
        m.set(String(r.prop_type), Number(r.c_pos) || 0);
        posCountsByPlayer.set(pid, m);
      }

      function inferNflPositionFromLogs(playerId: string): string | null {
        const m = posCountsByPlayer.get(playerId);
        if (!m) return null;
        const passY = Number(m.get("passing yards") || 0);
        const passA = Number(m.get("passing attempts") || 0);
        const rushA = Number(m.get("rushing attempts") || 0);
        const rec = Number(m.get("receptions") || 0);

        // If a player has any positive passing volume, treat as QB.
        if (passA > 0 || passY > 0) return "QB";
        // If primarily rushing and not catching, treat as RB.
        if (rushA > 0 && rec === 0) return "RB";
        // If catching, default to WR (TE vs WR requires roster data we don't have here).
        if (rec > 0) return "WR";
        return null;
      }

      // Resolve opponent -> team_id for the current sport/league.
      // IMPORTANT: SGO sometimes provides abbreviations (ARI), sometimes names; support both.
      const leagueCode = String(mapSportToLeagueId(sport) || sport || "").toUpperCase();
      const opponentRaw = props
        .map((p) => String(p.opponent || "").trim())
        .filter((v) => v.length > 0 && v.toUpperCase() !== "UNK" && v.toUpperCase() !== "TBD");
      const opponentAbbrs = Array.from(
        new Set(
          opponentRaw
            .map((v) => nflAbbrAlias(v.toUpperCase()))
            .filter((v) => v.length > 0 && v !== "UNK"),
        ),
      );
      const opponentNamesLower = Array.from(new Set(opponentRaw.map((v) => v.toLowerCase())));

      const teamIdByKey = new Map<string, string>();
      if (opponentAbbrs.length > 0 || opponentNamesLower.length > 0) {
        try {
          const teamRows = (await client.unsafe(
            `
            SELECT
              t.id,
              UPPER(t.abbreviation) AS abbr,
              LOWER(t.name) AS name,
              LOWER(t.full_name) AS full_name
            FROM public.teams t
            JOIN public.leagues l ON l.id = t.league_id
            WHERE (
              (CARDINALITY($1::text[]) > 0 AND UPPER(t.abbreviation) = ANY($1::text[]))
              OR (CARDINALITY($2::text[]) > 0 AND (LOWER(t.name) = ANY($2::text[]) OR LOWER(t.full_name) = ANY($2::text[])))
            )
              AND (
                UPPER(l.code) = $3 OR UPPER(COALESCE(l.abbreviation, l.code)) = $3
              )
          `,
            [opponentAbbrs, opponentNamesLower, leagueCode],
          )) as Array<{ id: string; abbr: string; name: string; full_name: string }>;
          for (const tr of teamRows) {
            teamIdByKey.set(String(tr.abbr), String(tr.id));
            if (tr.name) teamIdByKey.set(String(tr.name), String(tr.id));
            if (tr.full_name) teamIdByKey.set(String(tr.full_name), String(tr.id));
          }
        } catch {
          // optional; h2h/matchup ranks will fall back to DB value or null
        }
      }

      const resolveOpponentTeamId = (raw: string): string | undefined => {
        const s = String(raw || "").trim();
        if (!s) return undefined;
        const upper = nflAbbrAlias(s.toUpperCase());
        const fromAbbr = teamIdByKey.get(upper);
        if (fromAbbr) return fromAbbr;
        const fromName = teamIdByKey.get(s.toLowerCase());
        if (fromName) return fromName;
        return undefined;
      };

      /**
       * NFL Matchup Rank (Defense vs Prop Type)
       *
       * Goal: For each prop type, rank all defenses 1..32 based on how much they allow
       * per game for that stat in the given season. Rank 1 = best defense (allows least),
       * rank 32 = worst defense (allows most).
       *
       * We compute from `player_game_logs`:
       * - For a defense team D and a game G: allowed(D,G,prop) = SUM(actual_value) for all
       *   offensive players who played *against* D in G with that prop_type.
       * - For a season: allowed_per_game(D,prop) = AVG(allowed(D,G,prop)) across games.
       *
       * Then rank ascending by allowed_per_game.
       */
      const shouldComputeDefenseRank = String(sport || "").toLowerCase() === "nfl";
      const defenseRankByPropType = new Map<
        string,
        Map<string, { rank: number; games: number; allowedPerGame: number }>
      >();
      // Used at lookup-time when the prop's season has no ranks yet (e.g., logs not ingested).
      const latestSeasonByProp = new Map<string, string>();
      const debugMatchup = String(process.env.DEBUG_MATCHUP || "") === "1";

      if (shouldComputeDefenseRank && propTypesLower.length > 0) {
        const seasonDefault = nflSeasonForDate(new Date());
        const seasonByIdx = props.map((p) => {
          const raw = (p as any).startTime || (p as any).start_time || (p as any).game_date;
          const ts = raw ? Date.parse(String(raw)) : NaN;
          if (Number.isFinite(ts)) return nflSeasonForDate(new Date(ts));
          return seasonDefault;
        });
        const seasonsNeeded = Array.from(new Set(seasonByIdx)).filter(Boolean);

        if (debugMatchup) {
          console.log("[matchup] starting computation", {
            sport,
            propTypesLower: propTypesLower.length,
            seasonsNeeded,
            shouldCompute: shouldComputeDefenseRank,
          });
        }

        // Only compute for prop types we actually need and can rank meaningfully.
        // (We can expand later; keep it focused to core offensive markets.)
        const rankable = new Set([
          "passing yards",
          "passing attempts",
          "passing completions",
          "passing tds",
          "passing interceptions",
          "rushing yards",
          "rushing attempts",
          "rushing tds",
          "receiving yards",
          "receptions",
          "receiving tds",
        ]);

        const propTypesToRank = Array.from(
          new Set(
            propTypesLower.filter((pt) =>
              rankable.has(
                String(pt || "")
                  .trim()
                  .toLowerCase(),
              ),
            ),
          ),
        );

        if (debugMatchup) {
          console.log("[matchup] prop types to rank", {
            propTypesToRank,
            propTypesLower: propTypesLower.slice(0, 5),
            rankable: Array.from(rankable),
          });
        }

        // If no prop types to rank, skip computation
        if (propTypesToRank.length === 0) {
          if (debugMatchup) {
            console.warn("[matchup] No prop types to rank - skipping computation");
          }
        }

        // Try to read precomputed ranks from public.defense_ranks first (fast path).
        // If table is empty/not populated, we will compute from logs (slow path).
        try {
          const leagueRows = (await client.unsafe(
            `
            SELECT id
            FROM public.leagues
            WHERE UPPER(code) = 'NFL' OR UPPER(COALESCE(abbreviation, code)) = 'NFL'
            LIMIT 1
          `,
          )) as Array<{ id: string }>;
          const nflLeagueId = leagueRows?.[0]?.id;
          if (nflLeagueId && seasonsNeeded.length > 0 && propTypesToRank.length > 0) {
            const dr = (await client.unsafe(
              `
              SELECT
                dr.team_id,
                dr.season,
                LOWER(TRIM(dr.prop_type)) AS prop_type,
                dr.rank::int AS rank,
                COALESCE(dr.games_tracked, 0)::int AS games_tracked,
                COALESCE(dr.rank_percentile, 0)::numeric AS rank_percentile
              FROM public.defense_ranks dr
              WHERE dr.league_id = $1
                AND dr.season = ANY($2::text[])
                AND LOWER(TRIM(dr.prop_type)) = ANY($3::text[])
            `,
              [nflLeagueId, seasonsNeeded, propTypesToRank],
            )) as Array<{
              team_id: string;
              season: string;
              prop_type: string;
              rank: number;
              games_tracked: number;
              rank_percentile: unknown;
            }>;

            for (const r of dr) {
              const key = `${String(r.season)}|${String(r.prop_type)}`;
              const m = defenseRankByPropType.get(key) || new Map();
              m.set(String(r.team_id), {
                rank: Number(r.rank) || 0,
                games: Number(r.games_tracked) || 0,
                allowedPerGame: 0, // not stored in table currently
              });
              defenseRankByPropType.set(key, m);
            }

            if (debugMatchup) {
              console.log("[matchup] defense_ranks preload", {
                seasonsNeeded,
                propTypesToRank: propTypesToRank.length,
                rows: dr.length,
                keys: defenseRankByPropType.size,
              });
            }
          }
        } catch (e) {
          if (debugMatchup) {
            console.warn(
              "[matchup] defense_ranks preload failed (will compute from logs):",
              (e as Error)?.message || e,
            );
          }
        }

        // Fallback: if the current season isn't fully ingested, use the latest season with logs for each prop type.
        for (const ptLower of propTypesToRank) {
          try {
            const ms = (await client.unsafe(
              `
              SELECT MAX(NULLIF(regexp_replace(pgl.season, '\\\\D', '', 'g'), '')::int) AS max_season
              FROM public.player_game_logs pgl
              JOIN public.teams t ON t.id = pgl.opponent_id
              JOIN public.leagues l ON l.id = t.league_id
              WHERE LOWER(TRIM(pgl.prop_type)) = $1
                AND (UPPER(l.code) = 'NFL' OR UPPER(COALESCE(l.abbreviation, l.code)) = 'NFL')
            `,
              [ptLower],
            )) as Array<{ max_season: number | null }>;
            const maxSeason = ms?.[0]?.max_season;
            if (maxSeason && Number.isFinite(maxSeason))
              latestSeasonByProp.set(ptLower, String(maxSeason));
          } catch {
            // ignore; no fallback for this prop type
          }
        }

        const pairs = new Set<string>();
        for (const ptLower of propTypesToRank) {
          for (const s of seasonsNeeded) pairs.add(`${s}|${ptLower}`);
          const fallback = latestSeasonByProp.get(ptLower);
          if (fallback) pairs.add(`${fallback}|${ptLower}`);
        }

        if (debugMatchup) {
          console.log("[matchup] pairs to compute", {
            pairs: Array.from(pairs),
            seasonsNeeded,
            propTypesToRank,
          });
        }

        for (const pair of pairs) {
          const [season, ptLower] = pair.split("|");
          if (!season || !ptLower) {
            if (debugMatchup) {
              console.warn("[matchup] Invalid pair format", { pair });
            }
            continue;
          }
          const cacheKey = `${String(sport).toLowerCase()}|${season}|${ptLower}`;
          const cached = defenseRankCache.get(cacheKey);
          if (cached && Date.now() - cached.ts < cacheTtlMs) {
            defenseRankByPropType.set(`${season}|${ptLower}`, cached.byTeamId);
            continue;
          }

          // If precomputed table already gave us ranks for this season+propType, skip compute.
          const pre = defenseRankByPropType.get(`${season}|${ptLower}`);
          if (pre && pre.size > 0) continue;

          if (debugMatchup) {
            console.log("[matchup] computing ranks", { season, ptLower, cacheKey });
            // Quick diagnostic: check if we have any logs with opponent_id for this prop type
            const diag = (await client.unsafe(
              `
              SELECT 
                COUNT(*)::int AS total_logs,
                COUNT(pgl.opponent_id)::int AS logs_with_opponent,
                COUNT(DISTINCT pgl.opponent_id)::int AS unique_opponents
              FROM public.player_game_logs pgl
              JOIN public.teams t ON t.id = pgl.opponent_id
              JOIN public.leagues l ON l.id = t.league_id
              WHERE pgl.season = $1
                AND LOWER(TRIM(pgl.prop_type)) = $2
                AND (UPPER(l.code) = 'NFL' OR UPPER(COALESCE(l.abbreviation, l.code)) = 'NFL')
            `,
              [season, ptLower],
            )) as Array<{
              total_logs: number;
              logs_with_opponent: number;
              unique_opponents: number;
            }>;
            if (diag.length > 0) {
              console.log("[matchup] diagnostic", { season, ptLower, ...diag[0] });
            }
          }

          const rows = (await client.unsafe(
            `
              WITH per_game AS (
                SELECT
                  pgl.opponent_id AS team_id,
                  pgl.game_id,
                  SUM(pgl.actual_value::numeric) AS allowed
                FROM public.player_game_logs pgl
                JOIN public.teams t ON t.id = pgl.opponent_id
                JOIN public.leagues l ON l.id = t.league_id
                WHERE pgl.season = $1
                  AND LOWER(TRIM(pgl.prop_type)) = $2
                  AND (UPPER(l.code) = 'NFL' OR UPPER(COALESCE(l.abbreviation, l.code)) = 'NFL')
                  AND pgl.opponent_id IS NOT NULL
                GROUP BY pgl.opponent_id, pgl.game_id
              ),
              per_team AS (
                SELECT
                  team_id,
                  AVG(allowed) AS allowed_per_game,
                  COUNT(*)::int AS games_tracked
                FROM per_game
                GROUP BY team_id
              ),
              ranked AS (
                SELECT
                  team_id,
                  games_tracked,
                  allowed_per_game,
                  RANK() OVER (ORDER BY allowed_per_game ASC) AS rank
                FROM per_team
              )
              SELECT team_id, rank::int AS rank, games_tracked, allowed_per_game
              FROM ranked
            `,
            [season, ptLower],
          )) as Array<{
            team_id: string;
            rank: number;
            games_tracked: number;
            allowed_per_game: string | number;
          }>;

          if (debugMatchup) {
            console.log("[matchup] computed ranks result", {
              season,
              ptLower,
              rowCount: rows.length,
              sample: rows.slice(0, 3).map((r) => ({
                team_id: r.team_id,
                rank: r.rank,
                games: r.games_tracked,
              })),
            });
          }

          const byTeamId = new Map<
            string,
            { rank: number; games: number; allowedPerGame: number }
          >();
          for (const r of rows) {
            const apg =
              typeof r.allowed_per_game === "number"
                ? r.allowed_per_game
                : Number(String(r.allowed_per_game));
            byTeamId.set(String(r.team_id), {
              rank: Number(r.rank) || 0,
              games: Number(r.games_tracked) || 0,
              allowedPerGame: Number.isFinite(apg) ? apg : 0,
            });
          }

          if (debugMatchup && byTeamId.size === 0) {
            console.warn("[matchup] computed ranks but map is empty", {
              season,
              ptLower,
              rowsReturned: rows.length,
            });
          }

          defenseRankCache.set(cacheKey, { ts: Date.now(), byTeamId });
          defenseRankByPropType.set(`${season}|${ptLower}`, byTeamId);

          // Always log when ranks are computed (not just in debug mode)
          if (byTeamId.size > 0) {
            console.log(
              `[matchup] ✅ Computed ${byTeamId.size} defense ranks for ${season}|${ptLower}`,
            );
          } else {
            console.warn(
              `[matchup] ⚠️  Computed ranks for ${season}|${ptLower} but map is empty (0 teams)`,
            );
          }
        }
      }

      /**
       * Critical fix:
       * `player_game_logs.hit` and `player_game_logs.line` are not reliable in this dataset
       * (we've observed line=0 and hit=false even when actual_value > 0).
       *
       * For frontend L5/L10/L20 + streak, compute directly from game log `actual_value`
       * compared against the CURRENT prop line from the SGO slate (over-side).
       */
      const gameLogRows = (await client.unsafe(
        `
        SELECT player_id,
               prop_type,
               opponent_id,
               actual_value::numeric AS actual_value,
               game_date
        FROM (
          SELECT
            t.player_id,
            t.prop_type,
            t.opponent_id,
            t.actual_value,
            t.game_date,
            ROW_NUMBER() OVER (
              PARTITION BY t.player_id, t.prop_type
              ORDER BY t.game_date DESC
            ) AS rn
          FROM (
            SELECT DISTINCT ON (pgl.player_id, TRIM(pgl.prop_type), pgl.game_id)
              pgl.player_id,
              TRIM(pgl.prop_type) AS prop_type,
              pgl.opponent_id,
              pgl.actual_value,
              pgl.game_date
            FROM public.player_game_logs pgl
            WHERE pgl.player_id = ANY($1::uuid[])
              AND LOWER(TRIM(pgl.prop_type)) = ANY($2::text[])
            ORDER BY pgl.player_id, TRIM(pgl.prop_type), pgl.game_id, pgl.game_date DESC
          ) t
        ) t
        WHERE t.rn <= 20
        ORDER BY t.player_id, t.prop_type, t.game_date DESC;
      `,
        [playerIds, propTypesLower],
      )) as Array<{
        player_id: string;
        prop_type: string;
        opponent_id: string | null;
        actual_value: unknown;
        game_date: string;
      }>;

      const logsByKey = new Map<string, number[]>();
      const logsByKeyOpp = new Map<string, Array<{ opponent_id: string | null; v: number }>>();
      for (const r of gameLogRows) {
        const key = `${r.player_id}:${String(r.prop_type).trim().toLowerCase()}`;
        const v =
          typeof r.actual_value === "number" ? r.actual_value : Number(String(r.actual_value));
        if (!Number.isFinite(v)) continue;
        const arr = logsByKey.get(key) || [];
        arr.push(v);
        logsByKey.set(key, arr);

        const arr2 = logsByKeyOpp.get(key) || [];
        arr2.push({ opponent_id: r.opponent_id ?? null, v });
        logsByKeyOpp.set(key, arr2);
      }

      // H2H needs opponent-specific windows. The last 20 overall games might not include the last H2H matchup.
      // Fetch last 20 games *vs each opponent* for the slate.
      const oppIdsNeeded = Array.from(
        new Set(
          props
            .map((p) => resolveOpponentTeamId(String(p.opponent || "")))
            .filter(Boolean) as string[],
        ),
      );
      const h2hRows =
        oppIdsNeeded.length > 0
          ? ((await client.unsafe(
              `
        SELECT player_id,
               prop_type,
               opponent_id,
               actual_value::numeric AS actual_value,
               game_date
        FROM (
          SELECT
            t.player_id,
            t.prop_type,
            t.opponent_id,
            t.actual_value,
            t.game_date,
            ROW_NUMBER() OVER (
              PARTITION BY t.player_id, t.prop_type, t.opponent_id
              ORDER BY t.game_date DESC
            ) AS rn
          FROM (
            SELECT DISTINCT ON (pgl.player_id, TRIM(pgl.prop_type), pgl.opponent_id, pgl.game_id)
              pgl.player_id,
              TRIM(pgl.prop_type) AS prop_type,
              pgl.opponent_id,
              pgl.actual_value,
              pgl.game_date
            FROM public.player_game_logs pgl
            WHERE pgl.player_id = ANY($1::uuid[])
              AND LOWER(TRIM(pgl.prop_type)) = ANY($2::text[])
              AND pgl.opponent_id = ANY($3::uuid[])
            ORDER BY pgl.player_id, TRIM(pgl.prop_type), pgl.opponent_id, pgl.game_id, pgl.game_date DESC
          ) t
        ) t
        WHERE t.rn <= 20
        ORDER BY t.player_id, t.prop_type, t.opponent_id, t.game_date DESC;
      `,
              [playerIds, propTypesLower, oppIdsNeeded],
            )) as Array<{
              player_id: string;
              prop_type: string;
              opponent_id: string | null;
              actual_value: unknown;
              game_date: string;
            }>)
          : [];
      const h2hByKey = new Map<string, number[]>();
      for (const r of h2hRows) {
        const key = `${r.player_id}:${String(r.prop_type).trim().toLowerCase()}:${r.opponent_id || ""}`;
        const v =
          typeof r.actual_value === "number" ? r.actual_value : Number(String(r.actual_value));
        if (!Number.isFinite(v)) continue;
        const arr = h2hByKey.get(key) || [];
        arr.push(v);
        h2hByKey.set(key, arr);
      }

      // Build slate category map per resolved player for fallback role decisions (when we have no positive log signal).
      const slateCatsByPlayer = new Map<
        string,
        { passing: boolean; rushing: boolean; receiving: boolean }
      >();
      for (let i = 0; i < props.length; i++) {
        const pid = resolvedPlayerIdByIdx.get(i);
        if (!pid) continue;
        const pt = String(props[i]?.propType || "")
          .toLowerCase()
          .trim();
        const cat = slateCatsByPlayer.get(pid) || {
          passing: false,
          rushing: false,
          receiving: false,
        };
        if (pt.startsWith("passing ")) cat.passing = true;
        if (pt.startsWith("rushing ")) cat.rushing = true;
        if (pt.startsWith("receiving ") || pt === "receptions") cat.receiving = true;
        slateCatsByPlayer.set(pid, cat);
      }

      // Pre-fetch ESPN positions for all NFL players (batch to avoid rate limits)
      const espnPositionsByKey = new Map<string, string | null>();
      if (String(sport || "").toLowerCase() === "nfl") {
        const uniquePlayers = new Map<string, { team: string; playerName: string }>();
        for (const p of props) {
          const team = String(p.team || "")
            .trim()
            .toUpperCase();
          const playerName = String(p.playerName || "").trim();
          if (team && playerName) {
            const key = `${team}|${playerName}`;
            if (!uniquePlayers.has(key)) {
              uniquePlayers.set(key, { team, playerName });
            }
          }
        }
        // Fetch positions in parallel (limit concurrency to avoid rate limits)
        const positionPromises = Array.from(uniquePlayers.entries()).map(
          async ([key, { team, playerName }]) => {
            const pos = await fetchEspnPosition(team, playerName);
            return [key, pos] as [string, string | null];
          },
        );
        const positionResults = await Promise.all(positionPromises);
        for (const [key, pos] of positionResults) {
          espnPositionsByKey.set(key, pos);
        }
      }

      const enriched = props.map((p, idx) => {
        const pid = resolvedPlayerIdByIdx.get(idx);
        if (!pid) return p;
        const propTypeKey = String(p.propType || "")
          .trim()
          .toLowerCase();
        const r = analyticsByKey.get(`${pid}:${propTypeKey}`);

        // Compute opponent defense rank for this prop type (NFL only).
        // Use the prop's startTime when present to pick the correct season; fallback to current-season heuristic.
        const rawStart = (p as any).startTime || (p as any).start_time || (p as any).game_date;
        const ts = rawStart ? Date.parse(String(rawStart)) : NaN;
        const seasonForProp = Number.isFinite(ts)
          ? nflSeasonForDate(new Date(ts))
          : nflSeasonForDate(new Date());

        const oppIdForRank = resolveOpponentTeamId(String(p.opponent || ""));
        if (debugMatchup && !oppIdForRank) {
          console.warn("[matchup] opponent mapping missing", {
            opponent: p.opponent,
            team: p.team,
            propType: p.propType,
          });
        }
        // Lookup rank: try the prop season first; if no ranks exist for that season, fallback to latest season with logs.
        const lookupKey = `${seasonForProp}|${propTypeKey}`;
        let rankMap =
          oppIdForRank && defenseRankByPropType.get(lookupKey)
            ? defenseRankByPropType.get(lookupKey)!
            : undefined;
        if (!rankMap || rankMap.size === 0) {
          const fbSeason = latestSeasonByProp.get(propTypeKey);
          if (fbSeason) {
            const fbKey = `${fbSeason}|${propTypeKey}`;
            const fbMap = defenseRankByPropType.get(fbKey);
            if (fbMap && fbMap.size > 0) rankMap = fbMap;
          }
        }
        const defenseRankRow = oppIdForRank && rankMap ? rankMap.get(oppIdForRank) : undefined;
        if (debugMatchup) {
          if (!oppIdForRank) {
            console.warn("[matchup] opponent ID not resolved", {
              opponent: p.opponent,
              propType: p.propType,
            });
          } else if (!rankMap || rankMap.size === 0) {
            console.warn("[matchup] rank map missing", {
              opponent: p.opponent,
              opponent_id: oppIdForRank,
              propType: p.propType,
              lookupKey,
              seasonForProp,
              fbSeason: latestSeasonByProp.get(propTypeKey) || null,
              availableKeys: Array.from(defenseRankByPropType.keys()),
            });
          } else if (!defenseRankRow) {
            console.warn("[matchup] rank row missing for opponent", {
              opponent: p.opponent,
              opponent_id: oppIdForRank,
              propType: p.propType,
              rankMapSize: rankMap.size,
              sampleTeamIds: Array.from(rankMap.keys()).slice(0, 3),
            });
          }
        }
        const computedMatchupRank =
          defenseRankRow && defenseRankRow.rank > 0 ? defenseRankRow.rank : null;

        // Get ESPN position from pre-fetched cache (prioritized over all other sources)
        let espnPos: string | null = null;
        if (String(sport || "").toLowerCase() === "nfl" && p.team && p.playerName) {
          const teamAbbr = String(p.team || "")
            .trim()
            .toUpperCase();
          const playerName = String(p.playerName || "").trim();
          if (teamAbbr && playerName) {
            const key = `${teamAbbr}|${playerName}`;
            espnPos = espnPositionsByKey.get(key) ?? null;
          }
        }

        // Start with DB analytics when present (fallback to existing values otherwise)
        const sgoPos =
          String(p.position || "")
            .trim()
            .toUpperCase() || null;
        const dbPos =
          String(posByPlayerId.get(pid) || "")
            .trim()
            .toUpperCase() || null;
        const inferredPos =
          String(sport || "").toLowerCase() === "nfl" ? inferNflPositionFromLogs(pid) : null;
        // Priority: ESPN > SGO > DB > Inferred
        const finalPos = espnPos || sgoPos || dbPos || inferredPos || null;

        let out: NormalizedProp = {
          ...p,
          player_uuid: pid,
          position: finalPos,
          l5: r ? toNumberOrNull(r.l5) : (p.l5 ?? null),
          l10: r ? toNumberOrNull(r.l10) : (p.l10 ?? null),
          l20: r ? toNumberOrNull(r.l20) : (p.l20 ?? null),
          h2h_avg: r ? toNumberOrNull(r.h2h_avg) : (p.h2h_avg ?? null),
          season_avg: r ? toNumberOrNull(r.season_avg) : (p.season_avg ?? null),
          // Prefer computed defense rank (NFL) -> DB -> existing.
          matchup_rank:
            computedMatchupRank ?? (r ? toNumberOrNull(r.matchup_rank) : (p.matchup_rank ?? null)),
          ev_percent: r ? toNumberOrNull(r.ev_percent) : (p.ev_percent ?? null),
          current_streak: r ? toNumberOrNull(r.current_streak) : (p.current_streak ?? null),
          streak_l5: r ? toNumberOrNull(r.current_streak) : (p.streak_l5 ?? null),
          rating: null,
        };

        // Compute hit rates from game logs vs CURRENT line (over)
        const line = toNumberOrNull((p as any).line);
        const values = logsByKey.get(`${pid}:${propTypeKey}`) || [];
        if (line != null && Number.isFinite(line) && values.length > 0) {
          const hits = values.map((v) => (v > line ? 1 : 0));
          const sumFirst = (n: number) => hits.slice(0, n).reduce((a, b) => a + b, 0);
          const window = (n: number) => Math.min(n, hits.length);
          const pct = (n: number) => {
            const w = window(n);
            if (w <= 0) return null;
            return (sumFirst(w) / w) * 100;
          };

          const w5 = window(5);
          const w10 = window(10);
          const w20 = window(20);
          const h5 = w5 ? sumFirst(w5) : null;
          const h10 = w10 ? sumFirst(w10) : null;
          const h20 = w20 ? sumFirst(w20) : null;

          const l5 = pct(5);
          const l10 = pct(10);
          const l20 = pct(20);

          // Current streak: consecutive same result from most recent game
          const first = hits[0];
          let streak = 0;
          for (const h of hits) {
            if (h === first) streak += 1;
            else break;
          }
          const current_streak = first === 1 ? streak : -streak;

          out = {
            ...out,
            l5: Number.isFinite(l5) ? l5 : out.l5,
            l10: Number.isFinite(l10) ? l10 : out.l10,
            l20: Number.isFinite(l20) ? l20 : out.l20,
            l5_hits: h5,
            l5_total: w5 || null,
            l10_hits: h10,
            l10_total: w10 || null,
            l20_hits: h20,
            l20_total: w20 || null,
            current_streak,
            streak_l5: current_streak,
            season_avg:
              out.season_avg == null
                ? values.reduce((a, b) => a + b, 0) / values.length
                : out.season_avg,
          };
        }

        // Compute H2H avg vs current opponent if possible (fallback keeps DB value)
        const oppId = resolveOpponentTeamId(String(p.opponent || ""));
        if (oppId) {
          const vs = h2hByKey.get(`${pid}:${propTypeKey}:${oppId}`) || [];
          if (vs.length > 0) out = { ...out, h2h_avg: vs.reduce((a, b) => a + b, 0) / vs.length };
        }

        return out;
      });

      // NFL-only: hide irrelevant markets like RB Passing Completions, but keep rookies/unknowns.
      const filteredByRole =
        String(sport || "").toLowerCase() === "nfl"
          ? enriched.filter((p, idx) => {
              const pid = resolvedPlayerIdByIdx.get(idx);
              if (!pid) return true; // keep unresolved (rookies / missing logs)
              const m = posCountsByPlayer.get(pid) || new Map<string, number>();
              const passYPos = m.get("passing yards") || 0;
              const passAttPos = m.get("passing attempts") || 0;
              const rushPos = m.get("rushing attempts") || 0;
              const recPos = m.get("receptions") || 0;
              const signal = passYPos + passAttPos + rushPos + recPos;

              const pt = String(p.propType || "")
                .toLowerCase()
                .trim();
              const isPassing =
                pt.startsWith("passing ") ||
                pt === "passing attempts" ||
                pt === "passing completions" ||
                pt === "passing tds" ||
                pt === "passing interceptions";
              const isReceiving =
                pt === "receiving yards" || pt === "receptions" || pt === "receiving tds";
              const isRushing =
                pt === "rushing yards" || pt === "rushing attempts" || pt === "rushing tds";

              // If we know the player's position from DB, enforce it strictly for passing props.
              const pos = posByPlayerId.get(pid);
              if (isPassing && pos) {
                // Only QBs should show passing markets in the UI.
                if (pos !== "QB") return false;
              }

              // QB detection MUST be based on non-zero passing usage (we store 0-filled passing logs for everyone).
              const isQB = passAttPos >= 2 || passYPos >= 2;
              if (isQB) {
                // QBs: show passing + rushing; only show receiving if they've ever had receptions
                if (isReceiving) return recPos > 0;
                return true;
              }

              // If we have no positive signal yet (rookies/unknown), apply a conservative slate-based rule:
              // Hide passing props when the slate also has receiving props (almost always non-QB trick markets),
              // but keep if the slate is primarily passing/rushing (likely QB).
              if (signal < 1) {
                if (isPassing) {
                  const cats = slateCatsByPlayer.get(pid);
                  if (cats?.receiving) return false;
                  return true;
                }
                return true;
              }

              // Non-QB (with evidence): hide passing markets entirely
              if (isPassing) return false;

              // WR/TE: hide rushing markets unless they've rushed before
              const isReceiver = recPos >= 2;
              if (isReceiver && isRushing) return rushPos > 0;

              return true;
            })
          : enriched;

      // Success on this DB connection
      return filteredByRole;
    } catch (e) {
      const msg = (e as Error)?.message || String(e);
      console.warn("[API] analytics enrichment DB attempt failed:", msg);
      // try next connectionString
    } finally {
      await client.end({ timeout: 1 });
    }
  }

  // All DB attempts failed
  return props;
}

function generateFakeProps(sport: string, limit: number): NormalizedProp[] {
  const books = ["fanduel", "draftkings", "caesars", "mgm"];
  const players = [
    { name: "Patrick Mahomes", team: "KC", opp: "BUF", type: "passing yards", line: 285.5 },
    { name: "Christian McCaffrey", team: "SF", opp: "DAL", type: "rushing yards", line: 72.5 },
    { name: "Justin Jefferson", team: "MIN", opp: "GB", type: "receiving yards", line: 89.5 },
  ];
  const out: NormalizedProp[] = [];
  const count = Math.min(limit, players.length);
  for (let i = 0; i < count; i++) {
    const p = players[i];
    const offers: NormalizedOffer[] = books.map((b, idx) => ({
      book: b,
      overOdds: [-110, -105, +100, +105][(i + idx) % 4],
      underOdds: [-110, -115, -120, +100][(i + 2 * idx) % 4],
    }));
    const id = `${p.name}:${p.type}:${p.line}`.toLowerCase().replace(/\s+/g, "-");
    const prop: NormalizedProp = {
      id,
      sport,
      gameId: `game-${i}`,
      startTime: new Date(Date.now() + 60 * 60 * 1000 * (i + 1)).toISOString(),
      playerId: `player-${i}`,
      playerName: p.name,
      team: p.team,
      opponent: p.opp,
      propType: p.type,
      line: p.line,
      period: "full_game",
      offers,
      best_over: computeBest(offers, "over"),
      best_under: computeBest(offers, "under"),
    };
    out.push(prop);
  }
  return out;
}

// Access guard helper
function requireAccess(feature: import("../lib/auth/access").FeatureId) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      // In development, optionally bypass analytics gating for rapid iteration
      const devAllowAnalytics =
        process.env.DEV_ALLOW_ANALYTICS === "1" || process.env.NODE_ENV !== "production";
      if (devAllowAnalytics && feature === "analytics") {
        return next();
      }
      const authHeader = req.headers.authorization;
      let role: string | undefined;
      let subscription: string | undefined;
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7);
          const { userId, valid } = authService.verifyToken(token);
          if (valid) {
            const user = await authService.getUserById(userId);
            role = (await authService.getUserRole(user.id)) || "user";
            // Owner override by email via env (supports OWNER_EMAILS or VITE_OWNER_EMAILS)
            const ownersCsv = (
              process.env.OWNER_EMAILS ||
              process.env.VITE_OWNER_EMAILS ||
              ""
            ).toLowerCase();
            const ownerList = ownersCsv
              .split(",")
              .map((e) => e.trim())
              .filter(Boolean);
            const userEmail = (user?.email || "").toLowerCase();
            if (userEmail && ownerList.includes(userEmail)) {
              role = "owner";
            }
            subscription =
              role === "owner" ? "premium" : ["admin", "mod"].includes(role) ? "pro" : "free";
          }
        } catch {
          // ignore token parsing errors; treated as unauthenticated
        }
      }
      const decision = canAccessFeature({ role, subscription, feature });
      if (!decision.allowed) {
        return res
          .status(403)
          .json({ success: false, error: decision.reason || "Forbidden", needed: decision.needed });
      }
      return next();
    } catch (e) {
      return res.status(500).json({ success: false, error: "Access check failed" });
    }
  };
}

// Player props: normalized with best odds (public endpoint - no auth required for basic access)
app.get("/api/props", async (req, res) => {
  try {
    const sport = (req.query.sport as string) || "nfl";
    const limit = Number(req.query.limit || 200);
    const base = await fetchNormalizedPlayerProps(sport, Math.min(Math.max(1, limit), 500));
    const data = await enrichPropsWithAnalytics(sport, base);
    res.json({ success: true, count: data.length, items: data });
  } catch (e) {
    console.error("GET /api/props error:", e);
    res.status(500).json({ success: false, error: "Failed to fetch props" });
  }
});

// Player props best list by side (public endpoint - no auth required for basic access)
app.get("/api/props/best", async (req, res) => {
  try {
    const sport = (req.query.sport as string) || "nfl";
    const side = ((req.query.side as string) || "over").toLowerCase();
    const limit = Number(req.query.limit || 50);
    const data = await fetchNormalizedPlayerProps(sport, 500);
    const ranked = data
      .map((p) => ({
        ...p,
        metric: side === "over" ? (p.best_over?.edgePct ?? 0) : (p.best_under?.edgePct ?? 0),
      }))
      .sort((a, b) => (b.metric || 0) - (a.metric || 0))
      .slice(0, Math.min(Math.max(1, limit), 200));
    res.json({ success: true, count: ranked.length, items: ranked });
  } catch (e) {
    console.error("GET /api/props/best error:", e);
    res.status(500).json({ success: false, error: "Failed to fetch best props" });
  }
});

// Player game logs for a specific player UUID + prop type (used by analytics overlay charts)
app.get("/api/player-game-logs", async (req, res) => {
  try {
    const playerUuid = String(
      (req.query.player_uuid || req.query.playerUuid || "") as string,
    ).trim();
    const propType = String((req.query.propType || req.query.prop_type || "") as string).trim();
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    if (!playerUuid || !propType) {
      return res.status(400).json({
        success: false,
        error: "Missing required params: player_uuid and propType",
      });
    }

    const postgres = (await import("postgres")).default;
    const candidates = [
      process.env.SUPABASE_DATABASE_URL,
      process.env.NEON_DATABASE_URL,
      process.env.DATABASE_URL,
    ].filter(Boolean) as string[];
    if (candidates.length === 0) {
      return res.status(500).json({ success: false, error: "No DB URL configured" });
    }

    // Pick a working DB URL (Supabase DNS can fail in some environments)
    let connectionString: string | null = null;
    for (const url of candidates) {
      const probe = postgres(url, { prepare: false, max: 1 });
      try {
        await probe`select 1 as ok`;
        await probe.end({ timeout: 1 });
        connectionString = url;
        break;
      } catch {
        try {
          await probe.end({ timeout: 1 });
        } catch {
          // ignore
        }
      }
    }
    if (!connectionString) {
      return res.status(500).json({ success: false, error: "All DB URL candidates failed" });
    }

    const client = postgres(connectionString, { prepare: false });
    try {
      const rows = (await client.unsafe(
        `
        WITH latest_per_game AS (
          SELECT DISTINCT ON (pgl.game_id)
            pgl.game_date,
            pgl.actual_value::numeric AS actual_value,
            pgl.opponent_id,
            COALESCE(UPPER(t.abbreviation), '') AS opponent_abbr
          FROM public.player_game_logs pgl
          LEFT JOIN public.teams t ON t.id = pgl.opponent_id
          WHERE pgl.player_id = $1::uuid
            AND LOWER(TRIM(pgl.prop_type)) = LOWER(TRIM($2))
          ORDER BY pgl.game_id, pgl.game_date DESC
        )
        SELECT *
        FROM latest_per_game
        ORDER BY game_date DESC
        LIMIT $3::int
      `,
        [playerUuid, propType, limit],
      )) as Array<{
        game_date: string;
        actual_value: string | number;
        opponent_id: string | null;
        opponent_abbr: string;
      }>;

      const values = rows.map((r) => Number(r.actual_value)).filter((n) => Number.isFinite(n));
      let consistency: number | null = null;
      if (values.length >= 5) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
        const sd = Math.sqrt(variance);
        const cv = mean === 0 ? sd : sd / Math.abs(mean);
        // Convert to a 0..100 score (lower variability => higher consistency)
        consistency = Math.max(0, Math.min(100, Math.round(100 - cv * 100)));
      }

      return res.json({
        success: true,
        count: rows.length,
        propType,
        player_uuid: playerUuid,
        consistency,
        items: rows.map((r) => ({
          game_date: r.game_date,
          opponent_abbr: r.opponent_abbr || null,
          actual_value: Number(r.actual_value),
        })),
      });
    } finally {
      await client.end({ timeout: 2 });
    }
  } catch (e: any) {
    console.error("GET /api/player-game-logs error:", e);
    return res.status(500).json({ success: false, error: "Failed to fetch player game logs" });
  }
});

// Real NFL injury lookup (ESPN public endpoint) - used by analytics overlay
// Usage: /api/nfl/injury-status?team=BUF&player=Dawson%20Knox
const nflEspnTeamIdByAbbr: Record<string, string> = {
  ARI: "22",
  ATL: "1",
  BAL: "33",
  BUF: "2",
  CAR: "29",
  CHI: "3",
  CIN: "4",
  CLE: "5",
  DAL: "6",
  DEN: "7",
  DET: "8",
  GB: "9",
  HOU: "34",
  IND: "11",
  JAX: "30",
  KC: "12",
  LV: "13",
  LAC: "24",
  LAR: "14",
  MIA: "15",
  MIN: "16",
  NE: "17",
  NO: "18",
  NYG: "19",
  NYJ: "20",
  PHI: "21",
  PIT: "23",
  SF: "25",
  SEA: "26",
  TB: "27",
  TEN: "10",
  WAS: "28",
};

function normalizeHumanNameLoose(name: string) {
  return String(name || "")
    .toLowerCase()
    .replace(/['.]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findInjuriesArray(obj: any): any[] | null {
  if (!obj || typeof obj !== "object") return null;
  if (Array.isArray((obj as any).injuries)) return (obj as any).injuries;
  for (const k of Object.keys(obj)) {
    const v = (obj as any)[k];
    if (v && typeof v === "object") {
      const found = findInjuriesArray(v);
      if (found) return found;
    }
  }
  return null;
}

app.get("/api/nfl/injury-status", async (req, res) => {
  try {
    const team = String((req.query.team || "") as string)
      .trim()
      .toUpperCase();
    const player = String((req.query.player || "") as string).trim();
    if (!team || !player) {
      return res.status(400).json({ success: false, error: "Missing team and player params" });
    }
    const teamId = nflEspnTeamIdByAbbr[team] || "";
    if (!teamId) {
      return res.status(400).json({ success: false, error: `Unknown NFL team abbr: ${team}` });
    }

    // Cache for 10 minutes (in-memory)
    const cacheKey = `espn-injuries:${teamId}`;
    (globalThis as any).__espnInjuryCache = (globalThis as any).__espnInjuryCache || new Map();
    const cache: Map<string, { ts: number; data: any }> = (globalThis as any).__espnInjuryCache;
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (!cached || now - cached.ts > 10 * 60 * 1000) {
      const urls = [
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}?enable=injuries`,
        `https://site.web.api.espn.com/apis/v2/sports/football/nfl/teams/${teamId}?enable=injuries`,
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/injuries`,
      ];
      let payload: any = null;
      let lastErr: any = null;
      for (const u of urls) {
        try {
          const r = await fetch(u, { headers: { accept: "application/json" } as any });
          if (!r.ok) {
            lastErr = new Error(`HTTP ${r.status}`);
            continue;
          }
          payload = await r.json();
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!payload) {
        return res.status(502).json({ success: false, error: "Failed to fetch ESPN injuries" });
      }
      cache.set(cacheKey, { ts: now, data: payload });
    }

    const data = (cache.get(cacheKey) || {}).data;
    const injuries = findInjuriesArray(data) || [];
    const target = normalizeHumanNameLoose(player);

    let match: any = null;
    for (const it of injuries) {
      const athlete =
        it?.athlete || it?.player || it?.person || it?.athlete?.displayName ? it?.athlete : null;
      const name = athlete?.displayName || athlete?.fullName || it?.name || it?.displayName || "";
      if (!name) continue;
      const n = normalizeHumanNameLoose(name);
      if (n === target) {
        match = it;
        break;
      }
    }

    if (!match) {
      return res.json({
        success: true,
        team,
        player,
        status: "Healthy",
        source: "espn",
        updated_at: new Date((cache.get(cacheKey) || {}).ts || now).toISOString(),
      });
    }

    const statusText =
      match?.status?.name ||
      match?.status?.type ||
      match?.status ||
      match?.injuryStatus ||
      "Unknown";
    const details =
      match?.type?.description ||
      match?.type?.name ||
      match?.injury?.description ||
      match?.injury ||
      null;
    const returnDate = match?.returnDate || match?.date || match?.injury?.date || null;

    return res.json({
      success: true,
      team,
      player,
      status: String(statusText),
      details,
      returnDate,
      source: "espn",
      updated_at: new Date((cache.get(cacheKey) || {}).ts || now).toISOString(),
    });
  } catch (e) {
    console.error("GET /api/nfl/injury-status error:", e);
    return res.status(500).json({ success: false, error: "Failed to fetch injury status" });
  }
});

// Real NFL player position lookup (ESPN public endpoint)
// Usage: /api/nfl/player-position?team=BUF&player=Aaron%20Rodgers
app.get("/api/nfl/player-position", async (req, res) => {
  try {
    const team = String((req.query.team || "") as string)
      .trim()
      .toUpperCase();
    const player = String((req.query.player || "") as string).trim();
    if (!team || !player) {
      return res.status(400).json({ success: false, error: "Missing team and player params" });
    }
    const teamId = nflEspnTeamIdByAbbr[team] || "";
    if (!teamId) {
      return res.status(400).json({ success: false, error: `Unknown NFL team abbr: ${team}` });
    }

    // Cache for 1 hour (in-memory)
    const cacheKey = `espn-position:${teamId}:${normalizeHumanNameLoose(player)}`;
    (globalThis as any).__espnPositionCache = (globalThis as any).__espnPositionCache || new Map();
    const cache: Map<string, { ts: number; data: any }> = (globalThis as any).__espnPositionCache;
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && now - cached.ts < 60 * 60 * 1000) {
      return res.json(cached.data);
    }

    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/roster`;
    const espnRes = await fetch(url);
    if (!espnRes.ok) {
      throw new Error(`ESPN API error ${espnRes.status}`);
    }
    const espnJson = await espnRes.json();

    const athletes = espnJson.athletes || [];
    const normalizedPlayer = normalizeHumanNameLoose(player);
    const found = athletes.find((a: any) => {
      const fullName = String(a.fullName || "").trim();
      return normalizeHumanNameLoose(fullName) === normalizedPlayer;
    });

    if (!found) {
      const result = { success: true, team, player, position: null, source: "espn" };
      cache.set(cacheKey, { data: result, ts: now });
      return res.json(result);
    }

    const position = String(found.position?.abbreviation || found.position?.name || "")
      .trim()
      .toUpperCase();
    const result = {
      success: true,
      team,
      player,
      position: position || null,
      source: "espn",
      updated_at: new Date(now).toISOString(),
    };
    cache.set(cacheKey, { data: result, ts: now });
    res.json(result);
  } catch (e) {
    console.error("GET /api/nfl/player-position error:", e);
    return res.status(500).json({ success: false, error: "Failed to fetch player position" });
  }
});

// Real NFL depth chart lookup (ESPN public endpoint)
// Usage: /api/nfl/depth-chart?team=BUF
app.get("/api/nfl/depth-chart", async (req, res) => {
  try {
    const team = String((req.query.team || "") as string)
      .trim()
      .toUpperCase();
    if (!team) {
      return res.status(400).json({ success: false, error: "Missing team param" });
    }
    const teamId = nflEspnTeamIdByAbbr[team] || "";
    if (!teamId) {
      return res.status(400).json({ success: false, error: `Unknown NFL team abbr: ${team}` });
    }

    // Cache for 1 hour (in-memory)
    const cacheKey = `espn-depth-chart:${teamId}`;
    (globalThis as any).__espnDepthChartCache =
      (globalThis as any).__espnDepthChartCache || new Map();
    const cache: Map<string, { ts: number; data: any }> = (globalThis as any).__espnDepthChartCache;
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && now - cached.ts < 60 * 60 * 1000) {
      return res.json(cached.data);
    }

    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/roster`;
    const espnRes = await fetch(url);
    if (!espnRes.ok) {
      throw new Error(`ESPN API error ${espnRes.status}`);
    }
    const espnJson = await espnRes.json();

    const athletes = espnJson.athletes || [];
    const depthChart: Record<
      string,
      Array<{ name: string; position: string; jersey: string }>
    > = {};

    // Group by position
    for (const athlete of athletes) {
      const pos = String(athlete.position?.abbreviation || athlete.position?.name || "")
        .trim()
        .toUpperCase();
      if (!pos) continue;

      if (!depthChart[pos]) {
        depthChart[pos] = [];
      }

      depthChart[pos].push({
        name: String(athlete.fullName || "").trim(),
        position: pos,
        jersey: String(athlete.jersey || "").trim(),
      });
    }

    // Sort each position group (typically by jersey number or name)
    for (const pos in depthChart) {
      depthChart[pos].sort((a, b) => {
        const aNum = Number(a.jersey) || 999;
        const bNum = Number(b.jersey) || 999;
        return aNum - bNum;
      });
    }

    const result = {
      success: true,
      team,
      depthChart,
      source: "espn",
      updated_at: new Date(now).toISOString(),
    };
    cache.set(cacheKey, { data: result, ts: now });
    res.json(result);
  } catch (e) {
    console.error("GET /api/nfl/depth-chart error:", e);
    return res.status(500).json({ success: false, error: "Failed to fetch depth chart" });
  }
});

// Helper function to fetch ESPN position (used by enrichment)
async function fetchEspnPosition(teamAbbr: string, playerName: string): Promise<string | null> {
  try {
    const team = String(teamAbbr || "")
      .trim()
      .toUpperCase();
    const player = String(playerName || "").trim();
    if (!team || !player) return null;

    const teamId = nflEspnTeamIdByAbbr[team] || "";
    if (!teamId) return null;

    // Check cache first
    const cacheKey = `espn-position:${teamId}:${normalizeHumanNameLoose(player)}`;
    (globalThis as any).__espnPositionCache = (globalThis as any).__espnPositionCache || new Map();
    const cache: Map<string, { ts: number; data: any }> = (globalThis as any).__espnPositionCache;
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && now - cached.ts < 60 * 60 * 1000) {
      return cached.data.position || null;
    }

    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/roster`;
    const espnRes = await fetch(url);
    if (!espnRes.ok) return null;
    const espnJson = await espnRes.json();

    const athletes = espnJson.athletes || [];
    const normalizedPlayer = normalizeHumanNameLoose(player);
    const found = athletes.find((a: any) => {
      const fullName = String(a.fullName || "").trim();
      return normalizeHumanNameLoose(fullName) === normalizedPlayer;
    });

    if (!found) {
      cache.set(cacheKey, { data: { position: null }, ts: now });
      return null;
    }

    const position = String(found.position?.abbreviation || found.position?.name || "")
      .trim()
      .toUpperCase();
    cache.set(cacheKey, { data: { position }, ts: now });
    return position || null;
  } catch (e) {
    console.warn("[ESPN] Failed to fetch position for", teamAbbr, playerName, e);
    return null;
  }
}

// Props list route (served directly from this API server)
app.get("/api/props-list", async (req, res) => {
  try {
    const {
      league,
      market,
      from,
      to,
      limit: limitParam,
    } = req.query as Record<string, string | undefined>;
    const parsedLimit = parseInt(limitParam || "200", 10);
    const limit = Math.min(Number.isFinite(parsedLimit) ? parsedLimit : 200, 500);

    // Helper: map NormalizedProp -> props-list row shape
    const toRow = (np: any) => {
      const over = np?.best_over;
      const under = np?.best_under;
      // Pick a generic odds value if needed (prefer over)
      const genericOdds = over?.american ?? under?.american ?? null;
      // Optional EV percent: take the stronger edge
      const evPct = [over?.edgePct, under?.edgePct]
        .filter((x) => typeof x === "number")
        .sort((a: number, b: number) => (b as number) - (a as number))[0] as number | undefined;
      const leagueStr = mapSportToLeagueId(np.sport) || String(np.sport || "").toUpperCase();
      return {
        id: np.id,
        full_name: np.playerName,
        team: np.team ?? null,
        opponent: np.opponent ?? "TBD",
        market: np.propType,
        line: np.line,
        odds_american: genericOdds,
        over_odds_american: over?.american ?? null,
        under_odds_american: under?.american ?? null,
        ev_percent: typeof evPct === "number" ? evPct : null,
        streak_l5: null,
        rating: null,
        matchup_rank: null,
        l5: null,
        l10: null,
        l20: null,
        h2h_avg: null,
        season_avg: null,
        league: leagueStr,
        game_date: np.startTime ?? null,
        team_logo: null,
        opponent_logo: null,
      };
    };

    // Helper: SGO fallback path honoring basic filters
    const sgoFallback = async () => {
      // Infer sport from league when provided
      const sport = (league || "").toLowerCase() || "nfl";
      let items = await fetchNormalizedPlayerProps(sport, limit);
      // If SGO isn't configured or returns nothing, provide minimal dev fakes (non-production only)
      if ((!items || items.length === 0) && process.env.NODE_ENV !== "production") {
        try {
          items = generateFakeProps(sport, limit);
        } catch {
          items = [] as any[];
        }
      }
      if (market) {
        const m = market.toLowerCase();
        items = items.filter((it) =>
          String(it.propType || "")
            .toLowerCase()
            .includes(m),
        );
      }
      if (from || to) {
        const fromTs = from ? Date.parse(from) : undefined;
        const toTs = to ? Date.parse(to) : undefined;
        items = items.filter((it) => {
          const t = it.startTime ? Date.parse(it.startTime) : NaN;
          if (!Number.isFinite(t)) return true;
          if (fromTs && t < fromTs) return false;
          if (toTs && t > toTs) return false;
          return true;
        });
      }
      const rows = items.slice(0, limit).map(toRow);
      return res.json({ count: rows.length, items: rows });
    };

    // Support both Supabase and Neon connections
    // Priority: SUPABASE_DATABASE_URL > NEON_DATABASE_URL > DATABASE_URL
    const connectionString =
      process.env.SUPABASE_DATABASE_URL ||
      process.env.NEON_DATABASE_URL ||
      process.env.DATABASE_URL;
    if (!connectionString) {
      // No DB configured → return SGO-backed list for dev visibility
      return await sgoFallback();
    }

    // Try DB first; if empty or error, fallback to SGO
    const postgres = (await import("postgres")).default;
    const client = postgres(connectionString, { prepare: false });

    try {
      const where: string[] = [];
      const params: string[] = [];
      if (league) {
        where.push(`league = $${params.length + 1}`);
        params.push(league);
      }
      if (market) {
        where.push(`market = $${params.length + 1}`);
        params.push(market);
      }
      if (from) {
        where.push(`game_date >= $${params.length + 1}`);
        params.push(from);
      }
      if (to) {
        where.push(`game_date <= $${params.length + 1}`);
        params.push(to);
      }

      const sql = `
        SELECT id, full_name, team, COALESCE(opponent, 'TBD') AS opponent,
               market, line, odds_american,
               COALESCE(over_odds_american, 0) AS over_odds_american,
               COALESCE(under_odds_american, 0) AS under_odds_american,
               ev_percent, current_streak AS streak_l5, rating, matchup_rank,
               l5, l10, l20, h2h_avg, season_avg,
               league, game_date,
               team_logo, opponent_logo
        FROM public.v_props_list
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY game_date DESC NULLS LAST
        LIMIT ${limit}
      `;

      const rows = params.length > 0 ? await client.unsafe(sql, params) : await client.unsafe(sql);
      if (Array.isArray(rows) && rows.length > 0) {
        // Enhanced debug logging for analytics
        const analyticsCount = rows.filter(
          (r) =>
            r.l5 !== null ||
            r.l10 !== null ||
            r.l20 !== null ||
            r.h2h_avg !== null ||
            r.season_avg !== null,
        ).length;
        console.log(`[API] Props returned: ${rows.length}, with analytics: ${analyticsCount}`);
        if (rows[0]) {
          console.log("[API] Sample row analytics:", {
            full_name: rows[0].full_name,
            market: rows[0].market,
            l5: rows[0].l5,
            l10: rows[0].l10,
            l20: rows[0].l20,
            h2h_avg: rows[0].h2h_avg,
            season_avg: rows[0].season_avg,
            current_streak: rows[0].streak_l5,
            matchup_rank: rows[0].matchup_rank,
            ev_percent: rows[0].ev_percent,
          });
        }
        return res.json({ count: rows.length, items: rows });
      }
      // Empty DB result → fallback to SGO for dev usability
      return await sgoFallback();
    } catch (err) {
      console.warn(
        "/api/props-list DB path failed, using SGO fallback:",
        (err as Error)?.message || err,
      );
      return await sgoFallback();
    } finally {
      // Always close the client quickly
      await client.end({ timeout: 1 });
    }
  } catch (e) {
    const err = e as Error;
    console.error("GET /api/props-list error:", err.message || e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Auth routes
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, display_name, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    // Get client info
    const ip_address =
      req.ip || req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
    const user_agent = req.headers["user-agent"] || "unknown";

    const tokens = await authService.signup(
      {
        email,
        password,
        display_name: display_name || displayName,
      },
      {
        ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
        user_agent,
      },
    );

    res.json({
      success: true,
      data: {
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        expiresIn: 900, // 15 minutes in seconds
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Signup failed",
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    // Get client info
    const ip_address =
      req.ip || req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
    const user_agent = req.headers["user-agent"] || "unknown";

    const tokens = await authService.login(
      {
        email,
        password,
      },
      {
        ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
        user_agent,
      },
    );

    res.json({
      success: true,
      data: {
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        expiresIn: 900, // 15 minutes in seconds
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Login failed",
    });
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Authorization header required",
      });
    }

    const token = authHeader.substring(7);
    const { userId, valid } = authService.verifyToken(token);

    if (!valid) {
      return res.status(401).json({
        success: false,
        error: "Invalid token",
      });
    }

    const user = await authService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Derive subscription tier from role until billing system is integrated
    let role = "user";
    try {
      role = await authService.getUserRole(user.id);
    } catch (e) {
      // ignore, default to user
    }
    const subscription_tier =
      role === "owner" ? "premium" : ["admin", "mod"].includes(role) ? "pro" : "free";

    res.json({
      success: true,
      data: { ...user, role, subscription_tier },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get user",
    });
  }
});

app.post("/api/auth/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: "Refresh token is required",
      });
    }

    // Get client info
    const ip_address =
      req.ip || req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
    const user_agent = req.headers["user-agent"] || "unknown";

    const result = await authService.refreshToken(
      {
        refreshToken,
      },
      {
        ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
        user_agent,
      },
    );

    res.json({
      success: true,
      data: {
        token: result.token,
        expiresIn: 900, // 15 minutes in seconds
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Token refresh failed",
    });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: "Refresh token is required",
      });
    }

    // Get client info
    const ip_address =
      req.ip || req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
    const user_agent = req.headers["user-agent"] || "unknown";

    await authService.logout(refreshToken, {
      ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
      user_agent,
    });

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Logout failed",
    });
  }
});

// Send email verification code route
app.post("/api/auth/send-verification-code", async (req, res) => {
  try {
    const { email, purpose } = req.body;

    if (!email || !purpose) {
      return res.status(400).json({
        success: false,
        error: "Email and purpose are required",
      });
    }

    const ip_address =
      req.ip || req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
    const user_agent = req.headers["user-agent"] || "unknown";

    await authService.sendEmailVerificationCode(email, purpose, {
      ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
      user_agent,
    });

    res.json({
      success: true,
      message: "Verification code sent successfully",
    });
  } catch (error) {
    console.error("Send verification code error:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Failed to send verification code",
    });
  }
});

// Verify email code route
app.post("/api/auth/verify-code", async (req, res) => {
  try {
    const { email, code, purpose } = req.body;

    if (!email || !code || !purpose) {
      return res.status(400).json({
        success: false,
        error: "Email, code, and purpose are required",
      });
    }

    const isValid = await authService.verifyEmailCode(email, code, purpose);

    res.json({
      success: true,
      data: { valid: isValid },
    });
  } catch (error) {
    console.error("Verify code error:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Failed to verify code",
    });
  }
});

// Update password route
app.post("/api/auth/update-password", async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "User ID and new password are required",
      });
    }

    const ip_address =
      req.ip || req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
    const user_agent = req.headers["user-agent"] || "unknown";

    await authService.updatePassword(userId, newPassword, {
      ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
      user_agent,
    });

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Failed to update password",
    });
  }
});

// Update email route
app.post("/api/auth/update-email", async (req, res) => {
  try {
    const { userId, newEmail } = req.body;

    if (!userId || !newEmail) {
      return res.status(400).json({
        success: false,
        error: "User ID and new email are required",
      });
    }

    const ip_address =
      req.ip || req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
    const user_agent = req.headers["user-agent"] || "unknown";

    await authService.updateEmail(userId, newEmail, {
      ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
      user_agent,
    });

    res.json({
      success: true,
      message: "Email updated successfully",
    });
  } catch (error) {
    console.error("Update email error:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Failed to update email",
    });
  }
});

// Update profile route
app.post("/api/auth/update-profile", async (req, res) => {
  try {
    const { userId, display_name, username } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }

    const ip_address =
      req.ip || req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
    const user_agent = req.headers["user-agent"] || "unknown";

    const updates: { display_name?: string; username?: string } = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (username !== undefined) updates.username = username;

    await authService.updateUserProfile(userId, updates, {
      ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
      user_agent,
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Failed to update profile",
    });
  }
});

// Get subscription tier
app.get("/api/auth/subscription/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: "User ID is required" });
    const user = await authService.getUserById(userId);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    res.json({
      success: true,
      data: { subscription_tier: (user as any).subscription_tier || "free" },
    });
  } catch (error) {
    console.error("Get subscription tier error:", error);
    res
      .status(500)
      .json({ success: false, error: (error as any).message || "Failed to get subscription" });
  }
});

// Update subscription tier (to be protected later; for now, called by Plans UI)
app.post("/api/auth/update-subscription", async (req, res) => {
  try {
    const { userId, subscription_tier } = req.body as {
      userId: string;
      subscription_tier: "free" | "pro" | "premium" | "free_trial";
    };
    if (!userId || !subscription_tier) {
      return res
        .status(400)
        .json({ success: false, error: "userId and subscription_tier are required" });
    }
    await authService.updateSubscriptionTier(userId, subscription_tier);
    res.json({ success: true, message: "Subscription updated" });
  } catch (error) {
    console.error("Update subscription tier error:", error);
    res
      .status(500)
      .json({ success: false, error: (error as any).message || "Failed to update subscription" });
  }
});

// Get user role route
app.get("/api/auth/user-role/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }

    const role = await authService.getUserRole(userId);

    res.json({
      success: true,
      data: { role },
    });
  } catch (error) {
    console.error("Get user role error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get user role",
    });
  }
});

// Player analytics routes
app.get("/api/player-analytics", async (req, res) => {
  try {
    const { playerId, propType, season } = req.query;

    if (!playerId || !propType) {
      return res.status(400).json({
        success: false,
        error: "playerId and propType are required",
      });
    }

    // Import the analytics logic
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const { sql } = await import("drizzle-orm");

    const connectionString =
      process.env.SUPABASE_DATABASE_URL ||
      process.env.NEON_DATABASE_URL ||
      process.env.DATABASE_URL;
    if (!connectionString) {
      return res.status(500).json({ success: false, error: "DATABASE_URL is not configured" });
    }
    const client = postgres(connectionString);
    const db = drizzle(client);

    // Get player analytics
    const analytics = await db.execute(sql`
      WITH player_stats AS (
        SELECT 
          pgl.player_id,
          pgl.prop_type,
          pgl.season,
          COUNT(*) as total_games,
          AVG(pgl.actual_value) as career_avg,
          AVG(pgl.hit::int) as career_hit_rate,
          MAX(pgl.game_date) as last_game_date,
          MIN(pgl.game_date) as first_game_date
        FROM player_game_logs pgl
        WHERE pgl.player_id = ${playerId as string}
          AND pgl.prop_type = ${propType as string}
          AND pgl.season = ${(season as string) || "2025"}
        GROUP BY pgl.player_id, pgl.prop_type, pgl.season
      ),
      recent_games AS (
        SELECT 
          pgl.player_id,
          pgl.prop_type,
          pgl.game_date,
          pgl.actual_value,
          pgl.line,
          pgl.hit,
          ROW_NUMBER() OVER (ORDER BY pgl.game_date DESC) as rn
        FROM player_game_logs pgl
        WHERE pgl.player_id = ${playerId as string}
          AND pgl.prop_type = ${propType as string}
          AND pgl.season = ${(season as string) || "2025"}
        ORDER BY pgl.game_date DESC
      ),
      rolling_stats AS (
        SELECT 
          AVG(actual_value) as avg_l5,
          AVG(hit::int) as hit_rate_l5
        FROM recent_games
        WHERE rn <= 5
      ),
      streak_data AS (
        SELECT 
          hit,
          COUNT(*) as streak_length,
          ROW_NUMBER() OVER (ORDER BY game_date DESC) as rn
        FROM recent_games
        WHERE rn <= 10
        GROUP BY hit, game_date
        ORDER BY game_date DESC
        LIMIT 1
      )
      SELECT 
        ps.total_games,
        ps.career_avg,
        ps.career_hit_rate,
        ps.last_game_date,
        ps.first_game_date,
        COALESCE(rs.avg_l5, 0) as avg_l5,
        COALESCE(rs.hit_rate_l5, 0) as hit_rate_l5,
        COALESCE(sd.streak_length, 0) as current_streak,
        COALESCE(sd.hit, false) as current_streak_type
      FROM player_stats ps
      LEFT JOIN rolling_stats rs ON 1=1
      LEFT JOIN streak_data sd ON sd.rn = 1
    `);

    // Get recent games
    const recentGames = await db.execute(sql`
      SELECT 
        pgl.game_date,
        pgl.actual_value,
        pgl.line,
        pgl.hit,
        g.home_team_id,
        g.away_team_id,
        ht.name as home_team,
        at.name as away_team,
        pgl.home_away
      FROM player_game_logs pgl
      JOIN games g ON pgl.game_id = g.id
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE pgl.player_id = ${playerId as string}
        AND pgl.prop_type = ${propType as string}
        AND pgl.season = ${(season as string) || "2025"}
      ORDER BY pgl.game_date DESC
      LIMIT 10
    `);

    await client.end();

    const result = {
      analytics: Array.isArray(analytics) ? analytics[0] || {} : {},
      recentGames: recentGames || [],
      summary: {
        totalGames: (Array.isArray(analytics) && analytics[0]?.total_games) || 0,
        careerAvg: Array.isArray(analytics) ? Number(analytics[0]?.career_avg ?? 0) : 0,
        careerHitRate: Array.isArray(analytics) ? Number(analytics[0]?.career_hit_rate ?? 0) : 0,
        avgL5: Array.isArray(analytics) ? Number(analytics[0]?.avg_l5 ?? 0) : 0,
        hitRateL5: Array.isArray(analytics) ? Number(analytics[0]?.hit_rate_l5 ?? 0) : 0,
        currentStreak: (Array.isArray(analytics) && analytics[0]?.current_streak) || 0,
        currentStreakType:
          Array.isArray(analytics) && analytics[0]?.current_streak_type ? "over" : "under",
      },
    };

    res.json(result);
  } catch (error) {
    const err = error as Error;
    console.error("Player analytics API error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Diagnostics: analytics status and join health (opt-in via DIAGNOSTICS_ENABLED=true)
if (process.env.DIAGNOSTICS_ENABLED === "true") {
  app.get("/api/diagnostics/analytics-status", async (req, res) => {
    try {
      const connectionString =
        process.env.SUPABASE_DATABASE_URL ||
        process.env.NEON_DATABASE_URL ||
        process.env.DATABASE_URL;
      if (!connectionString) {
        return res.status(500).json({ success: false, error: "DATABASE_URL is not configured" });
      }
      const postgres = (await import("postgres")).default;
      const client = postgres(connectionString, { prepare: false });

      const results: Record<string, any> = { success: true, checks: {} };
      try {
        const [{ count }] = await client.unsafe(
          "select count(*)::int as count from proplines where team_id = 'UNK' or opponent_id = 'UNK'",
        );
        results.checks.unknownTeams = count;
      } catch (e) {
        results.checks.unknownTeams = { error: (e as Error).message };
      }

      try {
        const [{ count }] = await client.unsafe(
          "select count(*)::int as count from analytics_props",
        );
        results.checks.analyticsPropsCount = count;
      } catch (e) {
        results.checks.analyticsPropsCount = { error: (e as Error).message };
      }

      try {
        const sample = await client.unsafe("select * from analytics_props limit 20");
        results.checks.analyticsPropsSample = sample;
      } catch (e) {
        results.checks.analyticsPropsSample = { error: (e as Error).message };
      }

      try {
        const [{ count }] = await client.unsafe(
          "select count(*)::int as count from player_game_logs",
        );
        results.checks.playerGameLogsCount = count;
      } catch (e) {
        results.checks.playerGameLogsCount = { error: (e as Error).message };
      }

      try {
        const [{ count }] = await client.unsafe(
          "select count(*)::int as count from player_analytics",
        );
        results.checks.playerAnalyticsCount = count;
      } catch (e) {
        results.checks.playerAnalyticsCount = { error: (e as Error).message };
      }

      try {
        await client.end({ timeout: 1 });
      } catch (e) {
        // noop: best-effort to close client
      }

      return res.json(results);
    } catch (error) {
      const err = error as Error;
      console.error("Diagnostics error:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });
}

// Enriched player analytics routes
app.get("/api/player-analytics-enriched", async (req, res) => {
  try {
    const { playerId, propType, season } = req.query;

    if (!playerId || !propType) {
      return res.status(400).json({
        success: false,
        error: "playerId and propType are required",
      });
    }

    // Validate playerId is a UUID; if not, we can't query the analytics table (which uses uuid)
    const isUuid = (v: unknown) =>
      typeof v === "string" &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
        v,
      );
    if (!isUuid(playerId)) {
      return res.json({
        analytics: null,
        recentGames: [],
        summary: {
          totalGames: 0,
          careerAvg: 0,
          careerHitRate: 0,
          avgL5: 0,
          hitRateL5: 0,
          currentStreak: 0,
          currentStreakType: null,
        },
      });
    }

    // Import the analytics logic
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const { sql } = await import("drizzle-orm");

    const connectionString =
      process.env.SUPABASE_DATABASE_URL ||
      process.env.NEON_DATABASE_URL ||
      process.env.DATABASE_URL;
    if (!connectionString) {
      return res.status(500).json({ success: false, error: "DATABASE_URL is not configured" });
    }
    const client = postgres(connectionString);
    const db = drizzle(client);

    // Fetch from the player_analytics table
    // Prefer the requested season when provided, otherwise take the most recent season
    const analyticsResult = await db.execute(sql`
      ${
        season
          ? sql`SELECT * FROM public.player_analytics
               WHERE player_id = ${playerId as string}
                 AND prop_type = ${propType as string}
                 AND season = ${season as string}
               ORDER BY last_updated DESC NULLS LAST
               LIMIT 1`
          : sql`SELECT * FROM (
                 SELECT DISTINCT ON (player_id) *
                 FROM public.player_analytics
                 WHERE player_id = ${playerId as string}
                   AND prop_type = ${propType as string}
                 ORDER BY player_id, season DESC, last_updated DESC NULLS LAST
               ) t`
      }
    `);

    const analyticsData = analyticsResult[0];

    if (!analyticsData) {
      // Return empty data structure if no analytics found
      return res.json({
        analytics: null,
        recentGames: [],
        summary: {
          totalGames: 0,
          careerAvg: 0,
          careerHitRate: 0,
          avgL5: 0,
          hitRateL5: 0,
          currentStreak: 0,
          currentStreakType: null,
        },
      });
    }

    // Fetch recent games from player_game_logs
    const recentGamesResult = await db.execute(sql`
      SELECT 
        pgl.game_date, 
        pgl.actual_value, 
        pgl.line, 
        pgl.home_away,
        t.abbreviation as team,
        ot.abbreviation as opponent
      FROM public.player_game_logs pgl
      JOIN public.teams t ON t.id = pgl.team_id
      LEFT JOIN public.teams ot ON ot.id = pgl.opponent_team_id
      WHERE pgl.player_id = ${playerId as string}
      AND pgl.prop_type = ${propType as string}
      ${season ? sql`AND EXTRACT(YEAR FROM pgl.game_date)::text = ${season as string}` : sql``}
      ORDER BY pgl.game_date DESC
      LIMIT 20;
    `);

    const transformedRecentGames = recentGamesResult.map((game: Record<string, unknown>) => ({
      game_date: game.game_date,
      actual_value: game.actual_value,
      line: game.line,
      hit: game.actual_value > game.line,
      team: game.team,
      opponent: game.opponent,
      home_away: game.home_away,
    }));

    // Construct summary object from enriched data
    const summary = {
      totalGames: analyticsData.season_games_2025 || 0,
      careerAvg: 0, // Could be computed from recent games if needed
      careerHitRate: analyticsData.season_hit_rate_2025 || 0,
      avgL5: 0, // Could be computed from recent games if needed
      hitRateL5: analyticsData.l5_hit_rate || 0,
      currentStreak: analyticsData.current_streak || 0,
      currentStreakType: analyticsData.streak_direction || null,
    };

    res.json({
      analytics: analyticsData,
      recentGames: transformedRecentGames,
      summary: summary,
    });
  } catch (error) {
    const err = error as Error;
    console.error("Error fetching enriched player analytics:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.post("/api/player-analytics-bulk", async (req, res) => {
  try {
    const { playerIds, propType, season } = req.body;

    if (!playerIds || !Array.isArray(playerIds) || !propType) {
      return res.status(400).json({
        success: false,
        error: "playerIds array and propType are required",
      });
    }

    // Validate and normalize player IDs to UUIDs only (table uses uuid)
    const isUuid = (v: unknown) =>
      typeof v === "string" &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
        v,
      );
    const requestedIds: string[] = Array.isArray(playerIds)
      ? Array.from(new Set((playerIds as string[]).filter((id) => typeof id === "string")))
      : [];
    let uuidIds: string[] = requestedIds.filter(isUuid);
    const nonUuidIds: string[] = requestedIds.filter((id) => !isUuid(id));

    // If no UUIDs yet, attempt to map non-UUID playerIds to canonical UUIDs using players.external_id
    // This supports external vendor IDs passed from the frontend
    let mappedCount = 0;
    if (nonUuidIds.length > 0) {
      try {
        // Import DB utilities only if we need them for mapping
        const { drizzle } = await import("drizzle-orm/postgres-js");
        const postgres = (await import("postgres")).default;
        const { sql } = await import("drizzle-orm");

        const connectionString =
          process.env.SUPABASE_DATABASE_URL ||
          process.env.NEON_DATABASE_URL ||
          process.env.DATABASE_URL;
        if (connectionString) {
          const clientForMap = postgres(connectionString);
          const dbForMap = drizzle(clientForMap);

          // Map external_id -> id (uuid)
          const mapRows = await dbForMap.execute(sql`
            SELECT external_id, id
            FROM public.players
            WHERE external_id IN (${sql.join(nonUuidIds, sql`, `)})
          `);

          const mappedUUIDs: string[] = Array.isArray(mapRows)
            ? (mapRows as any[])
                .map((r) => (typeof r?.id === "string" && isUuid(r.id) ? r.id : null))
                .filter(Boolean)
            : [];

          if (mappedUUIDs.length > 0) {
            const set = new Set(uuidIds);
            mappedUUIDs.forEach((id) => set.add(id));
            uuidIds = Array.from(set);
            mappedCount = mappedUUIDs.length;
          }

          await clientForMap.end({ timeout: 1 });
        }
      } catch (e) {
        // Non-fatal: mapping is best-effort
        console.warn("[analytics-bulk] external_id mapping failed:", e);
      }
    }

    if (uuidIds.length === 0) {
      // No valid UUIDs to query even after mapping; return empty analytics gracefully
      return res.json({ analytics: [] });
    }

    // Import the analytics logic
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const { sql } = await import("drizzle-orm");

    const connectionString =
      process.env.SUPABASE_DATABASE_URL ||
      process.env.NEON_DATABASE_URL ||
      process.env.DATABASE_URL;
    if (!connectionString) {
      return res.status(500).json({ success: false, error: "DATABASE_URL is not configured" });
    }
    const client = postgres(connectionString);
    const db = drizzle(client);

    // Helper: normalize prop type in SQL (lowercase alnum only)
    const normExpr = (col: any) => sql`LOWER(REGEXP_REPLACE(${col}, '[^a-z0-9]', '', 'g'))`;

    // Fetch bulk analytics: pick the latest record per player for the given prop type.
    // If a season is provided, filter to that season; otherwise choose most recent season per player.
    // Primary fetch (exact propType match)
    console.log(
      "[analytics-bulk] request",
      JSON.stringify({ count: uuidIds.length, propType, season, mappedFromExternal: mappedCount }),
    );

    const analyticsResult = await db.execute(sql`
      ${
        season
          ? sql`SELECT * FROM public.player_analytics
               WHERE player_id IN (${sql.join(uuidIds, sql`, `)})
                 AND prop_type = ${propType}
                 AND season = ${season}`
          : sql`SELECT DISTINCT ON (player_id) *
               FROM public.player_analytics
               WHERE player_id IN (${sql.join(uuidIds, sql`, `)})
                 AND prop_type = ${propType}
               ORDER BY player_id, season DESC, last_updated DESC NULLS LAST`
      }
    `);

    // Fallback: if season was provided but results are empty or incomplete,
    // backfill missing players with their latest available season.
    let rows: any[] = Array.isArray(analyticsResult) ? (analyticsResult as any[]) : [];

    // Stage 2 fallback: if some players missing, try normalized propType matching
    const requestedNorm = (propType || "")
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const foundIdsStage1 = new Set(rows.map((r: any) => r.player_id));
    const missingStage1 = uuidIds.filter((id) => !foundIdsStage1.has(id));
    if (missingStage1.length > 0) {
      const fallback2 = await db.execute(sql`
        ${
          season
            ? sql`SELECT DISTINCT ON (player_id) *
                 FROM public.player_analytics
                 WHERE player_id IN (${sql.join(missingStage1, sql`, `)})
                   AND ${normExpr(sql.identifier("prop_type"))} = ${requestedNorm}
                   AND season = ${season}
                 ORDER BY player_id, season DESC, last_updated DESC NULLS LAST`
            : sql`SELECT DISTINCT ON (player_id) *
                 FROM public.player_analytics
                 WHERE player_id IN (${sql.join(missingStage1, sql`, `)})
                   AND ${normExpr(sql.identifier("prop_type"))} = ${requestedNorm}
                 ORDER BY player_id, season DESC, last_updated DESC NULLS LAST`
        }
      `);
      const fb2Rows = Array.isArray(fallback2) ? (fallback2 as any[]) : [];
      rows = [...rows, ...fb2Rows];
    }

    // Stage 3 fallback: for any still-missing players, return latest season for any propType
    const foundIdsStage2 = new Set(rows.map((r: any) => r.player_id));
    const missingStage2 = uuidIds.filter((id) => !foundIdsStage2.has(id));
    if (missingStage2.length > 0) {
      const fallback3 = await db.execute(sql`
        SELECT DISTINCT ON (player_id) *
        FROM public.player_analytics
        WHERE player_id IN (${sql.join(missingStage2, sql`, `)})
        ORDER BY player_id, season DESC, last_updated DESC NULLS LAST
      `);
      const fb3Rows = Array.isArray(fallback3) ? (fallback3 as any[]) : [];
      rows = [...rows, ...fb3Rows];
    }

    // Optional debug summary
    try {
      const missingFinal = uuidIds.length - new Set(rows.map((r: any) => r.player_id)).size;
      if (missingFinal > 0) {
        console.warn(
          `[analytics-bulk] requested=${uuidIds.length} matched=${uuidIds.length - missingFinal} missing=${missingFinal} propType="${propType}"`,
        );
      }
    } catch (e) {
      // Non-fatal: just debug-log any unexpected error in summary calculation
      console.debug("[analytics-bulk] summary calc error", e);
    }

    console.log(
      "[analytics-bulk] response",
      JSON.stringify({ requested: (playerIds as string[]).length, returned: rows.length }),
    );

    // Enrich rows with H2H hit counts (best-effort). This computes the number of games
    // and hit rate vs the stored opponent_team_id for each returned analytics row so the
    // frontend can display hits/total/pct for H2H without requiring a schema change.
    for (const r of rows) {
      try {
        const opponentId = r?.opponent_team_id || null;
        if (!opponentId) {
          r.h2h_games = 0;
          r.h2h_hits = 0;
          r.h2h_pct = 0;
          continue;
        }

        const stats = await db.execute(sql`
          SELECT
            COUNT(*)::int AS total,
            SUM((CASE WHEN (pgl.hit IS TRUE) THEN 1 ELSE 0 END))::int AS hits
          FROM public.player_game_logs pgl
          WHERE pgl.player_id = ${r.player_id}
            AND pgl.prop_type = ${propType}
            AND ${season ? sql`EXTRACT(YEAR FROM pgl.game_date)::text = ${season}` : sql`TRUE`}
            AND (pgl.opponent_team_id = ${opponentId} OR pgl.opponent_id = ${opponentId})
        `);

        const statRow = Array.isArray(stats) && stats.length > 0 ? stats[0] : null;
        const total = statRow?.total ? Number(statRow.total) : 0;
        const hits = statRow?.hits ? Number(statRow.hits) : 0;

        r.h2h_games = total;
        r.h2h_hits = hits;
        r.h2h_pct = total > 0 ? (hits / total) * 100 : 0;
      } catch (e) {
        // Best-effort enrichment only; don't fail the whole response
        console.debug("[analytics-bulk] h2h enrichment failed for", r?.player_id, e);
        r.h2h_games = 0;
        r.h2h_hits = 0;
        r.h2h_pct = 0;
      }
    }

    res.json({ analytics: rows });
  } catch (error) {
    const err = error as Error;
    console.error("Error fetching bulk enriched player analytics:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Local API server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
  console.log(`📊 Analytics endpoints: http://localhost:${PORT}/api/player-analytics`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down API server...");
  await authService.close();
  process.exit(0);
});

export default app;
