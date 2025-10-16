#!/usr/bin/env node
// Simple validation script invoked by the scheduler after each ingestion run.
// It connects to the database and prints basic counts for quick sanity checks.

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Validation skipped: DATABASE_URL (or NEON_DATABASE_URL) is not set');
  process.exit(0);
}

const sql = postgres(DATABASE_URL, {
  max: 1,
  prepare: true,
  idle_timeout: 5,
});

async function tableExists(name) {
  const res = await sql`
    SELECT to_regclass(${`public.${name}`}) AS oid
  `;
  return !!res?.[0]?.oid;
}

async function main() {
  try {
    const hasProps = await tableExists('props');
    const hasPickem = await tableExists('pickem_props');

    let propsCount = 0;
    let pickemCount = 0;

    if (hasProps) {
      const r = await sql`SELECT COUNT(*)::int AS count FROM props;`;
      propsCount = r?.[0]?.count || 0;
    }
    if (hasPickem) {
      const r = await sql`SELECT COUNT(*)::int AS count FROM pickem_props;`;
      pickemCount = r?.[0]?.count || 0;
    }

    console.log('📊 Ingestion validation summary');
    console.log(`   props: ${propsCount}${hasProps ? '' : ' (table missing)'}`);
    console.log(`   pickem_props: ${pickemCount}${hasPickem ? '' : ' (table missing)'}`);

    // Optional: show top markets and recent activity
    if (hasProps) {
      const topMarkets = await sql`
        SELECT prop_type, COUNT(*)::int AS count
        FROM props
        GROUP BY prop_type
        ORDER BY count DESC
        LIMIT 8
      `;
      if (topMarkets.length > 0) {
        console.log('   top markets:', topMarkets.map(r => `${r.prop_type}:${r.count}`).join(', '));
      }
      const recent = await sql`
        SELECT to_char(max(updated_at), 'YYYY-MM-DD HH24:MI:SS') AS last_update
        FROM props
      `;
      console.log(`   last update: ${recent?.[0]?.last_update || 'n/a'}`);
    }

    console.log('✅ Validation completed');
  } catch (err) {
    console.error('❌ Validation error:', err?.message || err);
  } finally {
    await sql.end({ timeout: 3 });
  }
}

await main();
