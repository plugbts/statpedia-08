-- SQL Backfill Migration for Statpedia Rating System
-- This script adds the required columns and populates statpedia_rating values
-- using the updated 6-factor formula with AI model prediction

-- Ensure required columns exist
ALTER TABLE props 
  ADD COLUMN IF NOT EXISTS ev_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS hit_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS matchup_grade NUMERIC,
  ADD COLUMN IF NOT EXISTS streak_factor NUMERIC,
  ADD COLUMN IF NOT EXISTS line_sensitivity NUMERIC,
  ADD COLUMN IF NOT EXISTS ai_prediction NUMERIC,
  ADD COLUMN IF NOT EXISTS statpedia_rating NUMERIC;

-- Backfill Statpedia Rating using the 6-factor formula
-- Normalize each factor to 0–100 before applying weights
-- Formula: EV% (30%) + Hit Rate (20%) + Matchup Grade (15%) + Streak Factor (10%) + Line Sensitivity (10%) + AI Prediction (15%)
UPDATE props
SET statpedia_rating =
      (COALESCE(ev_percent, 50)        * 0.30) +  -- Default to 50 if null
      (COALESCE(hit_rate, 50)          * 0.20) +  -- Default to 50 if null
      (COALESCE(matchup_grade, 50)     * 0.15) +  -- Default to 50 if null
      (COALESCE(streak_factor, 50)     * 0.10) +  -- Default to 50 if null
      (COALESCE(line_sensitivity, 50)  * 0.10) +  -- Default to 50 if null
      (COALESCE(ai_prediction, 50)     * 0.15);   -- Default to 50 if null

-- Clamp ratings to 0-95 range (95 is maximum)
UPDATE props
SET statpedia_rating = GREATEST(0, LEAST(95, statpedia_rating));

-- Validation Queries
-- Check that ratings are populated and in the right range

-- Spot check top props
SELECT 
  p.id,
  pl.name as player_name,
  p.prop_type,
  p.line,
  p.ev_percent,
  p.hit_rate,
  p.ai_prediction,
  p.statpedia_rating,
  ROUND(p.statpedia_rating) as rounded_rating
FROM props p
JOIN players pl ON p.player_id = pl.id
WHERE p.statpedia_rating IS NOT NULL
ORDER BY p.statpedia_rating DESC
LIMIT 20;

-- Distribution check
SELECT 
  COUNT(*) as total_props,
  COUNT(statpedia_rating) as props_with_rating,
  MIN(statpedia_rating) AS min_rating,
  MAX(statpedia_rating) AS max_rating,
  AVG(statpedia_rating) AS avg_rating,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY statpedia_rating) AS q1_rating,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY statpedia_rating) AS median_rating,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY statpedia_rating) AS q3_rating
FROM props
WHERE statpedia_rating IS NOT NULL;

-- Color distribution check (80-95 green, 70-79 yellow, 69-below red)
SELECT 
  CASE 
    WHEN statpedia_rating >= 80 THEN 'GREEN (80-95)'
    WHEN statpedia_rating >= 70 THEN 'YELLOW (70-79)'
    ELSE 'RED (69-below)'
  END as color_category,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM props WHERE statpedia_rating IS NOT NULL), 2) as percentage
FROM props
WHERE statpedia_rating IS NOT NULL
GROUP BY 
  CASE 
    WHEN statpedia_rating >= 80 THEN 'GREEN (80-95)'
    WHEN statpedia_rating >= 70 THEN 'YELLOW (70-79)'
    ELSE 'RED (69-below)'
  END
ORDER BY MIN(statpedia_rating) DESC;

-- Sample by league
SELECT 
  l.code as league,
  COUNT(*) as total_props,
  AVG(p.statpedia_rating) AS avg_rating,
  MIN(p.statpedia_rating) AS min_rating,
  MAX(p.statpedia_rating) AS max_rating
FROM props p
JOIN players pl ON p.player_id = pl.id
JOIN teams t ON pl.team_id = t.id
JOIN leagues l ON t.league_id = l.id
WHERE p.statpedia_rating IS NOT NULL
GROUP BY l.code
ORDER BY avg_rating DESC;
