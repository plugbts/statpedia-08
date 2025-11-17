#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

function parseEnvFile(p) {
  const raw = fs.readFileSync(p, 'utf8');
  const lines = raw.split(/\r?\n/);
  const env = {};
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    if (line.startsWith('```')) continue; // strip fenced blocks
    if (line.startsWith('#')) continue; // comments
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m) {
      let k = m[1];
      let v = m[2];
      // remove surrounding quotes if present
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[k] = v;
    }
  }
  return env;
}

(async function main(){
  // Use the project root relative to this script file. When the script lives in
  // `scripts/` the repo root is one level up.
  const repoRoot = path.resolve(__dirname, '..');
  const envPath = path.resolve(repoRoot, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local not found at', envPath);
    process.exit(1);
  }
  const env = parseEnvFile(envPath);
  const conn = env.NEON_DATABASE_URL || env.DATABASE_URL;
  if (!conn) {
    console.error('No NEON_DATABASE_URL or DATABASE_URL found in .env.local');
    process.exit(1);
  }

  const sql = postgres(conn, { prepare: false });

  const q = `
WITH next_game AS (
  -- Prefer games scheduled for today or tomorrow. If none exist, this will
  -- return whatever games fall in that 2-day window.
  SELECT g.id, g.home_team_id, g.away_team_id, g.game_date_time, g.game_date, g.game_time
  FROM public.games g
  JOIN public.leagues l ON l.id = g.league_id
  WHERE l.abbreviation = 'NBA'
  -- look back up to 7 days and forward 1 day so we find a recent game if
  -- there are no games scheduled exactly today/tomorrow
  AND g.game_date BETWEEN now()::date - INTERVAL '7 days' AND now()::date + INTERVAL '1 day'
  ORDER BY g.game_date ASC, g.game_date_time ASC NULLS LAST
  LIMIT 1
)
SELECT
  (SELECT row_to_json(ng) FROM next_game ng) AS game,
  (SELECT json_agg(t) FROM (
     SELECT pgl.player_id, p.full_name, p.external_id, p.team_id, pgl.prop_type
     FROM public.player_game_logs pgl
     JOIN public.players p ON p.id = pgl.player_id
     JOIN next_game ng ON ng.id = pgl.game_id
     LIMIT 10
  ) t) AS players
;`;

  try {
    const res = await sql.unsafe(q);
    if (!res || res.length === 0 || !res[0] || !res[0].game) {
      // Fallback: pick recent players who have analytics rows for the NBA
      const fallback = await sql.unsafe(`
        SELECT json_agg(t) AS players FROM (
          SELECT p.id AS player_id, p.full_name, p.external_id, p.team_id
          FROM public.player_analytics pa
          JOIN public.players p ON p.id = pa.player_id
          WHERE pa.sport = 'NBA'
          ORDER BY pa.season DESC NULLS LAST, pa.last_updated DESC NULLS LAST
          LIMIT 10
        ) t
      `);
      const players = (fallback && fallback[0] && fallback[0].players) || [];
      console.log(JSON.stringify({ game: null, players }, null, 2));
    } else {
      console.log(JSON.stringify(res[0], null, 2));
    }
  } catch (err) {
    console.error('Query error:');
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    try { await sql.end(); } catch (e) {}
  }
})();
