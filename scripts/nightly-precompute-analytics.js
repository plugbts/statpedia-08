#!/usr/bin/env node
/**
 * Nightly analytics precompute
 *
 * NOTE:
 * The app now computes L5/L10/L20 (+ streak) dynamically in `/api/props` using current prop lines
 * and `player_game_logs.actual_value`, because historical per-game betting lines are not reliably
 * stored in `player_game_logs`.
 *
 * This script is kept as a safe no-op so existing `npm run nightly-job:*` commands don’t break.
 * If you later add a reliable historical line source, this can be extended to backfill
 * precomputed analytics tables.
 */

console.log("[nightly-precompute-analytics] skipping (dynamic analytics computed in API)");
process.exit(0);
