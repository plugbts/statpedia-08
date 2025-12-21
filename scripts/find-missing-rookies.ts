#!/usr/bin/env tsx

/**
 * Find Missing Rookies
 *
 * Identifies players in SGO slate that aren't in our DB,
 * and suggests how to match them or ingest them.
 */

import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";
import fetch from "node-fetch";

config({ path: ".env.local" });

function normalizeHumanNameForMatch(name: string): string {
  return (
    String(name || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      // Normalize initials: "j.j." -> "jj", "tj" -> "tj", "j j" -> "jj"
      .replace(/\b([a-z])\s*\.\s*([a-z])\b/g, "$1$2") // "j.j." -> "jj"
      .replace(/\b([a-z])\s+([a-z])\b/g, (m, a, b) => {
        // If both are single letters, treat as initials (no space)
        if (m.length === 3 && m[1] === " ") return a + b;
        return m;
      })
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
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
  if (candidates.length === 0) throw new Error("No DB URL set");

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

  console.log("\n🔍 Finding Missing Rookies...\n");

  // Fetch SGO slate
  const events = await fetchSgoNflSlate(100);
  const sgoPlayers = new Set<string>();
  const sgoPlayerDetails = new Map<string, { name: string; team?: string; playerId: string }>();

  for (const ev of events) {
    const homeAbbr = String(ev?.teams?.home?.names?.short || "").toUpperCase();
    const awayAbbr = String(ev?.teams?.away?.names?.short || "").toUpperCase();
    const oddsObj = ev?.odds || {};

    for (const raw of Object.values(oddsObj) as any[]) {
      if (!raw || !raw.playerID || raw.cancelled) continue;
      const playerId = String(raw.playerID);
      const playerName = parsePlayerNameFromId(playerId);
      const playerTeamId = ev?.players?.[playerId]?.teamID;
      const homeTeamId = ev?.teams?.home?.teamID;
      const awayTeamId = ev?.teams?.away?.teamID;
      let team: string | undefined;
      if (playerTeamId && homeTeamId && awayTeamId) {
        if (playerTeamId === homeTeamId) team = homeAbbr;
        else if (playerTeamId === awayTeamId) team = awayAbbr;
      }
      sgoPlayers.add(normalizeHumanNameForMatch(playerName));
      sgoPlayerDetails.set(normalizeHumanNameForMatch(playerName), {
        name: playerName,
        team,
        playerId,
      });
    }
  }

  console.log(`📊 SGO players found: ${sgoPlayers.size}\n`);

  // Get all players in DB
  const dbPlayers = (await sql.unsafe(
    `SELECT DISTINCT p.name, COALESCE(t.abbreviation, '') AS team_abbr
     FROM public.players p
     LEFT JOIN public.teams t ON t.id = p.team_id
     WHERE p.name IS NOT NULL`,
  )) as Array<{ name: string; team_abbr: string }>;

  const dbPlayersNormalized = new Set<string>();
  const dbPlayerMap = new Map<string, Array<{ name: string; team_abbr: string }>>();
  for (const p of dbPlayers) {
    const key = normalizeHumanNameForMatch(p.name);
    dbPlayersNormalized.add(key);
    const arr = dbPlayerMap.get(key) || [];
    arr.push({ name: p.name, team_abbr: String(p.team_abbr || "").toUpperCase() });
    dbPlayerMap.set(key, arr);
  }

  console.log(
    `📊 DB players found: ${dbPlayers.length} (${dbPlayersNormalized.size} unique normalized)\n`,
  );

  // Find missing
  const missing: Array<{
    sgoName: string;
    team?: string;
    playerId: string;
    suggestions: string[];
  }> = [];
  for (const sgoKey of sgoPlayers) {
    if (!dbPlayersNormalized.has(sgoKey)) {
      const details = sgoPlayerDetails.get(sgoKey);
      if (!details) continue;
      // Look for fuzzy matches
      const suggestions: string[] = [];
      for (const [dbKey, dbPlayers] of dbPlayerMap.entries()) {
        // Check if names are similar (same first/last initial, or partial match)
        const sgoParts = sgoKey.split(/\s+/);
        const dbParts = dbKey.split(/\s+/);
        if (sgoParts.length >= 2 && dbParts.length >= 2) {
          // Same first letter of first name and last name match
          if (
            sgoParts[0][0] === dbParts[0][0] &&
            sgoParts[sgoParts.length - 1] === dbParts[dbParts.length - 1]
          ) {
            suggestions.push(dbPlayers[0].name);
          }
        }
      }
      missing.push({
        sgoName: details.name,
        team: details.team,
        playerId: details.playerId,
        suggestions,
      });
    }
  }

  console.log("=".repeat(80));
  console.log(`❌ MISSING PLAYERS (${missing.length}):`);
  console.log("=".repeat(80));
  if (missing.length === 0) {
    console.log("✅ All SGO players found in DB!");
  } else {
    missing.slice(0, 50).forEach((m) => {
      console.log(`\n${m.sgoName} (${m.team || "?"})`);
      console.log(`  SGO ID: ${m.playerId}`);
      if (m.suggestions.length > 0) {
        console.log(`  Possible matches: ${m.suggestions.join(", ")}`);
      } else {
        console.log(`  ⚠️  No similar names found - likely a rookie not yet ingested`);
      }
    });
    if (missing.length > 50) {
      console.log(`\n... and ${missing.length - 50} more`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("💡 RECOMMENDATIONS:");
  console.log("=".repeat(80));
  console.log("1. Run full NFL backfill for 2024 + 2025 to ingest all games");
  console.log("2. Check if these players appear in recent games (last 30 days)");
  console.log("3. If they're rookies, they may need to be manually added or wait for more games");
  console.log("=".repeat(80) + "\n");

  await sql.end();
}

main().catch(console.error);
