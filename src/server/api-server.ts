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
  team?: string;
  opponent?: string;
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
};

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
    rushing_yards: "Rushing Yards",
    receiving_yards: "Receiving Yards",
    receiving_receptions: "Receptions",
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
    const homeAbbr =
      ev.homeTeamAbbr ||
      ev.homeTeam ||
      ev.home ||
      ev.home_abbr ||
      ev.homeAbbreviation ||
      ev.homeShort ||
      ev.home_code ||
      undefined;
    const awayAbbr =
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
      const playerTeamRaw = (odd.playerTeam || odd.team || "").toString();
      const pt = playerTeamRaw.toUpperCase();
      const h = (homeAbbr || "").toString().toUpperCase();
      const a = (awayAbbr || "").toString().toUpperCase();
      const inferredOpp = pt && (pt === h || pt === a) ? (pt === h ? a : h) : undefined;
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
            team: playerTeamRaw || undefined,
            opponent: inferredOpp,
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

  // For NFL/NBA, filter to offensive markets only
  function isOffensiveProp(s: string, prop: string): boolean {
    const sl = s.toLowerCase();
    const p = prop.toLowerCase();
    if (sl === "nfl") {
      // Common offensive markets
      const allow = [
        "passing yards",
        "passing tds",
        "longest completion",
        "rushing yards",
        "rushing attempts",
        "longest rush",
        "rushing tds",
        "receiving yards",
        "receptions",
        "longest reception",
        "receiving tds",
      ];
      return allow.includes(p);
    }
    if (sl === "nba") {
      const allow = ["points", "assists", "rebounds"];
      return allow.includes(p);
    }
    return true; // other sports unchanged
  }

  const filtered = normalized.filter((np) => isOffensiveProp(sport, np.propType));

  sgoCache.set(key, { data: filtered, ts: now });
  return filtered;
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

// Player props: normalized with best odds
app.get("/api/props", requireAccess("analytics"), async (req, res) => {
  try {
    const sport = (req.query.sport as string) || "nfl";
    const limit = Number(req.query.limit || 200);
    const data = await fetchNormalizedPlayerProps(sport, Math.min(Math.max(1, limit), 500));
    res.json({ success: true, count: data.length, items: data });
  } catch (e) {
    console.error("GET /api/props error:", e);
    res.status(500).json({ success: false, error: "Failed to fetch props" });
  }
});

