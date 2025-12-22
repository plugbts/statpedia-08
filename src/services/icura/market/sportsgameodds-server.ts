/**
 * Server-side SportsGameOdds fetcher for Icura market ingestion.
 *
 * NOTE: This is separate from the frontend `sportsGameOddsAPI` which uses localStorage and browser-only behavior.
 */

export interface SgoGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  gameTime?: string;
  status?: string;
  markets?: any[];
}

function getKey(): string {
  const k = process.env.SPORTSGAMEODDS_API_KEY || process.env.VITE_SPORTSGAMEODDS_API_KEY;
  if (!k) throw new Error("Missing SPORTSGAMEODDS_API_KEY");
  return k;
}

function mapSportToId(sport: string): string {
  const s = sport.toLowerCase();
  // Mirrors the client mapping as best-effort. Adjust if your SGO account uses different IDs.
  if (s === "nhl") return "4";
  if (s === "nba") return "2";
  if (s === "nfl") return "1";
  if (s === "mlb") return "3";
  return "4";
}

export async function fetchSgoGamesWithMarkets(sport: string): Promise<SgoGame[]> {
  const sportId = mapSportToId(sport);
  const base = "https://api.sportsgameodds.com"; // If you use a different base, set SGO_BASE_URL
  const url = `${process.env.SGO_BASE_URL || base}/v2/sports/${sportId}/games`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getKey()}`,
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`SGO HTTP ${res.status}: ${t}`);
  }
  const json: any = await res.json();
  const games = (json?.games || json?.data?.games || []).map((g: any) => ({
    id: String(g.id),
    homeTeam: g.homeTeam,
    awayTeam: g.awayTeam,
    gameTime: g.gameTime || g.time,
    status: g.status,
    markets: g.markets || [],
  }));
  return games;
}

export function extractCoreMarkets(game: SgoGame): {
  closing_total?: number | null;
  closing_first_period_total?: number | null;
  moneyline_home?: number | null;
  moneyline_away?: number | null;
  g1f5_yes?: number | null;
  g1f5_no?: number | null;
  g1f10_yes?: number | null;
  g1f10_no?: number | null;
  debug?: any;
} {
  const markets = game.markets || [];

  const out: any = {};

  // Heuristic market matching by name/type keys
  const findMarket = (pred: (m: any) => boolean) => markets.find(pred);

  const total = findMarket(
    (m) => /total/i.test(m?.name || m?.market || "") && !/period/i.test(m?.name || ""),
  );
  const firstPeriodTotal = findMarket(
    (m) =>
      /first/i.test(m?.name || "") && /period/i.test(m?.name || "") && /total/i.test(m?.name || ""),
  );
  const moneyline = findMarket((m) => /moneyline|ml/i.test(m?.name || m?.market || ""));

  const early5 = findMarket((m) => /first\s*5/i.test(m?.name || "") && /goal/i.test(m?.name || ""));
  const early10 = findMarket(
    (m) => /first\s*10/i.test(m?.name || "") && /goal/i.test(m?.name || ""),
  );

  const extractLine = (m: any) => {
    const line = m?.line ?? m?.total ?? m?.value;
    const n = Number(line);
    return Number.isFinite(n) ? n : null;
  };

  const extractTwoWayOdds = (m: any) => {
    const outcomes = m?.outcomes || m?.selections || m?.offers || [];
    const yes = outcomes.find((o: any) => /yes|goal/i.test(String(o?.name || o?.label || "")));
    const no = outcomes.find((o: any) => /no|no goal/i.test(String(o?.name || o?.label || "")));
    const yn = (x: any) => {
      const v = Number(x?.odds ?? x?.price ?? x?.americanOdds);
      return Number.isFinite(v) ? v : null;
    };
    return { yes: yn(yes), no: yn(no) };
  };

  if (total) out.closing_total = extractLine(total);
  if (firstPeriodTotal) out.closing_first_period_total = extractLine(firstPeriodTotal);
  if (moneyline) {
    const outcomes = moneyline?.outcomes || moneyline?.selections || [];
    const home = outcomes.find(
      (o: any) =>
        String(o?.team || o?.name || "").toLowerCase() ===
        String(game.homeTeam || "").toLowerCase(),
    );
    const away = outcomes.find(
      (o: any) =>
        String(o?.team || o?.name || "").toLowerCase() ===
        String(game.awayTeam || "").toLowerCase(),
    );
    const toOdds = (x: any) => {
      const v = Number(x?.odds ?? x?.price ?? x?.americanOdds);
      return Number.isFinite(v) ? v : null;
    };
    out.moneyline_home = toOdds(home);
    out.moneyline_away = toOdds(away);
  }

  if (early5) {
    const v = extractTwoWayOdds(early5);
    out.g1f5_yes = v.yes;
    out.g1f5_no = v.no;
  }
  if (early10) {
    const v = extractTwoWayOdds(early10);
    out.g1f10_yes = v.yes;
    out.g1f10_no = v.no;
  }

  out.debug = { marketNames: markets.map((m: any) => m?.name || m?.market).slice(0, 50) };
  return out;
}
