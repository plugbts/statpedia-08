#!/usr/bin/env tsx

/**
 * Debug script to test JWT claims and verify they include display_name and username
 * Run this with: npx tsx scripts/debug-jwt-claims.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { authService } from '../src/lib/auth/auth-service';
import jwt from 'jsonwebtoken';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function debugJWTClaims() {
  console.log('🔍 Debugging JWT claims...\n');

  try {
    // Test 1: Sign up a test user
    console.log('🧪 Creating test user for JWT testing...');
    const testEmail = `jwt-test-${Date.now()}@example.com`;
    const testPassword = 'password123';
    const testDisplayName = 'JWT Test User';

    const tokens = await authService.signup({
      email: testEmail,
      password: testPassword,
      display_name: testDisplayName
    }, {
      ip_address: '127.0.0.1',
      user_agent: 'jwt-debug-script'
    });

    console.log('✅ Test user created successfully');
    console.log(`🔑 Token: ${tokens.token.substring(0, 50)}...`);
    console.log('');

    // Test 2: Decode JWT without verification (to see the payload)
    console.log('🔍 Decoding JWT payload...');
    const decoded = jwt.decode(tokens.token);
    
    if (decoded && typeof decoded === 'object') {
      console.log('📋 JWT Payload:');
      console.log(JSON.stringify(decoded, null, 2));
      console.log('');

      // Test 3: Check Hasura claims
      const hasuraClaims = decoded['https://hasura.io/jwt/claims'];
      if (hasuraClaims) {
        console.log('🎯 Hasura Claims:');
        console.log(`   x-hasura-user-id: ${hasuraClaims['x-hasura-user-id']}`);
        console.log(`   x-hasura-default-role: ${hasuraClaims['x-hasura-default-role']}`);
        console.log(`   x-hasura-allowed-roles: ${JSON.stringify(hasuraClaims['x-hasura-allowed-roles'])}`);
        console.log(`   x-hasura-display-name: ${hasuraClaims['x-hasura-display-name'] || 'NOT FOUND'}`);
        console.log(`   x-hasura-username: ${hasuraClaims['x-hasura-username'] || 'NOT FOUND'}`);
        console.log('');

        // Test 4: Verify claims are correct
        if (hasuraClaims['x-hasura-display-name'] && hasuraClaims['x-hasura-username']) {
          console.log('✅ JWT claims include both display_name and username!');
          console.log(`   Display Name: ${hasuraClaims['x-hasura-display-name']}`);
          console.log(`   Username: ${hasuraClaims['x-hasura-username']}`);
        } else {
          console.log('❌ JWT claims missing display_name or username');
          if (!hasuraClaims['x-hasura-display-name']) {
            console.log('   Missing: x-hasura-display-name');
          }
          if (!hasuraClaims['x-hasura-username']) {
            console.log('   Missing: x-hasura-username');
          }
        }
      } else {
        console.log('❌ No Hasura claims found in JWT');
      }
    } else {
      console.log('❌ Failed to decode JWT');
    }

    // Test 5: Verify token with auth service
    console.log('\n🔍 Verifying token with auth service...');
    const { userId, valid } = authService.verifyToken(tokens.token);
    if (valid) {
      console.log('✅ Token verification successful');
      console.log(`   User ID: ${userId}`);
      
      // Get user data to compare with JWT claims
      const user = await authService.getUserById(userId);
      if (user) {
        console.log('\n📋 User data from database:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Display Name: ${user.display_name}`);
        console.log(`   Username: ${user.username}`);
        
        // Compare with JWT claims
        if (decoded && typeof decoded === 'object') {
          const hasuraClaims = decoded['https://hasura.io/jwt/claims'];
          if (hasuraClaims) {
            console.log('\n🔄 Comparing JWT claims with database:');
            console.log(`   Display Name Match: ${hasuraClaims['x-hasura-display-name'] === user.display_name ? '✅' : '❌'}`);
            console.log(`   Username Match: ${hasuraClaims['x-hasura-username'] === user.username ? '✅' : '❌'}`);
          }
        }
      }
    } else {
      console.log('❌ Token verification failed');
    }

    console.log('\n🎉 JWT debug complete!');

  } catch (error) {
    console.error('❌ JWT debug failed:', error);
    process.exit(1);
  }
}

// Run debug if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debugJWTClaims().catch(console.error);
}
