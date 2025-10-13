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
    console.log('🔧 Adding unique constraint on conflict_key...\n');
    
    // First, remove any existing duplicates by keeping only the most recent
    console.log('1️⃣ Checking for existing duplicates...');
    const dupeCheck = await client.query(`
      SELECT conflict_key, COUNT(*) as count
      FROM props
      WHERE conflict_key IS NOT NULL
      GROUP BY conflict_key
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `);
    
    if (dupeCheck.rows.length > 0) {
      console.log(`   Found ${dupeCheck.rows.length} conflict_key values with duplicates`);
      dupeCheck.rows.forEach(row => {
        console.log(`   - ${row.conflict_key}: ${row.count} duplicates`);
      });
      
      console.log('\n2️⃣ Removing duplicates (keeping most recent)...');
      const deleteRes = await client.query(`
        DELETE FROM props
        WHERE id IN (
          SELECT id
          FROM (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY conflict_key ORDER BY created_at DESC) as rn
            FROM props
            WHERE conflict_key IS NOT NULL
          ) subq
          WHERE rn > 1
        )
      `);
      console.log(`   ✅ Removed ${deleteRes.rowCount} duplicate props\n`);
    } else {
      console.log('   ✅ No duplicates found\n');
    }
    
    // Add unique constraint
    console.log('3️⃣ Adding unique constraint...');
    try {
      await client.query(`
        ALTER TABLE props 
        ADD CONSTRAINT props_conflict_key_unique 
        UNIQUE (conflict_key)
      `);
      console.log('   ✅ Unique constraint added\n');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('   ℹ️  Unique constraint already exists\n');
      } else {
        throw e;
      }
    }
    
    // Verify no duplicates remain
    console.log('4️⃣ Verifying no duplicates...');
    const finalCheck = await client.query(`
      SELECT conflict_key, COUNT(*) as count
      FROM props
      WHERE conflict_key IS NOT NULL
      GROUP BY conflict_key
      HAVING COUNT(*) > 1
    `);
    
    if (finalCheck.rows.length === 0) {
      console.log('   ✅ No duplicates found - constraint is working!\n');
    } else {
      console.log(`   ⚠️  Still found ${finalCheck.rows.length} duplicates - manual intervention needed\n`);
    }
    
    // Show stats
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_props,
        COUNT(DISTINCT conflict_key) as unique_props,
        COUNT(*) - COUNT(DISTINCT conflict_key) as duplicate_count
      FROM props
      WHERE conflict_key IS NOT NULL
    `);
    
    console.log('📊 Final Stats:');
    console.log(`   Total props: ${stats.rows[0].total_props}`);
    console.log(`   Unique props: ${stats.rows[0].unique_props}`);
    console.log(`   Duplicates removed: ${stats.rows[0].duplicate_count}`);
    
    console.log('\n✅ Conflict key constraint setup complete!\n');
    
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('❌ Setup failed:', e);
  process.exit(1);
});

