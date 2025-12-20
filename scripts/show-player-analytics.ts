#!/usr/bin/env tsx
/**
 * Show Player Analytics
 *
 * Displays comprehensive analytics for a specific player
 */

import "dotenv/config";
import postgres from "postgres";

async function main() {
  const playerName = process.argv[2] || "Donovan Mitchell";
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  const sql = postgres(conn, { prepare: false });

  try {
    console.log(`🔍 ANALYTICS FOR: ${playerName}\n`);
    console.log("=".repeat(80));

    // Find player
    const players = await sql`
      SELECT p.id, p.name, p.full_name, t.abbreviation as team, l.code as league
      FROM public.players p
      LEFT JOIN public.teams t ON t.id = p.team_id
      LEFT JOIN public.leagues l ON l.id = t.league_id
      WHERE p.name ILIKE ${`%${playerName}%`} OR p.full_name ILIKE ${`%${playerName}%`}
      LIMIT 5
    `;

    if (players.length === 0) {
      console.log(`❌ No player found matching "${playerName}"`);
      return;
    }

    for (const player of players) {
      console.log(`\n📊 Player: ${player.name || player.full_name}`);
      console.log(`   Team: ${player.team || "N/A"} | League: ${player.league || "N/A"}`);
      console.log(`   ID: ${player.id}`);
      console.log("-".repeat(80));

      // Current props
      const props = await sql`
        SELECT 
          pt.name as prop_type,
          pp.line,
          pp.odds_american,
          g.game_date,
          l.abbreviation as league
        FROM public.player_props pp
        JOIN public.prop_types pt ON pt.id = pp.prop_type_id
        JOIN public.games g ON g.id = pp.game_id
        JOIN public.leagues l ON l.id = g.league_id
        WHERE pp.player_id = ${player.id}
        ORDER BY g.game_date DESC
        LIMIT 10
      `;

      console.log(`\n📈 Current Props (${props.length}):`);
      if (props.length > 0) {
        for (const prop of props) {
          console.log(`   ${prop.prop_type}: ${prop.line} (${prop.league}) - ${prop.game_date}`);
        }
      } else {
        console.log("   No current props");
      }

      // Analytics by prop type
      const analytics = await sql`
        SELECT 
          pa.prop_type,
          pa.season,
          pa.l5,
          pa.l10,
          pa.l20,
          pa.current_streak,
          pa.h2h_avg,
          pa.season_avg,
          pa.ev_percent,
          pa.matchup_rank,
          pa.last_updated
        FROM public.player_analytics pa
        WHERE pa.player_id = ${player.id}
        ORDER BY pa.season DESC, pa.prop_type
      `;

      console.log(`\n📊 Analytics (${analytics.length} prop types):`);
      if (analytics.length > 0) {
        for (const a of analytics) {
          console.log(`\n   ${a.prop_type} (${a.season}):`);
          console.log(
            `      L5: ${a.l5 ?? "N/A"}% | L10: ${a.l10 ?? "N/A"}% | L20: ${a.l20 ?? "N/A"}%`,
          );
          console.log(
            `      Streak: ${a.current_streak ?? "N/A"} | H2H Avg: ${a.h2h_avg ?? "N/A"} | Season Avg: ${a.season_avg ?? "N/A"}`,
          );
          console.log(
            `      EV%: ${a.ev_percent ?? "N/A"} | Matchup Rank: ${a.matchup_rank ?? "N/A"}`,
          );
          console.log(`      Updated: ${a.last_updated}`);
        }
      } else {
        console.log("   No analytics data");
      }

      // Game logs summary
      const logs = await sql`
        SELECT 
          pgl.prop_type,
          COUNT(*) as game_count,
          AVG(pgl.actual_value) as avg_value,
          AVG(pgl.hit::int) * 100 as hit_rate,
          MAX(pgl.game_date) as last_game
        FROM public.player_game_logs pgl
        WHERE pgl.player_id = ${player.id}
        GROUP BY pgl.prop_type
        ORDER BY game_count DESC
        LIMIT 10
      `;

      console.log(`\n🎮 Game Logs Summary (${logs.length} prop types):`);
      if (logs.length > 0) {
        for (const log of logs) {
          console.log(
            `   ${log.prop_type}: ${log.game_count} games | Avg: ${Number(log.avg_value).toFixed(2)} | Hit Rate: ${Number(log.hit_rate).toFixed(1)}% | Last: ${log.last_game}`,
          );
        }
      } else {
        console.log("   No game logs");
      }

      // View data (if available)
      const viewData = await sql`
        SELECT 
          market,
          team,
          opponent,
          l5,
          l10,
          l20,
          current_streak,
          h2h_avg,
          season_avg,
          ev_percent,
          game_date
        FROM public.v_props_list
        WHERE full_name = ${player.name || player.full_name}
        ORDER BY game_date DESC
        LIMIT 5
      `;

      console.log(`\n👁️  View Data (${viewData.length} recent props):`);
      if (viewData.length > 0) {
        for (const v of viewData) {
          console.log(`\n   ${v.market} vs ${v.opponent} (${v.game_date}):`);
          console.log(
            `      L5: ${v.l5 ?? "N/A"} | L10: ${v.l10 ?? "N/A"} | L20: ${v.l20 ?? "N/A"}`,
          );
          console.log(
            `      Streak: ${v.current_streak ?? "N/A"} | H2H: ${v.h2h_avg ?? "N/A"} | Season: ${v.season_avg ?? "N/A"}`,
          );
          console.log(`      EV%: ${v.ev_percent ?? "N/A"}`);
        }
      } else {
        console.log("   No data in view");
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ COMPLETE");
    console.log("=".repeat(80));
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch(console.error);
