-- Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'free_trial')),
  discount_value INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_trials table
CREATE TABLE IF NOT EXISTS user_trials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create promo_code_usage table
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code VARCHAR(50) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  discount_type VARCHAR(20) NOT NULL,
  discount_value INTEGER NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_user_trials_user_id ON user_trials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trials_status ON user_trials(status);
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_user_id ON promo_code_usage(user_id);
-- Only create index if the column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'promo_code_usage' 
        AND column_name = 'promo_code'
        AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_promo_code_usage_promo_code ON promo_code_usage(promo_code);
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for promo_codes (admin only)
CREATE POLICY "Only admins can manage promo codes" ON promo_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.email = 'plug@statpedia.com' 
        OR auth.users.email LIKE '%admin%'
        OR auth.users.email LIKE '%mod%'
      )
    )
  );

-- Create policies for user_trials (users can read their own)
CREATE POLICY "Users can view their own trials" ON user_trials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trials" ON user_trials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all trials" ON user_trials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.email = 'plug@statpedia.com' 
        OR auth.users.email LIKE '%admin%'
        OR auth.users.email LIKE '%mod%'
      )
    )
  );

-- Create policies for promo_code_usage (users can read their own, admins can read all)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'promo_code_usage' 
        AND policyname = 'Users can view their own promo usage'
    ) THEN
        CREATE POLICY "Users can view their own promo usage" ON promo_code_usage
          FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'promo_code_usage' 
        AND policyname = 'Users can create their own promo usage'
    ) THEN
        CREATE POLICY "Users can create their own promo usage" ON promo_code_usage
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'promo_code_usage' 
        AND policyname = 'Admins can view all promo usage'
    ) THEN
        CREATE POLICY "Admins can view all promo usage" ON promo_code_usage
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM auth.users 
              WHERE auth.users.id = auth.uid() 
              AND (
                auth.users.email = 'plug@statpedia.com' 
                OR auth.users.email LIKE '%admin%'
                OR auth.users.email LIKE '%mod%'
              )
            )
          );
    END IF;
END $$;

-- Insert some sample promo codes
INSERT INTO promo_codes (code, description, discount_type, discount_value, expires_at) VALUES
('WELCOME20', 'Welcome discount for new users', 'percentage', 20, NOW() + INTERVAL '30 days'),
('TRIAL3', '3-day free trial for new users', 'free_trial', 3, NOW() + INTERVAL '60 days'),
('SAVE50', '50% off first month', 'percentage', 50, NOW() + INTERVAL '15 days')
ON CONFLICT (code) DO NOTHING;
