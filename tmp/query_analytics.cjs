require('dotenv').config();
const postgres = require('postgres');
(async () => {
  const c = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!c) { console.error('No DB URL'); process.exit(1); }
  const sql = postgres(c, { prepare: false });
  try {
    const rows = await sql`SELECT player_id, prop_type, season, l5, l10, l20, h2h_avg, opponent_team_id FROM public.player_analytics ORDER BY season DESC NULLS LAST LIMIT 10`;
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('Query failed', e);
    process.exit(1);
  } finally { await sql.end(); }
})();
