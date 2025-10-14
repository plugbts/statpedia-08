#!/usr/bin/env tsx

/**
 * Local API Server for Development
 * 
 * This server serves the auth API routes locally for development
 * since this is a Vite app, not Next.js
 */

import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Import auth service
import { authService } from '../lib/auth/auth-service';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:8083'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, display_name, displayName } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Get client info
    const ip_address = req.ip || 
      req.headers['x-forwarded-for'] || 
      req.headers['x-real-ip'] || 
      'unknown';
    const user_agent = req.headers['user-agent'] || 'unknown';

    const tokens = await authService.signup({
      email,
      password,
      display_name: display_name || displayName
    }, {
      ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
      user_agent
    });

    res.json({
      success: true,
      data: {
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        expiresIn: 900 // 15 minutes in seconds
      }
    });

  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Signup failed'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Get client info
    const ip_address = req.ip || 
      req.headers['x-forwarded-for'] || 
      req.headers['x-real-ip'] || 
      'unknown';
    const user_agent = req.headers['user-agent'] || 'unknown';

    const tokens = await authService.login({
      email,
      password
    }, {
      ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
      user_agent
    });

    res.json({
      success: true,
      data: {
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        expiresIn: 900 // 15 minutes in seconds
      }
    });

  } catch (error: any) {
    console.error('Login error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Login failed'
    });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header required'
      });
    }

    const token = authHeader.substring(7);
    const { userId, valid } = authService.verifyToken(token);

    if (!valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    const user = await authService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user'
    });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    // Get client info
    const ip_address = req.ip || 
      req.headers['x-forwarded-for'] || 
      req.headers['x-real-ip'] || 
      'unknown';
    const user_agent = req.headers['user-agent'] || 'unknown';

    const result = await authService.refreshToken({
      refreshToken
    }, {
      ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
      user_agent
    });

    res.json({
      success: true,
      data: {
        token: result.token,
        expiresIn: 900 // 15 minutes in seconds
      }
    });

  } catch (error: any) {
    console.error('Refresh token error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Token refresh failed'
    });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    // Get client info
    const ip_address = req.ip || 
      req.headers['x-forwarded-for'] || 
      req.headers['x-real-ip'] || 
      'unknown';
    const user_agent = req.headers['user-agent'] || 'unknown';

    await authService.logout(refreshToken, {
      ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
      user_agent
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Logout failed'
    });
  }
});

// Send email verification code route
app.post('/api/auth/send-verification-code', async (req, res) => {
  try {
    const { email, purpose } = req.body;
    
    if (!email || !purpose) {
      return res.status(400).json({
        success: false,
        error: 'Email and purpose are required'
      });
    }

    const ip_address = req.ip || 
      req.headers['x-forwarded-for'] || 
      req.headers['x-real-ip'] || 
      'unknown';
    const user_agent = req.headers['user-agent'] || 'unknown';

    await authService.sendEmailVerificationCode(email, purpose, {
      ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
      user_agent
    });

    res.json({
      success: true,
      message: 'Verification code sent successfully'
    });
  } catch (error: any) {
    console.error('Send verification code error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to send verification code'
    });
  }
});

// Verify email code route
app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { email, code, purpose } = req.body;
    
    if (!email || !code || !purpose) {
      return res.status(400).json({
        success: false,
        error: 'Email, code, and purpose are required'
      });
    }

    const isValid = await authService.verifyEmailCode(email, code, purpose);

    res.json({
      success: true,
      data: { valid: isValid }
    });
  } catch (error: any) {
    console.error('Verify code error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to verify code'
    });
  }
});

// Update password route
app.post('/api/auth/update-password', async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    
    if (!userId || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'User ID and new password are required'
      });
    }

    const ip_address = req.ip || 
      req.headers['x-forwarded-for'] || 
      req.headers['x-real-ip'] || 
      'unknown';
    const user_agent = req.headers['user-agent'] || 'unknown';

    await authService.updatePassword(userId, newPassword, {
      ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
      user_agent
    });

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error: any) {
    console.error('Update password error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update password'
    });
  }
});

// Update email route
app.post('/api/auth/update-email', async (req, res) => {
  try {
    const { userId, newEmail } = req.body;
    
    if (!userId || !newEmail) {
      return res.status(400).json({
        success: false,
        error: 'User ID and new email are required'
      });
    }

    const ip_address = req.ip || 
      req.headers['x-forwarded-for'] || 
      req.headers['x-real-ip'] || 
      'unknown';
    const user_agent = req.headers['user-agent'] || 'unknown';

    await authService.updateEmail(userId, newEmail, {
      ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
      user_agent
    });

    res.json({
      success: true,
      message: 'Email updated successfully'
    });
  } catch (error: any) {
    console.error('Update email error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update email'
    });
  }
});

