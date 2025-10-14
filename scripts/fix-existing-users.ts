#!/usr/bin/env tsx

/**
 * Fix existing users by adding usernames to users with null username
 * Run this with: npx tsx scripts/fix-existing-users.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { auth_user } from '../src/db/schema/auth';
import { eq, isNull } from 'drizzle-orm';
import { generateUsername } from '../src/utils/username-generator';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function fixExistingUsers() {
  console.log('🔧 Fixing existing users with null usernames...\n');

  const connectionString = process.env.NEON_DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ NEON_DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  try {
    const client = postgres(connectionString);
    const db = drizzle(client);

    // Find users with null usernames
    console.log('🔍 Finding users with null usernames...');
    const usersWithoutUsernames = await db.select().from(auth_user).where(isNull(auth_user.username));
    
    console.log(`📊 Found ${usersWithoutUsernames.length} users without usernames`);
    
    if (usersWithoutUsernames.length === 0) {
      console.log('✅ All users already have usernames!');
      await client.end();
      return;
    }

    // Show existing users
    console.log('\n📋 Users to fix:');
    usersWithoutUsernames.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.display_name || 'No display name'})`);
    });
    console.log('');

    // Generate and assign usernames
    console.log('🔧 Generating usernames...');
    let successCount = 0;
    let errorCount = 0;

    for (const user of usersWithoutUsernames) {
      try {
        let username;
        let attempts = 0;
        
        // Generate unique username
        do {
          username = generateUsername();
          const existingUsername = await db.select().from(auth_user).where(eq(auth_user.username, username)).limit(1);
          if (existingUsername.length === 0) break;
          attempts++;
        } while (attempts < 10);
        
        if (attempts >= 10) {
          console.log(`❌ Could not generate unique username for ${user.email}`);
          errorCount++;
          continue;
        }

        // Update user with username
        await db.update(auth_user)
          .set({ username })
          .where(eq(auth_user.id, user.id));

        console.log(`✅ ${user.email} → @${username}`);
        successCount++;

      } catch (error) {
        console.log(`❌ Error updating ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully updated: ${successCount} users`);
    console.log(`   ❌ Failed to update: ${errorCount} users`);

    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const remainingUsersWithoutUsernames = await db.select().from(auth_user).where(isNull(auth_user.username));
    console.log(`📊 Users still without usernames: ${remainingUsersWithoutUsernames.length}`);

    if (remainingUsersWithoutUsernames.length === 0) {
      console.log('🎉 All users now have usernames!');
    }

    await client.end();

  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

// Run fix if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixExistingUsers().catch(console.error);
}
