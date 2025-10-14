#!/usr/bin/env tsx

/**
 * Debug script to test user signup and verify data is stored correctly
 * Run this with: npx tsx scripts/debug-user-signup.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { auth_user } from '../src/db/schema/auth';
import { eq } from 'drizzle-orm';
import { authService } from '../src/lib/auth/auth-service';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function debugUserSignup() {
  console.log('🔍 Debugging user signup flow...\n');

  const connectionString = process.env.NEON_DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ NEON_DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  try {
    const client = postgres(connectionString);
    const db = drizzle(client);

    // Test 1: Check current users in database
    console.log('📊 Current users in database:');
    const users = await db.select().from(auth_user).limit(5);
    console.log(users.map(user => ({
      id: user.id.substring(0, 8) + '...',
      email: user.email,
      display_name: user.display_name,
      username: user.username,
      created_at: user.created_at
    })));
    console.log('');

    // Test 2: Try signing up a test user
    console.log('🧪 Testing signup flow...');
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'password123';
    const testDisplayName = 'Test User';

    console.log(`📝 Signing up user: ${testEmail}`);
    console.log(`📝 Display name: ${testDisplayName}`);

    const tokens = await authService.signup({
      email: testEmail,
      password: testPassword,
      display_name: testDisplayName
    }, {
      ip_address: '127.0.0.1',
      user_agent: 'debug-script'
    });

    console.log('✅ Signup successful!');
    console.log(`🔑 Token: ${tokens.token.substring(0, 20)}...`);
    console.log('');

    // Test 3: Verify user was created with correct data
    console.log('🔍 Verifying user data in database...');
    const createdUser = await db.select().from(auth_user).where(eq(auth_user.email, testEmail)).limit(1);
    
    if (createdUser.length > 0) {
      const user = createdUser[0];
      console.log('✅ User found in database:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Display Name: ${user.display_name || 'NULL'}`);
      console.log(`   Username: ${user.username || 'NULL'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');

      // Test 4: Test getUserById
      console.log('🔍 Testing getUserById...');
      const fetchedUser = await authService.getUserById(user.id);
      if (fetchedUser) {
        console.log('✅ getUserById successful:');
        console.log(`   ID: ${fetchedUser.id}`);
        console.log(`   Email: ${fetchedUser.email}`);
        console.log(`   Display Name: ${fetchedUser.display_name || 'NULL'}`);
        console.log(`   Username: ${fetchedUser.username || 'NULL'}`);
      } else {
        console.log('❌ getUserById returned null');
      }
      console.log('');

      // Test 5: Test JWT verification
      console.log('🔍 Testing JWT verification...');
      const { userId, valid } = authService.verifyToken(tokens.token);
      if (valid && userId === user.id) {
        console.log('✅ JWT verification successful');
        console.log(`   User ID from token: ${userId}`);
      } else {
        console.log('❌ JWT verification failed');
      }
      console.log('');

      // Clean up test user
      console.log('🧹 Cleaning up test user...');
      await db.delete(auth_user).where(eq(auth_user.id, user.id));
      console.log('✅ Test user deleted');

    } else {
      console.log('❌ User not found in database after signup');
    }

    await client.end();
    console.log('\n🎉 Debug complete!');

  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

// Run debug if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debugUserSignup().catch(console.error);
}
