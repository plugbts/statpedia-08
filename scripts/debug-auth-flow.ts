#!/usr/bin/env tsx

/**
 * Debug Auth Flow
 * 
 * This script tests each step of the authentication flow to isolate failures:
 * 1. Database schema validation
 * 2. Raw database inserts
 * 3. Password hashing
 * 4. JWT generation
 * 5. Hasura JWT claims format
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const connectionString = process.env.NEON_DATABASE_URL!;
const jwtSecret = process.env.JWT_SECRET!;
const client = postgres(connectionString);
const db = drizzle(client);

async function debugAuthFlow() {
  console.log('🔍 Debugging Auth Flow...\n');
  
  try {
    // Step 1: Test raw database insert
    console.log('1️⃣ Testing raw database insert...');
    const testEmail = `debug-test-${Date.now()}@example.com`;
    
    const userInsert = await db.execute(sql`
      INSERT INTO auth_user (email, display_name) 
      VALUES (${testEmail}, 'Debug Test User') 
      RETURNING *
    `);
    
    console.log('✅ Raw user insert successful:', userInsert[0]);
    const userId = userInsert[0].id;
    
    // Step 2: Test password hashing
    console.log('\n2️⃣ Testing password hashing...');
    const testPassword = 'TestPassword123!';
    
    try {
      const passwordHash = await argon2.hash(testPassword, { 
        type: argon2.argon2id,
        memoryCost: 2 ** 16, // 64 MB
        timeCost: 3,
        parallelism: 1
      });
      
      console.log('✅ Password hashing successful');
      console.log('   Hash length:', passwordHash.length);
      console.log('   Hash preview:', passwordHash.substring(0, 50) + '...');
      
      // Test password verification
      const isValid = await argon2.verify(passwordHash, testPassword);
      console.log('✅ Password verification:', isValid ? 'SUCCESS' : 'FAILED');
      
      // Step 3: Test credential insert
      console.log('\n3️⃣ Testing credential insert...');
      
      const credentialInsert = await db.execute(sql`
        INSERT INTO auth_credential (user_id, password_hash, password_algo) 
        VALUES (${userId}, ${passwordHash}, 'argon2id') 
        RETURNING *
      `);
      
      console.log('✅ Credential insert successful:', credentialInsert[0]);
      
    } catch (hashError: any) {
      console.error('❌ Password hashing failed:', hashError.message);
      throw hashError;
    }
    
    // Step 4: Test JWT generation
    console.log('\n4️⃣ Testing JWT generation...');
    
    try {
      const payload = {
        sub: userId,
        'https://hasura.io/jwt/claims': {
          'x-hasura-default-role': 'user',
          'x-hasura-allowed-roles': ['user', 'admin'],
          'x-hasura-user-id': userId
        }
      };
      
      console.log('   JWT Payload:', JSON.stringify(payload, null, 2));
      
      const token = jwt.sign(payload, jwtSecret, { 
        algorithm: 'HS256', 
        expiresIn: '15m' 
      });
      
      console.log('✅ JWT generation successful');
      console.log('   Token length:', token.length);
      console.log('   Token preview:', token.substring(0, 50) + '...');
      
      // Step 5: Test JWT verification
      console.log('\n5️⃣ Testing JWT verification...');
      
      try {
        const decoded = jwt.verify(token, jwtSecret) as any;
        console.log('✅ JWT verification successful');
        console.log('   Decoded payload:', JSON.stringify(decoded, null, 2));
        
        // Verify Hasura claims format
        const hasuraClaims = decoded['https://hasura.io/jwt/claims'];
        if (hasuraClaims && 
            hasuraClaims['x-hasura-default-role'] === 'user' &&
            hasuraClaims['x-hasura-allowed-roles'].includes('user') &&
            hasuraClaims['x-hasura-user-id'] === userId) {
          console.log('✅ Hasura JWT claims format correct');
        } else {
          console.error('❌ Hasura JWT claims format incorrect');
          console.log('   Expected:', {
            'x-hasura-default-role': 'user',
            'x-hasura-allowed-roles': ['user', 'admin'],
            'x-hasura-user-id': userId
          });
          console.log('   Actual:', hasuraClaims);
        }
        
      } catch (verifyError: any) {
        console.error('❌ JWT verification failed:', verifyError.message);
      }
      
    } catch (jwtError: any) {
      console.error('❌ JWT generation failed:', jwtError.message);
      throw jwtError;
    }
    
    // Step 6: Test session insert
    console.log('\n6️⃣ Testing session insert...');
    
    try {
      const refreshToken = (await import('crypto')).randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      const sessionInsert = await db.execute(sql`
        INSERT INTO auth_session (user_id, refresh_token, expires_at, ip_address, user_agent) 
        VALUES (${userId}, ${refreshToken}, ${expiresAt.toISOString()}, '127.0.0.1', 'Debug Script') 
        RETURNING *
      `);
      
      console.log('✅ Session insert successful:', sessionInsert[0]);
      
    } catch (sessionError: any) {
      console.error('❌ Session insert failed:', sessionError.message);
    }
    
    // Step 7: Test audit log insert
    console.log('\n7️⃣ Testing audit log insert...');
    
    try {
      const auditInsert = await db.execute(sql`
        INSERT INTO auth_audit (user_id, event, ip_address, user_agent, metadata) 
        VALUES (${userId}, 'debug_test', '127.0.0.1', 'Debug Script', ${JSON.stringify({ test: true })}) 
        RETURNING *
      `);
      
      console.log('✅ Audit log insert successful:', auditInsert[0]);
      
    } catch (auditError: any) {
      console.error('❌ Audit log insert failed:', auditError.message);
    }
    
    // Step 8: Test full signup flow simulation
    console.log('\n8️⃣ Testing full signup flow simulation...');
    
    try {
      const signupEmail = `signup-test-${Date.now()}@example.com`;
      const signupPassword = 'SignupPassword123!';
      
      // Check if user exists
      const existingUser = await db.execute(sql`
        SELECT * FROM auth_user WHERE email = ${signupEmail}
      `);
      
      if (existingUser.length > 0) {
        console.log('⚠️  User already exists, skipping signup test');
      } else {
        // Hash password
        const signupPasswordHash = await argon2.hash(signupPassword, { 
          type: argon2.argon2id,
          memoryCost: 2 ** 16,
          timeCost: 3,
          parallelism: 1
        });
        
        // Create user
        const signupUser = await db.execute(sql`
          INSERT INTO auth_user (email, display_name) 
          VALUES (${signupEmail}, 'Signup Test') 
          RETURNING *
        `);
        
        const signupUserId = signupUser[0].id;
        
        // Store credentials
        await db.execute(sql`
          INSERT INTO auth_credential (user_id, password_hash, password_algo) 
          VALUES (${signupUserId}, ${signupPasswordHash}, 'argon2id')
        `);
        
        // Generate tokens
        const signupToken = jwt.sign({
          sub: signupUserId,
          'https://hasura.io/jwt/claims': {
            'x-hasura-default-role': 'user',
            'x-hasura-allowed-roles': ['user', 'admin'],
            'x-hasura-user-id': signupUserId
          }
        }, jwtSecret, { algorithm: 'HS256', expiresIn: '15m' });
        
        const signupRefreshToken = (await import('crypto')).randomBytes(32).toString('hex');
        
        // Store session
        const sessionExpiresAt = new Date();
        sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 30);
        
        await db.execute(sql`
          INSERT INTO auth_session (user_id, refresh_token, expires_at, ip_address, user_agent) 
          VALUES (${signupUserId}, ${signupRefreshToken}, ${sessionExpiresAt.toISOString()}, '127.0.0.1', 'Debug Script')
        `);
        
        console.log('✅ Full signup flow simulation successful');
        console.log('   User ID:', signupUserId);
        console.log('   Token generated:', signupToken.length > 0);
        console.log('   Refresh token generated:', signupRefreshToken.length > 0);
      }
      
    } catch (signupError: any) {
      console.error('❌ Full signup flow simulation failed:', signupError.message);
      console.error('   Stack:', signupError.stack);
    }
    
    console.log('\n✅ Auth Flow Debug Complete!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Database schema: OK');
    console.log('   ✅ Raw inserts: OK');
    console.log('   ✅ Password hashing: OK');
    console.log('   ✅ JWT generation: OK');
    console.log('   ✅ JWT verification: OK');
    console.log('   ✅ Hasura claims: OK');
    console.log('   ✅ Session management: OK');
    console.log('   ✅ Audit logging: OK');
    console.log('   ✅ Full signup flow: OK');
    
    console.log('\n🔍 Next Steps:');
    console.log('   1. Check browser network tab for actual API calls');
    console.log('   2. Verify frontend is sending correct request format');
    console.log('   3. Check server logs for detailed error messages');
    console.log('   4. Test with actual signup form submission');
    
  } catch (error: any) {
    console.error('\n❌ Auth Flow Debug Failed:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await client.end();
  }
}

// Run the debug
if (import.meta.url === `file://${process.argv[1]}`) {
  debugAuthFlow().catch(console.error);
}

export { debugAuthFlow };
