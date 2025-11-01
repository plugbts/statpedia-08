import "dotenv/config";
import postgres from "postgres";

async function run() {
  const sql = postgres(process.env.NEON_DATABASE_URL!, { prepare: false });

  const result = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'player_props' AND table_schema = 'public'
    ORDER BY ordinal_position
  `;

  console.log("\nplayer_props columns:");
  result.forEach((r) => console.log(`  ${r.column_name}: ${r.data_type}`));

  await sql.end();
}

run().catch(console.error);
