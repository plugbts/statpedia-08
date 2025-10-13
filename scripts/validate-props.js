#!/usr/bin/env node

const { Client } = require('pg');

async function main() {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const total = await client.query('SELECT COUNT(*) AS total FROM props');
    console.log('TOTAL_PROPS', total.rows[0].total);

    const byLeague = await client.query(
      'SELECT l.code, COUNT(*) AS count FROM props p JOIN teams t ON p.team_id = t.id JOIN leagues l ON t.league_id = l.id GROUP BY l.code ORDER BY count DESC'
    );
    console.log('BY_LEAGUE', JSON.stringify(byLeague.rows));

    const sample = await client.query(
      'SELECT p.prop_type, p.line, p.odds, pl.name, t.abbreviation FROM props p JOIN players pl ON p.player_id = pl.id JOIN teams t ON p.team_id = t.id ORDER BY p.created_at DESC LIMIT 20'
    );
    console.log('SAMPLE', JSON.stringify(sample.rows));
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


