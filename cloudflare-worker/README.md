# Statpedia Player Props Cloudflare Worker

This Worker serves player props from the SportsGameOdds API with best-book aggregation and MLB market normalization, exposing:

- POST /ingest — optional ingestion trigger (kept backward-compatible)
- GET /api/player-props — primary endpoint (supports sport, date/date_from/date_to, force_refresh)

## What changed

- MLB fast-path: When `sport=mlb` (or `DISABLE_SUPABASE=1`), the Worker fetches props directly from SportsGameOdds (SGO) and returns normalized markets with `bestOver`, `bestUnder`, and `allBooks` — no Supabase dependency.
- Wrangler config was sanitized; set secrets via Wrangler, not in source.

## Deploy

1) Install Wrangler (optional if using npm scripts)

2) Set secrets (at least SGO_API_KEY)

```
cd cloudflare-worker
wrangler secret put SGO_API_KEY
# Optional: completely bypass Supabase paths for all sports
wrangler secret put DISABLE_SUPABASE  # value: 1
```

3) Publish

```
npm run -w cloudflare-worker deploy
# or staging / production
npm run -w cloudflare-worker deploy:staging
npm run -w cloudflare-worker deploy:production
```

## Query examples

- Force refresh for MLB on a date
```
GET https://<your-worker>/api/player-props?sport=mlb&date=2025-10-24&force_refresh=true
```
- Tolerant window (±1 day handled by client; worker honors exact date/range you pass)
```
GET /api/player-props?sport=mlb&date_from=2025-10-23&date_to=2025-10-25&force_refresh=true
```

## Response shape (subset)

```
{
  success: true,
  data: [
    {
      playerName: "Juan Soto",
      propType: "Total Bases",
      line: 1.5,
      bestOver: { bookmaker: "fanduel", side: "over", price: "-110", line: 1.5 },
      bestUnder: { bookmaker: "mgm", side: "under", price: "+105", line: 1.5 },
      allBooks: [ { bookmaker: "fanduel", side: "both", price: "-110", line: 1.5 }, ... ],
      gameDate: "2025-10-24T23:05:00.000Z",
      gameId: "...",
      teamAbbr: "NYY",
      opponentAbbr: "BOS"
    }
  ],
  cached: false,
  totalEvents: 7,
  totalProps: 120,
  sport: "mlb",
  date: "2025-10-24"
}
```

## Notes
- If the SGO API doesn’t expose explicit date filters for events, the worker filters on the returned event date fields.
- Best-book logic picks the highest decimal price per side, derived from American odds.
- MLB market normalization supports: Home Runs, RBIs, Total Bases, Walks, Hits, Runs.
