-- Bet Tracking System Migration
-- This migration creates tables for comprehensive sports bet tracking

-- User bankroll management
CREATE TABLE IF NOT EXISTS user_bankrolls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bankroll_name VARCHAR(255) NOT NULL,
  initial_amount DECIMAL(10,2) NOT NULL,
  current_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sportsbook connections
CREATE TABLE IF NOT EXISTS sportsbook_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sportsbook_name VARCHAR(100) NOT NULL, -- 'draftkings', 'fanduel', 'betmgm', 'caesars', 'bet365', etc.
  account_username VARCHAR(255),
  connection_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'connected', 'failed', 'disconnected'
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_frequency VARCHAR(20) DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
  api_credentials JSONB, -- Encrypted API keys/tokens
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual bets tracking
CREATE TABLE IF NOT EXISTS user_bets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bankroll_id UUID REFERENCES user_bankrolls(id) ON DELETE CASCADE,
  sportsbook_id UUID REFERENCES sportsbook_connections(id) ON DELETE SET NULL,
  
  -- Bet details
  bet_type VARCHAR(50) NOT NULL, -- 'single', 'parlay', 'teaser', 'round_robin', 'system'
  bet_category VARCHAR(50) NOT NULL, -- 'moneyline', 'spread', 'total', 'prop', 'futures'
  sport VARCHAR(50) NOT NULL, -- 'nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaab', 'soccer', etc.
  
  -- Bet specifics
  bet_amount DECIMAL(10,2) NOT NULL,
  odds DECIMAL(8,3) NOT NULL, -- American odds format
  potential_payout DECIMAL(10,2) NOT NULL,
  
  -- Game/match details
  game_date TIMESTAMP WITH TIME ZONE NOT NULL,
  home_team VARCHAR(255) NOT NULL,
  away_team VARCHAR(255) NOT NULL,
  bet_selection TEXT NOT NULL, -- What they bet on (e.g., "Chiefs -3.5", "Over 45.5")
  
  -- Status and results
  bet_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'won', 'lost', 'push', 'cancelled'
  actual_payout DECIMAL(10,2) DEFAULT 0,
  settled_at TIMESTAMP WITH TIME ZONE,
  
  -- Statpedia integration
  used_statpedia BOOLEAN DEFAULT false,
  statpedia_prediction_id UUID, -- Reference to prediction used
  confidence_level INTEGER, -- 1-10 confidence in the bet
  
  -- Additional data
  notes TEXT,
  tags TEXT[], -- Array of tags for categorization
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parlay legs (for multi-leg bets)
CREATE TABLE IF NOT EXISTS parlay_legs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bet_id UUID REFERENCES user_bets(id) ON DELETE CASCADE,
  leg_number INTEGER NOT NULL,
  sport VARCHAR(50) NOT NULL,
  game_date TIMESTAMP WITH TIME ZONE NOT NULL,
  home_team VARCHAR(255) NOT NULL,
  away_team VARCHAR(255) NOT NULL,
  bet_selection TEXT NOT NULL,
  odds DECIMAL(8,3) NOT NULL,
  leg_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'won', 'lost', 'push'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly analytics
CREATE TABLE IF NOT EXISTS monthly_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bankroll_id UUID REFERENCES user_bankrolls(id) ON DELETE CASCADE,
  
  -- Time period
  year INTEGER NOT NULL,
  month INTEGER NOT NULL, -- 1-12
  
  -- Betting statistics
  total_bets INTEGER DEFAULT 0,
  won_bets INTEGER DEFAULT 0,
  lost_bets INTEGER DEFAULT 0,
  push_bets INTEGER DEFAULT 0,
  
  -- Financial statistics
  total_wagered DECIMAL(10,2) DEFAULT 0,
  total_won DECIMAL(10,2) DEFAULT 0,
  net_profit DECIMAL(10,2) DEFAULT 0,
  
  -- Performance metrics
  win_percentage DECIMAL(5,2) DEFAULT 0,
  roi_percentage DECIMAL(5,2) DEFAULT 0,
  average_odds DECIMAL(8,3) DEFAULT 0,
  
  -- Statpedia impact
  statpedia_bets INTEGER DEFAULT 0,
  statpedia_wins INTEGER DEFAULT 0,
  statpedia_win_percentage DECIMAL(5,2) DEFAULT 0,
  statpedia_roi DECIMAL(5,2) DEFAULT 0,
  
  -- Comparison metrics
  improvement_percentage DECIMAL(5,2) DEFAULT 0, -- Improvement after using Statpedia
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, bankroll_id, year, month)
);

-- Betting goals and targets
CREATE TABLE IF NOT EXISTS betting_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bankroll_id UUID REFERENCES user_bankrolls(id) ON DELETE CASCADE,
  
  goal_type VARCHAR(50) NOT NULL, -- 'win_percentage', 'roi', 'profit', 'bankroll_growth'
  target_value DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2) DEFAULT 0,
  time_period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_achieved BOOLEAN DEFAULT false,
  achieved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_bankrolls_user_id ON user_bankrolls(user_id);
