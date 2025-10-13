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
    console.log('🔧 Creating click tracking tables...\n');
    
    // Create prop_clicks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS prop_clicks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT,
        prop_id UUID REFERENCES props(id) ON DELETE CASCADE,
        clicked_at TIMESTAMPTZ DEFAULT now(),
        session_id TEXT,
        device_type TEXT,
        user_agent TEXT
      )
    `);
    console.log('✅ prop_clicks table created');
    
    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prop_clicks_prop_id ON prop_clicks(prop_id);
    `);
    console.log('✅ Index on prop_id created');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prop_clicks_user_id ON prop_clicks(user_id);
    `);
    console.log('✅ Index on user_id created');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prop_clicks_clicked_at ON prop_clicks(clicked_at DESC);
    `);
    console.log('✅ Index on clicked_at created');
    
    // Create view for top clicked prop types
    await client.query(`
      CREATE OR REPLACE VIEW top_clicked_prop_types AS
      SELECT 
        p.prop_type,
        l.code as league,
        COUNT(*) as clicks,
        COUNT(DISTINCT c.user_id) as unique_users,
        COUNT(*) FILTER (WHERE c.clicked_at > now() - interval '24 hours') as clicks_24h,
        COUNT(*) FILTER (WHERE c.clicked_at > now() - interval '7 days') as clicks_7d,
        MAX(c.clicked_at) as last_clicked
      FROM prop_clicks c
      JOIN props p ON c.prop_id = p.id
      JOIN teams t ON p.team_id = t.id
      JOIN leagues l ON t.league_id = l.id
      GROUP BY p.prop_type, l.code
      ORDER BY clicks DESC;
    `);
    console.log('✅ top_clicked_prop_types view created');
    
    // Create view for user prop preferences
    await client.query(`
      CREATE OR REPLACE VIEW user_prop_preferences AS
      SELECT 
        c.user_id,
        p.prop_type,
        l.code as league,
        COUNT(*) as clicks,
        MAX(c.clicked_at) as last_clicked,
        MIN(c.clicked_at) as first_clicked
      FROM prop_clicks c
      JOIN props p ON c.prop_id = p.id
      JOIN teams t ON p.team_id = t.id
      JOIN leagues l ON t.league_id = l.id
      WHERE c.user_id IS NOT NULL
      GROUP BY c.user_id, p.prop_type, l.code
      ORDER BY c.user_id, clicks DESC;
    `);
    console.log('✅ user_prop_preferences view created');
    
    // Check table structure
    const schema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'prop_clicks'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 prop_clicks table schema:');
    schema.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });
    
    console.log('\n✅ Click tracking system created successfully!\n');
    
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('❌ Setup failed:', e);
  process.exit(1);
});

