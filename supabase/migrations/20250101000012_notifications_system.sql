-- Notifications System Migration
-- Creates comprehensive notification system for all platform events

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'bet_won', 'bet_lost', 'bet_pending', 'bet_cashed_out',
    'bet_slip_shared', 'bet_slip_tailed', 'bet_slip_liked', 'bet_slip_commented',
    'friend_request', 'friend_accepted', 'friend_removed',
    'post_liked', 'post_commented', 'post_shared',
    'prediction_correct', 'prediction_incorrect', 'prediction_updated',
    'subscription_expired', 'subscription_renewed', 'trial_ending',
    'achievement_unlocked', 'milestone_reached',
    'system_maintenance', 'feature_announcement', 'security_alert'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data specific to notification type
  is_read BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT DEFAULT 'system' CHECK (category IN ('social', 'betting', 'system', 'achievement')),
  action_url TEXT, -- URL to navigate to when clicked
  icon TEXT, -- Icon emoji or name for display
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications for users" ON notifications
  FOR INSERT WITH CHECK (true);

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  -- Delete read notifications older than 30 days
  DELETE FROM notifications 
  WHERE is_read = true 
  AND created_at < NOW() - INTERVAL '30 days';
  
  -- Delete all notifications older than 90 days (regardless of read status)
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Function to get unread count for a user
CREATE OR REPLACE FUNCTION get_user_unread_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM notifications
  WHERE user_id = p_user_id
  AND is_read = false;
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = true, updated_at = NOW()
  WHERE user_id = p_user_id
  AND is_read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL,
  p_priority TEXT DEFAULT 'medium',
  p_category TEXT DEFAULT 'system',
  p_action_url TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id, type, title, message, data, priority, category, action_url, icon
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_data, p_priority, p_category, p_action_url, p_icon
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get notifications with pagination
CREATE OR REPLACE FUNCTION get_user_notifications(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_category TEXT DEFAULT NULL,
  p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  data JSONB,
  is_read BOOLEAN,
  priority TEXT,
  category TEXT,
  action_url TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.data,
    n.is_read,
    n.priority,
    n.category,
    n.action_url,
    n.icon,
    n.created_at
  FROM notifications n
  WHERE n.user_id = p_user_id
  AND (p_category IS NULL OR n.category = p_category)
  AND (NOT p_unread_only OR n.is_read = false)
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notification_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

-- Insert some sample notifications for testing
INSERT INTO notifications (user_id, type, title, message, priority, category, icon, action_url) VALUES
  (auth.uid(), 'feature_announcement', '🎉 New Feature: Bet Slip Sharing', 'You can now share your bet slips with the community!', 'high', 'system', '📢', '/social'),
  (auth.uid(), 'achievement_unlocked', '🏆 First Bet Placed', 'Congratulations on placing your first bet!', 'high', 'achievement', '🏆', '/bet-tracking'),
  (auth.uid(), 'system_maintenance', '🔧 Scheduled Maintenance', 'We will be performing maintenance tonight from 2-4 AM EST.', 'medium', 'system', '🔧', NULL);

-- Create a view for notification statistics
CREATE OR REPLACE VIEW notification_stats AS
SELECT 
  user_id,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE is_read = false) as unread_count,
  COUNT(*) FILTER (WHERE category = 'betting') as betting_notifications,
  COUNT(*) FILTER (WHERE category = 'social') as social_notifications,
  COUNT(*) FILTER (WHERE category = 'system') as system_notifications,
  COUNT(*) FILTER (WHERE category = 'achievement') as achievement_notifications,
  COUNT(*) FILTER (WHERE priority = 'high') as high_priority_count,
  MAX(created_at) as last_notification_at
FROM notifications
GROUP BY user_id;

-- Grant permissions
GRANT SELECT ON notification_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_unread_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notifications(UUID, INTEGER, INTEGER, TEXT, BOOLEAN) TO authenticated;
