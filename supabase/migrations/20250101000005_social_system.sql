-- Social System Migration
-- This migration creates tables for social features including posts, comments, karma, and user profiles

-- Create user_profiles table for extended user information
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  karma INTEGER DEFAULT 0,
  roi_percentage NUMERIC(5, 2) DEFAULT 0,
  total_posts INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  is_muted BOOLEAN DEFAULT FALSE,
  muted_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table for user thoughts (max 150 characters)
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) <= 150),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  net_score INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comments table for player props and predictions
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_type VARCHAR(20) NOT NULL, -- 'player_prop', 'prediction', 'post'
  parent_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (LENGTH(content) <= 500),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  net_score INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table for posts and comments
CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL, -- 'post', 'comment'
  target_id UUID NOT NULL,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id)
);

-- Create friends table for user relationships
CREATE TABLE IF NOT EXISTS friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, friend_id)
);

-- Create typing_indicators table for live typing
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL, -- 'post', 'comment'
  target_id UUID NOT NULL,
  is_typing BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create karma_history table for tracking karma changes
CREATE TABLE IF NOT EXISTS karma_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  change_amount INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL, -- 'upvote', 'downvote', 'admin_adjustment', 'post_created', etc.
  source_type VARCHAR(20), -- 'post', 'comment', 'admin'
  source_id UUID,
  admin_id UUID REFERENCES auth.users(id), -- If changed by admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_karma ON user_profiles(karma DESC);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_net_score ON posts(net_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_deleted ON posts(is_deleted);

CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_net_score ON comments(net_score DESC);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_is_deleted ON comments(is_deleted);

CREATE INDEX IF NOT EXISTS idx_votes_user_target ON votes(user_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_votes_target ON votes(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

CREATE INDEX IF NOT EXISTS idx_typing_indicators_target ON typing_indicators(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_user_id ON typing_indicators(user_id);

CREATE INDEX IF NOT EXISTS idx_karma_history_user_id ON karma_history(user_id);
CREATE INDEX IF NOT EXISTS idx_karma_history_created_at ON karma_history(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at 
    BEFORE UPDATE ON posts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at 
    BEFORE UPDATE ON comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friends_updated_at 
    BEFORE UPDATE ON friends 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update karma when votes change
CREATE OR REPLACE FUNCTION update_karma_on_vote()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    karma_change INTEGER;
BEGIN
    -- Get the user_id of the target (post or comment author)
    IF NEW.target_type = 'post' THEN
        SELECT user_id INTO target_user_id FROM posts WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'comment' THEN
        SELECT user_id INTO target_user_id FROM comments WHERE id = NEW.target_id;
    END IF;

    -- Calculate karma change
    IF NEW.vote_type = 'upvote' THEN
        karma_change := 1;
    ELSE
        karma_change := -1;
    END IF;

    -- Update user's karma
    UPDATE user_profiles 
    SET karma = karma + karma_change
    WHERE user_id = target_user_id;

    -- Record karma change
    INSERT INTO karma_history (user_id, change_amount, reason, source_type, source_id)
    VALUES (target_user_id, karma_change, NEW.vote_type, NEW.target_type, NEW.target_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update karma when vote is deleted
CREATE OR REPLACE FUNCTION update_karma_on_vote_delete()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    karma_change INTEGER;
BEGIN
    -- Get the user_id of the target (post or comment author)
    IF OLD.target_type = 'post' THEN
        SELECT user_id INTO target_user_id FROM posts WHERE id = OLD.target_id;
    ELSIF OLD.target_type = 'comment' THEN
        SELECT user_id INTO target_user_id FROM comments WHERE id = OLD.target_id;
    END IF;

    -- Calculate karma change (reverse the vote)
    IF OLD.vote_type = 'upvote' THEN
        karma_change := -1;
    ELSE
        karma_change := 1;
    END IF;

    -- Update user's karma
    UPDATE user_profiles 
    SET karma = karma + karma_change
    WHERE user_id = target_user_id;

    -- Record karma change
    INSERT INTO karma_history (user_id, change_amount, reason, source_type, source_id)
    VALUES (target_user_id, karma_change, 'vote_deleted', OLD.target_type, OLD.target_id);

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for karma updates
CREATE TRIGGER update_karma_on_vote_insert
    AFTER INSERT ON votes
    FOR EACH ROW EXECUTE FUNCTION update_karma_on_vote();

CREATE TRIGGER update_karma_on_vote_delete
    AFTER DELETE ON votes
    FOR EACH ROW EXECUTE FUNCTION update_karma_on_vote_delete();

-- Function to update vote counts on posts/comments
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update vote counts
        IF NEW.target_type = 'post' THEN
            UPDATE posts 
            SET 
                upvotes = upvotes + CASE WHEN NEW.vote_type = 'upvote' THEN 1 ELSE 0 END,
                downvotes = downvotes + CASE WHEN NEW.vote_type = 'downvote' THEN 1 ELSE 0 END,
                net_score = net_score + CASE WHEN NEW.vote_type = 'upvote' THEN 1 ELSE -1 END
            WHERE id = NEW.target_id;
        ELSIF NEW.target_type = 'comment' THEN
            UPDATE comments 
            SET 
                upvotes = upvotes + CASE WHEN NEW.vote_type = 'upvote' THEN 1 ELSE 0 END,
                downvotes = downvotes + CASE WHEN NEW.vote_type = 'downvote' THEN 1 ELSE 0 END,
                net_score = net_score + CASE WHEN NEW.vote_type = 'upvote' THEN 1 ELSE -1 END
            WHERE id = NEW.target_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update vote counts
        IF OLD.target_type = 'post' THEN
            UPDATE posts 
            SET 
                upvotes = upvotes - CASE WHEN OLD.vote_type = 'upvote' THEN 1 ELSE 0 END,
                downvotes = downvotes - CASE WHEN OLD.vote_type = 'downvote' THEN 1 ELSE 0 END,
                net_score = net_score - CASE WHEN OLD.vote_type = 'upvote' THEN 1 ELSE -1 END
            WHERE id = OLD.target_id;
        ELSIF OLD.target_type = 'comment' THEN
            UPDATE comments 
            SET 
                upvotes = upvotes - CASE WHEN OLD.vote_type = 'upvote' THEN 1 ELSE 0 END,
                downvotes = downvotes - CASE WHEN OLD.vote_type = 'downvote' THEN 1 ELSE 0 END,
                net_score = net_score - CASE WHEN OLD.vote_type = 'upvote' THEN 1 ELSE -1 END
            WHERE id = OLD.target_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for vote count updates
CREATE TRIGGER update_vote_counts_insert
    AFTER INSERT ON votes
    FOR EACH ROW EXECUTE FUNCTION update_vote_counts();

CREATE TRIGGER update_vote_counts_delete
    AFTER DELETE ON votes
    FOR EACH ROW EXECUTE FUNCTION update_vote_counts();

-- Function to update post/comment counts on user profiles
CREATE OR REPLACE FUNCTION update_user_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE user_profiles 
        SET total_posts = total_posts + 1
        WHERE user_id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_profiles 
        SET total_posts = total_posts - 1
        WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE user_profiles 
        SET total_comments = total_comments + 1
        WHERE user_id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_profiles 
        SET total_comments = total_comments - 1
        WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for user count updates
CREATE TRIGGER update_user_post_counts
    AFTER INSERT OR DELETE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_user_counts();

CREATE TRIGGER update_user_comment_counts
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_user_comment_counts();

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE karma_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for posts
CREATE POLICY "Users can view all posts" ON posts FOR SELECT USING (is_deleted = false);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for comments
CREATE POLICY "Users can view all comments" ON comments FOR SELECT USING (is_deleted = false);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for votes
CREATE POLICY "Users can view all votes" ON votes FOR SELECT USING (true);
CREATE POLICY "Users can create votes" ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own votes" ON votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own votes" ON votes FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for friends
CREATE POLICY "Users can view their own friendships" ON friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can create friendships" ON friends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own friendships" ON friends FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can delete their own friendships" ON friends FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS Policies for typing_indicators
CREATE POLICY "Users can view typing indicators" ON typing_indicators FOR SELECT USING (true);
CREATE POLICY "Users can create typing indicators" ON typing_indicators FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own typing indicators" ON typing_indicators FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own typing indicators" ON typing_indicators FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for karma_history
CREATE POLICY "Users can view their own karma history" ON karma_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all karma history" ON karma_history FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND (role = 'admin' OR role = 'owner')
    )
);

-- Function to clean up old typing indicators
CREATE OR REPLACE FUNCTION cleanup_typing_indicators()
RETURNS VOID AS $$
BEGIN
  DELETE FROM typing_indicators 
  WHERE last_activity < NOW() - INTERVAL '30 seconds';
END;
$$ LANGUAGE plpgsql;

-- Function to get user's ROI from bet tracking
CREATE OR REPLACE FUNCTION get_user_roi(p_user_id UUID)
RETURNS NUMERIC(5, 2) AS $$
DECLARE
    user_roi NUMERIC(5, 2) := 0;
BEGIN
    -- Get ROI from bet tracking if tables exist
    BEGIN
        SELECT COALESCE(roi_percentage, 0) INTO user_roi
        FROM (
            SELECT 
                CASE 
                    WHEN total_wagered > 0 THEN (net_profit / total_wagered) * 100
                    ELSE 0
                END as roi_percentage
            FROM (
                SELECT 
                    COALESCE(SUM(wager_amount), 0) as total_wagered,
                    COALESCE(SUM(result_payout - wager_amount), 0) as net_profit
                FROM user_bets
                WHERE user_id = p_user_id
                  AND bet_status IN ('won', 'lost', 'push')
            ) stats
        ) roi_calc;
    EXCEPTION
        WHEN OTHERS THEN
            user_roi := 0;
    END;
    
    RETURN user_roi;
END;
$$ LANGUAGE plpgsql;

-- Function to update user ROI
CREATE OR REPLACE FUNCTION update_user_roi(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    user_roi NUMERIC(5, 2);
BEGIN
    user_roi := get_user_roi(p_user_id);
    
    UPDATE user_profiles 
    SET roi_percentage = user_roi
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
