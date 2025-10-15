# Props List API

REST endpoint served by the local Express server for the React UI to consume normalized props.

- Path: GET /api/props-list
- Query params (optional):
  - league: e.g. NFL, NBA, MLB, NHL
  - market: prop type display name (as in prop_types.name)
  - from: ISO date, game_date lower bound
  - to: ISO date, game_date upper bound
  - limit: max rows (default 200, max 500)

Response shape:

{
  "count": number,
  "items": [
    {
      "id": string,
      "full_name": string,
      "team": string | null,
      "opponent": string | 'TBD',
      "market": string,
      "line": number,
      "odds_american": number | null,
      "over_odds_american": number,
      "under_odds_american": number,
      "ev_percent": number | null,
      "streak_l5": number | null,
      "rating": number | null,
      "matchup_rank": number | null,
      "l5": number | null,
      "l10": number | null,
      "l20": number | null,
      "h2h_avg": number | null,
      "season_avg": number | null,
      "league": string,
      "game_date": string
    }
  ]
}

Data source: public.v_props_list, defined in db/migrations/0002 and expanded in 0003.
