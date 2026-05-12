# G1F10 Feature Population Guide

This guide explains how to populate all the new G1F10 features to improve model accuracy from 62.9% → 70%.

## 🚀 Quick Start

### 1. Run Database Migration

```bash
psql $DATABASE_URL -f db/migrations/0019_add_g1f10_advanced_features.sql
```

This adds 30+ new columns to `icura_nhl_early_game_dataset`.

### 2. Populate Features (in order)

```bash
# Goalie features (from MoneyPuck shots data)
tsx scripts/icura/populate-goalie-features.ts --season 2024-2025

# Referee features (from penalty events)
tsx scripts/icura/populate-referee-features.ts --season 2024-2025

# Shift-level features (estimated from team averages)
tsx scripts/icura/populate-shift-features.ts --season 2024-2025
```

### 3. Retrain Model

```bash
python3 scripts/icura/train-early-goal-logreg.py \
  --db "$DATABASE_URL" \
  --out icura_early_goal_logreg_g1f10.json \
  --train-start "2023-10-01" --train-end "2024-07-01"
```

## 📊 Feature Status

| Feature Category | Status | Data Source | Script |
|-----------------|--------|-------------|--------|
| Goalie Early Tendencies | ✅ Ready | MoneyPuck shots | `populate-goalie-features.ts` |
| Referee Penalty Rates | ✅ Ready | Game events | `populate-referee-features.ts` |
| Shift-Level Matchup | ⚠️ Estimated | Team averages (40%) | `populate-shift-features.ts` |
| Penalty Volatility | ✅ Auto-extracted | Game events | Dataset builder |
| Travel/Fatigue | ✅ Auto-calculated | Schedule data | Feature extractors |

## 🎯 Expected Accuracy Improvements

- **Goalie features**: +1-3% accuracy
- **Referee features**: +2-3% accuracy  
- **Shift-level features**: +2-4% accuracy (with real shift data)
- **Penalty volatility**: +1-2% accuracy
- **Travel/fatigue**: +1-2% accuracy

**Total expected**: +7-14% → **Target: 70% accuracy**

## 📝 Notes

- Goalie features can be populated immediately from existing MoneyPuck data
- Referee features use game-level averages (improve with referee database)
- Shift-level features are estimated (improve with shift tracking integration)
- Travel/fatigue features are calculated on-the-fly
- Penalty volatility is extracted automatically from events

## 🔧 Troubleshooting

### Migration fails
- Ensure `DATABASE_URL` is set correctly
- Check database permissions
- Verify table `icura_nhl_early_game_dataset` exists

### Goalie features empty
- Verify MoneyPuck shots data is ingested
- Check `goalie_name` column is populated
- Ensure shots have `game_time_seconds <= 600`

### Referee features empty
- Verify penalty events are in `icura_nhl_events` table
- Check `event_type = 'penalty'` filter
- Ensure events have period/time data

