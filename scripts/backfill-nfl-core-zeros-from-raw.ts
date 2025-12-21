#!/usr/bin/env tsx

/**
 * Backfill NFL "core prop types" zeros + derived passing stats from already-saved raw payloads.
 *
 * Why:
 * - ESPN boxscore categories only list players who recorded a stat in that category.
 * - But SGO can offer props like "QB Receiving Yards" where the correct value is 0 most games.
 * - Our analytics needs a time series. This script creates missing 0 rows for core prop types
 *   for any player who appears in ANY stat category for a game.
 * - Also derives Passing Completions + Passing Attempts from "C/ATT".
 *
 * This script DOES NOT re-fetch from ESPN. It uses `public.player_game_logs_raw.payload`.
 * Safe to run while the main backfill is ongoing (it is per-game idempotent for the propTypes it touches).
 *
 * Usage:
 *   npx --yes tsx scripts/backfill-nfl-core-zeros-from-raw.ts 2024
 *   npx --yes tsx scripts/backfill-nfl-core-zeros-from-raw.ts 2025
 */

import { config as dotenvConfig } from "dotenv";
import postgres from "postgres";

dotenvConfig({ path: ".env.local" });
dotenvConfig();

const CORE = [
  "Passing Yards",
  "Passing TDs",
  "Passing Attempts",
  "Passing Completions",
  "Rushing Yards",
  "Rushing Attempts",
  "Receiving Yards",
  "Receptions",
];

function parseSlashPair(rawValue: unknown): { left: number; right: number } | null {
  if (rawValue === undefined || rawValue === null) return null;
  const s = String(rawValue).trim();
  if (!s || !s.includes("/")) return null;
  const [a, b] = s.split("/", 2).map((x) => Number(String(x).trim()));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { left: a, right: b };
}

function parseNumericStat(rawValue: unknown): number {
  if (rawValue === undefined || rawValue === null) return 0;
  if (typeof rawValue === "number") return Number(rawValue) || 0;
  const s = String(rawValue).trim();
  if (!s) return 0;
  if (s.includes("/")) return Number(s.split("/")[0]) || 0;
  if (s.includes("-")) return Number(s.split("-")[0]) || 0;
  return Number(s) || 0;
}

