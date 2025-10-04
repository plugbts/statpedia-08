-- Social Recommendations Migration
-- This migration adds interaction tracking and recommendation system

-- Create user_interactions table to track user behavior
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type VARCHAR(20) NOT NULL, -- 'view', 'vote', 'comment', 'share', 'click'
  target_type VARCHAR(20) NOT NULL, -- 'post', 'comment', 'user_profile'
  target_id UUID NOT NULL,
  metadata JSONB, -- Additional data like time spent, scroll position, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_preferences table for storing user interests
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_type VARCHAR(30) NOT NULL, -- 'sport', 'content_type', 'user_affinity'
  preference_value TEXT NOT NULL, -- e.g., 'nfl', 'betting_tips', 'user_123'
  weight NUMERIC(3, 2) DEFAULT 1.0, -- How much this preference matters (0.0 to 1.0)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, preference_type, preference_value)
);

-- Create feed_algorithm_cache table for storing calculated recommendations
CREATE TABLE IF NOT EXISTS feed_algorithm_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  score NUMERIC(10, 6) NOT NULL, -- Algorithm calculated score
  algorithm_version VARCHAR(10) DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_target ON user_interactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON user_interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_type ON user_preferences(preference_type);
CREATE INDEX IF NOT EXISTS idx_user_preferences_value ON user_preferences(preference_value);

CREATE INDEX IF NOT EXISTS idx_feed_algorithm_cache_user_id ON feed_algorithm_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_algorithm_cache_score ON feed_algorithm_cache(score DESC);
CREATE INDEX IF NOT EXISTS idx_feed_algorithm_cache_updated_at ON feed_algorithm_cache(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_algorithm_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_interactions
CREATE POLICY "Users can view their own interactions" ON user_interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own interactions" ON user_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all interactions" ON user_interactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND (role = 'admin' OR role = 'owner')
  )
);

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all preferences" ON user_preferences FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND (role = 'admin' OR role = 'owner')
  )
);

-- RLS Policies for feed_algorithm_cache
CREATE POLICY "Users can view their own cache" ON feed_algorithm_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage cache" ON feed_algorithm_cache FOR ALL USING (true);

