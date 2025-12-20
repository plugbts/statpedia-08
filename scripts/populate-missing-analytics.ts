#!/usr/bin/env tsx
/**
 * Populate Missing Analytics
 *
 * Finds props that have game logs but no analytics, and populates them.
 * This fixes the issue where displayed props show 0/null for l5, l10, etc.
 */

import "dotenv/config";
import postgres from "postgres";

async function main() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  const sql = postgres(conn, { prepare: false });

  try {
    console.log("🔍 FINDING PROPS WITH GAME LOGS BUT NO ANALYTICS\n");
    console.log("=".repeat(80));

    // Find props that have game logs but no analytics
    // Check ALL displayed props, not just first 500
    const missingAnalytics = await sql`
      SELECT DISTINCT
        pp.player_id,
        pt.name as prop_type,
        EXTRACT(YEAR FROM g.game_date)::text as season,
        COUNT(DISTINCT pgl.id) as log_count,
        COUNT(DISTINCT pa.player_id) as analytics_count
      FROM public.player_props pp
      JOIN public.prop_types pt ON pt.id = pp.prop_type_id
      JOIN public.games g ON g.id = pp.game_id
      JOIN public.player_game_logs pgl 
        ON pgl.player_id = pp.player_id 
        AND LOWER(TRIM(pgl.prop_type)) = LOWER(TRIM(pt.name))
        AND EXTRACT(YEAR FROM pgl.game_date)::text = EXTRACT(YEAR FROM g.game_date)::text
      LEFT JOIN public.player_analytics pa
        ON pa.player_id = pp.player_id
        AND LOWER(TRIM(pa.prop_type)) = LOWER(TRIM(pt.name))
        AND pa.season = EXTRACT(YEAR FROM g.game_date)::text
      WHERE pp.id IN (SELECT id FROM public.v_props_list)
        AND pa.player_id IS NULL
      GROUP BY pp.player_id, pt.name, EXTRACT(YEAR FROM g.game_date)
      HAVING COUNT(DISTINCT pgl.id) > 0
      ORDER BY log_count DESC
      LIMIT 1000
    `;

    console.log(
      `\nFound ${missingAnalytics.length} player+prop+season combos with logs but no analytics\n`,
    );

    if (missingAnalytics.length === 0) {
      console.log("✅ No missing analytics found!");
      return;
    }

    console.log("📊 Sample missing analytics:");
    for (const row of missingAnalytics.slice(0, 10)) {
      console.log(
        `  Player: ${row.player_id.substring(0, 8)}... | Prop: ${row.prop_type} | Season: ${row.season} | Logs: ${row.log_count}`,
      );
    }

    console.log("\n🔄 POPULATING ANALYTICS...\n");
    console.log("=".repeat(80));

    let processed = 0;
    let errors = 0;

    for (const row of missingAnalytics) {
      try {
        // Get game logs for this player+prop+season
        const logs = await sql`
          SELECT 
            pgl.actual_value::numeric AS actual_value,
            pgl.line::numeric AS line,
            COALESCE(pgl.hit, (pgl.actual_value::numeric > COALESCE(pgl.line::numeric, 0))) AS hit,
            COALESCE(pgl.opponent_id, pgl.opponent_team_id) AS opponent_team_id,
            pgl.game_date
          FROM public.player_game_logs pgl
          WHERE pgl.player_id = ${row.player_id}
            AND LOWER(TRIM(pgl.prop_type)) = LOWER(TRIM(${row.prop_type}))
            AND EXTRACT(YEAR FROM pgl.game_date)::text = ${row.season}
          ORDER BY pgl.game_date DESC
          LIMIT 20
        `;

        if (!Array.isArray(logs) || logs.length === 0) {
          continue;
        }

        // Compute analytics
        const hits = logs.map((l) => (l.hit ? 1 : 0));
        const pct = (arr: number[]) =>
          arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) * 100 : 0;
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

        // Opponent-based metrics
        const opponent_team_id = logs[0]?.opponent_team_id || null;
        const h2hLogs = logs.filter(
          (l) => opponent_team_id && l.opponent_team_id === opponent_team_id,
        );
        const h2h_avg = h2hLogs.length
          ? h2hLogs.reduce((a, b) => a + Number(b.actual_value), 0) / h2hLogs.length
          : null;
        const season_avg = logs.reduce((a, b) => a + Number(b.actual_value), 0) / logs.length;

        // Get sport
        let sport: string | null = null;
        try {
          const sp = await sql`
            SELECT l.sport
            FROM public.player_game_logs pgl
            JOIN public.games g ON g.id = pgl.game_id
            JOIN public.leagues l ON l.id = g.league_id
            WHERE pgl.player_id = ${row.player_id}
              AND LOWER(TRIM(pgl.prop_type)) = LOWER(TRIM(${row.prop_type}))
              AND EXTRACT(YEAR FROM pgl.game_date)::text = ${row.season}
            ORDER BY g.game_date DESC
            LIMIT 1
          `;
          if (Array.isArray(sp) && sp.length > 0) sport = sp[0].sport ?? null;
        } catch (e) {
          // sport resolution is optional
        }

        // Upsert analytics
        await sql`
          INSERT INTO public.player_analytics (
            player_id, prop_type, season, sport, opponent_team_id,
            l5, l10, l20, current_streak, h2h_avg, season_avg, last_updated
          ) VALUES (
            ${row.player_id}, ${row.prop_type}, ${row.season}, ${sport}, ${opponent_team_id},
            ${l5}, ${l10}, ${l20}, ${current_streak}, ${h2h_avg}, ${season_avg}, NOW()
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
            last_updated = NOW()
        `;

        processed += 1;
        if (processed % 10 === 0) {
          console.log(`  Processed ${processed}/${missingAnalytics.length}...`);
        }
      } catch (error) {
        errors += 1;
        console.error(
          `  ❌ Error processing ${row.player_id.substring(0, 8)}... ${row.prop_type}:`,
          error,
        );
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log(`✅ COMPLETE: Processed ${processed}, Errors: ${errors}`);
    console.log("=".repeat(80));

    // Verify results
    console.log("\n🔍 VERIFICATION:");
    const verification = await sql`
      SELECT 
        COUNT(DISTINCT pp.id) as props_with_analytics,
        COUNT(DISTINCT CASE WHEN pa.l5 IS NOT NULL THEN pp.id END) as props_with_l5,
        COUNT(DISTINCT CASE WHEN pa.l10 IS NOT NULL THEN pp.id END) as props_with_l10
      FROM public.v_props_list vpl
      JOIN public.player_props pp ON pp.id = vpl.id
      JOIN public.prop_types pt ON pt.id = pp.prop_type_id
      JOIN public.games g ON g.id = pp.game_id
      LEFT JOIN public.player_analytics pa 
        ON pa.player_id = pp.player_id 
        AND LOWER(TRIM(pa.prop_type)) = LOWER(TRIM(pt.name))
        AND pa.season = EXTRACT(YEAR FROM g.game_date)::text
      WHERE pp.id IN (SELECT id FROM public.v_props_list LIMIT 500)
    `;
    console.log("Updated Coverage:", verification[0]);
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch(console.error);
