-- Create user_roles table for proper role management
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'moderator', 'admin', 'owner')),
    granted_by UUID REFERENCES auth_user(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles(role);
CREATE INDEX IF NOT EXISTS user_roles_active_idx ON user_roles(is_active);

-- Create unique constraint to ensure one active role per user
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_active_unique ON user_roles(user_id) WHERE is_active = true;

-- Add comments
COMMENT ON TABLE user_roles IS 'User role assignments with hierarchy and expiration support';
COMMENT ON COLUMN user_roles.role IS 'Role type: user, moderator, admin, owner';
COMMENT ON COLUMN user_roles.granted_by IS 'User who granted this role';
COMMENT ON COLUMN user_roles.expires_at IS 'Optional role expiration date';
COMMENT ON COLUMN user_roles.is_active IS 'Whether this role assignment is currently active';
