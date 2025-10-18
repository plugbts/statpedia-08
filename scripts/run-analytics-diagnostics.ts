import "dotenv/config";
import postgres from "postgres";

async function main() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) {
    console.error("No DATABASE_URL/NEON_DATABASE_URL in env");
    process.exit(1);
  }
  const sql = postgres(conn, { prepare: false });
  try {
    const [missingLogIds] = await sql<
      { missing_player_id: number; missing_team_id: number; missing_opponent_team_id: number }[]
    >`
      SELECT 
        COUNT(*) FILTER (WHERE player_id IS NULL) AS missing_player_id,
        COUNT(*) FILTER (WHERE team_id IS NULL) AS missing_team_id,
        COUNT(*) FILTER (WHERE opponent_team_id IS NULL) AS missing_opponent_team_id
      FROM public.player_game_logs;
    `;

    const [gamesMissingTeams] = await sql<
      { games_missing_home: number; games_missing_away: number }[]
    >`
      SELECT 
        COUNT(*) FILTER (WHERE home_team_id IS NULL) AS games_missing_home,
        COUNT(*) FILTER (WHERE away_team_id IS NULL) AS games_missing_away
      FROM public.games;
    `;

    const [propsWithoutLogs] = await sql<{ props_without_logs: number }[]>`
      SELECT COUNT(*) AS props_without_logs
      FROM public.player_props p
      LEFT JOIN public.player_game_logs l
        ON l.player_id = p.player_id
       AND l.prop_type = (SELECT name FROM public.prop_types WHERE id = p.prop_type_id)
      WHERE l.player_id IS NULL;
    `;

    const [coverage] = await sql<
      {
        total_analytics: number;
        with_l5: number;
        with_l10: number;
        with_l20: number;
        with_streak: number;
        with_h2h: number;
        with_ev: number;
      }[]
    >`
      SELECT 
        COUNT(*) AS total_analytics,
        COUNT(*) FILTER (WHERE l5 IS NOT NULL) AS with_l5,
        COUNT(*) FILTER (WHERE l10 IS NOT NULL) AS with_l10,
        COUNT(*) FILTER (WHERE l20 IS NOT NULL) AS with_l20,
        COUNT(*) FILTER (WHERE current_streak IS NOT NULL) AS with_streak,
        COUNT(*) FILTER (WHERE h2h_avg IS NOT NULL) AS with_h2h,
        COUNT(*) FILTER (WHERE ev_percent IS NOT NULL) AS with_ev
      FROM public.player_analytics;
    `;

    console.log("Diagnostics:");
    console.log("- Logs missing IDs:", missingLogIds);
    console.log("- Games missing home/away:", gamesMissingTeams);
    console.log("- Props without linked logs:", propsWithoutLogs);
    console.log("- Analytics coverage:", coverage);

    const recentSample = await sql`
      SELECT player_id, prop_type, season, l5, l10, l20, current_streak, ev_percent
      FROM public.player_analytics
      ORDER BY last_updated DESC NULLS LAST
      LIMIT 5;
    `;
    console.log("- Sample analytics rows:", recentSample);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((e) => {
  console.error("run-analytics-diagnostics failed:", e);
  process.exit(1);
});
