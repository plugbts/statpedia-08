#!/usr/bin/env node

/**
 * Simple API Server for /api/props-list endpoint
 * Bypasses auth to provide direct database access
 */

import express from "express";
import cors from "cors";
import { config } from "dotenv";
import postgres from "postgres";

// Load environment variables
config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Props list route
app.get("/api/props-list", async (req, res) => {
  try {
    const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      return res.status(500).json({ error: "DATABASE_URL is not configured" });
    }

    const client = postgres(connectionString, { prepare: false });

    try {
      const { league, market, from, to, limit: limitParam } = req.query;
      const parsedLimit = parseInt(limitParam || "200", 10);
      const limit = Math.min(Number.isFinite(parsedLimit) ? parsedLimit : 200, 500);

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
               ev_percent, l5, l10, l20, h2h_avg, season_avg,
               matchup_rank, rating, current_streak,
               team_logo, opponent_logo,
               league, game_date
        FROM public.v_props_list
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY game_date DESC NULLS LAST
        LIMIT ${limit}
      `;

      const rows = params.length > 0 ? await client.unsafe(sql, params) : await client.unsafe(sql);
      console.log(`✅ Fetched ${rows.length} rows from v_props_list`);
      res.json({ count: rows.length, items: rows });
    } finally {
      await client.end({ timeout: 1 });
    }
  } catch (e) {
    const err = e;
    console.error("GET /api/props-list error:", err.message || e);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Simple API server running on http://localhost:${PORT}`);
  console.log(`📊 Props list endpoint: http://localhost:${PORT}/api/props-list`);
});
