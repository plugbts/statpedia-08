import postgres from "postgres";
import type { MoneyPuckShotRow } from "./moneypuck";

function getConn(): string | null {
  return (
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    null
  );
}

export async function fetchMoneyPuckShotsForGameFromDb(
  gameExternalId: string,
): Promise<MoneyPuckShotRow[]> {
  const conn = getConn();
  if (!conn) return [];
  const sql = postgres(conn, { prepare: false });
  try {
    const rows = await sql`
      SELECT
        period,
        period_time_seconds,
        game_time_seconds,
        team_abbr,
        shooter_name,
        x_coord,
        y_coord,
        xg,
        is_goal,
        is_rush,
        is_high_danger,
        is_rebound
      FROM public.moneypuck_shots
      WHERE game_external_id = ${gameExternalId}
      ORDER BY game_time_seconds NULLS LAST, period, period_time_seconds
    `;
    return (rows as any[]).map((r) => ({
      period: r.period ?? null,
      period_time_seconds: r.period_time_seconds ?? null,
      game_time_seconds: r.game_time_seconds ?? null,
      team_abbr: r.team_abbr ?? null,
      shooter_name: r.shooter_name ?? null,
      x_coord: r.x_coord !== null && r.x_coord !== undefined ? Number(r.x_coord) : null,
      y_coord: r.y_coord !== null && r.y_coord !== undefined ? Number(r.y_coord) : null,
      xg: r.xg !== null && r.xg !== undefined ? Number(r.xg) : null,
      is_goal: r.is_goal ?? null,
      is_rush: r.is_rush ?? null,
      is_high_danger: r.is_high_danger ?? null,
      is_rebound: r.is_rebound ?? null,
    }));
  } finally {
    await sql.end({ timeout: 2 });
  }
}
