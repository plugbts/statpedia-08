#!/usr/bin/env tsx

/**
 * Migration script to add username field to auth_user table
 * Run this with: npx tsx scripts/run-username-migration.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

async function runMigration() {
  const connectionString = process.env.NEON_DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ NEON_DATABASE_URL environment variable is not set');
    console.error('Please set it in your .env.local file');
    process.exit(1);
  }

  console.log('🚀 Starting username field migration...');

  try {
    const client = postgres(connectionString);
    const db = drizzle(client);

    // Add username field
    console.log('📝 Adding username field to auth_user table...');
    await db.execute(sql`
      ALTER TABLE auth_user 
      ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
    `);

    // Create index
    console.log('📝 Creating index on username field...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_auth_user_username ON auth_user(username);
    `);

    // Add comments
    console.log('📝 Adding column comments...');
    await db.execute(sql`
      COMMENT ON COLUMN auth_user.username IS 'Unique @handle for user (e.g., @user_x7f3a). Generated randomly at signup until user customizes.';
    `);

    await db.execute(sql`
      COMMENT ON COLUMN auth_user.display_name IS 'User-friendly display name shown in UI (e.g., "John Doe"). Free-form text from signup form.';
    `);

    await db.execute(sql`
      COMMENT ON COLUMN auth_user.email IS 'Private email address used only for login and notifications. Never shown publicly.';
    `);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('  - Added username field to auth_user table');
    console.log('  - Created unique index on username');
    console.log('  - Added column documentation');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('  1. Test signup flow to ensure usernames are generated');
    console.log('  2. Verify JWT claims include display_name and username');
    console.log('  3. Check frontend displays use new user identity system');

    await client.end();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration().catch(console.error);
}
