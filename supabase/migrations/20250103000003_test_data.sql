-- Insert test data for debugging analytics

-- Insert sample player game logs for testing
INSERT INTO PlayerGameLogs (player_id, player_name, team, opponent, season, date, prop_type, value, position, sport) VALUES
-- Patrick Mahomes - Passing Yards
('mahomes-patrick', 'Patrick Mahomes', 'KC', 'JAX', 2025, '2025-09-15', 'Passing Yards', 275, 'QB', 'nfl'),
('mahomes-patrick', 'Patrick Mahomes', 'KC', 'LAC', 2025, '2025-09-08', 'Passing Yards', 312, 'QB', 'nfl'),
('mahomes-patrick', 'Patrick Mahomes', 'KC', 'BAL', 2025, '2025-09-01', 'Passing Yards', 298, 'QB', 'nfl'),
('mahomes-patrick', 'Patrick Mahomes', 'KC', 'DEN', 2024, '2024-12-29', 'Passing Yards', 245, 'QB', 'nfl'),
('mahomes-patrick', 'Patrick Mahomes', 'KC', 'LV', 2024, '2024-12-22', 'Passing Yards', 289, 'QB', 'nfl'),

-- Patrick Mahomes - Passing Completions
('mahomes-patrick', 'Patrick Mahomes', 'KC', 'JAX', 2025, '2025-09-15', 'Passing Completions', 27, 'QB', 'nfl'),
('mahomes-patrick', 'Patrick Mahomes', 'KC', 'LAC', 2025, '2025-09-08', 'Passing Completions', 31, 'QB', 'nfl'),
('mahomes-patrick', 'Patrick Mahomes', 'KC', 'BAL', 2025, '2025-09-01', 'Passing Completions', 28, 'QB', 'nfl'),
('mahomes-patrick', 'Patrick Mahomes', 'KC', 'DEN', 2024, '2024-12-29', 'Passing Completions', 24, 'QB', 'nfl'),
('mahomes-patrick', 'Patrick Mahomes', 'KC', 'LV', 2024, '2024-12-22', 'Passing Completions', 26, 'QB', 'nfl'),

-- Josh Allen - Passing Yards
('allen-josh', 'Josh Allen', 'BUF', 'MIA', 2025, '2025-09-14', 'Passing Yards', 301, 'QB', 'nfl'),
('allen-josh', 'Josh Allen', 'BUF', 'NYJ', 2025, '2025-09-07', 'Passing Yards', 267, 'QB', 'nfl'),
('allen-josh', 'Josh Allen', 'BUF', 'NE', 2025, '2025-08-31', 'Passing Yards', 289, 'QB', 'nfl'),
('allen-josh', 'Josh Allen', 'BUF', 'MIA', 2024, '2024-12-30', 'Passing Yards', 315, 'QB', 'nfl'),
('allen-josh', 'Josh Allen', 'BUF', 'LAC', 2024, '2024-12-23', 'Passing Yards', 278, 'QB', 'nfl'),

-- Josh Allen - Rushing Yards
('allen-josh', 'Josh Allen', 'BUF', 'MIA', 2025, '2025-09-14', 'Rushing Yards', 45, 'QB', 'nfl'),
('allen-josh', 'Josh Allen', 'BUF', 'NYJ', 2025, '2025-09-07', 'Rushing Yards', 38, 'QB', 'nfl'),
('allen-josh', 'Josh Allen', 'BUF', 'NE', 2025, '2025-08-31', 'Rushing Yards', 52, 'QB', 'nfl'),
('allen-josh', 'Josh Allen', 'BUF', 'MIA', 2024, '2024-12-30', 'Rushing Yards', 41, 'QB', 'nfl'),
('allen-josh', 'Josh Allen', 'BUF', 'LAC', 2024, '2024-12-23', 'Rushing Yards', 35, 'QB', 'nfl'),

-- Christian McCaffrey - Rushing Yards
('mccaffrey-christian', 'Christian McCaffrey', 'SF', 'LAR', 2025, '2025-09-15', 'Rushing Yards', 127, 'RB', 'nfl'),
('mccaffrey-christian', 'Christian McCaffrey', 'SF', 'NYJ', 2025, '2025-09-08', 'Rushing Yards', 98, 'RB', 'nfl'),
('mccaffrey-christian', 'Christian McCaffrey', 'SF', 'DAL', 2025, '2025-09-01', 'Rushing Yards', 156, 'RB', 'nfl'),
('mccaffrey-christian', 'Christian McCaffrey', 'SF', 'LAR', 2024, '2024-12-29', 'Rushing Yards', 112, 'RB', 'nfl'),
('mccaffrey-christian', 'Christian McCaffrey', 'SF', 'WAS', 2024, '2024-12-22', 'Rushing Yards', 89, 'RB', 'nfl'),

