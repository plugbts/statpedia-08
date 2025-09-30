-- Karma Tutorial Tracking Migration
-- This migration adds karma tutorial tracking to user preferences

-- Add karma_tutorial_seen field to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS karma_tutorial_seen BOOLEAN DEFAULT false;

-- Update existing users to not have seen the tutorial
UPDATE user_preferences 
SET karma_tutorial_seen = false 
WHERE karma_tutorial_seen IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_karma_tutorial 
ON user_preferences(user_id, karma_tutorial_seen);
