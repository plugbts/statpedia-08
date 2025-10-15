#!/usr/bin/env node
import { execSync } from 'node:child_process'
import process from 'node:process'

// Minimal CI stub for golden dataset check. Replace with real DB call if available.
// Expects env to provide connection info; otherwise, it becomes a no-op with a warning.

function fail(msg) {
  console.error(`\n[SQL CHECK FAILED] ${msg}\n`)
  process.exit(1)
}

function info(msg) {
  console.log(`[sql:check] ${msg}`)
}

const { DATABASE_URL, PGDATABASE, PGUSER, PGPASSWORD, PGHOST, PGPORT } = process.env
const hasPsql = (() => {
  try { execSync('psql --version', { stdio: 'ignore' }); return true } catch { return false }
})()

if (!hasPsql) {
  info('psql not found in PATH; skipping SQL validation (ok for local dev).')
  process.exit(0)
}

// If no connection info is present, skip gracefully
const hasConnInfo = Boolean(
  DATABASE_URL || PGDATABASE || PGUSER || PGPASSWORD || PGHOST || PGPORT,
)
if (!hasConnInfo) {
  info('no DATABASE_URL or PG* env vars found; skipping SQL validation (configure repo secrets to enable).')
  process.exit(0)
}

const connPieces = []
if (PGDATABASE) connPieces.push(`PGDATABASE=${PGDATABASE}`)
if (PGUSER) connPieces.push(`PGUSER=${PGUSER}`)
if (PGPASSWORD) connPieces.push(`PGPASSWORD=${PGPASSWORD}`)
if (PGHOST) connPieces.push(`PGHOST=${PGHOST}`)
if (PGPORT) connPieces.push(`PGPORT=${PGPORT}`)

try {
  info('running debug_pipeline() sanity check...')
  const query = "select debug_pipeline();"
  let output
  if (DATABASE_URL) {
    output = execSync(`psql "${DATABASE_URL}" -t -A -c "${query}"`, { encoding: 'utf8', env: process.env })
  } else {
    output = execSync(`${connPieces.join(' ')} psql -t -A -c "${query}"`, { encoding: 'utf8', env: process.env })
  }
  const line = (output || '').trim()
  info(`raw: ${line}`)
  // psql -t -A returns the JSON on a single line
  const data = JSON.parse(line)
  const entries = Object.entries(data)
  const failing = entries.filter(([, v]) => Number(v) > 0)
  if (failing.length > 0) {
    console.error('Failing metrics:')
    for (const [k, v] of failing) console.error(` - ${k}: ${v}`)
    fail('debug_pipeline reported failures')
  } else {
    info('debug_pipeline() check passed (all zeros).')
  }
} catch (e) {
  console.error(e?.message || e)
  fail('Error running SQL debug check')
}
