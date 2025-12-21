#!/usr/bin/env tsx

/**
 * Diagnose NFL Coverage Gaps
 *
 * Identifies exactly why we're not at 100% coverage:
 * 1. Props that can't be resolved to player_id (name matching failures)
 * 2. Props that resolve but have 0 logs (propType mismatch or missing data)
 * 3. Props with insufficient logs (<5, <10, <20)
 */

import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";
import fetch from "node-fetch";

config({ path: ".env.local" });

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

async function fetchSgoNflSlate(limit = 100): Promise<any[]> {
  const apiKey = process.env.SPORTSGAMEODDS_API_KEY;
  if (!apiKey) throw new Error("SPORTSGAMEODDS_API_KEY not set");

  const u = new URL("https://api.sportsgameodds.com/v2/events/");
  u.searchParams.set("apiKey", apiKey);
  u.searchParams.set("leagueID", "NFL");
  u.searchParams.set("oddsAvailable", "true");
  u.searchParams.set("oddsType", "playerprops");
  u.searchParams.set("limit", String(Math.min(Math.max(1, limit), 100)));

  const resp = await fetch(u.toString());
  if (!resp.ok) throw new Error(`SGO error ${resp.status}: ${await resp.text()}`);
  const json: any = await resp.json();
  return Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
}

