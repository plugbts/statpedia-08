#!/usr/bin/env tsx

import "dotenv/config";
import postgres from "postgres";

type NormalizedProp = {
  playerName: string;
  team?: string;
  opponent?: string;
  propType: string;
  line: number;
  startTime?: string;
  best_over?: { american?: number | null } | null;
  best_under?: { american?: number | null } | null;
};

function log(msg: string) {
  console.log(`[sync-sgo->player_props] ${msg}`);
}

function cleanName(name: string): string {
  return name
    .replace(/\b(jr\.?|sr\.?|ii|iii|iv)\b/gi, "")
    .replace(/[^a-zA-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFromLocalApi(sport = "mlb", limit = 400): Promise<NormalizedProp[]> {
  const url = `http://localhost:3001/api/props?sport=${encodeURIComponent(sport)}&limit=${limit}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: any = await res.json();
    const items: any[] = Array.isArray(json?.items) ? json.items : [];
    return items.map((it) => ({
      playerName: it.playerName || it.full_name || it.player || "",
      team: it.team || undefined,
      opponent: it.opponent || undefined,
      propType: it.propType || it.market || "",
      line: Number(it.line ?? 0),
      startTime: it.startTime || it.game_date || undefined,
      best_over: it.best_over || null,
      best_under: it.best_under || null,
    }));
  } catch (e) {
    log(`Local API fetch failed: ${(e as Error).message}`);
    return [];
  }
}

function buildUrl(base: string, params: Record<string, any>) {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
  }
  return u.toString();
}

async function fetchFromSGO(sport = "mlb", limit = 200): Promise<NormalizedProp[]> {
  const apiKey = process.env.SPORTSGAMEODDS_API_KEY;
  if (!apiKey) return [];
  const leagueID = sport.toUpperCase();
  try {
    const url = buildUrl("https://api.sportsgameodds.com/v2/events/", {
      apiKey,
      leagueID,
      oddsAvailable: true,
      oddsType: "playerprops",
      limit: Math.min(Math.max(1, limit), 100),
    });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SGO HTTP ${res.status}`);
    const json: any = await res.json();
    const events: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];

    const out: NormalizedProp[] = [];
    for (const ev of events) {
      const startTime = ev.gameTime || ev.startTime || ev.date || undefined;
      const homeAbbr =
        ev.homeTeamAbbr || ev.homeTeam || ev.home_abbr || ev.homeShort || ev.home_code;
      const awayAbbr =
        ev.awayTeamAbbr || ev.awayTeam || ev.away_abbr || ev.awayShort || ev.away_code;
      const oddsObj = ev.odds || {};
      for (const [, raw] of Object.entries(oddsObj)) {
        const o: any = raw;
        if (!o || !o.playerID || o.cancelled) continue;
        const playerName = String(o.playerID).replace(/_/g, " ").trim();
        const propType = String(o.statID || o.market || "");
        const line = Number(o.bookOverUnder ?? o.fairOverUnder ?? o.line ?? NaN);
        if (!Number.isFinite(line)) continue;
        const side = String(o.sideID || o.side || "").toLowerCase();
        const price = Number(o.bookOdds ?? o.fairOdds ?? NaN);
        let best_over: any = null,
          best_under: any = null;
        if (Number.isFinite(price)) {
          if (side === "over") best_over = { american: price };
          if (side === "under") best_under = { american: price };
        }
        out.push({
          playerName,
          team: o.playerTeam || undefined,
          opponent:
            o.playerTeam && (homeAbbr || awayAbbr)
              ? o.playerTeam === homeAbbr
                ? awayAbbr
                : homeAbbr
              : undefined,
          propType,
          line,
          startTime,
          best_over,
          best_under,
        });
      }
    }
    return out;
  } catch (e) {
    log(`SGO fetch failed: ${(e as Error).message}`);
    return [];
  }
}

function americanStr(n?: number | null): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  const v = Math.trunc(n as number);
  return v > 0 ? `+${v}` : `${v}`;
}

async function ensurePropType(client: postgres.Sql, name: string, sport: string) {
  const row = (
    await client`SELECT id FROM public.prop_types WHERE LOWER(name)=LOWER(${name}) LIMIT 1`
  )[0] as any;
  if (row?.id) return row.id as string;
  const category = (() => {
    const s = name.toLowerCase();
    if (/(home\s*run|\bhr\b)/.test(s)) return "power";
    if (/walks|bases on balls/.test(s)) return "discipline";
    if (/hits|singles|doubles|triples/.test(s)) return "batting";
    if (/rbis?/.test(s)) return "run production";
    if (/total\s*bases/.test(s)) return "batting";
    return "general";
  })();
  const created = (
    await client`
    INSERT INTO public.prop_types (name, category, sport, is_over_under, is_active)
    VALUES (${name}, ${category}, ${sport}, true, true)
    RETURNING id
  `
  )[0] as any;
  return created.id as string;
}

