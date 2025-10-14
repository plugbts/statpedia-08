import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.NEON_DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const propType = searchParams.get('propType');
    const season = searchParams.get('season') || '2025';

    if (!playerId || !propType) {
      return NextResponse.json(
        { error: 'playerId and propType are required' },
        { status: 400 }
      );
    }

    // Get player analytics
    const analytics = await db.execute(sql`
      WITH player_stats AS (
        SELECT 
          pgl.player_id,
          pgl.prop_type,
          pgl.season,
          COUNT(*) as total_games,
          AVG(pgl.actual_value) as career_avg,
          AVG(pgl.hit::int) as career_hit_rate,
          MAX(pgl.game_date) as last_game_date,
          MIN(pgl.game_date) as first_game_date
        FROM player_game_logs pgl
        WHERE pgl.player_id = ${playerId}
          AND pgl.prop_type = ${propType}
          AND pgl.season = ${season}
        GROUP BY pgl.player_id, pgl.prop_type, pgl.season
      ),
      recent_games AS (
        SELECT 
          pgl.player_id,
          pgl.prop_type,
          pgl.game_date,
          pgl.actual_value,
          pgl.line,
          pgl.hit,
          ROW_NUMBER() OVER (ORDER BY pgl.game_date DESC) as rn
        FROM player_game_logs pgl
        WHERE pgl.player_id = ${playerId}
          AND pgl.prop_type = ${propType}
          AND pgl.season = ${season}
        ORDER BY pgl.game_date DESC
      ),
      rolling_stats AS (
        SELECT 
          AVG(actual_value) as avg_l5,
          AVG(hit::int) as hit_rate_l5
        FROM recent_games
        WHERE rn <= 5
      ),
      streak_data AS (
        SELECT 
          hit,
          COUNT(*) as streak_length,
          ROW_NUMBER() OVER (ORDER BY game_date DESC) as rn
        FROM recent_games
        WHERE rn <= 10
        GROUP BY hit, game_date
        ORDER BY game_date DESC
        LIMIT 1
      )
      SELECT 
        ps.total_games,
        ps.career_avg,
        ps.career_hit_rate,
        ps.last_game_date,
        ps.first_game_date,
        COALESCE(rs.avg_l5, 0) as avg_l5,
        COALESCE(rs.hit_rate_l5, 0) as hit_rate_l5,
        COALESCE(sd.streak_length, 0) as current_streak,
        COALESCE(sd.hit, false) as current_streak_type
      FROM player_stats ps
      LEFT JOIN rolling_stats rs ON 1=1
      LEFT JOIN streak_data sd ON sd.rn = 1
    `);

    // Get recent games for trend analysis
    const recentGames = await db.execute(sql`
      SELECT 
        pgl.game_date,
        pgl.actual_value,
        pgl.line,
        pgl.hit,
        g.home_team_id,
        g.away_team_id,
        ht.name as home_team,
        at.name as away_team,
        pgl.home_away
      FROM player_game_logs pgl
      JOIN games g ON pgl.game_id = g.id
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE pgl.player_id = ${playerId}
        AND pgl.prop_type = ${propType}
        AND pgl.season = ${season}
      ORDER BY pgl.game_date DESC
      LIMIT 10
    `);

    const result = {
      analytics: analytics[0] || {},
      recentGames: recentGames || [],
      summary: {
        totalGames: analytics[0]?.total_games || 0,
        careerAvg: parseFloat(analytics[0]?.career_avg || '0'),
        careerHitRate: parseFloat(analytics[0]?.career_hit_rate || '0'),
        avgL5: parseFloat(analytics[0]?.avg_l5 || '0'),
        hitRateL5: parseFloat(analytics[0]?.hit_rate_l5 || '0'),
        currentStreak: analytics[0]?.current_streak || 0,
        currentStreakType: analytics[0]?.current_streak_type ? 'over' : 'under'
      }
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Player analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerIds, propType, season = '2025' } = body;

    if (!playerIds || !Array.isArray(playerIds) || !propType) {
      return NextResponse.json(
        { error: 'playerIds array and propType are required' },
        { status: 400 }
      );
    }

    // Get bulk analytics for multiple players
    const analytics = await db.execute(sql`
      WITH player_stats AS (
        SELECT 
          pgl.player_id,
          pgl.prop_type,
          pgl.season,
          COUNT(*) as total_games,
          AVG(pgl.actual_value) as career_avg,
          AVG(pgl.hit::int) as career_hit_rate
        FROM player_game_logs pgl
        WHERE pgl.player_id = ANY(${playerIds})
          AND pgl.prop_type = ${propType}
          AND pgl.season = ${season}
        GROUP BY pgl.player_id, pgl.prop_type, pgl.season
      )
      SELECT 
        ps.player_id,
        p.name as player_name,
        ps.total_games,
        ps.career_avg,
        ps.career_hit_rate
      FROM player_stats ps
      JOIN players p ON ps.player_id = p.id
      ORDER BY ps.career_avg DESC
    `);

    return NextResponse.json({ analytics });

  } catch (error: any) {
    console.error('Bulk player analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}
