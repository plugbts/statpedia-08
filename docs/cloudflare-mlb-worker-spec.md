# Cloudflare Worker MLB Ingestion + API Contract

This document defines the request/response contract and behavior the frontend/scripts depend on for MLB odds ingestion via the Cloudflare Worker.

## Endpoints

### POST /ingest
Triggers ingestion (fetch from provider, normalize, cache) for a league/date window.

Body (JSON):
- league: string ("MLB" | "NBA" | "NFL" | "NHL")
- sport?: string (lowercase mirror, e.g., "mlb")
- season?: string (e.g., "2025")
- date?: string (YYYY-MM-DD) — required for MLB/NBA/NHL daily slates
- phase?: string ("regular" | "postseason") — MLB postseason support
- force?: boolean — bypasses cache if true

Behavior:
- Identify provider(s) by league (MLB must be enabled)
- For MLB: fetch games/props for the specific `date` (and optionally ±1 day if desired)
- Normalize markets to canonical labels (see Normalization)
- Compute `bestOver` and `bestUnder` across books, include `allBooks` payload
- Persist or cache results for subsequent GET

Success Response (200):
```
{
  "success": true,
  "message": "Current season ingestion completed successfully",
  "duration": "1234ms",
  "totalProps": 123,
  "inserted": 123,
  "updated": 0,
  "errors": 0,
  "leagues": [
    { "league": "MLB", "props": 123, "inserted": 123, "errors": 0 }
  ]
}
```

### GET /api/player-props
Returns normalized props.

Query Params:
- sport: string ("mlb")
- league?: string ("MLB")
- date?: string (YYYY-MM-DD) — preferred for MLB
- date_from/date_to?: string (YYYY-MM-DD) — optional range
- force_refresh?: string ("true" | "false")

Success Response (200):
```
{
  "success": true,
  "data": PlayerProp[],
  "cached": boolean,
  "cacheKey": string,
  "responseTime": number,
  "totalEvents": number,
  "totalProps": number
}
```

`PlayerProp` shape (subset):
- playerName: string
- propType: string (canonical, e.g., "Home Runs", "RBIs", "Total Bases", "Walks", "Hits", "Runs")
- line: number|null
- bestOver?: { bookmaker: string; side: string; price: string|number; line: number|null }
- bestUnder?: { bookmaker: string; side: string; price: string|number; line: number|null }
- allBooks?: Array<{ bookmaker: string; side: string; price: string|number; line: number|null; deeplink?: string }>
- gameDate: string (ISO)
- gameId?: string
- teamAbbr: string
- opponentAbbr: string

## MLB Requirements
- Postseason support: do not filter out October/November slates; use `phase` if helpful, but honor explicit `date`.
- Daily slates: `date` must drive the query to provider; range fallback ±1 day acceptable.
- Double-headers/makeups: prefer gameDate from provider; include `gameId` if available.
- Normalization: Map vendor labels to canonical:
  - HR → "Home Runs"
  - RBI/RBIs → "RBIs"
  - TB/Total Bases → "Total Bases"
  - BB/Walks/Bases on Balls → "Walks"
  - Hits → "Hits"
  - Runs → "Runs"
  - Pitcher markets (optional): "Pitching Strikeouts", "Pitching Walks", "Hits Allowed", "Runs Allowed"
- Odds: Numeric price preferred; allow string (e.g., "-110") – clients coerce.
- Caching: Include `sport`+`date` in cache key; TTL 1–5 min acceptable when `force_refresh` is false.

## Diagnostics & Logging
- /ingest response should include per-league counts so we can see MLB specifically
- Log upstream provider call and record counts by market
- When zero results for MLB: include a reason field (e.g., "provider_empty", "slate_offday", "phase_filtered", "date_out_of_range")

## Client Expectations
- We call POST /ingest with `{ league: "MLB", season: "2025", date }` and then GET /api/player-props with `sport=mlb&date=YYYY-MM-DD&force_refresh=true`.
- Returning `totalProps > 0` is sufficient; we dedupe and upsert into Neon using a conflict key including league/date/player/propType/line/odds.

## Suggested Provider Hook
- For MLB, integrate directly with SportsGameOdds (or similar) for the specified `date`.
- Normalize market names per above; attach team/opp abbreviations.

## Next Steps to Fix MLB=0
1) Ensure the MLB branch is enabled in /ingest.
2) Read `date` for MLB and pass through to provider query.
3) Accept postseason games (or expose a `phase` param and honor it).
4) Return non-zero `totalProps` for a live date (e.g., today) to verify.
