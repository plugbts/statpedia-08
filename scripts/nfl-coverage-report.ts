#!/usr/bin/env tsx

/**
 * NFL Coverage Report
 *
 * Goal: show whether the CURRENT SGO slate has enough `player_game_logs` to compute
 * L5/L10/L20 + streak + H2H reliably (i.e., sample sizes).
 *
 * This does NOT attempt to validate the ESPN stat extraction itself per-player;
 * it focuses on whether we have logs and whether propType alignment looks good.
 */

import { config as dotenvConfig } from "dotenv";
import postgres from "postgres";

type SgoProp = {
  playerName: string;
  team?: string;
  opponent?: string;
  statId: string;
  propType: string;
  line: number;
};

function mapSportToLeagueId(sport: string): string {
  const s = sport.toLowerCase();
  if (s === "nfl") return "NFL";
  return sport.toUpperCase();
}

function normalizeHumanNameForMatch(name: string): string {
  return String(name || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePlayerNameFromId(playerId: string): string {
  const raw = String(playerId)
    .replace(/_\d+_[A-Z]+$/, "")
    .replace(/_/g, " ");
  return raw
    .trim()
    .toLowerCase()
    .replace(/(?:^|[\s'\-])(\p{L})/gu, (m) => m.toUpperCase());
}

function normalizeStatId(statId?: string | null): string {
  if (!statId) return "Unknown";
  const k = String(statId)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const map: Record<string, string> = {
    passing_yards: "Passing Yards",
    passing_attempts: "Passing Attempts",
    passing_completions: "Passing Completions",
    passing_interceptions: "Passing Interceptions",
    passing_touchdowns: "Passing TDs",
    rushing_yards: "Rushing Yards",
    rushing_attempts: "Rushing Attempts",
    rushing_touchdowns: "Rushing TDs",
    receiving_yards: "Receiving Yards",
    receiving_receptions: "Receptions",
    receiving_targets: "Receiving Targets",
    receiving_touchdowns: "Receiving TDs",
  };
  return map[k] || k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchSgoNflSlate(limit = 100): Promise<SgoProp[]> {
  const apiKey = process.env.SPORTSGAMEODDS_API_KEY;
  if (!apiKey) throw new Error("SPORTSGAMEODDS_API_KEY is not set");

  const leagueID = mapSportToLeagueId("nfl");
  const u = new URL("https://api.sportsgameodds.com/v2/events/");
  u.searchParams.set("apiKey", apiKey);
  u.searchParams.set("leagueID", leagueID);
  u.searchParams.set("oddsAvailable", "true");
  u.searchParams.set("oddsType", "playerprops");
  u.searchParams.set("limit", String(Math.min(Math.max(1, limit), 100)));

  const resp = await fetch(u.toString());
  if (!resp.ok) throw new Error(`SGO error ${resp.status}: ${await resp.text()}`);
  const json: any = await resp.json();
  const events: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];

  const out: SgoProp[] = [];
  for (const ev of events) {
    const homeTeamId = ev?.teams?.home?.teamID;
    const awayTeamId = ev?.teams?.away?.teamID;
    const homeAbbr = String(ev?.teams?.home?.names?.short || "").toUpperCase();
    const awayAbbr = String(ev?.teams?.away?.names?.short || "").toUpperCase();
    const oddsObj = ev?.odds || {};

    for (const raw of Object.values(oddsObj) as any[]) {
      const odd = raw;
      if (!odd || !odd.playerID) continue;
      if (odd.cancelled) continue;

      const playerId = String(odd.playerID);
      const playerName = parsePlayerNameFromId(playerId);
      const statId = String(odd.statID || odd.market || "unknown");
      const propType = normalizeStatId(statId);
      const lineNum = Number(odd.bookOverUnder ?? odd.fairOverUnder ?? odd.line ?? NaN);
      if (!Number.isFinite(lineNum)) continue;

      const playerTeamId = ev?.players?.[playerId]?.teamID;
      let team: string | undefined;
      let opponent: string | undefined;
      if (playerTeamId && homeTeamId && awayTeamId) {
        if (playerTeamId === homeTeamId) {
          team = homeAbbr;
          opponent = awayAbbr;
        } else if (playerTeamId === awayTeamId) {
          team = awayAbbr;
          opponent = homeAbbr;
        }
      }

      // Keep only core offensive markets for this report (same set we compute analytics for)
      const core = new Set([
        "Passing Yards",
        "Passing TDs",
        "Passing Attempts",
        "Passing Completions",
        "Rushing Yards",
        "Rushing Attempts",
        "Receiving Yards",
        "Receptions",
      ]);
      if (!core.has(propType)) continue;

      out.push({ playerName, team, opponent, statId, propType, line: lineNum });
    }
  }
  return out;
}

async function main() {
  // Prefer .env.local (repo uses it for local dev); fall back to default dotenv behavior.
  dotenvConfig({ path: ".env.local" });
  dotenvConfig();

  const candidates = [
    process.env.SUPABASE_DATABASE_URL,
    process.env.NEON_DATABASE_URL,
    process.env.DATABASE_URL,
  ].filter(Boolean) as string[];
  if (candidates.length === 0) {
    throw new Error("No DB URL set (SUPABASE_DATABASE_URL/NEON_DATABASE_URL/DATABASE_URL)");
  }
  let sql: any | null = null;
  let connUsed: string | null = null;
  for (const c of candidates) {
    const probe = postgres(c, { prepare: false, max: 1 });
    try {
      await probe.unsafe("select 1 as ok");
      sql = postgres(c, { prepare: false });
      connUsed = c;
      await probe.end({ timeout: 1 });
      break;
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.warn(`[coverage] DB candidate failed, trying next: ${msg}`);
      try {
        await probe.end({ timeout: 1 });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
  if (!sql || !connUsed) throw new Error("All DB URLs failed (SUPABASE/NEON/DATABASE)");

  let slate: SgoProp[] = [];
  try {
    slate = await fetchSgoNflSlate(100);
    console.log(`[coverage] db=connected source=SGO core props: ${slate.length}`);
  } catch (e: any) {
    // Fallback: use DB-backed displayed props if SGO key is not present in process env
    console.warn(
      `[coverage] SGO fetch unavailable (${e?.message || e}); falling back to v_props_list`,
    );
    const rows = (await sql.unsafe(
      `
        SELECT
          v.full_name AS player_name,
          v.team,
          v.opponent,
          v.market AS prop_type,
          v.line
        FROM public.v_props_list v
        WHERE UPPER(v.league) = 'NFL'
        ORDER BY v.game_date DESC NULLS LAST
        LIMIT 300
      `,
    )) as Array<{
      player_name: string;
      team: string | null;
      opponent: string | null;
      prop_type: string;
      line: any;
    }>;

    const core = new Set([
      "Passing Yards",
      "Passing TDs",
      "Passing Attempts",
      "Passing Completions",
      "Rushing Yards",
      "Rushing Attempts",
      "Receiving Yards",
      "Receptions",
    ]);
    slate = rows
      .map((r) => ({
        playerName: String(r.player_name || "").trim(),
        team: String(r.team || "").toUpperCase() || undefined,
        opponent: String(r.opponent || "").toUpperCase() || undefined,
        statId: "db:v_props_list",
        propType: String(r.prop_type || "").trim(),
        line: Number(r.line),
      }))
      .filter((p) => core.has(p.propType) && Number.isFinite(p.line));

    console.log(`[coverage] source=DB(v_props_list) core props: ${slate.length}`);
  }

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
  const playersRows = (await sql.unsafe(
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
  for (const r of playersRows) {
    const key = normalizeHumanNameForMatch(r.player_name);
    if (!key) continue;
    const arr = byName.get(key) || [];
    arr.push({
      player_id: String(r.player_id),
      team_abbr: String(r.team_abbr || "").toUpperCase(),
    });
    byName.set(key, arr);
  }

  // Resolve slate -> canonical UUIDs (choose the candidate with most logs for that propType)
  const propTypesLower = Array.from(new Set(slate.map((p) => p.propType.toLowerCase()))); // For log count queries
  const resolved: Array<{ idx: number; player_id: string; propTypeLower: string }> = [];
  const neededIds = new Set<string>();

  for (let i = 0; i < slate.length; i++) {
    const p = slate[i];
    const nameKey = normalizeHumanNameForMatch(p.playerName);
    const candidates = byName.get(nameKey) || [];
    if (candidates.length === 0) continue;
    const team = String(p.team || "").toUpperCase();
    const pool = team ? candidates.filter((c) => c.team_abbr === team) : [];
    const finalPool = pool.length > 0 ? pool : candidates;
    if (finalPool.length === 1) {
      resolved.push({
        idx: i,
        player_id: finalPool[0].player_id,
        propTypeLower: p.propType.toLowerCase(),
      });
      neededIds.add(finalPool[0].player_id);
      continue;
    }
    // break ties by log count for the propType
    const ids = Array.from(new Set(finalPool.map((c) => c.player_id)));
    const counts = (await sql.unsafe(
      `
        SELECT pgl.player_id, COUNT(*)::int AS c
        FROM public.player_game_logs pgl
        WHERE pgl.player_id = ANY($1::uuid[])
          AND LOWER(TRIM(pgl.prop_type)) = $2
        GROUP BY pgl.player_id
      `,
      [ids, p.propType.toLowerCase()],
    )) as Array<{ player_id: string; c: number }>;
    const m = new Map<string, number>();
    for (const r of counts) m.set(String(r.player_id), Number(r.c) || 0);
    let best = finalPool[0];
    let bestC = m.get(best.player_id) || 0;
    for (const c of finalPool) {
      const ct = m.get(c.player_id) || 0;
      if (ct > bestC) {
        best = c;
        bestC = ct;
      }
    }
    resolved.push({ idx: i, player_id: best.player_id, propTypeLower: p.propType.toLowerCase() });
    neededIds.add(best.player_id);
  }

  const playerIds = Array.from(neededIds);
  const logCounts = (await sql.unsafe(
    `
      SELECT
        pgl.player_id,
        LOWER(TRIM(pgl.prop_type)) AS prop_type,
        COUNT(*)::int AS c
      FROM public.player_game_logs pgl
      WHERE pgl.player_id = ANY($1::uuid[])
        AND LOWER(TRIM(pgl.prop_type)) = ANY($2::text[])
      GROUP BY pgl.player_id, LOWER(TRIM(pgl.prop_type))
    `,
    [playerIds, propTypesLower],
  )) as Array<{ player_id: string; prop_type: string; c: number }>;

  const countByKey = new Map<string, number>();
  for (const r of logCounts) countByKey.set(`${r.player_id}:${r.prop_type}`, Number(r.c) || 0);

  let with5 = 0,
    with10 = 0,
    with20 = 0,
    resolvedN = 0;
  const worst: Array<{
    player: string;
    team?: string;
    propType: string;
    statId: string;
    logs: number;
  }> = [];

  for (const r of resolved) {
    resolvedN++;
    const slateProp = slate[r.idx];
    const logs = countByKey.get(`${r.player_id}:${r.propTypeLower}`) || 0;
    if (logs >= 5) with5++;
    if (logs >= 10) with10++;
    if (logs >= 20) with20++;
    if (logs < 20)
      worst.push({
        player: slateProp.playerName,
        team: slateProp.team,
        propType: slateProp.propType,
        statId: slateProp.statId,
        logs,
      });
  }

  worst.sort((a, b) => a.logs - b.logs);

  console.log(`[coverage] resolved=${resolvedN}/${slate.length}`);
  console.log(
    `[coverage] >=5 logs:  ${with5}/${resolvedN} (${resolvedN ? Math.round((with5 / resolvedN) * 100) : 0}%)`,
  );
  console.log(
    `[coverage] >=10 logs: ${with10}/${resolvedN} (${resolvedN ? Math.round((with10 / resolvedN) * 100) : 0}%)`,
  );
  console.log(
    `[coverage] >=20 logs: ${with20}/${resolvedN} (${resolvedN ? Math.round((with20 / resolvedN) * 100) : 0}%)`,
  );

  console.log(`\n[coverage] lowest-coverage examples (up to 20):`);
  for (const w of worst.slice(0, 20)) {
    console.log(
      `  ${w.player} ${w.team ? `(${w.team})` : ""} | ${w.propType} | logs=${w.logs} | statId=${w.statId}`,
    );
  }

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
