-- Enable authentication and create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium', 'pro')),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  paypal_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create player props table
CREATE TABLE IF NOT EXISTS public.player_props (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sport TEXT NOT NULL,
  player_name TEXT NOT NULL,
  team TEXT NOT NULL,
  opponent TEXT,
  prop_type TEXT NOT NULL,
  line DECIMAL(10,2) NOT NULL,
  odds TEXT,
  hit_rate DECIMAL(5,2) NOT NULL,
  games_tracked INTEGER DEFAULT 10,
  avg_actual_value DECIMAL(10,2),
  potential_assists DECIMAL(5,2),
  potential_rebounds DECIMAL(5,2),
  potential_threes DECIMAL(5,2),
  avg_minutes DECIMAL(5,2),
  free_throw_attempts DECIMAL(5,2),
  defensive_rating DECIMAL(8,2),
  offensive_rating DECIMAL(8,2),
  usage_rate DECIMAL(5,2),
  pace_factor DECIMAL(5,2),
  injury_status TEXT,
  recent_form TEXT,
  home_away TEXT,
  rest_days INTEGER,
  weather_conditions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on player props (premium content)
ALTER TABLE public.player_props ENABLE ROW LEVEL SECURITY;

-- Player props policies - only premium users can see detailed props
CREATE POLICY "Free users can see limited props data" 
ON public.player_props 
FOR SELECT 
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    WHEN (SELECT subscription_status FROM public.profiles WHERE user_id = auth.uid()) = 'free' 
    THEN hit_rate <= 65.0
    ELSE true
  END
);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_player_props_updated_at
BEFORE UPDATE ON public.player_props
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Insert sample player props data
INSERT INTO public.player_props (sport, player_name, team, opponent, prop_type, line, odds, hit_rate, games_tracked, avg_actual_value, potential_assists, potential_rebounds, potential_threes, avg_minutes, free_throw_attempts, defensive_rating, offensive_rating, usage_rate, pace_factor, injury_status, recent_form, home_away, rest_days, weather_conditions) VALUES
('nba', 'LeBron James', 'LAL', 'GSW', 'Points', 26.5, '+110', 87.5, 10, 28.7, 8.2, 7.1, 2.1, 35.5, 6.8, 110.2, 118.5, 29.8, 102.3, 'Healthy', 'Hot', 'Home', 2, 'Clear'),
('nba', 'Stephen Curry', 'GSW', 'LAL', '3-Pointers Made', 4.5, '-120', 72.0, 10, 5.2, 5.1, 4.8, 5.2, 34.2, 3.1, 108.7, 122.4, 32.1, 101.8, 'Healthy', 'Average', 'Away', 1, 'Clear'),
('nba', 'Giannis Antetokounmpo', 'MIL', 'PHI', 'Rebounds', 10.5, '-110', 90.0, 10, 12.8, 5.8, 12.8, 1.2, 33.8, 7.2, 106.4, 119.2, 34.5, 99.8, 'Healthy', 'Hot', 'Home', 2, 'Clear'),
('nfl', 'Josh Allen', 'BUF', 'MIA', 'Passing Yards', 267.5, '-115', 68.0, 10, 284.2, 0, 0, 0, 60.0, 0, 0, 0, 0, 0, 'Healthy', 'Average', 'Home', 7, 'Dome'),
('nfl', 'Christian McCaffrey', 'SF', 'SEA', 'Rushing Yards', 89.5, '-110', 85.0, 10, 112.4, 0, 0, 0, 65.0, 0, 0, 0, 0, 0, 'Healthy', 'Hot', 'Away', 7, 'Clear'),
('nhl', 'Connor McDavid', 'EDM', 'CGY', 'Points', 1.5, '-125', 75.0, 10, 1.8, 1.2, 0.1, 0, 21.5, 0, 0, 0, 0, 0, 'Healthy', 'Hot', 'Home', 2, 'Cold'),
('nba', 'Ja Morant', 'MEM', 'DEN', 'Assists', 8.5, '+105', 63.0, 10, 8.9, 8.9, 4.2, 2.8, 32.1, 4.5, 112.8, 116.7, 31.2, 103.5, 'Questionable', 'Cold', 'Away', 1, 'Clear'),
('nba', 'Jayson Tatum', 'BOS', 'MIA', 'Points', 27.5, '-105', 78.0, 10, 29.1, 4.6, 8.1, 3.2, 36.2, 6.1, 109.8, 121.3, 29.7, 98.2, 'Healthy', 'Average', 'Home', 2, 'Clear');