import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql as dsql } from "drizzle-orm";
import { player_game_logs } from "../src/db/schema/index";

type UUID = string;

function ms(n: number) {
  return new Promise((r) => setTimeout(r, n));
}

async function main() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("DATABASE_URL/NEON_DATABASE_URL is not set");
  const client = postgres(conn, { prepare: false });
  const db = drizzle(client);
  try {
    const startedAt = Date.now();
    let processed = 0;
    let lastReportAt = Date.now();
    let lastReportedProcessed = 0;
    const heartbeat = setInterval(() => {
      const elapsed = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
      const delta = processed - lastReportedProcessed;
      const since = Math.max(1, Math.floor((Date.now() - lastReportAt) / 1000));
      const rate = (delta / since).toFixed(1);
      console.log(`[enrich] heartbeat: processed=${processed} elapsed=${elapsed}s rate=${rate}/s`);
      lastReportAt = Date.now();
      lastReportedProcessed = processed;
    }, 3000);
    // Hard guards to avoid hangs: set statement and lock timeouts
    await client`SET statement_timeout TO '10s'`;
    await client`SET lock_timeout TO '5s'`;
    await client`SET idle_in_transaction_session_timeout TO '30s'`;

    // Optional filters via CLI/env
    const seasonFilter = (process.argv[2] || process.env.ENRICH_SEASON || "").trim();
    const maxLimit = Number(process.argv[3] || process.env.ENRICH_LIMIT || 2000);
    const batchSize = Number(process.env.ENRICH_BATCH || 250);
    const targetSeasonSql = seasonFilter
      ? dsql`AND EXTRACT(YEAR FROM pgl.game_date)::text = ${seasonFilter}`
      : dsql``;

    console.log(`[enrich] season=${seasonFilter || "ALL"} limit=${maxLimit} batch=${batchSize}`);

    for (let offset = 0; processed < maxLimit; offset += batchSize) {
      const remaining = Math.max(0, maxLimit - processed);
      const take = Math.min(batchSize, remaining);
      // Page over distinct combos to keep memory and transaction sizes small
      console.log(
        `[enrich] fetching page offset=${offset} take=${take} season=${seasonFilter || "ALL"}`,
      );
      const page = await db.execute(dsql`
        SELECT pgl.player_id, pgl.prop_type, EXTRACT(YEAR FROM pgl.game_date)::text as season
        FROM public.player_game_logs pgl
        WHERE TRUE ${targetSeasonSql}
        GROUP BY pgl.player_id, pgl.prop_type, EXTRACT(YEAR FROM pgl.game_date)
        ORDER BY season DESC
        LIMIT ${take} OFFSET ${offset};
      `);

      const rows = page as any[];
      if (!rows.length) break;

      for (const row of rows) {
        const playerId: UUID = row.player_id;
        const propType: string = row.prop_type;
        const season: string = row.season;

        // Fetch recent logs for this combo (latest 20)
        const logs = (await db.execute(dsql`
        SELECT 
          pgl.actual_value::numeric AS actual_value,
          pgl.line::numeric AS line,
          COALESCE(pgl.hit, (pgl.actual_value::numeric > COALESCE(pgl.line::numeric, 0))) AS hit,
          COALESCE(pgl.opponent_id, pgl.opponent_team_id) AS opponent_team_id,
          pgl.game_date
        FROM public.player_game_logs pgl
        WHERE pgl.player_id = ${playerId}
          AND pgl.prop_type = ${propType}
          AND EXTRACT(YEAR FROM pgl.game_date)::text = ${season}
        ORDER BY pgl.game_date DESC
        LIMIT 20;
      `)) as any[];

        if (!Array.isArray(logs) || logs.length === 0) continue;

        // Rolling hit rates
        const hits = logs.map((l) => (l.hit ? 1 : 0));
        const pct = (arr: number[]) =>
          arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) * 100 : 0;
        const l5 = pct(hits.slice(0, 5));
        const l10 = pct(hits.slice(0, 10));
        const l20 = pct(hits.slice(0, 20));

        // Current streak (+ for over, - for under)
        let streak = 0;
        let last = logs[0].hit;
        let current = 0;
        for (const l of logs) {
          if (l.hit === last) current += 1;
          else {
            streak = current;
            current = 1;
            last = l.hit;
          }
        }
        streak = current;
        const current_streak = last ? streak : -streak;

        // Opponent-based metrics (use most recent opponent if available)
        const opponent_team_id = logs[0]?.opponent_team_id || null;
        const h2hLogs = logs.filter(
          (l) => opponent_team_id && l.opponent_team_id === opponent_team_id,
        );
        const h2h_avg = h2hLogs.length
          ? h2hLogs.reduce((a, b) => a + Number(b.actual_value), 0) / h2hLogs.length
          : null;
        const season_avg = logs.reduce((a, b) => a + Number(b.actual_value), 0) / logs.length;

        // Resolve sport from latest league for this player/season
        let sport: string | null = null;
        try {
          const sp = (await db.execute(dsql`
          SELECT l.sport
          FROM public.player_game_logs pgl
          JOIN public.games g ON g.id = pgl.game_id
          JOIN public.leagues l ON l.id = g.league_id
          WHERE pgl.player_id = ${playerId}
            AND pgl.prop_type = ${propType}
            AND EXTRACT(YEAR FROM pgl.game_date)::text = ${season}
          ORDER BY g.game_date DESC
          LIMIT 1;
        `)) as any[];
          if (Array.isArray(sp) && sp.length > 0) sport = sp[0].sport ?? null;
        } catch (e) {
          // sport resolution is optional; ignore failures
        }

        // Fetch matchup rank from defense_ranks if available
        let matchup_rank: number | null = null;
        if (opponent_team_id) {
          try {
            const dr = (await db.execute(dsql`
            SELECT rank
            FROM public.defense_ranks
            WHERE team_id = ${opponent_team_id}
              AND prop_type = ${propType}
              AND season = ${season}
            ORDER BY updated_at DESC NULLS LAST
            LIMIT 1;
          `)) as any[];
            if (Array.isArray(dr) && dr.length > 0) {
              matchup_rank = dr[0].rank ?? null;
            }
          } catch {
            // defense_ranks may not exist yet; ignore gracefully
          }
        }

        // Compute EV% using latest player_props/props odds vs recent hit rate
        // Strategy: choose side based on season_avg vs latest line; impliedProb from american odds
        let ev_percent: number | null = null;
        function americanToProb(odds: number): number | null {
          if (!Number.isFinite(odds) || odds === 0) return null;
          return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);
        }
        function parseAmericanOdds(val: unknown): number | null {
          if (val == null) return null;
          if (typeof val === "number") {
            if (!Number.isFinite(val)) return null;
            return Math.trunc(val);
          }
          if (typeof val === "string") {
            const s = val.trim();
            // Grab first signed integer token (handles "+110", "-110", "-110.0", "+110 (DK)")
            const m = s.match(/([+-]?\d+)/);
            if (!m) return null;
            const n = parseInt(m[1], 10);
            return Number.isFinite(n) ? n : null;
          }
          return null;
        }
        // Try player_props first (raw strings; parse in JS for robustness)
        const latest = (await db.execute(dsql`
        SELECT 
          pp.line::numeric AS line,
          pp.over_odds AS over_odds_raw,
          pp.over_odds_american AS over_odds_american,
          pp.under_odds AS under_odds_raw,
          pp.under_odds_american AS under_odds_american
        FROM public.player_props pp
        JOIN public.prop_types pt ON pt.id = pp.prop_type_id
        JOIN public.games g ON g.id = pp.game_id
        WHERE pp.player_id = ${playerId}
          AND pt.name = ${propType}
          AND EXTRACT(YEAR FROM g.game_date)::text = ${season}
        ORDER BY g.game_date DESC
        LIMIT 1;
      `)) as any[];

        // Fallback to props table if player_props had no odds or line
        let line: number | null = null;
        let overOdds: number | null = null;
        let underOdds: number | null = null;
        if (Array.isArray(latest) && latest.length > 0) {
          const row = latest[0];
          line = row.line != null ? Number(row.line) : null;
          overOdds = parseAmericanOdds(row.over_odds_american ?? row.over_odds_raw);
          underOdds = parseAmericanOdds(row.under_odds_american ?? row.under_odds_raw);
        }
        if (line == null || (overOdds == null && underOdds == null)) {
          const alt = (await db.execute(dsql`
          SELECT 
            p.line::numeric AS line,
            p.best_odds_over AS over_odds_raw,
            p.best_odds_under AS under_odds_raw,
            p.odds AS base_odds_raw
          FROM public.props p
          WHERE p.player_id = ${playerId}
            AND p.prop_type = ${propType}
          ORDER BY p.updated_at DESC NULLS LAST
          LIMIT 1;
        `)) as any[];
          if (Array.isArray(alt) && alt.length > 0) {
            const r = alt[0];
            line = line ?? (r.line != null ? Number(r.line) : null);
            overOdds = overOdds ?? parseAmericanOdds(r.over_odds_raw);
            underOdds = underOdds ?? parseAmericanOdds(r.under_odds_raw);
            // Fallback to a single consensus/base odds if both sides are missing
            if (overOdds == null && underOdds == null) {
              const base = parseAmericanOdds(r.base_odds_raw);
              if (base != null) overOdds = base;
            }
          }
        }
        // Final fallback for line: use most recent game log line
        if (line == null) {
          const recentLogLine = logs.find((l) => l?.line != null)?.line;
          if (recentLogLine != null) line = Number(recentLogLine);
        }
        // Ultimate fallback for odds: if none available anywhere, assume -110 market baseline
        if (overOdds == null && underOdds == null) {
          overOdds = -110;
        }

        // Choose a recent hit rate baseline
        const hitRate =
          (Number.isFinite(l10) && l10 > 0 ? l10 : Number.isFinite(l20) && l20 > 0 ? l20 : l5) /
          100;
        if (line != null && (overOdds != null || underOdds != null) && Number.isFinite(hitRate)) {
          const preferOver = season_avg != null && line != null ? season_avg > line : true;
          // If only a single base odds exists, use it regardless of side
          const sideOdds = preferOver ? (overOdds ?? underOdds) : (underOdds ?? overOdds);
          const implied = sideOdds != null ? americanToProb(sideOdds) : null;
          if (implied != null) {
            ev_percent = (hitRate - implied) * 100; // percentage edge
          }
        }

        // Upsert into player_analytics
        await db.execute(dsql`
        INSERT INTO public.player_analytics (
          player_id, prop_type, season, sport, opponent_team_id,
          l5, l10, l20, current_streak, h2h_avg, season_avg, matchup_rank, ev_percent, last_updated
        ) VALUES (
          ${playerId}, ${propType}, ${season}, ${sport}, ${opponent_team_id},
          ${l5}, ${l10}, ${l20}, ${current_streak}, ${h2h_avg}, ${season_avg}, ${matchup_rank}, ${ev_percent}, NOW()
        )
        ON CONFLICT (player_id, prop_type, season)
        DO UPDATE SET
          sport = COALESCE(EXCLUDED.sport, public.player_analytics.sport),
          opponent_team_id = EXCLUDED.opponent_team_id,
          l5 = EXCLUDED.l5,
          l10 = EXCLUDED.l10,
          l20 = EXCLUDED.l20,
          current_streak = EXCLUDED.current_streak,
          h2h_avg = EXCLUDED.h2h_avg,
          season_avg = EXCLUDED.season_avg,
          matchup_rank = COALESCE(EXCLUDED.matchup_rank, public.player_analytics.matchup_rank),
          ev_percent = COALESCE(EXCLUDED.ev_percent, public.player_analytics.ev_percent),
          last_updated = NOW();
      `);

        processed += 1;
        if (processed % 50 === 0) {
          const elapsed = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
          console.log(`[enrich] progress: processed=${processed} elapsed=${elapsed}s`);
        }
      }

      // Small breather between pages to reduce DB load
      await ms(200);
    }

    clearInterval(heartbeat);
    console.log(`[enrich] Done. Upserted analytics for ${processed} combos.`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("enrich-player-analytics failed:", e);
  process.exit(1);
});
