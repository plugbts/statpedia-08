-- Custom Authentication Schema for StatPedia
-- This replaces Supabase auth with our own JWT-based system

-- 1) Users table
CREATE TABLE IF NOT EXISTS auth_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disabled BOOLEAN NOT NULL DEFAULT FALSE
);

-- 2) Credentials (password-based authentication)
CREATE TABLE IF NOT EXISTS auth_credential (
  user_id UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_algo TEXT NOT NULL DEFAULT 'argon2id',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

-- 3) OAuth identities (for Google, GitHub, etc.)
CREATE TABLE IF NOT EXISTS auth_identity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,            -- 'google', 'github', 'discord', etc.
  provider_user_id TEXT NOT NULL,
  provider_data JSONB,               -- Store provider-specific data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_user_id)
);

-- 4) Sessions / refresh tokens
CREATE TABLE IF NOT EXISTS auth_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,   -- e.g., 30 days
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address TEXT,
  user_agent TEXT
);

-- 5) Audit log for security monitoring
CREATE TABLE IF NOT EXISTS auth_audit (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth_user(id) ON DELETE SET NULL,
  event TEXT NOT NULL,               -- 'signup', 'login_success', 'login_failed', 'password_reset', etc.
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,                    -- Additional event data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6) Email verification tokens
CREATE TABLE IF NOT EXISTS auth_verification_token (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,                -- 'email_verification', 'password_reset'
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_auth_user_email ON auth_user(email);
CREATE INDEX IF NOT EXISTS idx_auth_identity_provider ON auth_identity(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_auth_session_refresh_token ON auth_session(refresh_token);
CREATE INDEX IF NOT EXISTS idx_auth_session_user_id ON auth_session(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_user_id ON auth_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_event ON auth_audit(event);
CREATE INDEX IF NOT EXISTS idx_auth_verification_token_token ON auth_verification_token(token);
CREATE INDEX IF NOT EXISTS idx_auth_verification_token_user_id ON auth_verification_token(user_id);

-- Row Level Security (RLS) policies for Hasura integration
ALTER TABLE auth_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_credential ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_verification_token ENABLE ROW LEVEL SECURITY;

-- RLS Policies for auth_user
CREATE POLICY "Users can view their own profile" ON auth_user
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON auth_user
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for auth_credential (users can only access their own)
CREATE POLICY "Users can view their own credentials" ON auth_credential
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for auth_identity
CREATE POLICY "Users can view their own identities" ON auth_identity
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for auth_session
CREATE POLICY "Users can view their own sessions" ON auth_session
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can revoke their own sessions" ON auth_session
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for auth_audit (users can view their own audit logs)
CREATE POLICY "Users can view their own audit logs" ON auth_audit
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for auth_verification_token
CREATE POLICY "Users can view their own verification tokens" ON auth_verification_token
  FOR SELECT USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON auth_user TO authenticated;
GRANT ALL ON auth_credential TO authenticated;
GRANT ALL ON auth_identity TO authenticated;
GRANT ALL ON auth_session TO authenticated;
GRANT ALL ON auth_audit TO authenticated;
GRANT ALL ON auth_verification_token TO authenticated;

-- Grant permissions to anon users (for signup/login)
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON auth_user TO anon;
GRANT INSERT ON auth_credential TO anon;
GRANT INSERT ON auth_identity TO anon;
GRANT INSERT ON auth_session TO anon;
GRANT INSERT ON auth_audit TO anon;
GRANT INSERT ON auth_verification_token TO anon;

-- Create a function to get current user ID (for RLS)
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    current_setting('hasura.user-id', true)::UUID,
    (current_setting('request.jwt.claims', true)::json->>'sub')::UUID
  );
$$;
