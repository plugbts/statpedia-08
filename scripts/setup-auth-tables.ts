import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const DATABASE_URL = process.env.NEON_DATABASE_URL!;

async function setupAuthTables() {
  const client = postgres(DATABASE_URL);
  const db = drizzle(client);

  console.log('Setting up auth tables...');

  try {
    // Create auth_user table
    await client`
      CREATE TABLE IF NOT EXISTS auth_user (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        display_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        disabled BOOLEAN NOT NULL DEFAULT FALSE
      );
    `;
    console.log('✅ Created auth_user table');

    // Create auth_credential table
    await client`
      CREATE TABLE IF NOT EXISTS auth_credential (
        user_id UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
        password_hash TEXT NOT NULL,
        password_algo TEXT NOT NULL DEFAULT 'argon2id',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id)
      );
    `;
    console.log('✅ Created auth_credential table');

    // Create auth_identity table
    await client`
      CREATE TABLE IF NOT EXISTS auth_identity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        provider_user_id TEXT NOT NULL,
        provider_data JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (provider, provider_user_id)
      );
    `;
    console.log('✅ Created auth_identity table');

    // Create auth_session table
    await client`
      CREATE TABLE IF NOT EXISTS auth_session (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
        refresh_token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        ip_address TEXT,
        user_agent TEXT
      );
    `;
    console.log('✅ Created auth_session table');

    // Create auth_audit table
    await client`
      CREATE TABLE IF NOT EXISTS auth_audit (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID REFERENCES auth_user(id) ON DELETE SET NULL,
        event TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    console.log('✅ Created auth_audit table');

    // Create auth_verification_token table
    await client`
      CREATE TABLE IF NOT EXISTS auth_verification_token (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    console.log('✅ Created auth_verification_token table');

    // Create indexes
    await client`CREATE INDEX IF NOT EXISTS idx_auth_user_email ON auth_user(email);`;
    await client`CREATE INDEX IF NOT EXISTS idx_auth_identity_provider ON auth_identity(provider, provider_user_id);`;
    await client`CREATE INDEX IF NOT EXISTS idx_auth_session_refresh_token ON auth_session(refresh_token);`;
    await client`CREATE INDEX IF NOT EXISTS idx_auth_session_user_id ON auth_session(user_id);`;
    await client`CREATE INDEX IF NOT EXISTS idx_auth_audit_user_id ON auth_audit(user_id);`;
    await client`CREATE INDEX IF NOT EXISTS idx_auth_audit_event ON auth_audit(event);`;
    await client`CREATE INDEX IF NOT EXISTS idx_auth_verification_token_token ON auth_verification_token(token);`;
    await client`CREATE INDEX IF NOT EXISTS idx_auth_verification_token_user_id ON auth_verification_token(user_id);`;
    
    console.log('✅ Created indexes');

    console.log('🎉 Auth tables setup complete!');

  } catch (error) {
    console.error('❌ Error setting up auth tables:', error);
  } finally {
    await client.end();
  }
}

setupAuthTables();
