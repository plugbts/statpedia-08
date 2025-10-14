import { NextRequest, NextResponse } from 'next/server';
import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error('NEON_DATABASE_URL not found in environment variables');
}

const client = postgres(connectionString);
const db = drizzle(client);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const propType = searchParams.get('propType');
    const sport = searchParams.get('sport') || '2024-25';

    if (!playerId || !propType) {
      return NextResponse.json(
        { error: 'playerId and propType are required' },
        { status: 400 }
      );
    }

    // Fetch from the player_analytics table
    const analyticsResult = await db.execute(sql`
      SELECT * FROM public.player_analytics
      WHERE player_id = ${playerId}
      AND prop_type = ${propType}
      AND sport = ${sport}
      LIMIT 1;
    `);

    const analyticsData = analyticsResult[0];

    if (!analyticsData) {
      // Return empty data structure if no analytics found
      return NextResponse.json({
        analytics: null,
        recentGames: [],
        summary: {
          totalGames: 0,
          careerAvg: 0,
          careerHitRate: 0,
          avgL5: 0,
          hitRateL5: 0,
          currentStreak: 0,
          currentStreakType: null,
        }
      });
    }

    // Fetch recent games from player_game_logs
    const recentGamesResult = await db.execute(sql`
      SELECT 
        pgl.game_date, 
        pgl.actual_value, 
        pgl.line, 
        pgl.home_away,
        t.abbreviation as team,
        ot.abbreviation as opponent
      FROM public.player_game_logs pgl
      JOIN public.teams t ON t.id = pgl.team_id
      LEFT JOIN public.teams ot ON ot.id = pgl.opponent_team_id
      WHERE pgl.player_id = ${playerId}
      AND pgl.prop_type = ${propType}
      ORDER BY pgl.game_date DESC
      LIMIT 20;
    `);

    const transformedRecentGames = recentGamesResult.map((game: any) => ({
      game_date: game.game_date,
      actual_value: game.actual_value,
      line: game.line,
      hit: game.actual_value > game.line,
      team: game.team,
      opponent: game.opponent,
      home_away: game.home_away,
    }));

    // Construct summary object from enriched data
    const summary = {
      totalGames: analyticsData.season_games_2025 || 0,
      careerAvg: 0, // Could be computed from recent games if needed
      careerHitRate: analyticsData.season_hit_rate_2025 || 0,
      avgL5: 0, // Could be computed from recent games if needed
      hitRateL5: analyticsData.l5_hit_rate || 0,
      currentStreak: analyticsData.current_streak || 0,
      currentStreakType: analyticsData.streak_direction || null,
    };

    return NextResponse.json({
      analytics: analyticsData,
      recentGames: transformedRecentGames,
      summary: summary,
    });

  } catch (error: any) {
    console.error('Error fetching enriched player analytics:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerIds, propType, sport = '2024-25' } = body;

    if (!playerIds || !Array.isArray(playerIds) || !propType) {
      return NextResponse.json(
        { error: 'playerIds array and propType are required' },
        { status: 400 }
      );
    }

    // Fetch bulk analytics from the player_analytics table
    const analyticsResult = await db.execute(sql`
      SELECT * FROM public.player_analytics
      WHERE player_id = ANY(${playerIds})
      AND prop_type = ${propType}
      AND sport = ${sport};
    `);

    return NextResponse.json({
      analytics: analyticsResult,
    });

  } catch (error: any) {
    console.error('Error fetching bulk enriched player analytics:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