async function main() {
  const sport = (process.argv[2] || "mlb").toLowerCase();
  const limit = Number(process.argv[3] || 400);
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("DATABASE_URL/NEON_DATABASE_URL is not set");
  const client = postgres(conn, { prepare: false });
  try {
    // Try local API first, fallback to SGO direct
    let props = await fetchFromLocalApi(sport, limit);
    if (props.length === 0) {
      log("Local API returned 0 props; falling back to direct SGO fetch");
      props = await fetchFromSGO(sport, limit);
    }
    log(`Fetched ${props.length} props for ${sport.toUpperCase()}`);
    if (props.length === 0) return;

    let inserted = 0,
      matched = 0,
      skipped = 0;

    for (const p of props) {
      const playerName = (p.playerName || "").trim();
      if (!playerName || !p.propType) {
        skipped++;
        continue;
      }
      // player lookup
      let player: any = (
        await client`
        SELECT id, team_id, COALESCE(full_name, name) AS full_name
        FROM public.players 
        WHERE LOWER(COALESCE(full_name, name))=LOWER(${playerName})
        LIMIT 1
      `
      )[0];
      if (!player) {
        const cleaned = cleanName(playerName);
        if (cleaned.toLowerCase() !== playerName.toLowerCase()) {
          player = (
            await client`
            SELECT id, team_id, COALESCE(full_name, name) AS full_name
            FROM public.players 
            WHERE LOWER(COALESCE(full_name, name))=LOWER(${cleaned})
            LIMIT 1
          `
          )[0];
        }
      }
      if (!player) {
        skipped++;
        continue;
      }
      matched++;

      // team/opponent -> game
      const teamAbbr = (p.team || "").toUpperCase();
      const oppAbbr = (p.opponent || "").toUpperCase();
      const teamRow = teamAbbr
        ? ((
            await client`
            SELECT t.id FROM public.teams t WHERE t.abbreviation=${teamAbbr} LIMIT 1
          `
          )[0] as any)
        : null;
      const oppRow = oppAbbr
        ? ((
            await client`
            SELECT t.id FROM public.teams t WHERE t.abbreviation=${oppAbbr} LIMIT 1
          `
          )[0] as any)
        : null;
      const teamId = (teamRow?.id as string | undefined) || (player?.team_id as string | undefined);
      const oppId = oppRow?.id as string | undefined;

      let gameId: string | undefined;
      const targetDate = p.startTime ? new Date(p.startTime) : new Date();
      const d0 = new Date(
        Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()),
      );
      const dFrom = new Date(d0);
      dFrom.setUTCDate(dFrom.getUTCDate() - 3);
      const dTo = new Date(d0);
      dTo.setUTCDate(dTo.getUTCDate() + 3);
      if (teamId && oppId) {
        const rows = (
          await client`
          SELECT g.id, g.game_date
          FROM public.games g
          WHERE g.game_date BETWEEN ${dFrom.toISOString().slice(0, 10)}::date AND ${dTo
            .toISOString()
            .slice(0, 10)}::date
            AND ((g.home_team_id=${teamId} AND g.away_team_id=${oppId}) OR (g.home_team_id=${oppId} AND g.away_team_id=${teamId}))
          ORDER BY ABS(EXTRACT(EPOCH FROM (g.game_date::timestamp - ${d0.toISOString().slice(0, 10)}::timestamp))) ASC
          LIMIT 1
        `
        )[0] as any;
        gameId = rows?.id as string | undefined;
      }
      if (!gameId && teamId) {
        const rows = (
          await client`
          SELECT g.id, g.game_date
          FROM public.games g
          WHERE g.game_date BETWEEN ${dFrom.toISOString().slice(0, 10)}::date AND ${dTo
            .toISOString()
            .slice(0, 10)}::date
            AND (g.home_team_id=${teamId} OR g.away_team_id=${teamId})
          ORDER BY ABS(EXTRACT(EPOCH FROM (g.game_date::timestamp - ${d0.toISOString().slice(0, 10)}::timestamp))) ASC
          LIMIT 1
        `
        )[0] as any;
        gameId = rows?.id as string | undefined;
      }
      if (!gameId) {
        skipped++;
        continue;
      }

      // prop type id
      const propTypeId = await ensurePropType(client, p.propType, sport);

      const overA = p.best_over?.american ?? null;
      const underA = p.best_under?.american ?? null;

      // Insert into player_props (use numeric and string odds columns)
      await client`
        INSERT INTO public.player_props (
          player_id, game_id, prop_type_id, line, odds, over_odds, under_odds, over_odds_american, under_odds_american, sportsbook
        ) VALUES (
          ${player.id}, ${gameId}, ${propTypeId}, ${p.line}, ${americanStr(overA) || americanStr(underA)}, ${americanStr(
            overA,
          )}, ${americanStr(underA)}, ${overA ?? null}, ${underA ?? null}, 'sgo'
        )
      `;
      inserted++;
      if (inserted % 100 === 0) log(`Inserted ${inserted} player_props so far...`);
    }

    log(`Done. matched=${matched} inserted=${inserted} skipped=${skipped}`);
  } finally {
    await client.end({ timeout: 1 });
  }
}

main().catch((e) => {
  console.error("sync-sgo-props-to-player-props failed:", e);
  process.exit(1);
});
