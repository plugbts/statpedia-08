#!/usr/bin/env tsx

import "dotenv/config";
import postgres from "postgres";

/*
Compute per-prop per-game enrichment for active player_props rows and upsert into player_enriched_stats.
This guarantees v_props_list can pick up non-zero metrics via (player_id, game_id) join regardless of season-level analytics linkage.
*/

function pct(arr: number[]) {
  return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) * 100 : 0;
}

function americanToProb(odds: number): number | null {
  if (!Number.isFinite(odds) || odds === 0) return null;
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);
}

async function main() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("DATABASE_URL/NEON_DATABASE_URL is not set");
  const sql = postgres(conn, { prepare: false });
  try {
    const backDays = Number(process.env.ACTIVE_BACK_DAYS || 3);
    const aheadDays = Number(process.env.ACTIVE_AHEAD_DAYS || 7);

    const rows = (await sql /* sql */ `
      SELECT pp.id AS player_prop_id, pp.player_id, pp.game_id, pt.name AS prop_type,
             pp.line::numeric AS line,
             COALESCE(pp.over_odds_american, NULL) AS over_odds,
             COALESCE(pp.under_odds_american, NULL) AS under_odds,
             g.game_date
      FROM public.player_props pp
      JOIN public.prop_types pt ON pt.id = pp.prop_type_id
      JOIN public.games g ON g.id = pp.game_id
      WHERE g.game_date BETWEEN (CURRENT_DATE - ${backDays}::int) AND (CURRENT_DATE + ${aheadDays}::int)
      ORDER BY g.game_date DESC
      LIMIT 1000;
    `) as any[];

    let upserts = 0;

    for (const r of rows) {
      const seasonYear = new Date(r.game_date).getUTCFullYear();
      const logs = (await sql /* sql */ `
        SELECT 
          pgl.actual_value::numeric AS actual_value,
          pgl.line::numeric AS line,
          COALESCE(pgl.hit, (pgl.actual_value::numeric > COALESCE(pgl.line::numeric, 0))) AS hit,
          pgl.opponent_id AS opponent_team_id,
          pgl.game_date
        FROM public.player_game_logs pgl
        WHERE pgl.player_id = ${r.player_id}
          AND pgl.prop_type = ${r.prop_type}
          AND EXTRACT(YEAR FROM pgl.game_date)::int = ${seasonYear}
        ORDER BY pgl.game_date DESC
        LIMIT 20;
      `) as any[];

      if (!Array.isArray(logs) || logs.length === 0) continue;

      const hits = logs.map((l) => (l.hit ? 1 : 0));
      const l5 = pct(hits.slice(0, 5));
      const l10 = pct(hits.slice(0, 10));
      const l20 = pct(hits.slice(0, 20));

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

      const opponent_team_id = logs[0]?.opponent_team_id || null;
      const h2hLogs = logs.filter(
        (l) => opponent_team_id && l.opponent_team_id === opponent_team_id,
      );
      const h2h_avg = h2hLogs.length
        ? h2hLogs.reduce((a, b) => a + Number(b.actual_value), 0) / h2hLogs.length
        : null;
      const season_avg = logs.reduce((a, b) => a + Number(b.actual_value), 0) / logs.length;

      // EV calculation using provided odds and recent hit rate
      const preferOver = season_avg != null && r.line != null ? season_avg > Number(r.line) : true;
      const sideOdds = preferOver ? (r.over_odds ?? r.under_odds) : (r.under_odds ?? r.over_odds);
      const implied = sideOdds != null ? americanToProb(Number(sideOdds)) : null;
      const hitRate =
        (Number.isFinite(l10) && l10 > 0 ? l10 : Number.isFinite(l20) && l20 > 0 ? l20 : l5) / 100;
      const ev_percent = implied != null ? (hitRate - implied) * 100 : null;

      // Replace existing row for this player/game if present, then insert
      await sql /* sql */ `DELETE FROM public.player_enriched_stats WHERE player_id=${r.player_id} AND game_id=${r.game_id}`;
      await sql /* sql */ `
        INSERT INTO public.player_enriched_stats (
          player_id, game_id, l5, l10, l20, streak_l5, h2h_avg, season_avg, matchup_rank, ev_percent, created_at
        ) VALUES (
          ${r.player_id}, ${r.game_id}, ${l5}, ${l10}, ${l20}, ${current_streak}, ${h2h_avg}, ${season_avg}, NULL, ${ev_percent}, NOW()
        );
      `;
      upserts += 1;
    }

    console.log(`Upserted enriched stats for ${upserts} active props.`);
  } finally {
    // @ts-ignore
    await sql.end({ timeout: 1 });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error("enrich-active-props failed:", e);
    process.exit(1);
  });
}
