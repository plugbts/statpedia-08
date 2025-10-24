#!/usr/bin/env tsx

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql as dsql } from "drizzle-orm";

function log(msg: string) {
  console.log(`[sync-mlb-supabase] ${msg}`);
}

type SupaRow = {
  player_name: string;
  prop_type: string;
  line: number | string | null;
  over_odds_american?: string | number | null;
  under_odds_american?: string | number | null;
  over_odds?: string | number | null;
  under_odds?: string | number | null;
  game_id?: string | null;
  prop_date?: string | null;
  league?: string | null;
};

function cleanName(name: string): string {
  return name
    .replace(/\b(jr\.?|sr\.?|ii|iii|iv)\b/gi, "")
    .replace(/[^a-zA-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function findPlayer(db: any, name: string) {
  const exact: any = await db.execute(dsql`
    SELECT id, team_id, name FROM public.players WHERE LOWER(name) = LOWER(${name}) LIMIT 1;
  `);
  const rows = Array.isArray(exact) ? exact : exact?.rows || [];
  if (rows.length) return rows[0];

  const cleaned = cleanName(name);
  if (cleaned.toLowerCase() !== name.toLowerCase()) {
    const again: any = await db.execute(dsql`
      SELECT id, team_id, name FROM public.players WHERE LOWER(name) = LOWER(${cleaned}) LIMIT 1;
    `);
    const againRows = Array.isArray(again) ? again : again?.rows || [];
    if (againRows.length) return againRows[0];
  }
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0];
    const last = parts[parts.length - 1];
    const fuzzy: any = await db.execute(dsql`
      SELECT id, team_id, name FROM public.players
      WHERE LOWER(name) ILIKE '%' || LOWER(${first}) || '%'
        AND LOWER(name) ILIKE '%' || LOWER(${last}) || '%'
      LIMIT 1;
    `);
    const fuzzyRows = Array.isArray(fuzzy) ? fuzzy : fuzzy?.rows || [];
    if (fuzzyRows.length) return fuzzyRows[0];
  }
  return null;
}

function normalizeMLBPropType(propType: string): string {
  const s = propType.toLowerCase();
  if (/(home\s*run|\bhr\b|homer)/.test(s)) return "Home Runs";
  if (/(runs batted in|\brbi\b|\brbis\b)/.test(s)) return "RBIs";
  if (/(total\s*bases|\btb\b)/.test(s)) return "Total Bases";
  if (/(walks|\bbb\b|bases on balls)/.test(s)) return "Walks";
  if (/(hits?)/.test(s)) return "Hits";
  if (/(runs?)/.test(s)) return "Runs";
  return propType;
}

function buildConflictKey(
  league: string,
  date: string,
  playerId: string,
  propType: string,
  line: number | string | null,
  odds?: string | number | null,
) {
  const l = line != null ? String(line) : "";
  const o = odds != null ? String(odds) : "";
  return `${league}:${date}:${playerId}:${propType}:${l}:${o}`;
}

async function fetchSupabaseMLB(date: string): Promise<SupaRow[]> {
  const baseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required in env");
  }
  const url = new URL(`${baseUrl}/rest/v1/player_props_fixed`);
  url.searchParams.set("league", "eq.mlb");
  // Use loose date window: within ±1 day of target
  url.searchParams.set(
    "prop_date",
    `gte.${new Date(Date.parse(date) - 24 * 3600 * 1000).toISOString().split("T")[0]}`,
  );
  url.searchParams.set(
    "prop_date",
    `lte.${new Date(Date.parse(date) + 24 * 3600 * 1000).toISOString().split("T")[0]}`,
  );
  url.searchParams.set("limit", "2000");
  const resp = await fetch(url.toString(), {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: "application/json",
    },
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Supabase REST failed: ${resp.status} ${t}`);
  }
  return (await resp.json()) as SupaRow[];
}

async function main() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("DATABASE_URL/NEON_DATABASE_URL is not set");
  const client = postgres(conn, { prepare: false });
  const db = drizzle(client);

  try {
    const date = process.argv[2] || new Date().toISOString().split("T")[0];
    log(`Fetching MLB props from Supabase for ~${date}...`);
    const rows = await fetchSupabaseMLB(date);
    log(`Fetched ${rows.length} rows`);

    let inserted = 0,
      matched = 0,
      skipped = 0;

    for (const r of rows) {
      const playerName = r.player_name?.trim();
      if (!playerName) {
        skipped++;
        continue;
      }
      const player = await findPlayer(db, playerName);
      if (!player) {
        skipped++;
        continue;
      }
      matched++;

      const propType = normalizeMLBPropType(r.prop_type || "");
      const line = r.line != null ? String(r.line) : null;
      const over = r.over_odds_american ?? r.over_odds ?? null;
      const under = r.under_odds_american ?? r.under_odds ?? null;
      const odds = over ?? under ?? null;
      const conflictKey = buildConflictKey(
        "mlb",
        (r.prop_date || date)!.slice(0, 10),
        player.id,
        propType,
        r.line,
        odds,
      );

      await db.execute(dsql`
        INSERT INTO public.props (
          player_id, team_id, game_id, prop_type, line, odds, best_odds_over, best_odds_under, source, conflict_key, updated_at
        ) VALUES (
          ${player.id}, ${player.team_id}, ${r.game_id || null}, ${propType}, ${line}, ${odds}, ${over || null}, ${under || null}, 'supabase', ${conflictKey}, NOW()
        )
        ON CONFLICT (conflict_key) DO UPDATE SET
          line = COALESCE(EXCLUDED.line, public.props.line),
          odds = COALESCE(EXCLUDED.odds, public.props.odds),
          best_odds_over = COALESCE(EXCLUDED.best_odds_over, public.props.best_odds_over),
          best_odds_under = COALESCE(EXCLUDED.best_odds_under, public.props.best_odds_under),
          updated_at = NOW();
      `);
      inserted++;
      if (inserted % 200 === 0) log(`Upserted ${inserted}...`);
    }

    log(`Done. matched=${matched} inserted=${inserted} skipped=${skipped}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("sync-mlb-odds-from-supabase failed:", e);
  process.exit(1);
});
