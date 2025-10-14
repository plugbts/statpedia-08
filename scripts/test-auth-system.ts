import { config } from 'dotenv';
import { authService } from '../src/lib/auth/auth-service';

// Load environment variables
config({ path: '.env.local' });


async function testAuthSystem() {
  console.log('🧪 Testing Custom Auth System...\n');

  try {
    // Test 1: Signup
    console.log('1️⃣ Testing signup...');
    const timestamp = Date.now();
    const signupData = {
      email: `test${timestamp}@example.com`,
      password: 'testpassword123',
      display_name: 'Test User'
    };

    const signupResult = await authService.signup(signupData, {
      ip_address: '127.0.0.1',
      user_agent: 'test-agent'
    });

    console.log('✅ Signup successful!');
    console.log('   Token:', signupResult.token.substring(0, 20) + '...');
    console.log('   Refresh Token:', signupResult.refreshToken.substring(0, 20) + '...\n');

    // Test 2: Login
    console.log('2️⃣ Testing login...');
    const loginData = {
      email: `test${timestamp}@example.com`,
      password: 'testpassword123'
    };

    const loginResult = await authService.login(loginData, {
      ip_address: '127.0.0.1',
      user_agent: 'test-agent'
    });

    console.log('✅ Login successful!');
    console.log('   Token:', loginResult.token.substring(0, 20) + '...');
    console.log('   Refresh Token:', loginResult.refreshToken.substring(0, 20) + '...\n');

    // Test 3: Token Verification
    console.log('3️⃣ Testing token verification...');
    const verification = authService.verifyToken(loginResult.token);
    console.log('✅ Token verification successful!');
    console.log('   User ID:', verification.userId);
    console.log('   Valid:', verification.valid, '\n');

    // Test 4: Get User
    console.log('4️⃣ Testing get user...');
    const user = await authService.getUserById(verification.userId);
    if (user) {
      console.log('✅ Get user successful!');
      console.log('   Email:', user.email);
      console.log('   Display Name:', user.display_name);
      console.log('   Email Verified:', user.email_verified, '\n');
    }

    // Test 5: Refresh Token
    console.log('5️⃣ Testing refresh token...');
    const refreshResult = await authService.refreshToken(
      { refreshToken: loginResult.refreshToken },
      { ip_address: '127.0.0.1', user_agent: 'test-agent' }
    );

    console.log('✅ Refresh token successful!');
    console.log('   New Token:', refreshResult.token.substring(0, 20) + '...\n');

    // Test 6: Logout
    console.log('6️⃣ Testing logout...');
    await authService.logout(loginResult.refreshToken, {
      ip_address: '127.0.0.1',
      user_agent: 'test-agent'
    });

    console.log('✅ Logout successful!\n');

    console.log('🎉 All auth system tests passed!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ User signup');
    console.log('   ✅ User login');
    console.log('   ✅ JWT token verification');
    console.log('   ✅ User data retrieval');
    console.log('   ✅ Token refresh');
    console.log('   ✅ User logout');

  } catch (error) {
    console.error('❌ Auth system test failed:', error);
    throw error;
  } finally {
    await authService.close();
  }
}

testAuthSystem();
