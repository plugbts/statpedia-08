# G1F10 Features Quick Start Guide

## 🚀 One-Command Setup

Once your database is available, run:

```bash
./scripts/icura/setup-g1f10-features.sh [season] [output-file]
```

Example:
```bash
export DATABASE_URL='postgresql://user:pass@host:5432/dbname'
./scripts/icura/setup-g1f10-features.sh 2024-2025 icura_early_goal_logreg_g1f10.json
```

## 📋 Manual Steps

If you prefer to run steps individually:

### 1. Set Database Connection (Neon Preferred)

```bash
# For Neon (recommended)
export NEON_DATABASE_URL='postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname'

# OR add to .env file:
# NEON_DATABASE_URL='postgresql://...'

# Alternative connection variables (if not using Neon)
export DATABASE_URL='postgresql://user:pass@host:5432/dbname'
# OR
export SUPABASE_DATABASE_URL='postgresql://...'
```

**Note**: The setup script prioritizes `NEON_DATABASE_URL` if set.

### 2. Run Migration

```bash
psql "$DATABASE_URL" -f db/migrations/0019_add_g1f10_advanced_features.sql
```

### 3. Populate Features

```bash
# Goalie features (from MoneyPuck shots)
tsx scripts/icura/populate-goalie-features.ts --season 2024-2025

# Referee features (from penalty events)
tsx scripts/icura/populate-referee-features.ts --season 2024-2025

# Shift-level features (estimated from team averages)
tsx scripts/icura/populate-shift-features.ts --season 2024-2025
```

### 4. Retrain Model

```bash
python3 scripts/icura/train-early-goal-logreg.py \
  --db "$DATABASE_URL" \
  --out icura_early_goal_logreg_g1f10.json \
  --train-start "2023-10-01" \
  --train-end "2024-07-01"
```

### 5. Use New Model

```bash
export ICURA_EARLY_GOAL_ML_ARTIFACT=icura_early_goal_logreg_g1f10.json
```

## ✅ Verification

Check that features are populated:

```sql
SELECT 
  COUNT(*) as total_games,
  COUNT(home_goalie_first_shot_save_pct) as games_with_goalie_features,
  COUNT(ref_penalties_first10_avg) as games_with_referee_features,
  COUNT(home_top_line_xgf_first10_last20) as games_with_shift_features
FROM public.icura_nhl_early_game_dataset
WHERE season = '2024-2025';
```

## 🎯 Expected Results

After setup, you should see:
- ✅ 30+ new columns in `icura_nhl_early_game_dataset`
- ✅ Goalie features populated for games with MoneyPuck data
- ✅ Referee features populated for games with penalty events
- ✅ Shift features estimated from team averages
- ✅ New model artifact with improved accuracy (target: 70%)

## 🐛 Troubleshooting

**Migration fails:**
- Check database permissions
- Verify `icura_nhl_early_game_dataset` table exists
- Ensure PostgreSQL version supports all column types

**Features not populating:**
- Verify MoneyPuck shots data is ingested
- Check that game events include penalty data
- Ensure season matches your data

**Model training fails:**
- Install Python dependencies: `pip install psycopg2-binary scikit-learn numpy`
- Check that features are populated (see verification query)
- Ensure training date range has sufficient data

