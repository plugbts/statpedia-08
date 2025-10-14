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
    // Read and execute the SQL file
    const fs = await import('fs');
    const path = await import('path');
    
    const sqlFilePath = path.resolve(process.cwd(), 'scripts/create-user-roles-table.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📝 Creating user_roles table...');
    await db.execute(sql.raw(sqlContent));
    
    console.log('✅ User roles table created successfully!');
    
    // Now assign the owner role to the plug user
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
    
    // Assign owner role
    console.log('👑 Assigning OWNER role to plug user...');
    
    await db.execute(sql`
      INSERT INTO user_roles (user_id, role, is_active)
      VALUES (${user.id}, 'owner', true)
      ON CONFLICT (user_id) WHERE is_active = true
      DO UPDATE SET 
        role = 'owner',
        updated_at = NOW()
    `);
    
    console.log('✅ Plug user now has OWNER role!');
    
    // Verify the role assignment
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
