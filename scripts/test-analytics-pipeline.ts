#!/usr/bin/env tsx
/**
 * Comprehensive Analytics Pipeline Test
 *
 * Tests the entire data flow:
 * 1. player_props → prop_types → players
 * 2. player_game_logs → player_analytics
 * 3. v_props_list view joins
 * 4. API response format
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
    console.log("🔍 ANALYTICS PIPELINE DIAGNOSTICS\n");
    console.log("=".repeat(80));

    // 1. Check displayed props
    console.log("\n📊 STEP 1: Displayed Props Analysis");
    console.log("-".repeat(80));
    const displayedProps = await sql`
      SELECT 
        COUNT(*) as total_props,
        COUNT(DISTINCT pp.player_id) as unique_players,
        COUNT(DISTINCT pt.name) as unique_prop_types,
        COUNT(DISTINCT l.abbreviation) as unique_leagues
      FROM public.v_props_list vpl
      JOIN public.player_props pp ON pp.id = vpl.id
      JOIN public.prop_types pt ON pt.id = pp.prop_type_id
      JOIN public.games g ON g.id = pp.game_id
      JOIN public.leagues l ON l.id = g.league_id
      LIMIT 100
    `;
    console.log("Displayed Props Stats:", displayedProps[0]);

    // 2. Check game logs for displayed props
    console.log("\n📊 STEP 2: Game Logs Coverage");
    console.log("-".repeat(80));
    const gameLogsCheck = await sql`
      SELECT 
        COUNT(DISTINCT pp.id) as props_with_logs,
        COUNT(DISTINCT pp.player_id) as players_with_logs,
        COUNT(DISTINCT pgl.id) as total_logs
      FROM public.v_props_list vpl
      JOIN public.player_props pp ON pp.id = vpl.id
      JOIN public.prop_types pt ON pt.id = pp.prop_type_id
      LEFT JOIN public.player_game_logs pgl 
        ON pgl.player_id = pp.player_id 
        AND LOWER(TRIM(pgl.prop_type)) = LOWER(TRIM(pt.name))
      LIMIT 100
    `;
    console.log("Game Logs Coverage:", gameLogsCheck[0]);

    // 3. Check analytics for displayed props
    console.log("\n📊 STEP 3: Analytics Coverage");
    console.log("-".repeat(80));
    const analyticsCheck = await sql`
      SELECT 
        COUNT(DISTINCT pp.id) as props_with_analytics,
        COUNT(DISTINCT pp.player_id) as players_with_analytics,
        COUNT(DISTINCT CASE WHEN pa.l5 IS NOT NULL THEN pp.id END) as props_with_l5,
        COUNT(DISTINCT CASE WHEN pa.l10 IS NOT NULL THEN pp.id END) as props_with_l10,
        COUNT(DISTINCT CASE WHEN pa.current_streak IS NOT NULL THEN pp.id END) as props_with_streak,
        COUNT(DISTINCT CASE WHEN pa.h2h_avg IS NOT NULL THEN pp.id END) as props_with_h2h,
        COUNT(DISTINCT CASE WHEN pa.season_avg IS NOT NULL THEN pp.id END) as props_with_season_avg
      FROM public.v_props_list vpl
      JOIN public.player_props pp ON pp.id = vpl.id
      JOIN public.prop_types pt ON pt.id = pp.prop_type_id
      LEFT JOIN public.player_analytics pa 
        ON pa.player_id = pp.player_id 
        AND LOWER(TRIM(pa.prop_type)) = LOWER(TRIM(pt.name))
        AND pa.season = EXTRACT(YEAR FROM (SELECT game_date FROM public.games WHERE id = pp.game_id))::text
      LIMIT 100
    `;
    console.log("Analytics Coverage:", analyticsCheck[0]);

    // 4. Sample props with full data flow
    console.log("\n📊 STEP 4: Sample Props Data Flow");
    console.log("-".repeat(80));
    const sampleProps = await sql`
      SELECT 
        vpl.id,
        vpl.full_name,
        vpl.team,
        vpl.opponent,
        vpl.market as prop_type,
        vpl.l5,
        vpl.l10,
        vpl.l20,
        vpl.current_streak,
        vpl.h2h_avg,
        vpl.season_avg,
        vpl.ev_percent,
        (SELECT COUNT(*) FROM public.player_game_logs pgl 
         WHERE pgl.player_id = pp.player_id 
         AND LOWER(TRIM(pgl.prop_type)) = LOWER(TRIM(pt.name))) as log_count,
        (SELECT COUNT(*) FROM public.player_analytics pa 
         WHERE pa.player_id = pp.player_id 
         AND LOWER(TRIM(pa.prop_type)) = LOWER(TRIM(pt.name))) as analytics_count
      FROM public.v_props_list vpl
      JOIN public.player_props pp ON pp.id = vpl.id
      JOIN public.prop_types pt ON pt.id = pp.prop_type_id
      ORDER BY vpl.game_date DESC NULLS LAST
      LIMIT 10
    `;
    console.log("\nSample Props (first 10):");
    for (const prop of sampleProps) {
      console.log(`\n  ${prop.full_name} - ${prop.prop_type}`);
      console.log(`    Team: ${prop.team || "NULL"} | Opponent: ${prop.opponent || "NULL"}`);
      console.log(`    Logs: ${prop.log_count} | Analytics: ${prop.analytics_count}`);
      console.log(
        `    l5: ${prop.l5 ?? "NULL"} | l10: ${prop.l10 ?? "NULL"} | streak: ${prop.current_streak ?? "NULL"}`,
      );
      console.log(
        `    h2h: ${prop.h2h_avg ?? "NULL"} | season: ${prop.season_avg ?? "NULL"} | ev: ${prop.ev_percent ?? "NULL"}`,
      );
    }

    // 5. Prop type name mismatches
    console.log("\n📊 STEP 5: Prop Type Name Mismatches");
    console.log("-".repeat(80));
    const mismatches = await sql`
      SELECT DISTINCT
        pt.name as prop_type_name,
        pgl.prop_type as log_prop_type,
        pa.prop_type as analytics_prop_type
      FROM public.player_props pp
      JOIN public.prop_types pt ON pt.id = pp.prop_type_id
      LEFT JOIN public.player_game_logs pgl 
        ON pgl.player_id = pp.player_id 
        AND LOWER(TRIM(pgl.prop_type)) = LOWER(TRIM(pt.name))
      LEFT JOIN public.player_analytics pa 
        ON pa.player_id = pp.player_id 
        AND LOWER(TRIM(pa.prop_type)) = LOWER(TRIM(pt.name))
      WHERE pp.id IN (SELECT id FROM public.v_props_list LIMIT 50)
        AND (pgl.prop_type IS NULL OR pa.prop_type IS NULL)
      LIMIT 20
    `;
    console.log(`\nFound ${mismatches.length} potential name mismatches:`);
    for (const m of mismatches.slice(0, 10)) {
      console.log(
        `  Prop: "${m.prop_type_name}" | Log: "${m.log_prop_type || "NULL"}" | Analytics: "${m.analytics_prop_type || "NULL"}"`,
      );
    }

    // 6. Check player_enriched_stats
    console.log("\n📊 STEP 6: Player Enriched Stats Coverage");
    console.log("-".repeat(80));
    const enrichedStats = await sql`
      SELECT 
        COUNT(DISTINCT pp.id) as props_with_enriched,
        COUNT(DISTINCT CASE WHEN pes.l5 IS NOT NULL THEN pp.id END) as props_with_pes_l5,
        COUNT(DISTINCT CASE WHEN pes.l10 IS NOT NULL THEN pp.id END) as props_with_pes_l10,
        COUNT(DISTINCT CASE WHEN pes.streak_l5 IS NOT NULL THEN pp.id END) as props_with_pes_streak
      FROM public.v_props_list vpl
      JOIN public.player_props pp ON pp.id = vpl.id
      LEFT JOIN public.player_enriched_stats pes 
        ON pes.player_id = pp.player_id 
        AND pes.game_id = pp.game_id
      LIMIT 100
    `;
    console.log("Enriched Stats Coverage:", enrichedStats[0]);

    // 7. View join test
    console.log("\n📊 STEP 7: View Join Test");
    console.log("-".repeat(80));
    const viewTest = await sql`
      SELECT 
        COUNT(*) as total_rows,
        COUNT(CASE WHEN team IS NOT NULL AND team != 'UNK' THEN 1 END) as rows_with_team,
        COUNT(CASE WHEN opponent IS NOT NULL AND opponent != 'TBD' THEN 1 END) as rows_with_opponent,
        COUNT(CASE WHEN l5 IS NOT NULL THEN 1 END) as rows_with_l5,
        COUNT(CASE WHEN l10 IS NOT NULL THEN 1 END) as rows_with_l10,
        COUNT(CASE WHEN current_streak IS NOT NULL THEN 1 END) as rows_with_streak,
        COUNT(CASE WHEN h2h_avg IS NOT NULL THEN 1 END) as rows_with_h2h,
        COUNT(CASE WHEN season_avg IS NOT NULL THEN 1 END) as rows_with_season_avg,
        COUNT(CASE WHEN ev_percent IS NOT NULL THEN 1 END) as rows_with_ev
      FROM public.v_props_list
    `;
    console.log("View Data Quality:", viewTest[0]);

    // 8. API response simulation
    console.log("\n📊 STEP 8: API Response Simulation");
    console.log("-".repeat(80));
    const apiResponse = await sql`
      SELECT 
        id,
        full_name,
        team,
        opponent,
        market,
        l5,
        l10,
        l20,
        current_streak,
        h2h_avg,
        season_avg,
        ev_percent
      FROM public.v_props_list
      ORDER BY game_date DESC NULLS LAST
      LIMIT 5
    `;
    console.log("\nAPI Response Sample (first 5):");
    console.log(JSON.stringify(apiResponse, null, 2));

    console.log("\n" + "=".repeat(80));
    console.log("✅ DIAGNOSTICS COMPLETE");
    console.log("=".repeat(80));
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch(console.error);
