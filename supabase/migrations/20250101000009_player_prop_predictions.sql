-- Player Prop Predictions Migration
-- This migration creates tables for player prop prediction polls and results

-- Player prop predictions table
CREATE TABLE IF NOT EXISTS player_prop_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prop_id TEXT NOT NULL,
  prop_title TEXT NOT NULL,
  prop_value DECIMAL(10,2) NOT NULL,
  prop_type TEXT NOT NULL, -- 'points', 'rebounds', 'assists', etc.
  player_name TEXT NOT NULL,
  team TEXT NOT NULL,
  opponent TEXT NOT NULL,
  game_date TIMESTAMP WITH TIME ZONE NOT NULL,
  game_status TEXT DEFAULT 'scheduled', -- 'scheduled', 'live', 'final'
  actual_result DECIMAL(10,2), -- The actual stat achieved
  over_votes INTEGER DEFAULT 0,
  under_votes INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User predictions table
CREATE TABLE IF NOT EXISTS user_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_id UUID NOT NULL REFERENCES player_prop_predictions(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL, -- 'over' or 'under'
  confidence_level INTEGER DEFAULT 1, -- 1-5 scale
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, prediction_id)
);

-- Prediction results table
CREATE TABLE IF NOT EXISTS prediction_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id UUID NOT NULL REFERENCES player_prop_predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL, -- 'over' or 'under'
  actual_result DECIMAL(10,2) NOT NULL,
  prop_value DECIMAL(10,2) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  karma_change INTEGER NOT NULL DEFAULT 0, -- Karma gained/lost from this prediction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User prediction statistics table
CREATE TABLE IF NOT EXISTS user_prediction_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  win_percentage DECIMAL(5,2) DEFAULT 0.00,
  roi_percentage DECIMAL(5,2) DEFAULT 0.00,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- User privacy settings table
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hide_roi BOOLEAN DEFAULT false,
  hide_prediction_stats BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_prop_predictions_prop_id ON player_prop_predictions(prop_id);
