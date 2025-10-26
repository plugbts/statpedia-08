import "dotenv/config";
import postgres from "postgres";

async function run() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("No DB URL");
  const sql = postgres(conn, { prepare: false });
  try {
    // League
    const league = (
      await sql`
      SELECT id FROM public.leagues WHERE code='MLB' OR abbreviation='MLB' LIMIT 1;
    `
    )[0] as any;
    const leagueId = league?.id;
    if (!leagueId) throw new Error("MLB league not found; seed leagues first");

    // Teams
    const ensureTeam = async (abbr: string, name: string) => {
      const row = (
        await sql`
        SELECT id FROM public.teams WHERE abbreviation=${abbr} LIMIT 1;
      `
      )[0] as any;
      if (row?.id) return row.id as string;
      const created = (
        await sql`
        INSERT INTO public.teams (league_id, name, abbreviation)
        VALUES (${leagueId}, ${name}, ${abbr})
        RETURNING id
      `
      )[0] as any;
      return created.id as string;
    };
    const ladId = await ensureTeam("LAD", "Los Angeles Dodgers");
    const torId = await ensureTeam("TOR", "Toronto Blue Jays");

    // Players
    const ensurePlayer = async (fullName: string, teamId: string) => {
      const row = (
        await sql`
        SELECT id FROM public.players WHERE LOWER(COALESCE(full_name, name)) = LOWER(${fullName}) LIMIT 1;
      `
      )[0] as any;
      if (row?.id) return row.id as string;
      const created = (
        await sql`
        INSERT INTO public.players (team_id, name)
        VALUES (${teamId}, ${fullName})
        RETURNING id
      `
      )[0] as any;
      return created.id as string;
    };
    const bettsId = await ensurePlayer("Mookie Betts", ladId);

    // Game (fixture date)
    const gameDate = "2025-10-25";
    const gRow = (
      await sql`
      SELECT id FROM public.games WHERE game_date=${gameDate}::date AND home_team_id=${torId} AND away_team_id=${ladId} LIMIT 1;
    `
    )[0] as any;
    let gameId: string;
    if (gRow?.id) gameId = gRow.id as string;
    else {
      const created = (
        await sql`
        INSERT INTO public.games (
          league_id, home_team_id, away_team_id, season, season_type, status, game_date, api_game_id
        ) VALUES (
          ${leagueId}, ${torId}, ${ladId}, '2025', 'regular', 'scheduled', ${gameDate}::date, 'fixture-mlb-lad-tor-20251025'
        ) RETURNING id
      `
      )[0] as any;
      gameId = created.id as string;
    }

    // Prop type
    const pt = (
      await sql`
      SELECT id FROM public.prop_types WHERE LOWER(name) = LOWER('Hits') LIMIT 1;
    `
    )[0] as any;
    const propTypeId = pt?.id
      ? (pt.id as string)
      : (
          (
            await sql`
          INSERT INTO public.prop_types (name, category, sport, is_over_under, is_active)
          VALUES ('Hits', 'batting', 'mlb', true, true)
          RETURNING id
        `
          )[0] as any
        ).id;

    // Player props (ensure one)
    const ppRow = (
      await sql`
      SELECT id FROM public.player_props WHERE player_id=${bettsId} AND game_id=${gameId} AND prop_type_id=${propTypeId} LIMIT 1;
    `
    )[0] as any;
    if (!ppRow) {
      await sql`
        INSERT INTO public.player_props (
          player_id, game_id, prop_type_id, line, odds, over_odds, under_odds, over_odds_american, under_odds_american, sportsbook
        ) VALUES (
          ${bettsId}, ${gameId}, ${propTypeId}, 0.5, '+120', '+120', '-110', 120, -110, 'fixture'
        )
      `;
    }

    // Analytics (season-level)
    await sql`
      INSERT INTO public.player_analytics (
        player_id, prop_type, season, sport, opponent_team_id,
        l5, l10, l20, current_streak, h2h_avg, season_avg, matchup_rank, ev_percent, last_updated
      ) VALUES (
        ${bettsId}, 'Hits', '2025', 'mlb', ${torId},
        80, 75, 70, 4, 1.3, 1.1, 7, 12.5, NOW()
      )
      ON CONFLICT (player_id, prop_type, season) DO UPDATE SET
        opponent_team_id = EXCLUDED.opponent_team_id,
        l5 = EXCLUDED.l5,
        l10 = EXCLUDED.l10,
        l20 = EXCLUDED.l20,
        current_streak = EXCLUDED.current_streak,
        h2h_avg = EXCLUDED.h2h_avg,
        season_avg = EXCLUDED.season_avg,
        matchup_rank = EXCLUDED.matchup_rank,
        ev_percent = EXCLUDED.ev_percent,
        last_updated = NOW();
    `;

    console.log("Seeded fixture for Mookie Betts Hits with non-null analytics");
  } finally {
    await sql.end({ timeout: 2 });
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
