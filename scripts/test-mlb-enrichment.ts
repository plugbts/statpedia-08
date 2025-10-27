import "dotenv/config";
import postgres from "postgres";

async function run() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("No DB URL");
  const sql = postgres(conn, { prepare: false });

  try {
    console.log("\n=== MLB ENRICHMENT TEST ===\n");

    const rows = (await sql`
      SELECT 
        COALESCE(p.full_name, p.name) as player_name,
        pt.name as prop_type,
        pp.line,
        t.abbreviation as team,
        opp.abbreviation as opponent,
        g.game_date,
        -- Enriched stats from player_enriched_stats (per-game)
        pes.l5 as pes_l5,
        pes.l10 as pes_l10,
        pes.l20 as pes_l20,
        pes.season_avg as pes_season_avg,
        pes.h2h_avg as pes_h2h_avg,
        pes.streak_l5 as pes_streak,
        pes.ev_percent as pes_ev,
        -- Analytics from player_analytics (season-level)
        pa.l5 as pa_l5,
        pa.l10 as pa_l10,
        pa.l20 as pa_l20,
        pa.season_avg as pa_season_avg,
        pa.h2h_avg as pa_h2h_avg,
        pa.current_streak as pa_streak,
        pa.ev_percent as pa_ev,
        -- Final coalesced values (what v_props_list shows)
        COALESCE(pes.l5, pa.l5) as final_l5,
        COALESCE(pes.l10, pa.l10) as final_l10,
        COALESCE(pes.l20, pa.l20) as final_l20,
        COALESCE(pes.season_avg, pa.season_avg) as final_season_avg,
        COALESCE(pes.h2h_avg, pa.h2h_avg) as final_h2h_avg,
        COALESCE(pes.ev_percent, pa.ev_percent) as final_ev
      FROM public.player_props pp
      JOIN public.players p ON p.id = pp.player_id
      JOIN public.prop_types pt ON pt.id = pp.prop_type_id
      JOIN public.games g ON g.id = pp.game_id
      JOIN public.leagues l ON l.id = g.league_id
      LEFT JOIN public.teams t ON t.id = p.team_id
      LEFT JOIN public.teams opp ON opp.id = (
        CASE 
          WHEN g.home_team_id = p.team_id THEN g.away_team_id
          WHEN g.away_team_id = p.team_id THEN g.home_team_id
        END
      )
      LEFT JOIN public.player_enriched_stats pes ON pes.player_id = pp.player_id AND pes.game_id = pp.game_id
      LEFT JOIN public.player_analytics pa ON pa.player_id = pp.player_id 
        AND pa.prop_type = pt.name 
        AND pa.season = EXTRACT(YEAR FROM g.game_date)::text
      WHERE (l.abbreviation = 'MLB' OR l.code = 'MLB')
        AND pp.is_active = true
        AND g.game_date BETWEEN (CURRENT_DATE - INTERVAL '30 days') AND (CURRENT_DATE + INTERVAL '14 days')
      ORDER BY g.game_date DESC
      LIMIT 20
    `) as any[];

    console.log(`Found ${rows.length} MLB props\n`);

    let enrichedCount = 0;
    for (const row of rows) {
      const hasEnrichment =
        row.final_l5 != null || row.final_l10 != null || row.final_season_avg != null;

      if (hasEnrichment) enrichedCount++;

      console.log(
        `${row.player_name} - ${row.prop_type} ${row.line} (${row.team} vs ${row.opponent})`,
      );
      console.log(`  Game: ${row.game_date}`);

      if (hasEnrichment) {
        console.log(`  ✅ ENRICHED:`);
        if (row.final_l5) console.log(`     L5: ${row.final_l5}%`);
        if (row.final_l10) console.log(`     L10: ${row.final_l10}%`);
        if (row.final_l20) console.log(`     L20: ${row.final_l20}%`);
        if (row.final_season_avg) console.log(`     Season Avg: ${row.final_season_avg}`);
        if (row.final_h2h_avg) console.log(`     H2H Avg: ${row.final_h2h_avg}`);
        if (row.final_ev) console.log(`     EV%: ${row.final_ev}%`);

        // Show source
        if (row.pes_l5 != null) console.log(`     Source: player_enriched_stats (per-game)`);
        else if (row.pa_l5 != null) console.log(`     Source: player_analytics (season)`);
      } else {
        console.log(`  ❌ NO ENRICHMENT DATA`);
      }
      console.log();
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total MLB props: ${rows.length}`);
    console.log(
      `With enrichment: ${enrichedCount} (${Math.round((enrichedCount / rows.length) * 100)}%)`,
    );
    console.log(`Missing enrichment: ${rows.length - enrichedCount}`);
  } finally {
    await sql.end({ timeout: 1 });
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
