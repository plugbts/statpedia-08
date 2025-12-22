# ✅ Icura Setup Complete

## What's Done

1. ✅ **Database migrations applied** (0014-0017)
   - Icura backbone tables created
   - Early-goal engine tables ready
   - MoneyPuck shots table ready
   - External game ID linking enabled

2. ✅ **ML artifact placeholder created**
   - File: `icura_early_goal_logreg.json`
   - Environment variable set in `.env.local`
   - System ready to load trained model when available

3. ✅ **Storage monitoring set up**
   - Current usage: 490 MB ($0.17/month)
   - Budget remaining: $4.83/month
   - Run `tsx scripts/check-storage.ts` anytime

4. ✅ **All scripts configured for Neon**
   - Migration scripts
   - MoneyPuck ingestion
   - ML training

## Next Steps (Manual)

### 1. Download MoneyPuck Shots Data

MoneyPuck requires manual download:

1. Visit: **https://moneypuck.com/data.htm**
2. Find and download the "Shots" CSV for:
   - **2023-2024 season**
   - **2024-2025 season**
3. Save as:
   - `moneypuck_shots_2023.csv`
   - `moneypuck_shots_2024.csv`

### 2. Ingest MoneyPuck Data

```bash
# Ingest 2023-2024 season
tsx scripts/icura/ingest-moneypuck-shots.ts \
  --file moneypuck_shots_2023.csv \
  --season 2023-2024

# Ingest 2024-2025 season
tsx scripts/icura/ingest-moneypuck-shots.ts \
  --file moneypuck_shots_2024.csv \
  --season 2024-2025
```

### 3. Train ML Artifact

After the `icura_nhl_early_game_dataset` table has data:

```bash
python3 scripts/icura/train-early-goal-logreg.py \
  --out icura_early_goal_logreg.json
```

This will replace the placeholder artifact with a trained model.

### 4. Verify Setup

```bash
# Check storage
tsx scripts/check-storage.ts

# Verify ML artifact is loaded (restart dev server first)
# The Icura engine will automatically use it if available
```

## Storage Management

**Current status:**
- Total: 490 MB ($0.17/month)
- Icura tables: 0.35 MB (empty, ready for data)
- Budget: $5/month limit
- Remaining: $4.83/month

**Optimization tips:**
- Only ingest recent seasons (2023-2024, 2024-2025)
- Monitor with `tsx scripts/check-storage.ts` regularly
- Archive old data if approaching limit

## Files Created

- `icura_early_goal_logreg.json` - ML artifact (placeholder, needs training)
- `scripts/check-storage.ts` - Storage monitoring
- `scripts/icura/setup-ml-artifact.sh` - ML artifact setup helper
- `scripts/icura/README-MONEYPUCK.md` - MoneyPuck download guide

## Environment Variables

Set in `.env.local`:
- `ICURA_EARLY_GOAL_ML_ARTIFACT` - Path to ML artifact JSON

## API Endpoints Ready

- `/api/icura/nhl/unified` - Fetch unified game data
- `/api/icura/nhl/early-goal` - Generate early-goal predictions
- `/api/icura/nhl/market-odds` - Fetch market odds

All endpoints automatically persist data to Neon database.

