import "dotenv/config";
import postgres from "postgres";

async function run() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("No DB URL");
  const sql = postgres(conn, { prepare: false });

  try {
    console.log("\n=== ENRICHMENT PIPELINE DIAGNOSTIC ===\n");

    // 1. Check player_props count
    const [ppCount] =
      await sql`SELECT COUNT(*)::int as count FROM public.player_props WHERE is_active = true`;
    console.log(`✓ Active player_props: ${ppCount.count}`);

    // 2. Check player_game_logs count and coverage
    const [pglCount] = await sql`SELECT COUNT(*)::int as count FROM public.player_game_logs`;
    const [pglRecent] =
      await sql`SELECT COUNT(*)::int as count FROM public.player_game_logs WHERE game_date >= CURRENT_DATE - INTERVAL '30 days'`;
    console.log(`✓ Total player_game_logs: ${pglCount.count}`);
    console.log(`✓ Recent player_game_logs (last 30 days): ${pglRecent.count}`);

    // 3. Check player_enriched_stats
    const [pesCount] = await sql`SELECT COUNT(*)::int as count FROM public.player_enriched_stats`;
    console.log(`✓ player_enriched_stats rows: ${pesCount.count}`);

    // 4. Check player_analytics
    const [paCount] = await sql`SELECT COUNT(*)::int as count FROM public.player_analytics`;
    const [pa2025] =
      await sql`SELECT COUNT(*)::int as count FROM public.player_analytics WHERE season = '2025'`;
    console.log(`✓ player_analytics rows: ${paCount.count}`);
    console.log(`✓ player_analytics 2025: ${pa2025.count}`);

    // 5. Sample active props and check if they have enrichment data
    console.log("\n=== SAMPLE ACTIVE PROPS ENRICHMENT STATUS ===\n");
    const sampleProps = (await sql`
      SELECT 
        pp.id,
        p.full_name,
        pt.name as prop_type,
        g.game_date,
        l.abbreviation as league,
        -- Check if we have logs
        (SELECT COUNT(*) FROM public.player_game_logs pgl 
         WHERE pgl.player_id = pp.player_id 
           AND pgl.prop_type = pt.name 
           AND EXTRACT(YEAR FROM pgl.game_date)::text = EXTRACT(YEAR FROM g.game_date)::text
        ) as log_count,
        -- Check if we have enriched stats
        CASE WHEN pes.player_id IS NOT NULL THEN true ELSE false END as has_enriched_stats,
        pes.l5 as pes_l5,
        pes.l10 as pes_l10,
        pes.season_avg as pes_season_avg,
        -- Check if we have analytics
        CASE WHEN pa.player_id IS NOT NULL THEN true ELSE false END as has_analytics,
        pa.l5 as pa_l5,
        pa.l10 as pa_l10,
        pa.season_avg as pa_season_avg
      FROM public.player_props pp
      JOIN public.players p ON p.id = pp.player_id
      JOIN public.prop_types pt ON pt.id = pp.prop_type_id
      JOIN public.games g ON g.id = pp.game_id
      JOIN public.leagues l ON l.id = g.league_id
      LEFT JOIN public.player_enriched_stats pes ON pes.player_id = pp.player_id AND pes.game_id = pp.game_id
      LEFT JOIN public.player_analytics pa ON pa.player_id = pp.player_id 
        AND pa.prop_type = pt.name 
        AND pa.season = EXTRACT(YEAR FROM g.game_date)::text
      WHERE pp.is_active = true
        AND g.game_date >= CURRENT_DATE - INTERVAL '7 days'
        AND g.game_date <= CURRENT_DATE + INTERVAL '14 days'
      ORDER BY g.game_date DESC
      LIMIT 20
    `) as any[];

    for (const prop of sampleProps) {
      const status = [];
      if (prop.log_count > 0) status.push(`${prop.log_count} logs`);
      if (prop.has_enriched_stats) status.push(`enriched_stats`);
      if (prop.has_analytics) status.push(`analytics`);

      const enrichValues = [];
      if (prop.pes_l5 || prop.pa_l5) enrichValues.push(`l5:${prop.pes_l5 || prop.pa_l5}`);
      if (prop.pes_l10 || prop.pa_l10) enrichValues.push(`l10:${prop.pes_l10 || prop.pa_l10}`);
      if (prop.pes_season_avg || prop.pa_season_avg)
        enrichValues.push(`avg:${prop.pes_season_avg || prop.pa_season_avg}`);

      console.log(`${prop.full_name} - ${prop.prop_type} (${prop.league}, ${prop.game_date})`);
      console.log(`  Status: ${status.length ? status.join(", ") : "NO DATA"}`);
      if (enrichValues.length) console.log(`  Values: ${enrichValues.join(", ")}`);
      console.log();
    }

    // 6. Identify props with NO enrichment data at all
    const [noEnrichment] = await sql`
      SELECT COUNT(*)::int as count
      FROM public.player_props pp
      JOIN public.games g ON g.id = pp.game_id
      JOIN public.prop_types pt ON pt.id = pp.prop_type_id
      LEFT JOIN public.player_enriched_stats pes ON pes.player_id = pp.player_id AND pes.game_id = pp.game_id
      LEFT JOIN public.player_analytics pa ON pa.player_id = pp.player_id 
        AND pa.prop_type = pt.name 
        AND pa.season = EXTRACT(YEAR FROM g.game_date)::text
      WHERE pp.is_active = true
        AND g.game_date >= CURRENT_DATE - INTERVAL '7 days'
        AND g.game_date <= CURRENT_DATE + INTERVAL '14 days'
        AND pes.player_id IS NULL
        AND pa.player_id IS NULL
    `;

    console.log("\n=== SUMMARY ===\n");
    console.log(`Active props missing ALL enrichment data: ${noEnrichment.count}`);

    if (noEnrichment.count > 0) {
      console.log("\n⚠️  HIGH PRIORITY: Run enrichment scripts to populate missing data!");
      console.log("\nRecommended actions:");
      console.log(
        "1. Run per-game enrichment: ACTIVE_BACK_DAYS=30 ACTIVE_AHEAD_DAYS=14 tsx scripts/enrich-active-props.ts",
      );
      console.log(
        "2. Run season analytics: ENRICH_ACTIVE_ONLY=1 ENRICH_BACK_DAYS=30 ENRICH_AHEAD_DAYS=14 tsx scripts/enrich-player-analytics.ts 2025 2000",
      );
    }
  } finally {
    await sql.end({ timeout: 1 });
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
