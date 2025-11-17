require('dotenv').config();
const postgres = require('postgres');
(async () => {
  const c = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!c) {
    console.error('No DB URL');
    process.exit(1);
  }
  const sql = postgres(c, { prepare: false });
  try {
    const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='players' ORDER BY ordinal_position`;
    console.log(JSON.stringify(cols.map(r=>r.column_name), null, 2));
    const rows = await sql`SELECT id, external_id FROM public.players WHERE id IS NOT NULL LIMIT 10`;
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('Query failed', e);
    process.exit(1);
  } finally {
    await sql.end();
  }
})();