-- Tyreek Hill - Receiving Yards
('hill-tyreek', 'Tyreek Hill', 'MIA', 'BUF', 2025, '2025-09-14', 'Receiving Yards', 142, 'WR', 'nfl'),
('hill-tyreek', 'Tyreek Hill', 'MIA', 'NE', 2025, '2025-09-07', 'Receiving Yards', 98, 'WR', 'nfl'),
('hill-tyreek', 'Tyreek Hill', 'MIA', 'JAX', 2025, '2025-08-31', 'Receiving Yards', 134, 'WR', 'nfl'),
('hill-tyreek', 'Tyreek Hill', 'MIA', 'BUF', 2024, '2024-12-30', 'Receiving Yards', 156, 'WR', 'nfl'),
('hill-tyreek', 'Tyreek Hill', 'MIA', 'DAL', 2024, '2024-12-23', 'Receiving Yards', 87, 'WR', 'nfl'),

-- Travis Kelce - Receiving Yards
('kelce-travis', 'Travis Kelce', 'KC', 'JAX', 2025, '2025-09-15', 'Receiving Yards', 89, 'TE', 'nfl'),
('kelce-travis', 'Travis Kelce', 'KC', 'LAC', 2025, '2025-09-08', 'Receiving Yards', 112, 'TE', 'nfl'),
('kelce-travis', 'Travis Kelce', 'KC', 'BAL', 2025, '2025-09-01', 'Receiving Yards', 78, 'TE', 'nfl'),
('kelce-travis', 'Travis Kelce', 'KC', 'DEN', 2024, '2024-12-29', 'Receiving Yards', 95, 'TE', 'nfl'),
('kelce-travis', 'Travis Kelce', 'KC', 'LV', 2024, '2024-12-22', 'Receiving Yards', 103, 'TE', 'nfl');

-- Insert some cached analytics for testing
INSERT INTO Analytics (player_id, prop_type, line, direction, matchup_rank_value, matchup_rank_display, season_hits, season_total, season_pct, h2h_hits, h2h_total, h2h_pct, l5_hits, l5_total, l5_pct, l10_hits, l10_total, l10_pct, l20_hits, l20_total, l20_pct, streak_current, streak_type, last_computed_at) VALUES
('mahomes-patrick', 'Passing Yards', 275, 'over', 12, '12/32', 2, 3, 66.7, 1, 2, 50.0, 2, 3, 66.7, 2, 3, 66.7, 2, 3, 66.7, 2, 'over_hit', NOW()),
('mahomes-patrick', 'Passing Completions', 25, 'over', 8, '8/32', 3, 3, 100.0, 2, 2, 100.0, 3, 3, 100.0, 3, 3, 100.0, 3, 3, 100.0, 3, 'over_hit', NOW()),
('allen-josh', 'Passing Yards', 275, 'over', 15, '15/32', 2, 3, 66.7, 1, 1, 100.0, 2, 3, 66.7, 2, 3, 66.7, 2, 3, 66.7, 2, 'over_hit', NOW()),
('allen-josh', 'Rushing Yards', 40, 'over', 20, '20/32', 2, 3, 66.7, 1, 1, 100.0, 2, 3, 66.7, 2, 3, 66.7, 2, 3, 66.7, 2, 'over_hit', NOW()),
('mccaffrey-christian', 'Rushing Yards', 100, 'over', 5, '5/32', 3, 3, 100.0, 1, 1, 100.0, 3, 3, 100.0, 3, 3, 100.0, 3, 3, 100.0, 3, 'over_hit', NOW()),
('hill-tyreek', 'Receiving Yards', 100, 'over', 10, '10/32', 2, 3, 66.7, 1, 1, 100.0, 2, 3, 66.7, 2, 3, 66.7, 2, 3, 66.7, 2, 'over_hit', NOW()),
('kelce-travis', 'Receiving Yards', 80, 'over', 18, '18/32', 2, 3, 66.7, 1, 1, 100.0, 2, 3, 66.7, 2, 3, 66.7, 2, 3, 66.7, 2, 'over_hit', NOW());
