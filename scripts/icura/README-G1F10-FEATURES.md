# G1F10 Advanced Features Implementation Guide

This guide explains how to populate and use the new G1F10 features designed to push accuracy from 62.9% → 70%.

## 🎯 New Features Overview

### 1. Referee-Level Penalty Rates
- `ref_penalties_first_period_avg`: Average penalties per period for this referee
- `ref_penalties_first10_avg`: Average penalties in first 10 minutes
- `ref_minors_vs_majors_ratio`: Ratio of minor to major penalties
- `ref_home_away_penalty_bias`: Referee bias toward home team (-0.5 to 0.5)

### 2. Shift-Level Matchup Modeling
- `home_top_line_xgf_first10_last20`: Top line expected goals for (last 20 games)
- `home_top_line_xga_first10_last20`: Top line expected goals against
- `home_top_line_rush_rate_first10_last20`: Top line rush chance rate
- `home_top_line_hd_rate_first10_last20`: Top line high-danger rate
- `home_top_pair_xga_suppression_first10_last20`: Top defensive pair xGA suppression

### 3. Penalty Volatility Features
- `home_draw_penalty_rate_first10`: Home team power play rate
- `home_take_penalty_rate_first10`: Home team penalty rate
- `penalty_volatility_index`: Combined volatility metric
- `ref_team_interaction_home/away`: Referee × team penalty interaction

### 4. Travel + Fatigue Interactions
- `home_b2b_travel`: Back-to-back with travel
- `home_3in4_travel`: 3 games in 4 days with travel
- `west_to_east_travel`: West-to-east time zone travel
- `early_start_time`: Game starts before 7pm local

### 5. Goalie-Specific Early-Game Tendencies
- `home_goalie_first_shot_save_pct`: Save % on first shot
- `home_goalie_first_3_shots_save_pct`: Save % on first 3 shots
- `home_goalie_rebound_rate_first10`: Rebound rate in first 10 min
- `home_goalie_rush_save_pct_first10`: Rush shot save %
- `home_goalie_screened_save_pct_first10`: Screened shot save %

## 📋 Setup Steps

### Step 1: Run Database Migration

```bash
psql $DATABASE_URL -f db/migrations/0019_add_g1f10_advanced_features.sql
```

This adds all 30+ new columns to `icura_nhl_early_game_dataset`.

### Step 2: Populate Goalie Features

The goalie features can be populated from MoneyPuck shots data:

```bash
tsx scripts/icura/populate-goalie-features.ts --season 2024-2025
```

This script:
- Extracts starting goalie names from shots data
- Calculates first-shot save %, first 3 shots save %, rebound rate, rush save %, screened save %
- Updates the dataset with goalie early-game tendencies

### Step 3: Populate Referee Features

Referee features need to be populated from penalty event data. Create a script to:

1. Extract referee assignments from NHL API or game data
2. Calculate historical penalty rates per referee
3. Calculate home/away bias
4. Update dataset with referee features

**Example SQL query:**
```sql
-- Calculate referee penalty rates from events
SELECT 
  referee_id,
  AVG(penalties_first_period) as ref_penalties_first_period_avg,
  AVG(penalties_first10) as ref_penalties_first10_avg,
  AVG(CASE WHEN home_penalties > away_penalties THEN 0.2 
           WHEN away_penalties > home_penalties THEN -0.2 
           ELSE 0 END) as ref_home_away_penalty_bias
FROM (
  SELECT 
    referee_id,
    COUNT(*) FILTER (WHERE period = 1) as penalties_first_period,
    COUNT(*) FILTER (WHERE game_time_seconds <= 600) as penalties_first10,
    COUNT(*) FILTER (WHERE is_home_team = true) as home_penalties,
    COUNT(*) FILTER (WHERE is_home_team = false) as away_penalties
  FROM icura_nhl_events
  WHERE event_type = 'penalty'
  GROUP BY game_id, referee_id
) sub
GROUP BY referee_id;
```

### Step 4: Populate Travel/Fatigue Features

Travel and fatigue features are calculated from schedule data:

```typescript
// Already implemented in feature-extractors.ts
// extractTravelFatigueFeatures() calculates:
// - B2B + travel from previous game location
// - 3-in-4 + travel from last 4 games
// - West-to-east from team time zones
// - Early start time from game time
```

### Step 5: Populate Shift-Level Features

Shift-level features require shift tracking data. For now, they're estimated from team averages (top line ~40% of team production). To improve:

1. Integrate shift tracking API or database
2. Identify top-line and top-pair players
3. Calculate their specific xGF/xGA rates
4. Update dataset with actual shift-level stats

## 🔧 Usage

The features are automatically extracted when building feature rows:

```typescript
import { buildEarlyGameFeatureRowFromDbHistory } from './dataset';

const featureRow = await buildEarlyGameFeatureRowFromDbHistory({
  gamePkg: unifiedGamePackage,
  homeTeamId: homeTeamId,
  awayTeamId: awayTeamId,
});

// All new features are included in featureRow
console.log(featureRow.ref_penalties_first10_avg);
console.log(featureRow.home_goalie_first_shot_save_pct);
console.log(featureRow.penalty_volatility_index);
```

## 📊 Model Training

Once features are populated, retrain the G1F10 model:

```bash
# Update feature_order in training script to include new features
# Then retrain:
python scripts/icura/train-early-goal-logreg.py --target g1f10
```

The new features should improve accuracy from 62.9% → 70% by capturing:
- Referee penalty patterns
- Shift-level matchups
- Penalty volatility
- Travel/fatigue interactions
- Goalie early-game weaknesses

## 🎯 Expected Impact

Based on the feature analysis:
- **Referee features**: +2-3% accuracy
- **Shift-level features**: +2-4% accuracy
- **Penalty volatility**: +1-2% accuracy
- **Travel/fatigue**: +1-2% accuracy
- **Goalie tendencies**: +1-3% accuracy

**Total expected improvement**: +7-14% → **Target: 70% accuracy**

## 📝 Notes

- Some features (referee, shift-level) require external data sources
- Goalie features can be populated immediately from MoneyPuck data
- Travel/fatigue features are calculated on-the-fly from schedule
- Penalty volatility is extracted from game events
- All features have fallback defaults (null) if data unavailable

