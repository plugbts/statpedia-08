# NHL API Label Fix - Action Plan

## Problem Identified

1. **MoneyPuck timestamps are not suitable for early-goal modeling**
   - Current distribution: G1F5=55.2%, G1F10=81.6% (expected: 28-30%, 58%)
   - MoneyPuck's time calculation doesn't match NHL's official timestamps

2. **Dataset has placeholder data**
   - All games have same date: 2023-09-30
   - All games have placeholder teams: UMA vs ANA
   - Cannot match games to NHL API by date/teams

## Solution: Use NHL API Timestamps

### Required Steps

1. **Fetch NHL schedule for 2023-2024 season**
   - Get all game dates and NHL API game IDs (gamePk)
   - Match to MoneyPuck games by:
     - Date range (season: Oct 2023 - June 2024)
     - Team abbreviations (from MoneyPuck shots data)

2. **Fetch NHL API play-by-play for each game**
   - Use endpoint: `https://api-web.nhle.com/v1/gamecenter/{gamePk}/play-by-play`
   - Extract goal events with:
     - `about.period`
     - `about.periodTime` (MM:SS format)
   - Compute: `game_time_seconds = (period - 1) * 1200 + convert(periodTime)`

3. **Recompute labels**
   - G1F5: First goal at `game_time_seconds <= 300`
   - G1F10: First goal at `game_time_seconds <= 600`

4. **Update dataset**
   - Update `goal_in_first_5` and `goal_in_first_10` columns
   - Expected distribution: G1F5 ~28-30%, G1F10 ~55-60%

## Implementation Notes

### Current Blockers

1. **No date/team mapping**: Dataset has placeholder dates and teams
   - Need to derive dates from MoneyPuck game IDs or fetch full season schedule
   - Need to match teams from MoneyPuck shots data (`team_abbr`, `opponent_abbr`)

2. **Game ID mismatch**: MoneyPuck IDs (20001, 20002) ≠ NHL API IDs (2023020001)
   - Need to build mapping table or match by date+teams

### Recommended Approach

1. **Fetch full 2023-2024 NHL schedule**
   ```typescript
   // Iterate through dates: 2023-10-01 to 2024-06-30
   for (const date of dateRange) {
     const schedule = await fetchNhlSchedule(date);
     // Store: date, gamePk, homeTeam, awayTeam
   }
   ```

2. **Match MoneyPuck games to NHL schedule**
   - Use MoneyPuck shots data to get actual team abbreviations per game
   - Match by: date + (homeTeam, awayTeam) combination

3. **Fetch play-by-play and recompute labels**
   - For each matched game, fetch NHL API play-by-play
   - Extract first goal timestamp
   - Update dataset labels

## Expected Outcome

After fixing labels with NHL API timestamps:

- **G1F5**: ~28-30% (currently 55.2%)
- **G1F10**: ~55-60% (currently 81.6%)
- **Model performance**: Will drop from "too good" (81.8% accuracy) to realistic (~60-70%)
- **Model discrimination**: Will improve as it stops predicting majority class

## Next Steps

1. Create script to fetch full NHL 2023-2024 schedule
2. Match MoneyPuck games to NHL schedule using team abbreviations from shots data
3. Fetch NHL API play-by-play for matched games
4. Recompute and update labels
5. Re-train model with correct labels
6. Re-run backtest with balanced metrics

