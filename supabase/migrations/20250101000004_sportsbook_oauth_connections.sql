-- Sportsbook OAuth Connections Migration
-- This migration creates tables for OAuth-based sportsbook connections similar to Pikkit

-- Create sportsbook_oauth_connections table
CREATE TABLE IF NOT EXISTS sportsbook_oauth_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sportsbook_name VARCHAR(100) NOT NULL,
  connection_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'connected', 'failed', 'disconnected'
  
  -- OAuth flow data
  oauth_state VARCHAR(255) NOT NULL,
  oauth_code VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Sync settings
  sync_frequency VARCHAR(20) DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sportsbook_oauth_connections_user_id ON sportsbook_oauth_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_sportsbook_oauth_connections_sportsbook ON sportsbook_oauth_connections(sportsbook_name);
CREATE INDEX IF NOT EXISTS idx_sportsbook_oauth_connections_status ON sportsbook_oauth_connections(connection_status);
CREATE INDEX IF NOT EXISTS idx_sportsbook_oauth_connections_oauth_state ON sportsbook_oauth_connections(oauth_state);

-- Create unique constraint to prevent duplicate connections
CREATE UNIQUE INDEX IF NOT EXISTS idx_sportsbook_oauth_connections_unique 
ON sportsbook_oauth_connections(user_id, sportsbook_name);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_sportsbook_oauth_connections_updated_at 
    BEFORE UPDATE ON sportsbook_oauth_connections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE sportsbook_oauth_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own OAuth connections" ON sportsbook_oauth_connections
    FOR ALL USING (auth.uid() = user_id);

-- Create function to clean up expired connections
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_connections()
RETURNS VOID AS $$
BEGIN
  -- Update expired connections to failed status
  UPDATE sportsbook_oauth_connections 
  SET 
    connection_status = 'failed',
    updated_at = NOW()
  WHERE 
    connection_status = 'pending' 
    AND created_at < NOW() - INTERVAL '1 hour';
    
  -- Log cleanup activity
  INSERT INTO system_logs (action, details, created_at)
  VALUES (
    'oauth_cleanup',
    json_build_object(
      'expired_connections_updated', 
      (SELECT COUNT(*) FROM sportsbook_oauth_connections WHERE connection_status = 'failed' AND updated_at > NOW() - INTERVAL '1 minute')
    ),
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Create system_logs table for cleanup tracking
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for system_logs
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for system_logs (admin only)
CREATE POLICY "Admins can view system logs" ON system_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND (role = 'admin' OR role = 'owner')
        )
    );

-- Create function to get OAuth connection statistics
CREATE OR REPLACE FUNCTION get_oauth_connection_stats()
RETURNS TABLE (
  total_connections BIGINT,
  connected_connections BIGINT,
  pending_connections BIGINT,
  failed_connections BIGINT,
  disconnected_connections BIGINT,
  last_24h_connections BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_connections,
    COUNT(CASE WHEN connection_status = 'connected' THEN 1 END) as connected_connections,
    COUNT(CASE WHEN connection_status = 'pending' THEN 1 END) as pending_connections,
    COUNT(CASE WHEN connection_status = 'failed' THEN 1 END) as failed_connections,
    COUNT(CASE WHEN connection_status = 'disconnected' THEN 1 END) as disconnected_connections,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h_connections
  FROM sportsbook_oauth_connections;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's OAuth connection status
CREATE OR REPLACE FUNCTION get_user_oauth_status(p_user_id UUID)
RETURNS TABLE (
  sportsbook_name VARCHAR(100),
  connection_status VARCHAR(20),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_frequency VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    soc.sportsbook_name,
    soc.connection_status,
    soc.last_sync_at,
    soc.sync_frequency
  FROM sportsbook_oauth_connections soc
  WHERE soc.user_id = p_user_id
  ORDER BY soc.created_at DESC;
END;
$$ LANGUAGE plpgsql;
