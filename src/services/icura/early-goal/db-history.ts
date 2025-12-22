import postgres from "postgres";

export function getDbConnString(): string {
  const c =
    process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
  if (!c) throw new Error("No DB URL configured");
  return c;
}

export async function fetchLast20EarlyDatasetAverages(params: {
  teamId: string;
  beforeDateISO: string; // YYYY-MM-DD
}): Promise<{
  team_xgf_first10_last20: number | null;
  team_shots_first10_last20: number | null;
  team_high_danger_first10_last20: number | null;
  team_rush_chances_first10_last20: number | null;
  team_avg_time_to_first_shot: number | null;
  team_avg_time_to_first_goal: number | null;
  team_xga_first10_last20: number | null;
  team_shots_allowed_first10_last20: number | null;
  team_high_danger_allowed_first10_last20: number | null;
}> {
  const sql = postgres(getDbConnString(), { prepare: false });
  try {
    const rows = await sql.unsafe(
      `
      WITH last20 AS (
        SELECT *
        FROM public.icura_nhl_early_game_dataset d
        WHERE d.date_iso < $2::date
          AND (d.home_team_id = $1::uuid OR d.away_team_id = $1::uuid)
        ORDER BY d.date_iso DESC
        LIMIT 20
      ),
      proj AS (
        SELECT
          CASE WHEN home_team_id = $1::uuid THEN home_team_xgf_first10_last20 ELSE away_team_xgf_first10_last20 END AS xgf,
          CASE WHEN home_team_id = $1::uuid THEN home_team_shots_first10_last20 ELSE away_team_shots_first10_last20 END AS shots,
          CASE WHEN home_team_id = $1::uuid THEN home_team_high_danger_first10_last20 ELSE away_team_high_danger_first10_last20 END AS hd,
          CASE WHEN home_team_id = $1::uuid THEN home_team_rush_chances_first10_last20 ELSE away_team_rush_chances_first10_last20 END AS rush,
          CASE WHEN home_team_id = $1::uuid THEN home_team_avg_time_to_first_shot ELSE away_team_avg_time_to_first_shot END AS t_shot,
          CASE WHEN home_team_id = $1::uuid THEN home_team_avg_time_to_first_goal ELSE away_team_avg_time_to_first_goal END AS t_goal,
          CASE WHEN home_team_id = $1::uuid THEN home_team_xga_first10_last20 ELSE away_team_xga_first10_last20 END AS xga,
          CASE WHEN home_team_id = $1::uuid THEN home_team_shots_allowed_first10_last20 ELSE away_team_shots_allowed_first10_last20 END AS shots_allowed,
          CASE WHEN home_team_id = $1::uuid THEN home_team_high_danger_allowed_first10_last20 ELSE away_team_high_danger_allowed_first10_last20 END AS hd_allowed
        FROM last20
      )
      SELECT
        AVG(xgf)::numeric AS team_xgf_first10_last20,
        AVG(shots)::numeric AS team_shots_first10_last20,
        AVG(hd)::numeric AS team_high_danger_first10_last20,
        AVG(rush)::numeric AS team_rush_chances_first10_last20,
        AVG(t_shot)::numeric AS team_avg_time_to_first_shot,
        AVG(t_goal)::numeric AS team_avg_time_to_first_goal,
        AVG(xga)::numeric AS team_xga_first10_last20,
        AVG(shots_allowed)::numeric AS team_shots_allowed_first10_last20,
        AVG(hd_allowed)::numeric AS team_high_danger_allowed_first10_last20
      FROM proj
      `,
      [params.teamId, params.beforeDateISO],
    );

    const r = rows?.[0] || {};
    const toN = (v: any) => (v === null || v === undefined ? null : Number(v));
    return {
      team_xgf_first10_last20: toN(r.team_xgf_first10_last20),
      team_shots_first10_last20: toN(r.team_shots_first10_last20),
      team_high_danger_first10_last20: toN(r.team_high_danger_first10_last20),
      team_rush_chances_first10_last20: toN(r.team_rush_chances_first10_last20),
      team_avg_time_to_first_shot: toN(r.team_avg_time_to_first_shot),
      team_avg_time_to_first_goal: toN(r.team_avg_time_to_first_goal),
      team_xga_first10_last20: toN(r.team_xga_first10_last20),
      team_shots_allowed_first10_last20: toN(r.team_shots_allowed_first10_last20),
      team_high_danger_allowed_first10_last20: toN(r.team_high_danger_allowed_first10_last20),
    };
  } finally {
    await sql.end({ timeout: 2 });
  }
}