// Update profile route
app.post('/api/auth/update-profile', async (req, res) => {
  try {
    const { userId, display_name, username } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const ip_address = req.ip || 
      req.headers['x-forwarded-for'] || 
      req.headers['x-real-ip'] || 
      'unknown';
    const user_agent = req.headers['user-agent'] || 'unknown';

    const updates: { display_name?: string; username?: string } = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (username !== undefined) updates.username = username;

    await authService.updateUserProfile(userId, updates, {
      ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
      user_agent
    });

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update profile'
    });
  }
});

// Player analytics routes
app.get('/api/player-analytics', async (req, res) => {
  try {
    const { playerId, propType, season } = req.query;

    if (!playerId || !propType) {
      return res.status(400).json({
        success: false,
        error: 'playerId and propType are required'
      });
    }

    // Import the analytics logic
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = (await import('postgres')).default;
    const { sql } = await import('drizzle-orm');

    const connectionString = process.env.NEON_DATABASE_URL!;
    const client = postgres(connectionString);
    const db = drizzle(client);

    // Get player analytics
    const analytics = await db.execute(sql`
      WITH player_stats AS (
        SELECT 
          pgl.player_id,
          pgl.prop_type,
          pgl.season,
          COUNT(*) as total_games,
          AVG(pgl.actual_value) as career_avg,
          AVG(pgl.hit::int) as career_hit_rate,
          MAX(pgl.game_date) as last_game_date,
          MIN(pgl.game_date) as first_game_date
        FROM player_game_logs pgl
        WHERE pgl.player_id = ${playerId as string}
          AND pgl.prop_type = ${propType as string}
          AND pgl.season = ${(season as string) || '2025'}
        GROUP BY pgl.player_id, pgl.prop_type, pgl.season
      ),
      recent_games AS (
        SELECT 
          pgl.player_id,
          pgl.prop_type,
          pgl.game_date,
          pgl.actual_value,
          pgl.line,
          pgl.hit,
          ROW_NUMBER() OVER (ORDER BY pgl.game_date DESC) as rn
        FROM player_game_logs pgl
        WHERE pgl.player_id = ${playerId as string}
          AND pgl.prop_type = ${propType as string}
          AND pgl.season = ${(season as string) || '2025'}
        ORDER BY pgl.game_date DESC
      ),
      rolling_stats AS (
        SELECT 
          AVG(actual_value) as avg_l5,
          AVG(hit::int) as hit_rate_l5
        FROM recent_games
        WHERE rn <= 5
      ),
      streak_data AS (
        SELECT 
          hit,
          COUNT(*) as streak_length,
          ROW_NUMBER() OVER (ORDER BY game_date DESC) as rn
        FROM recent_games
        WHERE rn <= 10
        GROUP BY hit, game_date
        ORDER BY game_date DESC
        LIMIT 1
      )
      SELECT 
        ps.total_games,
        ps.career_avg,
        ps.career_hit_rate,
        ps.last_game_date,
        ps.first_game_date,
        COALESCE(rs.avg_l5, 0) as avg_l5,
        COALESCE(rs.hit_rate_l5, 0) as hit_rate_l5,
        COALESCE(sd.streak_length, 0) as current_streak,
        COALESCE(sd.hit, false) as current_streak_type
      FROM player_stats ps
      LEFT JOIN rolling_stats rs ON 1=1
      LEFT JOIN streak_data sd ON sd.rn = 1
    `);

    // Get recent games
    const recentGames = await db.execute(sql`
      SELECT 
        pgl.game_date,
        pgl.actual_value,
        pgl.line,
        pgl.hit,
        g.home_team_id,
        g.away_team_id,
        ht.name as home_team,
        at.name as away_team,
        pgl.home_away
      FROM player_game_logs pgl
      JOIN games g ON pgl.game_id = g.id
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE pgl.player_id = ${playerId as string}
        AND pgl.prop_type = ${propType as string}
        AND pgl.season = ${(season as string) || '2025'}
      ORDER BY pgl.game_date DESC
      LIMIT 10
    `);

    await client.end();

    const result = {
      analytics: analytics[0] || {},
      recentGames: recentGames || [],
      summary: {
        totalGames: analytics[0]?.total_games || 0,
        careerAvg: parseFloat(analytics[0]?.career_avg || '0'),
        careerHitRate: parseFloat(analytics[0]?.career_hit_rate || '0'),
        avgL5: parseFloat(analytics[0]?.avg_l5 || '0'),
        hitRateL5: parseFloat(analytics[0]?.hit_rate_l5 || '0'),
        currentStreak: analytics[0]?.current_streak || 0,
        currentStreakType: analytics[0]?.current_streak_type ? 'over' : 'under'
      }
    };

    res.json(result);

  } catch (error: any) {
    console.error('Player analytics API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Local API server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
  console.log(`📊 Analytics endpoints: http://localhost:${PORT}/api/player-analytics`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down API server...');
  await authService.close();
  process.exit(0);
});

export default app;