async function main() {
  const season = String(process.argv[2] || "").trim();
  if (!season) {
    console.error("Usage: tsx scripts/backfill-nfl-core-zeros-from-raw.ts 2024");
    process.exit(1);
  }

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
      console.warn(`[core-zeros] DB candidate failed: ${e?.message || e}`);
      try {
        await probe.end({ timeout: 1 });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
  if (!sql) throw new Error("All DB URLs failed");

  console.log(`[core-zeros] start season=${season}`);

  // Pull a manageable batch of raw games for the season.
  // We only need payload + game_external_id, and we map to games.id by api_game_id.
  const raws = (await sql.unsafe(
    `
      SELECT r.game_external_id, r.payload
      FROM public.player_game_logs_raw r
      WHERE r.league = 'NFL'
        AND r.season = $1
      ORDER BY r.fetched_at DESC NULLS LAST
    `,
    [season],
  )) as Array<{ game_external_id: string; payload: any }>;

  console.log(`[core-zeros] raw games found: ${raws.length}`);
  let processed = 0;
  let insertedTotal = 0;

  for (const row of raws) {
    processed++;
    const gameExternalId = String(row.game_external_id);
    const payload = row.payload;

    // Map api_game_id -> games.id + date + team ids
    const gamesRows = (await sql.unsafe(
      `
        SELECT g.id, g.game_date, g.home_team_id, g.away_team_id
        FROM public.games g
        WHERE g.api_game_id = $1
        LIMIT 1
      `,
      [gameExternalId],
    )) as Array<{ id: string; game_date: string; home_team_id: string; away_team_id: string }>;
    const g = gamesRows[0];
    if (!g) continue;

    const teamsData = payload?.boxscore?.players || [];
    const teamAbbrs = Array.from(
      new Set(
        (teamsData as any[])
          .map((t: any) => String(t?.team?.abbreviation || t?.team?.abbrev || "").toUpperCase())
          .filter(Boolean),
      ),
    );
    const oppFor = (abbr: string) => teamAbbrs.find((x) => x && x !== abbr) || "";

    // Gather stats per player per propType
    const valuesByPlayer = new Map<string, Map<string, number>>();
    // Track participants: any athlete listed anywhere counts as participant
    const participants = new Map<
      string,
      { playerExt: string; playerName?: string; teamAbbr: string; opponentAbbr: string }
    >();

    const propTypeMapping: Record<string, Record<string, string>> = {
      passing: {
        YDS: "Passing Yards",
        TD: "Passing TDs",
        INT: "Passing Interceptions",
      },
      rushing: {
        CAR: "Rushing Attempts",
        YDS: "Rushing Yards",
        TD: "Rushing TDs",
      },
      receiving: {
        REC: "Receptions",
        YDS: "Receiving Yards",
        TD: "Receiving TDs",
        TGTS: "Receiving Targets",
      },
    };

    for (const team of teamsData) {
      const teamAbbr = String(team?.team?.abbreviation || team?.team?.abbrev || "").toUpperCase();
      const opponentAbbr = oppFor(teamAbbr);
      const statGroups = team?.statistics || [];
      for (const statGroup of statGroups) {
        const category = String(statGroup?.name || "").toLowerCase();
        const labels: string[] = statGroup?.labels || [];
        const athletes = statGroup?.athletes || [];
        const mapping = propTypeMapping[category];
        if (!mapping && category !== "passing") continue;

        for (const athlete of athletes) {
          const playerExt = athlete?.athlete?.id;
          const playerName =
            athlete?.athlete?.displayName || athlete?.athlete?.shortName || undefined;
          const stats: any[] = athlete?.stats || [];
          if (!playerExt) continue;
          const pKey = `${playerExt}:${teamAbbr}`;
          participants.set(pKey, {
            playerExt: String(playerExt),
            playerName,
            teamAbbr,
            opponentAbbr,
          });

          let m = valuesByPlayer.get(pKey);
          if (!m) {
            m = new Map<string, number>();
            valuesByPlayer.set(pKey, m);
          }

          labels.forEach((label, idx) => {
            if (label === "C/ATT") {
              const pair = parseSlashPair(stats[idx]);
              if (pair) {
                m!.set("Passing Completions", pair.left);
                m!.set("Passing Attempts", pair.right);
              }
              return;
            }
            const propType = mapping?.[label];
            if (!propType) return;
            m!.set(propType, parseNumericStat(stats[idx]));
          });
        }
      }
    }

    // Ensure CORE propTypes exist for participants (set missing to 0)
    for (const [pKey, meta] of participants.entries()) {
      const m = valuesByPlayer.get(pKey) || new Map<string, number>();
      for (const t of CORE) if (!m.has(t)) m.set(t, 0);
      valuesByPlayer.set(pKey, m);
    }

    // Map abbreviations -> team UUIDs (for this game's teams)
    const homeTeam = (await sql.unsafe(
      `SELECT t.id, UPPER(t.abbreviation) AS abbr FROM public.teams t WHERE t.id = $1`,
      [g.home_team_id],
    )) as Array<{ id: string; abbr: string }>;
    const awayTeam = (await sql.unsafe(
      `SELECT t.id, UPPER(t.abbreviation) AS abbr FROM public.teams t WHERE t.id = $1`,
      [g.away_team_id],
    )) as Array<{ id: string; abbr: string }>;
    const homeAbbr = homeTeam[0]?.abbr;
    const awayAbbr = awayTeam[0]?.abbr;
    if (!homeAbbr || !awayAbbr) continue;

    // Resolve playerExt -> players.id and insert logs (idempotent per game+propType set)
    const logs: Array<any> = [];
    const propTypesToReplace = CORE;

    for (const [pKey, m] of valuesByPlayer.entries()) {
      const meta = participants.get(pKey);
      if (!meta) continue;

      // team id for player based on team abbrev matching home/away
      const teamId =
        meta.teamAbbr === homeAbbr
          ? g.home_team_id
          : meta.teamAbbr === awayAbbr
            ? g.away_team_id
            : null;
      if (!teamId) continue;
      const opponentId = teamId === g.home_team_id ? g.away_team_id : g.home_team_id;
      const homeAway = teamId === g.home_team_id ? "home" : "away";

      // players.external_id = ESPN athlete id
      const playerRows = (await sql.unsafe(
        `SELECT id FROM public.players WHERE external_id = $1 LIMIT 1`,
        [meta.playerExt],
      )) as Array<{ id: string }>;
      const playerId = playerRows[0]?.id;
      if (!playerId) continue;

      for (const propType of propTypesToReplace) {
        const v = m.get(propType);
        if (v === undefined) continue;
        logs.push({
          player_id: playerId,
          team_id: teamId,
          game_id: g.id,
          opponent_id: opponentId,
          prop_type: propType,
          line: "0",
          actual_value: String(v),
          hit: false as boolean,
          game_date: g.game_date,
          season,
          home_away: homeAway,
        });
      }
    }

    if (logs.length > 0) {
      await sql.unsafe(
        `DELETE FROM public.player_game_logs WHERE game_id = $1 AND prop_type = ANY($2::text[])`,
        [g.id, propTypesToReplace],
      );
      // Bulk insert using parameterized query (safer than string interpolation)
      for (const log of logs) {
        await sql.unsafe(
          `INSERT INTO public.player_game_logs (player_id, team_id, game_id, opponent_id, prop_type, line, actual_value, hit, game_date, season, home_away)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT DO NOTHING`,
          [
            log.player_id,
            log.team_id,
            log.game_id,
            log.opponent_id,
            log.prop_type,
            log.line,
            log.actual_value,
            log.hit,
            log.game_date,
            log.season,
            log.home_away,
          ],
        );
      }
      insertedTotal += logs.length;
    }

    if (processed % 10 === 0) {
      console.log(
        `[core-zeros] processed=${processed}/${raws.length} inserted_total=${insertedTotal}`,
      );
    }
  }

  console.log(`[core-zeros] done processed=${processed} inserted_total=${insertedTotal}`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
