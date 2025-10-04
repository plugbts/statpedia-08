-- Free Trial Abuse Prevention Migration
-- This migration adds IP and MAC address tracking to prevent free trial abuse

-- Add IP and MAC address tracking to user_trials table
ALTER TABLE user_trials 
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17),
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create table to track IP address trial usage
CREATE TABLE IF NOT EXISTS ip_trial_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  trial_count INTEGER DEFAULT 1,
  first_trial_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_trial_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_blocked BOOLEAN DEFAULT false,
  blocked_at TIMESTAMP WITH TIME ZONE,
  blocked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table to track MAC address trial usage
CREATE TABLE IF NOT EXISTS mac_trial_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mac_address VARCHAR(17) NOT NULL,
  trial_count INTEGER DEFAULT 1,
  first_trial_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_trial_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_blocked BOOLEAN DEFAULT false,
  blocked_at TIMESTAMP WITH TIME ZONE,
  blocked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table to track trial abuse attempts
CREATE TABLE IF NOT EXISTS trial_abuse_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  ip_address INET,
  mac_address VARCHAR(17),
  user_agent TEXT,
  abuse_type VARCHAR(50) NOT NULL, -- 'email_limit', 'ip_limit', 'mac_limit', 'suspicious_pattern'
  trial_count INTEGER,
  blocked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_trials_ip_address ON user_trials(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_trials_mac_address ON user_trials(mac_address);
CREATE INDEX IF NOT EXISTS idx_ip_trial_usage_ip_address ON ip_trial_usage(ip_address);
CREATE INDEX IF NOT EXISTS idx_mac_trial_usage_mac_address ON mac_trial_usage(mac_address);
CREATE INDEX IF NOT EXISTS idx_trial_abuse_logs_ip_address ON trial_abuse_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_trial_abuse_logs_mac_address ON trial_abuse_logs(mac_address);
CREATE INDEX IF NOT EXISTS idx_trial_abuse_logs_email ON trial_abuse_logs(email);

-- Create function to check if IP address can use free trial
CREATE OR REPLACE FUNCTION can_ip_use_free_trial(
  check_ip INET,
  max_trials INTEGER DEFAULT 2
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  is_blocked BOOLEAN;
BEGIN
  -- Check if IP is blocked
  SELECT ip_trial_usage.is_blocked INTO is_blocked
  FROM ip_trial_usage
  WHERE ip_address = check_ip;
  
  IF is_blocked THEN
    RETURN FALSE;
  END IF;
  
  -- Count current trials for this IP
  SELECT COUNT(*) INTO current_count
  FROM user_trials
  WHERE ip_address = check_ip;
  
  -- Return true if under limit
  RETURN current_count < max_trials;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if MAC address can use free trial
CREATE OR REPLACE FUNCTION can_mac_use_free_trial(
  check_mac VARCHAR(17),
  max_trials INTEGER DEFAULT 2
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  is_blocked BOOLEAN;
BEGIN
  -- Check if MAC is blocked
  SELECT mac_trial_usage.is_blocked INTO is_blocked
  FROM mac_trial_usage
  WHERE mac_address = check_mac;
  
  IF is_blocked THEN
    RETURN FALSE;
  END IF;
  
  -- Count current trials for this MAC
  SELECT COUNT(*) INTO current_count
  FROM user_trials
  WHERE mac_address = check_mac;
  
  -- Return true if under limit
  RETURN current_count < max_trials;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if email can use free trial
CREATE OR REPLACE FUNCTION can_email_use_free_trial(
  check_email VARCHAR(255)
)
RETURNS BOOLEAN AS $$
DECLARE
  trial_exists BOOLEAN;
BEGIN
  -- Check if email has already used free trial
  SELECT EXISTS(
    SELECT 1 FROM user_trials ut
    JOIN auth.users u ON ut.user_id = u.id
    WHERE u.email = check_email
  ) INTO trial_exists;
  
  RETURN NOT trial_exists;
END;
$$ LANGUAGE plpgsql;

-- Create function to record trial usage
CREATE OR REPLACE FUNCTION record_trial_usage(
  p_user_id UUID,
  p_ip_address INET,
  p_mac_address VARCHAR(17),
  p_user_agent TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Insert trial record
  INSERT INTO user_trials (
    user_id,
    plan_id,
    started_at,
    expires_at,
    status,
    ip_address,
    mac_address,
    user_agent
  ) VALUES (
    p_user_id,
    'pro',
    NOW(),
    NOW() + INTERVAL '3 days',
    'active',
    p_ip_address,
    p_mac_address,
    p_user_agent
  );
  
  -- Update IP trial usage
  INSERT INTO ip_trial_usage (ip_address, trial_count, last_trial_at)
  VALUES (p_ip_address, 1, NOW())
  ON CONFLICT (ip_address) 
  DO UPDATE SET 
    trial_count = ip_trial_usage.trial_count + 1,
    last_trial_at = NOW(),
    updated_at = NOW();
  
  -- Update MAC trial usage
  INSERT INTO mac_trial_usage (mac_address, trial_count, last_trial_at)
  VALUES (p_mac_address, 1, NOW())
  ON CONFLICT (mac_address) 
  DO UPDATE SET 
    trial_count = mac_trial_usage.trial_count + 1,
    last_trial_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to block IP address
CREATE OR REPLACE FUNCTION block_ip_address(
  p_ip_address INET,
  p_reason TEXT DEFAULT 'Free trial abuse detected'
)
RETURNS VOID AS $$
BEGIN
  UPDATE ip_trial_usage 
  SET 
    is_blocked = true,
    blocked_at = NOW(),
    blocked_reason = p_reason,
    updated_at = NOW()
  WHERE ip_address = p_ip_address;
  
  -- Insert record if doesn't exist
  INSERT INTO ip_trial_usage (ip_address, is_blocked, blocked_at, blocked_reason)
  VALUES (p_ip_address, true, NOW(), p_reason)
  ON CONFLICT (ip_address) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create function to block MAC address
CREATE OR REPLACE FUNCTION block_mac_address(
  p_mac_address VARCHAR(17),
  p_reason TEXT DEFAULT 'Free trial abuse detected'
)
RETURNS VOID AS $$
BEGIN
  UPDATE mac_trial_usage 
  SET 
    is_blocked = true,
    blocked_at = NOW(),
    blocked_reason = p_reason,
    updated_at = NOW()
  WHERE mac_address = p_mac_address;
  
  -- Insert record if doesn't exist
  INSERT INTO mac_trial_usage (mac_address, is_blocked, blocked_at, blocked_reason)
  VALUES (p_mac_address, true, NOW(), p_reason)
  ON CONFLICT (mac_address) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create function to log abuse attempt
CREATE OR REPLACE FUNCTION log_trial_abuse(
  p_user_id UUID,
  p_email VARCHAR(255),
  p_ip_address INET,
  p_mac_address VARCHAR(17),
  p_user_agent TEXT,
  p_abuse_type VARCHAR(50),
  p_trial_count INTEGER,
  p_blocked_reason TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO trial_abuse_logs (
    user_id,
    email,
    ip_address,
    mac_address,
    user_agent,
    abuse_type,
    trial_count,
    blocked_reason
  ) VALUES (
    p_user_id,
    p_email,
    p_ip_address,
    p_mac_address,
    p_user_agent,
    p_abuse_type,
    p_trial_count,
    p_blocked_reason
  );
END;
$$ LANGUAGE plpgsql;

-- Create comprehensive function to check all trial eligibility
CREATE OR REPLACE FUNCTION check_trial_eligibility(
  p_user_id UUID,
  p_email VARCHAR(255),
  p_ip_address INET,
  p_mac_address VARCHAR(17),
  p_user_agent TEXT
)
RETURNS TABLE (
  is_eligible BOOLEAN,
  reason TEXT,
  abuse_type VARCHAR(50)
) AS $$
DECLARE
  email_eligible BOOLEAN;
  ip_eligible BOOLEAN;
  mac_eligible BOOLEAN;
  ip_count INTEGER;
  mac_count INTEGER;
BEGIN
  -- Check email eligibility
  SELECT can_email_use_free_trial(p_email) INTO email_eligible;
  IF NOT email_eligible THEN
    RETURN QUERY SELECT FALSE, 'Email has already used free trial', 'email_limit';
  END IF;
  
  -- Check IP eligibility
  SELECT can_ip_use_free_trial(p_ip_address) INTO ip_eligible;
  IF NOT ip_eligible THEN
    SELECT COUNT(*) INTO ip_count FROM user_trials WHERE ip_address = p_ip_address;
    RETURN QUERY SELECT FALSE, 'IP address has exceeded free trial limit', 'ip_limit';
  END IF;
  
  -- Check MAC eligibility
  SELECT can_mac_use_free_trial(p_mac_address) INTO mac_eligible;
  IF NOT mac_eligible THEN
    SELECT COUNT(*) INTO mac_count FROM user_trials WHERE mac_address = p_mac_address;
    RETURN QUERY SELECT FALSE, 'MAC address has exceeded free trial limit', 'mac_limit';
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT TRUE, 'Eligible for free trial', 'eligible';
END;
$$ LANGUAGE plpgsql;

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_trial_usage_unique ON ip_trial_usage(ip_address);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mac_trial_usage_unique ON mac_trial_usage(mac_address);

-- Enable Row Level Security
ALTER TABLE ip_trial_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE mac_trial_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_abuse_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can view IP trial usage" ON ip_trial_usage
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Admins can view MAC trial usage" ON mac_trial_usage
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Admins can view trial abuse logs" ON trial_abuse_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- Create triggers for updated_at
CREATE TRIGGER update_ip_trial_usage_updated_at 
    BEFORE UPDATE ON ip_trial_usage 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mac_trial_usage_updated_at 
    BEFORE UPDATE ON mac_trial_usage 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
