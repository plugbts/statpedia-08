#!/usr/bin/env tsx

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql as dsql } from "drizzle-orm";
import {
  cloudflarePlayerPropsAPI,
  type PlayerProp,
} from "../src/services/cloudflare-player-props-api";

function log(msg: string) {
  console.log(`[sync-mlb-odds] ${msg}`);
}

// Simple name normalizer
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
  // Expect mostly already normalized from worker, but ensure robustness
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
  line: number | null,
  odds?: string | number | null,
) {
  const l = line != null ? String(line) : "";
  const o = odds != null ? String(odds) : "";
  return `${league}:${date}:${playerId}:${propType}:${l}:${o}`;
}

async function main() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("DATABASE_URL/NEON_DATABASE_URL is not set");
  const client = postgres(conn, { prepare: false });
  const db = drizzle(client);

  try {
    const date = process.argv[2] || new Date().toISOString().split("T")[0];
    log(`Fetching MLB props from Cloudflare Worker for ~${date} (force refresh)...`);
    const propsList: PlayerProp[] = await cloudflarePlayerPropsAPI.getPlayerProps(
      "mlb",
      true,
      date,
    );
    log(`Fetched ${propsList.length} props`);

    if (propsList.length === 0) {
      log(
        `Cloudflare returned zero MLB props for ${date}. If this is postseason/offday, that's expected. Otherwise, we may need to update the Worker ingestion for MLB.`,
      );
      return;
    }

    let inserted = 0;
    let matched = 0;
    let skipped = 0;

    for (const p of propsList) {
      const playerName = p.playerName?.trim();
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

      const propType = normalizeMLBPropType(p.propType || "");
      const line = p.line != null ? String(p.line) : null;
      // Choose best odds over/under if available; also stash books JSON
      const bestOver = p.bestOver?.price ?? null;
      const bestUnder = p.bestUnder?.price ?? null;
      const booksPayload = p.allBooks ? JSON.stringify(p.allBooks) : null;

      const conflictKey = buildConflictKey(
        "mlb",
        p.gameDate?.split("T")[0] || date,
        player.id,
        propType,
        p.line,
        bestOver || bestUnder,
      );

      await db.execute(dsql`
        INSERT INTO public.props (
          player_id, team_id, game_id, prop_type, line, odds, best_odds_over, best_odds_under, books_over, books_under, source, conflict_key, updated_at
        ) VALUES (
          ${player.id}, ${player.team_id}, ${p.gameId || null}, ${propType}, ${line}, ${bestOver || bestUnder || null}, ${bestOver || null}, ${bestUnder || null}, ${booksPayload}, ${booksPayload}, 'cloudflare', ${conflictKey}, NOW()
        )
        ON CONFLICT (conflict_key) DO UPDATE SET
          line = COALESCE(EXCLUDED.line, public.props.line),
          odds = COALESCE(EXCLUDED.odds, public.props.odds),
          best_odds_over = COALESCE(EXCLUDED.best_odds_over, public.props.best_odds_over),
          best_odds_under = COALESCE(EXCLUDED.best_odds_under, public.props.best_odds_under),
          books_over = COALESCE(EXCLUDED.books_over, public.props.books_over),
          books_under = COALESCE(EXCLUDED.books_under, public.props.books_under),
          updated_at = NOW();
      `);
      inserted++;

      if (inserted % 100 === 0) log(`Upserted ${inserted} props so far...`);
    }

    log(`Done. matched_players=${matched} inserted=${inserted} skipped=${skipped}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("sync-mlb-odds failed:", e);
  process.exit(1);
});
