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
    console.log('🔧 Adding priority column to props table...\n');
    
    // Add priority column
    await client.query(`
      ALTER TABLE props 
      ADD COLUMN IF NOT EXISTS priority BOOLEAN DEFAULT false
    `);
    console.log('✅ Priority column added');
    
    // Add index for faster filtering
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_props_priority 
      ON props(priority) 
      WHERE priority = true
    `);
    console.log('✅ Priority index created');
    
    // Add side column for over/under if it doesn't exist
    await client.query(`
      ALTER TABLE props 
      ADD COLUMN IF NOT EXISTS side TEXT
    `);
    console.log('✅ Side column added');
    
    // Add conflict_key column if it doesn't exist
    await client.query(`
      ALTER TABLE props 
      ADD COLUMN IF NOT EXISTS conflict_key TEXT UNIQUE
    `);
    console.log('✅ Conflict key column added');
    
    // Check current schema
    const schema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'props'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Updated props table schema:');
    schema.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'} ${col.column_default ? `default: ${col.column_default}` : ''}`);
    });
    
    console.log('\n✅ Database schema updated successfully!\n');
    
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('❌ Migration failed:', e);
  process.exit(1);
});

