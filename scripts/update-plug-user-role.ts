#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import { resolve } from 'path';
import { auth_user } from '../src/db/schema/auth';
import { eq, or, like } from 'drizzle-orm';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.NEON_DATABASE_URL;
if (!connectionString) {
  console.error('❌ NEON_DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema: { auth_user } });

async function updatePlugUserRole() {
  console.log('🔍 Searching for plug user...');

  try {
    // Search for users with 'plug' in email, username, or display_name
    const users = await db.select().from(auth_user).where(
      or(
        like(auth_user.email, '%plug%'),
        like(auth_user.username, '%plug%'),
        like(auth_user.display_name, '%plug%')
      )
    );

    console.log(`📊 Found ${users.length} user(s) matching 'plug':`);
    
    if (users.length === 0) {
      console.log('❌ No users found with "plug" in their email, username, or display_name');
      console.log('\n🔍 Let me show you all users to help identify the correct one:');
      
      const allUsers = await db.select({
        id: auth_user.id,
        email: auth_user.email,
        display_name: auth_user.display_name,
        username: auth_user.username
      }).from(auth_user);
      
      console.log('\n📋 All users in database:');
      allUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id.substring(0, 8)}...`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Display Name: ${user.display_name || 'null'}`);
        console.log(`      Username: ${user.username || 'null'}`);
        console.log('');
      });
      
      await client.end();
      return;
    }

    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ID: ${user.id}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Display Name: ${user.display_name || 'null'}`);
      console.log(`      Username: ${user.username || 'null'}`);
      console.log('');
    });

    // For now, let's update the first user found (you can modify this logic as needed)
    const userToUpdate = users[0];
    
    console.log(`🎯 Updating user: ${userToUpdate.email}`);
    console.log('🔧 Setting role to "owner"...');
    
    // Update the user's role to 'owner'
    // Note: We need to check if there's a role field in the auth_user table
    // For now, let's add a note about the role in the display_name or create a separate role system
    
    // First, let's check the current schema
    console.log('📋 Current user data:');
    console.log(`   ID: ${userToUpdate.id}`);
    console.log(`   Email: ${userToUpdate.email}`);
    console.log(`   Display Name: ${userToUpdate.display_name || 'null'}`);
    console.log(`   Username: ${userToUpdate.username || 'null'}`);
    
    // Since we don't have a role field in auth_user, let's add a prefix to display_name
    // or create a separate user_roles table. For now, let's add a role indicator.
    
    const currentDisplayName = userToUpdate.display_name || '';
    const hasOwnerPrefix = currentDisplayName.includes('[OWNER]');
    
    if (!hasOwnerPrefix) {
      const newDisplayName = currentDisplayName ? `[OWNER] ${currentDisplayName}` : '[OWNER] Plug User';
      
      await db.update(auth_user)
        .set({ 
          display_name: newDisplayName,
          updated_at: new Date()
        })
        .where(eq(auth_user.id, userToUpdate.id));
        
      console.log('✅ Successfully updated user role to OWNER');
      console.log(`   New display name: ${newDisplayName}`);
    } else {
      console.log('ℹ️  User already has OWNER role');
    }
    
    console.log('\n🎉 Plug user role update completed!');
    
  } catch (error) {
    console.error('❌ Error updating plug user role:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

updatePlugUserRole();
