// Auth configuration
export const authConfig = {
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresDays: parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30'),
  
  // Password hashing
  argon2Config: {
    type: 'argon2id' as const,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1
  },
  
  // Session management
  sessionConfig: {
    maxSessionsPerUser: 5, // Limit concurrent sessions
    cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  },
  
  // Rate limiting (for auth endpoints)
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    skipSuccessfulRequests: true,
  },
  
  // Email verification
  emailVerification: {
    enabled: true,
    tokenExpiresIn: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Password reset
  passwordReset: {
    tokenExpiresIn: 60 * 60 * 1000, // 1 hour
  },
  
  // Security
  security: {
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    requireEmailVerification: false, // Set to true in production
  }
};

// Hasura JWT claims configuration
export const hasuraClaims = {
  defaultRole: 'user',
  allowedRoles: ['user', 'admin'],
  userIdClaim: 'https://hasura.io/jwt/claims.x-hasura-user-id',
  roleClaim: 'https://hasura.io/jwt/claims.x-hasura-default-role',
};

// Environment validation
export function validateAuthConfig() {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-here') {
    console.warn('⚠️  Using default JWT secret! Change JWT_SECRET in production.');
  }
}
