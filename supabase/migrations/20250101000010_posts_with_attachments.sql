-- Posts with Attachments Migration
-- This migration ensures the posts table exists and adds file attachment functionality

-- Create posts table if it doesn't exist
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

-- Create post_attachments table for file attachments
CREATE TABLE IF NOT EXISTS post_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  attachment_type VARCHAR(20) NOT NULL CHECK (attachment_type IN ('image', 'video', 'document')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_is_deleted ON posts(is_deleted);
CREATE INDEX IF NOT EXISTS idx_post_attachments_post_id ON post_attachments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_attachments_user_id ON post_attachments(user_id);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for posts
CREATE POLICY "Users can view all non-deleted posts" ON posts
  FOR SELECT USING (is_deleted = false);

CREATE POLICY "Users can create their own posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for post_attachments
CREATE POLICY "Users can view all attachments" ON post_attachments
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own attachments" ON post_attachments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attachments" ON post_attachments
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update net_score
CREATE OR REPLACE FUNCTION update_post_net_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.net_score = NEW.upvotes - NEW.downvotes;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update net_score
DROP TRIGGER IF EXISTS trigger_update_post_net_score ON posts;
CREATE TRIGGER trigger_update_post_net_score
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_post_net_score();

-- Create function to update user profile post count
CREATE OR REPLACE FUNCTION update_user_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_profiles 
    SET total_posts = total_posts + 1,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true THEN
    UPDATE user_profiles 
    SET total_posts = total_posts - 1,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update user post count
DROP TRIGGER IF EXISTS trigger_update_user_post_count ON posts;
CREATE TRIGGER trigger_update_user_post_count
  AFTER INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_post_count();
