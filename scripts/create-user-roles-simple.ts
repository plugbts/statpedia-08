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

async function createUserRolesTable() {
  console.log('🚀 Creating user roles table...');

  try {
    // Check if table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles'
      )
    `);
    
    if (tableExists[0].exists) {
      console.log('ℹ️  user_roles table already exists');
    } else {
      console.log('📝 Creating user_roles table...');
      
      // Create table with minimal structure first
      await db.execute(sql`
        CREATE TABLE user_roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
          role VARCHAR(50) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      console.log('✅ user_roles table created');
    }
    
    // Find plug user
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
    
    // Check if user already has a role
    const existingRole = await db.execute(sql`
      SELECT role FROM user_roles WHERE user_id = ${user.id} LIMIT 1
    `);
    
    if (existingRole.length > 0) {
      console.log(`ℹ️  User already has role: ${existingRole[0].role}`);
      
      // Update to owner role
      await db.execute(sql`
        UPDATE user_roles 
        SET role = 'owner' 
        WHERE user_id = ${user.id}
      `);
      console.log('✅ Updated user role to OWNER');
    } else {
      // Insert new owner role
      await db.execute(sql`
        INSERT INTO user_roles (user_id, role)
        VALUES (${user.id}, 'owner')
      `);
      console.log('✅ Assigned OWNER role to plug user');
    }
    
    // Verify the role assignment
    const roleCheck = await db.execute(sql`
      SELECT ur.role, au.email, au.display_name
      FROM user_roles ur
      JOIN auth_user au ON ur.user_id = au.id
      WHERE au.email = ${user.email}
    `);
    
    if (roleCheck.length > 0) {
      console.log('🎉 Role verification successful:');
      console.log(`   User: ${roleCheck[0].email}`);
      console.log(`   Display Name: ${roleCheck[0].display_name}`);
      console.log(`   Role: ${roleCheck[0].role}`);
    }
    
    console.log('\n🎯 Plug user now has OWNER role!');
    
  } catch (error) {
    console.error('❌ Error setting up user roles:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createUserRolesTable();