CREATE INDEX IF NOT EXISTS idx_sportsbook_connections_user_id ON sportsbook_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bets_user_id ON user_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bets_bankroll_id ON user_bets(bankroll_id);
CREATE INDEX IF NOT EXISTS idx_user_bets_sportsbook_id ON user_bets(sportsbook_id);
CREATE INDEX IF NOT EXISTS idx_user_bets_game_date ON user_bets(game_date);
CREATE INDEX IF NOT EXISTS idx_user_bets_bet_status ON user_bets(bet_status);
CREATE INDEX IF NOT EXISTS idx_user_bets_used_statpedia ON user_bets(used_statpedia);
CREATE INDEX IF NOT EXISTS idx_parlay_legs_bet_id ON parlay_legs(bet_id);
CREATE INDEX IF NOT EXISTS idx_monthly_analytics_user_id ON monthly_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_analytics_year_month ON monthly_analytics(year, month);
CREATE INDEX IF NOT EXISTS idx_betting_goals_user_id ON betting_goals(user_id);

-- Create function to calculate monthly analytics
CREATE OR REPLACE FUNCTION calculate_monthly_analytics(
  p_user_id UUID,
  p_bankroll_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS VOID AS $$
DECLARE
  total_bets_count INTEGER;
  won_bets_count INTEGER;
  lost_bets_count INTEGER;
  push_bets_count INTEGER;
  total_wagered_amount DECIMAL(10,2);
  total_won_amount DECIMAL(10,2);
  net_profit_amount DECIMAL(10,2);
  win_percentage DECIMAL(5,2);
  roi_percentage DECIMAL(5,2);
  avg_odds DECIMAL(8,3);
  statpedia_bets_count INTEGER;
  statpedia_wins_count INTEGER;
  statpedia_win_percentage DECIMAL(5,2);
  statpedia_roi DECIMAL(5,2);
  improvement_percentage DECIMAL(5,2);
BEGIN
  -- Calculate basic betting statistics
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN bet_status = 'won' THEN 1 END),
    COUNT(CASE WHEN bet_status = 'lost' THEN 1 END),
    COUNT(CASE WHEN bet_status = 'push' THEN 1 END),
    COALESCE(SUM(bet_amount), 0),
    COALESCE(SUM(CASE WHEN bet_status = 'won' THEN actual_payout ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN bet_status = 'won' THEN actual_payout ELSE 0 END) - SUM(bet_amount), 0),
    COALESCE(AVG(odds), 0)
  INTO 
    total_bets_count,
    won_bets_count,
    lost_bets_count,
    push_bets_count,
    total_wagered_amount,
    total_won_amount,
    net_profit_amount,
    avg_odds
  FROM user_bets
  WHERE user_id = p_user_id
    AND bankroll_id = p_bankroll_id
    AND EXTRACT(YEAR FROM game_date) = p_year
    AND EXTRACT(MONTH FROM game_date) = p_month;
  
  -- Calculate win percentage
  IF total_bets_count > 0 THEN
    win_percentage := (won_bets_count::DECIMAL / total_bets_count) * 100;
  ELSE
    win_percentage := 0;
  END IF;
  
  -- Calculate ROI percentage
  IF total_wagered_amount > 0 THEN
    roi_percentage := (net_profit_amount / total_wagered_amount) * 100;
  ELSE
    roi_percentage := 0;
  END IF;
  
  -- Calculate Statpedia statistics
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN bet_status = 'won' THEN 1 END)
  INTO 
    statpedia_bets_count,
    statpedia_wins_count
  FROM user_bets
  WHERE user_id = p_user_id
    AND bankroll_id = p_bankroll_id
    AND EXTRACT(YEAR FROM game_date) = p_year
    AND EXTRACT(MONTH FROM game_date) = p_month
    AND used_statpedia = true;
  
  -- Calculate Statpedia win percentage
  IF statpedia_bets_count > 0 THEN
    statpedia_win_percentage := (statpedia_wins_count::DECIMAL / statpedia_bets_count) * 100;
  ELSE
    statpedia_win_percentage := 0;
  END IF;
  
  -- Calculate Statpedia ROI (simplified)
  statpedia_roi := statpedia_win_percentage - 50; -- Assuming 50% is break-even
  
  -- Calculate improvement percentage
  IF win_percentage > 0 THEN
    improvement_percentage := statpedia_win_percentage - win_percentage;
  ELSE
    improvement_percentage := 0;
  END IF;
  
  -- Insert or update monthly analytics
  INSERT INTO monthly_analytics (
    user_id,
    bankroll_id,
    year,
    month,
    total_bets,
    won_bets,
    lost_bets,
    push_bets,
    total_wagered,
    total_won,
    net_profit,
    win_percentage,
    roi_percentage,
    average_odds,
    statpedia_bets,
    statpedia_wins,
    statpedia_win_percentage,
    statpedia_roi,
    improvement_percentage
  ) VALUES (
    p_user_id,
    p_bankroll_id,
    p_year,
    p_month,
    total_bets_count,
    won_bets_count,
    lost_bets_count,
    push_bets_count,
    total_wagered_amount,
    total_won_amount,
    net_profit_amount,
    win_percentage,
    roi_percentage,
    avg_odds,
    statpedia_bets_count,
    statpedia_wins_count,
    statpedia_win_percentage,
    statpedia_roi,
    improvement_percentage
  )
  ON CONFLICT (user_id, bankroll_id, year, month)
  DO UPDATE SET
    total_bets = EXCLUDED.total_bets,
    won_bets = EXCLUDED.won_bets,
    lost_bets = EXCLUDED.lost_bets,
    push_bets = EXCLUDED.push_bets,
    total_wagered = EXCLUDED.total_wagered,
    total_won = EXCLUDED.total_won,
    net_profit = EXCLUDED.net_profit,
    win_percentage = EXCLUDED.win_percentage,
    roi_percentage = EXCLUDED.roi_percentage,
    average_odds = EXCLUDED.average_odds,
    statpedia_bets = EXCLUDED.statpedia_bets,
    statpedia_wins = EXCLUDED.statpedia_wins,
    statpedia_win_percentage = EXCLUDED.statpedia_win_percentage,
    statpedia_roi = EXCLUDED.statpedia_roi,
    improvement_percentage = EXCLUDED.improvement_percentage,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to update bankroll after bet settlement