// Player props best list by side
app.get("/api/props/best", requireAccess("analytics"), async (req, res) => {
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

    // Helper: SGO fallback path honoring basic filters, with best-effort DB enrichment when available
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

      // Best-effort enrichment from DB analytics when available: map by player name + prop type + current season
      try {
        const connStr = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
        if (connStr) {
          const pg = (await import("postgres")).default;
          const client = pg(connStr, { prepare: false });
          try {
            // Derive a simple season string from today (sports-specific nuances are handled in enrichment already)
            const today = new Date();
            const season = String(today.getFullYear());
            for (let i = 0; i < rows.length; i++) {
              const r = rows[i] as any;
              const name = (r?.full_name || "").toString().trim();
              const propType = (r?.market || "").toString().trim();
              if (!name || !propType) continue;
              // Resolve player by exact name match first, fallback to ILIKE fuzzy
              let playerRow: any | undefined = (
                await client.unsafe(`SELECT id FROM public.players WHERE name = $1 LIMIT 1`, [name])
              )[0];
              if (!playerRow) {
                playerRow = (
                  await client.unsafe(
                    `SELECT id FROM public.players WHERE LOWER(name) = LOWER($1) LIMIT 1`,
                    [name],
                  )
                )[0];
              }
              const playerId: string | undefined = playerRow?.id;
              if (!playerId) continue;
              const a = (
                await client.unsafe(
                  `SELECT l5, l10, l20, current_streak, h2h_avg, season_avg, matchup_rank, ev_percent
                   FROM public.player_analytics
                   WHERE player_id = $1 AND prop_type = $2 AND season = $3
                   ORDER BY last_updated DESC NULLS LAST
                   LIMIT 1`,
                  [playerId, propType, season],
                )
              )[0];
              if (a) {
                r.l5 = a.l5 ?? r.l5;
                r.l10 = a.l10 ?? r.l10;
                r.l20 = a.l20 ?? r.l20;
                r.streak_l5 = r.streak_l5 ?? null; // keep placeholder
                r.h2h_avg = a.h2h_avg ?? r.h2h_avg;
                r.season_avg = a.season_avg ?? r.season_avg;
                r.matchup_rank = a.matchup_rank ?? r.matchup_rank;
                // Prefer DB EV if present; otherwise keep SGO-derived ev_percent
                if (a.ev_percent != null && a.ev_percent !== undefined) {
                  r.ev_percent = a.ev_percent;
                }
              }
            }
          } finally {
            await client.end({ timeout: 1 });
          }
        }
      } catch (e) {
        // Non-fatal: fallback remains usable without enrichment
        console.warn("props-list fallback enrichment skipped:", (e as Error)?.message || e);
      }

      return res.json({ count: rows.length, items: rows, source: "sgo-fallback" });
    };

    const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
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
        SELECT id,
               COALESCE(full_name, 'Unknown Player') AS full_name,
               -- Prefer DB-provided team/opponent; if missing, derive from logo URL path (ESPN pattern) to avoid 'UNK'/'TBD'
               COALESCE(
                 team,
                 UPPER(NULLIF(regexp_replace(
                   COALESCE(team_logo, ''),
                   '.*\/([a-z0-9]+)\\.png$',
                   '\\1'
                 ), '')),
                 'UNK'
               ) AS team,
               COALESCE(
                 opponent,
                 UPPER(NULLIF(regexp_replace(
                   COALESCE(opponent_logo, ''),
                   '.*\/([a-z0-9]+)\\.png$',
                   '\\1'
                 ), '')),
                 'TBD'
               ) AS opponent,
               market,
               COALESCE(line, 0) AS line,
               COALESCE(odds_american, 0) AS odds_american,
               COALESCE(over_odds_american, 0) AS over_odds_american,
               COALESCE(under_odds_american, 0) AS under_odds_american,
               COALESCE(ev_percent, 0) AS ev_percent,
               COALESCE(streak_l5, 0) AS streak_l5,
               COALESCE(rating, 0) AS rating,
               COALESCE(matchup_rank, 0) AS matchup_rank,
               COALESCE(l5, 0) AS l5,
               COALESCE(l10, 0) AS l10,
               COALESCE(l20, 0) AS l20,
               COALESCE(h2h_avg, 0) AS h2h_avg,
               COALESCE(season_avg, 0) AS season_avg,
               COALESCE(league, 'UNK') AS league,
               game_date,
               -- Ensure logos are never null: prefer DB-provided, else ESPN CDN by league/team/opponent, else empty string
               -- Sanitize and fallback: remove CR/LF and whitespace from URLs
               regexp_replace(
                 COALESCE(
                   team_logo,
                   CASE UPPER(league)
                     WHEN 'NFL' THEN 'https://a.espncdn.com/i/teamlogos/nfl/500/' || lower(COALESCE(team, '')) || '.png'
                     WHEN 'NBA' THEN 'https://a.espncdn.com/i/teamlogos/nba/500/' || lower(COALESCE(team, '')) || '.png'
                     WHEN 'MLB' THEN 'https://a.espncdn.com/i/teamlogos/mlb/500/' || lower(COALESCE(team, '')) || '.png'
                     WHEN 'NHL' THEN 'https://a.espncdn.com/i/teamlogos/nhl/500/' || lower(COALESCE(team, '')) || '.png'
                     ELSE ''
                   END,
                   ''
                 ), E'[\r\n]', '', 'g'
               ) AS team_logo,
               regexp_replace(
                 COALESCE(
                   opponent_logo,
                   CASE UPPER(league)
                     WHEN 'NFL' THEN 'https://a.espncdn.com/i/teamlogos/nfl/500/' || lower(COALESCE(opponent, '')) || '.png'
                     WHEN 'NBA' THEN 'https://a.espncdn.com/i/teamlogos/nba/500/' || lower(COALESCE(opponent, '')) || '.png'
                     WHEN 'MLB' THEN 'https://a.espncdn.com/i/teamlogos/mlb/500/' || lower(COALESCE(opponent, '')) || '.png'
                     WHEN 'NHL' THEN 'https://a.espncdn.com/i/teamlogos/nhl/500/' || lower(COALESCE(opponent, '')) || '.png'
                     ELSE ''
                   END,
                   ''
                 ), E'[\r\n]', '', 'g'
               ) AS opponent_logo
        FROM public.v_props_list
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY game_date DESC NULLS LAST
        LIMIT ${limit}
      `;

      const rows = params.length > 0 ? await client.unsafe(sql, params) : await client.unsafe(sql);
      if (Array.isArray(rows) && rows.length > 0) {
        return res.json({ count: rows.length, items: rows, source: "db" });
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

    const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
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
      const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
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

    const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
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

        const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
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

    const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
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
