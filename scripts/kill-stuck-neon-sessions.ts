// Automated Neon DB stuck session killer
// Usage: npx tsx scripts/kill-stuck-neon-sessions.ts
import { Client } from "pg";

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL or NEON_DATABASE_URL not set");
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  const { rows } = await client.query(`
    SELECT pid, state, query_start, query
    FROM pg_stat_activity
    WHERE state != 'idle' AND pid <> pg_backend_pid();
  `);
  if (rows.length === 0) {
    console.log("No stuck sessions found.");
    await client.end();
    return;
  }
  for (const row of rows) {
    console.log(`Terminating PID ${row.pid}: ${row.state} - ${row.query}`);
    await client.query(`SELECT pg_terminate_backend($1)`, [row.pid]);
  }
  await client.end();
  console.log("All stuck sessions terminated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
