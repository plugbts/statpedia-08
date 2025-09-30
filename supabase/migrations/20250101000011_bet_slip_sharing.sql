-- Bet Slip Sharing System Migration
-- Creates tables for sharing bet slips and social interactions

-- Shared Bet Slips Table
CREATE TABLE IF NOT EXISTS shared_bet_slips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  title TEXT NOT NULL,
  description TEXT,
  picks JSONB NOT NULL, -- Array of bet slip picks
  total_odds DECIMAL(10,2) NOT NULL,
  potential_payout DECIMAL(10,2) NOT NULL,
  stake DECIMAL(10,2) NOT NULL,
  game_date TIMESTAMP WITH TIME ZONE NOT NULL,
  sport TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  tail_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bet Slip Tails Table (when users copy someone's bet slip)
CREATE TABLE IF NOT EXISTS bet_slip_tails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bet_slip_id UUID NOT NULL REFERENCES shared_bet_slips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  stake DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  tailed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bet Slip Likes Table
CREATE TABLE IF NOT EXISTS bet_slip_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bet_slip_id UUID NOT NULL REFERENCES shared_bet_slips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bet_slip_id, user_id)
);

-- Bet Slip Comments Table
CREATE TABLE IF NOT EXISTS bet_slip_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bet_slip_id UUID NOT NULL REFERENCES shared_bet_slips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bet Slip Notifications Table
CREATE TABLE IF NOT EXISTS bet_slip_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bet_shared', 'bet_tailed', 'bet_liked', 'bet_commented')),
  bet_slip_id UUID NOT NULL REFERENCES shared_bet_slips(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_user_name TEXT NOT NULL,
  actor_user_avatar TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Tailed Picks Table (stores picks that users tailed)
CREATE TABLE IF NOT EXISTS user_tailed_picks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prop_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  prop_type TEXT NOT NULL,
  line DECIMAL(10,2) NOT NULL,
  odds TEXT NOT NULL,
  sport TEXT NOT NULL,
  team TEXT NOT NULL,
  opponent TEXT NOT NULL,
  prediction TEXT NOT NULL CHECK (prediction IN ('over', 'under')),
  confidence DECIMAL(5,2) NOT NULL,
  ev_percentage DECIMAL(5,2) NOT NULL,
  ai_rating INTEGER NOT NULL CHECK (ai_rating >= 1 AND ai_rating <= 5),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shared_bet_slips_user_id ON shared_bet_slips(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_bet_slips_created_at ON shared_bet_slips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_bet_slips_is_public ON shared_bet_slips(is_public);
CREATE INDEX IF NOT EXISTS idx_shared_bet_slips_sport ON shared_bet_slips(sport);

CREATE INDEX IF NOT EXISTS idx_bet_slip_tails_bet_slip_id ON bet_slip_tails(bet_slip_id);
CREATE INDEX IF NOT EXISTS idx_bet_slip_tails_user_id ON bet_slip_tails(user_id);
CREATE INDEX IF NOT EXISTS idx_bet_slip_tails_is_active ON bet_slip_tails(is_active);

CREATE INDEX IF NOT EXISTS idx_bet_slip_likes_bet_slip_id ON bet_slip_likes(bet_slip_id);
CREATE INDEX IF NOT EXISTS idx_bet_slip_likes_user_id ON bet_slip_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_bet_slip_comments_bet_slip_id ON bet_slip_comments(bet_slip_id);
CREATE INDEX IF NOT EXISTS idx_bet_slip_comments_user_id ON bet_slip_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_bet_slip_notifications_user_id ON bet_slip_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_bet_slip_notifications_is_read ON bet_slip_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_bet_slip_notifications_created_at ON bet_slip_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_tailed_picks_user_id ON user_tailed_picks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tailed_picks_added_at ON user_tailed_picks(added_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE shared_bet_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_slip_tails ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_slip_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_slip_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_slip_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tailed_picks ENABLE ROW LEVEL SECURITY;

-- Shared Bet Slips Policies
CREATE POLICY "Users can view public bet slips" ON shared_bet_slips
  FOR SELECT USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can create their own bet slips" ON shared_bet_slips
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own bet slips" ON shared_bet_slips
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own bet slips" ON shared_bet_slips
  FOR DELETE USING (user_id = auth.uid());

-- Bet Slip Tails Policies
CREATE POLICY "Users can view bet slip tails" ON bet_slip_tails
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own tails" ON bet_slip_tails
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tails" ON bet_slip_tails
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own tails" ON bet_slip_tails
  FOR DELETE USING (user_id = auth.uid());

-- Bet Slip Likes Policies
CREATE POLICY "Users can view bet slip likes" ON bet_slip_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own likes" ON bet_slip_likes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own likes" ON bet_slip_likes
  FOR DELETE USING (user_id = auth.uid());

-- Bet Slip Comments Policies
CREATE POLICY "Users can view bet slip comments" ON bet_slip_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own comments" ON bet_slip_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own comments" ON bet_slip_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON bet_slip_comments
  FOR DELETE USING (user_id = auth.uid());

-- Bet Slip Notifications Policies
CREATE POLICY "Users can view their own notifications" ON bet_slip_notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON bet_slip_notifications
  FOR UPDATE USING (user_id = auth.uid());

-- User Tailed Picks Policies
CREATE POLICY "Users can view their own tailed picks" ON user_tailed_picks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own tailed picks" ON user_tailed_picks
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tailed picks" ON user_tailed_picks
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own tailed picks" ON user_tailed_picks
  FOR DELETE USING (user_id = auth.uid());

-- Functions for updating counts
CREATE OR REPLACE FUNCTION update_bet_slip_tail_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shared_bet_slips 
    SET tail_count = tail_count + 1 
    WHERE id = NEW.bet_slip_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shared_bet_slips 
    SET tail_count = GREATEST(tail_count - 1, 0) 
    WHERE id = OLD.bet_slip_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active = false AND NEW.is_active = true THEN
      UPDATE shared_bet_slips 
      SET tail_count = tail_count + 1 
      WHERE id = NEW.bet_slip_id;
    ELSIF OLD.is_active = true AND NEW.is_active = false THEN
      UPDATE shared_bet_slips 
      SET tail_count = GREATEST(tail_count - 1, 0) 
      WHERE id = NEW.bet_slip_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_bet_slip_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shared_bet_slips 
    SET like_count = like_count + 1 
    WHERE id = NEW.bet_slip_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shared_bet_slips 
    SET like_count = GREATEST(like_count - 1, 0) 
    WHERE id = OLD.bet_slip_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_bet_slip_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shared_bet_slips 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.bet_slip_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shared_bet_slips 
    SET comment_count = GREATEST(comment_count - 1, 0) 
    WHERE id = OLD.bet_slip_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic count updates
CREATE TRIGGER trigger_update_tail_count
  AFTER INSERT OR DELETE OR UPDATE ON bet_slip_tails
  FOR EACH ROW EXECUTE FUNCTION update_bet_slip_tail_count();

CREATE TRIGGER trigger_update_like_count
  AFTER INSERT OR DELETE ON bet_slip_likes
  FOR EACH ROW EXECUTE FUNCTION update_bet_slip_like_count();

CREATE TRIGGER trigger_update_comment_count
  AFTER INSERT OR DELETE ON bet_slip_comments
  FOR EACH ROW EXECUTE FUNCTION update_bet_slip_comment_count();

-- Function to clean up old notifications (optional)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM bet_slip_notifications 
  WHERE created_at < NOW() - INTERVAL '30 days' 
  AND is_read = true;
END;
$$ LANGUAGE plpgsql;