CREATE OR REPLACE FUNCTION update_bankroll_after_bet(
  p_bankroll_id UUID,
  p_bet_amount DECIMAL(10,2),
  p_payout DECIMAL(10,2)
)
RETURNS VOID AS $$
BEGIN
  UPDATE user_bankrolls
  SET 
    current_amount = current_amount - p_bet_amount + p_payout,
    updated_at = NOW()
  WHERE id = p_bankroll_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user betting statistics
CREATE OR REPLACE FUNCTION get_user_betting_stats(
  p_user_id UUID,
  p_bankroll_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_bets BIGINT,
  won_bets BIGINT,
  lost_bets BIGINT,
  push_bets BIGINT,
  total_wagered DECIMAL(10,2),
  total_won DECIMAL(10,2),
  net_profit DECIMAL(10,2),
  win_percentage DECIMAL(5,2),
  roi_percentage DECIMAL(5,2),
  statpedia_bets BIGINT,
  statpedia_wins BIGINT,
  statpedia_win_percentage DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_bets,
    COUNT(CASE WHEN bet_status = 'won' THEN 1 END) as won_bets,
    COUNT(CASE WHEN bet_status = 'lost' THEN 1 END) as lost_bets,
    COUNT(CASE WHEN bet_status = 'push' THEN 1 END) as push_bets,
    COALESCE(SUM(bet_amount), 0) as total_wagered,
    COALESCE(SUM(CASE WHEN bet_status = 'won' THEN actual_payout ELSE 0 END), 0) as total_won,
    COALESCE(SUM(CASE WHEN bet_status = 'won' THEN actual_payout ELSE 0 END) - SUM(bet_amount), 0) as net_profit,
    CASE 
      WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN bet_status = 'won' THEN 1 END)::DECIMAL / COUNT(*)) * 100
      ELSE 0 
    END as win_percentage,
    CASE 
      WHEN SUM(bet_amount) > 0 THEN ((SUM(CASE WHEN bet_status = 'won' THEN actual_payout ELSE 0 END) - SUM(bet_amount)) / SUM(bet_amount)) * 100
      ELSE 0 
    END as roi_percentage,
    COUNT(CASE WHEN used_statpedia = true THEN 1 END) as statpedia_bets,
    COUNT(CASE WHEN used_statpedia = true AND bet_status = 'won' THEN 1 END) as statpedia_wins,
    CASE 
      WHEN COUNT(CASE WHEN used_statpedia = true THEN 1 END) > 0 THEN 
        (COUNT(CASE WHEN used_statpedia = true AND bet_status = 'won' THEN 1 END)::DECIMAL / COUNT(CASE WHEN used_statpedia = true THEN 1 END)) * 100
      ELSE 0 
    END as statpedia_win_percentage
  FROM user_bets
  WHERE user_id = p_user_id
    AND (p_bankroll_id IS NULL OR bankroll_id = p_bankroll_id)
    AND game_date >= NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_bankrolls_updated_at 
    BEFORE UPDATE ON user_bankrolls 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sportsbook_connections_updated_at 
    BEFORE UPDATE ON sportsbook_connections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_bets_updated_at 
    BEFORE UPDATE ON user_bets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_analytics_updated_at 
    BEFORE UPDATE ON monthly_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_betting_goals_updated_at 
    BEFORE UPDATE ON betting_goals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE user_bankrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportsbook_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE parlay_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE betting_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own bankrolls" ON user_bankrolls
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sportsbook connections" ON sportsbook_connections
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own bets" ON user_bets
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own parlay legs" ON parlay_legs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_bets 
            WHERE id = parlay_legs.bet_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own monthly analytics" ON monthly_analytics
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own betting goals" ON betting_goals
    FOR ALL USING (auth.uid() = user_id);
