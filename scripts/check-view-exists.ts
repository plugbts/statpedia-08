import "dotenv/config";
import postgres from "postgres";

async function run() {
  const sql = postgres(process.env.NEON_DATABASE_URL!, { prepare: false });

  try {
    // Check if view exists
    const viewExists = await sql`
      SELECT EXISTS (
        SELECT FROM pg_views 
        WHERE schemaname = 'public' AND viewname = 'v_props_list'
      ) as exists
    `;
    console.log(`\nView v_props_list exists: ${viewExists[0].exists}`);

    if (viewExists[0].exists) {
      // Check how many rows
      const count = await sql`SELECT COUNT(*) as count FROM public.v_props_list`;
      console.log(`Rows in v_props_list: ${count[0].count}`);

      // Sample a few rows
      const sample = await sql`SELECT * FROM public.v_props_list LIMIT 3`;
      console.log(`\nSample rows:`);
      sample.forEach((r) => {
        console.log(`  ${r.full_name} - ${r.market} ${r.line} (${r.league})`);
      });
    }
  } finally {
    await sql.end();
  }
}

run().catch(console.error);
