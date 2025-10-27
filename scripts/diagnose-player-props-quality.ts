import "dotenv/config";
import postgres from "postgres";

async function run() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("No DB URL");
  const sql = postgres(conn, { prepare: false });

  try {
    console.log("\n=== PLAYER_PROPS DATA QUALITY CHECK ===\n");

    // Check if player_props have valid player_id references
    const [invalidPlayers] = await sql`
      SELECT COUNT(*)::int as count
      FROM public.player_props pp
      LEFT JOIN public.players p ON p.id = pp.player_id
      WHERE pp.is_active = true
        AND p.id IS NULL
    `;
    console.log(`Props with invalid/missing player_id: ${invalidPlayers.count}`);

    // Check sample of actual player_props data
    const sample = (await sql`
      SELECT 
        pp.id,
        pp.player_id,
        p.full_name,
        p.name,
        pt.name as prop_type,
        pp.line,
        g.game_date,
        l.abbreviation as league
      FROM public.player_props pp
      LEFT JOIN public.players p ON p.id = pp.player_id
      JOIN public.prop_types pt ON pt.id = pp.prop_type_id
      JOIN public.games g ON g.id = pp.game_id
      JOIN public.leagues l ON l.id = g.league_id
      WHERE pp.is_active = true
        AND g.game_date >= CURRENT_DATE - INTERVAL '7 days'
        AND g.game_date <= CURRENT_DATE + INTERVAL '14 days'
      LIMIT 10
    `) as any[];

    console.log("\nSample active props:");
    for (const row of sample) {
      console.log(
        `- ${row.full_name || row.name || "NULL_PLAYER"} (${row.player_id?.slice(0, 8)}...) - ${row.prop_type} ${row.line} (${row.league}, ${row.game_date})`,
      );
    }

    // Check how many props have logs available
    console.log("\n=== CHECKING LOG AVAILABILITY ===\n");

    const propsWithLogs = (await sql`
      SELECT 
        COUNT(DISTINCT pp.id)::int as props_with_logs
      FROM public.player_props pp
      JOIN public.prop_types pt ON pt.id = pp.prop_type_id
      JOIN public.games g ON g.id = pp.game_id
      WHERE pp.is_active = true
        AND g.game_date >= CURRENT_DATE - INTERVAL '7 days'
        AND g.game_date <= CURRENT_DATE + INTERVAL '14 days'
        AND EXISTS (
          SELECT 1 FROM public.player_game_logs pgl
          WHERE pgl.player_id = pp.player_id
            AND pgl.prop_type = pt.name
            AND EXTRACT(YEAR FROM pgl.game_date) = EXTRACT(YEAR FROM g.game_date)
        )
    `) as any[];

    console.log(`Active props with matching logs: ${propsWithLogs[0].props_with_logs}`);

    // Check prop type name mismatches
    console.log("\n=== PROP TYPE ALIGNMENT CHECK ===\n");

    const propTypes = (await sql`
      SELECT DISTINCT pt.name
      FROM public.player_props pp
      JOIN public.prop_types pt ON pt.id = pp.prop_type_id
      JOIN public.games g ON g.id = pp.game_id
      WHERE pp.is_active = true
        AND g.game_date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY pt.name
      LIMIT 20
    `) as any[];

    console.log("Prop types in player_props:");
    propTypes.forEach((pt) => console.log(`  - ${pt.name}`));

    const logPropTypes = (await sql`
      SELECT DISTINCT prop_type
      FROM public.player_game_logs
      WHERE game_date >= CURRENT_DATE - INTERVAL '60 days'
      ORDER BY prop_type
      LIMIT 20
    `) as any[];

    console.log("\nProp types in player_game_logs:");
    logPropTypes.forEach((pt) => console.log(`  - ${pt.prop_type}`));
  } finally {
    await sql.end({ timeout: 1 });
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
