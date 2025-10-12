-- Step 4: Hasura Relationships Setup
-- This file contains the metadata for setting up relationships in Hasura Console

-- Object Relationships:
-- teams.league_id → leagues.id (object relationship: league)
-- players.team_id → teams.id (object relationship: team)  
-- props.player_id → players.id (object relationship: player)
-- props.team_id → teams.id (object relationship: team)

-- Array Relationships:
-- leagues.teams (array relationship)
-- teams.players (array relationship)
-- teams.props (array relationship)
-- players.props (array relationship)

-- Instructions for Hasura Console:
-- 1. Go to Data tab
-- 2. Click on each table
-- 3. Go to Relationships tab
-- 4. Add the following relationships:

-- LEAGUES TABLE:
-- Array Relationship: teams
--   Reference Schema: public
--   Reference Table: teams
--   From: leagues.id
--   To: teams.league_id

-- TEAMS TABLE:
-- Object Relationship: league
--   Reference Schema: public
--   Reference Table: leagues
--   From: teams.league_id
--   To: leagues.id

-- Array Relationship: players
--   Reference Schema: public
--   Reference Table: players
--   From: teams.id
--   To: players.team_id

-- Array Relationship: props
--   Reference Schema: public
--   Reference Table: props
--   From: teams.id
--   To: props.team_id

-- PLAYERS TABLE:
-- Object Relationship: team
--   Reference Schema: public
--   Reference Table: teams
--   From: players.team_id
--   To: teams.id

-- Array Relationship: props
--   Reference Schema: public
--   Reference Table: props
--   From: players.id
--   To: props.player_id

-- PROPS TABLE:
-- Object Relationship: player
--   Reference Schema: public
--   Reference Table: players
--   From: props.player_id
--   To: players.id

-- Object Relationship: team
--   Reference Schema: public
--   Reference Table: teams
--   From: props.team_id
--   To: teams.id
