#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

async function main() {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('❌ Missing DATABASE_URL');
    process.exit(1);
  }
  
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  try {
    console.log('🔍 Checking for Duplicate Props\n');
    console.log('='.repeat(60));
    
    // Check duplicates by logical key (player, prop_type, line, game)
    console.log('\n1️⃣ Duplicates by (player, prop_type, line, game_id):');
    const logicalDupes = await client.query(`
      SELECT 
        pl.name as player_name,
        t.abbreviation as team,
        p.prop_type,
        p.line,
        p.game_id,
        COUNT(*) as duplicate_count,
        STRING_AGG(DISTINCT p.odds, ', ') as different_odds
      FROM props p
      JOIN players pl ON p.player_id = pl.id
      JOIN teams t ON p.team_id = t.id
      GROUP BY pl.name, t.abbreviation, p.prop_type, p.line, p.game_id
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
      LIMIT 20
    `);
    
    if (logicalDupes.rows.length === 0) {
      console.log('   ✅ No logical duplicates found!');
    } else {
      console.log(`   ⚠️  Found ${logicalDupes.rows.length} sets of duplicates:\n`);
      logicalDupes.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.player_name} (${row.team}) - ${row.prop_type} ${row.line}`);
        console.log(`      Duplicates: ${row.duplicate_count} | Odds: ${row.different_odds}`);
      });
    }
    
    // Check duplicates by conflict_key
    console.log('\n\n2️⃣ Duplicates by conflict_key:');
    const keyDupes = await client.query(`
      SELECT 
        conflict_key,
        COUNT(*) as duplicate_count
      FROM props
      WHERE conflict_key IS NOT NULL
      GROUP BY conflict_key
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
      LIMIT 10
    `);
    
    if (keyDupes.rows.length === 0) {
      console.log('   ✅ No conflict_key duplicates found!');
    } else {
      console.log(`   ⚠️  Found ${keyDupes.rows.length} conflict_key duplicates:\n`);
      keyDupes.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.conflict_key}: ${row.duplicate_count} duplicates`);
      });
    }
    
    // Total stats
    console.log('\n\n3️⃣ Overall Stats:');
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_props,
        COUNT(DISTINCT CONCAT(player_id, ':', prop_type, ':', line, ':', game_id)) as unique_logical_props,
        COUNT(DISTINCT conflict_key) FILTER (WHERE conflict_key IS NOT NULL) as unique_conflict_keys,
        COUNT(conflict_key) as props_with_conflict_key
      FROM props
    `);
    
    const s = stats.rows[0];
    console.log(`   Total props: ${s.total_props}`);
    console.log(`   Unique logical props: ${s.unique_logical_props}`);
    console.log(`   Props with conflict_key: ${s.props_with_conflict_key}`);
    console.log(`   Unique conflict_keys: ${s.unique_conflict_keys}`);
    
    const potentialDupes = parseInt(s.total_props) - parseInt(s.unique_logical_props);
    if (potentialDupes > 0) {
      console.log(`\n   ⚠️  Potential duplicates: ${potentialDupes}`);
    } else {
      console.log(`\n   ✅ No duplicates detected!`);
    }
    
    // Sample props with same player/type/line but different odds
    console.log('\n\n4️⃣ Sample Props with Multiple Odds (Same Market):');
    const multiOdds = await client.query(`
      SELECT 
        pl.name as player_name,
        p.prop_type,
        p.line,
        p.odds,
        p.side,
        p.created_at
      FROM props p
      JOIN players pl ON p.player_id = pl.id
      WHERE (p.player_id, p.prop_type, p.line, p.game_id) IN (
        SELECT player_id, prop_type, line, game_id
        FROM props
        GROUP BY player_id, prop_type, line, game_id
        HAVING COUNT(*) > 1
      )
      ORDER BY pl.name, p.prop_type, p.line, p.created_at
      LIMIT 20
    `);
    
    if (multiOdds.rows.length === 0) {
      console.log('   ✅ No multi-odds props found');
    } else {
      console.log(`   Found ${multiOdds.rows.length} props with multiple odds:\n`);
      let currentKey = '';
      multiOdds.rows.forEach(row => {
        const key = `${row.player_name} - ${row.prop_type} ${row.line}`;
        if (key !== currentKey) {
          console.log(`\n   ${key}:`);
          currentKey = key;
        }
        console.log(`     ${row.side}: ${row.odds} (${row.created_at.toISOString().split('T')[0]})`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Duplicate check complete\n');
    
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('❌ Check failed:', e);
  process.exit(1);
});

