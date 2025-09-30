-- User Banners Migration
-- This migration adds banner functionality to user profiles

-- Add banner fields to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS banner_position TEXT DEFAULT 'center', -- 'top', 'center', 'bottom'
ADD COLUMN IF NOT EXISTS banner_blur INTEGER DEFAULT 0, -- 0-20 blur effect
ADD COLUMN IF NOT EXISTS banner_brightness NUMERIC(3,2) DEFAULT 1.0, -- 0.1-2.0 brightness
ADD COLUMN IF NOT EXISTS banner_contrast NUMERIC(3,2) DEFAULT 1.0, -- 0.1-2.0 contrast
ADD COLUMN IF NOT EXISTS banner_saturation NUMERIC(3,2) DEFAULT 1.0; -- 0.1-2.0 saturation

-- Create banner_presets table for predefined banner options
CREATE TABLE IF NOT EXISTS banner_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL, -- 'sports', 'abstract', 'nature', 'gradient', 'solid'
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some default banner presets
INSERT INTO banner_presets (name, description, image_url, category, is_premium) VALUES
-- Sports banners
('Football Field', 'Green football field background', 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&h=300&fit=crop', 'sports', false),
('Basketball Court', 'Orange basketball court background', 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&h=300&fit=crop', 'sports', false),
('Baseball Diamond', 'Baseball field background', 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=1200&h=300&fit=crop', 'sports', false),
('Hockey Rink', 'Ice hockey rink background', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&h=300&fit=crop', 'sports', false),

-- Abstract banners
('Blue Gradient', 'Smooth blue gradient', 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=300&fit=crop', 'abstract', false),
('Purple Waves', 'Purple wave pattern', 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=1200&h=300&fit=crop', 'abstract', false),
('Geometric', 'Modern geometric pattern', 'https://images.unsplash.com/photo-1557683304-673a23048d34?w=1200&h=300&fit=crop', 'abstract', false),

-- Nature banners
('Mountain Sunset', 'Beautiful mountain sunset', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=300&fit=crop', 'nature', false),
('Ocean Waves', 'Calm ocean waves', 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&h=300&fit=crop', 'nature', false),
('Forest Path', 'Peaceful forest path', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=300&fit=crop', 'nature', false),

-- Premium banners
('Golden Sports', 'Premium golden sports theme', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=300&fit=crop', 'sports', true),
('Neon Abstract', 'Premium neon abstract design', 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=300&fit=crop', 'abstract', true),
('Space Galaxy', 'Premium space galaxy theme', 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=1200&h=300&fit=crop', 'abstract', true);

-- Create user_banner_history table to track banner changes
CREATE TABLE IF NOT EXISTS user_banner_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  banner_url TEXT NOT NULL,
  banner_position TEXT DEFAULT 'center',
  banner_blur INTEGER DEFAULT 0,
  banner_brightness NUMERIC(3,2) DEFAULT 1.0,
  banner_contrast NUMERIC(3,2) DEFAULT 1.0,
  banner_saturation NUMERIC(3,2) DEFAULT 1.0,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_banner_presets_category ON banner_presets(category);
CREATE INDEX IF NOT EXISTS idx_banner_presets_is_premium ON banner_presets(is_premium);
CREATE INDEX IF NOT EXISTS idx_user_banner_history_user_id ON user_banner_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_banner_history_changed_at ON user_banner_history(changed_at DESC);

-- Enable Row Level Security
ALTER TABLE banner_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_banner_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for banner_presets
CREATE POLICY "Anyone can view banner presets" ON banner_presets FOR SELECT USING (true);

-- RLS Policies for user_banner_history
CREATE POLICY "Users can view their own banner history" ON user_banner_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own banner history" ON user_banner_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to save banner history
CREATE OR REPLACE FUNCTION save_banner_history(
  p_user_id UUID,
  p_banner_url TEXT,
  p_banner_position TEXT DEFAULT 'center',
  p_banner_blur INTEGER DEFAULT 0,
  p_banner_brightness NUMERIC(3,2) DEFAULT 1.0,
  p_banner_contrast NUMERIC(3,2) DEFAULT 1.0,
  p_banner_saturation NUMERIC(3,2) DEFAULT 1.0
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_banner_history (
    user_id, banner_url, banner_position, banner_blur,
    banner_brightness, banner_contrast, banner_saturation
  ) VALUES (
    p_user_id, p_banner_url, p_banner_position, p_banner_blur,
    p_banner_brightness, p_banner_contrast, p_banner_saturation
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get banner presets by category
CREATE OR REPLACE FUNCTION get_banner_presets(p_category TEXT DEFAULT NULL, p_include_premium BOOLEAN DEFAULT TRUE)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  image_url TEXT,
  category TEXT,
  is_premium BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id,
    bp.name,
    bp.description,
    bp.image_url,
    bp.category,
    bp.is_premium,
    bp.created_at
  FROM banner_presets bp
  WHERE (p_category IS NULL OR bp.category = p_category)
    AND (p_include_premium OR NOT bp.is_premium)
  ORDER BY bp.is_premium ASC, bp.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get user banner history
CREATE OR REPLACE FUNCTION get_user_banner_history(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  banner_url TEXT,
  banner_position TEXT,
  banner_blur INTEGER,
  banner_brightness NUMERIC(3,2),
  banner_contrast NUMERIC(3,2),
  banner_saturation NUMERIC(3,2),
  changed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ubh.id,
    ubh.banner_url,
    ubh.banner_position,
    ubh.banner_blur,
    ubh.banner_brightness,
    ubh.banner_contrast,
    ubh.banner_saturation,
    ubh.changed_at
  FROM user_banner_history ubh
  WHERE ubh.user_id = p_user_id
  ORDER BY ubh.changed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