CREATE INDEX IF NOT EXISTS idx_player_prop_predictions_game_date ON player_prop_predictions(game_date);
CREATE INDEX IF NOT EXISTS idx_user_predictions_user_id ON user_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_predictions_prediction_id ON user_predictions(prediction_id);
CREATE INDEX IF NOT EXISTS idx_prediction_results_user_id ON prediction_results(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_results_prediction_id ON prediction_results(prediction_id);
CREATE INDEX IF NOT EXISTS idx_user_prediction_stats_user_id ON user_prediction_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_user_id ON user_privacy_settings(user_id);

-- Function to update prediction votes
CREATE OR REPLACE FUNCTION update_prediction_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment vote count
    UPDATE player_prop_predictions 
    SET 
      over_votes = CASE WHEN NEW.prediction_type = 'over' THEN over_votes + 1 ELSE over_votes END,
      under_votes = CASE WHEN NEW.prediction_type = 'under' THEN under_votes + 1 ELSE under_votes END,
      total_votes = total_votes + 1,
      updated_at = NOW()
    WHERE id = NEW.prediction_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle vote change
    UPDATE player_prop_predictions 
    SET 
      over_votes = CASE 
        WHEN OLD.prediction_type = 'over' AND NEW.prediction_type = 'under' THEN over_votes - 1
        WHEN OLD.prediction_type = 'under' AND NEW.prediction_type = 'over' THEN over_votes + 1
        ELSE over_votes
      END,
      under_votes = CASE 
        WHEN OLD.prediction_type = 'under' AND NEW.prediction_type = 'over' THEN under_votes - 1
        WHEN OLD.prediction_type = 'over' AND NEW.prediction_type = 'under' THEN under_votes + 1
        ELSE under_votes
      END,
      updated_at = NOW()
    WHERE id = NEW.prediction_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement vote count
    UPDATE player_prop_predictions 
    SET 
      over_votes = CASE WHEN OLD.prediction_type = 'over' THEN over_votes - 1 ELSE over_votes END,
      under_votes = CASE WHEN OLD.prediction_type = 'under' THEN under_votes - 1 ELSE over_votes END,
      total_votes = total_votes - 1,
      updated_at = NOW()
    WHERE id = OLD.prediction_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating votes
CREATE TRIGGER trigger_update_prediction_votes
  AFTER INSERT OR UPDATE OR DELETE ON user_predictions
  FOR EACH ROW EXECUTE FUNCTION update_prediction_votes();

-- Function to calculate user prediction statistics
CREATE OR REPLACE FUNCTION calculate_user_prediction_stats(user_uuid UUID)
RETURNS TABLE(
  total_predictions INTEGER,
  correct_predictions INTEGER,
  win_percentage DECIMAL(5,2),
  roi_percentage DECIMAL(5,2)
) AS $$
DECLARE
  total_preds INTEGER;
  correct_preds INTEGER;
  win_pct DECIMAL(5,2);
  roi_pct DECIMAL(5,2);
BEGIN
  -- Count total predictions
  SELECT COUNT(*) INTO total_preds
  FROM user_predictions up
  JOIN player_prop_predictions ppp ON up.prediction_id = ppp.id
  WHERE up.user_id = user_uuid AND ppp.game_status = 'final';
  
  -- Count correct predictions
  SELECT COUNT(*) INTO correct_preds
  FROM user_predictions up
  JOIN player_prop_predictions ppp ON up.prediction_id = ppp.id
  WHERE up.user_id = user_uuid 
    AND ppp.game_status = 'final'
    AND ppp.actual_result IS NOT NULL
    AND (
      (up.prediction_type = 'over' AND ppp.actual_result > ppp.prop_value) OR
      (up.prediction_type = 'under' AND ppp.actual_result < ppp.prop_value)
    );
  
  -- Calculate win percentage
  IF total_preds > 0 THEN
    win_pct := (correct_preds::DECIMAL / total_preds::DECIMAL) * 100;
  ELSE
    win_pct := 0.00;
  END IF;
  
  -- Calculate ROI (simplified - could be enhanced with actual betting odds)
  roi_pct := win_pct - 50.00; -- Simple calculation, could be more sophisticated
  
  RETURN QUERY SELECT total_preds, correct_preds, win_pct, roi_pct;
END;
$$ LANGUAGE plpgsql;

-- Function to update user prediction stats
CREATE OR REPLACE FUNCTION update_user_prediction_stats(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  stats RECORD;
BEGIN
  SELECT * INTO stats FROM calculate_user_prediction_stats(user_uuid);
  
  INSERT INTO user_prediction_stats (user_id, total_predictions, correct_predictions, win_percentage, roi_percentage, last_updated)
  VALUES (user_uuid, stats.total_predictions, stats.correct_predictions, stats.win_percentage, stats.roi_percentage, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_predictions = stats.total_predictions,
    correct_predictions = stats.correct_predictions,
    win_percentage = stats.win_percentage,
    roi_percentage = stats.roi_percentage,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to calculate karma change for a prediction
CREATE OR REPLACE FUNCTION calculate_prediction_karma(
  is_correct BOOLEAN,
  confidence_level INTEGER,
  total_votes INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  base_karma INTEGER;
  confidence_multiplier DECIMAL(3,2);
  participation_bonus INTEGER;
BEGIN
  -- Base karma for correct/incorrect prediction
  base_karma := CASE WHEN is_correct THEN 2 ELSE -1 END;
  
  -- Confidence level multiplier (1-5 scale)
  confidence_multiplier := 0.5 + (confidence_level * 0.1); -- 0.6 to 1.0
  
  -- Participation bonus for high-engagement predictions
  participation_bonus := CASE 
    WHEN total_votes >= 100 THEN 1
    WHEN total_votes >= 50 THEN 0
    ELSE -1
  END;
  
  -- Calculate final karma change
  RETURN ROUND(base_karma * confidence_multiplier) + participation_bonus;
END;
$$ LANGUAGE plpgsql;

-- Function to process game results and update predictions
CREATE OR REPLACE FUNCTION process_game_results(
  prediction_uuid UUID,
  actual_stat DECIMAL(10,2)
)
RETURNS VOID AS $$
DECLARE
  pred RECORD;
  user_pred RECORD;
  karma_change INTEGER;
  is_correct BOOLEAN;
BEGIN
  -- Update the prediction with actual result
  UPDATE player_prop_predictions 
  SET actual_result = actual_stat, game_status = 'final', updated_at = NOW()
  WHERE id = prediction_uuid;
  
  -- Get prediction details
  SELECT * INTO pred FROM player_prop_predictions WHERE id = prediction_uuid;
  
  -- Process each user's prediction
  FOR user_pred IN 
    SELECT up.*, ppp.prop_value
    FROM user_predictions up
    JOIN player_prop_predictions ppp ON up.prediction_id = ppp.id
    WHERE up.prediction_id = prediction_uuid
  LOOP
    -- Determine if prediction was correct
    is_correct := CASE 
      WHEN user_pred.prediction_type = 'over' AND actual_stat > user_pred.prop_value THEN true
      WHEN user_pred.prediction_type = 'under' AND actual_stat < user_pred.prop_value THEN true
      ELSE false
    END;
    
    -- Calculate karma change
    karma_change := calculate_prediction_karma(
      is_correct, 
      user_pred.confidence_level, 
      pred.total_votes
    );
    
    -- Insert prediction result with karma change
    INSERT INTO prediction_results (
      prediction_id, user_id, prediction_type, actual_result, prop_value, is_correct, karma_change
    ) VALUES (
      prediction_uuid,
      user_pred.user_id,
      user_pred.prediction_type,
      actual_stat,
      user_pred.prop_value,
      is_correct,
      karma_change
    );
    
    -- Update user karma in user_profiles
    UPDATE user_profiles 
    SET karma = karma + karma_change,
        updated_at = NOW()
    WHERE user_id = user_pred.user_id;
    
    -- Record karma change in karma_history
    INSERT INTO karma_history (
      user_id, 
      karma_change, 
      reason, 
      source_type, 
      source_id
    ) VALUES (
      user_pred.user_id,
      karma_change,
      CASE 
        WHEN is_correct THEN 'Correct prediction'
        ELSE 'Incorrect prediction'
      END,
      'prediction',
      prediction_uuid
    );
    
    -- Update user stats
    PERFORM update_user_prediction_stats(user_pred.user_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security Policies
ALTER TABLE player_prop_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_prediction_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Policies for player_prop_predictions
CREATE POLICY "Anyone can view predictions" ON player_prop_predictions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create predictions" ON player_prop_predictions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update predictions" ON player_prop_predictions
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policies for user_predictions
CREATE POLICY "Users can view their own predictions" ON user_predictions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own predictions" ON user_predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own predictions" ON user_predictions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own predictions" ON user_predictions
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for prediction_results
CREATE POLICY "Users can view their own results" ON prediction_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create results" ON prediction_results
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policies for user_prediction_stats
CREATE POLICY "Anyone can view prediction stats" ON user_prediction_stats
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own stats" ON user_prediction_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert stats" ON user_prediction_stats
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policies for user_privacy_settings
CREATE POLICY "Users can view their own privacy settings" ON user_privacy_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings" ON user_privacy_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own privacy settings" ON user_privacy_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