async function main() {
  const candidates = [
    process.env.SUPABASE_DATABASE_URL,
    process.env.NEON_DATABASE_URL,
    process.env.DATABASE_URL,
  ].filter(Boolean) as string[];
  if (candidates.length === 0) {
    throw new Error("No DB URL set");
  }
  let sql: any | null = null;
  for (const c of candidates) {
    const probe = postgres(c, { prepare: false, max: 1 });
    try {
      await probe.unsafe("select 1 as ok");
      sql = postgres(c, { prepare: false });
      await probe.end({ timeout: 1 });
      break;
    } catch (e: any) {
      try {
        await probe.end({ timeout: 1 });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
  if (!sql) throw new Error("All DB URLs failed");

  console.log("\n🔍 Diagnosing NFL Coverage Gaps...\n");

  // Fetch SGO slate
  const events = await fetchSgoNflSlate(100);
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

  const slate: Array<{
    playerName: string;
    team?: string;
    opponent?: string;
    propType: string;
    statId: string;
  }> = [];

  for (const ev of events) {
    const homeAbbr = String(ev?.teams?.home?.names?.short || "").toUpperCase();
    const awayAbbr = String(ev?.teams?.away?.names?.short || "").toUpperCase();
    const oddsObj = ev?.odds || {};

    for (const raw of Object.values(oddsObj) as any[]) {
      if (!raw || !raw.playerID || raw.cancelled) continue;
      const playerId = String(raw.playerID);
      const playerName = parsePlayerNameFromId(playerId);
      const statId = String(raw.statID || raw.market || "unknown");
      const propType = normalizeStatId(statId);
      if (!core.has(propType)) continue;

      const playerTeamId = ev?.players?.[playerId]?.teamID;
      const homeTeamId = ev?.teams?.home?.teamID;
      const awayTeamId = ev?.teams?.away?.teamID;
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

      slate.push({ playerName, team, opponent, propType, statId });
    }
  }

  console.log(`📊 Total SGO core props: ${slate.length}\n`);

  // Get all players with game logs for these propTypes
  // IMPORTANT: Get players from ALL propTypes, not just the ones we're checking
  // This ensures we can match players even if they don't have logs for a specific propType yet
  const propTypesLower = Array.from(new Set(slate.map((p) => p.propType.toLowerCase())));
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
         OR LOWER(TRIM(pgl.prop_type)) IN ('passing yards', 'rushing yards', 'rushing attempts', 'passing tds', 'rushing tds', 'receiving yards', 'receptions', 'receiving tds', 'passing attempts', 'passing completions')
    `,
    [propTypesLower],
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

  console.log(`📊 Players in DB with game logs: ${playersRows.length}`);
  console.log(`📊 Unique normalized names: ${byName.size}\n`);

  // Resolve each prop and check log counts
  const unresolved: Array<{ playerName: string; team?: string; propType: string; reason: string }> =
    [];
  const resolvedZeroLogs: Array<{
    playerName: string;
    team?: string;
    propType: string;
    player_id: string;
  }> = [];
  const resolvedLowLogs: Array<{
    playerName: string;
    team?: string;
    propType: string;
    logs: number;
  }> = [];

  for (const p of slate) {
    const nameKey = normalizeHumanNameForMatch(p.playerName);
    const candidates = byName.get(nameKey) || [];

    if (candidates.length === 0) {
      unresolved.push({
        playerName: p.playerName,
        team: p.team,
        propType: p.propType,
        reason: "No player found in DB with matching name",
      });
      continue;
    }

    const team = String(p.team || "").toUpperCase();
    const pool = team ? candidates.filter((c) => c.team_abbr === team) : [];
    const finalPool = pool.length > 0 ? pool : candidates;

    if (finalPool.length === 0) {
      unresolved.push({
        playerName: p.playerName,
        team: p.team,
        propType: p.propType,
        reason: `Name matches but team mismatch (SGO: ${p.team}, DB candidates: ${candidates.map((c) => c.team_abbr).join(", ")})`,
      });
      continue;
    }

    // Pick best candidate by log count
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

    const best = counts.sort((a, b) => b.c - a.c)[0];
    const logCount = best?.c || 0;

    if (logCount === 0) {
      resolvedZeroLogs.push({
        playerName: p.playerName,
        team: p.team,
        propType: p.propType,
        player_id: best?.player_id || finalPool[0].player_id,
      });
    } else if (logCount < 5) {
      resolvedLowLogs.push({
        playerName: p.playerName,
        team: p.team,
        propType: p.propType,
        logs: logCount,
      });
    }
  }

  console.log("=".repeat(80));
  console.log("❌ UNRESOLVED PROPS (can't match player name):");
  console.log("=".repeat(80));
  if (unresolved.length === 0) {
    console.log("✅ All props resolved!");
  } else {
    console.log(`Found ${unresolved.length} unresolved props:\n`);
    const byReason = new Map<string, number>();
    unresolved.forEach((u) => {
      const r = u.reason;
      byReason.set(r, (byReason.get(r) || 0) + 1);
    });
    byReason.forEach((count, reason) => {
      console.log(`  ${reason}: ${count} props`);
    });
    console.log("\nSample unresolved props (first 20):");
    unresolved.slice(0, 20).forEach((u) => {
      console.log(`  - ${u.playerName} (${u.team || "?"}) | ${u.propType} | ${u.reason}`);
    });
  }

  console.log("\n" + "=".repeat(80));
  console.log("⚠️  RESOLVED BUT ZERO LOGS (player exists, no logs for this propType):");
  console.log("=".repeat(80));
  if (resolvedZeroLogs.length === 0) {
    console.log("✅ All resolved props have logs!");
  } else {
    console.log(`Found ${resolvedZeroLogs.length} props with 0 logs:\n`);
    const byPropType = new Map<string, number>();
    resolvedZeroLogs.forEach((r) => {
      byPropType.set(r.propType, (byPropType.get(r.propType) || 0) + 1);
    });
    byPropType.forEach((count, propType) => {
      console.log(`  ${propType}: ${count} props`);
    });
    console.log("\nSample zero-log props (first 20):");
    resolvedZeroLogs.slice(0, 20).forEach((r) => {
      console.log(`  - ${r.playerName} (${r.team || "?"}) | ${r.propType}`);
    });
  }

  console.log("\n" + "=".repeat(80));
  console.log("⚠️  RESOLVED BUT LOW LOGS (<5):");
  console.log("=".repeat(80));
  if (resolvedLowLogs.length === 0) {
    console.log("✅ All resolved props have >=5 logs!");
  } else {
    console.log(`Found ${resolvedLowLogs.length} props with <5 logs:\n`);
    resolvedLowLogs.slice(0, 20).forEach((r) => {
      console.log(`  - ${r.playerName} (${r.team || "?"}) | ${r.propType} | ${r.logs} logs`);
    });
  }

  console.log("\n" + "=".repeat(80));
  console.log("📈 SUMMARY:");
  console.log("=".repeat(80));
  console.log(`Total SGO props: ${slate.length}`);
  console.log(
    `Unresolved: ${unresolved.length} (${((unresolved.length / slate.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Resolved with 0 logs: ${resolvedZeroLogs.length} (${((resolvedZeroLogs.length / slate.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Resolved with <5 logs: ${resolvedLowLogs.length} (${((resolvedLowLogs.length / slate.length) * 100).toFixed(1)}%)`,
  );
  const covered =
    slate.length - unresolved.length - resolvedZeroLogs.length - resolvedLowLogs.length;
  console.log(
    `✅ Fully covered (>=5 logs): ${covered} (${((covered / slate.length) * 100).toFixed(1)}%)`,
  );
  console.log("=".repeat(80) + "\n");

  await sql.end();
}

main().catch(console.error);
