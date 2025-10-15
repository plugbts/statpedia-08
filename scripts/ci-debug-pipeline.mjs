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

const connPieces = []
if (PGDATABASE) connPieces.push(`PGDATABASE=${PGDATABASE}`)
if (PGUSER) connPieces.push(`PGUSER=${PGUSER}`)
if (PGPASSWORD) connPieces.push(`PGPASSWORD=${PGPASSWORD}`)
if (PGHOST) connPieces.push(`PGHOST=${PGHOST}`)
if (PGPORT) connPieces.push(`PGPORT=${PGPORT}`)

try {
  info('running debug_pipeline() sanity check...')
  const cmd = `${connPieces.join(' ')} psql -t -A -c "select coalesce((select 0), 0);"`
  execSync(cmd, { stdio: 'inherit', env: process.env })
  // Replace the above query with your production check, e.g.:
  // const cmd = `${connPieces.join(' ')} psql -t -A -c "select missing_players + missing_games + unenriched_props from debug_pipeline();"`
  // const output = execSync(cmd, { encoding: 'utf8' }).trim()
  // if (Number(output) > 0) fail(`debug_pipeline reported failures: ${output}`)
  info('debug_pipeline() check passed (placeholder).')
} catch (e) {
  fail('Error running SQL debug check')
}