-- Function to track user interactions
CREATE OR REPLACE FUNCTION track_user_interaction(
  p_user_id UUID,
  p_interaction_type VARCHAR(20),
  p_target_type VARCHAR(20),
  p_target_id UUID,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_interactions (
    user_id, interaction_type, target_type, target_id, metadata
  ) VALUES (
    p_user_id, p_interaction_type, p_target_type, p_target_id, p_metadata
  );
END;
$$ LANGUAGE plpgsql;

-- Function to update user preferences based on interactions
CREATE OR REPLACE FUNCTION update_user_preferences_from_interactions(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  interaction_record RECORD;
  preference_weight NUMERIC(3, 2);
BEGIN
  -- Process recent interactions (last 30 days)
  FOR interaction_record IN
    SELECT 
      interaction_type,
      target_type,
      target_id,
      COUNT(*) as interaction_count,
      MAX(created_at) as last_interaction
    FROM user_interactions
    WHERE user_id = p_user_id
      AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY interaction_type, target_type, target_id
  LOOP
    -- Calculate weight based on interaction type and frequency
    preference_weight := CASE
      WHEN interaction_record.interaction_type = 'vote' THEN 0.8
      WHEN interaction_record.interaction_type = 'comment' THEN 0.9
      WHEN interaction_record.interaction_type = 'view' THEN 0.3
      WHEN interaction_record.interaction_type = 'share' THEN 1.0
      ELSE 0.5
    END;

    -- Adjust weight based on frequency (more interactions = higher weight)
    preference_weight := LEAST(1.0, preference_weight * (1 + (interaction_record.interaction_count - 1) * 0.1));

    -- Update or insert preference
    IF interaction_record.target_type = 'post' THEN
      -- Extract content preferences from post interactions
      INSERT INTO user_preferences (user_id, preference_type, preference_value, weight)
      VALUES (p_user_id, 'content_engagement', interaction_record.target_id::TEXT, preference_weight)
      ON CONFLICT (user_id, preference_type, preference_value)
      DO UPDATE SET 
        weight = GREATEST(user_preferences.weight, preference_weight),
        updated_at = NOW();
    ELSIF interaction_record.target_type = 'user_profile' THEN
      -- Track user affinity
      INSERT INTO user_preferences (user_id, preference_type, preference_value, weight)
      VALUES (p_user_id, 'user_affinity', interaction_record.target_id::TEXT, preference_weight)
      ON CONFLICT (user_id, preference_type, preference_value)
      DO UPDATE SET 
        weight = GREATEST(user_preferences.weight, preference_weight),
        updated_at = NOW();
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate feed recommendations
CREATE OR REPLACE FUNCTION calculate_feed_recommendations(p_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  post_id UUID,
  score NUMERIC(10, 6),
  reason TEXT
) AS $$
DECLARE
  rec RECORD;
  base_score NUMERIC(10, 6);
  engagement_score NUMERIC(10, 6);
  recency_score NUMERIC(10, 6);
  user_affinity_score NUMERIC(10, 6);
  content_preference_score NUMERIC(10, 6);
  karma_score NUMERIC(10, 6);
  final_score NUMERIC(10, 6);
  reason_text TEXT;
BEGIN
  -- Clear old cache for this user
  DELETE FROM feed_algorithm_cache WHERE user_id = p_user_id;
  
  -- Update user preferences first
  PERFORM update_user_preferences_from_interactions(p_user_id);
  
  -- Calculate recommendations for each post
  FOR rec IN
    SELECT 
      p.id,
      p.user_id as post_author_id,
      p.content,
      p.net_score,
      p.upvotes,
      p.downvotes,
      p.created_at,
      up.karma as author_karma,
      up.roi_percentage as author_roi,
      up.total_posts as author_posts,
      up.total_comments as author_comments
    FROM posts p
    LEFT JOIN user_profiles up ON p.user_id = up.user_id
    WHERE p.is_deleted = false
      AND p.created_at >= NOW() - INTERVAL '7 days' -- Only recent posts
    ORDER BY p.created_at DESC
  LOOP
    base_score := 1.0;
    engagement_score := 0.0;
    recency_score := 0.0;
    user_affinity_score := 0.0;
    content_preference_score := 0.0;
    karma_score := 0.0;
    reason_text := '';
    
    -- 1. Engagement Score (based on post performance)
    engagement_score := CASE
      WHEN rec.net_score > 10 THEN 0.3
      WHEN rec.net_score > 5 THEN 0.2
      WHEN rec.net_score > 0 THEN 0.1
      WHEN rec.net_score = 0 THEN 0.0
      ELSE -0.1
    END;
    
    -- 2. Recency Score (newer posts get higher scores)
    recency_score := CASE
      WHEN rec.created_at >= NOW() - INTERVAL '1 hour' THEN 0.4
      WHEN rec.created_at >= NOW() - INTERVAL '6 hours' THEN 0.3
      WHEN rec.created_at >= NOW() - INTERVAL '1 day' THEN 0.2
      WHEN rec.created_at >= NOW() - INTERVAL '3 days' THEN 0.1
      ELSE 0.0
    END;
    
    -- 3. User Affinity Score (posts from users they interact with)
    SELECT COALESCE(weight, 0) INTO user_affinity_score
    FROM user_preferences
    WHERE user_id = p_user_id
      AND preference_type = 'user_affinity'
      AND preference_value = rec.post_author_id::TEXT;
    
    -- 4. Content Preference Score (based on similar content interactions)
    SELECT COALESCE(AVG(weight), 0) INTO content_preference_score
    FROM user_preferences
    WHERE user_id = p_user_id
      AND preference_type = 'content_engagement'
      AND preference_value IN (
        SELECT id::TEXT FROM posts 
        WHERE user_id = rec.post_author_id 
        AND is_deleted = false
      );
    
    -- 5. Karma Score (posts from high-karma users)
    karma_score := CASE
      WHEN rec.author_karma > 100 THEN 0.2
      WHEN rec.author_karma > 50 THEN 0.15
      WHEN rec.author_karma > 20 THEN 0.1
      WHEN rec.author_karma > 0 THEN 0.05
      ELSE 0.0
    END;
    
    -- 6. ROI Score (posts from users with good ROI)
    IF rec.author_roi > 10 THEN
      karma_score := karma_score + 0.1;
    ELSIF rec.author_roi > 5 THEN
      karma_score := karma_score + 0.05;
    END IF;
    
    -- Calculate final score
    final_score := base_score + engagement_score + recency_score + 
                   (user_affinity_score * 0.3) + (content_preference_score * 0.2) + karma_score;
    
    -- Build reason text
    reason_text := 'Recent post';
    IF engagement_score > 0 THEN
      reason_text := reason_text || ' • High engagement';
    END IF;
    IF user_affinity_score > 0 THEN
      reason_text := reason_text || ' • From user you follow';
    END IF;
    IF rec.author_karma > 50 THEN
      reason_text := reason_text || ' • High karma user';
    END IF;
    IF rec.author_roi > 5 THEN
      reason_text := reason_text || ' • Good ROI user';
    END IF;
    
    -- Insert into cache
    INSERT INTO feed_algorithm_cache (user_id, post_id, score, reason)
    VALUES (p_user_id, rec.id, final_score, reason_text);
    
    -- Return the result
    RETURN QUERY SELECT rec.id, final_score, reason_text;
  END LOOP;
  
  -- Return top recommendations
  RETURN QUERY
  SELECT 
    fac.post_id,
    fac.score,
    fac.reason
  FROM feed_algorithm_cache fac
  WHERE fac.user_id = p_user_id
  ORDER BY fac.score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get personalized feed
CREATE OR REPLACE FUNCTION get_personalized_feed(p_user_id UUID, p_limit INTEGER DEFAULT 20, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  post_id UUID,
  user_id UUID,
  content TEXT,
  upvotes INTEGER,
  downvotes INTEGER,
  net_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  username TEXT,
  display_name TEXT,
  karma INTEGER,
  roi_percentage NUMERIC(5, 2),
  score NUMERIC(10, 6),
  reason TEXT
) AS $$
BEGIN
  -- Calculate recommendations if cache is empty or stale
  IF NOT EXISTS (
    SELECT 1 FROM feed_algorithm_cache 
    WHERE user_id = p_user_id 
    AND updated_at >= NOW() - INTERVAL '1 hour'
  ) THEN
    PERFORM calculate_feed_recommendations(p_user_id, p_limit * 2);
  END IF;
  
  -- Return personalized feed
  RETURN QUERY
  SELECT 
    p.id as post_id,
    p.user_id,
    p.content,
    p.upvotes,
    p.downvotes,
    p.net_score,
    p.created_at,
    up.username,
    up.display_name,
    up.karma,
    up.roi_percentage,
    fac.score,
    fac.reason
  FROM feed_algorithm_cache fac
  JOIN posts p ON fac.post_id = p.id
  JOIN user_profiles up ON p.user_id = up.user_id
  WHERE fac.user_id = p_user_id
    AND p.is_deleted = false
  ORDER BY fac.score DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old interactions and cache
CREATE OR REPLACE FUNCTION cleanup_social_data()
RETURNS VOID AS $$
BEGIN
  -- Clean up old interactions (keep last 90 days)
  DELETE FROM user_interactions 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Clean up old cache entries (keep last 7 days)
  DELETE FROM feed_algorithm_cache 
  WHERE updated_at < NOW() - INTERVAL '7 days';
  
  -- Clean up old preferences with very low weights
  DELETE FROM user_preferences 
  WHERE weight < 0.1 
  AND updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update preferences when interactions are added
CREATE OR REPLACE FUNCTION trigger_update_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Update preferences asynchronously (don't block the insert)
  PERFORM pg_notify('update_preferences', NEW.user_id::TEXT);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_preferences_trigger
  AFTER INSERT ON user_interactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_preferences();
