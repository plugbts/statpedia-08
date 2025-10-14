#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from 'drizzle-orm';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.NEON_DATABASE_URL;
if (!connectionString) {
  console.error('❌ NEON_DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function setupUserRoles() {
  console.log('🚀 Setting up proper user roles system...');

  try {
    // Step 1: Create the user_roles table
    console.log('📝 Step 1: Creating user_roles table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'moderator', 'admin', 'owner')),
        granted_by UUID REFERENCES auth_user(id),
        granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Step 2: Create indexes
    console.log('📝 Step 2: Creating indexes...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles(role)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS user_roles_active_idx ON user_roles(is_active)`);
    
    // Step 3: Create unique constraint (separate from index creation)
    console.log('📝 Step 3: Creating unique constraint...');
    try {
      await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_active_unique ON user_roles(user_id) WHERE is_active = true`);
    } catch (error) {
      console.log('ℹ️  Unique index might already exist, continuing...');
    }
    
    console.log('✅ User roles table created successfully!');
    
    // Step 4: Find plug user
    console.log('🔍 Finding plug user...');
    
    const plugUser = await db.execute(sql`
      SELECT id, email, display_name, username 
      FROM auth_user 
      WHERE email LIKE '%plug%' OR username LIKE '%plug%' OR display_name LIKE '%plug%'
      LIMIT 1
    `);
    
    if (plugUser.length === 0) {
      console.log('❌ No plug user found');
      await client.end();
      return;
    }
    
    const user = plugUser[0];
    console.log(`📋 Found plug user: ${user.email}`);
    
    // Step 5: Assign owner role
    console.log('👑 Assigning OWNER role to plug user...');
    
    // First, deactivate any existing roles for this user
    await db.execute(sql`
      UPDATE user_roles 
      SET is_active = false, updated_at = NOW()
      WHERE user_id = ${user.id}
    `);
    
    // Then insert the new owner role
    await db.execute(sql`
      INSERT INTO user_roles (user_id, role, is_active)
      VALUES (${user.id}, 'owner', true)
    `);
    
    console.log('✅ Plug user now has OWNER role!');
    
    // Step 6: Verify the role assignment
    const roleCheck = await db.execute(sql`
      SELECT ur.role, au.email, au.display_name
      FROM user_roles ur
      JOIN auth_user au ON ur.user_id = au.id
      WHERE au.email = ${user.email} AND ur.is_active = true
    `);
    
    if (roleCheck.length > 0) {
      console.log('🎉 Role verification successful:');
      console.log(`   User: ${roleCheck[0].email}`);
      console.log(`   Display Name: ${roleCheck[0].display_name}`);
      console.log(`   Role: ${roleCheck[0].role}`);
    }
    
    console.log('\n🎯 User roles system setup complete!');
    console.log('📋 Available roles: user, moderator, admin, owner');
    console.log('🔧 Plug user now has OWNER privileges');
    
  } catch (error) {
    console.error('❌ Error setting up user roles:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupUserRoles();
