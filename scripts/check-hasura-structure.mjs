#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

async function main() {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }
  
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  try {
    console.log('🔎 STEP 4: Verify Database Structure for Hasura\n');
    
    // Check table schemas
    const tables = ['leagues', 'teams', 'players', 'props', 'games'];
    
    for (const table of tables) {
      console.log(`\n📋 ${table.toUpperCase()} table structure:`);
      try {
        const result = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [table]);
        
        if (result.rows.length === 0) {
          console.log(`   ⚠️  Table '${table}' does not exist`);
        } else {
          result.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
          });
        }
      } catch (e) {
        console.log(`   ❌ Error querying ${table}: ${e.message}`);
      }
    }
    
    // Check foreign key relationships
    console.log('\n\n🔗 Foreign Key Relationships:');
    const fks = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name IN ('teams', 'players', 'props', 'games')
      ORDER BY tc.table_name, kcu.column_name
    `);
    
    fks.rows.forEach(fk => {
      console.log(`   ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    
    // Check indexes
    console.log('\n\n📊 Indexes on key columns:');
    const indexes = await client.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('teams', 'players', 'props', 'games')
      ORDER BY tablename, indexname
    `);
    
    indexes.rows.forEach(idx => {
      console.log(`   ${idx.tablename}: ${idx.indexname}`);
    });
    
    console.log('\n✅ Step 4 structure check complete.\n');
    
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('❌ Check failed:', e);
  process.exit(1);
});

