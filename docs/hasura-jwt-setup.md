# Hasura JWT Configuration for Custom Auth

This guide explains how to configure Hasura to work with our custom JWT-based authentication system.

## 1. Environment Variables

Add these environment variables to your Hasura instance:

```bash
# JWT Configuration
HASURA_GRAPHQL_JWT_SECRET='{"type":"HS256","key":"your-super-secret-jwt-key-here"}'
HASURA_GRAPHQL_UNAUTHORIZED_ROLE=public
HASURA_GRAPHQL_ADMIN_SECRET=your-admin-secret
```

**Important**: The JWT secret must match exactly with `JWT_SECRET` in your auth service.

## 2. JWT Claims Structure

Our auth service generates JWTs with this structure:

```json
{
  "sub": "USER_UUID",
  "https://hasura.io/jwt/claims": {
    "x-hasura-default-role": "user",
    "x-hasura-allowed-roles": ["user", "admin"],
    "x-hasura-user-id": "USER_UUID"
  }
}
```

## 3. Role Configuration

### Roles to Create:

1. **`public`** - Unauthenticated users
2. **`user`** - Authenticated users  
3. **`admin`** - Administrative users

### Role Permissions:

#### `public` role:
- No permissions by default
- Can only access tables with public permissions

#### `user` role:
- Can read/write their own data
- Uses Row Level Security (RLS) policies

#### `admin` role:
- Full access to all tables
- Can manage users and system data

## 4. Row Level Security (RLS) Policies

Enable RLS on user-owned tables and create policies:

### Example: User Profiles Table

```sql
-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);
```

### Example: User Bets/Props Table

```sql
-- Enable RLS
ALTER TABLE user_bets ENABLE ROW LEVEL SECURITY;

-- Users can view their own bets
CREATE POLICY "Users can view own bets" ON user_bets
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create bets for themselves
CREATE POLICY "Users can create own bets" ON user_bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own bets
CREATE POLICY "Users can update own bets" ON user_bets
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own bets
CREATE POLICY "Users can delete own bets" ON user_bets
  FOR DELETE USING (auth.uid() = user_id);
```

## 5. Hasura Metadata Configuration

### Track Tables

Make sure to track all your tables in Hasura:

```bash
# Via Hasura CLI
hasura metadata apply
```

### Set Table Permissions

In Hasura Console, configure permissions for each role:

#### For `user` role on user-owned tables:
- **Select**: Custom check `{"user_id":{"_eq":"X-Hasura-User-Id"}}`
- **Insert**: Custom check `{"user_id":{"_eq":"X-Hasura-User-Id"}}`
- **Update**: Custom check `{"user_id":{"_eq":"X-Hasura-User-Id"}}`
- **Delete**: Custom check `{"user_id":{"_eq":"X-Hasura-User-Id"}}`

#### For `admin` role:
- **Select**: Allow all
- **Insert**: Allow all
- **Update**: Allow all
- **Delete**: Allow all

## 6. Frontend Integration

### GraphQL Client Configuration

Configure your GraphQL client to include JWT tokens:

```typescript
import { createClient } from '@urql/core';
import { useAuth } from '@/contexts/AuthContext';

const createGraphQLClient = () => {
  const { tokens } = useAuth();
  
  return createClient({
    url: process.env.NEXT_PUBLIC_HASURA_ENDPOINT!,
    fetchOptions: {
      headers: {
        'Authorization': tokens ? `Bearer ${tokens.token}` : '',
        'Content-Type': 'application/json',
      },
    },
  });
};
```

### Apollo Client Configuration

```typescript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { useAuth } from '@/contexts/AuthContext';

const createApolloClient = () => {
  const { tokens } = useAuth();
  
  const httpLink = createHttpLink({
    uri: process.env.NEXT_PUBLIC_HASURA_ENDPOINT!,
  });

  const authLink = setContext((_, { headers }) => {
    return {
      headers: {
        ...headers,
        authorization: tokens ? `Bearer ${tokens.token}` : '',
      }
    }
  });

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
  });
};
```

## 7. Testing Authentication

### Test JWT Generation

```typescript
// Test script to verify JWT generation
import { authService } from '@/lib/auth/auth-service';

async function testJWT() {
  const tokens = await authService.signup({
    email: 'test@example.com',
    password: 'testpassword123',
    display_name: 'Test User'
  });
  
  console.log('Generated JWT:', tokens.token);
  
  // Decode and inspect
  const decoded = jwt.decode(tokens.token);
  console.log('Decoded JWT:', decoded);
}
```

### Test Hasura Connection

```graphql
# Test query to verify authentication
query GetUserProfile {
  user_profiles(where: {user_id: {_eq: "X-Hasura-User-Id"}}) {
    id
    display_name
    created_at
  }
}
```

## 8. Security Best Practices

1. **Use HTTPS** in production
2. **Rotate JWT secrets** regularly
3. **Set short token expiration** (15 minutes for access tokens)
4. **Implement refresh token rotation**
5. **Monitor auth audit logs**
6. **Use rate limiting** on auth endpoints
7. **Validate all inputs** on both client and server
8. **Use CSP headers** to prevent XSS

## 9. Migration from Supabase

1. Export existing users from Supabase
2. Import into new `auth_user` table
3. Send password reset emails to all users
4. Update frontend to use new auth system
5. Remove Supabase dependencies
6. Test thoroughly before going live

## 10. Monitoring and Logging

Monitor these metrics:
- Authentication success/failure rates
- Token refresh patterns
- Suspicious login attempts
- API endpoint performance
- Database query performance

Set up alerts for:
- High authentication failure rates
- Unusual login patterns
- Token validation errors
- Database connection issues
