-- Fix missing tables and schema issues
-- This migration addresses the 406/400/404 errors by ensuring all required tables exist

-- 1. Fix profiles table - add missing email column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Ensure user_profiles table exists with correct structure
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  karma INTEGER DEFAULT 0,
  roi_percentage DECIMAL(5,2) DEFAULT 0,
  total_posts INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  is_muted BOOLEAN DEFAULT FALSE,
  muted_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  banner_url TEXT,
  banner_position TEXT DEFAULT 'center',
  banner_blur INTEGER DEFAULT 0,
  banner_brightness DECIMAL(3,2) DEFAULT 1.0,
  banner_contrast DECIMAL(3,2) DEFAULT 1.0,
  banner_saturation DECIMAL(3,2) DEFAULT 1.0
);

-- 3. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'bet_won', 'bet_lost', 'bet_placed', 'prediction_correct', 'prediction_incorrect',
    'friend_request', 'friend_accepted', 'post_liked', 'post_commented', 'achievement_unlocked',
    'system_announcement', 'feature_announcement', 'maintenance_notice', 'trial_expiring',
    'subscription_expiring', 'payment_failed', 'payment_success', 'refund_processed'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT DEFAULT 'general' CHECK (category IN ('betting', 'social', 'system', 'achievement', 'general')),
  action_url TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create bet_slip_notifications table
CREATE TABLE IF NOT EXISTS public.bet_slip_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bet_shared', 'bet_tailed', 'bet_liked', 'bet_commented')),
  bet_slip_id UUID NOT NULL,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_karma ON public.user_profiles(karma DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);

CREATE INDEX IF NOT EXISTS idx_bet_slip_notifications_user_id ON public.bet_slip_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_bet_slip_notifications_is_read ON public.bet_slip_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_bet_slip_notifications_created_at ON public.bet_slip_notifications(created_at DESC);

-- 6. Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_slip_notifications ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
CREATE POLICY "Users can view all profiles" ON public.user_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own profile" ON public.user_profiles;
CREATE POLICY "Users can create their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 8. Create RLS policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create notifications for users" ON public.notifications;
CREATE POLICY "System can create notifications for users" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- 9. Create RLS policies for bet_slip_notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.bet_slip_notifications;
CREATE POLICY "Users can view their own notifications" ON public.bet_slip_notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.bet_slip_notifications;
CREATE POLICY "Users can update their own notifications" ON public.bet_slip_notifications
  FOR UPDATE USING (user_id = auth.uid());

-- 10. Create function to update notification timestamps
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_notification_updated_at ON public.notifications;
CREATE TRIGGER trigger_notification_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

DROP TRIGGER IF EXISTS trigger_bet_slip_notification_updated_at ON public.bet_slip_notifications;
CREATE TRIGGER trigger_bet_slip_notification_updated_at
  BEFORE UPDATE ON public.bet_slip_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

-- 12. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bet_slip_notifications TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
