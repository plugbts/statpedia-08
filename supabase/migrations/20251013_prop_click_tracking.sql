-- Create prop_clicks table (if not exists from earlier script)
CREATE TABLE IF NOT EXISTS prop_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT,
  prop_id UUID REFERENCES props(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ DEFAULT now(),
  session_id TEXT,
  device_type TEXT,
  user_agent TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prop_clicks_prop_id ON prop_clicks(prop_id);
CREATE INDEX IF NOT EXISTS idx_prop_clicks_user_id ON prop_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_prop_clicks_clicked_at ON prop_clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_prop_clicks_session_id ON prop_clicks(session_id);

-- Enable RLS (public can insert for anonymous tracking)
ALTER TABLE prop_clicks ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert clicks (for anonymous tracking)
CREATE POLICY "Anyone can insert prop clicks" ON prop_clicks
  FOR INSERT WITH CHECK (true);

-- Policy: Users can view their own clicks
CREATE POLICY "Users can view their own clicks" ON prop_clicks
  FOR SELECT USING (user_id = auth.uid()::text OR user_id IS NULL);

-- Policy: Admins can view all clicks
CREATE POLICY "Admins can view all clicks" ON prop_clicks
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RPC: Track a single prop click
CREATE OR REPLACE FUNCTION track_prop_click(
  p_prop_id UUID,
  p_user_id TEXT,
  p_session_id TEXT,
  p_device_type TEXT,
  p_user_agent TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO prop_clicks (prop_id, user_id, session_id, device_type, user_agent)
  VALUES (p_prop_id, p_user_id, p_session_id, p_device_type, p_user_agent);
END;
$$;

-- RPC: Batch track prop clicks
CREATE OR REPLACE FUNCTION track_prop_clicks_batch(
  p_clicks JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO prop_clicks (prop_id, user_id, session_id, device_type, user_agent)
  SELECT 
    (click->>'prop_id')::UUID,
    click->>'user_id',
    click->>'session_id',
    click->>'device_type',
    click->>'user_agent'
  FROM jsonb_array_elements(p_clicks) AS click;
END;
$$;

-- RPC: Get top clicked prop types
CREATE OR REPLACE FUNCTION get_top_clicked_prop_types(
  p_league TEXT DEFAULT NULL,
  p_time_range TEXT DEFAULT 'all'
)
RETURNS TABLE (
  prop_type TEXT,
  league TEXT,
  clicks BIGINT,
  unique_users BIGINT,
  clicks_24h BIGINT,
  clicks_7d BIGINT,
  last_clicked TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  time_filter TIMESTAMPTZ;
BEGIN
  -- Determine time filter
  CASE p_time_range
    WHEN '24h' THEN time_filter := now() - interval '24 hours';
    WHEN '7d' THEN time_filter := now() - interval '7 days';
    WHEN '30d' THEN time_filter := now() - interval '30 days';
    ELSE time_filter := '1970-01-01'::TIMESTAMPTZ;
  END CASE;
  
  RETURN QUERY
  SELECT 
    p.prop_type,
    l.code as league,
    COUNT(*)::BIGINT as clicks,
    COUNT(DISTINCT c.user_id)::BIGINT as unique_users,
    COUNT(*) FILTER (WHERE c.clicked_at > now() - interval '24 hours')::BIGINT as clicks_24h,
    COUNT(*) FILTER (WHERE c.clicked_at > now() - interval '7 days')::BIGINT as clicks_7d,
    MAX(c.clicked_at) as last_clicked
  FROM prop_clicks c
  JOIN props p ON c.prop_id = p.id
  JOIN teams t ON p.team_id = t.id
  JOIN leagues l ON t.league_id = l.id
  WHERE 
    c.clicked_at >= time_filter
    AND (p_league IS NULL OR l.code = p_league)
  GROUP BY p.prop_type, l.code
  ORDER BY clicks DESC;
END;
$$;

-- RPC: Get user prop preferences
CREATE OR REPLACE FUNCTION get_user_prop_preferences(
  p_user_id TEXT
)
RETURNS TABLE (
  prop_type TEXT,
  league TEXT,
  clicks BIGINT,
  last_clicked TIMESTAMPTZ,
  first_clicked TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.prop_type,
    l.code as league,
    COUNT(*)::BIGINT as clicks,
    MAX(c.clicked_at) as last_clicked,
    MIN(c.clicked_at) as first_clicked
  FROM prop_clicks c
  JOIN props p ON c.prop_id = p.id
  JOIN teams t ON p.team_id = t.id
  JOIN leagues l ON t.league_id = l.id
  WHERE c.user_id = p_user_id
  GROUP BY p.prop_type, l.code
  ORDER BY clicks DESC;
END;
$$;

-- Create views for analytics (materialized for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS top_clicked_prop_types_mv AS
SELECT 
  p.prop_type,
  l.code as league,
  COUNT(*) as clicks,
  COUNT(DISTINCT c.user_id) as unique_users,
  COUNT(*) FILTER (WHERE c.clicked_at > now() - interval '24 hours') as clicks_24h,
  COUNT(*) FILTER (WHERE c.clicked_at > now() - interval '7 days') as clicks_7d,
  MAX(c.clicked_at) as last_clicked
FROM prop_clicks c
JOIN props p ON c.prop_id = p.id
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
GROUP BY p.prop_type, l.code
ORDER BY clicks DESC;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_top_clicked_prop_types_mv ON top_clicked_prop_types_mv(prop_type, league);

-- Refresh materialized view hourly (can be run via cron)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY top_clicked_prop_types_mv;

COMMENT ON TABLE prop_clicks IS 'Tracks user clicks on player props for analytics';
COMMENT ON FUNCTION track_prop_click IS 'Records a single prop click event';
COMMENT ON FUNCTION track_prop_clicks_batch IS 'Records multiple prop click events in batch';
COMMENT ON FUNCTION get_top_clicked_prop_types IS 'Returns most popular prop types across all users';
COMMENT ON FUNCTION get_user_prop_preferences IS 'Returns a specific user''s prop click history';

