// Cloudflare Worker Auth Service for Neon Database
// Handles authentication endpoints for the StatPedia application

// Auth schemas
const signupSchema = {
  email: 'string',
  password: 'string', 
  displayName: 'string'
};

const loginSchema = {
  email: 'string',
  password: 'string'
};

const refreshSchema = {
  refreshToken: 'string'
};

// Helper function to validate request body
function validateBody(body: any, schema: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  for (const [key, type] of Object.entries(schema)) {
    if (!(key in body)) {
      errors.push(`Missing required field: ${key}`);
    } else if (typeof body[key] !== type) {
      errors.push(`Invalid type for ${key}: expected ${type}, got ${typeof body[key]}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// Helper function to generate JWT
function generateJWT(userId: string, secret: string): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const payload = {
    sub: userId,
    'https://hasura.io/jwt/claims': {
      'x-hasura-default-role': 'user',
      'x-hasura-allowed-roles': ['user', 'admin'],
      'x-hasura-user-id': userId
    },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
  };
  
  // Simple JWT encoding (in production, use a proper JWT library)
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  
  // Create signature (simplified - in production use proper HMAC)
  const signature = btoa(`${encodedHeader}.${encodedPayload}.${secret}`);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Helper function to generate refresh token
function generateRefreshToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Password verification
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Helper function to execute SQL queries
async function executeQuery(connectionString: string, query: string, params: any[] = []): Promise<any> {
  // For now, we'll use a simple fetch to a Neon API endpoint
  // In production, you'd want to use a proper PostgreSQL connection
  const response = await fetch('https://api.neon.tech/v2/projects/{project_id}/databases/{database_id}/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      params
    })
  });
  
  if (!response.ok) {
    throw new Error(`Query failed: ${response.statusText}`);
  }
  
  return response.json();
}

export class NeonAuthService {
  private connectionString: string;
  
  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }
  
  async signup(body: any, jwtSecret: string) {
    // Validate request body
    const validation = validateBody(body, signupSchema);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Validation failed',
        details: validation.errors
      };
    }
    
    try {
      // Hash password
      const passwordHash = await hashPassword(body.password);
      
      // Generate user ID
      const userId = crypto.randomUUID();
      
      // Insert user
      const userQuery = `
        INSERT INTO auth_user (id, email, display_name, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id, email, display_name
      `;
      
      const userResult = await executeQuery(this.connectionString, userQuery, [userId, body.email, body.displayName]);
      
      if (!userResult || userResult.length === 0) {
        return {
          success: false,
          error: 'Failed to create user'
        };
      }
      
      const user = userResult[0];
      
      // Insert credential
      const credQuery = `
        INSERT INTO auth_credential (user_id, password_hash, created_at)
        VALUES ($1, $2, NOW())
      `;
      
      await executeQuery(this.connectionString, credQuery, [userId, passwordHash]);
      
      // Generate tokens
      const accessToken = generateJWT(user.id, jwtSecret);
      const refreshToken = generateRefreshToken();
      
      // Store refresh token
      const sessionQuery = `
        INSERT INTO auth_session (user_id, refresh_token, expires_at, created_at)
        VALUES ($1, $2, $3, NOW())
      `;
      
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await executeQuery(this.connectionString, sessionQuery, [userId, refreshToken, expiresAt]);
      
      // Log audit event
      const auditQuery = `
        INSERT INTO auth_audit (user_id, event_type, ip_address, user_agent, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `;
      
      await executeQuery(this.connectionString, auditQuery, [userId, 'signup', '0.0.0.0', 'Cloudflare Worker']);
      
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.display_name
          },
          accessToken,
          refreshToken
        }
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: 'Signup failed',
        details: error.message
      };
    }
  }
  
  async login(body: any, jwtSecret: string) {
    // Validate request body
    const validation = validateBody(body, loginSchema);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Validation failed',
        details: validation.errors
      };
    }
    
    try {
      // Get user with credential
      const userQuery = `
        SELECT u.id, u.email, u.display_name, c.password_hash
        FROM auth_user u
        JOIN auth_credential c ON u.id = c.user_id
        WHERE u.email = $1
      `;
      
      const userResult = await executeQuery(this.connectionString, userQuery, [body.email]);
      
      if (!userResult || userResult.length === 0) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }
      
      const user = userResult[0];
      
      // Verify password
      const passwordValid = await verifyPassword(body.password, user.password_hash);
      if (!passwordValid) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }
      
      // Generate tokens
      const accessToken = generateJWT(user.id, jwtSecret);
      const refreshToken = generateRefreshToken();
      
      // Store refresh token
      const sessionQuery = `
        INSERT INTO auth_session (user_id, refresh_token, expires_at, created_at)
        VALUES ($1, $2, $3, NOW())
      `;
      
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await executeQuery(this.connectionString, sessionQuery, [user.id, refreshToken, expiresAt]);
      
      // Log audit event
      const auditQuery = `
        INSERT INTO auth_audit (user_id, event_type, ip_address, user_agent, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `;
      
      await executeQuery(this.connectionString, auditQuery, [user.id, 'login', '0.0.0.0', 'Cloudflare Worker']);
      
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.display_name
          },
          accessToken,
          refreshToken
        }
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: 'Login failed',
        details: error.message
      };
    }
  }
  
  async refresh(body: any, jwtSecret: string) {
    // Validate request body
    const validation = validateBody(body, refreshSchema);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Validation failed',
        details: validation.errors
      };
    }
    
    try {
      // Get session
      const sessionQuery = `
        SELECT s.user_id, s.expires_at, u.id, u.email, u.display_name
        FROM auth_session s
        JOIN auth_user u ON s.user_id = u.id
        WHERE s.refresh_token = $1
      `;
      
      const sessionResult = await executeQuery(this.connectionString, sessionQuery, [body.refreshToken]);
      
      if (!sessionResult || sessionResult.length === 0) {
        return {
          success: false,
          error: 'Invalid refresh token'
        };
      }
      
      const session = sessionResult[0];
      
      // Check if session is expired
      if (new Date(session.expires_at) < new Date()) {
        // Clean up expired session
        const deleteQuery = `DELETE FROM auth_session WHERE refresh_token = $1`;
        await executeQuery(this.connectionString, deleteQuery, [body.refreshToken]);
        
        return {
          success: false,
          error: 'Refresh token expired'
        };
      }
      
      // Generate new access token
      const accessToken = generateJWT(session.user_id, jwtSecret);
      
      return {
        success: true,
        data: {
          accessToken
        }
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: 'Token refresh failed',
        details: error.message
      };
    }
  }
  
  async logout(refreshToken: string) {
    try {
      // Remove session
      const deleteQuery = `DELETE FROM auth_session WHERE refresh_token = $1`;
      await executeQuery(this.connectionString, deleteQuery, [refreshToken]);
      
      return {
        success: true,
        message: 'Logged out successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: 'Logout failed',
        details: error.message
      };
    }
  }
  
  async getMe(userId: string) {
    try {
      const userQuery = `
        SELECT id, email, display_name, created_at
        FROM auth_user
        WHERE id = $1
      `;
      
      const userResult = await executeQuery(this.connectionString, userQuery, [userId]);
      
      if (!userResult || userResult.length === 0) {
        return {
          success: false,
          error: 'User not found'
        };
      }
      
      const user = userResult[0];
      
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            createdAt: user.created_at
          }
        }
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to get user',
        details: error.message
      };
    }
  }
}
