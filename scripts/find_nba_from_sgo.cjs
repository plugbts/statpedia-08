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
    if (line.startsWith('```')) continue;
    if (line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m) {
      let k = m[1];
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[k] = v;
    }
  }
  return env;
}

(async function main(){
  const repoRoot = path.resolve(__dirname, '..');
  const envPath = path.resolve(repoRoot, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local not found at', envPath);
    process.exit(1);
  }
  const env = parseEnvFile(envPath);
  const apiKey = env.SPORTSGAMEODDS_API_KEY || env.SGO_API_KEY || env.SPORTS_API_KEY;
  if (!apiKey) {
    console.error('No SPORTSGAMEODDS_API_KEY in .env.local');
    process.exit(1);
  }

  // Query SGO events for NBA today/tomorrow
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');
  const dateFrom = `${yyyy}-${mm}-${dd}`;
  const tomorrow = new Date(today.getTime()+24*3600*1000);
  const tyyyy = tomorrow.getFullYear();
  const tmm = String(tomorrow.getMonth()+1).padStart(2,'0');
  const tdd = String(tomorrow.getDate()).padStart(2,'0');
  const dateTo = `${tyyyy}-${tmm}-${tdd}`;

  const url = `https://api.sportsgameodds.com/v2/events?apiKey=${encodeURIComponent(apiKey)}&leagueID=NBA&dateFrom=${dateFrom}&dateTo=${dateTo}&oddsAvailable=true`;

  try {
    const resp = await fetch(url, { method: 'GET' });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`SGO error ${resp.status}: ${txt}`);
    }
    const body = await resp.json();
    const events = body?.events || body?.data || [];
    if (!events || events.length === 0) {
      console.log(JSON.stringify({ event: null, players: [] }, null, 2));
      process.exit(0);
    }
    const event = events[0];
    // event should include teams info; try to extract home/away abbreviations
    const home = event.home_team || event.home || event.homeTeam || {};
    const away = event.away_team || event.away || event.awayTeam || {};
    const sgoHomeAbbrev = home.abbreviation || home.abbr || home.shortName || home.name || null;
    const sgoAwayAbbrev = away.abbreviation || away.abbr || away.shortName || away.name || null;

    // connect to DB and try to locate teams by abbreviation or by name
    const conn = env.NEON_DATABASE_URL || env.DATABASE_URL;
    if (!conn) {
      console.log(JSON.stringify({ event, players: [] }, null, 2));
      process.exit(0);
    }
    const sql = postgres(conn, { prepare: false });

    // try match by abbreviation first
    const teams = [];
    if (sgoHomeAbbrev) {
      const t = await sql`SELECT id, name, abbreviation FROM public.teams WHERE LOWER(abbreviation)=LOWER(${sgoHomeAbbrev}) LIMIT 1`;
      if (t && t[0]) teams.push(t[0]);
    }
    if (sgoAwayAbbrev) {
      const t = await sql`SELECT id, name, abbreviation FROM public.teams WHERE LOWER(abbreviation)=LOWER(${sgoAwayAbbrev}) LIMIT 1`;
      if (t && t[0]) teams.push(t[0]);
    }

    // if no teams matched, try by name
    if (teams.length === 0) {
      if (home.name) {
        const t = await sql`SELECT id, name, abbreviation FROM public.teams WHERE LOWER(name)=LOWER(${home.name}) LIMIT 1`;
        if (t && t[0]) teams.push(t[0]);
      }
      if (away.name) {
        const t = await sql`SELECT id, name, abbreviation FROM public.teams WHERE LOWER(name)=LOWER(${away.name}) LIMIT 1`;
        if (t && t[0]) teams.push(t[0]);
      }
    }

    // If we found teams, get players for the first found team(s)
    let players = [];
    if (teams.length > 0) {
      const teamIds = teams.map(t=>t.id);
      const rows = await sql`SELECT id AS player_id, full_name, external_id, team_id FROM public.players WHERE team_id IN (${sql.join(teamIds, sql`,`)}) LIMIT 10`;
      players = rows || [];
    }

    console.log(JSON.stringify({ event, sgoHomeAbbrev, sgoAwayAbbrev, teams, players }, null, 2));
    await sql.end();
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
