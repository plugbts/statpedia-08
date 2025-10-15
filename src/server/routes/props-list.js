const express = require("express");
const postgres = require("postgres");

const router = express.Router();

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

router.get("/", async (req, res) => {
  if (!connectionString) return res.status(500).json({ error: "DATABASE_URL is not configured" });
  const client = postgres(connectionString, { prepare: false });
  try {
    const { league, market, from, to, limit: limitParam } = req.query;
    const limit = Math.min(parseInt(limitParam || "200", 10) || 200, 500);

    const where = [];
    const params = [];
    if (league) {
      where.push(`league = $${params.length + 1}`);
      params.push(league);
    }
    if (market) {
      where.push(`market = $${params.length + 1}`);
      params.push(market);
    }
    if (from) {
      where.push(`game_date >= $${params.length + 1}`);
      params.push(from);
    }
    if (to) {
      where.push(`game_date <= $${params.length + 1}`);
      params.push(to);
    }

    const sql = `
      SELECT id, full_name, team, COALESCE(opponent, 'TBD') AS opponent,
             market, line, odds_american,
             COALESCE(over_odds_american, 0) AS over_odds_american,
             COALESCE(under_odds_american, 0) AS under_odds_american,
             ev_percent, streak_l5, rating, matchup_rank,
             l5, l10, l20, h2h_avg, season_avg,
             league, game_date
      FROM public.v_props_list
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY game_date DESC NULLS LAST
      LIMIT ${limit}
    `;

    const rows = params.length > 0 ? await client.unsafe(sql, params) : await client.unsafe(sql);

    res.json({ count: rows.length, items: rows });
  } catch (e) {
    console.error("GET /api/props-list error:", e.message || e);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await client.end({ timeout: 1 });
  }
});

module.exports = router;
