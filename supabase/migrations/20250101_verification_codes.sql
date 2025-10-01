-- Create verification_codes table for email verification
CREATE TABLE IF NOT EXISTS verification_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('password_change', 'email_change', 'security')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_purpose ON verification_codes(purpose);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_codes_used ON verification_codes(used);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_verification_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_verification_codes_updated_at ON verification_codes;
CREATE TRIGGER trigger_update_verification_codes_updated_at
    BEFORE UPDATE ON verification_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_verification_codes_updated_at();

-- Create function to clean up expired codes (call this periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM verification_codes 
    WHERE expires_at < NOW() - INTERVAL '1 day';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON verification_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON verification_codes TO service_role;

-- Enable RLS (Row Level Security)
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own verification codes" ON verification_codes
    FOR SELECT USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Users can insert their own verification codes" ON verification_codes
    FOR INSERT WITH CHECK (email = auth.jwt() ->> 'email');

CREATE POLICY "Users can update their own verification codes" ON verification_codes
    FOR UPDATE USING (email = auth.jwt() ->> 'email');

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role can do everything" ON verification_codes
    FOR ALL USING (auth.role() = 'service_role');
