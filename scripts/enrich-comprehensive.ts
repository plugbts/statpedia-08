import "dotenv/config";
import postgres from "postgres";

/*
COMPREHENSIVE ENRICHMENT SCRIPT
Computes enrichment metrics for ALL active props by:
1. Normalizing prop type names to match between player_props and player_game_logs
2. Computing per-game enriched stats
3. Computing season-level analytics
4. Handling mismatches gracefully with fuzzy matching
*/

function pct(arr: number[]) {
  return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) * 100 : 0;
}

function americanToProb(odds: number): number | null {
  if (!Number.isFinite(odds) || odds === 0) return null;
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);
}

// Normalize prop type names for matching
function normalizePropType(propType: string): string[] {
  const normalized = propType.toLowerCase().trim();

  // Return array of possible matches
  const matches: string[] = [normalized];

  // Common mappings
  const mappings: Record<string, string[]> = {
    hits: ["batting hits", "hits", "h"],
    "home runs": ["batting homeruns", "homeruns", "home runs", "hr"],
    rbis: ["batting rbi", "rbi", "rbis", "runs batted in"],
    runs: ["batting runs", "runs", "r"],
    "stolen bases": ["batting stolenbases", "stolen bases", "sb", "steals"],
    strikeouts: [
      "batting strikeouts",
      "pitching strikeouts",
      "strikeouts",
      "k",
      "so",
      "pitcher strikeouts",
    ],
    walks: ["batting basesonballs", "pitching basesonballs", "walks", "bb", "base on balls"],
    doubles: ["batting doubles", "doubles", "2b"],
    triples: ["batting triples", "triples", "3b"],
    "total bases": ["batting totalbases", "total bases", "tb"],
    "hits allowed": ["pitching hits", "hits allowed", "ha"],
    "earned runs": ["pitching earnedruns", "earned runs", "er"],
    "innings pitched": ["pitching outs", "innings pitched", "ip"],
    points: ["points", "pts", "fantasyscore"],
    assists: ["assists", "ast", "a"],
    rebounds: ["rebounds", "reb", "trb"],
    goals: ["goals", "g"],
    "passing yards": ["passing yards", "pass yds", "py"],
    "passing tds": ["passing touchdowns", "passing tds", "pass td", "ptd"],
    "rushing yards": ["rushing yards", "rush yds", "ry"],
    "rushing tds": ["rushing touchdowns", "rushing tds", "rush td", "rtd"],
    "receiving yards": ["receiving yards", "rec yds", "recy"],
    "receiving tds": ["receiving touchdowns", "receiving tds", "rec td", "rectd"],
    receptions: ["receiving receptions", "receptions", "rec"],
    "longest reception": ["receiving longestreception", "longest reception", "long rec"],
    "longest completion": ["passing longestcompletion", "longest completion", "long pass"],
    "longest rush": ["rushing longestrush", "longest rush", "long rush"],
  };

  // Check if this prop type matches any mapping
  for (const [key, variations] of Object.entries(mappings)) {
    if (variations.some((v) => normalized.includes(v) || v.includes(normalized))) {
      matches.push(key);
      matches.push(...variations);
    }
  }

  return [...new Set(matches)];
}

