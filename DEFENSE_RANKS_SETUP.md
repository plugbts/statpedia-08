# Defense Ranks Setup (Supabase)

The `defense_ranks` table stores precomputed NFL defensive rankings by prop type, which powers the matchup rank feature.

## Setup

When Supabase is accessible, run:

```bash
npx --yes tsx scripts/setup-defense-ranks-supabase.ts --season=2024
```

This will:
1. Create the `defense_ranks` table if it doesn't exist
2. Populate NFL defense ranks for the 2024 season
3. Verify the data

For multiple seasons:
```bash
npx --yes tsx scripts/setup-defense-ranks-supabase.ts --season=2024 --season=2025
```

## Verification

Check that ranks are populated:
```bash
npx --yes tsx scripts/check-defense-ranks-nfl.ts --season=2024
```

## How It Works

1. **Table Structure**: `defense_ranks` stores rankings per team/prop_type/season
   - `rank`: 1 = best defense (allows least), 32 = worst (allows most)
   - `rank_percentile`: 0-100 percentile
   - `games_tracked`: Number of games used for calculation

2. **API Usage**: The API server (`src/server/api-server.ts`) automatically:
   - Reads from `defense_ranks` first (fast path)
   - Falls back to computing from `player_game_logs` if table is empty (slow path)
   - Caches computed ranks for 30 minutes

3. **Data Source**: Rankings are computed from `player_game_logs`:
   - For each game, sum `actual_value` for all offensive players against each defense
   - Average per game across the season
   - Rank 1-32 by average allowed (ascending)

## Troubleshooting

If you see `getaddrinfo ENOTFOUND db.jvnmbybielczkleckogr.supabase.co`:
- Check that `SUPABASE_DATABASE_URL` is set in `.env.local`
- Verify the Supabase project is active (not paused)
- Try again later if it's a temporary DNS issue

The API will still work without the table (using on-the-fly computation), but it will be slower.

