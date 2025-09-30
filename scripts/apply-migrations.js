// Apply migrations to Supabase database
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://rfdrifnsfobqlzorcesn.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration(migrationFile) {
  try {
    console.log(`📄 Applying migration: ${migrationFile}`);
    
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.error(`❌ Error executing statement: ${error.message}`);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
        }
      }
    }
    
    console.log(`✅ Migration ${migrationFile} applied successfully`);
  } catch (err) {
    console.error(`❌ Failed to apply migration ${migrationFile}:`, err.message);
  }
}

async function main() {
  console.log('🚀 Applying Supabase Migrations\n');
  
  // List of migrations to apply in order
  const migrations = [
    '20250101000014_fix_schema_cache.sql'
  ];
  
  for (const migration of migrations) {
    await applyMigration(migration);
  }
  
  console.log('\n✅ All migrations completed');
  console.log('\n📋 Next steps:');
  console.log('1. Check your Supabase project dashboard');
  console.log('2. Verify tables are created in the Table Editor');
  console.log('3. Test your application');
}

main().catch(console.error);