async function main() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("DATABASE_URL/NEON_DATABASE_URL is not set");
  const sql = postgres(conn, { prepare: false });

  try {
    const backDays = Number(process.env.ACTIVE_BACK_DAYS || 30);
    const aheadDays = Number(process.env.ACTIVE_AHEAD_DAYS || 14);
    const batchSize = Number(process.env.BATCH_SIZE || 100);

    console.log(`\n=== COMPREHENSIVE ENRICHMENT ===`);
    console.log(`Window: ${backDays} days back, ${aheadDays} days ahead`);
    console.log(`Batch size: ${batchSize}\n`);

    // Get all active props in the window
    const allProps = (await sql`
      SELECT 
        pp.id AS player_prop_id,
        pp.player_id,
        pp.game_id,
        pt.name AS prop_type,
        pp.line::numeric AS line,
        pp.over_odds_american,
        pp.under_odds_american,
        g.game_date,
        EXTRACT(YEAR FROM g.game_date)::int as season_year
      FROM public.player_props pp
      JOIN public.prop_types pt ON pt.id = pp.prop_type_id
      JOIN public.games g ON g.id = pp.game_id
      WHERE pp.is_active = true
        AND g.game_date BETWEEN (CURRENT_DATE - ${backDays}::int) AND (CURRENT_DATE + ${aheadDays}::int)
      ORDER BY g.game_date DESC
    `) as any[];

    console.log(`Found ${allProps.length} active props to enrich`);

    let enrichedCount = 0;
    let skippedNoLogs = 0;
    let errors = 0;

    for (let i = 0; i < allProps.length; i++) {
      const r = allProps[i];

      if (i % 50 === 0) {
        console.log(
          `Progress: ${i}/${allProps.length} (enriched: ${enrichedCount}, skipped: ${skippedNoLogs}, errors: ${errors})`,
        );
      }

      try {
        // Get prop type aliases from database
        const aliases = (await sql`
          SELECT alias
          FROM public.prop_type_aliases
          WHERE LOWER(canonical_name) = LOWER(${r.prop_type})
             OR LOWER(alias) = LOWER(${r.prop_type})
        `) as any[];

        const propTypeVariations = [
          r.prop_type.toLowerCase(),
          ...aliases.map((a: any) => a.alias.toLowerCase()),
        ];

        const logs = (await sql`
          SELECT 
            pgl.actual_value::numeric AS actual_value,
            pgl.line::numeric AS line,
            COALESCE(pgl.hit, (pgl.actual_value::numeric > COALESCE(pgl.line::numeric, 0))) AS hit,
            COALESCE(pgl.opponent_id, pgl.opponent_team_id) AS opponent_team_id,
            pgl.game_date
          FROM public.player_game_logs pgl
          WHERE pgl.player_id = ${r.player_id}
            AND LOWER(pgl.prop_type) = ANY(${propTypeVariations})
            AND EXTRACT(YEAR FROM pgl.game_date)::int = ${r.season_year}
          ORDER BY pgl.game_date DESC
          LIMIT 20
        `) as any[];

        if (!logs || logs.length === 0) {
          skippedNoLogs++;
          continue;
        }

        // Compute metrics
        const hits = logs.map((l: any) => (l.hit ? 1 : 0));
        const l5 = pct(hits.slice(0, 5));
        const l10 = pct(hits.slice(0, 10));
        const l20 = pct(hits.slice(0, 20));

        // Current streak
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

        // H2H and season averages
        const opponent_team_id = logs[0]?.opponent_team_id || null;
        const h2hLogs = logs.filter(
          (l: any) => opponent_team_id && l.opponent_team_id === opponent_team_id,
        );
        const h2h_avg = h2hLogs.length
          ? h2hLogs.reduce((a: number, b: any) => a + Number(b.actual_value), 0) / h2hLogs.length
          : null;
        const season_avg =
          logs.reduce((a: number, b: any) => a + Number(b.actual_value), 0) / logs.length;

        // EV calculation
        const preferOver =
          season_avg != null && r.line != null ? season_avg > Number(r.line) : true;
        const sideOdds = preferOver
          ? (r.over_odds_american ?? r.under_odds_american)
          : (r.under_odds_american ?? r.over_odds_american);
        const implied = sideOdds != null ? americanToProb(Number(sideOdds)) : null;
        const hitRate =
          (Number.isFinite(l10) && l10 > 0 ? l10 : Number.isFinite(l20) && l20 > 0 ? l20 : l5) /
          100;
        const ev_percent = implied != null ? (hitRate - implied) * 100 : null;

        // Upsert into player_enriched_stats (delete then insert since no unique constraint)
        await sql`DELETE FROM public.player_enriched_stats WHERE player_id = ${r.player_id} AND game_id = ${r.game_id}`;
        await sql`
          INSERT INTO public.player_enriched_stats (
            player_id, game_id, l5, l10, l20, streak_l5, h2h_avg, season_avg, matchup_rank, ev_percent, created_at
          ) VALUES (
            ${r.player_id}, ${r.game_id}, ${l5}, ${l10}, ${l20}, ${current_streak}, ${h2h_avg}, ${season_avg}, NULL, ${ev_percent}, NOW()
          )
        `;

        enrichedCount++;
      } catch (e) {
        errors++;
        console.error(`Error enriching prop ${r.player_prop_id}:`, (e as Error).message);
      }
    }

    console.log(`\n=== ENRICHMENT COMPLETE ===`);
    console.log(`Total props: ${allProps.length}`);
    console.log(`Successfully enriched: ${enrichedCount}`);
    console.log(`Skipped (no logs): ${skippedNoLogs}`);
    console.log(`Errors: ${errors}`);
  } finally {
    await sql.end({ timeout: 1 });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error("Comprehensive enrichment failed:", e);
    process.exit(1);
  });
}
